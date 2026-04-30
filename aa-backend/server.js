require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose"); // <-- NEW: MongoDB Library

const app = express();
app.use(cors());
app.use(express.json());

// --- 1. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Database Connected: The app has memory!"))
    .catch((err) => console.error("Database Connection Failed:", err));

// --- 2. DATABASE SCHEMA (How we remember users) ---
const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    hasPaid: { type: Boolean, default: false },
    paymentId: String
});
const User = mongoose.model("User", UserSchema);

// --- 3. RAZORPAY SETUP ---
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- 4. CHECK ACCESS ROUTE (For the frontend to check if user paid) ---
app.post('/check-access', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (user && user.hasPaid) {
            res.json({ hasAccess: true });
        } else {
            res.json({ hasAccess: false });
        }
    } catch (error) {
        res.status(500).json({ error: "Failed to check access" });
    }
});

// --- 5. CREATE ORDER ROUTE ---
app.post('/create-order', async (req, res) => {
    try {
        const options = {
            amount: 200, // ₹2.00 Lifetime Access
            currency: "INR",
            receipt: "lifetime_order_" + Math.random().toString(36).substring(7),
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        console.error("RAZORPAY CRASH REASON:", error);
        res.status(500).json({ error: error.message || "Failed to create order" });
    }
});

// --- 6. VERIFY PAYMENT & SAVE TO DATABASE ---
app.post('/verify-payment', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email } = req.body;

    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature === razorpay_signature) {
        // SUCCESS! Write it down in the database!
        try {
            await User.findOneAndUpdate(
                { email: email }, 
                { hasPaid: true, paymentId: razorpay_payment_id }, 
                { upsert: true, new: true } // Creates the user if they don't exist
            );
            res.json({ success: true, message: "Payment verified & saved!" });
        } catch (dbError) {
            console.error("Database Save Error:", dbError);
            res.status(500).json({ success: false, message: "Payment successful, but failed to save to database." });
        }
    } else {
        res.status(400).json({ success: false, message: "Invalid signature" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Toll booth backend running on port ${PORT}`));