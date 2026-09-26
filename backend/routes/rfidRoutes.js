const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Stop = require("../models/Stop");
const StopDistance = require("../models/StopDistance");
const RfidCard = require("../models/RfidCard");
const RfidDevice = require("../models/RfidDevice");
const Journey = require("../models/Journey");
const CardApplication = require("../models/CardApplication");
const Transaction = require("../models/Transaction");
const Bus = require("../models/Bus");
const User = require("../models/User");
const TripSession = require("../models/TripSession");
const { sendApplicationStatusEmail } = require("../utils/mailer");
const { getIO } = require("../services/socketService");
const {
  validateEmail,
  validateDob,
  validatePincode,
  validateLocationName,
  validateInstitutionName,
  validateIdNumber,
  validateStreet,
  validateName,
  validatePhoneNumber,
} = require("../utils/formValidators");

const Razorpay = require("razorpay");
const crypto = require("crypto");

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Flexible RFID Card lookup helper (exact match + normalized non-alphanumeric match)
 * Safely works with raw hex (e.g. 53262A56), colon-separated (53:26:2A:56), or spaced UIDs (53 26 2A 56)
 */
async function findCardByTagOrNumber(param) {
  if (!param) return null;
  const query = String(param).trim().toUpperCase();

  // 1. Exact query match
  let card = await RfidCard.findOne({
    $or: [{ rfidTag: query }, { cardNumber: query }]
  });
  if (card) return card;

  // 2. Normalized match (strips punctuation/whitespace)
  const rawHex = query.replace(/[^A-F0-9]/gi, "");
  if (rawHex.length >= 4) {
    const pattern = rawHex.match(/.{1,2}/g)?.join("[:\\s-]?") || rawHex;
    card = await RfidCard.findOne({
      $or: [
        { rfidTag: { $regex: new RegExp(`^${pattern}$`, "i") } },
        { cardNumber: query }
      ]
    });
  }
  return card;
}

// Create Razorpay Order
router.post("/create-razorpay-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: "Valid amount is required" });
    }

    const options = {
      amount: Math.round(Number(amount) * 100), // convert to paise
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    res.status(500).json({ message: "Failed to create payment order: " + error.message });
  }
});

// Verify Razorpay Payment Signature & Record Transaction in Database
router.post("/verify-razorpay-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      paymentType,
      tagId,
      amount,
      userId,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing Razorpay payment parameters" });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid payment signature. Verification failed." });
    }

    const numericAmount = Number(amount);

    if (paymentType === "topup" || paymentType === "wallet") {
      if (!tagId) {
        return res.status(400).json({ message: "Card tagId is required for top-up" });
      }
      let card = await findCardByTagOrNumber(tagId);

      if (!card) {
        return res.status(404).json({ message: "RFID Card not found" });
      }

      card.balance += numericAmount;
      await card.save();

      // Save Transaction Record to MongoDB Database
      const txn = new Transaction({
        transactionId: razorpay_payment_id || `TXN-MS-${Math.floor(100000 + Math.random() * 900000)}`,
        razorpayOrderId: razorpay_order_id,
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
        user: userId || card.user || null,
        cardNumber: card.cardNumber ? card.cardNumber.slice(-4) : "4910",
        amount: numericAmount,
        type: "Recharge",
        isDebit: false,
        status: "Success",
        paymentMethod: "Razorpay",
        description: `MoveSmart Transit Card Top-Up via Razorpay`,
      });
      await txn.save();

      return res.json({
        success: true,
        message: `Successfully topped up ₹${numericAmount.toFixed(2)} via Razorpay! New balance: ₹${card.balance.toFixed(2)} ✅`,
        card,
        paymentId: razorpay_payment_id,
        transaction: txn,
      });
    }

    // Save generic Transaction Record for card application or other payments
    const txn = new Transaction({
      transactionId: razorpay_payment_id || `TXN-MS-${Math.floor(100000 + Math.random() * 900000)}`,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      user: userId || null,
      amount: numericAmount || 0,
      type: paymentType === "card_application" ? "Card Application" : "Recharge",
      isDebit: true,
      status: "Success",
      paymentMethod: "Razorpay",
      description: `MoveSmart Payment (${paymentType || "Razorpay"})`,
    });
    await txn.save();

    res.json({
      success: true,
      message: "Payment verified successfully ✅",
      paymentId: razorpay_payment_id,
      transaction: txn,
    });
  } catch (error) {
    console.error("Razorpay Verification Error:", error);
    res.status(500).json({ message: "Failed to verify payment: " + error.message });
  }
});

// Seed MoveSmart Kerala Stops and Distances (Safely adds missing stops/distances without deleting or overwriting existing records)
router.post("/seed", async (req, res) => {
  try {
    // 1. Find or create MoveSmart Kerala Transit Stops (Never deletes existing records)
    const stopsData = [
      { name: "Vyttila Mobility Hub", code: "STOP_VYTTILA", latitude: 9.9658, longitude: 76.3204 },
      { name: "Kaloor Bus Terminal", code: "STOP_KALOOR", latitude: 9.9961, longitude: 76.2906 },
      { name: "Edappally Toll Junction", code: "STOP_EDAPPALLY", latitude: 10.0261, longitude: 76.3085 },
      { name: "Aluva Bus & Metro Hub", code: "STOP_ALUVA", latitude: 10.1076, longitude: 76.3516 },
      { name: "Angamaly Major Terminal", code: "STOP_ANGAMALY", latitude: 10.1960, longitude: 76.3860 },
      { name: "Kakkanad InfoPark Transit Hub", code: "STOP_KAKKANAD", latitude: 10.0159, longitude: 76.3419 }
    ];

    const stops = {};
    for (const item of stopsData) {
      let stop = await Stop.findOne({ code: item.code.toUpperCase() });
      if (!stop) {
        stop = await Stop.findOne({ name: item.name });
      }
      if (!stop) {
        stop = new Stop({ name: item.name, code: item.code.toUpperCase(), latitude: item.latitude, longitude: item.longitude });
        await stop.save();
      } else {
        if (!stop.latitude || !stop.longitude) {
          stop.latitude = item.latitude;
          stop.longitude = item.longitude;
          await stop.save();
        }
      }
      stops[item.code] = stop;
    }

    // 2. Create Distance Mapping only if pair does not already exist (Bi-directional in km)
    const distancesData = [
      { from: "STOP_VYTTILA", to: "STOP_KALOOR", dist: 5.5 },
      { from: "STOP_VYTTILA", to: "STOP_EDAPPALLY", dist: 8.0 },
      { from: "STOP_VYTTILA", to: "STOP_ALUVA", dist: 16.5 },
      { from: "STOP_VYTTILA", to: "STOP_ANGAMALY", dist: 26.0 },
      { from: "STOP_VYTTILA", to: "STOP_KAKKANAD", dist: 7.2 },

      { from: "STOP_KALOOR", to: "STOP_EDAPPALLY", dist: 4.2 },
      { from: "STOP_KALOOR", to: "STOP_ALUVA", dist: 13.0 },
      { from: "STOP_KALOOR", to: "STOP_ANGAMALY", dist: 23.5 },
      { from: "STOP_KALOOR", to: "STOP_KAKKANAD", dist: 8.5 },

      { from: "STOP_EDAPPALLY", to: "STOP_ALUVA", dist: 9.0 },
      { from: "STOP_EDAPPALLY", to: "STOP_ANGAMALY", dist: 19.5 },
      { from: "STOP_EDAPPALLY", to: "STOP_KAKKANAD", dist: 6.0 },

      { from: "STOP_ALUVA", to: "STOP_ANGAMALY", dist: 10.5 },
      { from: "STOP_ALUVA", to: "STOP_KAKKANAD", dist: 14.5 },

      { from: "STOP_ANGAMALY", to: "STOP_KAKKANAD", dist: 24.0 }
    ];

    for (const distInfo of distancesData) {
      const fromStop = stops[distInfo.from];
      const toStop = stops[distInfo.to];
      if (fromStop && toStop) {
        const existingDist = await StopDistance.findOne({
          $or: [
            { fromStop: fromStop._id, toStop: toStop._id },
            { fromStop: toStop._id, toStop: fromStop._id }
          ]
        });

        // Only insert if no distance record exists between these two stops
        if (!existingDist) {
          const sd = new StopDistance({
            fromStop: fromStop._id,
            toStop: toStop._id,
            distanceKm: distInfo.dist
          });
          await sd.save();
        }
      }
    }

    res.json({ message: "MoveSmart Kerala stops and distances verified/seeded successfully ✅", count: Object.keys(stops).length });
  } catch (error) {
    console.error("Seeding Error:", error);
    res.status(500).json({ message: "Failed to seed data: " + error.message });
  }
});

// Book/Register a new RFID Card
router.post("/book", async (req, res) => {
  try {
    const { rfidTag, cardType, userEmail, initialBalance } = req.body;

    if (!rfidTag) {
      return res.status(400).json({ message: "RFID Tag ID is required" });
    }

    // Check if card with this rfidTag already exists
    const existing = await RfidCard.findOne({ rfidTag: rfidTag.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: "This RFID Tag is already registered" });
    }

    // Generate a unique 10-digit card number (serial number)
    let cardNumber;
    let cardExists = true;
    while (cardExists) {
      // Pick prefix based on type (5 for Gold, 3 for Blue, 1 or other for Silver)
      const prefix = cardType === "Gold" ? "5" : (cardType === "Blue" ? "3" : "1");
      const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString();
      cardNumber = (prefix + randomDigits).substring(0, 10);
      const dup = await RfidCard.findOne({ cardNumber });
      if (!dup) cardExists = false;
    }

    let ownerId = null;
    if (userEmail) {
      const User = require("../models/User");
      const userObj = await User.findOne({ email: userEmail.toLowerCase() });
      if (userObj) {
        ownerId = userObj._id;
      }
    }

    const card = new RfidCard({
      cardNumber,
      rfidTag: rfidTag.toUpperCase(),
      user: ownerId,
      balance: Number(initialBalance) || 0.0,
      cardType: cardType || "Silver",
      status: "Active"
    });

    await card.save();
    res.status(201).json({ message: "RFID Card booked successfully ✅", card });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Get user's cards (dynamically populated from MongoDB User model)
router.get("/my-cards", async (req, res) => {
  try {
    const { email, userId } = req.query;
    if (!email && !userId) {
      return res.status(400).json({ message: "User ID or Email is required to fetch owned cards" });
    }

    const User = require("../models/User");
    let userObj = null;
    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
      userObj = await User.findById(userId);
    }
    if (!userObj && email) {
      userObj = await User.findOne({ email: email.toLowerCase().trim() });
    }

    if (!userObj) {
      return res.status(404).json({ message: "User not found" });
    }

    const cards = await RfidCard.find({ user: userObj._id }).populate("user", "name email phone role");
    res.json({
      success: true,
      cards,
      user: {
        _id: userObj._id,
        name: userObj.name,
        email: userObj.email,
        phone: userObj.phone,
        role: userObj.role
      }
    });
  } catch (error) {
    console.error("My-Cards Route Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Check Card Balance
router.get("/balance/:tagOrCard", async (req, res) => {
  try {
    const param = req.params.tagOrCard;

    // Check by tag or card number using flexible lookup
    let card = await findCardByTagOrNumber(param);

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    res.json({
      cardNumber: card.cardNumber,
      rfidTag: card.rfidTag,
      balance: card.balance,
      cardType: card.cardType,
      status: card.status
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Top up Card
router.post("/topup", async (req, res) => {
  try {
    const { tagId, amount } = req.body;

    if (!tagId || !amount) {
      return res.status(400).json({ message: "Card Tag ID/Number and Top-up amount are required" });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 10) {
      return res.status(400).json({ message: "Minimum top-up amount is ₹10" });
    }

    let card = await findCardByTagOrNumber(tagId);

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    card.balance += numericAmount;
    await card.save();

    res.json({
      message: `Successfully topped up ₹${numericAmount}. New balance: ₹${card.balance.toFixed(2)} ✅`,
      card
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});
// Adjust Card Balance (Admin)
router.post("/adjust-balance", async (req, res) => {
  try {
    const { cardId, amount, type } = req.body;
    const card = await RfidCard.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }
    const val = Number(amount);
    if (isNaN(val) || val <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }
    if (type === "debit") {
      card.balance -= val;
    } else {
      card.balance += val;
    }
    await card.save();
    res.json({ message: "Card balance adjusted successfully ✅", card });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Toggle Card Status (Admin)
router.post("/toggle-status", async (req, res) => {
  try {
    const { cardId } = req.body;
    const card = await RfidCard.findById(cardId);
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }
    card.status = card.status === "Active" ? "Suspended" : "Active";
    await card.save();
    res.json({ message: `Card is now ${card.status} ✅`, card });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get card history (journeys & transactions dynamically loaded)
router.get("/history/:cardNumber", async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const card = await RfidCard.findOne({ cardNumber }).populate("user", "name email phone role");
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const journeys = await Journey.find({ card: card._id })
      .populate("tapInStop")
      .populate("tapOutStop")
      .populate("busId")
      .populate("driverId", "name email phone")
      .sort({ createdAt: -1 })
      .limit(30);

    const transactions = await Transaction.find({
      $or: [
        { cardNumber: { $regex: card.cardNumber.slice(-4), $options: "i" } },
        ...(card.user ? [{ user: card.user._id }] : [])
      ]
    })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({
      success: true,
      card,
      journeys,
      transactions,
    });
  } catch (error) {
    console.error("Card History Route Error:", error);
    res.status(500).json({ message: error.message });
  }
});

// Get all cards
router.get("/cards", async (req, res) => {
  try {
    const cards = await RfidCard.find({}).populate("user");
    res.json({ cards });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get stops
router.get("/stops", async (req, res) => {
  try {
    const stops = await Stop.find({}).sort({ name: 1 });
    res.json({ stops });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add a stop
router.post("/stops", async (req, res) => {
  try {
    const { name, code } = req.body;
    if (!name || !code) {
      return res.status(400).json({ message: "Name and Code are required" });
    }
    const newStop = new Stop({ name, code: code.toUpperCase().trim() });
    await newStop.save();
    res.status(201).json({ message: "Stop added successfully ✅", stop: newStop });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get distances
router.get("/distances", async (req, res) => {
  try {
    const distances = await StopDistance.find({})
      .populate("fromStop")
      .populate("toStop");
    res.json({ distances });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add/Update a distance
router.post("/distances", async (req, res) => {
  try {
    const { fromStopId, toStopId, distanceKm } = req.body;
    if (!fromStopId || !toStopId || distanceKm === undefined) {
      return res.status(400).json({ message: "fromStopId, toStopId, and distanceKm are required" });
    }

    // Check if distance already exists (in either direction)
    let distRecord = await StopDistance.findOne({
      $or: [
        { fromStop: fromStopId, toStop: toStopId },
        { fromStop: toStopId, toStop: fromStopId }
      ]
    });

    if (distRecord) {
      distRecord.distanceKm = Number(distanceKm);
      await distRecord.save();
      return res.json({ message: "Distance updated successfully ✅", distance: distRecord });
    }

    distRecord = new StopDistance({
      fromStop: fromStopId,
      toStop: toStopId,
      distanceKm: Number(distanceKm)
    });
    await distRecord.save();
    res.status(201).json({ message: "Distance set successfully ✅", distance: distRecord });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Live RFID Tap-In / Tap-Out Endpoint (Strictly Isolated to Active Bus Trip Session)
router.post("/tap", async (req, res) => {
  try {
    const rfidTag = req.body.rfidTag || req.body.cardUid || req.body.uid;
    const { deviceId, busNumber, busId } = req.body;
    let stopCode = req.body.stopCode;

    if (!rfidTag) {
      return res.status(400).json({ message: "rfidTag or cardUid parameter is required" });
    }

    // 1. Resolve Assigned Bus & Driver dynamically from database
    let assignedBusRecord = null;
    if (req.body.busId && mongoose.Types.ObjectId.isValid(req.body.busId)) {
      assignedBusRecord = await Bus.findById(req.body.busId);
    }
    if (!assignedBusRecord && req.body.busNumber) {
      assignedBusRecord = await Bus.findOne({ busNumber: String(req.body.busNumber).trim() });
    }
    if (!assignedBusRecord && req.body.deviceId) {
      const dev = await RfidDevice.findOne({ deviceId: String(req.body.deviceId).trim().toUpperCase() });
      if (dev?.busId && mongoose.Types.ObjectId.isValid(dev.busId)) {
        assignedBusRecord = await Bus.findById(dev.busId);
      } else if (dev?.busNumber) {
        assignedBusRecord = await Bus.findOne({ busNumber: dev.busNumber });
      }
    }
    if (!assignedBusRecord) {
      assignedBusRecord = await Bus.findOne({ is_active: true });
    }

    if (!assignedBusRecord) {
      return res.status(404).json({
        success: false,
        allowed: false,
        action: "REJECTED",
        reason: "Bus not found",
        message: "No assigned or registered bus found in system."
      });
    }

    // 2. ENFORCE REQUIREMENT 2 & 12: Validate Active Driving Session for this Bus
    let activeTrip = await TripSession.findOne({
      busId: assignedBusRecord._id,
      status: "ACTIVE"
    }).sort({ createdAt: -1 });

    if (!activeTrip && assignedBusRecord.busNumber) {
      activeTrip = await TripSession.findOne({
        busNumber: assignedBusRecord.busNumber,
        status: "ACTIVE"
      }).sort({ createdAt: -1 });
    }

    if (!activeTrip && assignedBusRecord.driverId) {
      activeTrip = await TripSession.findOne({
        driverId: assignedBusRecord.driverId,
        status: "ACTIVE"
      }).sort({ createdAt: -1 });
    }

    // If no active trip session is found, reject the tap immediately
    if (!activeTrip) {
      return res.status(403).json({
        success: false,
        allowed: false,
        action: "REJECTED",
        reason: "No active trip found for this bus",
        message: `No active trip found for bus ${assignedBusRecord.busNumber} (${assignedBusRecord.busName}). The driver must click START DRIVE before scanning RFID cards.`
      });
    }

    const currentTripSessionId = activeTrip.tripSessionId;

    // 3. Resolve the actual Stop
    let stop = null;

    if (activeTrip.currentStop) {
      if (activeTrip.currentStop.code) {
        stop = await Stop.findOne({ code: activeTrip.currentStop.code.toUpperCase() });
      }
      if (!stop && activeTrip.currentStop.name) {
        stop = await Stop.findOne({ name: activeTrip.currentStop.name });
      }
    }

    if (!stop && stopCode && stopCode !== "STOP_VYTTILA") {
      stop = await Stop.findOne({ code: String(stopCode).toUpperCase() });
    }

    if (!stop && (deviceId || busNumber)) {
      const dev = await RfidDevice.findOne({
        $or: [
          ...(deviceId ? [{ deviceId: String(deviceId).trim().toUpperCase() }] : []),
          ...(busNumber ? [{ busNumber: String(busNumber).trim() }] : [])
        ]
      });
      if (dev && dev.stopCode && dev.stopCode !== "STOP_VYTTILA") {
        stop = await Stop.findOne({ code: dev.stopCode.toUpperCase() });
      }
    }

    if (!stop && assignedBusRecord.stops && assignedBusRecord.stops.length > 0) {
      const firstStopName = assignedBusRecord.stops[0];
      stop = await Stop.findOne({
        $or: [
          { name: firstStopName },
          { code: `STOP_${firstStopName.toUpperCase().replace(/[^A-Z0-9]/g, "_")}` }
        ]
      });
    }

    if (!stop) {
      stop = await Stop.findOne({ code: "STOP_KANJIRAPPALLY" });
    }
    if (!stop) {
      stop = await Stop.findOne({});
    }

    if (!stop) {
      return res.status(404).json({
        allowed: false,
        action: "REJECTED",
        reason: "Invalid stop code",
        message: "No valid transit stop found in database."
      });
    }

    // 4. Find RFID Card using flexible lookup
    const card = await findCardByTagOrNumber(rfidTag);
    if (!card) {
      return res.status(404).json({
        allowed: false,
        action: "REJECTED",
        reason: "Card not registered in the system",
        message: "Invalid RFID Card. Please register it first."
      });
    }

    if (card.status !== "Active") {
      return res.status(403).json({
        allowed: false,
        action: "REJECTED",
        reason: "Card is suspended",
        message: "This card has been suspended."
      });
    }

    // Retrieve passenger information
    let passengerInfo = null;
    if (card.user) {
      const userDoc = await User.findById(card.user).select("name email phone role");
      if (userDoc) {
        passengerInfo = {
          _id: userDoc._id,
          name: userDoc.name,
          email: userDoc.email,
          phone: userDoc.phone,
          role: userDoc.role,
        };
      }
    }

    const passengerName = passengerInfo?.name || "Passenger";

    // 5. Look for active journey for this card in this trip session
    let activeJourney = await Journey.findOne({
      card: card._id,
      status: "In-Progress"
    });

    const MIN_BALANCE = 5.00;
    const MAX_FARE = 200.00;
    const BASE_FARE = 10.00;
    const BASE_KM = 2.5;
    const RATE_PER_KM = 1.25;

    const getMultiplier = (type) => {
      if (!type) return 1.0;
      const t = String(type).trim().toLowerCase();
      if (t.includes("student") || t === "blue") return 0.5;
      if (t.includes("foreigner") || t.includes("tourist") || t === "gold") return 1.5;
      return 1.0;
    };

    const busDetails = {
      busNumber: assignedBusRecord.busNumber,
      busName: assignedBusRecord.busName,
      busType: assignedBusRecord.busType || "Standard Transit",
      routeName: activeTrip.routeName || assignedBusRecord.routeName || (assignedBusRecord.fromLocation && assignedBusRecord.toLocation ? `${assignedBusRecord.fromLocation} ➔ ${assignedBusRecord.toLocation}` : "Active Route"),
      fromLocation: assignedBusRecord.fromLocation || "",
      toLocation: assignedBusRecord.toLocation || "",
      departureTime: assignedBusRecord.departureTime || "",
      arrivalTime: assignedBusRecord.arrivalTime || "",
      driverId: activeTrip.driverId || assignedBusRecord.driverId || null,
      driverEmail: activeTrip.driverEmail || assignedBusRecord.driverEmail || "",
      driverName: activeTrip.driverName || assignedBusRecord.driverName || "Driver"
    };

    if (activeJourney) {
      // Tap-Out logic

      // Double tap prevention (within 10 seconds at same stop)
      const secondsSinceTapIn = (Date.now() - new Date(activeJourney.tapInTime).getTime()) / 1000;
      if (activeJourney.tapInStop.toString() === stop._id.toString() && secondsSinceTapIn < 10) {
        return res.status(200).json({
          allowed: true,
          action: "IGNORE",
          tripSessionId: currentTripSessionId,
          message: "Double-tap ignored. Already checked in.",
          passenger: passengerInfo,
          passengerName,
          passengerEmail: passengerInfo ? passengerInfo.email : "",
          bus: busDetails,
          card: {
            cardNumber: card.cardNumber,
            balance: card.balance.toFixed(2),
            cardType: card.cardType
          }
        });
      }

      // Expired journey check (> 4 hours)
      const hoursSinceTapIn = secondsSinceTapIn / 3600;
      if (hoursSinceTapIn > 4) {
        activeJourney.status = "Expired";
        activeJourney.fare = MAX_FARE * getMultiplier(card.cardType);
        const prevBal = card.balance;
        card.balance -= activeJourney.fare;
        activeJourney.tapOutPrevBalance = prevBal;
        activeJourney.tapOutNewBalance = card.balance;
        await activeJourney.save();
        await card.save();

        if (card.balance < MIN_BALANCE) {
          return res.status(400).json({
            allowed: false,
            action: "REJECTED",
            tripSessionId: currentTripSessionId,
            reason: "Insufficient balance after penalty",
            message: `Previous journey expired: -₹${activeJourney.fare.toFixed(2)}. Insufficient balance to tap-in: ₹${card.balance.toFixed(2)}.`,
            passenger: passengerInfo,
            passengerName,
            passengerEmail: passengerInfo ? passengerInfo.email : "",
            bus: busDetails,
            card: {
              cardNumber: card.cardNumber,
              balance: card.balance.toFixed(2)
            }
          });
        }

        const newJourney = new Journey({
          card: card._id,
          user: card.user,
          tripSessionId: currentTripSessionId,
          routeId: activeTrip.routeId || null,
          routeName: activeTrip.routeName || busDetails.routeName,
          cardUid: card.rfidTag || rfidTag,
          passengerName,
          cardType: card.cardType,
          tapInStop: stop._id,
          tapInTime: new Date(),
          tapInPrevBalance: card.balance,
          tapInNewBalance: card.balance,
          status: "In-Progress",
          busNumber: busDetails.busNumber,
          busName: busDetails.busName,
          busId: assignedBusRecord._id,
          driverId: busDetails.driverId,
          driverEmail: busDetails.driverEmail
        });
        await newJourney.save();

        await TripSession.findByIdAndUpdate(activeTrip._id, {
          $inc: { totalRfidTaps: 1, totalTapIns: 1 }
        });

        return res.status(200).json({
          allowed: true,
          action: "TAP_IN",
          tripSessionId: currentTripSessionId,
          message: `Previous journey expired (-₹${activeJourney.fare.toFixed(2)}). Boarded at ${stop.name}.`,
          passenger: passengerInfo,
          passengerName,
          passengerEmail: passengerInfo ? passengerInfo.email : "",
          bus: busDetails,
          card: {
            cardNumber: card.cardNumber,
            balance: card.balance.toFixed(2),
            cardType: card.cardType
          },
          stop: {
            name: stop.name,
            code: stop.code
          }
        });
      }

      // Valid Tap-Out
      const tapInStopObj = await Stop.findById(activeJourney.tapInStop);

      const distObj = await StopDistance.findOne({
        $or: [
          { fromStop: activeJourney.tapInStop, toStop: stop._id },
          { fromStop: stop._id, toStop: activeJourney.tapInStop }
        ]
      });

      let distanceKm = distObj ? distObj.distanceKm : null;

      if (distanceKm === null || distanceKm === undefined) {
        if (tapInStopObj?.latitude && tapInStopObj?.longitude && stop.latitude && stop.longitude) {
          const R = 6371;
          const dLat = ((stop.latitude - tapInStopObj.latitude) * Math.PI) / 180;
          const dLon = ((stop.longitude - tapInStopObj.longitude) * Math.PI) / 180;
          const a =
            Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos((tapInStopObj.latitude * Math.PI) / 180) *
              Math.cos((stop.latitude * Math.PI) / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          distanceKm = Number((R * c * 1.22).toFixed(1));
        } else {
          distanceKm = 4.0;
        }
      }

      distanceKm = Math.max(1.0, Number(distanceKm));

      const multiplier = getMultiplier(card.cardType);
      let calculatedFare = BASE_FARE;
      if (distanceKm > BASE_KM) {
        calculatedFare += (distanceKm - BASE_KM) * RATE_PER_KM;
      }
      calculatedFare = Number((calculatedFare * multiplier).toFixed(2));

      if (calculatedFare > (MAX_FARE * multiplier)) {
        calculatedFare = Number((MAX_FARE * multiplier).toFixed(2));
      }

      const previousBalance = card.balance;
      card.balance = Number((card.balance - calculatedFare).toFixed(2));
      await card.save();

      // Finalize Journey
      activeJourney.tapOutStop = stop._id;
      activeJourney.tapOutTime = new Date();
      activeJourney.distanceKm = distanceKm;
      activeJourney.fare = calculatedFare;
      activeJourney.status = "Completed";
      activeJourney.tapOutPrevBalance = previousBalance;
      activeJourney.tapOutNewBalance = card.balance;
      if (!activeJourney.tripSessionId) activeJourney.tripSessionId = currentTripSessionId;
      if (!activeJourney.busNumber) activeJourney.busNumber = busDetails.busNumber;
      if (!activeJourney.busName) activeJourney.busName = busDetails.busName;
      if (!activeJourney.driverEmail) activeJourney.driverEmail = busDetails.driverEmail;
      await activeJourney.save();

      // Update TripSession statistics
      await TripSession.findByIdAndUpdate(activeTrip._id, {
        $inc: { totalRfidTaps: 1, totalTapOuts: 1, totalFare: calculatedFare }
      });

      // Record Travel Deduction Transaction
      const travelTxn = new Transaction({
        transactionId: `TXN-TRV-${Math.floor(100000 + Math.random() * 900000)}`,
        user: card.user || null,
        cardNumber: card.cardNumber ? card.cardNumber.slice(-4) : "RFID",
        amount: calculatedFare,
        type: "Travel",
        isDebit: true,
        status: "Success",
        paymentMethod: "RFID Card Wallet",
        description: `Transit Journey (${busDetails.busName} - ${busDetails.busNumber} [${currentTripSessionId}]): ${tapInStopObj ? tapInStopObj.name : "Origin"} to ${stop.name} (${distanceKm.toFixed(1)} km)`
      });
      await travelTxn.save().catch(err => console.error("Travel transaction save error:", err));

      const responsePayload = {
        success: true,
        allowed: true,
        action: "TAP_OUT",
        status: "Accepted",
        tripSessionId: currentTripSessionId,
        message: `Tap-Out success. Charged: ₹${calculatedFare.toFixed(2)} for ${distanceKm.toFixed(1)} km on ${busDetails.busName} (${busDetails.busNumber}).`,
        passenger: passengerInfo,
        passengerName,
        passengerEmail: passengerInfo ? passengerInfo.email : "",
        bus: busDetails,
        journey: {
          from: tapInStopObj ? tapInStopObj.name : "Unknown",
          to: stop.name,
          distanceKm,
          fare: calculatedFare
        },
        fare: calculatedFare,
        previousBalance: Number(previousBalance.toFixed(2)),
        balance: Number(card.balance.toFixed(2)),
        card: {
          cardNumber: card.cardNumber,
          rfidTag: card.rfidTag || rfidTag,
          balance: card.balance.toFixed(2),
          cardType: card.cardType
        },
        stop: {
          name: stop.name,
          code: stop.code
        },
        timestamp: new Date().toISOString()
      };

      // Broadcast real-time tap event via Socket.IO with tripSessionId
      try {
        const io = getIO();
        if (io) {
          io.emit("rfid:tap-event", responsePayload);
          if (card.user) io.to(`user-${card.user}`).emit("rfid:tap-event", responsePayload);
          if (busDetails.driverId) io.to(`driver-${busDetails.driverId}`).emit("rfid:tap-event", responsePayload);
        }
      } catch (sErr) {}

      return res.status(200).json(responsePayload);

    } else {
      // Tap-In logic
      if (card.balance < MIN_BALANCE) {
        const rejectPayload = {
          success: false,
          allowed: false,
          action: "REJECTED",
          status: "Rejected",
          tripSessionId: currentTripSessionId,
          reason: "Insufficient balance",
          message: `Card balance (₹${card.balance.toFixed(2)}) is below the minimum required balance of ₹${MIN_BALANCE.toFixed(2)}.`,
          passenger: passengerInfo,
          passengerName,
          passengerEmail: passengerInfo ? passengerInfo.email : "",
          bus: busDetails,
          card: {
            cardNumber: card.cardNumber,
            rfidTag: card.rfidTag || rfidTag,
            balance: card.balance.toFixed(2),
            cardType: card.cardType
          },
          stop: {
            name: stop.name,
            code: stop.code
          },
          timestamp: new Date().toISOString()
        };

        try {
          const io = getIO();
          if (io) io.emit("rfid:tap-event", rejectPayload);
        } catch (sErr) {}

        return res.status(400).json(rejectPayload);
      }

      const newJourney = new Journey({
        card: card._id,
        user: card.user,
        tripSessionId: currentTripSessionId,
        routeId: activeTrip.routeId || null,
        routeName: activeTrip.routeName || busDetails.routeName,
        cardUid: card.rfidTag || rfidTag,
        passengerName,
        cardType: card.cardType,
        tapInStop: stop._id,
        tapInTime: new Date(),
        tapInPrevBalance: card.balance,
        tapInNewBalance: card.balance,
        status: "In-Progress",
        busNumber: busDetails.busNumber,
        busName: busDetails.busName,
        busId: assignedBusRecord._id,
        driverId: busDetails.driverId,
        driverEmail: busDetails.driverEmail
      });

      await newJourney.save();

      // Update TripSession statistics
      await TripSession.findByIdAndUpdate(activeTrip._id, {
        $inc: { totalRfidTaps: 1, totalTapIns: 1 }
      });

      const responsePayload = {
        success: true,
        allowed: true,
        action: "TAP_IN",
        status: "Accepted",
        tripSessionId: currentTripSessionId,
        message: `Tap-In success. Boarded ${busDetails.busName} (${busDetails.busNumber}) at ${stop.name}.`,
        passenger: passengerInfo,
        passengerName,
        passengerEmail: passengerInfo ? passengerInfo.email : "",
        bus: busDetails,
        fare: 0,
        previousBalance: Number(card.balance.toFixed(2)),
        balance: Number(card.balance.toFixed(2)),
        card: {
          cardNumber: card.cardNumber,
          rfidTag: card.rfidTag || rfidTag,
          balance: card.balance.toFixed(2),
          cardType: card.cardType
        },
        stop: {
          name: stop.name,
          code: stop.code
        },
        timestamp: new Date().toISOString()
      };

      // Broadcast real-time tap event via Socket.IO with tripSessionId
      try {
        const io = getIO();
        if (io) {
          io.emit("rfid:tap-event", responsePayload);
          if (card.user) io.to(`user-${card.user}`).emit("rfid:tap-event", responsePayload);
          if (busDetails.driverId) io.to(`driver-${busDetails.driverId}`).emit("rfid:tap-event", responsePayload);
        }
      } catch (sErr) {}

      return res.status(200).json(responsePayload);
    }

  } catch (error) {
    console.error("Tap Error:", error);
    res.status(500).json({ message: "System error: " + error.message });
  }
});

// Recent RFID Taps Feed (For Driver Dashboard & RFID Tap Monitor)
router.get("/taps/recent", async (req, res) => {
  try {
    const { tripSessionId, busNumber, busId, driverEmail, driverId, limit = 25 } = req.query;

    const query = {};

    // STRICT ISOLATION BY TRIP SESSION ID
    if (tripSessionId) {
      query.tripSessionId = String(tripSessionId).trim();
    } else {
      if (busId && mongoose.Types.ObjectId.isValid(busId)) {
        query.busId = busId;
      }
      if (busNumber) {
        query.busNumber = busNumber;
      }
      if (driverEmail) {
        query.driverEmail = driverEmail;
      }
      if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
        query.driverId = driverId;
      }
    }

    const journeys = await Journey.find(query)
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(Number(limit))
      .populate("card")
      .populate("user", "name email phone role")
      .populate("tapInStop")
      .populate("tapOutStop")
      .populate("busId");

    const formattedTaps = [];

    for (const j of journeys) {
      if (!j.card) continue;

      const passengerName = j.user?.name || j.passengerName || (j.card.user ? "Passenger" : "Passenger");
      const passengerEmail = j.user?.email || "";
      const bObj = j.busId;
      const tapBus = {
        busNumber: j.busNumber || (bObj?.busNumber || ""),
        busName: j.busName || (bObj?.busName || "MoveSmart Transit"),
        routeName: j.routeName || bObj?.routeName || (bObj?.fromLocation && bObj?.toLocation ? `${bObj.fromLocation} ➔ ${bObj.toLocation}` : ""),
        departureTime: bObj?.departureTime || "",
        arrivalTime: bObj?.arrivalTime || "",
        driverEmail: j.driverEmail || (bObj?.driverEmail || ""),
        driverName: bObj?.driverName || ""
      };

      // If completed, add tap-out event
      if (j.status === "Completed" && j.tapOutTime && j.tapOutStop) {
        formattedTaps.push({
          id: `${j._id}-out`,
          action: "TAP_OUT",
          tripSessionId: j.tripSessionId || "",
          passengerName,
          passengerEmail,
          passenger: j.user ? { name: j.user.name, email: j.user.email } : null,
          bus: tapBus,
          card: {
            cardNumber: j.card.cardNumber,
            rfidTag: j.card.rfidTag,
            cardType: j.card.cardType,
            balance: (j.tapOutNewBalance !== undefined ? j.tapOutNewBalance : j.card.balance).toFixed(2),
          },
          stop: {
            name: j.tapOutStop.name,
            code: j.tapOutStop.code,
          },
          journey: {
            from: j.tapInStop ? j.tapInStop.name : "Origin",
            to: j.tapOutStop.name,
            distanceKm: j.distanceKm || 4.0,
            fare: j.fare || 0,
          },
          fare: j.fare || 0,
          previousBalance: (j.tapOutPrevBalance !== undefined ? j.tapOutPrevBalance : j.card.balance).toFixed(2),
          balance: (j.tapOutNewBalance !== undefined ? j.tapOutNewBalance : j.card.balance).toFixed(2),
          timestamp: j.tapOutTime,
          status: "Accepted",
        });
      }

      // Add tap-in event
      if (j.tapInTime && j.tapInStop) {
        formattedTaps.push({
          id: `${j._id}-in`,
          action: "TAP_IN",
          tripSessionId: j.tripSessionId || "",
          passengerName,
          passengerEmail,
          passenger: j.user ? { name: j.user.name, email: j.user.email } : null,
          bus: tapBus,
          card: {
            cardNumber: j.card.cardNumber,
            rfidTag: j.card.rfidTag,
            cardType: j.card.cardType,
            balance: (j.tapInNewBalance !== undefined ? j.tapInNewBalance : j.card.balance).toFixed(2),
          },
          stop: {
            name: j.tapInStop.name,
            code: j.tapInStop.code,
          },
          fare: 0,
          previousBalance: (j.tapInPrevBalance !== undefined ? j.tapInPrevBalance : j.card.balance).toFixed(2),
          balance: (j.tapInNewBalance !== undefined ? j.tapInNewBalance : j.card.balance).toFixed(2),
          timestamp: j.tapInTime,
          status: "Accepted",
        });
      }
    }

    // Sort by timestamp descending
    formattedTaps.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    res.json({
      success: true,
      count: formattedTaps.length,
      tripSessionId: tripSessionId || null,
      taps: formattedTaps.slice(0, Number(limit)),
    });
  } catch (error) {
    console.error("Recent Taps Error:", error);
    res.status(500).json({ message: "Error fetching recent taps: " + error.message });
  }
});

// Dedicated endpoint to get all taps for a specific Trip Session
router.get("/taps/by-trip/:tripSessionId", async (req, res) => {
  try {
    const { tripSessionId } = req.params;
    const journeys = await Journey.find({ tripSessionId })
      .populate("card")
      .populate("user", "name email phone role")
      .populate("tapInStop")
      .populate("tapOutStop")
      .sort({ createdAt: 1 });

    const taps = [];
    for (const j of journeys) {
      const passengerName = j.user?.name || j.passengerName || "Passenger";
      if (j.tapInTime && j.tapInStop) {
        taps.push({
          id: `${j._id}-in`,
          action: "TAP_IN",
          tripSessionId,
          passengerName,
          card: {
            cardNumber: j.card?.cardNumber,
            rfidTag: j.card?.rfidTag,
            cardType: j.card?.cardType || j.cardType || "Silver"
          },
          stop: j.tapInStop,
          fare: 0,
          previousBalance: j.tapInPrevBalance || 0,
          balance: j.tapInNewBalance || 0,
          timestamp: j.tapInTime,
          status: "Accepted"
        });
      }
      if (j.status === "Completed" && j.tapOutTime && j.tapOutStop) {
        taps.push({
          id: `${j._id}-out`,
          action: "TAP_OUT",
          tripSessionId,
          passengerName,
          card: {
            cardNumber: j.card?.cardNumber,
            rfidTag: j.card?.rfidTag,
            cardType: j.card?.cardType || j.cardType || "Silver"
          },
          stop: j.tapOutStop,
          fare: j.fare || 0,
          previousBalance: j.tapOutPrevBalance || 0,
          balance: j.tapOutNewBalance || 0,
          timestamp: j.tapOutTime,
          status: "Accepted"
        });
      }
    }

    taps.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    res.json({
      success: true,
      tripSessionId,
      count: taps.length,
      taps
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// RFID HARDWARE DEVICE MANAGEMENT ENDPOINTS
// ==========================================

// 1. ESP32 Register Device on Wi-Fi Connect
router.post("/device/register", async (req, res) => {
  try {
    const {
      deviceId,
      driverId,
      driverEmail,
      driverName,
      busNumber,
      stopCode = "STOP_VYTTILA",
      ipAddress = "0.0.0.0",
      firmwareVersion = "v2.0-RC522",
    } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: "deviceId is required" });
    }

    const cleanDevId = deviceId.trim().toUpperCase();

    // Find driver user object if driverEmail or driverId provided
    let matchedDriverId = null;
    let matchedDriverName = driverName || "Driver";
    let matchedDriverEmail = driverEmail || "";

    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) {
      matchedDriverId = driverId;
      const uDoc = await User.findById(driverId).select("name email");
      if (uDoc) {
        matchedDriverName = uDoc.name;
        matchedDriverEmail = uDoc.email;
      }
    } else if (driverEmail) {
      const uDoc = await User.findOne({ email: driverEmail.toLowerCase().trim() }).select("_id name email");
      if (uDoc) {
        matchedDriverId = uDoc._id;
        matchedDriverName = uDoc.name;
        matchedDriverEmail = uDoc.email;
      }
    }

    // Upsert RfidDevice document
    let device = await RfidDevice.findOne({ deviceId: cleanDevId });
    if (!device) {
      device = new RfidDevice({
        deviceId: cleanDevId,
        driverId: matchedDriverId,
        driverName: matchedDriverName,
        driverEmail: matchedDriverEmail,
        busNumber: busNumber || "KL-07-MS-1008",
        stopCode: stopCode.toUpperCase(),
        ipAddress,
        firmwareVersion,
        status: "Connected",
        readerActive: true,
        lastHeartbeat: new Date(),
      });
    } else {
      if (matchedDriverId) device.driverId = matchedDriverId;
      if (matchedDriverName) device.driverName = matchedDriverName;
      if (matchedDriverEmail) device.driverEmail = matchedDriverEmail;
      if (busNumber) device.busNumber = busNumber;
      if (stopCode) device.stopCode = stopCode.toUpperCase();
      device.ipAddress = ipAddress;
      device.firmwareVersion = firmwareVersion;
      device.status = "Connected";
      device.readerActive = true;
      device.lastHeartbeat = new Date();
    }

    await device.save();

    // Broadcast device status update to Driver Dashboard & Admin Fleet via Socket.IO
    try {
      const io = getIO();
      if (io) {
        const payload = {
          deviceId: device.deviceId,
          driverId: device.driverId ? String(device.driverId) : null,
          driverName: device.driverName,
          busNumber: device.busNumber,
          stopCode: device.stopCode,
          ipAddress: device.ipAddress,
          status: "Connected",
          lastHeartbeat: device.lastHeartbeat,
          readerActive: device.readerActive,
        };
        io.emit("rfid:device-status", payload);
        if (device.driverId) {
          io.to(`driver-${device.driverId}`).emit("rfid:device-status", payload);
        }
        io.to("admin-safety").emit("rfid:device-status", payload);
      }
    } catch (sErr) {
      console.warn("Socket broadcast notice for device register:", sErr.message);
    }

    res.json({
      success: true,
      message: `RFID Device (${device.deviceId}) successfully connected to MoveSmart ✅`,
      device,
    });
  } catch (error) {
    console.error("Device Register Error:", error);
    res.status(500).json({ success: false, message: "Failed to register device: " + error.message });
  }
});

// 2. ESP32 Periodic Heartbeat
router.post("/device/heartbeat", async (req, res) => {
  try {
    const { deviceId, ipAddress, stopCode, readerActive = true } = req.body;

    if (!deviceId) {
      return res.status(400).json({ success: false, message: "deviceId is required" });
    }

    const cleanDevId = deviceId.trim().toUpperCase();
    const device = await RfidDevice.findOne({ deviceId: cleanDevId });

    if (device) {
      device.lastHeartbeat = new Date();
      device.status = "Connected";
      device.readerActive = Boolean(readerActive);
      if (ipAddress) device.ipAddress = ipAddress;
      if (stopCode) device.stopCode = stopCode.toUpperCase();
      await device.save();

      try {
        const io = getIO();
        if (io) {
          const payload = {
            deviceId: device.deviceId,
            driverId: device.driverId ? String(device.driverId) : null,
            status: "Connected",
            lastHeartbeat: device.lastHeartbeat,
            ipAddress: device.ipAddress,
            readerActive: device.readerActive,
          };
          io.emit("rfid:device-status", payload);
        }
      } catch (e) {}
    }

    res.json({ success: true, message: "Heartbeat acknowledged ✅" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. Driver Dashboard: Query RFID Device Status
router.get("/device/status", async (req, res) => {
  try {
    const { driverId, driverEmail, busNumber, deviceId } = req.query;

    const filters = [];
    if (deviceId) filters.push({ deviceId: deviceId.toUpperCase().trim() });
    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) filters.push({ driverId });
    if (driverEmail) filters.push({ driverEmail: driverEmail.toLowerCase().trim() });
    if (busNumber) filters.push({ busNumber: busNumber.trim() });

    let device = null;
    if (filters.length > 0) {
      device = await RfidDevice.findOne({ $or: filters }).sort({ updatedAt: -1 });
    } else {
      device = await RfidDevice.findOne().sort({ updatedAt: -1 });
    }

    if (!device) {
      return res.json({
        success: true,
        connected: false,
        status: "Not Connected",
        device: null,
        message: "No paired RFID device found. Click Connect RFID Device to pair.",
      });
    }

    // Check if heartbeat is alive (within last 75 seconds)
    const isAlive = (Date.now() - new Date(device.lastHeartbeat).getTime()) < 75000;
    const computedStatus = isAlive ? device.status : "Not Connected";

    res.json({
      success: true,
      connected: computedStatus === "Connected",
      status: computedStatus,
      device: {
        ...device.toObject(),
        status: computedStatus,
      },
    });
  } catch (error) {
    console.error("Device Status Query Error:", error);
    res.status(500).json({ success: false, message: "Failed to fetch device status" });
  }
});

// 4. Driver Dashboard: Unlink / Disconnect Device
router.post("/device/unlink", async (req, res) => {
  try {
    const { deviceId, driverId } = req.body;

    const filter = {};
    if (deviceId) filter.deviceId = deviceId.toUpperCase().trim();
    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) filter.driverId = driverId;

    const device = await RfidDevice.findOne(filter);
    if (device) {
      device.status = "Not Connected";
      device.driverId = null;
      device.driverName = "Unassigned Driver";
      device.driverEmail = "";
      await device.save();

      try {
        const io = getIO();
        if (io) {
          io.emit("rfid:device-status", {
            deviceId: device.deviceId,
            status: "Not Connected",
          });
        }
      } catch (e) {}
    }

    res.json({ success: true, message: "RFID Device unlinked successfully ✅" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5. Driver / Simulator: Set Active Stop & Location Manually
router.post("/device/set-location", async (req, res) => {
  try {
    const { deviceId, driverId, busNumber, stopCode } = req.body;

    if (!stopCode) {
      return res.status(400).json({ success: false, message: "stopCode is required" });
    }

    const cleanStopCode = String(stopCode).trim().toUpperCase();
    const stopDoc = await Stop.findOne({ code: cleanStopCode });
    if (!stopDoc) {
      return res.status(404).json({ success: false, message: `Stop code '${cleanStopCode}' not found` });
    }

    const filters = [];
    if (deviceId) filters.push({ deviceId: deviceId.toUpperCase().trim() });
    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) filters.push({ driverId });
    if (busNumber) filters.push({ busNumber: busNumber.trim() });

    let device = null;
    if (filters.length > 0) {
      device = await RfidDevice.findOne({ $or: filters });
    } else {
      device = await RfidDevice.findOne();
    }

    if (device) {
      device.stopCode = cleanStopCode;
      await device.save();
    }

    // Broadcast location update
    try {
      const io = getIO();
      if (io) {
        const payload = {
          deviceId: device?.deviceId || deviceId,
          stopCode: cleanStopCode,
          stopName: stopDoc.name,
          busNumber: device?.busNumber || busNumber,
          driverId: device?.driverId || driverId,
          timestamp: new Date().toISOString()
        };
        io.emit("rfid:location-updated", payload);
      }
    } catch (e) {}

    res.json({
      success: true,
      message: `Bus current location set to ${stopDoc.name} (${cleanStopCode}) ✅`,
      stop: stopDoc,
      device
    });
  } catch (error) {
    console.error("Set Location Error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// CARD APPLICATION WORKFLOW ENDPOINTS
// ==========================================

// 1. Submit Application (User)
router.post("/apply", async (req, res) => {
  try {
    const data = req.body;

    const targetUserId = data.userId || (req.session && (req.session.userId || req.session.user?.id || req.session.user?._id));
    const targetEmail = data.email?.toLowerCase().trim();
    const targetPhone = data.phone?.trim();

    // 0. Enforce STRICT ONE RFID CARD PER USER RULE
    // Check if user already has an active RFID Card in MongoDB
    if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
      const activeCard = await RfidCard.findOne({ user: targetUserId, status: "Active" });
      if (activeCard) {
        return res.status(400).json({
          error: `You already have an active MoveSmart RFID Card (${activeCard.cardNumber || "Active"}). Each user is permitted only one RFID card.`,
          hasCard: true,
          cardNumber: activeCard.cardNumber,
        });
      }
    }

    // Check if user already has an Approved card application
    const appFilters = [];
    if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) appFilters.push({ user: targetUserId });
    if (targetEmail) appFilters.push({ email: targetEmail });
    if (targetPhone) appFilters.push({ phone: targetPhone });

    if (appFilters.length > 0) {
      const existingApprovedApp = await CardApplication.findOne({
        $or: appFilters,
        status: "Approved",
      });
      if (existingApprovedApp) {
        return res.status(400).json({
          error: `You already have an approved RFID Card application (${existingApprovedApp.assignedCardNumber || existingApprovedApp.applicationId}). Each user is permitted only one RFID card.`,
          hasCard: true,
          cardNumber: existingApprovedApp.assignedCardNumber,
        });
      }

      const existingPendingApp = await CardApplication.findOne({
        $or: appFilters,
        status: "Pending",
      });
      if (existingPendingApp) {
        return res.status(400).json({
          error: `You already have a pending RFID Card application (${existingPendingApp.applicationId}) under review. Each user is permitted only one application at a time.`,
          hasPending: true,
          applicationId: existingPendingApp.applicationId,
        });
      }
    }

    // 1. Personal Info Validation (First Name & Second Name)
    if (data.firstName || data.secondName) {
      const fCheck = validateName(data.firstName, "First Name");
      if (!fCheck.valid) {
        return res.status(400).json({ error: fCheck.message, reason: fCheck.reason });
      }
      const sCheck = validateName(data.secondName, "Second Name");
      if (!sCheck.valid) {
        return res.status(400).json({ error: sCheck.message, reason: sCheck.reason });
      }
      data.fullName = `${data.firstName.trim()} ${data.secondName.trim()}`;
    } else {
      const nameCheck = validateName(data.fullName, "Full Name");
      if (!nameCheck.valid) {
        return res.status(400).json({ error: nameCheck.message, reason: nameCheck.reason });
      }
    }

    const dobCheck = validateDob(data.dob);
    if (!dobCheck.valid) {
      return res.status(400).json({ error: dobCheck.message });
    }

    if (!data.gender) {
      return res.status(400).json({ error: "Gender is required." });
    }

    const phoneCheck = validatePhoneNumber(data.countryCode || "+91", data.phone);
    if (!phoneCheck.valid) {
      return res.status(400).json({ error: phoneCheck.message, reason: phoneCheck.reason });
    }

    const emailCheck = validateEmail(data.email);
    if (!emailCheck.valid) {
      return res.status(400).json({ error: emailCheck.message });
    }

    // 2. Address Details Validation
    const streetCheck = validateStreet(data.street);
    if (!streetCheck.valid) {
      return res.status(400).json({ error: streetCheck.message });
    }

    const cityCheck = validateLocationName(data.city, "City");
    if (!cityCheck.valid) {
      return res.status(400).json({ error: cityCheck.message });
    }

    const districtCheck = validateLocationName(data.district, "District");
    if (!districtCheck.valid) {
      return res.status(400).json({ error: districtCheck.message });
    }

    if (!data.state || !data.state.trim() || data.state.trim().length < 2) {
      return res.status(400).json({ error: "State is required." });
    }

    const pincodeCheck = validatePincode(data.pincode);
    if (!pincodeCheck.valid) {
      return res.status(400).json({ error: pincodeCheck.message });
    }

    // 3. ID & Category Validation
    if (!data.cardCategory) {
      return res.status(400).json({ error: "Pass Type selection is required." });
    }

    if (data.cardCategory === "Student") {
      const instCheck = validateInstitutionName(data.institutionName);
      if (!instCheck.valid) {
        return res.status(400).json({ error: instCheck.message });
      }
      if (!data.studentIdUrl) {
        return res.status(400).json({ error: "Student ID Card document upload is required." });
      }
      data.idNumber = data.idNumber || "STUDENT-PASS";
    } else {
      const idNumberCheck = validateIdNumber(data.idNumber, data.cardCategory);
      if (!idNumberCheck.valid) {
        return res.status(400).json({ error: idNumberCheck.message });
      }
      if (!data.idProofUrl) {
        return res.status(400).json({ error: "ID Proof document upload is required." });
      }
    }

    // 4. Emergency Contact Validation
    data.frequentSource = data.frequentSource || "N/A";
    data.frequentDestination = data.frequentDestination || "N/A";

    if (data.emergencyFirstName || data.emergencySecondName) {
      const efCheck = validateName(data.emergencyFirstName, "Contact First Name");
      if (!efCheck.valid) {
        return res.status(400).json({ error: efCheck.message, reason: efCheck.reason });
      }
      const esCheck = validateName(data.emergencySecondName, "Contact Second Name");
      if (!esCheck.valid) {
        return res.status(400).json({ error: esCheck.message, reason: esCheck.reason });
      }
      data.emergencyName = `${data.emergencyFirstName.trim()} ${data.emergencySecondName.trim()}`;
    } else {
      const emergencyNameCheck = validateName(data.emergencyName, "Contact Name");
      if (!emergencyNameCheck.valid) {
        return res.status(400).json({ error: `Emergency Contact Name error: ${emergencyNameCheck.message}` });
      }
    }

    if (!data.emergencyRelation || !data.emergencyRelation.trim() || data.emergencyRelation.trim().length < 2) {
      return res.status(400).json({ error: "Emergency Contact Relation is required." });
    }

    const emergencyPhoneCheck = validatePhoneNumber(data.emergencyCountryCode || "+91", data.emergencyPhone);
    if (!emergencyPhoneCheck.valid) {
      return res.status(400).json({ error: `Emergency Phone error: ${emergencyPhoneCheck.message}` });
    }

    // 5. Terms Acceptance
    if (!data.termsAccepted) {
      return res.status(400).json({ error: "You must accept the Terms & Conditions to submit application." });
    }

    const count = await CardApplication.countDocuments();
    const applicationId = `APP-MS-${(count + 1001).toString()}`;

    const newApp = new CardApplication({
      applicationId,
      user: data.userId || (req.session && req.session.userId) || null,
      firstName: data.firstName || "",
      secondName: data.secondName || "",
      fullName: data.fullName || "Commuter",
      dob: data.dob,
      gender: data.gender,
      phone: phoneCheck.formatted || data.phone,
      email: data.email,
      phoneVerified: data.phoneVerified || false,

      street: data.street,
      city: data.city,
      district: data.district,
      state: data.state || "Kerala",
      pincode: data.pincode,

      idType: data.idType || "Aadhaar",
      idNumber: data.idNumber || "N/A",
      idProofUrl: data.idProofUrl || "",
      cardCategory: data.cardCategory || "Regular",
      institutionName: data.institutionName,
      studentIdUrl: data.studentIdUrl,

      frequentSource: data.frequentSource,
      frequentDestination: data.frequentDestination,
      preferredTime: data.preferredTime || "Morning",
      emergencyFirstName: data.emergencyFirstName || "",
      emergencySecondName: data.emergencySecondName || "",
      emergencyName: data.emergencyName,
      emergencyRelation: data.emergencyRelation,
      emergencyPhone: data.emergencyPhone,

      initialRecharge: Number(data.initialRecharge || 20),
      paymentMethod: data.paymentMethod || "Razorpay",
      enableSos: data.enableSos !== false,
      shareLocation: data.shareLocation === true,
      termsAccepted: data.termsAccepted !== false,

      status: "Pending",
    });

    await newApp.save();

    res.status(201).json({
      message: "Application submitted successfully",
      application: newApp,
    });
  } catch (error) {
    console.error("Card Application Submit Error:", error);
    res.status(500).json({ error: "Failed to submit application: " + error.message });
  }
});

// 2. Get My Applications (User)
router.get("/my-applications", async (req, res) => {
  try {
    const { userId, email, phone } = req.query;
    const sessionUser = req.session?.user;
    const targetUserId = userId || sessionUser?.id || sessionUser?._id;
    const targetEmail = email || sessionUser?.email;

    const filters = [];
    if (targetUserId) filters.push({ user: targetUserId });
    if (targetEmail) filters.push({ email: targetEmail });
    if (phone) filters.push({ phone });

    if (filters.length === 0) {
      return res.json([]);
    }

    const apps = await CardApplication.find({ $or: filters }).sort({ createdAt: -1 });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user applications" });
  }
});

// 3. Admin: List All Applications
router.get("/applications", async (req, res) => {
  try {
    const { status } = req.query;
    const query = status && status !== "All" ? { status } : {};
    const apps = await CardApplication.find(query).sort({ createdAt: -1 });
    res.json(apps);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch admin applications" });
  }
});

// 4. Admin: Approve Application
router.post("/applications/:id/approve", async (req, res) => {
  try {
    const { rfidTag, cardType } = req.body;
    const app = await CardApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found" });

    // 1. Generate unique 10-digit Card ID with collision check
    const cardPrefix = (cardType === "Foreigner" || cardType === "Gold") ? "5" : ((cardType === "Student" || cardType === "Blue") ? "3" : "1");
    let assignedCardNumber;
    let cardNumExists = true;
    while (cardNumExists) {
      const randomNumber = Math.floor(100000000 + Math.random() * 900000000).toString();
      assignedCardNumber = (cardPrefix + randomNumber).substring(0, 10);
      const existing = await RfidCard.findOne({ cardNumber: assignedCardNumber });
      if (!existing) cardNumExists = false;
    }

    // 2. Auto-generate guaranteed unique RFID Tag UID by system (4-byte hex: e.g. "4A:2B:3C:4D")
    let tagUid = rfidTag ? rfidTag.toUpperCase().trim() : "";
    if (!tagUid || (await RfidCard.findOne({ rfidTag: tagUid }))) {
      let tagExists = true;
      while (tagExists) {
        const hexParts = Array.from({ length: 4 }, () =>
          Math.floor(Math.random() * 256).toString(16).padStart(2, "0").toUpperCase()
        );
        tagUid = hexParts.join(":");
        const existingTag = await RfidCard.findOne({ rfidTag: tagUid });
        if (!existingTag) tagExists = false;
      }
    }

    // Map card type to authentic MoveSmart category
    let safeCardType = cardType || app.cardCategory || "Regular";
    if (safeCardType === "Regular Pass" || safeCardType === "Silver") safeCardType = "Regular";
    else if (safeCardType === "Student Pass" || safeCardType === "Blue") safeCardType = "Student";
    else if (safeCardType === "Foreigner Tourist Pass" || safeCardType === "Gold") safeCardType = "Foreigner";

    // Create & Activate RFID Card with exact balance from application
    const newCard = new RfidCard({
      cardNumber: assignedCardNumber,
      rfidTag: tagUid.toUpperCase(),
      user: app.user || null,
      balance: app.initialRecharge || 0,
      cardType: safeCardType,
      status: "Active",
    });
    await newCard.save();

    if (app.initialRecharge && app.initialRecharge > 0) {
      const initialTxn = new Transaction({
        transactionId: `TXN-INIT-${Math.floor(100000 + Math.random() * 900000)}`,
        user: app.user || null,
        cardNumber: assignedCardNumber.slice(-4),
        amount: app.initialRecharge,
        type: "Recharge",
        isDebit: false,
        status: "Success",
        paymentMethod: "Initial Card Setup",
        description: `Initial MoveSmart Wallet Balance (${assignedCardNumber})`,
      });
      await initialTxn.save().catch(err => console.error("Initial Txn Error:", err));
    }

    // Update Application Status
    app.status = "Approved";
    app.assignedCardNumber = assignedCardNumber;
    app.assignedRfidTag = tagUid.toUpperCase();
    app.reviewedAt = new Date();
    await app.save();

    if (app.email) {
      sendApplicationStatusEmail(app.email, app.fullName, "Approved", {
        assignedRfidTag: tagUid.toUpperCase(),
        assignedCardNumber
      }).catch(err => console.error("Failed to send approval email:", err));
    }

    res.json({
      message: "Application approved and RFID Card activated with unique Tag UID! Confirmation email sent to applicant.",
      application: app,
      card: newCard,
    });
  } catch (error) {
    console.error("Approval Error:", error);
    res.status(500).json({ error: "Failed to approve application: " + error.message });
  }
});

// 5. Admin: Reject Application
router.post("/applications/:id/reject", async (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: "Rejection reason is required" });
    }

    const app = await CardApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found" });

    app.status = "Rejected";
    app.rejectionReason = reason;
    app.reviewedAt = new Date();
    await app.save();

    if (app.email) {
      sendApplicationStatusEmail(app.email, app.fullName, "Rejected", {
        rejectionReason: reason
      }).catch(err => console.error("Failed to send rejection email:", err));
    }

    res.json({
      message: "Application rejected. Notification email sent to applicant.",
      application: app,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to reject application" });
  }
});

// 6. Admin: Request Correction
router.post("/applications/:id/correction", async (req, res) => {
  try {
    const { note } = req.body;
    const app = await CardApplication.findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found" });

    app.status = "Correction Needed";
    app.correctionNote = note || "Please review and re-upload required documents.";
    app.reviewedAt = new Date();
    await app.save();

    if (app.email) {
      sendApplicationStatusEmail(app.email, app.fullName, "Correction Needed", {
        correctionNote: app.correctionNote
      }).catch(err => console.error("Failed to send correction email:", err));
    }

    res.json({
      message: "Correction requested. Notification email sent to applicant.",
      application: app,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to request correction" });
  }
});

module.exports = router;
