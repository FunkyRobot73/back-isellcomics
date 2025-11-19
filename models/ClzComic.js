// models/ClzComic.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config'); // or wherever your Sequelize instance is

const ClzComic = sequelize.define('ClzComic', {
  clz_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  issue: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  publisher: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  year: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  story: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'clz_comics',
  timestamps: false,
});

module.exports = ClzComic;
