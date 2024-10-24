const connection = require('./config/connection')

function add_booking(req, res) {

    var created_by = req.user_details.id;

    var { first_name, last_name, joining_date, amount, hostel_id, floor_id, room_id, bed_id, comments, id, phone_number, email_id, address } = req.body;

    if (!first_name || !joining_date || !amount || !hostel_id || !floor_id || !room_id || !bed_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    if (id) {

        var sql1 = "SELECT * FROM bookings WHERE id=?";
        connection.query(sql1, [id], function (err, sel_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Add New Booking" })
            } else if (sel_data.length != 0) {

                var sql2 = "UPDATE bookings SET first_name=?,last_name=?,joining_date=?,amount=?,hostel_id=?,floor_id=?,room_id=?,bed_id=?,comments=?, phone_number = ?,email_id =?,address=? WHERE id=?";
                connection.query(sql2, [first_name, last_name, joining_date, amount, hostel_id, floor_id, room_id, bed_id, comments, phone_number, email_id, address, id], function (err, ins_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Add New Booking" })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Booking Updated Successfully!" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Booking Details" })
            }
        })

    } else {


        var sql1 = "SELECT * FROM bookings WHERE hostel_id=? AND floor_id=? AND room_id=? AND bed_id=? AND status=1";
        connection.query(sql1, [hostel_id, floor_id, room_id, bed_id], function (err, data) {
            if (err) {
                return res.status(500).json({ statusCode: 500, message: "Unable to View Bookings" });
            }

            // Check if bed is already booked
            if (data.length > 0) {
                return res.status(400).json({ statusCode: 400, message: "Bed Already Booked!" });
            }

            // Check if the email or phone number exists in the bookings table
            let sql3 = `SELECT * FROM bookings book 
                        LEFT JOIN hostel hos ON hos.Hostel_Id = book.hostel_id 
                        WHERE hos.isActive = true AND book.status = true`;

            connection.query(sql3, function (sel_error, sel_data) {
                if (sel_error) {
                    return res.status(500).json({ statusCode: 500, message: "Error fetching bookings" });
                }

                // If no records found, proceed to insert
                var emailExists = sel_data.some(booking => booking.email_id === email_id || booking.Email === email_id);
                var phoneExists = sel_data.some(booking => booking.phone_number === phone_number || booking.Phone === phone_number);

                if (emailExists) {
                    return res.status(400).json({ statusCode: 400, message: "Email Already Exists!" });
                }
                if (phoneExists) {
                    return res.status(400).json({ statusCode: 400, message: "Phone Number Already Exists!" });
                }

                // Proceed to insert new booking
                var sql2 = "INSERT INTO bookings (first_name, last_name, joining_date, amount, hostel_id, floor_id, room_id, bed_id, comments, phone_number, email_id, address, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                connection.query(sql2, [first_name, last_name, joining_date, amount, hostel_id, floor_id, room_id, bed_id, comments, phone_number, email_id, address, created_by], function (err, ins_data) {
                    if (err) {
                        return res.status(500).json({ statusCode: 500, message: "Unable to Add New Booking" });
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Booking Added Successfully!" });
                    }
                });
            });
        });


    }
}

function all_bookings(req, res) {

    var created_by = req.user_details.id;

    var sql1 = "SELECT book.*,hst.Name AS hostel_name,hf.floor_name AS floor_name,hosroom.Room_Id AS room_name,bed.bed_no AS bed_name FROM bookings AS book JOIN hosteldetails AS hst ON hst.id=book.hostel_id JOIN Hostel_Floor AS hf ON hf.floor_id=book.floor_id AND hf.hostel_id=book.hostel_id JOIN hostelrooms AS hosroom ON hosroom.id=book.room_id JOIN bed_details AS bed ON bed.id=book.bed_id WHERE book.created_by=? AND book.status=1";
    connection.query(sql1, [created_by], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Bookings" })
        } else {
            return res.status(200).json({ statusCode: 200, message: "All Booking Details", bookings: data })
        }
    })
}

function delete_booking(req, res) {

    var id = req.body.id;

    if (!id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var sql1 = "SELECT * FROM bookings WHERE id=? AND status=1";
    connection.query(sql1, [id], function (err, sel_data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Booking Details" })
        } else if (sel_data.length != 0) {

            var sql2 = "DELETE FROM bookings WHERE id=?";
            connection.query(sql2, [id], function (err, ins_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Delete Booking Details" })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Booking Deleted Successfully!" })
                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Booking Details" })
        }
    })
}

function assign_booking(req, res) {
    let reqbody = req.body;
    var created_by = req.user_details.id;
    const Name = reqbody.firstname + " " + reqbody.lastname;
    const FirstNameInitial = reqbody.firstname.charAt(0).toUpperCase();
    if (reqbody.lastname) {
        var LastNameInitial = reqbody.lastname.charAt(0).toUpperCase();
        var Circle = FirstNameInitial + LastNameInitial;
    } else {
        reqbody.lastname = "";
        var FirstNameInitial2 = reqbody.firstname.charAt(0).toUpperCase();
        var LastNameInitial2 = reqbody.firstname.charAt(1).toUpperCase();
        console.log(FirstNameInitial2);
        var Circle = FirstNameInitial2 + LastNameInitial2;
    }
    if (reqbody.Email == undefined || reqbody.Email == "") {
        reqbody.Email = "NA";
    }
    if (reqbody) {
        const query1 = 'UPDATE bookings SET status = false WHERE status = true and id = ?';

        connection.query(query1, [reqbody.id], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(201).send('Server error');
            }
            else {
                const query2 = 'INSERT INTO hostel (Circle, Name, Phone, Email, Address, HostelName, Hostel_Id, Floor, Rooms, Bed, RoomRent, created_by, joining_Date,country_code) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?)';

                connection.query(query2, [
                    Circle,
                    Name,
                    reqbody.Phone,
                    reqbody.Email,
                    reqbody.Address,
                    reqbody.HostelName,
                    reqbody.Hostel_Id,
                    reqbody.Floor_Id,
                    reqbody.Room_Id,
                    reqbody.Bed_Id,
                    reqbody.RoomRent,
                    created_by,
                    reqbody.joining_Date,
                    reqbody.country_code
                ], (error, results) => {
                    if (error) {
                        console.error(error);
                        return res.status(400).send('Error inserting data');
                    }
                    res.status(200).send({ id: results.insertId });
                });
            }

        });

    }
    else {
        res.status(201).send({ Message: "Missing Parameter" });
    }
}



module.exports = { add_booking, all_bookings, delete_booking, assign_booking }