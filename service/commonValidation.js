
const connection = require("../config/connection");

async function isValidHostelAndPurchaseDate(hostel_id, purchase_date) {
    return new Promise((resolve) => {
        if (!hostel_id || !purchase_date) {
            console.warn("Missing hostel_id or purchase_date");
            return resolve(false);
        }

        const sql = "SELECT * FROM hosteldetails WHERE id=? AND isActive=1";
        connection.query(sql, [hostel_id], (err, results) => {
            if (err) {
                console.error("SQL Error:", err);
                return resolve(false);
            }

            if (results.length === 0) {
                console.warn("No hostel found with that ID");
                return resolve(false);
            }

            const created_date = new Date(results[0].create_At);
            const pur_date = new Date(purchase_date);

            console.log("Created Date:", created_date);
            console.log("Purchase Date:", pur_date);

            if (pur_date >= created_date) {
                return resolve(true);
            } else {
                return resolve(false);
            }
        });
    });
}


async function isValidPurchaseDateForAsset(asset_id, purchase_date) {
    return new Promise((resolve) => {
        if (!asset_id || !purchase_date) return resolve(false);

        const sql = "SELECT * FROM assets WHERE id=?";
        connection.query(sql, [asset_id], (err, results) => {
            if (err || results.length === 0) return resolve(false);

            const created_date = new Date(results[0].createdat);
            const pur_date = new Date(purchase_date);
            if (pur_date >= created_date) {
                resolve(true);
            } else {
                resolve(false);
            }
        });
    });
}

module.exports = {
    isValidHostelAndPurchaseDate,isValidPurchaseDateForAsset
};