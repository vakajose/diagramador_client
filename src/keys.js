//dir de la db

const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = require('./config.js');

module.exports = {
  database: {
    connectionLimit: 1000,
    host: DB_HOST,  
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD, 
    database: DB_NAME
  }
}