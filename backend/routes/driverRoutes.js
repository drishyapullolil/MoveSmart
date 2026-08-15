const express = require("express");
const router = express.Router();
const Bus = require("../models/Bus");
const User = require("../models/User");
const DriverLeave = require("../models/DriverLeave");
const DriverBusRequest = require("../models/DriverBusRequest");

// Helper function to check if departure is within 2 hours of current time
function isWithin2Hours(departureTimeStr, targetDateStr) {
  if (!departureTimeStr) return false;

  const now = new Date();
  let departureDate = new Date();

  if (targetDateStr) {
    const [year, month, day] = targetDateStr.split("-").map(Number);
    if (year && month && day) {
      departureDate = new Date(year, month - 1, day);
    }
  }

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const targetStart = new Date(departureDate.getFullYear(), departureDate.getMonth(), departureDate.getDate());

  if (targetStart.getTime() === todayStart.getTime()) {
    let hours = 0;
    let minutes = 0;

    const timeMatch = departureTimeStr.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (timeMatch) {
      hours = parseInt(timeMatch[1], 10);
      minutes = parseInt(timeMatch[2], 10);
      const ampm = timeMatch[3];
      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hours < 12) hours += 12;
        if (ampm.toUpperCase() === "AM" && hours === 12) hours = 0;
      }
    }

    departureDate.setHours(hours, minutes, 0, 0);

    const diffMs = departureDate.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);

    // Block if departure is in less than 2 hours or passed today
    if (diffHours < 2) {
      return true;
    }
  } else if (targetStart.getTime() < todayStart.getTime()) {
    return true; // Past date
  }

  return false;
}

// ----------------------------------------------------
// MIDDLEWARE INJECTION
// ----------------------------------------------------
const { protect, approvedDriverOnly, adminOnly } = require("../middleware/authMiddleware");

// Open driver listing route for fleet management — only returns users with role: 'driver'
router.get("/admin/drivers", async (req, res) => {
  try {
    const drivers = await User.find({
      role: { $regex: /^driver$/i }
    }).select("-password").sort({ createdAt: -1 });

    res.json({ success: true, count: drivers.length, drivers });
  } catch (error) {
    console.error("Error fetching drivers for admin verification:", error);
    res.status(500).json({ message: "Failed to fetch drivers list", error: error.message });
  }
});

// Apply middleware to all /driver and /admin routes in this file
router.use("/driver", protect, approvedDriverOnly);
router.use("/admin", protect, adminOnly);

// ----------------------------------------------------
// 1. DRIVER - VIEW BUSES & REQUEST TO DRIVE BUS (2-HOUR RULE)
// ----------------------------------------------------
router.get("/driver/buses", async (req, res) => {
  try {
    const buses = await Bus.find().sort({ createdAt: -1 });
    res.json({ success: true, count: buses.length, buses });
  } catch (error) {
    console.error("Error fetching buses for driver:", error);
    res.status(500).json({ message: "Failed to fetch buses database", error: error.message });
  }
});

// Driver Request Admin to Drive a Bus (Enforces 2-Hour Departure Rule)
router.post("/driver/request-bus", async (req, res) => {
  try {
    const { busId, driverId, driverName, driverEmail, driverPhone, driverLicense, driverPhoto } = req.body;

    if (!busId) {
      return res.status(400).json({ message: "Bus ID is required" });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    // Enforce 2-Hour Deadline Rule
    if (isWithin2Hours(bus.departureTime)) {
      return res.status(400).json({
        message: `⚠️ Bus selection & assignment request MUST be submitted at least 2 hours before departure time (Scheduled Departure: ${bus.departureTime}). Requests within 2 hours are locked.`,
      });
    }

    // Check if there is already a pending request for this bus by this driver
    const existingReq = await DriverBusRequest.findOne({
      busId: bus._id,
      driverEmail,
      status: "Pending",
    });

    if (existingReq) {
      return res.status(400).json({ message: `You already have a pending request for Bus ${bus.busNumber} awaiting Admin approval.` });
    }

    const newRequest = new DriverBusRequest({
      busId: bus._id,
      busNumber: bus.busNumber,
      busName: bus.busName,
      routeName: `${bus.fromLocation} ➔ ${bus.toLocation}`,
      departureTime: bus.departureTime,
      driverId: driverId && driverId.match(/^[0-9a-fA-F]{24}$/) ? driverId : null,
      driverName: driverName || "Driver",
      driverEmail: driverEmail || "driver@movesmart.in",
      driverPhone: driverPhone || "",
      driverLicense: driverLicense || "",
      driverPhoto: driverPhoto || "",
      status: "Pending",
    });

    await newRequest.save();

    res.status(201).json({
      success: true,
      message: `✓ Request to drive Bus ${bus.busNumber} (${bus.busName}) submitted to Admin! Pending approval.`,
      busRequest: newRequest,
    });
  } catch (error) {
    console.error("Error requesting bus for driver:", error);
    res.status(500).json({ message: "Failed to submit bus driver request", error: error.message });
  }
});

// Fetch Driver's Bus Requests
router.get("/driver/bus-requests/my", async (req, res) => {
  try {
    const { driverEmail } = req.query;
    let query = {};
    if (driverEmail) {
      query.driverEmail = new RegExp(`^${driverEmail.trim()}$`, "i");
    }
    const requests = await DriverBusRequest.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error("Error fetching driver bus requests:", error);
    res.status(500).json({ message: "Failed to fetch bus requests", error: error.message });
  }
});

// Direct Admin Driver Bus Assignment / Fallback
router.post("/driver/assign-bus", async (req, res) => {
  try {
    const { busId, driverId, driverName, driverPhone, driverLicense, driverPhoto } = req.body;
    if (!busId) {
      return res.status(400).json({ message: "Bus ID is required" });
    }

    const bus = await Bus.findById(busId);
    if (!bus) {
      return res.status(404).json({ message: "Bus not found" });
    }

    // Enforce 2-Hour Deadline Rule
    if (isWithin2Hours(bus.departureTime)) {
      return res.status(400).json({
        message: `⚠️ Bus selection & assignment MUST be completed at least 2 hours before departure time (${bus.departureTime}).`,
      });
    }

    if (driverId) bus.driverId = driverId;
    if (driverName) bus.driverName = driverName;
    if (driverPhone) bus.driverPhone = driverPhone;
    if (driverLicense) bus.driverLicense = driverLicense;
    if (driverPhoto !== undefined) bus.driverPhoto = driverPhoto;
    bus.driverVerified = true;

    await bus.save();
    res.json({ success: true, message: `Assigned bus ${bus.busNumber} to driver ${bus.driverName}`, bus });
  } catch (error) {
    console.error("Error assigning bus to driver:", error);
    res.status(500).json({ message: "Failed to assign bus", error: error.message });
  }
});

// ----------------------------------------------------
// 2. ADMIN - MANAGE DRIVER BUS REQUESTS & ASSIGNMENTS
// ----------------------------------------------------
// Admin get all driver bus requests
router.get("/admin/bus-requests", async (req, res) => {
  try {
    const requests = await DriverBusRequest.find().sort({ createdAt: -1 });
    res.json({ success: true, count: requests.length, requests });
  } catch (error) {
    console.error("Error fetching admin bus requests:", error);
    res.status(500).json({ message: "Failed to fetch admin bus requests", error: error.message });
  }
});

// Admin Approve or Reject Driver Bus Request
router.put("/admin/bus-request/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComment } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'Approved' or 'Rejected'." });
    }

    const busReq = await DriverBusRequest.findById(id);
    if (!busReq) {
      return res.status(404).json({ message: "Bus request not found." });
    }

    busReq.status = status;
    if (adminComment !== undefined) busReq.adminComment = adminComment;
    await busReq.save();

    if (status === "Approved") {
      const bus = await Bus.findById(busReq.busId);
      if (bus) {
        if (busReq.driverId) bus.driverId = busReq.driverId;
        bus.driverName = busReq.driverName;
        bus.driverPhone = busReq.driverPhone || "+91 98470 12345";
        bus.driverLicense = busReq.driverLicense || "KL-07-2018-99210";
        if (busReq.driverPhoto) bus.driverPhoto = busReq.driverPhoto;
        bus.driverVerified = true;
        await bus.save();
      }
    }

    res.json({
      success: true,
      message: `Driver request to drive Bus ${busReq.busNumber} has been ${status === "Approved" ? "ACCEPTED & APPROVED ✅" : "REJECTED ❌"}.`,
      busRequest: busReq,
    });
  } catch (error) {
    console.error("Error updating bus request status:", error);
    res.status(500).json({ message: "Failed to update bus request status", error: error.message });
  }
});

// ----------------------------------------------------
// 3. DRIVER - LEAVE MANAGEMENT (WITH 2-HOUR DEADLINE RULE)
// ----------------------------------------------------
// Apply for leave (enforces 2-hour deadline rule before bus departure)
router.post("/driver/leave", async (req, res) => {
  try {
    const { driverId, driverName, driverEmail, leaveDate, leaveType, halfDaySlot, reason } = req.body;

    if (!driverName || !leaveDate || !leaveType || !reason) {
      return res.status(400).json({ message: "Driver Name, Leave Date, Leave Type, and Reason are required." });
    }

    if (leaveType === "Half Day" && (!halfDaySlot || halfDaySlot === "N/A")) {
      return res.status(400).json({ message: "Please select a Half-Day slot: Forenoon (AM) or Afternoon (PM)." });
    }

    // Check if driver has an assigned bus with a departure time today / on leave date
    const assignedBus = await Bus.findOne({
      $or: [{ driverName: driverName }, { driverId: driverId }],
    });

    if (assignedBus && isWithin2Hours(assignedBus.departureTime, leaveDate)) {
      return res.status(400).json({
        message: `⚠️ Driver leave MUST be requested at least 2 hours before scheduled bus departure time (Bus: ${assignedBus.busNumber}, Scheduled Departure: ${assignedBus.departureTime}). Emergency leave within 2 hours requires direct Admin override.`,
      });
    }

    const newLeave = new DriverLeave({
      driverId: driverId && driverId.match(/^[0-9a-fA-F]{24}$/) ? driverId : "60d0fe4f5311236168a109ca",
      driverName,
      driverEmail: driverEmail || "driver@movesmart.in",
      leaveDate,
      leaveType,
      halfDaySlot: leaveType === "Half Day" ? halfDaySlot : "N/A",
      reason,
      status: "Pending",
    });

    await newLeave.save();

    res.status(201).json({
      success: true,
      message: `Leave request submitted successfully for ${leaveType} on ${leaveDate}! Awaiting admin approval.`,
      leave: newLeave,
    });
  } catch (error) {
    console.error("Error submitting driver leave:", error);
    res.status(500).json({ message: "Failed to submit leave request", error: error.message });
  }
});

// Get Driver's Leave History
router.get("/driver/leave/my", async (req, res) => {
  try {
    const { driverEmail, driverId } = req.query;
    let query = {};

    if (driverEmail) {
      query.driverEmail = new RegExp(`^${driverEmail.trim()}$`, "i");
    } else if (driverId && driverId.match(/^[0-9a-fA-F]{24}$/)) {
      query.driverId = driverId;
    }

    const leaves = await DriverLeave.find(query).sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    console.error("Error fetching driver leave history:", error);
    res.status(500).json({ message: "Failed to fetch leave history", error: error.message });
  }
});

// ----------------------------------------------------
// 4. ADMIN - LEAVE MANAGEMENT (SEE & ACCEPT / REJECT)
// ----------------------------------------------------
// Admin fetch all driver leaves
router.get("/admin/leaves", async (req, res) => {
  try {
    const leaves = await DriverLeave.find().sort({ createdAt: -1 });
    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    console.error("Error fetching admin leave requests:", error);
    res.status(500).json({ message: "Failed to fetch leave applications", error: error.message });
  }
});

// Admin Approve (Accept) or Reject Leave Request
router.put("/admin/leave/:id/status", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, adminComment } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'Approved' or 'Rejected'." });
    }

    const leave = await DriverLeave.findById(id);
    if (!leave) {
      return res.status(404).json({ message: "Leave application not found." });
    }

    leave.status = status;
    if (adminComment !== undefined) {
      leave.adminComment = adminComment;
    }

    await leave.save();

    // If leave is approved, check if driver is currently assigned to a bus and unassign them so Admin can assign a replacement driver
    let busReassignedNotice = "";
    if (status === "Approved") {
      const assignedBus = await Bus.findOne({ driverName: leave.driverName });
      if (assignedBus) {
        assignedBus.driverName = "Unassigned / Replacement Driver Required";
        assignedBus.driverVerified = false;
        await assignedBus.save();
        busReassignedNotice = ` ⚠️ Bus ${assignedBus.busNumber} has been marked as unassigned. Please assign a replacement driver.`;
      }
    }

    res.json({
      success: true,
      message: `Leave request ${status === "Approved" ? "ACCEPTED & APPROVED" : "REJECTED"} for ${leave.driverName}.${busReassignedNotice}`,
      leave,
    });
  } catch (error) {
    console.error("Error updating leave status:", error);
    res.status(500).json({ message: "Failed to update leave status", error: error.message });
  }
});

// ----------------------------------------------------
// 5. DRIVER PROFILE & DRIVING LICENSE VERIFICATION
// ----------------------------------------------------
router.post("/driver/profile-verification", async (req, res) => {
  try {
    const { name, email, userId, licenseNumber, licenseImage, profilePic, phone, experienceYears } = req.body;

    let user;
    if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(userId);
    }

    if (!user && email) {
      user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, "i") });
    }

    if (!user) {
      const bcrypt = require("bcrypt");
      const hashedPassword = await bcrypt.hash("DriverPass@123", 10);
      user = new User({
        name: name || (email ? email.split("@")[0] : "Rajesh Kumar"),
        email: email || "rajesh.driver@movesmart.in",
        password: hashedPassword,
        role: "driver",
        licenseNumber: licenseNumber || "",
        phone: phone || "+91 98470 12345",
      });
    }

    if (!licenseNumber) {
      return res.status(400).json({ message: "Driving license number is required." });
    }

    user.licenseNumber = licenseNumber;
    if (licenseImage) user.licenseImage = licenseImage;
    if (profilePic) user.profilePic = profilePic;
    if (phone) user.phone = phone;
    if (experienceYears) user.experienceYears = Number(experienceYears);
    user.verificationStatus = "Pending";
    user.verificationNote = "Profile details & driving license submitted. Pending admin review.";

    await user.save();

    await Bus.updateMany(
      { $or: [{ driverName: user.name }, { driverId: user._id.toString() }] },
      {
        $set: {
          driverLicense: user.licenseNumber,
          driverPhoto: user.profilePic,
          driverPhone: user.phone || "+91 98470 12345",
          driverVerified: false,
        },
      }
    );

    res.json({
      success: true,
      message: "Driving license & profile details submitted successfully! Pending admin approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        licenseImage: user.licenseImage,
        profilePic: user.profilePic,
        experienceYears: user.experienceYears,
        verificationStatus: user.verificationStatus,
        verificationNote: user.verificationNote,
      },
    });
  } catch (error) {
    console.error("Error submitting driver verification:", error);
    res.status(500).json({ message: "Failed to submit verification details", error: error.message });
  }
});

// Fetch Driver Verification Status
router.get("/driver/profile-status", async (req, res) => {
  try {
    const { email, userId } = req.query;
    let user;

    if (userId && userId.match(/^[0-9a-fA-F]{24}$/)) {
      user = await User.findById(userId);
    }

    if (!user && email) {
      user = await User.findOne({ email: new RegExp(`^${email.trim()}$`, "i") });
    }

    if (!user) {
      return res.json({
        success: true,
        user: null,
      });
    }

    res.json({
      success: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        licenseNumber: user.licenseNumber,
        licenseImage: user.licenseImage,
        profilePic: user.profilePic,
        experienceYears: user.experienceYears,
        verificationStatus: user.verificationStatus || "Unverified",
        verificationNote: user.verificationNote || "",
      },
    });
  } catch (error) {
    console.error("Error fetching driver profile status:", error);
    res.status(500).json({ message: "Failed to fetch driver status", error: error.message });
  }
});

// ----------------------------------------------------
// 6. ADMIN - DRIVER VERIFICATION (ACCEPT / REJECT)
// ----------------------------------------------------

router.put("/admin/driver/:id/verification", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!["Approved", "Rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'Approved' or 'Rejected'." });
    }

    const driver = await User.findById(id);
    if (!driver) {
      return res.status(404).json({ message: "Driver not found." });
    }

    if (status === "Rejected") {
      const assignedBus = await Bus.findOne({
        $or: [{ driverId: driver._id }, { driverId: String(driver._id) }],
      });
      if (assignedBus) {
        return res.status(400).json({
          message: `Cannot reject/deactivate driver "${driver.name}" because they are currently assigned to Bus ${assignedBus.busNumber}. Please unassign the driver from the bus first.`,
        });
      }
    }

    driver.verificationStatus = status;
    driver.verificationNote = note || (status === "Approved" ? "Driving license and profile picture verified & approved by Admin." : "Verification rejected by Admin.");

    if (status === "Approved") {
      driver.role = "driver";
    }

    await driver.save();

    await Bus.updateMany(
      { $or: [{ driverId: driver._id }, { driverId: String(driver._id) }] },
      {
        $set: {
          driverVerified: status === "Approved",
          driverPhone: driver.phone || "N/A",
          driverLicense: driver.licenseNumber || "N/A",
          driverPhoto: driver.profilePic || driver.licenseImage || "",
        },
      }
    );

    res.json({
      success: true,
      message: `Driver ${driver.name} verification has been ${status === "Approved" ? "ACCEPTED & VERIFIED ✅" : "REJECTED ❌"}.`,
      driver,
    });
  } catch (error) {
    console.error("Error updating driver verification:", error);
    res.status(500).json({ message: "Failed to update driver verification", error: error.message });
  }
});

module.exports = router;

