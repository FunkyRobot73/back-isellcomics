// models/orderItem.js
const { DataTypes } = require('sequelize');
const db = require('../config');

const OrderItem = db.define('order_item', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  comic_id: { type: DataTypes.INTEGER, allowNull: false },

  title: { type: DataTypes.STRING, allowNull: false },
  issue: { type: DataTypes.STRING },
  qty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  line_total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },

  image: { type: DataTypes.STRING }
}, {
  tableName: 'order_items',
  timestamps: true
});

module.exports = OrderItem;
