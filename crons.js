const nodeCron = require('node-cron')
const moment = require('moment')
const billings = require('./zoho_billing/billings')
const connection = require('./config/connection')

nodeCron.schedule('0 2 * * *', () => {
    // nodeCron.schedule('* * * * * *', () => {
    billings.check_trail_end();
});

nodeCron.schedule('0 2 * * *', () => {
    billings.checkAllSubscriptions();
});

nodeCron.schedule('0 0 * * *', () => {
// nodeCron.schedule('* * * * * *', () => {
    const today = moment().date();

    var sql1 = "SELECT * FROM recuring_inv_details AS rec JOIN hostel AS hs ON hs.ID=rec.user_id WHERE rec.status=1 AND isActive=1";
    connection.query(sql1, function (err, data) {
        if (err) {
            console.log(err);
        } else if (data.length != 0) {

            data.forEach(inv_data => {

                const invoiceDate = parseInt(inv_data.invoice_date, 10); // Convert stored invoice date to a number

                if (invoiceDate === today) {
                    generateInvoiceForDate(inv_data);
                }
            });

        } else {
            console.log("No need to Check in this Cron");
        }
    })

});

function generateInvoiceForDate(inv_data) {
    console.log(inv_data);

    var total_array = [];

    if (inv_data.rent == 1) {

        var checkout_Date = inv_data.CheckoutDate;
        var room_rent = inv_data.RoomRent;
        const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

        const oneDayAmount = room_rent / daysInCurrentMonth;

        if (checkout_Date != null) {

            const totalRent = parseFloat((oneDayAmount * total_days).toFixed(2)); // Total rent rounded to 2 decimal places

            var roundedRent = Math.round(totalRent);
            total_array.push({ key: "room_rent", amount: roundedRent });
        } else {
            total_array.push({ key: "room_rent", amount: room_rent });
        }
    }

    if (inv_data.eb == 1) {

        var sql1 = "SELECT COALESCE(SUM(amount),0) AS eb_amount FROM customer_eb_amount WHERE user_id = '" + inv_data.user_id + "' AND status = 1 AND date BETWEEN DATE_SUB(LAST_DAY(CURDATE()), INTERVAL 1 MONTH) + INTERVAL 1 DAY AND LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH));";
        connection.query(sql1, function (err, eb_data) {
            if (err) {
                console.log("eb error", err);
            } else {
                total_array.push({ key: "eb_amount", amount: eb_data[0].eb_amount });
            }
        })
    }

    if (inv_data.aminity == 1) {

        var sql2 = "SELECT * FROM AmenitiesHistory WHERE user_Id = '" + inv_data.User_Id + "'";

    }

}