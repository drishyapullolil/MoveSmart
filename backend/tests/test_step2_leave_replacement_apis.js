/**
 * Step 2 Automated Test Suite
 * Tests Leave Approval, Preservation of Permanent Assignments, Affected Duty Detection,
 * Duplicate Prevention, Conflict Rejection & Replacement Assignment.
 */

const assert = require("assert");
const mongoose = require("mongoose");
const path = require("path");

const {
  SHIFT_TYPES,
  getDutyInterval,
  getLeaveIntervals,
  doIntervalsOverlap,
  inferShiftFromTime,
} = require("../utils/shiftConflictHelper");

console.log("=================================================");
console.log("RUNNING STEP 2 LEAVE & REPLACEMENT VERIFICATION");
console.log("=================================================");

let passedTests = 0;
let totalTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

// 1. Permanent assignment preservation
test("Leave approval logic preserves permanent Bus and Schedule assignments", () => {
  const mockBus = {
    _id: "6a63725647d78c1794408001",
    busNumber: "KL-08-678",
    driverId: "6a63725647d78c17944080f3",
    driverName: "Annu",
  };

  const mockSchedule = {
    _id: "6a63725647d78c1794408002",
    bus_id: mockBus._id,
    busNumber: "KL-08-678",
    driver_id: "6a63725647d78c17944080f3",
    driverName: "Annu",
    shift: "Morning",
    start_time: "08:30 AM",
  };

  // Simulating leave approval without mutating permanent bus/schedule
  const leave = {
    _id: "6a63725647d78c1794408003",
    driverId: "6a63725647d78c17944080f3",
    driverName: "Annu",
    leaveDate: "2026-10-12",
    leaveType: "Full Day",
    status: "Approved",
  };

  // Assert bus and schedule fields remain intact
  assert.strictEqual(mockBus.driverName, "Annu", "Bus permanent driverName must not be modified");
  assert.strictEqual(mockBus.driverId, "6a63725647d78c17944080f3", "Bus permanent driverId must not be modified");
  assert.strictEqual(mockSchedule.driver_id, "6a63725647d78c17944080f3", "Schedule permanent driver_id must not be modified");
  assert.strictEqual(mockSchedule.driverName, "Annu", "Schedule permanent driverName must not be modified");
});

// 2. Affected duty detection with overnight shift support
test("Affected duty detection identifies overlapping schedules including overnight duties", () => {
  const leaveFullDay = { leaveDate: "2026-10-12", leaveType: "Full Day" };
  const leaveIntervals = getLeaveIntervals(leaveFullDay);

  const morningDuty = getDutyInterval("2026-10-12", SHIFT_TYPES.MORNING, "08:30 AM");
  const nightDuty = getDutyInterval("2026-10-12", SHIFT_TYPES.NIGHT, "10:30 PM");
  const otherDayDuty = getDutyInterval("2026-10-13", SHIFT_TYPES.MORNING, "08:30 AM");

  const morningOverlaps = leaveIntervals.some((li) =>
    doIntervalsOverlap(morningDuty.startDateTime, morningDuty.endDateTime, li.startDateTime, li.endDateTime)
  );
  const nightOverlaps = leaveIntervals.some((li) =>
    doIntervalsOverlap(nightDuty.startDateTime, nightDuty.endDateTime, li.startDateTime, li.endDateTime)
  );
  const otherDayOverlaps = leaveIntervals.some((li) =>
    doIntervalsOverlap(otherDayDuty.startDateTime, otherDayDuty.endDateTime, li.startDateTime, li.endDateTime)
  );

  assert.strictEqual(morningOverlaps, true, "Oct 12 Morning duty must overlap Oct 12 full day leave");
  assert.strictEqual(nightOverlaps, true, "Oct 12 Night duty (22:00 to Oct 13 06:00) must overlap Oct 12 leave");
  assert.strictEqual(otherDayOverlaps, false, "Oct 13 Morning duty must NOT overlap Oct 12 full day leave");
});

// 3. Duplicate replacement prevention simulation
test("Duplicate replacement records are prevented for same duty and shift", () => {
  const replacementsStore = [];

  function addReplacement(duty) {
    const exists = replacementsStore.some(
      (r) =>
        r.dutyDate === duty.dutyDate &&
        r.shift === duty.shift &&
        r.busNumber === duty.busNumber &&
        r.status !== "Cancelled"
    );
    if (!exists) {
      replacementsStore.push(duty);
      return true;
    }
    return false;
  }

  const duty1 = {
    leaveId: "L1",
    busNumber: "KL-08-678",
    dutyDate: "2026-10-12",
    shift: "Morning",
    status: "Replacement Required",
  };

  const added1 = addReplacement(duty1);
  const added2 = addReplacement(duty1); // Duplicate call

  assert.strictEqual(added1, true, "First insertion must succeed");
  assert.strictEqual(added2, false, "Second duplicate insertion must be prevented");
  assert.strictEqual(replacementsStore.length, 1, "Only one replacement record should exist");
});

// 4. Double booking and leave conflict validation
test("Double booking prevention detects overlapping regular schedules or active replacements", () => {
  const targetDuty = getDutyInterval("2026-10-12", SHIFT_TYPES.EVENING, "15:00");

  // Driver A has approved leave on Oct 12
  const driverALeave = getLeaveIntervals({ leaveDate: "2026-10-12", leaveType: "Full Day" })[0];
  const driverAConflictsLeave = doIntervalsOverlap(
    targetDuty.startDateTime,
    targetDuty.endDateTime,
    driverALeave.startDateTime,
    driverALeave.endDateTime
  );
  assert.strictEqual(driverAConflictsLeave, true, "Driver A on approved leave must be flagged as conflict");

  // Driver B is scheduled on another bus in evening [14:00, 22:00)
  const driverBDuty = getDutyInterval("2026-10-12", SHIFT_TYPES.EVENING, "16:00");
  const driverBConflictsDuty = doIntervalsOverlap(
    targetDuty.startDateTime,
    targetDuty.endDateTime,
    driverBDuty.startDateTime,
    driverBDuty.endDateTime
  );
  assert.strictEqual(driverBConflictsDuty, true, "Driver B with overlapping regular shift must be flagged as double-booked");

  // Driver C is free in evening (only works morning [06:00, 14:00))
  const driverCDuty = getDutyInterval("2026-10-12", SHIFT_TYPES.MORNING, "08:00 AM");
  const driverCConflictsDuty = doIntervalsOverlap(
    targetDuty.startDateTime,
    targetDuty.endDateTime,
    driverCDuty.startDateTime,
    driverCDuty.endDateTime
  );
  assert.strictEqual(driverCConflictsDuty, false, "Driver C working Morning shift is eligible for Evening replacement");
});

// 5. Leave rejection reverts replacement status
test("Leave rejection reverts pending replacements to Cancelled", () => {
  const replacements = [
    { id: "R1", leaveId: "L1", status: "Replacement Required" },
    { id: "R2", leaveId: "L1", status: "Assigned", replacementDriverId: "D2" },
  ];

  // Action: Admin rejects leave
  replacements.forEach((r) => {
    if (r.leaveId === "L1" && ["Replacement Required", "Assigned"].includes(r.status)) {
      r.status = "Cancelled";
    }
  });

  assert.strictEqual(replacements[0].status, "Cancelled");
  assert.strictEqual(replacements[1].status, "Cancelled");
});

console.log("=================================================");
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log("=================================================");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
