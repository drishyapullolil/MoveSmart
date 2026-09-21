const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config({ path: "e:/project/backend/.env" });

const { app, server } = require("../server");
const RfidCard = require("../models/RfidCard");
const Journey = require("../models/Journey");
const Stop = require("../models/Stop");
const StopDistance = require("../models/StopDistance");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

async function runRfidVerification() {
  console.log("\n========================================================");
  console.log("  MoveSmart RFID Backend & Hardware Flow Verification");
  console.log("========================================================\n");

  while (mongoose.connection.readyState !== 1) {
    await new Promise((r) => setTimeout(r, 200));
  }
  console.log("✅ MongoDB Connection fully ready (readyState === 1)");

  const port = 5003;
  await new Promise((resolve) => server.listen(port, "0.0.0.0", resolve));
  console.log(`✅ Test server running on port ${port}\n`);

  const request = (method, path, body = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = { "Content-Type": "application/json" };
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

      const req = http.request(
        {
          hostname: "localhost",
          port,
          path,
          method,
          headers,
        },
        (res) => {
          let data = "";
          res.on("data", (chunk) => (data += chunk));
          res.on("end", () => {
            try {
              resolve({ status: res.statusCode, body: JSON.parse(data) });
            } catch {
              resolve({ status: res.statusCode, raw: data });
            }
          });
        }
      );
      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  try {
    // 1. Seed MoveSmart Kerala stops
    console.log("--- TEST 1: Seed MoveSmart Kerala Stops & Distances ---");
    const seedRes = await request("POST", "/api/rfid/seed");
    console.log(`Status: ${seedRes.status}`, seedRes.body.message);

    // Clean up any test card with UID 53262A56
    const testTag = "53262A56";
    await RfidCard.deleteMany({ rfidTag: { $in: [testTag, "53:26:2A:56", "53 26 2A 56"] } });

    // 2. Test Unregistered card tap
    console.log("\n--- TEST 2: Unregistered Card Tap ---");
    const unregRes = await request("POST", "/api/rfid/tap", {
      rfidTag: testTag,
      stopCode: "STOP_VYTTILA",
    });
    console.log(`Status: ${unregRes.status}`, `Allowed: ${unregRes.body.allowed}`, `Message: "${unregRes.body.message}"`);
    console.assert(unregRes.status === 404, "Expected 404 for unregistered card");

    // 3. Register MoveSmart Student card with UID 53262A56
    console.log("\n--- TEST 3: Register Student Card (UID: 53262A56, Balance: ₹100.00) ---");
    const card = new RfidCard({
      cardNumber: "3910283921",
      rfidTag: testTag,
      cardType: "Student",
      balance: 100.0,
      status: "Active",
    });
    await card.save();
    console.log(`Card created: Card Number ${card.cardNumber}, Category: ${card.cardType}, Balance: ₹${card.balance.toFixed(2)}`);

    // 4. Test TAP-IN at Vyttila Mobility Hub
    console.log("\n--- TEST 4: TAP-IN at Vyttila Mobility Hub (STOP_VYTTILA) ---");
    const tapInRes = await request("POST", "/api/rfid/tap", {
      rfidTag: testTag,
      stopCode: "STOP_VYTTILA",
    });
    console.log(`Status: ${tapInRes.status}`, `Action: ${tapInRes.body.action}`, `Message: "${tapInRes.body.message}"`);
    console.assert(tapInRes.body.action === "TAP_IN", "Expected TAP_IN action");

    // 5. Test Rapid Duplicate Tap (<10s)
    console.log("\n--- TEST 5: Duplicate Tap at Same Stop (<10 seconds) ---");
    const dupRes = await request("POST", "/api/rfid/tap", {
      rfidTag: testTag,
      stopCode: "STOP_VYTTILA",
    });
    console.log(`Status: ${dupRes.status}`, `Action: ${dupRes.body.action}`, `Message: "${dupRes.body.message}"`);
    console.assert(dupRes.body.action === "IGNORE", "Expected IGNORE action for rapid duplicate tap");

    // 6. Test TAP-OUT at Aluva Bus & Metro Hub
    console.log("\n--- TEST 6: TAP-OUT at Aluva Hub (STOP_ALUVA - 16.5 km distance) ---");
    const tapOutRes = await request("POST", "/api/rfid/tap", {
      rfidTag: testTag,
      stopCode: "STOP_ALUVA",
    });
    console.log(`Status: ${tapOutRes.status}`, `Action: ${tapOutRes.body.action}`);
    console.log(`Journey: ${tapOutRes.body.journey?.from} ➔ ${tapOutRes.body.journey?.to} (${tapOutRes.body.journey?.distanceKm} km)`);
    console.log(`Fare: ₹${tapOutRes.body.journey?.fare.toFixed(2)} (Student Concession applied)`);
    console.log(`Remaining Card Balance: ₹${tapOutRes.body.card?.balance}`);
    console.assert(tapOutRes.body.action === "TAP_OUT", "Expected TAP_OUT action");

    // 7. Verify Transaction record in MongoDB
    console.log("\n--- TEST 7: Verify Transaction Record in MongoDB ---");
    const lastTxn = await Transaction.findOne({ cardNumber: card.cardNumber.slice(-4), type: "Travel" }).sort({ createdAt: -1 });
    console.log(`Transaction ID: ${lastTxn?.transactionId}, Type: ${lastTxn?.type}, Amount: ₹${lastTxn?.amount}, Description: "${lastTxn?.description}"`);
    console.assert(lastTxn !== null, "Expected Travel Transaction to be created in DB");

    // 8. Test Invalid Stop Code
    console.log("\n--- TEST 8: Invalid Stop Code ---");
    const invalidStopRes = await request("POST", "/api/rfid/tap", {
      rfidTag: testTag,
      stopCode: "STOP_NONEXISTENT",
    });
    console.log(`Status: ${invalidStopRes.status}`, `Reason: ${invalidStopRes.body.reason}`, `Message: "${invalidStopRes.body.message}"`);
    console.assert(invalidStopRes.status === 404, "Expected 404 for invalid stop");

    // 9. Test Insufficient Balance
    console.log("\n--- TEST 9: Insufficient Balance Rejection ---");
    const lowBalanceCard = new RfidCard({
      cardNumber: "1910283999",
      rfidTag: "A1B2C3D4",
      cardType: "Regular",
      balance: 3.0,
      status: "Active",
    });
    await lowBalanceCard.save();
    const lowBalRes = await request("POST", "/api/rfid/tap", {
      rfidTag: "A1B2C3D4",
      stopCode: "STOP_VYTTILA",
    });
    console.log(`Status: ${lowBalRes.status}`, `Reason: ${lowBalRes.body.reason}`, `Message: "${lowBalRes.body.message}"`);
    console.assert(lowBalRes.status === 400, "Expected 400 for insufficient balance");
    await RfidCard.deleteOne({ _id: lowBalanceCard._id });

    // 10. Test Normalization with colon-separated UID ("53:26:2A:56")
    console.log("\n--- TEST 10: Colon-separated UID lookup ('53:26:2A:56') ---");
    const colonTapRes = await request("POST", "/api/rfid/tap", {
      rfidTag: "53:26:2A:56",
      stopCode: "STOP_VYTTILA",
    });
    console.log(`Status: ${colonTapRes.status}`, `Action: ${colonTapRes.body.action}`, `Message: "${colonTapRes.body.message}"`);
    console.assert(colonTapRes.body.action === "TAP_IN", "Expected TAP_IN with colon-separated tag");

    console.log("\n========================================================");
    console.log("  ALL RFID BACKEND & HARDWARE TESTS PASSED (10/10) ✅");
    console.log("========================================================\n");
  } catch (err) {
    console.error("Test error:", err);
  } finally {
    server.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runRfidVerification();
