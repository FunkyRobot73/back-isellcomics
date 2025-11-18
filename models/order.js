// models/order.js
const { DataTypes } = require('sequelize');
const db = require('../config');

const Order = db.define('order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  session_id: { type: DataTypes.STRING, allowNull: false },

  // Customer info
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING, allowNull: false },

  paymentMethod: { type: DataTypes.STRING, allowNull: false }, // etransfer/paypal/cash/etc.
  pickup: { type: DataTypes.BOOLEAN, defaultValue: false },

  // Money values in USD for now
  subtotal: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  shipping: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: false, defaultValue: 0 },
  currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'CAD' },

  status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'pending' }, // pending|paid|cancelled
}, {
  tableName: 'orders',
  timestamps: true
});

module.exports = Order;
