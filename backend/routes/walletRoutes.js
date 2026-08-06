const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const mongoose = require("mongoose");
const Razorpay = require("razorpay");
const RfidCard = require("../models/RfidCard");
const Transaction = require("../models/Transaction");
const CardApplication = require("../models/CardApplication");

// Initialize Razorpay SDK instance
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_TI0yMfx2wp1cnE",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "8wZtSrCBWQa6KH14bqzctgu9",
});

/**
 * Helper to get or create a persistent active RFID card in MongoDB for balance tracking
 */
async function getOrCreateCardForUser(targetUserId, email) {
  let card = null;

  // 1. Try finding card explicitly linked to targetUserId
  if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
    card = await RfidCard.findOne({ user: targetUserId, status: "Active" });
  }

  // 2. Fallback: try via approved CardApplication
  if (!card && (targetUserId || email)) {
    const appFilter = [];
    if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) appFilter.push({ user: targetUserId });
    if (email) appFilter.push({ email: email });

    if (appFilter.length > 0) {
      const app = await CardApplication.findOne({ $or: appFilter, status: "Approved" }).sort({ createdAt: -1 });
      if (app && app.assignedCardNumber) {
        card = await RfidCard.findOne({ cardNumber: app.assignedCardNumber });
      }
    }
  }

  // 3. Fallback for guest/demo card "9842104910"
  if (!card && (!targetUserId || !mongoose.Types.ObjectId.isValid(targetUserId))) {
    card = await RfidCard.findOne({ cardNumber: "9842104910", status: "Active" });
  }

  // 4. If STILL no card exists, CREATE a new card in MongoDB specifically for this user!
  if (!card) {
    const userObjId = targetUserId && mongoose.Types.ObjectId.isValid(targetUserId) ? targetUserId : null;
    const cardNum = userObjId ? "9842" + Math.floor(100000 + Math.random() * 900000) : "9842104910";
    const tagNum = "TAG" + Math.floor(100000 + Math.random() * 900000);

    card = new RfidCard({
      cardNumber: cardNum,
      rfidTag: tagNum,
      user: userObjId,
      balance: 250.0, // Default initial balance
      cardType: "Regular Pass",
      status: "Active",
    });
    await card.save();
  } else if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId) && !card.user) {
    card.user = targetUserId;
    await card.save();
  }

  return card;
}

// 1. Get Live Wallet Balance & Associated Card Details from MongoDB
router.get("/balance", async (req, res) => {
  try {
    const { userId, email } = req.query;
    const sessionUser = req.session?.user;
    const targetUserId = userId || sessionUser?.id || sessionUser?._id;

    const card = await getOrCreateCardForUser(targetUserId, email);

    const balance = Number(card.balance || 0);
    const cardNumber = card.cardNumber || "9842104910";
    const lastFour = cardNumber.substring(cardNumber.length - 4);

    res.json({
      balance,
      cardNumber,
      lastFour,
      isLowBalance: balance < 30.0,
      cardType: card.cardType || "Regular Pass",
    });
  } catch (error) {
    console.error("Fetch Balance Error:", error);
    res.status(500).json({ error: "Failed to fetch wallet balance" });
  }
});

// 2. Create Razorpay Order Endpoint
router.post("/create-razorpay-order", async (req, res) => {
  try {
    const { amount, currency = "INR", receipt } = req.body;
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "A valid positive recharge amount is required." });
    }

    const options = {
      amount: Math.round(numericAmount * 100), // convert to paise
      currency: currency || "INR",
      receipt: receipt || `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    res.json({
      success: true,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_TI0yMfx2wp1cnE",
    });
  } catch (error) {
    console.error("Razorpay Create Order Error:", error);
    res.status(500).json({ message: "Failed to create Razorpay order: " + error.message });
  }
});

// 3. Verify Razorpay Payment & Persist Balance + Transaction to Database (MongoDB)
router.post("/verify-razorpay-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      amount,
      userId,
      email,
      paymentMethod = "Razorpay",
      description = "Wallet Recharge via Razorpay",
      type = "Recharge",
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ message: "Missing Razorpay verification parameters." });
    }

    // Verify HMAC-SHA256 signature
    const secret = process.env.RAZORPAY_KEY_SECRET || "8wZtSrCBWQa6KH14bqzctgu9";
    const expectedSignature = crypto
      .createHmac("sha256", secret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ message: "Invalid Razorpay payment signature. Verification failed." });
    }

    const rechargeAmount = Number(amount);
    const sessionUser = req.session?.user;
    const targetUserId = userId || sessionUser?.id || sessionUser?._id;

    // Get or Create card in MongoDB
    const card = await getOrCreateCardForUser(targetUserId, email);

    // Permanently update balance in MongoDB database
    card.balance = Number(card.balance || 0) + rechargeAmount;
    await card.save();

    const newBalance = card.balance;
    const cardNumber = card.cardNumber || "9842104910";
    const lastFour = cardNumber.substring(cardNumber.length - 4);
    const txnId = razorpay_payment_id || `TXN-MS-${Math.floor(100000 + Math.random() * 900000)}`;

    const userObjectId = targetUserId && mongoose.Types.ObjectId.isValid(targetUserId) ? targetUserId : (card.user || null);

    // Persist Transaction Record to MongoDB Database
    const transaction = new Transaction({
      transactionId: txnId,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      user: userObjectId,
      cardNumber: lastFour,
      amount: rechargeAmount,
      type: type || "Recharge",
      isDebit: false,
      status: "Success",
      paymentMethod: paymentMethod || "Razorpay",
      description: description || `Wallet Recharge of ₹${rechargeAmount} via Razorpay`,
    });

    await transaction.save();

    res.json({
      success: true,
      message: `₹${rechargeAmount} successfully added to MoveSmart Nol Wallet via Razorpay!`,
      newBalance,
      transaction,
      paymentId: razorpay_payment_id,
    });
  } catch (error) {
    console.error("Razorpay Payment Verification Error:", error);
    res.status(500).json({ error: "Failed to verify payment: " + error.message });
  }
});

// 4. Legacy Direct Recharge Endpoint (Fallback)
router.post("/recharge", async (req, res) => {
  try {
    const { amount, paymentMethod, userId, email } = req.body;
    const rechargeAmount = Number(amount);

    if (!rechargeAmount || rechargeAmount <= 0) {
      return res.status(400).json({ error: "Please enter a valid recharge amount." });
    }

    const sessionUser = req.session?.user;
    const targetUserId = userId || sessionUser?.id || sessionUser?._id;
    const method = paymentMethod || "Razorpay";

    const card = await getOrCreateCardForUser(targetUserId, email);

    card.balance = Number(card.balance || 0) + rechargeAmount;
    await card.save();

    const newBalance = card.balance;
    const randomId = Math.floor(100000 + Math.random() * 900000);
    const txnId = `TXN-MS-${randomId}`;
    const cardNumber = card.cardNumber || "9842104910";
    const lastFour = cardNumber.substring(cardNumber.length - 4);
    const userObjectId = targetUserId && mongoose.Types.ObjectId.isValid(targetUserId) ? targetUserId : (card.user || null);

    const transaction = new Transaction({
      transactionId: txnId,
      user: userObjectId,
      cardNumber: lastFour,
      amount: rechargeAmount,
      type: "Recharge",
      isDebit: false,
      status: "Success",
      paymentMethod: method,
      description: `Wallet Recharge via ${method}`,
    });
    await transaction.save();

    res.json({
      message: `₹${rechargeAmount} added successfully to your MoveSmart Wallet!`,
      newBalance,
      transaction,
      notification: `₹${rechargeAmount} added successfully`,
    });
  } catch (error) {
    console.error("Recharge Error:", error);
    res.status(500).json({ error: "Failed to process wallet recharge" });
  }
});

// 5. Get Payment / Transaction History from Database (MongoDB)
router.get("/transactions", async (req, res) => {
  try {
    const { userId, type } = req.query;
    const sessionUser = req.session?.user;
    const targetUserId = userId || sessionUser?.id || sessionUser?._id;

    let query = {};
    if (targetUserId) {
      const isValidObjId = mongoose.Types.ObjectId.isValid(targetUserId);
      if (isValidObjId) {
        query.$or = [{ user: targetUserId }, { user: null }];
      } else {
        query.$or = [{ user: null }];
      }
    }

    if (type && type !== "All") {
      query.type = type;
    }

    let txns = await Transaction.find(query).sort({ createdAt: -1 });

    // If database contains 0 transactions (fresh setup), seed initial transactions into MongoDB
    if (txns.length === 0) {
      const totalCount = await Transaction.countDocuments();
      if (totalCount === 0) {
        const now = new Date();
        const userObjectId = targetUserId && mongoose.Types.ObjectId.isValid(targetUserId) ? targetUserId : null;
        const initialSeed = [
          {
            transactionId: "pay_RzrPay_981290",
            razorpayPaymentId: "pay_RzrPay_981290",
            razorpayOrderId: "order_RzrPay_981290",
            amount: 200,
            type: "Recharge",
            isDebit: false,
            status: "Success",
            paymentMethod: "Razorpay",
            description: "Wallet Top-Up via Razorpay UPI",
            cardNumber: "4910",
            user: userObjectId,
            createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000),
          },
          {
            transactionId: "TXN-MS-881244",
            amount: 18,
            type: "Travel",
            isDebit: true,
            status: "Success",
            paymentMethod: "Wallet Balance",
            description: "Bus Fare - Erattupetta to Pala (KSRTC Fast Passenger)",
            cardNumber: "4910",
            user: userObjectId,
            createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
          },
          {
            transactionId: "pay_RzrPay_881102",
            razorpayPaymentId: "pay_RzrPay_881102",
            razorpayOrderId: "order_RzrPay_881102",
            amount: 500,
            type: "Recharge",
            isDebit: false,
            status: "Success",
            paymentMethod: "Razorpay",
            description: "Initial Nol Wallet Recharge via Razorpay",
            cardNumber: "4910",
            user: userObjectId,
            createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
          },
          {
            transactionId: "TXN-MS-880911",
            amount: 32,
            type: "Travel",
            isDebit: true,
            status: "Success",
            paymentMethod: "Wallet Balance",
            description: "Bus Fare - Pala to Kottayam Express Corridor",
            cardNumber: "4910",
            user: userObjectId,
            createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
          },
        ];

        await Transaction.insertMany(initialSeed);
        txns = await Transaction.find(query).sort({ createdAt: -1 });
      } else {
        // If DB has transactions but user filter yielded none, fetch all transactions from DB sorted by date
        let fallbackQuery = {};
        if (type && type !== "All") fallbackQuery.type = type;
        txns = await Transaction.find(fallbackQuery).sort({ createdAt: -1 });
      }
    }

    res.json(txns);
  } catch (error) {
    console.error("Fetch Transactions Error:", error);
    res.status(500).json({ error: "Failed to fetch transaction history" });
  }
});

module.exports = router;
