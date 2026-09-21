/**
 * ============================================================================
 * MoveSmart Complete Passenger RFID Flow & Hardware Verification
 * ============================================================================
 * Tests:
 * 1. User & Card linkage in MongoDB (josepullolil02@gmail.com <-> 53262A56)
 * 2. GET /api/rfid/my-cards endpoint
 * 3. TAP-IN at STOP_VYTTILA (dynamic passenger resolution)
 * 4. TAP-OUT at STOP_KALOOR (4.0 km distance, ₹2.50 Student concession fare)
 * 5. Dynamic Journey and Transaction verification in MongoDB
 * 6. GET /api/rfid/history/:cardNumber endpoint
 * ============================================================================
 */

const mongoose = require("mongoose");
const http = require("http");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { app } = require("../server");
const User = require("../models/User");
const RfidCard = require("../models/RfidCard");
const Journey = require("../models/Journey");
const Transaction = require("../models/Transaction");
const Stop = require("../models/Stop");
const StopDistance = require("../models/StopDistance");

const PORT = 5006;
let testServer;

function request(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on("error", reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function runVerification() {
  console.log("========================================================");
  console.log("  MoveSmart RFID Device + Passenger Connection Test");
  console.log("========================================================\n");

  const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/movesmart";
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  testServer = http.createServer(app);
  await new Promise((r) => testServer.listen(PORT, r));
  console.log(`✅ Test server active on http://localhost:${PORT}`);

  try {
    // ----------------------------------------------------
    // STEP 1: Verify & Link User & Physical Card in MongoDB
    // ----------------------------------------------------
    console.log("\n--- STEP 1: Verify & Link User in MongoDB ---");
    const targetEmail = "josepullolil02@gmail.com";
    const userDoc = await User.findOne({ email: targetEmail.toLowerCase().trim() });
    if (!userDoc) {
      throw new Error(`User ${targetEmail} not found in database!`);
    }
    console.log(`✓ User verified: ${userDoc.name} (${userDoc.email}) [ID: ${userDoc._id}]`);

    const rawTag = "53262A56";
    let cardDoc = await RfidCard.findOne({
      $or: [{ rfidTag: rawTag }, { rfidTag: "53:26:2A:56" }, { rfidTag: "53 26 2A 56" }],
    });

    if (!cardDoc) {
      cardDoc = new RfidCard({
        cardNumber: "3910283921",
        rfidTag: rawTag,
        user: userDoc._id,
        balance: 100.0,
        cardType: "Student",
        status: "Active",
      });
      await cardDoc.save();
    } else {
      cardDoc.user = userDoc._id;
      cardDoc.rfidTag = rawTag;
      cardDoc.cardType = "Student";
      cardDoc.balance = Math.max(50.0, cardDoc.balance);
      cardDoc.status = "Active";
      await cardDoc.save();
    }
    console.log(`✓ Card verified & linked: UID ${cardDoc.rfidTag}, Card #: ${cardDoc.cardNumber}, User: ${userDoc.name}, Balance: ₹${cardDoc.balance.toFixed(2)}`);

    // Clean up any stale in-progress test journeys for this card
    await Journey.deleteMany({ card: cardDoc._id, status: "In-Progress" });

    // Ensure Kerala Stops & Distances exist
    const vyttila = await Stop.findOneAndUpdate(
      { code: "STOP_VYTTILA" },
      { name: "Vyttila Mobility Hub", code: "STOP_VYTTILA", latitude: 9.9658, longitude: 76.2427 },
      { upsert: true, new: true }
    );
    const kaloor = await Stop.findOneAndUpdate(
      { code: "STOP_KALOOR" },
      { name: "Kaloor Bus Terminal", code: "STOP_KALOOR", latitude: 9.9984, longitude: 76.2999 },
      { upsert: true, new: true }
    );

    await StopDistance.findOneAndUpdate(
      { fromStop: vyttila._id, toStop: kaloor._id },
      { fromStop: vyttila._id, toStop: kaloor._id, distanceKm: 4.0 },
      { upsert: true, new: true }
    );

    // ----------------------------------------------------
    // STEP 2: Test GET /api/rfid/my-cards
    // ----------------------------------------------------
    console.log("\n--- STEP 2: GET /api/rfid/my-cards for User ---");
    const myCardsRes = await request({
      hostname: "localhost",
      port: PORT,
      path: `/api/rfid/my-cards?email=${encodeURIComponent(targetEmail)}`,
      method: "GET",
    });

    console.log(`Status: ${myCardsRes.status}, Found Cards: ${myCardsRes.data.cards?.length}`);
    if (myCardsRes.status !== 200 || !myCardsRes.data.cards?.length) {
      throw new Error("Failed to fetch user's cards via /my-cards endpoint");
    }
    console.log("Card Details:", {
      cardNumber: myCardsRes.data.cards[0].cardNumber,
      rfidTag: myCardsRes.data.cards[0].rfidTag,
      cardType: myCardsRes.data.cards[0].cardType,
      balance: myCardsRes.data.cards[0].balance,
      user: myCardsRes.data.cards[0].user?.name,
    });

    // ----------------------------------------------------
    // STEP 3: Test TAP-IN at STOP_VYTTILA
    // ----------------------------------------------------
    console.log("\n--- STEP 3: POST /api/rfid/tap (TAP-IN at Vyttila) ---");
    const tapInRes = await request(
      {
        hostname: "localhost",
        port: PORT,
        path: "/api/rfid/tap",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { rfidTag: "53262A56", stopCode: "STOP_VYTTILA" }
    );

    console.log(`Status: ${tapInRes.status}, Action: ${tapInRes.data.action}`);
    console.log(`Passenger Resolved: ${tapInRes.data.passengerName} (${tapInRes.data.passengerEmail})`);
    console.log(`Message: "${tapInRes.data.message}"`);

    if (tapInRes.status !== 200 || tapInRes.data.action !== "TAP_IN") {
      throw new Error("TAP-IN failed or did not return action TAP_IN");
    }
    if (tapInRes.data.passengerEmail !== targetEmail) {
      throw new Error(`Dynamic passenger resolution mismatch: expected ${targetEmail}, got ${tapInRes.data.passengerEmail}`);
    }

    // ----------------------------------------------------
    // STEP 4: Test TAP-OUT at STOP_KALOOR (4.0 km distance)
    // ----------------------------------------------------
    console.log("\n--- STEP 4: POST /api/rfid/tap (TAP-OUT at Kaloor - 4.0 km) ---");
    const tapOutRes = await request(
      {
        hostname: "localhost",
        port: PORT,
        path: "/api/rfid/tap",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { rfidTag: "53262A56", stopCode: "STOP_KALOOR" }
    );

    console.log(`Status: ${tapOutRes.status}, Action: ${tapOutRes.data.action}`);
    console.log(`Passenger Resolved: ${tapOutRes.data.passengerName} (${tapOutRes.data.passengerEmail})`);
    console.log(`Journey: ${tapOutRes.data.journey?.from} ➔ ${tapOutRes.data.journey?.to} (${tapOutRes.data.journey?.distanceKm} km)`);
    console.log(`Fare Deducted: ₹${tapOutRes.data.journey?.fare.toFixed(2)} (Student Concession 50% Applied)`);
    console.log(`Remaining Card Balance: ₹${tapOutRes.data.card?.balance}`);

    if (tapOutRes.status !== 200 || tapOutRes.data.action !== "TAP_OUT") {
      throw new Error("TAP-OUT failed or did not return action TAP_OUT");
    }
    if (tapOutRes.data.journey?.fare !== 2.5) {
      throw new Error(`Fare calculation mismatch: expected ₹2.50, got ₹${tapOutRes.data.journey?.fare}`);
    }

    // ----------------------------------------------------
    // STEP 5: Verify MongoDB Journey & Transaction Records
    // ----------------------------------------------------
    console.log("\n--- STEP 5: Verify MongoDB Journey & Transaction Records ---");
    const completedJourney = await Journey.findOne({ card: cardDoc._id, status: "Completed" }).sort({ createdAt: -1 });
    console.log("Journey in MongoDB:", {
      id: completedJourney._id,
      user: completedJourney.user,
      distanceKm: completedJourney.distanceKm,
      fare: completedJourney.fare,
      status: completedJourney.status,
    });

    const travelTxn = await Transaction.findOne({ user: userDoc._id, type: "Travel" }).sort({ createdAt: -1 });
    console.log("Transaction in MongoDB:", {
      id: travelTxn?.transactionId,
      user: travelTxn?.user,
      amount: travelTxn?.amount,
      type: travelTxn?.type,
      description: travelTxn?.description,
    });

    if (!completedJourney || completedJourney.user.toString() !== userDoc._id.toString()) {
      throw new Error("Journey was not linked to the correct user in MongoDB");
    }
    if (!travelTxn || travelTxn.amount !== 2.5) {
      throw new Error("Transaction record was not created or amount does not match ₹2.50");
    }

    // ----------------------------------------------------
    // STEP 6: Test GET /api/rfid/history/:cardNumber
    // ----------------------------------------------------
    console.log("\n--- STEP 6: GET /api/rfid/history/:cardNumber ---");
    const historyRes = await request({
      hostname: "localhost",
      port: PORT,
      path: `/api/rfid/history/${cardDoc.cardNumber}`,
      method: "GET",
    });

    console.log(`Status: ${historyRes.status}, Journeys: ${historyRes.data.journeys?.length}, Transactions: ${historyRes.data.transactions?.length}`);
    if (historyRes.status !== 200 || !historyRes.data.journeys?.length) {
      throw new Error("Failed to fetch journeys via /history endpoint");
    }

    console.log("\n========================================================");
    console.log("  ALL TESTS PASSED! RFID FLOW 100% OPERATIONAL ✅");
    console.log("========================================================");
  } finally {
    if (testServer) testServer.close();
  }
}

runVerification().catch((err) => {
  console.error("\n❌ Verification Failed:", err.message);
  if (testServer) testServer.close();
  process.exit(1);
});
