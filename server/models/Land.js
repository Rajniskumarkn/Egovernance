const mongoose = require('mongoose');

const LandSchema = new mongoose.Schema({
    landId: {
        type: Number,
        required: true,
        unique: true
    },
    location: {
        type: String,
        required: true
    },
    area: {
        type: Number,
        required: true
    },
    owner: {
        type: String,
        required: true
    },
    price: {
        type: Number,
        default: 0
    },
    pid: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

module.exports = mongoose.model('Land', LandSchema);
