require("dotenv").config();
const mongoose = require("mongoose");
const DriverReplacement = require("../models/DriverReplacement");
const User = require("../models/User");

async function testAssign() {
  await mongoose.connect(process.env.MONGODB_URI);
  
  const repDuty = await DriverReplacement.findOne({ status: "Replacement Required" });
  if (!repDuty) {
    console.log("No duty needing replacement found");
    return;
  }

  const replDriver = await User.findOne({ email: "drishyajose2027@mca.ajce.in" }); // Annu
  console.log(`Assigning Driver Annu (${replDriver._id}) to Duty ${repDuty._id} (Bus ${repDuty.busNumber}, ${repDuty.dutyDate}, ${repDuty.shift})...`);

  repDuty.replacementDriverId = replDriver._id;
  repDuty.replacementDriverName = replDriver.name;
  repDuty.status = "Assigned";
  repDuty.assignedAt = new Date();
  repDuty.notes = "Assigned via fleet operations manager.";
  await repDuty.save();

  const verify = await DriverReplacement.findById(repDuty._id)
    .populate("replacementDriverId", "name email phone")
    .populate("originalDriverId", "name email");

  console.log("Verified assigned record:");
  console.log(`  - Bus: ${verify.busNumber}`);
  console.log(`  - Status: ${verify.status}`);
  console.log(`  - Original Driver: ${verify.originalDriverName}`);
  console.log(`  - Replacement Driver: ${verify.replacementDriverName} (${verify.replacementDriverId?.email})`);
  console.log(`  - Notes: ${verify.notes}`);

  await mongoose.disconnect();
}

testAssign().catch(console.error);
