const router = require('express').Router();
const Transaction = require('../models/Transaction');

// ADD TRANSACTION
router.post('/add', async (req, res) => {
    try {
        console.log("Adding transaction request received:", req.body);
        const newTx = new Transaction({
            ...req.body,
            user: req.body.user.toLowerCase() // Store lowercase
        });
        const savedTx = await newTx.save();
        console.log("Transaction saved successfully:", savedTx);
        res.status(200).json(savedTx);
    } catch (err) {
        console.error("Error saving transaction:", err);
        res.status(500).json(err);
    }
});

// GET USER TRANSACTIONS
router.get('/my/:user', async (req, res) => {
    try {
        console.log("Fetching transactions for:", req.params.user);
        const txs = await Transaction.find({ user: req.params.user.toLowerCase() }).sort({ createdAt: -1 });
        console.log("Found transactions:", txs.length);
        res.status(200).json(txs);
    } catch (err) {
        console.error("Error fetching transactions:", err);
        res.status(500).json(err);
    }
});

module.exports = router;
