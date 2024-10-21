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

    var sql1 = "SELECT * FROM recuring_inv_details WHERE status=1";
    connection.query(sql1, function (err, data) {
        if (err) {
            console.log(err);
        } else if (data.length != 0) {

            data.forEach(inv_data => {

                const invoiceDate = parseInt(inv_data.invoice_date, 10); // Convert stored invoice date to a number
                if (invoiceDate === today) {
                    generateInvoiceForDate(today, inv_data);
                }else{
                    console.log("-----------------");
                    
                }
            });

        } else {
            console.log("No need to Check in this Cron");
        }
    })

});

function generateInvoiceForDate(date, inv_data) {
    console.log(`Generating invoice for the date: ${date}`);
    console.log(inv_data);
    // Add your invoice generation logic here
}