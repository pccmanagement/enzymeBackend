const router = require("express").Router();
const Razorpay = require("razorpay");
const dotenv = require("dotenv");
const verifyToken = require('../middleware/auth');

dotenv.config();

const razorpay = new Razorpay({
    key_id: process.env.RazorPay_KEY_ID,
    key_secret: process.env.RazorPay_KEY_SECRET  });

router.get('/test',async (req,res)=>{
    res.json({
        message:"It works"
    })
})

router.post("/order", verifyToken,async (req, res) => {
    console.log('order api')
    const { amount, currency, receipt } = req.body;
    console.log(req.body)

    const options = {
        amount: amount * 100, // Amount in paise
        currency,
        receipt
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json(order);
    } catch (error) {
        console.log(error)
        res.status(500).send(error);
    }
})
module.exports = router;