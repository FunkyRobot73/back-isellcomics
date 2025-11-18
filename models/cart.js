const Sequelize = require('sequelize');
const config = require('../config');

const Cart = config.define('cart', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  session_id: {
    type: Sequelize.STRING,
    allowNull: false,
    unique: true
  },
  user_id: {
    type: Sequelize.INTEGER,
    allowNull: true
  }
}, {
  timestamps: true, // createdAt and updatedAt
  underscored: true, // Uses snake_case for fields
  tableName: 'carts', // Explicit table name
  indexes: [
    {
      unique: true,
      fields: ['session_id']
    }
  ]
});

// Define associations (alternative method)
Cart.associate = function(models) {
  Cart.hasMany(models.CartItem, {
    foreignKey: 'cart_id',
    as: 'items'
  });
};

module.exports = Cart;