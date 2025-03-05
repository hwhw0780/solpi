require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { sequelize } = require('./models/db');
const { User } = require('./models/user');
const bot = require('./bot');

const app = express();
const PORT = process.env.PORT || 3000;

// Debug logging function
function serverLog(context, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [SERVER:${context}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Serve static files from root directory
app.use(express.static(path.join(__dirname)));

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

// Serve index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start the server
async function startServer() {
    try {
        // Test database connection with retries
        let connected = false;
        let retries = 5;
        
        while (!retries > 0) {
            try {
                await sequelize.authenticate();
                serverLog('DATABASE', 'Connection established successfully');
                connected = true;
                break;
            } catch (error) {
                serverLog('DATABASE_ERROR', 'Connection attempt failed', {
                    error: error.message,
                    retriesLeft: retries
                });
                retries--;
                if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 5000));
                }
            }
        }

        if (!connected) {
            throw new Error('Could not connect to the database after multiple attempts');
        }

        // Sync database
        await sequelize.sync();
        serverLog('DATABASE', 'Database synced successfully');

        // Start Express server
        app.listen(PORT, () => {
            serverLog('START', `Server running on port ${PORT}`);
            serverLog('BOT', 'Telegram bot is active');
        });
    } catch (error) {
        serverLog('FATAL', 'Error starting server', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

startServer(); 