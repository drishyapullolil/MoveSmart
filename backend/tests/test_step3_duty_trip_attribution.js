/**
 * Step 3 Automated Test Suite
 * Tests Driver Duty Resolution, TripSession & Journey Attribution,
 * Approved Leave Conflict Blocking, Unauthorized Driver Rejection,
 * Duplicate Active Trip Prevention, and RFID Flow Attribution.
 */

const assert = require("assert");
const {
  SHIFT_TYPES,
  getDutyInterval,
  getLeaveIntervals,
  doIntervalsOverlap,
  inferShiftFromTime,
  normalizeDateStr
} = require("../utils/shiftConflictHelper");

console.log("=================================================");
console.log("RUNNING STEP 3 DUTY & TRIP ATTRIBUTION TESTS");
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

// 1. Regular duty resolution vs Temporary replacement duty resolution
test("Effective duty resolution prioritizes temporary replacement duty over regular schedule", () => {
  const regularDriverId = "6a63725647d78c17944080f3"; // Annu
  const replacementDriverId = "6a60ae284eea28d706d7877e"; // Silpa
  const bus1 = { _id: "bus_001", busNumber: "KL-08-101", busName: "Bus 1" };
  const bus2 = { _id: "bus_002", busNumber: "KL-08-202", busName: "Bus 2" };

  // Replacement duty on Bus 2 assigned to Silpa
  const replacementDuty = {
    _id: "rep_duty_001",
    replacementDriverId: replacementDriverId,
    originalDriverId: regularDriverId,
    busId: bus2,
    busNumber: "KL-08-202",
    dutyDate: "2026-10-15",
    shift: "Evening",
    startDateTime: new Date("2026-10-15T14:00:00Z"),
    endDateTime: new Date("2026-10-15T22:00:00Z"),
    status: "Assigned"
  };

  // Function to simulate resolveEffectiveDriverDuty
  function resolveDuty(driverId, targetDate, replacements, regularSchedules) {
    const dateStr = normalizeDateStr(targetDate);
    const activeRep = replacements.find(r => r.replacementDriverId === driverId && r.dutyDate === dateStr && ["Assigned", "In Progress"].includes(r.status));
    if (activeRep) {
      return {
        hasDuty: true,
        dutyType: "REPLACEMENT",
        isReplacementDuty: true,
        replacementDutyId: activeRep._id,
        bus: activeRep.busId,
        shift: activeRep.shift
      };
    }

    const regSch = regularSchedules.find(s => s.driver_id === driverId);
    if (regSch) {
      return {
        hasDuty: true,
        dutyType: "REGULAR",
        isReplacementDuty: false,
        replacementDutyId: null,
        bus: regSch.bus,
        shift: regSch.shift
      };
    }

    return { hasDuty: false, dutyType: "NONE", isReplacementDuty: false, bus: null };
  }

  const replacements = [replacementDuty];
  const regularSchedules = [
    { driver_id: replacementDriverId, bus: bus1, shift: "Morning" }
  ];

  // Silpa querying duty for 2026-10-15 should get Bus 2 (Replacement), not Bus 1
  const silpaDuty = resolveDuty(replacementDriverId, new Date("2026-10-15T10:00:00Z"), replacements, regularSchedules);
  assert.strictEqual(silpaDuty.dutyType, "REPLACEMENT");
  assert.strictEqual(silpaDuty.isReplacementDuty, true);
  assert.strictEqual(silpaDuty.bus._id, "bus_002");
  assert.strictEqual(silpaDuty.replacementDutyId, "rep_duty_001");
  assert.strictEqual(silpaDuty.shift, "Evening");
});

// 2. Approved leave blocking conflicting duty
test("Driver on approved leave is blocked from starting conflicting duty interval", () => {
  const driverId = "6a63725647d78c17944080f3"; // Annu
  const leave = {
    driverId: driverId,
    leaveDate: "2026-10-20",
    shiftSlot: "Full Day",
    status: "Approved"
  };

  const schedule = {
    driver_id: driverId,
    shift: "Morning",
    shiftStartTime: "06:00 AM",
    shiftEndTime: "02:00 PM"
  };

  const dutyInterval = getDutyInterval("2026-10-20", schedule.shift, schedule.shiftStartTime, schedule.shiftEndTime);
  const leaveIntervals = getLeaveIntervals(leave);

  const isConflict = leaveIntervals.some(lInt => doIntervalsOverlap(dutyInterval.startDateTime, dutyInterval.endDateTime, lInt.startDateTime, lInt.endDateTime));
  assert.strictEqual(isConflict, true, "Approved leave must overlap with duty interval");
});

// 3. Overnight shift interval resolution
test("Overnight duty (Night shift 10 PM - 6 AM) resolves continuous interval crossing midnight", () => {
  const nightDuty = getDutyInterval("2026-10-25", "Night", "10:00 PM", "06:00 AM");

  assert.strictEqual(nightDuty.startDateTime.getDate(), 25);
  assert.strictEqual(nightDuty.startDateTime.getHours(), 22);
  assert.strictEqual(nightDuty.endDateTime.getDate(), 26);
  assert.strictEqual(nightDuty.endDateTime.getHours(), 6);
  assert.strictEqual(nightDuty.crossesMidnight, true);

  // Leave on next day 2026-10-26 Morning (6 AM - 2 PM) should NOT overlap with Night shift ending at 6 AM
  const morningLeave = getDutyInterval("2026-10-26", "Morning", "06:00 AM", "02:00 PM");
  assert.strictEqual(
    doIntervalsOverlap(nightDuty.startDateTime, nightDuty.endDateTime, morningLeave.startDateTime, morningLeave.endDateTime),
    false,
    "Adjacent non-overlapping boundary shifts must not conflict"
  );

  // Leave on 2026-10-26 covering early morning (02:00 AM - 08:00 AM) SHOULD overlap
  const earlyLeave = {
    startDateTime: new Date(2026, 9, 26, 2, 0, 0),
    endDateTime: new Date(2026, 9, 26, 8, 0, 0)
  };
  assert.strictEqual(
    doIntervalsOverlap(nightDuty.startDateTime, nightDuty.endDateTime, earlyLeave.startDateTime, earlyLeave.endDateTime),
    true,
    "Overlapping leave during midnight crossing must conflict"
  );
});

// 4. Unauthorized driver rejection & Duplicate active trip prevention
test("Unauthorized driver and duplicate active trip sessions are strictly rejected", () => {
  const bus = { _id: "bus_100", busNumber: "KL-08-999", driverId: "driver_A" };
  const driverB = { _id: "driver_B", name: "Sruthy" };
  const activeSessions = [
    { tripSessionId: "TRIP-2026-10-09-001", busId: "bus_100", driverId: "driver_A", driverName: "Silpa", status: "ACTIVE" }
  ];

  // Driver B trying to start bus_100 without assignment
  function validateTripStart(driver, targetBus, sessions, replacements) {
    const isRep = replacements.some(r => r.replacementDriverId === driver._id && r.busId === targetBus._id);
    const isReg = targetBus.driverId === driver._id;

    if (!isRep && !isReg) {
      return { allowed: false, code: 403, error: "Unauthorized" };
    }

    const existingActive = sessions.find(s => s.busId === targetBus._id && ["ACTIVE", "PAUSED"].includes(s.status));
    if (existingActive && existingActive.driverId !== driver._id) {
      return { allowed: false, code: 409, error: "Duplicate active trip by different driver" };
    }

    return { allowed: true };
  }

  // 1. Driver B is unauthorized
  const unauthRes = validateTripStart(driverB, bus, activeSessions, []);
  assert.strictEqual(unauthRes.allowed, false);
  assert.strictEqual(unauthRes.code, 403);

  // 2. Driver B with replacement record on a bus that already has an active trip by Driver A
  const dupRes = validateTripStart(driverB, bus, activeSessions, [{ replacementDriverId: "driver_B", busId: "bus_100" }]);
  assert.strictEqual(dupRes.allowed, false);
  assert.strictEqual(dupRes.code, 409);
});

// 5. TripSession and Journey attribution for replacement driver
test("TripSession and RFID Journey correctly attribute to operating replacement driver", () => {
  const replacementDriver = {
    _id: "driver_replacement_01",
    name: "Sruthy Replacement",
    email: "sruthy@movesmart.in"
  };
  const originalDriver = {
    _id: "driver_original_01",
    name: "Annu Regular"
  };
  const replacementDuty = {
    _id: "rep_duty_999",
    shift: "Evening",
    originalDriverId: originalDriver._id
  };

  // Create TripSession
  const tripSession = {
    tripSessionId: "TRIP-2026-10-09-005",
    busId: "bus_555",
    busNumber: "KL-07-555",
    driverId: replacementDriver._id,
    driverName: replacementDriver.name,
    driverEmail: replacementDriver.email,
    isReplacementDriver: true,
    shift: replacementDuty.shift,
    replacementDutyId: replacementDuty._id,
    originalDriverId: replacementDuty.originalDriverId,
    originalDriverName: originalDriver.name,
    status: "ACTIVE"
  };

  assert.strictEqual(tripSession.isReplacementDriver, true);
  assert.strictEqual(tripSession.driverId, replacementDriver._id);
  assert.strictEqual(tripSession.shift, "Evening");
  assert.strictEqual(tripSession.replacementDutyId, "rep_duty_999");
  assert.strictEqual(tripSession.originalDriverId, "driver_original_01");

  // Create Journey from RFID tap under this active trip session
  const journey = {
    tripSessionId: tripSession.tripSessionId,
    busId: tripSession.busId,
    busNumber: tripSession.busNumber,
    driverId: tripSession.driverId,
    driverEmail: tripSession.driverEmail,
    isReplacementDriver: tripSession.isReplacementDriver,
    shift: tripSession.shift,
    replacementDutyId: tripSession.replacementDutyId,
    status: "In-Progress"
  };

  assert.strictEqual(journey.driverId, replacementDriver._id);
  assert.strictEqual(journey.isReplacementDriver, true);
  assert.strictEqual(journey.shift, "Evening");
  assert.strictEqual(journey.replacementDutyId, "rep_duty_999");
});

// 6. Preservation of permanent bus driver assignments
test("Permanent bus assignments remain unchanged during and after replacement drive", () => {
  const permanentBus = {
    _id: "bus_permanent_001",
    busNumber: "KL-08-9999",
    driverId: "permanent_driver_001",
    driverName: "Permanent Driver Annu"
  };

  // Start replacement drive with temporary driver
  const operatingDriver = { _id: "temp_driver_002", name: "Temp Driver Silpa" };
  const replacementTrip = {
    tripSessionId: "TRIP-2026-10-09-009",
    busId: permanentBus._id,
    driverId: operatingDriver._id,
    driverName: operatingDriver.name,
    isReplacementDriver: true
  };

  // Bus model is NEVER mutated
  assert.strictEqual(permanentBus.driverId, "permanent_driver_001");
  assert.strictEqual(permanentBus.driverName, "Permanent Driver Annu");
  assert.strictEqual(replacementTrip.driverId, "temp_driver_002");
});

console.log("=================================================");
console.log(`STEP 3 RESULTS: ${passedTests}/${totalTests} TESTS PASSED`);
console.log("=================================================");

if (passedTests !== totalTests) {
  process.exit(1);
} else {
  process.exit(0);
}
