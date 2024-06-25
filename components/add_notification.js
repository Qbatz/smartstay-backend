const connection = require('../config/connection')

function add_notification(user_id, title, user_type, message) {

    console.log(user_id, title, user_type, message);

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
            console.log(check_err);
            // return res.status(201).json({ message: "Unable to Get User Details", statusCode: 201 })
        } else if (check_res.length != 0) {

            var sql2 = "INSERT INTO notifications (user_id,title,user_type,message,status) VALUES (?,?,?,?,1)";
            connection.query(sql2, [user_id, title, user_type, message], (ins_err, ins_res) => {
                if (ins_err) {
                    console.log(ins_err);
                    // return res.status(201).json({ message: "Unable to Add User Details", statusCode: 201 })
                } else {
                    console.log("Added New Notification");
                    // return res.status(200).json({ message: "Added New Notification", statusCode: 200 })
                }
            })
        } else {
            console.log("Invalid User Details");
            // return res.status(201).json({ message: "Invalid User Details", statusCode: 201 })
        }
    })
}

module.exports = { add_notification }