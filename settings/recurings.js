const connection = require("../config/connection");

exports.add_recuring = (req, res) => {

    var { type, hostel_id, start_date, end_date } = req.body;

    var duration = req.body.duration || 0;
    var recure = req.body.recure || 1;

    var created_by = req.user_details.id;

    if (!type || !hostel_id || !start_date || !end_date) {
        res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    const allowedTypes = ['electricity', 'invoice', 'amenities'];

    if (!allowedTypes.includes(type)) {
        return res.status(201).json({ statusCode: 201, message: `Invalid type. Allowed types are: ${allowedTypes.join(', ')}` });
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
                        return res.status(200).json({ statusCode: 200, message: "Added Electricity Details" });
                    }
                })
            } else if (type == 'invoice') {

                var sql2 = "UPDATE hosteldetails SET recure=?,inv_startdate=?,inv_enddate=?,duration=? WHERE id=?";
                connection.query(sql2, [recure, start_date, end_date, duration, hostel_id], function (err, up_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Update Invoice Details" });
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Added Invoice Details" });
                    }
                })
            } else {

                var sql2 = "SELECT * FROM amenities_settings WHERE hostel_id=?";
                connection.query(sql2, [hostel_id], function (err, am_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Amenities Details" });
                    } else if (am_data.length != 0) {

                        var sql3 = "UPDATE amenities_settings SET recure=?,start_date=?,end_date=?,duration=? WHERE id=?";
                        connection.query(sql3, [recure, start_date, end_date, duration, hostel_id], function (err, up_data) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Update Amenities Details" });
                            } else {
                                return res.status(200).json({ statusCode: 200, message: "Updated Amenities Details" });
                            }
                        })
                    } else {

                        var sql4 = "INSERT INTO amenities_settings (hostel_id,recure,start_date,end_date,duration,createdby) VALUES (?,?,?,?,?,?,?)";
                        connection.query(sql4, [hostel_id, recure, start_date, end_date, duration, created_by], function (err, ins_res) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Add Amenities Details" });
                            } else {
                                return res.status(200).json({ statusCode: 200, message: "Added Amenities Details" });
                            }
                        })
                    }
                })
            }

        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Hostel Details" });
        }
    })


}