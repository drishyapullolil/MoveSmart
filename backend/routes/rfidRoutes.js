const express = require("express");
const router = express.Router();
const Stop = require("../models/Stop");
const StopDistance = require("../models/StopDistance");
const RfidCard = require("../models/RfidCard");
const Journey = require("../models/Journey");

// Seed Stops and Distances
router.post("/seed", async (req, res) => {
  try {
    // Clear existing stops and distances to avoid duplicate key issues on re-run
    await Stop.deleteMany({});
    await StopDistance.deleteMany({});

    // 1. Create Stops
    const stopsData = [
      { name: "Al Ghubaiba Bus Station", code: "STOP_GHUB" },
      { name: "Burjuman Station", code: "STOP_BURJ" },
      { name: "Union Square Bus Station", code: "STOP_UNI" },
      { name: "Gold Souq Bus Station", code: "STOP_GOLD" },
      { name: "Jebel Ali Bus Station", code: "STOP_JEBEL" },
      { name: "Al Maktoum Airport", code: "STOP_DWC" }
    ];

    const stops = {};
    for (const item of stopsData) {
      const stop = new Stop(item);
      await stop.save();
      stops[item.code] = stop;
    }

    // 2. Create Distance Mapping (Bi-directional)
    // We will save from A to B. In queries, we will look up both directions.
    const distancesData = [
      { from: "STOP_GHUB", to: "STOP_BURJ", dist: 3.5 },
      { from: "STOP_GHUB", to: "STOP_UNI", dist: 5.8 },
      { from: "STOP_GHUB", to: "STOP_GOLD", dist: 4.2 },
      { from: "STOP_GHUB", to: "STOP_JEBEL", dist: 32.0 },
      { from: "STOP_GHUB", to: "STOP_DWC", dist: 48.0 },

      { from: "STOP_BURJ", to: "STOP_UNI", dist: 4.5 },
      { from: "STOP_BURJ", to: "STOP_GOLD", dist: 6.1 },
      { from: "STOP_BURJ", to: "STOP_JEBEL", dist: 28.5 },
      { from: "STOP_BURJ", to: "STOP_DWC", dist: 44.5 },

      { from: "STOP_UNI", to: "STOP_GOLD", dist: 2.5 },
      { from: "STOP_UNI", to: "STOP_JEBEL", dist: 33.0 },
      { from: "STOP_UNI", to: "STOP_DWC", dist: 49.0 },

      { from: "STOP_GOLD", to: "STOP_JEBEL", dist: 35.0 },
      { from: "STOP_GOLD", to: "STOP_DWC", dist: 51.0 },

      { from: "STOP_JEBEL", to: "STOP_DWC", dist: 18.0 }
    ];

    for (const distInfo of distancesData) {
      const fromStop = stops[distInfo.from];
      const toStop = stops[distInfo.to];
      if (fromStop && toStop) {
        const sd = new StopDistance({
          fromStop: fromStop._id,
          toStop: toStop._id,
          distanceKm: distInfo.dist
        });
        await sd.save();
      }
    }

    res.json({ message: "Default stops and distances seeded successfully ✅", count: Object.keys(stops).length });
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

// Get user's cards
router.get("/my-cards", async (req, res) => {
  try {
    const { email } = req.query;
    if (!email) {
      return res.status(400).json({ message: "Email is required to fetch owned cards" });
    }

    const User = require("../models/User");
    const userObj = await User.findOne({ email: email.toLowerCase() });
    if (!userObj) {
      return res.status(404).json({ message: "User not found" });
    }

    const cards = await RfidCard.find({ user: userObj._id });
    res.json({ cards });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: error.message });
  }
});

// Check Card Balance
router.get("/balance/:tagOrCard", async (req, res) => {
  try {
    const param = req.params.tagOrCard.toUpperCase();
    
    // Check by tag or card number
    let card = await RfidCard.findOne({
      $or: [{ rfidTag: param }, { cardNumber: param }]
    });

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
      return res.status(400).json({ message: "Minimum top-up amount is 10 AED" });
    }

    const queryVal = tagId.toUpperCase();
    let card = await RfidCard.findOne({
      $or: [{ rfidTag: queryVal }, { cardNumber: queryVal }]
    });

    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    card.balance += numericAmount;
    await card.save();

    res.json({
      message: `Successfully topped up ${numericAmount} AED. New balance: ${card.balance.toFixed(2)} AED ✅`,
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

// Get card history
router.get("/history/:cardNumber", async (req, res) => {
  try {
    const { cardNumber } = req.params;
    const card = await RfidCard.findOne({ cardNumber });
    if (!card) {
      return res.status(404).json({ message: "Card not found" });
    }

    const journeys = await Journey.find({ card: card._id })
      .populate("tapInStop")
      .populate("tapOutStop")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ journeys });
  } catch (error) {
    console.error(error);
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

// Live RFID Tap-In / Tap-Out Endpoint
router.post("/tap", async (req, res) => {
  try {
    const { rfidTag, stopCode } = req.body;

    if (!rfidTag || !stopCode) {
      return res.status(400).json({ message: "rfidTag and stopCode are required parameters" });
    }

    // 1. Find RFID Card
    const card = await RfidCard.findOne({ rfidTag: rfidTag.toUpperCase() });
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

    // 2. Find Stop
    const stop = await Stop.findOne({ code: stopCode.toUpperCase() });
    if (!stop) {
      return res.status(404).json({
        allowed: false,
        action: "REJECTED",
        reason: "Invalid stop code",
        message: `Stop code '${stopCode}' not found.`
      });
    }

    // 3. Look for active journey
    let activeJourney = await Journey.findOne({
      card: card._id,
      status: "In-Progress"
    });

    const MIN_BALANCE = 7.50; // Minimum balance to tap-in (7.50 AED is standard)
    const MAX_FARE = 15.00;   // Penalty fare for no tap-out
    const BASE_FARE = 3.00;   // Base fare for tap-in/out
    const RATE_PER_KM = 0.50; // Rate per kilometer

    // Helper to calculate multiplier
    const getMultiplier = (type) => {
      if (type === "Gold") return 1.5;
      if (type === "Blue") return 0.9;
      return 1.0;
    };

    if (activeJourney) {
      // Tap-Out logic (or Expired Check)
      
      // Double tap prevention (tapped at same stop within 10 seconds)
      const secondsSinceTapIn = (Date.now() - new Date(activeJourney.tapInTime).getTime()) / 1000;
      if (activeJourney.tapInStop.toString() === stop._id.toString() && secondsSinceTapIn < 10) {
        return res.status(200).json({
          allowed: true,
          action: "IGNORE",
          message: "Double-tap ignored. Already checked in.",
          card: {
            cardNumber: card.cardNumber,
            balance: card.balance.toFixed(2),
            cardType: card.cardType
          }
        });
      }

      // Check if journey has expired (> 4 hours)
      const hoursSinceTapIn = secondsSinceTapIn / 3600;
      if (hoursSinceTapIn > 4) {
        // Expire the active journey, deduct penalty, and process this tap as a new TAP_IN
        activeJourney.status = "Expired";
        activeJourney.fare = MAX_FARE * getMultiplier(card.cardType);
        
        card.balance -= activeJourney.fare;
        await activeJourney.save();
        await card.save();

        // Now process as a brand new Tap-In
        if (card.balance < MIN_BALANCE) {
          return res.status(400).json({
            allowed: false,
            action: "REJECTED",
            reason: "Insufficient balance after penalty",
            message: `Previous journey expired: -${activeJourney.fare.toFixed(2)} AED. Insufficient balance to tap-in: ${card.balance.toFixed(2)} AED.`,
            card: {
              cardNumber: card.cardNumber,
              balance: card.balance.toFixed(2)
            }
          });
        }

        const newJourney = new Journey({
          card: card._id,
          user: card.user,
          tapInStop: stop._id,
          tapInTime: new Date(),
          status: "In-Progress"
        });
        await newJourney.save();

        return res.status(200).json({
          allowed: true,
          action: "TAP_IN",
          message: `Previous journey expired (-${activeJourney.fare.toFixed(2)} AED). Boarded at ${stop.name}.`,
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
      // Lookup distance in either direction
      const distObj = await StopDistance.findOne({
        $or: [
          { fromStop: activeJourney.tapInStop, toStop: stop._id },
          { fromStop: stop._id, toStop: activeJourney.tapInStop }
        ]
      });

      // Default to 4 km if distance is not explicitly configured
      const distanceKm = distObj ? distObj.distanceKm : 4.0;

      // Calculate Fare
      const multiplier = getMultiplier(card.cardType);
      let calculatedFare = (BASE_FARE + (distanceKm * RATE_PER_KM)) * multiplier;
      
      // Cap fare at max
      if (calculatedFare > (MAX_FARE * multiplier)) {
        calculatedFare = MAX_FARE * multiplier;
      }

      card.balance -= calculatedFare;
      await card.save();

      // Finalize Journey
      activeJourney.tapOutStop = stop._id;
      activeJourney.tapOutTime = new Date();
      activeJourney.distanceKm = distanceKm;
      activeJourney.fare = calculatedFare;
      activeJourney.status = "Completed";
      await activeJourney.save();

      const tapInStopObj = await Stop.findById(activeJourney.tapInStop);

      return res.status(200).json({
        allowed: true,
        action: "TAP_OUT",
        message: `Tap-Out success. Charged: ${calculatedFare.toFixed(2)} AED for ${distanceKm.toFixed(1)} km.`,
        journey: {
          from: tapInStopObj ? tapInStopObj.name : "Unknown",
          to: stop.name,
          distanceKm,
          fare: calculatedFare
        },
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

    } else {
      // Tap-In logic
      if (card.balance < MIN_BALANCE) {
        return res.status(400).json({
          allowed: false,
          action: "REJECTED",
          reason: "Insufficient balance",
          message: `Card balance (${card.balance.toFixed(2)} AED) is below the minimum required balance of ${MIN_BALANCE.toFixed(2)} AED.`,
          card: {
            cardNumber: card.cardNumber,
            balance: card.balance.toFixed(2)
          }
        });
      }

      const newJourney = new Journey({
        card: card._id,
        user: card.user,
        tapInStop: stop._id,
        tapInTime: new Date(),
        status: "In-Progress"
      });

      await newJourney.save();

      return res.status(200).json({
        allowed: true,
        action: "TAP_IN",
        message: `Tap-In success. Boarded at ${stop.name}.`,
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

  } catch (error) {
    console.error("Tap Error:", error);
    res.status(500).json({ message: "System error: " + error.message });
  }
});

module.exports = router;
