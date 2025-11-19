// config.js  (back.isellcomics.ca) – safe version, no hard-coded password

const Sequelize = require("sequelize");

const environment = process.env.NODE_ENV || "production";

// These MUST be set via environment on the server
const database = process.env.DB_NAME || 'hamilton_comics';
const username = process.env.NEW_USERNAME || '';
const password = process.env.NEW_PASS || ''; // leave blank by default
const host     = process.env.DB_HOST || 'localhost';
const type     = 'mariadb';
const port     = Number(process.env.DB_PORT) || 3306;

const databaseOptions = {
  dialect: type,
  host,
  port,
};

if (environment === 'production' && process.env.DB_SOCKET) {
  databaseOptions.dialectOptions = {
    socketPath: process.env.DB_SOCKET,
  };
}

const config = new Sequelize(database, username, password, databaseOptions);

module.exports = config;
