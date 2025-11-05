// const { DataTypes } = require('sequelize');
// const sequelize = require('../config/db');

// const Appointment = sequelize.define('Appointment', {
//   status: {
//     type: DataTypes.STRING,
//     defaultValue: 'pending'
//   }
// });

// module.exports = Appointment;


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
    defaultValue: 'pending'
  },
  queueNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
});

module.exports = Appointment;