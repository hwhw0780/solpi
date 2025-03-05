const TelegramBot = require('node-telegram-bot-api');
const { User } = require('./models/user');

// Replace with your bot token
const token = '7589533396:AAEmmM1g-e6r-eQ6YX89AK_OeTb1QYTf2XY';

// Create a bot instance
const bot = new TelegramBot(token, { polling: true });

// Store active mining sessions
const activeMiningUsers = new Map();

// Function to start mining for a user
async function startMining(userId, username) {
    try {
        // Check if user exists in database
        let user = await User.findOne({ where: { telegramUsername: username } });
        
        if (!user) {
            // Create new user if doesn't exist
            user = await User.create({
                telegramUsername: username,
                registrationDate: new Date(),
                lastActive: new Date(),
                miningPower: 1.0,
                totalMined: 0,
                status: 'active'
            });
        }

        // Update last active time
        await user.update({ lastActive: new Date() });

        // Start mining session if not already mining
        if (!activeMiningUsers.has(userId)) {
            activeMiningUsers.set(userId, {
                username,
                startTime: Date.now(),
                miningPower: user.miningPower
            });
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error starting mining:', error);
        return false;
    }
}

// Function to stop mining and calculate earnings
async function stopMining(userId) {
    try {
        const session = activeMiningUsers.get(userId);
        if (!session) return null;

        const miningDuration = (Date.now() - session.startTime) / 1000 / 60; // Duration in minutes
        const baseRate = 0.005; // Base rate in USDT per minute
        const earnings = baseRate * miningDuration * session.miningPower;

        // Update user's total mined amount in database
        const user = await User.findOne({ where: { telegramUsername: session.username } });
        if (user) {
            await user.update({
                totalMined: user.totalMined + earnings,
                lastActive: new Date()
            });
        }

        activeMiningUsers.delete(userId);
        return {
            duration: miningDuration,
            earnings: earnings
        };
    } catch (error) {
        console.error('Error stopping mining:', error);
        return null;
    }
}

// Start command handler
bot.onText(/\/start/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;

    if (!username) {
        bot.sendMessage(chatId, 'Please set a Telegram username to use this bot.');
        return;
    }

    const started = await startMining(chatId, username);
    if (started) {
        bot.sendMessage(chatId, 
            '🚀 Mining started!\n\n' +
            '💰 Base Rate: 0.005 USDT per minute\n' +
            `⚡ Your Mining Power: ${activeMiningUsers.get(chatId).miningPower}x\n\n` +
            'Keep this chat open to continue mining. Use /stop to end mining session.'
        );
    } else {
        bot.sendMessage(chatId, 'You are already mining! Use /stop to end your current session.');
    }
});

// Stop command handler
bot.onText(/\/stop/, async (msg) => {
    const chatId = msg.chat.id;
    const result = await stopMining(chatId);

    if (result) {
        bot.sendMessage(chatId, 
            '⛏ Mining session ended!\n\n' +
            `⏱ Duration: ${result.duration.toFixed(2)} minutes\n` +
            `💰 Earnings: ${result.earnings.toFixed(3)} USDT\n\n` +
            'Use /start to begin a new mining session!'
        );
    } else {
        bot.sendMessage(chatId, 'No active mining session found. Use /start to begin mining!');
    }
});

// Status command handler
bot.onText(/\/status/, async (msg) => {
    const chatId = msg.chat.id;
    const username = msg.from.username;

    try {
        const user = await User.findOne({ where: { telegramUsername: username } });
        if (user) {
            const session = activeMiningUsers.get(chatId);
            const miningStatus = session ? '🟢 Currently Mining' : '🔴 Not Mining';
            const currentEarnings = session ? 
                ((Date.now() - session.startTime) / 1000 / 60 * 0.005 * session.miningPower).toFixed(3) : 
                '0.000';

            bot.sendMessage(chatId,
                '📊 Mining Status\n\n' +
                `Status: ${miningStatus}\n` +
                `Mining Power: ${user.miningPower}x\n` +
                `Total Mined: ${user.totalMined.toFixed(3)} USDT\n` +
                `Current Session: ${currentEarnings} USDT\n\n` +
                'Commands:\n' +
                '/start - Start mining\n' +
                '/stop - Stop mining\n' +
                '/status - View stats'
            );
        } else {
            bot.sendMessage(chatId, 'User not found. Please use /start to begin mining!');
        }
    } catch (error) {
        console.error('Error fetching status:', error);
        bot.sendMessage(chatId, 'Error fetching status. Please try again later.');
    }
});

// Error handler
bot.on('error', (error) => {
    console.error('Telegram bot error:', error);
});

// Polling error handler
bot.on('polling_error', (error) => {
    console.error('Polling error:', error);
});

module.exports = bot; 