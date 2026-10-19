require("dotenv").config();
const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const User = require("../models/User");
const DriverLeave = require("../models/DriverLeave");
const Schedule = require("../models/Schedule");
const DriverReplacement = require("../models/DriverReplacement");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB.");

  const leaves = await DriverLeave.find();
  console.log("\n=== DRIVER LEAVES in DB (" + leaves.length + ") ===");
  leaves.forEach(l => {
    console.log(`ID: ${l._id} | DriverId: ${l.driverId} | Name: ${l.driverName} | Email: ${l.driverEmail} | Date: ${l.leaveDate} | Type: ${l.leaveType} | Status: ${l.status} | ReplGen: ${l.replacementGenerated}`);
  });

  const buses = await Bus.find();
  console.log("\n=== BUSES in DB (" + buses.length + ") ===");
  buses.forEach(b => {
    console.log(`ID: ${b._id} | Num: ${b.busNumber} | DriverId: ${b.driverId} | DriverName: ${b.driverName} | Dep: ${b.departureTime} | Route: ${b.routeName || b.fromLocation + '->' + b.toLocation}`);
  });

  const schedules = await Schedule.find();
  console.log("\n=== SCHEDULES in DB (" + schedules.length + ") ===");
  schedules.forEach(s => {
    console.log(`ID: ${s._id} | BusId: ${s.bus_id} | DriverId: ${s.driver_id} | DriverName: ${s.driverName} | Start: ${s.start_time} | Shift: ${s.shift} | Active: ${s.is_active}`);
  });

  const users = await User.find({ role: { $regex: /driver/i } });
  console.log("\n=== DRIVERS (Users) in DB (" + users.length + ") ===");
  users.forEach(u => {
    console.log(`ID: ${u._id} | Name: ${u.name} | Email: ${u.email} | Phone: ${u.phone} | Status: ${u.verificationStatus}`);
  });

  const replacements = await DriverReplacement.find();
  console.log("\n=== DRIVER REPLACEMENTS in DB (" + replacements.length + ") ===");
  replacements.forEach(r => {
    console.log(`ID: ${r._id} | Bus: ${r.busNumber} | Date: ${r.dutyDate} | Shift: ${r.shift} | OrigDriver: ${r.originalDriverName} (${r.originalDriverId}) | ReplDriver: ${r.replacementDriverName} (${r.replacementDriverId}) | Status: ${r.status}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
