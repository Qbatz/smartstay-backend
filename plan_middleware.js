const connection = require('./config/connection');

function check_plan(hostel_id) {
    
    return new Promise((resolve, reject) => {
        if (!hostel_id) {
            return reject({ statusCode: 201, message: "Missing Hostel Details" });
        }

        const sql = `SELECT hs.id AS hostel_id, hs.Name AS hostel_name,sd.plan_code, sd.plan_start, sd.plan_end, sd.status AS plan_status FROM hosteldetails hs LEFT JOIN (SELECT * FROM subscription_details WHERE status = 1) sd ON hs.id = sd.hostel_id WHERE hs.id = ?;`;
        connection.query(sql, [hostel_id], (err, results) => {
            if (err) {
                return reject({ statusCode: 201, message: "Error fetching hostel plan details" });
            }

            if (results.length === 0) {
                return reject({ statusCode: 404, message: "Hostel not found or no active subscription" });
            }

            const plan_status = results[0].plan_status;

            if (plan_status != 1) {
                return reject({ statusCode: 403, message: "Your plan has expired. Kindly upgrade your plan." });
            }

            // Plan is active
            resolve(results[0]);
        });
    });
}

module.exports = { check_plan };
