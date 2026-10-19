require("dotenv").config();
const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const Route = require("../models/Route");
const User = require("../models/User");
const DriverLeave = require("../models/DriverLeave");
const Schedule = require("../models/Schedule");
const DriverReplacement = require("../models/DriverReplacement");
const { getLeaveIntervals, getDutyInterval, doIntervalsOverlap, inferShiftFromTime, normalizeDateStr } = require("../utils/shiftConflictHelper");

async function syncReplacementsForLeave(leave) {
  if (leave.status !== "Approved") return 0;

  const leaveIntervals = getLeaveIntervals(leave);
  const startDateStr = normalizeDateStr(leave.leaveDate);
  const endDateStr = normalizeDateStr(leave.leaveEndDate || startDateStr);
  const datesToProcess = [];
  const sDate = new Date(startDateStr);
  const eDate = new Date(endDateStr);
  const curDate = new Date(sDate);
  while (curDate <= eDate) {
    datesToProcess.push(curDate.toISOString().split("T")[0]);
    curDate.setDate(curDate.getDate() + 1);
  }

  const driverIdStr = String(leave.driverId || "");
  const driverNameStr = (leave.driverName || "").trim();

  let resolvedUser = null;
  if (mongoose.Types.ObjectId.isValid(driverIdStr)) {
    resolvedUser = await User.findById(driverIdStr);
  }
  if (!resolvedUser && leave.driverEmail) {
    resolvedUser = await User.findOne({ email: new RegExp(`^${leave.driverEmail.trim()}$`, "i") });
  }

  const scheduleOrConditions = [];
  if (driverIdStr) {
    scheduleOrConditions.push({ driver_id: driverIdStr });
    if (mongoose.Types.ObjectId.isValid(driverIdStr)) {
      scheduleOrConditions.push({ driver_id: new mongoose.Types.ObjectId(driverIdStr) });
    }
  }
  if (resolvedUser) {
    scheduleOrConditions.push({ driver_id: String(resolvedUser._id) });
    scheduleOrConditions.push({ driverName: { $regex: new RegExp(`^${resolvedUser.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
  }
  if (driverNameStr) {
    scheduleOrConditions.push({ driverName: { $regex: new RegExp(`^${driverNameStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
  }

  const activeSchedules = scheduleOrConditions.length > 0 ? await Schedule.find({
    is_active: true,
    $or: scheduleOrConditions,
  }).populate("bus_id").populate("route_id") : [];

  const busOrConditions = [];
  if (driverIdStr) {
    busOrConditions.push({ driverId: driverIdStr });
    if (mongoose.Types.ObjectId.isValid(driverIdStr)) {
      busOrConditions.push({ driverId: new mongoose.Types.ObjectId(driverIdStr) });
    }
  }
  if (resolvedUser) {
    busOrConditions.push({ driverId: resolvedUser._id });
    busOrConditions.push({ driverName: { $regex: new RegExp(`^${resolvedUser.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
  }
  if (driverNameStr) {
    busOrConditions.push({ driverName: { $regex: new RegExp(`^${driverNameStr.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } });
  }

  const assignedBusesDirect = busOrConditions.length > 0 ? await Bus.find({
    is_active: { $ne: false },
    $or: busOrConditions,
  }) : [];

  let affectedCount = 0;

  for (const dStr of datesToProcess) {
    for (const sch of activeSchedules) {
      const schShift = sch.shift || inferShiftFromTime(sch.start_time);
      const duty = getDutyInterval(dStr, schShift, sch.start_time);

      const isOverlapping = leaveIntervals.some(li =>
        doIntervalsOverlap(duty.startDateTime, duty.endDateTime, li.startDateTime, li.endDateTime)
      );

      if (isOverlapping) {
        const busDocId = sch.bus_id?._id || sch.bus_id;
        const busDocNumber = sch.busNumber || sch.bus_id?.busNumber || "Bus";
        const routeDocId = sch.route_id?._id || sch.route_id;
        const routeDocName = sch.routeName || sch.route_id?.routeName || (sch.bus_id?.routeName) || (sch.bus_id?.fromLocation && sch.bus_id?.toLocation ? `${sch.bus_id.fromLocation} ➔ ${sch.bus_id.toLocation}` : "Fleet Route");

        if (busDocId) {
          const existingRep = await DriverReplacement.findOne({
            leaveId: leave._id,
            busId: busDocId,
            dutyDate: dStr,
            shift: duty.shift,
          });

          if (!existingRep) {
            const created = await DriverReplacement.create({
              leaveId: leave._id,
              scheduleId: sch._id,
              busId: busDocId,
              busNumber: busDocNumber,
              routeId: routeDocId,
              routeName: routeDocName,
              dutyDate: dStr,
              shift: duty.shift,
              startDateTime: duty.startDateTime,
              endDateTime: duty.endDateTime,
              originalDriverId: leave.driverId || resolvedUser?._id,
              originalDriverName: leave.driverName || resolvedUser?.name || "Regular Driver",
              status: "Replacement Required",
            });
            console.log(`  Created Replacement from Schedule: ID=${created._id} Bus=${created.busNumber} Date=${created.dutyDate} Shift=${created.shift}`);
            affectedCount++;
          }
        }
      }
    }

    for (const bus of assignedBusesDirect) {
      const alreadyCoveredInSchedules = activeSchedules.some(
        s => String(s.bus_id?._id || s.bus_id) === String(bus._id)
      );
      if (!alreadyCoveredInSchedules) {
        const shift = inferShiftFromTime(bus.departureTime || "08:00 AM");
        const duty = getDutyInterval(dStr, shift, bus.departureTime);

        const isOverlapping = leaveIntervals.some(li =>
          doIntervalsOverlap(duty.startDateTime, duty.endDateTime, li.startDateTime, li.endDateTime)
        );

        if (isOverlapping) {
          const existingRep = await DriverReplacement.findOne({
            leaveId: leave._id,
            busId: bus._id,
            dutyDate: dStr,
            shift: duty.shift,
          });

          if (!existingRep) {
            const created = await DriverReplacement.create({
              leaveId: leave._id,
              scheduleId: null,
              busId: bus._id,
              busNumber: bus.busNumber,
              routeId: null,
              routeName: bus.routeName || `${bus.fromLocation} ➔ ${bus.toLocation}`,
              dutyDate: dStr,
              shift: duty.shift,
              startDateTime: duty.startDateTime,
              endDateTime: duty.endDateTime,
              originalDriverId: leave.driverId || resolvedUser?._id,
              originalDriverName: leave.driverName || resolvedUser?.name || "Regular Driver",
              status: "Replacement Required",
            });
            console.log(`  Created Replacement from Direct Bus: ID=${created._id} Bus=${created.busNumber} Date=${created.dutyDate} Shift=${created.shift}`);
            affectedCount++;
          }
        }
      }
    }
  }

  leave.replacementGenerated = true;
  leave.affectedDutiesCount = affectedCount;
  await leave.save();
  return affectedCount;
}

async function run() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to DB.");

  const approvedLeaves = await DriverLeave.find({ status: "Approved" });
  console.log(`Found ${approvedLeaves.length} approved leaves.`);

  for (const l of approvedLeaves) {
    console.log(`\nSyncing replacements for approved leave ${l._id} (${l.driverName} - ${l.leaveDate} - ${l.leaveType}):`);
    const count = await syncReplacementsForLeave(l);
    console.log(`-> Affected count: ${count}`);
  }

  const allReplacements = await DriverReplacement.find();
  console.log(`\n=== Total Driver Replacements now in DB: ${allReplacements.length} ===`);
  allReplacements.forEach(r => {
    console.log(`ID: ${r._id} | Bus: ${r.busNumber} | Date: ${r.dutyDate} | Shift: ${r.shift} | Driver: ${r.originalDriverName} | Status: ${r.status}`);
  });

  await mongoose.disconnect();
}

run().catch(console.error);
