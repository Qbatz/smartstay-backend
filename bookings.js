const connection = require("./config/connection");

function add_booking(req, res) {
  var created_by = req.user_details.id;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  var {
    first_name,
    last_name,
    joining_date,
    amount,
    hostel_id,
    floor_id,
    room_id,
    bed_id,
    comments,
    id,
    phone_number,
    email_id,
    address,
    area,
    landmark,
    pin_code,
    city,
    state,
  } = req.body;

  if (
    !first_name ||
    !joining_date ||
    !amount ||
    !hostel_id ||
    !address ||
    !landmark ||
    !pin_code ||
    !city ||
    !state
  ) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing Mandatory Fields" });
  }

  if (id) {
    if (
      is_admin == 1 ||
      (role_permissions[5] && role_permissions[5].per_edit == 1)
    ) {
      var sql1 = "SELECT * FROM bookings WHERE id=?";
      connection.query(sql1, [id], function (err, sel_data) {
        if (err) {
          return res
            .status(201)
            .json({ statusCode: 201, message: "Unable to Add New Booking" });
        } else if (sel_data.length != 0) {
          var old_bed = sel_data[0].bed_id;

          // Phone number Check
          var sql6 =
            "SELECT * FROM bookings WHERE phone_number=? AND status=1 AND id !=?";
          connection.query(sql6, [phone_number, id], function (err, check_ph) {
            if (err) {
              return res
                .status(201)
                .json({ statusCode: 201, message: "Unable to Get Booking" });
            } else if (check_ph.length != 0) {
              return res.status(203).json({
                statusCode: 203,
                message: "Mobile Number Already Exist!",
              });
            } else {
              if (email_id) {
                var sql7 =
                  "SELECT * FROM bookings WHERE email_id = ? AND status = 1 AND id != ?";
                connection.query(
                  sql7,
                  [email_id, id],
                  function (err, check_email) {
                    if (err) {
                      return res.status(201).json({
                        statusCode: 201,
                        message: "Unable to Validate Email",
                      });
                    }
                    if (check_email.length > 0) {
                      return res.status(202).json({
                        statusCode: 202,
                        message: "Email ID Already Exists!",
                      });
                    }

                    update_booking();
                  }
                );
              } else {
                update_booking();
              }

              function update_booking() {
                var sql2 =
                  "UPDATE bookings SET first_name=?,last_name=?,joining_date=?,amount=?,hostel_id=?,floor_id=?,room_id=?,bed_id=?,comments=?, phone_number = ?,email_id =?,address=? ,area = ?,landmark = ?,pin_code = ?,city = ?,state = ? WHERE id=?";
                connection.query(
                  sql2,
                  [
                    first_name,
                    last_name,
                    joining_date,
                    amount,
                    hostel_id,
                    floor_id,
                    room_id,
                    bed_id,
                    comments,
                    phone_number,
                    email_id,
                    address,
                    area,
                    landmark,
                    pin_code,
                    city,
                    state,
                    id,
                  ],
                  function (err, ins_data) {
                    if (err) {
                      return res.status(201).json({
                        statusCode: 201,
                        message: "Unable to Add New Booking",
                      });
                    } else {
                      if (old_bed == bed_id) {
                        return res.status(200).json({
                          statusCode: 200,
                          message: "Booking Updated Successfully!",
                        });
                      } else {
                        // Change Old Bed Records
                        var sql4 =
                          "UPDATE bed_details SET isbooked=0,booking_id=0 WHERE id='" +
                          old_bed +
                          "'";
                        connection.query(sql4, function (err, data) {
                          if (err) {
                            return res.status(201).json({
                              statusCode: 201,
                              message: "Unable to Update New Booking",
                            });
                          } else {
                            // Update New Bed
                            var sql5 =
                              "UPDATE bed_details SET isbooked=1,booking_id='" +
                              id +
                              "' WHERE id='" +
                              bed_id +
                              "'";
                            connection.query(sql5, function (err, up_data) {
                              if (err) {
                                return res.status(201).json({
                                  statusCode: 201,
                                  message: "Unable to Update New Booking",
                                });
                              } else {
                                return res.status(200).json({
                                  statusCode: 200,
                                  message: "Booking Updated Successfully!",
                                });
                              }
                            });
                          }
                        });
                      }
                    }
                  }
                );
              }
            }
          });
        } else {
          return res
            .status(201)
            .json({ statusCode: 201, message: "Invalid Booking Details" });
        }
      });
    } else {
      res.status(208).json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
    }
  } else {
    if (
      is_admin == 1 ||
      (role_permissions[5] && role_permissions[5].per_create == 1)
    ) {
      var sql1 =
        "SELECT * FROM bookings WHERE hostel_id=? AND floor_id=? AND room_id=? AND bed_id=? AND status=1";
      connection.query(
        sql1,
        [hostel_id, floor_id, room_id, bed_id],
        function (err, data) {
          if (err) {
            return res
              .status(201)
              .json({ statusCode: 201, message: "Unable to View Bookings" });
          }

          // Check if bed is already booked
          if (data.length > 0) {
            return res
              .status(201)
              .json({ statusCode: 201, message: "Bed Already Booked!" });
          }

          // Check if the email or phone number exists in the bookings table
          let sql3 = `SELECT * FROM bookings book 
                        LEFT JOIN hostel hos ON hos.Hostel_Id = book.hostel_id 
                        WHERE hos.isActive = true AND book.status = true`;

          connection.query(sql3, function (sel_error, sel_data) {
            if (sel_error) {
              return res
                .status(201)
                .json({ statusCode: 201, message: "Error fetching bookings" });
            }

            // If no records found, proceed to insert
            var emailExists = sel_data.some(
              (booking) =>
                booking.email_id === email_id || booking.Email === email_id
            );
            var phoneExists = sel_data.some(
              (booking) =>
                booking.phone_number === phone_number ||
                booking.Phone === phone_number
            );

            if (emailExists && email_id) {
              return res
                .status(202)
                .json({ statusCode: 202, message: "Email Already Exists!" });
            }
            if (phoneExists) {
              return res.status(203).json({
                statusCode: 203,
                message: "Phone Number Already Exists!",
              });
            }

            // Proceed to insert new booking
            var sql2 =
              "INSERT INTO bookings (first_name, last_name, joining_date, amount, hostel_id, floor_id, room_id, bed_id, comments, phone_number, email_id, address, created_by,area,landmark,pin_code,city,state) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
            connection.query(
              sql2,
              [
                first_name,
                last_name,
                joining_date,
                amount,
                hostel_id,
                floor_id,
                room_id,
                bed_id,
                comments,
                phone_number,
                email_id,
                address,
                created_by,
              ],
              function (err, ins_data) {
                if (err) {
                  return res.status(201).json({
                    statusCode: 201,
                    message: "Unable to Add New Booking",
                  });
                } else {
                  var booking_id = ins_data.insertId;

                  var sql3 =
                    "UPDATE bed_details SET booking_id=?, isbooked=1 WHERE id=?";
                  connection.query(
                    sql3,
                    [booking_id, bed_id],
                    function (err, up_data) {
                      if (err) {
                        return res.status(201).json({
                          statusCode: 201,
                          message: "Unable to Update Booking",
                        });
                      } else {
                        return res.status(200).json({
                          statusCode: 200,
                          message: "Booking Added Successfully!",
                        });
                      }
                    }
                  );
                }
              }
            );
          });
        }
      );
    } else {
      res.status(208).json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
    }
  }
}

function all_bookings(req, res) {
  const created_by = req.user_details.id;
  const show_ids = req.show_ids;
  const role_permissions = req.role_permissions;
  const is_admin = req.is_admin;
  const hostel_id = req.body.hostel_id;
  const searchName = req.body.searchName?.trim() || null;

  const start_date_raw = req.body.start_date || null;
  const end_date_raw = req.body.end_date || null;

  if (
    !(
      is_admin === 1 ||
      (role_permissions[5] && role_permissions[5].per_view === 1)
    )
  ) {
    return res.status(208).json({
      message:
        "Permission Denied. Please contact your administrator for access.",
      statusCode: 208,
    });
  }

  if (!hostel_id) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing Hostel Details" });
  }

  let sql = `
        SELECT 
            book.*,
            hst.Name AS hostel_name,
            hf.floor_name AS floor_name,
            hosroom.Room_Id AS room_name,
            bed.bed_no AS bed_name
        FROM bookings AS book
        LEFT JOIN hosteldetails AS hst ON hst.id = book.hostel_id
        LEFT JOIN Hostel_Floor AS hf ON hf.floor_id = book.floor_id AND hf.hostel_id = book.hostel_id
        LEFT JOIN hostelrooms AS hosroom ON hosroom.id = book.room_id
        LEFT JOIN bed_details AS bed ON bed.id = book.bed_id
        WHERE book.hostel_id = ?
          AND book.status = TRUE
    `;

  const params = [hostel_id];

  // Search Name filter
  if (searchName) {
    sql += `
          AND (
              CONCAT(book.first_name, ' ', book.last_name) LIKE CONCAT('%', ?, '%')
              OR book.first_name LIKE CONCAT('%', ?, '%')
              OR book.last_name LIKE CONCAT('%', ?, '%')
          )
        `;
    params.push(searchName, searchName, searchName);
  }

  // Date filter
  if (start_date_raw) {
    const start_date = `${new Date(start_date_raw)
      .toISOString()
      .slice(0, 10)} 00:00:00`;
    const end_date = end_date_raw
      ? `${new Date(end_date_raw).toISOString().slice(0, 10)} 23:59:59`
      : `${new Date(start_date_raw).toISOString().slice(0, 10)} 23:59:59`;

    sql += ` AND book.createdat BETWEEN ? AND ?`;
    params.push(start_date, end_date);
  }

  sql += ` ORDER BY book.id DESC`;

  connection.query(sql, params, (err, data) => {
    if (err) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Unable to Get Bookings" });
    }

    return res.status(200).json({
      statusCode: 200,
      message: "All Booking Details",
      bookings: data,
    });
  });
}
function Booking_Inactive(req, res) {
  const { booking_id, Inactive_date, Inactive_Reason, ID } = req.body;
  if (!Inactive_date) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing Mandatory Fields" });
  }
  var bookingUpdate = `UPDATE bookings
SET 
  customer_inactive = true,
  inactive_reason =?,
  inactive_date = ?
WHERE id = ?;
`;
  connection.query(
    bookingUpdate,
    [Inactive_Reason, Inactive_date, booking_id],
    function (err, sel_data) {
      if (err) {
        console.log(err);
        return res
          .status(201)
          .json({
            statusCode: 201,
            message: "Unable to Move Inactive Customer",
          });
      } else {
        var selectBedID = `select id from bed_details where booking_id=?`;
        connection.query(selectBedID, [booking_id], function (err, bedData) {
          if (err) {
            console.log(err);
            return res
              .status(201)
              .json({
                statusCode: 201,
                message: "Unable to Move Inactive Customer",
              });
          } else {
            var bedUpdate = `UPDATE bed_details
SET 
  booking_id = 0,
  isbooked =0,
  user_id=0
WHERE id=?;
`;
            connection.query(bedUpdate, [bedData[0].id], function (err) {
              if (err) {
                console.log(err);
                return res
                  .status(201)
                  .json({
                    statusCode: 201,
                    message: "Unable to Move Inactive Customer",
                  });
              } else {
                console.log("Bed Changed sucessfully");
              }
            });
          }
        });

        var sqlhsl = `
UPDATE hostel
SET 
  isActive = 0
WHERE ID = ?;`
        connection.query(sqlhsl, [ID], function (err) {
          if (err) {
            console.log(err);
            // return res
            //   .status(201)
            //   .json({
            //     statusCode: 201,
            //     message: "Unable to Move Inactive Customer",
            //   });
          } else {
            console.log("Hostel Inactive sucessfully");
          }
        });

        return res
          .status(200)
          .json({ statusCode: 200, message: "User Inactive Sucessfully" });
      }
    }
  );
}

function ChangeBookingBed(req,res) {
  
}

function delete_booking(req, res) {
  var id = req.body.id;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[5] && role_permissions[5].per_delete == 1)
  ) {
    if (!id) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    var sql1 = "SELECT * FROM bookings WHERE id=? AND status=1";
    connection.query(sql1, [id], function (err, sel_data) {
      if (err) {
        return res
          .status(201)
          .json({ statusCode: 201, message: "Unable to Get Booking Details" });
      } else if (sel_data.length != 0) {
        var sql2 = "DELETE FROM bookings WHERE id=?";
        connection.query(sql2, [id], function (err, ins_data) {
          if (err) {
            return res.status(201).json({
              statusCode: 201,
              message: "Unable to Delete Booking Details",
            });
          } else {
            return res.status(200).json({
              statusCode: 200,
              message: "Booking Deleted Successfully!",
            });
          }
        });
      } else {
        return res
          .status(201)
          .json({ statusCode: 201, message: "Invalid Booking Details" });
      }
    });
  } else {
    res.status(208).json({
      message:
        "Permission Denied. Please contact your administrator for access.",
      statusCode: 208,
    });
  }
}

function generateUserId(firstName, user_id) {
  const userIdPrefix = firstName.substring(0, 4).toUpperCase();
  const user_ids = user_id.toString().padStart(3, "0");
  const userId = userIdPrefix + user_ids;
  return userId;
}

function assign_booking(req, res) {
  let reqbody = req.body;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[5] && role_permissions[5].per_edit == 1)
  ) {
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
      const query1 =
        "UPDATE bookings SET status = false WHERE status = true and id = ?";

      connection.query(query1, [reqbody.id], (error, results) => {
        if (error) {
          console.error(error);
          return res.status(201).send("Server error");
        } else {
          const query2 =
            "INSERT INTO hostel (Circle, Name, Phone, Email, Address, HostelName, Hostel_Id, Floor, Rooms, Bed, created_by,country_code,area,landmark,pincode,city,state) VALUES ( ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

          connection.query(
            query2,
            [
              Circle,
              Name,
              reqbody.Phone,
              reqbody.Email,
              reqbody.Address,
              reqbody.HostelName,
              reqbody.Hostel_Id,
              0,
              0,
              0,
              created_by,
              reqbody.country_code,
            ],
            (error, results) => {
              if (error) {
                console.error(error);
                return res.status(400).send("Error inserting data");
              } else {
                var user_ids = results.insertId;

                const gen_user_id = generateUserId(reqbody.firstname, user_ids);

                var update_user_id = "UPDATE hostel SET User_Id=? WHERE ID=?";
                connection.query(
                  update_user_id,
                  [gen_user_id, user_ids],
                  async function (up_id_err, up_id_res) {
                    if (up_id_err) {
                      response.status(201).json({
                        message: "Unable to add User Id",
                        statusCode: 201,
                      });
                    } else {
                      res.status(200).send({
                        statusCode: 200,
                        message: "Assign booking successfully",
                      });
                    }
                  }
                );
              }
            }
          );
        }
      });
    } else {
      res.status(201).send({ Message: "Missing Parameter" });
    }
  } else {
    res.status(208).json({
      message:
        "Permission Denied. Please contact your administrator for access.",
      statusCode: 208,
    });
  }
}

module.exports = {
  add_booking,
  all_bookings,
  delete_booking,
  assign_booking,
  Booking_Inactive,
  ChangeBookingBed
};
