const { Sequelize } = require('sequelize');
require('dotenv').config({ path: '../../../.env' });


const sequelize = new Sequelize(
  process.env.DB_NAME,    // DB name
  process.env.DB_USER,                   // DB user
  process.env.DB_PASSWORD,            // DB password
  {
    host: process.env.DB_HOST,
    dialect: 'mysql',
     port: process.env.DB_PORT || 3306
  }
);

module.exports = sequelize;