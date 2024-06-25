const connection = require('./config/connection')

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

    var sql1 = "SELECT id,user_id,title,user_type,message,createdat,updatedat,CASE WHEN (seen_users LIKE '%,?,%' OR seen_users LIKE '?,%' OR seen_users LIKE '%,?' OR seen_users = '?') THEN 0 ELSE status END AS status FROM notifications WHERE (user_id = ? OR user_id = 0)  AND user_type = ?;"
    connection.query(sql1, [user_id, user_id, user_id, user_id, user_id, user_type], (sql_err, sql_res) => {
        if (sql_err) {
            res.status(201).json({ message: "Unable to get Notifications Details", statusCode: 201 })
        } else {
            res.status(200).json({ message: "Notifications Details", statusCode: 200, notification: sql_res })
        }
    })
}

function add_notification(req, res) {

    var { user_id, title, user_type, message } = req.body;

    if ((!message && message == undefined) || (!title && title == undefined) || !user_type || !user_id) {
        return res.status(201).json({ message: "Missing required fields", statusCode: 201 })
    }

    if (typeof user_id !== 'number' || user_id <= 0) {
        console.log("Validation failed: Invalid user_id");
        return res.status(201).json({ message: "Validation failed: Invalid user_id", statusCode: 201 });
    }

    // Check User Id

    if (user_type == 1) {
        // It's Admin
        var sql1 = "SELECT * FROM createaccount WHERE id=?";
    } else {
        // It's Customer
        var sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
    }

    connection.query(sql1, [user_id], (check_err, check_res) => {
        if (check_err) {
            return res.status(201).json({ message: "Unable to Get User Details", statusCode: 201 })
        } else if (check_res.length != 0) {

            var sql2 = "INSERT INTO notifications (user_id,title,user_type,message,status) VALUES (?,?,?,?,1)";
            connection.query(sql2, [user_id, title, user_type, message], (ins_err, ins_res) => {
                if (ins_err) {
                    return res.status(201).json({ message: "Unable to Add User Details", statusCode: 201 })
                } else {
                    return res.status(200).json({ message: "Added New Notification", statusCode: 200 })
                }
            })
        } else {
            return res.status(201).json({ message: "Invalid User Details", statusCode: 201 })
        }
    })
}

function update_notification_status(req, res) {

    var id = req.body.id;
    var user_id = req.user_details.id;

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

                    var noti_user_id = sel_res[0].user_id;
                    var seen_users = sel_res[0].seen_users || '';

                    var new_id = sel_res[0].id;

                    if (noti_user_id == 0) {

                        if (seen_users === '0') {
                            seen_users = '';
                        }

                        if (!seen_users.includes(',' + user_id + ',') &&
                            !seen_users.startsWith(user_id + ',') &&
                            !seen_users.endsWith(',' + user_id) &&
                            seen_users != user_id) {
                            seen_users = seen_users ? seen_users + ',' + user_id : user_id;
                        }
                        var sql2 = "UPDATE notifications SET seen_users=?,status=0 WHERE id='" + new_id + "'";
                        console.log(sql2);
                        connection.query(sql2, [seen_users], (err, data) => {
                            if (err) {
                                console.log(err);
                            }
                        });
                    } else {
                        var sql3 = "UPDATE notifications SET status=0 WHERE id='" + new_id + "'";
                        console.log(sql3);
                        connection.query(sql3, (err, data) => {
                            if (err) {
                                console.log(err);
                            }
                        })
                    }
                } else {
                    console.log("Invalid ID");
                }
            })
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


module.exports = { all_notifications, add_notification, update_notification_status }
