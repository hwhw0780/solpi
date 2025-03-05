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
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 1.0000,
        get() {
            const value = this.getDataValue('miningPower');
            return value === null ? null : parseFloat(value);
        },
        set(value) {
            this.setDataValue('miningPower', parseFloat(value).toFixed(4));
        }
    },
    totalMined: {
        type: DataTypes.DECIMAL(10, 4),
        allowNull: false,
        defaultValue: 0.0000,
        get() {
            const value = this.getDataValue('totalMined');
            return value === null ? null : parseFloat(value);
        },
        set(value) {
            this.setDataValue('totalMined', parseFloat(value).toFixed(4));
        }
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'active'
    }
});

module.exports = { User }; 