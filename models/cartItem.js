const Sequelize = require('sequelize');
const config = require('../config');

const CartItem = config.define('cart_item', {
  id: {
    type: Sequelize.INTEGER,
    autoIncrement: true,
    primaryKey: true
  },
  cart_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  comic_id: {
    type: Sequelize.INTEGER,
    allowNull: false
  },
  quantity: {
    type: Sequelize.INTEGER,
    defaultValue: 1,
    validate: {
      min: 1
    }
  }
}, {
  timestamps: false,
  underscored: true,
  tableName: 'cart_items'
});

// Add this association to cartItem.js
CartItem.associate = function(models) {
  CartItem.belongsTo(models.Comic, {
    foreignKey: 'comic_id',
    as: 'comicbook' // Default alias (lowercase model name)
  });
};

module.exports = CartItem;