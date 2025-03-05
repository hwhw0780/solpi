const TelegramBot = require('node-telegram-bot-api');
const { User } = require('./models/user');
const { checkConnection } = require('./models/db');

// Debug logging function
function debugLog(context, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${context}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// Bot configuration
const token = process.env.TELEGRAM_BOT_TOKEN;
const options = {
    webHook: {
        host: '0.0.0.0',
        port: process.env.PORT || 3000
    }
};

// Create a bot instance without starting webhook server (we'll use Express)
const bot = new TelegramBot(token, { polling: false });
debugLog('BOT', 'Telegram bot instance created');

// Store active mining sessions
const activeMiningUsers = new Map();

// Function to calculate and save mining progress
async function updateMiningProgress() {
    try {
        debugLog('UPDATE_PROGRESS', `Updating mining progress for ${activeMiningUsers.size} active users`);
        
        for (const [userId, session] of activeMiningUsers.entries()) {
            try {
                const miningDuration = (Date.now() - session.startTime) / 1000 / 60; // Duration in minutes
                const baseRate = 0.005; // Base rate in USDT per minute
                const earnings = baseRate * miningDuration * session.miningPower;

                // Get user from database
                const user = await User.findOne({ where: { telegramUsername: session.username } });
                if (user) {
                    // Update total mined amount
                    await user.update({
                        totalMined: user.totalMined + earnings,
                        lastActive: new Date()
                    });

                    // Reset session start time to avoid double counting
                    session.startTime = Date.now();
                    activeMiningUsers.set(userId, session);

                    debugLog('PROGRESS_SAVED', `Updated mining progress for user: ${session.username}`, {
                        userId,
                        earnings,
                        newTotal: user.totalMined + earnings,
                        timestamp: new Date()
                    });
                }
            } catch (error) {
                debugLog('UPDATE_ERROR', `Failed to update progress for user: ${session.username}`, {
                    error: error.message,
                    userId
                });
            }
        }
    } catch (error) {
        debugLog('UPDATE_PROGRESS_ERROR', 'Error updating mining progress', {
            error: error.message,
            stack: error.stack
        });
    }
}

// Update mining progress every minute
setInterval(updateMiningProgress, 60000);

// Check database connection before processing commands
async function ensureDatabaseConnection(chatId) {
    try {
        const isConnected = await checkConnection();
        if (!isConnected) {
            debugLog('DB_ERROR', 'Database connection is not available');
            bot.sendMessage(chatId,
                '❌ Service Temporarily Unavailable\n\n' +
                'We are experiencing technical difficulties.\n' +
                'Please try again in a few minutes.'
            );
            return false;
        }
        return true;
    } catch (error) {
        debugLog('DB_ERROR', 'Error checking database connection', {
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

// Function to start mining for a user
async function startMining(userId, username) {
    try {
        debugLog('START_MINING', `Starting mining process for user: ${username}`, { userId, timestamp: new Date() });

        if (!username) {
            debugLog('ERROR', 'No username provided', { userId });
            return false;
        }

        // Check database connection first
        if (!(await ensureDatabaseConnection(userId))) {
            return false;
        }

        // Check if user exists in database
        debugLog('DATABASE', `Looking up user in database: ${username}`);
        let user = await User.findOne({ where: { telegramUsername: username } });
        
        if (!user) {
            debugLog('REGISTRATION', `User ${username} not found in database. Creating new user...`, {
                userId,
                timestamp: new Date(),
                action: 'new_user_creation'
            });

            try {
                user = await User.create({
                    telegramUsername: username,
                    registrationDate: new Date(),
                    lastActive: new Date(),
                    miningPower: 1.0,
                    totalMined: 0,
                    status: 'active'
                });
                debugLog('REGISTRATION_SUCCESS', `Successfully created new user: ${username}`, {
                    userId,
                    userData: user,
                    timestamp: new Date()
                });
            } catch (error) {
                debugLog('REGISTRATION_ERROR', `Failed to create user: ${username}`, {
                    error: error.message,
                    stack: error.stack,
                    userId
                });
                throw error;
            }
        } else {
            debugLog('USER_FOUND', `Existing user found: ${username}`, {
                userId,
                lastActive: user.lastActive,
                miningPower: user.miningPower
            });
        }

        // Update last active time
        try {
            await user.update({ lastActive: new Date() });
            debugLog('UPDATE', `Updated last active time for user: ${username}`, {
                userId,
                timestamp: new Date()
            });
        } catch (error) {
            debugLog('UPDATE_ERROR', `Failed to update last active time for user: ${username}`, {
                error: error.message,
                userId
            });
        }

        // Start mining session if not already mining
        if (!activeMiningUsers.has(userId)) {
            const sessionData = {
                username,
                startTime: Date.now(),
                miningPower: user.miningPower
            };
            activeMiningUsers.set(userId, sessionData);
            debugLog('MINING_START', `New mining session created for user: ${username}`, {
                userId,
                sessionData,
                timestamp: new Date()
            });
            return true;
        }

        debugLog('MINING_ACTIVE', `User ${username} already has an active mining session`, {
            userId,
            existingSession: activeMiningUsers.get(userId)
        });
        return false;
    } catch (error) {
        debugLog('CRITICAL_ERROR', `Critical error in startMining for user ${username}`, {
            error: error.message,
            stack: error.stack,
            userId
        });
        return false;
    }
}

// Function to stop mining and calculate earnings
async function stopMining(userId) {
    try {
        const session = activeMiningUsers.get(userId);
        debugLog('STOP_MINING', `Attempting to stop mining for userId: ${userId}`, session);

        if (!session) {
            debugLog('STOP_MINING', `No active session found for userId: ${userId}`);
            return null;
        }

        // Save final progress before stopping
        await updateMiningProgress();

        activeMiningUsers.delete(userId);
        debugLog('MINING', `Removed mining session for user: ${session.username}`);

        // Get final totals from database
        const user = await User.findOne({ where: { telegramUsername: session.username } });
        return {
            duration: (Date.now() - session.startTime) / 1000 / 60,
            totalMined: user ? user.totalMined : 0
        };
    } catch (error) {
        debugLog('ERROR', `Error in stopMining for userId ${userId}:`, error);
        return null;
    }
}

// Function to send dashboard button
function sendDashboardButton(chatId, username) {
    const button = {
        reply_markup: {
            inline_keyboard: [[
                {
                    text: '🌐 Open Mining Dashboard',
                    url: `https://solpi.onrender.com?u=${encodeURIComponent(username)}`
                }
            ]]
        }
    };
    bot.sendMessage(chatId, '📱 Click below to access your mining dashboard:', button);
}

// Open command handler
bot.onText(/\/open/, (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    debugLog('COMMAND', 'Open command received', { chatId, username });
    
    if (!username) {
        bot.sendMessage(chatId, '⚠️ You need to set a Telegram username first!');
        return;
    }
    
    sendDashboardButton(chatId, username);
});

// Welcome message handler
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    debugLog('COMMAND', 'Help command received', msg);
    
    bot.sendMessage(chatId,
        '🌟 Welcome to SOLPI Mining Bot! 🌟\n\n' +
        'Available commands:\n' +
        '/start - Start mining USDT\n' +
        '/status - Check your mining status\n' +
        '/open - Open mining dashboard\n' +
        '/help - Show this help message\n\n' +
        '💡 Tips:\n' +
        '- Keep this chat open to continue mining\n' +
        '- Solve captchas on the dashboard to boost your mining power\n' +
        '- Track your earnings and withdraw USDT from the dashboard'
    );
});

// Start command handler
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    debugLog('COMMAND', 'Start command received', {
        chatId,
        username,
        messageData: msg,
        timestamp: new Date()
    });

    // Check database connection first
    if (!(await ensureDatabaseConnection(chatId))) {
        return;
    }

    if (!username) {
        debugLog('USERNAME_MISSING', 'User has no username set', {
            chatId,
            userId: msg.from.id,
            firstName: msg.from.first_name
        });
        bot.sendMessage(chatId, 
            '⚠️ Username Required\n\n' +
            'To use SOLPI Mining Bot, you need to set a Telegram username.\n\n' +
            'How to set a username:\n' +
            '1. Go to Telegram Settings\n' +
            '2. Tap on your profile\n' +
            '3. Tap "Username"\n' +
            '4. Set a username\n' +
            '5. Come back and try /start again'
        );
        return;
    }

    try {
        debugLog('START_ATTEMPT', `Attempting to start mining for user: ${username}`, {
            chatId,
            timestamp: new Date()
        });

        const started = await startMining(chatId, username);
        
        if (started) {
            debugLog('START_SUCCESS', `Successfully started mining for user: ${username}`, {
                chatId,
                miningPower: activeMiningUsers.get(chatId).miningPower
            });

            bot.sendMessage(chatId, 
                '🚀 Mining Started Successfully!\n\n' +
                '💰 Base Rate: 0.005 USDT per minute\n' +
                `⚡ Your Mining Power: ${activeMiningUsers.get(chatId).miningPower.toFixed(4)}x\n\n` +
                '📱 Keep this chat open to continue mining\n' +
                '💡 Use /open to access your mining dashboard\n' +
                'Use /status to check your mining progress'
            );
        } else {
            debugLog('START_FAILED', `Failed to start mining for user: ${username}`, {
                chatId,
                reason: 'Already mining or error occurred'
            });

            bot.sendMessage(chatId, 
                '⚠️ Mining Already Active\n\n' +
                'You have an active mining session.\n' +
                'Use /status to check your progress'
            );
        }
    } catch (error) {
        debugLog('START_ERROR', `Error in start command handler for user: ${username}`, {
            error: error.message,
            stack: error.stack,
            chatId
        });

        bot.sendMessage(chatId,
            '❌ Error Starting Mining\n\n' +
            'There was an error starting your mining session.\n' +
            'Please try again later or contact support.'
        );
    }
});

// Status command handler
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    debugLog('COMMAND', 'Status command received', {
        chatId,
        username,
        timestamp: new Date()
    });

    // Check database connection first
    if (!(await ensureDatabaseConnection(chatId))) {
        return;
    }

    try {
        const user = await User.findOne({ where: { telegramUsername: username } });
        debugLog('STATUS', `Fetching status for user: ${username}`, user);

        if (user) {
            const session = activeMiningUsers.get(chatId);
            const miningStatus = session ? '🟢 Currently Mining' : '🔴 Not Mining';
            const currentEarnings = session ? 
                ((Date.now() - session.startTime) / 1000 / 60 * 0.005 * session.miningPower).toFixed(3) : 
                '0.000';

            bot.sendMessage(chatId,
                '📊 Mining Status Report\n\n' +
                `Status: ${miningStatus}\n` +
                `⚡ Mining Power: ${user.miningPower.toFixed(4)}x\n` +
                `💰 Total Mined: ${user.totalMined.toFixed(3)} USDT\n` +
                `📈 Current Session: ${currentEarnings} USDT\n\n` +
                'Available Commands:\n' +
                '/start - Start mining\n' +
                '/open - Open mining dashboard\n' +
                '/help - Show all commands'
            );
        } else {
            debugLog('STATUS', `User not found: ${username}`);
            bot.sendMessage(chatId, 
                '⚠️ User Not Registered\n\n' +
                'You haven\'t started mining yet.\n' +
                'Use /start to begin your mining journey!'
            );
        }
    } catch (error) {
        debugLog('ERROR', `Error in status command for user ${username}:`, error);
        bot.sendMessage(chatId, 
            '❌ Error Fetching Status\n\n' +
            'There was an error fetching your status.\n' +
            'Please try again later or contact support.'
        );
    }
});

// Generic message handler for unrecognized commands
bot.on('message', (msg) => {
    if (msg.text && msg.text.startsWith('/')) {
        const command = msg.text.split(' ')[0];
        if (!['/start', '/status', '/help', '/open'].includes(command)) {
            debugLog('COMMAND', `Unknown command received: ${command}`, msg);
            bot.sendMessage(msg.chat.id,
                '❓ Unknown Command\n\n' +
                'Available commands:\n' +
                '/start - Start mining\n' +
                '/status - Check mining status\n' +
                '/help - Show all commands'
            );
        }
    }
});

// Initialize bot with webhook
async function initializeBot() {
    try {
        debugLog('INIT', 'Starting bot initialization');
        
        // Remove any existing webhook
        await bot.deleteWebHook();
        
        // Set the webhook with the correct URL
        const webhookUrl = 'https://solpi.onrender.com/webhook/' + token;
        const result = await bot.setWebHook(webhookUrl);
        
        if (result) {
            debugLog('WEBHOOK', `Webhook successfully set to: ${webhookUrl}`);
        } else {
            throw new Error('Failed to set webhook');
        }
        
        // Verify webhook
        const webhookInfo = await bot.getWebHookInfo();
        debugLog('WEBHOOK_INFO', 'Current webhook status:', webhookInfo);
        
        return true;
    } catch (error) {
        debugLog('INIT_ERROR', 'Failed to initialize bot', {
            error: error.message,
            stack: error.stack
        });
        return false;
    }
}

// Cleanup function for graceful shutdown
async function cleanup() {
    debugLog('CLEANUP', 'Starting bot cleanup process');
    try {
        // Save final mining progress
        await updateMiningProgress();
        
        // Remove webhook
        await bot.deleteWebHook();
        
        debugLog('CLEANUP', 'Bot cleanup completed successfully');
        process.exit(0);
    } catch (error) {
        debugLog('CLEANUP_ERROR', 'Error during cleanup', {
            error: error.message,
            stack: error.stack
        });
        process.exit(1);
    }
}

// Initialize the bot
initializeBot().then(success => {
    if (success) {
        debugLog('INIT', 'Bot successfully initialized');
        
        // Set up cleanup handlers
        process.on('SIGTERM', cleanup);
        process.on('SIGINT', cleanup);
    } else {
        debugLog('FATAL', 'Bot initialization failed');
        process.exit(1);
    }
});

// Error handler
bot.on('error', (error) => {
    debugLog('ERROR', 'Telegram bot error:', error);
});

// Webhook error handler
bot.on('webhook_error', (error) => {
    debugLog('WEBHOOK_ERROR', 'Webhook error occurred', {
        error: error.message,
        stack: error.stack
    });
});

// Add periodic health check
setInterval(async () => {
    try {
        const webhookInfo = await bot.getWebHookInfo();
        debugLog('HEALTH_CHECK', 'Webhook status', {
            url: webhookInfo.url,
            hasCustomCertificate: webhookInfo.has_custom_certificate,
            pendingUpdateCount: webhookInfo.pending_update_count,
            lastErrorDate: webhookInfo.last_error_date,
            lastErrorMessage: webhookInfo.last_error_message,
            maxConnections: webhookInfo.max_connections,
            timestamp: new Date()
        });

        // If webhook is not set, try to set it again
        if (!webhookInfo.url) {
            debugLog('WEBHOOK_RECOVERY', 'Webhook URL is empty, attempting to set it again');
            await initializeBot();
        }
    } catch (error) {
        debugLog('HEALTH_CHECK_ERROR', 'Failed to get webhook info', {
            error: error.message,
            stack: error.stack
        });
    }
}, 60000);

// Export the bot instance
module.exports = bot; 