const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const Booking = require("../models/Booking");
const BusDailySeat = require("../models/BusDailySeat");
const Route = require("../models/Route");
const Schedule = require("../models/Schedule");
const User = require("../models/User");
const TripSession = require("../models/TripSession");
const DriverLeave = require("../models/DriverLeave");
const DriverReplacement = require("../models/DriverReplacement");
const { protect, adminOnly } = require("../middleware/authMiddleware");
const {
  resolveEffectiveDepartureDriver,
  PASSENGER_ASSIGNMENT_STATUS,
} = require("../utils/effectiveDriverResolver");
const { getActiveBusLocation, setActiveBusLocation, getAllActiveBusLocations } = require("../services/socketService");

// Helper to extract stations/stops list from doc
const extractStopsFromDoc = (doc) => {
  if (Array.isArray(doc.stops) && doc.stops.length > 0) {
    return doc.stops.map((s) => {
      if (typeof s === "object" && s !== null) {
        return String(s.name || s.stopName || s.station || s.stop || "").trim();
      }
      return String(s).trim();
    }).filter(Boolean);
  }
  if (Array.isArray(doc.route) && doc.route.length > 0) {
    return doc.route.map((s) => String(s).trim()).filter(Boolean);
  }
  const scheduleStations = [];
  if (Array.isArray(doc.schedule)) {
    doc.schedule.forEach((trip) => {
      if (Array.isArray(trip.stations)) {
        trip.stations.forEach((st) => {
          const name = st.station || st.name;
          if (name) scheduleStations.push(String(name).trim());
        });
      }
    });
  }
  if (scheduleStations.length > 0) {
    return Array.from(new Set(scheduleStations));
  }
  const locs = [];
  if (doc.fromLocation) locs.push(String(doc.fromLocation).trim());
  if (doc.toLocation) locs.push(String(doc.toLocation).trim());
  return locs;
};

// Add minutes to AM/PM time string
const addMinutesToTimeStr = (baseTimeStr, minutesToAdd = 0) => {
  if (!baseTimeStr) return "08:00 AM";
  const cleanStr = String(baseTimeStr).trim().toUpperCase();
  const isPM = cleanStr.includes("PM");
  const isAM = cleanStr.includes("AM");
  const match = cleanStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return baseTimeStr;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  const totalMins = (hours * 60 + minutes + (Number(minutesToAdd) || 0) + 14400) % 1440;
  const hours24 = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  return `${hours12.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${period}`;
};

const calculateDurationMins = (startMinutes, endMinutes) => {
  const diff = Math.max(0, (Number(endMinutes) || 0) - (Number(startMinutes) || 0));
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
};

// Convert "08:00 AM", "02:30 PM", "14:15" to total minutes from midnight
const parseTimeStrToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const cleanStr = String(timeStr).trim().toUpperCase();
  const isPM = cleanStr.includes("PM");
  const isAM = cleanStr.includes("AM");
  const match = cleanStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return 0;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  return hours * 60 + minutes;
};

// Get current date and minute offset in Indian Standard Time (IST / UTC+5:30)
const getCurrentISTInfo = () => {
  const now = new Date();
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000;
  const istDate = new Date(utcMs + 5.5 * 3600000);
  const currentMinutes = istDate.getHours() * 60 + istDate.getMinutes();
  const dateStr = istDate.toISOString().split("T")[0];
  return { now, istDate, currentMinutes, dateStr };
};

/**
 * Validates whether a bus has a valid, active route assignment.
 * Checks:
 * 1. Direct bus.route_id pointing to an existing, non-suspended Route.
 * 2. Active Schedule linking bus_id or busNumber to an existing, non-suspended Route.
 * 3. Active TripSession on an existing, non-suspended Route.
 * Returns { isValid, route, schedule, reason }.
 */
const validateBusRouteAssignment = async (bus) => {
  if (!bus) {
    return { isValid: false, route: null, reason: "Bus does not exist." };
  }

  // 1. Direct route_id on Bus
  const directRouteId = bus.route_id || bus.routeId;
  if (directRouteId) {
    let route = null;
    if (mongoose.Types.ObjectId.isValid(directRouteId)) {
      route = await Route.findById(directRouteId).lean();
    }
    if (!route && typeof directRouteId === "string") {
      route = await Route.findOne({
        $or: [{ routeId: directRouteId }, { routeName: directRouteId }],
      }).lean();
    }

    if (route) {
      if (route.status === "Suspended") {
        return { isValid: false, route: null, reason: "The assigned route for this bus is currently suspended." };
      }
      return { isValid: true, route, reason: null };
    } else {
      return { isValid: false, route: null, reason: "This bus references a route that does not exist or has been deleted." };
    }
  }

  // 2. Active Schedule for this bus
  const busQuery = [];
  if (bus._id && mongoose.Types.ObjectId.isValid(bus._id)) {
    busQuery.push({ bus_id: bus._id });
  }
  if (bus.busNumber) {
    busQuery.push({ busNumber: bus.busNumber });
  }

  if (busQuery.length > 0) {
    const schedules = await Schedule.find({
      $or: busQuery,
      is_active: { $ne: false },
    }).populate("route_id").lean();

    for (const sch of schedules) {
      const schRoute = sch.route_id;
      if (schRoute && schRoute.status !== "Suspended") {
        return { isValid: true, route: schRoute, schedule: sch, reason: null };
      }
    }

    if (schedules.length > 0) {
      return { isValid: false, route: null, reason: "The scheduled route for this bus does not exist or is suspended." };
    }
  }

  // 3. Active TripSession
  if (bus._id || bus.busNumber) {
    const activeTrip = await TripSession.findOne({
      $or: [
        { busId: bus._id, status: { $in: ["ACTIVE", "PAUSED"] } },
        { busNumber: bus.busNumber, status: { $in: ["ACTIVE", "PAUSED"] } },
      ],
    }).populate("routeId").lean();

    if (activeTrip && activeTrip.routeId && activeTrip.routeId.status !== "Suspended") {
      return { isValid: true, route: activeTrip.routeId, trip: activeTrip, reason: null };
    }
  }

  return { isValid: false, route: null, reason: "This bus has no assigned route." };
};

/**
 * 5-Minute Pre-Departure & Trip Start Booking Cutoff Evaluator:
 * Enforces:
 * 1. Admin Setting: bookingEnabled must be true (default false).
 * 2. Drive Started: If active TripSession exists for this bus, booking closes immediately.
 * 3. 5-Minute Cutoff: Booking closes strictly 5 minutes before scheduled takeoff from the main station.
 */
const evaluateBusBookingCutoff = ({
  bus = {},
  schedule = null,
  activeTripsMap = new Map(),
  serviceDate = "",
}) => {
  const { currentMinutes, dateStr: todayIST } = getCurrentISTInfo();
  const targetDate = serviceDate && typeof serviceDate === "string" && serviceDate.trim().match(/^\d{4}-\d{2}-\d{2}$/)
    ? serviceDate.trim()
    : todayIST;

  const busIdStr = bus?._id ? String(bus._id) : "";
  const busNumClean = (bus?.busNumber || schedule?.busNumber || "").trim().toUpperCase();

  // 1. Strict Rule: Bus ONLY has online booking if Admin explicitly gave/enabled it!
  const isBookingGivenByAdmin = bus && bus.bookingEnabled !== undefined
    ? bus.bookingEnabled === true
    : (schedule ? schedule.bookingEnabled === true : false);
  if (!isBookingGivenByAdmin) {
    return {
      bookingEnabled: false,
      isBookingOpen: false,
      bookingStatus: "DISABLED_BY_ADMIN",
      bookingStatusLabel: "Walk-in Only",
      bookingStatusReason: "Online booking option has not been enabled by Administrator for this bus (Walk-in / Counter ticketing only).",
      bookingCloseTime: "Walk-in Only",
      minutesUntilDeparture: null,
      minutesUntilCutoff: null,
      tripStarted: false,
      activeTripId: null,
    };
  }

  // 2. Check if Drive has started (Active TripSession)
  let activeTrip = null;
  if (busIdStr && activeTripsMap.has(busIdStr)) {
    activeTrip = activeTripsMap.get(busIdStr);
  } else if (busNumClean && activeTripsMap.has(busNumClean)) {
    activeTrip = activeTripsMap.get(busNumClean);
  }

  if (activeTrip) {
    return {
      bookingEnabled: true,
      isBookingOpen: false,
      bookingStatus: "CLOSED_DRIVE_STARTED",
      bookingStatusLabel: "Drive Started",
      bookingStatusReason: "Drive has already started from the main station. Online booking is closed.",
      bookingCloseTime: "Trip In Transit",
      minutesUntilDeparture: 0,
      minutesUntilCutoff: 0,
      tripStarted: true,
      activeTripId: activeTrip.tripSessionId || activeTrip._id,
    };
  }

  // Determine main station departure time
  const departureTime = schedule?.start_time || bus?.departureTime || "08:00 AM";
  const departureMinutes = parseTimeStrToMinutes(departureTime);
  const cutoffMinutes = departureMinutes - 5;
  const bookingCloseTime = addMinutesToTimeStr(departureTime, -5);

  const isPastDate = targetDate < todayIST;
  const isFutureDate = targetDate > todayIST;

  if (isPastDate) {
    return {
      bookingEnabled: true,
      isBookingOpen: false,
      bookingStatus: "DATE_PASSED",
      bookingStatusLabel: "Trip Expired",
      bookingStatusReason: "The scheduled service date has already passed.",
      bookingCloseTime,
      minutesUntilDeparture: null,
      minutesUntilCutoff: null,
      tripStarted: false,
      activeTripId: null,
    };
  }

  if (isFutureDate) {
    return {
      bookingEnabled: true,
      isBookingOpen: true,
      bookingStatus: "OPEN",
      bookingStatusLabel: "Booking Open",
      bookingStatusReason: `Advance booking open for ${targetDate}. Closes 5 mins before departure (at ${bookingCloseTime}).`,
      bookingCloseTime,
      minutesUntilDeparture: null,
      minutesUntilCutoff: null,
      tripStarted: false,
      activeTripId: null,
    };
  }

  // Target date is Today! Enforce 5-minute pre-departure takeoff rule
  const minutesUntilDeparture = departureMinutes - currentMinutes;
  const minutesUntilCutoff = cutoffMinutes - currentMinutes;

  if (minutesUntilCutoff <= 0) {
    return {
      bookingEnabled: true,
      isBookingOpen: false,
      bookingStatus: "CLOSED_5MIN_CUTOFF",
      bookingStatusLabel: "Booking Closed (< 5m)",
      bookingStatusReason: `Booking closed: Bus takes off from main station in ${Math.max(0, minutesUntilDeparture)} mins (Closed at ${bookingCloseTime}).`,
      bookingCloseTime,
      minutesUntilDeparture: Math.max(0, minutesUntilDeparture),
      minutesUntilCutoff: 0,
      tripStarted: false,
      activeTripId: null,
    };
  }

  // Booking is OPEN!
  return {
    bookingEnabled: true,
    isBookingOpen: true,
    bookingStatus: "OPEN",
    bookingStatusLabel: "Booking Open",
    bookingStatusReason: `Online booking open until ${bookingCloseTime} (5 mins before takeoff from main station).`,
    bookingCloseTime,
    minutesUntilDeparture,
    minutesUntilCutoff,
    tripStarted: false,
    activeTripId: null,
  };
};

// Generate comprehensive station timetable with computed arrival and departure times
const generateStationTimetable = (routeObj, baseStartTime = "08:00 AM") => {
  const structuredStops = Array.isArray(routeObj.stops) && routeObj.stops.length > 0 ? routeObj.stops : [];
  const stations = [];

  if (structuredStops.length > 0) {
    let cumulative = 0;
    structuredStops.forEach((st, idx) => {
      const name = String(
        typeof st === "string"
          ? st
          : (st?.stopName || st?.name || st?.stop || st?.station || `Stop ${idx + 1}`)
      ).trim();
      let travelFromPrev = 0;
      if (idx > 0) {
        if (typeof st === "object" && st !== null && st.travel_time_from_prev !== undefined && st.travel_time_from_prev !== null && st.travel_time_from_prev > 0) {
          travelFromPrev = Number(st.travel_time_from_prev);
        } else if (typeof st === "object" && st !== null && st.offset_minutes !== undefined && st.offset_minutes !== null && st.offset_minutes > cumulative) {
          travelFromPrev = Number(st.offset_minutes) - cumulative;
        } else {
          travelFromPrev = 20;
        }
      }
      cumulative += travelFromPrev;

      const arrOffset = cumulative;
      const depOffset = idx === structuredStops.length - 1 ? cumulative : (cumulative + (idx === 0 ? 0 : 2));

      const arrTime = idx === 0 ? "--" : addMinutesToTimeStr(baseStartTime, arrOffset);
      const depTime = idx === structuredStops.length - 1 ? "--" : addMinutesToTimeStr(baseStartTime, depOffset);

      stations.push({
        id: idx,
        stop_id: (typeof st === "object" && st !== null && st.stop_id) ? st.stop_id : null,
        station: name,
        name: name,
        order: idx + 1,
        arrivalTime: arrTime,
        departureTime: depTime,
        offset_minutes: cumulative,
        travel_time_from_prev: travelFromPrev,
        isStart: idx === 0,
        isEnd: idx === structuredStops.length - 1,
        halt: idx === 0 ? "Origin Terminal" : idx === structuredStops.length - 1 ? "Final Terminus" : "2 mins halt",
        platform: `Platform ${(idx % 4) + 1}`,
        type: idx === 0 ? "Starting Location" : idx === structuredStops.length - 1 ? "Ending Location" : "Intermediate Station",
        facilities: ["Waiting Room", "Ticket Counter", "IoT Live Feed"],
      });
    });
  } else {
    // Fallback if stops array is plain strings
    const stopNames = extractStopsFromDoc(routeObj);
    const totalStops = Math.max(stopNames.length, 2);
    const defaultGap = Math.max(15, Math.floor(180 / (totalStops - 1 || 1)));
    let cumulative = 0;

    stopNames.forEach((name, idx) => {
      const travelFromPrev = idx === 0 ? 0 : defaultGap;
      cumulative += travelFromPrev;
      const arrTime = idx === 0 ? "--" : addMinutesToTimeStr(baseStartTime, cumulative);
      const depTime = idx === stopNames.length - 1 ? "--" : addMinutesToTimeStr(baseStartTime, cumulative + (idx === 0 ? 0 : 2));

      stations.push({
        id: idx,
        station: name,
        name: name,
        order: idx + 1,
        arrivalTime: arrTime,
        departureTime: depTime,
        offset_minutes: cumulative,
        travel_time_from_prev: travelFromPrev,
        isStart: idx === 0,
        isEnd: idx === stopNames.length - 1,
        halt: idx === 0 ? "Origin Terminal" : idx === stopNames.length - 1 ? "Final Terminus" : "2 mins halt",
        platform: `Platform ${(idx % 4) + 1}`,
        type: idx === 0 ? "Starting Location" : idx === stopNames.length - 1 ? "Ending Location" : "Intermediate Station",
        facilities: ["Waiting Room", "Ticket Counter", "IoT Live Feed"],
      });
    });
  }

  const lastStation = stations[stations.length - 1];
  const totalOffset = lastStation ? lastStation.offset_minutes : 180;
  const arrivalTime = addMinutesToTimeStr(baseStartTime, totalOffset);
  const duration = calculateDurationMins(0, totalOffset);

  return {
    stations,
    departureTime: baseStartTime,
    arrivalTime,
    total_duration_minutes: totalOffset,
    duration,
  };
};

// Normalize Noise Words for Accurate Location Matching
const NOISE_WORDS = new Set([
  "bus", "stand", "stop", "sub-stop", "substop", "sub", "junction", "jn", "terminal",
  "station", "stn", "road", "rd", "bypass", "kerala", "route", "ksrtc", "depot", "point"
]);

const cleanLocationTokens = (str) => {
  if (!str) return [];
  return String(str)
    .toLowerCase()
    .replace(/[()\/,-]/g, " ")
    .replace(/[^a-z0-9\s]/gi, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w && !NOISE_WORDS.has(w));
};

const normalizeLocationName = (str) => {
  if (!str) return "";
  return cleanLocationTokens(str).join(" ");
};

// Accurate location string matching (prevents false positive substring matches while supporting natural station variations)
const matchLocationStr = (locationInDB, searchQuery) => {
  if (!searchQuery) return true;
  const rawDb = String(locationInDB || "").trim().toLowerCase();
  const rawQ = String(searchQuery || "").trim().toLowerCase();
  if (!rawDb || !rawQ) return false;

  // 1. Direct exact match
  if (rawDb === rawQ) return true;

  // Direct substring match for simple queries
  if (rawDb.includes(rawQ) || rawQ.includes(rawDb)) return true;

  const dbNorm = normalizeLocationName(locationInDB);
  const qNorm = normalizeLocationName(searchQuery);

  if (dbNorm && qNorm) {
    if (dbNorm === qNorm) return true;
    if (dbNorm.includes(qNorm) || qNorm.includes(dbNorm)) return true;
  }

  const dbTokens = cleanLocationTokens(locationInDB);
  const qTokens = cleanLocationTokens(searchQuery);

  if (dbTokens.length === 0 || qTokens.length === 0) {
    return rawDb.includes(rawQ) || rawQ.includes(rawDb);
  }

  // Direct token string match
  if (dbTokens.join(" ") === qTokens.join(" ")) return true;

  // Check if all query tokens exist in DB tokens (e.g. query "Kanjirappally" in "Kanjirappally Central")
  const allQTokensInDb = qTokens.every((qt) =>
    dbTokens.some((dt) => dt === qt || (dt.length >= 3 && qt.length >= 3 && (dt.includes(qt) || qt.includes(dt))))
  );
  if (allQTokensInDb) return true;

  // Check if all DB tokens exist in query tokens (e.g. DB "Kanjirappally" in query "Kanjirappally Bus Stand")
  const allDbTokensInQ = dbTokens.every((dt) =>
    qTokens.some((qt) => qt === dt || (dt.length >= 3 && qt.length >= 3 && (dt.includes(qt) || qt.includes(dt))))
  );
  if (allDbTokensInQ) return true;

  return false;
};

// Normalize any bus object (from Bus collection or Route.buses)
const normalizeBusDocument = (
  doc,
  parentRoute = null,
  driverUserMap = new Map(),
  routeList = [],
  cleanDate = "",
  driverReplacements = [],
  driverLeaves = [],
  activeTripsMap = new Map()
) => {
  const busNumber =
    doc.busNumber ||
    doc.vehicleNumber ||
    doc["Vehicle Number"] ||
    (doc._id ? `MS-${String(doc._id).substring(18).toUpperCase()}` : "KL-01-MS-1001");

  let stops = extractStopsFromDoc(doc);

  if (stops.length <= 2 && routeList.length > 0) {
    const matchedRoute = routeList.find((r) => {
      if (doc.routeId && (r.routeId === doc.routeId || String(r._id) === String(doc.routeId))) return true;
      if (doc.fromLocation && doc.toLocation && r.fromLocation && r.toLocation) {
        return (
          matchLocationStr(r.fromLocation, doc.fromLocation) &&
          matchLocationStr(r.toLocation, doc.toLocation)
        );
      }
      return false;
    });

    if (matchedRoute) {
      const routeStops = extractStopsFromDoc(matchedRoute);
      if (routeStops.length > stops.length) {
        stops = routeStops;
      }
    }
  }

  const fromLocation =
    (parentRoute?.fromLocation) ||
    (doc.fromLocation && doc.fromLocation !== "Depot" && doc.fromLocation !== "Origin" ? doc.fromLocation : "") ||
    (stops.length > 0 ? stops[0] : "");
  const toLocation =
    (parentRoute?.toLocation) ||
    (doc.toLocation && doc.toLocation !== "Depot" && doc.toLocation !== "Destination" ? doc.toLocation : "") ||
    (stops.length > 1 ? stops[stops.length - 1] : stops.length === 1 ? stops[0] : "");

  const departureTime = doc.departureTime || doc.start_time || "08:00 AM";
  const timetable = generateStationTimetable(parentRoute || doc, departureTime);

  const busType = doc.busType || doc.type || "Standard Route Transit";
  const operator = doc.operator || "MoveSmart Transit Ops";
  const price = doc.price || doc.fare || (stops.length > 1 ? stops.length * 35 + 40 : 150);
  const totalSeats = doc.totalSeats || 32;
  const availableSeats = doc.availableSeats !== undefined ? doc.availableSeats : 32;
  const rating = doc.rating || 4.8;
  const amenities = doc.amenities || ["Live Tracking", "Emergency Contact", "IoT Transit Feed"];
  const bookedSeats = doc.bookedSeats || [];
  const busName = (doc.busName && !doc.busName.includes("undefined"))
    ? doc.busName
    : (parentRoute ? parentRoute.routeName : `${fromLocation} ➔ ${toLocation}`);

  // Dynamic driver resolution: if bus has 3-shift roster configured, use effectiveDriverResolver
  let driverName = "Not Assigned";
  let assignmentStatus = PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING;
  let driverStatus = "Assignment Pending";
  let passengerView = null;
  let isReplacementDriver = false;
  let hasShiftOverrunException = false;
  let warningMessage = null;
  let resolvedShift = null;

  const hasConfiguredShifts = doc.shifts && (
    doc.shifts.morning || doc.shifts.evening || doc.shifts.night ||
    doc.shifts.Morning || doc.shifts.Evening || doc.shifts.Night
  );

  if (hasConfiguredShifts) {
    const effectiveServiceDate = cleanDate || new Date().toISOString().split("T")[0];
    const resolverResult = resolveEffectiveDepartureDriver({
      schedule: { start_time: departureTime, bus_id: doc._id, busNumber },
      bus: doc,
      route: parentRoute || { total_duration_minutes: timetable.total_duration_minutes },
      serviceDate: effectiveServiceDate,
      driverReplacements,
      driverLeaves,
    });

    assignmentStatus = resolverResult.passengerView.status;
    driverName = resolverResult.passengerView.driverName;
    resolvedShift = resolverResult.shift;
    passengerView = resolverResult.passengerView;
    isReplacementDriver = Boolean(resolverResult.isReplacement);
    hasShiftOverrunException = Boolean(resolverResult.hasShiftOverrunException);
    warningMessage = resolverResult.boundaryCheck?.warningMessage || null;

    if (assignmentStatus === PASSENGER_ASSIGNMENT_STATUS.ASSIGNED) {
      if (hasShiftOverrunException) {
        driverStatus = "Driver Assigned (Shift Boundary Warning)";
      } else if (isReplacementDriver) {
        driverStatus = "Driver Assigned (Replacement)";
      } else {
        driverStatus = "Driver Assigned";
      }
    } else if (assignmentStatus === PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED) {
      driverStatus = "Schedule Review Required";
    } else {
      driverStatus = "Assignment Pending";
    }
  } else {
    // Pure legacy bus document without shift roster: preserve explicit legacy bus driver
    const isGeneric = (n) => !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver", "not assigned"].includes(String(n).toLowerCase().trim());
    let rawName = doc.driverName;
    if (doc.driverId && driverUserMap.has(String(doc.driverId))) {
      const u = driverUserMap.get(String(doc.driverId));
      if (u && u.name) rawName = u.name;
    }
    driverName = !isGeneric(rawName) ? rawName : "Not Assigned";
    assignmentStatus = !isGeneric(rawName) ? PASSENGER_ASSIGNMENT_STATUS.ASSIGNED : PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING;
    driverStatus = assignmentStatus === PASSENGER_ASSIGNMENT_STATUS.ASSIGNED ? "Driver Assigned" : "Assignment Pending";
    passengerView = {
      status: assignmentStatus,
      busNumber,
      driverName,
      departureTime: timetable.departureTime,
      serviceDate: cleanDate || new Date().toISOString().split("T")[0],
      shift: null,
      statusReason: null,
    };
  }

  return {
    _id: doc._id || new mongoose.Types.ObjectId(),
    scheduleId: doc.scheduleId || null,
    busId: doc._id || null,
    busNumber,
    busName,
    busType,
    operator,
    fromLocation,
    toLocation,
    departureTime: timetable.departureTime,
    arrivalTime: timetable.arrivalTime,
    duration: timetable.duration,
    total_duration_minutes: timetable.total_duration_minutes,
    totalSeats,
    availableSeats,
    price,
    rating,
    amenities,
    bookedSeats,
    shift: resolvedShift,
    serviceDate: cleanDate || new Date().toISOString().split("T")[0],
    driverId: null, // Sanitized: Never leak internal User ObjectId to public
    driverName,
    driverPhone: doc.driverPhone || "",
    driverLicense: doc.driverLicense || "",
    assignmentStatus,
    driverStatus,
    isReplacementDriver,
    hasShiftOverrunException,
    warningMessage,
    driverPhoto: doc.driverPhoto || "",
    driverVerified: assignmentStatus === PASSENGER_ASSIGNMENT_STATUS.ASSIGNED,
    driverExperience: doc.driverExperience || 4,
    is_active: doc.is_active !== undefined ? doc.is_active : true,
    // Booking availability & 5-minute pre-departure takeoff status
    ...(() => {
      const cutoffEval = evaluateBusBookingCutoff({
        bus: doc,
        schedule: null,
        activeTripsMap,
        serviceDate: cleanDate,
      });
      return {
        bookingEnabled: cutoffEval.bookingEnabled,
        isBookingOpen: cutoffEval.isBookingOpen,
        bookingStatus: cutoffEval.bookingStatus,
        bookingStatusLabel: cutoffEval.bookingStatusLabel,
        bookingStatusReason: cutoffEval.bookingStatusReason,
        bookingCloseTime: cutoffEval.bookingCloseTime,
        minutesUntilDeparture: cutoffEval.minutesUntilDeparture,
        minutesUntilCutoff: cutoffEval.minutesUntilCutoff,
        tripStarted: cutoffEval.tripStarted,
        activeTripId: cutoffEval.activeTripId,
      };
    })(),
    passengerView,
    stops: timetable.stations.map((s) => s.name),
    route: timetable.stations.map((s) => s.name),
    schedule: [{ stations: timetable.stations }],
    // Sanitized: rawDoc omitted to prevent PII exposure (phone, email, license, driverId)
  };
};

// In-memory caching for sub-millisecond response times (keyed by service date)
const busCacheMap = new Map();
const CACHE_TTL_MS = 60000; // 60 seconds cache TTL (invalidated immediately on admin edits)

const invalidateBusCache = () => {
  busCacheMap.clear();
};

// Fallback seed buses for high availability when DB is temporarily lagging or reconnecting
const SEED_FALLBACK_BUSES = [
  {
    _id: "660000000000000000000001",
    busNumber: "KL-07-MS-1008",
    busName: "Kochi ➔ Trivandrum Express",
    busType: "AC Super Fast Transit",
    operator: "MoveSmart Transit Ops",
    fromLocation: "Kochi",
    toLocation: "Trivandrum",
    departureTime: "06:30 AM",
    arrivalTime: "11:30 AM",
    duration: "5h 0m",
    total_duration_minutes: 300,
    totalSeats: 36,
    availableSeats: 28,
    price: 380,
    rating: 4.9,
    amenities: ["Live Tracking", "Emergency Contact", "IoT Transit Feed", "WiFi", "USB Charging"],
    bookedSeats: [1, 2],
    driverName: "Suresh Kumar",
    driverPhone: "+91 98470 12345",
    driverLicense: "KL-07-2018-009876",
    driverPhoto: "",
    driverVerified: true,
    driverExperience: 7,
    is_active: true,
    stops: ["Kochi", "Alappuzha", "Kollam", "Attingal", "Trivandrum"],
    route: ["Kochi", "Alappuzha", "Kollam", "Attingal", "Trivandrum"],
    schedule: [{
      stations: [
        { id: 0, name: "Kochi", arrivalTime: "--", departureTime: "06:30 AM", halt: "Origin Terminal", platform: "Platform 1", offset_minutes: 0 },
        { id: 1, name: "Alappuzha", arrivalTime: "07:45 AM", departureTime: "07:50 AM", halt: "5 mins halt", platform: "Platform 2", offset_minutes: 75 },
        { id: 2, name: "Kollam", arrivalTime: "09:30 AM", departureTime: "09:35 AM", halt: "5 mins halt", platform: "Platform 1", offset_minutes: 180 },
        { id: 3, name: "Attingal", arrivalTime: "10:35 AM", departureTime: "10:40 AM", halt: "5 mins halt", platform: "Platform 3", offset_minutes: 245 },
        { id: 4, name: "Trivandrum", arrivalTime: "11:30 AM", departureTime: "--", halt: "Final Terminus", platform: "Platform 4", offset_minutes: 300 }
      ]
    }]
  },
  {
    _id: "660000000000000000000002",
    busNumber: "KL-08-MS-2044",
    busName: "Thrissur ➔ Kozhikode Silverline",
    busType: "Deluxe Semi-Sleeper",
    operator: "MoveSmart Transit Ops",
    fromLocation: "Thrissur",
    toLocation: "Kozhikode",
    departureTime: "08:15 AM",
    arrivalTime: "11:45 AM",
    duration: "3h 30m",
    total_duration_minutes: 210,
    totalSeats: 32,
    availableSeats: 22,
    price: 290,
    rating: 4.8,
    amenities: ["Live Tracking", "Air Suspension", "IoT Transit Feed"],
    bookedSeats: [5, 6],
    driverName: "Rajesh Varma",
    driverPhone: "+91 94471 67890",
    driverLicense: "KL-08-2016-004321",
    driverPhoto: "",
    driverVerified: true,
    driverExperience: 9,
    is_active: true,
    stops: ["Thrissur", "Kunnamkulam", "Edappal", "Kuttippuram", "Kozhikode"],
    route: ["Thrissur", "Kunnamkulam", "Edappal", "Kuttippuram", "Kozhikode"],
    schedule: [{
      stations: [
        { id: 0, name: "Thrissur", arrivalTime: "--", departureTime: "08:15 AM", halt: "Origin Terminal", platform: "Platform 2", offset_minutes: 0 },
        { id: 1, name: "Kunnamkulam", arrivalTime: "08:55 AM", departureTime: "09:00 AM", halt: "5 mins halt", platform: "Platform 1", offset_minutes: 40 },
        { id: 2, name: "Edappal", arrivalTime: "09:35 AM", departureTime: "09:40 AM", halt: "5 mins halt", platform: "Platform 2", offset_minutes: 80 },
        { id: 3, name: "Kuttippuram", arrivalTime: "10:15 AM", departureTime: "10:20 AM", halt: "5 mins halt", platform: "Platform 1", offset_minutes: 120 },
        { id: 4, name: "Kozhikode", arrivalTime: "11:45 AM", departureTime: "--", halt: "Final Terminus", platform: "Platform 3", offset_minutes: 210 }
      ]
    }]
  },
  {
    _id: "660000000000000000000003",
    busNumber: "KL-01-MS-3090",
    busName: "Trivandrum ➔ Munnar Hills Express",
    busType: "Standard Route Transit",
    operator: "MoveSmart Transit Ops",
    fromLocation: "Trivandrum",
    toLocation: "Munnar",
    departureTime: "05:00 AM",
    arrivalTime: "12:30 PM",
    duration: "7h 30m",
    total_duration_minutes: 450,
    totalSeats: 40,
    availableSeats: 35,
    price: 490,
    rating: 4.7,
    amenities: ["Live Tracking", "Emergency Contact", "IoT Transit Feed"],
    bookedSeats: [],
    driverName: "Vijayan Pillai",
    driverPhone: "+91 97455 11223",
    driverLicense: "KL-01-2015-001234",
    driverPhoto: "",
    driverVerified: true,
    driverExperience: 12,
    is_active: true,
    stops: ["Trivandrum", "Kollam", "Kottayam", "Muvattupuzha", "Kothamangalam", "Adimali", "Munnar"],
    route: ["Trivandrum", "Kollam", "Kottayam", "Muvattupuzha", "Kothamangalam", "Adimali", "Munnar"],
    schedule: [{
      stations: [
        { id: 0, name: "Trivandrum", arrivalTime: "--", departureTime: "05:00 AM", halt: "Origin Terminal", platform: "Platform 4", offset_minutes: 0 },
        { id: 1, name: "Kollam", arrivalTime: "06:15 AM", departureTime: "06:20 AM", halt: "5 mins halt", platform: "Platform 1", offset_minutes: 75 },
        { id: 2, name: "Kottayam", arrivalTime: "08:15 AM", departureTime: "08:20 AM", halt: "5 mins halt", platform: "Platform 2", offset_minutes: 195 },
        { id: 3, name: "Muvattupuzha", arrivalTime: "09:30 AM", departureTime: "09:35 AM", halt: "5 mins halt", platform: "Platform 1", offset_minutes: 270 },
        { id: 4, name: "Kothamangalam", arrivalTime: "10:10 AM", departureTime: "10:15 AM", halt: "5 mins halt", platform: "Platform 3", offset_minutes: 310 },
        { id: 5, name: "Adimali", arrivalTime: "11:20 AM", departureTime: "11:25 AM", halt: "5 mins halt", platform: "Platform 2", offset_minutes: 380 },
        { id: 6, name: "Munnar", arrivalTime: "12:30 PM", departureTime: "--", halt: "Final Terminus", platform: "Platform 1", offset_minutes: 450 }
      ]
    }]
  },
  {
    _id: "660000000000000000000004",
    busNumber: "KL-04-MS-4012",
    busName: "Alappuzha ➔ Palakkad Intercity",
    busType: "AC Super Fast Transit",
    operator: "MoveSmart Transit Ops",
    fromLocation: "Alappuzha",
    toLocation: "Palakkad",
    departureTime: "09:00 AM",
    arrivalTime: "01:30 PM",
    duration: "4h 30m",
    total_duration_minutes: 270,
    totalSeats: 36,
    availableSeats: 30,
    price: 340,
    rating: 4.8,
    amenities: ["Live Tracking", "WiFi", "Emergency Contact"],
    bookedSeats: [],
    driverName: "Gopakumar N",
    driverPhone: "+91 94950 33445",
    driverLicense: "KL-04-2019-008765",
    driverPhoto: "",
    driverVerified: true,
    driverExperience: 6,
    is_active: true,
    stops: ["Alappuzha", "Kochi", "Aluva", "Thrissur", "Palakkad"],
    route: ["Alappuzha", "Kochi", "Aluva", "Thrissur", "Palakkad"],
    schedule: [{
      stations: [
        { id: 0, name: "Alappuzha", arrivalTime: "--", departureTime: "09:00 AM", halt: "Origin Terminal", platform: "Platform 1", offset_minutes: 0 },
        { id: 1, name: "Kochi", arrivalTime: "10:15 AM", departureTime: "10:20 AM", halt: "5 mins halt", platform: "Platform 2", offset_minutes: 75 },
        { id: 2, name: "Aluva", arrivalTime: "10:50 AM", departureTime: "10:55 AM", halt: "5 mins halt", platform: "Platform 3", offset_minutes: 110 },
        { id: 3, name: "Thrissur", arrivalTime: "12:00 PM", departureTime: "12:05 PM", halt: "5 mins halt", platform: "Platform 1", offset_minutes: 180 },
        { id: 4, name: "Palakkad", arrivalTime: "01:30 PM", departureTime: "--", halt: "Final Terminus", platform: "Platform 4", offset_minutes: 270 }
      ]
    }]
  }
];

// Helper to build normalized buses from database query results or offline mock bundle
const buildNormalizedBusesFromData = (dataBundle = {}, targetServiceDate = "") => {
  const {
    rawRoutes = [],
    rawSchedules = [],
    rawBuses = [],
    driverLeaves = [],
    driverReplacements = [],
    driverUserMap = new Map(),
    activeTripsMap = new Map(),
  } = dataBundle;

  const normalizedBuses = [];
  const seenTripKeys = new Set();
  const routesWithActiveSchedule = new Set();
  const busesWithActiveSchedule = new Set();

  const cleanDate = targetServiceDate && typeof targetServiceDate === "string" && targetServiceDate.trim().match(/^\d{4}-\d{2}-\d{2}$/)
    ? targetServiceDate.trim()
    : new Date().toISOString().split("T")[0];

  // 1. Process active departure schedules created by Admin
  for (const sch of rawSchedules) {
    if (sch.is_active === false) continue;

    let routeDoc = null;
    if (sch.route_id && typeof sch.route_id === "object" && (sch.route_id.fromLocation || sch.route_id.routeName || Array.isArray(sch.route_id.stops))) {
      routeDoc = sch.route_id;
    } else {
      const targetRouteId = sch.route_id ? String(sch.route_id) : String(sch.routeId || "");
      routeDoc = rawRoutes.find((r) =>
        String(r._id) === targetRouteId ||
        (r.routeId && String(r.routeId).toUpperCase() === targetRouteId.toUpperCase())
      ) || null;
    }
    if (!routeDoc || routeDoc.status === "Suspended") continue;

    routesWithActiveSchedule.add(String(routeDoc._id));

    let busDoc = null;
    if (sch.bus_id && typeof sch.bus_id === "object" && (sch.bus_id.busNumber || sch.bus_id.totalSeats !== undefined)) {
      busDoc = sch.bus_id;
    } else {
      const targetBusId = sch.bus_id ? String(sch.bus_id) : "";
      const targetBusNum = sch.busNumber ? String(sch.busNumber).trim().toUpperCase() : "";
      busDoc = rawBuses.find((b) =>
        (targetBusId && String(b._id) === targetBusId) ||
        (targetBusNum && b.busNumber && String(b.busNumber).trim().toUpperCase() === targetBusNum)
      ) || null;
    }

    if (busDoc && busDoc._id) {
      busesWithActiveSchedule.add(String(busDoc._id));
    }
    const rawBusNum = sch.busNumber || (busDoc && busDoc.busNumber);
    if (rawBusNum) {
      busesWithActiveSchedule.add(String(rawBusNum).trim().toUpperCase());
    }

    const tripKey = `${sch.busNumber || (busDoc && busDoc.busNumber) || routeDoc.routeId}_${sch.start_time}`;

    if (!seenTripKeys.has(tripKey)) {
      seenTripKeys.add(tripKey);

      const timetable = generateStationTimetable(routeDoc, sch.start_time);
      const stops = timetable.stations.map((s) => s.name);

      // Resolve effective driver dynamically via effectiveDriverResolver
      const resolverResult = resolveEffectiveDepartureDriver({
        schedule: sch,
        bus: busDoc || {},
        route: routeDoc,
        serviceDate: cleanDate,
        driverReplacements,
        driverLeaves,
      });

      let assignmentStatus = resolverResult.passengerView.status;
      let driverName = resolverResult.passengerView.driverName;

      // Fallback check: if resolver returned "Not Assigned", check busDoc and schedule
      const isGenericName = (n) => !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver", "not assigned"].includes(String(n).toLowerCase().trim());
      if (isGenericName(driverName)) {
        if (!isGenericName(busDoc?.driverName)) {
          driverName = busDoc.driverName;
          assignmentStatus = PASSENGER_ASSIGNMENT_STATUS.ASSIGNED;
        } else if (!isGenericName(sch.driverName)) {
          driverName = sch.driverName;
          assignmentStatus = PASSENGER_ASSIGNMENT_STATUS.ASSIGNED;
        } else if (busDoc?.shifts?.morning?.driverName && !isGenericName(busDoc.shifts.morning.driverName)) {
          driverName = busDoc.shifts.morning.driverName;
          assignmentStatus = PASSENGER_ASSIGNMENT_STATUS.ASSIGNED;
        }
      }

      // Match driver with driverUserMap to populate full credentials (phone, license, verification, experience, photo)
      let matchedDriverUser = null;
      if (resolverResult.driverId && driverUserMap.has(String(resolverResult.driverId))) {
        matchedDriverUser = driverUserMap.get(String(resolverResult.driverId));
      } else if (busDoc?.driverId && driverUserMap.has(String(busDoc.driverId))) {
        matchedDriverUser = driverUserMap.get(String(busDoc.driverId));
      } else if (!isGenericName(driverName)) {
        for (const u of driverUserMap.values()) {
          if (String(u.name || "").toLowerCase().trim() === String(driverName).toLowerCase().trim()) {
            matchedDriverUser = u;
            break;
          }
        }
      }

      const isDriverAssigned = assignmentStatus === PASSENGER_ASSIGNMENT_STATUS.ASSIGNED || Boolean(matchedDriverUser && !isGenericName(driverName));

      let driverStatus = "Assignment Pending";
      if (isDriverAssigned) {
        if (resolverResult.hasShiftOverrunException) {
          driverStatus = "Driver Assigned (Shift Boundary Warning)";
        } else if (resolverResult.isReplacement) {
          driverStatus = "Driver Assigned (Replacement)";
        } else {
          driverStatus = "Driver Assigned";
        }
      } else if (assignmentStatus === PASSENGER_ASSIGNMENT_STATUS.SCHEDULE_REVIEW_REQUIRED) {
        driverStatus = "Schedule Review Required";
      } else {
        driverStatus = "Assignment Pending";
      }

      // Evaluate 5-minute pre-departure and trip-start booking cutoff
      const cutoffEval = evaluateBusBookingCutoff({
        bus: busDoc || { bookingEnabled: false },
        schedule: sch,
        activeTripsMap,
        serviceDate: cleanDate,
      });

      // Strict: Only buses with a physical bus in fleet and bookingEnabled === true can be booked online
      const hasPhysicalBus = Boolean(busDoc && busDoc._id);
      const effectiveBookingEnabled = hasPhysicalBus && (busDoc.bookingEnabled === true);

      const norm = {
        _id: busDoc?._id || sch._id,
        scheduleId: sch._id,
        busId: busDoc?._id || null,
        routeId: routeDoc._id,
        routeCode: routeDoc.routeId,
        busNumber: (busDoc && busDoc.busNumber) || sch.busNumber || `KL-01-${routeDoc.routeId ? routeDoc.routeId.replace(/[^A-Z0-9]/g, "") : "MS100"}`,
        busName: (busDoc && busDoc.busName && !busDoc.busName.includes("undefined"))
          ? busDoc.busName
          : (routeDoc.routeName || `${routeDoc.fromLocation} ➔ ${routeDoc.toLocation}`),
        busType: (busDoc && busDoc.busType) || "Standard Route Transit",
        operator: (busDoc && busDoc.operator) || "MoveSmart Transit Ops",
        fromLocation: routeDoc.fromLocation || stops[0] || "Origin",
        toLocation: routeDoc.toLocation || stops[stops.length - 1] || "Destination",
        departureTime: timetable.departureTime,
        arrivalTime: timetable.arrivalTime,
        duration: timetable.duration,
        total_duration_minutes: timetable.total_duration_minutes,
        totalSeats: (busDoc && busDoc.totalSeats) || 32,
        availableSeats: busDoc && busDoc.availableSeats !== undefined ? busDoc.availableSeats : 32,
        price: routeDoc.fare || (busDoc && busDoc.price) || 150,
        rating: (busDoc && busDoc.rating) || 4.8,
        amenities: (busDoc && busDoc.amenities) || ["Live Tracking", "Emergency Contact", "IoT Transit Feed"],
        bookedSeats: (busDoc && busDoc.bookedSeats) || [],
        shift: resolverResult.shift || sch.shift || null,
        serviceDate: resolverResult.serviceDate || cleanDate,
        driverId: null, // Sanitized: Never leak internal User ObjectId to public
        driverName: isDriverAssigned ? (matchedDriverUser?.name || driverName) : "Not Assigned",
        driverPhone: matchedDriverUser?.phone || busDoc?.driverPhone || sch?.driverPhone || "",
        driverLicense: matchedDriverUser?.licenseNumber || busDoc?.driverLicense || "",
        driverPhoto: matchedDriverUser?.profilePic || busDoc?.driverPhoto || "",
        driverVerified: isDriverAssigned ? (matchedDriverUser ? matchedDriverUser.verificationStatus === "Approved" : Boolean(busDoc?.driverVerified)) : false,
        driverExperience: matchedDriverUser?.experienceYears || busDoc?.driverExperience || 5,
        assignmentStatus: isDriverAssigned ? PASSENGER_ASSIGNMENT_STATUS.ASSIGNED : assignmentStatus,
        driverStatus: driverStatus,
        isReplacementDriver: Boolean(resolverResult.isReplacement),
        hasShiftOverrunException: Boolean(resolverResult.hasShiftOverrunException),
        warningMessage: resolverResult.boundaryCheck?.warningMessage || null,
        is_active: sch.is_active,
        // Booking availability & 5-minute pre-departure takeoff status
        bookingEnabled: effectiveBookingEnabled,
        isBookingOpen: effectiveBookingEnabled ? cutoffEval.isBookingOpen : false,
        bookingStatus: !effectiveBookingEnabled ? "DISABLED_BY_ADMIN" : cutoffEval.bookingStatus,
        bookingStatusLabel: !effectiveBookingEnabled ? "Walk-in Only" : cutoffEval.bookingStatusLabel,
        bookingStatusReason: !effectiveBookingEnabled
          ? "Online booking option has not been enabled by Administrator for this bus (Walk-in / Counter ticketing only)."
          : cutoffEval.bookingStatusReason,
        bookingCloseTime: cutoffEval.bookingCloseTime,
        minutesUntilDeparture: cutoffEval.minutesUntilDeparture,
        minutesUntilCutoff: cutoffEval.minutesUntilCutoff,
        tripStarted: cutoffEval.tripStarted,
        activeTripId: cutoffEval.activeTripId,
        passengerView: resolverResult.passengerView,
        stops: stops,
        route: stops,
        schedule: [{ stations: timetable.stations }],
      };

      normalizedBuses.push(norm);
    }
  }

  // 2. Process Routes that do not have an explicit schedule yet (use base_start_time)
  for (const r of rawRoutes) {
    if (!routesWithActiveSchedule.has(String(r._id))) {
      // Check if any standalone bus is directly assigned to this route
      const hasDirectBus = rawBuses.some((b) => {
        const dId = b.route_id || b.routeId;
        return dId && (String(dId) === String(r._id) || (r.routeId && String(dId).toUpperCase() === String(r.routeId).toUpperCase()));
      });
      // If a physical bus is already assigned to this route, Step 3 will process that bus; skip duplicate placeholder!
      if (hasDirectBus) continue;

      const timetable = generateStationTimetable(r, r.base_start_time || "08:00 AM");
      const stops = timetable.stations.map((s) => s.name);
      const routeBusNumber = r.routeId || `RT-${String(r._id).substring(18).toUpperCase()}`;
      const tripKey = `${routeBusNumber}_${timetable.departureTime}`;

      if (!seenTripKeys.has(tripKey)) {
        seenTripKeys.add(tripKey);

        const norm = {
          _id: r._id,
          routeId: r._id,
          routeCode: r.routeId,
          busId: null, // No physical bus assigned
          busNumber: routeBusNumber,
          busName: r.routeName || `${r.fromLocation || "Route"} ➔ ${r.toLocation || "Destination"}`,
          busType: "Standard Route Transit",
          operator: "MoveSmart Transit Ops",
          fromLocation: r.fromLocation || stops[0] || "Origin",
          toLocation: r.toLocation || stops[stops.length - 1] || "Destination",
          departureTime: timetable.departureTime,
          arrivalTime: timetable.arrivalTime,
          duration: timetable.duration,
          total_duration_minutes: timetable.total_duration_minutes,
          totalSeats: 32,
          availableSeats: 32,
          price: r.fare || 150,
          rating: 4.8,
          amenities: ["Live Tracking", "Emergency Contact", "IoT Transit Feed"],
          bookedSeats: [],
          shift: null,
          serviceDate: cleanDate,
          driverId: null,
          driverName: "Not Assigned",
          assignmentStatus: PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING,
          driverStatus: "Assignment Pending",
          isReplacementDriver: false,
          hasShiftOverrunException: false,
          warningMessage: null,
          driverPhoto: "",
          driverVerified: false,
          driverExperience: 0,
          is_active: r.status !== "Suspended",
          bookingEnabled: false, // Unassigned route is NEVER bookable
          isBookingOpen: false,
          bookingStatus: "DISABLED_BY_ADMIN",
          bookingStatusLabel: "Walk-in Only",
          bookingStatusReason: "No physical bus has been assigned to this route corridor yet (Walk-in / Station schedule only).",
          bookingCloseTime: "Walk-in Only",
          minutesUntilDeparture: null,
          minutesUntilCutoff: null,
          tripStarted: false,
          activeTripId: null,
          passengerView: {
            status: PASSENGER_ASSIGNMENT_STATUS.ASSIGNMENT_PENDING,
            busNumber: routeBusNumber,
            driverName: "Not Assigned",
            departureTime: timetable.departureTime,
            serviceDate: cleanDate,
            shift: null,
            statusReason: "No active bus departure configured for this route.",
          },
          stops: stops,
          route: stops,
          schedule: [{ stations: timetable.stations }],
        };

        normalizedBuses.push(norm);
      }
    }
  }

  // 3. Process standalone Bus collection items (ONLY buses with a VALID assigned route)
  for (const b of rawBuses) {
    const bId = b._id ? String(b._id) : "";
    const bNum = b.busNumber ? String(b.busNumber).trim().toUpperCase() : "";
    if (bId && busesWithActiveSchedule.has(bId)) continue;
    if (bNum && busesWithActiveSchedule.has(bNum)) continue;

    // Resolve valid parent route from active routes
    let parentRoute = null;
    const directRouteId = b.route_id || b.routeId;
    if (directRouteId) {
      parentRoute = rawRoutes.find((r) =>
        r && r.status !== "Suspended" && (
          String(r._id) === String(directRouteId) ||
          (r.routeId && String(r.routeId).toUpperCase() === String(directRouteId).toUpperCase())
        )
      ) || null;
    }

    // Fallback: Check if bus is on an active trip with a valid route
    if (!parentRoute && (bId || bNum)) {
      const activeTrip = activeTripsMap.get(bId) || activeTripsMap.get(bNum);
      if (activeTrip && activeTrip.routeId) {
        parentRoute = rawRoutes.find((r) => String(r._id) === String(activeTrip.routeId) && r.status !== "Suspended") || null;
      }
    }

    // REQUIREMENT 4: Do not display buses without a valid assigned route!
    // Exclude buses whose route assignment is missing, invalid or references a deleted route.
    if (!parentRoute) {
      continue;
    }

    const norm = normalizeBusDocument(b, parentRoute, driverUserMap, rawRoutes, cleanDate, driverReplacements, driverLeaves, activeTripsMap);
    const tripKey = `${norm.busNumber}_${norm.departureTime}`;
    if (!seenTripKeys.has(tripKey)) {
      seenTripKeys.add(tripKey);
      normalizedBuses.push(norm);
    }
  }

  return normalizedBuses;
};

// Fetch all normalized buses with high-speed parallel queries and in-memory TTL cache (keyed by service date)
const fetchAllNormalizedBuses = async (serviceDate = null, mockData = null) => {
  const targetServiceDate = serviceDate && typeof serviceDate === "string" && serviceDate.trim().match(/^\d{4}-\d{2}-\d{2}$/)
    ? serviceDate.trim()
    : new Date().toISOString().split("T")[0];

  // If mockData is provided (offline unit testing), bypass DB and TTL cache
  if (mockData) {
    return buildNormalizedBusesFromData(mockData, targetServiceDate);
  }

  // Check fast in-memory cache for this service date first
  const cached = busCacheMap.get(targetServiceDate);
  if (cached && cached.data && cached.data.length > 0 && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  if (cached && cached.data && cached.data.length > 0 && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const QUERY_TIMEOUT_MS = 15000;

  try {
    // Run all database fetches in parallel with strict timeout
    const [driversResult, routesResult, schedulesResult, busesResult, leavesResult, replacementsResult, activeTripsResult] = await Promise.allSettled([
      User.find({ role: { $in: ["driver", "Driver", "DRIVER"] } })
        .select("_id name phone email licenseNumber verificationStatus experienceYears")
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      Route.find({ status: { $ne: "Suspended" } })
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      Schedule.find({ is_active: true })
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      Bus.find()
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      DriverLeave.find({ status: "Approved" })
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      DriverReplacement.find({ dutyDate: targetServiceDate })
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
      TripSession.find({ status: { $in: ["ACTIVE", "PAUSED"] } })
        .select("tripSessionId busId busNumber status startTime")
        .maxTimeMS(QUERY_TIMEOUT_MS)
        .lean(),
    ]);

    const driverUserMap = new Map();
    if (driversResult.status === "fulfilled" && Array.isArray(driversResult.value)) {
      driversResult.value.forEach((d) => driverUserMap.set(String(d._id), d));
    }

    const activeTripsMap = new Map();
    if (activeTripsResult && activeTripsResult.status === "fulfilled" && Array.isArray(activeTripsResult.value)) {
      activeTripsResult.value.forEach((t) => {
        if (t.busId) activeTripsMap.set(String(t.busId), t);
        if (t.busNumber) activeTripsMap.set(String(t.busNumber).trim().toUpperCase(), t);
      });
    }

    const rawRoutes = routesResult.status === "fulfilled" && Array.isArray(routesResult.value) ? routesResult.value : [];
    const rawSchedules = schedulesResult.status === "fulfilled" && Array.isArray(schedulesResult.value) ? schedulesResult.value : [];
    const rawBuses = busesResult.status === "fulfilled" && Array.isArray(busesResult.value) ? busesResult.value : [];
    const rawLeaves = leavesResult.status === "fulfilled" && Array.isArray(leavesResult.value) ? leavesResult.value : [];
    const rawReplacements = replacementsResult.status === "fulfilled" && Array.isArray(replacementsResult.value) ? replacementsResult.value : [];

    const dataBundle = {
      rawRoutes,
      rawSchedules,
      rawBuses,
      driverLeaves: rawLeaves,
      driverReplacements: rawReplacements,
      driverUserMap,
      activeTripsMap,
    };

    const normalizedBuses = buildNormalizedBusesFromData(dataBundle, targetServiceDate);

    // If database query succeeded, update cache and return normalized buses
    const isDbAlive = busesResult.status === "fulfilled" || routesResult.status === "fulfilled";
    if (isDbAlive) {
      busCacheMap.set(targetServiceDate, { data: normalizedBuses, timestamp: Date.now() });
      return normalizedBuses;
    }
  } catch (err) {
    console.warn("Fast fetchAllNormalizedBuses caught error:", err.message);
  }

  // Fallback to existing cache or seed buses for instant zero-delay responses
  const fallbackCached = busCacheMap.get(targetServiceDate);
  if (fallbackCached && fallbackCached.data && fallbackCached.data.length > 0) {
    return fallbackCached.data;
  }

  const sanitizedSeed = SEED_FALLBACK_BUSES.map((b) => ({
    ...b,
    driverId: null,
    driverPhone: undefined,
    driverEmail: undefined,
    driverLicense: undefined,
    driverPhoto: "",
    assignmentStatus: PASSENGER_ASSIGNMENT_STATUS.ASSIGNED,
    driverStatus: "Driver Assigned",
    passengerView: {
      status: PASSENGER_ASSIGNMENT_STATUS.ASSIGNED,
      busNumber: b.busNumber,
      driverName: b.driverName,
      departureTime: b.departureTime,
      serviceDate: targetServiceDate,
      shift: null,
      statusReason: null,
    },
  }));

  busCacheMap.set(targetServiceDate, { data: sanitizedSeed, timestamp: Date.now() });
  return sanitizedSeed;
};

// GET /locations (Get all unique stations/locations and sub-stations from DB)
router.get("/locations", async (req, res) => {
  try {
    const [buses, routes, schedules] = await Promise.all([
      Bus.find({ is_active: { $ne: false } }).select("fromLocation toLocation stops schedule").lean(),
      Route.find({ status: { $ne: "Suspended" } }).select("fromLocation toLocation stops schedule").lean(),
      Schedule.find({ is_active: true }).select("stations stops").lean(),
    ]);

    const locationSet = new Set();
    const subStationSet = new Set();

    const addCleanLocation = (raw, isSubStation = false) => {
      if (!raw) return;
      const str = String(raw).trim();
      // Skip invalid route descriptions or generic depot placeholders
      if (
        str.includes("➔") ||
        str.includes("->") ||
        str.includes("→") ||
        str.toLowerCase().startsWith("via ") ||
        str.length < 2 ||
        /^stop\s*\d+$/i.test(str) ||
        str.toLowerCase() === "depot"
      ) {
        return;
      }
      locationSet.add(str);
      if (isSubStation) subStationSet.add(str);

      // Extract base city before parenthesis if present
      const parenMatch = str.match(/^(.*?)\s*\((.*?)\)$/);
      if (parenMatch) {
        const baseCity = parenMatch[1].trim();
        const insideParen = parenMatch[2].trim();
        if (baseCity && baseCity.length >= 2) {
          locationSet.add(baseCity);
        }
        if (insideParen) {
          insideParen.split(/[\/,]/).forEach((part) => {
            const cleanPart = part.trim();
            if (
              cleanPart &&
              cleanPart.length >= 3 &&
              cleanPart.toLowerCase() !== "ksrtc" &&
              cleanPart.toLowerCase() !== "aictsl"
            ) {
              locationSet.add(cleanPart);
              subStationSet.add(cleanPart);
            }
          });
        }
      }
    };

    buses.forEach((b) => {
      addCleanLocation(b.fromLocation);
      addCleanLocation(b.toLocation);
      if (Array.isArray(b.stops)) {
        b.stops.forEach((s) => {
          const stName = typeof s === "object" && s !== null ? (s.stopName || s.name || s.station) : s;
          addCleanLocation(stName, true);
        });
      }
      if (Array.isArray(b.schedule)) {
        b.schedule.forEach((sch) => {
          if (Array.isArray(sch.stations)) {
            sch.stations.forEach((st) => {
              const name = st.station || st.name;
              addCleanLocation(name, true);
            });
          }
        });
      }
    });

    routes.forEach((r) => {
      addCleanLocation(r.fromLocation);
      addCleanLocation(r.toLocation);
      if (Array.isArray(r.stops)) {
        r.stops.forEach((s) => {
          const stName = typeof s === "object" && s !== null ? (s.stopName || s.name || s.station) : s;
          addCleanLocation(stName, true);
        });
      }
      if (Array.isArray(r.schedule)) {
        r.schedule.forEach((sch) => {
          if (Array.isArray(sch.stations)) {
            sch.stations.forEach((st) => {
              const name = st.station || st.name;
              addCleanLocation(name, true);
            });
          }
        });
      }
    });

    schedules.forEach((sch) => {
      if (Array.isArray(sch.stations)) {
        sch.stations.forEach((st) => {
          const name = st.station || st.name;
          addCleanLocation(name, true);
        });
      }
      if (Array.isArray(sch.stops)) {
        sch.stops.forEach((s) => {
          const stName = typeof s === "object" && s !== null ? (s.stopName || s.name || s.station) : s;
          addCleanLocation(stName, true);
        });
      }
    });

    const locations = Array.from(locationSet).filter(Boolean).sort();
    const subStations = Array.from(subStationSet).filter(Boolean).sort();
    res.json({ success: true, count: locations.length, locations, subStations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /routes (Public endpoint to fetch active routes)
router.get("/routes", async (req, res) => {
  try {
    const rawRoutes = await Route.find().lean();

    const formattedRoutes = rawRoutes.map((r) => ({
      _id: r._id,
      routeId: r.routeId || `RT-${String(r._id).substring(18).toUpperCase()}`,
      routeName: r.routeName || `${r.fromLocation || "Route"} ➔ ${r.toLocation || "Destination"}`,
      fromLocation: r.fromLocation || (r.stops && r.stops[0]?.name) || "Origin",
      toLocation: r.toLocation || (r.stops && r.stops[r.stops.length - 1]?.name) || "Destination",
      distanceKm: r.distanceKm || r.totalDistance || 150,
      duration: r.duration || "3h 30m",
      frequency: r.frequency || "Every 30 mins",
      stops: r.stops || [],
      fare: r.fare || 350,
      status: r.status || "Active",
    }));

    res.json({ success: true, count: formattedRoutes.length, routes: formattedRoutes });
  } catch (error) {
    console.error("Error fetching public routes:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Build a complete ordered sequence of all stops from origin to destination for a bus
const buildCompleteStopsList = (bus) => {
  if (Array.isArray(bus.schedule) && bus.schedule.length > 0 && Array.isArray(bus.schedule[0].stations) && bus.schedule[0].stations.length > 0) {
    return bus.schedule[0].stations.map((st) => String(st.station || st.name || "").trim()).filter(Boolean);
  }

  const rawStops = Array.isArray(bus.stops)
    ? bus.stops.map((s) => (typeof s === "object" && s !== null ? (s.stopName || s.name || s.station || "") : String(s)).trim())
    : [];

  const list = [];
  if (bus.fromLocation) {
    list.push(String(bus.fromLocation).trim());
  }

  rawStops.forEach((s) => {
    if (s) {
      const trimmed = String(s).trim();
      if (!list.length || !matchLocationStr(list[list.length - 1], trimmed)) {
        list.push(trimmed);
      }
    }
  });

  if (bus.toLocation) {
    const trimmedTo = String(bus.toLocation).trim();
    if (!list.length || !matchLocationStr(list[list.length - 1], trimmedTo)) {
      list.push(trimmedTo);
    }
  }

  return list;
};

// Find matching station index in a bus's full ordered stop sequence
const getStationMatchIndex = (bus, searchQuery) => {
  if (!searchQuery) return -1;
  const stopsList = buildCompleteStopsList(bus);
  for (let i = 0; i < stopsList.length; i++) {
    if (matchLocationStr(stopsList[i], searchQuery)) {
      return i;
    }
  }
  return -1;
};

// 1. GET /buses?from=...&to=...&date=... (Search Buses / Passenger Timetable)
router.get("/buses", async (req, res) => {
  try {
    const { from, to, busType, minPrice, maxPrice, date } = req.query;
    const targetDate = date && typeof date === "string" && date.trim().match(/^\d{4}-\d{2}-\d{2}$/)
      ? date.trim()
      : new Date().toISOString().split("T")[0];

    const allBuses = await fetchAllNormalizedBuses(targetDate);

    let filtered = allBuses;

    const isAllQuery = (str) => {
      if (!str) return true;
      const s = String(str).trim().toLowerCase();
      return (
        s === "" ||
        s === "all" ||
        s.includes("select") ||
        s === "undefined" ||
        s === "null"
      );
    };

    const fromQuery = isAllQuery(from) ? null : from.trim();
    const toQuery = isAllQuery(to) ? null : to.trim();

    if (fromQuery || toQuery) {
      const matchedBuses = [];

      for (const b of allBuses) {
        let fromIdx = -1;
        let toIdx = -1;

        if (fromQuery) {
          fromIdx = getStationMatchIndex(b, fromQuery);
          if (fromIdx === -1) continue;
        }

        if (toQuery) {
          toIdx = getStationMatchIndex(b, toQuery);
          if (toIdx === -1) continue;
        }

        if (fromQuery && toQuery && fromIdx !== -1 && toIdx !== -1) {
          if (fromIdx >= toIdx) continue;
        }

        // Compute segment-specific details if queried
        const stations = Array.isArray(b.schedule) && b.schedule[0]?.stations ? b.schedule[0].stations : [];
        let segmentDuration = b.duration;
        let boardingStation = null;
        let dropStation = null;

        if (fromIdx !== -1 && stations[fromIdx]) {
          boardingStation = stations[fromIdx];
        }
        if (toIdx !== -1 && stations[toIdx]) {
          dropStation = stations[toIdx];
        } else if (boardingStation && stations.length > 0) {
          dropStation = stations[stations.length - 1];
        }
        if (!boardingStation && dropStation && stations.length > 0) {
          boardingStation = stations[0];
        }

        let segmentPrice = b.price;
        if (boardingStation && dropStation) {
          const bOffset = Number(boardingStation.offset_minutes) || 0;
          const dOffset = Number(dropStation.offset_minutes) || (b.total_duration_minutes || 180);
          const segMins = Math.max(15, dOffset - bOffset);
          segmentDuration = calculateDurationMins(0, segMins);

          const totalMins = Math.max(30, Number(b.total_duration_minutes) || (stations[stations.length - 1]?.offset_minutes) || 180);
          const ratio = Math.min(1, Math.max(0.15, segMins / totalMins));
          segmentPrice = Math.max(40, Math.round((Number(b.price) || 150) * ratio));
        }

        // Sub-Station Takeoff Cutoff Re-evaluation:
        let isBookingOpen = b.isBookingOpen;
        let bookingStatus = b.bookingStatus;
        let bookingStatusLabel = b.bookingStatusLabel;
        let bookingStatusReason = b.bookingStatusReason;
        let minutesUntilCutoff = b.minutesUntilCutoff;
        let minutesUntilDeparture = b.minutesUntilDeparture;
        let bookingCloseTime = b.bookingCloseTime;

        if (b.bookingEnabled && boardingStation && boardingStation.departureTime && boardingStation.departureTime !== "--") {
          const subCutoff = evaluateBusBookingCutoff({
            bus: b,
            schedule: { start_time: boardingStation.departureTime, bookingEnabled: true },
            serviceDate: targetDate,
          });
          isBookingOpen = subCutoff.isBookingOpen;
          bookingStatus = subCutoff.bookingStatus;
          bookingStatusLabel = subCutoff.bookingStatusLabel;
          bookingStatusReason = subCutoff.bookingStatusReason;
          minutesUntilCutoff = subCutoff.minutesUntilCutoff;
          minutesUntilDeparture = subCutoff.minutesUntilDeparture;
          bookingCloseTime = subCutoff.bookingCloseTime;
        }

        matchedBuses.push({
          ...b,
          isBookingOpen,
          bookingStatus,
          bookingStatusLabel,
          bookingStatusReason,
          minutesUntilCutoff,
          minutesUntilDeparture,
          bookingCloseTime,
          price: segmentPrice,
          searchContext: {
            fromQuery: fromQuery || "",
            toQuery: toQuery || "",
            fromIdx,
            toIdx,
            boardingStationName: boardingStation ? boardingStation.name : (fromQuery || b.fromLocation),
            boardingDepartureTime: boardingStation ? (boardingStation.departureTime !== "--" ? boardingStation.departureTime : b.departureTime) : b.departureTime,
            dropStationName: dropStation ? dropStation.name : (toQuery || b.toLocation),
            dropArrivalTime: dropStation ? (dropStation.arrivalTime !== "--" ? dropStation.arrivalTime : b.arrivalTime) : b.arrivalTime,
            segmentDuration: segmentDuration || b.duration,
            segmentPrice,
            isSubStationSegment: Boolean((fromIdx > 0) || (toIdx !== -1 && toIdx < stations.length - 1)),
          }
        });
      }

      filtered = matchedBuses;
    }

    if (busType && busType !== "All") {
      filtered = filtered.filter((b) => (b.busType || "").toLowerCase().includes(busType.toLowerCase()));
    }

    if (minPrice || maxPrice) {
      filtered = filtered.filter((b) => {
        if (minPrice && b.price < Number(minPrice)) return false;
        if (maxPrice && b.price > Number(maxPrice)) return false;
        return true;
      });
    }

    // Attach travel date context if provided
    const busesWithDate = filtered.map((b) => ({
      ...b,
      travelDate: targetDate,
      serviceDate: b.serviceDate || targetDate,
    }));

    res.json({
      success: true,
      count: busesWithDate.length,
      buses: busesWithDate,
    });
  } catch (error) {
    console.error("Error fetching buses:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch buses" });
  }
});

// GET /buses/live-fleet (Fetch real-time tracking status of entire fleet)
router.get("/buses/live-fleet", async (req, res) => {
  try {
    const liveLocations = getAllActiveBusLocations();
    const liveMap = new Map();
    liveLocations.forEach((loc) => liveMap.set(String(loc.busId), loc));

    // Fallback: Check MongoDB TripSessions for any active drives not yet in memory
    try {
      const activeTrips = await TripSession.find({
        status: { $in: ["ACTIVE", "PAUSED"] }
      }).lean();

      for (const trip of activeTrips) {
        const tripBusId = String(trip.busId);
        if (!liveMap.has(tripBusId) || !liveMap.get(tripBusId).isTracking) {
          const lat = Number(trip.currentStop?.latitude) || 9.9658;
          const lng = Number(trip.currentStop?.longitude) || 76.3204;
          const locObj = {
            busId: tripBusId,
            busNumber: trip.busNumber,
            busName: trip.busName,
            routeName: trip.routeName,
            driverName: trip.driverName,
            tripSessionId: trip.tripSessionId,
            currentStopName: trip.currentStop?.name || "",
            latitude: lat,
            longitude: lng,
            speed: 25,
            heading: 45,
            isTracking: true,
            status: trip.status === "PAUSED" ? "PAUSED" : "LIVE",
            lastUpdated: trip.updatedAt ? new Date(trip.updatedAt).getTime() : Date.now(),
            timestamp: trip.updatedAt ? new Date(trip.updatedAt).toISOString() : new Date().toISOString()
          };
          liveMap.set(tripBusId, locObj);
          setActiveBusLocation(tripBusId, locObj);
        }
      }
    } catch (e) {
      console.warn("TripSession sync in live-fleet notice:", e.message);
    }

    const dbBuses = await Bus.find().lean();
    const fleetStatus = dbBuses.map((bus) => {
      const busIdStr = String(bus._id);
      const live = liveMap.get(busIdStr);
      const isLive = Boolean(live?.isTracking && live?.status !== "OFFLINE" && live?.status !== "COMPLETED");
      const trackingStatus = live?.status || (isLive ? "LIVE" : "OFFLINE");

      const stopNames = Array.isArray(bus.stops)
        ? bus.stops.map((s) => (typeof s === "object" ? s.stationName || s.name : s)).filter(Boolean)
        : [];

      return {
        _id: bus._id,
        id: bus._id,
        busNumber: bus.busNumber,
        busName: bus.busName,
        busType: bus.busType,
        from: bus.fromLocation,
        to: bus.toLocation,
        fromLocation: bus.fromLocation,
        toLocation: bus.toLocation,
        route: `${bus.fromLocation} ➔ ${bus.toLocation}`,
        departureTime: bus.departureTime,
        arrivalTime: bus.arrivalTime,
        driverName: live?.driverName || bus.driverName,
        isLive,
        isTracking: isLive,
        trackingStatus,
        status: trackingStatus,
        stops: stopNames,
        intermediateStops: stopNames,
        activeLocation: isLive ? {
          latitude: live.latitude,
          longitude: live.longitude,
          speed: live.speed || 0,
          heading: live.heading || 0,
          driverName: live.driverName,
          currentStopName: live.currentStopName || "",
          lastUpdated: live.lastUpdated || Date.now(),
          timestamp: live.timestamp || new Date().toISOString()
        } : null,
        latitude: live?.latitude || null,
        longitude: live?.longitude || null,
        speed: live?.speed || 0,
        heading: live?.heading || 0,
        currentStopName: live?.currentStopName || "",
        lastUpdated: live?.lastUpdated || null,
        timestamp: live?.timestamp || null,
      };
    });

    res.json({
      success: true,
      count: fleetStatus.length,
      activeCount: fleetStatus.filter((b) => b.isLive && b.trackingStatus === "LIVE").length,
      delayedCount: fleetStatus.filter((b) => b.isLive && b.trackingStatus === "DELAYED").length,
      offlineCount: fleetStatus.filter((b) => !b.isLive || b.trackingStatus === "OFFLINE").length,
      fleet: fleetStatus,
      buses: fleetStatus,
    });
  } catch (error) {
    console.error("Error fetching live fleet status:", error);
    res.status(500).json({ success: false, message: "Failed to fetch live fleet data", error: error.message });
  }
});

// GET /buses/:busId/live-location (Fetch real-time location and metadata of specific bus)
router.get("/buses/:busId/live-location", async (req, res) => {
  try {
    const { busId } = req.params;
    let live = getActiveBusLocation(busId);
    const bus = await Bus.findById(busId).lean();

    // Fallback: If not in memory cache or isTracking false, check active TripSession in DB
    if (!live || !live.isTracking) {
      try {
        const activeTrip = await TripSession.findOne({
          busId,
          status: { $in: ["ACTIVE", "PAUSED"] }
        }).sort({ createdAt: -1 }).lean();

        if (activeTrip) {
          const lat = Number(activeTrip.currentStop?.latitude) || 9.9658;
          const lng = Number(activeTrip.currentStop?.longitude) || 76.3204;
          live = {
            busId: String(busId),
            busNumber: activeTrip.busNumber || bus?.busNumber || "Bus",
            busName: activeTrip.busName || bus?.busName || "MoveSmart Express",
            routeName: activeTrip.routeName || (bus ? `${bus.fromLocation} ➔ ${bus.toLocation}` : ""),
            driverName: activeTrip.driverName || bus?.driverName || "Driver",
            tripSessionId: activeTrip.tripSessionId,
            currentStopName: activeTrip.currentStop?.name || "",
            currentStopCode: activeTrip.currentStop?.code || "",
            latitude: lat,
            longitude: lng,
            speed: 25,
            heading: 45,
            isTracking: true,
            status: activeTrip.status === "PAUSED" ? "PAUSED" : "LIVE",
            lastUpdated: activeTrip.updatedAt ? new Date(activeTrip.updatedAt).getTime() : Date.now(),
            timestamp: activeTrip.updatedAt ? new Date(activeTrip.updatedAt).toISOString() : new Date().toISOString()
          };
          setActiveBusLocation(busId, live);
        }
      } catch (err) {
        console.warn("TripSession lookup error in live-location:", err.message);
      }
    }

    if (!bus && !live) {
      return res.status(404).json({ success: false, message: "Bus not found" });
    }

    // Format stops & route coordinates so passenger live map can display full route
    let stops = [];
    let routeCoordinates = [];
    try {
      if (bus && Array.isArray(bus.stops) && bus.stops.length > 0) {
        stops = bus.stops.map((s, idx) => ({
          name: s.stationName || s.name || `Stop ${idx + 1}`,
          code: s.code || `STOP_${idx + 1}`,
          latitude: Number(s.latitude || s.lat || 0),
          longitude: Number(s.longitude || s.lng || 0),
          departureTime: s.departureTime || s.time || ""
        }));
        routeCoordinates = stops
          .filter((s) => s.latitude && s.longitude)
          .map((s) => [s.latitude, s.longitude]);
      }
    } catch {}

    res.json({
      success: true,
      busId: bus?._id || busId,
      busNumber: bus?.busNumber || live?.busNumber || "Bus",
      busName: bus?.busName || "MoveSmart Express",
      routeName: bus ? `${bus.fromLocation} ➔ ${bus.toLocation}` : live?.routeName || "",
      fromLocation: bus?.fromLocation || "",
      toLocation: bus?.toLocation || "",
      departureTime: bus?.departureTime || "",
      arrivalTime: bus?.arrivalTime || "",
      driverName: bus?.driverName || live?.driverName || "Driver",
      currentStopName: live?.currentStopName || "",
      isTracking: Boolean(live?.isTracking),
      status: live ? live.status : "OFFLINE",
      latitude: live?.latitude ?? null,
      longitude: live?.longitude ?? null,
      speed: live?.speed ?? 0,
      heading: live?.heading ?? 0,
      lastUpdated: live?.lastUpdated ?? null,
      timestamp: live?.timestamp ?? null,
      stops,
      routeCoordinates,
    });
  } catch (error) {
    console.error("Error fetching bus live location:", error);
    res.status(500).json({ success: false, message: "Failed to fetch live bus location", error: error.message });
  }
});

// 2. GET /buses/:busId
router.get("/buses/:busId", async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found" });
    }
    res.json({ success: true, bus });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3. GET /seats/:busId (Fetch seat layout & availability)
router.get("/seats/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    let bus = null;
    if (mongoose.Types.ObjectId.isValid(busId)) {
      bus = await Bus.findById(busId);
    }
    if (!bus) {
      bus = await Bus.findOne({
        $or: [{ busNumber: busId }, { vehicleNumber: busId }, { "Vehicle Number": busId }],
      });
    }
    if (!bus && mongoose.Types.ObjectId.isValid(busId)) {
      const sch = await Schedule.findById(busId).populate("bus_id");
      if (sch && sch.bus_id) bus = sch.bus_id;
    }

    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found." });
    }

    // 1. Verify valid route assignment
    const routeCheck = await validateBusRouteAssignment(bus);
    if (!routeCheck.isValid) {
      return res.status(400).json({
        success: false,
        bookingEnabled: false,
        isBookingEligible: false,
        message: routeCheck.reason || "This bus does not have a valid assigned route.",
        busId: bus._id,
        busName: bus.busName,
        totalSeats: bus.totalSeats || 32,
        availableSeats: bus.availableSeats || 0,
        bookedSeats: bus.bookedSeats || [],
        seats: [],
      });
    }

    // 2. Verify seat booking is enabled for this bus
    if (bus.bookingEnabled !== true) {
      return res.status(400).json({
        success: false,
        bookingEnabled: false,
        isBookingEligible: false,
        message: "Online seat booking is disabled for this bus (Walk-in / Counter ticketing only).",
        busId: bus._id,
        busName: bus.busName,
        totalSeats: bus.totalSeats || 32,
        availableSeats: bus.availableSeats || 0,
        bookedSeats: bus.bookedSeats || [],
        seats: [],
      });
    }

    const targetDate = String(req.query.date || req.query.travelDate || req.query.serviceDate || "").trim();

    // Determine booked seats specific to this travel date
    let bookedList = [];
    if (targetDate) {
      // Find booked seats on this specific date
      const [dailyReserved, confirmedBookings] = await Promise.all([
        BusDailySeat.find({ busId: bus._id, travelDate: targetDate }).select("seat"),
        Booking.find({
          busId: bus._id,
          travelDate: targetDate,
          status: { $nin: ["Cancelled", "Refunded", "Failed"] },
        }).select("selectedSeats"),
      ]);

      const seatSet = new Set();
      dailyReserved.forEach((d) => {
        if (d.seat) seatSet.add(String(d.seat).trim().toUpperCase());
      });
      confirmedBookings.forEach((b) => {
        if (Array.isArray(b.selectedSeats)) {
          b.selectedSeats.forEach((s) => seatSet.add(String(s).trim().toUpperCase()));
        }
      });
      bookedList = Array.from(seatSet);
    } else {
      // No date specified in query: check today's date first
      const { dateStr: todayIST } = getCurrentISTInfo();
      const [dailyReserved, confirmedBookings] = await Promise.all([
        BusDailySeat.find({ busId: bus._id, travelDate: todayIST }).select("seat"),
        Booking.find({
          busId: bus._id,
          travelDate: todayIST,
          status: { $nin: ["Cancelled", "Refunded", "Failed"] },
        }).select("selectedSeats"),
      ]);

      const seatSet = new Set();
      dailyReserved.forEach((d) => {
        if (d.seat) seatSet.add(String(d.seat).trim().toUpperCase());
      });
      confirmedBookings.forEach((b) => {
        if (Array.isArray(b.selectedSeats)) {
          b.selectedSeats.forEach((s) => seatSet.add(String(s).trim().toUpperCase()));
        }
      });

      if (seatSet.size > 0) {
        bookedList = Array.from(seatSet);
      } else {
        bookedList = bus.bookedSeats || [];
      }
    }

    // Generate fresh grid seat layout
    const seats = [];
    const totalSeats = bus.totalSeats || 32;
    const rows = Math.ceil(totalSeats / 4);
    const cols = ["A", "B", "C", "D"];

    for (let r = 1; r <= rows; r++) {
      for (let c of cols) {
        const seatId = `${r}${c}`;
        const isBooked = bookedList.includes(seatId);
        seats.push({
          id: seatId,
          row: r,
          column: c,
          isBooked,
          isWindow: c === "A" || c === "D",
          price: bus.price || 150,
        });
      }
    }

    res.json({
      success: true,
      bookingEnabled: true,
      isBookingEligible: true,
      busId: bus._id,
      busName: bus.busName,
      travelDate: targetDate || getCurrentISTInfo().dateStr,
      totalSeats,
      availableSeats: Math.max(0, totalSeats - bookedList.length),
      bookedSeats: bookedList,
      seats,
    });
  } catch (error) {
    console.error("Error fetching seats:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch seats." });
  }
});

// 4. POST /bookings (Book Seats - Enforces Rules 1-7)
router.post("/bookings", protect, async (req, res) => {
  try {
    const {
      busId,
      selectedSeats: reqSelectedSeats,
      seatsBooked: reqSeatsBooked,
      totalPrice: reqTotalPrice,
      totalFare: reqTotalFare,
      travelDate: reqTravelDate,
      serviceDate: reqServiceDate,
      fromLocation,
      toLocation,
      passengerName,
      passengerEmail,
      passengerPhone,
      passengers: reqPassengers,
      paymentMethod: reqPaymentMethod,
      arrivalTime: reqArrivalTime,
    } = req.body;

    // Rule 1: Authenticated user is authorized to book
    if (!req.user || !req.user._id) {
      return res.status(401).json({ success: false, message: "Authentication required to book seats." });
    }

    const selectedSeats = Array.isArray(reqSelectedSeats) && reqSelectedSeats.length > 0
      ? reqSelectedSeats
      : (Array.isArray(reqSeatsBooked) ? reqSeatsBooked : []);

    const effectiveTravelDate = (reqTravelDate || reqServiceDate || "").trim() || new Date().toISOString().split("T")[0];
    const numericTotalPrice = Number(reqTotalPrice || reqTotalFare) || 0;

    if (!busId || selectedSeats.length === 0) {
      return res.status(400).json({ success: false, message: "Bus ID and at least 1 selected seat are required." });
    }
    if (selectedSeats.length > 6) {
      return res.status(400).json({ success: false, message: "You can book a maximum of 6 seats per transaction." });
    }

    // Rule 2: Requested bus exists (No auto-creating fake buses!)
    let bus = null;
    if (mongoose.Types.ObjectId.isValid(busId)) {
      bus = await Bus.findById(busId);
    }
    if (!bus) {
      bus = await Bus.findOne({
        $or: [{ busNumber: busId }, { vehicleNumber: busId }, { "Vehicle Number": busId }],
      });
    }
    if (!bus && mongoose.Types.ObjectId.isValid(busId)) {
      const sch = await Schedule.findById(busId).populate("bus_id");
      if (sch && sch.bus_id) bus = sch.bus_id;
    }

    if (!bus) {
      return res.status(404).json({ success: false, message: "Requested bus not found." });
    }

    // Rule 3: Bus has a valid route assignment
    const routeCheck = await validateBusRouteAssignment(bus);
    if (!routeCheck.isValid) {
      return res.status(400).json({
        success: false,
        message: routeCheck.reason || "This bus does not have a valid assigned route for seat booking.",
      });
    }

    // Rule 4: Seat booking is enabled for that bus
    if (bus.bookingEnabled !== true) {
      return res.status(400).json({
        success: false,
        message: "Seat booking is disabled for this bus (Walk-in / Counter ticketing only).",
      });
    }

    // Rule 5: Requested journey is eligible under booking policy
    // 5a. Check active drive
    const activeDrive = await TripSession.findOne({
      $or: [
        { busId: bus._id, status: { $in: ["ACTIVE", "PAUSED"] } },
        { busNumber: bus.busNumber, status: { $in: ["ACTIVE", "PAUSED"] } },
      ],
    });
    if (activeDrive) {
      return res.status(400).json({
        success: false,
        message: "Online booking closed: The driver has already started this trip from the main station.",
      });
    }

    // 5b. Check date eligibility
    const { currentMinutes, dateStr: todayIST } = getCurrentISTInfo();
    if (effectiveTravelDate < todayIST) {
      return res.status(400).json({
        success: false,
        message: "Cannot book tickets for a past service date.",
      });
    }

    // 5c. 5-minute pre-departure cutoff (Evaluates scheduled departure at passenger's boarding station)
    if (effectiveTravelDate === todayIST) {
      let depTimeToCheck = bus.departureTime;
      if (fromLocation) {
        const fullStops = buildCompleteStopsList(bus);
        const matchIdx = fullStops.findIndex((st) => matchLocationStr(st, fromLocation));
        if (matchIdx !== -1 && Array.isArray(bus.schedule) && bus.schedule[0]?.stations && bus.schedule[0].stations[matchIdx]) {
          const stInfo = bus.schedule[0].stations[matchIdx];
          if (stInfo.departureTime && stInfo.departureTime !== "--") {
            depTimeToCheck = stInfo.departureTime;
          }
        }
      }
      const depMins = parseTimeStrToMinutes(depTimeToCheck);
      const cutoffMins = depMins - 5;
      if (currentMinutes >= cutoffMins) {
        const closeTimeStr = addMinutesToTimeStr(depTimeToCheck, -5);
        return res.status(400).json({
          success: false,
          message: `Booking is closed for this trip. Online reservations must be made at least 5 minutes before departure (Closed at ${closeTimeStr} for ${depTimeToCheck} departure).`,
        });
      }
    }

    // Rule 6: Selected seat is valid and available
    const totalSeats = bus.totalSeats || 32;
    const maxRow = Math.ceil(totalSeats / 4);
    for (const seat of selectedSeats) {
      const match = String(seat).trim().match(/^(\d+)([A-D])$/i);
      if (!match) {
        return res.status(400).json({ success: false, message: `Invalid seat format: "${seat}".` });
      }
      const rowNum = parseInt(match[1], 10);
      if (rowNum < 1 || rowNum > maxRow) {
        return res.status(400).json({ success: false, message: `Seat "${seat}" does not exist on this bus (capacity: ${totalSeats} seats).` });
      }
    }

    // Rule 6: Selected seat availability specifically for effectiveTravelDate
    const [dateExistingDaily, dateExistingBookings] = await Promise.all([
      BusDailySeat.find({
        busId: bus._id,
        travelDate: effectiveTravelDate,
        seat: { $in: selectedSeats },
      }),
      Booking.find({
        busId: bus._id,
        travelDate: effectiveTravelDate,
        status: { $nin: ["Cancelled", "Refunded", "Failed"] },
        selectedSeats: { $in: selectedSeats },
      }),
    ]);

    if (dateExistingDaily.length > 0 || dateExistingBookings.length > 0) {
      return res.status(400).json({
        success: false,
        message: `One or more selected seats (${selectedSeats.join(", ")}) have already been booked for ${effectiveTravelDate} by another passenger. Please select different seats.`,
      });
    }

    // Rule 7: Duplicate or concurrent reservations cannot reserve the same seat twice on this date (atomic reservation via unique compound index)
    try {
      await BusDailySeat.insertMany(
        selectedSeats.map((seat) => ({
          busId: bus._id,
          travelDate: effectiveTravelDate,
          seat: String(seat).trim().toUpperCase(),
          userId: String(req.user._id),
        })),
        { ordered: true }
      );
    } catch (dupErr) {
      if (dupErr.code === 11000 || dupErr.name === "MongoBulkWriteError" || dupErr.message?.includes("E11000")) {
        return res.status(409).json({
          success: false,
          message: "One or more selected seats were just reserved by another passenger. Please choose different seats.",
        });
      }
      throw dupErr;
    }

    // Keep Bus.bookedSeats populated for test compatibility and historical logging
    const updatedBus = await Bus.findByIdAndUpdate(
      bus._id,
      {
        $addToSet: { bookedSeats: { $each: selectedSeats } },
      },
      { new: true }
    );

    // Construct structured passenger list per seat
    const primaryName = (passengerName || req.user.name || "Passenger").trim();
    let structuredPassengers = [];
    if (Array.isArray(reqPassengers) && reqPassengers.length > 0) {
      structuredPassengers = selectedSeats.map((seat, idx) => {
        const found = reqPassengers.find((p) => p.seat === seat) || reqPassengers[idx];
        return {
          seat,
          name: (found?.name || (idx === 0 ? primaryName : `Passenger ${idx + 1}`)).trim(),
          age: found?.age || "",
          gender: found?.gender || "",
        };
      });
    } else {
      structuredPassengers = selectedSeats.map((seat, idx) => ({
        seat,
        name: idx === 0 ? primaryName : `Passenger ${idx + 1}`,
        age: "",
        gender: "",
      }));
    }

    // Create unique Booking ID and record in MongoDB
    const bookingId = `MS-BK-${Math.floor(100000 + Math.random() * 900000)}`;
    const finalPrice = numericTotalPrice > 0 ? numericTotalPrice : selectedSeats.length * (bus.price || 150);

    const newBooking = new Booking({
      bookingId,
      userId: String(req.user._id),
      passengerName: primaryName,
      passengerEmail: (passengerEmail || req.user.email || "").trim(),
      passengerPhone: (passengerPhone || req.user.phone || "").trim(),
      passengers: structuredPassengers,
      busId: bus._id,
      busName: bus.busName,
      busNumber: bus.busNumber || "",
      fromLocation: fromLocation || bus.fromLocation || routeCheck.route?.fromLocation || "Origin",
      toLocation: toLocation || bus.toLocation || routeCheck.route?.toLocation || "Destination",
      travelDate: effectiveTravelDate,
      departureTime: bus.departureTime,
      arrivalTime: reqArrivalTime || bus.arrivalTime || "",
      selectedSeats,
      totalPrice: finalPrice,
      paymentMethod: reqPaymentMethod || "rfid",
      driverName: bus.driverName || "",
      driverPhone: bus.driverPhone || "",
      driverLicense: bus.driverLicense || "",
      status: "Confirmed",
    });

    await newBooking.save();
    // Associate bookingId with the daily reserved seats
    await BusDailySeat.updateMany(
      { busId: bus._id, travelDate: effectiveTravelDate, seat: { $in: selectedSeats } },
      { $set: { bookingId: newBooking.bookingId } }
    );
    invalidateBusCache();

    const dateBookedCount = await BusDailySeat.countDocuments({
      busId: bus._id,
      travelDate: effectiveTravelDate,
    });
    const dateRemainingSeats = Math.max(0, totalSeats - dateBookedCount);

    res.status(201).json({
      success: true,
      message: "Bus ticket booking confirmed successfully! 🎉",
      booking: newBooking,
      availableSeats: dateRemainingSeats,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    try {
      if (bus && effectiveTravelDate && Array.isArray(selectedSeats)) {
        await BusDailySeat.deleteMany({
          busId: bus._id,
          travelDate: effectiveTravelDate,
          seat: { $in: selectedSeats },
          bookingId: { $in: ["", null, undefined] },
        });
      }
    } catch (cleanupErr) {
      console.error("Seat reservation rollback error:", cleanupErr);
    }
    res.status(500).json({ success: false, message: error.message || "Failed to confirm booking." });
  }
});

// 5. GET /bookings/user/:userId (User Bookings History)
router.get("/bookings/user/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const { email, phone } = req.query;

    const conditions = [];
    if (userId && userId !== "undefined" && userId !== "null") {
      conditions.push({ userId });
    }
    if (email && String(email).trim()) {
      conditions.push({ passengerEmail: String(email).trim() });
    }
    if (phone && String(phone).trim()) {
      conditions.push({ passengerPhone: String(phone).trim() });
    }

    const query = conditions.length > 0 ? { $or: conditions } : { userId };
    const bookings = await Booking.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// PASSENGER BOOKINGS MANAGEMENT ENDPOINTS (ADMIN & DRIVER)
// ==========================================

// GET /admin/bookings (Fetch all bookings with search, filters & executive stats)
router.get("/admin/bookings", async (req, res) => {
  try {
    const { search, status, date, busNumber, page = 1, limit = 50 } = req.query;
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (date && date.trim()) {
      filter.travelDate = date.trim();
    }

    if (busNumber && busNumber !== "all") {
      filter.busNumber = new RegExp(`^${busNumber.trim()}$`, "i");
    }

    if (search && search.trim()) {
      const q = search.trim();
      const sReg = new RegExp(q, "i");
      filter.$or = [
        { bookingId: sReg },
        { passengerName: sReg },
        { passengerEmail: sReg },
        { passengerPhone: sReg },
        { fromLocation: sReg },
        { toLocation: sReg },
        { busNumber: sReg },
        { busName: sReg },
        { selectedSeats: { $in: [q.toUpperCase(), q] } },
      ];
    }

    const total = await Booking.countDocuments(filter);
    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit))
      .lean();

    // Auto-fill busNumber / driverName if legacy booking has empty busNumber
    for (const b of bookings) {
      if (!b.busNumber && b.busId) {
        try {
          const busDoc = await Bus.findById(b.busId).select("busNumber busName driverName").lean();
          if (busDoc) {
            b.busNumber = busDoc.busNumber;
            b.busName = busDoc.busName || b.busName;
            b.driverName = busDoc.driverName || "Driver Assigned";
          }
        } catch (_) {}
      }
    }

    // Aggregate Executive Stats
    const allFiltered = await Booking.find(filter).select("status totalPrice selectedSeats travelDate").lean();
    let totalRevenue = 0;
    let confirmedCount = 0;
    let cancelledCount = 0;
    let pendingCount = 0;
    let totalPassengers = 0;
    let todayBookingsCount = 0;
    const todayStr = getCurrentISTInfo().dateStr;

    allFiltered.forEach((b) => {
      const isConfirmed = b.status === "Confirmed";
      if (isConfirmed) {
        confirmedCount++;
        totalRevenue += Number(b.totalPrice || 0);
      } else if (b.status === "Cancelled") {
        cancelledCount++;
      } else {
        pendingCount++;
      }

      const seats = Array.isArray(b.selectedSeats) ? b.selectedSeats.length : 1;
      totalPassengers += seats;

      if (b.travelDate === todayStr) {
        todayBookingsCount++;
      }
    });

    const buses = await Bus.find().select("busNumber busName").sort({ busNumber: 1 }).lean();

    res.json({
      success: true,
      count: bookings.length,
      bookings,
      buses,
      stats: {
        totalBookings: total,
        confirmedCount,
        cancelledCount,
        pendingCount,
        totalRevenue,
        todayBookingsCount,
        totalPassengers,
      },
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (error) {
    console.error("Error in GET /admin/bookings:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch bookings." });
  }
});

// PATCH /admin/bookings/:bookingId/status (Update status e.g. Cancelled / Confirmed)
router.patch("/admin/bookings/:bookingId/status", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { status } = req.body;

    if (!["Confirmed", "Cancelled", "Pending"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value." });
    }

    const booking = await Booking.findOne({
      $or: [{ bookingId }, { _id: mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found." });
    }

    const previousStatus = booking.status;
    booking.status = status;
    await booking.save();

    // If cancelled, release seats from BusDailySeat so other passengers can book!
    if (status === "Cancelled" && previousStatus !== "Cancelled") {
      await BusDailySeat.deleteMany({
        busId: booking.busId,
        travelDate: booking.travelDate,
        seat: { $in: booking.selectedSeats },
      });
      invalidateBusCache();
    }

    res.json({
      success: true,
      message: `Booking ${booking.bookingId} marked as ${status}.`,
      booking,
    });
  } catch (error) {
    console.error("Error updating booking status:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update booking status." });
  }
});

// GET /driver/bookings (Fetch passenger manifest, sub-station roster & seat bookings for driver)
router.get("/driver/bookings", async (req, res) => {
  try {
    const { busNumber, date, driverName, driverId } = req.query;
    const targetDate = date && date !== "All" ? date.trim() : null;

    let targetBuses = [];
    if (busNumber && busNumber.trim() && busNumber !== "all") {
      targetBuses = [busNumber.trim().toUpperCase()];
    } else {
      // Find buses driven by this driver
      const drvNameQuery = driverName || req.user?.name;
      const drvIdQuery = driverId || req.user?._id;

      const busDocs = await Bus.find({
        $or: [
          drvIdQuery ? { driverId: drvIdQuery } : null,
          drvNameQuery ? { driverName: new RegExp(`^${drvNameQuery}$`, "i") } : null,
          drvNameQuery ? { "shifts.morning.driverName": new RegExp(`^${drvNameQuery}$`, "i") } : null,
          drvNameQuery ? { "shifts.evening.driverName": new RegExp(`^${drvNameQuery}$`, "i") } : null,
          drvNameQuery ? { "shifts.night.driverName": new RegExp(`^${drvNameQuery}$`, "i") } : null,
        ].filter(Boolean),
      }).select("busNumber vehicleNumber").lean();

      if (busDocs.length > 0) {
        targetBuses = busDocs.map((b) => (b.busNumber || b.vehicleNumber || "").trim().toUpperCase()).filter(Boolean);
      }
    }

    // Build query for bookings
    const filter = {};
    if (targetBuses.length > 0) {
      filter.busNumber = { $in: targetBuses.map((b) => new RegExp(`^${b}$`, "i")) };
    }
    if (targetDate) {
      filter.travelDate = targetDate;
    }
    filter.status = { $ne: "Cancelled" };

    const bookings = await Booking.find(filter).sort({ travelDate: 1, departureTime: 1 }).lean();

    // Build Station-by-Station Roster
    const stationMap = new Map();
    let totalPassengers = 0;
    let boardedCount = 0;

    bookings.forEach((b) => {
      const fromSt = b.fromLocation || "Origin";
      const toSt = b.toLocation || "Destination";

      if (!stationMap.has(fromSt)) {
        stationMap.set(fromSt, { stationName: fromSt, boarding: [], dropping: [] });
      }
      if (!stationMap.has(toSt)) {
        stationMap.set(toSt, { stationName: toSt, boarding: [], dropping: [] });
      }

      const passengerList = Array.isArray(b.passengers) && b.passengers.length > 0
        ? b.passengers
        : (b.selectedSeats || []).map((seat) => ({ seat, name: b.passengerName }));

      passengerList.forEach((p) => {
        totalPassengers++;
        if (p.boarded || b.boarded) {
          boardedCount++;
        }
        stationMap.get(fromSt).boarding.push({
          bookingId: b.bookingId,
          seat: p.seat,
          passengerName: p.name || b.passengerName,
          passengerPhone: b.passengerPhone,
          age: p.age,
          gender: p.gender,
          fromLocation: fromSt,
          toLocation: toSt,
          departureTime: b.departureTime,
          boarded: Boolean(p.boarded || b.boarded),
        });

        stationMap.get(toSt).dropping.push({
          bookingId: b.bookingId,
          seat: p.seat,
          passengerName: p.name || b.passengerName,
          fromLocation: fromSt,
          toLocation: toSt,
          boarded: Boolean(p.boarded || b.boarded),
        });
      });
    });

    const stationRoster = Array.from(stationMap.values()).filter(
      (s) => s.boarding.length > 0 || s.dropping.length > 0
    );

    res.json({
      success: true,
      count: bookings.length,
      bookings,
      stationRoster,
      stats: {
        totalBookings: bookings.length,
        totalPassengers,
        boardedCount,
        pendingBoardingCount: Math.max(0, totalPassengers - boardedCount),
        targetBuses,
        selectedDate: targetDate || "All Dates",
      },
    });
  } catch (error) {
    console.error("Error fetching driver bookings:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch driver manifest." });
  }
});

// PATCH /driver/bookings/:bookingId/board (Driver toggles passenger check-in/boarded status)
router.patch("/driver/bookings/:bookingId/board", async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { seat, boarded, stationName } = req.body;

    const booking = await Booking.findOne({
      $or: [{ bookingId }, { _id: mongoose.Types.ObjectId.isValid(bookingId) ? bookingId : null }],
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking record not found." });
    }

    const targetBoarded = boarded !== undefined ? Boolean(boarded) : true;

    if (seat && Array.isArray(booking.passengers)) {
      let seatFound = false;
      booking.passengers.forEach((p) => {
        if (p.seat === seat) {
          p.boarded = targetBoarded;
          p.boardedAt = targetBoarded ? new Date() : null;
          if (stationName) p.boardedStation = stationName;
          seatFound = true;
        }
      });

      if (!seatFound && Array.isArray(booking.selectedSeats) && booking.selectedSeats.includes(seat)) {
        booking.passengers.push({
          seat,
          name: booking.passengerName,
          boarded: targetBoarded,
          boardedAt: targetBoarded ? new Date() : null,
          boardedStation: stationName || booking.fromLocation,
        });
      }
    } else {
      booking.boarded = targetBoarded;
      booking.boardedAt = targetBoarded ? new Date() : null;
      if (stationName) booking.boardedStation = stationName;
    }

    await booking.save();

    res.json({
      success: true,
      message: `Passenger for seat ${seat || "ALL"} marked as ${targetBoarded ? "Boarded" : "Pending"}.`,
      booking,
    });
  } catch (error) {
    console.error("Error updating passenger boarding:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update check-in." });
  }
});

// ==========================================
// ADMIN BUS & ROUTE MANAGEMENT ENDPOINTS
// ==========================================

// --- ADMIN BUS MANAGEMENT ---

// GET /admin/buses (Fetch all buses for admin sorted newest first)
router.get("/admin/buses", async (req, res) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });
    res.json({ success: true, count: buses.length, buses });
  } catch (error) {
    console.error("Error fetching admin buses:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch buses." });
  }
});

// POST /admin/buses (Create a new bus)
router.post("/admin/buses", protect, adminOnly, async (req, res) => {
  try {
    const {
      busNumber,
      busName,
      busType,
      operator,
      fromLocation,
      toLocation,
      departureTime,
      arrivalTime,
      duration,
      totalSeats,
      price,
      amenities,
      driverName,
      driverPhone,
      driverEmail,
      driverLicense,
      driverId,
      driverPhoto,
      driverVerified,
      driverExperience,
      stops,
      route_id,
      routeId,
    } = req.body;

    if (!busName || !String(busName).trim()) {
      return res.status(400).json({
        success: false,
        message: "Bus Name is required.",
      });
    }

    // Auto-generate busNumber if empty
    const finalBusNumber = busNumber && String(busNumber).trim()
      ? String(busNumber).trim().toUpperCase()
      : `KL-07-MS-${Math.floor(1000 + Math.random() * 9000)}`;

    const existing = await Bus.findOne({ busNumber: new RegExp("^" + finalBusNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A bus with registration number "${finalBusNumber}" already exists in the database.`,
      });
    }

    const seatsCount = Number(totalSeats) > 0 ? Number(totalSeats) : 32;
    const numericPrice = (price !== undefined && price !== null && price !== "" && !isNaN(Number(price)) && Number(price) > 0)
      ? Number(price)
      : 100;

    let finalFromLocation = (fromLocation && typeof fromLocation === "string" && fromLocation.trim()) ? fromLocation.trim() : "Depot";
    let finalToLocation = (toLocation && typeof toLocation === "string" && toLocation.trim()) ? toLocation.trim() : "Depot";
    const finalDepartureTime = (departureTime && typeof departureTime === "string" && departureTime.trim()) ? departureTime.trim() : "06:00 AM";
    const finalArrivalTime = (arrivalTime && typeof arrivalTime === "string" && arrivalTime.trim()) ? arrivalTime.trim() : "10:00 PM";

    // Route Assignment Validation
    let assignedRouteId = null;
    let assignedRouteName = "";
    const rawRouteId = route_id || routeId;
    if (rawRouteId && mongoose.Types.ObjectId.isValid(rawRouteId)) {
      const routeDoc = await Route.findById(rawRouteId);
      if (routeDoc) {
        assignedRouteId = routeDoc._id;
        assignedRouteName = routeDoc.routeName || `${routeDoc.fromLocation} ➔ ${routeDoc.toLocation}`;
        if (!fromLocation || fromLocation === "Depot") finalFromLocation = routeDoc.fromLocation;
        if (!toLocation || toLocation === "Depot") finalToLocation = routeDoc.toLocation;
      }
    }

    const parsedStops = Array.isArray(stops)
      ? stops
      : (typeof stops === "string" && stops.trim() ? stops.split(",").map((s) => s.trim()).filter(Boolean) : []);

    // Driver Assignment Validation (ONE DRIVER -> MAXIMUM ONE BUS)
    let assignedDriverId = null;
    let assignedDriverName = "Not Assigned";
    let assignedDriverPhone = "N/A";
    let assignedDriverEmail = "";
    let assignedDriverLicense = "N/A";
    let assignedDriverPhoto = "";
    let assignedDriverVerified = false;
    let assignedDriverExperience = 0;

    const rawDriverIdStr = driverId ? String(driverId).trim() : "";
    const isValidObjectId = rawDriverIdStr && rawDriverIdStr.match(/^[0-9a-fA-F]{24}$/) && rawDriverIdStr !== "unassigned";

    if (isValidObjectId) {
      // Check if driver is assigned to another bus
      const existingBusWithDriver = await Bus.findOne({ driverId: rawDriverIdStr });
      if (existingBusWithDriver) {
        return res.status(409).json({
          success: false,
          message: "Driver is already assigned to another bus.",
        });
      }

      assignedDriverId = rawDriverIdStr;
      const driverUser = await User.findById(rawDriverIdStr);
      if (driverUser) {
        assignedDriverName = driverUser.name || "Not Assigned";
        assignedDriverPhone = driverUser.phone || "N/A";
        assignedDriverEmail = driverUser.email || "";
        assignedDriverLicense = driverUser.licenseNumber || "N/A";
        assignedDriverPhoto = driverUser.profilePic || driverUser.licenseImage || "";
        assignedDriverVerified = driverUser.verificationStatus === "Approved";
        assignedDriverExperience = driverUser.experienceYears || 0;
      }
    } else if (driverName && !["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver", "not assigned"].includes(String(driverName).toLowerCase().trim())) {
      assignedDriverName = String(driverName).trim();
      assignedDriverPhone = driverPhone || "N/A";
      assignedDriverEmail = driverEmail || "";
      assignedDriverLicense = driverLicense || "N/A";
      assignedDriverPhoto = driverPhoto || "";
      assignedDriverVerified = driverVerified !== undefined ? Boolean(driverVerified) : false;
      assignedDriverExperience = driverExperience ? Number(driverExperience) : 0;
    }

    const newBus = new Bus({
      busNumber: finalBusNumber,
      busName: busName.trim(),
      busType: busType || "Normal Bus",
      operator: operator || "MoveSmart Fleet Ops",
      fromLocation: finalFromLocation,
      toLocation: finalToLocation,
      departureTime: finalDepartureTime,
      arrivalTime: finalArrivalTime,
      duration: duration || "4h 30m",
      totalSeats: seatsCount,
      availableSeats: seatsCount,
      price: numericPrice,
      amenities: Array.isArray(amenities) && amenities.length > 0 ? amenities : ["Wi-Fi", "Charging Port", "Live Tracking", "AC"],
      driverId: assignedDriverId,
      driverName: assignedDriverName,
      driverPhone: assignedDriverPhone,
      driverEmail: assignedDriverEmail,
      driverLicense: assignedDriverLicense,
      driverPhoto: assignedDriverPhoto,
      driverVerified: assignedDriverVerified,
      driverExperience: assignedDriverExperience,
      stops: parsedStops,
      route_id: assignedRouteId,
      routeName: assignedRouteName,
      bookingEnabled: req.body.bookingEnabled !== undefined ? Boolean(req.body.bookingEnabled) : false,
      bookedSeats: [],
    });

    await newBus.save();
    invalidateBusCache();

    res.status(201).json({
      success: true,
      message: `Bus "${newBus.busName}" (${newBus.busNumber}) created successfully! 🚌`,
      bus: newBus,
    });
  } catch (error) {
    console.error("Error creating bus:", error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Bus registration number already exists in the system. Please use a unique number.`,
      });
    }
    res.status(500).json({ success: false, message: error.message || "Failed to create bus." });
  }
});

// PUT /admin/buses/:id (Update bus details)
router.put("/admin/buses/:id", protect, adminOnly, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found." });
    }

    const {
      busNumber,
      busName,
      busType,
      operator,
      fromLocation,
      toLocation,
      departureTime,
      arrivalTime,
      duration,
      totalSeats,
      price,
      amenities,
      driverName,
      driverPhone,
      driverEmail,
      driverLicense,
      driverId,
      driverPhoto,
      driverVerified,
      driverExperience,
      stops,
      route_id,
      routeId,
    } = req.body;

    if (busNumber) bus.busNumber = busNumber.trim().toUpperCase();
    if (busName) bus.busName = busName.trim();
    if (busType) bus.busType = busType;
    if (operator) bus.operator = operator;
    if (fromLocation) bus.fromLocation = fromLocation.trim();
    if (toLocation) bus.toLocation = toLocation.trim();
    if (departureTime) bus.departureTime = departureTime.trim();
    if (arrivalTime) bus.arrivalTime = arrivalTime.trim();
    if (duration) bus.duration = duration.trim();
    if (totalSeats) {
      const seatsCount = Number(totalSeats);
      bus.totalSeats = seatsCount;
      bus.availableSeats = Math.max(0, seatsCount - bus.bookedSeats.length);
    }
    if (price) bus.price = Number(price);
    if (Array.isArray(amenities)) bus.amenities = amenities;

    // Handle route assignment independently without touching bookingEnabled
    const incomingRouteId = route_id !== undefined ? route_id : routeId;
    if (incomingRouteId !== undefined) {
      if (!incomingRouteId || incomingRouteId === "unassigned" || incomingRouteId === "null") {
        bus.route_id = null;
        bus.routeName = "";
      } else if (mongoose.Types.ObjectId.isValid(incomingRouteId)) {
        const routeDoc = await Route.findById(incomingRouteId);
        if (routeDoc) {
          bus.route_id = routeDoc._id;
          bus.routeName = routeDoc.routeName || `${routeDoc.fromLocation} ➔ ${routeDoc.toLocation}`;
        }
      }
    }

    // Handle booking permission independently without silently altering assigned route
    if (req.body.bookingEnabled !== undefined) {
      bus.bookingEnabled = Boolean(req.body.bookingEnabled);
      await Schedule.updateMany(
        { $or: [{ bus_id: bus._id }, { busNumber: bus.busNumber }] },
        { $set: { bookingEnabled: bus.bookingEnabled } }
      );
    }

    // Driver Assignment Logic (ONE DRIVER -> MAXIMUM ONE BUS)
    if (driverId !== undefined) {
      const rawDriverIdStr = driverId ? String(driverId).trim() : "";
      const isValidObjectId = rawDriverIdStr && rawDriverIdStr.match(/^[0-9a-fA-F]{24}$/) && rawDriverIdStr !== "unassigned";

      if (isValidObjectId) {
        // Check if assigned to ANOTHER bus
        const existingBusWithDriver = await Bus.findOne({
          driverId: rawDriverIdStr,
          _id: { $ne: req.params.id },
        });

        if (existingBusWithDriver) {
          return res.status(409).json({
            success: false,
            message: "Driver is already assigned to another bus.",
          });
        }

        bus.driverId = rawDriverIdStr;
        const driverUser = await User.findById(rawDriverIdStr);
        if (driverUser) {
          bus.driverName = driverUser.name || "Not Assigned";
          bus.driverPhone = driverUser.phone || "N/A";
          bus.driverEmail = driverUser.email || "";
          bus.driverLicense = driverUser.licenseNumber || "N/A";
          bus.driverPhoto = driverUser.profilePic || driverUser.licenseImage || "";
          bus.driverVerified = driverUser.verificationStatus === "Approved";
          bus.driverExperience = driverUser.experienceYears || 0;
        } else if (driverName !== undefined) {
          bus.driverName = driverName;
          if (driverPhone !== undefined) bus.driverPhone = driverPhone;
          if (driverEmail !== undefined) bus.driverEmail = driverEmail;
          if (driverLicense !== undefined) bus.driverLicense = driverLicense;
          if (driverPhoto !== undefined) bus.driverPhoto = driverPhoto;
          if (driverVerified !== undefined) bus.driverVerified = Boolean(driverVerified);
          if (driverExperience !== undefined) bus.driverExperience = Number(driverExperience);
        }
      } else {
        // Unassign Driver
        bus.driverId = null;
        bus.driverName = "Not Assigned";
        bus.driverPhone = "N/A";
        bus.driverEmail = "";
        bus.driverLicense = "N/A";
        bus.driverPhoto = "";
        bus.driverVerified = false;
        bus.driverExperience = 0;
      }
    } else if (driverName !== undefined) {
      const isGenericName = (n) => !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver", "not assigned"].includes(String(n).toLowerCase().trim());
      if (isGenericName(driverName)) {
        bus.driverId = null;
        bus.driverName = "Not Assigned";
        bus.driverPhone = "N/A";
        bus.driverLicense = "N/A";
      } else {
        bus.driverName = driverName;
        if (driverPhone !== undefined) bus.driverPhone = driverPhone;
        if (driverEmail !== undefined) bus.driverEmail = driverEmail;
        if (driverLicense !== undefined) bus.driverLicense = driverLicense;
        if (driverPhoto !== undefined) bus.driverPhoto = driverPhoto;
        if (driverVerified !== undefined) bus.driverVerified = Boolean(driverVerified);
        if (driverExperience !== undefined) bus.driverExperience = Number(driverExperience);
      }
    }

    if (stops !== undefined) {
      bus.stops = Array.isArray(stops)
        ? stops
        : (typeof stops === "string" && stops.trim() ? stops.split(",").map((s) => s.trim()).filter(Boolean) : []);
    }

    await bus.save();
    invalidateBusCache();

    res.json({
      success: true,
      message: `Bus "${bus.busName}" updated successfully! ✅`,
      bus,
    });
  } catch (error) {
    console.error("Error updating bus:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update bus." });
  }
});

// DELETE /admin/buses/:id (Delete bus)
router.delete("/admin/buses/:id", protect, adminOnly, async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found." });
    }
    invalidateBusCache();
    res.json({
      success: true,
      message: `Bus "${bus.busName}" (${bus.busNumber}) deleted successfully! 🗑️`,
    });
  } catch (error) {
    console.error("Error deleting bus:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete bus." });
  }
});


// --- ADMIN ROUTE MANAGEMENT ---

// GET /admin/routes (Fetch all routes)
router.get("/admin/routes", async (req, res) => {
  try {
    const routes = await Route.find().sort({ createdAt: -1 });
    res.json({ success: true, count: routes.length, routes });
  } catch (error) {
    console.error("Error fetching routes:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch routes." });
  }
});

function processStopsAndOffsets(stopsInput) {
  let rawStops = [];
  if (Array.isArray(stopsInput)) {
    rawStops = stopsInput;
  } else if (typeof stopsInput === "string") {
    rawStops = stopsInput.split(",").map((s) => s.trim()).filter(Boolean);
  }

  let cumulative = 0;
  const legacyList = [];
  const structuredList = rawStops.map((st, idx) => {
    let stopName = "";
    let travelTime = 0;
    let latitude = null;
    let longitude = null;
    let distanceFromPreviousStop = 0;
    let cumulativeDistance = 0;
    let source = "automatic";

    if (typeof st === "object" && st !== null) {
      stopName = (st.stopName || st.name || st.stop || "").trim();
      travelTime = idx === 0 ? 0 : Math.max(0, Number(st.travel_time_from_prev) || 0);
      latitude = st.latitude !== undefined && st.latitude !== null ? Number(st.latitude) : null;
      longitude = st.longitude !== undefined && st.longitude !== null ? Number(st.longitude) : null;
      distanceFromPreviousStop = Number(st.distanceFromPreviousStop || 0);
      cumulativeDistance = Number(st.cumulativeDistance || 0);
      source = st.source || "automatic";
    } else {
      stopName = String(st).trim();
      travelTime = idx === 0 ? 0 : 25;
    }

    cumulative += travelTime;
    legacyList.push(stopName);

    return {
      stopName: stopName,
      name: stopName,
      order: idx + 1,
      latitude: latitude,
      longitude: longitude,
      distanceFromPreviousStop: distanceFromPreviousStop,
      cumulativeDistance: cumulativeDistance,
      travel_time_from_prev: travelTime,
      offset_minutes: cumulative,
      source: source,
    };
  });

  const hours = Math.floor(cumulative / 60);
  const remainingMins = cumulative % 60;
  let formattedDuration = `${cumulative}m`;
  if (hours > 0) {
    formattedDuration = remainingMins === 0 ? `${hours}h` : `${hours}h ${remainingMins}m`;
  }

  return {
    structuredStops: structuredList,
    legacyStops: legacyList,
    totalDurationMinutes: cumulative,
    formattedDuration: cumulative > 0 ? formattedDuration : null,
  };
}

// POST /admin/routes (Create new route)
router.post("/admin/routes", async (req, res) => {
  try {
    const { routeId, routeName, fromLocation, toLocation, startingPoint, destination, routeGeometry, totalDistance, distanceKm, duration, estimatedTravelTime, base_start_time, frequency, stops, fare, status } = req.body;

    if (!routeId || (!fromLocation && !startingPoint?.name) || (!toLocation && !destination?.name) || (!distanceKm && !totalDistance) || !fare) {
      return res.status(400).json({
        success: false,
        message: "Route ID, From/To locations, distance, and fare are required.",
      });
    }

    const existing = await Route.findOne({ routeId: routeId.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `Route ID "${routeId}" already exists.`,
      });
    }

    const { structuredStops, legacyStops, totalDurationMinutes, formattedDuration } = processStopsAndOffsets(stops);

    const fromName = (fromLocation || startingPoint?.name || "").trim();
    const toName = (toLocation || destination?.name || "").trim();
    const generatedRouteName = routeName ? routeName.trim() : `${fromName} ➔ ${toName}`;

    const newRoute = new Route({
      routeId: routeId.trim().toUpperCase(),
      routeName: generatedRouteName,
      fromLocation: fromName,
      toLocation: toName,
      startingPoint: startingPoint || { name: fromName, latitude: null, longitude: null },
      destination: destination || { name: toName, latitude: null, longitude: null },
      routeGeometry: routeGeometry || [],
      totalDistance: Number(totalDistance || distanceKm || 0),
      distanceKm: Number(distanceKm || totalDistance || 0),
      duration: duration || estimatedTravelTime || formattedDuration || "4h 30m",
      estimatedTravelTime: estimatedTravelTime || duration || formattedDuration || "4h 30m",
      total_duration_minutes: totalDurationMinutes || 270,
      base_start_time: base_start_time || "08:00 AM",
      frequency: frequency || "Every 30 mins",
      legacyStops,
      stops: structuredStops,
      fare: Number(fare),
      status: status || "Active",
    });

    await newRoute.save();
    invalidateBusCache();

    res.status(201).json({
      success: true,
      message: `Route "${newRoute.routeId} - ${newRoute.routeName}" added successfully! 🛣️`,
      route: newRoute,
    });
  } catch (error) {
    console.error("Error creating route:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create route." });
  }
});

// PUT /admin/routes/:id (Update route details)
router.put("/admin/routes/:id", async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found." });
    }

    const { routeId, routeName, fromLocation, toLocation, startingPoint, destination, routeGeometry, totalDistance, distanceKm, duration, estimatedTravelTime, base_start_time, frequency, stops, fare, status } = req.body;

    if (routeId) route.routeId = routeId.trim().toUpperCase();
    if (routeName) route.routeName = routeName.trim();
    if (fromLocation) route.fromLocation = fromLocation.trim();
    if (toLocation) route.toLocation = toLocation.trim();
    if (startingPoint) route.startingPoint = startingPoint;
    if (destination) route.destination = destination;
    if (routeGeometry) route.routeGeometry = routeGeometry;
    if (totalDistance !== undefined) route.totalDistance = Number(totalDistance);
    if (distanceKm !== undefined) route.distanceKm = Number(distanceKm);
    if (base_start_time) route.base_start_time = base_start_time.trim();
    if (frequency) route.frequency = frequency.trim();

    if (stops !== undefined) {
      const { structuredStops, legacyStops, totalDurationMinutes, formattedDuration } = processStopsAndOffsets(stops);
      route.stops = structuredStops;
      route.legacyStops = legacyStops;
      route.total_duration_minutes = totalDurationMinutes;
      if (formattedDuration) route.duration = formattedDuration;
    }

    if (duration) route.duration = duration.trim();
    if (estimatedTravelTime) route.estimatedTravelTime = estimatedTravelTime.trim();
    if (fare !== undefined) route.fare = Number(fare);
    if (status) route.status = status;

    await route.save();
    invalidateBusCache();

    res.json({
      success: true,
      message: `Route "${route.routeId}" updated successfully! ✅`,
      route,
    });
  } catch (error) {
    console.error("Error updating route:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update route." });
  }
});

// DELETE /admin/routes/:id (Delete route)
router.delete("/admin/routes/:id", async (req, res) => {
  try {
    const route = await Route.findByIdAndDelete(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found." });
    }
    await Schedule.deleteMany({ route_id: req.params.id });
    invalidateBusCache();
    res.json({
      success: true,
      message: `Route "${route.routeId} - ${route.routeName}" deleted successfully! 🗑️`,
    });
  } catch (error) {
    console.error("Error deleting route:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete route." });
  }
});

// --- SCHEDULE DEPARTURES MANAGEMENT ---

// GET /admin/schedules (Fetch all route departure schedules)
router.get("/admin/schedules", async (req, res) => {
  try {
    const rawSchedules = await Schedule.find().populate("route_id").populate("bus_id").sort({ createdAt: -1 });
    const isGeneric = (n) => !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver"].includes(String(n).toLowerCase().trim());
    const schedules = rawSchedules.map((sch) => {
      const obj = sch.toObject ? sch.toObject() : sch;
      const busDrv = obj.bus_id && obj.bus_id.driverName;
      if (isGeneric(obj.driverName)) {
        obj.driverName = !isGeneric(busDrv) ? busDrv : "Not Assigned";
      }
      return obj;
    });
    res.json({ success: true, count: schedules.length, schedules });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch schedules." });
  }
});

function normalizeTimeStr(timeStr) {
  if (!timeStr || typeof timeStr !== "string") return "";
  const cleanStr = timeStr.trim().toUpperCase();
  const isPM = cleanStr.includes("PM");
  const isAM = cleanStr.includes("AM");

  const match = cleanStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return cleanStr;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  const totalMins = (hours * 60 + minutes) % 1440;
  const hours24 = Math.floor(totalMins / 60);
  const mins = totalMins % 60;

  const period = hours24 >= 12 ? "PM" : "AM";
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;

  return `${hours12.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${period}`;
}

// POST /admin/schedules (Create departure schedule)
router.post("/admin/schedules", async (req, res) => {
  try {
    let { route_id, start_time, bus_id, busNumber, driver_id, driverName, delay_buffer_minutes, is_active } = req.body;

    if (!route_id || !start_time) {
      return res.status(400).json({ success: false, message: "Route ID and Departure Start Time are required." });
    }

    // 1. Normalize the start_time
    const normalizedNewTime = normalizeTimeStr(start_time);

    // 2. Enforce duplicate check (same route + same time)
    const existingSchedules = await Schedule.find({ route_id });
    const isDuplicate = existingSchedules.some(
      (s) => normalizeTimeStr(s.start_time) === normalizedNewTime
    );

    if (isDuplicate) {
      return res.status(400).json({
        success: false,
        message: "This route is already scheduled at this time. Please select a different time.",
      });
    }

    const routeObj = await Route.findById(route_id);
    if (!routeObj) {
      return res.status(404).json({ success: false, message: "Associated route not found." });
    }

    const isGeneric = (n) => !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver"].includes(String(n).toLowerCase().trim());

    // Auto-fill bus details from Bus model if bus_id is present
    if (bus_id) {
      const matchedBus = await Bus.findById(bus_id);
      if (matchedBus) {
        if (!busNumber) busNumber = matchedBus.busNumber;
      }
    }

    if (isGeneric(driverName)) {
      driverName = "Not Assigned";
    }

    const newSchedule = new Schedule({
      route_id,
      routeName: routeObj.routeName,
      start_time: start_time.trim(),
      bus_id: bus_id || null,
      busNumber: busNumber || "",
      driver_id: driver_id || null,
      driverName: driverName,
      delay_buffer_minutes: Number(delay_buffer_minutes || 0),
      is_active: is_active !== false,
    });

    await newSchedule.save();
    invalidateBusCache();

    res.status(201).json({
      success: true,
      message: `Departure schedule created for ${routeObj.routeName} at ${start_time}! ⏱️`,
      schedule: newSchedule,
    });
  } catch (error) {
    console.error("Error creating schedule:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create schedule." });
  }
});

// PUT /admin/schedules/:id (Update departure schedule)
router.put("/admin/schedules/:id", async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }

    const { route_id, start_time, bus_id, busNumber, driver_id, driverName, delay_buffer_minutes, is_active } = req.body;

    // Enforce duplicate check (same route + same time, excluding this record)
    const newStartTime = start_time ? start_time.trim() : schedule.start_time;
    const newRouteId = route_id || schedule.route_id;

    if (newStartTime && newRouteId) {
      const normalizedNewTime = normalizeTimeStr(newStartTime);
      const existingSchedules = await Schedule.find({ route_id: newRouteId });
      const isDuplicate = existingSchedules.some(
        (s) => String(s._id) !== req.params.id && normalizeTimeStr(s.start_time) === normalizedNewTime
      );

      if (isDuplicate) {
        return res.status(400).json({
          success: false,
          message: "This route is already scheduled at this time. Please select a different time.",
        });
      }
    }

    if (route_id) {
      schedule.route_id = route_id;
      const routeObj = await Route.findById(route_id);
      if (routeObj) schedule.routeName = routeObj.routeName;
    }

    const isGeneric = (n) => !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver"].includes(String(n).toLowerCase().trim());

    if (start_time) schedule.start_time = start_time.trim();
    if (bus_id !== undefined) schedule.bus_id = bus_id || null;
    if (busNumber !== undefined) schedule.busNumber = busNumber;
    if (driver_id !== undefined) schedule.driver_id = driver_id || null;
    if (driverName !== undefined) {
      schedule.driverName = !isGeneric(driverName) ? driverName : "Not Assigned";
    }

    // Auto-fill bus number from Bus if bus_id exists and busNumber is missing
    if (schedule.bus_id) {
      const matchedBus = await Bus.findById(schedule.bus_id);
      if (matchedBus && !schedule.busNumber) {
        schedule.busNumber = matchedBus.busNumber;
      }
    }

    if (isGeneric(schedule.driverName)) {
      schedule.driverName = "Not Assigned";
    }

    if (delay_buffer_minutes !== undefined) schedule.delay_buffer_minutes = Number(delay_buffer_minutes || 0);
    if (is_active !== undefined) schedule.is_active = Boolean(is_active);

    await schedule.save();
    invalidateBusCache();

    res.json({
      success: true,
      message: "Schedule departure updated successfully! ⏱️",
      schedule,
    });
  } catch (error) {
    console.error("Error updating schedule:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update schedule." });
  }
});

// DELETE /admin/schedules/:id (Delete departure schedule)
router.delete("/admin/schedules/:id", async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }
    invalidateBusCache();
    res.json({ success: true, message: "Schedule departure deleted successfully!" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete schedule." });
  }
});

// PATCH /admin/schedules/:id/toggle — Toggle is_active on a departure schedule
router.patch("/admin/schedules/:id/toggle", async (req, res) => {
  try {
    const schedule = await Schedule.findById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }
    schedule.is_active = !schedule.is_active;
    await schedule.save();
    invalidateBusCache();
    const state = schedule.is_active ? "enabled" : "disabled";
    res.json({ success: true, is_active: schedule.is_active, message: `Departure schedule ${state} successfully.` });
  } catch (error) {
    console.error("Error toggling schedule:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to toggle schedule." });
  }
});

// PATCH /admin/routes/:id/toggle — Toggle route status Active ↔ Suspended
router.patch("/admin/routes/:id/toggle", protect, adminOnly, async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found." });
    }
    route.status = route.status === "Active" ? "Suspended" : "Active";
    await route.save();
    invalidateBusCache();
    res.json({ success: true, status: route.status, message: `Route ${route.status === "Active" ? "activated" : "suspended"} successfully.` });
  } catch (error) {
    console.error("Error toggling route:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to toggle route." });
  }
});

// PATCH /admin/buses/:id/toggle — Toggle is_active on a bus
router.patch("/admin/buses/:id/toggle", protect, adminOnly, async (req, res) => {
  try {
    const bus = await Bus.findById(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found." });
    }
    bus.is_active = !bus.is_active;
    await bus.save();
    invalidateBusCache();
    const state = bus.is_active ? "activated" : "deactivated";
    res.json({ success: true, is_active: bus.is_active, message: `Bus ${bus.busNumber} ${state} successfully.` });
  } catch (error) {
    console.error("Error toggling bus:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to toggle bus." });
  }
});

// PATCH /admin/buses/:id/booking-toggle — Choose which bus has booking option enabled/disabled
router.patch("/admin/buses/:id/booking-toggle", protect, adminOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { bookingEnabled } = req.body;

    let bus = null;
    if (mongoose.Types.ObjectId.isValid(id)) {
      bus = await Bus.findById(id);
    }
    if (!bus) {
      bus = await Bus.findOne({
        $or: [
          { busNumber: new RegExp(`^${id}$`, "i") },
          { vehicleNumber: new RegExp(`^${id}$`, "i") },
        ],
      });
    }

    if (!bus) {
      // Check if ID belongs to a Schedule record
      if (mongoose.Types.ObjectId.isValid(id)) {
        const sch = await Schedule.findById(id);
        if (sch) {
          sch.bookingEnabled = typeof bookingEnabled === "boolean" ? bookingEnabled : !sch.bookingEnabled;
          await sch.save();
          invalidateBusCache();
          return res.json({
            success: true,
            scheduleId: sch._id,
            bookingEnabled: sch.bookingEnabled,
            message: `Online booking option for schedule (${sch.busNumber || sch.start_time}) is now ${sch.bookingEnabled ? "ENABLED 🟢" : "DISABLED 🔒"}!`,
          });
        }
      }
      return res.status(404).json({ success: false, message: "Bus or Schedule record not found." });
    }

    const newBookingEnabled = typeof bookingEnabled === "boolean" ? bookingEnabled : !bus.bookingEnabled;
    bus.bookingEnabled = newBookingEnabled;
    await bus.save();

    // Synchronize any schedule rows for this bus
    await Schedule.updateMany(
      { $or: [{ bus_id: bus._id }, { busNumber: bus.busNumber }] },
      { $set: { bookingEnabled: newBookingEnabled } }
    );

    invalidateBusCache();

    res.json({
      success: true,
      busId: bus._id,
      busNumber: bus.busNumber,
      bookingEnabled: bus.bookingEnabled,
      message: `Online booking for bus ${bus.busNumber} (${bus.busName}) is now ${bus.bookingEnabled ? "ENABLED 🟢" : "DISABLED 🔒"}!`,
      bus,
    });
  } catch (error) {
    console.error("Error toggling bus booking option:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to toggle bus booking option." });
  }
});

// GET /admin/routes/:routeId/buses — List all buses assigned/selected for a route with live 5-min takeoff cutoff status
router.get("/admin/routes/:routeId/buses", async (req, res) => {
  try {
    const { routeId } = req.params;
    const { date } = req.query;

    const { dateStr: todayIST } = getCurrentISTInfo();
    const serviceDate = date && typeof date === "string" && date.trim().match(/^\d{4}-\d{2}-\d{2}$/)
      ? date.trim()
      : todayIST;

    // 1. Locate Route document
    let route = null;
    if (mongoose.Types.ObjectId.isValid(routeId)) {
      route = await Route.findById(routeId).lean();
    }
    if (!route) {
      route = await Route.findOne({
        $or: [
          { routeId: new RegExp(`^${routeId}$`, "i") },
          { routeName: new RegExp(`^${routeId}$`, "i") },
        ],
      }).lean();
    }

    if (!route) {
      return res.status(404).json({ success: false, message: `Route "${routeId}" not found.` });
    }

    // 2-5. Fetch all required data in parallel
    const [schedules, activeTrips, [allDrivers, driverLeaves, driverReplacements], matchingBuses] = await Promise.all([
      Schedule.find({ route_id: route._id }).populate("bus_id").sort({ start_time: 1 }).lean(),
      TripSession.find({ status: { $in: ["ACTIVE", "PAUSED"] } }).lean(),
      Promise.all([
        User.find({ role: { $in: ["driver", "Driver", "DRIVER"] } })
          .select("_id name email phone role verificationStatus")
          .lean(),
        DriverLeave.find({ status: "Approved" }).lean(),
        DriverReplacement.find({ dutyDate: serviceDate }).lean(),
      ]),
      Bus.find({
        $or: [
          { routeName: route.routeName },
          { route_id: route._id },
          { routeId: route._id },
          { routeId: route.routeId },
          {
            $and: [
              { fromLocation: new RegExp(`^${route.fromLocation}$`, "i") },
              { toLocation: new RegExp(`^${route.toLocation}$`, "i") }
            ]
          }
        ]
      }).lean(),
    ]);

    const activeTripsMap = new Map();
    activeTrips.forEach((t) => {
      if (t.busId) activeTripsMap.set(String(t.busId), t);
      if (t.busNumber) activeTripsMap.set(String(t.busNumber).trim().toUpperCase(), t);
    });

    const driverUserMap = new Map();
    allDrivers.forEach((d) => driverUserMap.set(String(d._id), d));

    const assignedBusesList = [];
    const seenBusNumbers = new Set();

    // Process from schedules first
    for (const sch of schedules) {
      const busDoc = (sch.bus_id && typeof sch.bus_id === "object") ? sch.bus_id : {};
      const busNumber = sch.busNumber || busDoc.busNumber || `KL-01-${route.routeId ? route.routeId.replace(/[^A-Z0-9]/g, "") : "MS100"}`;
      const uniqueKey = `${busNumber}_${sch.start_time}`;
      if (seenBusNumbers.has(uniqueKey)) continue;
      seenBusNumbers.add(uniqueKey);

      const timetable = generateStationTimetable(route, sch.start_time);
      const departureTime = timetable.departureTime;
      const arrivalTime = timetable.arrivalTime;

      // Effective driver resolution
      const resolverResult = resolveEffectiveDepartureDriver({
        schedule: sch,
        bus: busDoc,
        route,
        serviceDate,
        driverReplacements,
        driverLeaves,
      });

      const cutoffEval = evaluateBusBookingCutoff({
        bus: busDoc,
        schedule: sch,
        activeTripsMap,
        serviceDate,
      });

      assignedBusesList.push({
        _id: busDoc._id || sch._id,
        scheduleId: sch._id,
        busId: busDoc._id || null,
        busNumber,
        busName: busDoc.busName || route.routeName || `${route.fromLocation} ➔ ${route.toLocation}`,
        busType: busDoc.busType || "Standard Route Transit",
        operator: busDoc.operator || "MoveSmart Transit Ops",
        fromLocation: route.fromLocation,
        toLocation: route.toLocation,
        mainStation: timetable.stations[0]?.name || route.fromLocation,
        departureTime,
        mainStationDepartureTime: departureTime,
        scheduledDepartureTime: departureTime,
        arrivalTime,
        duration: timetable.duration,
        totalSeats: busDoc.totalSeats || 32,
        availableSeats: busDoc.availableSeats !== undefined ? busDoc.availableSeats : 32,
        price: route.fare || busDoc.price || 150,
        shift: resolverResult.shift || sch.shift || "Morning",
        driverName: resolverResult.passengerView.driverName || sch.driverName || busDoc.driverName || "Not Assigned",
        driverPhone: busDoc.driverPhone || "",
        driverVerified: resolverResult.passengerView.status === PASSENGER_ASSIGNMENT_STATUS.ASSIGNED || busDoc.driverVerified || false,
        driverLicense: busDoc.driverLicense || "",
        driverStatus: resolverResult.passengerView.status === PASSENGER_ASSIGNMENT_STATUS.ASSIGNED ? "Driver Assigned" : "Assignment Pending",
        isReplacement: Boolean(resolverResult.isReplacement),
        // Booking option and 5-min cutoff controls
        bookingEnabled: cutoffEval.bookingEnabled,
        isBookingOpen: cutoffEval.isBookingOpen,
        bookingStatus: cutoffEval.bookingStatus,
        bookingStatusLabel: cutoffEval.bookingStatusLabel,
        bookingStatusReason: cutoffEval.bookingStatusReason,
        bookingCloseTime: cutoffEval.bookingCloseTime,
        minutesUntilDeparture: cutoffEval.minutesUntilDeparture,
        minutesUntilCutoff: cutoffEval.minutesUntilCutoff,
        tripStarted: cutoffEval.tripStarted,
        activeTripId: cutoffEval.activeTripId,
        is_active: sch.is_active !== false && busDoc.is_active !== false,
      });
    }

    // Also include matching buses that weren't in schedules
    for (const b of matchingBuses) {
      const busNumber = b.busNumber || `KL-01-MS-${String(b._id).substring(18).toUpperCase()}`;
      const uniqueKey = `${busNumber}_${b.departureTime || route.base_start_time || "08:00 AM"}`;
      if (seenBusNumbers.has(uniqueKey)) continue;
      seenBusNumbers.add(uniqueKey);

      const timetable = generateStationTimetable(route, b.departureTime || route.base_start_time || "08:00 AM");

      const cutoffEval = evaluateBusBookingCutoff({
        bus: b,
        schedule: null,
        activeTripsMap,
        serviceDate,
      });

      assignedBusesList.push({
        _id: b._id,
        scheduleId: null,
        busId: b._id,
        busNumber,
        busName: b.busName || route.routeName,
        busType: b.busType || "Standard Route Transit",
        operator: b.operator || "MoveSmart Transit Ops",
        fromLocation: route.fromLocation,
        toLocation: route.toLocation,
        mainStation: timetable.stations[0]?.name || route.fromLocation,
        departureTime: timetable.departureTime,
        mainStationDepartureTime: timetable.departureTime,
        scheduledDepartureTime: timetable.departureTime,
        arrivalTime: timetable.arrivalTime,
        duration: timetable.duration,
        totalSeats: b.totalSeats || 32,
        availableSeats: b.availableSeats !== undefined ? b.availableSeats : 32,
        price: b.price || route.fare || 150,
        shift: "Morning",
        driverName: b.driverName || "Not Assigned",
        driverPhone: b.driverPhone || "",
        driverVerified: b.driverVerified || false,
        driverLicense: b.driverLicense || "",
        driverStatus: b.driverName && b.driverName !== "Not Assigned" ? "Driver Assigned" : "Assignment Pending",
        isReplacement: false,
        // Booking option and 5-min cutoff controls
        bookingEnabled: cutoffEval.bookingEnabled,
        isBookingOpen: cutoffEval.isBookingOpen,
        bookingStatus: cutoffEval.bookingStatus,
        bookingStatusLabel: cutoffEval.bookingStatusLabel,
        bookingStatusReason: cutoffEval.bookingStatusReason,
        bookingCloseTime: cutoffEval.bookingCloseTime,
        minutesUntilDeparture: cutoffEval.minutesUntilDeparture,
        minutesUntilCutoff: cutoffEval.minutesUntilCutoff,
        tripStarted: cutoffEval.tripStarted,
        activeTripId: cutoffEval.activeTripId,
        is_active: b.is_active !== false,
      });
    }

    // Summary statistics for the route
    const summary = {
      totalBuses: assignedBusesList.length,
      bookingEnabledCount: assignedBusesList.filter((b) => b.bookingEnabled).length,
      bookingDisabledCount: assignedBusesList.filter((b) => !b.bookingEnabled).length,
      bookingOpenCount: assignedBusesList.filter((b) => b.isBookingOpen).length,
      bookingClosedCount: assignedBusesList.filter((b) => !b.isBookingOpen).length,
      driveStartedCount: assignedBusesList.filter((b) => b.tripStarted).length,
      cutoffReachedCount: assignedBusesList.filter((b) => b.bookingStatus === "CLOSED_5MIN_CUTOFF").length,
    };

    res.json({
      success: true,
      route: {
        _id: route._id,
        routeId: route.routeId,
        routeName: route.routeName,
        fromLocation: route.fromLocation,
        toLocation: route.toLocation,
        distanceKm: route.distanceKm,
        duration: route.duration,
        base_start_time: route.base_start_time,
        stopsCount: Array.isArray(route.stops) ? route.stops.length : 0,
      },
      serviceDate,
      summary,
      buses: assignedBusesList,
    });
  } catch (error) {
    console.error("Error fetching buses for route:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch buses for route." });
  }
});

// GET /admin/route-buses (Fetch list of routes for selection)
router.get("/admin/route-buses", async (req, res) => {
  try {
    const routes = await Route.find({ status: { $ne: "Suspended" } }).sort({ routeName: 1 }).lean();
    res.json({
      success: true,
      count: routes.length,
      routes: routes.map((r) => ({
        _id: r._id,
        routeId: r.routeId,
        routeName: r.routeName,
        fromLocation: r.fromLocation,
        toLocation: r.toLocation,
        distanceKm: r.distanceKm,
        base_start_time: r.base_start_time,
      })),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});


// GET /api/routes/:id/schedule (Calculate & return exact stop arrival times for a route departure)
router.get("/routes/:id/schedule", async (req, res) => {
  try {
    const route = await Route.findById(req.params.id);
    if (!route) {
      return res.status(404).json({ success: false, message: "Route not found." });
    }

    const startTime = req.query.start_time || route.base_start_time || "08:00 AM";
    const delayBuffer = Number(req.query.delay_buffer || 0);

    let stopScheduleList = [];
    if (route.stops && route.stops.length > 0 && typeof route.stops[0] === "object") {
      stopScheduleList = route.stops.map((st) => ({
        stop: st.name,
        order: st.order,
        travel_time_from_prev: st.travel_time_from_prev,
        offset_minutes: st.offset_minutes,
        arrival_time: addMinutesToTimeStr(startTime, st.offset_minutes, delayBuffer),
      }));
    } else {
      // Legacy string stops fallback (assuming 25m between stops)
      const legacyStops = Array.isArray(route.stops) ? route.stops : [];
      stopScheduleList = legacyStops.map((stName, idx) => ({
        stop: stName,
        order: idx + 1,
        travel_time_from_prev: idx === 0 ? 0 : 25,
        offset_minutes: idx * 25,
        arrival_time: addMinutesToTimeStr(startTime, idx * 25, delayBuffer),
      }));
    }

    res.json({
      success: true,
      route_id: route._id,
      route_name: route.routeName,
      start_time: startTime,
      delay_buffer_minutes: delayBuffer,
      total_duration: route.duration,
      stops_schedule: stopScheduleList,
    });
  } catch (error) {
    console.error("Error generating schedule calculation:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to generate schedule calculation." });
  }
});

// ==========================================
// 15. POST /api/chat - Dynamic Intelligent Database AI Assistant (Appu Transit Guide)
// Answers any user query by dynamically querying MongoDB collections in real-time
// ==========================================
router.post("/chat", async (req, res) => {
  try {
    const rawMessage = req.body.message || req.body.query || req.body.text || "";
    if (!rawMessage || !String(rawMessage).trim()) {
      return res.json({
        success: true,
        reply: "Namaskaram! 🌴 How can I help you today? You can ask me about live buses, specific routes (e.g., 'Kanjirappally to Erumely'), driver credentials, fares, smart card recharges, or lost property."
      });
    }

    const query = String(rawMessage).trim();
    const qLower = query.toLowerCase();

    // 1. Fetch live normalized database buses & routes
    const allBuses = await fetchAllNormalizedBuses();
    const allRoutes = await Route.find({ status: { $ne: "Suspended" } }).lean();

    // Extract all unique locations
    const locationSet = new Set();
    allBuses.forEach((b) => {
      if (b.fromLocation) locationSet.add(b.fromLocation);
      if (b.toLocation) locationSet.add(b.toLocation);
      if (Array.isArray(b.stops)) {
        b.stops.forEach((s) => {
          const name = typeof s === "object" && s !== null ? (s.stopName || s.name || s.station) : s;
          if (name && !/^stop\s*\d+$/i.test(name)) locationSet.add(String(name).trim());
        });
      }
    });
    const knownLocations = Array.from(locationSet);

    // ==========================================
    // INTENT A: SPECIFIC BUS / VEHICLE NUMBER INQUIRY
    // E.g. "tell me about KL-05-AA-1003", "KL 06 78643", "bus 1001", "AAMMEES"
    // ==========================================
    const busMatch = allBuses.find((b) => {
      const numClean = (b.busNumber || "").replace(/[^a-z0-9]/gi, "").toLowerCase();
      const qClean = qLower.replace(/[^a-z0-9]/gi, "");
      const nameMatch = b.busName && qLower.includes(b.busName.toLowerCase()) && b.busName.length > 3;
      return (numClean && qClean.includes(numClean)) || nameMatch;
    });

    if (busMatch && (qLower.includes("bus") || qLower.includes("kl") || qLower.includes("detail") || qLower.includes("aammees") || qLower.includes("about") || qLower.includes("who") || qLower.includes("stop") || qLower.includes("driver") || qLower.includes("time") || qLower.includes("fare"))) {
      // If asking specifically about driver for this bus
      if (qLower.includes("driver") || qLower.includes("who is driving") || qLower.includes("contact") || qLower.includes("phone")) {
        return res.json({
          success: true,
          reply: `🚌 Bus **${busMatch.busNumber}** (${busMatch.busName}) is operated by driver **${busMatch.driverName}**${busMatch.driverPhone && busMatch.driverPhone !== "N/A" ? ` (Contact: ${busMatch.driverPhone})` : ""}. Driver Status: ${busMatch.driverVerified ? "✅ Admin Verified" : "Pending Verification"}${busMatch.driverExperience ? ` with ${busMatch.driverExperience} years experience` : ""}. Route: ${busMatch.fromLocation} ➔ ${busMatch.toLocation}.`
        });
      }

      // If asking about stops of this bus
      if (qLower.includes("stop") || qLower.includes("station") || qLower.includes("route") || qLower.includes("halt")) {
        const stopsList = Array.isArray(busMatch.stops) && busMatch.stops.length > 0 ? busMatch.stops.join(" ➔ ") : `${busMatch.fromLocation} ➔ ${busMatch.toLocation}`;
        return res.json({
          success: true,
          reply: `🗺️ **Stops for Bus ${busMatch.busNumber} (${busMatch.busName}):**\n${stopsList}\n\n• Departure: **${busMatch.departureTime}** from ${busMatch.fromLocation}\n• Arrival: **${busMatch.arrivalTime}** at ${busMatch.toLocation}\n• Standard Fare: **₹${busMatch.price}**.`
        });
      }

      // Complete Bus Overview
      const stopsPreview = Array.isArray(busMatch.stops) && busMatch.stops.length > 0 ? busMatch.stops.join(" ➔ ") : `${busMatch.fromLocation} ➔ ${busMatch.toLocation}`;
      return res.json({
        success: true,
        reply: `🚌 **Bus Details: ${busMatch.busNumber}**\n• Service: **${busMatch.busName}** (${busMatch.busType || "Standard Transit"})\n• Operator: **${busMatch.operator || "MoveSmart Transit Ops"}**\n• Route: **${busMatch.fromLocation} ➔ ${busMatch.toLocation}**\n• Timings: Departure **${busMatch.departureTime}** | Arrival **${busMatch.arrivalTime}** (${busMatch.duration})\n• Fare: **₹${busMatch.price}** | Seats: **${busMatch.availableSeats || 32}/${busMatch.totalSeats || 32} Available**\n• Driver: **${busMatch.driverName}** (${busMatch.driverVerified ? "Verified ✅" : "Standard"})\n• Amenities: ${Array.isArray(busMatch.amenities) ? busMatch.amenities.join(", ") : "Live Tracking, IoT Feed"}\n• Route Sequence: ${stopsPreview}`
      });
    }

    // ==========================================
    // INTENT B: TWO-STATION ROUTE SEARCH (FROM X TO Y)
    // E.g. "buses from Kanjirappally to Erumely", "Erumely to Kanjirappally", "Kochi to Trivandrum"
    // ==========================================
    let fromStation = null;
    let toStation = null;

    // Pattern 1: "from <Origin> to <Destination>"
    const fromToMatch = qLower.match(/(?:from\s+)([\w\s\-\(\)]+?)(?:\s+(?:to|->|➔|towards)\s+)([\w\s\-\(\)]+)/i);
    if (fromToMatch) {
      const candFrom = fromToMatch[1].trim();
      const candTo = fromToMatch[2].replace(/[?.,!]/g, "").trim();
      fromStation = knownLocations.find((loc) => matchLocationStr(loc, candFrom)) || candFrom;
      toStation = knownLocations.find((loc) => matchLocationStr(loc, candTo)) || candTo;
    } else {
      // Pattern 2: "<Origin> to <Destination>"
      const directMatch = qLower.match(/([\w\s\-\(\)]+?)(?:\s+(?:to|->|➔)\s+)([\w\s\-\(\)]+)/i);
      if (directMatch && !qLower.includes("how to") && !qLower.includes("want to") && !qLower.includes("need to")) {
        const candFrom = directMatch[1].replace(/^(?:is there a|any|find|show|give me|check|get|buses?)\s+(?:bus\s+)?/i, "").trim();
        const candTo = directMatch[2].replace(/[?.,!]/g, "").trim();
        fromStation = knownLocations.find((loc) => matchLocationStr(loc, candFrom));
        toStation = knownLocations.find((loc) => matchLocationStr(loc, candTo));
      }
    }

    // Pattern 3: Scan matching stations directly from database vocabulary
    if (!fromStation || !toStation) {
      const matchedLocs = [];
      for (const loc of knownLocations) {
        if (loc.length >= 3 && qLower.includes(loc.toLowerCase())) {
          matchedLocs.push(loc);
        }
      }
      if (matchedLocs.length >= 2) {
        // Sort by position in query string to preserve order
        matchedLocs.sort((a, b) => qLower.indexOf(a.toLowerCase()) - qLower.indexOf(b.toLowerCase()));
        fromStation = matchedLocs[0];
        toStation = matchedLocs[1];
      }
    }

    if (fromStation && toStation && fromStation.toLowerCase() !== toStation.toLowerCase()) {
      const matchingBuses = [];

      for (const b of allBuses) {
        const stopsList = buildCompleteStopsList(b);
        let fromIdx = -1;
        let toIdx = -1;

        for (let i = 0; i < stopsList.length; i++) {
          if (fromIdx === -1 && matchLocationStr(stopsList[i], fromStation)) {
            fromIdx = i;
          }
          if (toIdx === -1 && matchLocationStr(stopsList[i], toStation)) {
            toIdx = i;
          }
        }

        if (fromIdx !== -1 && toIdx !== -1 && fromIdx < toIdx) {
          const stations = Array.isArray(b.schedule) && b.schedule[0]?.stations ? b.schedule[0].stations : [];
          const bStation = stations[fromIdx] || { name: fromStation, departureTime: b.departureTime };
          const dStation = stations[toIdx] || { name: toStation, arrivalTime: b.arrivalTime };

          matchingBuses.push({
            busNumber: b.busNumber,
            busName: b.busName,
            busType: b.busType,
            departureTime: bStation.departureTime !== "--" ? bStation.departureTime : b.departureTime,
            arrivalTime: dStation.arrivalTime !== "--" ? dStation.arrivalTime : b.arrivalTime,
            fare: b.price || (toIdx - fromIdx) * 35 + 20,
            availableSeats: b.availableSeats !== undefined ? b.availableSeats : 32,
            driverName: b.driverName || "Assigned Driver",
            operator: b.operator || "MoveSmart Transit Ops",
            fullRoute: `${b.fromLocation} ➔ ${b.toLocation}`
          });
        }
      }

      if (matchingBuses.length > 0) {
        const busLines = matchingBuses.map((mb, idx) =>
          `🔹 **${idx + 1}. ${mb.busName}** (\`${mb.busNumber}\`)\n   • Departs **${fromStation}** at **${mb.departureTime}** ➔ Arrives **${toStation}** at **${mb.arrivalTime}**\n   • Fare: **₹${mb.fare}** | Seats: **${mb.availableSeats} Available** | Driver: **${mb.driverName}**`
        ).join("\n\n");

        return res.json({
          success: true,
          reply: `🚍 Found **${matchingBuses.length} active service(s)** connecting **${fromStation} ➔ ${toStation}**:\n\n${busLines}\n\n💡 *You can book or view live GPS tracking for these services on your Bus Schedules page!*`
        });
      } else {
        return res.json({
          success: true,
          reply: `⚠️ Currently, there are no direct scheduled services connecting **${fromStation} ➔ ${toStation}** in our active fleet.\n\nHowever, you can connect via major transit hubs like **Erattupetta, Kanjirappally, or Kottayam**. There are ${allBuses.length} active fleet buses operating across Kerala.`
        });
      }
    }

    // ==========================================
    // INTENT C: SINGLE STATION / DESTINATION DEPARTURES
    // E.g. "buses to Erumely", "departures from Kanjirappally", "Kochi buses"
    // ==========================================
    const singleLocMatch = knownLocations.find((loc) => loc.length >= 3 && qLower.includes(loc.toLowerCase()));
    if (singleLocMatch && (qLower.includes("bus") || qLower.includes("depart") || qLower.includes("leave") || qLower.includes("go") || qLower.includes("reach") || qLower.includes("schedule") || qLower.includes("from") || qLower.includes("to"))) {
      const stationBuses = allBuses.filter((b) => {
        const stopsList = buildCompleteStopsList(b);
        return stopsList.some((s) => matchLocationStr(s, singleLocMatch));
      });

      if (stationBuses.length > 0) {
        const busLines = stationBuses.slice(0, 5).map((b) => {
          return `• **${b.busNumber}** (${b.busName}): Departs **${b.departureTime}** on **${b.fromLocation} ➔ ${b.toLocation}** (Fare: ₹${b.price})`;
        }).join("\n");

        return res.json({
          success: true,
          reply: `📍 **Scheduled Services via ${singleLocMatch} (${stationBuses.length} buses found):**\n\n${busLines}\n\n💡 *Tip: Mention both origin and destination (e.g. "${singleLocMatch} to Erumely") for exact boarding times.*`
        });
      }
    }

    // ==========================================
    // INTENT D: DRIVERS / VERIFICATION / CREW DIRECTORY
    // E.g. "who are the drivers?", "driver list", "verified drivers", "driver contact"
    // ==========================================
    if (qLower.includes("driver") || qLower.includes("crew") || qLower.includes("license") || qLower.includes("who drives")) {
      const drivers = allBuses
        .filter((b) => b.driverName && b.driverName !== "Assigned by Admin" && b.driverName !== "Unassigned")
        .map((b) => `• **${b.driverName}** (Bus: \`${b.busNumber}\` | Route: ${b.fromLocation} ➔ ${b.toLocation} | Status: ${b.driverVerified ? "Verified ✅" : "Active"})`);

      const uniqueDrivers = Array.from(new Set(drivers));
      if (uniqueDrivers.length > 0) {
        return res.json({
          success: true,
          reply: `👨‍✈️ **MoveSmart Verified Fleet Drivers (${uniqueDrivers.length} active):**\n\n${uniqueDrivers.slice(0, 6).join("\n")}\n\nAll MoveSmart drivers hold commercial heavy passenger vehicle (HPV) endorsements verified by Admin.`
        });
      } else {
        return res.json({
          success: true,
          reply: "👨‍✈️ Fleet drivers are verified and assigned by MoveSmart Transit Admin with real-time biometric and RFID journey authentication."
        });
      }
    }

    // ==========================================
    // INTENT E: FARES / PRICING / TICKET RATES
    // E.g. "how much is ticket fare?", "average ticket cost", "bus fare"
    // ==========================================
    if (qLower.includes("fare") || qLower.includes("ticket") || qLower.includes("price") || qLower.includes("cost") || qLower.includes("rate") || qLower.includes("how much")) {
      const fares = allBuses.map((b) => Number(b.price || 0)).filter((f) => f > 0);
      const minFare = fares.length > 0 ? Math.min(...fares) : 25;
      const maxFare = fares.length > 0 ? Math.max(...fares) : 380;
      const avgFare = fares.length > 0 ? Math.round(fares.reduce((a, b) => a + b, 0) / fares.length) : 150;

      return res.json({
        success: true,
        reply: `💳 **MoveSmart Fare Structure:**\n• **Minimum Short-Hop Fare:** ₹${minFare}\n• **Maximum Long-Distance Fare:** ₹${maxFare}\n• **Average Route Fare:** ~₹${avgFare}\n\n*Transit fares are calculated dynamically per kilometer. Smart RFID cardholders enjoy seamless automated tap-in/tap-out fare deduction with zero waiting.*`
      });
    }

    // ==========================================
    // INTENT F: FLEET OVERVIEW / ACTIVE BUSES COUNT / RADAR
    // E.g. "how many buses are active?", "total fleet", "list all buses", "all routes"
    // ==========================================
    if (qLower.includes("how many") || qLower.includes("active bus") || qLower.includes("fleet") || qLower.includes("total bus") || qLower.includes("all routes") || qLower.includes("list buses") || qLower.includes("count")) {
      const routeNames = allRoutes.map((r) => `• ${r.routeName || `${r.fromLocation} ➔ ${r.toLocation}`}`).slice(0, 5).join("\n");
      return res.json({
        success: true,
        reply: `🚍 **Live Fleet Statistics:**\n• **Active Fleet Buses:** **${allBuses.length} buses** currently scheduled.\n• **Transit Network Routes:** **${allRoutes.length} key corridors** across Kerala.\n• **Covered Transit Stations:** **${knownLocations.length} stations & sub-stops**.\n\n**Popular Active Corridors:**\n${routeNames}\n\n*All fleet vehicles broadcast GPS telemetry and occupancy status in real-time.*`
      });
    }

    // ==========================================
    // INTENT G: TIME OF DAY / MORNING / AFTERNOON / NIGHT BUSES
    // ==========================================
    if (qLower.includes("morning") || qLower.includes("afternoon") || qLower.includes("evening") || qLower.includes("night") || qLower.includes("early")) {
      let windowName = "Morning";
      if (qLower.includes("afternoon")) windowName = "Afternoon";
      if (qLower.includes("evening") || qLower.includes("night")) windowName = "Night";

      const timeBuses = allBuses.filter((b) => {
        const dep = (b.departureTime || "").toUpperCase();
        const match = dep.match(/(\d+):(\d+)\s*(AM|PM)?/);
        if (!match) return false;
        let h = parseInt(match[1], 10);
        const isPM = dep.includes("PM");
        const isAM = dep.includes("AM");
        if (isPM && h < 12) h += 12;
        if (isAM && h === 12) h = 0;

        if (windowName === "Morning") return h >= 5 && h < 12;
        if (windowName === "Afternoon") return h >= 12 && h < 17;
        if (windowName === "Night") return h >= 17 || h < 5;
        return true;
      });

      const list = timeBuses.slice(0, 5).map((b) => `• **${b.busNumber}** (${b.busName}): Departs **${b.departureTime}** (${b.fromLocation} ➔ ${b.toLocation})`).join("\n");
      return res.json({
        success: true,
        reply: `⏰ **${windowName} Scheduled Departures (${timeBuses.length} buses):**\n\n${list || "No buses scheduled for this window."}\n\n*Use our Filter Bar to sort all departures chronologically.*`
      });
    }

    // ==========================================
    // INTENT H: RFID SMART CARDS, SMART PASSES & WALLET
    // ==========================================
    if (qLower.includes("wallet") || qLower.includes("recharge") || qLower.includes("top up") || qLower.includes("card") || qLower.includes("rfid") || qLower.includes("pass") || qLower.includes("student") || qLower.includes("balance")) {
      return res.json({
        success: true,
        reply: `💳 **MoveSmart RFID Transit & Passes Guide:**\n\n1. **Recharge Digital Wallet:** Go to the **Wallet** tab on your top menu bar. Choose an amount (₹100, ₹250, ₹500) and pay instantly via **Razorpay UPI, Debit Card, or Net Banking**.\n2. **Apply for Smart Pass:** Click **Apply Pass** to request a Concession, Student, Senior Citizen, or General Transit Smart Card with discounted fares.\n3. **Contactless Tap-to-Ride:** Tap your linked RFID card upon boarding any MoveSmart bus turnstile; fare is deducted automatically based on destination GPS.`
      });
    }

    // ==========================================
    // INTENT I: LOST & FOUND INQUIRIES
    // ==========================================
    if (qLower.includes("lost") || qLower.includes("found") || qLower.includes("bag") || qLower.includes("item") || qLower.includes("misplace") || qLower.includes("belonging")) {
      return res.json({
        success: true,
        reply: `🧳 **MoveSmart Lost & Found Portal:**\n\nIf you left any luggage, phone, or belongings on a MoveSmart bus:\n1. Click **Lost & Found** in your top navigation.\n2. Report your lost item with date, route, and description.\n3. Browse depot-verified found items logged by drivers and conductors.\n4. File a verification claim for instant depot pickup authorization.`
      });
    }

    // ==========================================
    // DEFAULT FALLBACK: SMART RECOMMENDATION WITH LIVE CONTEXT
    // ==========================================
    const sampleLocs = knownLocations.slice(0, 6).join(", ");
    return res.json({
      success: true,
      reply: `🌴 **MoveSmart AI Transit Assistant (Appu):**\n\nI can look up live database schedules across **${allBuses.length} fleet buses** and **${allRoutes.length} corridors** in Kerala!\n\n**Here are things you can ask me:**\n• *"Buses from Kanjirappally to Erumely"*\n• *"What time does KL-05-AA-1003 depart?"*\n• *"Who is the driver for Erattupetta bus?"*\n• *"What is the ticket fare to Trivandrum?"*\n• *"Morning buses from Kochi"*\n• *"How do I recharge my RFID card?"*\n\n*(Active Stations: ${sampleLocs}, etc.)*`
    });
  } catch (error) {
    console.error("Error in AI Transit Assistant /api/chat:", error);
    res.status(500).json({
      success: false,
      reply: "I am temporarily experiencing a database connection delay. Please try asking again in a moment."
    });
  }
});

router.fetchAllNormalizedBuses = fetchAllNormalizedBuses;
router.buildNormalizedBusesFromData = buildNormalizedBusesFromData;
router.invalidateBusCache = invalidateBusCache;

module.exports = router;

