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

exports.reassign_bed = (req, res) => {

    var { user_id, hostel_id, c_floor, c_room, c_bed, re_floor, re_room, re_bed, re_date, re_rent } = req.body;

    if (!user_id || !hostel_id || !c_floor || !c_room || !c_bed || !re_floor || !re_room || !re_bed || !re_date || !re_rent) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var created_by = req.user_details.id;

    var sql = "SELECT * FROM hostel WHERE ID=? AND isActive=1 AND Hostel_Id=?";
    connection.query(sql, [user_id, hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching User Details", reason: err.message })
        } else if (data.length != 0) {

            var sql2 = "INSERT INTO reassign_userdetails (user_id,hostel_id,old_floor,old_room,old_bed,new_floor,new_room,new_bed,reassign_date,created_by,status) VALUES (?)"
            var params = [user_id, hostel_id, c_floor, c_room, c_bed, re_floor, re_room, re_bed, re_date, created_by, 1];
            connection.query(sql2, [params], function (err, ins_res) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Reassign error", reason: err.message })
                } else {

                    var sql3 = "UPDATE hostel SET Floor=?,Rooms=?,Bed=?,reassign_date=?,RoomRent=? WHERE ID=?";
                    connection.query(sql3, [re_floor, re_room, re_bed, re_date, re_rent, user_id], function (err, up_data) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Update Details error", reason: err.message })
                        } else {

                            // old bed value is 0
                            var sql4 = "UPDATE bed_details SET user_id=0,isfilled=0 WHERE id=?";
                            connection.query(sql4, [c_bed], function (err, up_bed_data) {
                                if (err) {
                                    return res.status(201).json({ statusCode: 201, message: "Update Old Bed Details error", reason: err.message })
                                } else {

                                    // Change New Bed Value
                                    var sql5 = "UPDATE bed_details SET user_id=?,isfilled=1 WHERE id=?";
                                    connection.query(sql5, [user_id, re_bed], function (err, up_newbed) {
                                        if (err) {
                                            return res.status(201).json({ statusCode: 201, message: "Update New Bed Details error", reason: err.message })
                                        } else {
                                            return res.status(200).json({ statusCode: 200, message: "Reassigned Successfully!" })
                                        }
                                    })
                                }
                            })
                        }
                    })
                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
        }
    })
}

exports.all_contacts = (req, res) => {

    var user_id = req.body.user_id;

    if (!user_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing User Details" })
    }

    var sql = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
    connection.query(sql, [user_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching User Details", reason: err.message })
        } else if (data.length != 0) {

            var sql2 = "SELECT * FROM contacts WHERE user_id=? AND status=1";
            connection.query(sql2, [user_id], function (err, Data) {
                if (err) {
                    return res.status(201).json({ message: "Unable to Get Contact Details", statusCode: 201 });
                } else {
                    res.status(200).json({ statusCode: 200, message: "View Customer Details", contact_details: Data });
                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
        }
    })
}