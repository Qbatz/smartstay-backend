
const connection = require("../config/connection");
const moment = require('moment');                   

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

    
             const createdDate = moment(results[0].create_At).format('YYYY-MM-DD');
            const purchaseDate = moment(purchase_date).format('YYYY-MM-DD');

            console.log("Created Date:", createdDate);
            console.log("Purchase Date:", purchaseDate);

            if (purchaseDate >= createdDate) {
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
             const created_date = moment(results[0].createdat).format('YYYY-MM-DD');
            const pur_date = moment(purchase_date).format('YYYY-MM-DD');                       
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