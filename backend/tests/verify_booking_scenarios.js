const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env") });

const BASE_URL = "http://127.0.0.1:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026";

async function runTests() {
  console.log("=================================================");
  console.log("   MoveSmart Scenario Verification (A through H) ");
  console.log("=================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);
  const User = require("../models/User");
  const Bus = require("../models/Bus");
  const Route = require("../models/Route");
  const Schedule = require("../models/Schedule");
  const Booking = require("../models/Booking");

  // 1. Setup User and Admin tokens
  const adminUser = await User.findOne({ role: "admin" });
  const regularUser = await User.findOne({ role: "user" });
  if (!adminUser || !regularUser) {
    throw new Error("Admin or regular user not found in database.");
  }

  const adminToken = jwt.sign({ id: adminUser._id }, JWT_SECRET, { expiresIn: "1d" });
  const userToken = jwt.sign({ id: regularUser._id }, JWT_SECRET, { expiresIn: "1d" });
  const user2Token = jwt.sign({ id: new mongoose.Types.ObjectId() }, JWT_SECRET, { expiresIn: "1d" });

  const adminHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  };
  const userHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${userToken}`,
  };

  const results = {};

  // -------------------------------------------------------------
  // Test Scenario C: Bus has no route (KL-8-9875)
  // -------------------------------------------------------------
  console.log("\n--- Testing Scenario C: Bus has no assigned route ---");
  const unassignedBus = await Bus.findOne({ busNumber: "KL-8-9875" });
  const busesResC = await fetch(`${BASE_URL}/buses`).then((r) => r.json());
  const appearsInListC = busesResC.buses?.some((b) => b.busNumber === "KL-8-9875");

  const seatResC = await fetch(`${BASE_URL}/seats/${unassignedBus._id}`).then((r) => r.json());
  const bookResC = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({
      busId: unassignedBus._id,
      seatsBooked: ["1A"],
      serviceDate: "2026-10-25",
    }),
  }).then((r) => r.json());

  console.log("Scenario C: Unassigned bus in /api/buses?", appearsInListC ? "YES (FAILED)" : "NO (PASSED)");
  console.log("Scenario C: /seats/:busId response:", seatResC.message, "| Eligible:", seatResC.isBookingEligible);
  console.log("Scenario C: /bookings response:", bookResC.message, "| Success:", bookResC.success);

  results["C"] = !appearsInListC && !seatResC.isBookingEligible && !bookResC.success;

  // -------------------------------------------------------------
  // Test Scenario D: Bus references deleted or invalid route
  // -------------------------------------------------------------
  console.log("\n--- Testing Scenario D: Bus with invalid/deleted route ---");
  // Create a temporary bus with fake route ObjectId
  const fakeRouteId = new mongoose.Types.ObjectId();
  const testBusD = new Bus({
    busNumber: "KL-TEST-D-" + Math.floor(1000 + Math.random() * 9000),
    busName: "Invalid Route Test Bus",
    busType: "Normal Bus",
    fromLocation: "Depot",
    toLocation: "Depot",
    route_id: fakeRouteId,
    bookingEnabled: true,
    totalSeats: 32,
    availableSeats: 32,
    price: 150,
  });
  await testBusD.save();

  const busesResD = await fetch(`${BASE_URL}/buses`).then((r) => r.json());
  const appearsInListD = busesResD.buses?.some((b) => b.busNumber === testBusD.busNumber);

  const seatResD = await fetch(`${BASE_URL}/seats/${testBusD._id}`).then((r) => r.json());
  const bookResD = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({
      busId: testBusD._id,
      seatsBooked: ["1A"],
      serviceDate: "2026-10-25",
    }),
  }).then((r) => r.json());

  console.log("Scenario D: Invalid route bus in /api/buses?", appearsInListD ? "YES (FAILED)" : "NO (PASSED)");
  console.log("Scenario D: /seats/:busId response:", seatResD.message, "| Eligible:", seatResD.isBookingEligible);
  console.log("Scenario D: /bookings response:", bookResD.message, "| Success:", bookResD.success);

  results["D"] = !appearsInListD && !seatResD.isBookingEligible && !bookResD.success;
  await Bus.deleteOne({ _id: testBusD._id });

  // -------------------------------------------------------------
  // Test Scenario A: Bus has valid route and booking enabled
  // -------------------------------------------------------------
  console.log("\n--- Testing Scenario A: Bus has valid route & booking enabled ---");
  const validRoute = await Route.findOne({ status: "Active" });
  const testBusA = new Bus({
    busNumber: "KL-TEST-A-" + Math.floor(1000 + Math.random() * 9000),
    busName: "Scenario A Express",
    busType: "AC Seater",
    route_id: validRoute._id,
    routeName: validRoute.routeName,
    fromLocation: validRoute.fromLocation,
    toLocation: validRoute.toLocation,
    bookingEnabled: true,
    totalSeats: 32,
    availableSeats: 32,
    price: 180,
    departureTime: "09:00 AM",
    arrivalTime: "02:00 PM",
  });
  await testBusA.save();

  const seatResA = await fetch(`${BASE_URL}/seats/${testBusA._id}`).then((r) => r.json());
  const bookResA = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({
      busId: testBusA._id,
      seatsBooked: ["1A"],
      serviceDate: "2026-10-26",
      fromLocation: validRoute.fromLocation,
      toLocation: validRoute.toLocation,
      totalFare: 180,
    }),
  }).then((r) => r.json());

  console.log("Scenario A: Seat fetch success:", seatResA.success, "| Eligible:", seatResA.isBookingEligible, "| Seats count:", seatResA.seats?.length);
  console.log("Scenario A: Seat reservation:", bookResA.success ? "RESERVED ✅" : "FAILED ❌", "| Booking ID:", bookResA.booking?._id);

  results["A"] = seatResA.success === true && seatResA.isBookingEligible === true && bookResA.success === true;

  // -------------------------------------------------------------
  // Test Scenario B: Bus has valid route and booking is disabled
  // -------------------------------------------------------------
  console.log("\n--- Testing Scenario B: Bus has valid route & booking disabled ---");
  const testBusB = new Bus({
    busNumber: "KL-TEST-B-" + Math.floor(1000 + Math.random() * 9000),
    busName: "Scenario B Walkin Only",
    busType: "Normal Bus",
    route_id: validRoute._id,
    routeName: validRoute.routeName,
    fromLocation: validRoute.fromLocation,
    toLocation: validRoute.toLocation,
    bookingEnabled: false,
    totalSeats: 32,
    availableSeats: 32,
    price: 100,
    departureTime: "10:00 AM",
    arrivalTime: "03:00 PM",
  });
  await testBusB.save();

  const busesResB = await fetch(`${BASE_URL}/buses`).then((r) => r.json());
  const appearsInListB = busesResB.buses?.some((b) => b.busNumber === testBusB.busNumber);
  const busBFromList = busesResB.buses?.find((b) => b.busNumber === testBusB.busNumber);

  const seatResB = await fetch(`${BASE_URL}/seats/${testBusB._id}`).then((r) => r.json());
  const bookResB = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({
      busId: testBusB._id,
      seatsBooked: ["1A"],
      serviceDate: "2026-10-26",
    }),
  }).then((r) => r.json());

  console.log("Scenario B: Visible in user route listing?", appearsInListB ? "YES ✅" : "NO ❌");
  console.log("Scenario B: bookingEnabled property in listing:", busBFromList?.bookingEnabled);
  console.log("Scenario B: /seats/:busId response:", seatResB.message, "| Eligible:", seatResB.isBookingEligible);
  console.log("Scenario B: /bookings rejection message:", bookResB.message, "| Success:", bookResB.success);

  results["B"] = appearsInListB && busBFromList?.bookingEnabled === false && !seatResB.isBookingEligible && !bookResB.success;
  await Bus.deleteOne({ _id: testBusB._id });

  // -------------------------------------------------------------
  // Test Scenario E: Booking disabled after existing reservations
  // -------------------------------------------------------------
  console.log("\n--- Testing Scenario E: Booking disabled after existing reservations ---");
  // testBusA has seat 1A booked from Scenario A
  // Admin disables booking
  testBusA.bookingEnabled = false;
  await testBusA.save();

  const busInDbE = await Bus.findById(testBusA._id);
  const bookingsInDbE = await Booking.find({ busId: testBusA._id });

  console.log("Scenario E: Historical bookedSeats after disabling booking:", busInDbE.bookedSeats);
  console.log("Scenario E: Existing Booking documents in DB:", bookingsInDbE.length);
  // Verify new bookings are now rejected
  const bookResE = await fetch(`${BASE_URL}/bookings`, {
    method: "POST",
    headers: userHeaders,
    body: JSON.stringify({
      busId: testBusA._id,
      seatsBooked: ["1B"],
      serviceDate: "2026-10-26",
    }),
  }).then((r) => r.json());
  console.log("Scenario E: New reservation attempt on disabled bus rejected?", !bookResE.success ? "YES ✅" : "NO ❌");

  results["E"] = busInDbE.bookedSeats.includes("1A") && bookingsInDbE.length > 0 && !bookResE.success;

  // -------------------------------------------------------------
  // Test Scenario F: Two users reserve the same seat simultaneously
  // -------------------------------------------------------------
  console.log("\n--- Testing Scenario F: Concurrent reservation of same seat ---");
  // Re-enable booking on testBusA for seat 2A
  testBusA.bookingEnabled = true;
  await testBusA.save();

  // Create another valid user for concurrency test
  let secondUser = await User.findOne({ email: "concurrency_user@movesmart.test" });
  if (!secondUser) {
    secondUser = new User({
      name: "Concurrency Test User",
      email: "concurrency_user@movesmart.test",
      password: "password123",
      role: "user",
    });
    await secondUser.save();
  }
  const secondUserToken = jwt.sign({ id: secondUser._id }, JWT_SECRET, { expiresIn: "1d" });
  const user2Headers = { "Content-Type": "application/json", Authorization: `Bearer ${secondUserToken}` };

  const [simRes1, simRes2] = await Promise.all([
    fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: userHeaders,
      body: JSON.stringify({
        busId: testBusA._id,
        seatsBooked: ["2A"],
        serviceDate: "2026-10-27",
        fromLocation: validRoute.fromLocation,
        toLocation: validRoute.toLocation,
        totalFare: 180,
      }),
    }),
    fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers: user2Headers,
      body: JSON.stringify({
        busId: testBusA._id,
        seatsBooked: ["2A"],
        serviceDate: "2026-10-27",
        fromLocation: validRoute.fromLocation,
        toLocation: validRoute.toLocation,
        totalFare: 180,
      }),
    }),
  ]);

  const json1 = await simRes1.json();
  const json2 = await simRes2.json();

  const successCount = (json1.success ? 1 : 0) + (json2.success ? 1 : 0);
  const conflictCount = (simRes1.status === 409 || json1.status === 409 || !json1.success ? 1 : 0) +
                        (simRes2.status === 409 || json2.status === 409 || !json2.success ? 1 : 0);

  console.log("Scenario F: Status 1:", simRes1.status, json1.message);
  console.log("Scenario F: Status 2:", simRes2.status, json2.message);
  console.log("Scenario F: Successful reservations:", successCount, "(Expected exactly 1)");

  results["F"] = successCount === 1;

  // Cleanup testBusA and test bookings
  await Booking.deleteMany({ busId: testBusA._id });
  await Bus.deleteOne({ _id: testBusA._id });
  await User.deleteOne({ _id: secondUser._id });

  // -------------------------------------------------------------
  // Test Scenario G: Valid active journey live tracking continues regardless of bookingEnabled
  // -------------------------------------------------------------
  console.log("\n--- Testing Scenario G: Active journey live tracking regardless of bookingEnabled ---");
  // Check active locations or route departures for active buses
  const liveLocationsRes = await fetch(`${BASE_URL}/buses/live-locations`).then((r) => r.json());
  console.log("Scenario G: Live locations returned:", liveLocationsRes.count || liveLocationsRes.locations?.length || 0);

  // Verify that an active route with bookingEnabled: false still has active buses visible
  const scheduleRes = await fetch(`${BASE_URL}/buses?fromLocation=${encodeURIComponent(validRoute.fromLocation)}`).then((r) => r.json());
  console.log("Scenario G: Route search returns valid buses regardless of bookingEnabled:", scheduleRes.buses?.length > 0 ? "YES ✅" : "NO");

  results["G"] = scheduleRes.success === true && scheduleRes.buses?.length > 0;

  // -------------------------------------------------------------
  // Test Scenario H: Admin changes booking setting and persists across refresh
  // -------------------------------------------------------------
  console.log("\n--- Testing Scenario H: Admin changes booking setting and persists ---");
  const testBusH = new Bus({
    busNumber: "KL-TEST-H-" + Math.floor(1000 + Math.random() * 9000),
    busName: "Admin Toggle Test Bus",
    busType: "Normal Bus",
    route_id: validRoute._id,
    routeName: validRoute.routeName,
    fromLocation: validRoute.fromLocation,
    toLocation: validRoute.toLocation,
    bookingEnabled: false,
    totalSeats: 32,
    availableSeats: 32,
    price: 120,
  });
  await testBusH.save();

  // Admin toggles booking to true
  const patchRes = await fetch(`${BASE_URL}/admin/buses/${testBusH._id}/booking-toggle`, {
    method: "PATCH",
    headers: adminHeaders,
    body: JSON.stringify({ bookingEnabled: true }),
  }).then((r) => r.json());

  console.log("Scenario H: Admin toggle response:", patchRes.message, "| bookingEnabled:", patchRes.bookingEnabled);

  // Re-read directly from MongoDB
  const busRefreshed = await Bus.findById(testBusH._id);
  console.log("Scenario H: Direct MongoDB check after toggle:", busRefreshed.bookingEnabled === true ? "ENABLED ✅" : "FAILED ❌");

  // Non-admin attempt should be rejected (403 Forbidden)
  const nonAdminPatch = await fetch(`${BASE_URL}/admin/buses/${testBusH._id}/booking-toggle`, {
    method: "PATCH",
    headers: userHeaders,
    body: JSON.stringify({ bookingEnabled: false }),
  });
  console.log("Scenario H: Non-admin toggle attempt HTTP status:", nonAdminPatch.status, "(Expected 403 Forbidden)");

  results["H"] = patchRes.success === true &&
                 patchRes.bookingEnabled === true &&
                 busRefreshed.bookingEnabled === true &&
                 nonAdminPatch.status === 403;

  await Bus.deleteOne({ _id: testBusH._id });

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n=================================================");
  console.log("               TEST RESULTS SUMMARY              ");
  console.log("=================================================");
  let allPassed = true;
  for (const [scenario, passed] of Object.entries(results)) {
    console.log(`Scenario ${scenario}: ${passed ? "PASSED ✅" : "FAILED ❌"}`);
    if (!passed) allPassed = false;
  }
  console.log("=================================================");
  console.log("Overall Status:", allPassed ? "ALL SCENARIOS PASSED ✅" : "SOME SCENARIOS FAILED ❌");

  await mongoose.disconnect();
  process.exit(allPassed ? 0 : 1);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
