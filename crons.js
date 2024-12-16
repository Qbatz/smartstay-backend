const nodeCron = require('node-cron')
const moment = require('moment')
const request = require('request')
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
    const today = moment().date();

    console.log("---------------------------------------------------");

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

async function generateInvoiceForDate(inv_data) {
    var total_array = [];
    console.log(inv_data);

    try {
        const currentDate = new Date();
        const currentYear = currentDate.getFullYear();
        const currentMonth = currentDate.getMonth();
        const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        var room_rent = inv_data.RoomRent;
        const oneDayAmount = room_rent / daysInCurrentMonth;

        if (inv_data.CheckoutDate != null) {
            const checkoutDate = new Date(inv_data.CheckoutDate);
            if (checkoutDate.getFullYear() === currentYear && checkoutDate.getMonth() === currentMonth) {
                const total_days = checkoutDate.getDate();
                const totalRent = parseFloat((oneDayAmount * total_days).toFixed(2));
                var roundedRent = Math.round(totalRent);
                total_array.push({ key: "room_rent", amount: roundedRent });
            } else {
                total_array.push({ key: "room_rent", amount: room_rent });
            }
        } else {
            total_array.push({ key: "room_rent", amount: room_rent });
        }

        const ebAmount = await new Promise((resolve, reject) => {
            var sql1 = "SELECT COALESCE(SUM(amount),0) AS eb_amount FROM customer_eb_amount WHERE user_id = '" + inv_data.user_id + "' AND status = 1 AND date BETWEEN DATE_SUB(LAST_DAY(CURDATE()), INTERVAL 1 MONTH) + INTERVAL 1 DAY AND LAST_DAY(DATE_SUB(CURDATE(), INTERVAL 1 MONTH));";
            connection.query(sql1, function (err, eb_data) {
                if (err) {
                    return reject(err);
                }
                resolve(eb_data[0].eb_amount);
            });
        });
        total_array.push({ key: "eb_amount", amount: ebAmount });

        const amenitiesData = await new Promise((resolve, reject) => {
            var sql2 = "SELECT * FROM AmenitiesHistory WHERE user_Id = '" + inv_data.User_Id + "'";
            connection.query(sql2, function (err, am_data) {
                if (err) {
                    return reject(err);
                }
                if (am_data.length != 0) {
                    var amenity_ids = am_data.map(element => element.amenity_Id);
                    var port = process.env.PORT;
                    var url = (port == 2001) ? "http://localhost:2001/user_amenities_history" :
                        (port == 1010) ? "http://13.126.102.54:1010/user_amenities_history" :
                            "http://smartstaydev.s3remotica.com/user_amenities_history";

                    const options = {
                        url: url,
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ user_id: inv_data.user_id, amenities_id: amenity_ids })
                    };

                    request(options, (error, response, body) => {
                        if (error) {
                            return reject(error);
                        } else {
                            const result = JSON.parse(body);
                            if (result.statusCode == 200) {
                                resolve(result.data);
                            } else {
                                resolve([]);
                            }
                        }
                    });
                } else {
                    resolve([]);
                }
            });
        });

        const lastMonthIndex = currentMonth - 1;
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ];
        const lastMonthName = monthNames[lastMonthIndex];
        const lastMonthData = amenitiesData.filter(item => item.month_name === lastMonthName);

        const amenitiesDetails = lastMonthData.map(item => ({
            key: item.Amnities_Name,   // Structuring the key-value pairs properly
            Amount: item.Amount
        }));

        total_array.push({ key: "amenities", details: amenitiesDetails });

    } catch (error) {
        console.error("Error occurred:", error);
    } finally {
        console.log("Final total_array:", JSON.stringify(total_array, null, 2));

        const roomRentAmount = total_array.find(item => item.key === "room_rent").amount;
        const ebAmount = total_array.find(item => item.key === "eb_amount") ? total_array.find(item => item.key === "eb_amount").amount : 0;
        const amenitiesDetails = total_array.find(item => item.key === "amenities").details;

        const totalAmenitiesAmount = amenitiesDetails.reduce((total, item) => total + item.Amount, 0);

        var total_amount = roomRentAmount + ebAmount + totalAmenitiesAmount;
        console.log(amenitiesDetails);
        console.log(total_amount);

        let dueDay = inv_data.due_date;
        let currentDate = new Date();
        let nextDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + (currentDate.getDate() > dueDay ? 1 : 0), dueDay);

        let date = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

        var sql3 = "SELECT COALESCE(max(Invoices),0) AS inv_id FROM invoicedetails WHERE Hostel_Id='" + inv_data.Hostel_Id + "';";
        connection.query(sql3, function (err, inv_id_de) {
            if (err) {
                console.log(err, "Invoice Id error");
            } else {
                var lastInvoice = inv_id_de[0].inv_id;
                var prefix = lastInvoice.match(/^\D+/) || '';
                var numberPart = lastInvoice.match(/\d+$/);
                var invoice_id = numberPart ? prefix + (parseInt(numberPart[0]) + 1) : lastInvoice + '1';

                var sql2 = "INSERT INTO invoicedetails (Name,PhoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,DueDate,Date,Invoices,Status,User_Id,RoomRent,EbAmount,Amnities_deduction_Amount,Bed,BalanceDue,action,invoice_type,hos_user_id,advance_amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                connection.query(sql2, [inv_data.Name, inv_data.Phone, inv_data.Email, inv_data.HostelName, inv_data.Hostel_Id, inv_data.Floor, inv_data.Rooms, total_amount, nextDueDate, date, invoice_id, 'pending', inv_data.User_Id, roomRentAmount, ebAmount, totalAmenitiesAmount, inv_data.Bed, total_amount, 'auto_recuring', 2, inv_data.user_id, 0], function (err, ins_data) {
                    if (err) {
                        console.log(err);
                    } else {
                        var inv_id = ins_data.insertId;
                        if (amenitiesDetails && amenitiesDetails.length > 0) {
                            var remaining = amenitiesDetails.length;
                            amenitiesDetails.forEach(item => {
                                var sql3 = "INSERT INTO manual_invoice_amenities (am_name, user_id, amount,invoice_id) VALUES (?, ?, ?,?)";
                                connection.query(sql3, [item.key, inv_data.user_id, item.Amount, inv_id], function (err) {
                                    if (err) {
                                        console.log("Error inserting amenity details:", err);
                                    }
                                    remaining -= 1;
                                    if (remaining === 0) {
                                        console.log("Invoice Added Successfully");
                                    }
                                });
                            });
                        } else {
                            console.log("Invoice Added Successfully");
                        }
                    }
                });
            }
        });
    }
}

nodeCron.schedule('0 0 * * *', () => {

    const today = moment().format('YYYY-MM-DD');

    const sql1 = `SELECT * FROM hostel WHERE CheckoutDate='${today}' AND isActive=1;`;

    connection.query(sql1, function (err, data) {
        if (err) {
            console.log(err.message, "Unable to Get Checkout Details");
        } else if (data.length != 0) {

            data.forEach(user_data => {

                var user_id = user_data.ID;

                var sql2 = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND invoice_status=1";
                connection.query(sql2, [user_id], function (inv_data) {
                    if (err) {
                        console.log("Error Fetching Invoice Details", err.message);


                    }
                })

            });


        } else {
            console.log("" + today + " No Checkout Date");

        }
    })
});