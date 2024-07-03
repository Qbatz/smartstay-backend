const connection = require('../config/connection')

function add_notification(user_id, title, user_type, message, unseen_users) {

    // console.log(user_id, title, user_type, message, unseen_users);

    if (!unseen_users || unseen_users == undefined) {
        var unseen_users = 0;
    }

    if (unseen_users.length > 0) {
        var unseen_users_str = JSON.stringify(unseen_users);
        unseen_users_str = unseen_users_str.substring(1, unseen_users_str.length - 1);
    } else {
        var unseen_users_str = 0; // or some default value if unseen_users is empty
    }

    var sql2 = "INSERT INTO notifications (user_id,title,user_type,message,status,unseen_users) VALUES (?,?,?,?,1,?)";
    // console.log(sql2);
    connection.query(sql2, [user_id, title, user_type, message, unseen_users_str], (ins_err, ins_res) => {
        if (ins_err) {
            console.log(ins_err);
            // return res.status(201).json({ message: "Unable to Add User Details", statusCode: 201 })
        } else {
            console.log("Added New Notification");
            // return res.status(200).json({ message: "Added New Notification", statusCode: 200 })
        }
    })
}

module.exports = { add_notification }