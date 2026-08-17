const { Server } = require("socket.io");
const MonitoringSession = require("../models/MonitoringSession");
const MonitoringConfig = require("../models/MonitoringConfig");
const SafetyEvent = require("../models/SafetyEvent");

let io = null;
let heartbeatCheckInterval = null;

const initSocketService = (httpServer) => {
  if (io) return io;

  io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        // Reflect requesting origin to satisfy browser credentials: true policy
        callback(null, true);
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
    allowEIO3: true,
  });

  io.on("connection", (socket) => {
    console.log(`🔌 Client connected to Safety Socket: ${socket.id}`);

    // Join Admin Safety Room
    socket.on("join-admin-safety", () => {
      socket.join("admin-safety");
      console.log(`👑 Socket ${socket.id} joined admin-safety room`);
    });

    // Join Driver Room
    socket.on("join-driver-room", ({ driverId }) => {
      if (driverId) {
        socket.join(`driver-${driverId}`);
        console.log(`🚌 Socket ${socket.id} joined driver-${driverId}`);
      }
    });

    // Join Bus Room
    socket.on("join-bus-room", ({ busId }) => {
      if (busId) {
        socket.join(`bus-${busId}`);
        console.log(`🚍 Socket ${socket.id} joined bus-${busId}`);
      }
    });

    // Real-time Driver Camera Video Stream
    socket.on("driver:stream-frame", (data) => {
      // Broadcast live video frame to admin safety console
      io.to("admin-safety").emit("admin:stream-frame", data);
      socket.broadcast.emit("admin:stream-frame", data);
    });

    // Real-time Driver Safety Direct Socket Broadcast
    socket.on("driver:safety-event", (data) => {
      const alertObj = {
        _id: data.eventId || `evt-${Date.now()}`,
        sessionId: data.sessionId,
        busId: data.busId,
        busNumber: data.busNumber || "KL-07-MS-1008",
        driverId: data.driverId,
        driverName: data.driverName || "Driver",
        eventType: data.eventType,
        title:
          data.eventType === "CRITICAL_DROWSINESS"
            ? "🔴 Critical Driver Safety Alert: Severe Drowsiness"
            : data.eventType === "DROWSINESS_WARNING"
            ? "🟠 Drowsiness Warning"
            : data.eventType === "DROWSINESS_EARLY_WARNING"
            ? "🟡 Early Drowsiness Warning"
            : data.eventType === "DRIVER_ABSENT"
            ? "🔴 Critical Driver Absence"
            : data.eventType === "DRIVER_NOT_DETECTED"
            ? "🟡 Driver Temporarily Not Detected"
            : data.eventType === "DRIVER_MISMATCH"
            ? "🔴 Driver Identity Mismatch Detected"
            : "🟢 Driver Verified & Alert",
        description: `Live AI event: ${data.eventType} on Bus ${data.busNumber || "KL-07-MS-1008"} (EAR: ${data.ear ? Number(data.ear).toFixed(2) : "N/A"})`,
        severity:
          data.eventType === "CRITICAL_DROWSINESS" || data.eventType === "DRIVER_ABSENT" || data.eventType === "DRIVER_MISMATCH"
            ? "Critical"
            : data.eventType === "DROWSINESS_WARNING"
            ? "High"
            : data.eventType === "DROWSINESS_EARLY_WARNING"
            ? "Medium"
            : "Info",
        status: data.eventType === "DRIVER_VERIFIED" ? "Resolved" : "Active",
        createdAt: data.timestamp || new Date(),
        metadata: {
          ear: data.ear,
          faceConfidence: data.faceConfidence,
          absenceSeconds: data.absenceSeconds,
        },
      };

      socket.to("admin-safety").emit("safety:alert", alertObj);
      io.emit("admin:safety-alert", alertObj);
      socket.to("admin-safety").emit("telemetry:update", data);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Client disconnected from Safety Socket: ${socket.id}`);
    });
  });

  // Start Background Heartbeat & Device Offline Monitor
  startHeartbeatMonitor();

  return io;
};

const getIO = () => io;

// Real-time Event Broadcasters
const emitSafetyAlert = (eventDoc) => {
  if (!io) return;
  io.to("admin-safety").emit("safety:alert", eventDoc);
  io.emit("admin:safety-alert", eventDoc);
  if (eventDoc.driverId) {
    io.to(`driver-${eventDoc.driverId}`).emit("driver:safety-alert", eventDoc);
  }
  if (eventDoc.busId) {
    io.to(`bus-${eventDoc.busId}`).emit("bus:safety-alert", eventDoc);
  }
};

const emitTelemetryUpdate = (sessionId, telemetryData) => {
  if (!io) return;
  io.to("admin-safety").emit("telemetry:update", { sessionId, ...telemetryData });
};

const emitDeviceStatusChange = (sessionId, busId, driverId, status, timestamp) => {
  if (!io) return;
  const payload = { sessionId, busId, driverId, status, timestamp: timestamp || new Date() };
  io.to("admin-safety").emit("device:status-change", payload);
  if (driverId) io.to(`driver-${driverId}`).emit("device:status-change", payload);
};

const emitSessionStatusChange = (sessionDoc) => {
  if (!io) return;
  io.to("admin-safety").emit("session:status-change", sessionDoc);
  if (sessionDoc.driverId) {
    io.to(`driver-${sessionDoc.driverId}`).emit("session:status-change", sessionDoc);
  }
};

// Background Watcher for Monitoring Device Offline detection
const startHeartbeatMonitor = () => {
  if (heartbeatCheckInterval) clearInterval(heartbeatCheckInterval);

  heartbeatCheckInterval = setInterval(async () => {
    try {
      const config = await MonitoringConfig.getActiveConfig();
      const offlineThresholdMs = (config.deviceOfflineTimeoutSec || 20) * 1000;
      const cutoffTime = new Date(Date.now() - offlineThresholdMs);

      // Find all active sessions where heartbeat has timed out and device is still marked ONLINE
      const timedOutSessions = await MonitoringSession.find({
        status: "Active",
        deviceStatus: "ONLINE",
        lastHeartbeat: { $lt: cutoffTime },
      });

      for (const session of timedOutSessions) {
        session.deviceStatus = "OFFLINE";
        session.metricsSummary.deviceOfflineCount = (session.metricsSummary.deviceOfflineCount || 0) + 1;
        await session.save();

        // Create Device Offline Safety Alert
        const offlineEvent = new SafetyEvent({
          sessionId: session._id,
          tripId: session.tripId,
          busId: session.busId,
          busNumber: session.busNumber,
          driverId: session.driverId,
          driverName: session.driverName,
          routeId: session.routeId,
          routeName: session.routeName,
          eventType: "MONITORING_DEVICE_OFFLINE",
          title: "🔴 Monitoring Device Offline",
          description: `Camera/monitoring device for Bus ${session.busNumber} (${session.driverName}) has stopped transmitting telemetry.`,
          severity: "High",
          confidence: 1.0,
          metadata: {
            lastReceivedTimestamp: session.lastHeartbeat,
            timeoutSeconds: config.deviceOfflineTimeoutSec,
          },
          status: "Active",
        });

        await offlineEvent.save();
        emitSafetyAlert(offlineEvent);
        emitDeviceStatusChange(session._id, session.busId, session.driverId, "OFFLINE", session.lastHeartbeat);
        console.warn(`⚠️ [SAFETY WATCHDOG] Device marked OFFLINE for Bus ${session.busNumber} (Session: ${session._id})`);
      }
    } catch (err) {
      console.error("Error in heartbeat watchdog monitor:", err.message);
    }
  }, 5000); // Check every 5s
};

const emitStreamFrame = (data) => {
  if (!io) return;
  io.to("admin-safety").emit("admin:stream-frame", data);
  io.emit("admin:stream-frame", data);
};

module.exports = {
  initSocketService,
  getIO,
  emitSafetyAlert,
  emitTelemetryUpdate,
  emitDeviceStatusChange,
  emitSessionStatusChange,
  emitStreamFrame,
};
