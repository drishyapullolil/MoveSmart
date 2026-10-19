const assert = require("assert");
const mongoose = require("mongoose");
require("dotenv").config({ path: __dirname + "/../.env" });

const Bus = require("../models/Bus");
const bookingRoutes = require("../routes/bookingRoutes");

async function runApiTest() {
  console.log("=================================================");
  console.log("TESTING POST /admin/buses ENDPOINT SIMULATION");
  console.log("=================================================");

  const mongoUri = process.env.MONGODB_URI;
  await mongoose.connect(mongoUri);

  const testBusNumber = "KL-6-748-API-TEST";
  const testBusName = "NewD-KTT";

  await Bus.deleteMany({ busNumber: testBusNumber });

  try {
    // Find POST /admin/buses route handler
    const postRoute = bookingRoutes.stack.find(
      (layer) => layer.route && layer.route.path === "/admin/buses" && layer.route.methods.post
    );

    assert.ok(postRoute, "POST /admin/buses handler must exist in bookingRoutes");

    const handler = postRoute.route.stack[0].handle;

    // Simulate request with exactly the fields submitted from Tab 3 (as in user screenshot)
    const req = {
      body: {
        busName: testBusName,
        busNumber: testBusNumber,
        totalSeats: 32,
        busType: "AC Bus",
        fromLocation: "",
        toLocation: "",
        departureTime: "",
        arrivalTime: "",
        price: "",
      },
    };

    let statusCode = 200;
    let responseData = null;

    const res = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await handler(req, res);

    console.log("Status Code:", statusCode);
    console.log("Response:", responseData);

    assert.strictEqual(statusCode, 201, "Expected 201 Created");
    assert.strictEqual(responseData.success, true, "Expected success: true");
    assert.strictEqual(responseData.bus.busName, "NewD-KTT");
    assert.strictEqual(responseData.bus.busNumber, testBusNumber);
    assert.strictEqual(responseData.bus.busType, "AC Bus");
    assert.strictEqual(responseData.bus.totalSeats, 32);
    assert.strictEqual(responseData.bus.fromLocation, "Depot");
    assert.strictEqual(responseData.bus.toLocation, "Depot");
    assert.strictEqual(responseData.bus.price, 100);

    // Verify it exists in DB
    const dbBus = await Bus.findOne({ busNumber: testBusNumber });
    assert.ok(dbBus, "Bus must be saved in MongoDB Atlas");
    console.log("  ✓ PASS: POST /admin/buses successfully created bus in MongoDB with ID:", dbBus._id);

    // Clean up
    await Bus.deleteMany({ busNumber: testBusNumber });
    console.log("  ✓ PASS: Cleaned up test document");

    console.log("=================================================");
    console.log("✅ API ENDPOINT POST /admin/buses PASSED!");
    console.log("=================================================");
  } finally {
    await mongoose.disconnect();
  }
}

runApiTest().catch((err) => {
  console.error("API test failed:", err);
  process.exit(1);
});
