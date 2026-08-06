const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { sendOtpEmail } = require("../utils/mailer");

const router = express.Router();

const otpStore = new Map();


router.post("/send-otp", async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(email.toLowerCase(), { otp, expiresAt: Date.now() + 10 * 60 * 1000 });

        await sendOtpEmail(email, otp);

        res.json({ message: "OTP sent successfully to your email" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message || "Failed to send OTP. Please check your email configuration." });
    }
});

router.post("/verify-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;

        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const stored = otpStore.get(email.toLowerCase());

        if (!stored) {
            return res.status(400).json({ message: "OTP not found or expired" });
        }

        if (Date.now() > stored.expiresAt) {
            otpStore.delete(email.toLowerCase());
            return res.status(400).json({ message: "OTP expired" });
        }

        if (stored.otp !== otp) {
            return res.status(400).json({ message: "Invalid OTP" });
        }

        otpStore.delete(email.toLowerCase());
        res.json({ message: "OTP verified successfully" });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: error.message });
    }
});


// SIGNUP API
router.post("/signup", async (req, res) => {

    try {

        console.log("Received Data:", req.body);

        const { name, email, password } = req.body;


        // Check empty fields
        if (!name || !email || !password) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }


        // Check existing user
        const existingUser = await User.findOne({ email });

        if (existingUser) {
            return res.status(400).json({
                message: "User already exists"
            });
        }


        // Encrypt password
        const hashedPassword = await bcrypt.hash(password, 10);


        // Create user
        const user = new User({
            name: name,
            email: email,
            password: hashedPassword
        });


        await user.save();


        res.status(201).json({
            message: "Signup successful"
        });


    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

});



// LOGIN API
router.post("/login", async (req, res) => {

    try {

        console.log("Login Data:", req.body);


        const { email, password } = req.body;


        if (!email || !password) {
            return res.status(400).json({
                message: "Email and password required"
            });
        }


        const user = await User.findOne({ email });


        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }


        const passwordMatch = await bcrypt.compare(
            password,
            user.password
        );


        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid password"
            });
        }


        const token = jwt.sign(
            { id: user._id, role: user.role, email: user.email },
            process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026",
            { expiresIn: "7d" }
        );

            res.json({
                message: "Login successful",
                token,
                user: {
                    id: user._id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    verificationStatus: user.verificationStatus
                }
            });


    } catch (error) {

        console.log(error);

        res.status(500).json({
            message: error.message
        });

    }

});


// GOOGLE SIGN-IN API
router.post("/google-login", async (req, res) => {
    try {
        const { email, name } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Google email is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        let user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            // Auto-register user with Google details
            const randomPassword = await bcrypt.hash(`GoogleAuth_${Date.now()}_${Math.random()}`, 10);
            user = new User({
                name: (name || normalizedEmail.split("@")[0]).trim(),
                email: normalizedEmail,
                password: randomPassword,
                role: "user",
            });
            await user.save();
        }

        const token = jwt.sign(
            { id: user._id, role: user.role, email: user.email },
            process.env.JWT_SECRET || "movesmart_jwt_secret_key_2026",
            { expiresIn: "7d" }
        );

        // Return user authentication data
        res.json({
            message: "Google Sign-In successful ✅",
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || "user",
            }
        });
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        res.status(500).json({ message: error.message || "Google Sign-In failed" });
    }
});

// FORGOT PASSWORD - Send OTP
router.post("/forgot-password", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: "Email is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ message: "No account found registered with this email address" });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpStore.set(`reset_${normalizedEmail}`, { otp, verified: false, expiresAt: Date.now() + 10 * 60 * 1000 });

        await sendOtpEmail(normalizedEmail, otp, "MoveSmart Password Reset OTP");

        res.json({ message: "Password reset OTP sent successfully to your email" });
    } catch (error) {
        console.error("Forgot Password Error:", error);
        res.status(500).json({ message: error.message || "Failed to send reset OTP. Please try again." });
    }
});

// FORGOT PASSWORD - Verify OTP
router.post("/verify-reset-otp", async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ message: "Email and OTP are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const stored = otpStore.get(`reset_${normalizedEmail}`);

        if (!stored) {
            return res.status(400).json({ message: "OTP not found or expired. Please request a new code." });
        }

        if (Date.now() > stored.expiresAt) {
            otpStore.delete(`reset_${normalizedEmail}`);
            return res.status(400).json({ message: "OTP expired. Please request a new code." });
        }

        if (stored.otp !== otp.trim()) {
            return res.status(400).json({ message: "Invalid OTP code" });
        }

        stored.verified = true;
        res.json({ message: "OTP verified successfully. You can now set a new password." });
    } catch (error) {
        console.error("Verify Reset OTP Error:", error);
        res.status(500).json({ message: error.message });
    }
});

// FORGOT PASSWORD - Reset Password
router.post("/reset-password", async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        if (!email || !otp || !newPassword) {
            return res.status(400).json({ message: "Email, OTP, and new password are required" });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({ message: "New password must be at least 6 characters long" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const stored = otpStore.get(`reset_${normalizedEmail}`);

        if (!stored || stored.otp !== otp.trim() || Date.now() > stored.expiresAt) {
            return res.status(400).json({ message: "Invalid or expired OTP session. Please request a new code." });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password = hashedPassword;
        await user.save();

        otpStore.delete(`reset_${normalizedEmail}`);

        res.json({ message: "Password reset successful! You can now log in with your new password." });
    } catch (error) {
        console.error("Reset Password Error:", error);
        res.status(500).json({ message: error.message || "Failed to reset password" });
    }
});

// GET /me API
const { protect } = require("../middleware/authMiddleware");

router.get("/me", protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                verificationStatus: user.verificationStatus
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server error" });
    }
});

// APPLY DRIVER POST API
router.post("/apply-driver", protect, async (req, res) => {
    try {
        const { licenseNumber, experienceYears, phone, profilePic, licenseImage } = req.body;
        const user = await User.findById(req.user._id);
        
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        user.licenseNumber = licenseNumber;
        user.experienceYears = experienceYears;
        user.phone = phone;
        if (profilePic) user.profilePic = profilePic;
        if (licenseImage) user.licenseImage = licenseImage;
        user.verificationStatus = "Pending";

        await user.save();

        res.json({ message: "Application submitted successfully! Your status is now Pending Admin Approval.", user });
    } catch (error) {
        console.error("Apply Driver Error:", error);
        res.status(500).json({ message: "Failed to submit application", error: error.message });
    }
});

module.exports = router;