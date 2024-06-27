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


module.exports = { all_notifications, add_notification, update_notification_status }
