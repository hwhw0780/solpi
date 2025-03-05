require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models/db');
const { User } = require('./models/user');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

// Admin dashboard route
app.get('/admin', (req, res) => {
    res.sendFile(__dirname + '/public/admin.html');
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API routes for user data
app.get('/api/users', async (req, res) => {
    try {
        const users = await User.findAll();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user by Telegram username
app.get('/api/user/:username', async (req, res) => {
    try {
        const user = await User.findOne({
            where: { telegramUsername: req.params.username }
        });
        if (user) {
            res.json(user);
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user mining data
app.post('/api/user/:username/mining', async (req, res) => {
    try {
        const user = await User.findOne({
            where: { telegramUsername: req.params.username }
        });
        if (user) {
            await user.update({
                totalMined: req.body.totalMined,
                lastActive: new Date()
            });
            res.json({ success: true });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Start the server
async function startServer() {
    try {
        // Test database connection with retries
        let connected = false;
        let retries = 5;
        
        while (!connected && retries > 0) {
            try {
                await sequelize.authenticate();
                console.log('Database connection has been established successfully.');
                connected = true;
            } catch (error) {
                console.error('Database connection attempt failed:', error.message);
                retries--;
                if (retries > 0) {
                    console.log(`Retrying connection in 5 seconds... (${retries} attempts remaining)`);
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        if (!connected) {
            throw new Error('Could not connect to the database after multiple attempts');
        }

        // Sync database
        await sequelize.sync();
        console.log('Database synced successfully');

        // Start Express server
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
            console.log('Telegram bot is active');
        });
    } catch (error) {
        console.error('Error starting server:', error);
        process.exit(1);
    }
}

startServer(); 