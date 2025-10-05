const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Appointment = sequelize.define('Appointment', {
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  }
});

module.exports = Appointment;