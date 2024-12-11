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
                var sql2 = "SELECT u.id AS user_id, u.name AS user_Name, ah.amenity_Id FROM hostel u INNER JOIN AmenitiesHistory ah ON u.user_Id = ah.user_Id WHERE ah.amenity_Id = ? AND ah.status = 1 AND ah.hostel_Id=?";
                connection.query(sql2, [am_id, hostel_id], function (err, sel_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Selected List", reason: err.message })
                    } else {

                        var sql3 = "SELECT u.id AS user_id,u.name AS user_Name FROM hostel u WHERE NOT EXISTS (SELECT 1 FROM AmenitiesHistory ah WHERE ah.user_Id = u.user_Id AND ah.amenity_Id = ? AND ah.status = 1 AND u.isActive=1 AND u.Hostel_Id=?)"
                        connection.query(sql3, [am_id, hostel_id], function (err, unsel_res) {
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

exports.remove_user_amenitie = (req, res) => {
    
}