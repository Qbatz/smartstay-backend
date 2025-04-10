const mysql = require("mysql2");

const connection = mysql.createConnection({
    host: process.env.HOST,
    user: process.env.HOST_USER,
    password: process.env.SQL_PASSWORD,
    database: process.env.DATABASE,
    multipleStatements: true
});

connection.connect(err => {
    if (err) {
        console.error("Database connection failed:", err);
    } else {
        console.log("Connected to MySQL database.");
    }
});

module.exports = connection;