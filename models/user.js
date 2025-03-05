const { DataTypes } = require('sequelize');
const { sequelize } = require('./db');

const User = sequelize.define('User', {
    telegramUsername: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    registrationDate: {
        type: DataTypes.DATE,
        allowNull: false
    },
    lastActive: {
        type: DataTypes.DATE,
        allowNull: false
    },
    miningPower: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 1.0
    },
    totalMined: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active'
    }
});

module.exports = { User }; 