const express = require('express');
const User = require('../model/userSchema');
const jwt = require('jsonwebtoken');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const dotenv = require("dotenv");
const Razorpay = require("razorpay");
const PromoCode = require('../model/promoCode'); // Import the PromoCode model
const checkPromoCode = require('../middleware/promoCode');
const crypto = require('crypto');
const Subscription = require('../model/subscription');
const verifyTokenAdmin = require('../middleware/adminAuth');


dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RazorPay_KEY_ID,
    key_secret: process.env.RazorPay_KEY_SECRET
})

// Test route to verify token
router.get('/test', verifyToken, (req, res) => {
    res.json({ msg: 'Token is valid', user: req.user });
});


router.post("/createorder", verifyToken, checkPromoCode, async (req, res) => {

    let { amount, currency, promocode } = req.body;
    amount = JSON.parse(amount);

    let discount = req.discount;
    discount = JSON.parse(discount);

    totalAmountinRS = Math.round((amount - (amount * discount / 100)))

    const options = {
        amount:  totalAmountinRS * 100, // Amount in paise
        currency
    };


    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    }
    catch (error) {
        console.log(error)
        res.status(500).send(error);

    }

})

router.post('/add1yearsubscription', verifyToken, async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, promocode, amount, date } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ msg: 'Missing payment information' });
    }

    try {
        // Verify Razorpay signature
        const generated_signature = crypto.createHmac('sha256', process.env.RazorPay_KEY_SECRET)
            .update(`${razorpay_order_id}|${razorpay_payment_id}`)
            .digest('hex');

        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({ msg: 'Invalid signature' });
        }


        const user = await User.findById(req.user.id);

        // Create Subscription document
        const subscription = new Subscription({
            isActive: true,
            expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
            paymentId: razorpay_payment_id,
            promoCode: promocode,
            amount: amount,
            date: new Date(date),
            userName: user.name, // Assuming req.user has name and email
            userEmail: user.email
        });

        const savedsubscription = await subscription.save();

        // console.log(subscription);

        // Update User document with Subscription reference

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        user.subscription = savedsubscription._id;
        await user.save();

        res.json({ msg: 'Subscription added successfully', expiryDate: subscription.expiryDate, finalAmount: amount });
    } catch (error) {
        console.error('Error adding subscription:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});


// Check subscription status
router.post('/checksubscription', verifyToken, async (req, res) => {
    try {
        // Fetch user details
        const user = await User.findById(req.user.id).populate('subscription'); // Populate subscription

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Fetch subscription details
        const subscription = user.subscription;

        const currentDate = new Date();

        if (subscription && subscription.isActive && subscription.expiryDate > currentDate) {
            res.json({
                isActive: true,
                expiryDate: subscription.expiryDate,
                paymentId: subscription.paymentId,
                promoCode: subscription.promoCode,
                amount: subscription.amount,
                date: subscription.date,
                userName: subscription.userName,  // Include additional details if needed
                userEmail: subscription.userEmail
            });
        } else {
            res.json({
                isActive: false,
                expiryDate: subscription ? subscription.expiryDate : null,
                paymentId: subscription ? subscription.paymentId : null,
                promoCode: subscription ? subscription.promoCode : null,
                amount: subscription ? subscription.amount : null,
                date: subscription ? subscription.date : null,
                userName: subscription ? subscription.userName : null,  // Include additional details if needed
                userEmail: subscription ? subscription.userEmail : null
            });
        }
    } catch (error) {
        console.error('Error checking subscription:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});


router.get('/latest-subscriptions', verifyTokenAdmin, async (req, res) => {
    try {
        const subscriptions = await Subscription.find()
            .sort({ createdAt: -1 }) // Sort by creation date, descending
            .limit(10); // Limit to 10 results

        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching latest subscriptions:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});


router.get('/subscription-by-email/:email', verifyTokenAdmin, async (req, res) => {
    try {
        const { email } = req.params;

        // Find subscription by user email
        const subscriptions = await Subscription.find({ userEmail: email });

        if (subscriptions.length === 0) {
            return res.status(404).json({ msg: 'No subscriptions found for this email' });
        }

        res.json(subscriptions);
    } catch (error) {
        console.error('Error fetching subscription by email:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});


// PromoCode routes

// POST - Create a promo code
router.post('/promocode/create', verifyTokenAdmin, async (req, res) => {
    const { code, discount, expirationDate } = req.body;

    try {
        const newPromoCode = new PromoCode({ code, discount, expirationDate });
        await newPromoCode.save();
        res.status(201).json(newPromoCode);
    } catch (error) {
        console.error('Error creating promo code:', error);
        res.status(500).json({ msg: 'Error creating promo code' });
    }
});

// GET - Retrieve all promo codes
router.get('/promocode', verifyToken, async (req, res) => {
    try {
        const promoCodes = await PromoCode.find().sort({ createdAt: -1 });
        res.json(promoCodes);
    } catch (error) {
        console.error('Error retrieving promo codes:', error);
        res.status(500).json({ msg: 'Error retrieving promo codes' });
    }
});

// DELETE - Delete a promo code by ID
router.delete('/promocode/:id', verifyTokenAdmin, async (req, res) => {
    try {
        const deletedPromoCode = await PromoCode.findByIdAndDelete(req.params.id);
        if (!deletedPromoCode) {
            return res.status(404).json({ msg: 'Promo code not found' });
        }
        res.json({ msg: 'Promo code deleted successfully' });
    } catch (error) {
        console.error('Error deleting promo code:', error);
        res.status(500).json({ msg: 'Error deleting promo code' });
    }
});


// GET - Retrieve discount by promo code name
router.get('/promocode/discount/:code', verifyToken, async (req, res) => {
    try {
        const promoCode = await PromoCode.findOne({ code: req.params.code });

        if (!promoCode) {
            return res.status(404).json({ msg: 'Promo code not found' });
        }

        res.json({ discount: promoCode.discount });
    } catch (error) {
        console.error('Error retrieving promo code:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
