const mongoose = require("mongoose");

const busGallerySchema = new mongoose.Schema(
  {
    busId: {
      type: mongoose.Schema.Types.Mixed, // Can store ObjectId or string ID
      required: true,
      index: true,
    },
    busNumber: {
      type: String,
      trim: true,
    },
    busName: {
      type: String,
      trim: true,
    },
    type: {
      type: String,
      enum: ["photo", "video"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
    imageUrl: {
      type: String,
      trim: true,
      default: "",
    },
    youtubeUrl: {
      type: String,
      trim: true,
      default: "",
    },
    youtubeVideoId: {
      type: String,
      trim: true,
      default: "",
    },
    isSample: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["Active", "Archived"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("BusGallery", busGallerySchema);
