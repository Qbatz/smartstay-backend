const moment = require('moment')
function getUsers(connection, response, request) {
    // Get values in middleware
    const userDetails = request.user_details;
    const query = `SELECT * FROM hosteldetails hstlDetails inner join hostel hstl on hstl.Hostel_Id=hstlDetails.id and hstl.isActive=true WHERE hstlDetails.created_By ='${userDetails.id}'`;
    connection.query(query, function (error, hostelData) {
        if (error) {
            console.error(error);
            response.status(403).json({ message: 'Error  hostel data' });
            return;
        } else {
            response.status(200).json({ hostelData: hostelData });
        }

    });
}


function createUser(connection, atten, response) {

    const FirstNameInitial = atten.firstname.charAt(0).toUpperCase();
    const LastNameInitial = atten.lastname.charAt(0).toUpperCase();
    const Circle = FirstNameInitial + LastNameInitial;
    const Status = atten.BalanceDue < 0 ? 'Pending' : 'Success';
    const Name = atten.firstname + ' ' + atten.lastname;

    if (atten.ID) {

        var select_query = "SELECT * FROM hostel WHERE ID='" + atten.ID + "';";
        connection.query(select_query, function (sel_err, sel_res) {
            if (sel_err) {
                response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
            } else if (sel_res.length != 0) {

                var user_ids = atten.ID;
                var paid_rent = atten.paid_rent;

                var already_paid_amount = sel_res[0].paid_advance;

                // console.log(already_paid_amount);

                if (!atten.paid_advance || atten.paid_advance == undefined) {
                    var paid_advance1 = 0;
                } else {
                    var paid_advance1 = atten.paid_advance;
                }

                var paid_advance = already_paid_amount + paid_advance1;
                var pending_advance = atten.AdvanceAmount - paid_advance;

                connection.query(`UPDATE hostel SET Circle='${Circle}', Name='${Name}',Phone='${atten.Phone}', Email='${atten.Email}', Address='${atten.Address}', AadharNo='${atten.AadharNo}', PancardNo='${atten.PancardNo}',licence='${atten.licence}',HostelName='${atten.HostelName}',Hostel_Id='${atten.hostel_Id}', Floor='${atten.Floor}', Rooms='${atten.Rooms}', Bed='${atten.Bed}', AdvanceAmount='${atten.AdvanceAmount}', RoomRent='${atten.RoomRent}', BalanceDue='${atten.BalanceDue}', PaymentType='${atten.PaymentType}', Status='${Status}',paid_advance='${paid_advance}',pending_advance='${pending_advance}' WHERE ID='${atten.ID}'`, function (updateError, updateData) {
                    if (updateError) {
                        response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                    } else {

                        if (paid_rent != undefined && paid_rent != 0) {

                            var sql_1 = "INSERT INTO transactions (user_id,invoice_id,amount,status) VALUES(?,?,?,?);";
                            connection.query(sql_1, [user_ids, 0, paid_rent, 1], function (ins_err, ins_res) {
                                if (ins_err) {
                                    console.log(ins_err, ins_err);
                                }
                            })
                        }

                        var total_rent = atten.RoomRent;

                        if (paid_rent == undefined) {
                            var paid_amount = 0;
                        } else {
                            var paid_amount = paid_rent;
                        }

                        var balance_rent = total_rent - paid_amount;

                        insert_rent_invoice(connection, user_ids, paid_amount, balance_rent);

                        response.status(200).json({ message: "Update Successfully", statusCode: 200 });
                    }
                });
            } else {
                response.status(202).json({ message: "Invalid User Id", statusCode: 202 });
            }
        })
    } else {
        function generateUserId(firstName) {
            const userIdPrefix = firstName.substring(0, 4).toUpperCase();
            const randomNum = Math.floor(100 + Math.random() * 900);
            const userId = userIdPrefix + randomNum;
            return userId;
        }
        const User_Id = generateUserId(atten.firstname);
        console.log(" User_Id", User_Id)
        let userID;
        connection.query(`SELECT * FROM hostel WHERE User_Id='${User_Id}'`, function (error, data) {
            if (data.length > 0) {
                userID = generateUserId(firstName)
            }
            else {
                userID = User_Id
            }
            connection.query(`SELECT * FROM hostel WHERE Phone='${atten.Phone}'`, function (error, data) {
                if (data.length > 0) {
                    response.status(202).json({ message: "Phone Number Already Exists", statusCode: 202 });
                } else {
                    connection.query(`SELECT * FROM hostel WHERE Email='${atten.Email}'`, function (error, data) {
                        if (data.length > 0) {
                            response.status(203).json({ message: "Email Already Exists", statusCode: 203 });
                        } else {

                            // Check and Update Advance Amount and first month rent Amount;
                            var paid_advance = 0;
                            var pending_advance = 0;

                            connection.query(`INSERT INTO hostel (Circle,User_Id, Name, Phone, Email, Address, AadharNo, PancardNo, licence,HostelName, Hostel_Id, Floor, Rooms, Bed, AdvanceAmount, RoomRent, BalanceDue, PaymentType, Status,paid_advance,pending_advance) VALUES ('${Circle}','${userID}', '${Name}', '${atten.Phone}', '${atten.Email}', '${atten.Address}', '${atten.AadharNo}', '${atten.PancardNo}', '${atten.licence}','${atten.HostelName}' ,'${atten.hostel_Id}', '${atten.Floor}', '${atten.Rooms}', '${atten.Bed}', '${atten.AdvanceAmount}', '${atten.RoomRent}', '${atten.BalanceDue}', '${atten.PaymentType}', '${Status}','${paid_advance}','${pending_advance}')`, function (insertError, insertData) {
                                if (insertError) {
                                    console.log(insertError);
                                    response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                                } else {
                                    response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                                }
                            });
                        }
                    });
                }
            });
        })

    }
}

// Insert Rent Amount
function insert_rent_invoice(connection, user_id, paid_amount, balance_rent) {

    var sql1 = "SELECT rms.Price,rms.Hostel_Id AS roomHostel_Id,rms.Floor_Id AS roomFloor_Id,rms.Room_Id AS roomRoom_Id,dtls.id AS detHostel_Id,dtls.isHostelBased,dtls.prefix,dtls.suffix,dtls.Name,hstl.User_Id,hstl.Address,hstl.Name AS UserName,hstl.Hostel_Id AS hosHostel_Id,hstl.Rooms AS hosRoom,hstl.Floor AS hosFloor,hstl.Bed,hstl.RoomRent,hstl.Name AS user_name,hstl.Phone,hstl.Email,hstl.Address,hstl.paid_advance,hstl.pending_advance,hstl.AdvanceAmount AS advance_amount, hstl.CheckoutDate,CASE WHEN dtls.isHostelBased = true THEN (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1)ELSE (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1)END AS ebBill,(SELECT eb.Floor FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebFloor, (SELECT eb.hostel_Id FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1 ) AS ebhostel_Id,(SELECT eb.Room FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebRoom,(SELECT eb.createAt FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1) AS createdAt,( SELECT invd.Invoices FROM invoicedetails invd WHERE invd.Invoices LIKE CONCAT(dtls.prefix, '%')ORDER BY CAST(SUBSTRING(invd.Invoices, LENGTH(dtls.prefix) + 1) AS UNSIGNED) DESC LIMIT 1) AS InvoiceDetails FROM hostel hstl INNER JOIN hosteldetails dtls ON dtls.id = hstl.Hostel_Id INNER JOIN hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id AND rms.Floor_Id = hstl.Floor AND rms.Room_Id = hstl.Rooms WHERE hstl.isActive = true AND hstl.id =?;";
    connection.query(sql1, [user_id], function (sel_err, sel_res) {
        if (sel_err) {
            console.log("Unable to get User Details")
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

            if (inv_data.RoomRent == inv_data.paid_advance) {
                var status = "Success";
            } else {
                var status = "Pending";
            }

            var sql2 = "INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based, Bed,BalanceDue,PaidAmount,numberofdays) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0)"
            connection.query(sql2, [inv_data.user_name, inv_data.Phone, inv_data.Email, inv_data.Name, inv_data.detHostel_Id, inv_data.hosFloor, inv_data.hosRoom, inv_data.RoomRent, inv_data.Address, currentDate, dueDate, invoiceNo, status, inv_data.User_Id, 0, 0, 0, 0, 0, 0, inv_data.Bed, balance_rent, paid_amount], function (ins_err, ins_res) {
                if (ins_err) {
                    console.log('Insert Error', ins_err);
                } else {
                    console.log('Insert Successfully');

                    insert_advance_invoice(connection, user_id);
                }
            })
        } else {
            console.log("Invalid User Details")
        }
    })
}

// Insert Advance Amount
function insert_advance_invoice(connection, user_id) {

    var sql1 = "SELECT rms.Price,rms.Hostel_Id AS roomHostel_Id,rms.Floor_Id AS roomFloor_Id,rms.Room_Id AS roomRoom_Id,dtls.id AS detHostel_Id,dtls.isHostelBased,dtls.prefix,dtls.suffix,dtls.Name,hstl.User_Id,hstl.Address,hstl.Name AS UserName,hstl.Hostel_Id AS hosHostel_Id,hstl.Rooms AS hosRoom,hstl.Floor AS hosFloor,hstl.Bed,hstl.RoomRent,hstl.Name AS user_name,hstl.Phone,hstl.Email,hstl.Address,hstl.paid_advance,hstl.pending_advance,hstl.AdvanceAmount AS advance_amount, hstl.CheckoutDate,CASE WHEN dtls.isHostelBased = true THEN (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1)ELSE (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1)END AS ebBill,(SELECT eb.Floor FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebFloor, (SELECT eb.hostel_Id FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1 ) AS ebhostel_Id,(SELECT eb.Room FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebRoom,(SELECT eb.createAt FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1) AS createdAt,( SELECT invd.Invoices FROM invoicedetails invd WHERE invd.Invoices LIKE CONCAT(dtls.prefix, '%')ORDER BY CAST(SUBSTRING(invd.Invoices, LENGTH(dtls.prefix) + 1) AS UNSIGNED) DESC LIMIT 1) AS InvoiceDetails FROM hostel hstl INNER JOIN hosteldetails dtls ON dtls.id = hstl.Hostel_Id INNER JOIN hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id AND rms.Floor_Id = hstl.Floor AND rms.Room_Id = hstl.Rooms WHERE hstl.isActive = true AND hstl.id =?;";
    connection.query(sql1, [user_id], function (sel_err, sel_res) {
        if (sel_err) {
            console.log("Unable to get User Details")
        } else if (sel_res.length != 0) {

            var inv_data = sel_res[0];

            var currentDate = moment().format('YYYY-MM-DD');

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

            var sql2 = "INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based, Bed,BalanceDue,PaidAmount,numberofdays,invoice_type) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,2)"
            connection.query(sql2, [inv_data.user_name, inv_data.Phone, inv_data.Email, inv_data.Name, inv_data.detHostel_Id, inv_data.hosFloor, inv_data.hosRoom, inv_data.advance_amount, inv_data.Address, currentDate, 0, invoiceNo, status, inv_data.User_Id, 0, 0, 0, 0, 0, 0, inv_data.Bed, inv_data.pending_advance, inv_data.paid_advance], function (ins_err, ins_res) {
                if (ins_err) {
                    console.log('Insert Error', ins_err);
                } else {
                    console.log('Insert Successfully');
                }
            })
        } else {
            console.log("Invalid User Details")
        }
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

                    var already_paid_amount = check_res[0].PaidAmount;
                    var new_amount = already_paid_amount + amount;

                    var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=? WHERE id=?";
                    connection.query(sql2, [balance_due, new_amount, id], function (up_err, up_res) {
                        if (up_err) {
                            response.status(201).json({ message: 'Unable to Update User Details' });
                        } else {


                            var sql3 = "INSERT INTO transactions (user_id,invoice_id,amount,status,created_by) VALUES (?,?,?,1,?)";
                            connection.query(sql3, [id, invoice_id, amount, created_by], function (ins_err, ins_res) {
                                if (ins_err) {
                                    response.status(201).json({ message: 'Unable to Add Transactions Details' });
                                } else {
                                    response.status(200).json({ message: "Update Successfully" });
                                }
                            })

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
                                var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=? WHERE id=?";
                                connection.query(sql2, [balance_due, new_amount, id], function (up_err, up_res) {
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

module.exports = { getUsers, createUser, getPaymentDetails, CheckOutUser, transitionlist }