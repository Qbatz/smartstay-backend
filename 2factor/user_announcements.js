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

    var sql = "SELECT * FROM announcements WHERE hostel_id=? AND status=1 ORDER BY id DESC";
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

// exports.all_comments = (req, res) => {

//     var an_id = req.body.an_id;

//     if (!an_id) {
//         return res.status(201).json({ statusCode: 201, message: "Missing Announcement Details" })
//     }

//     var sql1 = "SELECT c.id AS comment_id, c.an_id, c.comment, c.user_id, c.user_type, c.created_at, CASE WHEN c.user_type='customers' THEN u.profile ELSE a.profile END AS profile, CASE WHEN c.user_type = 'customers' THEN u.Name ELSE a.first_name END AS name, CASE WHEN c.user_type = 'customers' THEN u.Email ELSE a.email_Id END AS email, COUNT(cl.id) AS like_count FROM announcement_comments c LEFT JOIN hostel u ON c.user_id = u.id AND c.user_type = 'customers' LEFT JOIN createaccount a ON c.user_id = a.id AND c.user_type != 'customers' LEFT JOIN announcement_comment_likes cl ON c.id = cl.comment_id WHERE c.an_id = ? GROUP BY c.id ORDER BY c.created_at DESC;";
//     connection.query(sql1, [an_id], function (err, data) {
//         if (err) {
//             return res.status(201).json({ statusCode: 201, message: "Error to Get Comment Details", reason: err.message })
//         }
//         return res.status(200).json({ statusCode: 200, message: "Comments fetched successfully", comments: data });
//     })
// }

exports.all_comments = (req, res) => {
    var an_id = req.body.an_id;

    if (!an_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Announcement Details" });
    }

    // Query to fetch all comments and sub-comments
    var sql = "SELECT c.id AS comment_id, c.an_id, c.comment, c.user_id, c.user_type, c.created_at, c.parent_comment_id, CASE WHEN c.user_type = 'customers' THEN u.profile ELSE a.profile END AS profile,CASE WHEN c.user_type='customers' THEN u.profile ELSE a.profile END AS profile, CASE WHEN c.user_type = 'customers' THEN u.Name ELSE a.first_name END AS name, CASE WHEN c.user_type = 'customers' THEN u.Email ELSE a.email_Id END AS email, COUNT(cl.id) AS like_count FROM announcement_comments c LEFT JOIN hostel u ON c.user_id = u.id AND c.user_type = 'customers' LEFT JOIN createaccount a ON c.user_id = a.id AND c.user_type != 'customers' LEFT JOIN announcement_comment_likes cl ON c.id = cl.comment_id WHERE c.an_id = ? GROUP BY c.id ORDER BY c.parent_comment_id ASC, c.created_at DESC;";

    connection.query(sql, [an_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get Comment Details", reason: err.message });
        }

        // Build hierarchical comment structure
        const commentsMap = {};
        const mainComments = [];

        data.forEach(comment => {
            const commentData = {
                comment_id: comment.comment_id,
                an_id: comment.an_id,
                comment: comment.comment,
                user_id: comment.user_id,
                user_type: comment.user_type,
                created_at: comment.created_at,
                profile: comment.profile,
                name: comment.name,
                email: comment.email,
                like_count: comment.like_count,
                replies: []
            };

            commentsMap[comment.comment_id] = commentData;

            if (comment.parent_comment_id === null) {
                // Top-level comment
                mainComments.push(commentData);
            } else {
                // Sub-comment (reply)
                const parent = commentsMap[comment.parent_comment_id];
                if (parent) {
                    parent.replies.push(commentData);
                }
            }
        });

        return res.status(200).json({ statusCode: 200, message: "Comments fetched successfully", comments: mainComments });
    });
};




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

exports.all_complaint_comments = (req, res) => {

    var com_id = req.body.com_id;

    if (!com_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Complaint Details" })
    }

    var sql1 = "SELECT c.id AS comment_id, c.com_id, c.comment, c.user_id, c.user_type, c.created_at, CASE WHEN c.user_type='customers' THEN u.profile ELSE a.profile END AS profile,CASE WHEN c.user_type = 'customers' THEN u.Name WHEN c.user_type != 'customers' THEN a.first_name END AS name, CASE WHEN c.user_type = 'customers' THEN u.Email WHEN c.user_type != 'customers' THEN a.email_Id END AS email FROM complaice_comments c LEFT JOIN hostel u ON c.user_id = u.id AND c.user_type = 'customers' LEFT JOIN createaccount a ON c.user_id = a.id AND c.user_type != 'customers' WHERE c.com_id = ? ORDER BY c.created_at DESC;";
    connection.query(sql1, [com_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get Comment Details", reason: err.message })
        }
        return res.status(200).json({ statusCode: 200, message: "Comments fetched successfully", comments: data });
    })
}

exports.announcment_comment_like = (req, res) => {

    var comment_id = req.body.comment_id;
    var an_id = req.body.an_id;

    var user_type = req.user_type;
    var user_id = req.user_details.id;

    if (!comment_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Like Details" });
    }

    var sql12 = "SELECT c.id AS comment_id, c.an_id, c.comment, c.user_id, c.user_type, c.created_at,CASE WHEN c.user_type='customers' THEN u.profile ELSE a.profile END AS profile, CASE WHEN c.user_type = 'customers' THEN u.Name WHEN c.user_type != 'customers' THEN a.first_name END AS name, CASE WHEN c.user_type = 'customers' THEN u.Email WHEN c.user_type != 'customers' THEN a.email_Id END AS email FROM announcement_comments c LEFT JOIN hostel u ON c.user_id = u.id AND c.user_type = 'customers' LEFT JOIN createaccount a ON c.user_id = a.id AND c.user_type != 'customers' WHERE c.an_id = ? AND c.id=? ORDER BY c.created_at DESC";
    connection.query(sql12, [an_id, comment_id], function (err, sel_data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Announcement Comment Details", reason: err.message });
        }

        if (sel_data.length == 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid Announcement or Comment Details" });
        }

        var sql1 = "SELECT * FROM announcement_comment_likes WHERE comment_id=? AND user_id=? AND user_type=? AND status=1";
        connection.query(sql1, [comment_id, user_id, user_type], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error Get Like Details", reason: err.message });
            }

            if (data.length == 0) {

                var sql2 = "INSERT INTO announcement_comment_likes (comment_id, user_id, user_type) VALUES (?, ?, ?)";

                connection.query(sql2, [comment_id, user_id, user_type], (err) => {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error Adding Like", reason: err.message });
                    }
                    return res.status(200).json({ statusCode: 200, message: "Like Added Successfully" });
                });
            } else {

                var sql2 = "UPDATE announcement_comment_likes SET status=0 WHERE comment_id=? AND user_id=? AND user_type=?";
                connection.query(sql2, [comment_id, user_id, user_type], (err) => {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error Remove Like", reason: err.message });
                    }
                    return res.status(200).json({ statusCode: 200, message: "Like Removed Successfully" });
                });

            }
        })
    })
}

exports.reply_to_comment = (req, res) => {

    const { an_id, comment, parent_comment_id } = req.body;

    const user_type = req.user_type;
    const user_id = req.user_details.id;

    // Validate required fields
    if (!an_id || !comment || !parent_comment_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing required fields" });
    }

    // Validate that the parent comment exists
    const validateParentSql = "SELECT id FROM announcement_comments WHERE id = ?";
    connection.query(validateParentSql, [parent_comment_id], (err, parentComment) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error validating parent comment", reason: err.message });
        }

        if (parentComment.length === 0) {
            return res.status(201).json({ statusCode: 201, message: "Parent comment not found" });
        }

        // Insert the reply
        const sql = `INSERT INTO announcement_comments (an_id, comment, user_id, user_type, parent_comment_id) VALUES (?, ?, ?, ?, ?)`;
        connection.query(sql, [an_id, comment, user_id, user_type, parent_comment_id], (err, data) => {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error adding reply", reason: err.message });
            }

            return res.status(200).json({ statusCode: 200, message: "Reply added successfully!" });
        });
    });
};

