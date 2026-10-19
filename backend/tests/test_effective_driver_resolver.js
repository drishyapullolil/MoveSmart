/**
 * Stage D2 Verification Test Suite - Review D1 and Safe Shift-Overrun Policy
 * 
 * Verifies:
 * 1. Trip fitting exactly within a shift (overrun = 0m).
 * 2. Overruns of 1 minute and 15 minutes (within grace period: warning + audit exception, tripStart eligible).
 * 3. Overrun of 16 minutes (exceeds 15m grace period: blocked, status INVALID_OR_AMBIGUOUS_DUTY / SHIFT_BOUNDARY_OVERRUN, tripStart blocked).
 * 4. Configurable shift grace period (custom 5m and 20m overrides).
 * 5. Root-cause attribution: Base schedule duration fault vs traffic delay buffer fault.
 * 6. Night-shift trips crossing midnight (+1 day) and post-midnight operational service date.
 * 7. Unresolved trip duration and missing departure start time.
 * 8. Regular driver on approved leave without replacement.
 * 9. Regular driver on approved leave with valid active replacement.
 * 10. Invalid or unavailable replacement (e.g. status "Replacement Required" or replacement on leave).
 * 11. Preservation of explicit historical schedule assignments (backward compatibility).
 * 12. Missing shift assignment (unassigned bus and unassigned shift roster).
 * 13. Strict isolation: empty shift roster NEVER falls back to legacy Bus.driverId or Bus.driverName.
 * 14. Passenger view sanitization: verifies status (ASSIGNED, ASSIGNMENT_PENDING, SCHEDULE_REVIEW_REQUIRED)
 *     and absolute privacy protection (no phone, email, license, or user IDs leaked).
 * 15. Driver trip-start policy enforcement (ELIGIBLE, WARNING_OVERRUN, BLOCKED) and audit logging.
 */

const assert = require("assert");
const {
  SHIFT_POLICY_CONFIG,
  PASSENGER_ASSIGNMENT_STATUS,
  TRIP_START_STATUS,
  RESOLVER_STATUS,
  RESOLVER_SUBSTATUS,
  parseDurationStringToMinutes,
  extractTripDurationMinutes,
  resolveOperationalServiceDate,
  validateTripShiftBoundary,
  buildPassengerView,
  buildTripStartEligibility,
  resolveEffectiveDepartureDriver,
} = require("../utils/effectiveDriverResolver");

console.log("=================================================");
console.log("RUNNING STAGE D2 SAFE SHIFT-OVERRUN TEST SUITE");
console.log("=================================================");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

// ----------------------------------------------------
// Mock Data Helpers
// ----------------------------------------------------
const mockBus = {
  _id: "660000000000000000000101",
  busNumber: "KL-07-MS-1008",
  busName: "MoveSmart Express",
  driverId: "660000000000000000000999", // Legacy permanent driver on bus root
  driverName: "Legacy Permanent Driver",
  driverPhone: "9000000000",
  driverEmail: "legacy@movesmart.test",
  duration: "2h 0m",
  shifts: {
    morning: {
      driverId: "660000000000000000000201",
      driverName: "Morning Driver John",
      driverPhone: "9876543210",
      driverEmail: "john@movesmart.test",
      startTime: "06:00 AM",
      endTime: "02:00 PM",
    },
    evening: {
      driverId: "660000000000000000000202",
      driverName: "Evening Driver Sarah",
      driverPhone: "9876543211",
      driverEmail: "sarah@movesmart.test",
      startTime: "02:00 PM",
      endTime: "10:00 PM",
    },
    night: {
      driverId: "660000000000000000000203",
      driverName: "Night Driver Alex",
      driverPhone: "9876543212",
      driverEmail: "alex@movesmart.test",
      startTime: "10:00 PM",
      endTime: "06:00 AM",
    },
  },
};

const mockRoute = {
  _id: "660000000000000000000301",
  routeId: "RT-EK-01",
  routeName: "Erumely ➔ Kanjirappally",
  total_duration_minutes: 120, // 2 hours
};

// ----------------------------------------------------
// Group 1: Canonical Shift Exact Fit & Clean Duty (Overrun = 0)
// ----------------------------------------------------
runTest("1.1 Trip fitting cleanly in Morning shift (08:30 AM + 2h = 10:30 AM) is a normal assignment", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.ASSIGNED_REGULAR_DRIVER);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.MATCH_SUCCESS);
  assert.strictEqual(result.hasShiftOverrunException, false);
  assert.strictEqual(result.boundaryCheck.fitsWithinShift, true);
  assert.strictEqual(result.boundaryCheck.overrunMinutes, 0);
  assert.strictEqual(result.boundaryCheck.requiresWarning, false);

  // Trip start eligibility
  assert.strictEqual(result.tripStartEligibility.canStartTrip, true);
  assert.strictEqual(result.tripStartEligibility.status, TRIP_START_STATUS.ELIGIBLE);
  assert.strictEqual(result.tripStartEligibility.requiresWarning, false);

  // Passenger view
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(result.passengerView.driverName, "Morning Driver John");
});

runTest("1.2 Trip ending exactly at shift boundary (12:00 PM + 120m = 02:00 PM) fits cleanly with 0m overrun", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "12:00 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 120 },
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.ASSIGNED_REGULAR_DRIVER);
  assert.strictEqual(result.boundaryCheck.fitsWithinShift, true);
  assert.strictEqual(result.boundaryCheck.overrunMinutes, 0);
  assert.strictEqual(result.boundaryCheck.isOverrun, false);
  assert.strictEqual(result.hasShiftOverrunException, false);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, true);
  assert.strictEqual(result.tripStartEligibility.status, TRIP_START_STATUS.ELIGIBLE);
});

// ----------------------------------------------------
// Group 2: Shift Overrun Exceptions Within Grace Period (1 min, 5 mins, 15 mins)
// ----------------------------------------------------
runTest("2.1 Overrun of exactly 1 minute is recorded as warning exception and eligible to start", () => {
  // Morning shift ends at 02:00 PM. Departure 12:30 PM + 91 mins = 02:01 PM (1m overrun)
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "12:30 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 91 },
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.ASSIGNED_REGULAR_DRIVER);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.OVERRUN_WITHIN_GRACE_PERIOD);
  assert.strictEqual(result.hasShiftOverrunException, true);

  // Boundary check diagnostics
  assert.strictEqual(result.boundaryCheck.fitsWithinShift, true);
  assert.strictEqual(result.boundaryCheck.isOverrun, true);
  assert.strictEqual(result.boundaryCheck.withinGracePeriod, true);
  assert.strictEqual(result.boundaryCheck.overrunMinutes, 1);
  assert.strictEqual(result.boundaryCheck.requiresWarning, true);
  assert.ok(result.boundaryCheck.auditRecord);
  assert.strictEqual(result.boundaryCheck.auditRecord.eventType, "SHIFT_OVERRUN_EXCEPTION");
  assert.strictEqual(result.boundaryCheck.auditRecord.overrunMinutes, 1);

  // Trip start policy
  assert.strictEqual(result.tripStartEligibility.canStartTrip, true);
  assert.strictEqual(result.tripStartEligibility.status, TRIP_START_STATUS.WARNING_OVERRUN);
  assert.strictEqual(result.tripStartEligibility.requiresWarning, true);
  assert.ok(result.tripStartEligibility.warningMessage.includes("exceeds Morning shift boundary"));

  // Passenger view
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(result.passengerView.driverName, "Morning Driver John");
});

runTest("2.2 Overrun of exactly 15 minutes (at grace period boundary) is recorded as warning exception", () => {
  // Morning shift ends at 02:00 PM. Departure 12:30 PM + 105 mins = 02:15 PM (15m overrun)
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "12:30 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 105 },
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.ASSIGNED_REGULAR_DRIVER);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.OVERRUN_WITHIN_GRACE_PERIOD);
  assert.strictEqual(result.hasShiftOverrunException, true);
  assert.strictEqual(result.boundaryCheck.overrunMinutes, 15);
  assert.strictEqual(result.boundaryCheck.withinGracePeriod, true);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, true);
  assert.strictEqual(result.tripStartEligibility.status, TRIP_START_STATUS.WARNING_OVERRUN);
});

runTest("2.3 Traffic delay buffer causing 5m overrun is recorded as traffic-fault exception", () => {
  // Departure 01:00 PM + 50m base = 01:50 PM (fits shift). + 15m delay buffer = 02:05 PM (5m overrun)
  const result = resolveEffectiveDepartureDriver({
    schedule: {
      start_time: "01:00 PM",
      bus_id: mockBus._id,
      busNumber: mockBus.busNumber,
      delay_buffer_minutes: 15,
    },
    bus: mockBus,
    route: { total_duration_minutes: 50 },
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.hasShiftOverrunException, true);
  assert.strictEqual(result.boundaryCheck.overrunMinutes, 5);
  assert.strictEqual(result.boundaryCheck.baseOverrunMinutes, 0); // Base duration alone fits!
  assert.strictEqual(result.boundaryCheck.trafficOverrunMinutes, 5);
  assert.strictEqual(result.boundaryCheck.isScheduleFault, false);
  assert.strictEqual(result.boundaryCheck.isTrafficDelayFault, true);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, true);
  assert.strictEqual(result.tripStartEligibility.status, TRIP_START_STATUS.WARNING_OVERRUN);
});

// ----------------------------------------------------
// Group 3: Shift Overrun Beyond Grace Period (16 mins, 30 mins)
// ----------------------------------------------------
runTest("3.1 Overrun of 16 minutes exceeds default grace period and is blocked", () => {
  // Morning shift ends at 02:00 PM. Departure 12:30 PM + 106 mins = 02:16 PM (16m overrun)
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "12:30 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 106 },
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.SHIFT_BOUNDARY_OVERRUN);
  assert.strictEqual(result.boundaryCheck.fitsWithinShift, false);
  assert.strictEqual(result.boundaryCheck.withinGracePeriod, false);
  assert.strictEqual(result.boundaryCheck.overrunMinutes, 16);

  // Trip start policy
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.tripStartEligibility.status, TRIP_START_STATUS.BLOCKED);
  assert.strictEqual(result.tripStartEligibility.requiresAdminAuthorization, true);
  assert.strictEqual(result.tripStartEligibility.adminOverridePermitted, false);
  assert.ok(result.tripStartEligibility.blockingReason.includes("exceeds 15-min grace period"));

  // Passenger view
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED);
  assert.strictEqual(result.passengerView.driverName, "Not Assigned");
});

runTest("3.2 Major overrun of 30 mins (01:00 PM + 90 mins -> 02:30 PM) is blocked", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "01:00 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 90 }, // 30m overrun
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.SHIFT_BOUNDARY_OVERRUN);
  assert.strictEqual(result.boundaryCheck.overrunMinutes, 30);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED);
});

// ----------------------------------------------------
// Group 4: Dynamic Shift-Boundary Grace Period Configuration
// ----------------------------------------------------
runTest("4.1 Default grace period is documented as 15 minutes in SHIFT_POLICY_CONFIG", () => {
  assert.strictEqual(SHIFT_POLICY_CONFIG.DEFAULT_GRACE_PERIOD_MINUTES, 15);
  assert.strictEqual(SHIFT_POLICY_CONFIG.MAX_ALLOWED_OVERRUN_MINUTES, 15);
});

runTest("4.2 Stricter custom grace period (5 mins) blocks a 10-minute overrun", () => {
  // Overrun is 10 mins: allowed under 15m default, but blocked when gracePeriodMinutes: 5 is passed
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "12:30 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 100 }, // 10 mins overrun
    serviceDate: "2026-10-19",
    gracePeriodMinutes: 5, // Custom strict policy
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY);
  assert.strictEqual(result.boundaryCheck.withinGracePeriod, false);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
});

runTest("4.3 Extended custom grace period (20 mins) allows a 16-minute overrun with warning", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "12:30 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 106 }, // 16 mins overrun
    serviceDate: "2026-10-19",
    gracePeriodMinutes: 20, // Extended policy
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.OVERRUN_WITHIN_GRACE_PERIOD);
  assert.strictEqual(result.boundaryCheck.withinGracePeriod, true);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, true);
  assert.strictEqual(result.tripStartEligibility.status, TRIP_START_STATUS.WARNING_OVERRUN);
});

// ----------------------------------------------------
// Group 5: Base Schedule Fault vs Traffic Delay Fault Separation
// ----------------------------------------------------
runTest("5.1 Base route duration exceeding shift end is flagged as isScheduleFault", () => {
  // Morning shift ends at 02:00 PM. 01:10 PM + 60m base = 02:10 PM (10m base overrun)
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "01:10 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 60 },
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.boundaryCheck.isScheduleFault, true);
  assert.strictEqual(result.boundaryCheck.isTrafficDelayFault, false);
  assert.strictEqual(result.boundaryCheck.baseOverrunMinutes, 10);
  assert.strictEqual(result.boundaryCheck.trafficOverrunMinutes, 0);
});

runTest("5.2 Traffic delay pushing a valid schedule into overrun is flagged as isTrafficDelayFault", () => {
  // 01:15 PM + 40m base = 01:55 PM (clean fit). + 10m traffic delay = 02:05 PM (5m overrun)
  const result = resolveEffectiveDepartureDriver({
    schedule: {
      start_time: "01:15 PM",
      bus_id: mockBus._id,
      busNumber: mockBus.busNumber,
      delay_buffer_minutes: 10,
    },
    bus: mockBus,
    route: { total_duration_minutes: 40 },
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.boundaryCheck.isScheduleFault, false);
  assert.strictEqual(result.boundaryCheck.isTrafficDelayFault, true);
  assert.strictEqual(result.boundaryCheck.baseOverrunMinutes, 0);
  assert.strictEqual(result.boundaryCheck.trafficOverrunMinutes, 5);
});

// ----------------------------------------------------
// Group 6: Night Shift Crossing Midnight
// ----------------------------------------------------
runTest("6.1 Night shift departure (11:00 PM + 180 mins) crosses midnight to 02:00 AM cleanly", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "11:00 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 180 }, // Ends at 02:00 AM next day (fits before 06:00 AM)
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.ASSIGNED_REGULAR_DRIVER);
  assert.strictEqual(result.driverId, "660000000000000000000203");
  assert.strictEqual(result.driverName, "Night Driver Alex");
  assert.strictEqual(result.shift, "Night");
  assert.strictEqual(result.boundaryCheck.fitsWithinShift, true);
  assert.strictEqual(result.boundaryCheck.tripEndTimeStr, "02:00 AM");
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
});

runTest("6.2 Night shift post-midnight departure (04:30 AM + 120 mins) overruns 06:00 AM boundary by 30 mins and is blocked", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "04:30 AM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { total_duration_minutes: 120 }, // Ends at 06:30 AM (exceeds 06:00 AM by 30 mins)
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.SHIFT_BOUNDARY_OVERRUN);
  assert.strictEqual(result.boundaryCheck.overrunMinutes, 30);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED);
});

// ----------------------------------------------------
// Group 7: Unresolved Duration and Missing Start Time
// ----------------------------------------------------
runTest("7.1 Schedule with missing start_time is rejected as INVALID_OR_AMBIGUOUS_DUTY", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "", bus_id: mockBus._id },
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.MISSING_START_TIME);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED);
});

runTest("7.2 Unresolved duration across Route, Schedule, and Bus is rejected", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: mockBus._id },
    bus: { ...mockBus, duration: null },
    route: { ...mockRoute, total_duration_minutes: null, duration: null, stops: [] },
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.UNRESOLVED_DURATION);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED);
});

// ----------------------------------------------------
// Group 8: Approved Leave Without Valid Replacement
// ----------------------------------------------------
runTest("8.1 Regular driver on approved Full Day leave returns DRIVER_ON_LEAVE_UNREPLACED and blocks start", () => {
  const mockLeaves = [
    {
      _id: "660000000000000000000401",
      driverId: "660000000000000000000201", // Morning Driver John
      driverName: "Morning Driver John",
      leaveDate: "2026-10-19",
      leaveType: "Full Day",
      status: "Approved",
    },
  ];

  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
    driverLeaves: mockLeaves,
    driverReplacements: [],
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.DRIVER_ON_APPROVED_LEAVE);
  assert.strictEqual(result.driverId, null);
  assert.strictEqual(result.isOnLeave, true);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.tripStartEligibility.status, TRIP_START_STATUS.BLOCKED);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
  assert.strictEqual(result.passengerView.driverName, "Not Assigned");
});

runTest("8.2 Pending leave does NOT block regular driver from duty", () => {
  const pendingLeaves = [
    {
      _id: "660000000000000000000402",
      driverId: "660000000000000000000201",
      leaveDate: "2026-10-19",
      leaveType: "Full Day",
      status: "Pending", // NOT approved
    },
  ];

  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
    driverLeaves: pendingLeaves,
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.ASSIGNED_REGULAR_DRIVER);
  assert.strictEqual(result.driverId, "660000000000000000000201");
  assert.strictEqual(result.tripStartEligibility.canStartTrip, true);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
});

// ----------------------------------------------------
// Group 9: Approved Leave With Valid Active Replacement
// ----------------------------------------------------
runTest("9.1 Active Assigned replacement takes precedence and enables trip start", () => {
  const mockLeaves = [
    {
      _id: "660000000000000000000401",
      driverId: "660000000000000000000201",
      leaveDate: "2026-10-19",
      leaveType: "Full Day",
      status: "Approved",
    },
  ];

  const mockReplacements = [
    {
      _id: "660000000000000000000501",
      busId: mockBus._id,
      busNumber: mockBus.busNumber,
      shift: "Morning",
      dutyDate: "2026-10-19",
      originalDriverId: "660000000000000000000201",
      originalDriverName: "Morning Driver John",
      replacementDriverId: "660000000000000000000777",
      replacementDriverName: "Relief Driver Robert",
      replacementDriverPhone: "9112233445",
      status: "Assigned",
    },
  ];

  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
    driverLeaves: mockLeaves,
    driverReplacements: mockReplacements,
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.VALID_REPLACEMENT_DRIVER);
  assert.strictEqual(result.driverId, "660000000000000000000777");
  assert.strictEqual(result.driverName, "Relief Driver Robert");
  assert.strictEqual(result.isReplacement, true);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, true);
  assert.strictEqual(result.tripStartEligibility.status, TRIP_START_STATUS.ELIGIBLE);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(result.passengerView.driverName, "Relief Driver Robert");
});

// ----------------------------------------------------
// Group 10: Invalid Replacement Statuses & Chained Leave Conflicts
// ----------------------------------------------------
runTest("10.1 Unassigned replacement duty ('Replacement Required') blocks start", () => {
  const mockLeaves = [
    {
      _id: "660000000000000000000401",
      driverId: "660000000000000000000201",
      leaveDate: "2026-10-19",
      leaveType: "Full Day",
      status: "Approved",
    },
  ];

  const mockReplacements = [
    {
      _id: "660000000000000000000502",
      busId: mockBus._id,
      busNumber: mockBus.busNumber,
      shift: "Morning",
      dutyDate: "2026-10-19",
      originalDriverId: "660000000000000000000201",
      replacementDriverId: null, // Not assigned yet!
      status: "Replacement Required",
    },
  ];

  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
    driverLeaves: mockLeaves,
    driverReplacements: mockReplacements,
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
});

runTest("10.2 Replacement driver who is also on approved leave is blocked", () => {
  const mockLeaves = [
    {
      _id: "660000000000000000000401",
      driverId: "660000000000000000000201", // Original driver John
      leaveDate: "2026-10-19",
      leaveType: "Full Day",
      status: "Approved",
    },
    {
      _id: "660000000000000000000403",
      driverId: "660000000000000000000777", // Replacement driver Robert is ALSO on leave!
      leaveDate: "2026-10-19",
      leaveType: "Full Day",
      status: "Approved",
    },
  ];

  const mockReplacements = [
    {
      _id: "660000000000000000000501",
      busId: mockBus._id,
      busNumber: mockBus.busNumber,
      shift: "Morning",
      dutyDate: "2026-10-19",
      originalDriverId: "660000000000000000000201",
      replacementDriverId: "660000000000000000000777",
      replacementDriverName: "Relief Driver Robert",
      status: "Assigned",
    },
  ];

  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
    driverLeaves: mockLeaves,
    driverReplacements: mockReplacements,
  });

  assert.strictEqual(result.success, false);
  assert.strictEqual(result.status, RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.REPLACEMENT_DRIVER_ON_LEAVE);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
});

// ----------------------------------------------------
// Group 11: Explicit Historical Schedule Driver Preservation
// ----------------------------------------------------
runTest("11.1 Explicit historical schedule driver is preserved per backward-compatibility rules", () => {
  const historicalSchedule = {
    start_time: "08:30 AM",
    bus_id: mockBus._id,
    busNumber: mockBus.busNumber,
    driver_id: "660000000000000000000999",
    driverName: "Historical Senior Driver Mike",
    driverPhone: "9998887776",
  };

  const result = resolveEffectiveDepartureDriver({
    schedule: historicalSchedule,
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.EXPLICIT_SCHEDULE_DRIVER);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.HISTORICAL_EXPLICIT_PRESERVED);
  assert.strictEqual(result.driverId, "660000000000000000000999");
  assert.strictEqual(result.driverName, "Historical Senior Driver Mike");
  assert.strictEqual(result.tripStartEligibility.canStartTrip, true);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(result.passengerView.driverName, "Historical Senior Driver Mike");
});

runTest("11.2 Generic placeholder driverName ('Not Assigned') falls through to shift roster", () => {
  const scheduleWithPlaceholder = {
    start_time: "08:30 AM",
    bus_id: mockBus._id,
    busNumber: mockBus.busNumber,
    driver_id: null,
    driverName: "Not Assigned",
  };

  const result = resolveEffectiveDepartureDriver({
    schedule: scheduleWithPlaceholder,
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.ASSIGNED_REGULAR_DRIVER);
  assert.strictEqual(result.driverId, "660000000000000000000201");
  assert.strictEqual(result.driverName, "Morning Driver John");
});

// ----------------------------------------------------
// Group 12: Missing Bus and Unassigned Shift Roster
// ----------------------------------------------------
runTest("12.1 Schedule without assigned bus returns NO_ASSIGNED_DRIVER and ASSIGNMENT_PENDING", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: null },
    bus: null,
    route: mockRoute,
    serviceDate: "2026-10-19",
  });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.status, RESOLVER_STATUS.NO_ASSIGNED_DRIVER);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.UNASSIGNED_BUS);
  assert.strictEqual(result.driverId, null);
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
  assert.strictEqual(result.passengerView.driverName, "Not Assigned");
});

// ----------------------------------------------------
// Group 13: Strict Isolation: Shift Roster Never Falls Back to Root Bus Driver
// ----------------------------------------------------
runTest("13.1 Bus with unassigned shift roster driver NEVER falls back to legacy Bus.driverId", () => {
  const busWithUnassignedMorning = {
    _id: "660000000000000000000102",
    busNumber: "KL-07-MS-2002",
    busName: "Express 2002",
    driverId: "660000000000000000000999", // Legacy root driver MUST NOT be used!
    driverName: "Legacy Root Driver",
    shifts: {
      morning: { driverId: null, driverName: "Not Assigned" }, // Empty roster
      evening: { driverId: null, driverName: "Not Assigned" },
      night: { driverId: null, driverName: "Not Assigned" },
    },
  };

  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: busWithUnassignedMorning._id },
    bus: busWithUnassignedMorning,
    route: mockRoute,
    serviceDate: "2026-10-19",
  });

  // Must NOT match the legacy root driver!
  assert.strictEqual(result.status, RESOLVER_STATUS.NO_ASSIGNED_DRIVER);
  assert.strictEqual(result.substatus, RESOLVER_SUBSTATUS.UNASSIGNED_SHIFT_ROSTER);
  assert.strictEqual(result.driverId, null);
  assert.strictEqual(result.driverName, "Not Assigned");
  assert.strictEqual(result.tripStartEligibility.canStartTrip, false);
  assert.strictEqual(result.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
});

// ----------------------------------------------------
// Group 14: Passenger-Facing View Sanitization & Privacy Guarantee
// ----------------------------------------------------
runTest("14.1 Passenger view completely strips phone, email, and database user IDs", () => {
  const result = resolveEffectiveDepartureDriver({
    schedule: { start_time: "08:30 AM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: mockRoute,
    serviceDate: "2026-10-19",
  });

  const pv = result.passengerView;
  assert.ok(pv);
  assert.strictEqual(pv.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(pv.busNumber, "KL-07-MS-1008");
  assert.strictEqual(pv.driverName, "Morning Driver John");
  assert.strictEqual(pv.departureTime, "08:30 AM");
  assert.strictEqual(pv.serviceDate, "2026-10-19");
  assert.strictEqual(pv.shift, "Morning");

  // STRICT PRIVACY GUARANTEE: Sensitive contact info must NOT exist on passengerView
  assert.strictEqual(pv.driverPhone, undefined);
  assert.strictEqual(pv.driverEmail, undefined);
  assert.strictEqual(pv.driverLicense, undefined);
  assert.strictEqual(pv.driverId, undefined);
  assert.strictEqual(pv._id, undefined);
});

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log("=================================================");
console.log(`STAGE D2 TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
console.log("=================================================");

if (passed !== total) {
  process.exit(1);
}
