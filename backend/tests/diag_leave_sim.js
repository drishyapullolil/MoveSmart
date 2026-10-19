require("dotenv").config();
const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const DriverLeave = require("../models/DriverLeave");
const Schedule = require("../models/Schedule");
const { getLeaveIntervals, getDutyInterval, doIntervalsOverlap, inferShiftFromTime } = require("../utils/shiftConflictHelper");

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const leaves = await DriverLeave.find();
  for (const leave of leaves) {
    console.log(`\n--- Testing Leave ${leave._id} (${leave.driverName} - ${leave.leaveDate} - ${leave.leaveType} - ${leave.shiftSlot} - status: ${leave.status}) ---`);
    console.log("leave.driverId type:", typeof leave.driverId, "value:", leave.driverId);

    const driverIdStr = String(leave.driverId);
    const driverNameStr = (leave.driverName || "").trim();

    const orConditions = [
      { driver_id: driverIdStr },
      { driver_id: mongoose.Types.ObjectId.isValid(driverIdStr) ? new mongoose.Types.ObjectId(driverIdStr) : null },
    ];
    if (driverNameStr) {
      orConditions.push({ driverName: { $regex: new RegExp(`^${driverNameStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
    }

    const activeSchedules = await Schedule.find({
      is_active: true,
      $or: orConditions.filter(c => c.driver_id !== null || c.driverName),
    }).populate("bus_id").populate("route_id");

    console.log("Found activeSchedules:", activeSchedules.length);

    const busOrConditions = [];
    if (mongoose.Types.ObjectId.isValid(driverIdStr)) {
      busOrConditions.push({ driverId: new mongoose.Types.ObjectId(driverIdStr) });
    }
    busOrConditions.push({ driverId: driverIdStr });
    if (driverNameStr) {
      busOrConditions.push({ driverName: { $regex: new RegExp(`^${driverNameStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
    }

    const assignedBusesDirect = await Bus.find({
      is_active: { $ne: false },
      $or: busOrConditions,
    });

    console.log("Found assignedBusesDirect:", assignedBusesDirect.length);
    assignedBusesDirect.forEach(b => console.log(`  Bus: ${b.busNumber} | driverId: ${b.driverId} | driverName: ${b.driverName}`));

    const leaveIntervals = getLeaveIntervals(leave);
    console.log("leaveIntervals:", leaveIntervals);

    const dStr = leave.leaveDate;
    for (const sch of activeSchedules) {
      const schShift = sch.shift || inferShiftFromTime(sch.start_time);
      const duty = getDutyInterval(dStr, schShift, sch.start_time);
      const isOverlapping = leaveIntervals.some(li => doIntervalsOverlap(duty.startDateTime, duty.endDateTime, li.startDateTime, li.endDateTime));
      console.log(`  Schedule ${sch._id} shift=${schShift} start=${sch.start_time} -> duty=[${duty.startDateTime} - ${duty.endDateTime}] -> overlap=${isOverlapping}`);
    }

    for (const bus of assignedBusesDirect) {
      const shift = inferShiftFromTime(bus.departureTime || "08:00 AM");
      const duty = getDutyInterval(dStr, shift, bus.departureTime);
      const isOverlapping = leaveIntervals.some(li => doIntervalsOverlap(duty.startDateTime, duty.endDateTime, li.startDateTime, li.endDateTime));
      console.log(`  Direct Bus ${bus.busNumber} dep=${bus.departureTime} shift=${shift} -> duty=[${duty.startDateTime} - ${duty.endDateTime}] -> overlap=${isOverlapping}`);
    }
  }

  await mongoose.disconnect();
}

run().catch(console.error);
