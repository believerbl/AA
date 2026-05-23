require("dotenv").config();
const express = require("express");
const cors = require("cors");
const Razorpay = require("razorpay");
const crypto = require("crypto");
const mongoose = require("mongoose");

const app = express();
app.use(cors());

// CRITICAL: We need the raw body to verify Razorpay Webhook Signatures securely
app.use(express.json({
    verify: (req, res, buf) => {
        req.rawBody = buf;
    }
}));

// --- 1. DATABASE CONNECTION ---
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("Database Connected: The app has memory!"))
    .catch((err) => console.error("Database Connection Failed:", err));

const UserSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    hasPaid: { type: Boolean, default: false },
    paymentId: String
});
const User = mongoose.model("User", UserSchema);

// --- 2. RAZORPAY SETUP ---
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// --- 3. CHECK ACCESS ROUTE ---
app.post('/check-access', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        res.json({ hasAccess: !!(user && user.hasPaid) });
    } catch (error) {
        res.status(500).json({ error: "Failed to check access" });
    }
});

// --- 4. CREATE ORDER ROUTE (Upgraded to accept email) ---
app.post('/create-order', async (req, res) => {
    try {
        const { email } = req.body; // Capture the email sent from React
        const options = {
            amount: 200, 
            currency: "INR",
            receipt: "lifetime_order_" + Math.random().toString(36).substring(7),
            notes: { email: email } // Embed the email permanently into the Razorpay order
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        console.error("RAZORPAY CRASH REASON:", error);
        res.status(500).json({ error: error.message || "Failed to create order" });
    }
});

// --- 5. FRONTEND VERIFY PAYMENT (The quick way) ---
app.post('/verify-payment', async (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, email } = req.body;
    const expectedSignature = crypto.createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id).digest("hex");

    if (expectedSignature === razorpay_signature) {
        try {
            await User.findOneAndUpdate(
                { email: email }, 
                { hasPaid: true, paymentId: razorpay_payment_id }, 
                { upsert: true, returnDocument: 'after' } // Fixed the Mongoose Warning!
            );
            res.json({ success: true });
        } catch (dbError) {
            res.status(500).json({ success: false });
        }
    } else {
        res.status(400).json({ success: false });
    }
});

// --- 6. THE WEBHOOK (The bulletproof backup) ---
app.post('/webhook', async (req, res) => {
    // 1. Verify this ping actually came from Razorpay
    const signature = req.headers['x-razorpay-signature'];
    const expectedSignature = crypto
        .createHmac('sha256', process.env.WEBHOOK_SECRET)
        .update(req.rawBody) // Using the raw buffer we saved earlier
        .digest('hex');

    if (signature !== expectedSignature) {
        return res.status(400).send("Invalid Signature");
    }

    // 2. If it's a successful payment, find the embedded email and unlock the account
    if (req.body.event === 'order.paid') {
        try {
            const email = req.body.payload.order.entity.notes.email;
            const paymentId = req.body.payload.payment.entity.id;

            if (email) {
                await User.findOneAndUpdate(
                    { email: email },
                    { hasPaid: true, paymentId: paymentId },
                    { upsert: true, returnDocument: 'after' }
                );
                console.log(`WEBHOOK SUCCESS: Unlocked account for ${email}`);
            }
        } catch (err) {
            console.error("Webhook DB Error:", err);
        }
    }
    
    // Always return 200 immediately so Razorpay knows we got the message
    res.status(200).send('OK');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));