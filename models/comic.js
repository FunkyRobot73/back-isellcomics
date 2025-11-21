const Sequelize = require('sequelize');
const config = require('../config');

const Comic = config.define('comicbook', {
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        allowNull: false,
        primaryKey: true
    },
    title: {
        type: Sequelize.STRING,
        allowNull: true
    },
    issue: {
        type: Sequelize.STRING,
        allowNull: true
    },
    type: {
        type: Sequelize.STRING,
        allowNull: true
    },
    year: {
        type: Sequelize.STRING,
        allowNull: true
    },
    publisher: {
        type: Sequelize.STRING,
        allowNull: true
    },
    condition: {
        type: Sequelize.STRING,
        allowNull: true
    },
    grade: {
        type: Sequelize.STRING,
        allowNull: true
    },
    key: {
        type: Sequelize.STRING,
        allowNull: true
    },
    description: {
        type: Sequelize.STRING,
        allowNull: true
    },
    characters: {
        type: Sequelize.STRING,
        allowNull: true
    },
    writer: {
        type: Sequelize.STRING,
        allowNull: true
    },
    artist: {
        type: Sequelize.STRING,
        allowNull: true
    },
    image: {
        type: Sequelize.STRING,
        allowNull: true
    },
    plot: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    variant: {
        type: Sequelize.STRING,
        allowNull: true
    },
    coverArtist: {
        type: Sequelize.STRING,
        allowNull: true
    },

    value: {
        type: Sequelize.INTEGER,
    },
    slabbed: {
        type: Sequelize.BOOLEAN,
    },
    short: {
        type: Sequelize.STRING,
        allowNull: true
    },
    isbn: {
        type: Sequelize.STRING,
        allowNull: true
    },
    qty: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    volume: {
        type: Sequelize.STRING,
        allowNull: true
    },
    

}, {
    timestamps: true,
    updatedAt: true
});

module.exports = Comic;