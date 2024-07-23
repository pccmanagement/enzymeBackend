const mongoose = require('mongoose');

const homePosterSchema = new mongoose.Schema({
    imageKey: {
        type: String,
        required: true,
    },
}, {
    timestamps: true
});

const HomePoster = mongoose.model('HomePoster', homePosterSchema);

module.exports = HomePoster;
