const mysql = require("mysql");

const dbConfig = require("./db_config");

// var conn = mysql.createConnection({
//     host: dbConfig.HOST,
//     user: dbConfig.USER,
//     password: dbConfig.PASSWORD,
//     database: dbConfig.DATABASE,
//     multipleStatements: dbConfig.multipleStatements
// });
let conn;

function handleDisconnect() {
    conn = mysql.createConnection({
        host: dbConfig.HOST,
        user: dbConfig.USER,
        password: dbConfig.PASSWORD,
        database: dbConfig.DATABASE,
        multipleStatements: dbConfig.multipleStatements
    });

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

// // Example function to execute queries
// function executeQuery(query, params, callback) {
//     conn.query(query, params, (queryErr, results) => {
//         if (queryErr) {
//             console.error('Error executing query:', queryErr.message);
//             callback(queryErr, null); // Handle query error
//             return;
//         }
//         callback(null, results); // Return results
//     });
// }




module.exports = conn;