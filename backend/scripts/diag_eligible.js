require('dotenv').config();
const mongoose = require('mongoose');
const Bus = require('../models/Bus');
const User = require('../models/User');
const DriverLeave = require('../models/DriverLeave');

async function main() {
  console.time('connect');
  await mongoose.connect(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/movesmart');
  console.timeEnd('connect');

  console.time('bus');
  const bus = await Bus.findById('6ad5a3373f708902ce4a4d65');
  console.timeEnd('bus');

  console.time('drivers_full');
  const dFull = await User.find({
    role: { $regex: /^driver$/i },
    verificationStatus: 'Approved',
  }).select('-password');
  console.timeEnd('drivers_full');

  console.time('drivers_lean');
  const dLean = await User.find({
    role: { $regex: /^driver$/i },
    verificationStatus: 'Approved',
  }).select('_id name email phone licenseNumber experienceYears verificationStatus').lean();
  console.timeEnd('drivers_lean');

  console.time('allBuses');
  const allBuses = await Bus.find({ _id: { $ne: bus._id } }).lean();
  console.timeEnd('allBuses');

  console.time('leaves');
  const leaves = await DriverLeave.find({ status: 'Approved' }).lean();
  console.timeEnd('leaves');

  console.log('Driver full size JSON bytes:', JSON.stringify(dFull).length);
  console.log('Driver lean size JSON bytes:', JSON.stringify(dLean).length);

  await mongoose.disconnect();
}

main().catch(console.error);
