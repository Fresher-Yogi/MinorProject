// --- UPDATED CODE for src/models/user.js ---
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
    defaultValue: 'user' 
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'approved'
  },
  
  // ✅ NEW FIELDS FOR OTP VERIFICATION
  otp: {
    type: DataTypes.STRING,
    allowNull: true,
    comment: 'Temporary OTP for email verification'
  },
  otpExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiration time for the OTP'
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    comment: 'Whether the user has successfully verified their email'
  },

  // ✅ NEW FIELDS FOR PASSWORD RESET
  resetToken: {
    type: DataTypes.STRING(500),
    allowNull: true,
    comment: 'Hashed password reset token'
  },
  resetTokenExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    comment: 'Expiration time for the password reset token'
  }
}, {
  tableName: 'users',
  timestamps: true, // This will add createdAt and updatedAt automatically
  indexes: [
    {
      fields: ['email']
    },
    {
      fields: ['role']
    },
    {
      fields: ['resetToken']
    }
  ]
});

module.exports = User;