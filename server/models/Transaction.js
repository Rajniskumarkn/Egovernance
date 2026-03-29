const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema({
    type: {
        type: String, // 'LAND_REGISTRATION', 'FUND_REQUEST'
        required: true
    },
    details: {
        type: String, // e.g., "Registered Land at Location X"
        required: true
    },
    amount: {
        type: Number,
        default: 0
    },
    userClass: {
        type: String, // 'Citizen', 'Admin'
        default: 'Citizen'
    },
    status: {
        type: String, // 'Success', 'Pending', 'Failed'
        default: 'Success'
    },
    user: {
        type: String, // Wallet Address or Email
        required: true
    }
}, { timestamps: true });

module.exports = mongoose.model('Transaction', TransactionSchema);
