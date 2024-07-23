const express = require('express');
const router = express.Router();
const HomePoster = require('../model/HomePoster');
const verifyToken = require('../middleware/auth');
const verifyTokenAdmin = require('../middleware/adminAuth');
const AWS = require('@aws-sdk/client-s3')
const AWSurl = require('@aws-sdk/s3-request-presigner')
const s3Client = require('../config/aws');

// Route to get the home poster image key
router.get('/get-home-poster', verifyToken, async (req, res) => {
    try {
        const homePoster = await HomePoster.findOne();

        if (!homePoster) {
            return res.status(404).json({ msg: 'Home poster image key not found' });
        }


        let keyName = homePoster.imageKey;
        const command = new AWS.GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: keyName
        });

        const signedUrl = await AWSurl.getSignedUrl(s3Client, command);
        let url = signedUrl;

        // console.log(url)

        res.json(url);
    } catch (error) {
        console.error('Error fetching home poster image key:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Route to set the home poster image key
router.post('/set-home-poster', verifyTokenAdmin, async (req, res) => {
    const { imageKey } = req.body;

    if (!imageKey) {
        return res.status(400).json({ msg: 'Invalid home poster image key' });
    }

    try {
        const homePoster = await HomePoster.findOneAndUpdate(
            {}, 
            { imageKey },
            { new: true, upsert: true } // upsert option creates the doc if it doesn't exist
        );

        res.json({ msg: 'Home poster image key set successfully', homePoster });
    } catch (error) {
        console.error('Error setting home poster image key:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
