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

    var atten = req.body;

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
                                return res.status(201).json({ message: 'New reading must be greater than the old reading' });
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

// Edit API
function edit_room_reading(req, res) {

    const created_by = req.user_details.id;

    var atten = req.body;

    const { hostel_id, floor_id, room_id, date, reading, id } = req.body;

    if (!hostel_id || !floor_id || !room_id || !date || !reading || !id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    // Fetch current EB amount details and validate input
    const sql1 = "SELECT * FROM room_readings AS rr JOIN eb_settings AS eb ON eb.hostel_Id=rr.hostel_id WHERE rr.id=?";
    connection.query(sql1, [id], function (err, check_data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: 'Unable to Get Eb Amount Details', error: err });
        } else if (check_data.length != 0) {

            const per_unit_amount = check_data[0].amount;

            // Check for duplicate date entries
            const sql2 = "SELECT * FROM room_readings WHERE hostel_id=? AND floor_id=? AND room_id=? AND date=? AND status=1 AND id!=?";
            connection.query(sql2, [hostel_id, floor_id, room_id, date, id], function (err, date_res) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: 'Unable to Get Eb Amount Details2', error: err });
                } else if (date_res.length == 0) {

                    // Update the current reading record
                    const up_query = "UPDATE room_readings SET hostel_id=?, floor_id=?, room_id=?, date=?, reading=? WHERE id=?";
                    connection.query(up_query, [hostel_id, floor_id, room_id, date, reading, id], async function (err, up_res) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: 'Unable to Update Eb Amount Details3', error: err });
                        } else {

                            var old_hostel = check_data[0].hostel_id;
                            var old_floor = check_data[0].floor_id;
                            var old_room = check_data[0].room_id;

                            if (old_hostel == hostel_id && old_floor == floor_id && old_room == room_id) {

                                // Check and update previous and next entries
                                check_previous_entry(id, reading, per_unit_amount, atten, function (prevResult) {
                                    check_next_entry(id, reading, per_unit_amount, atten, function (nextResult) {

                                        if (prevResult.statusCode == 200 && nextResult.statusCode == 200) {

                                            const deleteQuery = "DELETE FROM customer_eb_amount WHERE eb_id IN (?, ?)";
                                            connection.query(deleteQuery, [id, nextResult.next_id], function (err, deleteRes) {
                                                if (err) {
                                                    return res.status(201).json({ statusCode: 201, message: 'Unable to Delete from Customer Eb Amount', error: err });
                                                } else {

                                                    if (prevResult.prev_id !== 0) {

                                                        var startmeter = prevResult.prev_reading;
                                                        var last_cal_date = prevResult.prev_date;
                                                        var total_amount = prevResult.total_amount;
                                                        var total_reading = prevResult.total_reading;
                                                        var eb_id = id;

                                                        edit_split_eb_amounts(atten, startmeter, reading, last_cal_date, total_amount, total_reading, eb_id, created_by, date, function (response) {
                                                            console.log("Final Response", response);
                                                        });
                                                    }
                                                    if (nextResult.next_id !== 0) {

                                                        var startmeter = nextResult.next_reading;
                                                        var last_cal_date = nextResult.next_date;
                                                        var total_amount = nextResult.total_amount;
                                                        var total_reading = nextResult.total_reading;
                                                        var eb_id = nextResult.next_id;

                                                        edit_split_eb_amounts(atten, reading, startmeter, date, total_amount, total_reading, eb_id, created_by, last_cal_date, function (response) {
                                                            console.log("Final Response1", response);
                                                        });
                                                    }
                                                    return res.status(200).json({ statusCode: 200, message: "Changes Saved Successfully" });
                                                }
                                            });
                                        } else {
                                            return res.status(201).json({ statusCode: 201, message: 'Failed to Update Previous/Next Details', error: err });
                                        }
                                    });
                                });
                            } else {

                                await check_old_next_entry(id, old_hostel, old_floor, old_room, per_unit_amount, async function (old_result) {

                                    console.log(old_result, "===================== old_result ================");

                                    if (old_result.statusCode == 200) {

                                        const deleteQuery = "DELETE FROM customer_eb_amount WHERE eb_id IN (?, ?)";
                                        connection.query(deleteQuery, [old_result.prev_id, old_result.next_id], async function (err, deleteRes) {
                                            if (err) {
                                                return res.status(201).json({ statusCode: 201, message: 'Unable to Delete from Customer Eb Amount', error: err });
                                            } else {
                                                await check_previous_entry(id, reading, per_unit_amount, atten, async function (prevResult) {
                                                    await check_next_entry(id, reading, per_unit_amount, atten, async function (nextResult) {

                                                        console.log(nextResult, "==================== nextResult =================");
                                                        console.log(prevResult, "=============== prevResult ====================");

                                                        if (prevResult.statusCode == 200 && nextResult.statusCode == 200) {

                                                            const deleteQuery = "DELETE FROM customer_eb_amount WHERE eb_id IN (?,?)";
                                                            connection.query(deleteQuery, [id, nextResult.next_id], async function (err, deleteRes) {
                                                                if (err) {
                                                                    return res.status(201).json({ statusCode: 201, message: 'Unable to Delete from Customer Eb Amount', error: err });
                                                                } else {

                                                                    if (prevResult.prev_id !== 0) {

                                                                        var startmeter = prevResult.prev_reading;
                                                                        var last_cal_date = prevResult.prev_date;
                                                                        var total_amount = prevResult.total_amount;
                                                                        var total_reading = prevResult.total_reading;
                                                                        var eb_id = id;

                                                                        var reading = req.body.reading;

                                                                        await edit_split_eb_amounts(atten, startmeter, reading, last_cal_date, total_amount, total_reading, eb_id, created_by, date, function (response) {
                                                                            console.log("Final Response", response);
                                                                        });
                                                                    }

                                                                    console.log("///////////////////", nextResult.next_id);

                                                                    if (nextResult.next_id != 0) {

                                                                        var startmeter = nextResult.next_reading;
                                                                        var last_cal_date = nextResult.next_date;
                                                                        var total_amount = nextResult.total_amount;
                                                                        var total_reading = nextResult.total_reading;
                                                                        var eb_id = nextResult.next_id;

                                                                        var reading = req.body.reading;

                                                                        await edit_split_eb_amounts(atten, reading, startmeter, date, total_amount, total_reading, eb_id, created_by, last_cal_date, function (response) {
                                                                            console.log("Final Response1", response);
                                                                        });
                                                                    }

                                                                    if (old_result.next_id != 0) {

                                                                        var startmeter = old_result.next_reading;
                                                                        var new_date = old_result.start_date;

                                                                        var total_amount = old_result.total_amount;

                                                                        var total_reading = old_result.total_reading;

                                                                        var new_read = startmeter - total_reading;

                                                                        var eb_id = old_result.next_id;

                                                                        var last_cal_date = old_result.last_cal_date

                                                                        var attens = {
                                                                            hostel_id: old_hostel,
                                                                            floor_id: old_floor,
                                                                            room_id: old_room
                                                                        }

                                                                        await edit_split_eb_amounts(attens, new_read, startmeter, new_date, total_amount, total_reading, eb_id, created_by, last_cal_date, function (response) {
                                                                            console.log("Old Response Final Response1", response);
                                                                        });
                                                                    }

                                                                    return res.status(200).json({ statusCode: 200, message: "Changes Saved Successfully" });
                                                                }
                                                            });
                                                        } else {
                                                            return res.status(201).json({ statusCode: 201, message: 'Failed to Update Previous/Next Details', error: err });
                                                        }
                                                    });
                                                });
                                            }
                                        })

                                    } else {
                                        return res.status(201).json({ statusCode: 201, message: 'Failed to Update Previous/Next Details', error: err });
                                    }
                                })
                            }
                        }
                    });
                } else {
                    return res.status(201).json({ statusCode: 201, message: 'Date already has an added in this Room. Please select a different date.' });
                }
            });
        } else {
            return res.status(201).json({ statusCode: 201, message: 'Invalid Reading Details', error: err });
        }
    });
}

function check_previous_entry(id, reading, per_unit_amount, atten, callback) {

    const sqlGetPrevious = "SELECT *,DATE_FORMAT(date, '%Y-%m-%d') AS get_date FROM room_readings WHERE id < ? AND status = 1 AND hostel_id=? AND room_id=? AND floor_id=? ORDER BY id DESC LIMIT 1";
    connection.query(sqlGetPrevious, [id, atten.hostel_id, atten.room_id, atten.floor_id], function (err, prev_data) {
        if (err) {
            return callback({ statusCode: 201, message: 'Unable to Show Previous Reading Details', error: err });
        } else if (prev_data.length != 0) {
            const prev_id = prev_data[0].id;
            const prev_reading = prev_data[0].reading;
            const total_reading = reading - prev_reading;
            const total_amount = per_unit_amount * total_reading;

            const sqlUpdate = "UPDATE room_readings SET total_amount=?, total_reading=? WHERE id=?";
            connection.query(sqlUpdate, [total_amount, total_reading, id], function (err, updateRes) {
                if (err) {
                    return callback({ statusCode: 201, message: 'Unable to Update Previous Reading Details', error: err });
                } else {
                    return callback({ statusCode: 200, message: 'Previous Reading Updated', prev_id: prev_id, prev_date: prev_data[0].get_date, prev_reading: prev_reading, total_amount: total_amount, total_reading: total_reading });
                }
            });
        } else {

            const sqlUpdate = "UPDATE room_readings SET total_amount=0, total_reading=0 WHERE id=?";
            connection.query(sqlUpdate, [id], function (err, updateRes) {
                if (err) {
                    return callback({ statusCode: 201, message: 'Unable to Update Previous Reading Details', error: err });
                } else {
                    return callback({ statusCode: 200, message: 'No Previous Reading to Update', prev_id: 0 });
                    // return callback({ statusCode: 200, message: 'Previous Reading Updated', prev_id: prev_id, prev_date: prev_data[0].date, prev_reading: prev_reading, total_amount: total_amount, total_reading: total_reading });
                }
            });

        }
    });
}

function check_old_next_entry(old_id, old_hostel, old_floor, old_room, per_unit_amount, callback) {

    const sqlGetNext = "SELECT *,DATE_FORMAT(date, '%Y-%m-%d') AS get_date FROM room_readings WHERE id > ? AND status = 1 AND hostel_id=? AND room_id=? AND floor_id=? ORDER BY id ASC LIMIT 1";
    connection.query(sqlGetNext, [old_id, old_hostel, old_room, old_floor], function (err, next_data) {
        if (err) {
            return callback({ statusCode: 201, message: 'Unable to Show Next Reading Details', error: err });
        } else if (next_data.length != 0) {

            const next_id = next_data[0].id;
            const next_reading = next_data[0].reading;

            check_old_previous_entry(old_id, old_hostel, old_floor, old_room, function (result) {

                if (result.statusCode == 200) {

                    if (result.prev_id != 0) {

                        const total_reading = next_reading - result.prev_reading;
                        const total_amount = per_unit_amount * total_reading;
                        var last_cal_date = next_data[0].get_date;

                        const sqlUpdate = "UPDATE room_readings SET total_amount=?, total_reading=? WHERE id=?";
                        connection.query(sqlUpdate, [total_amount, total_reading, next_id], function (err, updateRes) {
                            if (err) {
                                return callback({ statusCode: 201, message: 'Unable to Update Next Reading Details', error: err });
                            } else {
                                return callback({ statusCode: 200, message: 'Next Reading Updated', next_id: next_id, prev_id: result.prev_id, next_date: next_data[0].date, next_reading: next_reading, total_amount: total_amount, total_reading: total_reading, last_cal_date: last_cal_date, prev_reading: result.prev_reading, start_date: result.start_date });
                            }
                        });
                    } else {

                        const sqlUpdate = "UPDATE room_readings SET total_amount=0, total_reading=0 WHERE id=?";
                        connection.query(sqlUpdate, [next_id], function (err, updateRes) {
                            if (err) {
                                return callback({ statusCode: 201, message: 'Failed to Update Previous Details', error: err });
                            } else {
                                return callback({ statusCode: 200, message: 'Update Old Next Reading', prev_id: 0, next_id: next_id, next_reading: next_reading });
                            }
                        });
                    }
                } else {
                    return callback({ statusCode: 201, message: result.message, next_id: 0, prev_id: 0 });
                }
            })
        } else {
            return callback({ statusCode: 200, message: 'No Next Reading to Update', next_id: 0 });
        }
    });
}

function check_old_previous_entry(old_id, old_hostel, old_floor, old_room, callback) {

    // Check Previous
    var sql3 = "SELECT *,DATE_FORMAT(date, '%Y-%m-%d') AS get_date FROM room_readings WHERE id < ? AND status = 1 AND hostel_id=? AND room_id=? AND floor_id=? ORDER BY id DESC LIMIT 1";
    connection.query(sql3, [old_id, old_hostel, old_room, old_floor], function (err, data) {
        if (err) {
            console.log(err);
            return callback({ statusCode: 201, message: 'Unable to Show Previous Reading Details', error: err });
        } else if (data.length != 0) {

            var prev_id = data[0].id;
            var prev_reading = data[0].reading;
            var prev_date = data[0].get_date;

            return callback({ statusCode: 200, message: 'Get Old Previous Reading', prev_id: prev_id, prev_reading: prev_reading, start_date: prev_date });

        } else {
            const sqlUpdate = "UPDATE room_readings SET total_amount=0, total_reading=0 WHERE id=?";
            connection.query(sqlUpdate, [old_id], function (err, updateRes) {
                if (err) {
                    return callback({ statusCode: 201, message: 'Failed to Update Previous Details', error: err });
                } else {
                    return callback({ statusCode: 200, message: 'Update Old Previous Reading', prev_id: 0 });
                }
            });
        }
    })
}

function check_next_entry(id, reading, per_unit_amount, atten, callback) {

    const sqlGetNext = "SELECT *,DATE_FORMAT(date, '%Y-%m-%d') AS get_date FROM room_readings WHERE id > ? AND status = 1 AND hostel_id=? AND room_id=? AND floor_id=? ORDER BY id ASC LIMIT 1";
    connection.query(sqlGetNext, [id, atten.hostel_id, atten.room_id, atten.floor_id], function (err, next_data) {
        if (err) {
            return callback({ statusCode: 201, message: 'Unable to Show Next Reading Details', error: err });
        } else if (next_data.length != 0) {

            const next_id = next_data[0].id;
            const next_reading = next_data[0].reading;
            const total_reading = next_reading - reading;
            const total_amount = per_unit_amount * total_reading;

            const sqlUpdate = "UPDATE room_readings SET total_amount=?, total_reading=? WHERE id=?";
            connection.query(sqlUpdate, [total_amount, total_reading, next_id], function (err, updateRes) {
                if (err) {
                    return callback({ statusCode: 201, message: 'Unable to Update Next Reading Details', error: err });
                } else {
                    return callback({ statusCode: 200, message: 'Next Reading Updated', next_id: next_id, next_date: next_data[0].get_date, next_reading: next_reading, total_amount: total_amount, total_reading: total_reading });
                }
            });
        } else {
            return callback({ statusCode: 200, message: 'No Next Reading to Update', next_id: 0 });
        }
    });
}

function edit_split_eb_amounts(atten, startMeterReading, end_Meter_Reading, last_cal_date, total_amount, total_reading, eb_id, created_by, new_date, callback) {

    console.log("bbbbbbbbbbbbbbbbbbbbbbbb", startMeterReading, end_Meter_Reading);

    const sql1 = `SELECT *, 
                  CASE WHEN checkoutDate IS NULL 
                  THEN DATEDIFF(LEAST(CURDATE(), ?), GREATEST(joining_date, ?)) + 1 
                  ELSE DATEDIFF(LEAST(checkoutDate, ?), GREATEST(joining_date, ?)) + 1 
                  END AS days_stayed 
                  FROM hostel 
                  WHERE Hostel_Id = ? AND Floor = ? AND Rooms = ? 
                  AND joining_date <= ? 
                  AND (checkoutDate >= ? OR checkoutDate IS NULL)`;

    connection.query(sql1, [new_date, last_cal_date, new_date, last_cal_date, atten.hostel_id, atten.floor_id, atten.room_id, new_date, last_cal_date],
        function (err, user_data) {
            if (err) {
                console.error('Error fetching user details:', err);
                return callback({ statusCode: 201, message: 'Unable to Get User Details', error: err });
            }

            if (user_data.length === 0) {
                console.log(user_data, "================");

                return callback({ statusCode: 200, message: 'Successfully Added EB Amount1' });
            }

            let totalDays = user_data.reduce((acc, user) => acc + user.days_stayed, 0);
            const amountPerDay = total_amount / totalDays;
            const unitPerDay = total_reading / totalDays;
            let cumulativeAmount = 0;
            let cumulativeUnits = 0;
            let insertCounter = 0;

            user_data.forEach((user, index) => {

                const user_id = user.ID;
                const userDays = user.days_stayed;
                let userAmount = Math.round(userDays * amountPerDay);
                let userUnits = Math.round(userDays * unitPerDay);

                cumulativeAmount += userAmount;
                cumulativeUnits += userUnits;

                // If this is the last user, adjust for any rounding differences
                if (index === user_data.length - 1) {
                    userAmount += total_amount - cumulativeAmount;
                    userUnits += total_reading - cumulativeUnits;
                }

                console.log(userAmount, "================== User Amounts ===============");


                if (userAmount) {

                    const sql2 = "INSERT INTO customer_eb_amount (user_id, start_meter, end_meter, unit, amount, created_by, date, eb_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                    connection.query(sql2, [user_id, startMeterReading, end_Meter_Reading, userUnits, userAmount, created_by, new_date, eb_id],
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

    connection.query(sql1, [atten.date, last_cal_date, atten.date, last_cal_date, atten.hostel_id, atten.floor_id, atten.room_id, atten.date, last_cal_date], function (err, user_data) {
        if (err) {
            console.error('Error fetching user details:', err);
            return callback({ statusCode: 201, message: 'Unable to Get User Details', error: err });
        }

        if (user_data.length === 0) {
            return callback({ statusCode: 200, message: 'Successfully Added EB Amount' });
        }

        let totalDays = user_data.reduce((acc, user) => acc + user.days_stayed, 0);
        const amountPerDay = total_amount / totalDays;
        const unitPerDay = total_reading / totalDays;
        let cumulativeAmount = 0;
        let cumulativeUnits = 0;
        let insertCounter = 0;

        user_data.forEach((user, index) => {

            const user_id = user.ID;
            const userDays = user.days_stayed;
            let userAmount = Math.round(userDays * amountPerDay);
            let userUnits = Math.round(userDays * unitPerDay);

            cumulativeAmount += userAmount;
            cumulativeUnits += userUnits;

            // If this is the last user, adjust for any rounding differences
            if (index === user_data.length - 1) {
                userAmount += total_amount - cumulativeAmount;
                userUnits += total_reading - cumulativeUnits;
            }

            console.log(userAmount, "================== User Amounts ===============");


            if (userAmount) {

                const sql2 = "INSERT INTO customer_eb_amount (user_id, start_meter, end_meter, unit, amount, created_by, date, eb_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                connection.query(sql2, [user_id, startMeterReading, end_Meter_Reading, userUnits, userAmount, created_by, atten.date, eb_id],
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

function delete_room_reading(req, res) {

    var id = req.body.id;

    var created_by = req.user_details.id;

    if (!id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    var sql1 = "SELECT * FROM room_readings AS rr JOIN eb_settings AS eb ON eb.hostel_Id=rr.hostel_id WHERE rr.id=? AND rr.status=1";
    connection.query(sql1, [id], async function (err, read_data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Readings" });
        } else if (read_data.length != 0) {

            var old_hostel = read_data[0].hostel_id;
            var old_floor = read_data[0].floor_id;
            var old_room = read_data[0].room_id;

            var per_unit_amount = read_data[0].amount;

            var sql2 = "UPDATE room_readings SET status=0 WHERE id=?";
            connection.query(sql2, [id], async function (err, up_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Delete Readings" });
                } else {
                    await check_old_next_entry(id, old_hostel, old_floor, old_room, per_unit_amount, async function (old_result) {

                        console.log(old_result, "=================  old_result  ================");

                        if (old_result.statusCode == 200) {

                            const deleteQuery = "DELETE FROM customer_eb_amount WHERE eb_id IN (?, ?)";
                            connection.query(deleteQuery, [old_result.next_id, id], async function (err, deleteRes) {
                                if (err) {
                                    return res.status(201).json({ statusCode: 201, message: 'Unable to Delete from Customer Eb Amount', error: err });
                                } else {

                                    if (old_result.next_id != 0) {

                                        var startmeter = old_result.next_reading;
                                        var new_date = old_result.start_date;

                                        var total_amount = old_result.total_amount;

                                        var total_reading = old_result.total_reading;

                                        var new_read = startmeter - total_reading;

                                        var eb_id = old_result.next_id;

                                        var last_cal_date = old_result.last_cal_date

                                        var attens = {
                                            hostel_id: old_hostel,
                                            floor_id: old_floor,
                                            room_id: old_room
                                        }

                                        await edit_split_eb_amounts(attens, new_read, startmeter, new_date, total_amount, total_reading, eb_id, created_by, last_cal_date, function (response) {
                                            console.log("Old Response Final Response1", response);
                                        });
                                    }

                                    return res.status(200).json({ statusCode: 200, message: "Reading Deleted Successfully" });
                                }
                            })

                        } else {
                            return res.status(201).json({ statusCode: 201, message: 'Failed to Update Previous/Next Details', error: err });
                        }
                    })
                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Reading Details" });
        }
    })
}

module.exports = { all_notifications, add_notification, update_notification_status, add_room_reading, edit_room_reading, delete_room_reading }
