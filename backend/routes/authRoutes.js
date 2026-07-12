const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();


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


module.exports = router;