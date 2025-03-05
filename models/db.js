const { Sequelize } = require('sequelize');

// Debug logging function
function dbLog(context, message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [DB:${context}] ${message}`);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}

dbLog('CONFIG', 'Initializing database with URL', { url: process.env.DATABASE_URL });

const config = {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        },
        connectTimeout: 60000
    },
    pool: {
        max: 5,
        min: 0,
        acquire: 120000,
        idle: 20000
    },
    logging: (msg) => dbLog('QUERY', msg),
    retry: {
        max: 5,
        backoffBase: 1000,
        backoffExponent: 1.5
    }
};

dbLog('CONFIG', 'Database configuration', config);
const sequelize = new Sequelize(process.env.DATABASE_URL, config);

// Test the connection with retry logic
async function testConnection() {
    let retries = 10;
    while (retries > 0) {
        try {
            dbLog('CONNECT', `Attempting to connect to database (${retries} attempts remaining)`);
            await sequelize.authenticate();
            dbLog('SUCCESS', 'Database connection established successfully');
            return true;
        } catch (err) {
            dbLog('ERROR', 'Connection attempt failed', {
                error: err.message,
                code: err.parent?.code,
                detail: err.parent?.detail,
                retries: retries
            });
            
            retries -= 1;
            if (retries === 0) {
                dbLog('FATAL', 'All connection attempts failed');
                return false;
            }
            
            const delay = Math.min(1000 * Math.pow(2, 10 - retries), 30000);
            dbLog('RETRY', `Waiting ${delay/1000} seconds before next attempt`);
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return false;
}

// Initialize connection
(async () => {
    try {
        dbLog('INIT', 'Starting database initialization');
        const connected = await testConnection();
        if (!connected) {
            dbLog('FATAL', 'Could not establish initial database connection');
            process.exit(1);
        }
        
        // Sync database tables
        try {
            dbLog('SYNC', 'Attempting to sync database tables');
            await sequelize.sync();
            dbLog('SYNC', 'Database tables synced successfully');
        } catch (error) {
            dbLog('SYNC_ERROR', 'Failed to sync database tables', {
                error: error.message,
                type: error.constructor.name
            });
            process.exit(1);
        }
        
        dbLog('READY', 'Database is fully initialized and ready');
    } catch (err) {
        dbLog('FATAL', 'Unexpected error during initialization', {
            error: err.message,
            stack: err.stack,
            type: err.constructor.name
        });
        process.exit(1);
    }
})();

// Export connection status check
async function checkConnection() {
    try {
        await sequelize.authenticate();
        return true;
    } catch (error) {
        dbLog('CHECK', 'Connection check failed', {
            error: error.message,
            timestamp: new Date(),
            type: error.constructor.name
        });
        return false;
    }
}

module.exports = { 
    sequelize,
    checkConnection
}; 