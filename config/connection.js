const mysql = require("mysql2");

const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.HOST_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DATABASE,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    multipleStatements: true
});

module.exports = pool;
