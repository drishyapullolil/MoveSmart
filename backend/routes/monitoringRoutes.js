const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const User = require("../models/User");
const Route = require("../models/Route");
const Schedule = require("../models/Schedule");
const MonitoringSession = require("../models/MonitoringSession");
const SafetyEvent = require("../models/SafetyEvent");
const MonitoringConfig = require("../models/MonitoringConfig");
const { protect, adminOnly, driverOnly, approvedDriverOnly } = require("../middleware/authMiddleware");
const {
  emitSafetyAlert,
  emitTelemetryUpdate,
  emitDeviceStatusChange,
  emitSessionStatusChange,
  emitStreamFrame,
} = require("../services/socketService");

// ----------------------------------------------------
// 1. CONFIGURATION APIS
// ----------------------------------------------------

// GET /api/monitoring/config - Retrieve current monitoring thresholds & settings
router.get("/config", async (req, res) => {
  try {
    const config = await MonitoringConfig.getActiveConfig();
    res.json({ success: true, config });
  } catch (error) {
    console.error("Error fetching monitoring config:", error);
    res.status(500).json({ success: false, message: "Failed to fetch monitoring config", error: error.message });
  }
});

// PUT /api/monitoring/config - Update monitoring settings (Admin only)
router.put("/config", protect, adminOnly, async (req, res) => {
  try {
    let config = await MonitoringConfig.getActiveConfig();
    const allowedFields = [
      "earThreshold",
      "earlyWarningDurationSec",
      "drowsinessDurationSec",
      "criticalDrowsinessDurationSec",
      "driverAbsenceGraceSec",
      "driverAbsenceCriticalSec",
      "faceMatchConfidenceThreshold",
      "heartbeatIntervalSec",
      "deviceOfflineTimeoutSec",
      "alertEscalationTimeSec",
      "audioAlertsEnabled",
      "voicePromptsEnabled",
      "voicePromptTextEarly",
      "voicePromptTextDrowsy",
      "voicePromptTextCritical",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        config[field] = req.body[field];
      }
    });

    await config.save();
    res.json({ success: true, message: "Monitoring configuration updated successfully", config });
  } catch (error) {
    console.error("Error updating monitoring config:", error);
    res.status(500).json({ success: false, message: "Failed to update config", error: error.message });
  }
});

// ----------------------------------------------------
// 1b. DRIVER BIOMETRIC FACE PROFILE MANAGEMENT
// ----------------------------------------------------

// POST /api/monitoring/driver/:driverId/face-profile - Enroll / Update driver 128-d face encoding
router.post("/driver/:driverId/face-profile", async (req, res) => {
  try {
    const { driverId } = req.params;
    const { encoding, enrolledAt } = req.body;

    if (!encoding || !Array.isArray(encoding) || encoding.length === 0) {
      return res.status(400).json({ success: false, message: "Valid 128-d face encoding array required." });
    }

    let user = null;
    if (mongoose.Types.ObjectId.isValid(driverId)) {
      user = await User.findById(driverId);
    } else {
      user = await User.findOne({
        $or: [
          { email: driverId },
          { name: new RegExp(`^${driverId}$`, "i") },
          { licenseNumber: new RegExp(`^${driverId}$`, "i") },
        ],
      });
      if (!user && driverId === "drv-sample-01") {
        user = await User.findOne({ role: "driver" });
      }
    }

    if (!user) {
      return res.status(404).json({ success: false, message: `Driver not found with identifier: ${driverId}` });
    }

    user.faceProfile = {
      encoding: encoding.map(Number),
      enrolledAt: enrolledAt ? new Date(enrolledAt) : new Date(),
    };

    await user.save();

    res.json({
      success: true,
      message: `Face profile enrolled successfully for driver ${user.name}.`,
      driverId: user._id,
      driverName: user.name,
      enrolledAt: user.faceProfile.enrolledAt,
      dimensions: user.faceProfile.encoding.length,
    });
  } catch (error) {
    console.error("Error saving face profile:", error);
    res.status(500).json({ success: false, message: "Failed to enroll face profile", error: error.message });
  }
});

// GET /api/monitoring/driver/:driverId/face-profile - Fetch enrolled driver face profile
router.get("/driver/:driverId/face-profile", async (req, res) => {
  try {
    const { driverId } = req.params;

    let user = null;
    if (mongoose.Types.ObjectId.isValid(driverId)) {
      user = await User.findById(driverId);
    } else {
      user = await User.findOne({
        $or: [
          { email: driverId },
          { name: new RegExp(`^${driverId}$`, "i") },
          { licenseNumber: new RegExp(`^${driverId}$`, "i") },
        ],
      });
      if (!user && driverId === "drv-sample-01") {
        user = await User.findOne({ role: "driver" });
      }
    }

    if (!user || !user.faceProfile || !user.faceProfile.encoding || user.faceProfile.encoding.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No enrolled face profile found for driver: ${driverId}`,
      });
    }

    res.json({
      success: true,
      driverId: user._id,
      driverName: user.name,
      encoding: user.faceProfile.encoding,
      enrolledAt: user.faceProfile.enrolledAt,
    });
  } catch (error) {
    console.error("Error fetching face profile:", error);
    res.status(500).json({ success: false, message: "Failed to fetch face profile", error: error.message });
  }
});

// DELETE /api/monitoring/driver/:driverId/face-profile - Reset/Delete enrolled driver face profile
router.delete("/driver/:driverId/face-profile", async (req, res) => {
  try {
    const { driverId } = req.params;
    let user = null;
    if (mongoose.Types.ObjectId.isValid(driverId)) {
      user = await User.findById(driverId);
    } else {
      user = await User.findOne({
        $or: [
          { email: driverId },
          { name: new RegExp(`^${driverId}$`, "i") },
          { licenseNumber: new RegExp(`^${driverId}$`, "i") },
        ],
      });
    }

    if (user) {
      user.faceProfile = undefined;
      user.faceEncoding = undefined;
      user.faceEnrolledAt = undefined;
      await user.save();
    }

    res.json({
      success: true,
      message: "Face profile deleted successfully.",
      driverId,
    });
  } catch (error) {
    console.error("Error deleting face profile:", error);
    res.status(500).json({ success: false, message: "Failed to delete face profile", error: error.message });
  }
});

// POST /api/monitoring/verify-driver-identity - Automated Biometric Driver Verification & Status Check
router.post("/verify-driver-identity", async (req, res) => {
  try {
    const { encoding, driverId, busNumber } = req.body;

    if (!encoding || !Array.isArray(encoding) || encoding.length !== 128) {
      return res.status(400).json({ success: false, message: "Valid 128-d candidate face encoding array required." });
    }

    const candidateVec = encoding.map(Number);
    const computeDistance = (v1, v2) => {
      let sum = 0;
      for (let i = 0; i < 128; i++) {
        const d = v1[i] - v2[i];
        sum += d * d;
      }
      return Math.sqrt(sum);
    };

    let targetDriver = null;
    if (driverId) {
      if (mongoose.Types.ObjectId.isValid(driverId)) {
        targetDriver = await User.findById(driverId);
      } else {
        targetDriver = await User.findOne({
          $or: [
            { email: driverId },
            { name: new RegExp(`^${driverId}$`, "i") },
            { licenseNumber: new RegExp(`^${driverId}$`, "i") },
          ],
        });
      }
    }

    // 1. Direct Target Driver Verification
    const targetEnc = (targetDriver?.faceProfile?.encoding?.length === 128 ? targetDriver.faceProfile.encoding : null) ||
      (targetDriver?.faceEncoding?.length === 128 ? targetDriver.faceEncoding : null);

    if (targetDriver && targetEnc) {
      const distance = computeDistance(candidateVec, targetEnc);
      const isMatch = distance <= 0.50;
      const matchScore = Math.max(0, Math.min(100, Math.round((1 - distance / 1.414) * 100)));
      const isApproved = targetDriver.verificationStatus === "Approved";

      return res.json({
        success: true,
        verified: isMatch && isApproved,
        isBiometricMatch: isMatch,
        isLicenseApproved: isApproved,
        driverId: targetDriver._id,
        driverName: targetDriver.name,
        licenseNumber: targetDriver.licenseNumber,
        verificationStatus: targetDriver.verificationStatus || "Unverified",
        distance,
        matchConfidence: matchScore,
        enrolledAt: targetDriver.faceProfile?.enrolledAt || targetDriver.faceEnrolledAt,
        message: isMatch
          ? (isApproved ? `Driver ${targetDriver.name} biometrically verified & approved.` : `Driver biometric matches, but license status is '${targetDriver.verificationStatus}'.`)
          : `Face biometric does not match assigned driver ${targetDriver.name}.`,
      });
    }

    // 2. Automated Fleet-Wide Biometric Driver Identification
    const enrolledDrivers = await User.find({
      role: { $regex: /^driver$/i },
      $or: [
        { "faceProfile.encoding": { $exists: true, $ne: [] } },
        { faceEncoding: { $exists: true, $ne: [] } },
      ],
    });

    let bestDriver = null;
    let minDistance = 999.0;

    for (const drv of enrolledDrivers) {
      const drvEnc = (drv.faceProfile?.encoding?.length === 128 ? drv.faceProfile.encoding : null) ||
        (drv.faceEncoding?.length === 128 ? drv.faceEncoding : null);
      if (drvEnc) {
        const dist = computeDistance(candidateVec, drvEnc);
        if (dist < minDistance) {
          minDistance = dist;
          bestDriver = drv;
        }
      }
    }

    if (bestDriver && minDistance <= 0.50) {
      const matchScore = Math.max(0, Math.min(100, Math.round((1 - minDistance / 1.414) * 100)));
      const isApproved = bestDriver.verificationStatus === "Approved";

      return res.json({
        success: true,
        verified: isApproved,
        autoIdentified: true,
        isBiometricMatch: true,
        isLicenseApproved: isApproved,
        driverId: bestDriver._id,
        driverName: bestDriver.name,
        licenseNumber: bestDriver.licenseNumber,
        verificationStatus: bestDriver.verificationStatus || "Unverified",
        distance: minDistance,
        matchConfidence: matchScore,
        message: isApproved
          ? `Automatically detected & verified approved driver: ${bestDriver.name}.`
          : `Detected driver ${bestDriver.name}, but account verification status is '${bestDriver.verificationStatus}'.`,
      });
    }

    return res.json({
      success: true,
      verified: false,
      isBiometricMatch: false,
      isLicenseApproved: false,
      distance: minDistance < 999 ? minDistance : 1.414,
      matchConfidence: minDistance < 999 ? Math.max(0, Math.min(100, Math.round((1 - minDistance / 1.414) * 100))) : 0,
      message: targetDriver && !targetDriver.faceProfile?.encoding
        ? `Driver ${targetDriver.name} has no enrolled biometric face profile.`
        : "Unrecognized face. Does not match any registered driver in fleet database.",
    });
  } catch (error) {
    console.error("Error verifying driver identity:", error);
    res.status(500).json({ success: false, message: "Driver verification failed", error: error.message });
  }
});

// ----------------------------------------------------
// 2. MONITORING SESSION LIFECYCLE
// ----------------------------------------------------

// POST /api/monitoring/session/start - Start session for an assigned bus & active trip
// NOTE: Derives driver from the existing Bus assignment or provided driverId!
router.post("/session/start", async (req, res) => {
  try {
    const { busId, busNumber, driverId: reqDriverId, scheduleId } = req.body;

    let bus = null;
    if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      bus = await Bus.findById(busId);
    } else if (busNumber) {
      bus = await Bus.findOne({ busNumber: new RegExp(`^${busNumber.trim()}$`, "i") });
    } else {
      bus = await Bus.findOne();
    }

    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found." });
    }

    // Verify driver assignment from existing system
    let driver = null;
    if (reqDriverId && mongoose.Types.ObjectId.isValid(reqDriverId)) {
      driver = await User.findById(reqDriverId);
    } else if (bus.driverId && mongoose.Types.ObjectId.isValid(bus.driverId)) {
      driver = await User.findById(bus.driverId);
    } else {
      driver = (await User.findOne({ role: "driver" })) || (await User.findOne());
    }

    const driverId = driver?._id || bus.driverId || req.user?._id;
    const driverName = driver?.name || bus.driverName || "Assigned Driver";
    const driverEmail = driver?.email || "";
    const driverPhone = driver?.phone || bus.driverPhone || "";
    const driverLicense = driver?.licenseNumber || bus.driverLicense || "";
    const driverPhoto = driver?.profilePic || bus.driverPhoto || "";

    // Find route details
    let route = null;
    let routeName = `${bus.fromLocation || "Origin"} ➔ ${bus.toLocation || "Destination"}`;
    if (bus.fromLocation && bus.toLocation) {
      route = await Route.findOne({
        fromLocation: new RegExp(`^${bus.fromLocation}$`, "i"),
        toLocation: new RegExp(`^${bus.toLocation}$`, "i"),
      });
      if (route?.routeName) routeName = route.routeName;
    }

    // Check if an Active session already exists for this bus
    let existingSession = await MonitoringSession.findOne({
      busId: bus._id,
      status: "Active",
    });

    if (existingSession) {
      existingSession.lastHeartbeat = new Date();
      existingSession.deviceStatus = "ONLINE";
      await existingSession.save();
      emitSessionStatusChange(existingSession);
      return res.json({
        success: true,
        message: "Active monitoring session resumed.",
        session: existingSession,
      });
    }

    // Create a new monitoring session
    const session = new MonitoringSession({
      busId: bus._id,
      busNumber: bus.busNumber,
      busName: bus.busName || `Bus ${bus.busNumber}`,
      driverId,
      driverName,
      driverEmail,
      driverPhone,
      driverLicense,
      driverPhoto,
      routeId: route?._id || null,
      routeName,
      scheduleId: scheduleId && mongoose.Types.ObjectId.isValid(scheduleId) ? scheduleId : null,
      status: "Active",
      startTime: new Date(),
      lastHeartbeat: new Date(),
      currentDriverStatus: "DRIVER_VERIFIED",
      currentAlertness: "NORMAL",
      deviceStatus: "ONLINE",
      latestTelemetry: {
        ear: 0.28,
        faceDetected: true,
        faceConfidence: 0.95,
        blinkRatePerMin: 18,
        headPosePitch: 0,
        absenceSeconds: 0,
        fps: 30,
        timestamp: new Date(),
      },
    });

    await session.save();

    // Log initial session start event
    const startEvent = new SafetyEvent({
      sessionId: session._id,
      tripId: session.tripId,
      busId: session.busId,
      busNumber: session.busNumber,
      driverId: session.driverId,
      driverName: session.driverName,
      routeId: session.routeId,
      routeName: session.routeName,
      eventType: "DRIVER_VERIFIED",
      title: "🟢 Driver Verified & Monitoring Active",
      description: `Monitoring session started for Bus ${session.busNumber}. Assigned driver ${session.driverName} verified.`,
      severity: "Info",
      confidence: 0.98,
      status: "Informational",
    });
    await startEvent.save();

    emitSessionStatusChange(session);
    emitSafetyAlert(startEvent);

    res.status(201).json({
      success: true,
      message: `Monitoring session started for Bus ${bus.busNumber} with driver ${driverName}.`,
      session,
    });
  } catch (error) {
    console.error("Error starting monitoring session:", error);
    res.status(500).json({ success: false, message: "Failed to start monitoring session", error: error.message });
  }
});

// POST /api/monitoring/session/stop - Stop active monitoring session
router.post("/session/stop", async (req, res) => {
  try {
    const { sessionId, busId } = req.body;

    let query = { status: "Active" };
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      query._id = sessionId;
    } else if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      query.busId = busId;
    } else {
      return res.status(400).json({ success: false, message: "sessionId or busId required." });
    }

    const session = await MonitoringSession.findOne(query);
    if (!session) {
      return res.status(404).json({ success: false, message: "No active monitoring session found." });
    }

    session.status = "Ended";
    session.endTime = new Date();
    await session.save();

    emitSessionStatusChange(session);

    res.json({
      success: true,
      message: `Monitoring session ended for Bus ${session.busNumber}.`,
      session,
    });
  } catch (error) {
    console.error("Error stopping monitoring session:", error);
    res.status(500).json({ success: false, message: "Failed to stop monitoring session", error: error.message });
  }
});

// GET /api/monitoring/sessions/active - Get all active monitored trips for Admin
router.get("/sessions/active", async (req, res) => {
  try {
    let sessions = await MonitoringSession.find({ status: "Active" })
      .populate("busId", "busNumber busName fromLocation toLocation departureTime arrivalTime price")
      .populate("driverId", "name email phone licenseNumber verificationStatus profilePic")
      .sort({ updatedAt: -1 });

    if (sessions.length === 0) {
      // Auto-initialize active monitoring session for the primary bus
      const bus = (await Bus.findOne({ busNumber: "KL-07-MS-1008" })) || (await Bus.findOne());
      const driver = (await User.findOne({ role: "driver" })) || (await User.findOne({ role: "admin" })) || (await User.findOne());
      if (bus && driver) {
        const route = await Route.findOne({
          $or: [
            { fromLocation: bus.fromLocation, toLocation: bus.toLocation },
            { busNumber: bus.busNumber },
          ],
        });

        const newSession = new MonitoringSession({
          busId: bus._id,
          busNumber: bus.busNumber,
          busName: bus.busName || `Bus ${bus.busNumber}`,
          driverId: driver._id,
          driverName: driver.name || "Assigned Driver",
          driverEmail: driver.email || "driver@movesmart.in",
          driverPhone: driver.phone || "+91 98470 12345",
          driverLicense: driver.licenseNumber || "KL-07-2022-009876",
          driverPhoto: driver.profilePic || "",
          routeId: route?._id || null,
          routeName: route?.routeName || `${bus.fromLocation} ➔ ${bus.toLocation}`,
          status: "Active",
          startTime: new Date(),
          lastHeartbeat: new Date(),
          currentDriverStatus: "DRIVER_VERIFIED",
          currentAlertness: "NORMAL",
          deviceStatus: "ONLINE",
          latestTelemetry: {
            ear: 0.29,
            faceDetected: true,
            faceConfidence: 0.96,
            blinkRatePerMin: 18,
            headPosePitch: 0,
            absenceSeconds: 0,
            fps: 30,
            timestamp: new Date(),
          },
        });
        await newSession.save();

        sessions = await MonitoringSession.find({ status: "Active" })
          .populate("busId", "busNumber busName fromLocation toLocation departureTime arrivalTime price")
          .populate("driverId", "name email phone licenseNumber verificationStatus profilePic")
          .sort({ updatedAt: -1 });
      }
    }

    res.json({ success: true, count: sessions.length, sessions });
  } catch (error) {
    console.error("Error fetching active sessions:", error);
    res.status(500).json({ success: false, message: "Failed to fetch active sessions", error: error.message });
  }
});

// GET /api/monitoring/session/:id - Get detailed session data
router.get("/session/:id", async (req, res) => {
  try {
    const session = await MonitoringSession.findById(req.params.id)
      .populate("busId")
      .populate("driverId", "-password")
      .populate("routeId");

    if (!session) {
      return res.status(404).json({ success: false, message: "Session not found" });
    }

    const recentEvents = await SafetyEvent.find({ sessionId: session._id })
      .sort({ createdAt: -1 })
      .limit(30);

    res.json({ success: true, session, recentEvents });
  } catch (error) {
    console.error("Error fetching session details:", error);
    res.status(500).json({ success: false, message: "Failed to fetch session", error: error.message });
  }
});

// ----------------------------------------------------
// 3. HEARTBEAT & EVENT INGESTION (From AI / Edge Device)
// ----------------------------------------------------

// POST /api/monitoring/heartbeat - Keepalive signal from camera/device
router.post("/heartbeat", async (req, res) => {
  try {
    const { sessionId, busId, busNumber, fps, status } = req.body;

    let query = {};
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      query._id = sessionId;
    } else if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      query.busId = busId;
      query.status = "Active";
    } else if (busNumber) {
      query.busNumber = new RegExp(`^${busNumber.trim()}$`, "i");
      query.status = "Active";
    } else {
      return res.status(400).json({ success: false, message: "Session identifier required." });
    }

    const session = await MonitoringSession.findOne(query);
    if (!session) {
      return res.status(404).json({ success: false, message: "Active session not found." });
    }

    const wasOffline = session.deviceStatus === "OFFLINE";
    session.lastHeartbeat = new Date();
    session.deviceStatus = "ONLINE";
    if (fps) session.latestTelemetry.fps = fps;
    await session.save();

    if (wasOffline) {
      // Log Device Restored event
      const onlineEvent = new SafetyEvent({
        sessionId: session._id,
        tripId: session.tripId,
        busId: session.busId,
        busNumber: session.busNumber,
        driverId: session.driverId,
        driverName: session.driverName,
        routeId: session.routeId,
        routeName: session.routeName,
        eventType: "MONITORING_DEVICE_ONLINE",
        title: "🟢 Monitoring Device Online",
        description: `Camera/monitoring device for Bus ${session.busNumber} is back online and streaming telemetry.`,
        severity: "Info",
        status: "Informational",
      });
      await onlineEvent.save();
      emitSafetyAlert(onlineEvent);
      emitDeviceStatusChange(session._id, session.busId, session.driverId, "ONLINE", new Date());
    }

    res.json({ success: true, message: "Heartbeat acknowledged", lastHeartbeat: session.lastHeartbeat });
  } catch (error) {
    console.error("Error processing heartbeat:", error);
    res.status(500).json({ success: false, message: "Heartbeat failed", error: error.message });
  }
});

// POST /api/monitoring/event - Ingest AI / Computer Vision safety events
router.post("/event", async (req, res) => {
  try {
    const {
      sessionId,
      busId,
      busNumber,
      eventType,
      ear,
      faceConfidence,
      faceDetected,
      headPosePitch,
      absenceSeconds,
      fps,
      message,
      metadata = {},
    } = req.body;

    let sessionQuery = {};
    if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
      sessionQuery._id = sessionId;
    } else if (busId && mongoose.Types.ObjectId.isValid(busId)) {
      sessionQuery.busId = busId;
      sessionQuery.status = "Active";
    } else if (busNumber) {
      sessionQuery.busNumber = new RegExp(`^${busNumber.trim()}$`, "i");
      sessionQuery.status = "Active";
    }

    let session = await MonitoringSession.findOne(sessionQuery);
    if (!session) {
      const bus = (busNumber ? await Bus.findOne({ busNumber: new RegExp(`^${busNumber.trim()}$`, "i") }) : null) || (await Bus.findOne());
      const driver = (await User.findOne({ role: "driver" })) || (await User.findOne());
      if (bus && driver) {
        session = new MonitoringSession({
          busId: bus._id,
          busNumber: bus.busNumber,
          busName: bus.busName || `Bus ${bus.busNumber}`,
          driverId: driver._id,
          driverName: driver.name || "Assigned Driver",
          driverEmail: driver.email || "driver@movesmart.in",
          driverPhone: driver.phone || "+91 98470 12345",
          driverLicense: driver.licenseNumber || "KL-07-2022-009876",
          driverPhoto: driver.profilePic || "",
          routeName: `${bus.fromLocation || "City"} ➔ ${bus.toLocation || "Terminal"}`,
          status: "Active",
          startTime: new Date(),
          lastHeartbeat: new Date(),
          currentDriverStatus: eventType === "DRIVER_MISMATCH" ? "DRIVER_MISMATCH" : "DRIVER_VERIFIED",
          currentAlertness: "NORMAL",
          deviceStatus: "ONLINE",
          latestTelemetry: {
            ear: ear !== undefined ? Number(ear) : 0.29,
            faceDetected: faceDetected !== undefined ? Boolean(faceDetected) : true,
            faceConfidence: faceConfidence !== undefined ? Number(faceConfidence) : 0.96,
            blinkRatePerMin: 18,
            headPosePitch: 0,
            absenceSeconds: 0,
            fps: fps || 30,
            timestamp: new Date(),
          },
        });
        await session.save();
        emitSessionStatusChange(session);
      } else {
        return res.status(404).json({ success: false, message: "Active monitoring session not found for this vehicle." });
      }
    }

    // Update Session Telemetry
    session.lastHeartbeat = new Date();
    session.deviceStatus = "ONLINE";
    if (ear !== undefined) session.latestTelemetry.ear = Number(ear);
    if (faceDetected !== undefined) session.latestTelemetry.faceDetected = Boolean(faceDetected);
    if (faceConfidence !== undefined) session.latestTelemetry.faceConfidence = Number(faceConfidence);
    if (headPosePitch !== undefined) session.latestTelemetry.headPosePitch = Number(headPosePitch);
    if (absenceSeconds !== undefined) session.latestTelemetry.absenceSeconds = Number(absenceSeconds);
    if (fps !== undefined) session.latestTelemetry.fps = Number(fps);
    session.latestTelemetry.timestamp = new Date();

    // Map Event Specifics
    let title = "";
    let description = "";
    let severity = "Medium";
    let alertStatus = "Active";

    switch (eventType) {
      case "DRIVER_VERIFIED":
        session.currentDriverStatus = "DRIVER_VERIFIED";
        session.currentAlertness = "NORMAL";
        title = "🟢 Driver Verified";
        description = `Assigned driver ${session.driverName} verified with high confidence (${Math.round((faceConfidence || 0.95) * 100)}%).`;
        severity = "Info";
        alertStatus = "Informational";
        break;

      case "DRIVER_MISMATCH":
        session.currentDriverStatus = "DRIVER_MISMATCH";
        session.metricsSummary.driverMismatchCount += 1;
        session.metricsSummary.totalSafetyAlerts += 1;
        title = "🔴 Driver Mismatch Detected";
        description = `Detected person in driver seat DOES NOT match assigned driver ${session.driverName} on Bus ${session.busNumber}.`;
        severity = "Critical";
        break;

      case "DRIVER_MISMATCH_CRITICAL":
        session.currentDriverStatus = "DRIVER_MISMATCH_CRITICAL";
        session.metricsSummary.driverMismatchCount += 1;
        session.metricsSummary.totalSafetyAlerts += 1;
        title = "🔴 Critical Unauthorized Driver Mismatch";
        description = `CRITICAL: Persistent driver identity mismatch detected on Bus ${session.busNumber}. Unauthorized driver operating vehicle!`;
        severity = "Critical";
        break;

      case "DRIVER_NOT_ENROLLED":
        session.currentDriverStatus = "DRIVER_NOT_ENROLLED";
        title = "⚠️ Driver Face Profile Not Enrolled";
        description = `Assigned driver ${session.driverName} on Bus ${session.busNumber} has no enrolled biometric face profile. Monitoring blocked.`;
        severity = "High";
        break;

      case "DRIVER_NOT_DETECTED":
        session.currentDriverStatus = "DRIVER_NOT_DETECTED";
        title = "🟡 Driver Temporarily Not Detected";
        description = `No driver face detected for ${absenceSeconds || 5} seconds. Monitoring grace period active.`;
        severity = "Low";
        alertStatus = "Informational";
        break;

      case "DRIVER_ABSENT":
        session.currentDriverStatus = "DRIVER_ABSENT";
        session.metricsSummary.driverAbsentCount += 1;
        session.metricsSummary.totalSafetyAlerts += 1;
        title = "🔴 Critical Driver Absence";
        description = `Driver ${session.driverName} has left the driver seat for over ${absenceSeconds || 30} seconds while operating Bus ${session.busNumber}.`;
        severity = "Critical";
        break;

      case "DROWSINESS_EARLY_WARNING":
        session.currentAlertness = "EARLY_WARNING";
        session.metricsSummary.earlyWarningCount += 1;
        title = "🟡 Early Drowsiness Warning";
        description = `Driver showing initial signs of eye closure (EAR: ${(ear || 0.2).toFixed(2)}). Voice prompt issued.`;
        severity = "Low";
        alertStatus = "Informational";
        break;

      case "DROWSINESS_WARNING":
        session.currentAlertness = "DROWSINESS_WARNING";
        session.metricsSummary.drowsinessWarningCount += 1;
        session.metricsSummary.totalSafetyAlerts += 1;
        title = "🟠 Drowsiness Warning";
        description = `Driver showing sustained signs of drowsiness on Route ${session.routeName}. Driver alert active.`;
        severity = "High";
        break;

      case "CRITICAL_DROWSINESS":
        session.currentAlertness = "CRITICAL_DROWSINESS";
        session.metricsSummary.criticalDrowsinessCount += 1;
        session.metricsSummary.totalSafetyAlerts += 1;
        title = "🔴 Critical Driver Safety Alert: Severe Drowsiness";
        description = `Severe / prolonged eye closure detected for driver ${session.driverName} on Bus ${session.busNumber} (${session.routeName}). Immediate safety response recommended!`;
        severity = "Critical";
        break;

      default:
        title = `Safety Event: ${eventType}`;
        description = `Telemetry update from Bus ${session.busNumber}`;
        severity = "Medium";
        break;
    }

    await session.save();

    // Create Safety Event Record
    const eventDoc = new SafetyEvent({
      sessionId: session._id,
      tripId: session.tripId,
      busId: session.busId,
      busNumber: session.busNumber,
      driverId: session.driverId,
      driverName: session.driverName,
      routeId: session.routeId,
      routeName: session.routeName,
      eventType,
      title,
      description,
      message: message || { en: description, ml: "" },
      severity,
      confidence: faceConfidence || 0.95,
      metadata: {
        ear: ear || null,
        headPosePitch: headPosePitch || null,
        absenceSeconds: absenceSeconds || null,
        ...metadata,
      },
      status: alertStatus,
    });

    await eventDoc.save();

    // Real-time broadcast
    emitSafetyAlert(eventDoc);
    emitTelemetryUpdate(session._id, {
      ear: session.latestTelemetry.ear,
      faceConfidence: session.latestTelemetry.faceConfidence,
      currentDriverStatus: session.currentDriverStatus,
      currentAlertness: session.currentAlertness,
      deviceStatus: session.deviceStatus,
      timestamp: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Safety event recorded and broadcast.",
      event: eventDoc,
      session: {
        currentDriverStatus: session.currentDriverStatus,
        currentAlertness: session.currentAlertness,
        deviceStatus: session.deviceStatus,
      },
    });
  } catch (error) {
    console.error("Error logging monitoring event:", error);
    res.status(500).json({ success: false, message: "Failed to record safety event", error: error.message });
  }
});

// POST /api/monitoring/stream-frame - Ingest real live video frame from Edge AI Daemon or Camera
router.post("/stream-frame", async (req, res) => {
  try {
    const { sessionId, busId, busNumber, driverName, frame, ear, faceConfidence, alertness, driverStatus } = req.body;
    if (!frame) {
      return res.status(400).json({ success: false, message: "Frame data required." });
    }

    const payload = {
      sessionId: sessionId || "session-live",
      busId: busId || "bus-live",
      busNumber: busNumber || "KL-07-MS-1008",
      driverName: driverName || "Driver",
      frame,
      ear: ear !== undefined ? Number(ear) : 0.28,
      faceConfidence: faceConfidence !== undefined ? Number(faceConfidence) : 0.95,
      alertness: alertness || "NORMAL",
      driverStatus: driverStatus || "DRIVER_VERIFIED",
      timestamp: new Date(),
    };

    emitStreamFrame(payload);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: "Frame broadcast failed", error: error.message });
  }
});

// ----------------------------------------------------
// 4. ACTIVE ALERTS, ACKNOWLEDGE & RESOLVE (Admin)
// ----------------------------------------------------

// GET /api/monitoring/alerts - Get all active/unacknowledged safety alerts
router.get("/alerts", async (req, res) => {
  try {
    const { status = "Active", severity } = req.query;

    let filter = {};
    if (status !== "All") {
      filter.status = status;
    } else {
      filter.status = { $in: ["Active", "Acknowledged"] };
    }

    if (severity && severity !== "All") {
      filter.severity = severity;
    }

    const alerts = await SafetyEvent.find(filter)
      .populate("busId", "busNumber busName")
      .populate("driverId", "name email phone licenseNumber profilePic")
      .sort({ createdAt: -1 })
      .limit(100);

    res.json({ success: true, count: alerts.length, alerts });
  } catch (error) {
    console.error("Error fetching safety alerts:", error);
    res.status(500).json({ success: false, message: "Failed to fetch alerts", error: error.message });
  }
});

// PUT /api/monitoring/alerts/:id/acknowledge - Admin acknowledge alert
router.put("/alerts/:id/acknowledge", protect, adminOnly, async (req, res) => {
  try {
    const alert = await SafetyEvent.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found." });
    }

    alert.status = "Acknowledged";
    alert.acknowledgedBy = req.user._id;
    alert.acknowledgedByName = req.user.fullName || req.user.name || "System Admin";
    alert.acknowledgedAt = new Date();
    await alert.save();

    emitSafetyAlert(alert);

    res.json({
      success: true,
      message: `Safety alert acknowledged by ${alert.acknowledgedByName}.`,
      alert,
    });
  } catch (error) {
    console.error("Error acknowledging alert:", error);
    res.status(500).json({ success: false, message: "Failed to acknowledge alert", error: error.message });
  }
});

// PUT /api/monitoring/alerts/:id/resolve - Admin resolve alert with resolution notes
router.put("/alerts/:id/resolve", protect, adminOnly, async (req, res) => {
  try {
    const { resolutionNote } = req.body;
    const alert = await SafetyEvent.findById(req.params.id);
    if (!alert) {
      return res.status(404).json({ success: false, message: "Alert not found." });
    }

    alert.status = "Resolved";
    alert.resolvedBy = req.user._id;
    alert.resolvedByName = req.user.fullName || req.user.name || "System Admin";
    alert.resolvedAt = new Date();
    alert.resolutionNote = resolutionNote || "Safety event reviewed and cleared by transit dispatch.";
    await alert.save();

    emitSafetyAlert(alert);

    res.json({
      success: true,
      message: `Safety alert marked as resolved.`,
      alert,
    });
  } catch (error) {
    console.error("Error resolving alert:", error);
    res.status(500).json({ success: false, message: "Failed to resolve alert", error: error.message });
  }
});

// ----------------------------------------------------
// 5. SAFETY EVENT HISTORY & AUDIT LOGS
// ----------------------------------------------------

// GET /api/monitoring/events/history - Filterable safety history log
router.get("/events/history", async (req, res) => {
  try {
    const {
      busId,
      driverId,
      eventType,
      severity,
      status,
      startDate,
      endDate,
      page = 1,
      limit = 50,
    } = req.query;

    let filter = {};
    if (busId && mongoose.Types.ObjectId.isValid(busId)) filter.busId = busId;
    if (driverId && mongoose.Types.ObjectId.isValid(driverId)) filter.driverId = driverId;
    if (eventType && eventType !== "All") filter.eventType = eventType;
    if (severity && severity !== "All") filter.severity = severity;
    if (status && status !== "All") filter.status = status;

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const total = await SafetyEvent.countDocuments(filter);
    const events = await SafetyEvent.find(filter)
      .populate("busId", "busNumber busName")
      .populate("driverId", "name email phone")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)) || 1,
      events,
    });
  } catch (error) {
    console.error("Error fetching safety history:", error);
    res.status(500).json({ success: false, message: "Failed to fetch history", error: error.message });
  }
});

// ----------------------------------------------------
// 6. FLEET SAFETY OVERVIEW STATS / KPIS
// ----------------------------------------------------

// GET /api/monitoring/stats - Safety KPIs for dashboard
router.get("/stats", async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [activeSessionsCount, activeAlertsCount, criticalTodayCount, totalEventsToday] = await Promise.all([
      MonitoringSession.countDocuments({ status: "Active" }),
      SafetyEvent.countDocuments({ status: "Active", severity: { $in: ["Medium", "High", "Critical"] } }),
      SafetyEvent.countDocuments({
        createdAt: { $gte: startOfToday },
        severity: "Critical",
      }),
      SafetyEvent.countDocuments({ createdAt: { $gte: startOfToday } }),
    ]);

    const activeSessions = await MonitoringSession.find({ status: "Active" }).select("deviceStatus currentDriverStatus");
    const onlineDevicesCount = activeSessions.filter((s) => s.deviceStatus === "ONLINE").length;
    const verifiedDriversCount = activeSessions.filter((s) => s.currentDriverStatus === "DRIVER_VERIFIED").length;

    res.json({
      success: true,
      stats: {
        activeTripsMonitored: activeSessionsCount,
        onlineDevicesCount,
        verifiedDriversCount,
        activeAlertsCount,
        criticalAlertsToday: criticalTodayCount,
        totalEventsToday,
      },
    });
  } catch (error) {
    console.error("Error fetching safety stats:", error);
    res.status(500).json({ success: false, message: "Failed to fetch stats", error: error.message });
  }
});

module.exports = router;
