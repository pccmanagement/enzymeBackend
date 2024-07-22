const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema({
    isActive: { type: Boolean, default: false },
    expiryDate: { type: Date },
    paymentId: { type: String },
    promoCode: { type: String },
    amount: { type: Number },
    date: { type: Date },
    userName: { type: String },
    userEmail: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Subscription', subscriptionSchema);
