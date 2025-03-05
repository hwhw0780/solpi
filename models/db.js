const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 120000,
        idle: 20000
    },
    logging: (msg) => console.log(`[${new Date().toISOString()}] [DB] ${msg}`)
});

// Test the connection with retry logic
async function testConnection() {
    let retries = 10;
    while (retries > 0) {
        try {
            console.log(`[${new Date().toISOString()}] [DB] Attempting to connect to database...`);
            await sequelize.authenticate();
            console.log(`[${new Date().toISOString()}] [DB] Connection established successfully.`);
            return true;
        } catch (err) {
            console.error(`[${new Date().toISOString()}] [DB] Connection attempt failed:`, err.message);
            if (err.original) {
                console.error(`[${new Date().toISOString()}] [DB] Original error:`, err.original);
            }
            retries -= 1;
            if (retries === 0) {
                console.error(`[${new Date().toISOString()}] [DB] All connection attempts failed.`);
                return false;
            }
            const delay = (11 - retries) * 10000; // Increasing delay with each retry
            console.log(`[${new Date().toISOString()}] [DB] Retrying connection in ${delay/1000} seconds... (${retries} attempts remaining)`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
}

// Initialize connection
(async () => {
    try {
        const connected = await testConnection();
        if (!connected) {
            console.error(`[${new Date().toISOString()}] [DB] Could not establish initial database connection.`);
            process.exit(1);
        }
    } catch (err) {
        console.error(`[${new Date().toISOString()}] [DB] Unexpected error during initialization:`, err);
        process.exit(1);
    }
})();

module.exports = { sequelize }; 