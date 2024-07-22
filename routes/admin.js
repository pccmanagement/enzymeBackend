const express = require('express');
const bcrypt = require('bcryptjs');
const Admin = require('../model/adminSchema');
const Category = require('../model/categorySchema');
const Subject= require('../model/subjectSchema')
const s3Client = require('../config/aws');
const jwt = require('jsonwebtoken');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const verifyTokenAdmin = require('../middleware/adminAuth');

const Test = require('../model/testSchema'); 
const dotenv = require("dotenv");
const AWS =  require('@aws-sdk/client-s3')
const AWSurl =  require('@aws-sdk/s3-request-presigner')


dotenv.config();



router.get('/test', verifyToken, (req, res) => {
    res.json({ msg: 'Token is valid', user: req.user });
});


// Token verification route
router.post('/verify-token', (req, res) => {
    const token = req.body.token;

    if (!token) {
        return res.status(400).json({ msg: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET_ADMIN);
        res.json({ valid: true });
    } catch (error) {
        res.status(401).json({ msg: 'Invalid or expired token' });
    }
});


// Signup Route
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user already exists
        let user = await Admin.findOne({ email });
        if (user) {
            return res.status(400).json({ msg: 'User already exists' });
        }

        // Create a new user
        user = new Admin({ email, password });

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

        jwt.sign(payload, process.env.JWT_SECRET_ADMIN, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});






// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if the user exists
        let user = await Admin.findOne({ email });
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

        jwt.sign(payload, process.env.JWT_SECRET_ADMIN, { expiresIn: '1h' }, (err, token) => {
            if (err) throw err;
            res.json({ token });
        });

    } catch (err) {
        console.error(err.message);
        res.status(500).send('Server error');
    }
});



router.post('/upload-image', verifyTokenAdmin, async (req, res) => {
    const { fileName, fileType } = req.body;

    // const s3Params = {
    //     Bucket: process.env.AWS_S3_BUCKET,
    //     Key: fileName,
    //     Expires: 60,
    //     ContentType: fileType,
    //     ACL: 'public-read',
    // };

    try {
        // const signedUrl = await s3.getSignedUrlPromise('putObject', s3Params);
        // console.log(signedUrl);
        // res.json({ url: signedUrl });


        const command = await new AWS.PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET,
            Key: fileName,
            ContentType: fileType,
        })

        const signedUrl =await AWSurl.getSignedUrl(s3Client, command);
        console.log(signedUrl);
        res.json({ url: signedUrl });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error generating signed URL' });
    }
});

router.get('/get-all-categories', verifyToken,async (req, res) => {
    try {
        const categories = await Category.find();
        res.json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});


router.post('/create-category', verifyTokenAdmin, async (req, res) => {
    const { name } = req.body;

    try {
        const newCategory = new Category({ name });
        await newCategory.save();
        res.json(newCategory);
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});


router.delete('/delete-category/:id', verifyTokenAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await Category.findByIdAndDelete(id);
        res.json({ msg: 'Category deleted successfully' });
    } catch (error) {
        console.error('Error deleting category:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});



router.get('/get-all-subjects',verifyToken, async (req, res) => {
    try {
        const subjects = await Subject.find();
        res.json(subjects);
    } catch (error) {
        console.error('Error fetching subjects:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.post('/create-subject', verifyTokenAdmin, async (req, res) => {
    const { name } = req.body;

    try {
        const newSubject = new Subject({ name });
        await newSubject.save();
        res.json(newSubject);
    } catch (error) {
        console.error('Error adding subject:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});

router.delete('/delete-subject/:id', verifyTokenAdmin, async (req, res) => {
    const { id } = req.params;

    try {
        await Subject.findByIdAndDelete(id);
        res.json({ msg: 'Subject deleted successfully' });
    } catch (error) {
        console.error('Error deleting subject:', error);
        res.status(500).json({ msg: 'Server error' });
    }
});


router.post('/create', verifyTokenAdmin, async (req, res) => {
    const { name, type, time, subjects, questions } = req.body;


    // console.log(req.body)
    // res.json({ msg: 'Test created successfully' })
    try {
        // Create a new test document
        const test = new Test({
            name,
            type,
            time,
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


module.exports = router;