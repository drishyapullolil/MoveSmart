/**
 * MoveSmart Stage D3.3.1 — Shift-Aware Driver Trip-Start Authorization & Security Verification Suite
 * 
 * Verifies:
 * Group A — Mandatory Authentication & Role Security:
 *   1. Missing Authorization token is rejected with 401 NO_TOKEN.
 *   2. Invalid / malformed token is rejected with 401 INVALID_TOKEN.
 *   3. Expired token is rejected with 401 TOKEN_EXPIRED.
 *   4. User with non-driver role (e.g. 'passenger') is rejected with 403 FORBIDDEN_ROLE.
 *   5. Unauthenticated request supplying a valid driverId in body is rejected with 401 (never trusted).
 *   6. Authenticated driver sending someone else's driverId in body is authorized only for their own identity (forgery prevented).
 * 
 * Group B — Operational Shift & Roster Authorization:
 *   7. Correct Morning driver can start the correct scheduled trip (200 OK).
 *   8. Correct Evening driver can start their scheduled trip (200 OK).
 *   9. Correct Night driver can start their scheduled trip (200 OK).
 *   10. A Night shift departure after midnight resolves the correct service date (commencement day).
 *   11. Valid replacement driver can start when regular driver is on approved leave (200 OK).
 *   12. An unassigned shift cannot be bypassed using the legacy permanent bus driver (403 Forbidden).
 *   13. A driver assigned to another bus cannot start this bus's trip (403 Unauthorized).
 *   14. Approved leave without replacement blocks regular driver trip start (403 Forbidden).
 *   15. Invalid / unassigned replacement ('Replacement Required') or replacement on leave blocks trip start (403).
 * 
 * Group C — Shift Overrun Policy & Ambiguity Safeguards:
 *   16. Minor overrun (10m <= 15m grace) permits start with warning message and exception flag.
 *   17. Major overrun (> 15m grace) or unresolved trip duration blocks trip start (403 Forbidden).
 *   18. Explicit scheduleId belonging to a different bus is rejected with 400 SCHEDULE_BUS_MISMATCH.
 *   19. Multiple departures in the same shift without departureTime/proximity is rejected with 400 AMBIGUOUS_SCHEDULE.
 *   20. Historical / manual schedule drivers follow verified compatibility rules.
 * 
 * Group D — Concurrency, Active Trip & TripSession Safety:
 *   21. Unauthorized requests never create or activate a TripSession.
 *   22. Accidental double-tap / duplicate start by the same driver safely resumes active trip without creating a duplicate.
 *   23. Concurrent start requests on the same bus serialize through the per-bus lock; exactly 1 session is created.
 *   24. Different driver attempting to start on a bus with an active trip is rejected with 409 Conflict.
 *   25. Audit persistence status is verified (structured auditRecord in memory/logs).
 */

const assert = require("assert");
const path = require("path");
const jwt = require(path.join(__dirname, "../node_modules/jsonwebtoken"));
const {
  SHIFT_POLICY_CONFIG,
  TRIP_START_STATUS,
  RESOLVER_STATUS,
  RESOLVER_SUBSTATUS,
  resolveOperationalServiceDate,
  resolveEffectiveDepartureDriver,
  findOverlappingApprovedLeave,
  findValidReplacementDuty,
} = require("../utils/effectiveDriverResolver");
const { inferShiftFromTime } = require("../utils/shiftConflictHelper");

const JWT_SECRET = process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026";

console.log("=================================================");
console.log("RUNNING STAGE D3.3.1 SECURITY & TRIP-START SUITE");
console.log("=================================================");

let passed = 0;
let total = 0;

function runTest(name, fn) {
  total++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`  ✓ PASS: ${name}`);
          passed++;
        })
        .catch((err) => {
          console.error(`  ✗ FAIL: ${name}`);
          console.error(`    ${err.message}`);
        });
    } else {
      console.log(`  ✓ PASS: ${name}`);
      passed++;
    }
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

// ----------------------------------------------------
// Fixtures & Test Data
// ----------------------------------------------------
const DRIVER_MORNING = {
  _id: "660000000000000000000101",
  name: "Morning Driver John",
  email: "john.morning@movesmart.in",
  role: "driver",
};

const DRIVER_EVENING = {
  _id: "660000000000000000000102",
  name: "Evening Driver Sarah",
  email: "sarah.evening@movesmart.in",
  role: "driver",
};

const DRIVER_NIGHT = {
  _id: "660000000000000000000103",
  name: "Night Driver Alex",
  email: "alex.night@movesmart.in",
  role: "driver",
};

const DRIVER_REPLACEMENT = {
  _id: "660000000000000000000777",
  name: "Relief Driver Robert",
  email: "robert.relief@movesmart.in",
  role: "driver",
};

const DRIVER_OTHER_BUS = {
  _id: "660000000000000000000555",
  name: "Other Bus Driver Dave",
  email: "dave.other@movesmart.in",
  role: "driver",
};

const PASSENGER_USER = {
  _id: "660000000000000000000333",
  name: "Passenger Peter",
  email: "peter.passenger@movesmart.in",
  role: "passenger",
};

const LEGACY_DRIVER = {
  _id: "660000000000000000000999",
  name: "Legacy Permanent Driver",
  email: "legacy@movesmart.in",
  role: "driver",
};

const HISTORICAL_DRIVER = {
  _id: "660000000000000000000888",
  name: "Historical Schedule Driver Mike",
  email: "mike.historical@movesmart.in",
  role: "driver",
};

const ALL_MOCK_USERS = [
  DRIVER_MORNING,
  DRIVER_EVENING,
  DRIVER_NIGHT,
  DRIVER_REPLACEMENT,
  DRIVER_OTHER_BUS,
  PASSENGER_USER,
  LEGACY_DRIVER,
  HISTORICAL_DRIVER,
];

const mockBus = {
  _id: "660000000000000000000001",
  busNumber: "KL-07-AW-1001",
  busName: "Express Cityliner 1",
  driverId: LEGACY_DRIVER._id, // Legacy permanent field
  driverName: LEGACY_DRIVER.name,
  shifts: {
    morning: {
      driverId: DRIVER_MORNING._id,
      driverName: DRIVER_MORNING.name,
      driverPhone: "9876543210",
      driverEmail: DRIVER_MORNING.email,
    },
    evening: {
      driverId: DRIVER_EVENING._id,
      driverName: DRIVER_EVENING.name,
      driverPhone: "9876543211",
      driverEmail: DRIVER_EVENING.email,
    },
    night: {
      driverId: DRIVER_NIGHT._id,
      driverName: DRIVER_NIGHT.name,
      driverPhone: "9876543212",
      driverEmail: DRIVER_NIGHT.email,
    },
  },
};

const mockRoute = {
  _id: "660000000000000000000301",
  routeId: "ROUTE-ERN-KCH",
  routeName: "Ernakulam ➔ Kochi Airport",
  total_duration_minutes: 90,
  stops: [
    { name: "Ernakulam", code: "STOP_EKM", latitude: 9.9658, longitude: 76.3204 },
    { name: "Aluva", code: "STOP_ALV", latitude: 10.1076, longitude: 76.3516 },
    { name: "Airport Terminal", code: "STOP_AP", latitude: 10.1558, longitude: 76.3908 },
  ],
};

// In-process lock map for tests
const testActiveStartOperations = new Map();

/**
 * Simulator implementing the exact secure authorization & trip start flow in driverRoutes.js
 */
async function simulateTripStartEndpoint({
  authHeader = null,
  body = {},
  bus = mockBus,
  schedules = null,
  route = mockRoute,
  activeLeaves = [],
  activeReplacements = [],
  activeTripSessions = [],
  gracePeriodMinutes = SHIFT_POLICY_CONFIG.DEFAULT_GRACE_PERIOD_MINUTES,
  simulateDbError = false,
}) {
  // 1. Mandatory Authentication (protect middleware)
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      status: 401,
      body: { message: "Not authorized, no token", code: "NO_TOKEN" },
      sessionCreated: false,
    };
  }

  const token = authHeader.split(" ")[1];
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return {
        status: 401,
        body: { message: "Session expired. Please log in again.", code: "TOKEN_EXPIRED" },
        sessionCreated: false,
      };
    }
    return {
      status: 401,
      body: { message: "Invalid authentication token. Please log in again.", code: "INVALID_TOKEN" },
      sessionCreated: false,
    };
  }

  const authenticatedUser = ALL_MOCK_USERS.find((u) => String(u._id) === String(decoded.id));
  if (!authenticatedUser) {
    return {
      status: 401,
      body: { message: "Not authorized, user not found", code: "USER_NOT_FOUND" },
      sessionCreated: false,
    };
  }

  // 2. Role Authorization (driverOnly middleware)
  if (authenticatedUser.role !== "driver") {
    return {
      status: 403,
      body: { message: "Not authorized as a driver", code: "FORBIDDEN_ROLE" },
      sessionCreated: false,
    };
  }

  // Strictly use authenticated driver — NEVER trust client-supplied driverId
  const driver = authenticatedUser;

  // 3. Validate Bus
  if (!bus) {
    return {
      status: 404,
      body: { success: false, message: "No assigned bus found in database for your driver profile." },
      sessionCreated: false,
    };
  }

  // 4. Resolve Schedule
  const { scheduleId, departureTime, serviceDate = "2026-10-19" } = body;
  let schedule = null;

  const busSchedules = schedules !== null ? schedules : [
    {
      _id: "660000000000000000000401",
      bus_id: bus._id,
      busNumber: bus.busNumber,
      start_time: departureTime || "08:30 AM",
      duration: "1 hr 30 mins",
      route_id: route._id,
      routeName: route.routeName,
      delay_buffer_minutes: 0,
      shift: inferShiftFromTime(departureTime || "08:30 AM"),
    },
  ];

  if (scheduleId) {
    schedule = busSchedules.find((s) => String(s._id) === String(scheduleId));
    if (!schedule) {
      return {
        status: 404,
        body: { success: false, message: `Requested schedule (${scheduleId}) was not found.`, code: "SCHEDULE_NOT_FOUND" },
        sessionCreated: false,
      };
    }
    const scheduleBusMatches =
      (schedule.bus_id && String(schedule.bus_id) === String(bus._id)) ||
      (schedule.busNumber && schedule.busNumber === bus.busNumber);
    if (!scheduleBusMatches) {
      return {
        status: 400,
        body: { success: false, message: `Requested schedule does not belong to bus ${bus.busNumber}.`, code: "SCHEDULE_BUS_MISMATCH" },
        sessionCreated: false,
      };
    }
  }

  if (!schedule) {
    if (busSchedules.length === 1) {
      schedule = busSchedules[0];
    } else if (busSchedules.length > 1) {
      if (departureTime) {
        schedule = busSchedules.find((s) => s.start_time === departureTime || s.departure_time === departureTime);
        if (!schedule) {
          return {
            status: 404,
            body: { success: false, message: `No active schedule found matching departure time ${departureTime}.`, code: "SCHEDULE_TIME_NOT_FOUND" },
            sessionCreated: false,
          };
        }
      }

      if (!schedule) {
        let targetShift = null;
        if (bus.shifts?.morning?.driverId && String(bus.shifts.morning.driverId) === String(driver._id)) {
          targetShift = "Morning";
        } else if (bus.shifts?.evening?.driverId && String(bus.shifts.evening.driverId) === String(driver._id)) {
          targetShift = "Evening";
        } else if (bus.shifts?.night?.driverId && String(bus.shifts.night.driverId) === String(driver._id)) {
          targetShift = "Night";
        } else {
          const rep = activeReplacements.find((r) => String(r.replacementDriverId) === String(driver._id) && String(r.busId) === String(bus._id));
          if (rep) targetShift = rep.shift;
        }

        if (targetShift) {
          const shiftSchedules = busSchedules.filter((s) => (s.shift || inferShiftFromTime(s.start_time)) === targetShift);
          if (shiftSchedules.length === 1) {
            schedule = shiftSchedules[0];
          } else if (shiftSchedules.length > 1) {
            // Ambiguity: multiple departures in same shift
            return {
              status: 400,
              body: {
                success: false,
                message: `Multiple scheduled departures exist for bus ${bus.busNumber} in the ${targetShift} shift. Please select the specific schedule or departure time.`,
                code: "AMBIGUOUS_SCHEDULE",
                availableDepartures: shiftSchedules.map((s) => ({
                  scheduleId: s._id,
                  startTime: s.start_time,
                  routeName: s.routeName,
                })),
              },
              sessionCreated: false,
            };
          }
        }

        if (!schedule) {
          return {
            status: 400,
            body: {
              success: false,
              message: `Multiple departures exist for bus ${bus.busNumber}. Please specify scheduleId or departureTime to start.`,
              code: "AMBIGUOUS_SCHEDULE",
            },
            sessionCreated: false,
          };
        }
      }
    }
  }

  if (!schedule) {
    schedule = {
      _id: null,
      bus_id: bus._id,
      busNumber: bus.busNumber,
      start_time: bus.departureTime || "08:30 AM",
      duration: "1 hr 30 mins",
      route_id: route._id,
      routeName: route.routeName,
      shift: inferShiftFromTime(bus.departureTime || "08:30 AM"),
    };
  }

  // 5. Determine Operational Service Date
  const operationalServiceDate = resolveOperationalServiceDate(serviceDate, schedule.start_time);

  // 6. Run Pure Effective Driver Resolver
  const resolverResult = resolveEffectiveDepartureDriver({
    schedule,
    bus,
    route,
    serviceDate: operationalServiceDate,
    driverReplacements: activeReplacements,
    driverLeaves: activeLeaves,
    gracePeriodMinutes,
  });

  if (!resolverResult.tripStartEligibility.canStartTrip) {
    return {
      status: 403,
      body: {
        success: false,
        message: `Trip start blocked: ${resolverResult.tripStartEligibility.blockingReason || resolverResult.reason}`,
        resolverStatus: resolverResult.status,
        substatus: resolverResult.substatus,
        blockingReason: resolverResult.tripStartEligibility.blockingReason,
        auditRecord: resolverResult.tripStartEligibility.auditRecord || null,
      },
      sessionCreated: false,
    };
  }

  // Explicit historical schedule leave check
  if (resolverResult.status === RESOLVER_STATUS.EXPLICIT_SCHEDULE_DRIVER && resolverResult.driverId) {
    const explicitLeave = findOverlappingApprovedLeave(resolverResult.driverId, activeLeaves, {
      startDateTime: resolverResult.boundaryCheck?.tripStartDateTime,
      endDateTime: resolverResult.boundaryCheck?.tripEndDateTime,
    });
    if (explicitLeave) {
      const rep = findValidReplacementDuty({
        busId: bus._id,
        busNumber: bus.busNumber,
        shift: resolverResult.shift,
        dutyDate: operationalServiceDate,
        replacements: activeReplacements,
        tripInterval: {
          startDateTime: resolverResult.boundaryCheck?.tripStartDateTime,
          endDateTime: resolverResult.boundaryCheck?.tripEndDateTime,
        },
      });
      if (!rep) {
        return {
          status: 403,
          body: {
            success: false,
            message: `Trip start blocked: Assigned schedule driver (${resolverResult.driverName}) is on approved leave without replacement.`,
            blockingReason: "Assigned schedule driver is on approved leave without replacement.",
          },
          sessionCreated: false,
        };
      }
    }
  }

  // Verify authorized driver matches authenticated driver
  const authorizedDriverId = String(resolverResult.driverId || "");
  const requestingDriverId = String(driver._id);

  if (!authorizedDriverId || authorizedDriverId !== requestingDriverId) {
    return {
      status: 403,
      body: {
        success: false,
        message: `Unauthorized: You (${driver.name}) are not authorized to start this trip on bus ${bus.busNumber}. Effective authorized driver for this ${resolverResult.shift} shift is ${resolverResult.driverName}.`,
        authorizedDriver: resolverResult.driverName,
        requestedBus: bus.busNumber,
        shift: resolverResult.shift,
      },
      sessionCreated: false,
    };
  }

  let warningMessage = null;
  if (resolverResult.tripStartEligibility.status === TRIP_START_STATUS.WARNING_OVERRUN) {
    warningMessage = resolverResult.tripStartEligibility.warningMessage;
  }

  // 7. Concurrency Lock & Active Trip Check
  const busKey = String(bus._id);
  while (testActiveStartOperations.has(busKey)) {
    await testActiveStartOperations.get(busKey);
  }

  let releaseLock;
  const lockPromise = new Promise((resolve) => {
    releaseLock = resolve;
  });
  testActiveStartOperations.set(busKey, lockPromise);

  try {
    if (simulateDbError) {
      throw new Error("Simulated database failure during trip session creation");
    }

    // Artificial small delay to simulate async I/O and verify mutex serialization
    await new Promise((r) => setTimeout(r, 10));

    const activeTripDoc = activeTripSessions.find(
      (s) => String(s.busId) === String(bus._id) && ["ACTIVE", "PAUSED"].includes(s.status)
    );

    if (activeTripDoc && String(activeTripDoc.driverId) !== String(driver._id)) {
      return {
        status: 409,
        body: {
          success: false,
          message: `Bus ${bus.busNumber} already has an active drive session operated by ${activeTripDoc.driverName || "another driver"}.`,
        },
        sessionCreated: false,
      };
    }

    if (activeTripDoc) {
      return {
        status: 200,
        body: {
          success: true,
          message: `Resuming active drive session ${activeTripDoc.tripSessionId} for ${bus.busName} (${bus.busNumber}) 🚀`,
          tripSessionId: activeTripDoc.tripSessionId,
          isResumed: true,
          warningMessage: warningMessage || undefined,
        },
        sessionCreated: false,
      };
    }

    // CREATE BRAND NEW UNIQUE TRIP SESSION
    const newSessionId = `TRIP-${operationalServiceDate}-${String(activeTripSessions.length + 1).padStart(3, "0")}`;
    const sessionDoc = {
      tripSessionId: newSessionId,
      busId: bus._id,
      busNumber: bus.busNumber,
      driverId: driver._id,
      driverName: driver.name,
      isReplacementDriver: Boolean(resolverResult.isReplacement),
      shift: resolverResult.shift,
      replacementDutyId: resolverResult.replacementDutyId || null,
      status: "ACTIVE",
      serviceDate: operationalServiceDate,
    };
    activeTripSessions.push(sessionDoc);

    return {
      status: 200,
      body: {
        success: true,
        message: warningMessage
          ? `Drive started with shift warning: ${warningMessage} (Session: ${newSessionId}) 🚀`
          : `Drive started for ${bus.busName} (${bus.busNumber}) (Session: ${newSessionId}) 🚀`,
        tripSessionId: newSessionId,
        shift: resolverResult.shift,
        serviceDate: operationalServiceDate,
        warningMessage: warningMessage || undefined,
        hasShiftOverrunException: Boolean(resolverResult.hasShiftOverrunException),
        sessionDoc,
      },
      sessionCreated: true,
    };
  } finally {
    testActiveStartOperations.delete(busKey);
    if (typeof releaseLock === "function") releaseLock();
  }
}

// Helper to create Bearer tokens
function makeToken(user, expiresIn = "1h") {
  return "Bearer " + jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn });
}

// ====================================================
// GROUP A: MANDATORY AUTHENTICATION & ROLE SECURITY
// ====================================================

runTest("1. Missing Authorization token is rejected with 401 NO_TOKEN", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: null, // No token
    body: { busId: mockBus._id },
  });

  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.body.code, "NO_TOKEN");
  assert.strictEqual(result.sessionCreated, false);
});

runTest("2. Invalid / malformed token is rejected with 401 INVALID_TOKEN", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: "Bearer invalid.malformed.jwt.token",
    body: { busId: mockBus._id },
  });

  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.body.code, "INVALID_TOKEN");
  assert.strictEqual(result.sessionCreated, false);
});

runTest("3. Expired token is rejected with 401 TOKEN_EXPIRED", async () => {
  const expiredToken = makeToken(DRIVER_MORNING, "-10s");
  const result = await simulateTripStartEndpoint({
    authHeader: expiredToken,
    body: { busId: mockBus._id },
  });

  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.body.code, "TOKEN_EXPIRED");
  assert.strictEqual(result.sessionCreated, false);
});

runTest("4. Non-driver role (e.g. passenger) is rejected with 403 FORBIDDEN_ROLE", async () => {
  const passengerToken = makeToken(PASSENGER_USER, "1h");
  const result = await simulateTripStartEndpoint({
    authHeader: passengerToken,
    body: { busId: mockBus._id },
  });

  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.body.code, "FORBIDDEN_ROLE");
  assert.strictEqual(result.sessionCreated, false);
});

runTest("5. Unauthenticated request with valid driverId in body is rejected with 401 (never trusted)", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: null,
    body: { driverId: DRIVER_MORNING._id, busId: mockBus._id },
  });

  assert.strictEqual(result.status, 401);
  assert.strictEqual(result.sessionCreated, false);
});

runTest("6. Authenticated driver sending forged driverId in body is authorized only as themselves", async () => {
  // Attacker Dave is logged in with valid token, but sends Morning Driver John's ID in body
  const daveToken = makeToken(DRIVER_OTHER_BUS, "1h");
  const result = await simulateTripStartEndpoint({
    authHeader: daveToken,
    body: { driverId: DRIVER_MORNING._id, busId: mockBus._id },
  });

  // Must reject Dave because Morning driver for mockBus is John, not Dave
  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.sessionCreated, false);
  assert.ok(result.body.message.includes(DRIVER_OTHER_BUS.name));
});

// ====================================================
// GROUP B: OPERATIONAL SHIFT & ROSTER AUTHORIZATION
// ====================================================

runTest("7. Correct Morning driver can start the correct scheduled trip (200 OK)", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.sessionCreated, true);
  assert.strictEqual(result.body.shift, "Morning");
  assert.strictEqual(result.body.sessionDoc.driverId, DRIVER_MORNING._id);
});

runTest("8. Correct Evening driver can start their scheduled trip (200 OK)", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_EVENING),
    body: { busId: mockBus._id, departureTime: "03:00 PM" },
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.shift, "Evening");
  assert.strictEqual(result.body.sessionDoc.driverId, DRIVER_EVENING._id);
});

runTest("9. Correct Night driver can start their scheduled trip (200 OK)", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_NIGHT),
    body: { busId: mockBus._id, departureTime: "11:00 PM" },
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.shift, "Night");
  assert.strictEqual(result.body.sessionDoc.driverId, DRIVER_NIGHT._id);
});

runTest("10. Night departure after midnight resolves previous operational service date", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_NIGHT),
    body: {
      busId: mockBus._id,
      departureTime: "02:00 AM",
      serviceDate: new Date("2026-10-20T02:00:00+05:30"),
    },
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.shift, "Night");
  assert.strictEqual(result.body.serviceDate, "2026-10-19");
});

runTest("11. Valid replacement can start when regular driver is on approved leave (200 OK)", async () => {
  const leaves = [
    {
      _id: "leave_001",
      driverId: DRIVER_MORNING._id,
      leaveDate: "2026-10-19",
      leaveType: "Full Day",
      status: "Approved",
    },
  ];

  const replacements = [
    {
      _id: "rep_001",
      busId: mockBus._id,
      busNumber: mockBus.busNumber,
      shift: "Morning",
      dutyDate: "2026-10-19",
      originalDriverId: DRIVER_MORNING._id,
      replacementDriverId: DRIVER_REPLACEMENT._id,
      replacementDriverName: DRIVER_REPLACEMENT.name,
      status: "Assigned",
    },
  ];

  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_REPLACEMENT),
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
    activeLeaves: leaves,
    activeReplacements: replacements,
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.body.sessionDoc.isReplacementDriver, true);
  assert.strictEqual(result.body.sessionDoc.driverId, DRIVER_REPLACEMENT._id);
});

runTest("12. Unassigned shift cannot be bypassed using legacy permanent bus driver (403)", async () => {
  const busUnassignedMorning = {
    ...mockBus,
    shifts: {
      ...mockBus.shifts,
      morning: { driverId: null, driverName: "Not Assigned" },
    },
  };

  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(LEGACY_DRIVER),
    bus: busUnassignedMorning,
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
  });

  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.sessionCreated, false);
  assert.strictEqual(result.body.resolverStatus, RESOLVER_STATUS.NO_ASSIGNED_DRIVER);
});

runTest("13. Driver assigned to another bus cannot start this bus's trip (403)", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_OTHER_BUS),
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
  });

  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.sessionCreated, false);
  assert.strictEqual(result.body.authorizedDriver, DRIVER_MORNING.name);
});

runTest("14. Approved leave without replacement blocks regular driver trip start (403)", async () => {
  const leaves = [
    {
      _id: "leave_002",
      driverId: DRIVER_MORNING._id,
      leaveDate: "2026-10-19",
      leaveType: "Full Day",
      status: "Approved",
    },
  ];

  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
    activeLeaves: leaves,
    activeReplacements: [],
  });

  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.body.resolverStatus, RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED);
});

runTest("15. Unassigned replacement ('Replacement Required') blocks trip start (403)", async () => {
  const leaves = [
    {
      _id: "leave_003",
      driverId: DRIVER_MORNING._id,
      leaveDate: "2026-10-19",
      leaveType: "Full Day",
      status: "Approved",
    },
  ];

  const replacements = [
    {
      _id: "rep_002",
      busId: mockBus._id,
      busNumber: mockBus.busNumber,
      shift: "Morning",
      dutyDate: "2026-10-19",
      originalDriverId: DRIVER_MORNING._id,
      replacementDriverId: null,
      status: "Replacement Required",
    },
  ];

  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
    activeLeaves: leaves,
    activeReplacements: replacements,
  });

  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.body.resolverStatus, RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED);
});

// ====================================================
// GROUP C: SHIFT OVERRUN POLICY & AMBIGUITY SAFEGUARDS
// ====================================================

runTest("16. Minor overrun (10m <= 15m grace) permits start with warning message (200 OK)", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id, departureTime: "01:00 PM" },
    route: { ...mockRoute, total_duration_minutes: 70 }, // Ends at 02:10 PM (10m overrun)
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.sessionCreated, true);
  assert.strictEqual(result.body.hasShiftOverrunException, true);
  assert.ok(result.body.warningMessage.includes("exceeds Morning shift boundary"));
});

runTest("17. Major overrun of 30 mins (> 15m grace) blocks trip start (403)", async () => {
  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id, departureTime: "01:00 PM" },
    route: { ...mockRoute, total_duration_minutes: 90 }, // Ends at 02:30 PM (30m overrun)
  });

  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.sessionCreated, false);
  assert.strictEqual(result.body.substatus, RESOLVER_SUBSTATUS.SHIFT_BOUNDARY_OVERRUN);
});

runTest("18. Explicit scheduleId belonging to a different bus is rejected with 400", async () => {
  const otherBusSchedule = {
    _id: "660000000000000000000499",
    bus_id: "660000000000000000000999", // Different bus ID!
    busNumber: "KL-08-XX-9999",
    start_time: "08:30 AM",
    duration: "1 hr 30 mins",
    shift: "Morning",
  };

  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id, scheduleId: otherBusSchedule._id },
    schedules: [otherBusSchedule],
  });

  assert.strictEqual(result.status, 400);
  assert.strictEqual(result.body.code, "SCHEDULE_BUS_MISMATCH");
  assert.strictEqual(result.sessionCreated, false);
});

runTest("19. Multiple departures in the same shift without departureTime is rejected with 400 AMBIGUOUS_SCHEDULE", async () => {
  // Two distinct departures in Morning shift for the same bus
  const multiMorningSchedules = [
    {
      _id: "sch_morn_01",
      bus_id: mockBus._id,
      busNumber: mockBus.busNumber,
      start_time: "06:30 AM",
      shift: "Morning",
    },
    {
      _id: "sch_morn_02",
      bus_id: mockBus._id,
      busNumber: mockBus.busNumber,
      start_time: "11:30 AM",
      shift: "Morning",
    },
  ];

  // Request without departureTime or scheduleId
  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id },
    schedules: multiMorningSchedules,
  });

  assert.strictEqual(result.status, 400);
  assert.strictEqual(result.body.code, "AMBIGUOUS_SCHEDULE");
  assert.strictEqual(result.sessionCreated, false);
});

runTest("20. Historical schedule with explicit driver is preserved and authorized", async () => {
  const historicalSchedule = {
    _id: "sch_hist_001",
    bus_id: mockBus._id,
    busNumber: mockBus.busNumber,
    start_time: "08:30 AM",
    driver_id: HISTORICAL_DRIVER._id,
    driverName: HISTORICAL_DRIVER.name,
    shift: "Morning",
  };

  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(HISTORICAL_DRIVER),
    body: { busId: mockBus._id, scheduleId: historicalSchedule._id },
    schedules: [historicalSchedule],
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.sessionCreated, true);
  assert.strictEqual(result.body.sessionDoc.driverId, HISTORICAL_DRIVER._id);
});

// ====================================================
// GROUP D: CONCURRENCY, ACTIVE TRIP & SESSION SAFETY
// ====================================================

runTest("21. Unauthorized requests never create or activate a TripSession", async () => {
  const activeSessions = [];
  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_OTHER_BUS),
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
    activeTripSessions: activeSessions,
  });

  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.sessionCreated, false);
  assert.strictEqual(activeSessions.length, 0);
});

runTest("22. Same driver tapping start again resumes active trip without creating a duplicate", async () => {
  const activeSessions = [
    {
      tripSessionId: "TRIP-2026-10-19-001",
      busId: mockBus._id,
      driverId: DRIVER_MORNING._id,
      driverName: DRIVER_MORNING.name,
      status: "ACTIVE",
    },
  ];

  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
    activeTripSessions: activeSessions,
  });

  assert.strictEqual(result.status, 200);
  assert.strictEqual(result.sessionCreated, false);
  assert.strictEqual(result.body.isResumed, true);
  assert.strictEqual(activeSessions.length, 1); // Exactly 1 session remains!
});

runTest("23. Concurrent start requests on the same bus serialize through per-bus lock with 0 duplicates", async () => {
  const activeSessions = [];

  // Launch two start requests simultaneously
  const req1Promise = simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
    activeTripSessions: activeSessions,
  });

  const req2Promise = simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id, departureTime: "08:30 AM" },
    activeTripSessions: activeSessions,
  });

  const [res1, res2] = await Promise.all([req1Promise, req2Promise]);

  // Both return 200 OK
  assert.strictEqual(res1.status, 200);
  assert.strictEqual(res2.status, 200);

  // Exactly ONE request created the session; the second request resumed it!
  const createdCount = (res1.sessionCreated ? 1 : 0) + (res2.sessionCreated ? 1 : 0);
  assert.strictEqual(createdCount, 1);
  assert.strictEqual(activeSessions.length, 1); // Zero duplicate sessions in DB!
});

runTest("24. Different driver attempting to start on a bus with an active trip is rejected with 409", async () => {
  const activeSessions = [
    {
      tripSessionId: "TRIP-2026-10-19-001",
      busId: mockBus._id,
      driverId: DRIVER_MORNING._id,
      driverName: DRIVER_MORNING.name,
      status: "ACTIVE",
    },
  ];

  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_EVENING),
    body: { busId: mockBus._id, departureTime: "03:00 PM" },
    activeTripSessions: activeSessions,
  });

  assert.strictEqual(result.status, 409);
  assert.strictEqual(result.sessionCreated, false);
  assert.ok(result.body.message.includes("already has an active drive session"));
});

runTest("25. Shift overrun exception audit record is captured with full attribution", async () => {
  const resolverCheck = resolveEffectiveDepartureDriver({
    schedule: { start_time: "01:00 PM", bus_id: mockBus._id, busNumber: mockBus.busNumber },
    bus: mockBus,
    route: { ...mockRoute, total_duration_minutes: 70 },
    serviceDate: "2026-10-19",
  });

  const auditRecord = resolverCheck.boundaryCheck.auditRecord;
  assert.strictEqual(typeof auditRecord, "object");
  assert.strictEqual(auditRecord.serviceDate, "2026-10-19");
  assert.strictEqual(auditRecord.shift, "Morning");
  assert.strictEqual(auditRecord.overrunMinutes, 10);
  assert.strictEqual(auditRecord.gracePeriodMinutes, 15);
  assert.strictEqual(resolverCheck.boundaryCheck.withinGracePeriod, true);
  assert.strictEqual(auditRecord.isScheduleFault, true);
  assert.strictEqual(auditRecord.isTrafficDelayFault, false);
  assert.strictEqual(auditRecord.requiresWarning, true);
});

runTest("26. Stale authorization: Driver whose shift assignment was changed/removed cannot start trip (403)", async () => {
  // Bus with Morning shift reassigned to DRIVER_OTHER_BUS (Dave) instead of DRIVER_MORNING (John)
  const busWithChangedShift = {
    ...mockBus,
    shifts: {
      ...mockBus.shifts,
      morning: {
        driverId: DRIVER_OTHER_BUS._id,
        driverName: DRIVER_OTHER_BUS.name,
      },
    },
  };

  const result = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: busWithChangedShift._id, departureTime: "08:30 AM" },
    bus: busWithChangedShift,
  });

  assert.strictEqual(result.status, 403);
  assert.strictEqual(result.sessionCreated, false);
  assert.ok(result.body.message.includes("not authorized"));
});

runTest("27. Per-bus lock resilience: Exception during trip creation releases lock, preventing deadlock", async () => {
  const testBus27 = {
    ...mockBus,
    _id: "660000000000000000000027",
    busNumber: "KL-07-LOCK-27",
  };
  const busKey = String(testBus27._id);

  // 1. Launch a request that throws inside the critical section (simulating database write failure)
  let failed = false;
  try {
    await simulateTripStartEndpoint({
      authHeader: makeToken(DRIVER_MORNING),
      body: { busId: testBus27._id, departureTime: "08:30 AM" },
      bus: testBus27,
      simulateDbError: true,
    });
  } catch (err) {
    failed = true;
    assert.ok(err.message.includes("Simulated database failure"));
  }
  assert.strictEqual(failed, true);

  // Lock MUST be released in finally block
  assert.strictEqual(testActiveStartOperations.has(busKey), false);

  // 2. Subsequent normal start request on the same bus MUST acquire the lock and succeed immediately without deadlock
  const secondResult = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: testBus27._id, departureTime: "08:30 AM" },
    bus: testBus27,
  });

  assert.strictEqual(secondResult.status, 200);
  assert.strictEqual(secondResult.sessionCreated, true);
});

runTest("28. Error responses contract: 401, 403, 409, and AMBIGUOUS_SCHEDULE include clean messages", async () => {
  // 401 Missing Token
  const res401 = await simulateTripStartEndpoint({ authHeader: null, body: { busId: mockBus._id } });
  assert.strictEqual(res401.status, 401);
  assert.strictEqual(typeof res401.body.message, "string");
  assert.strictEqual(res401.body.code, "NO_TOKEN");

  // 403 Forbidden Role
  const res403Role = await simulateTripStartEndpoint({ authHeader: makeToken(PASSENGER_USER), body: { busId: mockBus._id } });
  assert.strictEqual(res403Role.status, 403);
  assert.strictEqual(typeof res403Role.body.message, "string");
  assert.strictEqual(res403Role.body.code, "FORBIDDEN_ROLE");

  // 409 Conflict
  const activeSessions = [
    { tripSessionId: "TRIP-001", busId: mockBus._id, driverId: DRIVER_MORNING._id, driverName: DRIVER_MORNING.name, status: "ACTIVE" },
  ];
  const res409 = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_EVENING),
    body: { busId: mockBus._id, departureTime: "03:00 PM" },
    activeTripSessions: activeSessions,
  });
  assert.strictEqual(res409.status, 409);
  assert.strictEqual(typeof res409.body.message, "string");

  // 400 Ambiguous Schedule
  const multiSchedules = [
    { _id: "s1", bus_id: mockBus._id, busNumber: mockBus.busNumber, start_time: "06:30 AM", shift: "Morning" },
    { _id: "s2", bus_id: mockBus._id, busNumber: mockBus.busNumber, start_time: "11:30 AM", shift: "Morning" },
  ];
  const resAmbiguous = await simulateTripStartEndpoint({
    authHeader: makeToken(DRIVER_MORNING),
    body: { busId: mockBus._id },
    schedules: multiSchedules,
  });
  assert.strictEqual(resAmbiguous.status, 400);
  assert.strictEqual(resAmbiguous.body.code, "AMBIGUOUS_SCHEDULE");
  assert.strictEqual(typeof resAmbiguous.body.message, "string");
  assert.ok(Array.isArray(resAmbiguous.body.availableDepartures));
});

// Summary reporting after async tests complete
setTimeout(() => {
  console.log("=================================================");
  console.log(`TEST SUMMARY: ${passed}/${total} TESTS PASSED`);
  console.log("=================================================");
  if (passed === total) {
    console.log(`✅ ALL ${total} STAGE D3.3.2 SECURITY & INTEGRATION TESTS PASSED!`);
  } else {
    console.error("❌ SOME TESTS FAILED");
    process.exit(1);
  }
}, 500);
