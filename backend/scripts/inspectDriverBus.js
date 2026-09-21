const mongoose = require('mongoose');
require('dotenv').config();
const User = require('../models/User');
const Bus = require('../models/Bus');
const Stop = require('../models/Stop');
const RfidDevice = require('../models/RfidDevice');

async function inspect() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected to DB');

  const driver = await User.findOne({ email: /drishyajose03@gmail.com/i });
  console.log('Driver user:', driver ? { id: driver._id, name: driver.name, email: driver.email, role: driver.role, busNumber: driver.busNumber } : 'Not found');

  const buses = await Bus.find({ $or: [{ busName: /AAMMEES/i }, { driverEmail: /drishyajose03@gmail.com/i }] });
  console.log('Buses matching AAMMEES or drishyajose03:', buses.map(b => ({ id: b._id, busName: b.busName, busNumber: b.busNumber, driverEmail: b.driverEmail, driverName: b.driverName, from: b.fromLocation, to: b.toLocation, departure: b.departureTime, arrival: b.arrivalTime, busType: b.busType })));

  const allBuses = await Bus.find({});
  console.log('Total buses:', allBuses.length);
  console.log('All buses:', allBuses.map(b => ({ id: b._id, busName: b.busName, busNumber: b.busNumber, driverEmail: b.driverEmail, from: b.fromLocation, to: b.toLocation })));

  const stops = await Stop.find({});
  console.log('Total stops:', stops.length);
  console.log('Stops:', stops.map(s => ({ id: s._id, name: s.name, code: s.code })));

  const devices = await RfidDevice.find({});
  console.log('Devices found:', devices.map(d => ({ deviceId: d.deviceId, busNumber: d.busNumber, driverEmail: d.driverEmail, stopCode: d.stopCode })));

  process.exit(0);
}
inspect();
