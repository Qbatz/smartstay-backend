const connection = require('../config/connection')

exports.all_customer_list = (req, res) => {

    var { hostel_id, am_id } = req.body;

    if (!am_id || !hostel_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var sql1 = "SELECT * FROM Amenities WHERE id=? AND Hostel_Id=? AND Status=1";
    connection.query(sql1, [am_id, hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Amenities List", reason: err.message })
        } else if (data.length != 0) {

            var ch_default = data[0].setAsDefault;

            if (ch_default == 1) {
                return res.status(201).json({ statusCode: 201, message: "Not Available for Default Amenitie" })
            } else {

                // Selected Users
                var sql2 = "SELECT u.id, u.name AS user_Name, u.User_Id AS user_id, ah.amenity_Id FROM hostel u INNER JOIN AmenitiesHistory ah ON u.user_Id = ah.user_Id WHERE ah.amenity_Id = ? AND ah.status = 1 AND ah.hostel_Id = ? AND ah.created_At = (SELECT MAX(created_At) FROM AmenitiesHistory WHERE user_Id = ah.user_Id AND amenity_Id = ah.amenity_Id)";
                connection.query(sql2, [am_id, hostel_id], function (err, sel_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Selected List", reason: err.message })
                    } else {

                        // var sql3 = "SELECT u.id,u.name AS user_Name,u.User_Id AS user_id FROM hostel u WHERE NOT EXISTS (SELECT 1 FROM AmenitiesHistory ah WHERE ah.user_Id = u.user_Id AND ah.amenity_Id = ? AND ah.status = 0 AND u.isActive=1 AND u.Hostel_Id=?)"
                        var sql3 = "SELECT u.id, u.name AS user_Name, u.User_Id AS user_id FROM hostel u WHERE u.Hostel_Id = 1 AND u.isActive = 1 AND NOT EXISTS (SELECT 1 FROM AmenitiesHistory ah WHERE ah.user_Id = u.User_Id AND ah.amenity_Id = ? AND ah.status = 0 AND ah.created_At = (SELECT MAX(created_At) FROM AmenitiesHistory WHERE user_Id = ah.user_Id AND amenity_Id = ah.amenity_Id));"
                        connection.query(sql3, [am_id], function (err, unsel_res) {
                            if (err) {
                                console.log(err);

                                return res.status(201).json({ statusCode: 201, message: "Unable to Get Un Selected List", reason: err.message })
                            } else {
                                return res.status(200).json({ statusCode: 200, message: "All Amenities", selected: sel_res, unselected: unsel_res })
                            }
                        })
                    }
                })
            }
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid or Inactive Amenitie" })
        }
    })
}

exports.remove_assigned_amenitie = (req, res) => {

    var { am_id, hostel_id, user_ids } = req.body;
    var created_by = req.user_details.id;

    // Validate input fields
    if (!am_id || !hostel_id || !user_ids) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(201).json({ statusCode: 201, message: "Missing or Invalid User Details" });
    }

    var sql1 = "SELECT * FROM Amenities WHERE id=? AND Hostel_Id=? AND Status=1";
    connection.query(sql1, [am_id, hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Amenities List", reason: err.message })
        } else if (data.length != 0) {

            var ch_default = data[0].setAsDefault;

            if (ch_default == 1) {
                return res.status(201).json({ statusCode: 201, message: "Not Available for Default Amenitie" })
            } else {

                var sql3 = "UPDATE AmenitiesHistory SET status=0 WHERE amenity_Id=? AND hostel_Id=? AND user_Id IN (?)";
                connection.query(sql3, [am_id, hostel_id, user_ids], function (err, ins_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Users List", reason: err.message })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Amenities Removed successfully" });
                    }
                })
            }
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid or Inactive Amenitie" })
        }
    })

}

exports.assign_amenity = (req, res) => {

    var { am_id, hostel_id, user_ids } = req.body;

    var created_by = req.user_details.id;

    if (!am_id || !hostel_id || !user_ids) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    if (!Array.isArray(user_ids) || user_ids.length === 0) {
        return res.status(201).json({ statusCode: 201, message: "Missing or Invalid User Details" });
    }

    var sql1 = "SELECT * FROM Amenities WHERE id=? AND Hostel_Id=? AND Status=1";
    connection.query(sql1, [am_id, hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Amenities List", reason: err.message })
        } else if (data.length != 0) {

            var ch_default = data[0].setAsDefault;

            if (ch_default == 1) {
                return res.status(201).json({ statusCode: 201, message: "Not Available for Default Amenitie" })
            } else {

                // for (let i = 0; i < user_ids.length; i++) {

                //     var new_user_id = user_ids[i].user_id;

                //     var sql2 = "SELECT * FROM hostel WHERE User_Id=? AND isActive=1";
                //     connection.query(sql2, [new_user_id], function (err, data) {
                //         if (err) {
                //             return res.status(201).json({ statusCode: 201, message: "Unable to Get Users List", reason: err.message })
                //         } else if (data.length != 0) {

                const insertValues = user_ids.map(user_id => [user_id, am_id, hostel_id, created_by]);
                var sql3 = "INSERT INTO AmenitiesHistory (user_Id,amenity_Id,hostel_Id,created_By) VALUES ?";

                connection.query(sql3, [insertValues], function (err, ins_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Users List", reason: err.message })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Amenities assigned successfully" });
                    }
                })
                //         } else {
                //             console.log("Invalid User");

                //         }
                //     })
                // }
            }
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid or Inactive Amenitie" })
        }
    })

}