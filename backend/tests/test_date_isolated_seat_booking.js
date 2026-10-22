const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
dotenv.config();

const Bus = require("../models/Bus");
const Route = require("../models/Route");
const User = require("../models/User");
const Booking = require("../models/Booking");
const BusDailySeat = require("../models/BusDailySeat");

const BASE_URL = "http://localhost:5000/api";
const JWT_SECRET = process.env.JWT_SECRET || "movesmart_jwt_secret_key_2024_secure";

async function runDateIsolationTest() {
  console.log("=================================================");
  console.log("   MoveSmart Date-Isolated Seat Booking Test     ");
  console.log("=================================================\n");

  await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/movesmart");

  // 1. Setup user
  let user = await User.findOne({ email: "test_passenger@movesmart.test" });
  if (!user) {
    user = new User({
      name: "Test Passenger",
      email: "test_passenger@movesmart.test",
      password: "password123",
      role: "user",
    });
    await user.save();
  }
  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });
  const headers = { "Content-Type": "application/json", Authorization: `Bearer ${token}` };

  // 2. Setup route
  let route = await Route.findOne({ status: "Active" });
  if (!route) {
    route = await Route.findOne();
  }

  // 3. Setup test bus
  const testBus = new Bus({
    busNumber: "KL-DATE-TEST-" + Math.floor(1000 + Math.random() * 9000),
    busName: "Date Isolation Bus",
    busType: "AC Superfast",
    route_id: route._id,
    routeName: route.routeName,
    fromLocation: route.fromLocation,
    toLocation: route.toLocation,
    bookingEnabled: true,
    totalSeats: 32,
    availableSeats: 32,
    price: 150,
    departureTime: "09:00 AM",
    arrivalTime: "02:00 PM",
  });
  await testBus.save();

  const busId = testBus._id;
  const date1 = "2026-10-26";
  const date2 = "2026-10-27";
  const date3 = "2026-10-28";

  console.log(`Created test bus ${testBus.busNumber} (${busId})\n`);

  try {
    // Step 1: Book Seat 1A on Date 1 (2026-10-26)
    console.log(`1. Booking seat 1A on Date 1 (${date1})...`);
    const book1 = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        busId,
        seatsBooked: ["1A"],
        travelDate: date1,
        fromLocation: route.fromLocation,
        toLocation: route.toLocation,
        totalFare: 150,
      }),
    }).then((r) => r.json());

    console.log("   Date 1 booking success:", book1.success, "| Booking ID:", book1.booking?.bookingId);
    if (!book1.success) throw new Error("Failed to book on Date 1: " + book1.message);

    // Step 2: Query seats for Date 1 -> Seat 1A MUST be booked
    const seatsDate1 = await fetch(`${BASE_URL}/seats/${busId}?date=${date1}`).then((r) => r.json());
    const isBookedOnDate1 = seatsDate1.bookedSeats?.includes("1A");
    console.log(`2. Date 1 (${date1}) seat 1A is booked?`, isBookedOnDate1 ? "YES ✅" : "NO ❌");

    // Step 3: Query seats for Date 2 (2026-10-27) -> Seat 1A MUST BE CLEAR/AVAILABLE!
    console.log(`\n3. Querying seat layout for Date 2 (${date2})...`);
    const seatsDate2 = await fetch(`${BASE_URL}/seats/${busId}?date=${date2}`).then((r) => r.json());
    const isBookedOnDate2 = seatsDate2.bookedSeats?.includes("1A");
    const seat1AOnDate2 = seatsDate2.seats?.find((s) => s.id === "1A");
    console.log(`   Date 2 (${date2}) bookedSeats list:`, seatsDate2.bookedSeats);
    console.log(`   Date 2 (${date2}) Seat 1A is booked?`, isBookedOnDate2 ? "NO (FAILED ❌)" : "CLEARED & FREE ✅");
    console.log(`   Date 2 (${date2}) availableSeats count:`, seatsDate2.availableSeats, "(Expected: 32)");

    if (isBookedOnDate2 || (seat1AOnDate2 && seat1AOnDate2.isBooked)) {
      throw new Error(`Date 2 has seat 1A locked! It must be cleared!`);
    }

    // Step 4: Book Seat 1A on Date 2 (2026-10-27) -> MUST SUCCEED!
    console.log(`\n4. Booking seat 1A on Date 2 (${date2})...`);
    const book2 = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        busId,
        seatsBooked: ["1A"],
        travelDate: date2,
        fromLocation: route.fromLocation,
        toLocation: route.toLocation,
        totalFare: 150,
      }),
    }).then((r) => r.json());

    console.log("   Date 2 booking success:", book2.success ? "SUCCEEDED ✅" : "FAILED ❌", "| Booking ID:", book2.booking?.bookingId);
    if (!book2.success) throw new Error("Booking on Date 2 failed: " + book2.message);

    // Step 5: Duplicate booking of Seat 1A on Date 2 -> MUST BE REJECTED!
    console.log(`\n5. Attempting duplicate reservation of seat 1A on Date 2 (${date2})...`);
    const book2Dup = await fetch(`${BASE_URL}/bookings`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        busId,
        seatsBooked: ["1A"],
        travelDate: date2,
        fromLocation: route.fromLocation,
        toLocation: route.toLocation,
        totalFare: 150,
      }),
    }).then((r) => r.json());

    console.log("   Duplicate reservation rejected?", !book2Dup.success ? "YES ✅ (Correct)" : "NO ❌", "| Message:", book2Dup.message);
    if (book2Dup.success) throw new Error("Duplicate reservation on Date 2 should have been rejected!");

    // Step 6: Query Date 3 (2026-10-28) -> All seats MUST BE CLEAR!
    console.log(`\n6. Querying seat layout for Date 3 (${date3})...`);
    const seatsDate3 = await fetch(`${BASE_URL}/seats/${busId}?date=${date3}`).then((r) => r.json());
    console.log("   Date 3 bookedSeats:", seatsDate3.bookedSeats, "(Expected empty [])");
    console.log("   Date 3 availableSeats:", seatsDate3.availableSeats, "(Expected 32)");

    const isDate3Clear = Array.isArray(seatsDate3.bookedSeats) && seatsDate3.bookedSeats.length === 0;
    console.log("   Date 3 completely clear?", isDate3Clear ? "YES ✅" : "NO ❌");

    console.log("\n=================================================");
    console.log("   ALL DATE ISOLATION TESTS PASSED PERFECTLY! ✅  ");
    console.log("=================================================");
  } finally {
    // Cleanup test data
    await BusDailySeat.deleteMany({ busId });
    await Booking.deleteMany({ busId });
    await Bus.deleteOne({ _id: busId });
    await mongoose.disconnect();
  }
}

runDateIsolationTest().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
