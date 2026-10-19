/**
 * MoveSmart Transit - Effective Departure Driver Resolver (Stage D2)
 * 
 * Pure, deterministic utility that dynamically resolves the effective driver
 * for a route departure schedule based on:
 * 1. Preserving explicit historical/manual schedule drivers (backward compatibility).
 * 2. Evaluating expected trip duration against canonical shift boundaries with a configurable grace period.
 * 3. Resolving the bus's Three-Shift Driver Roster (Morning, Evening, Night) without legacy bus driver fallback.
 * 4. Checking approved driver leave (DriverLeave).
 * 5. Checking active, verified temporary replacements (DriverReplacement).
 * 6. Producing sanitized passenger-facing views (no personal contact data leakage).
 * 7. Enforcing driver trip-start safety and authorization policies.
 * 
 * Supports both offline in-memory execution (with mock arrays) and async database queries.
 */

const mongoose = require("mongoose");
const {
  SHIFT_TYPES,
  SHIFT_DEFAULT_HOURS,
  parseTimeString,
  inferShiftFromTime,
  normalizeDateStr,
  getDutyInterval,
  getLeaveIntervals,
  doIntervalsOverlap,
} = require("./shiftConflictHelper");

/**
 * Central Shift Policy Configuration (Stage D2)
 * Configurable in one clearly documented backend configuration.
 */
const SHIFT_POLICY_CONFIG = Object.freeze({
  DEFAULT_GRACE_PERIOD_MINUTES: 15,
  MAX_ALLOWED_OVERRUN_MINUTES: 15,
});

/**
 * Passenger-Facing Assignment Statuses
 */
const PASSENGER_ASSIGNMENT_STATUS = Object.freeze({
  ASSIGNED: "ASSIGNED",
  ASSIGNMENT_PENDING: "ASSIGNMENT_PENDING",
  SCHEDULE_REVIEW_REQUIRED: "SCHEDULE_REVIEW_REQUIRED",
});

/**
 * Driver Trip-Start Eligibility Statuses
 */
const TRIP_START_STATUS = Object.freeze({
  ELIGIBLE: "ELIGIBLE",
  WARNING_OVERRUN: "WARNING_OVERRUN",
  BLOCKED: "BLOCKED",
});

/**
 * Explicit resolver outcome statuses
 */
const RESOLVER_STATUS = Object.freeze({
  ASSIGNED_REGULAR_DRIVER: "ASSIGNED_REGULAR_DRIVER",
  VALID_REPLACEMENT_DRIVER: "VALID_REPLACEMENT_DRIVER",
  EXPLICIT_SCHEDULE_DRIVER: "EXPLICIT_SCHEDULE_DRIVER",
  NO_ASSIGNED_DRIVER: "NO_ASSIGNED_DRIVER",
  DRIVER_ON_LEAVE_UNREPLACED: "DRIVER_ON_LEAVE_UNREPLACED",
  INVALID_OR_AMBIGUOUS_DUTY: "INVALID_OR_AMBIGUOUS_DUTY",
});

/**
 * Substatus codes providing granular diagnostic reasons
 */
const RESOLVER_SUBSTATUS = Object.freeze({
  MATCH_SUCCESS: "MATCH_SUCCESS",
  OVERRUN_WITHIN_GRACE_PERIOD: "OVERRUN_WITHIN_GRACE_PERIOD",
  UNRESOLVED_DURATION: "UNRESOLVED_DURATION",
  SHIFT_BOUNDARY_OVERRUN: "SHIFT_BOUNDARY_OVERRUN",
  STARTS_BEFORE_SHIFT: "STARTS_BEFORE_SHIFT",
  MISSING_START_TIME: "MISSING_START_TIME",
  UNASSIGNED_BUS: "UNASSIGNED_BUS",
  UNASSIGNED_SHIFT_ROSTER: "UNASSIGNED_SHIFT_ROSTER",
  DRIVER_ON_APPROVED_LEAVE: "DRIVER_ON_APPROVED_LEAVE",
  REPLACEMENT_ASSIGNED: "REPLACEMENT_ASSIGNED",
  REPLACEMENT_DRIVER_ON_LEAVE: "REPLACEMENT_DRIVER_ON_LEAVE",
  HISTORICAL_EXPLICIT_PRESERVED: "HISTORICAL_EXPLICIT_PRESERVED",
});

/**
 * Checks if a driver name or string is a generic placeholder
 */
function isGenericDriverName(name) {
  if (!name) return true;
  const clean = String(name).toLowerCase().trim();
  return [
    "unassigned",
    "not assigned",
    "assigned driver",
    "assigned fleet driver",
    "driver assigned",
    "driver",
    "driver user",
    "null",
    "undefined",
    "n/a",
    "--",
  ].includes(clean);
}

/**
 * Parses duration string (e.g. "4h 30m", "1h 45m", "90 mins", "120") into integer minutes
 */
function parseDurationStringToMinutes(durationStr) {
  if (!durationStr) return null;
  if (typeof durationStr === "number" && durationStr > 0) return Math.round(durationStr);
  if (typeof durationStr !== "string") return null;

  const clean = durationStr.trim().toLowerCase();
  let totalMinutes = 0;
  let matched = false;

  const hoursMatch = clean.match(/(\d+)\s*h(?:ours?|rs?)?/);
  if (hoursMatch) {
    totalMinutes += parseInt(hoursMatch[1], 10) * 60;
    matched = true;
  }

  const minsMatch = clean.match(/(\d+)\s*m(?:inutes?|ins?)?/);
  if (minsMatch) {
    totalMinutes += parseInt(minsMatch[1], 10);
    matched = true;
  }

  if (!matched) {
    const plainNum = parseInt(clean, 10);
    if (!isNaN(plainNum) && plainNum > 0) return plainNum;
    return null;
  }

  return totalMinutes > 0 ? totalMinutes : null;
}

/**
 * Extracts and validates expected trip duration from route, schedule, or bus.
 * Returns null if duration cannot be determined reliably.
 */
function extractTripDurationMinutes({ schedule, route, bus }) {
  // 1. Explicit numeric minutes on Route
  if (route && typeof route.total_duration_minutes === "number" && route.total_duration_minutes > 0) {
    return Math.round(route.total_duration_minutes);
  }

  // 2. Computed from Route structured stops (last stop offset)
  if (route && Array.isArray(route.stops) && route.stops.length > 1) {
    const lastStop = route.stops[route.stops.length - 1];
    if (lastStop && typeof lastStop.offset_minutes === "number" && lastStop.offset_minutes > 0) {
      return Math.round(lastStop.offset_minutes);
    }
  }

  // 3. Explicit numeric minutes on Schedule
  if (schedule && typeof schedule.total_duration_minutes === "number" && schedule.total_duration_minutes > 0) {
    return Math.round(schedule.total_duration_minutes);
  }

  // 4. String duration on Route (e.g. "2h 30m")
  if (route && route.duration) {
    const parsed = parseDurationStringToMinutes(route.duration);
    if (parsed) return parsed;
  }

  // 5. String duration on Schedule
  if (schedule && schedule.duration) {
    const parsed = parseDurationStringToMinutes(schedule.duration);
    if (parsed) return parsed;
  }

  // 6. String duration on Bus
  if (bus && bus.duration) {
    const parsed = parseDurationStringToMinutes(bus.duration);
    if (parsed) return parsed;
  }

  return null;
}

/**
 * Formats a Date object into 12-hour "hh:mm AM/PM" format
 */
function formatTime12h(date) {
  if (!(date instanceof Date) || isNaN(date.getTime())) return "--:-- --";
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${period}`;
}

/**
 * Normalizes service date and computes operational service date.
 * If targetDate is a Date during the post-midnight hours of Night shift (00:00 to 05:59),
 * the operational service date belongs to the previous calendar day (service commencement date).
 */
function resolveOperationalServiceDate(dateInput, startTimeStr) {
  if (typeof dateInput === "string" && dateInput.trim().match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateInput.trim();
  }

  const d = dateInput instanceof Date ? new Date(dateInput.getTime()) : new Date(dateInput || Date.now());
  const { hour } = parseTimeString(startTimeStr);

  // If departure is in early morning post-midnight (00:00-05:59) and calendar date matches,
  // the operational Night shift started at 22:00 on the prior day.
  if (hour < 6 && dateInput instanceof Date && d.getHours() < 6) {
    d.setDate(d.getDate() - 1);
  }

  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Validates trip duration against the canonical shift boundary with configurable grace period.
 * Handles normal Morning/Evening shifts and midnight-crossing Night shifts (+1 day).
 * 
 * Clearly distinguishes:
 * - Predicted base route duration from traffic delay buffer.
 * - Exact fit (0 mins overrun).
 * - Minor overrun within configured grace period (<= 15 mins): reported as exception with warning and audit record.
 * - Major overrun (> 15 mins): blocked from automatic start, requiring explicit handover or admin decision.
 */
function validateTripShiftBoundary({
  serviceDateStr,
  shift,
  startTimeStr,
  durationMinutes,
  delayBufferMinutes = 0,
  gracePeriodMinutes = SHIFT_POLICY_CONFIG.DEFAULT_GRACE_PERIOD_MINUTES,
}) {
  const dutyInterval = getDutyInterval(serviceDateStr, shift);
  const cleanDate = normalizeDateStr(serviceDateStr);
  const [year, month, day] = cleanDate.split("-").map((n) => parseInt(n, 10));
  const { hour, minute } = parseTimeString(startTimeStr);

  // Determine calendar date for trip start
  let startCalendarDay = day;
  if (shift === SHIFT_TYPES.NIGHT && hour < 6) {
    // Night shift post-midnight trips start on serviceDate + 1
    startCalendarDay += 1;
  }

  const tripStartDateTime = new Date(year, month - 1, startCalendarDay, hour, minute, 0, 0);
  const baseDurationMins = Math.max(0, Number(durationMinutes) || 0);
  const trafficDelayMins = Math.max(0, Number(delayBufferMinutes) || 0);
  const totalTripMinutes = baseDurationMins + trafficDelayMins;

  const baseEndDateTime = new Date(tripStartDateTime.getTime() + baseDurationMins * 60 * 1000);
  const tripEndDateTime = new Date(tripStartDateTime.getTime() + totalTripMinutes * 60 * 1000);

  const activeGraceMinutes = typeof gracePeriodMinutes === "number" && gracePeriodMinutes >= 0
    ? gracePeriodMinutes
    : SHIFT_POLICY_CONFIG.DEFAULT_GRACE_PERIOD_MINUTES;

  // 1. Check if departure starts before shift begins
  if (tripStartDateTime.getTime() < dutyInterval.startDateTime.getTime()) {
    const underrunMins = Math.round((dutyInterval.startDateTime.getTime() - tripStartDateTime.getTime()) / 60000);
    return {
      fitsWithinShift: false,
      isOverrun: false,
      withinGracePeriod: false,
      requiresWarning: false,
      substatus: RESOLVER_SUBSTATUS.STARTS_BEFORE_SHIFT,
      tripStartDateTime,
      tripEndDateTime,
      baseEndDateTime,
      tripStartTimeStr: formatTime12h(tripStartDateTime),
      tripEndTimeStr: formatTime12h(tripEndDateTime),
      shiftStartTimeStr: formatTime12h(dutyInterval.startDateTime),
      shiftEndTimeStr: formatTime12h(dutyInterval.endDateTime),
      durationMinutes: baseDurationMins,
      delayBufferMinutes: trafficDelayMins,
      overrunMinutes: 0,
      baseOverrunMinutes: 0,
      trafficOverrunMinutes: 0,
      underrunMinutes: underrunMins,
      gracePeriodMinutes: activeGraceMinutes,
      isScheduleFault: true,
      isTrafficDelayFault: false,
      warningMessage: null,
      auditRecord: null,
      reason: `Departure at ${formatTime12h(tripStartDateTime)} starts ${underrunMins} mins before ${shift} shift begins (${formatTime12h(dutyInterval.startDateTime)}).`,
    };
  }

  // Calculate overruns beyond shift boundary
  const shiftEndMs = dutyInterval.endDateTime.getTime();
  const tripEndMs = tripEndDateTime.getTime();
  const baseEndMs = baseEndDateTime.getTime();

  const totalOverrunMs = tripEndMs - shiftEndMs;
  const baseOverrunMs = baseEndMs - shiftEndMs;

  const overrunMinutes = totalOverrunMs > 0 ? Math.round(totalOverrunMs / 60000) : 0;
  const baseOverrunMinutes = baseOverrunMs > 0 ? Math.round(baseOverrunMs / 60000) : 0;
  const trafficOverrunMinutes = overrunMinutes > baseOverrunMinutes ? overrunMinutes - baseOverrunMinutes : 0;

  // Distinguish whether the underlying scheduled trip alone overruns the shift vs traffic delay buffer
  const isScheduleFault = baseOverrunMinutes > 0;
  const isTrafficDelayFault = !isScheduleFault && overrunMinutes > 0;

  // Case A: Exact fit or completes before shift boundary (overrun === 0)
  if (overrunMinutes === 0) {
    return {
      fitsWithinShift: true,
      isOverrun: false,
      withinGracePeriod: true,
      requiresWarning: false,
      substatus: RESOLVER_SUBSTATUS.MATCH_SUCCESS,
      tripStartDateTime,
      tripEndDateTime,
      baseEndDateTime,
      tripStartTimeStr: formatTime12h(tripStartDateTime),
      tripEndTimeStr: formatTime12h(tripEndDateTime),
      shiftStartTimeStr: formatTime12h(dutyInterval.startDateTime),
      shiftEndTimeStr: formatTime12h(dutyInterval.endDateTime),
      durationMinutes: baseDurationMins,
      delayBufferMinutes: trafficDelayMins,
      overrunMinutes: 0,
      baseOverrunMinutes: 0,
      trafficOverrunMinutes: 0,
      underrunMinutes: 0,
      gracePeriodMinutes: activeGraceMinutes,
      isScheduleFault: false,
      isTrafficDelayFault: false,
      warningMessage: null,
      auditRecord: null,
      reason: `Trip fits cleanly within ${shift} shift (${formatTime12h(dutyInterval.startDateTime)} – ${formatTime12h(dutyInterval.endDateTime)}).`,
    };
  }

  // Case B: Minor overrun within grace period (0 < overrunMinutes <= gracePeriodMinutes)
  // Must NOT be silently treated as a normal assignment: generates warning & audit record exception!
  if (overrunMinutes <= activeGraceMinutes) {
    let faultDesc = "";
    if (isScheduleFault && isTrafficDelayFault) {
      faultDesc = `Base route duration (${baseDurationMins}m) exceeds shift by ${baseOverrunMinutes}m; traffic buffer adds ${trafficOverrunMinutes}m.`;
    } else if (isScheduleFault) {
      faultDesc = `Base scheduled duration (${baseDurationMins}m) exceeds shift by ${baseOverrunMinutes}m.`;
    } else {
      faultDesc = `Base duration (${baseDurationMins}m) fits shift, but traffic buffer (${trafficDelayMins}m) causes ${overrunMinutes}m overrun.`;
    }

    const warningMessage = `Trip arrival at ${formatTime12h(tripEndDateTime)} exceeds ${shift} shift boundary (${formatTime12h(dutyInterval.endDateTime)}) by ${overrunMinutes} min(s), within ${activeGraceMinutes}-min grace period. Recorded as shift overrun exception. ${faultDesc}`;

    const auditRecord = {
      eventType: "SHIFT_OVERRUN_EXCEPTION",
      serviceDate: serviceDateStr,
      shift,
      tripStartTime: formatTime12h(tripStartDateTime),
      tripEndTime: formatTime12h(tripEndDateTime),
      shiftEndTime: formatTime12h(dutyInterval.endDateTime),
      baseDurationMinutes: baseDurationMins,
      delayBufferMinutes: trafficDelayMins,
      overrunMinutes,
      baseOverrunMinutes,
      trafficOverrunMinutes,
      gracePeriodMinutes: activeGraceMinutes,
      isScheduleFault,
      isTrafficDelayFault,
      requiresWarning: true,
      recordedAt: new Date().toISOString(),
    };

    return {
      fitsWithinShift: true, // Permitted to operate under grace period with exception record
      isOverrun: true,
      withinGracePeriod: true,
      requiresWarning: true,
      substatus: RESOLVER_SUBSTATUS.OVERRUN_WITHIN_GRACE_PERIOD,
      tripStartDateTime,
      tripEndDateTime,
      baseEndDateTime,
      tripStartTimeStr: formatTime12h(tripStartDateTime),
      tripEndTimeStr: formatTime12h(tripEndDateTime),
      shiftStartTimeStr: formatTime12h(dutyInterval.startDateTime),
      shiftEndTimeStr: formatTime12h(dutyInterval.endDateTime),
      durationMinutes: baseDurationMins,
      delayBufferMinutes: trafficDelayMins,
      overrunMinutes,
      baseOverrunMinutes,
      trafficOverrunMinutes,
      underrunMinutes: 0,
      gracePeriodMinutes: activeGraceMinutes,
      isScheduleFault,
      isTrafficDelayFault,
      warningMessage,
      auditRecord,
      reason: warningMessage,
    };
  }

  // Case C: Overrun exceeds grace period (overrunMinutes > gracePeriodMinutes)
  let faultDesc = "";
  if (isScheduleFault) {
    faultDesc = `Base scheduled duration (${baseDurationMins}m) exceeds shift by ${baseOverrunMinutes}m.`;
  } else {
    faultDesc = `Traffic buffer (${trafficDelayMins}m) pushes overrun to ${overrunMinutes}m.`;
  }

  const blockingReason = `Trip expected to end at ${formatTime12h(tripEndDateTime)} overrunning ${shift} shift boundary (${formatTime12h(dutyInterval.endDateTime)}) by ${overrunMinutes} mins (exceeds ${activeGraceMinutes}-min grace period). Explicit handover, valid reassignment, or authorized admin decision required. ${faultDesc}`;

  const auditRecord = {
    eventType: "SHIFT_OVERRUN_BLOCKED",
    serviceDate: serviceDateStr,
    shift,
    tripStartTime: formatTime12h(tripStartDateTime),
    tripEndTime: formatTime12h(tripEndDateTime),
    shiftEndTime: formatTime12h(dutyInterval.endDateTime),
    baseDurationMinutes: baseDurationMins,
    delayBufferMinutes: trafficDelayMins,
    overrunMinutes,
    baseOverrunMinutes,
    trafficOverrunMinutes,
    gracePeriodMinutes: activeGraceMinutes,
    isScheduleFault,
    isTrafficDelayFault,
    requiresWarning: true,
    recordedAt: new Date().toISOString(),
  };

  return {
    fitsWithinShift: false,
    isOverrun: true,
    withinGracePeriod: false,
    requiresWarning: true,
    substatus: RESOLVER_SUBSTATUS.SHIFT_BOUNDARY_OVERRUN,
    tripStartDateTime,
    tripEndDateTime,
    baseEndDateTime,
    tripStartTimeStr: formatTime12h(tripStartDateTime),
    tripEndTimeStr: formatTime12h(tripEndDateTime),
    shiftStartTimeStr: formatTime12h(dutyInterval.startDateTime),
    shiftEndTimeStr: formatTime12h(dutyInterval.endDateTime),
    durationMinutes: baseDurationMins,
    delayBufferMinutes: trafficDelayMins,
    overrunMinutes,
    baseOverrunMinutes,
    trafficOverrunMinutes,
    underrunMinutes: 0,
    gracePeriodMinutes: activeGraceMinutes,
    isScheduleFault,
    isTrafficDelayFault,
    warningMessage: blockingReason,
    auditRecord,
    reason: blockingReason,
  };
}

/**
 * Checks if a driver has an approved leave overlapping the trip interval
 */
function findOverlappingApprovedLeave(driverId, driverLeaves = [], tripInterval) {
  if (!driverId || !Array.isArray(driverLeaves) || driverLeaves.length === 0) return null;
  const dIdStr = String(driverId);

  for (const lv of driverLeaves) {
    if (lv.status !== "Approved") continue;
    const lvDriverId = String(lv.driverId || lv.driver?._id || "");
    if (lvDriverId === dIdStr) {
      const intervals = getLeaveIntervals(lv);
      if (intervals.some((intv) => doIntervalsOverlap(tripInterval.startDateTime, tripInterval.endDateTime, intv.startDateTime, intv.endDateTime))) {
        return lv;
      }
    }
  }

  return null;
}

/**
 * Checks if a valid, active DriverReplacement exists for this bus, shift, and duty date
 */
function findValidReplacementDuty({ busId, busNumber, shift, dutyDate, replacements = [], tripInterval }) {
  if (!Array.isArray(replacements) || replacements.length === 0) return null;
  const busIdStr = busId ? String(busId) : null;
  const normBusNum = busNumber ? String(busNumber).trim().toUpperCase() : null;

  for (const rep of replacements) {
    // 1. Strict status check: only "Assigned" or "In Progress" are valid active replacements
    if (!["Assigned", "In Progress"].includes(rep.status)) continue;

    // 2. Must have an assigned replacement driver
    if (!rep.replacementDriverId) continue;

    // 3. Match bus
    const repBusId = rep.busId ? String(rep.busId._id || rep.busId) : null;
    const repBusNum = rep.busNumber ? String(rep.busNumber).trim().toUpperCase() : null;
    const busMatches = (busIdStr && repBusId === busIdStr) || (normBusNum && repBusNum === normBusNum);
    if (!busMatches) continue;

    // 4. Match shift & duty date
    if (rep.shift !== shift) continue;
    if (rep.dutyDate !== dutyDate) continue;

    // 5. Overlap check with trip interval if replacement interval is defined
    if (rep.startDateTime && rep.endDateTime && tripInterval) {
      if (!doIntervalsOverlap(tripInterval.startDateTime, tripInterval.endDateTime, rep.startDateTime, rep.endDateTime)) {
        continue;
      }
    }

    return rep;
  }

  return null;
}

/**
 * Generates sanitized passenger-facing assignment view.
 * Guarantees zero leakage of driver phone numbers, emails, licenses, or database IDs.
 */
function buildPassengerView({
  status,
  substatus,
  schedule,
  bus,
  driverName,
  shift,
  serviceDate,
  boundaryCheck,
}) {
  const busNumber = (bus && bus.busNumber) || (schedule && schedule.busNumber) || "Bus";
  const departureTime = (schedule && schedule.start_time) ? schedule.start_time.trim() : "--:-- --";

  // Case 1: Duty parameters require operational review (unresolved duration, overrun > grace, etc.)
  if (status === RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY) {
    return {
      status: PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED,
      busNumber,
      driverName: "Not Assigned",
      departureTime,
      serviceDate,
      shift: shift || null,
      statusReason: boundaryCheck?.reason || "Trip parameters require operational schedule review.",
    };
  }

  // Case 2: Driver pending assignment (unassigned bus, empty shift roster, leave without replacement)
  if (status === RESOLVER_STATUS.NO_ASSIGNED_DRIVER || status === RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED) {
    const statusReason = status === RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED
      ? "Driver unavailable; awaiting replacement assignment."
      : "Shift driver assignment pending.";

    return {
      status: PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING,
      busNumber,
      driverName: "Not Assigned",
      departureTime,
      serviceDate,
      shift: shift || null,
      statusReason,
    };
  }

  // Case 3: Valid driver assigned (regular, replacement, or preserved explicit historical)
  const sanitizedDriverName = isGenericDriverName(driverName)
    ? "Assigned Fleet Driver"
    : String(driverName).trim();

  return {
    status: PASSENGER_ASSIGNMENT_STATUS.ASSIGNED,
    busNumber,
    driverName: sanitizedDriverName,
    departureTime,
    serviceDate,
    shift: shift || null,
    statusReason: null,
  };
}

/**
 * Evaluates driver trip-start eligibility and produces safety audit records.
 */
function buildTripStartEligibility({
  status,
  substatus,
  boundaryCheck,
  driverId,
  driverName,
  reason,
}) {
  // Case 1: Invalid or ambiguous duty
  if (status === RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY) {
    const isOverrunMajor = boundaryCheck && boundaryCheck.overrunMinutes > boundaryCheck.gracePeriodMinutes;
    const isBeforeShift = boundaryCheck && boundaryCheck.substatus === RESOLVER_SUBSTATUS.STARTS_BEFORE_SHIFT;

    return {
      canStartTrip: false,
      status: TRIP_START_STATUS.BLOCKED,
      requiresWarning: Boolean(boundaryCheck && boundaryCheck.requiresWarning),
      warningMessage: boundaryCheck?.warningMessage || null,
      blockingReason: boundaryCheck?.reason || reason || "Departure schedule parameters are invalid or ambiguous.",
      requiresAdminAuthorization: Boolean(isOverrunMajor || isBeforeShift),
      adminOverridePermitted: false,
      auditRecord: boundaryCheck?.auditRecord || null,
    };
  }

  // Case 2: No driver assigned (unassigned bus or unassigned shift roster)
  if (status === RESOLVER_STATUS.NO_ASSIGNED_DRIVER) {
    return {
      canStartTrip: false,
      status: TRIP_START_STATUS.BLOCKED,
      requiresWarning: false,
      warningMessage: null,
      blockingReason: reason || "No driver assigned to this departure schedule or shift roster.",
      requiresAdminAuthorization: false,
      adminOverridePermitted: false,
      auditRecord: null,
    };
  }

  // Case 3: Driver on leave without replacement
  if (status === RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED) {
    return {
      canStartTrip: false,
      status: TRIP_START_STATUS.BLOCKED,
      requiresWarning: false,
      warningMessage: null,
      blockingReason: reason || "Regular driver is on approved leave without a valid replacement.",
      requiresAdminAuthorization: false,
      adminOverridePermitted: false,
      auditRecord: null,
    };
  }

  // Case 4: Valid driver assigned - check for minor shift overrun within grace period
  if (boundaryCheck && boundaryCheck.isOverrun && boundaryCheck.withinGracePeriod) {
    return {
      canStartTrip: true,
      status: TRIP_START_STATUS.WARNING_OVERRUN,
      requiresWarning: true,
      warningMessage: boundaryCheck.warningMessage,
      blockingReason: null,
      requiresAdminAuthorization: false,
      adminOverridePermitted: false,
      auditRecord: boundaryCheck.auditRecord,
    };
  }

  // Case 5: Normal valid assignment fitting cleanly within shift
  return {
    canStartTrip: true,
    status: TRIP_START_STATUS.ELIGIBLE,
    requiresWarning: false,
    warningMessage: null,
    blockingReason: null,
    requiresAdminAuthorization: false,
    adminOverridePermitted: false,
    auditRecord: null,
  };
}

/**
 * Main Resolver: Resolves the effective driver for a departure schedule (Stage D2)
 * 
 * @param {Object} params
 * @param {Object} params.schedule - Schedule document or plain object
 * @param {Object} [params.bus] - Bus document or plain object
 * @param {Object} [params.route] - Route document or plain object
 * @param {Date|string} [params.serviceDate] - Service date or Date object
 * @param {number} [params.gracePeriodMinutes] - Optional override for shift grace period (defaults to 15)
 * @param {Array} [params.driverReplacements] - Optional in-memory array of DriverReplacement objects
 * @param {Array} [params.driverLeaves] - Optional in-memory array of DriverLeave objects
 * @returns {Object} Full resolution result with passengerView and tripStartEligibility
 */
function resolveEffectiveDepartureDriver(params = {}) {
  const { schedule, bus, route } = params;
  const gracePeriodMinutes = typeof params.gracePeriodMinutes === "number" && params.gracePeriodMinutes >= 0
    ? params.gracePeriodMinutes
    : SHIFT_POLICY_CONFIG.DEFAULT_GRACE_PERIOD_MINUTES;

  function formatOutput(rawResult) {
    const passengerView = buildPassengerView({
      status: rawResult.status,
      substatus: rawResult.substatus,
      schedule,
      bus,
      driverName: rawResult.driverName,
      shift: rawResult.shift,
      serviceDate: rawResult.serviceDate,
      boundaryCheck: rawResult.boundaryCheck,
    });

    const tripStartEligibility = buildTripStartEligibility({
      status: rawResult.status,
      substatus: rawResult.substatus,
      boundaryCheck: rawResult.boundaryCheck,
      driverId: rawResult.driverId,
      driverName: rawResult.driverName,
      reason: rawResult.reason,
    });

    return {
      ...rawResult,
      hasShiftOverrunException: Boolean(rawResult.boundaryCheck && rawResult.boundaryCheck.isOverrun && rawResult.boundaryCheck.withinGracePeriod),
      passengerView,
      tripStartEligibility,
    };
  }

  // 1. Validate Schedule and Departure Time
  if (!schedule || !schedule.start_time || typeof schedule.start_time !== "string" || !schedule.start_time.trim()) {
    return formatOutput({
      success: false,
      status: RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY,
      substatus: RESOLVER_SUBSTATUS.MISSING_START_TIME,
      driverId: null,
      driverName: "Not Assigned",
      driverPhone: "N/A",
      driverEmail: "",
      shift: null,
      shiftKey: null,
      serviceDate: normalizeDateStr(params.serviceDate || new Date()),
      isReplacement: false,
      replacementDutyId: null,
      originalDriverId: null,
      originalDriverName: null,
      isOnLeave: false,
      leaveId: null,
      durationMinutes: null,
      tripStartTime: null,
      tripEndTime: null,
      boundaryCheck: null,
      reason: "Departure schedule start_time is missing or invalid.",
    });
  }

  const startTimeStr = schedule.start_time.trim();

  // 2. Extract and Validate Trip Duration
  const durationMinutes = extractTripDurationMinutes({ schedule, route, bus });
  if (durationMinutes === null || durationMinutes <= 0) {
    return formatOutput({
      success: false,
      status: RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY,
      substatus: RESOLVER_SUBSTATUS.UNRESOLVED_DURATION,
      driverId: null,
      driverName: "Not Assigned",
      driverPhone: "N/A",
      driverEmail: "",
      shift: null,
      shiftKey: null,
      serviceDate: normalizeDateStr(params.serviceDate || new Date()),
      isReplacement: false,
      replacementDutyId: null,
      originalDriverId: null,
      originalDriverName: null,
      isOnLeave: false,
      leaveId: null,
      durationMinutes: null,
      tripStartTime: startTimeStr,
      tripEndTime: null,
      boundaryCheck: null,
      reason: "Expected trip duration cannot be determined reliably from Route, Schedule, or Bus specifications.",
    });
  }

  // 3. Resolve Shift and Operational Service Date
  const shift = schedule.shift && Object.values(SHIFT_TYPES).includes(schedule.shift)
    ? schedule.shift
    : inferShiftFromTime(startTimeStr);
  const shiftKey = shift.toLowerCase();
  const serviceDateStr = resolveOperationalServiceDate(params.serviceDate || new Date(), startTimeStr);
  const delayBufferMinutes = Number(schedule.delay_buffer_minutes || 0);

  // 4. Validate Trip Duration Against Canonical Shift Boundaries with Grace Period Policy
  const boundaryCheck = validateTripShiftBoundary({
    serviceDateStr,
    shift,
    startTimeStr,
    durationMinutes,
    delayBufferMinutes,
    gracePeriodMinutes,
  });

  // If overrun exceeds grace period (> 15 mins) or starts before shift begins
  if (!boundaryCheck.fitsWithinShift) {
    return formatOutput({
      success: false,
      status: RESOLVER_STATUS.INVALID_OR_AMBIGUOUS_DUTY,
      substatus: boundaryCheck.substatus,
      driverId: null,
      driverName: "Not Assigned",
      driverPhone: "N/A",
      driverEmail: "",
      shift,
      shiftKey,
      serviceDate: serviceDateStr,
      isReplacement: false,
      replacementDutyId: null,
      originalDriverId: null,
      originalDriverName: null,
      isOnLeave: false,
      leaveId: null,
      durationMinutes,
      tripStartTime: startTimeStr,
      tripEndTime: boundaryCheck.tripEndTimeStr,
      boundaryCheck,
      reason: boundaryCheck.reason,
    });
  }

  // Define trip interval for leave and replacement conflict detection
  const tripInterval = {
    startDateTime: boundaryCheck.tripStartDateTime,
    endDateTime: boundaryCheck.tripEndDateTime,
  };

  // Determine substatus if boundary overrun is within grace period
  const overrunSubstatus = boundaryCheck.isOverrun ? RESOLVER_SUBSTATUS.OVERRUN_WITHIN_GRACE_PERIOD : null;

  // 5. Check Explicit Historical/Manual Schedule Driver Assignment
  const rawScheduleDriverId = schedule.driver_id ? String(schedule.driver_id).trim() : null;
  const rawScheduleDriverName = schedule.driverName ? String(schedule.driverName).trim() : "";
  const hasExplicitDriverId = Boolean(rawScheduleDriverId && !isGenericDriverName(rawScheduleDriverId));
  const hasExplicitDriverName = Boolean(rawScheduleDriverName && !isGenericDriverName(rawScheduleDriverName));

  if (hasExplicitDriverId || hasExplicitDriverName) {
    return formatOutput({
      success: true,
      status: RESOLVER_STATUS.EXPLICIT_SCHEDULE_DRIVER,
      substatus: overrunSubstatus || RESOLVER_SUBSTATUS.HISTORICAL_EXPLICIT_PRESERVED,
      driverId: hasExplicitDriverId ? rawScheduleDriverId : null,
      driverName: hasExplicitDriverName ? rawScheduleDriverName : "Assigned Schedule Driver",
      driverPhone: schedule.driverPhone || "N/A",
      driverEmail: schedule.driverEmail || "",
      shift,
      shiftKey,
      serviceDate: serviceDateStr,
      isReplacement: false,
      replacementDutyId: null,
      originalDriverId: null,
      originalDriverName: null,
      isOnLeave: false,
      leaveId: null,
      durationMinutes,
      tripStartTime: startTimeStr,
      tripEndTime: boundaryCheck.tripEndTimeStr,
      boundaryCheck,
      reason: boundaryCheck.isOverrun
        ? `${boundaryCheck.warningMessage} Preserved explicit historical schedule driver.`
        : "Explicit historical/manual schedule driver preserved per backward-compatibility rules.",
    });
  }

  // 6. Check Bus Assignment
  if (!bus && !schedule.bus_id) {
    return formatOutput({
      success: true,
      status: RESOLVER_STATUS.NO_ASSIGNED_DRIVER,
      substatus: RESOLVER_SUBSTATUS.UNASSIGNED_BUS,
      driverId: null,
      driverName: "Not Assigned",
      driverPhone: "N/A",
      driverEmail: "",
      shift,
      shiftKey,
      serviceDate: serviceDateStr,
      isReplacement: false,
      replacementDutyId: null,
      originalDriverId: null,
      originalDriverName: null,
      isOnLeave: false,
      leaveId: null,
      durationMinutes,
      tripStartTime: startTimeStr,
      tripEndTime: boundaryCheck.tripEndTimeStr,
      boundaryCheck,
      reason: "No bus assigned to this departure schedule.",
    });
  }

  const busDoc = bus || {};
  const busShifts = busDoc.shifts || {};
  const shiftRosterDriver = busShifts[shiftKey];
  const busNumber = busDoc.busNumber || schedule.busNumber || "Bus";
  const busId = busDoc._id || schedule.bus_id;

  // 7. Check if Regular Shift Driver is Configured in Roster
  const hasRosterDriver = Boolean(
    shiftRosterDriver &&
    shiftRosterDriver.driverId &&
    !isGenericDriverName(shiftRosterDriver.driverName)
  );

  // If no regular shift driver is assigned in the 3-shift roster:
  // NEVER fall back to legacy Bus.driverId or Bus.driverName for new roster assignments!
  if (!hasRosterDriver) {
    return formatOutput({
      success: true,
      status: RESOLVER_STATUS.NO_ASSIGNED_DRIVER,
      substatus: RESOLVER_SUBSTATUS.UNASSIGNED_SHIFT_ROSTER,
      driverId: null,
      driverName: "Not Assigned",
      driverPhone: "N/A",
      driverEmail: "",
      shift,
      shiftKey,
      serviceDate: serviceDateStr,
      isReplacement: false,
      replacementDutyId: null,
      originalDriverId: null,
      originalDriverName: null,
      isOnLeave: false,
      leaveId: null,
      durationMinutes,
      tripStartTime: startTimeStr,
      tripEndTime: boundaryCheck.tripEndTimeStr,
      boundaryCheck,
      reason: `No regular driver assigned to ${shift} shift on Bus ${busNumber}.`,
    });
  }

  const regularDriverId = String(shiftRosterDriver.driverId);
  const regularDriverName = shiftRosterDriver.driverName;

  // 8. Check Driver Leave
  const activeLeave = findOverlappingApprovedLeave(regularDriverId, params.driverLeaves, tripInterval);

  // 9. Check Driver Replacement
  const validReplacement = findValidReplacementDuty({
    busId,
    busNumber,
    shift,
    dutyDate: serviceDateStr,
    replacements: params.driverReplacements,
    tripInterval,
  });

  // CASE A: Driver is on approved leave
  if (activeLeave) {
    // Sub-case A1: A verified, active replacement driver is assigned
    if (validReplacement) {
      // Re-verify that replacement driver is not also on approved leave
      const repDriverOnLeave = findOverlappingApprovedLeave(
        validReplacement.replacementDriverId,
        params.driverLeaves,
        tripInterval
      );

      if (repDriverOnLeave) {
        return formatOutput({
          success: false,
          status: RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED,
          substatus: RESOLVER_SUBSTATUS.REPLACEMENT_DRIVER_ON_LEAVE,
          driverId: null,
          driverName: "Not Assigned (Replacement Driver On Leave)",
          driverPhone: "N/A",
          driverEmail: "",
          shift,
          shiftKey,
          serviceDate: serviceDateStr,
          isReplacement: true,
          replacementDutyId: String(validReplacement._id || ""),
          originalDriverId: regularDriverId,
          originalDriverName: regularDriverName,
          isOnLeave: true,
          leaveId: String(activeLeave._id || ""),
          durationMinutes,
          tripStartTime: startTimeStr,
          tripEndTime: boundaryCheck.tripEndTimeStr,
          boundaryCheck,
          reason: `Designated replacement driver is also on approved leave (${repDriverOnLeave.leaveType} on ${repDriverOnLeave.leaveDate}).`,
        });
      }

      return formatOutput({
        success: true,
        status: RESOLVER_STATUS.VALID_REPLACEMENT_DRIVER,
        substatus: overrunSubstatus || RESOLVER_SUBSTATUS.REPLACEMENT_ASSIGNED,
        driverId: String(validReplacement.replacementDriverId),
        driverName: validReplacement.replacementDriverName || "Replacement Driver",
        driverPhone: validReplacement.replacementDriverPhone || "N/A",
        driverEmail: validReplacement.replacementDriverEmail || "",
        shift,
        shiftKey,
        serviceDate: serviceDateStr,
        isReplacement: true,
        replacementDutyId: String(validReplacement._id || ""),
        originalDriverId: regularDriverId,
        originalDriverName: regularDriverName,
        isOnLeave: true,
        leaveId: String(activeLeave._id || ""),
        durationMinutes,
        tripStartTime: startTimeStr,
        tripEndTime: boundaryCheck.tripEndTimeStr,
        boundaryCheck,
        reason: boundaryCheck.isOverrun
          ? `${boundaryCheck.warningMessage} Temporary replacement driver ${validReplacement.replacementDriverName} active for regular driver on approved leave.`
          : `Temporary replacement driver ${validReplacement.replacementDriverName} active for regular driver ${regularDriverName} on approved leave.`,
      });
    }

    // Sub-case A2: Regular driver is on approved leave without a valid replacement
    return formatOutput({
      success: false,
      status: RESOLVER_STATUS.DRIVER_ON_LEAVE_UNREPLACED,
      substatus: RESOLVER_SUBSTATUS.DRIVER_ON_APPROVED_LEAVE,
      driverId: null,
      driverName: "Not Assigned (Driver on Approved Leave)",
      driverPhone: "N/A",
      driverEmail: "",
      shift,
      shiftKey,
      serviceDate: serviceDateStr,
      isReplacement: false,
      replacementDutyId: null,
      originalDriverId: regularDriverId,
      originalDriverName: regularDriverName,
      isOnLeave: true,
      leaveId: String(activeLeave._id || ""),
      durationMinutes,
      tripStartTime: startTimeStr,
      tripEndTime: boundaryCheck.tripEndTimeStr,
      boundaryCheck,
      reason: `Regular driver ${regularDriverName} is on approved leave (${activeLeave.leaveType} on ${activeLeave.leaveDate}) and no replacement driver is assigned.`,
    });
  }

  // CASE B: An active replacement was assigned even without leave overlap (administrative substitute)
  if (validReplacement) {
    return formatOutput({
      success: true,
      status: RESOLVER_STATUS.VALID_REPLACEMENT_DRIVER,
      substatus: overrunSubstatus || RESOLVER_SUBSTATUS.REPLACEMENT_ASSIGNED,
      driverId: String(validReplacement.replacementDriverId),
      driverName: validReplacement.replacementDriverName || "Replacement Driver",
      driverPhone: validReplacement.replacementDriverPhone || "N/A",
      driverEmail: validReplacement.replacementDriverEmail || "",
      shift,
      shiftKey,
      serviceDate: serviceDateStr,
      isReplacement: true,
      replacementDutyId: String(validReplacement._id || ""),
      originalDriverId: regularDriverId,
      originalDriverName: regularDriverName,
      isOnLeave: false,
      leaveId: null,
      durationMinutes,
      tripStartTime: startTimeStr,
      tripEndTime: boundaryCheck.tripEndTimeStr,
      boundaryCheck,
      reason: boundaryCheck.isOverrun
        ? `${boundaryCheck.warningMessage} Substitute replacement driver ${validReplacement.replacementDriverName} active.`
        : `Substitute replacement driver ${validReplacement.replacementDriverName} active for ${shift} shift on Bus ${busNumber}.`,
    });
  }

  // CASE C: Regular roster driver is available and ready for duty
  return formatOutput({
    success: true,
    status: RESOLVER_STATUS.ASSIGNED_REGULAR_DRIVER,
    substatus: overrunSubstatus || RESOLVER_SUBSTATUS.MATCH_SUCCESS,
    driverId: regularDriverId,
    driverName: regularDriverName,
    driverPhone: shiftRosterDriver.driverPhone || "N/A",
    driverEmail: shiftRosterDriver.driverEmail || "",
    shift,
    shiftKey,
    serviceDate: serviceDateStr,
    isReplacement: false,
    replacementDutyId: null,
    originalDriverId: null,
    originalDriverName: null,
    isOnLeave: false,
    leaveId: null,
    durationMinutes,
    tripStartTime: startTimeStr,
    tripEndTime: boundaryCheck.tripEndTimeStr,
    boundaryCheck,
    reason: boundaryCheck.isOverrun
      ? `${boundaryCheck.warningMessage} Rostered ${shift} shift driver ${regularDriverName} assigned with overrun exception.`
      : `Rostered ${shift} shift driver ${regularDriverName} is available and assigned.`,
  });
}

module.exports = {
  SHIFT_POLICY_CONFIG,
  PASSENGER_ASSIGNMENT_STATUS,
  TRIP_START_STATUS,
  RESOLVER_STATUS,
  RESOLVER_SUBSTATUS,
  isGenericDriverName,
  parseDurationStringToMinutes,
  extractTripDurationMinutes,
  formatTime12h,
  resolveOperationalServiceDate,
  validateTripShiftBoundary,
  findOverlappingApprovedLeave,
  findValidReplacementDuty,
  buildPassengerView,
  buildTripStartEligibility,
  resolveEffectiveDepartureDriver,
};
