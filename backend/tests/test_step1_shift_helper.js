/**
 * Step 1 Automated Verification Suite
 * Tests Shift Interval Helper, Overnight Crossing, Multi-day Leaves & Schema Compilations.
 */

const assert = require("assert");
const path = require("path");

const {
  SHIFT_TYPES,
  parseTimeString,
  inferShiftFromTime,
  getDutyInterval,
  getLeaveIntervals,
  doIntervalsOverlap,
} = require("../utils/shiftConflictHelper");

console.log("=================================================");
console.log("RUNNING STEP 1 VERIFICATION SUITE");
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

// 1. Time string parsing
test("parseTimeString converts 12h AM/PM and 24h formats accurately", () => {
  assert.deepStrictEqual(parseTimeString("06:30 AM"), { hour: 6, minute: 30 });
  assert.deepStrictEqual(parseTimeString("12:00 PM"), { hour: 12, minute: 0 });
  assert.deepStrictEqual(parseTimeString("12:30 AM"), { hour: 0, minute: 30 });
  assert.deepStrictEqual(parseTimeString("10:15 PM"), { hour: 22, minute: 15 });
  assert.deepStrictEqual(parseTimeString("23:45"), { hour: 23, minute: 45 });
  assert.deepStrictEqual(parseTimeString("04:00"), { hour: 4, minute: 0 });
});

// 2. Shift inference from start times
test("inferShiftFromTime correctly identifies Morning, Evening, and Night shifts", () => {
  assert.strictEqual(inferShiftFromTime("06:00 AM"), SHIFT_TYPES.MORNING);
  assert.strictEqual(inferShiftFromTime("08:30 AM"), SHIFT_TYPES.MORNING);
  assert.strictEqual(inferShiftFromTime("01:45 PM"), SHIFT_TYPES.MORNING); // 13:45 -> Morning
  assert.strictEqual(inferShiftFromTime("02:00 PM"), SHIFT_TYPES.EVENING); // 14:00 -> Evening
  assert.strictEqual(inferShiftFromTime("06:30 PM"), SHIFT_TYPES.EVENING); // 18:30 -> Evening
  assert.strictEqual(inferShiftFromTime("09:59 PM"), SHIFT_TYPES.EVENING); // 21:59 -> Evening
  assert.strictEqual(inferShiftFromTime("10:00 PM"), SHIFT_TYPES.NIGHT);   // 22:00 -> Night
  assert.strictEqual(inferShiftFromTime("11:30 PM"), SHIFT_TYPES.NIGHT);   // 23:30 -> Night
  assert.strictEqual(inferShiftFromTime("02:00 AM"), SHIFT_TYPES.NIGHT);   // 02:00 -> Night
  assert.strictEqual(inferShiftFromTime("05:30 AM"), SHIFT_TYPES.NIGHT);   // 05:30 -> Night
});

// 3. Duty interval calculation & overnight midnight crossing
test("getDutyInterval generates continuous [start, end) dates with overnight +1 day crossing", () => {
  const morningDuty = getDutyInterval("2026-10-10", SHIFT_TYPES.MORNING);
  assert.strictEqual(morningDuty.crossesMidnight, false);
  assert.strictEqual(morningDuty.startDateTime.getHours(), 6);
  assert.strictEqual(morningDuty.endDateTime.getHours(), 14);
  assert.strictEqual(morningDuty.startDateTime.getDate(), 10);
  assert.strictEqual(morningDuty.endDateTime.getDate(), 10);
  assert.strictEqual(morningDuty.durationHours, 8);

  const nightDuty = getDutyInterval("2026-10-10", SHIFT_TYPES.NIGHT);
  assert.strictEqual(nightDuty.crossesMidnight, true);
  assert.strictEqual(nightDuty.startDateTime.getHours(), 22);
  assert.strictEqual(nightDuty.startDateTime.getDate(), 10);
  assert.strictEqual(nightDuty.endDateTime.getHours(), 6);
  assert.strictEqual(nightDuty.endDateTime.getDate(), 11); // Day 11 (+1 day crossing midnight!)
  assert.strictEqual(nightDuty.durationHours, 8);
});

// 4. Leave interval calculation
test("getLeaveIntervals computes full-day, shift-specific and multi-day spans", () => {
  const fullDayLeave = getLeaveIntervals({ leaveDate: "2026-10-10", leaveType: "Full Day" });
  assert.strictEqual(fullDayLeave.length, 1);
  assert.strictEqual(fullDayLeave[0].startDateTime.getHours(), 0);
  assert.strictEqual(fullDayLeave[0].endDateTime.getHours(), 23);

  const nightShiftLeave = getLeaveIntervals({ leaveDate: "2026-10-10", shiftSlot: SHIFT_TYPES.NIGHT });
  assert.strictEqual(nightShiftLeave.length, 1);
  assert.strictEqual(nightShiftLeave[0].startDateTime.getHours(), 22);
  assert.strictEqual(nightShiftLeave[0].startDateTime.getDate(), 10);
  assert.strictEqual(nightShiftLeave[0].endDateTime.getHours(), 6);
  assert.strictEqual(nightShiftLeave[0].endDateTime.getDate(), 11);

  const multiDayLeave = getLeaveIntervals({ leaveDate: "2026-10-10", leaveEndDate: "2026-10-12", leaveType: "Full Day" });
  assert.strictEqual(multiDayLeave.length, 1);
  assert.strictEqual(multiDayLeave[0].startDateTime.getDate(), 10);
  assert.strictEqual(multiDayLeave[0].endDateTime.getDate(), 12);
});

// 5. Interval overlap tests
test("doIntervalsOverlap accurately detects conflict across shifts and overnight intervals", () => {
  // Oct 10 Morning [06:00, 14:00) vs Oct 10 Evening [14:00, 22:00) -> NO OVERLAP (adjacent)
  const d1 = getDutyInterval("2026-10-10", SHIFT_TYPES.MORNING);
  const d2 = getDutyInterval("2026-10-10", SHIFT_TYPES.EVENING);
  assert.strictEqual(doIntervalsOverlap(d1.startDateTime, d1.endDateTime, d2.startDateTime, d2.endDateTime), false);

  // Oct 10 Night [22:00, Oct 11 06:00) vs Oct 10 Full Day Leave -> OVERLAP (conflicts!)
  const nightDuty = getDutyInterval("2026-10-10", SHIFT_TYPES.NIGHT);
  const leave10 = getLeaveIntervals({ leaveDate: "2026-10-10", leaveType: "Full Day" })[0];
  assert.strictEqual(doIntervalsOverlap(nightDuty.startDateTime, nightDuty.endDateTime, leave10.startDateTime, leave10.endDateTime), true);

  // Oct 10 Night [22:00, Oct 11 06:00) vs Oct 11 Morning [06:00, 14:00) -> NO OVERLAP (adjacent at 06:00)
  const oct11Morning = getDutyInterval("2026-10-11", SHIFT_TYPES.MORNING);
  assert.strictEqual(doIntervalsOverlap(nightDuty.startDateTime, nightDuty.endDateTime, oct11Morning.startDateTime, oct11Morning.endDateTime), false);

  // Oct 10 Night [22:00, Oct 11 06:00) vs Oct 11 04:00 early trip -> OVERLAP (conflicts on Oct 11 morning!)
  const earlyTrip = {
    startDateTime: new Date(2026, 9, 11, 4, 0, 0),
    endDateTime: new Date(2026, 9, 11, 8, 0, 0),
  };
  assert.strictEqual(doIntervalsOverlap(nightDuty.startDateTime, nightDuty.endDateTime, earlyTrip.startDateTime, earlyTrip.endDateTime), true);
});

// 6. Schema Compilation Test
test("Mongoose models compile successfully without syntax or dependency errors", () => {
  const Schedule = require("../models/Schedule");
  const DriverLeave = require("../models/DriverLeave");
  const DriverReplacement = require("../models/DriverReplacement");

  assert.ok(Schedule.schema.paths["shift"], "Schedule should have 'shift' field");
  assert.ok(Schedule.schema.paths["shiftStartTime"], "Schedule should have 'shiftStartTime' field");
  assert.ok(DriverLeave.schema.paths["shiftSlot"], "DriverLeave should have 'shiftSlot' field");
  assert.ok(DriverLeave.schema.paths["leaveEndDate"], "DriverLeave should have 'leaveEndDate' field");
  assert.ok(DriverReplacement.schema.paths["dutyDate"], "DriverReplacement should have 'dutyDate' field");
  assert.ok(DriverReplacement.schema.paths["shift"], "DriverReplacement should have 'shift' field");
  assert.ok(DriverReplacement.schema.paths["status"], "DriverReplacement should have 'status' field");
});

console.log("=================================================");
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
console.log("=================================================");

if (passedTests === totalTests) {
  process.exit(0);
} else {
  process.exit(1);
}
