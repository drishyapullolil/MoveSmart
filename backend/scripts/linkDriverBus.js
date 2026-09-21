const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Bus = require('../models/Bus');
const RfidDevice = require('../models/RfidDevice');

async function linkDriverAndBus() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to MongoDB ✅');

  // 1. Find Driver: drishyajose03@gmail.com
  let driver = await User.findOne({ email: /drishyajose03@gmail.com/i });
  if (!driver) {
    console.error('Driver drishyajose03@gmail.com not found!');
    process.exit(1);
  }
  console.log('Driver found:', { id: driver._id, name: driver.name, email: driver.email, role: driver.role });

  // 2. Find Bus: AAMMEES (Kanjirappally ➔ Erattupetta, 06:30 AM - 11:15 AM)
  let bus = await Bus.findOne({
    $or: [
      { busNumber: 'KL-06-345' },
      { busName: /AAMMEES/i, fromLocation: /Kanjirappally/i, toLocation: /Erattupetta/i }
    ]
  });

  if (!bus) {
    console.error('Bus AAMMEES (Kanjirappally ➔ Erattupetta) not found!');
    process.exit(1);
  }

  console.log('Bus before update:', {
    id: bus._id,
    busName: bus.busName,
    busNumber: bus.busNumber,
    from: bus.fromLocation,
    to: bus.toLocation,
    departure: bus.departureTime,
    arrival: bus.arrivalTime,
    driverId: bus.driverId,
    driverEmail: bus.driverEmail,
    driverName: bus.driverName,
  });

  // Link Bus -> Driver
  bus.driverId = driver._id;
  bus.driverEmail = driver.email;
  bus.driverName = driver.name || 'Silpa';
  bus.driverPhone = driver.phone || '+91 98470 12345';
  bus.driverVerified = true;
  await bus.save();
  console.log('✅ Bus linked to driver drishyajose03@gmail.com');

  // Link Driver -> Bus
  driver.busNumber = bus.busNumber;
  driver.assignedBus = bus._id;
  await driver.save();
  console.log('✅ Driver user updated with assigned bus', bus.busNumber);

  // Link or Upsert RfidDevice
  let device = await RfidDevice.findOne({ deviceId: 'MS-RFID-5326' });
  if (!device) {
    device = new RfidDevice({
      deviceId: 'MS-RFID-5326',
      busNumber: bus.busNumber,
      driverId: driver._id,
      driverEmail: driver.email,
      driverName: driver.name || 'Silpa',
      stopCode: 'STOP_VYTTILA',
      status: 'Connected',
      readerActive: true,
    });
  } else {
    device.busNumber = bus.busNumber;
    device.driverId = driver._id;
    device.driverEmail = driver.email;
    device.driverName = driver.name || 'Silpa';
  }
  await device.save();
  console.log('✅ RfidDevice MS-RFID-5326 linked to driver drishyajose03@gmail.com and bus', bus.busNumber);

  process.exit(0);
}

linkDriverAndBus().catch(err => {
  console.error(err);
  process.exit(1);
});
