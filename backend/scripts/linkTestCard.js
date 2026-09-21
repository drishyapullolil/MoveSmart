/**
 * Link Physical RFID Card to Existing MoveSmart User
 * User: josepullolil02@gmail.com
 * Card UID: 53262A56
 */
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const User = require("../models/User");
const RfidCard = require("../models/RfidCard");

async function linkCard() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/movesmart";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB ✅");

    const targetEmail = "josepullolil02@gmail.com";
    const targetUid = "53262A56";

    // 1. Find the user
    const user = await User.findOne({ email: targetEmail.toLowerCase().trim() });
    if (!user) {
      console.error(`❌ MoveSmart user '${targetEmail}' was not found. Please create/register this passenger account first.`);
      process.exit(1);
    }
    console.log(`✓ Found user: ${user.name} (${user.email}) [ID: ${user._id}]`);

    // 2. Normalize and look for the RFID card
    const normalizedUid = targetUid.replace(/[^A-F0-9]/gi, "").toUpperCase();
    let card = await RfidCard.findOne({
      $or: [
        { rfidTag: normalizedUid },
        { rfidTag: "53:26:2A:56" },
        { rfidTag: "53 26 2A 56" },
      ],
    });

    if (card) {
      // Check ownership
      if (card.user && card.user.toString() === user._id.toString()) {
        console.log(`✓ Card ${card.rfidTag} (Card #: ${card.cardNumber}) is already linked to ${user.name} (${user.email}).`);
      } else if (card.user && card.user.toString() !== user._id.toString()) {
        console.error(`⚠️ Conflict: Card ${card.rfidTag} is currently linked to another user ID (${card.user}). Will not silently overwrite.`);
        process.exit(1);
      } else {
        // Card exists with no user assigned -> Link it!
        card.user = user._id;
        card.rfidTag = normalizedUid; // Ensure clean uppercase hex
        await card.save();
        console.log(`✅ Successfully linked physical RFID Card ${card.rfidTag} (Card #: ${card.cardNumber}, Balance: ₹${card.balance.toFixed(2)}, Category: ${card.cardType}) to ${user.name} (${user.email}).`);
      }
    } else {
      // Create new card for this user if not present
      const cardNumber = "3" + Math.floor(100000000 + Math.random() * 900000000).toString().slice(0, 9);
      card = new RfidCard({
        cardNumber,
        rfidTag: normalizedUid,
        user: user._id,
        balance: 100.0,
        cardType: "Student",
        status: "Active",
      });
      await card.save();
      console.log(`✅ Created and linked new RFID Card ${card.rfidTag} (Card #: ${card.cardNumber}) to ${user.name} (${user.email}).`);
    }

    console.log("\n--- Final Card Record in Database ---");
    console.log({
      _id: card._id,
      cardNumber: card.cardNumber,
      rfidTag: card.rfidTag,
      user: card.user,
      balance: card.balance,
      cardType: card.cardType,
      status: card.status,
    });

    await mongoose.disconnect();
    console.log("\nDatabase connection closed. Link verified successfully! ✅");
  } catch (err) {
    console.error("Linking error:", err);
    process.exit(1);
  }
}

linkCard();
