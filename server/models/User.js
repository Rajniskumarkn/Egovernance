const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    fullName: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    walletAddress: {
        type: String,
        default: null
    },
    role: {
        type: String,
        default: 'citizen' // 'citizen' or 'admin'
    }
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
