const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const User = require("../models/User");
const Bus = require("../models/Bus");
const RfidDevice = require("../models/RfidDevice");
const RfidCard = require("../models/RfidCard");
const Journey = require("../models/Journey");
const Stop = require("../models/Stop");
const StopDistance = require("../models/StopDistance");
const axios = require("axios");

const API_BASE = "http://localhost:5000/api";

async function runLiveDriveTest() {
  console.log("==================================================");
  console.log("🚍 TESTING MOVESMART LIVE DRIVE + RFID SIMULATION FLOW");
  console.log("==================================================");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // 1. Find Driver and Passenger
  const driver = await User.findOne({ email: "drishyajose03@gmail.com" });
  if (!driver) {
    console.error("❌ Driver not found!");
    process.exit(1);
  }
  console.log(`👤 Driver: ${driver.name} (${driver.email})`);

  const passenger = await User.findOne({ email: "josepullolil02@gmail.com" });
  if (!passenger) {
    console.error("❌ Passenger not found!");
    process.exit(1);
  }
  console.log(`👤 Passenger: ${passenger.name} (${passenger.email}) - Wallet Balance: ₹${passenger.walletBalance || 0}`);

  // Find Driver's Bus
  const bus = await Bus.findOne({ driverId: driver._id }) || await Bus.findOne({ busNumber: driver.busNumber }) || await Bus.findOne();
  console.log(`🚍 Bus: ${bus.busNumber} - Route: ${bus.routeName || (bus.fromLocation + " ➔ " + bus.toLocation)}`);

  const jwt = require("jsonwebtoken");
  const token = jwt.sign(
    { id: driver._id, role: driver.role || "driver" },
    process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026",
    { expiresIn: "1d" }
  );
  const authHeaders = { headers: { Authorization: `Bearer ${token}` } };

  // Ensure passenger has some wallet balance for testing fare deduction
  if (!passenger.walletBalance || passenger.walletBalance < 50) {
    passenger.walletBalance = 100;
    await passenger.save();
    console.log("💰 Added ₹100 test balance to passenger wallet");
  }

  // Ensure RFID Device is registered for this bus & driver
  let device = await RfidDevice.findOne({ driverId: driver._id });
  if (!device) {
    device = await RfidDevice.create({
      deviceId: `DEV-${driver._id.toString().slice(-6).toUpperCase()}`,
      driverId: driver._id,
      busId: bus._id,
      busNumber: bus.busNumber,
      status: "Connected",
      stopCode: "STOP_VYTTILA",
      stopName: "Vyttila Mobility Hub",
      lastHeartbeat: new Date(),
    });
  }

  // 2. Start Live Drive
  console.log("\n1️⃣ Starting Live Drive Session...");
  const startRes = await axios.post(`${API_BASE}/driver/live-drive/start`, {
    driverId: driver._id,
    busId: bus._id,
    startStopCode: "STOP_VYTTILA",
    simulationMode: "DEMO_MANUAL",
  }, authHeaders);
  console.log("✅ Live Drive Started:", startRes.data.message);

  // 3. Move Bus to Kaloor
  console.log("\n2️⃣ Moving Bus to Kaloor Junction (STOP_KALOOR)...");
  const move1Res = await axios.post(`${API_BASE}/driver/live-drive/location`, {
    driverId: driver._id,
    busId: bus._id,
    stopCode: "STOP_KALOOR",
    simulationMode: "DEMO_MANUAL",
  }, authHeaders);
  console.log("✅ Bus Location Updated:", move1Res.data.drive.currentStop.name);

  // Verify RfidDevice synced
  const updatedDev = await RfidDevice.findOne({ driverId: driver._id });
  console.log(`📡 RFID Device Active Stop: ${updatedDev.stopCode} (${updatedDev.stopName})`);

  // 4. Passenger Tap-In at Kaloor Junction
  console.log("\n3️⃣ Passenger Taps RFID Card at Kaloor (TAP-IN)...");
  const rfidCard = await RfidCard.findOne({ assignedUser: passenger._id });
  const uidToUse = rfidCard ? rfidCard.cardUid : "53 26 2A 56";
  console.log(`💳 Card UID: ${uidToUse}`);

  // Clear any incomplete prior test journey for clean test
  await Journey.deleteMany({ userId: passenger._id, status: "IN_PROGRESS" });

  const tapInRes = await axios.post(`${API_BASE}/rfid/tap`, {
    cardUid: uidToUse,
    stopCode: "STOP_KALOOR",
    busId: bus._id,
  });
  console.log("✅ TAP-IN Response:", tapInRes.data);

  // 5. Move Bus to Edappally, then to Aluva
  console.log("\n4️⃣ Moving Bus to Edappally Toll (STOP_EDAPPALLY)...");
  await axios.post(`${API_BASE}/driver/live-drive/location`, {
    driverId: driver._id,
    busId: bus._id,
    stopCode: "STOP_EDAPPALLY",
    simulationMode: "DEMO_MANUAL",
  }, authHeaders);

  console.log("5️⃣ Moving Bus to Aluva Bus Stand (STOP_ALUVA)...");
  const move3Res = await axios.post(`${API_BASE}/driver/live-drive/location`, {
    driverId: driver._id,
    busId: bus._id,
    stopCode: "STOP_ALUVA",
    simulationMode: "DEMO_MANUAL",
  }, authHeaders);
  console.log("✅ Bus Location at Aluva. Total Distance Travelled:", move3Res.data.totalDistanceKm, "km");

  // 6. Passenger Tap-Out at Aluva
  console.log("\n6️⃣ Passenger Taps RFID Card at Aluva (TAP-OUT)...");
  const tapOutRes = await axios.post(`${API_BASE}/rfid/tap`, {
    cardUid: uidToUse,
    stopCode: "STOP_ALUVA",
    busId: bus._id,
  });
  console.log("✅ TAP-OUT Response:", tapOutRes.data);
  console.log(`📊 Journey Summary: Distance=${tapOutRes.data.distanceKm} km, Fare=₹${tapOutRes.data.fareAmount}, New Balance=₹${tapOutRes.data.newBalance}`);

  // 7. End Live Drive Session
  console.log("\n7️⃣ Ending Live Drive Session...");
  const endRes = await axios.post(`${API_BASE}/driver/live-drive/end`, {
    driverId: driver._id,
    busId: bus._id,
  }, authHeaders);
  console.log("✅ Trip Report Summary:", endRes.data.report);

  console.log("\n==================================================");
  console.log("🎉 ALL LIVE DRIVE & RFID INTEGRATION TESTS PASSED!");
  console.log("==================================================");
  await mongoose.disconnect();
}

runLiveDriveTest().catch((err) => {
  console.error("❌ Test Failed:", err.response?.data || err.message);
  process.exit(1);
});
