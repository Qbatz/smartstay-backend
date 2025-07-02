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
        const today = moment().startOf('day');
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
                hos.due_date,
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
                console.log("No data to process in this cron job.");
                return;
            }

            data.forEach(inv_data => {
                const remainderBeforeDueDate = inv_data.remainderDates
                    ? inv_data.remainderDates.split(',').map(d => parseInt(d.trim(), 10))
                    : [];

                const dueDay = parseInt(inv_data.due_date, 10);
                const dueDate = moment().date(dueDay); 

                
                if (dueDate.isBefore(today)) {
                    dueDate.add(1, 'month');
                }

                const isTodayReminder = remainderBeforeDueDate.some(reminderDay => {
                    const reminderDate = moment(dueDate).subtract(reminderDay, 'days');
                    return reminderDate.isSame(today, 'day');
                });

                if (inv_data.isWhatsAppEnabled && inv_data.autoSend && isTodayReminder) {
                    console.log(`Trigger WhatsApp reminder for hostel ${inv_data.hostel_name} (ID: ${inv_data.user_id}) - Due Date: ${dueDate.format('YYYY-MM-DD')}`);
                }
            });
        });

    } catch (error) {
        console.error("Cron job error:", error);
    }
});




