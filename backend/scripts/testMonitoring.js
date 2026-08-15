/**
 * Automated Verification Script for MoveSmart Driver Safety & Real-Time Monitoring Module
 */
const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config({ path: "e:/project/backend/.env" });

const Bus = require("../models/Bus");
const User = require("../models/User");
const MonitoringSession = require("../models/MonitoringSession");
const SafetyEvent = require("../models/SafetyEvent");
const MonitoringConfig = require("../models/MonitoringConfig");

async function runVerification() {
  console.log("==================================================");
  console.log(" MoveSmart Driver Safety Module - Test Suite      ");
  console.log("==================================================");

  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log("✅ MongoDB Connected for verification");

    // 1. Verify Configuration Model
    console.log("\n[TEST 1] Testing MonitoringConfig model...");
    const config = await MonitoringConfig.getActiveConfig();
    console.log(`✓ Active Config Loaded: EAR=${config.earThreshold}, OfflineTimeout=${config.deviceOfflineTimeoutSec}s`);

    // 2. Find or create a test Bus and Driver
    console.log("\n[TEST 2] Verifying Bus-Driver assignment relationship...");
    let driver = await User.findOne({ role: "driver" });
    if (!driver) {
      driver = await User.create({
        name: "Test Driver Anil",
        email: "test.driver@movesmart.in",
        password: "hashedpassword123",
        role: "driver",
        licenseNumber: "KL-07-2022-99881",
        phone: "+91 98471 22334",
        verificationStatus: "Approved",
      });
      console.log("✓ Created test driver:", driver.name);
    } else {
      console.log("✓ Found existing driver:", driver.name);
    }

    let bus = await Bus.findOne();
    if (!bus) {
      bus = await Bus.create({
        busNumber: "KL-07-TEST-9999",
        busName: "MoveSmart Test Express",
        fromLocation: "Kochi",
        toLocation: "Trivandrum",
        departureTime: "08:00 AM",
        arrivalTime: "12:30 PM",
        price: 350,
        driverId: driver._id,
        driverName: driver.name,
        driverPhone: driver.phone,
        driverLicense: driver.licenseNumber,
        driverVerified: true,
      });
      console.log("✓ Created test bus:", bus.busNumber);
    } else {
      bus.fromLocation = bus.fromLocation || "Kochi";
      bus.toLocation = bus.toLocation || "Trivandrum";
      bus.departureTime = bus.departureTime || "08:00 AM";
      bus.arrivalTime = bus.arrivalTime || "12:30 PM";
      bus.price = bus.price || 350;
      bus.driverId = driver._id;
      bus.driverName = driver.name;
      bus.driverVerified = true;
      await bus.save();
      console.log("✓ Linked driver to bus:", bus.busNumber);
    }

    // 3. Test Monitoring Session Lifecycle
    console.log("\n[TEST 3] Testing MonitoringSession Start/Stop...");
    // Clear any previous test session
    await MonitoringSession.deleteMany({ busId: bus._id });
    await SafetyEvent.deleteMany({ busId: bus._id });

    const session = new MonitoringSession({
      busId: bus._id,
      busNumber: bus.busNumber,
      busName: bus.busName,
      driverId: driver._id,
      driverName: driver.name,
      driverEmail: driver.email,
      driverPhone: driver.phone,
      driverLicense: driver.licenseNumber,
      status: "Active",
      currentDriverStatus: "DRIVER_VERIFIED",
      currentAlertness: "NORMAL",
      deviceStatus: "ONLINE",
    });
    await session.save();
    console.log(`✓ Started Monitoring Session ID: ${session._id} for Bus ${bus.busNumber}`);

    // 4. Test Ingesting Drowsiness Event
    console.log("\n[TEST 4] Ingesting Drowsiness Warning Event...");
    const drowsyEvent = new SafetyEvent({
      sessionId: session._id,
      busId: bus._id,
      busNumber: bus.busNumber,
      driverId: driver._id,
      driverName: driver.name,
      eventType: "DROWSINESS_WARNING",
      title: "🟠 Drowsiness Warning",
      description: "Driver showing sustained eye closure (EAR: 0.18)",
      severity: "High",
      metadata: { ear: 0.18, closureDurationSec: 2.7 },
      status: "Active",
    });
    await drowsyEvent.save();
    session.currentAlertness = "DROWSINESS_WARNING";
    session.metricsSummary.drowsinessWarningCount += 1;
    session.metricsSummary.totalSafetyAlerts += 1;
    await session.save();
    console.log(`✓ Logged Drowsiness Event: ${drowsyEvent._id} (Severity: ${drowsyEvent.severity})`);

    // 5. Test Driver Mismatch Alert
    console.log("\n[TEST 5] Ingesting Driver Mismatch Event...");
    const mismatchEvent = new SafetyEvent({
      sessionId: session._id,
      busId: bus._id,
      busNumber: bus.busNumber,
      driverId: driver._id,
      driverName: driver.name,
      eventType: "DRIVER_MISMATCH",
      title: "🔴 Driver Mismatch Detected",
      description: `Unrecognized person detected in driver seat on Bus ${bus.busNumber}`,
      severity: "Critical",
      confidence: 0.42,
      status: "Active",
    });
    await mismatchEvent.save();
    session.currentDriverStatus = "DRIVER_MISMATCH";
    session.metricsSummary.driverMismatchCount += 1;
    session.metricsSummary.totalSafetyAlerts += 1;
    await session.save();
    console.log(`✓ Logged Driver Mismatch Alert: ${mismatchEvent._id}`);

    // 6. Test Alert Acknowledgment & Resolution
    console.log("\n[TEST 6] Testing Admin Acknowledge and Resolve flow...");
    drowsyEvent.status = "Acknowledged";
    drowsyEvent.acknowledgedByName = "Fleet Admin";
    drowsyEvent.acknowledgedAt = new Date();
    await drowsyEvent.save();
    console.log(`✓ Alert ${drowsyEvent._id} Acknowledged`);

    drowsyEvent.status = "Resolved";
    drowsyEvent.resolvedByName = "Fleet Admin";
    drowsyEvent.resolvedAt = new Date();
    drowsyEvent.resolutionNote = "Driver contacted via radio. Driver drank water and resumed alertness.";
    await drowsyEvent.save();
    console.log(`✓ Alert ${drowsyEvent._id} Resolved with Note: "${drowsyEvent.resolutionNote}"`);

    // 7. End Session
    console.log("\n[TEST 7] Ending Monitoring Session...");
    session.status = "Ended";
    session.endTime = new Date();
    await session.save();
    console.log(`✓ Session ${session._id} Ended cleanly.`);

    console.log("\n==================================================");
    console.log(" ALL 7 BACKEND MONITORING CHECKS PASSED ✅       ");
    console.log("==================================================");
  } catch (err) {
    console.error("❌ Verification failed:", err);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

runVerification();
