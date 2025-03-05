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
    logging: (msg) => dbLog('QUERY', msg)
});

// Test the connection with retry logic
async function testConnection() {
    let retries = 10;
    while (retries > 0) {
        try {
            dbLog('CONNECT', `Attempting to connect to database (${retries} attempts remaining)`);
            await sequelize.authenticate();
            dbLog('SUCCESS', 'Database connection established successfully');
            
            // Sync database tables
            dbLog('SYNC', 'Attempting to sync database tables');
            await sequelize.sync();
            dbLog('SYNC', 'Database tables synced successfully');
            
            return true;
        } catch (err) {
            dbLog('ERROR', 'Connection attempt failed', {
                error: err.message,
                code: err.parent?.code,
                detail: err.parent?.detail
            });
            
            if (err.original) {
                dbLog('ERROR_DETAIL', 'Original error details', {
                    code: err.original.code,
                    detail: err.original.detail,
                    where: err.original.where
                });
            }
            
            retries -= 1;
            if (retries === 0) {
                dbLog('FATAL', 'All connection attempts failed');
                return false;
            }
            
            const delay = (11 - retries) * 10000;
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
        dbLog('READY', 'Database is fully initialized and ready');
    } catch (err) {
        dbLog('FATAL', 'Unexpected error during initialization', {
            error: err.message,
            stack: err.stack
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
            timestamp: new Date()
        });
        return false;
    }
}

module.exports = { 
    sequelize,
    checkConnection
}; 