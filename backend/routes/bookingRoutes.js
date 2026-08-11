const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Bus = require("../models/Bus");
const Booking = require("../models/Booking");
const Route = require("../models/Route");
const Schedule = require("../models/Schedule");

// Initial Seed Data for testing
const defaultBuses = [
  {
    busNumber: "KL-07-MS-1008",
    busName: "MoveSmart Greenline Express",
    busType: "AC Seater / Sleeper (2+2)",
    operator: "MoveSmart Fleet Ops",
    fromLocation: "Kochi",
    toLocation: "Trivandrum",
    departureTime: "06:30 AM",
    arrivalTime: "11:15 AM",
    duration: "4h 45m",
    totalSeats: 32,
    availableSeats: 26,
    price: 450,
    rating: 4.9,
    amenities: ["Wi-Fi", "Charging Port", "Live Tracking", "Water Bottle", "AC"],
    bookedSeats: ["1A", "1B", "3C", "5A", "7B", "8D"],
    driverName: "Suresh Menon",
    driverPhone: "+91 98471 22334",
    driverLicense: "KL-07-2019-88120",
    driverExperience: 8,
    driverVerified: true,
    stops: ["Kochi", "Vyttila", "Tripunithura", "Cherthala", "Alappuzha", "Ambalapuzha", "Haripad", "Kayamkulam", "Karunagappally", "Kollam", "Attingal", "Kazhakkoottam", "Trivandrum"],
  },
  {
    busNumber: "KL-14-MS-2045",
    busName: "SwiftConnect Multi-Axle Volvo",
    busType: "AC Luxury Seater (2+2)",
    operator: "MoveSmart Express Connect",
    fromLocation: "Kochi",
    toLocation: "Trivandrum",
    departureTime: "08:15 AM",
    arrivalTime: "01:00 PM",
    duration: "4h 45m",
    totalSeats: 36,
    availableSeats: 31,
    price: 520,
    rating: 4.8,
    amenities: ["Wi-Fi", "Reclining Seats", "Charging Port", "Reading Light"],
    bookedSeats: ["2A", "2B", "4C", "6D", "7A"],
    driverName: "Anil Kumar",
    driverPhone: "+91 98472 55667",
    driverLicense: "KL-14-2017-44321",
    driverExperience: 10,
    driverVerified: true,
    stops: ["Kochi", "Vyttila", "Cherthala", "Alappuzha", "Haripad", "Kayamkulam", "Kollam", "Attingal", "Kazhakkoottam", "Trivandrum"],
  },
  {
    busNumber: "KL-11-MS-3310",
    busName: "Malabar Super Fast Express",
    busType: "Non-AC Deluxe Seater (2+2)",
    operator: "MoveSmart Regional Ops",
    fromLocation: "Kochi",
    toLocation: "Calicut",
    departureTime: "07:00 AM",
    arrivalTime: "11:30 AM",
    duration: "4h 30m",
    totalSeats: 36,
    availableSeats: 30,
    price: 320,
    rating: 4.6,
    amenities: ["Charging Port", "Live Tracking", "Emergency Exit"],
    bookedSeats: ["1C", "3A", "3B", "5D", "8A", "8B"],
    driverName: "Ramesh Pillai",
    driverPhone: "+91 98473 88990",
    driverLicense: "KL-11-2016-11223",
    driverExperience: 12,
    driverVerified: true,
    stops: ["Kochi", "Aluva", "Angamaly", "Chalakkudy", "Thrissur", "Wadakkanchery", "Kuttippuram", "Valanchery", "Ramanattukara", "Calicut"],
  },
  {
    busNumber: "KL-01-MS-4099",
    busName: "Trivandrum Night Rider Sleeper",
    busType: "AC Sleeper (2+1)",
    operator: "MoveSmart Premium Transit",
    fromLocation: "Trivandrum",
    toLocation: "Kochi",
    departureTime: "09:30 PM",
    arrivalTime: "02:15 AM",
    duration: "4h 45m",
    totalSeats: 30,
    availableSeats: 25,
    price: 680,
    rating: 4.9,
    amenities: ["Blanket & Pillow", "Wi-Fi", "Charging Port", "Live Tracking"],
    bookedSeats: ["1A", "2A", "3B", "4C", "5C"],
    driverName: "Vijayan Nair",
    driverPhone: "+91 98474 33445",
    driverLicense: "KL-01-2015-77889",
    driverExperience: 15,
    driverVerified: true,
    stops: ["Trivandrum", "Kazhakkoottam", "Attingal", "Kollam", "Karunagappally", "Kayamkulam", "Haripad", "Ambalapuzha", "Alappuzha", "Cherthala", "Vyttila", "Kochi"],
  },
  {
    busNumber: "KL-08-MS-5521",
    busName: "Highrange Deluxe Air Bus",
    busType: "AC Pushback Seater (2+2)",
    operator: "Highrange Travel Lines",
    fromLocation: "Kochi",
    toLocation: "Calicut",
    departureTime: "02:30 PM",
    arrivalTime: "07:15 PM",
    duration: "4h 45m",
    totalSeats: 32,
    availableSeats: 28,
    price: 490,
    rating: 4.7,
    amenities: ["AC", "Charging Port", "Live Tracking", "Music System"],
    bookedSeats: ["2C", "2D", "6A", "6B"],
    driverName: "Mohan Varghese",
    driverPhone: "+91 98475 66778",
    driverLicense: "KL-08-2020-55667",
    driverExperience: 6,
    driverVerified: true,
    stops: ["Kochi", "Aluva", "Angamaly", "Thrissur", "Guruvayur", "Kuttippuram", "Calicut"],
  },
  {
    busNumber: "KL-05-MS-7712",
    busName: "Kottayam Royal City Cruiser",
    busType: "AC Executive Seater (2+2)",
    operator: "MoveSmart City Lines",
    fromLocation: "Kochi",
    toLocation: "Erattupetta",
    departureTime: "10:00 AM",
    arrivalTime: "01:15 PM",
    duration: "3h 15m",
    totalSeats: 32,
    availableSeats: 29,
    price: 280,
    rating: 4.8,
    amenities: ["AC", "Charging Port", "Pushback Seats"],
    bookedSeats: ["1A", "4D", "5C"],
    driverName: "Joseph Thomas",
    driverPhone: "+91 98476 99001",
    driverLicense: "KL-05-2018-33445",
    driverExperience: 9,
    driverVerified: true,
    stops: ["Kochi", "Tripunithura", "Mulanthuruthy", "Piravom", "Ettumanoor", "Kottayam", "Manarcadu", "Malam", "Anichuvadu", "Kidangoor", "Pala", "Erattupetta"],
  },
  {
    busNumber: "KL-05-MS-8820",
    busName: "Highland Shuttle Express",
    busType: "Non-AC Deluxe Seater (2+2)",
    operator: "MoveSmart Regional Ops",
    fromLocation: "Kottayam",
    toLocation: "Erattupetta",
    departureTime: "11:30 AM",
    arrivalTime: "01:00 PM",
    duration: "1h 30m",
    totalSeats: 36,
    availableSeats: 32,
    price: 120,
    rating: 4.7,
    amenities: ["Live Tracking", "Emergency Exit"],
    bookedSeats: ["2A", "3B"],
    driverName: "Mathew Jacob",
    driverPhone: "+91 98477 11223",
    driverLicense: "KL-05-2016-99887",
    driverExperience: 11,
    driverVerified: true,
    stops: ["Kottayam", "Manarcadu", "Malam", "Anichuvadu", "Vengotta", "Kidangoor", "Pala", "Bharananganam", "Plassanal", "Erattupetta"],
  },
  {
    busNumber: "KL-09-MS-6100",
    busName: "Palghat Rider Super Fast",
    busType: "AC Seater (2+2)",
    operator: "MoveSmart Transit Lines",
    fromLocation: "Kochi",
    toLocation: "Palakkad",
    departureTime: "09:00 AM",
    arrivalTime: "01:30 PM",
    duration: "4h 30m",
    totalSeats: 36,
    availableSeats: 30,
    price: 380,
    rating: 4.8,
    amenities: ["AC", "Charging Port", "Live Tracking", "Wi-Fi"],
    bookedSeats: ["3A", "4B"],
    driverName: "Unnikrishnan P",
    driverPhone: "+91 98478 44556",
    driverLicense: "KL-09-2019-12345",
    driverExperience: 10,
    driverVerified: true,
    stops: ["Kochi", "Aluva", "Angamaly", "Chalakkudy", "Thrissur", "Vadakkencherry", "Alathur", "Palakkad"],
  },
  {
    busNumber: "KL-13-MS-9011",
    busName: "North Malabar Volvo Line",
    busType: "AC Multi-Axle Sleeper (2+1)",
    operator: "MoveSmart Premium Transit",
    fromLocation: "Kochi",
    toLocation: "Kannur",
    departureTime: "10:15 PM",
    arrivalTime: "05:00 AM",
    duration: "6h 45m",
    totalSeats: 30,
    availableSeats: 26,
    price: 750,
    rating: 4.9,
    amenities: ["Blanket & Pillow", "Wi-Fi", "Charging Port", "Live Tracking", "AC"],
    bookedSeats: ["1B", "2C", "5A"],
    driverName: "Santhosh Kumar",
    driverPhone: "+91 98479 77889",
    driverLicense: "KL-13-2017-67890",
    driverExperience: 14,
    driverVerified: true,
    stops: ["Kochi", "Aluva", "Thrissur", "Kuttippuram", "Calicut", "Koyilandy", "Vadakara", "Thalassery", "Kannur"],
  }
];

// Seed default routes if empty
const defaultRoutes = [
  {
    routeId: "RT-101",
    routeName: "Kochi ➔ Trivandrum Express",
    fromLocation: "Kochi",
    toLocation: "Trivandrum",
    distanceKm: 205,
    duration: "4h 45m",
    frequency: "Every 30 mins",
    stops: ["Kochi", "Vyttila", "Tripunithura", "Cherthala", "Alappuzha", "Ambalapuzha", "Haripad", "Kayamkulam", "Karunagappally", "Kollam", "Attingal", "Kazhakkoottam", "Trivandrum"],
    fare: 450,
    status: "Active",
  },
  {
    routeId: "RT-102",
    routeName: "Kochi ➔ Calicut Direct",
    fromLocation: "Kochi",
    toLocation: "Calicut",
    distanceKm: 180,
    duration: "4h 30m",
    frequency: "Every 1 hour",
    stops: ["Kochi", "Aluva", "Angamaly", "Chalakkudy", "Thrissur", "Wadakkanchery", "Kuttippuram", "Valanchery", "Ramanattukara", "Calicut"],
    fare: 320,
    status: "Active",
  },
  {
    routeId: "RT-103",
    routeName: "Kochi ➔ Kottayam ➔ Erattupetta Corridor",
    fromLocation: "Kochi",
    toLocation: "Erattupetta",
    distanceKm: 95,
    duration: "3h 15m",
    frequency: "Every 20 mins",
    stops: ["Kochi", "Tripunithura", "Mulanthuruthy", "Piravom", "Ettumanoor", "Kottayam", "Manarcadu", "Malam", "Anichuvadu", "Vengotta", "Kidangoor", "Pala", "Bharananganam", "Plassanal", "Erattupetta"],
    fare: 280,
    status: "Active",
  },
];

// Helper to extract stations/stops list from doc
const extractStopsFromDoc = (doc) => {
  if (Array.isArray(doc.route) && doc.route.length > 0) {
    return doc.route.map((s) => String(s).trim());
  }
  if (Array.isArray(doc.stops) && doc.stops.length > 0) {
    return doc.stops.map((s) => String(s).trim());
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

// Normalize any bus object (from Bus collection or Route.buses)
const normalizeBusDocument = (doc, parentRoute = null) => {
  const busNumber =
    doc.busNumber ||
    doc.vehicleNumber ||
    doc["Vehicle Number"] ||
    (doc._id ? `MS-${String(doc._id).substring(18).toUpperCase()}` : "KL-07-MS-1001");

  const stops = extractStopsFromDoc(doc);
  const fromLocation = doc.fromLocation || parentRoute?.fromLocation || (stops.length > 0 ? stops[0] : "Kochi");
  const toLocation =
    doc.toLocation ||
    parentRoute?.toLocation ||
    (stops.length > 1 ? stops[stops.length - 1] : stops.length === 1 ? stops[0] : "Trivandrum");

  let departureTime = doc.departureTime || "07:00 AM";
  let arrivalTime = doc.arrivalTime || "11:30 AM";

  if (Array.isArray(doc.schedule) && doc.schedule.length > 0) {
    const firstTrip = doc.schedule[0];
    if (Array.isArray(firstTrip.stations) && firstTrip.stations.length > 0) {
      const stStart = firstTrip.stations[0];
      const stEnd = firstTrip.stations[firstTrip.stations.length - 1];
      departureTime =
        stStart.departureTime || stStart.time || stStart.departure || stStart.arrivalTime || departureTime;
      arrivalTime =
        stEnd.arrivalTime || stEnd.time || stEnd.arrival || stEnd.departureTime || arrivalTime;
    }
  }

  const busType = doc.busType || doc.type || "AC Deluxe Seater / Express";
  const operator = doc.operator || "MoveSmart Transit Lines";
  const price = doc.price || doc.fare || (stops.length > 1 ? stops.length * 45 + 50 : 250);
  const totalSeats = doc.totalSeats || 32;
  const availableSeats = doc.availableSeats !== undefined ? doc.availableSeats : 28;
  const rating = doc.rating || 4.8;
  const amenities = doc.amenities || ["Wi-Fi", "Charging Port", "Live Tracking", "AC"];
  const bookedSeats = doc.bookedSeats || [];
  const busName = doc.busName || `${operator} (${busNumber})`;

  return {
    _id: doc._id || new mongoose.Types.ObjectId(),
    busNumber,
    busName,
    busType,
    operator,
    fromLocation,
    toLocation,
    departureTime,
    arrivalTime,
    duration: doc.duration || "3h 45m",
    totalSeats,
    availableSeats,
    price,
    rating,
    amenities,
    bookedSeats,
    driverName: doc.driverName || "Driver Assigned",
    driverPhone: doc.driverPhone || "+91 98470 00000",
    driverLicense: doc.driverLicense || "KL-07-2020-00100",
    driverVerified: doc.driverVerified !== undefined ? doc.driverVerified : true,
    driverExperience: doc.driverExperience || 8,
    stops,
    route: doc.route || stops,
    schedule: doc.schedule || [],
    rawDoc: doc,
  };
};

// Fetch all normalized buses across all DB collections
// Fetch all normalized buses across all DB collections AND default fleet
const fetchAllNormalizedBuses = async () => {
  const normalizedBuses = [];
  const seenNumbers = new Set();

  try {
    const rawBuses = await Bus.find().lean();
    for (const b of rawBuses) {
      const norm = normalizeBusDocument(b);
      if (!seenNumbers.has(norm.busNumber)) {
        seenNumbers.add(norm.busNumber);
        normalizedBuses.push(norm);
      }
    }
  } catch (err) {
    console.warn("DB Bus.find query notice (using default fleet fallback):", err.message);
  }

  try {
    const rawRoutes = await Route.find().lean();
    for (const r of rawRoutes) {
      if (Array.isArray(r.buses)) {
        for (const b of r.buses) {
          const norm = normalizeBusDocument(b, r);
          if (!seenNumbers.has(norm.busNumber)) {
            seenNumbers.add(norm.busNumber);
            normalizedBuses.push(norm);
          }
        }
      }
    }
  } catch (err) {
    console.warn("DB Route.find query notice (using default fleet fallback):", err.message);
  }

  // Include default bus fleet so major routes (Kochi -> Trivandrum, Calicut, etc.) are always searchable
  for (const dbBus of defaultBuses) {
    const norm = normalizeBusDocument(dbBus);
    if (!seenNumbers.has(norm.busNumber)) {
      seenNumbers.add(norm.busNumber);
      normalizedBuses.push(norm);
    }
  }

  return normalizedBuses;
};

// Helper to seed buses if DB has none
const seedBusesIfEmpty = async () => {
  try {
    const count = await Bus.countDocuments();
    if (count === 0) {
      await Bus.insertMany(defaultBuses);
      console.log("Seed buses inserted into MongoDB successfully! 🚌");
    }
  } catch (err) {
    console.error("Error seeding buses:", err.message);
  }
};

const seedRoutesIfEmpty = async () => {
  try {
    const count = await Route.countDocuments();
    if (count === 0) {
      await Route.insertMany(defaultRoutes);
      console.log("Seed routes inserted into MongoDB successfully! 🛣️");
    }
  } catch (err) {
    console.error("Error seeding routes:", err.message);
  }
};

// GET /locations (Get all unique stations/locations from DB)
router.get("/locations", async (req, res) => {
  try {
    const allBuses = await fetchAllNormalizedBuses();
    const locationSet = new Set();

    allBuses.forEach((b) => {
      if (b.fromLocation) locationSet.add(b.fromLocation);
      if (b.toLocation) locationSet.add(b.toLocation);
      if (Array.isArray(b.stops)) {
        b.stops.forEach((s) => {
          const stName = typeof s === "object" && s !== null ? (s.stopName || s.name || s.stop) : s;
          if (stName) locationSet.add(String(stName).trim());
        });
      }
    });

    const routes = await Route.find().lean();
    routes.forEach((r) => {
      if (r.fromLocation) locationSet.add(r.fromLocation);
      if (r.toLocation) locationSet.add(r.toLocation);
      if (Array.isArray(r.stops)) {
        r.stops.forEach((s) => {
          const stName = typeof s === "object" && s !== null ? (s.stopName || s.name || s.stop) : s;
          if (stName) locationSet.add(String(stName).trim());
        });
      }
    });

    const locations = Array.from(locationSet).filter(Boolean).sort();
    res.json({ success: true, count: locations.length, locations });
  } catch (error) {
    console.error("Error fetching locations:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// GET /routes (Public endpoint to fetch active routes)
router.get("/routes", async (req, res) => {
  try {
    await seedRoutesIfEmpty();
    const rawRoutes = await Route.find().lean();
    const allBuses = await fetchAllNormalizedBuses();

    const formattedRoutes = rawRoutes.map((r) => ({
      _id: r._id,
      routeId: r.routeId || `RT-${String(r._id).substring(18).toUpperCase()}`,
      routeName: r.routeName || `${r.fromLocation || "Route"} ➔ ${r.toLocation || "Destination"}`,
      fromLocation: r.fromLocation || (r.stops && r.stops[0]) || "Kochi",
      toLocation: r.toLocation || (r.stops && r.stops[r.stops.length - 1]) || "Trivandrum",
      distanceKm: r.distanceKm || 150,
      duration: r.duration || "3h 30m",
      frequency: r.frequency || "Every 30 mins",
      stops: r.stops || [],
      fare: r.fare || 350,
      status: r.status || "Active",
    }));

    if (formattedRoutes.length === 0 && allBuses.length > 0) {
      allBuses.forEach((b, idx) => {
        formattedRoutes.push({
          _id: b._id,
          routeId: `RT-10${idx + 1}`,
          routeName: `${b.fromLocation} ➔ ${b.toLocation}`,
          fromLocation: b.fromLocation,
          toLocation: b.toLocation,
          distanceKm: b.stops ? b.stops.length * 25 : 120,
          duration: b.duration,
          frequency: "Every 45 mins",
          stops: b.stops,
          fare: b.price,
          status: "Active",
        });
      });
    }

    res.json({ success: true, count: formattedRoutes.length, routes: formattedRoutes });
  } catch (error) {
    console.error("Error fetching public routes:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Helper to normalize location strings for accurate comparison
const normalizeLocation = (loc) => {
  if (!loc) return "";
  return String(loc)
    .toLowerCase()
    .replace(/\(.*?\)/g, "") // strip parenthetical annotations e.g. (Vyttila)
    .replace(/[^a-z0-9\s]/gi, " ") // replace special chars with spaces
    .trim()
    .replace(/\s+/g, " ");
};

// Accurate location string matching (exact, normalized, or whole-word match)
const matchLocationStr = (locationInDB, searchQuery) => {
  if (!searchQuery) return true;
  const rawDb = String(locationInDB || "").trim().toLowerCase();
  const rawQ = String(searchQuery || "").trim().toLowerCase();
  if (!rawDb || !rawQ) return false;

  // Exact raw match
  if (rawDb === rawQ) return true;

  const dbNorm = normalizeLocation(locationInDB);
  const qNorm = normalizeLocation(searchQuery);
  if (!dbNorm || !qNorm) return false;

  // Exact normalized match
  if (dbNorm === qNorm) return true;

  // Whole-word regex match to prevent false partial matches e.g. "Pala" matching "Palakkad"
  const regexDb = new RegExp(`\\b${dbNorm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "i");
  const regexQ = new RegExp(`\\b${qNorm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}\\b`, "i");

  return regexDb.test(qNorm) || regexQ.test(dbNorm);
};

// Build a complete ordered sequence of all stops from origin to destination for a bus
const buildCompleteStopsList = (bus) => {
  const rawStops = Array.isArray(bus.stops)
    ? bus.stops.map((s) => (typeof s === "object" && s !== null ? (s.stopName || s.name || s.stop || "") : String(s)).trim())
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

// 1. GET /buses?from=...&to=...&date=... (Search Buses)
router.get("/buses", async (req, res) => {
  try {
    const { from, to, busType, minPrice, maxPrice, date } = req.query;
    const allBuses = await fetchAllNormalizedBuses();

    let filtered = allBuses;

    const isAllQuery = (str) => {
      if (!str) return true;
      const s = String(str).trim().toLowerCase();
      return (
        s === "" ||
        s.includes("all") ||
        s.includes("any") ||
        s.includes("select") ||
        s === "undefined" ||
        s === "null"
      );
    };

    const fromQuery = isAllQuery(from) ? null : from.trim();
    const toQuery = isAllQuery(to) ? null : to.trim();

    if (fromQuery || toQuery) {
      filtered = allBuses.filter((b) => {
        let fromIdx = -1;
        let toIdx = -1;

        if (fromQuery) {
          fromIdx = getStationMatchIndex(b, fromQuery);
          if (fromIdx === -1) return false;
        }

        if (toQuery) {
          toIdx = getStationMatchIndex(b, toQuery);
          if (toIdx === -1) return false;
        }

        if (fromQuery && toQuery && fromIdx !== -1 && toIdx !== -1) {
          if (fromIdx >= toIdx) return false;
        }

        return true;
      });
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
      travelDate: date || new Date().toISOString().split("T")[0],
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
    const bus = await Bus.findById(req.params.busId);
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found" });
    }

    // Generate grid seat layout (e.g. 8 rows x 4 seats = 32 seats: 1A, 1B, 1C, 1D ... 8D)
    const seats = [];
    const rows = Math.ceil(bus.totalSeats / 4);
    const cols = ["A", "B", "C", "D"];

    for (let r = 1; r <= rows; r++) {
      for (let c of cols) {
        const seatId = `${r}${c}`;
        const isBooked = bus.bookedSeats.includes(seatId);
        seats.push({
          id: seatId,
          row: r,
          column: c,
          isBooked,
          isWindow: c === "A" || c === "D",
          price: bus.price,
        });
      }
    }

    res.json({
      success: true,
      busId: bus._id,
      busName: bus.busName,
      totalSeats: bus.totalSeats,
      availableSeats: bus.availableSeats,
      bookedSeats: bus.bookedSeats,
      seats,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4. POST /bookings (Book Seats)
router.post("/bookings", async (req, res) => {
  try {
    const { userId, busId, passengerName, passengerEmail, passengerPhone, travelDate, selectedSeats, totalPrice, fromLocation, toLocation } = req.body;

    if (!busId || !selectedSeats || selectedSeats.length === 0) {
      return res.status(400).json({ success: false, message: "Bus ID and at least 1 selected seat are required." });
    }
    if (selectedSeats.length > 6) {
      return res.status(400).json({ success: false, message: "You can book a maximum of 6 seats per transaction." });
    }

    let bus = null;
    if (mongoose.Types.ObjectId.isValid(busId)) {
      bus = await Bus.findById(busId);
    }
    if (!bus) {
      bus = await Bus.findOne({
        $or: [{ busNumber: busId }, { vehicleNumber: busId }, { "Vehicle Number": busId }]
      });
    }

    // If bus record is not yet stored in Bus collection, instantiate and save it
    if (!bus) {
      const allBuses = await fetchAllNormalizedBuses();
      const norm = allBuses.find((b) => String(b._id) === String(busId) || b.busNumber === busId);
      
      bus = new Bus({
        busNumber: norm ? norm.busNumber : (typeof busId === "string" ? busId : "KL-07-MS-1008"),
        busName: norm ? norm.busName : "MoveSmart Transit Express",
        busType: norm ? norm.busType : "AC Seater / Sleeper (2+2)",
        operator: norm ? norm.operator : "MoveSmart Fleet Ops",
        fromLocation: norm ? norm.fromLocation : "Kochi",
        toLocation: norm ? norm.toLocation : "Trivandrum",
        departureTime: norm ? norm.departureTime : "07:00 AM",
        arrivalTime: norm ? norm.arrivalTime : "11:30 AM",
        price: norm ? norm.price : (totalPrice ? Math.round(totalPrice / selectedSeats.length) : 350),
        bookedSeats: norm ? norm.bookedSeats : [],
        totalSeats: norm ? norm.totalSeats : 32,
        availableSeats: norm ? norm.availableSeats : 32,
      });
      await bus.save();
    }

    const currentBooked = bus.bookedSeats || [];

    // Check if any seat is already booked
    const conflict = selectedSeats.some((seat) => currentBooked.includes(seat));
    if (conflict) {
      return res.status(400).json({
        success: false,
        message: "One or more selected seats have already been booked by another passenger. Please select different seats.",
      });
    }

    // Create unique Booking ID
    const bookingId = `MS-BK-${Math.floor(100000 + Math.random() * 900000)}`;

    const newBooking = new Booking({
      bookingId,
      userId: userId || "guest_user",
      passengerName: passengerName || "Passenger",
      passengerEmail: passengerEmail || "passenger@movesmart.in",
      passengerPhone: passengerPhone || "",
      busId: bus._id,
      busName: bus.busName,
      fromLocation: fromLocation || bus.fromLocation,
      toLocation: toLocation || bus.toLocation,
      travelDate: travelDate || new Date().toISOString().split("T")[0],
      departureTime: bus.departureTime,
      selectedSeats,
      totalPrice: totalPrice || selectedSeats.length * bus.price,
      status: "Confirmed",
    });

    await newBooking.save();

    // Update Bus bookedSeats & availableSeats
    bus.bookedSeats = [...currentBooked, ...selectedSeats];
    bus.availableSeats = Math.max(0, (bus.totalSeats || 32) - bus.bookedSeats.length);
    await bus.save();

    res.status(201).json({
      success: true,
      message: "Bus ticket booking confirmed successfully! 🎉",
      booking: newBooking,
    });
  } catch (error) {
    console.error("Booking creation error:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to confirm booking." });
  }
});

// 5. GET /bookings/user/:userId (User Bookings History)
router.get("/bookings/user/:userId", async (req, res) => {
  try {
    const bookings = await Booking.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json({ success: true, count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==========================================
// ADMIN BUS & ROUTE MANAGEMENT ENDPOINTS
// ==========================================

// --- ADMIN BUS MANAGEMENT ---

// GET /admin/buses (Fetch all buses for admin sorted newest first)
router.get("/admin/buses", async (req, res) => {
  try {
    await seedBusesIfEmpty();
    const buses = await Bus.find().sort({ createdAt: -1 });
    res.json({ success: true, count: buses.length, buses });
  } catch (error) {
    console.error("Error fetching admin buses:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch buses." });
  }
});

// POST /admin/buses (Create a new bus)
router.post("/admin/buses", async (req, res) => {
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
      driverLicense,
      driverId,
      driverPhoto,
      driverVerified,
      driverExperience,
      stops,
    } = req.body;

    if (!busName || !fromLocation || !toLocation || !departureTime || !arrivalTime || price === undefined || price === null || price === "") {
      return res.status(400).json({
        success: false,
        message: "Bus Name, From/To locations, Departure/Arrival times, and Ticket Price are required.",
      });
    }

    // Auto-generate busNumber if empty
    const finalBusNumber = busNumber && busNumber.trim()
      ? busNumber.trim().toUpperCase()
      : `KL-07-MS-${Math.floor(1000 + Math.random() * 9000)}`;

    const existing = await Bus.findOne({ busNumber: new RegExp("^" + finalBusNumber.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + "$", "i") });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: `A bus with registration number "${finalBusNumber}" already exists in the database.`,
      });
    }

    const seatsCount = Number(totalSeats) > 0 ? Number(totalSeats) : 32;
    const numericPrice = Number(price);

    if (isNaN(numericPrice) || numericPrice <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid numeric ticket price.",
      });
    }

    const parsedStops = Array.isArray(stops)
      ? stops
      : (typeof stops === "string" && stops.trim() ? stops.split(",").map((s) => s.trim()).filter(Boolean) : []);

    const newBus = new Bus({
      busNumber: finalBusNumber,
      busName: busName.trim(),
      busType: busType || "AC Seater / Sleeper (2+2)",
      operator: operator || "MoveSmart Fleet Ops",
      fromLocation: fromLocation.trim(),
      toLocation: toLocation.trim(),
      departureTime: departureTime.trim(),
      arrivalTime: arrivalTime.trim(),
      duration: duration || "4h 30m",
      totalSeats: seatsCount,
      availableSeats: seatsCount,
      price: numericPrice,
      amenities: Array.isArray(amenities) ? amenities : ["Wi-Fi", "Charging Port", "AC"],
      driverName: driverName || "Assigned Fleet Driver",
      driverPhone: driverPhone || "+91 98470 12345",
      driverLicense: driverLicense || "KL-07-2022-99011",
      driverId: driverId && driverId.match(/^[0-9a-fA-F]{24}$/) ? driverId : null,
      driverPhoto: driverPhoto || "",
      driverVerified: driverVerified !== undefined ? Boolean(driverVerified) : true,
      driverExperience: driverExperience ? Number(driverExperience) : 8,
      stops: parsedStops,
      bookedSeats: [],
    });

    await newBus.save();

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
router.put("/admin/buses/:id", async (req, res) => {
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
      driverLicense,
      driverId,
      driverPhoto,
      driverVerified,
      driverExperience,
      stops,
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
    if (driverName !== undefined) bus.driverName = driverName;
    if (driverPhone !== undefined) bus.driverPhone = driverPhone;
    if (driverLicense !== undefined) bus.driverLicense = driverLicense;
    if (driverId !== undefined) bus.driverId = driverId && String(driverId).match(/^[0-9a-fA-F]{24}$/) ? driverId : null;
    if (driverPhoto !== undefined) bus.driverPhoto = driverPhoto;
    if (driverVerified !== undefined) bus.driverVerified = Boolean(driverVerified);
    if (driverExperience !== undefined) bus.driverExperience = Number(driverExperience);

    if (stops !== undefined) {
      bus.stops = Array.isArray(stops)
        ? stops
        : (typeof stops === "string" && stops.trim() ? stops.split(",").map((s) => s.trim()).filter(Boolean) : []);
    }

    await bus.save();

    await bus.save();

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
router.delete("/admin/buses/:id", async (req, res) => {
  try {
    const bus = await Bus.findByIdAndDelete(req.params.id);
    if (!bus) {
      return res.status(404).json({ success: false, message: "Bus not found." });
    }
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
    await seedRoutesIfEmpty();
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

function addMinutesToTimeStr(timeStr, minutesToAdd = 0, bufferMinutes = 0) {
  if (!timeStr) return "08:00 AM";
  const cleanStr = timeStr.trim().toUpperCase();
  const isPM = cleanStr.includes("PM");
  const isAM = cleanStr.includes("AM");
  const match = cleanStr.match(/(\d{1,2}):(\d{2})/);
  if (!match) return timeStr;

  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (isPM && hours < 12) hours += 12;
  if (isAM && hours === 12) hours = 0;

  const totalMins = (hours * 60 + minutes + Number(minutesToAdd) + Number(bufferMinutes)) % 1440;
  const h24 = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  const period = h24 >= 12 ? "PM" : "AM";
  let h12 = h24 % 12;
  if (h12 === 0) h12 = 12;
  return `${h12.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${period}`;
}

// GET /admin/schedules (Fetch all route departure schedules)
router.get("/admin/schedules", async (req, res) => {
  try {
    const schedules = await Schedule.find().populate("route_id").sort({ createdAt: -1 });
    res.json({ success: true, count: schedules.length, schedules });
  } catch (error) {
    console.error("Error fetching schedules:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch schedules." });
  }
});

// POST /admin/schedules (Create departure schedule)
router.post("/admin/schedules", async (req, res) => {
  try {
    const { route_id, start_time, bus_id, busNumber, driver_id, driverName, delay_buffer_minutes, is_active } = req.body;

    if (!route_id || !start_time) {
      return res.status(400).json({ success: false, message: "Route ID and Departure Start Time are required." });
    }

    const routeObj = await Route.findById(route_id);
    if (!routeObj) {
      return res.status(404).json({ success: false, message: "Associated route not found." });
    }

    const newSchedule = new Schedule({
      route_id,
      routeName: routeObj.routeName,
      start_time: start_time.trim(),
      bus_id: bus_id || null,
      busNumber: busNumber || "",
      driver_id: driver_id || null,
      driverName: driverName || "",
      delay_buffer_minutes: Number(delay_buffer_minutes || 0),
      is_active: is_active !== false,
    });

    await newSchedule.save();

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

// DELETE /admin/schedules/:id (Delete departure schedule)
router.delete("/admin/schedules/:id", async (req, res) => {
  try {
    const schedule = await Schedule.findByIdAndDelete(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, message: "Schedule not found." });
    }
    res.json({ success: true, message: "Schedule departure deleted successfully!" });
  } catch (error) {
    console.error("Error deleting schedule:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete schedule." });
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

module.exports = router;

