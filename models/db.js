const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        },
        keepAlive: true
    },
    pool: {
        max: 3,
        min: 0,
        acquire: 60000,
        idle: 10000
    },
    retry: {
        max: 3,
        timeout: 5000
    },
    logging: false
});

// Test the connection with retry logic
async function testConnection() {
    let retries = 5;
    while (retries > 0) {
        try {
            await sequelize.authenticate();
            console.log('Database connection established successfully.');
            return true;
        } catch (err) {
            console.error('Database connection attempt failed:', err.message);
            retries -= 1;
            if (retries === 0) {
                console.error('All connection attempts failed.');
                return false;
            }
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

testConnection();

module.exports = { sequelize }; 