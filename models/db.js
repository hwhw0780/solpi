const { Sequelize } = require('sequelize');

// Parse DATABASE_URL safely
let dbHost;
try {
    const dbUrl = new URL(process.env.DATABASE_URL);
    dbHost = dbUrl.hostname;
} catch (err) {
    console.error(`[${new Date().toISOString()}] [DB] Error parsing DATABASE_URL:`, err);
    dbHost = 'unknown';
}

// Create Sequelize instance with explicit configuration
const sequelize = new Sequelize({
    dialect: 'postgres',
    host: dbHost,
    port: 5432,
    database: 'solpi_db',
    username: 'solpi_db_user',
    password: 'BIAAI26BEKJBhtQgeMKM0SxukQhc4NYd',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        },
        keepAlive: true,
        keepAliveInitialDelayMillis: 10000,
        options: {
            encrypt: true
        }
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 120000,
        idle: 20000
    },
    retry: {
        max: 10,
        timeout: 20000,
        match: [
            /ConnectionError/,
            /SequelizeConnectionError/,
            /SequelizeConnectionRefusedError/,
            /SequelizeHostNotFoundError/,
            /SequelizeHostNotReachableError/,
            /SequelizeInvalidConnectionError/,
            /SequelizeConnectionTimedOutError/,
            /TimeoutError/,
            /InvalidConnectionError/,
            "ECONNRESET",
            "ETIMEDOUT",
            "EHOSTUNREACH",
            "EHOSTDOWN",
            "EPIPE",
            "ECONNREFUSED"
        ]
    },
    logging: (msg) => console.log(`[${new Date().toISOString()}] [DB] ${msg}`)
});

// Test the connection with retry logic
async function testConnection() {
    let retries = 10;
    while (retries > 0) {
        try {
            console.log(`[${new Date().toISOString()}] [DB] Attempting to connect to ${dbHost}...`);
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