const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const BusGallery = require("../models/BusGallery");
const Bus = require("../models/Bus");

// Helper to reliably extract YouTube video ID from various YouTube URL formats
const extractYouTubeVideoId = (url) => {
  if (!url) return null;
  const cleanUrl = String(url).trim();

  // Pattern matches:
  // - https://www.youtube.com/watch?v=VIDEO_ID
  // - https://youtu.be/VIDEO_ID
  // - https://www.youtube.com/embed/VIDEO_ID
  // - https://www.youtube.com/shorts/VIDEO_ID
  // - https://m.youtube.com/watch?v=VIDEO_ID
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|shorts\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = cleanUrl.match(regExp);

  if (match && match[2] && match[2].length === 11) {
    return match[2];
  }

  // Fallback: If user directly entered the 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
};

// 1. GET /api/bus-gallery/:busId - Fetch gallery items for a specific bus
router.get("/:busId", async (req, res) => {
  try {
    const { busId } = req.params;
    if (!busId || busId === "undefined" || busId === "null") {
      return res.status(400).json({ success: false, message: "Valid Bus ID is required." });
    }

    // Query by busId as string or ObjectId, or check busNumber
    const queryConditions = [{ busId: String(busId) }];
    if (mongoose.Types.ObjectId.isValid(busId)) {
      queryConditions.push({ busId: new mongoose.Types.ObjectId(busId) });
    }

    // Also look up if this busId belongs to a known bus number
    const matchedBus = await Bus.findById(busId).lean().catch(() => null);
    if (matchedBus?.busNumber) {
      queryConditions.push({ busNumber: matchedBus.busNumber });
    }

    const items = await BusGallery.find({
      $or: queryConditions,
      status: "Active",
    }).sort({ createdAt: -1 });

    const photos = items.filter((i) => i.type === "photo");
    const videos = items.filter((i) => i.type === "video");

    res.json({
      success: true,
      count: items.length,
      photosCount: photos.length,
      videosCount: videos.length,
      gallery: items,
      photos,
      videos,
    });
  } catch (error) {
    console.error("Error fetching bus gallery:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch gallery items." });
  }
});

// 2. GET /api/bus-gallery - Fetch all gallery items (with optional ?busId=... filter)
router.get("/", async (req, res) => {
  try {
    const { busId, type } = req.query;
    const filter = { status: "Active" };

    if (busId && busId !== "all" && busId !== "All") {
      filter.$or = [{ busId: String(busId) }];
      if (mongoose.Types.ObjectId.isValid(busId)) {
        filter.$or.push({ busId: new mongoose.Types.ObjectId(busId) });
      }
    }

    if (type && ["photo", "video"].includes(type)) {
      filter.type = type;
    }

    const items = await BusGallery.find(filter).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: items.length,
      gallery: items,
    });
  } catch (error) {
    console.error("Error fetching all gallery items:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to fetch gallery items." });
  }
});

// 3. POST /api/bus-gallery - Add a new Photo or YouTube Video to a Bus Gallery (Admin)
router.post("/", async (req, res) => {
  try {
    const { busId, busNumber, busName, type, title, description, imageUrl, youtubeUrl, isSample } = req.body;

    // Validation
    if (!busId) {
      return res.status(400).json({ success: false, message: "Bus ID is required." });
    }

    if (!type || !["photo", "video"].includes(type)) {
      return res.status(400).json({ success: false, message: "Type must be 'photo' or 'video'." });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required." });
    }

    let youtubeVideoId = null;
    let validatedImageUrl = "";

    if (type === "video") {
      if (!youtubeUrl || !youtubeUrl.trim()) {
        return res.status(400).json({ success: false, message: "YouTube URL is required for video gallery items." });
      }

      youtubeVideoId = extractYouTubeVideoId(youtubeUrl);
      if (!youtubeVideoId) {
        return res.status(400).json({
          success: false,
          message: "Invalid YouTube URL. Please provide a standard URL like https://www.youtube.com/watch?v=VIDEO_ID or https://youtu.be/VIDEO_ID",
        });
      }
    } else if (type === "photo") {
      if (!imageUrl || !imageUrl.trim()) {
        return res.status(400).json({ success: false, message: "Image data or URL is required for photo gallery items." });
      }
      validatedImageUrl = imageUrl.trim();
    }

    // Resolve bus details if missing
    let resolvedBusNumber = busNumber || "";
    let resolvedBusName = busName || "";
    if (!resolvedBusNumber || !resolvedBusName) {
      const busDoc = await Bus.findById(busId).lean().catch(() => null);
      if (busDoc) {
        resolvedBusNumber = resolvedBusNumber || busDoc.busNumber;
        resolvedBusName = resolvedBusName || busDoc.busName;
      }
    }

    const newGalleryItem = new BusGallery({
      busId: String(busId),
      busNumber: resolvedBusNumber || "KL-01-MS-1001",
      busName: resolvedBusName || "MoveSmart Transit Coach",
      type,
      title: title.trim(),
      description: description ? description.trim() : "",
      imageUrl: validatedImageUrl,
      youtubeUrl: type === "video" ? youtubeUrl.trim() : "",
      youtubeVideoId: youtubeVideoId,
      isSample: Boolean(isSample),
      status: "Active",
    });

    await newGalleryItem.save();

    res.status(201).json({
      success: true,
      message: `${type === "video" ? "YouTube Video" : "Photo"} added successfully to Bus Gallery!`,
      item: newGalleryItem,
    });
  } catch (error) {
    console.error("Error creating gallery item:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to create gallery item." });
  }
});

// 4. PUT /api/bus-gallery/:id - Update gallery item (Admin)
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, imageUrl, youtubeUrl, isSample, status } = req.body;

    const existing = await BusGallery.findById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Gallery item not found." });
    }

    if (title && title.trim()) existing.title = title.trim();
    if (description !== undefined) existing.description = description.trim();
    if (isSample !== undefined) existing.isSample = Boolean(isSample);
    if (status) existing.status = status;

    if (existing.type === "video" && youtubeUrl) {
      const videoId = extractYouTubeVideoId(youtubeUrl);
      if (!videoId) {
        return res.status(400).json({ success: false, message: "Invalid YouTube URL." });
      }
      existing.youtubeUrl = youtubeUrl.trim();
      existing.youtubeVideoId = videoId;
    } else if (existing.type === "photo" && imageUrl) {
      existing.imageUrl = imageUrl.trim();
    }

    await existing.save();

    res.json({
      success: true,
      message: "Gallery item updated successfully.",
      item: existing,
    });
  } catch (error) {
    console.error("Error updating gallery item:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to update gallery item." });
  }
});

// 5. DELETE /api/bus-gallery/:id - Delete gallery item (Admin)
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await BusGallery.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: "Gallery item not found." });
    }

    res.json({
      success: true,
      message: "Gallery item deleted successfully.",
      id: id,
    });
  } catch (error) {
    console.error("Error deleting gallery item:", error);
    res.status(500).json({ success: false, message: error.message || "Failed to delete gallery item." });
  }
});

module.exports = router;
