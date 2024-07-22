const express = require('express');
const router = express.Router();
const PlatformFee = require('../model/PlatformFee');
const verifyToken = require('../middleware/auth');
const verifyTokenAdmin = require('../middleware/adminAuth');

// Route to get the platform fee
router.get('/get-platform-fee',verifyToken,  async (req, res) => {
    try {
        const platformFee = await PlatformFee.findOne();

        if (!platformFee) {
            return res.status(404).json({ msg: 'Platform fee not found' });
        }

        res.json(platformFee);
    } catch (error) {
        console.error('Error fetching platform fee:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Route to set the platform fee
router.post('/set-platform-fee', verifyTokenAdmin, async (req, res) => {
    const { fee } = req.body;

    if (typeof fee !== 'number') {
        return res.status(400).json({ msg: 'Invalid platform fee' });
    }

    try {
        const platformFee = await PlatformFee.findOneAndUpdate(
            {}, 
            { fee },
            { new: true, upsert: true } // upsert option creates the doc if it doesn't exist
        );

        res.json({ msg: 'Platform fee set successfully', platformFee });
    } catch (error) {
        console.error('Error setting platform fee:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});
module.exports = router;
