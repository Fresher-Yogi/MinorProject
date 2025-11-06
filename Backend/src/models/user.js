const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user' // By default, anyone who registers is a 'user'
  },
  
  // --- ✅ NEW FIELD ADDED ---
  // This field will track the status of an admin's account
  status: {
    type: DataTypes.STRING,
    // For normal users, the status will always be 'approved'.
    // For admins, it can be 'pending_approval', 'approved', or 'rejected'.
    defaultValue: 'approved'
  }
  // --- ✅ END OF NEW FIELD ---

}, {
  tableName: 'users' // This ensures Sequelize uses your existing 'users' table
});

module.exports = User;