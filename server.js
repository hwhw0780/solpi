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

// Webhook endpoint for Telegram bot
app.post('/webhook/' + process.env.TELEGRAM_BOT_TOKEN, async (req, res) => {
    try {
        serverLog('WEBHOOK', 'Received update from Telegram', {
            update_id: req.body.update_id,
            message_id: req.body.message?.message_id,
            chat_id: req.body.message?.chat?.id,
            type: req.body.message ? 'message' : 'other'
        });

        if (!bot.processUpdate) {
            throw new Error('Bot instance is not properly initialized');
        }

        await bot.processUpdate(req.body);
        res.sendStatus(200);
    } catch (error) {
        serverLog('WEBHOOK_ERROR', 'Error handling webhook update', {
            error: error.message,
            stack: error.stack,
            body: req.body
        });
        
        // Send 200 status even on error to prevent Telegram from retrying
        // as per Telegram Bot API best practices
        res.sendStatus(200);
        
        // Try to reinitialize the bot if there's an initialization error
        if (error.message === 'Bot instance is not properly initialized') {
            serverLog('WEBHOOK_RECOVERY', 'Attempting to reinitialize bot');
            try {
                await bot.deleteWebHook();
                const webhookUrl = 'https://solpi.onrender.com/webhook/' + process.env.TELEGRAM_BOT_TOKEN;
                await bot.setWebHook(webhookUrl, {
                    max_connections: 40,
                    drop_pending_updates: true
                });
                serverLog('WEBHOOK_RECOVERY', 'Bot reinitialization successful');
            } catch (reinitError) {
                serverLog('WEBHOOK_RECOVERY_ERROR', 'Failed to reinitialize bot', {
                    error: reinitError.message,
                    stack: reinitError.stack
                });
            }
        }
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date(),
        activeMiningUsers: bot.activeMiningUsers ? bot.activeMiningUsers.size : 0
    });
});

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
        
        while (!connected && retries > 0) {
            try {
                serverLog('DATABASE', `Attempting database connection (${retries} attempts remaining)`);
                await sequelize.authenticate();
                serverLog('DATABASE', 'Connection established successfully');
                connected = true;

                // Sync database
                serverLog('DATABASE', 'Attempting to sync database tables');
                await sequelize.sync();
                serverLog('DATABASE', 'Database synced successfully');
            } catch (error) {
                serverLog('DATABASE_ERROR', 'Connection attempt failed', {
                    error: error.message,
                    code: error.original?.code,
                    detail: error.original?.detail,
                    retriesLeft: retries
                });

                retries--;
                if (retries > 0) {
                    const delay = (6 - retries) * 5000; // Increasing delay with each retry
                    serverLog('DATABASE', `Waiting ${delay/1000} seconds before next attempt`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }

        if (!connected) {
            throw new Error('Could not connect to the database after multiple attempts');
        }

        // Start Express server
        app.listen(PORT, () => {
            serverLog('START', `Server running on port ${PORT}`);
            serverLog('BOT', 'Telegram bot is active');
        });
    } catch (error) {
        serverLog('FATAL', 'Error starting server', {
            error: error.message,
            stack: error.stack,
            type: error.constructor.name
        });
        
        // Wait a bit before exiting to ensure logs are written
        await new Promise(resolve => setTimeout(resolve, 1000));
        process.exit(1);
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    serverLog('UNCAUGHT_EXCEPTION', 'An uncaught exception occurred', {
        error: error.message,
        stack: error.stack,
        type: error.constructor.name
    });
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
    serverLog('UNHANDLED_REJECTION', 'An unhandled promise rejection occurred', {
        reason: reason?.message || reason,
        stack: reason?.stack,
        type: reason?.constructor.name
    });
});

startServer(); 