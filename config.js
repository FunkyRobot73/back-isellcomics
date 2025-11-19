// config.js  (back.isellcomics.ca)
require('dotenv').config();
const Sequelize = require("sequelize");

const environment = process.env.NODE_ENV || "development";

const database  = process.env.DB_NAME   || 'hamilton_comics';
const username  = process.env.DB_USER   || 'hamilton_carlos';
const password  = process.env.DB_PASS   || '';
const host      = process.env.DB_HOST   || 'localhost';
const type      = 'mariadb';
const port      = Number(process.env.DB_PORT) || 3306;

const databaseOptions = {
  dialect: type,
  host,
  port,
};

// If you really need socketPath in production:
if (environment === 'production' && process.env.DB_SOCKET) {
  databaseOptions.dialectOptions = {
    socketPath: process.env.DB_SOCKET,
  };
}

const config = new Sequelize(database, username, password, databaseOptions);

module.exports = config;
