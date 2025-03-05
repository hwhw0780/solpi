require('dotenv').config();
const express = require('express');
const { Sequelize, DataTypes } = require('sequelize');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// PostgreSQL Connection
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

// Test Database Connection
async function testConnection() {
    try {
        await sequelize.authenticate();
        console.log('Connected to PostgreSQL database');
    } catch (error) {
        console.error('Unable to connect to the database:', error);
    }
}

testConnection();

// User Model
const User = sequelize.define('User', {
    telegramUsername: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    registrationDate: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    },
    lastActive: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
    },
    miningPower: {
        type: DataTypes.FLOAT,
        defaultValue: 1.0
    },
    totalMined: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active'
    }
});

// Sync Database
sequelize.sync()
    .then(() => console.log('Database synced'))
    .catch(err => console.error('Error syncing database:', err));

// API Routes
// Get all users
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Register new user
app.post('/api/users', async (req, res) => {
    try {
        const { telegramUsername } = req.body;
        
        // Check if user already exists
        const existingUser = await User.findOne({
            where: { telegramUsername }
        });

        if (existingUser) {
            return res.status(400).json({ error: 'User already registered' });
        }

        // Create new user
        const user = await User.create({ telegramUsername });
        res.status(201).json(user);
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
});

// Update user status
app.put('/api/users/:username/status', async (req, res) => {
    try {
        const { username } = req.params;
        const { status } = req.body;

        const user = await User.findOne({
            where: { telegramUsername: username }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({ status });
        res.json(user);
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Error updating user status' });
    }
});

// Update user mining data
app.put('/api/users/:username/mining', async (req, res) => {
    try {
        const { username } = req.params;
        const { miningPower, totalMined } = req.body;

        const user = await User.findOne({
            where: { telegramUsername: username }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        await user.update({
            miningPower,
            totalMined,
            lastActive: new Date()
        });

        res.json(user);
    } catch (error) {
        console.error('Error updating mining data:', error);
        res.status(500).json({ error: 'Error updating mining data' });
    }
});

// Get user by telegram username
app.get('/api/users/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const user = await User.findOne({
            where: { telegramUsername: username }
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Error fetching user' });
    }
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
}); 