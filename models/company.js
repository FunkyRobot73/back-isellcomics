const Sequelize = require('sequelize');
const config = require('../config');



const Company = config.define('company', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    name: {
        type: Sequelize.STRING,
        allowNull: false
    },
    image: {
        type: Sequelize.STRING,
        allowNull: true
    },
},
{timestamps: true, updatedAt: false}


);

module.exports = Company; 
