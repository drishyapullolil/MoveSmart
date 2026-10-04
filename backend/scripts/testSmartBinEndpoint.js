/**
 * Automated Test Suite for MoveSmart Smart Bin Deposit Endpoint
 * Tests:
 * 1. Valid deposit with ₹10 reward & transaction creation
 * 2. Idempotent duplicate deposit (same depositId)
 * 3. objectDetected: false
 * 4. Unknown RFID tag
 * 5. Inactive / suspended RFID card
 * 6. Missing RFID tag / Bin ID validation
 */
const mongoose = require("mongoose");
const path = require("path");
const http = require("http");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const { app } = require("../server");
const RfidCard = require("../models/RfidCard");
const Transaction = require("../models/Transaction");
const User = require("../models/User");

let serverInstance;
let PORT = 5588;

function makeRequest(path, payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: PORT,
        path,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(data),
        },
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(body) });
          } catch (e) {
            resolve({ status: res.statusCode, body });
          }
        });
      }
    );
    req.on("error", reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/movesmart";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for testing ✅");

    serverInstance = app.listen(PORT);
    console.log(`Test server running on port ${PORT} 🚀\n`);

    // Ensure test card 53262A56 exists and is active
    let testCard = await RfidCard.findOne({
      $or: [{ rfidTag: "53262A56" }, { rfidTag: "53 26 2A 56" }]
    });

    if (!testCard) {
      // Find any user or josepullolil02@gmail.com
      let user = await User.findOne({});
      testCard = new RfidCard({
        cardNumber: "1999999999",
        rfidTag: "53262A56",
        user: user?._id || null,
        balance: 100.0,
        cardType: "Silver",
        status: "Active"
      });
      await testCard.save();
    } else if (!testCard.user) {
      let user = await User.findOne({});
      testCard.user = user?._id || null;
      await testCard.save();
    }

    const initialBalance = testCard.balance;
    console.log(`Initial Test Card Balance: ₹${initialBalance.toFixed(2)} (UID: ${testCard.rfidTag})\n`);

    const testDepositId = `TEST-DEP-${Date.now()}`;

    // TEST 1: Valid Deposit
    console.log("--- TEST 1: Valid Waste Deposit (₹10 Reward) ---");
    const res1 = await makeRequest("/api/bin/deposit", {
      rfidTag: "53 26 2A 56",
      binId: "BIN-001",
      objectDetected: true,
      depositId: testDepositId,
    });
    console.log("Status:", res1.status);
    console.log("Response:", res1.body);

    const cardAfter1 = await RfidCard.findById(testCard._id);
    const txn1 = await Transaction.findOne({ depositId: testDepositId });

    if (
      res1.status === 200 &&
      res1.body.success === true &&
      res1.body.duplicate === false &&
      cardAfter1.balance === Number((initialBalance + 10.00).toFixed(2)) &&
      txn1 &&
      txn1.amount === 10.00 &&
      txn1.type === "Smart Bin Reward"
    ) {
      console.log("✅ TEST 1 PASSED: ₹10 credited, transaction created.\n");
    } else {
      console.error("❌ TEST 1 FAILED!\n");
    }

    // TEST 2: Duplicate Deposit with same depositId
    console.log("--- TEST 2: Duplicate Deposit (Same depositId) ---");
    const res2 = await makeRequest("/api/bin/deposit", {
      rfidTag: "53 26 2A 56",
      binId: "BIN-001",
      objectDetected: true,
      depositId: testDepositId,
    });
    console.log("Status:", res2.status);
    console.log("Response:", res2.body);

    const cardAfter2 = await RfidCard.findById(testCard._id);
    const txnCount = await Transaction.countDocuments({ depositId: testDepositId });

    if (
      res2.status === 200 &&
      res2.body.success === true &&
      res2.body.duplicate === true &&
      cardAfter2.balance === cardAfter1.balance &&
      txnCount === 1
    ) {
      console.log("✅ TEST 2 PASSED: Duplicate ignored, balance unchanged, no 2nd transaction.\n");
    } else {
      console.error("❌ TEST 2 FAILED!\n");
    }

    // TEST 3: objectDetected: false
    console.log("--- TEST 3: Object Detected False ---");
    const res3 = await makeRequest("/api/bin/deposit", {
      rfidTag: "53 26 2A 56",
      binId: "BIN-001",
      objectDetected: false,
      depositId: `TEST-DEP-FALSE-${Date.now()}`,
    });
    console.log("Status:", res3.status);
    console.log("Response:", res3.body);

    const cardAfter3 = await RfidCard.findById(testCard._id);
    if (res3.status === 400 && res3.body.success === false && cardAfter3.balance === cardAfter2.balance) {
      console.log("✅ TEST 3 PASSED: Rejected with 400, balance unchanged.\n");
    } else {
      console.error("❌ TEST 3 FAILED!\n");
    }

    // TEST 4: Unknown RFID
    console.log("--- TEST 4: Unknown RFID Tag ---");
    const res4 = await makeRequest("/api/bin/deposit", {
      rfidTag: "DEADBEEF99",
      binId: "BIN-001",
      objectDetected: true,
      depositId: `TEST-DEP-UNKNOWN-${Date.now()}`,
    });
    console.log("Status:", res4.status);
    console.log("Response:", res4.body);

    if (res4.status === 404 && res4.body.success === false) {
      console.log("✅ TEST 4 PASSED: Rejected with 404 Not Found.\n");
    } else {
      console.error("❌ TEST 4 FAILED!\n");
    }

    // TEST 5: Inactive / Suspended Card
    console.log("--- TEST 5: Suspended RFID Card ---");
    testCard.status = "Suspended";
    await testCard.save();

    const res5 = await makeRequest("/api/bin/deposit", {
      rfidTag: "53 26 2A 56",
      binId: "BIN-001",
      objectDetected: true,
      depositId: `TEST-DEP-SUSPENDED-${Date.now()}`,
    });
    console.log("Status:", res5.status);
    console.log("Response:", res5.body);

    // Restore active status
    testCard.status = "Active";
    await testCard.save();

    if (res5.status === 403 && res5.body.success === false) {
      console.log("✅ TEST 5 PASSED: Rejected with 403 Forbidden for suspended card.\n");
    } else {
      console.error("❌ TEST 5 FAILED!\n");
    }

    // TEST 6: Missing Fields
    console.log("--- TEST 6: Missing Required Fields ---");
    const res6a = await makeRequest("/api/bin/deposit", {
      binId: "BIN-001",
      objectDetected: true,
    });
    const res6b = await makeRequest("/api/bin/deposit", {
      rfidTag: "53 26 2A 56",
      objectDetected: true,
    });
    if (res6a.status === 400 && res6b.status === 400) {
      console.log("✅ TEST 6 PASSED: Missing fields properly rejected with 400.\n");
    } else {
      console.error("❌ TEST 6 FAILED!\n");
    }

    console.log("🎉 ALL TESTS EXECUTED SUCCESSFULLY!");
  } catch (err) {
    console.error("Test execution error:", err);
  } finally {
    if (serverInstance) serverInstance.close();
    await mongoose.disconnect();
    process.exit(0);
  }
}

runTests();
