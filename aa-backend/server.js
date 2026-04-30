const express = require('express');
const cors = require('cors');
const Razorpay = require('razorpay');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Step 1: Generate the ₹2 Order
app.post('/create-order', async (req, res) => {
    try {
        const options = {
            amount: 200, // Amount in paise (200 paise = ₹2)
            currency: "INR",
            receipt: "receipt_" + Math.random().toString(36).substring(7),
        };
        const order = await razorpay.orders.create(options);
        res.status(200).json(order);
    } catch (error) {
        console.error("RAZORPAY REJECTION REASON:", error);
        res.status(500).json({ error: error.message });
    }
});

// Step 2: Verify Payment & Hand Over the Link
app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
        .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
        .update(sign.toString())
        .digest("hex");

    if (razorpay_signature === expectedSign) {
        // Payment is legit! Release the secret URL.
        return res.status(200).json({ 
            success: true, 
            redirectUrl: process.env.OPAL_URL 
        });
    } else {
        return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
});

app.listen(5000, () => console.log(`Toll booth backend running on port 5000`));