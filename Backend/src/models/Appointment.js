// Backend/src/models/Appointment.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Appointment = sequelize.define('Appointment', {
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  branchId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  serviceType: {  // ✅ This is correct
    type: DataTypes.STRING,
    allowNull: false
  },
  appointmentDate: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  timeSlot: {
    type: DataTypes.STRING,
    allowNull: false
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'pending'
  },
  queueNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {  // ✅ ADD THIS FIELD
    type: DataTypes.TEXT,
    allowNull: true
  }
});

module.exports = Appointment;