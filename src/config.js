const PORT = process.env.PORT || 5050;

const HOST_WEB = process.env.HOST_WEB ||'http://localhost:8080';

const DB_HOST = process.env.DB_HOST ||'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASSWORD = process.env.DB_PASSWORD;
const DB_NAME = process.env.DB_NAME;
const DB_PORT = process.env.DB_PORT || 3306;

const API_KEY_OPENIA = process.env.API_KEY_OPENIA;

module.exports = {
  PORT,
  DB_HOST,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_PORT,
  HOST_WEB,
  API_KEY_OPENIA
};
