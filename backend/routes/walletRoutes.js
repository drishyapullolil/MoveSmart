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
 * Helper to find a persistent active RFID card in MongoDB for the user
 */
async function findCardForUser(targetUserId, email) {
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
        if (card && targetUserId && mongoose.Types.ObjectId.isValid(targetUserId) && !card.user) {
          card.user = targetUserId;
          await card.save();
        }
      }
    }
  }

  // 3. Fallback: check any card with user if not found above
  if (!card && targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
    card = await RfidCard.findOne({ user: targetUserId });
  }

  return card;
}

// 1. Get Live Wallet Balance & Associated Card Details strictly from MongoDB Database
router.get("/balance", async (req, res) => {
  try {
    const { userId, email } = req.query;
    const sessionUser = req.session?.user;
    const targetUserId = userId || sessionUser?.id || sessionUser?._id;

    const card = await findCardForUser(targetUserId, email);

    if (!card) {
      return res.json({
        hasCard: false,
        balance: 0,
        cardNumber: "",
        lastFour: "",
        isLowBalance: false,
        cardType: "None",
        message: "No active RFID card found. Please book/apply for an RFID card.",
      });
    }

    const balance = Number(card.balance || 0);
    const cardNumber = card.cardNumber || "";
    const lastFour = cardNumber.length >= 4 ? cardNumber.substring(cardNumber.length - 4) : cardNumber;

    res.json({
      hasCard: true,
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
    const { amount, currency = "INR", receipt, userId, email } = req.body;
    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "A valid positive recharge amount is required." });
    }

    const sessionUser = req.session?.user;
    const targetUserId = userId || sessionUser?.id || sessionUser?._id;
    const card = await findCardForUser(targetUserId, email);

    if (!card) {
      return res.status(400).json({ message: "No active RFID card linked to your account. Please apply for / book an RFID card first." });
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

    // Get card in MongoDB
    const card = await findCardForUser(targetUserId, email);

    if (!card) {
      return res.status(400).json({ message: "Cannot recharge: No active RFID card linked to account. Please book an RFID card first." });
    }

    // Permanently update balance in MongoDB database
    card.balance = Number(card.balance || 0) + rechargeAmount;
    await card.save();

    const newBalance = card.balance;
    const cardNumber = card.cardNumber || "";
    const lastFour = cardNumber.length >= 4 ? cardNumber.substring(cardNumber.length - 4) : cardNumber;
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

    const card = await findCardForUser(targetUserId, email);

    if (!card) {
      return res.status(400).json({ error: "Cannot recharge: No active RFID card linked to account. Please book an RFID card first." });
    }

    card.balance = Number(card.balance || 0) + rechargeAmount;
    await card.save();

    const newBalance = card.balance;
    const randomId = Math.floor(100000 + Math.random() * 900000);
    const txnId = `TXN-MS-${randomId}`;
    const cardNumber = card.cardNumber || "";
    const lastFour = cardNumber.length >= 4 ? cardNumber.substring(cardNumber.length - 4) : cardNumber;
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

// 5. Get Payment / Transaction History strictly from Database (MongoDB) - No hardcoded seeds
router.get("/transactions", async (req, res) => {
  try {
    const { userId, type } = req.query;
    const sessionUser = req.session?.user;
    const targetUserId = userId || sessionUser?.id || sessionUser?._id;

    let query = {};
    const conditions = [];

    if (targetUserId && mongoose.Types.ObjectId.isValid(targetUserId)) {
      conditions.push({ user: targetUserId });
      
      // Also match card associated with this user
      const userCard = await RfidCard.findOne({ user: targetUserId });
      if (userCard && userCard.cardNumber) {
        conditions.push({ cardNumber: userCard.cardNumber.slice(-4) });
        conditions.push({ cardNumber: userCard.cardNumber });
      }
    }

    if (conditions.length > 0) {
      query.$or = conditions;
    }

    if (type && type !== "All") {
      query.type = type;
    }

    // Strictly fetch real transactions from database
    const txns = await Transaction.find(query).sort({ createdAt: -1 });

    res.json(txns);
  } catch (error) {
    console.error("Fetch Transactions Error:", error);
    res.status(500).json({ error: "Failed to fetch transaction history" });
  }
});

module.exports = router;
