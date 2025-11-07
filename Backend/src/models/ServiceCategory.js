// backend/src/models/ServiceCategory.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ServiceCategory = sequelize.define('ServiceCategory', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'fa-concierge-bell' // A nice default icon
  },
  description: {
    type: DataTypes.STRING
  },
  // This will store sub-services like "Cardiology, Pediatrics, etc."
  subServices: {
    type: DataTypes.TEXT, 
    allowNull: true
  }
});

module.exports = ServiceCategory;