const mysql = require("mysql");

const dbConfig = require("./db_config");

var conn = mysql.createConnection({
    host: dbConfig.HOST,
    user: dbConfig.USER,
    password: dbConfig.PASSWORD,
    database: dbConfig.DATABASE,
    multipleStatements: dbConfig.multipleStatements
});

module.exports = conn;