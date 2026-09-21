const mongoose = require("mongoose");
const dotenv = require("dotenv");
dotenv.config();

const Stop = require("../models/Stop");
const StopDistance = require("../models/StopDistance");
const Bus = require("../models/Bus");

// Haversine distance calculator with Kerala road curvature adjustment (1.2x)
function calculateRoadKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c * 1.22).toFixed(1));
}

async function seedRoutesAndStops() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✅ Connected to MongoDB");

  // Comprehensive Kerala Transit Stops & Sub-stations
  const ALL_KERALA_STOPS = [
    // 1. Kanjirappally ➔ Erattupetta Route Sub-stations (Kottayam Corridor)
    { code: "STOP_KANJIRAPPALLY", name: "Kanjirappally Stand", latitude: 9.5574, longitude: 76.7904, cumKm: 0.0 },
    { code: "STOP_AKJM", name: "AKJM School (26th Mile)", latitude: 9.5630, longitude: 76.7760, cumKm: 1.8 },
    { code: "STOP_PONKUNNAM", name: "Ponkunnam Junction", latitude: 9.5714, longitude: 76.7584, cumKm: 5.2 },
    { code: "STOP_ELANGOI", name: "Elangoi Junction", latitude: 9.6050, longitude: 76.7450, cumKm: 9.7 },
    { code: "STOP_PAIKA", name: "Paika Bus Stop", latitude: 9.6380, longitude: 76.7250, cumKm: 13.9 },
    { code: "STOP_POOVARANI", name: "Poovarani Junction", latitude: 9.6670, longitude: 76.7080, cumKm: 17.7 },
    { code: "STOP_PALA", name: "Pala Bus Stand", latitude: 9.7118, longitude: 76.6836, cumKm: 21.7 },
    { code: "STOP_MUTHOLY", name: "Mutholy Junction", latitude: 9.7080, longitude: 76.7050, cumKm: 24.2 },
    { code: "STOP_BHARANANGANAM", name: "Bharananganam Shrine", latitude: 9.7020, longitude: 76.7280, cumKm: 27.4 },
    { code: "STOP_PLASSANAL", name: "Plassanal Junction", latitude: 9.6970, longitude: 76.7560, cumKm: 30.9 },
    { code: "STOP_ARUVITHURA", name: "Aruvithura Church Junction", latitude: 9.6940, longitude: 76.7770, cumKm: 33.5 },
    { code: "STOP_ERATTUPETTA", name: "Erattupetta Central", latitude: 9.6917, longitude: 76.7869, cumKm: 34.7 },

    // 2. Kochi ➔ Trivandrum Route (Highway Corridor)
    { code: "STOP_KOCHI", name: "Kochi (Vyttila Hub)", latitude: 9.9658, longitude: 76.3204, cumKm: 0.0 },
    { code: "STOP_ALAPPUZHA", name: "Alappuzha KSRTC Terminal", latitude: 9.4981, longitude: 76.3388, cumKm: 54.0 },
    { code: "STOP_KOLLAM", name: "Kollam Bus Stand", latitude: 8.8932, longitude: 76.6141, cumKm: 139.0 },
    { code: "STOP_TRIVANDRUM", name: "Trivandrum Central (Thampanoor)", latitude: 8.4875, longitude: 76.9525, cumKm: 205.0 },

    // 3. Kochi Metro Corridor (Vyttila ➔ Angamaly)
    { code: "STOP_VYTTILA", name: "Vyttila Mobility Hub", latitude: 9.9658, longitude: 76.3204, cumKm: 0.0 },
    { code: "STOP_KALOOR", name: "Kaloor Bus Terminal", latitude: 9.9961, longitude: 76.2906, cumKm: 5.5 },
    { code: "STOP_EDAPPALLY", name: "Edappally Toll Junction", latitude: 10.0261, longitude: 76.3085, cumKm: 9.7 },
    { code: "STOP_ALUVA", name: "Aluva Bus & Metro Hub", latitude: 10.1076, longitude: 76.3516, cumKm: 18.7 },
    { code: "STOP_ANGAMALY", name: "Angamaly Major Terminal", latitude: 10.1960, longitude: 76.3860, cumKm: 29.2 },
    { code: "STOP_KAKKANAD", name: "Kakkanad InfoPark Transit Hub", latitude: 10.0159, longitude: 76.3419, cumKm: 15.7 },
  ];

  const stopMap = {};
  for (const s of ALL_KERALA_STOPS) {
    let stopDoc = await Stop.findOne({ code: s.code });
    if (!stopDoc) {
      stopDoc = new Stop({
        code: s.code,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
      });
      await stopDoc.save();
      console.log(`+ Created stop: ${s.name} (${s.code})`);
    } else {
      stopDoc.latitude = s.latitude;
      stopDoc.longitude = s.longitude;
      stopDoc.name = s.name;
      await stopDoc.save();
    }
    stopMap[s.code] = stopDoc;
  }

  // Generate All Pairwise Distances for Kanjirappally ➔ Erattupetta Corridor
  const KANJIRAPPALLY_ERATTUPETTA_STOPS = [
    "STOP_KANJIRAPPALLY",
    "STOP_AKJM",
    "STOP_PONKUNNAM",
    "STOP_ELANGOI",
    "STOP_PAIKA",
    "STOP_POOVARANI",
    "STOP_PALA",
    "STOP_MUTHOLY",
    "STOP_BHARANANGANAM",
    "STOP_PLASSANAL",
    "STOP_ARUVITHURA",
    "STOP_ERATTUPETTA",
  ];

  const stopInfoMap = {};
  ALL_KERALA_STOPS.forEach((s) => {
    stopInfoMap[s.code] = s;
  });

  // Seed Distance Matrix for all combinations in the corridor
  for (let i = 0; i < KANJIRAPPALLY_ERATTUPETTA_STOPS.length; i++) {
    for (let j = i + 1; j < KANJIRAPPALLY_ERATTUPETTA_STOPS.length; j++) {
      const codeA = KANJIRAPPALLY_ERATTUPETTA_STOPS[i];
      const codeB = KANJIRAPPALLY_ERATTUPETTA_STOPS[j];
      const stopA = stopMap[codeA];
      const stopB = stopMap[codeB];
      const infoA = stopInfoMap[codeA];
      const infoB = stopInfoMap[codeB];

      if (stopA && stopB) {
        const distKm = Math.max(
          1.0,
          Number(Math.abs(infoB.cumKm - infoA.cumKm).toFixed(1))
        );

        let distDoc = await StopDistance.findOne({
          $or: [
            { fromStop: stopA._id, toStop: stopB._id },
            { fromStop: stopB._id, toStop: stopA._id },
          ],
        });

        if (!distDoc) {
          distDoc = new StopDistance({
            fromStop: stopA._id,
            toStop: stopB._id,
            distanceKm: distKm,
          });
          await distDoc.save();
        } else {
          distDoc.distanceKm = distKm;
          await distDoc.save();
        }
      }
    }
  }

  // Additional Highway & Metro pairs
  const EXTRA_PAIRS = [
    { from: "STOP_KOCHI", to: "STOP_ALAPPUZHA", dist: 54.0 },
    { from: "STOP_ALAPPUZHA", to: "STOP_KOLLAM", dist: 85.0 },
    { from: "STOP_KOLLAM", to: "STOP_TRIVANDRUM", dist: 66.0 },
    { from: "STOP_KOCHI", to: "STOP_TRIVANDRUM", dist: 205.0 },
    { from: "STOP_VYTTILA", to: "STOP_KALOOR", dist: 5.5 },
    { from: "STOP_KALOOR", to: "STOP_EDAPPALLY", dist: 4.2 },
    { from: "STOP_EDAPPALLY", to: "STOP_ALUVA", dist: 9.0 },
    { from: "STOP_ALUVA", to: "STOP_ANGAMALY", dist: 10.5 },
    { from: "STOP_EDAPPALLY", to: "STOP_KAKKANAD", dist: 6.0 },
  ];

  for (const pair of EXTRA_PAIRS) {
    const fromStop = stopMap[pair.from];
    const toStop = stopMap[pair.to];
    if (fromStop && toStop) {
      let distDoc = await StopDistance.findOne({
        $or: [
          { fromStop: fromStop._id, toStop: toStop._id },
          { fromStop: toStop._id, toStop: fromStop._id },
        ],
      });
      if (!distDoc) {
        distDoc = new StopDistance({
          fromStop: fromStop._id,
          toStop: toStop._id,
          distanceKm: pair.dist,
        });
        await distDoc.save();
      } else {
        distDoc.distanceKm = pair.dist;
        await distDoc.save();
      }
    }
  }

  // Update KL-06-345 with all 12 sub-stations
  const busKanjirappally = await Bus.findOne({ busNumber: "KL-06-345" });
  if (busKanjirappally) {
    busKanjirappally.fromLocation = "Kanjirappally";
    busKanjirappally.toLocation = "Erattupetta";
    busKanjirappally.routeName = "Kanjirappally ➔ Erattupetta";
    busKanjirappally.stops = [
      "Kanjirappally Stand",
      "AKJM School (26th Mile)",
      "Ponkunnam Junction",
      "Elangoi Junction",
      "Paika Bus Stop",
      "Poovarani Junction",
      "Pala Bus Stand",
      "Mutholy Junction",
      "Bharananganam Shrine",
      "Plassanal Junction",
      "Aruvithura Church Junction",
      "Erattupetta Central",
    ];
    await busKanjirappally.save();
    console.log("✅ Updated KL-06-345 with 12 sub-stations:", busKanjirappally.stops);
  }

  // Update KL-05-AA-1001 route stops
  const busKochi = await Bus.findOne({ busNumber: "KL-05-AA-1001" });
  if (busKochi) {
    busKochi.fromLocation = "Kochi";
    busKochi.toLocation = "Trivandrum";
    busKochi.routeName = "Kochi ➔ Trivandrum";
    busKochi.stops = [
      "Kochi (Vyttila Hub)",
      "Alappuzha KSRTC Terminal",
      "Kollam Bus Stand",
      "Trivandrum Central (Thampanoor)",
    ];
    await busKochi.save();
    console.log("✅ Updated KL-05-AA-1001 route stops:", busKochi.stops);
  }

  console.log("🎉 All Kerala route stops and distance matrices successfully seeded!");
  await mongoose.disconnect();
}

seedRoutesAndStops().catch(console.error);
