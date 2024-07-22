const mongoose = require('mongoose');

const platformFeeSchema = new mongoose.Schema({
    fee: {
        type: Number,
        required: true,
    },
}, {
    timestamps: true,
});

const PlatformFee = mongoose.model('PlatformFee', platformFeeSchema);

module.exports = PlatformFee;
