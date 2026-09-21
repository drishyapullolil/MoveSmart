const { Server } = require("socket.io");
const MonitoringSession = require("../models/MonitoringSession");
const MonitoringConfig = require("../models/MonitoringConfig");
const SafetyEvent = require("../models/SafetyEvent");
const Bus = require("../models/Bus");

let io = null;
let heartbeatCheckInterval = null;
let gpsWatchdogInterval = null;

// In-memory active bus location cache for real-time tracking
// Key: busId (String), Value: Live Bus Location Object
const activeBusLocations = new Map();

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
    console.log(`🔌 Client connected to MoveSmart Socket: ${socket.id}`);

    // Join Admin Safety & Fleet Room
    socket.on("join-admin-safety", () => {
      socket.join("admin-safety");
      socket.join("admin-fleet");
      console.log(`👑 Socket ${socket.id} joined admin-safety & admin-fleet rooms`);
    });

    // Join Driver Room
    socket.on("join-driver-room", ({ driverId }) => {
      if (driverId) {
        socket.join(`driver-${driverId}`);
        console.log(`🚌 Socket ${socket.id} joined driver-${driverId}`);
      }
    });

    // Join Bus Room (Legacy & Modern Room Names)
    socket.on("join-bus-room", ({ busId }) => {
      if (busId) {
        socket.join(`bus-${busId}`);
        socket.join(`bus:${busId}`);
        console.log(`🚍 Socket ${socket.id} joined bus-${busId}`);
      }
    });

    // =========================================================
    // 1. PASSENGER & ADMIN LIVE BUS TRACKING ROOM SUBSCRIPTION
    // =========================================================
    socket.on("joinBusTracking", (data) => {
      const busId = typeof data === "string" ? data : data?.busId;
      if (!busId) return;

      const roomKey = `bus:${busId}`;
      socket.join(roomKey);
      socket.join(`bus-${busId}`);
      console.log(`📍 Socket ${socket.id} joined live tracking for ${roomKey}`);

      // Immediately send latest known live location if available
      const currentLoc = activeBusLocations.get(String(busId));
      if (currentLoc) {
        socket.emit("bus:locationUpdate", currentLoc);
        socket.emit("bus:initialLocation", currentLoc);
      }
    });

    socket.on("leaveBusTracking", (data) => {
      const busId = typeof data === "string" ? data : data?.busId;
      if (!busId) return;

      socket.leave(`bus:${busId}`);
      socket.leave(`bus-${busId}`);
      console.log(`📍 Socket ${socket.id} left live tracking for bus:${busId}`);
    });

    // =========================================================
    // 2. DRIVER LIVE GPS TRACKING EVENTS
    // =========================================================
    // Driver starts live GPS tracking
    socket.on("driver:startTracking", async (data) => {
      try {
        const { busId, tripId, driverId, driverName, latitude, longitude, speed = 0, heading = 0, timestamp, busNumber, routeName } = data || {};
        if (!busId) return;

        const stringBusId = String(busId);
        socket.join(`bus:${stringBusId}`);
        socket.join(`bus-${stringBusId}`);

        const trackingPayload = {
          busId: stringBusId,
          tripId: tripId || `TRIP-${Date.now()}`,
          driverId: driverId || null,
          driverName: driverName || "Assigned Driver",
          busNumber: busNumber || "KL-07-MS-1008",
          routeName: routeName || "Active Route",
          latitude: Number(latitude) || 0,
          longitude: Number(longitude) || 0,
          speed: Math.round(Number(speed) || 0),
          heading: Math.round(Number(heading) || 0),
          timestamp: timestamp || new Date().toISOString(),
          lastUpdated: Date.now(),
          isTracking: true,
          status: "LIVE", // LIVE, DELAYED, OFFLINE
        };

        // If bus details not provided in payload, try looking up in Bus DB
        if (!busNumber || !routeName) {
          try {
            const busDoc = await Bus.findById(stringBusId).lean();
            if (busDoc) {
              trackingPayload.busNumber = busDoc.busNumber || trackingPayload.busNumber;
              trackingPayload.routeName = `${busDoc.fromLocation} ➔ ${busDoc.toLocation}`;
              if (!trackingPayload.driverName && busDoc.driverName) {
                trackingPayload.driverName = busDoc.driverName;
              }
            }
          } catch (e) {
            // Handled safely
          }
        }

        activeBusLocations.set(stringBusId, trackingPayload);

        // Broadcast to all users watching this bus and admins
        io.to(`bus:${stringBusId}`).emit("bus:trackingStarted", trackingPayload);
        io.to(`bus:${stringBusId}`).emit("bus:locationUpdate", trackingPayload);
        io.to("admin-safety").emit("bus:trackingStarted", trackingPayload);
        io.to("admin-safety").emit("bus:locationUpdate", trackingPayload);
        io.emit("admin:fleet-location", trackingPayload);

        console.log(`🟢 [GPS TRACKING STARTED] Bus ${trackingPayload.busNumber} (${stringBusId}) by Driver ${trackingPayload.driverName}`);
      } catch (err) {
        console.error("Error in driver:startTracking:", err.message);
      }
    });

    // Driver continuous location update
    socket.on("driver:locationUpdate", (data) => {
      try {
        const { busId, tripId, driverId, driverName, latitude, longitude, speed = 0, heading = 0, timestamp, busNumber, routeName } = data || {};
        if (!busId || latitude === undefined || longitude === undefined) return;

        const stringBusId = String(busId);
        const existing = activeBusLocations.get(stringBusId) || {};

        const trackingPayload = {
          ...existing,
          busId: stringBusId,
          tripId: tripId || existing.tripId || `TRIP-${Date.now()}`,
          driverId: driverId || existing.driverId,
          driverName: driverName || existing.driverName || "Assigned Driver",
          busNumber: busNumber || existing.busNumber || "KL-07-MS-1008",
          routeName: routeName || existing.routeName || "Active Route",
          latitude: Number(latitude),
          longitude: Number(longitude),
          speed: Math.round(Number(speed) || 0),
          heading: Math.round(Number(heading) || 0),
          timestamp: timestamp || new Date().toISOString(),
          lastUpdated: Date.now(),
          isTracking: true,
          status: "LIVE",
        };

        activeBusLocations.set(stringBusId, trackingPayload);

        // Broadcast to bus room, admin room, and global fleet listeners
        io.to(`bus:${stringBusId}`).emit("bus:locationUpdate", trackingPayload);
        io.to(`bus-${stringBusId}`).emit("bus:locationUpdate", trackingPayload);
        io.to("admin-safety").emit("bus:locationUpdate", trackingPayload);
        io.emit("admin:fleet-location", trackingPayload);
      } catch (err) {
        console.error("Error in driver:locationUpdate:", err.message);
      }
    });

    // Driver stops live GPS tracking
    socket.on("driver:stopTracking", (data) => {
      try {
        const { busId } = data || {};
        if (!busId) return;

        const stringBusId = String(busId);
        const existing = activeBusLocations.get(stringBusId);

        const stopPayload = {
          busId: stringBusId,
          busNumber: existing?.busNumber || "Bus",
          routeName: existing?.routeName || "",
          lastUpdated: Date.now(),
          isTracking: false,
          status: "OFFLINE",
          message: "Trip ended by driver",
        };

        if (existing) {
          activeBusLocations.set(stringBusId, {
            ...existing,
            isTracking: false,
            status: "OFFLINE",
            lastUpdated: Date.now(),
          });
        }

        io.to(`bus:${stringBusId}`).emit("bus:trackingStopped", stopPayload);
        io.to(`bus-${stringBusId}`).emit("bus:trackingStopped", stopPayload);
        io.to("admin-safety").emit("bus:trackingStopped", stopPayload);
        io.emit("admin:fleet-location", { ...stopPayload, isTracking: false });

        console.log(`🔴 [GPS TRACKING STOPPED] Bus ${stopPayload.busNumber} (${stringBusId})`);
      } catch (err) {
        console.error("Error in driver:stopTracking:", err.message);
      }
    });

    // =========================================================
    // 3. DRIVER CAMERA VIDEO STREAM & SAFETY TELEMETRY
    // =========================================================
    socket.on("driver:stream-frame", (data) => {
      // Broadcast live video frame to admin safety console
      io.to("admin-safety").emit("admin:stream-frame", data);
      socket.broadcast.emit("admin:stream-frame", data);
    });

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
      console.log(`🔌 Client disconnected from MoveSmart Socket: ${socket.id}`);
    });
  });

  // Start Background Heartbeats & GPS Watchdog
  startHeartbeatMonitor();
  startGpsWatchdog();

  return io;
};

const getIO = () => io;

// Real-Time Location Getters for REST API
const getActiveBusLocation = (busId) => {
  if (!busId) return null;
  return activeBusLocations.get(String(busId)) || null;
};

const getAllActiveBusLocations = () => {
  const list = [];
  for (const [busId, loc] of activeBusLocations.entries()) {
    list.push({ busId, ...loc });
  }
  return list;
};

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
    io.to(`bus:${eventDoc.busId}`).emit("bus:safety-alert", eventDoc);
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

// Background Watcher for GPS Inactive / Delayed Transitions
const startGpsWatchdog = () => {
  if (gpsWatchdogInterval) clearInterval(gpsWatchdogInterval);

  gpsWatchdogInterval = setInterval(() => {
    const now = Date.now();
    for (const [busId, loc] of activeBusLocations.entries()) {
      if (loc.isTracking) {
        const diffMs = now - (loc.lastUpdated || now);
        // If no update for > 60 seconds -> OFFLINE
        if (diffMs > 60000 && loc.status !== "OFFLINE") {
          loc.status = "OFFLINE";
          loc.isTracking = false;
          if (io) {
            io.to(`bus:${busId}`).emit("bus:locationUpdate", loc);
            io.to("admin-safety").emit("bus:locationUpdate", loc);
            io.emit("admin:fleet-location", loc);
          }
          console.warn(`🟡 [GPS WATCHDOG] Bus ${loc.busNumber} marked OFFLINE (No signal for >60s)`);
        }
        // If no update for > 15 seconds -> SIGNAL DELAYED
        else if (diffMs > 15000 && loc.status === "LIVE") {
          loc.status = "DELAYED";
          if (io) {
            io.to(`bus:${busId}`).emit("bus:locationUpdate", loc);
            io.to("admin-safety").emit("bus:locationUpdate", loc);
            io.emit("admin:fleet-location", loc);
          }
        }
      }
    }
  }, 5000);
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
  getActiveBusLocation,
  getAllActiveBusLocations,
  emitSafetyAlert,
  emitTelemetryUpdate,
  emitDeviceStatusChange,
  emitSessionStatusChange,
  emitStreamFrame,
};
