// --- FINAL UPDATED CODE for backend/src/models/Branch.js ---
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Branch = sequelize.define('Branch', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  location: {
    type: DataTypes.STRING,
    allowNull: false
  },
  // --- ✅ NEW FIELDS ADDED ---
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true, // Can be null initially
    references: {
      model: 'users', // This links to the 'users' table
      key: 'id'
    }
  },
  openingTime: {
    type: DataTypes.TIME,
    defaultValue: '09:00:00'
  },
  closingTime: {
    type: DataTypes.TIME,
    defaultValue: '17:00:00'
  },
  slotDuration: {
    type: DataTypes.INTEGER, // Duration in minutes
    defaultValue: 15
  }
});

module.exports = Branch;