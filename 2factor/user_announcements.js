const connection = require('../config/connection')

exports.like_announcement = (req, res) => {

    var an_id = req.body.an_id;
    var hostel_id = req.hostel_id;

    var user_id = req.user_details.id;

    console.log(hostel_id);

    if (!an_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var sql1 = "SELECT * FROM announcements WHERE hostel_id=? AND id=? AND status=1";
    connection.query(sql1, [hostel_id, an_id], function (err, an_data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get Announcement Details", reason: err.message })
        }

        if (an_data.length == 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid Announcement Details" })
        }

        var sql3 = "SELECT * FROM announcement_likes WHERE an_id=? AND user_id=? AND status=1";
        connection.query(sql3, [an_id, user_id], function (err, get_res) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Get Announcement Like Details", reason: err.message })
            }

            if (get_res.length == 0) {

                var sql2 = "INSERT INTO announcement_likes (user_id,an_id) VALUES (?,?)";
                connection.query(sql2, [user_id, an_id], function (err, data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error to Add Like Details", reason: err.message })
                    }

                    return res.status(200).json({ statusCode: 200, message: "Like Added Successfully" })
                })
            } else {

                var sql2 = "UPDATE announcement_likes SET status=0 WHERE an_id=? AND user_id=?";
                connection.query(sql2, [an_id, user_id], function (err, data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error to Remove Like Details", reason: err.message })
                    }

                    return res.status(200).json({ statusCode: 200, message: "Like Removed Successfully" })
                })
            }
        })

    })
}

exports.all_announcements = (req, res) => {

    var hostel_id = req.hostel_id;

    var sql = "SELECT * FROM announcements WHERE hostel_id=? AND status=1";
    connection.query(sql, [hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching User Details", reason: err.message })

        } else {
            return res.status(200).json({ statusCode: 200, message: "View Announcement Details", announcements: data });
        }
    })
}