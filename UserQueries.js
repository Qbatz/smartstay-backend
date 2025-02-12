const moment = require("moment");
const request = require("request");
const CryptoJS = require("crypto-js");

require("dotenv").config();
const crypto = require("crypto");


const connection = require("./config/connection");
const addNotification = require("./components/add_notification");
const bedDetails = require("./components/bed_details");
var uploadImage = require("./components/upload_image");
const { bed_details } = require("./PgQueries");

function getUsers(connection, response, request) {
  // Get values in middleware
  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  // var page = parseInt(request.body.page) || 1;
  // var limit = request.body.page_limit || 10;
  // var offset = (page - 1) * limit;

  console.log(role_permissions[4]);

  if (is_admin == 1 || (role_permissions[4] && role_permissions[4].per_view == 1)) {

    var hostel_id = request.body.hostel_id;

    if (!hostel_id) {
      return response.status(201).json({ statusCode: 201, message: "Missing Hostel Id" })
    }

    // var sql1 = "SELECT COUNT(*) as totalItems FROM hostel WHERE created_by='" + userDetails.id + "' AND isActive=1;";
    var query = "SELECT hstl.*,bd.bed_no AS Bed,hstl.Bed AS hstl_Bed,hsroom.Room_Id AS Rooms,hstl.Rooms AS hstl_Rooms,hsroom.id AS room_id,hsroom.Room_Id,DATE_FORMAT(hstl.joining_Date, '%Y-%m-%d') AS user_join_date,hstl.Hostel_Id AS user_hostel,hf.floor_name FROM hosteldetails AS hstlDetails inner join hostel AS hstl on hstl.Hostel_Id=hstlDetails.id and hstl.isActive=true LEFT JOIN country_list AS cl ON hstl.country_code=cl.country_code Left Join hostelrooms hsroom ON hsroom.Hostel_Id = hstlDetails.id and hsroom.Floor_Id = hstl.Floor and hsroom.id = hstl.Rooms LEFT JOIN Hostel_Floor AS hf ON hf.floor_id=hstl.Floor AND hf.hostel_id=hstl.Hostel_Id LEFT JOIN bed_details AS bd ON bd.id=hstl.Bed  WHERE hstl.Hostel_Id=? ORDER BY hstl.ID DESC";
    connection.query(query, [hostel_id], function (error, hostelData) {
      if (error) {
        console.error(error);
        response.status(403).json({ message: "Error  hostel data" });
        return;
      } else if (hostelData.length != 0) {
        response.status(200).json({ hostelData: hostelData });
      } else {
        response.status(200).json({ hostelData: hostelData });
      }
    });
  } else {
    response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function getKeyFromUrl(url) {
  const urlParts = url.split("/");
  const key = urlParts.slice(3).join("/"); // Get everything after the bucket name
  return key;
}

// Create User With Generate Invoices
function createUser(connection, request, response) {

  var atten = request.body;
  var profile = request.file;
  var country_code = atten.country_code;

  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  const FirstNameInitial = atten.firstname.charAt(0).toUpperCase();
  if (atten.lastname) {
    var LastNameInitial = atten.lastname.charAt(0).toUpperCase();
    var Circle = FirstNameInitial + LastNameInitial;
  } else {
    atten.lastname = "";
    var FirstNameInitial2 = atten.firstname.charAt(0).toUpperCase();
    var LastNameInitial2 = atten.firstname.charAt(1).toUpperCase();
    console.log(FirstNameInitial2);
    var Circle = FirstNameInitial2 + LastNameInitial2;
  }
  const Status = atten.BalanceDue < 0 ? "Pending" : "Success";
  const Name = atten.firstname + " " + atten.lastname;

  const created_by = request.user_details.id;

  if (atten.Email == undefined) {
    atten.Email = "NA";
  }

  if (atten.ID) {

    if (is_admin == 1 || (role_permissions[4] && role_permissions[4].per_edit === 1)) {

      var select_query = "SELECT * FROM hostel WHERE ID='" + atten.ID + "';";
      connection.query(select_query, async function (sel_err, sel_res) {
        if (sel_err) {
          response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
        } else if (sel_res.length != 0) {

          var user_ids = atten.ID;
          var unique_user_id = sel_res[0].User_Id;
          var paid_rent = atten.paid_rent;
          var paid_advance1 = atten.paid_advance ? atten.paid_advance : 0;
          var overall_advance = atten.AdvanceAmount;
          var paid_advance = paid_advance1;
          var pending_advance = overall_advance - paid_advance;
          var old_profile = sel_res[0].profile;
          var old_hostel = sel_res[0].Hostel_Id;
          var old_room = sel_res[0].Rooms;
          var old_floor = sel_res[0].Floor;
          var old_bed = sel_res[0].Bed;

          var booking_id = atten.booking_id;

          connection.query(`SELECT * FROM hostel WHERE Phone='${atten.Phone}' AND isActive = 1 AND Hostel_Id='${atten.hostel_Id}' AND ID !='${atten.ID}'`,
            function (error, data) {
              if (error) {
                return response.status(201).json({ message: "Unable to Get Hostel Details", statusCode: 201, });
              }
              if (data.length > 0) {
                response.status(202).json({ message: "Phone Number Already Exists", statusCode: 202, });
              } else {
                // Need to Check for the Mail Exist Error
                connection.query(`SELECT * FROM hostel WHERE Email='${atten.Email}' AND Email !='NA' AND Hostel_Id='${atten.hostel_Id}' AND isActive = 1 AND ID !='${atten.ID}'`,
                  async function (error, data) {
                    if (error) {
                      return response.status(201).json({ message: "Unable to Get Hostel Details", statusCode: 201, });
                    }
                    if (data.length > 0) {
                      return response.status(203).json({ message: "Email Already Exists", statusCode: 203 });
                    } else {
                      if (profile) {
                        try {
                          const timestamp = Date.now();
                          profile_url = await uploadImage.uploadProfilePictureToS3Bucket("smartstaydevs", "users/", "profile" + unique_user_id + timestamp + ".jpg", profile);

                          if (
                            old_profile != null &&
                            old_profile != undefined &&
                            old_profile != 0
                          ) {
                            const old_profile_key = getKeyFromUrl(old_profile);
                            var deleteResponse = await uploadImage.deleteImageFromS3Bucket("smartstaydevs", old_profile_key);
                            console.log("Image deleted successfully");
                          } else {
                            console.error("Failed to extract key from URL:", old_profile);
                          }
                        } catch (err) {
                          console.error(err);
                          profile_url = 0;
                        }
                      } else {
                        profile_url = 0;
                      }

                      if (!profile) {
                        var profile_url = request.body.profile || 0;
                      }

                      var bed_details_obj = {
                        old_bed: old_bed,
                        old_room: old_room,
                        old_floor: old_floor,
                        old_hostel: old_hostel,
                        hostel_id: atten.hostel_Id,
                        floor_id: atten.Floor,
                        room: atten.Rooms,
                        bed: atten.Bed,
                        user_id: atten.ID,
                      };

                      bedDetails.check_bed_details(bed_details_obj)
                        .then((okda) => {
                          console.log(okda, "/////////////////////");

                          connection.query(`UPDATE hostel SET Circle='${Circle}', Name='${Name}',Phone='${atten.Phone}', Email='${atten.Email}', Address='${atten.Address}', AadharNo='${atten.AadharNo}', PancardNo='${atten.PancardNo}',licence='${atten.licence}',HostelName='${atten.HostelName}',Hostel_Id='${atten.hostel_Id}', Floor='${atten.Floor}', Rooms='${atten.Rooms}', Bed='${atten.Bed}',profile='${profile_url}', AdvanceAmount='${atten.AdvanceAmount}', RoomRent='${atten.RoomRent}', BalanceDue='${atten.BalanceDue}', PaymentType='${atten.PaymentType}', Status='${Status}',paid_advance='${paid_advance}',pending_advance='${pending_advance}',country_code='${country_code}',joining_Date='${atten.joining_date}' WHERE ID='${atten.ID}'`,
                            function (updateError, updateData) {
                              if (updateError) {
                                response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                              } else {

                                var update_complaice_query = "SELECT * FROM compliance WHERE User_id=?";
                                connection.query(update_complaice_query, [unique_user_id], function (up_com_err, up_com_res) {
                                  if (up_com_err) {
                                    console.log("up_com_err", up_com_err);
                                    return;
                                  } else if (up_com_res.length != 0) {
                                    var up_query = "UPDATE compliance SET Circle='" + Circle + "',Name='" + Name + "',Phone='" + atten.Phone + "',Hostel_id='" + atten.hostel_Id + "',Floor_id='" + atten.Floor + "',Room='" + atten.Rooms + "',hostelname='" + atten.HostelName + "' WHERE User_id='" + unique_user_id + "';";
                                    connection.query(up_query, function (up_err, up_res) {
                                      if (up_err) {
                                        console.log("up_err", up_err);
                                      }
                                    });
                                  }
                                });

                                if (booking_id) {

                                  var sql123 = "UPDATE bookings SET status=0 WHERE id=?";
                                  connection.query(sql123, [booking_id], function (err, data) {
                                    if (err) {
                                      console.log("Not Remove Booking", err);
                                    } else {
                                      console.log("Booking Removed");
                                    }
                                  })
                                }

                                return response.status(200).json({ statusCode: 200, message: "Changes Saved Successfully!" })

                                // }
                                // Check advance Rent
                                // var sql1 = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND invoice_type=2";
                                // connection.query(sql1, [atten.ID], function (inv_err, inv_data) {
                                //   if (inv_err) {
                                //     console.log(`inv_errr`, inv_err);
                                //     return;
                                //   }

                                //   console.log(inv_data.length);

                                //   if (inv_data.length == 0) {
                                //     if (
                                //       atten.AdvanceAmount &&
                                //       atten.AdvanceAmount != undefined
                                //     ) {
                                //       console.log(atten.AdvanceAmount);

                                //       // if (!atten.AdvanceAmount && atten.AdvanceAmount != undefined && atten.AdvanceAmount > 0) {

                                //       insert_advance_invoice(
                                //         connection,
                                //         user_ids
                                //       )
                                //         .then(() => {
                                //           // console.log(atten.AdvanceAmount);

                                //           // Check and insert advance amount transactions
                                //           if (
                                //             paid_advance != undefined &&
                                //             paid_advance != 0
                                //           ) {
                                //             var sql4 =
                                //               "SELECT * FROM advance_amount_transactions WHERE user_id=? ORDER BY id ASC";
                                //             connection.query(
                                //               sql4,
                                //               [user_ids],
                                //               async function (ad_err, ad_res) {
                                //                 if (ad_err) {
                                //                   console.log("ad_err", ad_err);
                                //                 } else if (ad_res.length == 0) {
                                //                   var sql_1 =
                                //                     "INSERT INTO advance_amount_transactions (user_id, inv_id, advance_amount, payment_status, created_by) VALUES (?, ?, ?, ?, ?)";
                                //                   connection.query(
                                //                     sql_1,
                                //                     [
                                //                       user_ids,
                                //                       0,
                                //                       paid_advance,
                                //                       1,
                                //                       created_by,
                                //                     ],
                                //                     function (
                                //                       ins_err,
                                //                       ins_res
                                //                     ) {
                                //                       if (ins_err) {
                                //                         console.log(
                                //                           "ins_err",
                                //                           ins_err
                                //                         );
                                //                       }
                                //                     }
                                //                   );

                                //                   var title =
                                //                     "Paid Advance Amount";
                                //                   var user_type = 0;
                                //                   var message =
                                //                     "Your Advance Amount " +
                                //                     paid_advance +
                                //                     " Received Successfully";

                                //                   await addNotification.add_notification(
                                //                     user_ids,
                                //                     title,
                                //                     user_type,
                                //                     message
                                //                   );
                                //                 }
                                //               }
                                //             );
                                //           }

                                //           checkAndInsertRentInvoice();
                                //         })
                                //         .catch((error) => {
                                //           console.error(
                                //             "Error inserting advance invoice:",
                                //             error
                                //           );
                                //           response
                                //             .status(205)
                                //             .json({
                                //               message:
                                //                 "Error processing Advance invoices",
                                //               statusCode: 205,
                                //             });
                                //         });
                                //     } else {
                                //       checkAndInsertRentInvoice();
                                //     }
                                //   } else {
                                //     checkAndInsertRentInvoice();
                                //   }
                                // }
                                // );

                                // Function to continue with the Rent check/update
                                // function checkAndInsertRentInvoice() {
                                //   // Check and update advance

                                //   if (
                                //     atten.RoomRent &&
                                //     atten.RoomRent != undefined &&
                                //     atten.RoomRent > 0
                                //   ) {
                                //     var sqlAdvance =
                                //       "SELECT * FROM invoicedetails WHERE hos_user_id=? AND invoice_type=1";
                                //     connection.query(
                                //       sqlAdvance,
                                //       [atten.ID],
                                //       function (rent_err, rent_res) {
                                //         if (rent_err) {
                                //           console.log(
                                //             `Error checking advance:`,
                                //             rent_err
                                //           );
                                //           response
                                //             .status(205)
                                //             .json({
                                //               message:
                                //                 "Error processing Get Rent invoices",
                                //               statusCode: 205,
                                //             });
                                //           return;
                                //         }

                                //         var total_rent = atten.RoomRent;
                                //         var paid_amount =
                                //           paid_rent != undefined ? paid_rent : 0;

                                //         if (rent_res.length == 0) {
                                //           // Insert rent invoice if not exists
                                //           var currentDate =
                                //             moment().format("YYYY-MM-DD");
                                //           var joinDate =
                                //             moment(currentDate).format(
                                //               "YYYY-MM-DD"
                                //             );

                                //           var dueDate = moment(joinDate)
                                //             .endOf("month")
                                //             .format("YYYY-MM-DD");
                                //           var invoiceDate =
                                //             moment(joinDate).format("YYYY-MM-DD");

                                //           var formattedJoinDate =
                                //             moment(invoiceDate).format(
                                //               "YYYY-MM-DD"
                                //             );
                                //           var formattedDueDate =
                                //             moment(dueDate).format("YYYY-MM-DD");
                                //           var numberOfDays =
                                //             moment(formattedDueDate).diff(
                                //               moment(formattedJoinDate),
                                //               "days"
                                //             ) + 1;

                                //           var totalDaysInCurrentMonth =
                                //             moment(currentDate).daysInMonth();

                                //           var oneday_amount =
                                //             total_rent / totalDaysInCurrentMonth;

                                //           var payableamount =
                                //             oneday_amount * numberOfDays;
                                //           var payable_rent =
                                //             Math.round(payableamount);
                                //           // console.log("payable_rent", payable_rent)
                                //           var balance_rent =
                                //             payable_rent - paid_amount;
                                //           // console.log("balance_rent", balance_rent)

                                //           insert_rent_invoice(
                                //             connection,
                                //             user_ids,
                                //             paid_amount,
                                //             balance_rent,
                                //             payable_rent
                                //           )
                                //             .then(() => {
                                //               if (
                                //                 paid_rent != undefined &&
                                //                 paid_rent != 0
                                //               ) {
                                //                 var sql2 =
                                //                   "SELECT * FROM transactions WHERE user_id=? AND invoice_id=0 AND MONTH(createdAt) = MONTH(CURDATE()) AND YEAR(createdAt) = YEAR(CURDATE())";
                                //                 connection.query(
                                //                   sql2,
                                //                   [user_ids],
                                //                   async function (
                                //                     trans_err,
                                //                     trans_res
                                //                   ) {
                                //                     if (trans_err) {
                                //                       console.log(
                                //                         "trans_err",
                                //                         trans_err
                                //                       );
                                //                     } else if (
                                //                       trans_res.length == 0
                                //                     ) {
                                //                       var sql_1 =
                                //                         "INSERT INTO transactions (user_id, invoice_id, amount, status, created_by) VALUES (?, ?, ?, ?, ?)";
                                //                       connection.query(
                                //                         sql_1,
                                //                         [
                                //                           user_ids,
                                //                           0,
                                //                           paid_rent,
                                //                           1,
                                //                           created_by,
                                //                         ],
                                //                         function (
                                //                           ins_err,
                                //                           ins_res
                                //                         ) {
                                //                           if (ins_err) {
                                //                             console.log(
                                //                               "ins_err",
                                //                               ins_err
                                //                             );
                                //                           }
                                //                         }
                                //                       );

                                //                       var title =
                                //                         "Paid Rent Amount";
                                //                       var user_type = 0;
                                //                       var message =
                                //                         "Your Rent Amount " +
                                //                         paid_rent +
                                //                         " Received Successfully";

                                //                       await addNotification.add_notification(
                                //                         user_ids,
                                //                         title,
                                //                         user_type,
                                //                         message
                                //                       );
                                //                     }
                                //                   }
                                //                 );
                                //               }

                                //               response
                                //                 .status(200)
                                //                 .json({
                                //                   message: "Save Successfully",
                                //                   statusCode: 200,
                                //                 });
                                //             })
                                //             .catch((error) => {
                                //               console.error("Error:", error);
                                //               response
                                //                 .status(205)
                                //                 .json({
                                //                   message:
                                //                     "Error processing Rent invoices",
                                //                   statusCode: 205,
                                //                 });
                                //             });
                                //         } else {
                                //           response
                                //             .status(200)
                                //             .json({
                                //               message: "Update Successfully",
                                //               statusCode: 200,
                                //             });
                                //         }
                                //       }
                                //     );
                                //   } else {
                                //     response
                                //       .status(200)
                                //       .json({
                                //         message: "Save Successfully",
                                //         statusCode: 200,
                                //       });
                                //   }
                                // }
                              }
                            }
                          );
                        })
                        .catch((error) => {
                          console.log(error);
                          return response.status(205).json({ message: "Invalid Bed Details", statusCode: 205 });
                        });
                    }
                  }
                );
              }
            }
          );
        } else {
          response.status(202).json({ message: "Invalid User Id", statusCode: 202 });
        }
      });
    } else {
      response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
  } else {

    if (is_admin == 1 || (role_permissions[4] && role_permissions[4].per_create === 1)) {

      connection.query(`SELECT * FROM hostel WHERE Phone='${atten.Phone}' AND isActive = 1 AND Hostel_Id='${atten.hostel_Id}'`,
        function (error, data) {
          if (data.length > 0) {
            response.status(202).json({ message: "Phone Number Already Exists", statusCode: 202 });
          } else {
            // Need to Check for the Mail Exist Error
            connection.query(`SELECT * FROM hostel WHERE Email='${atten.Email}' AND Email !='NA' AND isActive = 1 AND Hostel_Id='${atten.hostel_Id}'`, async function (error, data) {
              if (data.length > 0) {
                response.status(203).json({ message: "Email Already Exists", statusCode: 203 });
              } else {
                // Check and Update Advance Amount and first month rent Amount;

                var paid_advance = atten.paid_advance ? atten.paid_advance : 0;
                var pending_advance = atten.AdvanceAmount - paid_advance;

                connection.query(`INSERT INTO hostel (Circle, Name, Phone, Email, Address, AadharNo, PancardNo, licence,HostelName, Hostel_Id, Floor, Rooms, Bed, AdvanceAmount, RoomRent, BalanceDue, PaymentType, Status,paid_advance,pending_advance,created_by,country_code,joining_Date) VALUES ('${Circle}', '${Name}', '${atten.Phone}', '${atten.Email}', '${atten.Address}', '${atten.AadharNo}', '${atten.PancardNo}', '${atten.licence}','${atten.HostelName}' ,'${atten.hostel_Id}', '${atten.Floor}', '${atten.Rooms}', '${atten.Bed}', '${atten.AdvanceAmount}', '${atten.RoomRent}', '${atten.BalanceDue}', '${atten.PaymentType}', '${Status}','${paid_advance}','${pending_advance}','${created_by}','${country_code}','${atten.joining_date}')`, async function (insertError, insertData) {
                  if (insertError) {
                    console.log("insertError", insertError);
                    response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                  } else {
                    var user_ids = insertData.insertId;

                    const gen_user_id = generateUserId(atten.firstname, user_ids);

                    // Upload Profile Image to S3
                    if (profile) {
                      try {
                        const timestamp = Date.now();
                        profile_url = await uploadImage.uploadProfilePictureToS3Bucket("smartstaydevs", "users/", "profile" + gen_user_id + `${timestamp}` + ".jpg", profile);
                      } catch (err) {
                        console.error(err);
                        profile_url = 0;
                      }
                    } else {
                      profile_url = 0;
                    }

                    var bed_details_obj = {
                      old_bed: 0,
                      old_room: 0,
                      old_floor: 0,
                      old_hostel: 0,
                      hostel_id: atten.hostel_Id,
                      floor_id: atten.Floor,
                      room: atten.Rooms,
                      bed: atten.Bed,
                      user_id: user_ids,
                    };

                    bedDetails.check_bed_details(bed_details_obj)
                      .then(() => {

                        var update_user_id = "UPDATE hostel SET User_Id=?,profile=? WHERE ID=?";
                        connection.query(update_user_id, [gen_user_id, profile_url, user_ids], async function (up_id_err, up_id_res) {
                          if (up_id_err) {
                            response.status(201).json({ message: "Unable to add User Id", statusCode: 201, });
                          } else {
                            var paid_rent = atten.paid_rent;
                            var paid_amount = paid_rent || 0; // Use logical OR to provide default value
                            var total_rent = atten.RoomRent;

                            return response.status(200).json({ message: "Save Successfully", statusCode: 200, });

                            // if (
                            //   atten.AdvanceAmount != undefined &&
                            //   atten.AdvanceAmount > 0
                            // ) {
                            //   if (paid_rent > 0) {
                            //     var sqL_12 = "INSERT INTO transactions (user_id,invoice_id,amount,created_by,status) VALUES ('" +
                            //       user_ids +
                            //       "',0,'" +
                            //       paid_rent +
                            //       "','" +
                            //       created_by +
                            //       "',1)";
                            //     connection.query(
                            //       sqL_12,
                            //       function (err, data) {
                            //         if (err) {
                            //           console.log(err);
                            //         } else {
                            //         }
                            //       }
                            //     );

                            //     var title = "Paid Rent Amount";
                            //     var user_type = 0;
                            //     var message =
                            //       "Your Rent Amount " +
                            //       paid_rent +
                            //       " Received Successfully";

                            //     await addNotification.add_notification(
                            //       user_ids,
                            //       title,
                            //       user_type,
                            //       message
                            //     );
                            //   }

                            //   if (paid_advance > 0) {
                            //     var sqL_12 =
                            //       "INSERT INTO advance_amount_transactions (user_id,inv_id,advance_amount,created_by) VALUES ('" +
                            //       user_ids +
                            //       "',0,'" +
                            //       atten.paid_advance +
                            //       "','" +
                            //       created_by +
                            //       "')";
                            //     connection.query(
                            //       sqL_12,
                            //       function (err, data) {
                            //         if (err) {
                            //           console.log(err);
                            //         }
                            //       }
                            //     );

                            //     var title = "Paid Advance Amount";
                            //     var user_type = 0;
                            //     var message =
                            //       "Your Advance Amount " +
                            //       paid_advance +
                            //       " Received Successfully";

                            //     await addNotification.add_notification(
                            //       user_ids,
                            //       title,
                            //       user_type,
                            //       message
                            //     );
                            //   }

                            //   var currentDate =
                            //     moment().format("YYYY-MM-DD");
                            //   var joinDate =
                            //     moment(currentDate).format("YYYY-MM-DD");
                            //   var dueDate = moment(joinDate)
                            //     .endOf("month")
                            //     .format("YYYY-MM-DD");
                            //   var invoiceDate =
                            //     moment(joinDate).format("YYYY-MM-DD");
                            //   var formattedJoinDate =
                            //     moment(invoiceDate).format("YYYY-MM-DD");
                            //   var formattedDueDate =
                            //     moment(dueDate).format("YYYY-MM-DD");
                            //   var numberOfDays =
                            //     moment(formattedDueDate).diff(
                            //       moment(formattedJoinDate),
                            //       "days"
                            //     ) + 1;
                            //   var totalDaysInCurrentMonth =
                            //     moment(currentDate).daysInMonth();
                            //   var oneday_amount =
                            //     total_rent / totalDaysInCurrentMonth;
                            //   var payableamount =
                            //     oneday_amount * numberOfDays;
                            //   var payable_rent = Math.round(payableamount);
                            //   var balance_rent = payable_rent - paid_amount;

                            //   insert_rent_invoice(
                            //     connection,
                            //     user_ids,
                            //     paid_amount,
                            //     balance_rent,
                            //     payable_rent
                            //   )
                            //     .then(() => {
                            //       return insert_advance_invoice(
                            //         connection,
                            //         user_ids
                            //       );
                            //     })
                            //     .then(() => {
                            //       response
                            //         .status(200)
                            //         .json({
                            //           message: "Save Successfully",
                            //           statusCode: 200,
                            //         });
                            //     })
                            //     .catch((error) => {
                            //       console.error("Error:", error);
                            //       response
                            //         .status(205)
                            //         .json({
                            //           message: "Error processing invoices",
                            //           statusCode: 205,
                            //         });
                            //     });
                            // } else {
                            //   response
                            //     .status(200)
                            //     .json({
                            //       message: "Save Successfully",
                            //       statusCode: 200,
                            //     });
                            // }
                          }
                        });
                      })
                      .catch((error) => {
                        console.log(error);
                        var del_query = "DELETE FROM hostel WHERE ID=?";
                        connection.query(del_query, [user_ids],
                          function (err, del_res) {
                            if (err) {
                              return response.status(201).json({ message: "Unable to Delete Bed Details", statusCode: 205, });
                            } else {
                              return response.status(201).json({ message: "Invalid Bed Details", statusCode: 201, });
                            }
                          });
                      });
                  }
                });
              }
            });
          }
        });
    } else {
      response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }

  }
}

function generateUserId(firstName, user_id) {
  const userIdPrefix = firstName.substring(0, 4).toUpperCase();
  const user_ids = user_id.toString().padStart(3, "0");
  const userId = userIdPrefix + user_ids;
  return userId;
}

// Insert Rent Amount
// function insert_rent_invoice(
//   connection,
//   user_id,
//   paid_amount,
//   balance_rent,
//   payable_rent
// ) {
//   return new Promise((resolve, reject) => {
//     var sql1 =
//       "SELECT rms.Price,rms.Hostel_Id AS roomHostel_Id,rms.Floor_Id AS roomFloor_Id,rms.Room_Id AS roomRoom_Id,dtls.id AS detHostel_Id,dtls.isHostelBased,dtls.prefix,dtls.suffix,dtls.Name,hstl.ID AS hos_user_id,hstl.User_Id,hstl.Address,hstl.Name AS UserName,hstl.Hostel_Id AS hosHostel_Id,hstl.Rooms AS hosRoom,hstl.Floor AS hosFloor,hstl.Bed,hstl.RoomRent,hstl.Name AS user_name,hstl.Phone,hstl.Email,hstl.Address,hstl.paid_advance,hstl.pending_advance,hstl.AdvanceAmount AS advance_amount, hstl.CheckoutDate,CASE WHEN dtls.isHostelBased = true THEN (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1)ELSE (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1)END AS ebBill,(SELECT eb.Floor FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebFloor, (SELECT eb.hostel_Id FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1 ) AS ebhostel_Id,(SELECT eb.Room FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebRoom,(SELECT eb.createAt FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1) AS createdAt,( SELECT invd.Invoices FROM invoicedetails invd WHERE invd.Invoices LIKE CONCAT(dtls.prefix, '%')ORDER BY CAST(SUBSTRING(invd.Invoices, LENGTH(dtls.prefix) + 1) AS UNSIGNED) DESC LIMIT 1) AS InvoiceDetails FROM hostel hstl INNER JOIN hosteldetails dtls ON dtls.id = hstl.Hostel_Id INNER JOIN hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id AND rms.Floor_Id = hstl.Floor AND rms.id = hstl.Rooms WHERE hstl.isActive = true AND hstl.id =?;";
//     connection.query(sql1, [user_id], function (sel_err, sel_res) {
//       if (sel_err) {
//         console.log("Unable to get User Details");
//         reject(sel_err);
//       } else if (sel_res.length != 0) {
//         var inv_data = sel_res[0];

//         var currentDate = moment().format("YYYY-MM-DD");

//         var dueDate = moment(currentDate).endOf("month").format("YYYY-MM-DD");

//         if (inv_data.prefix && inv_data.suffix) {
//           let numericSuffix;
//           if (inv_data.InvoiceDetails != null) {
//             numericSuffix =
//               parseInt(
//                 inv_data.InvoiceDetails.substring(inv_data.prefix.length)
//               ) || 0;
//             numericSuffix++;
//           } else {
//             numericSuffix = inv_data.suffix;
//           }
//           invoiceNo = inv_data.prefix + numericSuffix;
//         } else {
//           const userID = inv_data.User_Id.toString().slice(0, 4);
//           const month = moment(new Date()).month() + 1;
//           const year = moment(new Date()).year();
//           invoiceNo = "INVC" + month + year + userID;
//         }

//         // console.log(`invoiceNo`, invoiceNo);

//         if (payable_rent == paid_amount) {
//           var status = "Success";
//         } else {
//           var status = "Pending";
//         }

//         var sql2 =
//           "INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based, Bed,BalanceDue,PaidAmount,numberofdays,hos_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)";
//         connection.query(
//           sql2,
//           [
//             inv_data.user_name,
//             inv_data.Phone,
//             inv_data.Email,
//             inv_data.Name,
//             inv_data.detHostel_Id,
//             inv_data.hosFloor,
//             inv_data.hosRoom,
//             payable_rent,
//             inv_data.Address,
//             currentDate,
//             dueDate,
//             invoiceNo,
//             status,
//             inv_data.User_Id,
//             payable_rent,
//             0,
//             0,
//             0,
//             0,
//             0,
//             inv_data.Bed,
//             balance_rent,
//             paid_amount,
//             inv_data.hos_user_id,
//           ],
//           function (ins_err, ins_res) {
//             if (ins_err) {
//               console.log("Insert Error", ins_err);
//               reject(ins_err);
//             } else {
//               console.log("Insert Successfully");
//               resolve();
//             }
//           }
//         );
//       } else {
//         console.log("Invalid User Details");
//         reject("Invalid User Details");
//       }
//     });
//   });
// }

// Insert Advance Amount
// function insert_advance_invoice(connection, user_id) {
//   return new Promise((resolve, reject) => {
//     var sql1 =
//       "SELECT rms.Price,rms.Hostel_Id AS roomHostel_Id,rms.Floor_Id AS roomFloor_Id,rms.Room_Id AS roomRoom_Id,dtls.id AS detHostel_Id,dtls.isHostelBased,dtls.prefix,dtls.suffix,dtls.Name,hstl.ID AS hos_user_id,hstl.User_Id,hstl.Address,hstl.Name AS UserName,hstl.Hostel_Id AS hosHostel_Id,hstl.Rooms AS hosRoom,hstl.Floor AS hosFloor,hstl.Bed,hstl.RoomRent,hstl.Name AS user_name,hstl.Phone,hstl.Email,hstl.Address,hstl.paid_advance,hstl.pending_advance,hstl.AdvanceAmount AS advance_amount, hstl.CheckoutDate,CASE WHEN dtls.isHostelBased = true THEN (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1)ELSE (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1)END AS ebBill,(SELECT eb.Floor FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebFloor, (SELECT eb.hostel_Id FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1 ) AS ebhostel_Id,(SELECT eb.Room FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebRoom,(SELECT eb.createAt FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1) AS createdAt,( SELECT invd.Invoices FROM invoicedetails invd WHERE invd.Invoices LIKE CONCAT(dtls.prefix, '%')ORDER BY CAST(SUBSTRING(invd.Invoices, LENGTH(dtls.prefix) + 1) AS UNSIGNED) DESC LIMIT 1) AS InvoiceDetails FROM hostel hstl INNER JOIN hosteldetails dtls ON dtls.id = hstl.Hostel_Id INNER JOIN hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id AND rms.Floor_Id = hstl.Floor AND rms.id = hstl.Rooms WHERE hstl.isActive = true AND hstl.id =?;";
//     connection.query(sql1, [user_id], function (sel_err, sel_res) {
//       if (sel_err) {
//         console.log("Unable to get User Details");
//         reject(sel_err);
//       } else if (sel_res.length != 0) {
//         var inv_data = sel_res[0];

//         var currentDate = moment().format("YYYY-MM-DD");
//         var dueDate = moment(currentDate).endOf("month").format("YYYY-MM-DD");

//         if (inv_data.prefix && inv_data.suffix) {
//           let numericSuffix;
//           if (inv_data.InvoiceDetails != null) {
//             numericSuffix =
//               parseInt(
//                 inv_data.InvoiceDetails.substring(inv_data.prefix.length)
//               ) || 0;
//             numericSuffix++;
//           } else {
//             numericSuffix = inv_data.suffix;
//           }
//           invoiceNo = inv_data.prefix + numericSuffix;
//         } else {
//           const userID = inv_data.User_Id.toString().slice(0, 4);
//           const month = moment(new Date()).month() + 1;
//           const year = moment(new Date()).year();
//           invoiceNo = "AD_INVC" + month + year + userID;
//         }

//         // console.log(`invoiceNo`, invoiceNo);

//         if (inv_data.advance_amount == inv_data.paid_advance) {
//           var status = "Success";
//         } else {
//           var status = "Pending";
//         }

//         var pending_advance = inv_data.advance_amount - inv_data.paid_advance;

//         var sql2 =
//           "INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based, Bed,BalanceDue,PaidAmount,numberofdays,invoice_type,hos_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,2,?)";
//         connection.query(
//           sql2,
//           [
//             inv_data.user_name,
//             inv_data.Phone,
//             inv_data.Email,
//             inv_data.Name,
//             inv_data.detHostel_Id,
//             inv_data.hosFloor,
//             inv_data.hosRoom,
//             inv_data.advance_amount,
//             inv_data.Address,
//             currentDate,
//             dueDate,
//             invoiceNo,
//             status,
//             inv_data.User_Id,
//             0,
//             0,
//             0,
//             0,
//             0,
//             0,
//             inv_data.Bed,
//             pending_advance,
//             inv_data.paid_advance,
//             inv_data.hos_user_id,
//           ],
//           function (ins_err, ins_res) {
//             if (ins_err) {
//               console.log("Insert Error", ins_err);
//               reject(ins_err);
//             } else {
//               console.log("Insert Successfully");
//               resolve();
//             }
//           }
//         );
//       } else {
//         console.log("Invalid Advance User Details");
//         reject("Invalid User Advance Details");
//       }
//     });
//   });
// }

function getPaymentDetails(connection, response) {
  connection.query(
    `SELECT hos.Name ,hos.Phone,hos.Email,hos.Address,hos.AdvanceAmount,hos.BalanceDue,hos.Status,hos.createdAt,inv.Name as invoiceName, inv.phoneNo as invoicePhone ,inv.Date as invDate, inv.Amount as invAmount ,inv.Status as invStatus, inv.Invoices as InvoiceNo FROM hostel hos INNER JOIN invoicedetails inv on inv.phoneNo= hos.Phone`,
    function (error, data) {
      // console.log(error);
      if (error) {
        response
          .status(201)
          .json({ message: "No Data Found", statusCode: 201 });
      } else {
        response.status(200).json({ data: data });
      }
    }
  );
}

function CheckOutUser(connection, response, attenData) {
  // console.log("attenData", attenData)
  if (attenData) {
    const query = `UPDATE hostel SET CheckoutDate= '${attenData.CheckOutDate}' , isActive ='${attenData.isActive}' WHERE User_Id='${attenData.User_Id}'`;

    // console.log("query", query)
    connection.query(query, function (error, UpdateData) {
      // console.log("updateData", UpdateData)
      if (error) {
        response.status(201).json({ message: "No Data Found" });
      } else {
        response.status(200).json({ message: "Update Successfully" });
      }
    });
  } else {
    response.status(201).json({ message: "missing parameter" });
  }
}

function transitionlist(request, response) {

  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_edit == 1)) {

    var { id, invoice_id, amount, balance_due, invoice_type, payment_by, payment_date, bank_id } = request.body;

    var userDetails = request.user_details;
    var created_by = userDetails.id;

    if (!invoice_type || invoice_type == undefined) {
      var invoice_type = 1;
    }

    var reference_id = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 characters unique value

    if (invoice_type == 1) {

      if (!amount && amount == undefined && (!balance_due || balance_due == undefined)) {
        response.status(203).json({ message: "Missing Required Fields" });
      } else {
        var sql1 = "SELECT * FROM invoicedetails WHERE id='" + id + "';";
        connection.query(sql1, function (check_err, check_res) {
          if (check_err) {
            response.status(201).json({ message: "Unable to Get User Details" });
          } else if (check_res.length != 0) {

            var new_user_id = check_res[0].User_Id;
            var invoice_number = check_res[0].Invoices;

            var sql3 = "SELECT * FROM hostel WHERE User_Id=?";
            connection.query(sql3, new_user_id, function (sel1_err, sel1_res) {
              if (sel1_err) {
                response.status(201).json({ message: "Unable to Get User Details" });
              } else if (sel1_res.length != 0) {
                var user_id = sel1_res[0].ID;

                var total_amount = check_res[0].Amount;

                var already_paid_amount = check_res[0].PaidAmount;

                var new_amount = already_paid_amount + amount;

                if (new_amount == total_amount) {
                  var Status = "Success";
                } else {
                  var Status = "Pending";
                }

                var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=?,Status=? WHERE id=?";
                connection.query(sql2, [balance_due, new_amount, Status, id], function (up_err, up_res) {
                  if (up_err) {
                    response.status(201).json({ message: "Unable to Update User Details" });
                  } else {

                    var sql3 = "INSERT INTO transactions (user_id,invoice_id,amount,status,created_by,payment_type,payment_date,description,action) VALUES (?,?,?,1,?,?,?,'Invoice',1)";
                    connection.query(sql3, [user_id, invoice_id, amount, created_by, payment_by, payment_date,],
                      function (ins_err, ins_res) {
                        if (ins_err) {
                          response.status(201).json({ message: "Unable to Add Transactions Details", });
                        } else {

                          if (payment_by == "Net Banking" && bank_id) {

                            var sql5 = "SELECT * FROM bankings WHERE id=? AND status=1";
                            connection.query(sql5, [bank_id], function (err, sel_res) {
                              if (err) {
                                console.log(err);
                              } else if (sel_res.length != 0) {

                                const balance_amount = parseInt(sel_res[0].balance);

                                var sql4 = "INSERT INTO bank_transactions (bank_id,date,amount,`desc`,type,status,createdby,edit_id) VALUES (?,?,?,?,?,?,?,?)";
                                connection.query(sql4, [bank_id, payment_date, amount, 'Invoice', 1, 1, created_by, id], function (err, ins_data) {
                                  if (err) {
                                    console.log(err, "Insert Transactions Error");
                                  } else {
                                    var new_amount = parseInt(balance_amount) + parseInt(amount);

                                    var sql5 = "UPDATE bankings SET balance=? WHERE id=?";
                                    connection.query(sql5, [new_amount, bank_id], function (err, up_date) {
                                      if (err) {
                                        console.log(err, "Update Amount Error");
                                      }
                                    })
                                  }
                                })

                              } else {
                                console.log("Invalid Bank Id");
                              }
                            })
                          }

                          var sql10 = "INSERT INTO receipts (user_id,reference_id,invoice_number,amount_received,payment_date,payment_mode,created_by) VALUES (?)";
                          var params = [user_id, reference_id, invoice_number, amount, payment_date, payment_by, created_by]
                          connection.query(sql10, [params], function (err, ins_data) {
                            if (err) {
                              console.log(err);
                              console.log("Error to Add Receipt Details");
                              // return res.status(201).json({ statusCode: 201, message: "Error to Add Receipt Details", reason: err.message });
                            }
                          })

                          response.status(200).json({ message: "Update Successfully" });
                        }
                      });
                  }
                });
              } else {
                response.status(201).json({ message: "Invalid User Id" });
              }
            });
          } else {
            response.status(201).json({ message: "Invalid User Id" });
          }
        });
      }
    } else {
      if (!amount && amount == undefined) {
        response.status(203).json({ message: "Missing Required Field" });
      } else {
        var sql1 = "SELECT * FROM invoicedetails WHERE id='" + id + "';";
        connection.query(sql1, function (check_err, check_res) {
          if (check_err) {
            response.status(201).json({ message: "Unable to Get User Details" });
          } else if (check_res.length != 0) {
            var new_user_id = check_res[0].User_Id;
            var invoice_number = check_res[0].Invoices;

            var sql3 = "SELECT * FROM hostel WHERE User_Id=?";
            connection.query(sql3, new_user_id, function (sel1_err, sel1_res) {
              if (sel1_err) {
                response.status(201).json({ message: "Unable to Get User Details" });
              } else if (sel1_res.length != 0) {
                var ID = sel1_res[0].ID;

                var total_advance = sel1_res[0].AdvanceAmount;

                var already_paid_amount = sel1_res[0].paid_advance;
                var new_amount = already_paid_amount + amount;

                if (new_amount > total_advance) {
                  response.status(201).json({ message: "Pay Amount More than Advance Amount, Kindly Check Advance Amount", });
                } else {
                  if (new_amount == total_advance) {
                    var Status = "Success";
                  } else {
                    var Status = "Pending";
                  }

                  var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=?,Status=? WHERE id=?";
                  connection.query(sql2, [balance_due, new_amount, Status, id], function (up_err, up_res) {
                    if (up_err) {
                      response.status(201).json({ message: "Unable to Update User Details" });
                    } else {
                      var sql4 = "UPDATE hostel SET paid_advance=?,pending_advance=? WHERE ID=?";
                      connection.query(sql4, [new_amount, balance_due, ID], function (up_err1, up_res1) {
                        if (up_err) {
                          response.status(201).json({ message: "Unable to Update Payemnt Details", });
                        } else {
                          var sql3 = "INSERT INTO transactions (user_id,invoice_id,amount,status,created_by,payment_type,payment_date,description,action) VALUES (?,?,?,1,?,?,?,'Invoice',1)";
                          connection.query(sql3, [ID, invoice_id, amount, created_by, payment_by, payment_date,],
                            function (ins_err, ins_res) {
                              if (ins_err) {
                                response.status(201).json({ message: "Unable to Add Transactions Details", });
                              } else {

                                var sql1 = "INSERT INTO receipts (user_id,reference_id,invoice_number,amount_received,payment_date,payment_mode,created_by) VALUES (?)";
                                var params = [ID, reference_id, invoice_number, amount, payment_date, payment_by, created_by]
                                connection.query(sql1, [params], function (err, ins_data) {
                                  if (err) {
                                    console.log(err);
                                    console.log("Error to Add Receipt Details");
                                    // return res.status(201).json({ statusCode: 201, message: "Error to Add Receipt Details", reason: err.message });
                                  }
                                })
                                response.status(200).json({ message: "Update Successfully" });
                              }
                            }
                          );
                        }
                      }
                      );
                    }
                  }
                  );
                }
              } else {
                response.status(201).json({ message: "Invalid User Id" });
              }
            });
          } else {
            response.status(201).json({ message: "Invalid User Id" });
          }
        });
      }
    }
  } else {
    response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

// Get Customer Details
function customer_details(req, res) {

  var user_id = req.body.user_id;

  var created_by = req.user_details.id;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (is_admin == 1 || (role_permissions[4] && role_permissions[4].per_view == 1)) {

    if (!user_id || user_id == undefined) {
      return res.status(201).json({ message: "Missing User Details", statusCode: 201 });
    }

    var sql1 = "SELECT hs.*,hosroom.id as Room_Id,hosroom.Room_Id as Room_Name,hf.floor_name,inv.id AS inv_id,CASE WHEN inv.BalanceDue IS NULL THEN 'Not Generate' WHEN inv.BalanceDue > 0 OR inv.BalanceDue IS NULL THEN 'Unpaid' ELSE 'Paid' END AS status FROM hostel AS hs LEFT JOIN hostelrooms hosroom ON hosroom.id = hs.Rooms LEFT JOIN Hostel_Floor AS hf ON hs.Floor=hf.floor_id AND hs.Hostel_Id=hf.hostel_id LEFT JOIN invoicedetails AS inv ON inv.hos_user_id=hs.ID AND inv.action='advance' AND inv.invoice_status=1 WHERE hs.ID=? AND hs.isActive=1;";
    connection.query(sql1, [user_id], (user_err, user_data) => {
      if (user_err) {
        console.log("user_err", user_err);
        return res.status(201).json({ message: "Unable to Get User Details", statusCode: 201 });
      } else if (user_data.length != 0) {
        var temp = user_data[0];

        var hostel_id = user_data[0].Hostel_Id;

        var amenn_user_id = user_data[0].User_Id;
        // All Amenties
        var sql2 = "SELECT amname.Amnities_Name AS Amnities_Name,amen.setAsDefault AS free_amenity FROM AmenitiesHistory AS amhis JOIN AmnitiesName AS amname ON amname.id = amhis.amenity_Id JOIN Amenities AS amen ON amen.id=amhis.amenity_Id WHERE amhis.status = 1 AND amhis.user_id = '" + amenn_user_id + "' AND amen.createdBy='" + created_by + "' UNION SELECT amname.Amnities_Name AS Amnities_Name,amen.setAsDefault AS free_amenity FROM Amenities AS amen JOIN AmnitiesName AS amname ON amname.id = amen.Amnities_Id WHERE amen.setAsDefault = 1 AND amen.createdBy='" + created_by + "' AND amen.Hostel_Id='" + hostel_id + "' GROUP BY Amnities_Name";
        connection.query(sql2, (am_err, am_data) => {
          if (am_err) {
            // console.log(am_err);
            temp["amentites"] = 0;
          } else {
            temp["amentites"] = am_data;
            user_data[0] = temp;
          }
          // Get Eb Details
          var sql3 = "SELECT hf.floor_id ,hr.id as Room_Id,  cb.id,cb.start_meter,cb.end_meter,cb.unit,cb.amount,hos.Name,hos.profile,hos.HostelName,hf.floor_name,hr.Room_Id as Room_Name, DATE_FORMAT(cb.date, '%Y-%m-%d') AS reading_date FROM customer_eb_amount AS cb JOIN hostel AS hos ON hos.ID=cb.user_id LEFT JOIN Hostel_Floor AS hf ON hf.floor_id=hos.Floor AND hf.hostel_id=hos.Hostel_Id LEFT JOIN hostelrooms AS hr ON hr.id=hos.Rooms WHERE cb.user_id=? AND cb.status=1";
          connection.query(sql3, [user_id], (eb_err, eb_data) => {
            if (eb_err) {
              return res.status(201).json({ message: "Unable to Eb Details", statusCode: 201 });
            } else {

              // Get Transactions Details
              var sql5 = "SELECT 'advance' AS type, id, user_id, advance_amount AS amount,payment_status AS status,payment_type,payment_date, createdAt AS created_at FROM advance_amount_transactions WHERE user_id =? UNION ALL SELECT 'rent' AS type, id, user_id, amount,status,payment_type,payment_date, createdAt AS created_at FROM transactions WHERE user_id =? ORDER BY created_at DESC";
              connection.query(sql5, [user_id, user_id], (trans_err, trans_res) => {
                if (trans_err) {
                  return res.status(201).json({ message: "Unable to Get Transactions Details", statusCode: 201 });
                } else {
                  // Get Hostel Amenities
                  var sql6 = "SELECT amname.Amnities_Name,am.Amount,am.Amnities_Id FROM Amenities AS am JOIN AmnitiesName AS amname ON amname.id=am.Amnities_Id LEFT JOIN AmenitiesHistory AS amhis ON amhis.amenity_Id=am.Amnities_Id AND amhis.user_Id='" + amenn_user_id + "' WHERE am.Hostel_Id='" + hostel_id + "' AND am.setAsDefault=0 AND am.Status=1 AND am.createdBy='" + created_by + "' GROUP BY amname.Amnities_Name;";
                  connection.query(sql6, [hostel_id], (am_err, am_res) => {
                    if (am_err) {
                      console.log(am_err);
                      return res.status(201).json({ message: "Unable to Get All Amenities", statusCode: 201 });
                    } else {

                      // Complaints
                      var sql7 = "SELECT cm.Requestid,cm.Assign,DATE_FORMAT(cm.date, '%Y-%m-%d') AS complaint_date,cm.Status,ct.complaint_name FROM compliance AS cm JOIN complaint_type AS ct ON cm.Complainttype=ct.id WHERE User_id=?";
                      connection.query(sql7, [amenn_user_id], function (err, comp_data) {
                        if (err) {
                          return res.status(201).json({ message: "Unable to Get Eb Details", statusCode: 201 });
                        }

                        // Contact Details

                        var sql8 = "SELECT * FROM contacts WHERE user_id=? AND status=1";
                        connection.query(sql8, [user_id], function (err, Data) {
                          if (err) {
                            return res.status(201).json({ message: "Unable to Get Contact Details", statusCode: 201 });
                          } else {

                            // Get Invoice Details
                            var sql4 = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND invoice_status=1 ORDER BY id DESC";
                            connection.query(sql4, [user_id], (inv_err, inv_res) => {
                              if (inv_err) {
                                return res.status(201).json({ message: "Unable to  Get Invoice Details", statusCode: 201 });
                              } else {


                                if (inv_res.length != 0) {

                                  let completed = 0;

                                  inv_res.forEach((invoice, index) => {
                                    var sql2 = "SELECT * FROM manual_invoice_amenities WHERE invoice_id=?";
                                    connection.query(sql2, [invoice.id], function (err, amenities) {
                                      if (err) {
                                        console.log(err);
                                        inv_res[index]['amenity'] = [];
                                      } else {
                                        inv_res[index]['amenity'] = amenities || [];
                                      }

                                      completed++;
                                      if (completed === inv_res.length) {
                                        res.status(200).json({ statusCode: 200, message: "View Customer Details", data: user_data, eb_data: eb_data, invoice_details: inv_res, transactions: trans_res, all_amenities: am_res, comp_data: comp_data, contact_details: Data });
                                        // return res.status(200).json({ message: "All Bill Details", statusCode: 200, bill_details: invoices });
                                      }
                                    });
                                  });
                                } else {
                                  res.status(200).json({ statusCode: 200, message: "View Customer Details", data: user_data, eb_data: eb_data, invoice_details: inv_res, transactions: trans_res, all_amenities: am_res, comp_data: comp_data, contact_details: Data });
                                }
                              }
                            });
                          }
                        })
                      })
                    }
                  });
                }
              }
              );

            }
          });
        });
      } else {
        return res.status(201).json({ message: "Invalid or Inactive User", statusCode: 201 });
      }
    });
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function user_amenities_history(req, res) {

  var user_id = req.body.user_id;
  var amenities_id = req.body.amenities_id || [];

  var sql1 = "SELECT * FROM hostel WHERE ID=?";
  connection.query(sql1, [user_id], (sel_err, sel_res) => {
    if (sel_err) {
      return res.status(201).json({ message: "Database query error", error: sel_err });
    } else if (sel_res.length != 0) {
      var user_ids = sel_res[0].User_Id;

      var sql = `SELECT amen.id,amen.user_Id,amen.amenity_Id,hostel.Hostel_Id,amen.status,amen.created_At,amname.Amnities_Name,am.Amount FROM AmenitiesHistory AS amen JOIN hostel ON hostel.User_Id = amen.user_Id JOIN Amenities AS am ON am.Amnities_Id = amen.amenity_Id AND amen.Hostel_Id=am.Hostel_Id JOIN AmnitiesName AS amname ON am.Amnities_Id = amname.id WHERE amen.user_Id = '${user_ids}' AND am.Status=1`;

      if (amenities_id.length > 0) {
        sql += ` AND amen.amenity_Id IN (${amenities_id.join(",")})`;
      }

      sql += ` ORDER BY amen.created_At ASC`; // Ensure records are ordered by created_At

      connection.query(sql, (am_err, am_data) => {
        if (am_err) {
          return res.status(201).json({ message: "Unable to fetch amenity details", error: am_err });
        } else {
          const result = [];
          const lastStatusMap = {};
          const monthNames = [null, "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",];

          // Get the current month and year dynamically
          const currentDate = new Date();
          const currentMonth = currentDate.getMonth() + 1; // Get current month (1-12)
          const currentYear = currentDate.getFullYear();

          // Use a Set to keep track of unique records
          const seenRecords = new Set();

          // Process each record from the database query
          am_data.forEach((record) => {
            const status = record.status;
            const createdAt = new Date(record.created_At);
            const amenityId = record.amenity_Id;
            const startMonth = createdAt.getMonth() + 1; // Get month from createdAt
            const startYear = createdAt.getFullYear();
            const uniqueKey = `${record.user_Id}-${amenityId}-${startYear}-${startMonth}`;

            // If there are gaps before the current record, fill them
            if (lastStatusMap[amenityId] !== undefined) {
              const lastRecordDate = new Date(
                lastStatusMap[amenityId].created_At
              );
              const lastMonth = lastRecordDate.getMonth() + 1;
              const lastYear = lastRecordDate.getFullYear();

              for (let year = lastYear; year <= startYear; year++) {
                const start = year === lastYear ? lastMonth + 1 : 1;
                const end = year === startYear ? startMonth : 12;

                for (let month = start; month < end; month++) {
                  if (
                    year > currentYear ||
                    (year === currentYear && month > currentMonth)
                  ) {
                    break;
                  }
                  const gapUniqueKey = `${record.user_Id}-${amenityId}-${year}-${month}`;
                  if (!seenRecords.has(gapUniqueKey)) {
                    seenRecords.add(gapUniqueKey);
                    result.push({
                      id: null,
                      user_Id: record.user_Id,
                      amenity_Id: amenityId,
                      hostel_Id: record.hostel_Id,
                      created_At: `${year}-${String(month).padStart(
                        2,
                        "0"
                      )}-01T00:00:00.000Z`,
                      Amnities_Name: record.Amnities_Name,
                      Amount: record.Amount,
                      status: lastStatusMap[amenityId].status,
                      month_name: monthNames[month],
                    });
                  }
                }
              }
            }

            // Add the current record
            if (
              startYear < currentYear ||
              (startYear === currentYear && startMonth <= currentMonth)
            ) {
              // seenRecords.add(uniqueKey);
              result.push({
                id: record.id,
                user_Id: record.user_Id,
                amenity_Id: record.amenity_Id,
                hostel_Id: record.hostel_Id,
                created_At: record.created_At,
                Amnities_Name: record.Amnities_Name,
                Amount: record.Amount,
                status: record.status,
                month_name: monthNames[startMonth],
              });
            }

            // Update the last known status
            lastStatusMap[amenityId] = {
              Amnities_Name: record.Amnities_Name,
              Amount: record.Amount,
              status: record.status,
              created_At: record.created_At,
            };
          });

          console.log(lastStatusMap);

          // Fill missing months after the last record for each amenity
          Object.keys(lastStatusMap).forEach((amenityId) => {
            const lastRecordDate = new Date(
              lastStatusMap[amenityId].created_At
            );
            const lastMonth = lastRecordDate.getMonth() + 1;
            const lastYear = lastRecordDate.getFullYear();

            for (let year = lastYear; year <= currentYear; year++) {
              const start = year === lastYear ? lastMonth + 1 : 1;
              const end = year === currentYear ? currentMonth : 12;

              for (let month = start; month <= end; month++) {
                if (
                  year > currentYear ||
                  (year === currentYear && month > currentMonth)
                ) {
                  break;
                }
                const gapUniqueKey = `${sel_res[0].User_Id}-${amenityId}-${year}-${month}`;
                if (!seenRecords.has(gapUniqueKey)) {
                  seenRecords.add(gapUniqueKey);
                  result.push({
                    id: null,
                    user_Id: sel_res[0].User_Id,
                    amenity_Id: amenityId,
                    hostel_Id: sel_res[0].ID,
                    created_At: `${year}-${String(month).padStart(
                      2,
                      "0"
                    )}-01T00:00:00.000Z`,
                    Amnities_Name: lastStatusMap[amenityId].Amnities_Name,
                    Amount: lastStatusMap[amenityId].Amount,
                    status: lastStatusMap[amenityId].status,
                    month_name: monthNames[month],
                  });
                }
              }
            }
          });

          // Sort the result by created_At
          result.sort(
            (a, b) => new Date(a.created_At) - new Date(b.created_At)
          );

          return res
            .status(200)
            .json({
              statusCode: 200,
              message: "Amenity Details",
              data: result,
            });
        }
      });
    } else {
      return res
        .status(200)
        .json({ message: "Invalid User Details", statusCode: 201 });
    }
  });
}

function getAmnitiesName(connection, request, response) {

  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  if (is_admin == 1 || (role_permissions[18] && role_permissions[18].per_view == 1)) {

    connection.query("select * from AmnitiesName", function (error, data) {
      if (error) {
        response.status(203).json({ message: "not connected" });
      } else {
        response.status(200).json({ data: data });
      }
    });
  } else {
    response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function aadhar_verify_otp(req, res) {

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (is_admin == 1 || (role_permissions[4] && role_permissions[4].per_edit == 1)) {

    var user_id = req.body.user_id;
    var aadhar_number = req.body.aadhar_number;

    if (!user_id || !aadhar_number) {
      return res
        .status(200)
        .json({
          statusCode: 201,
          message: "Missing User Details and Aadhar Number",
        });
    }

    var client_id = process.env.CASHFREE_CLIENTID;
    var client_secret = process.env.CASHFREE_CLIENTSECRET;
    var url = "https://api.cashfree.com/verification/offline-aadhaar/otp";

    const options = {
      url: url,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": client_id,
        "x-client-secret": client_secret,
      },

      body: JSON.stringify({
        aadhaar_number: aadhar_number,
        consent: "Y",
      }),
    };
    request(options, (error, response, body) => {
      if (error) {
        console.error("Error:", error);
        return res.json({ message: error });
      }
      const result = JSON.parse(body);
      console.log("OTP generation response:", result);
      if (result.status == "SUCCESS") {
        return res
          .status(200)
          .json({
            statusCode: 200,
            message: "OTP sent successfully",
            result: result,
          });
      } else {
        return res.status(201).json({ statusCode: 201, result: result });
      }
    });

  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function encrypt(text, secretKey) {
  return CryptoJS.AES.encrypt(text, secretKey).toString();
}

function aadhaar_otp_verify(req, res) {

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (is_admin == 1 || (role_permissions[4] && role_permissions[4].per_edit == 1)) {

    var otp = req.body.otp;
    var aadhar_number = req.body.aadhar_number;
    var user_id = req.body.user_id;
    var ref_id = req.body.ref_id;

    if (!otp || !user_id || !aadhar_number) {
      return res
        .status(200)
        .json({ statusCode: 201, message: "Missing Required Fields" });
    }

    var client_id = process.env.CASHFREE_CLIENTID;
    var client_secret = process.env.CASHFREE_CLIENTSECRET;
    var url = "https://api.cashfree.com/verification/offline-aadhaar/verify";

    const secretKey = "abcd"; // Secret key used for encryption
    const originalText = aadhar_number;
    const encryptedText = encrypt(originalText, secretKey);
    console.log(encryptedText);

    if (otp == "1234") {
      var sql1 =
        "UPDATE hostel SET AadharNo='" +
        encryptedText +
        "' WHERE ID='" +
        user_id +
        "'";
      console.log(sql1);
      connection.query(sql1, function (err, data) {
        if (err) {
          return res
            .status(201)
            .json({
              statusCode: 201,
              message: "Unable to Update Aadhar Details",
            });
        } else {
          return res
            .status(200)
            .json({
              statusCode: 200,
              message: "Successfully Update Aadhar Details",
            });
        }
      });
    } else {
      const options = {
        url: url,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-client-id": client_id,
          "x-client-secret": client_secret,
        },

        body: JSON.stringify({
          otp: otp,
          ref_id: ref_id,
        }),
      };
      request(options, (error, response, body) => {
        if (error) {
          console.error("Error:", error);
          return;
        }

        const result = JSON.parse(body);
        console.log("OTP verification response:", result);

        if (result.status == "VALID") {
          var sql1 =
            "UPDATE hostel SET AadharNo='" +
            encryptedText +
            "' WHERE ID='" +
            user_id +
            "'";
          connection.query(sql1, function (err, data) {
            if (err) {
              return res
                .status(201)
                .json({
                  statusCode: 201,
                  message: "Unable to Update Aadhar Details",
                });
            } else {
              return res
                .status(200)
                .json({
                  statusCode: 200,
                  message: "Successfully Update Aadhar Details",
                  result: result,
                });
            }
          });
        } else {
          return res.status(201).json({ statusCode: 201, result: result });
        }
      });
    }
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function conutry_list(req, res) {
  var sql1 = "SELECT * FROM country_list";
  connection.query(sql1, function (err, data) {
    if (err) {
      return res
        .status(201)
        .json({ message: "Unable to Get Country Details", statusCode: 201 });
    } else {
      return res
        .status(200)
        .json({
          message: "All Country Details",
          statusCode: 200,
          country_codes: data,
        });
    }
  });
}

// function get_invoice_id(req, res) {

//   var user_id = req.body.user_id;
//   // var created_by = req.user_details.id;

//   // var role_permissions = req.role_permissions;
//   // var is_admin = req.is_admin;

//   // if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_view == 1)) {

//   if (!user_id) {
//     return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
//   }

//   var sql_1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
//   connection.query(sql_1, [user_id], function (err, user_data) {
//     if (err) {
//       return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" });
//     } else if (user_data.length != 0) {
//       var hostel_id = user_data[0].Hostel_Id;

//       var sql1 = "SELECT * FROM hosteldetails WHERE id=? AND isActive=1";
//       connection.query(sql1, [hostel_id], function (err, hos_details) {
//         if (err) {
//           return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" });
//         } else if (hos_details.length != 0) {

//           var sql2 = "SELECT * FROM invoicedetails WHERE Hostel_Id=? AND action !='advance' ORDER BY id DESC;";
//           connection.query(sql2, [hostel_id], function (err, inv_data) {
//             if (err) {
//               return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" });
//             } else if (inv_data.length != 0) {

//               var invoice_number = inv_data[0].Invoices;
//               console.log(invoice_number);

//               let lastThreeChars = invoice_number.slice(-3);
//               let result = invoice_number.slice(0, -3);

//               console.log("lastThreeChars", lastThreeChars);

//               let newInvoiceNumber;

//               if (lastThreeChars === 'NaN' || isNaN(lastThreeChars)) {
//                 newInvoiceNumber = result + '001';
//               } else {
//                 newInvoiceNumber = invoice_number.slice(0, -1) + (parseInt(invoice_number.slice(-1)) + 1);
//               }

//               check_inv_validation(invoice_number, hostel_id, res);

//               // return res.status(200).json({ statusCode: 200, message: "Get Invoice Number", invoice_number: newInvoiceNumber, hostel_id: hostel_id, });

//             } else {
//               var prefix = hos_details[0].prefix;
//               var suffix = hos_details[0].suffix;

//               const month = moment(new Date()).month() + 1;
//               const year = moment(new Date()).year();

//               let newInvoiceNumber;
//               if (prefix || suffix) {
//                 newInvoiceNumber = `${prefix}${suffix}`;
//               } else {
//                 newInvoiceNumber = `${hos_details[0].Name}${month}${year}001`;
//               }

//               check_inv_validation(newInvoiceNumber, hostel_id, res);

//               // return res.status(200).json({ statusCode: 200, message: "Get Invoice Number", invoice_number: newInvoiceNumber, hostel_id: hostel_id, });
//             }
//           });
//         } else {
//           return res.status(201).json({ statusCode: 201, message: "Invalid Hostel Details" });
//         }
//       });
//     } else {
//       return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
//     }
//   });

//   // } else {
//   //   res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
//   // }

//   function check_inv_validation(invoice_number, hostel_id, res) {

//     var ch_query = "SELECT * FROM invoicedetails WHERE Invoices=? AND invoice_status=1";
//     connection.query(ch_query, [invoice_number], function (err, data) {
//       if (err) {
//         console.log("Invoice Error");
//         return res.status(201).json({ statusCode: 201, message: "Check Invoice Query Error" });
//       }

//       if (data.length != 0) {
//         console.log("Invoice Number Already Exits"); // Generate New Invoice Function
//         let lastThreeChars = invoice_number.slice(-3);
//         let invoicePrefix = invoice_number.slice(0, -3);
//         let newNumber = isNaN(lastThreeChars) ? 1 : parseInt(lastThreeChars) + 1;
//         let newInvoiceNumber = invoicePrefix + newNumber.toString().padStart(3, '0');

//         check_inv_validation(newInvoiceNumber, hostel_id, res);
//       } else {
//         console.log("Success");
//         return res.status(200).json({ statusCode: 200, message: "Get Invoice Number", invoice_number: invoice_number, hostel_id: hostel_id, });
//       }
//     })
//   }

// }

function get_invoice_id(req, res) {
  var user_id = req.body.user_id;

  if (!user_id) {
    return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
  }

  var sql_1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
  connection.query(sql_1, [user_id], function (err, user_data) {
    if (err) {
      return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" });
    } else if (user_data.length > 0) {
      var hostel_id = user_data[0].Hostel_Id;

      var sql1 = "SELECT * FROM hosteldetails WHERE id=? AND isActive=1";
      connection.query(sql1, [hostel_id], function (err, hos_details) {
        if (err) {
          return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" });
        } else if (hos_details.length > 0) {
          let prefix = (hos_details[0].prefix || hos_details[0].Name || "INV").replace(/\s+/g, '-'); // Remove spaces
          let suffix = hos_details[0].suffix || "001"; // Default suffix is 26

          var sql2 = "SELECT * FROM invoicedetails WHERE Hostel_Id=? AND action != 'advance' ORDER BY id DESC LIMIT 1;";
          connection.query(sql2, [hostel_id], function (err, inv_data) {
            if (err) {
              return res.status(201).json({ statusCode: 201, message: "Unable to Get Invoice Details" });
            } else {
              let newInvoiceNumber;

              if (inv_data.length > 0) {
                let lastInvoice = inv_data[0].Invoices || "";

                // Extract previous prefix and suffix
                let lastPrefix = lastInvoice.replace(/\d+$/, ''); // Remove numbers
                let lastSuffix = lastInvoice.replace(/^\D+/, '') || "26"; // Keep only numbers, default is 26

                // If the prefix has changed, reset suffix to 26
                if (prefix !== lastPrefix) {
                  newInvoiceNumber = `${prefix}-${suffix}`;
                } else {
                  let newSuffix = (parseInt(lastSuffix) + 1).toString(); // Increment without leading zeros
                  newInvoiceNumber = `${prefix}-${newSuffix}`;
                }
              } else {
                // First Invoice Case
                newInvoiceNumber = `${prefix}-${suffix}`;
              }

              check_inv_validation(newInvoiceNumber, hostel_id, res);
            }
          });
        } else {
          return res.status(201).json({ statusCode: 201, message: "Invalid Hostel Details" });
        }
      });
    } else {
      return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
    }
  });

  function check_inv_validation(invoice_number, hostel_id, res) {
    var ch_query = "SELECT * FROM invoicedetails WHERE Invoices=? AND invoice_status=1";
    connection.query(ch_query, [invoice_number], function (err, data) {
      if (err) {
        return res.status(201).json({ statusCode: 201, message: "Check Invoice Query Error" });
      }

      if (data.length > 0) {
        console.log("Invoice Number Already Exists");
        let invoicePrefix = invoice_number.replace(/\d+$/, '');
        let lastNumber = invoice_number.replace(/^\D+/, '');
        let newNumber = (parseInt(lastNumber) + 1).toString();

        let newInvoiceNumber = `${invoicePrefix}${newNumber}`;
        check_inv_validation(newInvoiceNumber, hostel_id, res);
      } else {
        console.log("Success");
        return res.status(200).json({ statusCode: 200, message: "Generated Invoice Number", invoice_number, hostel_id });
      }
    });
  }
}




function get_user_amounts(req, res) {

  var { user_id, start_date, end_date } = req.body;
  var created_by = req.user_details.id;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_view == 1)) {

    if (!start_date || !end_date) {
      return res.status(201).json({ message: "Missing Mandatory Fields", statusCode: 201 });
    }

    // Rent Amount
    // var sql1 = "SELECT * FROM hostel AS hs LEFT JOIN  eb_settings AS eb ON hs.Hostel_Id=eb.hostel_id WHERE hs.ID=? OR hs.User_Id=? AND hs.isActive=1 AND hs.created_by=?";
    var sql1 = "SELECT *, CASE WHEN checkoutDate IS NULL THEN DATEDIFF(LEAST(CURDATE(), '" + end_date + "'), GREATEST(joining_date, '" + start_date + "')) + 1 ELSE DATEDIFF(LEAST(checkoutDate, '" + end_date + "'), GREATEST(joining_date, '" + start_date + "')) + 1 END AS days_stayed FROM hostel WHERE Rooms!= 'undefined' AND Floor!='undefined' AND joining_date <= '" + end_date + "' AND (checkoutDate >= '" + start_date + "' OR checkoutDate IS NULL) AND isActive=1 AND ID=?";
    connection.query(sql1, [user_id], (err, data) => {
      if (err) {
        return res.status(201).json({ message: "Unable to Get User Details", statusCode: 201 });
      } else if (data.length != 0) {
        var total_array = [];

        var per_unit_amount = data[0].amount;
        var uniq_user = data[0].User_Id;
        var hostel_id = data[0].Hostel_Id;

        const startDate = new Date(start_date);
        // const endDate = new Date(end_date);

        var total_days = data[0].days_stayed;
        // const diff_dates = endDate - startDate;
        // const total_days = Math.ceil(diff_dates / (1000 * 60 * 60 * 24));
        var room_rent = data[0].RoomRent;
        const daysInCurrentMonth = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate(); // Get total days in start date's month
        // console.log(daysInCurrentMonth);

        const oneDayAmount = room_rent / daysInCurrentMonth; // Daily rent
        // console.log(oneDayAmount);
        const totalRent = parseFloat((oneDayAmount * total_days).toFixed(2)); // Total rent rounded to 2 decimal places

        var rom_am = Math.round(totalRent)
        total_array.push({ id: 50, description: "Room Rent", total_amount: room_rent, amount: rom_am })

        var sql2 = "SELECT amname.Amnities_Name,am.Amount,am.Amnities_Id FROM Amenities AS am JOIN AmnitiesName AS amname ON amname.id=am.Amnities_Id JOIN AmenitiesHistory AS amhis ON amhis.amenity_Id=am.Amnities_Id AND amhis.user_Id=? WHERE am.Hostel_Id=? AND am.setAsDefault=0 AND am.Status=1 AND am.createdBy=? GROUP BY amname.Amnities_Name"
        connection.query(sql2, [uniq_user, hostel_id, created_by], function (err, am_data) {
          if (err) {
            return res.status(201).json({ message: "Unable to Get Amenity Details", statusCode: 201 })
          } else {
            var id = 1
            if (am_data.length != 0) {
              for (let i = 0; i < am_data.length; i++) {
                total_array.push({ id: id++, description: am_data[i].Amnities_Name, total_amount: am_data[i].Amount, amount: am_data[i].Amount })
              }
            }

            var sql3 = "SELECT SUM(amount) AS amount,SUM(unit) AS units FROM customer_eb_amount WHERE user_id=? AND date BETWEEN ? AND ?;"
            connection.query(sql3, [user_id, start_date, end_date], function (err, eb_data) {
              if (err) {
                return res.status(201).json({ message: "Unable to Eb Amount Details", statusCode: 201 })
              } else if (eb_data.length != 0) {

                if (eb_data[0].amount != null) {
                  total_array.push({ id: 10, description: 'Eb Amount', amount: eb_data[0].amount, per_unit_amount: per_unit_amount, used_unit: eb_data[0].units });
                }
                return res.status(200).json({ statusCode: 200, message: "User Amount Details", total_array: total_array });
              } else {
                return res.status(200).json({ statusCode: 200, message: "User Amount Details", total_array: total_array });
              }
            })
            // var sql3 = "SELECT SUM(EbAmount) AS eb_amount,SUM(Eb_Unit) AS eb_unit FROM EbAmount WHERE date BETWEEN ? AND ?;";
            // connection.query(sql3, [start_date, end_date], function (err, eb_data) {
            //   if (err) {
            //     return res.status(201).json({ message: "Unable to Get Eb Details", statusCode: 201 })
            //   } else {
            //     if (eb_data.length != 0) {

            //       var total_ebamount = eb_data[0].eb_amount;
            //       var total_eb_units = eb_data[0].eb_unit;

            //       var sql4 =
            //         "SELECT * FROM hostel WHERE Rooms='" +
            //         room_id +
            //         "' AND Hostel_Id='" +
            //         hostel_id +
            //         "' AND Floor='" +
            //         floor +
            //         "'";
            //       connection.query(sql4, function (err, room_data) {
            //         if (err) {
            //           return res
            //             .status(201)
            //             .json({
            //               message: "Unable to Get User all Details",
            //               statusCode: 201,
            //             });
            //         } else {
            //           if (room_data.length != 0) {
            //             const start_date = new Date(req.body.start_date);
            //             const end_date = new Date(req.body.end_date);

            //             let activeUsers = 0;
            //             let userStayDetails = [];

            //             room_data.forEach((user) => {
            //               if (user.isActive) {
            //                 const stayStart = new Date(user.createdAt);
            //                 const stayEnd = user.checkoutDate
            //                   ? new Date(user.checkoutDate)
            //                   : end_date;

            //                 const effectiveStartDate = new Date(
            //                   Math.max(stayStart, start_date)
            //                 );

            //                 const effectiveEndDate = new Date(
            //                   Math.min(stayEnd, end_date)
            //                 );

            //                 if (effectiveStartDate <= effectiveEndDate) {
            //                   const totalStayDays =
            //                     Math.round(
            //                       (effectiveEndDate - effectiveStartDate) /
            //                       (1000 * 60 * 60 * 24)
            //                     ) + 1;

            //                   userStayDetails.push({
            //                     userId: user.ID,
            //                     stayDays: totalStayDays,
            //                   });

            //                   if (totalStayDays > 0) {
            //                     activeUsers += 1;
            //                   }
            //                 }
            //               }
            //             });

            //             var total_days = userStayDetails.reduce(
            //               (sum, user) => sum + user.stayDays,
            //               0
            //             );
            //             var eb_units_per_day = total_eb_units / total_days;
            //             console.log(eb_units_per_day);

            //             var eb_amount = total_ebamount / total_days;

            //             userStayDetails.forEach((user) => {
            //               user.totalUnits = parseFloat(
            //                 (user.stayDays * eb_units_per_day).toFixed(2)
            //               ); // Total EB Units
            //               user.ebShare = parseFloat(
            //                 (user.stayDays * eb_amount).toFixed(2)
            //               );
            //               console.log(
            //                 `User ${user.userId} EB Share: ₹${user.ebShare}`
            //               );
            //             });

            //             const per_user_amount = userStayDetails.find(
            //               (user) => user.userId == user_id
            //             );

            //             if (per_user_amount) {
            //               total_array.push({
            //                 id: 10,
            //                 description: 'Eb Amount', total_amount: total_ebamount, amount: per_user_amount.ebShare, per_unit_amount: per_unit_amount, used_unit: per_user_amount.totalUnits,
            //               });
            //             }

            //             // Respond with the calculated EB data
            //             return res.status(200).json({
            //               statusCode: 200,
            //               message: "User Amount Details",
            //               total_array: total_array,
            //             });
            //           } else {
            //             total_array.push({
            //               description: "Eb Amount",
            //               total_amount: total_ebamount,
            //               amount: total_ebamount,
            //             });
            //             return res
            //               .status(200)
            //               .json({
            //                 statusCode: 200,
            //                 message: "User Amount Details",
            //                 total_array: total_array,
            //                 room_data: room_data,
            //               });
            //           }
            //         }
            //       });
            //     } else {
            //       return res
            //         .status(200)
            //         .json({
            //           statusCode: 200,
            //           message: "User Amount Details",
            //           total_array: total_array,
            //         });
            //     }
            //   }
            // }
            // );
          }
        }
        );
      } else {
        return res.status(201).json({ message: "Invalid User Details", statusCode: 201 });
      }
    });
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function get_beduser_details(req, res) {

  var { hostel_id, floor_id, room_id, bed } = req.body;
  var created_by = req.user_details.id;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

    if (!hostel_id || !floor_id || !room_id || !bed) {
      return res
        .status(201)
        .json({ message: "Missing Mandatory Fields", statusCode: 201 });
    }

    var sql1 =
      "SELECT Name,Phone,RoomRent,createdAt,User_Id FROM hostel WHERE Hostel_Id=? AND Floor =? AND Rooms=? AND Bed=? AND isActive=1 AND created_by=?";
    connection.query(
      sql1,
      [hostel_id, floor_id, room_id, bed, created_by],
      function (err, data) {
        if (err) {
          return res
            .status(201)
            .json({ message: "Unable to Get User Details", statusCode: 201 });
        } else if (data.length != 0) {
          return res
            .status(200)
            .json({
              statusCode: 200,
              message: "Assigned User Details",
              user_details: data,
            });
        } else {
          return res
            .status(201)
            .json({ statusCode: 201, message: "Invalid User Details" });
        }
      }
    );
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function get_bill_details(req, res) {

  const created_by = req.user_details.id;

  var show_ids = req.show_ids;
  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;
  var hostel_id = req.body.hostel_id;

  if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_view == 1)) {

    if (!hostel_id) {
      return res.status(201).json({ message: "Missing Hostel Details", statusCode: 201 });
    }

    // var sql1 = "SELECT * FROM invoicedetails WHERE created_By IN (?) AND invoice_status=1 ORDER BY id DESC";
    var sql1 = "SELECT inv.*,hostel.Address AS user_address,ca.Address AS admin_address,eb.start_date AS eb_start_date,eb.end_date AS eb_end_date,eb.amount AS eb_unit_amount,hostel.ID AS ID,CASE WHEN inv.BalanceDue > 0 OR inv.BalanceDue IS NULL THEN 'Unpaid' ELSE 'Paid' END AS status FROM invoicedetails AS inv JOIN hosteldetails AS hs ON hs.id=inv.Hostel_Id LEFT JOIN hostel ON hostel.id=inv.hos_user_id LEFT JOIN createaccount AS ca ON ca.id=hostel.created_by LEFT JOIN eb_settings AS eb ON inv.Hostel_Id=eb.hostel_id AND eb.status=1 WHERE inv.Hostel_Id=? AND inv.invoice_status=1 ORDER BY inv.id DESC;";
    connection.query(sql1, [hostel_id], function (err, invoices) {
      if (err) {
        return res.status(201).json({ message: "Unable to Get Bill Details", statusCode: 201 });
      }

      if (invoices.length === 0) {
        return res.status(200).json({ message: "No Bill Details Found", statusCode: 200, bill_details: [] });
      }

      let completed = 0;

      invoices.forEach((invoice, index) => {
        var sql2 = "SELECT * FROM manual_invoice_amenities WHERE invoice_id=?";
        connection.query(sql2, [invoice.id], function (err, amenities) {
          if (err) {
            console.log(err);
            invoices[index]['amenity'] = [];
          } else {
            invoices[index]['amenity'] = amenities || [];
          }

          completed++;
          if (completed === invoices.length) {
            return res.status(200).json({ message: "All Bill Details", statusCode: 200, bill_details: invoices });
          }
        });
      });
    });

  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}


function add_walk_in_customer(req, res) {

  const { id, first_name, last_name, email_Id, mobile_Number, walk_In_Date, joining_Date, comments } = req.body;
  const created_By = req.user_details.id;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;
  var hostel_id = req.body.hostel_id;

  // Check if required fields are provided
  if (!first_name || !mobile_Number) {
    return res.status(201).json({ message: 'Missing parameters' });
  }

  if (!hostel_id) {
    return res.status(201).json({ message: 'Missing Hostel Details', statusCode: 201 });
  }

  // If an id is provided, first check if it exists
  if (id) {

    if (is_admin == 1 || (role_permissions[7] && role_permissions[7].per_edit == 1)) {

      const checkIdQuery = `SELECT * FROM customer_walk_in_details WHERE id = ? AND isActive = true`;
      connection.query(checkIdQuery, [id], (err, idResults) => {
        if (err) {
          return res.status(201).json({ error: 'Error checking ID' });
        }

        // If ID does not exist, return an error message
        if (idResults.length === 0) {
          return res.status(203).json({ message: 'Customer ID not found' });
        }

        // If the ID exists, proceed to update the existing record
        const updateQuery = `UPDATE customer_walk_in_details SET first_name = ?,last_name=?, email_Id = ?, mobile_Number = ?, walk_In_Date = ?, joining_Date = ?, comments = ?, created_By = ? WHERE id = ?`;

        connection.query(updateQuery, [first_name, last_name, email_Id, mobile_Number, walk_In_Date, joining_Date, comments, created_By, id], (updateErr, updateResults) => {
          if (updateErr) {
            return res.status(201).json({ error: 'Error updating data' });
          }

          res.status(200).json({ message: 'Changes Saved successfully' });
        });
      });
    } else {
      res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
  } else {

    if (is_admin == 1 || (role_permissions[7] && role_permissions[7].per_create == 1)) {

      // Step 2: Check if mobile_Number already exists
      const checkMobileQuery = `SELECT * FROM customer_walk_in_details WHERE mobile_Number = ? AND isActive = true AND hostel_id=?`;
      connection.query(checkMobileQuery, [mobile_Number, hostel_id], (err, mobileResults) => {
        if (err) {
          return res.status(201).json({ error: 'Error checking mobile number' });
        }

        // If mobile number exists, return an error message
        if (mobileResults.length > 0) {
          return res.status(201).json({ message: 'Mobile number already exists' });
        }

        // Step 3: If both email and mobile do not exist, proceed to insert the new record
        const insertQuery = `INSERT INTO customer_walk_in_details (first_name,last_name, email_Id, mobile_Number, walk_In_Date, comments, joining_Date, created_By,hostel_id) VALUES (?, ?, ?, ?, ?, ?, ?,?,?)`;
        connection.query(insertQuery, [first_name, last_name, email_Id, mobile_Number, walk_In_Date, comments, joining_Date, created_By, hostel_id], (insertErr, insertResults) => {
          if (insertErr) {
            return res.status(201).json({ error: 'Error inserting data' });
          }
          // , id: insertResults.insertId 
          res.status(200).json({ message: 'Walk-in added successfully!', statusCode: 200 });
        });
      });
      // });

    } else {
      res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
  }
}

function get_walk_in_customer_list(req, res) {

  const created_By = req.user_details.id;

  var show_ids = req.show_ids;
  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;
  var hostel_id = req.body.hostel_id;

  if (is_admin == 1 || (role_permissions[7] && role_permissions[7].per_view == 1)) {

    if (!hostel_id) {
      return res.status(201).json({ statusCode: 201, message: "Missing Hostel Details" })
    }

    // Query to fetch customer details by ID
    const query = `SELECT * FROM customer_walk_in_details WHERE hostel_id=? AND isActive = true ORDER BY id DESC`;
    connection.query(query, [hostel_id], (err, results) => {
      if (err) {
        return res.status(201).json({ error: 'Error retrieving customer details' });
      }

      // Check if customer exists
      if (results.length == 0) {
        return res.status(201).json({ message: 'Customer not found' });
      }

      // Return customer details
      res.status(200).json({ message: 'Customer details retrieved successfully', data: results });
    });
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}


function delete_walk_in_customer(req, res) {

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (is_admin == 1 || (role_permissions[7] && role_permissions[7].per_delete == 1)) {

    if (req.body.id) {
      let query1 = `select * from customer_walk_in_details where id = ${req.body.id} and isActive = true`;
      connection.query(query1, function (sel_err, sel_data) {
        if (sel_err) {
          res.status(201).json({ message: 'Error while fetching data' });
        } else {
          if (sel_data.length > 0) {
            let query2 = `update customer_walk_in_details set isActive = false where id = ${req.body.id}`
            connection.query(query2, function (update_error, update_data) {
              if (update_error) {
                res.status(201).json({ message: 'Error while deleting data' });
              } else {
                res.status(200).json({ message: 'customer deleted successfully', statusCode: 200 });
              }
            })
          } else {
            res.status(201).json({ message: 'No Data Found' });
          }
        }
      })
    } else {
      res.status(201).json({ message: 'Invalid Id' });
    }

  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}



function user_check_out(req, res) {

  var created_by = req.user_details.id;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (is_admin == 1 || (role_permissions[6] && role_permissions[6].per_create == 1)) {

    var { checkout_date, user_id, hostel_id, comments, action, req_date } = req.body;

    if (!user_id || !checkout_date || !req_date) {
      return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    if (!action) {
      var action = 1 // Add Checkout
    }
    // var action = 2 // Edit Checkout

    var sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1 AND created_by=? AND Hostel_Id=?";
    connection.query(sql1, [user_id, created_by, hostel_id], function (err, sel_res) {
      if (err) {
        return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
      } else if (sel_res.length != 0) {

        console.log(sel_res[0].CheckoutDate);

        if (action == 1 && sel_res[0].CheckoutDate) {
          return res.status(201).json({ statusCode: 201, message: "Already Added Checkout Date" })
        } else {

          var sql2 = "UPDATE hostel SET checkout_comment=?,CheckOutDate=?,req_date=? WHERE ID=?";
          connection.query(sql2, [comments, checkout_date, req_date, user_id], function (err, data) {
            if (err) {
              return res.status(201).json({ statusCode: 201, message: "Unable to Update User Details" })
            } else {
              if (action == 1) { // Add Message
                return res.status(200).json({ statusCode: 200, message: "Check-out Added Successfully!" })
              } else {
                return res.status(200).json({ statusCode: 200, message: "Changes Saved Successfully!" })
              }
            }
          })

        }
      } else {
        return res.status(201).json({ statusCode: 201, message: "Please select a valid hostel name. This customer does not exist for this hostel." })
      }
    })
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function get_confirm_checkout(req, res) {

  var { id, hostel_id } = req.body;

  if (!id || !hostel_id) {
    return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
  }

  var sql1 = "SELECT * FROM hostel WHERE ID=? AND Hostel_Id=? AND isActive=1";
  connection.query(sql1, [id, hostel_id], function (err, data) {
    if (err) {
      return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details", reason: err.message })
    } else if (data.length != 0) {

      var user_details = {
        advance_amount: data[0].AdvanceAmount,
        comments: data[0].checkout_comment
      }

      var sql2 = "SELECT * FROM invoicedetails WHERE hos_user_id=?";
      connection.query(sql2, [id], function (err, inv_data) {
        if (err) {
          return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details", reason: err.message })
        } else if (inv_data.length != 0) {


          const bill_details = inv_data.map(row => ({
            invoiceid: row.Invoices,
            balance: row.BalanceDue
          }));

          return res.status(200).json({ statusCode: 200, message: "Success", bill_details: bill_details, checkout_details: user_details });

        } else {
          return res.status(200).json({ statusCode: 200, message: "No Due Amounts", bill_details: [], checkout_details: user_details })
        }
      })
    } else {
      return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
    }
  })

}

// function add_confirm_checkout(req, res) {

//   var { id, hostel_id, checkout_date, advance_return, due_amount, comments, reinburse } = req.body;

//   var created_by = req.user_details.id;

//   if (!id || !hostel_id || !checkout_date || !due_amount || !advance_return) {
//     return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
//   }

//   var sql1 = "SELECT * FROM hostel WHERE ID=? AND Hostel_Id=? AND isActive=1 AND CheckoutDate !='null'";
//   connection.query(sql1, [id, hostel_id], function (err, data) {
//     if (err) {
//       return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details", reason: err.message })
//     } else if (data.length != 0) {

//       var bed_id = data[0].Bed;

//       if (!reinburse || reinburse == 0) {

//         var sql2 = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND BalanceDue !=0  AND invoice_status=1";
//         connection.query(sql2, [id], function (err, inv_data) {
//           if (err) {
//             return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details", reason: err.message })
//           } else if (inv_data.length == 0) {

//             var sql3 = "UPDATE hostel SET isActive=0,return_advance='" + advance_return + "',checkout_comment='" + comments + "' WHERE ID=" + id + ";UPDATE bed_details SET user_id=0,isfilled=0 WHERE id=" + bed_id + "";
//             connection.query(sql3, function (err, up_res) {
//               if (err) {
//                 return res.status(201).json({ statusCode: 201, message: "Unable to Checkout User Details", reason: err.message })
//               } else {
//                 return res.status(200).json({ statusCode: 200, message: "Checkout Added Successfully!" })
//               }
//             })
//           } else {
//             return res.status(201).json({ statusCode: 201, message: "Kindly Pay Due Amounts" })
//           }
//         })
//       } else {

//         var sql2 = "SELECT SUM(BalanceDue) AS totalBalanceDue FROM invoicedetails WHERE hos_user_id = ? AND BalanceDue != 0 AND invoice_status=1";
//         connection.query(sql2, [id], function (err, results) {
//           if (err) {
//             console.error("Error fetching balance due:", err);
//             return res.status(201).json({ statusCode: 201, message: "Error fetching balance due", reason: err.message })
//           }

//           const totalBalanceDue = results[0]?.totalBalanceDue || 0;

//           if (roomRent >= totalBalanceDue) {

//             var sql2 = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND BalanceDue !=0  AND invoice_status=1";
//             connection.query(sql2, [id], function (err, inv_data) {
//               if (err) {
//                 return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details", reason: err.message })
//               } else if (inv_data.length != 0) {

//                 for (let i = 0; i < inv_data.length; i++) {

//                   var c_bal = inv_data[i].BalanceDue;
//                   var invoice_id = inv_data[i].id;

//                   var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=?,Status=? WHERE id=?";
//                   connection.query(sql2, [c_bal, c_bal, "Success", id], function (up_err, up_res) {
//                     if (up_err) {
//                       response.status(201).json({ message: "Unable to Update User Details" });
//                     } else {

//                       var sql3 = "INSERT INTO transactions (user_id,invoice_id,amount,status,created_by,payment_type,payment_date,description,action) VALUES (?,?,?,1,?,?,?,'Invoice',1)";
//                       connection.query(sql3, [id, invoice_id, c_bal, created_by, "CASH", checkout_date], function (ins_err, ins_res) {
//                         if (ins_err) {
//                           response.status(201).json({ message: "Unable to Add Transactions Details", });
//                         } else {
//                         }
//                       })
//                     }
//                   })
//                 }

//                 var sql3 = "UPDATE hostel SET isActive=0,return_advance='" + advance_return + "',checkout_comment='" + comments + "' WHERE ID=" + id + ";UPDATE bed_details SET user_id=0,isfilled=0 WHERE id=" + bed_id + "";
//                 connection.query(sql3, function (err, up_res) {
//                   if (err) {
//                     return res.status(201).json({ statusCode: 201, message: "Unable to Checkout User Details", reason: err.message })
//                   } else {
//                     return res.status(200).json({ statusCode: 200, message: "Checkout Added Successfully!" })
//                   }
//                 })

//               } else {
//                 return res.status(201).json({ statusCode: 201, message: "" })
//               }
//             })

//           } else {
//             console.error("Error: Room rent is less than or equal to total balance due.");
//             return res.status(201).json({ statusCode: 201, message: "Room rent is less than to total balance due" })
//           }
//         });

//       }

//     } else {
//       return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
//     }
//   })

// }

function checkout_list(req, res) {

  var created_by = req.user_details.id;
  const today = new Date();
  const current_date = today.toISOString().slice(0, 10);

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  var show_ids = req.show_ids;

  var hostel_id = req.body.hostel_id;

  if (!hostel_id) {
    return res.status(201).json({ statusCode: 201, message: "Missing Hostel Details" })
  }


  if (is_admin == 1 || (role_permissions[6] && role_permissions[6].per_view == 1)) {

    // var sql1 = "SELECT Hostel_Id,  ID,HostelName,Name,checkout_comment,DATE_FORMAT(CheckoutDate, '%Y-%m-%d') AS CheckoutDate,DATEDIFF(checkoutDate, '" + current_date + "') AS notice_period FROM hostel WHERE checkoutDate >= '" + current_date + "' AND isActive = 1 AND created_by = ?";
    // var sql1 = "SELECT hs.Hostel_Id,hs.ID,hs.HostelName,hs.Name,hs.checkout_comment,DATE_FORMAT(hs.CheckoutDate, '%Y-%m-%d') AS CheckoutDate,hs.profile AS user_profile,DATEDIFF(checkoutDate, '" + current_date + "') AS notice_period,hos_de.profile FROM hostel AS hs JOIN hosteldetails AS hos_de ON hos_de.id=hs.Hostel_Id WHERE hs.checkoutDate >= '" + current_date + "' AND hs.isActive = 1 AND hs.created_by IN (?) ORDER BY hs.ID DESC";
    var sql1 = "SELECT hs.Hostel_Id,hs.ID,hs.HostelName,hs.Name,hs.checkout_comment,DATE_FORMAT(hs.CheckoutDate, '%Y-%m-%d') AS CheckoutDate,hs.profile AS user_profile,DATEDIFF(checkoutDate, '" + current_date + "') AS notice_period,hos_de.profile,hs.Floor,hs.Bed,DATE_FORMAT(hs.req_date, '%Y-%m-%d') AS req_date,hs.isActive,hs.Phone,hf.floor_name AS floor_name,hosroom.Room_Id AS room_name,bed.bed_no AS bed_name FROM hostel AS hs JOIN hosteldetails AS hos_de ON hos_de.id=hs.Hostel_Id LEFT JOIN Hostel_Floor AS hf ON hf.floor_id=hs.Floor AND hf.hostel_id=hs.Hostel_Id LEFT JOIN hostelrooms AS hosroom ON hosroom.id=hs.Rooms LEFT JOIN bed_details AS bed ON bed.id=hs.Bed WHERE hs.Hostel_Id =? AND hs.CheckoutDate IS NOT NULL ORDER BY hs.ID DESC;";
    connection.query(sql1, [hostel_id], function (err, ch_list) {
      if (err) {
        return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
      } else {
        return res.status(200).json({ statusCode: 200, message: "Check-Out Details!", checkout_details: ch_list })
      }
    })
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function delete_check_out(req, res) {

  var user_id = req.body.user_id;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (is_admin == 1 || (role_permissions[6] && role_permissions[6].per_delete == 1)) {

    if (!user_id) {
      return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var created_by = req.user_details.id;

    var sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1 AND created_by=?";
    connection.query(sql1, [user_id, created_by], function (err, sel_res) {
      if (err) {
        return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
      } else if (sel_res.length != 0) {

        var sql2 = "UPDATE hostel SET CheckoutDate=NULL,checkout_comment=NULL WHERE ID=?";
        connection.query(sql2, [user_id], function (err, up_res) {
          if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Delete Checkout" })
          } else {
            return res.status(200).json({ statusCode: 200, message: "Check-out deleted successfully!" })
          }
        })
      } else {
        return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
      }
    })
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function available_checkout_users(req, res) {

  var hostel_id = req.body.hostel_id;
  var created_by = req.user_details.id;
  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  var show_ids = req.show_ids;

  if (is_admin == 1 || (role_permissions[6] && role_permissions[6].per_view == 1)) {

    if (!hostel_id) {
      return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Details" })
    }
    var sql1 = "SELECT * FROM hostel WHERE Hostel_Id=? AND isActive=1 AND Floor != 'undefined' AND Rooms != 'undefined' AND Bed != 'undefined' AND created_by IN (?)";
    connection.query(sql1, [hostel_id, show_ids], function (err, data) {
      if (err) {
        return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
      } else {
        return res.status(200).json({ statusCode: 200, message: "All User Details", user_list: data })
      }
    })
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}

function available_beds(req, res) {

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

    var { hostel_id, floor_id, room_id, joining_date } = req.body;

    if (!hostel_id || !floor_id || !room_id || !joining_date) {
      return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Details" })
    }

    // var sql1 = "SELECT bd.*,hos.CheckoutDate FROM hostelrooms AS hs JOIN bed_details AS bd ON hs.id = bd.hos_detail_id LEFT JOIN hostel AS hos ON hos.id = bd.user_id AND hos.CheckoutDate <= ? WHERE bd.status = 1 AND bd.isbooked = 0 AND hs.isActive = 1 AND hs.Hostel_Id=? AND hs.Floor_Id=? AND hs.id=?";
    var sql1 = "SELECT bd.*FROM hostelrooms AS hs JOIN bed_details AS bd ON hs.id = bd.hos_detail_id LEFT JOIN hostel AS hos ON bd.isfilled = 1 AND hos.id = bd.user_id AND hos.CheckoutDate IS NOT NULL AND hos.CheckoutDate < ? WHERE bd.status = 1 AND bd.isbooked = 0 AND hs.isActive = 1 AND hs.Hostel_Id = ? AND hs.Floor_Id = ? AND hs.id = ? AND (bd.isfilled = 0 OR hos.CheckoutDate IS NOT NULL)"
    connection.query(sql1, [joining_date, hostel_id, floor_id, room_id], function (err, data) {
      if (err) {
        return res.status(201).json({ statusCode: 201, message: "Unable to get Bed Details" })
      } else {
        return res.status(200).json({ statusCode: 200, message: "Bed Details", bed_details: data })
      }
    })
  } else {
    res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
  }
}


module.exports = {
  getUsers,
  createUser,
  getPaymentDetails,
  CheckOutUser,
  transitionlist,
  customer_details,
  user_amenities_history,
  getAmnitiesName,
  aadhar_verify_otp,
  aadhaar_otp_verify,
  conutry_list,
  get_invoice_id,
  get_user_amounts,
  get_beduser_details,
  get_bill_details,
  add_walk_in_customer,
  get_walk_in_customer_list,
  delete_walk_in_customer,
  user_check_out,
  checkout_list,
  delete_check_out,
  available_checkout_users,
  available_beds,
  get_confirm_checkout
};
