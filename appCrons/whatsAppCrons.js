const connection = require('../config/connection')
const nodeCron = require('node-cron')
const moment = require('moment');

async function getWhatsAppIdFromMasterTypesAsync(connection) {
    return new Promise((resolve, reject) => {
        const sql = `
            SELECT id 
            FROM MasterTypes 
            WHERE name = 'WhatsApp' AND content_type = 'notification_type' 
            LIMIT 1
        `;

        connection.query(sql, (err, results) => {
            if (err) return reject(err);
            if (!results.length) return resolve(null);
            resolve(results[0].id);
        });
    });
}

nodeCron.schedule('0 0 * * *', async () => {
    try {
        const todayDate = moment().format("YYYY-MM-DD");
        const todayDay = moment().date();
        const whatsappId = await getWhatsAppIdFromMasterTypesAsync(connection);
        if (!whatsappId) {
            return;
        }

        const sql1 = `
            SELECT 
                rec.*, 
                hs.*, 
                hos.Name AS hostel_name,
                hos.inv_startdate,
                hos.inv_enddate,
                rb.isAutoSend AS autoSend,
                rb.billDeliveryChannels,
                rb.remainderDates,
                CASE 
                    WHEN FIND_IN_SET(?, rb.billDeliveryChannels) > 0 THEN 1 
                    ELSE 0 
                END AS isWhatsAppEnabled
            FROM 
                recuring_inv_details AS rec
            JOIN 
                hostel AS hs ON hs.ID = rec.user_id
            JOIN 
                hosteldetails AS hos ON hos.id = hs.Hostel_Id
            LEFT JOIN 
                RecurringBilling AS rb ON hos.id = rb.hostel_id
            WHERE 
                rec.status = 1 
                AND hs.isActive = 1;
        `;

        connection.query(sql1, [whatsappId], (err, data) => {
            if (err) {
                console.error("SQL Error:", err);
                return;
            }

            if (!data.length) {
                console.log("No data to process in this Cron");
                return;
            }

            data.forEach(inv_data => {
                const reminderDays = inv_data.remainderDates
                    ? inv_data.remainderDates.split(',').map(d => parseInt(d.trim(), 10))
                    : [];

                const isTodayReminder = reminderDays.includes(todayDay);

                const invoiceDate = parseInt(inv_data.inv_startdate);

                if (inv_data.isWhatsAppEnabled && inv_data.autoSend && isTodayReminder) {

                }
            });
        });

    } catch (error) {
    }
});




