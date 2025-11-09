// Backend/src/models/Branch.js - UPDATED WITH CATEGORY
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
  // ✅ NEW FIELD: Category to identify what type of branch this is
  category: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'General',
    comment: 'e.g., Hospital, Bank, College, Service Center'
  },
  adminId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
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
    type: DataTypes.INTEGER,
    defaultValue: 15
  }
});

module.exports = Branch;