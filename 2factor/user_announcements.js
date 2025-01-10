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

exports.add_comment = (req, res) => {

    var { an_id, comment } = req.body;

    var user_type = req.user_type;
    var user_id = req.user_details.id;

    if (!an_id || !comment) {
        return res.status(201).json({ statusCode: 201, message: "Missing required fields" });
    }

    var sql1 = "INSERT INTO announcement_comments (an_id,comment,user_id,user_type) VALUES (?,?,?,?)";
    connection.query(sql1, [an_id, comment, user_id, user_type], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Add Comment Details", reason: err.message });
        }

        return res.status(200).json({ statusCode: 200, message: "Comment added successfully!" });
    })

}

exports.all_comments = (req, res) => {

    var an_id = req.body.an_id;

    if (!an_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Announcement Details" })
    }

    var sql1 = "SELECT c.id AS comment_id, c.an_id, c.comment, c.user_id, c.user_type, c.created_at,CASE WHEN c.user_type='customers' THEN u.profile ELSE a.profile END AS profile, CASE WHEN c.user_type = 'customers' THEN u.Name WHEN c.user_type != 'customers' THEN a.first_name END AS name, CASE WHEN c.user_type = 'customers' THEN u.Email WHEN c.user_type != 'customers' THEN a.email_Id END AS email FROM announcement_comments c LEFT JOIN hostel u ON c.user_id = u.id AND c.user_type = 'customers' LEFT JOIN createaccount a ON c.user_id = a.id AND c.user_type != 'customers' WHERE c.an_id = ? ORDER BY c.created_at DESC;";
    connection.query(sql1, [an_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get Comment Details", reason: err.message })
        }
        return res.status(200).json({ statusCode: 200, message: "Comments fetched successfully", comments: data });
    })
}

exports.add_complaint_comment = (req, res) => {

    var { complaint_id, message } = req.body;

    var user_type = req.user_type;
    var user_id = req.user_details.id;

    if (!complaint_id || !message) {
        return res.status(201).json({ statusCode: 201, message: "Missing MAndatory Fields" })
    }

    var sql1 = "SELECT * FROM compliance WHERE ID=? AND isActive=1";
    connection.query(sql1, [complaint_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Fetch Complaince Details", reson: err.message })
        }

        if (data.length == 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid or Inactive Complaint Details" })
        }

        var sql2 = "INSERT INTO complaice_comments (com_id,comment,user_id,user_type) VALUES (?,?,?,?)";
        connection.query(sql2, [complaint_id, message, user_id, user_type], function (err, ins_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Fetch Complaince Details", reson: err.message })
            }

            return res.status(200).json({ statusCode: 200, message: "Comment Added Successfully!" });
        })
    })
}
