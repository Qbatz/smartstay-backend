const mysql = require("mysql");

let conn;

function handleDisconnect() {
    conn = mysql.createConnection({
        host: process.env.HOST,
        user: process.env.HOST_USER,
        password: process.env.PASSWORD,
        database: process.env.DATABASE,
        multipleStatements: true
    }); 
    console.log('Database Details:', process.env.HOST, process.env.HOST_USER, process.env.PASSWORD, process.env.DATABASE);

    conn.connect((err) => {
        if (err) {
            console.error('Error connecting to database:', err.message);
            setTimeout(handleDisconnect, 2000);
        }
    });

    conn.on('error', (err) => {
        console.error('Database error:', err.message);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

handleDisconnect();

module.exports = conn;