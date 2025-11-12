// Backend/src/models/Appointment.js - FULLY UPDATED

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
  serviceId: { // This field should exist from our previous changes
    type: DataTypes.INTEGER,
    allowNull: true // Or false depending on your logic, but linking to Service is key
  },
  serviceType: {
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
    defaultValue: 'pending' // Can be: pending, completed, cancelled
  },
  queueNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  // ✅ NEW FIELD TO PREVENT SENDING DUPLICATE REMINDERS
  reminderSent: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    allowNull: false
  }
});

module.exports = Appointment;