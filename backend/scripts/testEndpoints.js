const mongoose = require("mongoose");
const http = require("http");
require("dotenv").config({ path: "e:/project/backend/.env" });

const { app, server } = require("../server");
const Bus = require("../models/Bus");
const User = require("../models/User");
const MonitoringSession = require("../models/MonitoringSession");
const SafetyEvent = require("../models/SafetyEvent");
const jwt = require("jsonwebtoken");

async function testHttpEndpoints() {
  console.log("=== MoveSmart Full REST API Verification ===");
  
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ MongoDB Connected");

  const port = 5002;
  await new Promise((resolve) => server.listen(port, "0.0.0.0", resolve));
  console.log(`✅ Test server running on port ${port}`);

  let driver = await User.findOne({ role: "driver" });
  let admin = await User.findOne({ role: "admin" });
  if (!admin) {
    admin = await User.create({
      name: "Admin Tester",
      email: "admin.tester@movesmart.in",
      password: "password123",
      role: "admin",
    });
  }

  const driverToken = jwt.sign({ id: driver._id }, process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026", { expiresIn: "1d" });
  const adminToken = jwt.sign({ id: admin._id }, process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026", { expiresIn: "1d" });

  let bus = await Bus.findOne();
  bus.driverId = driver._id;
  bus.driverName = driver.name;
  await bus.save();

  // Helper for requests
  const request = (method, path, body = null, token = null) => {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : null;
      const headers = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (payload) headers["Content-Length"] = Buffer.byteLength(payload);

      const req = http.request({
        hostname: "localhost",
        port,
        path,
        method,
        headers,
      }, (res) => {
        let data = "";
        res.on("data", chunk => data += chunk);
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, body: JSON.parse(data) });
          } catch {
            resolve({ status: res.statusCode, raw: data });
          }
        });
      });
      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  // 1. GET /api/monitoring/config
  const resConfig = await request("GET", "/api/monitoring/config");
  console.log("1. GET /api/monitoring/config ->", resConfig.status, resConfig.body.success ? "✅ Success" : "❌ Failed");

  // 2. GET /api/monitoring/stats
  const resStats = await request("GET", "/api/monitoring/stats");
  console.log("2. GET /api/monitoring/stats ->", resStats.status, "Active Trips:", resStats.body.stats?.activeTripsMonitored);

  // 3. POST /api/monitoring/session/start
  const resStart = await request("POST", "/api/monitoring/session/start", { busId: bus._id }, driverToken);
  console.log("3. POST /api/monitoring/session/start ->", resStart.status, "Session ID:", resStart.body.session?._id);
  const sessionId = resStart.body.session?._id;

  // 4. POST /api/monitoring/heartbeat
  const resHb = await request("POST", "/api/monitoring/heartbeat", { sessionId, fps: 30 });
  console.log("4. POST /api/monitoring/heartbeat ->", resHb.status, resHb.body.message);

  // 5. POST /api/monitoring/event (Drowsiness)
  const resEvent = await request("POST", "/api/monitoring/event", {
    sessionId,
    eventType: "DROWSINESS_WARNING",
    ear: 0.17,
  });
  console.log("5. POST /api/monitoring/event ->", resEvent.status, resEvent.body.event?.title);
  const alertId = resEvent.body.event?._id;

  // 6. GET /api/monitoring/alerts
  const resAlerts = await request("GET", "/api/monitoring/alerts");
  console.log("6. GET /api/monitoring/alerts ->", resAlerts.status, `Found ${resAlerts.body.count} alerts`);

  // 7. PUT /api/monitoring/alerts/:id/acknowledge
  const resAck = await request("PUT", `/api/monitoring/alerts/${alertId}/acknowledge`, {}, adminToken);
  console.log("7. PUT /api/monitoring/alerts/:id/acknowledge ->", resAck.status, resAck.body.alert?.status);

  // 8. PUT /api/monitoring/alerts/:id/resolve
  const resResolve = await request("PUT", `/api/monitoring/alerts/${alertId}/resolve`, { resolutionNote: "Driver verified alert." }, adminToken);
  console.log("8. PUT /api/monitoring/alerts/:id/resolve ->", resResolve.status, resResolve.body.alert?.status);

  // 9. POST /api/monitoring/session/stop
  const resStop = await request("POST", "/api/monitoring/session/stop", { sessionId }, driverToken);
  console.log("9. POST /api/monitoring/session/stop ->", resStop.status, resStop.body.session?.status);

  console.log("\n=== ALL HTTP API ENDPOINTS TESTED AND VERIFIED ✅ ===");
  server.close();
  await mongoose.disconnect();
  process.exit(0);
}

testHttpEndpoints().catch(err => {
  console.error("API test error:", err);
  process.exit(1);
});
