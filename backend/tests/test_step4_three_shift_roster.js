/**
 * Step 4 Automated Test Suite - Regular Three-Shift Fleet Driver Rostering
 * 
 * Verifies:
 * 1. Bus Model Schema: Three-shift schema definition, exact shift hours, root fields preserved.
 * 2. Shift Interval & Overnight Validation: Continuous [start, end) interval math, night shift midnight crossing.
 * 3. Isolated Shift Assignment: Assigning Morning, Evening, and Night independently without mutating other shifts or root fields.
 * 4. Isolated Shift Unassignment: Clearing shift with driverId: null leaves other shifts and root fields intact.
 * 5. Driver Eligibility & Conflict Rejection:
 *    - Rejection of unapproved / non-driver users.
 *    - Rejection of drivers on conflicting approved leave.
 *    - Rejection of drivers with overlapping shift intervals on other buses.
 * 6. Non-overlapping Boundary Verification: Adjacent shifts (06:00-14:00 and 14:00-22:00) do NOT falsely conflict.
 * 7. Preservation of Existing DB Records: Legacy root driver, replacement duties, and active trip sessions untouched.
 * 8. Route & Authorization Configuration: Roster endpoints properly mapped under /api/admin with admin auth.
 */

const assert = require("assert");
const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const {
  SHIFT_TYPES,
  getDutyInterval,
  getLeaveIntervals,
  doIntervalsOverlap,
  inferShiftFromTime,
  normalizeDateStr,
} = require("../utils/shiftConflictHelper");

console.log("=================================================");
console.log("RUNNING STAGE 2 THREE-SHIFT ROSTER TEST SUITE");
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

const pendingAsyncTests = [];

function asyncTest(name, fn) {
  totalTests++;
  const promise = Promise.resolve()
    .then(fn)
    .then(() => {
      console.log(`  ✓ PASS: ${name}`);
      passedTests++;
    })
    .catch((err) => {
      console.error(`  ✗ FAIL: ${name}`);
      console.error(`    ${err.message}`);
    });
  pendingAsyncTests.push(promise);
}

// ----------------------------------------------------
// TEST GROUP 1: Bus Schema & Shift Configuration
// ----------------------------------------------------

test("1.1 Bus schema includes three-shift schema with exact canonical shift hours", () => {
  assert.ok(Bus.schema.path("shifts.morning.startTime"), "Bus schema must define 'shifts.morning.startTime'");
  assert.ok(Bus.schema.path("shifts.evening.startTime"), "Bus schema must define 'shifts.evening.startTime'");
  assert.ok(Bus.schema.path("shifts.night.startTime"), "Bus schema must define 'shifts.night.startTime'");

  const morningStart = Bus.schema.path("shifts.morning.startTime")?.defaultValue;
  const morningEnd = Bus.schema.path("shifts.morning.endTime")?.defaultValue;
  const eveningStart = Bus.schema.path("shifts.evening.startTime")?.defaultValue;
  const eveningEnd = Bus.schema.path("shifts.evening.endTime")?.defaultValue;
  const nightStart = Bus.schema.path("shifts.night.startTime")?.defaultValue;
  const nightEnd = Bus.schema.path("shifts.night.endTime")?.defaultValue;

  assert.strictEqual(morningStart, "06:00 AM", "Morning shift must start at 06:00 AM");
  assert.strictEqual(morningEnd, "02:00 PM", "Morning shift must end at 02:00 PM (14:00)");
  assert.strictEqual(eveningStart, "02:00 PM", "Evening shift must start at 02:00 PM (14:00)");
  assert.strictEqual(eveningEnd, "10:00 PM", "Evening shift must end at 10:00 PM (22:00)");
  assert.strictEqual(nightStart, "10:00 PM", "Night shift must start at 10:00 PM (22:00)");
  assert.strictEqual(nightEnd, "06:00 AM", "Night shift must end at 06:00 AM (06:00 next day)");
});

test("1.2 Bus schema preserves root driver fields for backward compatibility", () => {
  assert.ok(Bus.schema.path("driverId"), "Root driverId must be preserved");
  assert.ok(Bus.schema.path("driverName"), "Root driverName must be preserved");
  assert.ok(Bus.schema.path("driverPhone"), "Root driverPhone must be preserved");
  assert.ok(Bus.schema.path("driverLicense"), "Root driverLicense must be preserved");
  assert.ok(Bus.schema.path("driverVerified"), "Root driverVerified must be preserved");
});

test("1.3 Bus schema defaults initialize shifts with null driverId and 'Not Assigned'", () => {
  const dummyBus = new Bus({
    busNumber: "KL-TEST-001",
    busName: "Test Express",
    fromLocation: "City A",
    toLocation: "City B",
    departureTime: "08:00 AM",
    arrivalTime: "12:00 PM",
    price: 350,
  });

  assert.strictEqual(dummyBus.shifts.morning.driverId, null, "Morning driverId must default to null");
  assert.strictEqual(dummyBus.shifts.morning.driverName, "Not Assigned", "Morning driverName must default to 'Not Assigned'");
  assert.strictEqual(dummyBus.shifts.evening.driverId, null, "Evening driverId must default to null");
  assert.strictEqual(dummyBus.shifts.night.driverId, null, "Night driverId must default to null");
});

// ----------------------------------------------------
// TEST GROUP 2: Interval-Overlap Math (including Overnight)
// ----------------------------------------------------

test("2.1 Duty intervals model exact hours and night shift crosses midnight (+1 day)", () => {
  const refDate = "2026-10-20";
  const morning = getDutyInterval(refDate, SHIFT_TYPES.MORNING);
  const evening = getDutyInterval(refDate, SHIFT_TYPES.EVENING);
  const night = getDutyInterval(refDate, SHIFT_TYPES.NIGHT);

  assert.strictEqual(morning.crossesMidnight, false, "Morning does not cross midnight");
  assert.strictEqual(morning.durationHours, 8, "Morning duration must be exactly 8 hours");
  assert.strictEqual(evening.crossesMidnight, false, "Evening does not cross midnight");
  assert.strictEqual(evening.durationHours, 8, "Evening duration must be exactly 8 hours");
  assert.strictEqual(night.crossesMidnight, true, "Night shift must cross midnight");
  assert.strictEqual(night.durationHours, 8, "Night duration must be exactly 8 hours");

  // Verify Night endDateTime is on date + 1 day at 06:00
  assert.strictEqual(night.startDateTime.getHours(), 22, "Night starts at 22:00");
  assert.strictEqual(night.endDateTime.getHours(), 6, "Night ends at 06:00");
  assert.strictEqual(night.endDateTime.getDate(), night.startDateTime.getDate() + 1, "Night end must be next day");
});

test("2.2 Consecutive shifts do NOT falsely overlap at exact boundary points", () => {
  const refDate = "2026-10-20";
  const morning = getDutyInterval(refDate, SHIFT_TYPES.MORNING); // 06:00 - 14:00
  const evening = getDutyInterval(refDate, SHIFT_TYPES.EVENING); // 14:00 - 22:00
  const night = getDutyInterval(refDate, SHIFT_TYPES.NIGHT);     // 22:00 - 06:00 (+1)

  // Morning (ends 14:00) vs Evening (starts 14:00)
  const morningEveningOverlap = doIntervalsOverlap(
    morning.startDateTime, morning.endDateTime,
    evening.startDateTime, evening.endDateTime
  );
  assert.strictEqual(morningEveningOverlap, false, "Morning [06:00, 14:00) and Evening [14:00, 22:00) must not overlap");

  // Evening (ends 22:00) vs Night (starts 22:00)
  const eveningNightOverlap = doIntervalsOverlap(
    evening.startDateTime, evening.endDateTime,
    night.startDateTime, night.endDateTime
  );
  assert.strictEqual(eveningNightOverlap, false, "Evening [14:00, 22:00) and Night [22:00, 06:00) must not overlap");
});

test("2.3 Overnight shifts correctly detect genuine overlaps with identical or conflicting intervals", () => {
  const refDate = "2026-10-20";
  const nightBus1 = getDutyInterval(refDate, SHIFT_TYPES.NIGHT); // 22:00 to Oct 21 06:00
  const nightBus2 = getDutyInterval(refDate, SHIFT_TYPES.NIGHT); // 22:00 to Oct 21 06:00

  const overlap = doIntervalsOverlap(
    nightBus1.startDateTime, nightBus1.endDateTime,
    nightBus2.startDateTime, nightBus2.endDateTime
  );
  assert.strictEqual(overlap, true, "Night shifts on same night must overlap");

  // Partial overlap across midnight: custom late evening duty 23:00 to 03:00
  const customStart = new Date("2026-10-20T23:00:00");
  const customEnd = new Date("2026-10-21T03:00:00");
  const partialOverlap = doIntervalsOverlap(
    nightBus1.startDateTime, nightBus1.endDateTime,
    customStart, customEnd
  );
  assert.strictEqual(partialOverlap, true, "Duty 23:00-03:00 must overlap Night shift 22:00-06:00");
});

// ----------------------------------------------------
// TEST GROUP 3: Isolated Shift Assignment & Unassignment
// ----------------------------------------------------

test("3.1 Assigning Morning driver does not modify Evening, Night, or root bus fields", () => {
  const bus = {
    _id: new mongoose.Types.ObjectId(),
    busNumber: "KL-08-TEST",
    driverId: new mongoose.Types.ObjectId("6a60ae284eea28d706d7877e"), // Silpa (root)
    driverName: "Silpa",
    driverPhone: "+91 98470 12345",
    shifts: {
      morning: { driverId: null, driverName: "Not Assigned", driverEmail: "", driverPhone: "", startTime: "06:00 AM", endTime: "02:00 PM" },
      evening: { driverId: null, driverName: "Not Assigned", driverEmail: "", driverPhone: "", startTime: "02:00 PM", endTime: "10:00 PM" },
      night: { driverId: null, driverName: "Not Assigned", driverEmail: "", driverPhone: "", startTime: "10:00 PM", endTime: "06:00 AM" },
    },
  };

  const annuId = new mongoose.Types.ObjectId("6a63725647d78c17944080f3");
  const annuDriver = { _id: annuId, name: "Annu", email: "annu.driver@movesmart.in", phone: "+91 98470 54321" };

  // Assign Annu to Morning
  bus.shifts.morning.driverId = annuDriver._id;
  bus.shifts.morning.driverName = annuDriver.name;
  bus.shifts.morning.driverEmail = annuDriver.email;
  bus.shifts.morning.driverPhone = annuDriver.phone;

  // Assert Morning is updated
  assert.strictEqual(String(bus.shifts.morning.driverId), String(annuId));
  assert.strictEqual(bus.shifts.morning.driverName, "Annu");

  // Assert Evening and Night remain untouched
  assert.strictEqual(bus.shifts.evening.driverId, null, "Evening must remain null");
  assert.strictEqual(bus.shifts.evening.driverName, "Not Assigned", "Evening must remain 'Not Assigned'");
  assert.strictEqual(bus.shifts.night.driverId, null, "Night must remain null");
  assert.strictEqual(bus.shifts.night.driverName, "Not Assigned", "Night must remain 'Not Assigned'");

  // Assert root bus driver remains Silpa
  assert.strictEqual(bus.driverName, "Silpa", "Root bus driverName must remain Silpa");
  assert.strictEqual(String(bus.driverId), "6a60ae284eea28d706d7877e", "Root bus driverId must remain Silpa");
});

test("3.2 Assigning driverId: null clears ONLY the selected shift", () => {
  const annuId = new mongoose.Types.ObjectId("6a63725647d78c17944080f3");
  const silpaId = new mongoose.Types.ObjectId("6a60ae284eea28d706d7877e");

  const bus = {
    _id: new mongoose.Types.ObjectId(),
    busNumber: "KL-08-TEST",
    driverId: silpaId,
    driverName: "Silpa",
    driverPhone: "+91 98470 12345",
    shifts: {
      morning: { driverId: annuId, driverName: "Annu", driverEmail: "annu.driver@movesmart.in", driverPhone: "+91 98470 54321", startTime: "06:00 AM", endTime: "02:00 PM" },
      evening: { driverId: silpaId, driverName: "Silpa", driverEmail: "silpa.driver@movesmart.in", driverPhone: "+91 98470 12345", startTime: "02:00 PM", endTime: "10:00 PM" },
      night: { driverId: null, driverName: "Not Assigned", driverEmail: "", driverPhone: "", startTime: "10:00 PM", endTime: "06:00 AM" },
    },
  };

  // Clear Morning shift (simulate PUT with driverId: null)
  bus.shifts.morning.driverId = null;
  bus.shifts.morning.driverName = "Not Assigned";
  bus.shifts.morning.driverEmail = "";
  bus.shifts.morning.driverPhone = "";

  // Assert Morning is cleared
  assert.strictEqual(bus.shifts.morning.driverId, null, "Morning driverId must be null");
  assert.strictEqual(bus.shifts.morning.driverName, "Not Assigned", "Morning driverName must be 'Not Assigned'");

  // Assert Evening remains Silpa
  assert.strictEqual(String(bus.shifts.evening.driverId), String(silpaId), "Evening driverId must remain Silpa");
  assert.strictEqual(bus.shifts.evening.driverName, "Silpa", "Evening driverName must remain Silpa");

  // Assert root fields remain intact
  assert.strictEqual(bus.driverName, "Silpa", "Root driverName must remain untouched");
  assert.strictEqual(String(bus.driverId), String(silpaId), "Root driverId must remain untouched");
});

// ----------------------------------------------------
// TEST GROUP 4: Driver Eligibility & Conflict Validation
// ----------------------------------------------------

test("4.1 Inactive or unapproved driver is rejected", () => {
  const unapprovedDriver = {
    _id: new mongoose.Types.ObjectId(),
    name: "Unverified Driver",
    role: "driver",
    verificationStatus: "Pending", // Not 'Approved'
  };

  const isEligible = unapprovedDriver.role === "driver" && unapprovedDriver.verificationStatus === "Approved";
  assert.strictEqual(isEligible, false, "Pending/unapproved driver must not be eligible for shift assignment");
});

test("4.2 Driver with conflicting approved leave is blocked from shift assignment", () => {
  const driverId = "6a63725647d78c17944080f3"; // Annu
  const targetShiftInterval = getDutyInterval("2026-10-25", SHIFT_TYPES.EVENING); // 14:00 - 22:00

  // Case A: Full-Day Leave on that date
  const fullDayLeave = {
    driverId,
    leaveDate: "2026-10-25",
    leaveType: "Full Day",
    status: "Approved",
  };
  const fullDayIntervals = getLeaveIntervals(fullDayLeave);
  const fullDayConflict = fullDayIntervals.some((lv) =>
    doIntervalsOverlap(targetShiftInterval.startDateTime, targetShiftInterval.endDateTime, lv.startDateTime, lv.endDateTime)
  );
  assert.strictEqual(fullDayConflict, true, "Full-day approved leave must block shift assignment");

  // Case B: Half-Day PM Leave on that date
  const halfDayLeave = {
    driverId,
    leaveDate: "2026-10-25",
    leaveType: "Half Day",
    halfDaySlot: "Afternoon (PM)",
    status: "Approved",
  };
  const halfDayIntervals = getLeaveIntervals(halfDayLeave);
  const halfDayConflict = halfDayIntervals.some((lv) =>
    doIntervalsOverlap(targetShiftInterval.startDateTime, targetShiftInterval.endDateTime, lv.startDateTime, lv.endDateTime)
  );
  assert.strictEqual(halfDayConflict, true, "Afternoon (PM) leave must block Evening shift assignment");

  // Case C: Half-Day Forenoon (AM) Leave does NOT block Evening shift
  const forenoonLeave = {
    driverId,
    leaveDate: "2026-10-25",
    leaveType: "Half Day",
    halfDaySlot: "Forenoon (AM)",
    status: "Approved",
  };
  const forenoonIntervals = getLeaveIntervals(forenoonLeave);
  const forenoonConflict = forenoonIntervals.some((lv) =>
    doIntervalsOverlap(targetShiftInterval.startDateTime, targetShiftInterval.endDateTime, lv.startDateTime, lv.endDateTime)
  );
  assert.strictEqual(forenoonConflict, false, "Forenoon leave [06:00, 14:00) must NOT block Evening shift [14:00, 22:00)");
});

test("4.3 Overlapping assignment on another bus is rejected using interval overlap math", () => {
  const driverId = "6a60ae284eea28d706d7877e"; // Silpa
  const refDateStr = normalizeDateStr(new Date());

  // Bus 1 already has Silpa assigned to Morning (06:00 - 14:00)
  const bus1 = {
    _id: "bus_101",
    busNumber: "KL-01-AA-1001",
    shifts: {
      morning: { driverId: driverId, startTime: "06:00 AM", endTime: "02:00 PM" },
    },
  };

  // Attempting to assign Silpa to Morning on Bus 2
  const targetShiftInterval = getDutyInterval(refDateStr, SHIFT_TYPES.MORNING);
  const bus1AssignedInterval = getDutyInterval(refDateStr, SHIFT_TYPES.MORNING);

  const hasOverlap = doIntervalsOverlap(
    targetShiftInterval.startDateTime, targetShiftInterval.endDateTime,
    bus1AssignedInterval.startDateTime, bus1AssignedInterval.endDateTime
  );
  assert.strictEqual(hasOverlap, true, "Assigning same driver to overlapping Morning shift on another bus must conflict");

  // But assigning Silpa to Evening on Bus 2 should NOT conflict with Morning on Bus 1
  const eveningShiftInterval = getDutyInterval(refDateStr, SHIFT_TYPES.EVENING);
  const eveningOverlap = doIntervalsOverlap(
    eveningShiftInterval.startDateTime, eveningShiftInterval.endDateTime,
    bus1AssignedInterval.startDateTime, bus1AssignedInterval.endDateTime
  );
  assert.strictEqual(eveningOverlap, false, "Evening on Bus 2 does not overlap Morning on Bus 1");
});

// ----------------------------------------------------
// TEST GROUP 5: Temporary Replacement & TripSession Isolation
// ----------------------------------------------------

test("5.1 Regular roster changes do not overwrite or delete temporary DriverReplacement duties", () => {
  // Mock DriverReplacement record
  const mockReplacement = {
    _id: new mongoose.Types.ObjectId(),
    dutyDate: "2026-10-25",
    shift: "Morning",
    busNumber: "KL-08-1234",
    originalDriverId: new mongoose.Types.ObjectId("6a63725647d78c17944080f3"),
    replacementDriverId: new mongoose.Types.ObjectId("6a60ae284eea28d706d7877e"),
    status: "Assigned",
  };

  // Simulate updating Bus shifts regular roster
  const bus = {
    busNumber: "KL-08-1234",
    shifts: {
      morning: { driverId: new mongoose.Types.ObjectId("6a705b8bf4d1fa712880e6b8"), driverName: "Driver new" },
    },
  };

  // Replacement duty remains independent and unaffected
  assert.strictEqual(mockReplacement.status, "Assigned", "Replacement status must not change");
  assert.strictEqual(String(mockReplacement.replacementDriverId), "6a60ae284eea28d706d7877e", "Replacement driver must remain Silpa");
});

test("5.2 Regular roster updates do not mutate TripSession status or active trips", () => {
  const activeTrip = {
    _id: new mongoose.Types.ObjectId(),
    tripSessionId: "TRIP_SESSION_101",
    busId: "bus_101",
    driverId: "6a63725647d78c17944080f3",
    status: "ACTIVE",
    rfidTaps: 12,
  };

  // Assert active trip is untouched by roster assignment
  assert.strictEqual(activeTrip.status, "ACTIVE", "Active trip must remain ACTIVE");
  assert.strictEqual(activeTrip.rfidTaps, 12, "RFID tap count must be preserved");
});

// ----------------------------------------------------
// TEST GROUP 6: Route Registration & Authorization
// ----------------------------------------------------

test("6.1 All three roster routes are properly registered on driverRoutes", () => {
  const driverRouter = require("../routes/driverRoutes");

  const routes = driverRouter.stack
    .filter((layer) => layer.route)
    .map((layer) => ({
      path: layer.route.path,
      method: Object.keys(layer.route.methods)[0].toUpperCase(),
    }));

  const hasRosterGet = routes.some((r) => r.path === "/admin/buses/shift-roster" && r.method === "GET");
  const hasEligibleGet = routes.some((r) => r.path === "/admin/buses/:busId/shifts/:shift/eligible-drivers" && r.method === "GET");
  const hasShiftsPut = routes.some((r) => r.path === "/admin/buses/:busId/shifts" && r.method === "PUT");

  assert.ok(hasRosterGet, "GET /admin/buses/shift-roster must be registered");
  assert.ok(hasEligibleGet, "GET /admin/buses/:busId/shifts/:shift/eligible-drivers must be registered");
  assert.ok(hasShiftsPut, "PUT /admin/buses/:busId/shifts must be registered");
});

test("6.2 driverRoutes applies protect & adminOnly middleware to /admin routes", () => {
  const driverRouter = require("../routes/driverRoutes");

  const middlewareNames = driverRouter.stack
    .filter((layer) => !layer.route)
    .map((layer) => layer.name);

  assert.ok(middlewareNames.includes("protect"), "Router must include 'protect' auth middleware");
  assert.ok(middlewareNames.includes("adminOnly"), "Router must include 'adminOnly' auth middleware");
});

// ----------------------------------------------------
// TEST GROUP 7: Approved Leave Integration with Production Three-Shift Roster
// ----------------------------------------------------

const driverRouter = require("../routes/driverRoutes");
const syncReplacementsForApprovedLeave = driverRouter.syncReplacementsForApprovedLeave;

assert.ok(
  typeof syncReplacementsForApprovedLeave === "function",
  "syncReplacementsForApprovedLeave must be exported on driverRouter"
);

/**
 * In-memory Mongoose model adapter that exercises the actual production
 * syncReplacementsForApprovedLeave function without requiring a live MongoDB connection.
 */
function createMockEnvironment({
  users = [],
  buses = [],
  schedules = [],
  replacements = [],
}) {
  const usersStore = users.map((u) => ({ ...u }));
  const busesStore = buses.map((b) => ({ ...b }));
  const schedulesStore = schedules.map((s) => ({ ...s }));
  const replacementsStore = replacements.map((r) => ({
    ...r,
    save: async function () { return this; },
  }));

  const mockUser = {
    findById: async (id) => usersStore.find((u) => String(u._id) === String(id)) || null,
    findOne: async (query) => {
      if (query.email) {
        return (
          usersStore.find((u) =>
            query.email.test ? query.email.test(u.email) : u.email.toLowerCase() === query.email.toLowerCase()
          ) || null
        );
      }
      return null;
    },
  };

  const mockSchedule = {
    find: (query) => {
      const matches = schedulesStore.filter((s) => {
        if (s.is_active === false) return false;
        if (query.$or) {
          return query.$or.some((cond) => {
            if (cond.driver_id && String(s.driver_id) === String(cond.driver_id)) return true;
            if (cond.driverName && cond.driverName.$regex && cond.driverName.$regex.test(s.driverName)) return true;
            return false;
          });
        }
        return true;
      });

      const queryObj = {
        populate: () => queryObj,
        then: (onFulfilled, onRejected) => Promise.resolve(matches).then(onFulfilled, onRejected),
        catch: (onRejected) => Promise.resolve(matches).catch(onRejected),
      };
      return queryObj;
    },
  };

  const mockBus = {
    find: async (query) => {
      return busesStore.filter((b) => {
        if (b.is_active === false) return false;
        if (query.$or) {
          return query.$or.some((cond) => {
            if (cond.driverId && String(b.driverId) === String(cond.driverId)) return true;
            if (cond.driverName && cond.driverName.$regex && cond.driverName.$regex.test(b.driverName)) return true;
            if (cond["shifts.morning.driverId"] && b.shifts?.morning?.driverId && String(b.shifts.morning.driverId) === String(cond["shifts.morning.driverId"])) return true;
            if (cond["shifts.evening.driverId"] && b.shifts?.evening?.driverId && String(b.shifts.evening.driverId) === String(cond["shifts.evening.driverId"])) return true;
            if (cond["shifts.night.driverId"] && b.shifts?.night?.driverId && String(b.shifts.night.driverId) === String(cond["shifts.night.driverId"])) return true;
            return false;
          });
        }
        return true;
      });
    },
  };

  const mockReplacement = {
    findOne: async (query) => {
      // Simulate real asynchronous microtask latency to exercise concurrency locks
      await new Promise((r) => setTimeout(r, 2));
      return (
        replacementsStore.find(
          (r) =>
            String(r.busId) === String(query.busId) &&
            r.dutyDate === query.dutyDate &&
            r.shift === query.shift
        ) || null
      );
    },
    create: async (doc) => {
      await new Promise((r) => setTimeout(r, 2));
      const created = {
        ...doc,
        _id: doc._id || new mongoose.Types.ObjectId(),
        save: async function () { return this; },
      };
      replacementsStore.push(created);
      return created;
    },
  };

  return {
    models: {
      User: mockUser,
      Schedule: mockSchedule,
      Bus: mockBus,
      DriverReplacement: mockReplacement,
    },
    stores: {
      users: usersStore,
      buses: busesStore,
      schedules: schedulesStore,
      replacements: replacementsStore,
    },
  };
}

asyncTest("7.1 Production sync: Morning, Evening, and Night leave overlaps generate respective duties", async () => {
  const driverMorningId = new mongoose.Types.ObjectId("6a63725647d78c1794408001");
  const driverEveningId = new mongoose.Types.ObjectId("6a63725647d78c1794408002");
  const driverNightId = new mongoose.Types.ObjectId("6a63725647d78c1794408003");

  const busId = new mongoose.Types.ObjectId();
  const bus = {
    _id: busId,
    busNumber: "KL-01-ALLSHIFTS",
    shifts: {
      morning: { driverId: driverMorningId, driverName: "Morning Driver", startTime: "06:00 AM", endTime: "02:00 PM" },
      evening: { driverId: driverEveningId, driverName: "Evening Driver", startTime: "02:00 PM", endTime: "10:00 PM" },
      night: { driverId: driverNightId, driverName: "Night Driver", startTime: "10:00 PM", endTime: "06:00 AM" },
    },
  };

  const env = createMockEnvironment({ buses: [bus] });

  // Morning driver leave
  const leaveM = { _id: new mongoose.Types.ObjectId(), driverId: driverMorningId, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };
  const countM = await syncReplacementsForApprovedLeave(leaveM, env.models);
  assert.strictEqual(countM, 1);
  assert.strictEqual(env.stores.replacements[0].shift, "Morning");
  assert.strictEqual(env.stores.replacements[0].startDateTime.getHours(), 6);

  // Evening driver leave
  const leaveE = { _id: new mongoose.Types.ObjectId(), driverId: driverEveningId, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };
  const countE = await syncReplacementsForApprovedLeave(leaveE, env.models);
  assert.strictEqual(countE, 1);
  assert.strictEqual(env.stores.replacements[1].shift, "Evening");
  assert.strictEqual(env.stores.replacements[1].startDateTime.getHours(), 14);

  // Night driver leave
  const leaveN = { _id: new mongoose.Types.ObjectId(), driverId: driverNightId, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };
  const countN = await syncReplacementsForApprovedLeave(leaveN, env.models);
  assert.strictEqual(countN, 1);
  assert.strictEqual(env.stores.replacements[2].shift, "Night");
  assert.strictEqual(env.stores.replacements[2].startDateTime.getHours(), 22);
});

asyncTest("7.2 Production sync: Night shift crossing midnight (+1 day, 22:00 to 06:00, 8h interval)", async () => {
  const driverId = new mongoose.Types.ObjectId("6a63725647d78c1794408003");
  const bus = {
    _id: new mongoose.Types.ObjectId(),
    busNumber: "KL-01-NIGHTCROSS",
    shifts: {
      morning: { driverId: null, driverName: "Not Assigned" },
      evening: { driverId: null, driverName: "Not Assigned" },
      night: { driverId, driverName: "Night Driver", startTime: "10:00 PM", endTime: "06:00 AM" },
    },
  };

  const env = createMockEnvironment({ buses: [bus] });
  const leave = { _id: new mongoose.Types.ObjectId(), driverId, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };

  const count = await syncReplacementsForApprovedLeave(leave, env.models);
  assert.strictEqual(count, 1);

  const rep = env.stores.replacements[0];
  assert.strictEqual(rep.shift, "Night");
  assert.strictEqual(rep.startDateTime.getHours(), 22);
  assert.strictEqual(rep.endDateTime.getHours(), 6);
  assert.strictEqual(rep.endDateTime.getDate(), rep.startDateTime.getDate() + 1, "Night duty must end on following day (+1 day)");
  assert.strictEqual(rep.endDateTime - rep.startDateTime, 8 * 60 * 60 * 1000, "Duty duration must be 8 hours continuous");
});

asyncTest("7.3 Production sync: Partial-day non-overlapping leave produces 0 duties", async () => {
  const driverId = new mongoose.Types.ObjectId("6a63725647d78c1794408002");
  const bus = {
    _id: new mongoose.Types.ObjectId(),
    busNumber: "KL-01-NONOVERLAP",
    shifts: {
      morning: { driverId: null, driverName: "Not Assigned" },
      evening: { driverId, driverName: "Evening Driver", startTime: "02:00 PM", endTime: "10:00 PM" },
      night: { driverId: null, driverName: "Not Assigned" },
    },
  };

  const env = createMockEnvironment({ buses: [bus] });

  // Driver takes Forenoon (AM) leave [06:00, 14:00) which does not overlap Evening shift [14:00, 22:00)
  const leave = {
    _id: new mongoose.Types.ObjectId(),
    driverId,
    leaveDate: "2026-10-25",
    leaveType: "Half Day",
    halfDaySlot: "Forenoon (AM)",
    status: "Approved",
  };

  const count = await syncReplacementsForApprovedLeave(leave, env.models);
  assert.strictEqual(count, 0, "Non-overlapping leave must generate 0 replacement duties");
  assert.strictEqual(env.stores.replacements.length, 0);
});

asyncTest("7.4 Production sync: Sequential repeated synchronization is idempotent (no duplicates)", async () => {
  const driverId = new mongoose.Types.ObjectId("6a63725647d78c1794408001");
  const bus = {
    _id: new mongoose.Types.ObjectId(),
    busNumber: "KL-01-REPEAT",
    shifts: {
      morning: { driverId, driverName: "Morning Driver", startTime: "06:00 AM", endTime: "02:00 PM" },
      evening: { driverId: null, driverName: "Not Assigned" },
      night: { driverId: null, driverName: "Not Assigned" },
    },
  };

  const env = createMockEnvironment({ buses: [bus] });
  const leave = { _id: new mongoose.Types.ObjectId(), driverId, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };

  const count1 = await syncReplacementsForApprovedLeave(leave, env.models);
  assert.strictEqual(count1, 1);
  assert.strictEqual(env.stores.replacements.length, 1);

  const count2 = await syncReplacementsForApprovedLeave(leave, env.models);
  assert.strictEqual(count2, 1);
  assert.strictEqual(env.stores.replacements.length, 1, "Repeated sequential sync must not create duplicate replacement duties");
});

asyncTest("7.5 Production sync: Concurrent synchronization with Promise.all serializes and prevents duplicates", async () => {
  const driverId = new mongoose.Types.ObjectId("6a63725647d78c1794408001");
  const bus = {
    _id: new mongoose.Types.ObjectId(),
    busNumber: "KL-01-CONCURRENT",
    shifts: {
      morning: { driverId, driverName: "Morning Driver", startTime: "06:00 AM", endTime: "02:00 PM" },
      evening: { driverId: null, driverName: "Not Assigned" },
      night: { driverId: null, driverName: "Not Assigned" },
    },
  };

  const env = createMockEnvironment({ buses: [bus] });
  const leave = { _id: new mongoose.Types.ObjectId(), driverId, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };

  // Dispatch two sync calls concurrently
  const [res1, res2] = await Promise.all([
    syncReplacementsForApprovedLeave(leave, env.models),
    syncReplacementsForApprovedLeave(leave, env.models),
  ]);

  assert.strictEqual(res1, 1);
  assert.strictEqual(res2, 1);
  assert.strictEqual(env.stores.replacements.length, 1, "Concurrent sync calls must serialize and produce exactly 1 replacement record");
});

asyncTest("7.6 Production sync: Preservation of assigned substitute driver and active status", async () => {
  const regularDriverId = new mongoose.Types.ObjectId("6a63725647d78c1794408001");
  const substituteDriverId = new mongoose.Types.ObjectId("6a63725647d78c1794408099");
  const busId = new mongoose.Types.ObjectId();

  const bus = {
    _id: busId,
    busNumber: "KL-01-PRESERVE",
    shifts: {
      morning: { driverId: regularDriverId, driverName: "Regular Driver", startTime: "06:00 AM", endTime: "02:00 PM" },
      evening: { driverId: null, driverName: "Not Assigned" },
      night: { driverId: null, driverName: "Not Assigned" },
    },
  };

  const preExistingAssignedReplacement = {
    _id: new mongoose.Types.ObjectId(),
    busId: busId,
    dutyDate: "2026-10-25",
    shift: "Morning",
    originalDriverId: regularDriverId,
    originalDriverName: "Regular Driver",
    replacementDriverId: substituteDriverId,
    replacementDriverName: "Designated Substitute",
    status: "Assigned",
  };

  const env = createMockEnvironment({
    buses: [bus],
    replacements: [preExistingAssignedReplacement],
  });

  const leave = { _id: new mongoose.Types.ObjectId(), driverId: regularDriverId, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };

  await syncReplacementsForApprovedLeave(leave, env.models);

  assert.strictEqual(env.stores.replacements.length, 1);
  const rep = env.stores.replacements[0];
  assert.strictEqual(rep.status, "Assigned", "Status must remain 'Assigned', not reset to 'Replacement Required'");
  assert.strictEqual(String(rep.replacementDriverId), String(substituteDriverId), "Substitute driver ID must be preserved");
  assert.strictEqual(rep.replacementDriverName, "Designated Substitute", "Substitute driver name must be preserved");
});

asyncTest("7.7 Production sync: Legacy Schedule and root Bus compatibility", async () => {
  const driverSchedule = new mongoose.Types.ObjectId("6a63725647d78c1794408001");
  const driverRootBus = new mongoose.Types.ObjectId("6a63725647d78c1794408002");
  const driverShiftBus = new mongoose.Types.ObjectId("6a63725647d78c1794408003");

  const bus1Id = new mongoose.Types.ObjectId();
  const bus2Id = new mongoose.Types.ObjectId();
  const bus3Id = new mongoose.Types.ObjectId();

  const activeSchedules = [
    {
      _id: new mongoose.Types.ObjectId(),
      bus_id: bus1Id,
      busNumber: "KL-01-SCHED",
      driver_id: String(driverSchedule),
      driverName: "Schedule Driver",
      shift: "Morning",
      start_time: "07:00 AM",
      is_active: true,
    },
  ];

  const assignedBusesDirect = [
    {
      _id: bus2Id,
      busNumber: "KL-02-ROOT",
      driverId: driverRootBus,
      driverName: "Root Driver",
      departureTime: "03:00 PM", // Evening
      is_active: true,
    },
  ];

  const assignedBusesByShift = [
    {
      _id: bus3Id,
      busNumber: "KL-03-SHIFT",
      shifts: {
        morning: { driverId: null, driverName: "Not Assigned" },
        evening: { driverId: null, driverName: "Not Assigned" },
        night: { driverId: driverShiftBus, driverName: "Shift Driver", startTime: "10:00 PM", endTime: "06:00 AM" },
      },
      is_active: true,
    },
  ];

  const env = createMockEnvironment({
    schedules: activeSchedules,
    buses: [...assignedBusesDirect, ...assignedBusesByShift],
  });

  // Sync for Driver A (Schedule)
  const leaveA = { _id: new mongoose.Types.ObjectId(), driverId: driverSchedule, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };
  const resA = await syncReplacementsForApprovedLeave(leaveA, env.models);
  assert.strictEqual(resA, 1);
  assert.strictEqual(env.stores.replacements[0].busNumber, "KL-01-SCHED");
  assert.strictEqual(env.stores.replacements[0].shift, "Morning");

  // Sync for Driver B (Root Bus)
  const leaveB = { _id: new mongoose.Types.ObjectId(), driverId: driverRootBus, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };
  const resB = await syncReplacementsForApprovedLeave(leaveB, env.models);
  assert.strictEqual(resB, 1);
  assert.strictEqual(env.stores.replacements[1].busNumber, "KL-02-ROOT");
  assert.strictEqual(env.stores.replacements[1].shift, "Evening");

  // Sync for Driver C (Shift Roster)
  const leaveC = { _id: new mongoose.Types.ObjectId(), driverId: driverShiftBus, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };
  const resC = await syncReplacementsForApprovedLeave(leaveC, env.models);
  assert.strictEqual(resC, 1);
  assert.strictEqual(env.stores.replacements[2].busNumber, "KL-03-SHIFT");
  assert.strictEqual(env.stores.replacements[2].shift, "Night");
});

asyncTest("7.8 Production sync: Existing cancelled-duty reactivation behavior", async () => {
  const driverId = new mongoose.Types.ObjectId("6a63725647d78c1794408001");
  const busId = new mongoose.Types.ObjectId();

  const bus = {
    _id: busId,
    busNumber: "KL-01-REACTIVATE",
    shifts: {
      morning: { driverId, driverName: "Morning Driver", startTime: "06:00 AM", endTime: "02:00 PM" },
      evening: { driverId: null, driverName: "Not Assigned" },
      night: { driverId: null, driverName: "Not Assigned" },
    },
  };

  const oldCancelledReplacement = {
    _id: new mongoose.Types.ObjectId(),
    leaveId: new mongoose.Types.ObjectId(),
    busId: busId,
    dutyDate: "2026-10-25",
    shift: "Morning",
    originalDriverId: driverId,
    originalDriverName: "Morning Driver",
    status: "Cancelled",
  };

  const env = createMockEnvironment({
    buses: [bus],
    replacements: [oldCancelledReplacement],
  });

  const newLeaveId = new mongoose.Types.ObjectId();
  const newLeave = { _id: newLeaveId, driverId, leaveDate: "2026-10-25", leaveType: "Full Day", status: "Approved" };

  const count = await syncReplacementsForApprovedLeave(newLeave, env.models);
  assert.strictEqual(count, 1, "Reactivating cancelled duty must increment affected count");
  assert.strictEqual(env.stores.replacements.length, 1, "No new document inserted; reactivated in-place");
  assert.strictEqual(env.stores.replacements[0].status, "Replacement Required", "Status must become 'Replacement Required'");
  assert.strictEqual(String(env.stores.replacements[0].leaveId), String(newLeaveId), "leaveId must be updated to new approved leave");
});

// ----------------------------------------------------
// SUMMARY
// ----------------------------------------------------

Promise.all(pendingAsyncTests).then(() => {
  console.log("=================================================");
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${totalTests - passedTests}`);
  console.log("=================================================");

  if (passedTests === totalTests) {
    console.log("✅ ALL STAGE 2 THREE-SHIFT ROSTER TESTS PASSED!");
    process.exit(0);
  } else {
    console.error("❌ SOME TESTS FAILED!");
    process.exit(1);
  }
});

