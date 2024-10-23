const connection = require('./config/connection')

function add_booking(req, res) {

    var created_by = req.user_details.id;

    var { first_name, last_name, joining_date, amount, hostel_id, floor_id, room_id, bed_id, comments, id } = req.body;

    if (!first_name || !joining_date || !amount || !hostel_id || !floor_id || !room_id || !bed_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    if (id) {

        var sql1 = "SELECT * FROM bookings WHERE id=?";
        connection.query(sql1, [id], function (err, sel_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Add New Booking" })
            } else if (sel_data.length != 0) {

                var sql2 = "UPDATE bookings SET first_name=?,last_name=?,joining_date=?,amount=?,hostel_id=?,floor_id=?,room_id=?,bed_id=?,comments=? WHERE id=?";
                connection.query(sql2, [first_name, last_name, joining_date, amount, hostel_id, floor_id, room_id, bed_id, comments, id], function (err, ins_data) {
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
                return res.status(201).json({ statusCode: 201, message: "Unable to View Bookings" })
            } else if (data.length == 0) {

                var sql2 = "INSERT INTO bookings (first_name,last_name,joining_date,amount,hostel_id,floor_id,room_id,bed_id,comments,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)";
                connection.query(sql2, [first_name, last_name, joining_date, amount, hostel_id, floor_id, room_id, bed_id, comments, created_by], function (err, ins_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Add New Booking" })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Booking Added Successfully!" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Bed Already Booked!" })
            }
        })


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

function assign_booking(req, res){
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
    if (reqbody.Email == undefined) {
        reqbody.Email = "NA";
      }
if(reqbody){
    // app.delete('/api/bookings/:id', (req, res) => {
        // const bookingId = req.params.id;
        const query1 = 'UPDATE bookings SET status = false WHERE status = true and id = ?';
    
        connection.query(query1, [reqbody.id], (error, results) => {
            if (error) {
                console.error(error);
                return res.status(201).send('Server error');
            }
            else{
                const hostelData = req.body;
                // AadharNo, PancardNo, licence,
                
                    // hostelData.AadharNo,
                    // hostelData.PancardNo,
                    // hostelData.licence,
                    
                    // hostelData.isActive,
                    // hostelData.CheckoutDate,
                    // hostelData.profile,
                    
                    // hostelData.customer_Role,
                    
                    // hostelData.checkout_comment
                const query2 = 'INSERT INTO hostel (Circle, Name, Phone, country_code, Email, Address, HostelName, Hostel_Id, Floor, Rooms, Bed, AdvanceAmount, RoomRent, BalanceDue, PaymentType, Status, User_Id, paid_advance, pending_advance, created_by, joining_Date) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)';
            
                connection.query(query2, [
                    Circle,
                    Name,
                    hostelData.Phone,
                    hostelData.country_code,
                    hostelData.Email,
                    hostelData.Address,
                    hostelData.HostelName,
                    hostelData.Hostel_Id,
                    hostelData.Floor_Id,
                    hostelData.Room_Id,
                    hostelData.Bed_Id,
                    hostelData.AdvanceAmount,
                    hostelData.RoomRent,
                    hostelData.BalanceDue,
                    hostelData.PaymentType,
                    hostelData.Status,
                    hostelData.User_Id,
                    hostelData.paid_advance,
                    hostelData.pending_advance,
                    created_by,
                    hostelData.joining_Date,
                ], (error, results) => {
                    if (error) {
                        console.error(error);
                        return res.status(400).send('Error inserting data');
                    }
                    res.status(200).send({ id: results.insertId, ...hostelData });
                });
            }
            
        });
    
}
else{
    res.status(201).send({ Message : "Missing Parameter" });
}
}



module.exports = { add_booking, all_bookings, delete_booking, assign_booking}