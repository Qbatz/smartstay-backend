const mysql = require("mysql2");

const pool = mysql.createPool({
    host: process.env.HOST,
    user: process.env.HOST_USER,
    password: process.env.PASSWORD,
    database: process.env.DATABASE,
    waitForConnections: true,
    connectionLimit: 10,  // Allow 10 concurrent connections
    queueLimit: 0,
    multipleStatements: true
});

module.exports = pool; // Use async/await for queries