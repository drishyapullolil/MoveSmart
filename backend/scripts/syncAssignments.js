require('dotenv').config();
const mongoose = require('mongoose');

async function syncAssignments() {
  await mongoose.connect(process.env.MONGODB_URI, { family: 4, serverSelectionTimeoutMS: 8000 });
  const db = mongoose.connection.db;

  const users = await db.collection('users').find({ role: 'driver' }).toArray();
  console.log('Registered drivers count:', users.length);
  users.forEach(u => console.log('Driver in DB:', { id: u._id, name: u.name, email: u.email }));

  // 1. Silpa (drishyajose03@gmail.com) -> KL-06-345 (Kanjirappally ➔ Erattupetta) and KL-05-AA-1001 (Kochi ➔ Trivandrum)
  const silpa = users.find(u => (u.email || '').toLowerCase().includes('drishyajose03') || (u.name || '').toLowerCase().includes('silpa'));
  if (silpa) {
    await db.collection('buses').updateMany(
      { busNumber: { $in: ['KL-06-345', 'KL-05-AA-1001'] } },
      { $set: { driverId: silpa._id, driverName: silpa.name, driverEmail: silpa.email } }
    );
    console.log('Linked Silpa to KL-06-345 & KL-05-AA-1001');
  }

  // 2. Annu (drishyajose2027@mca.ajce.in) -> KL 06 78643 (Thrissur ➔ Kottayam)
  const annu = users.find(u => (u.email || '').toLowerCase().includes('drishyajose2027') || (u.name || '').toLowerCase().includes('annu'));
  if (annu) {
    await db.collection('buses').updateOne(
      { busNumber: 'KL 06 78643' },
      { $set: { driverId: annu._id, driverName: annu.name, driverEmail: annu.email, routeName: 'Thrissur ➔ Kottayam' } }
    );
    console.log('Linked Annu to KL 06 78643');
  }

  // 3. Driver new (smartbusmovesmart@gmail.com) -> KL-08-678 (Thrissur ➔ Kottayam)
  const driverNew = users.find(u => (u.email || '').toLowerCase().includes('smartbusmovesmart') || (u.name || '').toLowerCase().includes('driver new'));
  if (driverNew) {
    await db.collection('buses').updateOne(
      { busNumber: 'KL-08-678' },
      { $set: { driverId: driverNew._id, driverName: driverNew.name, driverEmail: driverNew.email, routeName: 'Thrissur ➔ Kottayam' } }
    );
    console.log('Linked Driver New to KL-08-678');
  }

  // 4. Sruthy (sruthyms200504@gmail.com) -> KL-05-AA-1002 (Erumely → Kanjirappally) & KL-05-AA-1004 (Erumely ➔ Erattupetta)
  const sruthy = users.find(u => (u.email || '').toLowerCase().includes('sruthyms') || (u.name || '').toLowerCase().includes('sruthy'));
  if (sruthy) {
    await db.collection('buses').updateMany(
      { busNumber: { $in: ['KL-05-AA-1002', 'KL-05-AA-1004'] } },
      { $set: { driverId: sruthy._id, driverName: sruthy.name, driverEmail: sruthy.email } }
    );
    console.log('Linked Sruthy to KL-05-AA-1002 & KL-05-AA-1004');
  }

  // 5. Also update any buses that have driverEmail or driverName matching
  for (const u of users) {
    if (u.email) {
      await db.collection('buses').updateMany(
        { driverEmail: { $regex: new RegExp(`^${u.email}$`, 'i') } },
        { $set: { driverId: u._id, driverName: u.name } }
      );
    }
  }

  const allBuses = await db.collection('buses').find().toArray();
  console.log('\n=== UPDATED BUSES ASSIGNMENTS ===');
  allBuses.forEach(b => console.log({
    busNumber: b.busNumber,
    busName: b.busName,
    driverId: b.driverId,
    driverName: b.driverName,
    driverEmail: b.driverEmail,
    routeName: b.routeName,
    from: b.fromLocation,
    to: b.toLocation,
    stopsCount: b.stops?.length
  }));

  process.exit(0);
}
syncAssignments().catch(e => { console.error(e); process.exit(1); });
