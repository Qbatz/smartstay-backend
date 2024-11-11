const connection = require('./config/connection')
const addNotification = require('./components/add_notification')


function all_notifications(req, res) {

    var user_id = req.body.user_id;
    var user_type = req.body.user_type;

    if (!user_type || user_type == undefined) {
        var user_type = 0;
    }

    if (!user_id || user_id == undefined) {
        var user_id = req.user_details.id;
        var user_type = req.user_details.user_type;
    }
    var page = parseInt(req.body.page) || 1;
    var limit = 2;
    var offset = (page - 1) * limit;

    var sql1 = "SELECT id,user_id,title,user_type,message,createdat,updatedat,CASE WHEN (seen_users LIKE '%," + user_id + ",%' OR seen_users LIKE '" + user_id + ",%' OR seen_users LIKE '%," + user_id + "' OR seen_users = '" + user_id + "') THEN 0 ELSE status END AS status FROM notifications WHERE (user_id = '" + user_id + "' OR FIND_IN_SET('" + user_id + "', unseen_users) OR FIND_IN_SET('" + user_id + "', seen_users))  AND user_type = '" + user_type + "' ORDER  BY id DESC LIMIT " + limit + " OFFSET " + offset + ";"
    // console.log(sql1);
    connection.query(sql1, (sql_err, sql_res) => {
        if (sql_err) {
            res.status(201).json({ message: "Unable to get Notifications Details", statusCode: 201 })
        } else {
            res.status(200).json({ message: "Notifications Details", statusCode: 200, page: page, notification: sql_res })
        }
    })
}

function add_notification(req, res) {

    var { user_id, title, user_type, message } = req.body;

    if ((!message && message == undefined) || (!title && title == undefined)) {
        return res.status(201).json({ message: "Missing required fields", statusCode: 201 })
    }

    if (user_id == 0) {

        if (user_type == 1) {
            var sql1 = "SELECT * FROM createaccount";
            connection.query(sql1, async function (err, data) {
                if (err) {
                    console.log(err);
                } else {
                    var unseen_users = data.map(x => x.id)
                    // console.log(unseen_users);
                    addNotification.add_notification(user_id, title, user_type, message, unseen_users);
                    return res.status(200).json({ message: "Added New Notification", statusCode: 200 })
                }
            })
        } else {
            var sql1 = "SELECT * FROM hostel WHERE isActive=1";
            connection.query(sql1, async function (err, data) {
                if (err) {
                    console.log(err);
                } else {
                    var unseen_users = data.map(x => x.ID)
                    addNotification.add_notification(user_id, title, user_type, message, unseen_users)
                    return res.status(200).json({ message: "Added New Notification", statusCode: 200 })
                }
            })
        }
    } else {
        var unseen_users = 0;
        addNotification.add_notification(user_id, title, user_type, message, unseen_users)
        return res.status(200).json({ message: "Added New Notification", statusCode: 200 })
    }
}


function update_notification_status(req, res) {

    var id = req.body.id;
    var user_id = req.user_details.id;
    // var user_id = req.body.user_id;

    if (!id || !user_id) {
        return res.status(201).json({ message: "Missing Notification Id", statusCode: 201 })
    }

    if (Array.isArray(id)) {

        for (let i = 0; i < id.length; i++) {
            // Update Status
            var up_id = id[i];

            var sql1 = "SELECT * FROM notifications WHERE id=?";
            connection.query(sql1, [up_id], (sel_err, sel_res) => {
                if (sel_err) {
                    console.log(sel_err);
                } else if (sel_res.length != 0) {

                    var notification = sel_res[0];
                    var noti_user_id = notification.user_id;
                    var unseen_users = notification.unseen_users || '';
                    var seen_users = notification.seen_users || '';

                    var new_id = notification.id;

                    if (noti_user_id == 0) {
                        // Ensure unseen_users is not just the default '0'
                        if (unseen_users == 0) {
                            unseen_users = '';
                        }

                        unseen_users = unseen_users.split(',').filter(u => u !== String(user_id)).join(',');

                        if (unseen_users === '') {
                            unseen_users = '0';
                        }

                        if (seen_users == 0) {
                            seen_users = '';
                        }

                        if (!seen_users.includes(',' + user_id + ',') &&
                            !seen_users.startsWith(user_id + ',') &&
                            !seen_users.endsWith(',' + user_id) &&
                            seen_users != user_id) {
                            seen_users = seen_users ? seen_users + ',' + user_id : user_id;
                        }

                        console.log(seen_users);
                        var sql2 = "UPDATE notifications SET unseen_users=?,seen_users=? WHERE id=?";
                        // console.log(sql2);
                        connection.query(sql2, [unseen_users, seen_users, new_id], (err, data) => {
                            if (err) {
                                console.log(err);
                            }
                        });
                    } else {
                        var sql3 = "UPDATE notifications SET status=0 WHERE id=?";
                        // console.log(sql3);
                        connection.query(sql3, [new_id], (err, data) => {
                            if (err) {
                                console.log(err);
                            }
                        });
                    }
                } else {
                    console.log("Invalid ID");
                }
            });
        }
        return res.status(200).json({ message: "Update Notification Status", statusCode: 200 })

    } else {
        var sql2 = "UPDATE notifications SET status=0 WHERE id=?";
        connection.query(sql2, [id], (err, data) => {
            if (err) {
                return res.status(201).json({ message: "Unable to Update Notification Status", statusCode: 201 })
            } else {
                return res.status(200).json({ message: "Update Notification Status", statusCode: 200 })
            }
        })
    }
}


// Add Eb Reading

function add_room_reading(req, res) {

    var created_by = req.user_details.id;

    var atten=req.body;

    var { hostel_id, floor_id, room_id, date, reading } = req.body;

    if (!hostel_id || !floor_id || !room_id || !date || !reading) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var sql1 = "SELECT * FROM eb_settings WHERE hostel_id=?";
    connection.query(sql1, [hostel_id], function (err, amount_details) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: 'Database error' });
        } else if (amount_details.length != 0) {

            // Check Date
            var sql2 = "SELECT * FROM room_readings WHERE hostel_id=? AND floor_id=? AND room_id=? AND date=? AND status=1";
            connection.query(sql2, [hostel_id, floor_id, room_id, date], function (err, date_res) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: 'Unable to Get Eb Amount Details', error: err });
                } else if (date_res.length == 0) {

                    var sql3 = "SELECT *,DATE_FORMAT(date, '%Y-%m-%d') AS get_date FROM room_readings WHERE hostel_id = ? AND floor_id= ? AND room_id= ? AND status=1 ORDER BY id DESC";
                    connection.query(sql3, [hostel_id, floor_id, room_id], function (err, data_res) {
                        if (err) {
                            return res.status(201).json({ message: 'Unable to Get Eb Amount Details', error: err });
                        } else if (data_res.length == 0) {

                            // Insert Process
                            var sql4 = "INSERT INTO room_readings (hostel_id,floor_id,room_id,date,reading,total_amount,total_reading,created_by) VALUES (?,?,?,?,?,?,?,?)";
                            connection.query(sql4, [hostel_id, floor_id, room_id, date, reading, 0, 0, created_by], function (err, ins_data) {
                                if (err) {
                                    return res.status(201).json({ message: 'Unable to Add Eb Amount Details', error: err });
                                } else {
                                    return res.status(200).json({ message: 'Successfully Added Eb Amount' });
                                }
                            })

                        } else {

                            var cal_startmeter = data_res[0].reading;

                            if (reading > cal_startmeter) {

                                var total_reading = reading - cal_startmeter;

                                var last_cal_date = data_res[0].get_date;

                                var particular_amount = amount_details[0].amount;  // Get Single Amount
                                var total_amount = particular_amount * total_reading;  // Get Total Amount

                                var sql5 = "INSERT INTO room_readings (hostel_id,floor_id,room_id,date,reading,total_amount,total_reading,created_by) VALUES (?,?,?,?,?,?,?,?)";
                                connection.query(sql5, [hostel_id, floor_id, room_id, date, reading, total_amount, total_reading, created_by], function (err, ins_data) {
                                    if (err) {
                                        return res.status(201).json({ message: 'Unable to Add Eb Amount Details', error: err });
                                    } else {

                                        console.log("Reading Inserted!");

                                        var eb_id = ins_data.insertId;

                                        split_eb_amounts(atten, cal_startmeter, reading, last_cal_date, total_amount, total_reading, eb_id, created_by, function (result) {
                                            if (result.statusCode === 200) {
                                                return res.status(200).json({ statusCode: result.statusCode, message: result.message });
                                            } else {
                                                return res.status(201).json({ statusCode: result.statusCode, message: result.message, error: result.error });
                                            }
                                        });
                                    }
                                })

                            } else {
                                return res.status(201).json({ message: 'UNew reading must be greater than the old reading' });
                            }
                        }
                    })
                } else {
                    return res.status(201).json({ statusCode: 201, message: 'Date already has an added in this Room. Please select a different date.' });
                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: 'Kindly Add Eb Setings' });
        }
    })

}

function split_eb_amounts(atten, startMeterReading, end_Meter_Reading, last_cal_date, total_amount, total_reading, eb_id, created_by, callback) {

    const sql1 = `SELECT *, 
                  CASE WHEN checkoutDate IS NULL 
                  THEN DATEDIFF(LEAST(CURDATE(), ?), GREATEST(joining_date, ?)) + 1 
                  ELSE DATEDIFF(LEAST(checkoutDate, ?), GREATEST(joining_date, ?)) + 1 
                  END AS days_stayed 
                  FROM hostel 
                  WHERE Hostel_Id = ? AND Floor = ? AND Rooms = ? 
                  AND joining_date <= ? 
                  AND (checkoutDate >= ? OR checkoutDate IS NULL)`;

    connection.query(sql1, [atten.date, last_cal_date, atten.date, last_cal_date, atten.hostel_id, atten.floor_id, atten.room_id, atten.date, last_cal_date],
        function (err, user_data) {
            if (err) {
                console.error('Error fetching user details:', err);
                return callback({ statusCode: 201, message: 'Unable to Get User Details', error: err });
            }

            if (user_data.length === 0) {
                return callback({ statusCode: 200, message: 'Successfully Added EB Amount' });
            }

            let totalDays = user_data.reduce((acc, user) => acc + user.days_stayed, 0);
            const amountPerDay = total_amount / totalDays;
            let insertCounter = 0;

            // Insert EB amounts for each user
            user_data.forEach(user => {
                const user_id = user.ID;
                const userDays = user.days_stayed;
                const userAmount = Math.round(userDays * amountPerDay);
                const per_unit = Math.round((userAmount / total_amount) * total_reading);

                if (userAmount && userAmount != 0) {
                    const sql2 = "INSERT INTO customer_eb_amount (user_id, start_meter, end_meter, unit, amount, created_by, date, eb_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                    connection.query(sql2, [user_id, startMeterReading, end_Meter_Reading, per_unit, userAmount, created_by, atten.date, eb_id],
                        function (err) {
                            if (err) {
                                console.error('Error inserting customer EB amount:', err);
                                return callback({ statusCode: 201, message: 'Unable to Add EB Amount for User', error: err });
                            }

                            insertCounter++;
                            if (insertCounter === user_data.length) {
                                // All inserts are done
                                callback({ statusCode: 200, message: 'Successfully Added EB Amount' });
                            }
                        });
                } else {
                    insertCounter++;
                    if (insertCounter === user_data.length) {
                        // If there was no insert needed (userAmount is 0), increment the counter
                        callback({ statusCode: 200, message: 'Successfully Added EB Amount' });
                    }
                }
            });
        });
}


module.exports = { all_notifications, add_notification, update_notification_status, add_room_reading }
