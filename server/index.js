const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('MongoDB Connected'))
    .catch(err => {
        console.error("MongoDB Connection Failed:", err.message);
        if (err.message.includes('whitelisted')) {
            console.error(">>> ACTION REQUIRED: Go to MongoDB Atlas > Network Access > Add IP Address > Add Current IP Address");
        }
    });

// Routes (Placeholders)
app.get('/', (req, res) => {
    res.send('E-Governance API Running');
});

// Import Routes
const authRoutes = require('./routes/auth');
const landRoutes = require('./routes/land');
const transactionRoutes = require('./routes/transaction');

app.use('/api/auth', authRoutes);
app.use('/api/land', landRoutes);
app.use('/api/transaction', transactionRoutes);
app.use('/api/admin', require('./routes/admin'));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
