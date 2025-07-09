const connection = require('../config/connection')
const nodeCron = require('node-cron')
const moment = require('moment');
const request = require('request');
const fs = require('fs');
const path = require('path');
const AWS = require('aws-sdk');
const paymentInvoice = require('../InvoicePdfDesign/paymentInvoice');
const paymentInvoiceSecurity = require('../InvoicePdfDesign/paymentInvoiceSecurity');
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();

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

                let start_day = parseInt(inv_data.inv_startdate, 10) || 1;
                const lastMonth = moment().subtract(1, 'months');
                const inv_startdate = lastMonth.date(start_day).format("YYYY-MM-DD");
                const inv_enddate = moment(inv_startdate).add(30, 'days').format("YYYY-MM-DD");
            
                if (inv_data.isWhatsAppEnabled && inv_data.autoSend && isTodayReminder) {
                    console.log(`Trigger WhatsApp reminder for hostel ${inv_data.hostel_name} (ID: ${inv_data.user_id}) - Due Date: ${dueDate.format('YYYY-MM-DD')}`);
                    generateInvoiceForDate(inv_data, inv_startdate, inv_enddate);
                }
            });
        });

    } catch (error) {
        console.error("Cron job error:", error);
    }
});

function generateInvoiceForDate(inv_data, inv_startdate, inv_enddate) {

    var total_array = [];

    var currentdate = moment().format('YYYY-MM-DD');

    var sql1 = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND action='recuring' AND invoice_status=1 AND Date=?";

    connection.query(sql1, [inv_data.user_id, currentdate], async function (err, data) {
        if (err) {
            console.log(err);
        } else if (data.length != 0) {
            const existing = data[0];

            if (existing.invoicePDF && existing.invoicePDF.trim() !== "") {
                console.log("Invoice already exists. Fetching existing PDF...");

                const existingPDFs = data
                    .filter(row => row.invoicePDF && row.invoicePDF.trim() !== "")
                    .map(row => ({
                        invoice_id: row.Invoices,
                        pdf_url: row.invoicePDF,
                        amount: row.Amount,
                        date: row.Date,
                        user_id: row.User_Id,
                    }));

                console.log("existing_pdf---->" + existingPDFs)
            } else {
                // try {

                //     const room_rent = inv_data.RoomRent;
                //     var hostel_id = inv_data.Hostel_Id;
                //     var string_userid = inv_data.User_Id;

                //     const startDate = new Date(inv_startdate);
                //     const endDate = new Date(inv_enddate);
                //     const joiningDate = new Date(inv_data.joining_Date);

                //     if (isNaN(startDate) || isNaN(endDate) || isNaN(joiningDate)) {
                //         console.log("Invalid date provided.");
                //     }

                //     const effectiveStartDate = startDate < joiningDate ? joiningDate : startDate;

                //     if (effectiveStartDate > endDate) {
                //         console.log("Amount is 0");
                //     }

                //     const total_days = Math.max((endDate - effectiveStartDate) / (1000 * 60 * 60 * 24) + 1, 0);

                //     const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
                //     const oneDayAmount = room_rent / daysInMonth;

                //     const totalRent = Math.round(oneDayAmount * total_days);

                //     total_array.push({ key: "room_rent", amount: totalRent });

                //     let eb_start_date
                //     let eb_end_date
                //     let eb_unit_amount

                //     const ebAmount = await new Promise((resolve, reject) => {
                //         var sql2 = "SELECT * FROM eb_settings WHERE hostel_id=? AND status=1";
                //         connection.query(sql2, [hostel_id], function (err, sql2_res) {
                //             if (err) {
                //                 console.log("EB Settings Query Error:", err);
                //                 return reject(err);
                //             }

                //             const today = moment();
                //             const lastMonth = moment().subtract(1, "months");

                //             let start_day = parseInt(sql2_res[0]?.start_date, 10) || 1;
                //             let end_day = parseInt(sql2_res[0]?.end_date, 10) || lastMonth.endOf("month").date();

                //             if (sql2_res[0]?.end_date && end_day < today.date()) {
                //                 end_day = parseInt(sql2_res[0]?.end_date, 10);
                //                 start_day = parseInt(sql2_res[0]?.start_date, 10) || 1;
                //             }

                //             eb_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
                //             eb_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");

                //             eb_unit_amount = sql2_res[0]?.amount || 0

                //             if (sql2_res[0]?.recuring == 0) {
                //                 resolve(0);
                //             } else {
                //                 var sql1 = `SELECT COALESCE(SUM(amount), 0) AS eb_amount FROM customer_eb_amount WHERE user_id = ? AND status = 1 AND date BETWEEN ? AND ?;`;
                //                 connection.query(sql1, [inv_data.user_id, eb_start_date, eb_end_date], function (err, eb_data) {
                //                     if (err) {
                //                         return reject(err);
                //                     }
                //                     resolve(eb_data[0].eb_amount || 0);
                //                 });
                //             }
                //         });
                //     });

                //     total_array.push({ key: "eb_amount", amount: ebAmount });
                //     console.log("Total EB Amount:", ebAmount);
                //     console.log("eb_start_date:", eb_start_date);
                //     console.log("eb_end_date :", eb_end_date);

                //     var am_amounts = await new Promise((resolve, reject) => {
                //         var sql3 = "SELECT * FROM Amenities AS am JOIN AmnitiesName AS amname ON amname.id=am.Amnities_Id WHERE am.Status=1 AND am.Hostel_Id=?;";
                //         connection.query(sql3, [hostel_id], function (err, sql3_res) {
                //             if (err) {
                //                 console.log("EB Settings Query Error:", err);
                //                 return reject(err);
                //             }

                //             let amenityPromises = sql3_res.map((amenity) => {
                //                 return new Promise((resolveAmenity, rejectAmenity) => {
                //                     if (amenity.recuring == 0) {
                //                         return resolveAmenity(null);
                //                     }

                //                     const lastMonth = moment().subtract(1, "months");
                //                     const nextMonth = moment();

                //                     let start_day = parseInt(amenity.startdate, 10) || 1;
                //                     let end_day = parseInt(amenity.enddate, 10) || lastMonth.endOf("month").date();

                //                     const lastMonthDays = lastMonth.daysInMonth();
                //                     start_day = Math.min(Math.max(start_day, 1), lastMonthDays);
                //                     end_day = Math.min(Math.max(end_day, start_day), lastMonthDays);

                //                     let am_start_date, am_end_date;

                //                     if (amenity.startdate && amenity.startdate === amenity.enddate) {
                //                         am_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
                //                         am_end_date = nextMonth.date(end_day).format("YYYY-MM-DD");
                //                     } else {
                //                         am_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
                //                         am_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");
                //                     }

                //                     const sql1 = `
                //                     SELECT am.Amount, amname.Amnities_Name 
                //                     FROM Amenities AS am 
                //                     JOIN AmnitiesName AS amname ON amname.id = am.Amnities_Id 
                //                     JOIN AmenitiesHistory AS ahis ON ahis.amenity_Id = am.id 
                //                     WHERE ahis.user_Id = ? 
                //                     AND ahis.status = 1 
                //                     AND ahis.created_At BETWEEN ? AND ? 
                //                     AND am.Status = 1
                //                     AND NOT EXISTS (
                //                         SELECT 1 FROM AmenitiesHistory ahis2 
                //                         WHERE ahis2.amenity_Id = am.id 
                //                         AND ahis2.status = 0 
                //                         AND ahis2.created_At < ?
                //                     );
                //                 `;

                //                     connection.query(sql1, [string_userid, am_start_date, am_end_date, am_end_date], function (err, sql1_res) {
                //                         if (err) {
                //                             return rejectAmenity(err);
                //                         }
                //                         console.log("SQL Result:", sql1_res);
                //                         resolveAmenity(sql1_res);
                //                     });
                //                 });
                //             });

                //             Promise.all(amenityPromises)
                //                 .then((results) => {
                //                     const filteredResults = results.flat().filter(result => result !== null);

                //                     console.log("All Amenity Queries Completed:", filteredResults);

                //                     filteredResults.forEach(item => {
                //                         total_array.push({ key: item.Amnities_Name, amount: item.Amount });
                //                     });

                //                     resolve(filteredResults);
                //                 })
                //                 .catch((error) => {
                //                     console.error("Error in Amenity Processing:", error);
                //                     reject(error);
                //                 });
                //         });
                //     });

                //     const totalAmount = total_array.reduce((sum, item) => sum + item.amount, 0);

                //     console.log("Total Amount:", totalAmount);

                //     if (totalAmount > 0) {
                //         const invoice_id = await new Promise((resolve, reject) => {
                //             const options = {
                //                 url: process.env.BASEURL + '/get_invoice_id',
                //                 method: "POST",
                //                 headers: { "Content-Type": "application/json" },
                //                 body: JSON.stringify({ user_id: inv_data.user_id })
                //             };

                //             request(options, (error, response, body) => {
                //                 if (error) {
                //                     return reject(error);
                //                 } else {
                //                     const result = JSON.parse(body);
                //                     console.log(result);

                //                     if (result.statusCode == 200) {
                //                         resolve(result.invoice_number);
                //                     } else {
                //                         resolve([]);
                //                     }
                //                 }
                //             });
                //         })

                //         const currentDate = moment().format('YYYY-MM-DD');

                //         let today = moment();
                //         let dueDay = parseInt(inv_data.due_date);

                //         let dueDate = moment().set('date', dueDay);

                //         if (today.date() > dueDay) {
                //             dueDate.add(1, 'month');
                //         }

                //         var due_date = dueDate.format('YYYY-MM-DD')

                //         var sql2 = "INSERT INTO invoicedetails (Name,phoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,UserAddress,DueDate,Date,Invoices,Status,User_Id,Bed,BalanceDue,PaidAmount,action,invoice_type,hos_user_id,rec_invstartdate,rec_invenddate,rec_ebstartdate,rec_ebenddate,rec_ebunit) VALUES (?)";
                //         var params = [inv_data.Name, inv_data.Phone, inv_data.Email, inv_data.HostelName, inv_data.Hostel_Id, inv_data.Floor, inv_data.Rooms, totalAmount, inv_data.Address || "Not Provided", due_date, currentDate, invoice_id,
                //             'Pending', string_userid, inv_data.Bed, totalAmount, 0, 'recuring', 1, inv_data.user_id, inv_startdate, inv_enddate, eb_start_date, eb_end_date, eb_unit_amount
                //         ]

                //         connection.query(sql2, [params], function (err, ins_data) {
                //             if (err) {
                //                 console.log("Add Invoice Error", err);
                //             } else {

                //                 var inv_id = ins_data.insertId;

                //                 if (total_array && total_array.length > 0) {
                //                     var amenityValues = total_array.map(item => [item.key, inv_data.user_id, item.amount, inv_id]);

                //                     var sql3 = "INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES ?";
                //                     connection.query(sql3, [amenityValues], function (err) {
                //                         if (err) {
                //                             console.log("Error inserting amenity details:", err);
                //                         } else {
                //                             console.log("Invoice and Amenities Added Successfully");
                //                             var sql1 = "SELECT inv.*,man.*,hsv.email_id AS hostel_email,hsv.hostel_PhoneNo AS hostel_phone,hsv.area AS harea,hsv.landmark AS hlandmark,hsv.pin_code AS hpincode, hsv.state AS hstate,hsv.city AS hcity,hsv.Address AS hostel_address,hsv.profile AS hostel_profile,hs.Address AS user_address,hs.area AS uarea,hs.landmark AS ulandmark,hs.pincode AS upincode, hs.state AS ustate,hs.city AS ucity,hs.joining_Date,Insett.bankingId,Insett.privacyPolicyHtml,ban.acc_num,ban.ifsc_code,ban.acc_name,ban.upi_id FROM invoicedetails AS inv JOIN hostel AS hs ON hs.ID=inv.hos_user_id LEFT JOIN manual_invoice_amenities AS man ON man.invoice_id=inv.id JOIN hosteldetails AS hsv ON hsv.id=inv.Hostel_Id LEFT JOIN InvoiceSettings AS Insett ON Insett.hostel_Id=hsv.id LEFT JOIN bankings AS ban ON ban.id=Insett.bankingId WHERE inv.id=? limit 1";
                //                             connection.query(sql1, [inv_id], async function (err, inv_data) {
                //                                 if (!err && inv_data.length != 0) {
                //                                     const currentDate = moment().format('YYYY-MM-DD');
                //                                     const currentMonth = moment(currentDate).month() + 1;
                //                                     const currentYear = moment(currentDate).year();
                //                                     const currentTime = moment().format('HHmmss');

                //                                     const filename = `INV${currentMonth}${currentYear}${currentTime}${inv_data[0].User_Id}.pdf`;
                //                                     const outputPath = path.join(__dirname, filename);

                //                                     const pdfPath = await generateManualPDF(inv_data, outputPath, filename, "action");

                //                                     connection.query("UPDATE invoicedetails SET invoicePDF = ? WHERE id = ?", [pdfPath, inv_id], function (err) {
                //                                         if (err) {
                //                                             console.error("Error updating invoicePDF column:", err);
                //                                         } else {
                //                                             console.log("invoicePDF column updated successfully");
                //                                         }
                //                                     });
                //                                 }
                //                             })
                //                         }
                //                     });
                //                 } else {
                //                     console.log("Invoice Added Successfully (No Amenities)");
                //                 }

                //                 console.log("Recuring Invoice created");
                //             }
                //         })
                //     }
                // } catch (error) {
                //     console.error("Error occurred:", error);
                // }
            }
        }
    })
}




const generateManualPDF = async (data, outputPath, filename, action) => {
    if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data provided to generate PDF.');
    }

    const invoiceDetails = data[0];
    const inv_id = invoiceDetails.id;

    try {
        // === Generate PDF ===
        const generateFn = action === 'advance'
            ? paymentInvoiceSecurity.generateInvoice
            : paymentInvoice.generateInvoice;

        await generateFn(data, invoiceDetails, outputPath);

        // === Wait briefly to ensure file is written ===
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // === Validate File Exists ===
        if (!fs.existsSync(outputPath)) {
            throw new Error(`Generated PDF not found at path: ${outputPath}`);
        }

        const stats = fs.statSync(outputPath);
        console.log(` PDF generated: ${outputPath} (${stats.size} bytes)`);

        // === Upload to S3 ===
        const s3Url = await uploadToS3(outputPath, filename, inv_id);

        if (!s3Url) {
            throw new Error(' S3 upload failed.');
        }

        // === Delete local file after upload (optional) ===
        fs.unlinkSync(outputPath);
        console.log(` Local PDF file deleted: ${outputPath}`);

        return s3Url;

    } catch (err) {
        console.error(' Error in generateManualPDF:', err.message);
        throw err;
    }
};



const uploadToS3 = async (filePath, filename, inv_id) => {
    try {
        const fileContent = fs.readFileSync(filePath);
        console.log(`Read file ${filePath} - size: ${fileContent.length} bytes`);

        const key = `Invoice/${filename}`;
        var bucketName = process.env.AWS_BUCKET_NAME;

        const params = {
            Bucket: bucketName,
            Key: key,
            Body: fileContent,
            ContentType: 'application/pdf',
        };

        const data = await s3.upload(params).promise();
        console.log('PDF uploaded successfully:', data.Location);

        return data.Location;
    } catch (err) {
        console.error('Error uploading PDF:', err);
        throw err;  // Important: propagate error
    }
};




                                                                                 