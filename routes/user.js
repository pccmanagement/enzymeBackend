const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../model/userSchema');
const Category = require('../model/categorySchema');
const Test = require('../model/testSchema');
const Verification = require('../model/verificationModel');

const jwt = require('jsonwebtoken');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const AWS = require('@aws-sdk/client-s3')
const AWSurl = require('@aws-sdk/s3-request-presigner')
const s3Client = require('../config/aws');
const dotenv = require("dotenv");
const verifyTokenAdmin = require('../middleware/adminAuth');
const nodemailer = require('nodemailer');


dotenv.config();

const mailer = async (recieveremail, code) => {
    let transporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        post: 587,
        secure: false,
        requireTLS: true,
        auth: {
            user: process.env.COMPANY_EMAIL,
            pass: process.env.GMAIL_APP_PASSWORD
        }
    })


    let info = await transporter.sendMail({
        from: "Team PCC",
        to: recieveremail,
        subject: "OTP for PCC",
        text: "Your OTP is " + code,
        html: "<b>Your OTP is " + code + "</b>",

    })

    console.log("Message sent: %s", info.messageId);

    if (info.messageId) {
        return true;
    }
    return false;
}

router.get('/test', verifyToken, (req, res) => {
    res.json({ msg: 'Token is valid', user: req.user });
});

router.get('/latest-users', verifyTokenAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .sort({ createdAt: -1 }) // Sort by creation date, descending
            .limit(10); // Limit to 10 results

        res.json(users);
    } catch (error) {
        console.error('Error fetching latest users:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

router.get('/user-by-email/:email', verifyTokenAdmin, async (req, res) => {
    try {
        const { email } = req.params;

        // Find user by email
        const user = await User.findOne({ email }).select('-password');

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user by email:', error);
        res.status(500).json({ msg: 'Server error', error: error.message });
    }
});

// Token verification route
router.post('/verify-token', (req, res) => {
    const token = req.body.token;

    if (!token) {
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        res.json({ valid: true });
    } catch (error) {
        res.status(401).json({ msg: 'Invalid or expired token' });
    }
});


router.post('/sendotp', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ msg: "Email is required" })
    }
    try {
        await Verification.deleteMany({ email: email })
        const code = Math.floor(100000 + Math.random() * 900000);

        const isSent = await mailer(email, code);


        const newVerification = new Verification({
            email: email,
            code: code
        })

        await newVerification.save();

        if (!isSent) {
            console.log(isSent);

            return res.status(500).json({ msg: "Internal server error" })
        }

        return res.status(200).json({ msg: "OTP sent successfully" })
    }
    catch (err) {
        console.log(err);

        return res.status(500).json({ msg: "Internal server error" })
    }

})


// Signup Route
router.post('/signup', async (req, res) => {
    const { name, email, otp, password } = req.body;

    if (!name || !email || !password || !otp) {
        return res.status(400).json({ msg: 'All Fields are required' });
    }

    if (password.length < 6) {
        return res.status(400).json({ msg: 'Password should be atleast 6 characters long' });
    }

    try {
        // Check if the user already exists
        let user = await User.findOne({ email });
        let verificationQueue = await Verification.findOne({ email: email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }
        if (!verificationQueue) {

            return res.status(400).json({ msg: 'Please send otp first' });
        }

        const isMatch = await bcrypt.compare(otp, verificationQueue.code);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid OTP' });
        }
        // Create a new user
        user = new User({ name, email, password });

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();

        // Generate JWT token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.post('/changepassword', async (req, res) => {
    try {
        const { email, otp, password } = req.body;
        if (!email || !password || !otp) {
            return res.status(400).json({ msg: 'All Fields are required' });
        }

        if (password.length < 6) {
            return res.status(400).json({ msg: 'Password should be atleast 6 characters long' });
        }

        let user = await User.findOne({ email: email });
        let verificationQueue = await Verification.findOne({ email: email });


        if (!user) {
            return res.status(400).json({ msg: "User doesn't exist" });
        }
        if (!verificationQueue) {

            return res.status(400).json({ msg: 'Please send otp first' });
        }


        const isMatch = await bcrypt.compare(otp, verificationQueue.code);

        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid OTP' });
        }


        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);

        await user.save();
        await Verification.deleteOne({ email: email });
        return res.status(200).json({ msg: 'Password changed successfully' });
    }
    catch (err) {
        return res.status(500).json({ msg: 'Server error' });
    }
})

router.get('/get-all-categories', verifyToken, async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});



// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        let user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Check if the password is correct
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ msg: 'Invalid credentials' });
        }

        // Generate JWT token
        const payload = {
            user: {
                id: user.id
            }
        };

        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1y' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



// Get user data from token
router.get('/get-user-data', verifyToken, async (req, res) => {
    console.log('calling user data', req.user)
    try {
        // Find the user by ID from the decoded token
        const user = await User.findById(req.user.id).populate('subscription').select('-password').select('-tests'); // Exclude the password field

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user data:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});


router.post('/savetesttouser', verifyToken, async (req, res) => {
    const { testId, answers, timeStarted, marks, totalMarks } = req.body;
    try {
        // Find the user by ID from the decoded token
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }
        const timeSubmited = new Date().toISOString();

        // Add the test data to the user's record
        user.tests.push({ testId, answers, timeStarted, timeSubmited, marks, totalMarks });
        const savedUser = await user.save();
        const savedTest = savedUser.tests[savedUser.tests.length - 1];

        // Find the test and update the givenBy array
        const test = await Test.findById(testId);
        if (!test) {
            return res.status(404).json({ msg: 'Test not found' });
        }

        test.givenBy.push({
            userId: user._id,
            userName: user.name,
            userEmail: user.email,
            timeStarted,
            timeSubmited,
            marks,
            totalMarks
        });

        await test.save();

        res.json({ msg: 'Test data saved successfully', usertestid: savedTest._id });
    } catch (error) {
        console.error('Error saving test data:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.get('/getusertests', verifyToken, async (req, res) => {
    try {
        // Find the user by ID from the decoded token
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Extract test details
        const userTests = await Promise.all(user.tests.map(async (test) => {
            const testDetails = await Test.findById(test.testId).select('name');
            return {
                testId: test.testId,
                testName: testDetails ? testDetails.name : "Unknown Test",
                dateOfExam: test.timeSubmited,
                marks: test.marks,
                totalMarks: test.totalMarks
            };
        }));

        res.json(userTests);
    } catch (error) {
        console.error('Error fetching user tests:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});


router.get('/getusertestbyid', verifyToken, async (req, res) => {
    console.log('test called')
    try {
        const { id } = req.query;

        if (!id) {
            return res.status(400).json({ msg: 'Test ID is required' });
        }

        // Find the user by ID from the decoded token
        const user = await User.findById(req.user.id);

        if (!user) {
            return res.status(404).json({ msg: 'User not found' });
        }

        // Find the specific test in the user's tests array
        const userTest = user.tests.find(test => test.testId.toString() === id);

        if (!userTest) {
            return res.status(404).json({ msg: 'Test not found for this user' });
        }

        // Fetch the test details from the Test collection
        const testDetails = await Test.findById(userTest.testId).lean();

        if (!testDetails) {
            return res.status(404).json({ msg: 'Test details not found' });
        }

        //    console.log('testDetails ', testDetails);
        //    console.log('userTest ',userTest);
        let combinedDetails = {
            ...testDetails, // Spread the testDetails object
            questions: testDetails.questions.map(question => {
                // Find the corresponding user answer for each question
                const userAnswer = userTest.answers.find(answer => answer._id.toString() === question._id.toString());
                return {
                    ...question, // Spread the question object
                    userAnswer: userAnswer ? userAnswer.userAnswer : null // Add userAnswer if available
                };
            }),
            timeStarted: userTest.timeStarted,
            timeSubmited: userTest.timeSubmited,
            marks: userTest.marks,
            totalMarks: userTest.totalMarks,
            userTestId: userTest._id
        };

        let tempquestions = combinedDetails.questions;

        await Promise.all(tempquestions.map(async (question) => {
            let keyName = question.image;
            const command = new AWS.GetObjectCommand({
                Bucket: process.env.AWS_S3_BUCKET,
                Key: keyName
            });

            const signedUrl = await AWSurl.getSignedUrl(s3Client, command);
            question.image = signedUrl;
        }));


        combinedDetails.questions = tempquestions;


        console.log("combined details ", combinedDetails)


        res.json(combinedDetails);
    } catch (error) {
        console.error('Error fetching user test details:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

module.exports = router;