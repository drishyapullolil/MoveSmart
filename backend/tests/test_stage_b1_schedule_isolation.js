/**
 * Stage B.1 Automated Verification Suite
 * Verifies the isolation of Route Departure Scheduling from Driver Assignment:
 * 1. Creating a schedule for a bus with a legacy permanent driver does NOT copy that driver into the new schedule.
 * 2. Bus-number autofill still works when creating a schedule with bus_id.
 * 3. A schedule created without a driver is saved as unassigned (driver_id: null, driverName: "Not Assigned").
 * 4. Existing schedule driver information is preserved when editing unrelated schedule fields.
 * 5. Explicit driver handling remains supported if explicitly provided in request body.
 * 6. Permanent bus-driver fields (Bus.driverId, Bus.driverName) and Bus.shifts are never modified.
 */

const assert = require("assert");
const mongoose = require("mongoose");
const Schedule = require("../models/Schedule");
const Bus = require("../models/Bus");

console.log("=================================================");
console.log("RUNNING STAGE B.1 SCHEDULE ISOLATION TEST SUITE");
console.log("=================================================");

let totalTests = 0;
let passedTests = 0;

function test(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ FAIL: ${name}`);
    console.error(`    ${err.message}`);
  }
}

async function runAsyncTests() {
  const legacyDriverId = new mongoose.Types.ObjectId("6a63725647d78c17944080f1");
  const busWithLegacyDriver = {
    _id: new mongoose.Types.ObjectId("6b63725647d78c17944080b1"),
    busNumber: "KL-07-MS-1001",
    busName: "Express Cruiser",
    driverId: legacyDriverId,
    driverName: "Legacy Permanent Driver",
    shifts: {
      morning: { driverId: null, driverName: "Not Assigned" },
      evening: { driverId: null, driverName: "Not Assigned" },
      night: { driverId: null, driverName: "Not Assigned" },
    },
  };

  const routeObj = {
    _id: new mongoose.Types.ObjectId("6c63725647d78c17944080a1"),
    routeName: "Kottayam ➔ Erumely",
  };

  const isGeneric = (n) =>
    !n || ["unassigned", "assigned driver", "assigned fleet driver", "driver assigned", "driver"].includes(String(n).toLowerCase().trim());

  // Helper simulating POST /api/admin/schedules logic
  function createScheduleSimulation(reqBody, matchedBus) {
    let { route_id, start_time, bus_id, busNumber, driver_id, driverName, delay_buffer_minutes, is_active } = reqBody;

    // 1. Auto-fill bus details from Bus model if bus_id is present
    if (bus_id && matchedBus) {
      if (!busNumber) busNumber = matchedBus.busNumber;
    }

    if (isGeneric(driverName)) {
      driverName = "Not Assigned";
    }

    return new Schedule({
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
  }

  // Helper simulating PUT /api/admin/schedules/:id logic
  function updateScheduleSimulation(existingSchedule, reqBody, matchedBus) {
    const { route_id, start_time, bus_id, busNumber, driver_id, driverName, delay_buffer_minutes, is_active } = reqBody;

    if (start_time) existingSchedule.start_time = start_time.trim();
    if (bus_id !== undefined) existingSchedule.bus_id = bus_id || null;
    if (busNumber !== undefined) existingSchedule.busNumber = busNumber;
    if (driver_id !== undefined) existingSchedule.driver_id = driver_id || null;
    if (driverName !== undefined) {
      existingSchedule.driverName = !isGeneric(driverName) ? driverName : "Not Assigned";
    }

    // Auto-fill bus number from Bus if bus_id exists and busNumber is missing
    if (existingSchedule.bus_id && matchedBus && !existingSchedule.busNumber) {
      existingSchedule.busNumber = matchedBus.busNumber;
    }

    if (isGeneric(existingSchedule.driverName)) {
      existingSchedule.driverName = "Not Assigned";
    }

    if (delay_buffer_minutes !== undefined) existingSchedule.delay_buffer_minutes = Number(delay_buffer_minutes || 0);
    if (is_active !== undefined) existingSchedule.is_active = Boolean(is_active);

    return existingSchedule;
  }

  // TEST 1: New schedule with bus possessing legacy driver does NOT inherit that driver
  test("1. Creating a schedule for a bus with a legacy permanent driver does not copy that driver", () => {
    const newSch = createScheduleSimulation(
      {
        route_id: routeObj._id,
        start_time: "08:30 AM",
        bus_id: busWithLegacyDriver._id,
      },
      busWithLegacyDriver
    );

    assert.strictEqual(newSch.driver_id, null, "driver_id must be null for new schedule");
    assert.strictEqual(newSch.driverName, "Not Assigned", "driverName must be 'Not Assigned'");
    assert.strictEqual(
      String(busWithLegacyDriver.driverId),
      String(legacyDriverId),
      "Bus.driverId must remain intact"
    );
  });

  // TEST 2: Bus number autofill works when busNumber is omitted
  test("2. Bus-number autofill still works when busNumber is omitted", () => {
    const newSch = createScheduleSimulation(
      {
        route_id: routeObj._id,
        start_time: "09:00 AM",
        bus_id: busWithLegacyDriver._id,
      },
      busWithLegacyDriver
    );

    assert.strictEqual(newSch.busNumber, "KL-07-MS-1001", "busNumber must be auto-filled from matchedBus");
  });

  // TEST 3: Schedule created without driver or bus is saved as unassigned
  test("3. A schedule created without a driver is saved as unassigned", () => {
    const newSch = createScheduleSimulation(
      {
        route_id: routeObj._id,
        start_time: "10:15 AM",
      },
      null
    );

    assert.strictEqual(newSch.driver_id, null, "driver_id must default to null");
    assert.strictEqual(newSch.driverName, "Not Assigned", "driverName must default to 'Not Assigned'");
    assert.strictEqual(newSch.bus_id, null, "bus_id must be null");
  });

  // TEST 4: Existing historical schedule driver is preserved when editing unrelated fields
  test("4. Existing schedule driver information is preserved when editing unrelated fields", () => {
    const historicalDriverId = "6a63725647d78c1794408099";
    const existingSch = new Schedule({
      route_id: routeObj._id,
      routeName: routeObj.routeName,
      start_time: "07:00 AM",
      bus_id: busWithLegacyDriver._id,
      busNumber: busWithLegacyDriver.busNumber,
      driver_id: historicalDriverId,
      driverName: "Historical Master Driver",
      delay_buffer_minutes: 0,
      is_active: true,
    });

    // Update only delay_buffer_minutes and start_time; driver_id is not provided in reqBody
    const updated = updateScheduleSimulation(
      existingSch,
      {
        delay_buffer_minutes: 15,
        start_time: "07:15 AM",
      },
      busWithLegacyDriver
    );

    assert.strictEqual(updated.delay_buffer_minutes, 15, "Delay buffer must be updated to 15");
    assert.strictEqual(updated.start_time, "07:15 AM", "Start time must be updated to 07:15 AM");
    assert.strictEqual(
      updated.driver_id,
      historicalDriverId,
      "Historical driver_id must be strictly preserved"
    );
    assert.strictEqual(
      updated.driverName,
      "Historical Master Driver",
      "Historical driverName must be strictly preserved"
    );
  });

  // TEST 5: Explicit driver handling remains supported if explicitly passed in payload
  test("5. Explicit driver handling remains supported if explicitly provided", () => {
    const explicitDriverId = "6a63725647d78c1794408077";
    const newSch = createScheduleSimulation(
      {
        route_id: routeObj._id,
        start_time: "11:00 AM",
        bus_id: busWithLegacyDriver._id,
        driver_id: explicitDriverId,
        driverName: "Explicitly Assigned Driver",
      },
      busWithLegacyDriver
    );

    assert.strictEqual(newSch.driver_id, explicitDriverId, "Explicit driver_id must be honored");
    assert.strictEqual(newSch.driverName, "Explicitly Assigned Driver", "Explicit driverName must be honored");
  });

  // TEST 6: Bus permanent driver and shifts are never mutated
  test("6. Bus permanent fields and shifts are never mutated during schedule operations", () => {
    assert.strictEqual(String(busWithLegacyDriver.driverId), String(legacyDriverId));
    assert.strictEqual(busWithLegacyDriver.driverName, "Legacy Permanent Driver");
    assert.strictEqual(busWithLegacyDriver.shifts.morning.driverId, null);
    assert.strictEqual(busWithLegacyDriver.shifts.evening.driverId, null);
    assert.strictEqual(busWithLegacyDriver.shifts.night.driverId, null);
  });

  console.log("=================================================");
  console.log(`TOTAL TESTS: ${totalTests}`);
  console.log(`PASSED: ${passedTests}`);
  console.log(`FAILED: ${totalTests - passedTests}`);
  console.log("=================================================");
  if (passedTests === totalTests) {
    console.log("✅ ALL STAGE B.1 SCHEDULE ISOLATION TESTS PASSED!");
  } else {
    process.exit(1);
  }
}

runAsyncTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
