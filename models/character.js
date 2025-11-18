const Sequelize = require('sequelize');
const config = require('../config');



const Character = config.define('character', {
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
    imageName: {
        type: Sequelize.STRING,
        allowNull: true
    },
    first_appearance: {
         type: Sequelize.STRING,
        allowNull: true
    }
},
{timestamps: true, updatedAt: false}


);

module.exports = Character; 
