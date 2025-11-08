// Backend/src/models/Category.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Category = sequelize.define('Category', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    comment: 'e.g., Healthcare, Banking, Education'
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'fa-concierge-bell',
    comment: 'e.g., fa-hospital, fa-university'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

module.exports = Category;