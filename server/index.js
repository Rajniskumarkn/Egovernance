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
    .then(async () => {
        console.log('MongoDB Connected');
        await seedAdmin();
    })
    .catch(err => {
        console.error("MongoDB Connection Failed:", err.message);
        if (err.message.includes('whitelisted')) {
            console.error(">>> ACTION REQUIRED: Go to MongoDB Atlas > Network Access > Add IP Address > Add Current IP Address");
        }
    });

const User = require('./models/User');
const bcrypt = require('bcrypt');

async function seedAdmin() {
    try {
        const adminEmail = 'admin@egov.com';
        const existingAdmin = await User.findOne({ email: adminEmail });
        if (!existingAdmin) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash('admin', salt);
            const newAdmin = new User({
                email: adminEmail,
                fullName: 'System Admin',
                password: hashedPassword,
                role: 'admin'
            });
            await newAdmin.save();
            console.log('Default Admin Seeded:', adminEmail, '/ admin');
        } else {
            console.log('Admin already exists.');
        }
    } catch (error) {
        console.error("Error seeding admin:", error);
    }
}

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
