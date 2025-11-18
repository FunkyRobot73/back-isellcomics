const Sequelize = require('sequelize');
const config = require('../config');

const Stock = config.define('stock', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    symbol: {
        type: Sequelize.STRING,
        allowNull: false
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    date_purchased: {
        type: Sequelize.STRING,
        allowNull: true
    },
    price_bought_CAD: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    price_sold_CAD: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    price_bought_US: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    price_sold_US: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    date_sold: {
        type: Sequelize.STRING,
        allowNull: true
    },
    CAN_US_Rate_bought: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    US_CAN_Rate_bought: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    CAN_US_Rate_sold: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    US_CAN_Rate_sold: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    notes: {
        type: Sequelize.STRING,
        allowNull: true
    },
    amount: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    today: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    active: {
        type: Sequelize.STRING,
        allowNull: true
    },

},
{timestamps: true, updatedAt: false}
);

module.exports = Stock; 