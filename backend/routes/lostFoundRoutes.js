const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const LostItem = require("../models/LostItem");
const FoundItem = require("../models/FoundItem");
const LostFoundMatch = require("../models/LostFoundMatch");
const LostFoundHandover = require("../models/LostFoundHandover");
const Notification = require("../models/Notification");
const { protect, adminOnly } = require("../middleware/authMiddleware");

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Validate ObjectId
// ─────────────────────────────────────────────────────────────────────────────
const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: Create In-App Notification
// ─────────────────────────────────────────────────────────────────────────────
async function createNotification(userId, title, message, type = "general", relatedId = null) {
  try {
    if (!userId) return;
    await Notification.create({
      userId,
      title,
      message,
      type,
      relatedId,
    });
  } catch (e) {
    console.warn("Notification creation error:", e.message);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. POST /api/lostfound/lost — Submit Lost Item Report
// ─────────────────────────────────────────────────────────────────────────────
router.post("/lost", protect, async (req, res) => {
  try {
    const {
      itemName,
      category,
      description,
      lostDate,
      lostTime,
      busNumber,
      route,
      location,
      ownerPhone,
      photo,
      brand,
      color,
      serialNumber,
      identifyingDetails,
    } = req.body;

    // Mandatory fields check
    if (!itemName?.trim() || !category || !description?.trim() || !lostDate || !location?.trim() || !ownerPhone?.trim()) {
      return res.status(400).json({
        message: "Item name, category, description, date lost, location, and owner phone number are required.",
      });
    }

    const lostItem = new LostItem({
      ownerId: req.user._id,
      ownerPhone: ownerPhone.trim(),
      itemName: itemName.trim(),
      category,
      description: description.trim(),
      lostDate,
      lostTime: lostTime || "",
      busNumber: (busNumber || "").trim(),
      route: (route || "").trim(),
      location: location.trim(),
      photo: photo || "", // Photo is optional
      brand: (brand || "").trim(),
      color: (color || "").trim(),
      serialNumber: (serialNumber || "").trim(),
      identifyingDetails: (identifyingDetails || "").trim(),
      status: "PENDING_ADMIN_VERIFICATION",
      adminVerificationStatus: "Pending",
    });

    await lostItem.save();

    await createNotification(
      req.user._id,
      "📋 Lost Report Submitted",
      `Your lost-item report for "${lostItem.itemName}" (${lostItem.reportId}) is now under MoveSmart Admin review.`,
      "general",
      lostItem._id
    );

    return res.status(201).json({
      message: "Lost item report submitted successfully for Admin verification.",
      reportId: lostItem.reportId,
      lostItem,
    });
  } catch (err) {
    console.error("POST /lostfound/lost error:", err);
    return res.status(500).json({ message: "Server error while creating lost item report." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. POST /api/lostfound/found — Submit Found Item Report
// ─────────────────────────────────────────────────────────────────────────────
router.post("/found", protect, async (req, res) => {
  try {
    const {
      itemName,
      category,
      description,
      foundDate,
      foundTime,
      busNumber,
      route,
      location,
      finderPhone,
      photo,
      foundDetails,
    } = req.body;

    // Mandatory fields check
    if (!itemName?.trim() || !category || !description?.trim() || !foundDate || !location?.trim() || !finderPhone?.trim()) {
      return res.status(400).json({
        message: "Item name, category, description, date found, location, and finder phone number are required.",
      });
    }

    const foundItem = new FoundItem({
      foundBy: req.user._id,
      finderPhone: finderPhone.trim(),
      reporterRole: req.user.role || "user",
      finderName: req.user.name || "",
      itemName: itemName.trim(),
      category,
      description: description.trim(),
      foundDate,
      foundTime: foundTime || "",
      busNumber: (busNumber || "").trim(),
      route: (route || "").trim(),
      location: location.trim(),
      photo: photo || "", // Optional but encouraged
      foundDetails: (foundDetails || "").trim(),
      status: "PENDING_ADMIN_VERIFICATION",
      adminVerificationStatus: "Pending",
    });

    await foundItem.save();

    await createNotification(
      req.user._id,
      "📦 Found Report Submitted",
      `Your found-item report for "${foundItem.itemName}" (${foundItem.reportId}) is now under MoveSmart Admin review.`,
      "general",
      foundItem._id
    );

    return res.status(201).json({
      message: "Found item report submitted successfully for Admin verification.",
      reportId: foundItem.reportId,
      foundItem,
    });
  } catch (err) {
    console.error("POST /lostfound/found error:", err);
    return res.status(500).json({ message: "Server error while creating found item report." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 2B. POST /api/lostfound/found-direct — Directly Report Finding a Specific Lost Item
// ─────────────────────────────────────────────────────────────────────────────
router.post("/found-direct", protect, async (req, res) => {
  try {
    const { lostItemId, finderPhone, photo, foundDetails, foundDate, foundTime } = req.body;

    if (!isValidId(lostItemId)) {
      return res.status(400).json({ message: "Invalid Lost Item ID." });
    }

    if (!finderPhone?.trim()) {
      return res.status(400).json({ message: "Finder private contact phone number is required for Admin coordination." });
    }

    if (!photo) {
      return res.status(400).json({ message: "Please upload a photo of the item you found so Admin can verify the match." });
    }

    const lostItem = await LostItem.findById(lostItemId);
    if (!lostItem) {
      return res.status(404).json({ message: "Lost item report not found." });
    }

    // Owner cannot report finding their own lost item
    if (lostItem.ownerId.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You are the owner of this lost item report." });
    }

    // Auto-fetch all information directly from the lost item report!
    const foundItem = new FoundItem({
      foundBy: req.user._id,
      finderPhone: finderPhone.trim(),
      reporterRole: req.user.role || "user",
      finderName: req.user.name || "",
      itemName: lostItem.itemName,
      category: lostItem.category,
      description: `Found item matching lost report ${lostItem.reportId}. ${lostItem.description}`,
      foundDate: foundDate || new Date().toISOString().split("T")[0],
      foundTime: foundTime || "",
      busNumber: lostItem.busNumber || "Unknown Bus",
      route: lostItem.route || "Transit Route",
      location: lostItem.location || "Transit",
      photo: photo, // Finder's uploaded photo for visual verification
      foundDetails: (foundDetails || "").trim(),
      status: "MATCHED",
      adminVerificationStatus: "Approved",
      matchedLostItemId: lostItem._id,
    });

    await foundItem.save();

    // Automatically create a linked match record
    const match = new LostFoundMatch({
      lostItemId: lostItem._id,
      foundItemId: foundItem._id,
      matchedBy: "finder_direct",
      adminStatus: "Pending",
      ownerConfirmation: "Pending",
      adminNotes: "Commuter directly reported finding this item and uploaded verification photo.",
    });

    await match.save();

    lostItem.matchedFoundItemId = foundItem._id;
    lostItem.matchedMatchId = match._id;
    lostItem.status = "MATCHED";
    foundItem.matchedMatchId = match._id;

    await Promise.all([lostItem.save(), foundItem.save()]);

    // In-site notification to Owner
    await createNotification(
      lostItem.ownerId,
      "✨ Potential Match Found!",
      `A fellow commuter reported finding your lost item (${lostItem.itemName}) and uploaded a verification photo. MoveSmart Admin is reviewing the match.`,
      "lost_found_match",
      match._id
    );

    // In-site notification to Finder
    await createNotification(
      req.user._id,
      "📦 Found Item Report Submitted",
      `Thank you! Your photo for "${lostItem.itemName}" has been sent to MoveSmart Admin for verification with the owner.`,
      "general",
      foundItem._id
    );

    return res.status(201).json({
      message: "Direct found report and verification photo submitted successfully to MoveSmart Admin!",
      foundReportId: foundItem.reportId,
      matchId: match.matchId,
      foundItem,
      match,
    });
  } catch (err) {
    console.error("POST /lostfound/found-direct error:", err);
    return res.status(500).json({ message: "Server error while creating direct found item report." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/lostfound/public/lost — Public Safe Lost Items (NO PHONE/SECRETS)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/public/lost", async (req, res) => {
  try {
    const { category, search, busNumber } = req.query;
    const query = {
      adminVerificationStatus: "Approved",
      status: { $nin: ["PENDING_ADMIN_VERIFICATION", "REJECTED", "CLOSED"] },
    };

    if (category && category !== "All") query.category = category;
    if (busNumber) query.busNumber = { $regex: busNumber, $options: "i" };
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { busNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Strictly exclude ownerPhone, serialNumber, identifyingDetails, ownerId
    const items = await LostItem.find(query)
      .select("reportId itemName category description photo brand color lostDate lostTime busNumber route location status createdAt")
      .sort({ createdAt: -1 });

    return res.json({ items });
  } catch (err) {
    console.error("GET /lostfound/public/lost error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/lostfound/public/found — Public Safe Found Items (NO PHONE/SECRETS)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/public/found", async (req, res) => {
  try {
    const { category, search, busNumber } = req.query;
    const query = {
      adminVerificationStatus: "Approved",
      status: { $nin: ["PENDING_ADMIN_VERIFICATION", "REJECTED", "CLOSED"] },
    };

    if (category && category !== "All") query.category = category;
    if (busNumber) query.busNumber = { $regex: busNumber, $options: "i" };
    if (search) {
      query.$or = [
        { itemName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { location: { $regex: search, $options: "i" } },
        { busNumber: { $regex: search, $options: "i" } },
      ];
    }

    // Strictly exclude finderPhone, foundDetails, foundBy
    const items = await FoundItem.find(query)
      .select("reportId itemName category description photo foundDate foundTime busNumber route location status createdAt")
      .sort({ createdAt: -1 });

    return res.json({ items });
  } catch (err) {
    console.error("GET /lostfound/public/found error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/lostfound/my-lost — Owner's Personal Lost Reports & Stepper Status
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-lost", protect, async (req, res) => {
  try {
    const items = await LostItem.find({ ownerId: req.user._id })
      .populate("matchedFoundItemId", "reportId itemName category photo foundDate busNumber route location status")
      .populate("matchedMatchId")
      .populate("matchedHandoverId")
      .sort({ createdAt: -1 });

    return res.json({ items });
  } catch (err) {
    console.error("GET /lostfound/my-lost error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET /api/lostfound/my-found — Finder's Personal Found Reports
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-found", protect, async (req, res) => {
  try {
    const items = await FoundItem.find({ foundBy: req.user._id })
      .populate("matchedLostItemId", "reportId itemName category lostDate busNumber status")
      .populate("matchedMatchId")
      .populate("matchedHandoverId")
      .sort({ createdAt: -1 });

    return res.json({ items });
  } catch (err) {
    console.error("GET /lostfound/my-found error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /api/lostfound/my-matches — User's Matches (as Owner or Finder)
// ─────────────────────────────────────────────────────────────────────────────
router.get("/my-matches", protect, async (req, res) => {
  try {
    const userLostItems = await LostItem.find({ ownerId: req.user._id }).select("_id");
    const userFoundItems = await FoundItem.find({ foundBy: req.user._id }).select("_id");

    const lostIds = userLostItems.map((i) => i._id);
    const foundIds = userFoundItems.map((i) => i._id);

    const matches = await LostFoundMatch.find({
      $or: [{ lostItemId: { $in: lostIds } }, { foundItemId: { $in: foundIds } }],
    })
      .populate("lostItemId", "reportId itemName category photo lostDate busNumber route location status ownerId")
      .populate("foundItemId", "reportId itemName category photo foundDate busNumber route location status foundBy")
      .sort({ createdAt: -1 });

    // Sanitize to make sure owner does not see finder's phone and finder does not see owner's phone
    const safeMatches = matches.map((m) => {
      const isOwner = m.lostItemId?.ownerId?.toString() === req.user._id.toString();
      const isFinder = m.foundItemId?.foundBy?.toString() === req.user._id.toString();
      return {
        _id: m._id,
        matchId: m.matchId,
        lostItem: m.lostItemId,
        foundItem: m.foundItemId,
        matchedBy: m.matchedBy,
        adminStatus: m.adminStatus,
        ownerConfirmation: m.ownerConfirmation,
        ownerRequestNote: m.ownerRequestNote,
        adminNotes: m.adminNotes,
        isOwner,
        isFinder,
        createdAt: m.createdAt,
      };
    });

    return res.json({ matches: safeMatches });
  } catch (err) {
    console.error("GET /lostfound/my-matches error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. POST /api/lostfound/match/owner-request — "I Think This Found Item Is Mine"
// ─────────────────────────────────────────────────────────────────────────────
router.post("/match/owner-request", protect, async (req, res) => {
  try {
    const { lostItemId, foundItemId, explanation } = req.body;

    if (!isValidId(lostItemId) || !isValidId(foundItemId)) {
      return res.status(400).json({ message: "Valid Lost Item ID and Found Item ID are required." });
    }

    if (!explanation?.trim()) {
      return res.status(400).json({ message: "Please explain why you believe this found item is yours." });
    }

    const [lostItem, foundItem] = await Promise.all([
      LostItem.findById(lostItemId),
      FoundItem.findById(foundItemId),
    ]);

    if (!lostItem) return res.status(404).json({ message: "Lost item report not found." });
    if (!foundItem) return res.status(404).json({ message: "Found item report not found." });

    // Strict Rule 1: User MUST be the owner of the lost report
    if (lostItem.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "You can only request matches for your own lost item reports." });
    }

    // Strict Rule 2: Finder cannot claim/match item as their own
    if (foundItem.foundBy.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: "You reported this item as found and cannot claim it." });
    }

    // Check existing match request
    const existing = await LostFoundMatch.findOne({ lostItemId, foundItemId });
    if (existing) {
      return res.status(400).json({ message: "A match request between these items already exists." });
    }

    const match = new LostFoundMatch({
      lostItemId,
      foundItemId,
      matchedBy: "owner_request",
      adminStatus: "Pending",
      ownerConfirmation: "Confirmed",
      ownerRequestNote: explanation.trim(),
    });

    await match.save();

    await createNotification(
      req.user._id,
      "📨 Match Request Submitted",
      `Your match request for found item (${foundItem.reportId}) has been sent to MoveSmart Admin for verification.`,
      "general",
      match._id
    );

    return res.status(201).json({
      message: "Match request submitted to Admin for verification.",
      matchId: match.matchId,
      match,
    });
  } catch (err) {
    console.error("POST /lostfound/match/owner-request error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. PUT /api/lostfound/match/owner-confirm/:matchId — Owner Confirms/Declines Match
// ─────────────────────────────────────────────────────────────────────────────
router.put("/match/owner-confirm/:matchId", protect, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { confirmation } = req.body; // "Confirmed" | "Declined"

    if (!["Confirmed", "Declined"].includes(confirmation)) {
      return res.status(400).json({ message: "Confirmation must be 'Confirmed' or 'Declined'." });
    }

    let match = await LostFoundMatch.findOne({ matchId });
    if (!match && isValidId(matchId)) match = await LostFoundMatch.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match record not found." });

    const lostItem = await LostItem.findById(match.lostItemId);
    if (!lostItem || lostItem.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the original owner can confirm this match." });
    }

    match.ownerConfirmation = confirmation;
    await match.save();

    if (confirmation === "Confirmed") {
      lostItem.status = "OWNER_CONFIRMED";
      await lostItem.save();

      await createNotification(
        req.user._id,
        "✅ Match Confirmed",
        "You confirmed this is your item. MoveSmart Admin has been alerted for final verification and handover arrangement.",
        "general",
        match._id
      );
    } else {
      lostItem.status = "LOST";
      await lostItem.save();
    }

    return res.json({ message: `Match ${confirmation.toLowerCase()} successfully.`, match });
  } catch (err) {
    console.error("PUT /lostfound/match/owner-confirm error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. POST /api/lostfound/handover/owner-proof/:handoverId — Owner Uploads Receiving Proof
// ─────────────────────────────────────────────────────────────────────────────
router.post("/handover/owner-proof/:handoverId", protect, async (req, res) => {
  try {
    const { handoverId } = req.params;
    const { receivedItemPhoto, receivingProof, ownerConfirmedReceived } = req.body;

    if (!receivedItemPhoto || !receivingProof || !ownerConfirmedReceived) {
      return res.status(400).json({
        message: "Please upload the received item photo, receiving proof receipt, and confirm collection.",
      });
    }

    let handover = await LostFoundHandover.findOne({ handoverId });
    if (!handover && isValidId(handoverId)) handover = await LostFoundHandover.findById(handoverId);
    if (!handover) return res.status(404).json({ message: "Handover record not found." });

    if (handover.ownerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Only the verified owner can submit collection proof." });
    }

    handover.receivedItemPhoto = receivedItemPhoto;
    handover.receivingProof = receivingProof;
    handover.ownerConfirmedReceived = true;
    handover.ownerConfirmedAt = new Date();
    handover.status = "Proof_Submitted";
    await handover.save();

    await LostItem.findByIdAndUpdate(handover.lostItemId, { status: "RECEIVING_PROOF_SUBMITTED" });

    await createNotification(
      req.user._id,
      "📤 Receiving Proof Submitted",
      "Your collection proof has been submitted to MoveSmart Admin for final case closure.",
      "general",
      handover._id
    );

    return res.json({
      message: "Receiving proof submitted. Admin will verify and close the case.",
      handover,
    });
  } catch (err) {
    console.error("POST /lostfound/handover/owner-proof error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ═════════════════════════════════════════════════════════════════════════════
//  ADMIN MANAGEMENT ROUTES (Protected by protect + adminOnly)
// ═════════════════════════════════════════════════════════════════════════════

// ─────────────────────────────────────────────────────────────────────────────
// 11. GET /api/lostfound/admin/all-dashboard — Complete Admin Metrics & All Queues
// ─────────────────────────────────────────────────────────────────────────────
router.get("/admin/all-dashboard", protect, adminOnly, async (req, res) => {
  try {
    const [lostItems, foundItems, matches, handovers] = await Promise.all([
      LostItem.find()
        .populate("ownerId", "name email phone")
        .populate("matchedFoundItemId", "reportId itemName busNumber location status")
        .populate("matchedMatchId")
        .populate("matchedHandoverId")
        .sort({ createdAt: -1 }),
      FoundItem.find()
        .populate("foundBy", "name email phone")
        .populate("matchedLostItemId", "reportId itemName busNumber location status")
        .populate("matchedMatchId")
        .populate("matchedHandoverId")
        .sort({ createdAt: -1 }),
      LostFoundMatch.find()
        .populate("lostItemId")
        .populate("foundItemId")
        .sort({ createdAt: -1 }),
      LostFoundHandover.find()
        .populate("lostItemId")
        .populate("foundItemId")
        .populate("ownerId", "name email phone")
        .populate("finderId", "name email phone")
        .populate("adminId", "name email")
        .sort({ createdAt: -1 }),
    ]);

    const summary = {
      totalLost: lostItems.length,
      totalFound: foundItems.length,
      pendingLostVerification: lostItems.filter((i) => i.adminVerificationStatus === "Pending").length,
      pendingFoundVerification: foundItems.filter((i) => i.adminVerificationStatus === "Pending").length,
      unmatchedFound: foundItems.filter((i) => !i.matchedLostItemId && i.adminVerificationStatus === "Approved" && i.status !== "RETURNED" && i.status !== "CLOSED").length,
      possibleMatches: matches.filter((m) => m.adminStatus === "Pending").length,
      pendingOwnerConfirmation: matches.filter((m) => m.ownerConfirmation === "Pending").length,
      pendingAdminApproval: matches.filter((m) => m.ownerConfirmation === "Confirmed" && m.adminStatus === "Pending").length,
      itemsAwaitingHandover: handovers.filter((h) => h.status === "Awaiting_Finder_Handover").length,
      itemsInAdminCustody: handovers.filter((h) => h.status === "In_Admin_Custody").length,
      readyForCollection: handovers.filter((h) => h.status === "Ready_For_Collection").length,
      returnedItems: lostItems.filter((i) => i.status === "RETURNED" || i.status === "CLOSED").length,
      closedCases: lostItems.filter((i) => i.status === "CLOSED").length,
    };

    return res.json({
      summary,
      lostItems,
      foundItems,
      matches,
      handovers,
    });
  } catch (err) {
    console.error("GET /lostfound/admin/all-dashboard error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 12. PUT /api/lostfound/admin/verify-report/:type/:id — Admin Approves/Rejects Report
// ─────────────────────────────────────────────────────────────────────────────
router.put("/admin/verify-report/:type/:id", protect, adminOnly, async (req, res) => {
  try {
    const { type, id } = req.params;
    const { action, adminNotes } = req.body; // action: "approve" | "reject"

    if (!isValidId(id)) return res.status(400).json({ message: "Invalid report ID." });
    if (!["lost", "found"].includes(type)) return res.status(400).json({ message: "Type must be 'lost' or 'found'." });

    if (type === "lost") {
      const lost = await LostItem.findById(id);
      if (!lost) return res.status(404).json({ message: "Lost item not found." });

      if (action === "approve") {
        lost.adminVerificationStatus = "Approved";
        lost.status = "LOST";
        lost.adminNotes = adminNotes || "";
        await lost.save();

        await createNotification(
          lost.ownerId,
          "✅ Lost Report Approved",
          `Your lost-item report for "${lost.itemName}" (${lost.reportId}) has been verified and published to MoveSmart transit registry.`,
          "general",
          lost._id
        );
      } else {
        lost.adminVerificationStatus = "Rejected";
        lost.status = "REJECTED";
        lost.adminNotes = adminNotes || "Details could not be verified.";
        await lost.save();

        await createNotification(
          lost.ownerId,
          "❌ Lost Report Rejected",
          `Your lost-item report (${lost.reportId}) was not approved. Note: ${lost.adminNotes}`,
          "general",
          lost._id
        );
      }

      return res.json({ message: `Lost report ${action}d.`, item: lost });
    } else {
      const found = await FoundItem.findById(id);
      if (!found) return res.status(404).json({ message: "Found item not found." });

      if (action === "approve") {
        found.adminVerificationStatus = "Approved";
        found.status = "FOUND";
        found.adminNotes = adminNotes || "";
        await found.save();

        await createNotification(
          found.foundBy,
          "✅ Found Report Approved",
          `Your found-item report for "${found.itemName}" (${found.reportId}) has been verified.`,
          "general",
          found._id
        );
      } else {
        found.adminVerificationStatus = "Rejected";
        found.status = "REJECTED";
        found.adminNotes = adminNotes || "Details could not be verified.";
        await found.save();

        await createNotification(
          found.foundBy,
          "❌ Found Report Rejected",
          `Your found-item report (${found.reportId}) was rejected. Note: ${found.adminNotes}`,
          "general",
          found._id
        );
      }

      return res.json({ message: `Found report ${action}d.`, item: found });
    }
  } catch (err) {
    console.error("PUT /lostfound/admin/verify-report error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 13. PUT /api/lostfound/admin/match — Admin Matches Lost + Found Items
// ─────────────────────────────────────────────────────────────────────────────
router.put("/admin/match", protect, adminOnly, async (req, res) => {
  try {
    const { lostItemId, foundItemId, adminNotes } = req.body;

    if (!isValidId(lostItemId) || !isValidId(foundItemId)) {
      return res.status(400).json({ message: "Valid Lost Item ID and Found Item ID are required." });
    }

    const [lost, found] = await Promise.all([
      LostItem.findById(lostItemId),
      FoundItem.findById(foundItemId),
    ]);

    if (!lost) return res.status(404).json({ message: "Lost item not found." });
    if (!found) return res.status(404).json({ message: "Found item not found." });

    let match = await LostFoundMatch.findOne({ lostItemId, foundItemId });
    if (!match) {
      match = new LostFoundMatch({
        lostItemId,
        foundItemId,
        matchedBy: "admin",
        adminStatus: "Pending",
        ownerConfirmation: "Pending",
        adminNotes: adminNotes || "",
      });
      await match.save();
    }

    lost.matchedFoundItemId = found._id;
    lost.matchedMatchId = match._id;
    lost.status = "MATCHED";

    found.matchedLostItemId = lost._id;
    found.matchedMatchId = match._id;
    found.status = "MATCHED";

    await Promise.all([lost.save(), found.save()]);

    // In-site notification to owner
    await createNotification(
      lost.ownerId,
      "✨ Possible Match Found!",
      `A found item appears to match your lost-item report (${lost.itemName}). Please review details and confirm whether this is your item.`,
      "lost_found_match",
      match._id
    );

    return res.json({
      message: `Match created between ${lost.reportId} ↔ ${found.reportId}. Owner notified.`,
      match,
    });
  } catch (err) {
    console.error("PUT /lostfound/admin/match error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 14. PUT /api/lostfound/admin/match-decision/:matchId — Admin Approves/Rejects Match
// ─────────────────────────────────────────────────────────────────────────────
router.put("/admin/match-decision/:matchId", protect, adminOnly, async (req, res) => {
  try {
    const { matchId } = req.params;
    const { action, adminNotes } = req.body; // action: "approve" | "reject"

    let match = await LostFoundMatch.findOne({ matchId });
    if (!match && isValidId(matchId)) match = await LostFoundMatch.findById(matchId);
    if (!match) return res.status(404).json({ message: "Match not found." });

    const [lost, found] = await Promise.all([
      LostItem.findById(match.lostItemId),
      FoundItem.findById(match.foundItemId),
    ]);

    if (action === "approve") {
      match.adminStatus = "Approved";
      match.adminNotes = adminNotes || "";
      await match.save();

      // Create Handover record
      let handover = await LostFoundHandover.findOne({ matchId: match._id });
      if (!handover) {
        handover = new LostFoundHandover({
          matchId: match._id,
          lostItemId: lost._id,
          foundItemId: found._id,
          finderId: found.foundBy,
          ownerId: lost.ownerId,
          status: "Awaiting_Finder_Handover",
        });
        await handover.save();
      }

      lost.status = "HANDOVER_TO_ADMIN_PENDING";
      lost.matchedHandoverId = handover._id;
      found.status = "HANDOVER_TO_ADMIN_PENDING";
      found.matchedHandoverId = handover._id;
      await Promise.all([lost.save(), found.save()]);

      // Notify Finder to handover item to MoveSmart Admin
      await createNotification(
        found.foundBy,
        "📦 Please Handover Found Item to Admin",
        `Your found item (${found.itemName}) has been matched with a verified owner. Please hand the item over to the MoveSmart Admin/authorized counter.`,
        "general",
        handover._id
      );

      // Notify Owner that match is approved and handover is in progress
      await createNotification(
        lost.ownerId,
        "🎉 Match Approved by Admin",
        `Your match for (${lost.itemName}) was verified! Finder is handing the item to MoveSmart Admin. You will be notified once ready for pickup.`,
        "general",
        handover._id
      );

      return res.json({ message: "Match approved. Handover process initiated.", match, handover });
    } else {
      match.adminStatus = "Rejected";
      match.adminNotes = adminNotes || "";
      await match.save();

      lost.matchedFoundItemId = null;
      lost.matchedMatchId = null;
      lost.status = "LOST";

      found.matchedLostItemId = null;
      found.matchedMatchId = null;
      found.status = "FOUND";
      await Promise.all([lost.save(), found.save()]);

      return res.json({ message: "Match rejected and decoupled.", match });
    }
  } catch (err) {
    console.error("PUT /lostfound/admin/match-decision error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 15. POST /api/lostfound/admin/handover-receive — Admin Records Item Receipt from Finder
// ─────────────────────────────────────────────────────────────────────────────
router.post("/admin/handover-receive", protect, adminOnly, async (req, res) => {
  try {
    const { handoverId, receivedDate, receivedTime, itemCondition, handoverPhoto, handoverNotes } = req.body;

    let handover = await LostFoundHandover.findOne({ handoverId });
    if (!handover && isValidId(handoverId)) handover = await LostFoundHandover.findById(handoverId);
    if (!handover) return res.status(404).json({ message: "Handover record not found." });

    handover.receivedDate = receivedDate || new Date().toISOString().split("T")[0];
    handover.receivedTime = receivedTime || "";
    handover.itemCondition = itemCondition || "Good";
    handover.handoverPhoto = handoverPhoto || "";
    handover.handoverNotes = handoverNotes || "";
    handover.adminId = req.user._id;
    handover.status = "In_Admin_Custody";
    await handover.save();

    await LostItem.findByIdAndUpdate(handover.lostItemId, { status: "ITEM_IN_ADMIN_CUSTODY" });
    await FoundItem.findByIdAndUpdate(handover.foundItemId, { status: "HANDED_TO_ADMIN" });

    // Notify Owner that item is in Admin custody and ready for collection
    await createNotification(
      handover.ownerId,
      "🏢 Item In MoveSmart Admin Custody",
      "Your lost item has been safely received by MoveSmart Admin and is ready for collection at the station counter.",
      "general",
      handover._id
    );

    return res.json({
      message: "Item received into Admin custody successfully. Owner notified.",
      handover,
    });
  } catch (err) {
    console.error("POST /lostfound/admin/handover-receive error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 16. PUT /api/lostfound/admin/handover-ready/:handoverId — Admin Marks Ready for Collection
// ─────────────────────────────────────────────────────────────────────────────
router.put("/admin/handover-ready/:handoverId", protect, adminOnly, async (req, res) => {
  try {
    const { handoverId } = req.params;

    let handover = await LostFoundHandover.findOne({ handoverId });
    if (!handover && isValidId(handoverId)) handover = await LostFoundHandover.findById(handoverId);
    if (!handover) return res.status(404).json({ message: "Handover not found." });

    handover.status = "Ready_For_Collection";
    await handover.save();

    await LostItem.findByIdAndUpdate(handover.lostItemId, { status: "READY_FOR_OWNER_COLLECTION" });

    await createNotification(
      handover.ownerId,
      "📍 Ready for Owner Collection",
      "Please collect your item from the MoveSmart Admin office with a valid Photo ID.",
      "general",
      handover._id
    );

    return res.json({ message: "Item marked ready for collection.", handover });
  } catch (err) {
    console.error("PUT /lostfound/admin/handover-ready error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 17. PUT /api/lostfound/admin/handover-confirm-return/:handoverId — Admin Confirms Return & Closes
// ─────────────────────────────────────────────────────────────────────────────
router.put("/admin/handover-confirm-return/:handoverId", protect, adminOnly, async (req, res) => {
  try {
    const { handoverId } = req.params;
    const { adminReturnNotes } = req.body;

    let handover = await LostFoundHandover.findOne({ handoverId });
    if (!handover && isValidId(handoverId)) handover = await LostFoundHandover.findById(handoverId);
    if (!handover) return res.status(404).json({ message: "Handover not found." });

    handover.adminVerifiedReturn = true;
    handover.adminReturnNotes = adminReturnNotes || "Verified handover proof and identification.";
    handover.returnedAt = new Date();
    handover.status = "Completed";
    await handover.save();

    await LostItem.findByIdAndUpdate(handover.lostItemId, { status: "RETURNED" });
    await FoundItem.findByIdAndUpdate(handover.foundItemId, { status: "RETURNED" });

    // Notify Owner
    await createNotification(
      handover.ownerId,
      "🎉 Lost & Found Case Closed - Item Returned",
      "Your lost item has been successfully returned and your MoveSmart case is now officially closed. Safe travels!",
      "general",
      handover._id
    );

    // Notify Finder
    await createNotification(
      handover.finderId,
      "🌟 Item Return Completed",
      "The found item you handed over has been successfully delivered to its rightful owner. Thank you for making transit safer!",
      "general",
      handover._id
    );

    return res.json({
      message: "Case closed! Item marked as RETURNED.",
      handover,
    });
  } catch (err) {
    console.error("PUT /lostfound/admin/handover-confirm-return error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 18. GET /api/lostfound/notifications — Get User's In-App Notifications
// ─────────────────────────────────────────────────────────────────────────────
router.get("/notifications", protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(40);
    return res.json({ notifications });
  } catch (err) {
    console.error("GET /lostfound/notifications error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 19. PUT /api/lostfound/notifications/read — Mark All User Notifications As Read
// ─────────────────────────────────────────────────────────────────────────────
router.put("/notifications/read", protect, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user._id, isRead: false }, { isRead: true });
    return res.json({ message: "Notifications marked as read." });
  } catch (err) {
    console.error("PUT /lostfound/notifications/read error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// 20. DELETE /api/lostfound/admin/item/:type/:id — Admin Delete Record
// ─────────────────────────────────────────────────────────────────────────────
router.delete("/admin/item/:type/:id", protect, adminOnly, async (req, res) => {
  try {
    const { type, id } = req.params;
    if (!isValidId(id)) return res.status(400).json({ message: "Invalid ID." });

    if (type === "lost") {
      const deleted = await LostItem.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ message: "Lost item not found." });
      await LostFoundMatch.deleteMany({ lostItemId: id });
      await LostFoundHandover.deleteMany({ lostItemId: id });
      return res.json({ message: `Lost report ${deleted.reportId} deleted.` });
    } else {
      const deleted = await FoundItem.findByIdAndDelete(id);
      if (!deleted) return res.status(404).json({ message: "Found item not found." });
      await LostFoundMatch.deleteMany({ foundItemId: id });
      await LostFoundHandover.deleteMany({ foundItemId: id });
      return res.json({ message: `Found report ${deleted.reportId} deleted.` });
    }
  } catch (err) {
    console.error("DELETE /lostfound/admin/item error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
