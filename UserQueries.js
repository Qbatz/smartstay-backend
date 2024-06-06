function getUsers(connection, response, ReqData) {
    const query = `SELECT * FROM hosteldetails hstlDetails inner join hostel hstl on hstl.Hostel_Id=hstlDetails.id and hstl.isActive=true WHERE hstlDetails.created_By ='${ReqData.loginId}'`;
    connection.query(query, function (error, hostelData) {
        console.log("hostelData", hostelData)
        if (error) {
            console.error(error);
            response.status(403).json({ message: 'Error  hostel data' });
            return;
        } else {
            response.status(200).json(hostelData);
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

                console.log(already_paid_amount);

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


function getPaymentDetails(connection, response) {
    connection.query(`SELECT hos.Name ,hos.Phone,hos.Email,hos.Address,hos.AdvanceAmount,hos.BalanceDue,hos.Status,hos.createdAt,inv.Name as invoiceName, inv.phoneNo as invoicePhone ,inv.Date as invDate, inv.Amount as invAmount ,inv.Status as invStatus, inv.Invoices as InvoiceNo FROM hostel hos INNER JOIN invoicedetails inv on inv.phoneNo= hos.Phone`, function (error, data) {
        console.log(error);
        if (error) {
            response.status(201).json({ message: 'No Data Found', statusCode: 201 })
        }
        else {
            response.status(200).json(data)
        }
    })
}


function CheckOutUser(connection, response, attenData) {
    console.log("attenData", attenData)
    if (attenData) {

        const query = `UPDATE hostel SET CheckoutDate= '${attenData.CheckOutDate}' , isActive ='${attenData.isActive}' WHERE User_Id='${attenData.User_Id}'`

        console.log("query", query)
        connection.query(query, function (error, UpdateData) {
            console.log("updateData", UpdateData)
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

function advance_payment_transation(connection, request, response) {

    var { id, invoice_id, amount, balance_due, created_by } = request.body;

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

function transitionlist(connection, request, response) {


    var { id, invoice_id, amount, balance_due, created_by } = request.body;
    console.log(request.body);
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


}

module.exports = { getUsers, createUser, getPaymentDetails, CheckOutUser, advance_payment_transation, transitionlist }