const connection = require("../config/connection");

exports.add_recuring = (req, res) => {

    var { type, hostel_id, start_date, end_date, am_id } = req.body;

    var duration = req.body.duration || 1;
    var recure = req.body.recure;

    if (!type || !hostel_id || !start_date || !end_date) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    const allowedTypes = ['electricity', 'invoice', 'amenities'];

    if (!allowedTypes.includes(type)) {
        return res.status(201).json({ statusCode: 201, message: `Invalid type. Allowed types are: ${allowedTypes.join(', ')}` });
    }

    if (type == 'amenities' && !am_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Amentie Id" });
    }

    var sql1 = "SELECT * FROM hosteldetails WHERE id=? AND isActive=1";
    connection.query(sql1, [hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" });
        } else if (data.length != 0) {

            if (type == 'electricity') {

                var sql2 = "UPDATE eb_settings SET recuring=?,start_date=?,end_date=?,duration=? WHERE hostel_id=?";
                connection.query(sql2, [recure, start_date, end_date, duration, hostel_id], function (err, up_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Update Electricity Details" });
                    } else {

                        if (recure == 0) {
                            return res.status(200).json({ statusCode: 200, message: "Recure Disabled Successfully" });
                        } else {
                            return res.status(200).json({ statusCode: 200, message: "Added Electricity Details" });
                        }

                    }
                })
            } else if (type == 'invoice') {

                var sql2 = "UPDATE hosteldetails SET recure=?,inv_startdate=?,inv_enddate=?,duration=? WHERE id=?";
                connection.query(sql2, [recure, start_date, end_date, duration, hostel_id], function (err, up_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Update Invoice Details" });
                    } else {
                        if (recure == 0) {
                            return res.status(200).json({ statusCode: 200, message: "Recure Disabled Successfully" });
                        } else {
                            return res.status(200).json({ statusCode: 200, message: "Added Invoice Details" });
                        }
                    }
                })
            } else {


                var sql3 = "SELECT * FROM Amenities WHERE id=? AND Hostel_Id=? AND Status=1";
                connection.query(sql3, [am_id, hostel_id], function (err, checK_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Amenity Details" });
                    } else if (checK_data.length != 0) {

                        var sql2 = "UPDATE Amenities SET recuring=?,startdate=?,enddate=?,duration=? WHERE id=?";
                        connection.query(sql2, [recure, start_date, end_date, duration, am_id], function (err, up_res) {
                            if (err) {
                                console.log(err);
                                return res.status(201).json({ statusCode: 201, message: "Unable to Update Amenity Details" });
                            } else {
                                if (recure == 0) {
                                    return res.status(200).json({ statusCode: 200, message: "Recure Disabled Successfully" });
                                } else {
                                    return res.status(200).json({ statusCode: 200, message: "Added Amenities Details" });
                                }
                            }
                        })

                    } else {
                        return res.status(201).json({ statusCode: 201, message: "Invalid Amenity Details" });
                    }
                })
            }
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Hostel Details" });
        }
    })


}