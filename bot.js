const TelegramBot = require('node-telegram-bot-api');
const { User } = require('./models/user');
const { checkConnection } = require('./models/db');

// Replace with your bot token
const token = process.env.TELEGRAM_BOT_TOKEN;

// Debug logging function
function debugLog(context, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [${context}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });
debugLog('BOT', 'Telegram bot initialized with polling');

// Store active mining sessions
const activeMiningUsers = new Map();

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

        const miningDuration = (Date.now() - session.startTime) / 1000 / 60; // Duration in minutes
        const baseRate = 0.005; // Base rate in USDT per minute
        const earnings = baseRate * miningDuration * session.miningPower;

        debugLog('EARNINGS', `Calculating earnings for user: ${session.username}`, {
            duration: miningDuration,
            baseRate,
            miningPower: session.miningPower,
            earnings
        });

        // Update user's total mined amount in database
        const user = await User.findOne({ where: { telegramUsername: session.username } });
        if (user) {
            await user.update({
                totalMined: user.totalMined + earnings,
                lastActive: new Date()
            });
            debugLog('DATABASE', `Updated total mined amount for user: ${session.username}`, {
                previousTotal: user.totalMined,
                newTotal: user.totalMined + earnings
            });
        }

        activeMiningUsers.delete(userId);
        debugLog('MINING', `Removed mining session for user: ${session.username}`);

        return {
            duration: miningDuration,
            earnings: earnings
        };
    } catch (error) {
        debugLog('ERROR', `Error in stopMining for userId ${userId}:`, error);
        return null;
    }
}

// Welcome message handler
bot.onText(/\/help/, (msg) => {
    const chatId = msg.chat.id;
    debugLog('COMMAND', 'Help command received', msg);
    
    bot.sendMessage(chatId,
        '🌟 Welcome to SOLPI Mining Bot! 🌟\n\n' +
        'Available commands:\n' +
        '/start - Start mining USDT\n' +
        '/status - Check your mining status\n' +
        '/help - Show this help message\n\n' +
        '💡 Tips:\n' +
        '- Keep this chat open to continue mining\n' +
        '- Solve captchas on our website to boost your mining power\n' +
        '- Visit https://solpi.onrender.com to check your earnings'
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
                `🌐 Visit https://solpi.onrender.com?u=${encodeURIComponent(username)} to:\n` +
                '   - Solve captchas for mining boosts\n' +
                '   - Track your earnings in real-time\n' +
                '   - Withdraw your USDT\n\n' +
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
                `🌐 Visit https://solpi.onrender.com?u=${encodeURIComponent(username)} to:\n` +
                '   - Boost your mining power\n' +
                '   - Track earnings in real-time\n' +
                '   - Withdraw your USDT\n\n' +
                'Available Commands:\n' +
                '/start - Start mining\n' +
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
        if (!['/start', '/status', '/help'].includes(command)) {
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

// Error handler
bot.on('error', (error) => {
    debugLog('ERROR', 'Telegram bot error:', error);
});

// Polling error handler
bot.on('polling_error', (error) => {
    debugLog('POLLING_ERROR', 'Bot polling error occurred', {
        error: error.message,
        stack: error.stack,
        lastPollTime: new Date(lastPollingTime)
    });
});

// Add connection monitoring
let lastPollingTime = Date.now();
const POLLING_TIMEOUT = 30000; // 30 seconds

// Monitor bot connection status
setInterval(() => {
    const currentTime = Date.now();
    const timeSinceLastPoll = currentTime - lastPollingTime;
    
    debugLog('CONNECTION_STATUS', 'Checking bot connection status', {
        lastPollTime: new Date(lastPollingTime),
        currentTime: new Date(currentTime),
        timeSinceLastPoll: timeSinceLastPoll,
        isConnected: timeSinceLastPoll < POLLING_TIMEOUT,
        activeUsers: activeMiningUsers.size
    });

    if (timeSinceLastPoll > POLLING_TIMEOUT) {
        debugLog('CONNECTION_WARNING', 'Bot may be disconnected', {
            lastPollTime: new Date(lastPollingTime),
            timeSinceLastPoll: timeSinceLastPoll
        });
        
        // Attempt to restart polling
        try {
            bot.stopPolling().then(() => {
                debugLog('RECONNECTION', 'Attempting to restart polling');
                bot.startPolling();
            });
        } catch (error) {
            debugLog('RECONNECTION_ERROR', 'Failed to restart polling', {
                error: error.message,
                stack: error.stack
            });
        }
    }
}, 30000); // Check every 30 seconds

// Update last polling time on any bot activity
bot.on('message', () => {
    lastPollingTime = Date.now();
});

// Add periodic database connection check
setInterval(async () => {
    const isConnected = await checkConnection();
    debugLog('DB_CHECK', 'Periodic database connection check', {
        isConnected,
        timestamp: new Date(),
        activeUsers: activeMiningUsers.size
    });
}, 60000); // Check every minute

module.exports = bot; 