const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const verifyTokenAdmin = require('../middleware/adminAuth');
const NewsBulletin = require('../model/newsBulletin');

// POST - Create a news bulletin
router.post('/create', verifyTokenAdmin, async (req, res) => {
    const { description } = req.body;

    try {
        const newNewsBulletin = new NewsBulletin({ description });
        await newNewsBulletin.save();
        res.status(201).json(newNewsBulletin);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error creating news bulletin' });
    }
});

// GET - Retrieve all news bulletins
router.get('/', verifyToken, async (req, res) => {
    try {
        const newsBulletins = await NewsBulletin.find().sort({ createdAt: -1 });
        res.json(newsBulletins);
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error retrieving news bulletins' });
    }
});



router.delete('/:id', verifyTokenAdmin, async (req, res) => {
    try {
        const deletedBulletin = await NewsBulletin.findByIdAndDelete(req.params.id);
        if (!deletedBulletin) {
            return res.status(404).json({ msg: 'News bulletin not found' });
        }
        res.json({ msg: 'News bulletin deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ msg: 'Error deleting news bulletin' });
    }
});
module.exports = router;
