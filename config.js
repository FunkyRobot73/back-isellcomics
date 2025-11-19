// config.js (back.isellcomics.ca) – simple version without dotenv

const environment = process.env.NODE_ENV || "development";

let host;
let database;
let username;
let password;
let type;
let port;

if (environment === 'production') {
  host = 'localhost';

  database = 'hamilton_comics';
  username = 'hamilton_carlos';
  password = 'funky2gogo!';

  type = 'mariadb';
  port = 3306;

} else {
  host = 'localhost';

  database = 'hamilton_comics';
  username = 'hamilton_carlos';
  password = 'funky2gogo!';

  type = 'mariadb';
  port = 3306;
}

const Sequelize = require("sequelize");

const databaseOptions = {
  dialect: type,
  host: host
};

if (environment === 'production') {
  databaseOptions.dialectOptions = {
    socketPath: host,
  };
}

const config = new Sequelize(database, username, password, databaseOptions);

module.exports = config;
