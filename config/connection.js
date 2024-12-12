const mysql = require("mysql");

let pool;

// Function to initialize or return the existing pool
function getDatabasePool() {
    if (!pool) {
        pool = mysql.createPool({
            host: process.env.HOST,
            user: process.env.HOST_USER,
            password: process.env.PASSWORD,
            database: process.env.DATABASE,
            multipleStatements: true,
            connectTimeout: 10000,
            connectionLimit: 10
        });

        pool.on('connection', (connection) => {
            console.log(`New database connection established`);
        });

        pool.on('error', (err) => {
            console.error('Database pool error:', err.message);
            if (err.code === 'PROTOCOL_CONNECTION_LOST') {
                console.warn('A connection was lost. Pool will handle it automatically.');
            } else if (err.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR') {
                console.error('A fatal error occurred. Restarting pool...');
                pool.end(() => {
                    pool = null; // Reset the pool
                    getDatabasePool(); // Recreate the pool
                });
            } else {
                throw err; // Crash the app for unknown errors
            }
        });
    }
    return pool;
}

module.exports = getDatabasePool();
