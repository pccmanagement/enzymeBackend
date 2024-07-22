const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const Test = require('../model/testSchema');
const AWS = require('@aws-sdk/client-s3')
const AWSurl = require('@aws-sdk/s3-request-presigner')
const s3Client = require('../config/aws');
const User = require('../model/userSchema');
const verifyTokenAdmin = require('../middleware/adminAuth');


router.get('/test', (req, res) => {
    res.json({ msg: 'works'});
});


// Get a test by ID
router.get('/gettest/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const test = await Test.findById(id);
        if (!test) {
            return res.status(404).json({ msg: 'Test not found' });
        }


        let tempquestions = test.questions;

        await Promise.all(tempquestions.map(async (question) => {
            let keyName = question.image;
            const command = new AWS.GetObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: keyName
            });

            const signedUrl = await AWSurl.getSignedUrl(s3Client, command);
            question.image = signedUrl;
        }));



        // console.log(test)
        res.json(test);

    } catch (error) {
        console.error('Error fetching test by ID:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Create a new test
router.post('/create', verifyTokenAdmin, async (req, res) => {
    const { name, type, time, subjects, questions, startsAtTime, startsAtDate } = req.body;

    console.log(req.body)
    try {
        const test = new Test({
            name,
            type,
            time,
            startsAtTime,
            startsAtDate,
            subjects,
            status: 'inactive',
            questions,
        });

        await test.save();
        console.log('test created successfully')
        res.json({ msg: 'Test created successfully', test });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});


// get question image

router.post('/get-question-image',verifyToken,  async (req, res) => {
    const { keyName } = req.body;

    console.log(keyName)
    try {


        const command = await new AWS.GetObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: keyName
        })

        const signedUrl = await AWSurl.getSignedUrl(s3Client, command);
        console.log(signedUrl);
        res.json({ url: signedUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error generating signed URL' });
    }
});

// Edit test route
router.put('/edit/:id', verifyTokenAdmin, async (req, res) => {
    const { id } = req.params;
    const { name, type, startsAtDate, startsAtTime, time, subjects, questions, status } = req.body;

    try {
        const test = await Test.findByIdAndUpdate(
            id,
            { name, type, time, subjects, startsAtDate, startsAtTime, questions, status },
            { new: true }
        );

        if (!test) {
            return res.status(404).json({ msg: 'Test not found' });
        }

        res.json({ msg: 'Test updated successfully', test });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// Get the 10 latest tests
router.get('/latest-tests',  verifyToken,async (req, res) => {
    try {
        // Find the user by ID from the decoded token
        const user = await User.findById(req.user.id).select('tests');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Get the test IDs of tests the user has already taken
        const takenTestIds = user.tests.map(test => test.testId.toString());
        console.log("takenTestIds", takenTestIds)

        // Fetch the latest tests, excluding those the user has taken
        const latestTests = await Test.find({ _id: { $nin: takenTestIds  } , status: "active"})
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(latestTests);
    } catch (error) {
        console.error('Error fetching latest tests:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.get('/latest-tests-admin', verifyTokenAdmin, async (req, res) => {
    try {
        
        const latestTests = await Test.find()
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(latestTests);
    } catch (error) {
        console.error('Error fetching latest tests:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});





router.get('/latest-tests-by-category', verifyToken, async (req, res) => {
    const { category } = req.query;

    try {
        // Find the user by ID from the decoded token
        const user = await User.findById(req.user.id).select('tests');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Get the test IDs of tests the user has already taken
        const takenTestIds = user.tests.map(test => test.testId.toString());

        // Fetch the latest tests by category, excluding those the user has taken
        const latestTests = await Test.find({ type: category, _id: { $nin: takenTestIds  }, status: "active" })
            .sort({ createdAt: -1 })
            .limit(10);

        res.json(latestTests);
    } catch (error) {
        console.error('Error fetching latest tests by category:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});




// Search tests by test name (max 5 results)
router.get('/search-tests', verifyToken, async (req, res) => {
    const { name } = req.query;
    try {
        // Find the user by ID from the decoded token
        const user = await User.findById(req.user.id).select('tests');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Get the test IDs of tests the user has already taken
        const takenTestIds = user.tests.map(test => test.testId.toString());

        // Search for tests by name, excluding those the user has taken
        const searchResults = await Test.find({
            name: new RegExp(name, 'i'),
            _id: { $nin: takenTestIds }, status: "active" 
        }).limit(5);

        res.json(searchResults);
    } catch (error) {
        console.error('Error searching tests:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.get('/search-tests-admin', verifyTokenAdmin, async (req, res) => {
    const { name } = req.query;
    try {
        // Find the user by ID from the decoded token
       

        // Search for tests by name, excluding those the user has taken
        const searchResults = await Test.find({
            name: new RegExp(name, 'i'),
        }).limit(5);

        res.json(searchResults);
    } catch (error) {
        console.error('Error searching tests:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});


// Search tests by test name within a specific category (max 5 results)
router.get('/search-tests-by-category', verifyToken, async (req, res) => {
    const { name, category } = req.query;

    try {
        // Find the user by ID from the decoded token
        const user = await User.findById(req.user.id).select('tests');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Get the test IDs of tests the user has already taken
        const takenTestIds = user.tests.map(test => test.testId.toString());

        // Search for tests by name and category, excluding those the user has taken
        const searchResults = await Test.find({
            name: new RegExp(name, 'i'),
            type: category,
            _id: { $nin: takenTestIds }, status: "active" 
        }).limit(5);

        res.json(searchResults);
    } catch (error) {
        console.error('Error searching tests by category:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

// API to update test status
router.put('/update-status/:id', verifyTokenAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    console.log(status)

    try {
        const test = await Test.findById(id);
        if (!test) {
            return res.status(404).json({ msg: 'Test not found' });
        }

        test.status = status;
        await test.save();

        res.json({ msg: 'Test status updated successfully', test });
    } catch (error) {
        console.error('Error updating test status:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;
