const express = require("express");
const bcrypt = require("bcrypt");
const nodemailer = require("nodemailer");
const User = require("../models/User");

const router = express.Router();

const otpStore = new Map();

const normalizeSmtpValue = (value) => {
    if (typeof value !== "string") return value;
    return value.trim().replace(/\s+/g, "");
};

const createTransporter = () => {
    const smtpUser = normalizeSmtpValue(process.env.SMTP_USER);
    const smtpPass = normalizeSmtpValue(process.env.SMTP_PASS);

    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: smtpUser,
            pass: smtpPass
        }
    });
};

const verifySmtpConnection = () => {
    const transporter = createTransporter();
    transporter.verify((error) => {
        if (error) {
            console.log("SMTP configuration error:", error.message);
        } else {
            console.log("SMTP ready to send emails ✅");
        }
    });
};

verifySmtpConnection();

const sendOtpEmail = async (email, otp) => {
    const smtpUser = normalizeSmtpValue(process.env.SMTP_USER);
    const smtpPass = normalizeSmtpValue(process.env.SMTP_PASS);

    if (!smtpUser || !smtpPass) {
        throw new Error("SMTP credentials are not configured. Set SMTP_USER and SMTP_PASS in the backend environment.");
    }

    const transporter = createTransporter();
    const mailOptions = {
        from: process.env.SMTP_FROM || smtpUser,
        to: email,
        subject: "MoveSmart Email Verification OTP",
        text: `Your MoveSmart verification code is ${otp}. It expires in 10 minutes.`
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (error) {
        if (error.code === "EAUTH" || error.responseCode === 535) {
            throw new Error("Gmail rejected the SMTP credentials. Make sure 2-Step Verification is enabled and you are using a 16-character Google App Password.");
        }
        throw error;
    }
};

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


        res.json({

            message: "Login successful",

            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role
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
        const { email, name, googleId, picture } = req.body;

        if (!email) {
            return res.status(400).json({ message: "Google email is required" });
        }

        let user = await User.findOne({ email: email.toLowerCase() });

        if (!user) {
            // Auto-register user with Google details
            const randomPassword = await bcrypt.hash(`GoogleAuth_${Date.now()}_${Math.random()}`, 10);
            user = new User({
                name: name || email.split("@")[0],
                email: email.toLowerCase(),
                password: randomPassword,
                role: "User",
            });
            await user.save();
        }

        // Return user authentication data
        res.json({
            message: "Google Sign-In successful ✅",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role || "User",
            }
        });
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        res.status(500).json({ message: error.message || "Google Sign-In failed" });
    }
});

module.exports = router;