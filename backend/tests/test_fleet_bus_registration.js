const assert = require("assert");
const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });

const Bus = require("../models/Bus");

async function runTest() {
  console.log("=================================================");
  console.log("RUNNING FLEET BUS REGISTRATION VERIFICATION TEST");
  console.log("=================================================");

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error("MONGODB_URI not configured in .env");
    process.exit(1);
  }

  await mongoose.connect(mongoUri);

  const testBusNumber = "KL-06-TEST-748";
  const testBusName = "NewD-KTT";

  // Clean up any previous test run
  await Bus.deleteMany({ busNumber: testBusNumber });

  try {
    // 1. Direct Model Instantiation & Save (like POST /admin/buses)
    console.log("Testing Bus model creation with minimal fleet fields...");
    const fleetBus = new Bus({
      busNumber: testBusNumber,
      busName: testBusName,
      busType: "AC Bus",
      totalSeats: 32,
      operator: "MoveSmart Fleet Ops",
      fromLocation: "Depot",
      toLocation: "Depot",
      departureTime: "06:00 AM",
      arrivalTime: "10:00 PM",
      price: 100,
    });

    await fleetBus.save();
    console.log("  ✓ PASS: 1. Bus saved successfully into MongoDB with ID:", fleetBus._id);

    // 2. Verify Database Persistence & Defaults
    const saved = await Bus.findOne({ busNumber: testBusNumber }).lean();
    assert.ok(saved, "Saved bus must be found in database");
    assert.strictEqual(saved.busName, "NewD-KTT");
    assert.strictEqual(saved.busNumber, "KL-06-TEST-748");
    assert.strictEqual(saved.busType, "AC Bus");
    assert.strictEqual(saved.totalSeats, 32);
    assert.strictEqual(saved.fromLocation, "Depot");
    assert.strictEqual(saved.toLocation, "Depot");
    assert.strictEqual(saved.departureTime, "06:00 AM");
    assert.strictEqual(saved.arrivalTime, "10:00 PM");
    assert.strictEqual(saved.price, 100);
    assert.strictEqual(saved.is_active, true);
    console.log("  ✓ PASS: 2. Saved bus contains verified defaults and active status");

    // 3. Test Model with Schema Defaults (omitting route fields completely)
    const testBusNumber2 = "KL-06-TEST-749";
    await Bus.deleteMany({ busNumber: testBusNumber2 });
    const fleetBusWithSchemaDefaults = new Bus({
      busNumber: testBusNumber2,
      busName: "Fleet Express Default",
      busType: "Normal Bus",
      totalSeats: 32,
    });
    await fleetBusWithSchemaDefaults.save();
    const saved2 = await Bus.findOne({ busNumber: testBusNumber2 }).lean();
    assert.ok(saved2, "Bus with schema defaults saved");
    assert.strictEqual(saved2.fromLocation, "Depot");
    assert.strictEqual(saved2.price, 100);
    console.log("  ✓ PASS: 3. Schema defaults automatically populate missing fields");

    // Clean up test documents
    await Bus.deleteMany({ busNumber: { $in: [testBusNumber, testBusNumber2] } });
    console.log("  ✓ PASS: 4. Cleaned up test bus documents");

    console.log("=================================================");
    console.log("✅ ALL FLEET BUS REGISTRATION TESTS PASSED!");
    console.log("=================================================");
  } finally {
    await mongoose.disconnect();
  }
}

runTest().catch((err) => {
  console.error("Test failed with error:", err);
  process.exit(1);
});
