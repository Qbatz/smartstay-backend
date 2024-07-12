const moment = require('moment');
const connection = require('./config/connection');
const addNotification = require('./components/add_notification');
const { dash } = require('pdfkit');
const bedDetails = require('./components/bed_details');




function getUsers(connection, response, request) {

    // Get values in middleware
    const userDetails = request.user_details;
    const query = `SELECT * FROM hosteldetails AS hstlDetails inner join hostel AS hstl on hstl.Hostel_Id=hstlDetails.id and hstl.isActive=true WHERE hstlDetails.created_By ='${userDetails.id}' ORDER BY hstl.ID desc`;
    connection.query(query, function (error, hostelData) {
        if (error) {
            console.error(error);
            response.status(403).json({ message: 'Error  hostel data' });
            return;
        } else if (hostelData.length != 0) {

            // Add Paid Rent Amounts
            for (let i = 0; i < hostelData.length; i++) {
                let temp = hostelData[i];

                temp['paid_rent'] = '';

                let sql1 = "SELECT COALESCE(SUM(amount), 0) AS paid_amount FROM transactions WHERE user_id = ? AND status=1 AND MONTH(createdAt) = MONTH(CURDATE()) AND YEAR(createdAt) = YEAR(CURDATE())";
                connection.query(sql1, [temp.ID], function (err, data) {
                    if (err) {
                        console.log(err);
                    } else {
                        temp['paid_rent'] = data[0].paid_amount;
                        hostelData[i] = temp;

                        if (i === hostelData.length - 1) {
                            response.status(200).json({ hostelData: hostelData });
                        }
                    }
                });
            }
        } else {
            response.status(200).json({ hostelData: hostelData });
        }
    });
}

function getKeyFromUrl(url) {
    const urlParts = url.split('/');
    const key = urlParts.slice(3).join('/'); // Get everything after the bucket name
    return key;
}

// Create User With Generate Invoices
function createUser(connection, request, response) {

    var atten = request.body;
    var profile = request.file;

    const FirstNameInitial = atten.firstname.charAt(0).toUpperCase();
    const LastNameInitial = atten.lastname.charAt(0).toUpperCase();
    const Circle = FirstNameInitial + LastNameInitial;
    const Status = atten.BalanceDue < 0 ? 'Pending' : 'Success';
    const Name = atten.firstname + ' ' + atten.lastname;

    const created_by = request.user_details.id;

    if (atten.ID) {

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

                if (profile) {
                    try {
                        const timestamp = Date.now();
                        profile_url = await uploadImage.uploadProfilePictureToS3Bucket('smartstaydevs', 'users/', 'profile' + unique_user_id + timestamp + '.jpg', profile);

                        if (old_profile != null || old_profile != undefined && old_profile != 0) {
                            const old_profile_key = getKeyFromUrl(old_profile);
                            var deleteResponse = await uploadImage.deleteImageFromS3Bucket('smartstaydevs', old_profile_key);
                            console.log("Image deleted successfully:", deleteResponse);
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

                var bed_details_obj = {
                    old_bed: old_bed,
                    old_room: old_room,
                    old_floor: old_floor,
                    old_hostel: old_hostel,
                    hostel_id: atten.hostel_Id,
                    floor_id: atten.Floor,
                    room: atten.Rooms,
                    bed: atten.Bed,
                }

                bedDetails.check_bed_details(bed_details_obj).then(() => {

                    connection.query(`UPDATE hostel SET Circle='${Circle}', Name='${Name}',Phone='${atten.Phone}', Email='${atten.Email}', Address='${atten.Address}', AadharNo='${atten.AadharNo}', PancardNo='${atten.PancardNo}',licence='${atten.licence}',HostelName='${atten.HostelName}',Hostel_Id='${atten.hostel_Id}', Floor='${atten.Floor}', Rooms='${atten.Rooms}', Bed='${atten.Bed}',profile='${profile_url}', AdvanceAmount='${atten.AdvanceAmount}', RoomRent='${atten.RoomRent}', BalanceDue='${atten.BalanceDue}', PaymentType='${atten.PaymentType}', Status='${Status}',paid_advance='${paid_advance}',pending_advance='${pending_advance}' WHERE ID='${atten.ID}'`, function (updateError, updateData) {
                        if (updateError) {
                            response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                        } else {

                            var update_complaice_query = "SELECT * FROM compliance WHERE User_id=?";
                            connection.query(update_complaice_query, [unique_user_id], function (up_com_err, up_com_res) {
                                if (up_com_err) {
                                    console.log(up_com_err);
                                    return
                                } else if (up_com_res.length != 0) {

                                    var up_query = "UPDATE compliance SET Circle='" + Circle + "',Name='" + Name + "',Phone='" + atten.Phone + "',Hostel_id='" + atten.hostel_Id + "',Floor_id='" + atten.Floor + "',Room='" + atten.Rooms + "',hostelname='" + atten.HostelName + "' WHERE User_id='" + unique_user_id + "';";
                                    connection.query(up_query, function (up_err, up_res) {
                                        if (up_err) {
                                            console.log(up_err);
                                        }
                                    })
                                }
                            })

                            // Check advance Rent
                            var sql1 = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND invoice_type=2";
                            connection.query(sql1, [atten.ID], function (inv_err, inv_data) {
                                if (inv_err) {
                                    console.log(`inv_errr`, inv_err);
                                    return
                                }

                                if (inv_data.length == 0) {

                                    insert_advance_invoice(connection, user_ids).then(() => {

                                        // Check and insert advance amount transactions
                                        if (paid_advance != undefined && paid_advance != 0) {

                                            var sql4 = "SELECT * FROM advance_amount_transactions WHERE user_id=? ORDER BY id ASC";
                                            connection.query(sql4, [user_ids], async function (ad_err, ad_res) {
                                                if (ad_err) {
                                                    console.log(ad_err);
                                                } else if (ad_res.length == 0) {
                                                    var sql_1 = "INSERT INTO advance_amount_transactions (user_id, inv_id, advance_amount, payment_status, created_by) VALUES (?, ?, ?, ?, ?)";
                                                    connection.query(sql_1, [user_ids, 0, paid_advance, 1, created_by], function (ins_err, ins_res) {
                                                        if (ins_err) {
                                                            console.log(ins_err);
                                                        }
                                                    });

                                                    var title = "Paid Advance Amount";
                                                    var user_type = 0;
                                                    var message = "Your Advance Amount " + paid_advance + " Received Successfully";

                                                    await addNotification.add_notification(user_ids, title, user_type, message)
                                                }
                                            });
                                        }

                                        checkAndInsertRentInvoice();
                                    }).catch(error => {
                                        console.error("Error inserting advance invoice:", error);
                                        response.status(205).json({ message: "Error processing Advance invoices", statusCode: 205 });
                                    });
                                } else {
                                    checkAndInsertRentInvoice();
                                }
                            })

                            // Function to continue with the Rent check/update
                            function checkAndInsertRentInvoice() {
                                // Check and update advance
                                var sqlAdvance = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND invoice_type=1";
                                connection.query(sqlAdvance, [atten.ID], function (rent_err, rent_res) {
                                    if (rent_err) {
                                        console.log(`Error checking advance:`, rent_err);
                                        response.status(205).json({ message: "Error processing Get Rent invoices", statusCode: 205 });
                                        return;
                                    }

                                    var total_rent = atten.RoomRent;
                                    var paid_amount = paid_rent != undefined ? paid_rent : 0;

                                    if (rent_res.length == 0) {
                                        // Insert rent invoice if not exists
                                        var currentDate = moment().format('YYYY-MM-DD');
                                        var joinDate = moment(currentDate).format('YYYY-MM-DD');

                                        var dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
                                        var invoiceDate = moment(joinDate).format('YYYY-MM-DD');

                                        var formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
                                        var formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
                                        var numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

                                        var totalDaysInCurrentMonth = moment(currentDate).daysInMonth();

                                        var oneday_amount = total_rent / totalDaysInCurrentMonth

                                        var payableamount = oneday_amount * numberOfDays
                                        var payable_rent = Math.round(payableamount);
                                        // console.log("payable_rent", payable_rent)
                                        var balance_rent = payable_rent - paid_amount;
                                        // console.log("balance_rent", balance_rent)

                                        insert_rent_invoice(connection, user_ids, paid_amount, balance_rent, payable_rent).then(() => {

                                            if (paid_rent != undefined && paid_rent != 0) {
                                                var sql2 = "SELECT * FROM transactions WHERE user_id=? AND invoice_id=0 AND MONTH(createdAt) = MONTH(CURDATE()) AND YEAR(createdAt) = YEAR(CURDATE())";
                                                connection.query(sql2, [user_ids], async function (trans_err, trans_res) {
                                                    if (trans_err) {
                                                        console.log(trans_err);
                                                    } else if (trans_res.length == 0) {
                                                        var sql_1 = "INSERT INTO transactions (user_id, invoice_id, amount, status, created_by) VALUES (?, ?, ?, ?, ?)";
                                                        connection.query(sql_1, [user_ids, 0, paid_rent, 1, created_by], function (ins_err, ins_res) {
                                                            if (ins_err) {
                                                                console.log(ins_err);
                                                            }
                                                        });

                                                        var title = "Paid Rent Amount";
                                                        var user_type = 0;
                                                        var message = "Your Rent Amount " + paid_rent + " Received Successfully";

                                                        await addNotification.add_notification(user_ids, title, user_type, message)
                                                    }
                                                });
                                            }

                                            response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                                        }).catch(error => {
                                            console.error("Error:", error);
                                            response.status(205).json({ message: "Error processing Rent invoices", statusCode: 205 });
                                        });
                                    } else {
                                        response.status(200).json({ message: "Update Successfully", statusCode: 200 });
                                    }
                                });
                            }
                        }
                    });
                })
                    .catch(error => {
                        console.log(error);
                        return response.status(205).json({ message: "Invalid Bed Details", statusCode: 205 });
                    });
            } else {
                response.status(202).json({ message: "Invalid User Id", statusCode: 202 });
            }
        })
    } else {
        connection.query(`SELECT * FROM hostel WHERE Phone='${atten.Phone}' AND isActive = 1`, function (error, data) {
            if (data.length > 0) {
                response.status(202).json({ message: "Phone Number Already Exists", statusCode: 202 });
            } else {
                // Need to Check for the Mail Exist Error
                connection.query(`SELECT * FROM hostel WHERE Email='${atten.Email}' AND isActive = 1`, async function (error, data) {
                    if (data.length > 0) {
                        response.status(203).json({ message: "Email Already Exists", statusCode: 203 });
                    } else {

                        // Check and Update Advance Amount and first month rent Amount;

                        var paid_advance = atten.paid_advance ? atten.paid_advance : 0;
                        var pending_advance = atten.AdvanceAmount - paid_advance;

                        connection.query(`INSERT INTO hostel (Circle, Name, Phone, Email, Address, AadharNo, PancardNo, licence,HostelName, Hostel_Id, Floor, Rooms, Bed, AdvanceAmount, RoomRent, BalanceDue, PaymentType, Status,paid_advance,pending_advance) VALUES ('${Circle}', '${Name}', '${atten.Phone}', '${atten.Email}', '${atten.Address}', '${atten.AadharNo}', '${atten.PancardNo}', '${atten.licence}','${atten.HostelName}' ,'${atten.hostel_Id}', '${atten.Floor}', '${atten.Rooms}', '${atten.Bed}', '${atten.AdvanceAmount}', '${atten.RoomRent}', '${atten.BalanceDue}', '${atten.PaymentType}', '${Status}','${paid_advance}','${pending_advance}')`, async function (insertError, insertData) {
                            if (insertError) {
                                console.log(insertError);
                                response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                            } else {

                                var user_ids = insertData.insertId;

                                const gen_user_id = generateUserId(atten.firstname, user_ids);

                                // Upload Profile Image to S3
                                if (profile) {
                                    try {
                                        const timestamp = Date.now();
                                        profile_url = await uploadImage.uploadProfilePictureToS3Bucket('smartstaydevs', 'users/', 'profile' + gen_user_id + `${timestamp}` + '.jpg', profile);
                                    } catch (err) {
                                        console.error(err);
                                        profile_url = 0;
                                    }
                                } else {
                                    profile_url = 0;
                                }

                                var update_user_id = "UPDATE hostel SET User_Id=?,profile=? WHERE ID=?";
                                connection.query(update_user_id, [gen_user_id, profile_url, user_ids], async function (up_id_err, up_id_res) {
                                    if (up_id_err) {
                                        response.status(201).json({ message: "Unable to add User Id", statusCode: 201 });
                                    } else {
                                        var paid_rent = atten.paid_rent;
                                        var paid_amount = paid_rent || 0; // Use logical OR to provide default value
                                        var total_rent = atten.RoomRent;

                                        if (atten.AdvanceAmount != undefined && atten.AdvanceAmount > 0) {

                                            if (paid_rent > 0) {

                                                var sqL_12 = "INSERT INTO transactions (user_id,invoice_id,amount,created_by,status) VALUES ('" + user_ids + "',0,'" + paid_rent + "','" + created_by + "',1)";
                                                connection.query(sqL_12, function (err, data) {
                                                    if (err) {
                                                        console.log(err);
                                                    } else {
                                                    }
                                                });

                                                var title = "Paid Rent Amount";
                                                var user_type = 0;
                                                var message = "Your Rent Amount " + paid_rent + " Received Successfully";

                                                await addNotification.add_notification(user_ids, title, user_type, message)
                                            }

                                            if (paid_advance > 0) {
                                                var sqL_12 = "INSERT INTO advance_amount_transactions (user_id,inv_id,advance_amount,created_by) VALUES ('" + user_ids + "',0,'" + atten.paid_advance + "','" + created_by + "')";
                                                connection.query(sqL_12, function (err, data) {
                                                    if (err) {
                                                        console.log(err);
                                                    }
                                                })

                                                var title = "Paid Advance Amount";
                                                var user_type = 0;
                                                var message = "Your Advance Amount " + paid_advance + " Received Successfully";

                                                await addNotification.add_notification(user_ids, title, user_type, message)
                                            }

                                            var currentDate = moment().format('YYYY-MM-DD');
                                            var joinDate = moment(currentDate).format('YYYY-MM-DD');
                                            var dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
                                            var invoiceDate = moment(joinDate).format('YYYY-MM-DD');
                                            var formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
                                            var formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
                                            var numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;
                                            var totalDaysInCurrentMonth = moment(currentDate).daysInMonth();
                                            var oneday_amount = total_rent / totalDaysInCurrentMonth;
                                            var payableamount = oneday_amount * numberOfDays;
                                            var payable_rent = Math.round(payableamount);
                                            var balance_rent = payable_rent - paid_amount;

                                            insert_rent_invoice(connection, user_ids, paid_amount, balance_rent, payable_rent).then(() => {
                                                return insert_advance_invoice(connection, user_ids);
                                            }).then(() => {
                                                response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                                            })
                                                .catch(error => {
                                                    console.error("Error:", error);
                                                    response.status(205).json({ message: "Error processing invoices", statusCode: 205 });
                                                });
                                        } else {
                                            response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                                        }
                                    }
                                })
                            }
                        });
                    }
                });
            }
        });
    }
}

function generateUserId(firstName, user_id) {
    const userIdPrefix = firstName.substring(0, 4).toUpperCase();
    const user_ids = user_id.toString().padStart(3, '0');
    const userId = userIdPrefix + user_ids;
    return userId;
}

// Insert Rent Amount
function insert_rent_invoice(connection, user_id, paid_amount, balance_rent, payable_rent) {

    return new Promise((resolve, reject) => {

        var sql1 = "SELECT rms.Price,rms.Hostel_Id AS roomHostel_Id,rms.Floor_Id AS roomFloor_Id,rms.Room_Id AS roomRoom_Id,dtls.id AS detHostel_Id,dtls.isHostelBased,dtls.prefix,dtls.suffix,dtls.Name,hstl.ID AS hos_user_id,hstl.User_Id,hstl.Address,hstl.Name AS UserName,hstl.Hostel_Id AS hosHostel_Id,hstl.Rooms AS hosRoom,hstl.Floor AS hosFloor,hstl.Bed,hstl.RoomRent,hstl.Name AS user_name,hstl.Phone,hstl.Email,hstl.Address,hstl.paid_advance,hstl.pending_advance,hstl.AdvanceAmount AS advance_amount, hstl.CheckoutDate,CASE WHEN dtls.isHostelBased = true THEN (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1)ELSE (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1)END AS ebBill,(SELECT eb.Floor FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebFloor, (SELECT eb.hostel_Id FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1 ) AS ebhostel_Id,(SELECT eb.Room FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebRoom,(SELECT eb.createAt FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1) AS createdAt,( SELECT invd.Invoices FROM invoicedetails invd WHERE invd.Invoices LIKE CONCAT(dtls.prefix, '%')ORDER BY CAST(SUBSTRING(invd.Invoices, LENGTH(dtls.prefix) + 1) AS UNSIGNED) DESC LIMIT 1) AS InvoiceDetails FROM hostel hstl INNER JOIN hosteldetails dtls ON dtls.id = hstl.Hostel_Id INNER JOIN hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id AND rms.Floor_Id = hstl.Floor AND rms.Room_Id = hstl.Rooms WHERE hstl.isActive = true AND hstl.id =?;";
        connection.query(sql1, [user_id], function (sel_err, sel_res) {
            if (sel_err) {
                console.log("Unable to get User Details")
                reject(sel_err);
            } else if (sel_res.length != 0) {

                var inv_data = sel_res[0];

                var currentDate = moment().format('YYYY-MM-DD');

                var dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');

                if (inv_data.prefix && inv_data.suffix) {
                    let numericSuffix;
                    if (inv_data.InvoiceDetails != null) {
                        numericSuffix = parseInt(inv_data.InvoiceDetails.substring(inv_data.prefix.length)) || 0;
                        numericSuffix++;
                    } else {
                        numericSuffix = inv_data.suffix;
                    }
                    invoiceNo = inv_data.prefix + numericSuffix;
                } else {
                    const userID = inv_data.User_Id.toString().slice(0, 4);
                    const month = moment(new Date()).month() + 1;
                    const year = moment(new Date()).year();
                    invoiceNo = 'INVC' + month + year + userID;
                }

                // console.log(`invoiceNo`, invoiceNo);

                if (payable_rent == paid_amount) {
                    var status = "Success";
                } else {
                    var status = "Pending";
                }

                var sql2 = "INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based, Bed,BalanceDue,PaidAmount,numberofdays,hos_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,?)"
                connection.query(sql2, [inv_data.user_name, inv_data.Phone, inv_data.Email, inv_data.Name, inv_data.detHostel_Id, inv_data.hosFloor, inv_data.hosRoom, payable_rent, inv_data.Address, currentDate, dueDate, invoiceNo, status, inv_data.User_Id, payable_rent, 0, 0, 0, 0, 0, inv_data.Bed, balance_rent, paid_amount, inv_data.hos_user_id], function (ins_err, ins_res) {
                    if (ins_err) {
                        console.log('Insert Error', ins_err);
                        reject(ins_err);
                    } else {
                        console.log('Insert Successfully');
                        resolve();
                    }
                })
            } else {
                console.log("Invalid User Details");
                reject("Invalid User Details");
            }
        })
    })
}

// Insert Advance Amount
function insert_advance_invoice(connection, user_id) {

    return new Promise((resolve, reject) => {
        var sql1 = "SELECT rms.Price,rms.Hostel_Id AS roomHostel_Id,rms.Floor_Id AS roomFloor_Id,rms.Room_Id AS roomRoom_Id,dtls.id AS detHostel_Id,dtls.isHostelBased,dtls.prefix,dtls.suffix,dtls.Name,hstl.ID AS hos_user_id,hstl.User_Id,hstl.Address,hstl.Name AS UserName,hstl.Hostel_Id AS hosHostel_Id,hstl.Rooms AS hosRoom,hstl.Floor AS hosFloor,hstl.Bed,hstl.RoomRent,hstl.Name AS user_name,hstl.Phone,hstl.Email,hstl.Address,hstl.paid_advance,hstl.pending_advance,hstl.AdvanceAmount AS advance_amount, hstl.CheckoutDate,CASE WHEN dtls.isHostelBased = true THEN (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1)ELSE (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1)END AS ebBill,(SELECT eb.Floor FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebFloor, (SELECT eb.hostel_Id FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1 ) AS ebhostel_Id,(SELECT eb.Room FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebRoom,(SELECT eb.createAt FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1) AS createdAt,( SELECT invd.Invoices FROM invoicedetails invd WHERE invd.Invoices LIKE CONCAT(dtls.prefix, '%')ORDER BY CAST(SUBSTRING(invd.Invoices, LENGTH(dtls.prefix) + 1) AS UNSIGNED) DESC LIMIT 1) AS InvoiceDetails FROM hostel hstl INNER JOIN hosteldetails dtls ON dtls.id = hstl.Hostel_Id INNER JOIN hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id AND rms.Floor_Id = hstl.Floor AND rms.Room_Id = hstl.Rooms WHERE hstl.isActive = true AND hstl.id =?;";
        connection.query(sql1, [user_id], function (sel_err, sel_res) {
            if (sel_err) {
                console.log("Unable to get User Details");
                reject(sel_err);
            } else if (sel_res.length != 0) {

                var inv_data = sel_res[0];

                var currentDate = moment().format('YYYY-MM-DD');
                var dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');

                if (inv_data.prefix && inv_data.suffix) {
                    let numericSuffix;
                    if (inv_data.InvoiceDetails != null) {
                        numericSuffix = parseInt(inv_data.InvoiceDetails.substring(inv_data.prefix.length)) || 0;
                        numericSuffix++;
                    } else {
                        numericSuffix = inv_data.suffix;
                    }
                    invoiceNo = inv_data.prefix + numericSuffix;
                } else {
                    const userID = inv_data.User_Id.toString().slice(0, 4);
                    const month = moment(new Date()).month() + 1;
                    const year = moment(new Date()).year();
                    invoiceNo = 'AD_INVC' + month + year + userID;
                }

                // console.log(`invoiceNo`, invoiceNo);

                if (inv_data.advance_amount == inv_data.paid_advance) {
                    var status = "Success";
                } else {
                    var status = "Pending";
                }

                var pending_advance = inv_data.advance_amount - inv_data.paid_advance;

                var sql2 = "INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based, Bed,BalanceDue,PaidAmount,numberofdays,invoice_type,hos_user_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,2,?)"
                connection.query(sql2, [inv_data.user_name, inv_data.Phone, inv_data.Email, inv_data.Name, inv_data.detHostel_Id, inv_data.hosFloor, inv_data.hosRoom, inv_data.advance_amount, inv_data.Address, currentDate, dueDate, invoiceNo, status, inv_data.User_Id, 0, 0, 0, 0, 0, 0, inv_data.Bed, pending_advance, inv_data.paid_advance, inv_data.hos_user_id], function (ins_err, ins_res) {
                    if (ins_err) {
                        console.log('Insert Error', ins_err);
                        reject(ins_err);
                    } else {
                        console.log('Insert Successfully');
                        resolve()
                    }
                })
            } else {
                console.log("Invalid Advance User Details");
                reject("Invalid User Advance Details");
            }
        })
    })
}


function getPaymentDetails(connection, response) {
    connection.query(`SELECT hos.Name ,hos.Phone,hos.Email,hos.Address,hos.AdvanceAmount,hos.BalanceDue,hos.Status,hos.createdAt,inv.Name as invoiceName, inv.phoneNo as invoicePhone ,inv.Date as invDate, inv.Amount as invAmount ,inv.Status as invStatus, inv.Invoices as InvoiceNo FROM hostel hos INNER JOIN invoicedetails inv on inv.phoneNo= hos.Phone`, function (error, data) {
        // console.log(error);
        if (error) {
            response.status(201).json({ message: 'No Data Found', statusCode: 201 })
        }
        else {
            response.status(200).json({ data: data })
        }
    })
}


function CheckOutUser(connection, response, attenData) {
    // console.log("attenData", attenData)
    if (attenData) {

        const query = `UPDATE hostel SET CheckoutDate= '${attenData.CheckOutDate}' , isActive ='${attenData.isActive}' WHERE User_Id='${attenData.User_Id}'`

        // console.log("query", query)
        connection.query(query, function (error, UpdateData) {
            // console.log("updateData", UpdateData)
            if (error) {
                response.status(201).json({ message: 'No Data Found' })
            } else {
                response.status(200).json({ message: "Update Successfully" });
            }
        })

    } else {
        response.status(201).json({ message: 'missing parameter' })
    }
}

function transitionlist(connection, request, response) {

    var { id, invoice_id, amount, balance_due, invoice_type } = request.body;

    var userDetails = request.user_details;
    var created_by = userDetails.id;

    if (!invoice_type || invoice_type == undefined) {
        var invoice_type = 1;
    }

    if (invoice_type == 1) {

        if ((!amount && amount == undefined) && (!balance_due || balance_due == undefined)) {
            response.status(203).json({ message: "Missing Required Fields" });
        } else {

            var sql1 = "SELECT * FROM invoicedetails WHERE id='" + id + "';";
            connection.query(sql1, function (check_err, check_res) {
                if (check_err) {
                    response.status(201).json({ message: 'Unable to Get User Details' });
                } else if (check_res.length != 0) {

                    var new_user_id = check_res[0].User_Id;

                    var sql3 = "SELECT * FROM hostel WHERE User_Id=?";
                    connection.query(sql3, new_user_id, function (sel1_err, sel1_res) {
                        if (sel1_err) {
                            response.status(201).json({ message: 'Unable to Get User Details' });
                        } else if (sel1_res.length != 0) {

                            var user_id = sel1_res[0].ID;

                            var already_paid_amount = check_res[0].PaidAmount;

                            var new_amount = already_paid_amount + amount;



                            if (new_amount == already_paid_amount) {
                                var Status = 'Success';
                            } else {
                                var Status = 'Pending';
                            }

                            var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=?,Status=? WHERE id=?";
                            connection.query(sql2, [balance_due, new_amount, Status, id], function (up_err, up_res) {
                                if (up_err) {
                                    response.status(201).json({ message: 'Unable to Update User Details' });
                                } else {

                                    var sql3 = "INSERT INTO transactions (user_id,invoice_id,amount,status,created_by) VALUES (?,?,?,1,?)";
                                    connection.query(sql3, [user_id, invoice_id, amount, created_by], function (ins_err, ins_res) {
                                        if (ins_err) {
                                            response.status(201).json({ message: 'Unable to Add Transactions Details' });
                                        } else {
                                            response.status(200).json({ message: "Update Successfully" });
                                        }
                                    })

                                }
                            })
                        }
                        else {
                            response.status(201).json({ message: 'Invalid User Id' });
                        }
                    })
                } else {
                    response.status(201).json({ message: 'Invalid User Id' });
                }
            })
        }
    } else {
        if (!amount && amount == undefined) {
            response.status(203).json({ message: "Missing Required Field" });
        } else {

            var sql1 = "SELECT * FROM invoicedetails WHERE id='" + id + "';";
            connection.query(sql1, function (check_err, check_res) {
                if (check_err) {
                    response.status(201).json({ message: 'Unable to Get User Details' });
                } else if (check_res.length != 0) {

                    var new_user_id = check_res[0].User_Id;

                    var sql3 = "SELECT * FROM hostel WHERE User_Id=?";
                    connection.query(sql3, new_user_id, function (sel1_err, sel1_res) {
                        if (sel1_err) {
                            response.status(201).json({ message: 'Unable to Get User Details' });
                        } else if (sel1_res.length != 0) {

                            var ID = sel1_res[0].ID;

                            var total_advance = sel1_res[0].AdvanceAmount;

                            var already_paid_amount = sel1_res[0].paid_advance;
                            var new_amount = already_paid_amount + amount;

                            if (new_amount > total_advance) {
                                response.status(201).json({ message: "Pay Amount More than Advance Amount, Kindly Check Advance Amount" })
                            } else {

                                if (new_amount == total_advance) {
                                    var Status = 'Success';
                                } else {
                                    var Status = 'Pending';
                                }

                                var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=?,Status=? WHERE id=?";
                                connection.query(sql2, [balance_due, new_amount, Status, id], function (up_err, up_res) {
                                    if (up_err) {
                                        response.status(201).json({ message: 'Unable to Update User Details' });
                                    } else {

                                        var sql4 = "UPDATE hostel SET paid_advance=?,pending_advance=? WHERE ID=?";
                                        connection.query(sql4, [new_amount, balance_due, ID], function (up_err1, up_res1) {
                                            if (up_err) {
                                                response.status(201).json({ message: 'Unable to Update Payemnt Details' });
                                            } else {

                                                var sql3 = "INSERT INTO advance_amount_transactions (user_id,inv_id,advance_amount,payment_status,user_status,created_by) VALUES (?,?,?,1,1,?)";
                                                connection.query(sql3, [ID, invoice_id, amount, created_by], function (ins_err, ins_res) {
                                                    if (ins_err) {
                                                        response.status(201).json({ message: 'Unable to Add Transactions Details' });
                                                    } else {
                                                        response.status(200).json({ message: "Update Successfully" });
                                                    }
                                                })
                                            }
                                        })
                                    }
                                })
                            }
                        } else {
                            response.status(201).json({ message: 'Invalid User Id' });
                        }
                    })

                } else {
                    response.status(201).json({ message: 'Invalid User Id' });
                }
            })
        }
    }
}

// Get Customer Details

function customer_details(req, res) {

    var user_id = req.body.user_id;

    var created_by = req.user_details.id;

    if (!user_id || user_id == undefined) {
        return res.status(201).json({ message: "Missing User Details", statusCode: 201 })
    }

    // Check User Id valid or Invalid
    var sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
    connection.query(sql1, [user_id], (user_err, user_data) => {
        if (user_err) {
            return res.status(201).json({ message: "Unable to Get User Details", statusCode: 201 })
        } else if (user_data.length != 0) {

            var temp = user_data[0];

            var hostel_id = user_data[0].Hostel_Id;

            var amenn_user_id = user_data[0].User_Id;
            // All Amenties
            // var sql2 = "SELECT amname.Amnities_Name AS Amnities_Name FROM AmenitiesHistory AS amhis JOIN AmnitiesName AS amname ON amname.id = amhis.amenity_Id WHERE amhis.status = 1 AND amhis.user_id = '" + amenn_user_id + "' UNION SELECT amname.Amnities_Name AS Amnities_Name FROM Amenities AS amen JOIN AmnitiesName AS amname ON amname.id = amen.Amnities_Id WHERE amen.setAsDefault = 1 GROUP BY Amnities_Name";
            var sql2 = "SELECT amname.Amnities_Name AS Amnities_Name,amen.setAsDefault AS free_amenity FROM AmenitiesHistory AS amhis JOIN AmnitiesName AS amname ON amname.id = amhis.amenity_Id JOIN Amenities AS amen ON amen.id=amhis.amenity_Id WHERE amhis.status = 1 AND amhis.user_id = '" + amenn_user_id + "' AND amen.createdBy='" + created_by + "' UNION SELECT amname.Amnities_Name AS Amnities_Name,amen.setAsDefault AS free_amenity FROM Amenities AS amen JOIN AmnitiesName AS amname ON amname.id = amen.Amnities_Id WHERE amen.setAsDefault = 1 AND amen.createdBy='" + created_by + "' GROUP BY Amnities_Name";
            connection.query(sql2, (am_err, am_data) => {
                if (am_err) {
                    // console.log(am_err);
                    temp['amentites'] = 0;
                } else {
                    temp['amentites'] = am_data;
                    user_data[0] = temp;
                }
                // Get Eb Details
                var sql3 = "SELECT inv.Name,inv.Hostel_Id,inv.Floor_Id,inv.Room_No,inv.EbAmount,eb.start_Meter_Reading,eb.end_Meter_Reading,eb.Eb_Unit,eb.EbAmount AS total_ebamount,inv.Date, CASE WHEN inv.Hostel_Based != 0 THEN inv.Hostel_Based ELSE inv.Room_Based END AS pay_eb_amount FROM invoicedetails AS inv INNER JOIN EbAmount AS eb ON inv.Hostel_Id = eb.Hostel_Id INNER JOIN (SELECT Hostel_Id,MAX(createAt) as latestCreateAt FROM EbAmount GROUP BY Hostel_Id ) as latestEb ON eb.Hostel_Id = latestEb.Hostel_Id AND eb.createAt = latestEb.latestCreateAt WHERE inv.User_Id=? AND inv.invoice_type=1 ORDER BY inv.id DESC"
                connection.query(sql3, [amenn_user_id], (eb_err, eb_data) => {
                    if (eb_err) {
                        return res.status(201).json({ message: "Unable to Eb Details", statusCode: 201 })
                    } else {

                        // Get Invoice Details
                        var sql4 = "SELECT * FROM invoicedetails WHERE User_id=? ORDER BY id DESC";
                        connection.query(sql4, [amenn_user_id], (inv_err, inv_res) => {
                            if (inv_err) {
                                return res.status(201).json({ message: "Unable to  Get Invoice Details", statusCode: 201 })
                            } else {

                                // Get Transactions Details
                                var sql5 = "SELECT 'advance' AS type, id, user_id, advance_amount AS amount,payment_status AS status, createdAt AS created_at FROM advance_amount_transactions WHERE user_id =? UNION ALL SELECT 'rent' AS type, id, user_id, amount,status, createdAt AS created_at FROM transactions WHERE user_id =? ORDER BY created_at DESC";
                                connection.query(sql5, [user_id, user_id], (trans_err, trans_res) => {
                                    if (trans_err) {
                                        return res.status(201).json({ message: "Unable to Get Transactions Details", statusCode: 201 })
                                    } else {

                                        // Get Hostel Amenities
                                        var sql6 = "SELECT * FROM Amenities AS am JOIN AmnitiesName AS amname ON amname.id=am.Amnities_Id WHERE am.Hostel_Id=? AND createdBy='" + created_by + "' AND setAsDefault=0;";
                                        connection.query(sql6, [hostel_id], (am_err, am_res) => {
                                            if (am_err) {
                                                console.log(am_err);
                                                return res.status(201).json({ message: "Unable to Get All Amenities", statusCode: 201 })
                                            } else {
                                                res.status(200).json({ statusCode: 200, message: "View Customer Details", data: user_data, eb_data: eb_data, invoice_details: inv_res, transactions: trans_res, all_amenities: am_res })
                                            }
                                        })
                                    }
                                })
                            }
                        })
                    }
                })
            })
        } else {
            return res.status(201).json({ message: "Invalid or Inactive User", statusCode: 201 })
        }
    })
}


// function user_amenities_history(req, res) {

//     var created_by = req.body.id;

//     var user_id = req.body.user_id;
//     var amenities_id = req.body.amenities_id || [];

//     var sql1 = "SELECT * FROM hostel WHERE ID=?";
//     connection.query(sql1, [user_id], (sel_err, sel_res) => {
//         if (sel_err) {
//             return res.status(500).json({ message: "Database query error", error: sel_err });
//         } else if (sel_res.length != 0) {
//             var user_ids = sel_res[0].User_Id;

//             var sql = `
//                 SELECT 
//                     amen.id, 
//                     amen.user_Id, 
//                     amen.amenity_Id, 
//                     hostel.Hostel_Id,
//                     amen.status, 
//                     amen.created_At, 
//                     amname.Amnities_Name, 
//                     am.Amount 
//                 FROM 
//                     AmenitiesHistory AS amen 
//                 JOIN 
//                     hostel ON hostel.User_Id = amen.user_Id  
//                 JOIN 
//                     Amenities AS am ON am.Amnities_Id = amen.amenity_Id 
//                 JOIN 
//                     AmnitiesName AS amname ON am.Amnities_Id = amname.id 
//                 WHERE 
//                     amen.user_Id = '${user_ids}' AND am.Status=1
//             `;

//             if (amenities_id.length > 0) {
//                 sql += ` AND amen.amenity_Id IN (${amenities_id.join(',')})`;
//             }

//             sql += ` ORDER BY amen.created_At ASC`; // Ensure records are ordered by created_At

//             connection.query(sql, (am_err, am_data) => {
//                 if (am_err) {
//                     return res.status(201).json({ message: "Unable to fetch amenity details", error: am_err });
//                 } else {
//                     const result = [];
//                     const lastStatusMap = {};
//                     const monthNames = [
//                         null,
//                         'January', 'February', 'March', 'April', 'May', 'June',
//                         'July', 'August', 'September', 'October', 'November', 'December'
//                     ];

//                     // Get the current month and year dynamically
//                     const currentDate = new Date();
//                     const currentMonth = currentDate.getMonth() + 1; // Get current month (1-12)
//                     const currentYear = currentDate.getFullYear();

//                     // Process each record from the database query
//                     am_data.forEach(record => {
//                         const status = record.status;
//                         const createdAt = new Date(record.created_At);
//                         const amenityId = record.amenity_Id;
//                         const startMonth = createdAt.getMonth() + 1; // Get month from createdAt
//                         const startYear = createdAt.getFullYear();

//                         // If there are gaps before the current record, fill them
//                         if (lastStatusMap[amenityId] !== undefined) {
//                             const lastRecordDate = new Date(lastStatusMap[amenityId].created_At);
//                             const lastMonth = lastRecordDate.getMonth() + 1;
//                             const lastYear = lastRecordDate.getFullYear();

//                             for (let year = lastYear; year <= startYear; year++) {
//                                 const start = year === lastYear ? lastMonth + 1 : 1;
//                                 const end = year === startYear ? startMonth : 12;

//                                 for (let month = start; month < end; month++) {
//                                     if (year > currentYear || (year === currentYear && month > currentMonth)) {
//                                         break;
//                                     }
//                                     result.push({
//                                         id: null,
//                                         user_Id: record.user_Id,
//                                         amenity_Id: amenityId,
//                                         hostel_Id: record.hostel_Id,
//                                         created_At: `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`,
//                                         Amnities_Name: record.Amnities_Name,
//                                         Amount: record.Amount,
//                                         status: lastStatusMap[amenityId].status,
//                                         month_name: monthNames[month]
//                                     });
//                                 }
//                             }
//                         }

//                         // Add the current record
//                         if (startYear < currentYear || (startYear === currentYear && startMonth <= currentMonth)) {
//                             result.push({
//                                 id: record.id,
//                                 user_Id: record.user_Id,
//                                 amenity_Id: record.amenity_Id,
//                                 hostel_Id: record.hostel_Id,
//                                 created_At: record.created_At,
//                                 Amnities_Name: record.Amnities_Name,
//                                 Amount: record.Amount,
//                                 status: record.status,
//                                 month_name: monthNames[startMonth]
//                             });
//                         }

//                         // Update the last known status
//                         lastStatusMap[amenityId] = { Amnities_Name: record.Amnities_Name, Amount: record.Amount, status: record.status, created_At: record.created_At };
//                     });

//                     console.log(lastStatusMap);

//                     // Fill missing months after the last record for each amenity
//                     Object.keys(lastStatusMap).forEach(amenityId => {
//                         const lastRecordDate = new Date(lastStatusMap[amenityId].created_At);
//                         const lastMonth = lastRecordDate.getMonth() + 1;
//                         const lastYear = lastRecordDate.getFullYear();

//                         for (let year = lastYear; year <= currentYear; year++) {
//                             const start = year === lastYear ? lastMonth + 1 : 1;
//                             const end = year === currentYear ? currentMonth : 12;

//                             for (let month = start; month <= end; month++) {
//                                 if (year > currentYear || (year === currentYear && month > currentMonth)) {
//                                     break;
//                                 }
//                                 result.push({
//                                     id: null,
//                                     user_Id: sel_res[0].User_Id,
//                                     amenity_Id: amenityId,
//                                     hostel_Id: sel_res[0].ID,
//                                     created_At: `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`,
//                                     Amnities_Name: lastStatusMap[amenityId].Amnities_Name,
//                                     Amount: lastStatusMap[amenityId].Amount,
//                                     status: lastStatusMap[amenityId].status,
//                                     month_name: monthNames[month]
//                                 });
//                             }
//                         }
//                     });

//                     // Sort the result by created_At
//                     result.sort((a, b) => new Date(a.created_At) - new Date(b.created_At));

//                     return res.status(200).json({ statusCode: 200, message: "Amenity Details", data: result });
//                 }
//             });
//         } else {
//             return res.status(200).json({ message: "Invalid User Details", statusCode: 201 });
//         }
//     });
// }

function user_amenities_history(req, res) {

    var user_id = req.body.user_id;
    var amenities_id = req.body.amenities_id || [];

    var sql1 = "SELECT * FROM hostel WHERE ID=?";
    connection.query(sql1, [user_id], (sel_err, sel_res) => {
        if (sel_err) {
            return res.status(500).json({ message: "Database query error", error: sel_err });
        } else if (sel_res.length != 0) {
            var user_ids = sel_res[0].User_Id;

            var sql = `
                SELECT 
                    amen.id, 
                    amen.user_Id, 
                    amen.amenity_Id, 
                    hostel.Hostel_Id,
                    amen.status, 
                    amen.created_At, 
                    amname.Amnities_Name, 
                    am.Amount 
                FROM 
                    AmenitiesHistory AS amen 
                JOIN 
                    hostel ON hostel.User_Id = amen.user_Id  
                JOIN 
                    Amenities AS am ON am.Amnities_Id = amen.amenity_Id 
                JOIN 
                    AmnitiesName AS amname ON am.Amnities_Id = amname.id 
                WHERE 
                    amen.user_Id = '${user_ids}' AND am.Status=1
            `;

            if (amenities_id.length > 0) {
                sql += ` AND amen.amenity_Id IN (${amenities_id.join(',')})`;
            }

            sql += ` ORDER BY amen.created_At ASC`; // Ensure records are ordered by created_At

            connection.query(sql, (am_err, am_data) => {
                if (am_err) {
                    return res.status(201).json({ message: "Unable to fetch amenity details", error: am_err });
                } else {
                    const result = [];
                    const lastStatusMap = {};
                    const monthNames = [
                        null,
                        'January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'
                    ];

                    // Get the current month and year dynamically
                    const currentDate = new Date();
                    const currentMonth = currentDate.getMonth() + 1; // Get current month (1-12)
                    const currentYear = currentDate.getFullYear();

                    // Use a Set to keep track of unique records
                    const seenRecords = new Set();

                    // Process each record from the database query
                    am_data.forEach(record => {
                        const status = record.status;
                        const createdAt = new Date(record.created_At);
                        const amenityId = record.amenity_Id;
                        const startMonth = createdAt.getMonth() + 1; // Get month from createdAt
                        const startYear = createdAt.getFullYear();
                        const uniqueKey = `${record.user_Id}-${amenityId}-${startYear}-${startMonth}`;

                        // If there are gaps before the current record, fill them
                        if (lastStatusMap[amenityId] !== undefined) {
                            const lastRecordDate = new Date(lastStatusMap[amenityId].created_At);
                            const lastMonth = lastRecordDate.getMonth() + 1;
                            const lastYear = lastRecordDate.getFullYear();

                            for (let year = lastYear; year <= startYear; year++) {
                                const start = year === lastYear ? lastMonth + 1 : 1;
                                const end = year === startYear ? startMonth : 12;

                                for (let month = start; month < end; month++) {
                                    if (year > currentYear || (year === currentYear && month > currentMonth)) {
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
                                            created_At: `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`,
                                            Amnities_Name: record.Amnities_Name,
                                            Amount: record.Amount,
                                            status: lastStatusMap[amenityId].status,
                                            month_name: monthNames[month]
                                        });
                                    }
                                }
                            }
                        }

                        // Add the current record
                        if ((startYear < currentYear || (startYear === currentYear && startMonth <= currentMonth)) && !seenRecords.has(uniqueKey)) {
                            seenRecords.add(uniqueKey);
                            result.push({
                                id: record.id,
                                user_Id: record.user_Id,
                                amenity_Id: record.amenity_Id,
                                hostel_Id: record.hostel_Id,
                                created_At: record.created_At,
                                Amnities_Name: record.Amnities_Name,
                                Amount: record.Amount,
                                status: record.status,
                                month_name: monthNames[startMonth]
                            });
                        }

                        // Update the last known status
                        lastStatusMap[amenityId] = { Amnities_Name: record.Amnities_Name, Amount: record.Amount, status: record.status, created_At: record.created_At };
                    });

                    console.log(lastStatusMap);

                    // Fill missing months after the last record for each amenity
                    Object.keys(lastStatusMap).forEach(amenityId => {
                        const lastRecordDate = new Date(lastStatusMap[amenityId].created_At);
                        const lastMonth = lastRecordDate.getMonth() + 1;
                        const lastYear = lastRecordDate.getFullYear();

                        for (let year = lastYear; year <= currentYear; year++) {
                            const start = year === lastYear ? lastMonth + 1 : 1;
                            const end = year === currentYear ? currentMonth : 12;

                            for (let month = start; month <= end; month++) {
                                if (year > currentYear || (year === currentYear && month > currentMonth)) {
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
                                        created_At: `${year}-${String(month).padStart(2, '0')}-01T00:00:00.000Z`,
                                        Amnities_Name: lastStatusMap[amenityId].Amnities_Name,
                                        Amount: lastStatusMap[amenityId].Amount,
                                        status: lastStatusMap[amenityId].status,
                                        month_name: monthNames[month]
                                    });
                                }
                            }
                        }
                    });

                    // Sort the result by created_At
                    result.sort((a, b) => new Date(a.created_At) - new Date(b.created_At));

                    return res.status(200).json({ statusCode: 200, message: "Amenity Details", data: result });
                }
            });
        } else {
            return res.status(200).json({ message: "Invalid User Details", statusCode: 201 });
        }
    });
}



function getAmnitiesName(connection, response) {
    connection.query('select * from AmnitiesName', function (error, data) {
        if (error) {
            response.status(203).json({ message: 'not connected' })
        }
        else {
            response.status(200).json({ data: data })
        }
    })
}



module.exports = { getUsers, createUser, getPaymentDetails, CheckOutUser, transitionlist, customer_details, user_amenities_history, getAmnitiesName }