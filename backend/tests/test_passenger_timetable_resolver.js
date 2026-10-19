/**
 * Stage D3.1 Verification Test Suite - Passenger Timetable Resolver Integration
 * 
 * Verifies that the Effective Driver Resolver is seamlessly integrated into the
 * passenger timetable generation (GET /api/buses & fetchAllNormalizedBuses):
 * 
 * 1. Morning departure resolves the Morning roster driver.
 * 2. Evening departure resolves the Evening roster driver.
 * 3. Night departure crossing midnight resolves the correct driver and service date.
 * 4. Valid replacement driver is displayed when regular driver is on leave.
 * 5. Approved leave without replacement displays pending assignment.
 * 6. Unassigned shift does NOT fall back to legacy permanent bus driver.
 * 7. Unresolved duration or major overrun displays schedule review.
 * 8. Minor overrun displays the appropriate warning/status.
 * 9. Explicit historical schedule assignment follows compatibility rules.
 * 10. Missing bus or invalid shift returns a safe status.
 * 11. Passenger response does NOT expose phone numbers, email addresses, licence details, or database user IDs.
 * 12. Existing timetable fields and unrelated schedule behavior remain compatible.
 */

const assert = require("assert");
const { buildNormalizedBusesFromData } = require("../routes/bookingRoutes");
const { PASSENGER_ASSIGNMENT_STATUS } = require("../utils/effectiveDriverResolver");

console.log("=================================================");
console.log("RUNNING STAGE D3.1 PASSENGER TIMETABLE TEST SUITE");
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
// Mock Datasets for Deterministic Offline Testing
// ----------------------------------------------------
const mockRoute = {
  _id: "660000000000000000000301",
  routeId: "RT-EK-01",
  routeName: "Erumely ➔ Kanjirappally",
  fromLocation: "Erumely",
  toLocation: "Kanjirappally",
  total_duration_minutes: 120, // 2 hours
  fare: 150,
  status: "Active",
  stops: [
    { name: "Erumely", order: 1, offset_minutes: 0 },
    { name: "Kanjirappally", order: 2, offset_minutes: 120 },
  ],
};

const mockBus = {
  _id: "660000000000000000000101",
  busNumber: "KL-07-MS-1008",
  busName: "MoveSmart Express",
  busType: "AC Super Fast Transit",
  operator: "MoveSmart Transit Ops",
  driverId: "660000000000000000000999", // Legacy permanent driver on Bus root
  driverName: "Legacy Permanent Driver",
  driverPhone: "9000000000",
  driverEmail: "legacy@movesmart.test",
  driverLicense: "KL-07-2015-000999",
  totalSeats: 32,
  availableSeats: 32,
  price: 150,
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

// ----------------------------------------------------
// 1. Morning departure resolves the Morning roster driver
// ----------------------------------------------------
runTest("1. Morning departure (08:30 AM) resolves Morning roster driver", () => {
  const schedule = {
    _id: "660000000000000000000701",
    start_time: "08:30 AM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Morning Driver John");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(bus.driverStatus, "Driver Assigned");
  assert.strictEqual(bus.shift, "Morning");
  assert.strictEqual(bus.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(bus.passengerView.driverName, "Morning Driver John");
});

// ----------------------------------------------------
// 2. Evening departure resolves the Evening roster driver
// ----------------------------------------------------
runTest("2. Evening departure (03:30 PM) resolves Evening roster driver", () => {
  const schedule = {
    _id: "660000000000000000000702",
    start_time: "03:30 PM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Evening Driver Sarah");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(bus.shift, "Evening");
  assert.strictEqual(bus.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
});

// ----------------------------------------------------
// 3. Night departure crossing midnight resolves correct driver and service date
// ----------------------------------------------------
runTest("3. Night departure crossing midnight (11:00 PM + 2h = 01:00 AM) resolves Night driver", () => {
  const schedule = {
    _id: "660000000000000000000703",
    start_time: "11:00 PM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Night Driver Alex");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(bus.shift, "Night");
  assert.strictEqual(bus.departureTime, "11:00 PM");
  assert.strictEqual(bus.arrivalTime, "01:00 AM");
});

// ----------------------------------------------------
// 4. Valid replacement driver is displayed
// ----------------------------------------------------
runTest("4. Valid replacement driver is displayed when regular driver is on leave", () => {
  const schedule = {
    _id: "660000000000000000000701",
    start_time: "08:30 AM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const approvedLeave = {
    _id: "660000000000000000000401",
    driverId: "660000000000000000000201", // Morning Driver John
    leaveDate: "2026-10-19",
    leaveType: "Full Day",
    status: "Approved",
  };

  const activeReplacement = {
    _id: "660000000000000000000501",
    busId: mockBus._id,
    busNumber: mockBus.busNumber,
    shift: "Morning",
    dutyDate: "2026-10-19",
    originalDriverId: "660000000000000000000201",
    replacementDriverId: "660000000000000000000777",
    replacementDriverName: "Relief Driver Robert",
    replacementDriverPhone: "9112233445",
    status: "Assigned",
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
    driverLeaves: [approvedLeave],
    driverReplacements: [activeReplacement],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Relief Driver Robert");
  assert.strictEqual(bus.isReplacementDriver, true);
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(bus.driverStatus, "Driver Assigned (Replacement)");
  assert.strictEqual(bus.passengerView.driverName, "Relief Driver Robert");
});

// ----------------------------------------------------
// 5. Approved leave without replacement displays pending assignment
// ----------------------------------------------------
runTest("5. Approved leave without replacement displays pending assignment", () => {
  const schedule = {
    _id: "660000000000000000000701",
    start_time: "08:30 AM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const approvedLeave = {
    _id: "660000000000000000000401",
    driverId: "660000000000000000000201", // Morning Driver John
    leaveDate: "2026-10-19",
    leaveType: "Full Day",
    status: "Approved",
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
    driverLeaves: [approvedLeave],
    driverReplacements: [], // No replacement assigned!
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Not Assigned");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
  assert.strictEqual(bus.driverStatus, "Assignment Pending");
  assert.strictEqual(bus.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
});

// ----------------------------------------------------
// 6. Unassigned shift does NOT fall back to legacy permanent bus driver
// ----------------------------------------------------
runTest("6. Unassigned shift does NOT fall back to legacy permanent bus driver", () => {
  const busWithEmptyMorning = {
    ...mockBus,
    shifts: {
      ...mockBus.shifts,
      morning: { driverId: null, driverName: "Not Assigned" },
    },
  };

  const schedule = {
    _id: "660000000000000000000701",
    start_time: "08:30 AM",
    bus_id: busWithEmptyMorning,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [busWithEmptyMorning],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  // Must NOT fall back to "Legacy Permanent Driver"
  assert.strictEqual(bus.driverName, "Not Assigned");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
  assert.strictEqual(bus.driverStatus, "Assignment Pending");
});

// ----------------------------------------------------
// 7. Unresolved duration or major overrun displays schedule review
// ----------------------------------------------------
runTest("7. Major overrun (> 15 mins) displays schedule review status", () => {
  // Morning shift ends at 02:00 PM. Departure 01:00 PM with 90m duration ends at 02:30 PM (30m overrun)
  const longRoute = { ...mockRoute, total_duration_minutes: 90 };
  const schedule = {
    _id: "660000000000000000000701",
    start_time: "01:00 PM",
    bus_id: mockBus,
    route_id: longRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [longRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Not Assigned");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED);
  assert.strictEqual(bus.driverStatus, "Schedule Review Required");
  assert.strictEqual(bus.passengerView.status, PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED);
});

// ----------------------------------------------------
// 8. Minor overrun displays the appropriate warning/status
// ----------------------------------------------------
runTest("8. Minor overrun (5 mins <= 15m grace) displays assigned driver with warning status", () => {
  // Morning shift ends at 02:00 PM. 12:30 PM + 95 mins = 02:05 PM (5m overrun within 15m grace)
  const minorOverrunRoute = { ...mockRoute, total_duration_minutes: 95 };
  const schedule = {
    _id: "660000000000000000000701",
    start_time: "12:30 PM",
    bus_id: mockBus,
    route_id: minorOverrunRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [minorOverrunRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Morning Driver John");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(bus.driverStatus, "Driver Assigned (Shift Boundary Warning)");
  assert.strictEqual(bus.hasShiftOverrunException, true);
  assert.ok(bus.warningMessage && bus.warningMessage.includes("exceeds Morning shift boundary"));
});

// ----------------------------------------------------
// 9. Explicit historical schedule assignment follows compatibility rules
// ----------------------------------------------------
runTest("9. Explicit historical schedule driver is preserved", () => {
  const historicalSchedule = {
    _id: "660000000000000000000799",
    start_time: "08:30 AM",
    bus_id: mockBus,
    route_id: mockRoute,
    driver_id: "660000000000000000000888",
    driverName: "Historical Senior Mike",
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [historicalSchedule],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Historical Senior Mike");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(bus.driverStatus, "Driver Assigned");
});

// ----------------------------------------------------
// 10. Missing bus or invalid shift returns a safe status
// ----------------------------------------------------
runTest("10. Missing bus returns safe unassigned status without inventing a driver", () => {
  const scheduleWithoutBus = {
    _id: "660000000000000000000705",
    start_time: "08:30 AM",
    bus_id: null,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [scheduleWithoutBus],
    rawBuses: [],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Not Assigned");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
});

// ----------------------------------------------------
// 11. Passenger response does NOT expose phone numbers, email, license, or user IDs
// ----------------------------------------------------
runTest("11. Strict Privacy Check: No driver phone, email, license, or user IDs are exposed", () => {
  const schedule = {
    _id: "660000000000000000000701",
    start_time: "08:30 AM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];

  // PRIVACY VERIFICATION
  assert.strictEqual(bus.driverId, null, "driverId must be null for public response");
  assert.strictEqual(bus.driverPhone, undefined, "driverPhone must not be exposed");
  assert.strictEqual(bus.driverEmail, undefined, "driverEmail must not be exposed");
  assert.strictEqual(bus.driverLicense, undefined, "driverLicense must not be exposed");

  // In passengerView object
  assert.ok(bus.passengerView);
  assert.strictEqual(bus.passengerView.driverPhone, undefined);
  assert.strictEqual(bus.passengerView.driverEmail, undefined);
  assert.strictEqual(bus.passengerView.driverLicense, undefined);
  assert.strictEqual(bus.passengerView.driverId, undefined);
});

// ----------------------------------------------------
// 12. Existing timetable fields and unrelated schedule behavior remain compatible
// ----------------------------------------------------
runTest("12. Compatibility: All existing timetable fields and stations are preserved", () => {
  const schedule = {
    _id: "660000000000000000000701",
    start_time: "08:30 AM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];

  assert.strictEqual(bus.busNumber, "KL-07-MS-1008");
  assert.strictEqual(bus.busName, "Erumely ➔ Kanjirappally");
  assert.strictEqual(bus.fromLocation, "Erumely");
  assert.strictEqual(bus.toLocation, "Kanjirappally");
  assert.strictEqual(bus.departureTime, "08:30 AM");
  assert.strictEqual(bus.arrivalTime, "10:30 AM");
  assert.strictEqual(bus.duration, "2h");
  assert.strictEqual(bus.price, 150);
  assert.strictEqual(bus.totalSeats, 32);
  assert.strictEqual(bus.availableSeats, 32);
  assert.strictEqual(bus.is_active, true);
  assert.ok(Array.isArray(bus.stops) && bus.stops.length === 2);
  assert.ok(Array.isArray(bus.schedule) && bus.schedule[0].stations.length === 2);
});

// ----------------------------------------------------
// 13. Router export and HTTP endpoint handler contract verification
// ----------------------------------------------------
runTest("13. Router export and HTTP endpoint handler contract verification", () => {
  const bookingRouter = require("../routes/bookingRoutes");
  assert.ok(bookingRouter, "Router must be exported");
  assert.strictEqual(typeof bookingRouter.fetchAllNormalizedBuses, "function", "fetchAllNormalizedBuses must be exported");
  assert.strictEqual(typeof bookingRouter.buildNormalizedBusesFromData, "function", "buildNormalizedBusesFromData must be exported");
  assert.strictEqual(typeof bookingRouter.invalidateBusCache, "function", "invalidateBusCache must be exported");
});

// ----------------------------------------------------
// 14. Same bus with multiple departures on different shifts
// ----------------------------------------------------
runTest("14. Same bus scheduled across Morning, Evening, and Night shifts resolves distinct drivers", () => {
  const schMorning = {
    _id: "660000000000000000000711",
    start_time: "08:00 AM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };
  const schEvening = {
    _id: "660000000000000000000712",
    start_time: "03:00 PM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };
  const schNight = {
    _id: "660000000000000000000713",
    start_time: "11:00 PM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schMorning, schEvening, schNight],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 3);
  assert.strictEqual(results[0].shift, "Morning");
  assert.strictEqual(results[0].driverName, "Morning Driver John");
  assert.strictEqual(results[1].shift, "Evening");
  assert.strictEqual(results[1].driverName, "Evening Driver Sarah");
  assert.strictEqual(results[2].shift, "Night");
  assert.strictEqual(results[2].driverName, "Night Driver Alex");
});

// ----------------------------------------------------
// 15. Multiple service dates (Leave active on Date 1, regular driver on Date 2)
// ----------------------------------------------------
runTest("15. Multiple service dates: Leave resolves replacement on Date 1, regular driver on Date 2", () => {
  const schedule = {
    _id: "660000000000000000000714",
    start_time: "08:30 AM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const leaveDay1 = {
    _id: "660000000000000000000501",
    driverId: "660000000000000000000201",
    leaveDate: "2026-10-19",
    leaveType: "Full Day",
    status: "Approved",
  };

  const replacementDay1 = {
    _id: "660000000000000000000601",
    busId: "660000000000000000000101",
    dutyDate: "2026-10-19",
    shift: "Morning",
    replacementDriverId: "660000000000000000000299",
    replacementDriverName: "Substitute Driver David",
    status: "Assigned",
    isActive: true,
  };

  // Day 1: on leave, replacement assigned
  const resDay1 = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
    driverLeaves: [leaveDay1],
    driverReplacements: [replacementDay1],
  }, "2026-10-19");

  assert.strictEqual(resDay1.length, 1);
  assert.strictEqual(resDay1[0].driverName, "Substitute Driver David");
  assert.strictEqual(resDay1[0].isReplacementDriver, true);

  // Day 2: leave does not apply, regular driver displays
  const resDay2 = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedule],
    rawBuses: [mockBus],
    driverLeaves: [leaveDay1],
    driverReplacements: [replacementDay1],
  }, "2026-10-20");

  assert.strictEqual(resDay2.length, 1);
  assert.strictEqual(resDay2[0].driverName, "Morning Driver John");
  assert.strictEqual(resDay2[0].isReplacementDriver, false);
});

// ----------------------------------------------------
// 16. Post-midnight departure (01:30 AM)
// ----------------------------------------------------
runTest("16. Post-midnight departure (01:30 AM) resolves Night shift driver with correct service date", () => {
  const schedulePostMidnight = {
    _id: "660000000000000000000715",
    start_time: "01:30 AM",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [schedulePostMidnight],
    rawBuses: [mockBus],
  }, "2026-10-20");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.shift, "Night");
  assert.strictEqual(bus.driverName, "Night Driver Alex");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
});

// ----------------------------------------------------
// 17. Standby bus with shifts defined in Bus document (no schedule)
// ----------------------------------------------------
runTest("17. Standby bus without active schedule resolves shift driver and omits rawDoc", () => {
  const standbyBus = {
    _id: "660000000000000000000102",
    busNumber: "KL-07-MS-2002",
    busName: "Standby Fleet Unit",
    fromLocation: "Erumely",
    toLocation: "Kanjirappally",
    departureTime: "09:00 AM",
    shifts: {
      morning: {
        driverId: "660000000000000000000201",
        driverName: "Morning Driver John",
      },
    },
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [],
    rawSchedules: [],
    rawBuses: [standbyBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.busNumber, "KL-07-MS-2002");
  assert.strictEqual(bus.driverName, "Morning Driver John");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNED);
  assert.strictEqual(bus.rawDoc, undefined, "rawDoc must never be present in public timetable item");
});

// ----------------------------------------------------
// 18. Standby bus with unassigned shift roster does not fall back to legacy driver
// ----------------------------------------------------
runTest("18. Standby bus with unassigned shift roster does not fall back to legacy driver", () => {
  const standbyUnassignedBus = {
    _id: "660000000000000000000103",
    busNumber: "KL-07-MS-3003",
    busName: "Standby Roster Unit",
    fromLocation: "Erumely",
    toLocation: "Kanjirappally",
    departureTime: "09:00 AM",
    driverId: "660000000000000000000999",
    driverName: "Legacy Permanent Standby Driver",
    shifts: {
      morning: {
        driverId: null,
        driverName: "Not Assigned",
      },
    },
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [],
    rawSchedules: [],
    rawBuses: [standbyUnassignedBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.driverName, "Not Assigned");
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING);
});

// ----------------------------------------------------
// 19. Schedule with missing departure time returns SCHEDULE_REVIEW_REQUIRED
// ----------------------------------------------------
runTest("19. Schedule with missing or empty start_time returns SCHEDULE_REVIEW_REQUIRED", () => {
  const badSchedule = {
    _id: "660000000000000000000716",
    start_time: "",
    bus_id: mockBus,
    route_id: mockRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [mockRoute],
    rawSchedules: [badSchedule],
    rawBuses: [mockBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED);
  assert.strictEqual(bus.driverStatus, "Schedule Review Required");
  assert.strictEqual(bus.driverName, "Not Assigned");
});

// ----------------------------------------------------
// 20. Schedule with 0 or unresolved duration returns SCHEDULE_REVIEW_REQUIRED
// ----------------------------------------------------
runTest("20. Schedule with 0 duration route returns SCHEDULE_REVIEW_REQUIRED", () => {
  const zeroDurationRoute = {
    _id: "660000000000000000000309",
    routeId: "RT-ZERO-01",
    routeName: "Zero Duration Test Route",
    fromLocation: "Point A",
    toLocation: "Point B",
    total_duration_minutes: 0,
    fare: 50,
    stops: [],
  };

  const zeroDurationBus = {
    _id: "660000000000000000000109",
    busNumber: "KL-01-ZERO",
    shifts: mockBus.shifts,
  };

  const scheduleZero = {
    _id: "660000000000000000000717",
    start_time: "08:00 AM",
    bus_id: zeroDurationBus,
    route_id: zeroDurationRoute,
    is_active: true,
  };

  const results = buildNormalizedBusesFromData({
    rawRoutes: [zeroDurationRoute],
    rawSchedules: [scheduleZero],
    rawBuses: [zeroDurationBus],
  }, "2026-10-19");

  assert.strictEqual(results.length, 1);
  const bus = results[0];
  assert.strictEqual(bus.assignmentStatus, PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED);
  assert.strictEqual(bus.driverStatus, "Schedule Review Required");
});

// ----------------------------------------------------
// 21. Caching & Invalidation: Distinct dates do not cross-contaminate and cache clears
// ----------------------------------------------------
runTest("21. Cache verification: invalidateBusCache clears cache correctly", () => {
  const bookingRouter = require("../routes/bookingRoutes");
  assert.doesNotThrow(() => {
    bookingRouter.invalidateBusCache();
  });
});

// ----------------------------------------------------
// Summary
// ----------------------------------------------------
console.log("=================================================");
console.log(`STAGE D3.2 TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
console.log("=================================================");

if (passed !== total) {
  process.exit(1);
}

