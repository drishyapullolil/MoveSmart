const mongoose = require("mongoose");

const busSchema = new mongoose.Schema(
  {
    busNumber: {
      type: String,
      required: true,
      unique: true,
    },
    busName: {
      type: String,
      required: true,
    },
    busType: {
      type: String,
      required: true,
      default: "AC Seater / Sleeper (2+2)",
    },
    operator: {
      type: String,
      default: "MoveSmart Transit Ops",
    },
    fromLocation: {
      type: String,
      default: "Depot",
      index: true,
    },
    toLocation: {
      type: String,
      default: "Depot",
      index: true,
    },
    routeName: {
      type: String,
      default: "",
    },
    route_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Route",
      default: null,
    },
    stops: {
      type: [String],
      default: [],
    },
    departureTime: {
      type: String,
      default: "06:00 AM",
    },
    arrivalTime: {
      type: String,
      default: "10:00 PM",
    },
    duration: {
      type: String,
      default: "4h 30m",
    },
    totalSeats: {
      type: Number,
      default: 32,
    },
    availableSeats: {
      type: Number,
      default: 32,
    },
    price: {
      type: Number,
      default: 100,
    },
    rating: {
      type: Number,
      default: 4.8,
    },
    amenities: {
      type: [String],
      default: ["Wi-Fi", "Charging Port", "Live Tracking", "Water Bottle"],
    },
    bookedSeats: {
      type: [String],
      default: [],
    },
    driverId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    driverName: {
      type: String,
      default: "Not Assigned",
    },
    driverPhone: {
      type: String,
      default: "",
    },
    driverLicense: {
      type: String,
      default: "",
    },
    driverPhoto: {
      type: String,
      default: "",
    },
    driverVerified: {
      type: Boolean,
      default: false,
    },
    driverExperience: {
      type: Number,
      default: 0,
    },
    is_active: {
      type: Boolean,
      default: true,
    },
    bookingEnabled: {
      type: Boolean,
      default: false,
    },
    shifts: {
      morning: {
        driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        driverName: {
          type: String,
          default: "Not Assigned",
        },
        driverEmail: {
          type: String,
          default: "",
        },
        driverPhone: {
          type: String,
          default: "",
        },
        startTime: {
          type: String,
          default: "06:00 AM",
        },
        endTime: {
          type: String,
          default: "02:00 PM",
        },
      },
      evening: {
        driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        driverName: {
          type: String,
          default: "Not Assigned",
        },
        driverEmail: {
          type: String,
          default: "",
        },
        driverPhone: {
          type: String,
          default: "",
        },
        startTime: {
          type: String,
          default: "02:00 PM",
        },
        endTime: {
          type: String,
          default: "10:00 PM",
        },
      },
      night: {
        driverId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          default: null,
        },
        driverName: {
          type: String,
          default: "Not Assigned",
        },
        driverEmail: {
          type: String,
          default: "",
        },
        driverPhone: {
          type: String,
          default: "",
        },
        startTime: {
          type: String,
          default: "10:00 PM",
        },
        endTime: {
          type: String,
          default: "06:00 AM",
        },
      },
    },
  },
  { timestamps: true, strict: false }
);

module.exports = mongoose.model("Bus", busSchema);
