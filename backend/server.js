
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const { pool } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const complaintRoutes = require('./routes/complaintRoutes');
const adminRoutes = require('./routes/adminRoutes');
const commonRoutes = require('./routes/commonRoutes');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', commonRoutes);

// Home route
app.get('/', (req, res) => {
    res.send('Welcome to GrievanceHub Backend!');
});

// Health check API
app.get('/api/health', async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT DATABASE() AS database_name'
        );

        return res.status(200).json({
            success: true,
            message: 'GrievanceHub Backend is running!',
            database: rows[0].database_name
        });

    } catch (error) {
        console.error('Health check failed:', error.message);

        return res.status(500).json({
            success: false,
            message: 'Database connection failed'
        });
    }
});

// Start server
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`GrievanceHub server running on port ${PORT}`);
});
