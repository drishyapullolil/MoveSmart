const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const RfidCard = require("../models/RfidCard");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

/**
 * Flexible RFID Card lookup helper (exact match + normalized non-alphanumeric match)
 * Safely works with raw hex (e.g. 53262A56), colon-separated (53:26:2A:56), or spaced UIDs (53 26 2A 56)
 */
async function findCardByTagOrNumber(param) {
  if (!param) return null;
  const query = String(param).trim().toUpperCase();

  // 1. Exact query match
  let card = await RfidCard.findOne({
    $or: [{ rfidTag: query }, { cardNumber: query }],
  });
  if (card) return card;

  // 2. Normalized match (strips punctuation/whitespace)
  const rawHex = query.replace(/[^A-F0-9]/gi, "");
  if (rawHex.length >= 4) {
    const pattern = rawHex.match(/.{1,2}/g)?.join("[:\\s-]?") || rawHex;
    card = await RfidCard.findOne({
      $or: [
        { rfidTag: { $regex: new RegExp(`^${pattern}$`, "i") } },
        { cardNumber: query },
      ],
    });
  }
  return card;
}

/**
 * POST /api/bin/deposit
 * Smart Bin Waste Deposit Reward Endpoint
 */
router.post("/deposit", async (req, res) => {
  try {
    // Record ESP32 caller IP for dynamic device mode dispatching
    const callerIp = (req.headers["x-forwarded-for"] || req.socket?.remoteAddress || req.ip || "").replace(/^.*:/, "");
    if (callerIp && callerIp !== "127.0.0.1" && callerIp !== "localhost" && !callerIp.includes("::")) {
      global.lastSeenEsp32Ip = callerIp;
    }

    const { rfidTag, binId, objectDetected, depositId } = req.body;

    // 1. Validate RFID Tag
    if (!rfidTag || String(rfidTag).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "RFID tag is required.",
      });
    }

    // 2. Validate Object/Waste Detection by IR sensor
    if (objectDetected !== true && objectDetected !== "true") {
      return res.status(400).json({
        success: false,
        message: "No waste deposit detected. Reward not credited.",
      });
    }

    // 3. Validate Bin ID
    if (!binId || String(binId).trim() === "") {
      return res.status(400).json({
        success: false,
        message: "Bin ID is required.",
      });
    }

    // 4. Find the existing RFID Card
    const card = await findCardByTagOrNumber(rfidTag);
    if (!card) {
      return res.status(404).json({
        success: false,
        message: "RFID card not found.",
      });
    }

    // 5. Check Card Status
    if (card.status !== "Active") {
      return res.status(403).json({
        success: false,
        message: "RFID card is not active.",
      });
    }

    // 6. Check Card User Ownership
    if (!card.user) {
      return res.status(400).json({
        success: false,
        message: "RFID card is not linked to any registered user.",
      });
    }

    const cleanBinId = String(binId).trim();
    const cleanDepositId = depositId ? String(depositId).trim() : null;

    // 7. Idempotency Check: Prevent duplicate reward for same depositId
    if (cleanDepositId) {
      const existingTxn = await Transaction.findOne({ depositId: cleanDepositId });
      if (existingTxn) {
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: "This Smart Bin deposit has already been rewarded.",
          binId: cleanBinId,
          rfidTag: card.rfidTag,
          reward: 10,
          balance: card.balance,
          transactionId: existingTxn.transactionId,
        });
      }
    }

    // 8. Credit Reward (₹10.00) to RfidCard balance
    const rewardAmount = 10.00;
    card.balance = Number((Number(card.balance) + rewardAmount).toFixed(2));
    await card.save();

    // 9. Record Transaction in Database
    const transactionId = `TXN-BIN-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const transaction = new Transaction({
      transactionId,
      ...(cleanDepositId ? { depositId: cleanDepositId } : {}),
      user: card.user,
      cardNumber: card.cardNumber ? card.cardNumber.slice(-4) : "RFID",
      amount: rewardAmount,
      type: "Smart Bin Reward",
      isDebit: false,
      status: "Success",
      paymentMethod: "Smart Bin Reward",
      description: `Smart Bin Waste Deposit Reward - ${cleanBinId}`,
    });

    try {
      await transaction.save();
    } catch (txnError) {
      // Handle race condition on duplicate depositId index
      if (txnError.code === 11000 && cleanDepositId) {
        // Rollback balance if transaction failed due to concurrent duplicate
        card.balance = Number((Number(card.balance) - rewardAmount).toFixed(2));
        await card.save();

        const existingTxn = await Transaction.findOne({ depositId: cleanDepositId });
        return res.status(200).json({
          success: true,
          duplicate: true,
          message: "This Smart Bin deposit has already been rewarded.",
          binId: cleanBinId,
          rfidTag: card.rfidTag,
          reward: 10,
          balance: card.balance,
          transactionId: existingTxn ? existingTxn.transactionId : transactionId,
        });
      }
      throw txnError;
    }

    // 10. Return Success Response
    return res.status(200).json({
      success: true,
      duplicate: false,
      message: "Smart Bin deposit recorded. ₹10 reward credited.",
      binId: cleanBinId,
      rfidTag: card.rfidTag,
      reward: 10,
      balance: card.balance,
      transactionId: transaction.transactionId,
    });
  } catch (error) {
    console.error("Smart Bin Deposit Error:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error processing Smart Bin deposit: " + error.message,
    });
  }
});

module.exports = router;
