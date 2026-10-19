/**
 * MoveSmart Transit - Shift, Overnight & Leave Conflict Helper
 * 
 * Accurately models Morning, Evening, and Overnight (Night) shifts as continuous time intervals [start, end).
 * Supports midnight-crossing overnight shifts (+1 day) and multi-day leave intervals.
 */

const SHIFT_TYPES = Object.freeze({
  MORNING: "Morning",
  EVENING: "Evening",
  NIGHT: "Night",
});

const SHIFT_DEFAULT_HOURS = Object.freeze({
  [SHIFT_TYPES.MORNING]: { startHour: 6, startMinute: 0, endHour: 14, endMinute: 0, crossesMidnight: false },
  [SHIFT_TYPES.EVENING]: { startHour: 14, startMinute: 0, endHour: 22, endMinute: 0, crossesMidnight: false },
  [SHIFT_TYPES.NIGHT]: { startHour: 22, startMinute: 0, endHour: 6, endMinute: 0, crossesMidnight: true },
});

/**
 * Parse time string (e.g. "08:30 AM", "14:00", "10:00 PM") to { hour: 0-23, minute: 0-59 }
 */
function parseTimeString(timeStr) {
  if (!timeStr || typeof timeStr !== "string") {
    return { hour: 8, minute: 0 };
  }
  const clean = timeStr.trim();
  const ampmMatch = clean.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)?$/i);
  if (ampmMatch) {
    let hour = parseInt(ampmMatch[1], 10);
    const minute = parseInt(ampmMatch[2], 10);
    const meridiem = (ampmMatch[3] || "").toUpperCase();
    if (meridiem === "PM" && hour < 12) hour += 12;
    if (meridiem === "AM" && hour === 12) hour = 0;
    return { hour: Math.min(Math.max(hour, 0), 23), minute: Math.min(Math.max(minute, 0), 59) };
  }
  return { hour: 8, minute: 0 };
}

/**
 * Infer shift from departure start time string.
 * - 06:00 to 13:59 -> Morning
 * - 14:00 to 21:59 -> Evening
 * - 22:00 to 05:59 -> Night (Overnight)
 */
function inferShiftFromTime(startTimeStr) {
  const { hour } = parseTimeString(startTimeStr);
  if (hour >= 6 && hour < 14) return SHIFT_TYPES.MORNING;
  if (hour >= 14 && hour < 22) return SHIFT_TYPES.EVENING;
  return SHIFT_TYPES.NIGHT;
}

/**
 * Normalizes date string into YYYY-MM-DD
 */
function normalizeDateStr(dateInput) {
  if (!dateInput) return new Date().toISOString().split("T")[0];
  if (dateInput instanceof Date) return dateInput.toISOString().split("T")[0];
  const str = String(dateInput).trim();
  if (str.match(/^\d{4}-\d{2}-\d{2}$/)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return str;
}

/**
 * Adds days to a Date object safely
 */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Computes exact start and end Date objects for a duty on a given date and shift.
 * Handles overnight shifts that start on dateStr at 22:00 and end on dateStr+1 at 06:00.
 */
function getDutyInterval(dateStr, shift = SHIFT_TYPES.MORNING, customStart = null, customEnd = null) {
  const cleanDate = normalizeDateStr(dateStr);
  const [year, month, day] = cleanDate.split("-").map((n) => parseInt(n, 10));

  const validShift = Object.values(SHIFT_TYPES).includes(shift) ? shift : inferShiftFromTime(customStart || "08:00 AM");
  const shiftConfig = SHIFT_DEFAULT_HOURS[validShift] || SHIFT_DEFAULT_HOURS[SHIFT_TYPES.MORNING];

  let startHour = shiftConfig.startHour;
  let startMinute = shiftConfig.startMinute;
  let endHour = shiftConfig.endHour;
  let endMinute = shiftConfig.endMinute;
  let crossesMidnight = shiftConfig.crossesMidnight;

  if (customStart) {
    const parsedStart = parseTimeString(customStart);
    startHour = parsedStart.hour;
    startMinute = parsedStart.minute;
  }

  if (customEnd) {
    const parsedEnd = parseTimeString(customEnd);
    endHour = parsedEnd.hour;
    endMinute = parsedEnd.minute;
    // Determine if custom end crosses midnight
    if (endHour < startHour || (endHour === startHour && endMinute < startMinute)) {
      crossesMidnight = true;
    }
  }

  const startDateTime = new Date(year, month - 1, day, startHour, startMinute, 0, 0);
  let endDateTime = new Date(year, month - 1, day, endHour, endMinute, 0, 0);

  if (crossesMidnight) {
    endDateTime = addDays(endDateTime, 1);
  }

  return {
    shift: validShift,
    dateStr: cleanDate,
    startDateTime,
    endDateTime,
    crossesMidnight,
    durationHours: (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60 * 60),
  };
}

/**
 * Returns continuous time interval(s) for a leave application.
 * Supports Full Day, Half Day (AM / PM), Shift-specific leave, and multi-day spans.
 */
function getLeaveIntervals(leaveDoc) {
  const startDateStr = normalizeDateStr(leaveDoc.leaveDate || leaveDoc.leaveStartDate || leaveDoc.date);
  const endDateStr = normalizeDateStr(leaveDoc.leaveEndDate || leaveDoc.endDate || startDateStr);

  const [sYear, sMonth, sDay] = startDateStr.split("-").map((n) => parseInt(n, 10));
  const [eYear, eMonth, eDay] = endDateStr.split("-").map((n) => parseInt(n, 10));

  const leaveType = leaveDoc.leaveType || "";
  const halfDaySlot = leaveDoc.halfDaySlot || "N/A";
  const shiftSlot = leaveDoc.shiftSlot || "";

  const intervals = [];

  // 1. Check specific shift or half-day slot first if specified
  if (shiftSlot === SHIFT_TYPES.MORNING || halfDaySlot === "Forenoon (AM)") {
    const start = new Date(sYear, sMonth - 1, sDay, 6, 0, 0, 0);
    const end = new Date(sYear, sMonth - 1, sDay, 14, 0, 0, 0);
    intervals.push({
      startDateTime: start,
      endDateTime: end,
      slot: SHIFT_TYPES.MORNING,
    });
  } else if (shiftSlot === SHIFT_TYPES.EVENING || halfDaySlot === "Afternoon (PM)") {
    const start = new Date(sYear, sMonth - 1, sDay, 14, 0, 0, 0);
    const end = new Date(sYear, sMonth - 1, sDay, 22, 0, 0, 0);
    intervals.push({
      startDateTime: start,
      endDateTime: end,
      slot: SHIFT_TYPES.EVENING,
    });
  } else if (shiftSlot === SHIFT_TYPES.NIGHT) {
    const start = new Date(sYear, sMonth - 1, sDay, 22, 0, 0, 0);
    const end = new Date(sYear, sMonth - 1, sDay + 1, 6, 0, 0, 0);
    intervals.push({
      startDateTime: start,
      endDateTime: end,
      slot: SHIFT_TYPES.NIGHT,
    });
  } else {
    // 2. Default: Single or Multi-day Full Day interval
    const start = new Date(sYear, sMonth - 1, sDay, 0, 0, 0, 0);
    const end = new Date(eYear, eMonth - 1, eDay, 23, 59, 59, 999);
    intervals.push({
      startDateTime: start,
      endDateTime: end,
      slot: "Full Day",
    });
  }

  return intervals;
}

/**
 * Checks if two time intervals [S1, E1) and [S2, E2) overlap.
 * Rule: max(S1, S2) < min(E1, E2)
 */
function doIntervalsOverlap(start1, end1, start2, end2) {
  const s1 = new Date(start1).getTime();
  const e1 = new Date(end1).getTime();
  const s2 = new Date(start2).getTime();
  const e2 = new Date(end2).getTime();

  if (isNaN(s1) || isNaN(e1) || isNaN(s2) || isNaN(e2)) return false;
  return s1 < e2 && s2 < e1;
}

module.exports = {
  SHIFT_TYPES,
  SHIFT_DEFAULT_HOURS,
  parseTimeString,
  inferShiftFromTime,
  normalizeDateStr,
  getDutyInterval,
  getLeaveIntervals,
  doIntervalsOverlap,
};
