const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    email: {
        type: String,
        required: true,
        unique: true
    },

    password: {
        type: String,
        required: true
    },

    role: {
        type: String,
        enum: ["user", "admin", "driver"],
        default: "user"
    },
    phone: {
        type: String,
        default: ""
    },
    licenseNumber: {
        type: String,
        default: ""
    },
    licenseImage: {
        type: String,
        default: ""
    },
    profilePic: {
        type: String,
        default: ""
    },
    experienceYears: {
        type: Number,
        default: 5
    },
    verificationStatus: {
        type: String,
        enum: ["Unverified", "Pending", "Approved", "Rejected"],
        default: "Unverified"
    },
    verificationNote: {
        type: String,
        default: ""
    }
}, { timestamps: true });


module.exports = mongoose.model("User", userSchema);