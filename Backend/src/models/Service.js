// Backend/src/models/Service.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Service = sequelize.define('Service', {
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    comment: 'e.g., Cardiology Consultation, Dental Check-up'
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
  // The `categoryId` field will be added automatically by Sequelize
  // when we define the association in server.js.
});

module.exports = Service;