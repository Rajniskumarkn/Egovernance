const router = require('express').Router();
const Land = require('../models/Land');
const Transaction = require('../models/Transaction');
const User = require('../models/User'); // [FIX] Import User model
const { exec } = require('child_process');
const path = require('path');

// CLEAR ALL DATA (For Dev Reset)
// CLEAR DATA (With option to keep history)
router.post('/clear-data', async (req, res) => {
    try {
        const { keepHistory } = req.body;
        console.log(`Clearing data... (Keep History: ${keepHistory})`);

        await Land.deleteMany({});
        await User.deleteMany({});

        if (!keepHistory) {
            await Transaction.deleteMany({});
            console.log("History cleared.");
        } else {
            console.log("History preserved.");
        }

        console.log("State (Lands/Users) cleared successfully.");
        res.status(200).json({ message: "Data reset successfully" });
    } catch (err) {
        console.error("Error clearing data:", err);
        res.status(500).json(err);
    }
});

// AUTO-REDEPLOY CONTRACT
router.post('/redeploy', async (req, res) => {
    console.log("Attempting to redeploy contract...");
    const blockchainDir = path.resolve(__dirname, '../../blockchain');

    // Command to run hardhat deploy script
    // Note: We use --network localhost to ensure it deploys to the running node
    const command = `npx hardhat run scripts/deploy.js --network localhost`;

    exec(command, { cwd: blockchainDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Redeploy validation error: ${error.message}`);
            return res.status(500).json({ message: "Deployment Failed", error: error.message, details: stderr });
        }
        if (stderr) {
            console.warn(`Redeploy stderr: ${stderr}`);
        }
        console.log(`Redeploy stdout: ${stdout}`);
        res.status(200).json({ message: "Contract Redeployed Successfully", output: stdout });
    });
});

module.exports = router;
