const TelegramBot = require('node-telegram-bot-api');
const { User } = require('./models/user');

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

// Function to start mining for a user
async function startMining(userId, username) {
    try {
        debugLog('START_MINING', `Attempting to start mining for user: ${username}`, { userId });

        // Check if user exists in database
        let user = await User.findOne({ where: { telegramUsername: username } });
        debugLog('DATABASE', `User lookup result for ${username}:`, user);
        
        if (!user) {
            debugLog('REGISTRATION', `Creating new user: ${username}`);
            // Create new user if doesn't exist
            user = await User.create({
                telegramUsername: username,
                registrationDate: new Date(),
                lastActive: new Date(),
                miningPower: 1.0,
                totalMined: 0,
                status: 'active'
            });
            debugLog('REGISTRATION', 'New user created successfully:', user);
        }

        // Update last active time
        await user.update({ lastActive: new Date() });
        debugLog('UPDATE', `Updated last active time for user: ${username}`);

        // Start mining session if not already mining
        if (!activeMiningUsers.has(userId)) {
            const sessionData = {
                username,
                startTime: Date.now(),
                miningPower: user.miningPower
            };
            activeMiningUsers.set(userId, sessionData);
            debugLog('MINING', `Started new mining session for user: ${username}`, sessionData);
            return true;
        }
        debugLog('MINING', `User ${username} is already mining`);
        return false;
    } catch (error) {
        debugLog('ERROR', `Error in startMining for user ${username}:`, error);
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
    debugLog('COMMAND', 'Start command received', msg);

    if (!username) {
        debugLog('ERROR', 'User has no username', msg.from);
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

    const started = await startMining(chatId, username);
    if (started) {
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
        bot.sendMessage(chatId, 
            '⚠️ Mining Already Active\n\n' +
            'You have an active mining session.\n' +
            'Use /status to check your progress'
        );
    }
});

// Status command handler
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;
    debugLog('COMMAND', 'Status command received', msg);

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
    debugLog('ERROR', 'Polling error:', error);
});

// Connection status check
setInterval(() => {
    debugLog('HEALTH', `Bot health check - Active sessions: ${activeMiningUsers.size}`);
}, 300000); // Every 5 minutes

module.exports = bot; 