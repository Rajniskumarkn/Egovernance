const router = require('express').Router();
const Land = require('../models/Land');

// ADD NEW LAND
router.post('/add', async (req, res) => {
    try {
        console.log("Received land registration request:", req.body);
        const newLand = new Land(req.body);
        const savedLand = await newLand.save();
        console.log("Land saved successfully:", savedLand);
        res.status(200).json(savedLand);
    } catch (err) {
        console.error("Error saving land:", err);
        res.status(500).json(err);
    }
});

// GET ALL LANDS
router.get('/all', async (req, res) => {
    try {
        const lands = await Land.find();
        res.status(200).json(lands);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET USER LANDS
router.get('/my/:address', async (req, res) => {
    try {
        const lands = await Land.find({ owner: req.params.address });
        res.status(200).json(lands);
    } catch (err) {
        res.status(500).json(err);
    }
});

module.exports = router;
