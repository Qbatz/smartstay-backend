const connection = require('../config/connection')

exports.add_contact = (req, res) => {

    var { user_name, guardian, mob_no, address, user_id, id } = req.body;

    var created_by = req.user_details.id;

    if (!user_name || !guardian || !mob_no || !user_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    if (id) {

        var sql2 = "SELECT * FROM contacts WHERE id=? AND status=1";
        connection.query(sql2, [id], function (err, ch_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error Fetching Contact Details", reason: err.message })
            } else if (ch_data.length != 0) {

                var sql2 = "SELECT * FROM contacts WHERE mob_no=? AND status=1 AND user_id=? AND id!=?";
                connection.query(sql2, [mob_no, user_id, id], function (err, sel_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error Fetching Contact Details", reason: err.message })
                    } else if (sel_res.length == 0) {

                        var sql3 = "UPDATE contacts SET user_name=?,guardian=?,mob_no=?,address=? WHERE id=?";
                        connection.query(sql3, [user_name, guardian, mob_no, address, id], function (err, ins_data) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Error Fetching Edit Contact Details", reason: err.message })
                            } else {
                                return res.status(200).json({ statusCode: 200, message: "Contact Updated Successfully!" })
                            }
                        })
                    } else {
                        return res.status(201).json({ statusCode: 201, message: "Mobile Number Already Exists!" })
                    }
                })

            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
            }
        })

    } else {

        var sql2 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
        connection.query(sql2, [user_id], function (err, ch_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error Fetching User Details", reason: err.message })
            } else if (ch_data.length != 0) {

                var sql1 = "SELECT COUNT(id) AS contact_count FROM contacts WHERE user_id=? AND status=1";
                connection.query(sql1, [user_id], function (err, count_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error Fetching Count Details", reason: err.message })
                    } else {

                        var count = count_data[0].contact_count;

                        if (count < 2) {

                            var sql2 = "SELECT * FROM contacts WHERE mob_no=? AND status=1 AND user_id=?";
                            connection.query(sql2, [mob_no, user_id], function (err, sel_res) {
                                if (err) {
                                    return res.status(201).json({ statusCode: 201, message: "Error Fetching Contact Details", reason: err.message })
                                } else if (sel_res.length == 0) {

                                    var sql3 = "INSERT INTO contacts (user_name,guardian,mob_no,address,user_id,created_by) VALUES (?)";
                                    var params = [user_name, guardian, mob_no, address, user_id, created_by];

                                    connection.query(sql3, [params], function (err, ins_data) {
                                        if (err) {
                                            return res.status(201).json({ statusCode: 201, message: "Error Fetching Add Contact Details", reason: err.message })
                                        } else {
                                            return res.status(200).json({ statusCode: 200, message: "Contact Added Successfully!" })
                                        }
                                    })
                                } else {
                                    return res.status(201).json({ statusCode: 201, message: "Mobile Number Already Exists!" })
                                }
                            })
                        } else {
                            return res.status(201).json({ statusCode: 201, message: "Contact Limit Exceed !" })
                        }
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
            }
        })
    }
}

exports.delete_contact = (req, res) => {

    var id = req.body.id;

    if (!id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var sql2 = "SELECT * FROM contacts WHERE id=? AND status=1";
    connection.query(sql2, [id], function (err, ch_data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching Contact Details", reason: err.message })
        } else if (ch_data.length != 0) {

            var sql3 = "UPDATE contacts SET status=0 WHERE id=?";
            connection.query(sql3, [id], function (err, ins_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error Fetching Delete Contact Details", reason: err.message })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Contact Deleted Successfully!" })
                }
            })

        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Contact Details" })
        }
    })

}