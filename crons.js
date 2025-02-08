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

// -------------- Recuring Invoice Cron

nodeCron.schedule('0 0 * * *', () => {
    // nodeCron.schedule('*/15 * * * * *', () => {

    const today = moment().date();

    console.log("---------------------------------------------------");

    var sql1 = "SELECT rec.*,hs.*,hos.Name AS hostel_name,hos.inv_startdate,hos.inv_enddate FROM recuring_inv_details AS rec JOIN hostel AS hs ON hs.ID=rec.user_id JOIN hosteldetails AS hos ON hos.id=hs.Hostel_Id WHERE rec.status=1 AND hs.isActive=1;";
    connection.query(sql1, function (err, data) {
        if (err) {
            console.log(err);
        } else if (data.length != 0) {

            data.forEach(inv_data => {

                const invoiceDate = parseInt(inv_data.invoice_date, 10);
                const today = moment(); // Current Date

                let start_day = parseInt(inv_data.inv_startdate, 10) || 1; // Default to 1 if NULL
                let end_day = parseInt(inv_data.inv_enddate, 10) || moment().subtract(1, 'months').endOf('month').date(); // Last month's last day if NULL

                if (inv_data.inv_enddate && end_day < today.date()) {
                    const lastMonth = moment().subtract(1, 'months');
                    end_day = parseInt(inv_data.inv_enddate, 10);
                    start_day = parseInt(inv_data.inv_startdate, 10) || 1; // Get start date if provided, else default to 1
                }

                const lastMonth = moment().subtract(1, 'months');

                // Calculate start and end dates
                const inv_startdate = lastMonth.date(start_day).format("YYYY-MM-DD");
                const inv_enddate = lastMonth.date(end_day).format("YYYY-MM-DD");

                console.log(`User: ${inv_data.user_id}, Hostel: ${inv_data.Hostel_Id}, Start Date: ${inv_startdate}, End Date: ${inv_enddate}`);

                if (invoiceDate === today.date()) {
                    generateInvoiceForDate(inv_data, inv_startdate, inv_enddate);
                }
            });
        } else {
            console.log("No need to Check in this Cron");
        }
    })
});



function generateInvoiceForDate(inv_data, inv_startdate, inv_enddate) {

    var total_array = [];

    var currentdate = moment().format('YYYY-MM-DD');

    var sql1 = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND action='recuring' AND invoice_status=1 AND Date=?";
    connection.query(sql1, [inv_data.user_id, currentdate], async function (err, data) {
        if (err) {
            console.log(err);
        } else if (data.length != 0) {
            console.log("Invoice Already Generated");
        } else {
            try {
                const room_rent = inv_data.RoomRent;
                var hostel_id = inv_data.Hostel_Id;
                var string_userid = inv_data.User_Id;

                // Convert dates to Date objects
                const startDate = new Date(inv_startdate);
                const endDate = new Date(inv_enddate);
                const joiningDate = new Date(inv_data.joining_Date); // Get user's joining date

                // Ensure valid dates
                if (isNaN(startDate) || isNaN(endDate) || isNaN(joiningDate)) {
                    console.log("Invalid date provided.");
                }

                const effectiveStartDate = startDate < joiningDate ? joiningDate : startDate;

                if (effectiveStartDate > endDate) {
                    // total_array.push({ key: "room_rent", amount: 0 });
                    console.log("Amount is 0");
                }

                const total_days = Math.max((endDate - effectiveStartDate) / (1000 * 60 * 60 * 24) + 1, 0);

                // Calculate per-day room rent
                const daysInMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
                const oneDayAmount = room_rent / daysInMonth;

                const totalRent = Math.round(oneDayAmount * total_days);

                total_array.push({ key: "room_rent", amount: totalRent });

                let eb_start_date
                let eb_end_date
                let eb_unit_amount

                const ebAmount = await new Promise((resolve, reject) => {
                    var sql2 = "SELECT * FROM eb_settings WHERE hostel_id=? AND status=1";
                    connection.query(sql2, [hostel_id], function (err, sql2_res) {
                        if (err) {
                            console.log("EB Settings Query Error:", err);
                            return reject(err);
                        }

                        const today = moment();
                        const lastMonth = moment().subtract(1, "months");

                        let start_day = parseInt(sql2_res[0]?.start_date, 10) || 1; // Default to 1 if NULL
                        let end_day = parseInt(sql2_res[0]?.end_date, 10) || lastMonth.endOf("month").date(); // Last month's last day if NULL

                        if (sql2_res[0]?.end_date && end_day < today.date()) {
                            end_day = parseInt(sql2_res[0]?.end_date, 10);
                            start_day = parseInt(sql2_res[0]?.start_date, 10) || 1; // Get start date if provided, else default to 1
                        }

                        eb_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
                        eb_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");

                        eb_unit_amount = sql2_res[0]?.amount || 0

                        if (sql2_res[0]?.recuring == 0) {
                            resolve(0);
                        } else {
                            var sql1 = `SELECT COALESCE(SUM(amount), 0) AS eb_amount FROM customer_eb_amount WHERE user_id = ? AND status = 1 AND date BETWEEN ? AND ?;`;
                            connection.query(sql1, [inv_data.user_id, eb_start_date, eb_end_date], function (err, eb_data) {
                                if (err) {
                                    return reject(err);
                                }
                                resolve(eb_data[0].eb_amount || 0);
                            });
                        }
                    });
                });

                total_array.push({ key: "eb_amount", amount: ebAmount });
                console.log("Total EB Amount:", ebAmount);
                console.log("eb_start_date:", eb_start_date);
                console.log("eb_end_date :", eb_end_date);

                var am_amounts = await new Promise((resolve, reject) => {

                    var sql3 = "SELECT * FROM Amenities AS am JOIN AmnitiesName AS amname ON amname.id=am.Amnities_Id WHERE am.Status=1 AND am.Hostel_Id=?;";
                    connection.query(sql3, [hostel_id], function (err, sql3_res) {
                        if (err) {
                            console.log("EB Settings Query Error:", err);
                            return reject(err);
                        }

                        let amenityPromises = sql3_res.map((amenity) => {
                            return new Promise((resolveAmenity, rejectAmenity) => {
                                if (amenity.recuring == 0) {
                                    return resolveAmenity(null); // Skip non-recurring amenities
                                }

                                const lastMonth = moment().subtract(1, "months"); // Last month (e.g., Jan 2025)
                                const nextMonth = moment(); // Current month (Feb 2025)

                                let start_day = parseInt(amenity.startdate, 10) || 1;
                                let end_day = parseInt(amenity.enddate, 10) || lastMonth.endOf("month").date();

                                const lastMonthDays = lastMonth.daysInMonth();
                                start_day = Math.min(Math.max(start_day, 1), lastMonthDays);
                                end_day = Math.min(Math.max(end_day, start_day), lastMonthDays);

                                let am_start_date, am_end_date;

                                if (amenity.startdate && amenity.startdate === amenity.enddate) {
                                    am_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
                                    am_end_date = nextMonth.date(end_day).format("YYYY-MM-DD"); // Moves end date to next month
                                } else {
                                    am_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
                                    am_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");
                                }

                                const sql1 = `
                                    SELECT am.Amount, amname.Amnities_Name 
                                    FROM Amenities AS am 
                                    JOIN AmnitiesName AS amname ON amname.id = am.Amnities_Id 
                                    JOIN AmenitiesHistory AS ahis ON ahis.amenity_Id = am.id 
                                    WHERE ahis.user_Id = ? 
                                    AND ahis.status = 1 
                                    AND ahis.created_At BETWEEN ? AND ? 
                                    AND am.Status = 1
                                    AND NOT EXISTS (
                                        SELECT 1 FROM AmenitiesHistory ahis2 
                                        WHERE ahis2.amenity_Id = am.id 
                                        AND ahis2.status = 0 
                                        AND ahis2.created_At < ?
                                    );
                                `;

                                // Execute query
                                connection.query(sql1, [string_userid, am_start_date, am_end_date, am_end_date], function (err, sql1_res) {
                                    if (err) {
                                        return rejectAmenity(err);
                                    }
                                    console.log("SQL Result:", sql1_res);
                                    resolveAmenity(sql1_res);
                                });
                            });
                        });

                        Promise.all(amenityPromises)
                            .then((results) => {
                                const filteredResults = results.flat().filter(result => result !== null);

                                console.log("All Amenity Queries Completed:", filteredResults);

                                filteredResults.forEach(item => {
                                    total_array.push({ key: item.Amnities_Name, amount: item.Amount });
                                });

                                resolve(filteredResults);
                            })
                            .catch((error) => {
                                console.error("Error in Amenity Processing:", error);
                                reject(error);
                            });
                        // });
                    });
                });

                const totalAmount = total_array.reduce((sum, item) => sum + item.amount, 0);

                console.log("Total Amount:", totalAmount);

                if (totalAmount > 0) {
                    // Generate Invoice Number
                    const invoice_id = await new Promise((resolve, reject) => {

                        const options = {
                            url: process.env.BASEURL + '/get_invoice_id',
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ user_id: inv_data.user_id })
                        };

                        request(options, (error, response, body) => {
                            if (error) {
                                return reject(error);
                            } else {
                                const result = JSON.parse(body);
                                console.log(result);

                                if (result.statusCode == 200) {
                                    resolve(result.invoice_number);
                                } else {
                                    resolve([]);
                                }
                            }
                        });
                    })

                    console.log("invoice_id:", invoice_id);

                    const currentDate = moment().format('YYYY-MM-DD');

                    let today = moment();
                    let dueDay = parseInt(10); // Convert due_date to integer

                    let dueDate = moment().set('date', dueDay);

                    if (today.date() > dueDay) {
                        dueDate.add(1, 'month');
                    }

                    var due_date = dueDate.format('YYYY-MM-DD')
                    console.log("dueDate:", due_date);
                    console.log(total_array);
                    // return;

                    var sql2 = "INSERT INTO invoicedetails (Name,phoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,UserAddress,DueDate,Date,Invoices,Status,User_Id,Bed,BalanceDue,PaidAmount,action,invoice_type,hos_user_id,rec_invstartdate,rec_invenddate,rec_ebstartdate,rec_ebenddate,rec_ebunit) VALUES (?)";
                    var params = [inv_data.Name, inv_data.Phone, inv_data.Email, inv_data.HostelName, inv_data.Hostel_Id, inv_data.Floor, inv_data.Rooms, totalAmount, inv_data.Address, due_date, currentDate, invoice_id,
                        'Pending', string_userid, inv_data.Bed, totalAmount, 0, 'recuring', 1, inv_data.user_id, inv_startdate, inv_enddate, eb_start_date, eb_end_date, eb_unit_amount
                    ]
                    connection.query(sql2, [params], function (err, ins_data) {
                        if (err) {
                            console.log("Add Invoice Error", err);
                        } else {

                            var inv_id = ins_data.insertId;

                            if (total_array && total_array.length > 0) {
                                // Prepare bulk insert values
                                var amenityValues = total_array.map(item => [item.key, inv_data.user_id, item.amount, inv_id]);

                                var sql3 = "INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES ?";
                                connection.query(sql3, [amenityValues], function (err) {
                                    if (err) {
                                        console.log("Error inserting amenity details:", err);
                                    } else {
                                        console.log("Invoice and Amenities Added Successfully");
                                    }
                                });
                            } else {
                                console.log("Invoice Added Successfully (No Amenities)");
                            }

                            console.log("Recuring Invoice created");
                        }
                    })

                }
            } catch (error) {
                console.error("Error occurred:", error);
            }
        }
    })

}

// nodeCron.schedule('0 0 * * *', () => {

// Checkout Invoice Cron
nodeCron.schedule('0 2 * * *', () => {

    const today = moment().format('YYYY-MM-DD');

    const sql1 = `SELECT *, DATE_FORMAT(joining_Date, '%Y-%m-%d') AS join_date FROM hostel WHERE CheckoutDate='${today}' AND isActive=1;`;
    connection.query(sql1, function (err, data) {
        if (err) {
            console.log(err.message, "Unable to Get Checkout Details");
        } else if (data.length !== 0) {

            data.forEach(user_data => {

                const join_date = user_data.join_date;
                const user_id = user_data.ID;
                const room_rent = user_data.RoomRent;
                const unique_user = user_data.User_Id;

                const sql2 = `SELECT *, DATE_FORMAT(Date, '%Y-%m-%d') AS date FROM invoicedetails WHERE hos_user_id=? AND invoice_status=1 ORDER BY id DESC`;
                connection.query(sql2, [user_id], function (err, inv_data) {
                    if (err) {
                        console.log("Error Fetching Invoice Details", err.message);
                    } else if (inv_data.length !== 0) {
                        // Case 1: From Last Invoice Date to Current Date
                        const last_inv_date = inv_data[0].date;
                        calculateRentAndAmenityCharges(last_inv_date, today, room_rent, unique_user, user_id, user_data);
                    } else {
                        // Case 2: From Joining Date to Current Date
                        console.log(`No invoices found. Calculating from joining date: ${join_date}`);
                        calculateRentAndAmenityCharges(join_date, today, room_rent, unique_user, user_id, user_data);
                    }
                });
            });
        } else {
            console.log(`${today} No Checkout Date`);
        }
    });
});


function calculateRentAndAmenityCharges(start_date, end_date, room_rent, unique_user, user_id, user_data) {

    var sql1 = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND action='checkout_invoice' AND invoice_status=1";
    connection.query(sql1, [user_id], function (err, ch_data) {
        if (err) {
            console.log("Get Invoice Error");
        } else if (ch_data.length == 0) {

            const amenitySql = `
        SELECT ah.amenity_Id, ah.status, ah.created_At, am.Amnities_Name AS amenity_name, a.amount 
    FROM AmenitiesHistory ah
    JOIN Amenities a ON ah.amenity_Id = a.Amnities_Id
    JOIN AmnitiesName AS am ON ah.amenity_Id=am.id
    WHERE ah.user_Id = ? 
    AND (ah.created_At BETWEEN ? AND ? 
         OR (ah.created_At <= ? AND ah.status = 1)) GROUP BY ah.id
    ORDER BY ah.amenity_Id ASC, ah.created_At ASC;
    `;

            connection.query(amenitySql, [unique_user, start_date, end_date, start_date], (err, amenityData) => {
                if (err) {
                    console.log("Error Fetching Amenities Details", err.message);
                } else {
                    const activeAmenityDays = {};

                    // Process Amenities
                    amenityData.forEach((record, index, arr) => {
                        const { amenity_Id, status, created_At, amenity_name, amount } = record;
                        const currentDate = new Date(created_At);

                        // Initialize if not already in the object
                        if (!activeAmenityDays[amenity_Id]) {
                            activeAmenityDays[amenity_Id] = {
                                name: amenity_name,
                                totalAmount: 0,
                                totalDays: 0,
                                dates: []
                            };
                        }

                        if (status === 1) {
                            // Calculate amount only for status = 1
                            const nextRecord = arr[index + 1];
                            if (nextRecord && nextRecord.status === 0) {
                                const nextDate = new Date(nextRecord.created_At);
                                const diffDays = Math.ceil((nextDate - currentDate) / (1000 * 60 * 60 * 24));

                                if (diffDays > 2) {
                                    activeAmenityDays[amenity_Id].totalDays += diffDays;
                                    activeAmenityDays[amenity_Id].dates.push({ start: currentDate.toISOString().split('T')[0], end: nextDate.toISOString().split('T')[0] });
                                    activeAmenityDays[amenity_Id].totalAmount = amount;
                                }
                            } else {
                                // If no OFF record, consider until end_date
                                const diffDays = Math.ceil((new Date(end_date) - currentDate) / (1000 * 60 * 60 * 24));
                                activeAmenityDays[amenity_Id].totalDays += diffDays;
                                activeAmenityDays[amenity_Id].dates.push({ start: currentDate.toISOString().split('T')[0], end: new Date(end_date).toISOString().split('T')[0] });
                                activeAmenityDays[amenity_Id].totalAmount = amount;
                            }
                        }
                    });

                    // Convert activeAmenityDays object to an array with required structure
                    const result = Object.values(activeAmenityDays).map(amenity => ({
                        name: amenity.name,
                        totalAmount: amenity.totalAmount,
                        totalDays: amenity.totalDays,
                        dates: amenity.dates
                    }));

                    console.log("Formatted Active Amenity Details:", result);

                    // Continue with the other calculations for EB Amount and Room Rent
                    const sql3 = `
                SELECT SUM(amount) AS eb_amount 
                FROM customer_eb_amount 
                WHERE user_id = ? 
                AND status = 1 
                AND date BETWEEN ? AND ?;
            `;
                    connection.query(sql3, [user_id, start_date, end_date], function (err, eb_data) {
                        if (err) {
                            console.log("Error Fetching Eb Details", err.message);
                        } else {
                            const total_ebamount = eb_data[0].eb_amount || 0;

                            const sql4 = `
                        SELECT DATEDIFF(?, ?) AS days_difference;
                    `;
                            connection.query(sql4, [end_date, start_date], function (err, ch_date) {
                                if (err) {
                                    console.log("Error Fetching Dates Count", err.message);
                                } else {
                                    const stay_days = ch_date[0].days_difference;
                                    const currentDate = new Date();
                                    const currentYear = currentDate.getFullYear();
                                    const currentMonth = currentDate.getMonth(); // Months are 0-indexed
                                    const total_days = new Date(currentYear, currentMonth + 1, 0).getDate();
                                    const rent_per_day = room_rent / total_days;
                                    const current_rent = rent_per_day * stay_days;
                                    const rounded_rent = Math.round(current_rent * 100) / 100;

                                    console.log(`User: ${unique_user}`);
                                    console.log(`Room Rent: ${rounded_rent}`);
                                    console.log(`EB Amount: ${total_ebamount}`);
                                    console.log("Amenity Days and Amounts:", result);

                                    const totalAmenityAmount = result.reduce((sum, amenity) => sum + amenity.totalAmount, 0);

                                    const grandTotal = rounded_rent + total_ebamount + totalAmenityAmount;

                                    var sql2 = "SELECT * FROM invoicedetails WHERE Hostel_Id=? ORDER BY id DESC;";
                                    connection.query(sql2, [user_data.Hostel_Id], function (err, inv_data) {
                                        if (err) {
                                            console.log("Invoice Number error");

                                            // return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" })
                                        } else if (inv_data.length != 0) {

                                            var invoice_number = inv_data[0].Invoices;
                                            console.log(invoice_number);

                                            const newInvoiceNumber = invoice_number.slice(0, -1) + (parseInt(invoice_number.slice(-1)) + 1);

                                            var sql4 = "INSERT INTO invoicedetails (Name,phoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,DueDate,Date,Invoices,Status,User_Id,Bed,BalanceDue,PaidAmount,action,invoice_type,hos_user_id,RoomRent,EbAmount) VALUES (?)";
                                            var params = [user_data.Name, user_data.Phone, user_data.Email, user_data.HostelName, user_data.Hostel_Id, user_data.Floor, user_data.Rooms, grandTotal, end_date, end_date, newInvoiceNumber, 'Pending', user_data.User_Id, user_data.Bed, grandTotal, 0, 'checkout_invoice', 1, user_id, rounded_rent, total_ebamount]
                                            connection.query(sql4, [params], function (err, ins_data) {
                                                if (err) {
                                                    console.log("Invoice Generate Error");
                                                } else {

                                                    var inv_id = ins_data.insertId;

                                                    if (result && result.length > 0) {
                                                        var remaining = result.length;
                                                        result.forEach(item => {
                                                            var sql3 = "INSERT INTO manual_invoice_amenities (am_name, user_id, amount,invoice_id) VALUES (?, ?, ?,?)";
                                                            connection.query(sql3, [item.name, user_id, item.totalAmount, inv_id], function (err) {
                                                                if (err) {
                                                                    console.log("Error inserting amenity details:", err);
                                                                }
                                                                remaining -= 1;
                                                                if (remaining === 0) {
                                                                    console.log("Invoice Amenities Generated");
                                                                }
                                                            });
                                                        });
                                                    }
                                                    console.log("Invoice Generated");
                                                }
                                            })

                                        } else {
                                            var prefix = hos_details[0].prefix;
                                            var suffix = hos_details[0].suffix;

                                            const month = moment(new Date()).month() + 1;
                                            const year = moment(new Date()).year();

                                            if (prefix != null || suffix != null) {
                                                var newInvoiceNumber = `${prefix}${suffix}`;
                                            } else {
                                                var newInvoiceNumber = `${hos_details[0].Name}${month}${year}001`;
                                            }

                                            var sql4 = "INSERT INTO invoicedetails (Name,phoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,DueDate,Date,Invoices,Status,User_Id,Bed,BalanceDue,PaidAmount,action,invoice_type,hos_user_id) VALUES (?)";
                                            var params = [user_data.Name, user_data.Phone, user_data.Email, user_data.HostelName, user_data.Hostel_Id, user_data.Floor, user_data.Rooms, grandTotal, end_date, end_date, newInvoiceNumber, 'Pending', user_data.User_Id, user_data.Bed, grandTotal, 0, 'checkout_invoice', 1, user_id]
                                            connection.query(sql4, [params], function (err, ins_data) {
                                                if (err) {
                                                    console.log("Invoice Generate Error");
                                                } else {
                                                    console.log("Invoice Generated");
                                                }
                                            })
                                        }
                                    })
                                }
                            });
                        }
                    });
                }
            });

        } else {
            console.log("Invoice Already Added");
        }
    })
}