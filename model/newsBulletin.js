const mongoose = require('mongoose');

const NewsBulletinSchema = new mongoose.Schema({
    description: {
        type: String,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

module.exports = mongoose.model('NewsBulletin', NewsBulletinSchema);
