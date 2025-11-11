const { Sequelize } = require('sequelize');
require('dotenv').config({ path: './src/.env'});

const sequelize = new Sequelize(
  process.env.DB_NAME,    // DB name
  process.env.DB_USER,                   // DB user
  process.env.DB_PASSWORD,            // DB password
  {
    host: process.env.DB_HOST,
    dialect: 'mysql'
  }
);

module.exports = sequelize;