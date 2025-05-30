const connection = require('./config/connection')

// All Assets Details
function all_assets(req, res) {

    const user_id = req.user_details.id;
    var show_ids = req.show_ids;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var hostel_id = req.body.hostel_id;

    if (is_admin == 1 || (role_permissions[8] && role_permissions[8].per_view == 1)) {

        if (!hostel_id) {
            return res.status(201).json({ message: "Missing Hostel Details", statusCode: 201 })
        }

        // var sql1 = "SELECT assets.*,ven.Vendor_Name,aa.asset_id,aa.hostel_id,aa.room_id,aa.assigned_date FROM assets JOIN Vendor AS ven ON ven.id=assets.vendor_id LEFT JOIN assigned_assets AS aa ON assets.id=aa.asset_id WHERE assets.created_by=? AND assets.status=1 ORDER BY assets.id DESC";
        // var sql1 = "SELECT assets.*,aname.asset_name,ven.Vendor_Name,aa.asset_id AS Asset_id,aa.hostel_id,aa.room_id,aa.assigned_date FROM assets JOIN Vendor AS ven ON ven.id=assets.vendor_id LEFT JOIN assigned_assets AS aa ON assets.id=aa.asset_id JOIN asset_names AS aname ON assets.asset_id=aname.id WHERE assets.created_by=? AND assets.status=1 ORDER BY assets.id DESC"
        var sql1 = `SELECT distinct assets.*,hos.Name as hostel_Name,hosfloor.floor_name,hr.Room_id AS room_name,aa.room_id,aname.asset_name as asset,ven.Vendor_Name,aa.asset_id AS Asset_id,aa.hostel_id,
                aa.room_id,aa.assigned_date,aa.floor_id,ban.acc_name,ban.acc_num FROM assets LEFT JOIN Vendor AS ven ON ven.id=assets.vendor_id LEFT JOIN assigned_assets AS aa ON assets.id=aa.asset_id 
                LEFT JOIN asset_names AS aname ON aa.asset_id=aname.id LEFT JOIN hosteldetails hos ON hos.id = aa.hostel_id LEFT JOIN Hostel_Floor hosfloor ON
                hosfloor.floor_id = aa.floor_id AND hosfloor.hostel_id = aa.hostel_id LEFT JOIN hostelrooms AS hr ON hr.id=aa.room_id LEFT JOIN bankings AS ban ON ban.id=assets.bank_id WHERE assets.hostel_id =? AND assets.status=true ORDER BY assets.id DESC`

        connection.query(sql1, [hostel_id], (err, data) => {
            if (err) {
                return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
                // } else if (data && data.length > 0) {
                //     // console.log("data", data);
                //     return res.status(200).json({ message: "All Asset Details", statusCode: 200, assets: data })
            } else {
                return res.status(200).json({ message: "All Asset Details", statusCode: 200, assets: data })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function add_asset(req, res) {

    var user_id = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var data = req.body;

    var hostel_id = data.hostel_id;

    if (!hostel_id) {
        return res.status(201).json({ message: "Missing Hostel Details", statusCode: 201 })
    }

    var validationResult = input_validations(data);

    if (!data.payment_type) {
        data.payment_type = "CASH"
    }

    if (validationResult.statusCode == 200) {

        if (data.id) {

            if (is_admin == 1 || (role_permissions[8] && role_permissions[8].per_edit == 1)) {

                // Update Process
                var sql2 = "SELECT * FROM assets WHERE id=?";
                connection.query(sql2, [data.id], (as_err, as_res) => {
                    if (as_err) {
                        return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
                    } else if (as_res.length > 0) {

                        var sql6 = "SELECT * FROM assets WHERE serial_number=? AND id !='" + data.id + "' AND status=1 AND hostel_id=?";
                        connection.query(sql6, [data.serial_number, hostel_id], function (err, ass_res) {
                            if (err) {
                                return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
                            } else if (ass_res.length != 0) {
                                return res.status(201).json({ message: "Serial Number Already Exists", statusCode: 201 })
                            } else {
                                var sql4 = "SELECT * FROM assets WHERE asset_name COLLATE latin1_general_ci = '" + data.asset_name + "' AND id !='" + data.id + "' AND status=1 AND hostel_id=?";
                                connection.query(sql4, [hostel_id], (err, asss_data) => {
                                    if (err) {
                                        return res.status(201).json({ message: "Unable to Get Asset Name Details", statusCode: 201 })
                                    } else if (asss_data.length == 0) {

                                        var sql5 = "UPDATE assets SET asset_name=?,vendor_id=?,product_name=?,brand_name=?,serial_number=?,purchase_date=?,price=?,total_price=? WHERE id=?";
                                        connection.query(sql5, [data.asset_name, data.vendor_id, data.product_name, data.brand_name, data.serial_number, data.purchase_date, data.price, data.price, data.id], function (ins_err, ins_data) {
                                            if (ins_err) {
                                                return res.status(201).json({ message: "Unable to Add Asset Details", statusCode: 201 })
                                            } else {

                                                var purchase_amount = data.price;

                                                var sql2 = "UPDATE transactions SET amount=?,payment_type=?,payment_date=? WHERE invoice_id=?";
                                                connection.query(sql2, [purchase_amount, data.payment_type, data.purchase_date, data.id], function (err, up_trans) {
                                                    if (err) {
                                                        console.log(err, "Up_trans Err");
                                                    } else {

                                                        // if (data.payment_type) {

                                                        //     var edit_id = data.id;

                                                        //     var sql5 = "SELECT * FROM bankings WHERE id=? AND status=1";
                                                        //     connection.query(sql5, [data.payment_type], function (err, sel_res) {
                                                        //         if (err) {
                                                        //             console.log(err);
                                                        //         } 
                                                        //         else if (sel_res.length != 0) {

                                                        //             const balance_amount = parseInt(sel_res[0].balance);

                                                        //             if (balance_amount && balance_amount != 0) {

                                                        //                 if (purchase_amount > balance_amount) {
                                                        //                     console.log("Purchase Amont is Greater than Balance Amount");
                                                        //                 }
                                                        //                  else {

                                                        //                     var sql6 = "SELECT * FROM bank_transactions WHERE edit_id=? AND `desc`='Asset' AND status=1";
                                                        //                     connection.query(sql6, [edit_id], function (err, show_data) {
                                                        //                         if (err) {
                                                        //                             console.log(err, "Unable to check edit id");
                                                        //                         } else if (show_data.length != 0) {

                                                        //                             // var sql4 = "INSERT INTO bank_transactions (bank_id,date,amount,desc,type,status,createdby,edit_id) VALUES (?,?,?,?,?,?,?,?)";
                                                        //                             var sql4 = "UPDATE bank_transactions SET bank_id=?,date=?,amount=? WHERE edit_id=?";
                                                        //                             connection.query(sql4, [data.payment_type, data.purchase_date, purchase_amount, edit_id], function (err, ins_data) {
                                                        //                                 if (err) {
                                                        //                                     console.log(err, "Insert Transactions Error");
                                                        //                                 }
                                                        //                                  else {

                                                        //                                     var last_amount = show_data[0].amount;

                                                        //                                     var new_amount = parseInt(balance_amount) + parseInt(last_amount) - parseInt(purchase_amount);

                                                        //                                     var sql5 = "UPDATE bankings SET balance=? WHERE id=?";
                                                        //                                     connection.query(sql5, [new_amount, data.payment_type], function (err, up_date) {
                                                        //                                         if (err) {
                                                        //                                             console.log(err, "Update Amount Error");
                                                        //                                         }
                                                        //                                     })
                                                        //                                 }
                                                        //                             })

                                                        //                         } else {
                                                        //                             console.log("Invalid Transactions ID");
                                                        //                         }
                                                        //                     })
                                                        //                 }
                                                        //             }
                                                        //         } else {
                                                        //             console.log("Invalid Bank Id");
                                                        //         }
                                                        //     })
                                                        // }
                                                        if (data.payment_type) {
    var edit_id = data.id;

    var sql5 = "SELECT * FROM bankings WHERE id=? AND status=1";
    connection.query(sql5, [data.payment_type], function (err, sel_res) {
        if (err) {
            console.log(err);
        } else if (sel_res.length != 0) {
            const balance_amount = parseInt(sel_res[0].balance);

            var sql6 = "SELECT * FROM bank_transactions WHERE edit_id=? AND `desc`='Asset' AND status=1";
            connection.query(sql6, [edit_id], function (err, show_data) {
                if (err) {
                    console.log(err, "Unable to check edit id");
                } else if (show_data.length != 0) {
                    var sql4 = "UPDATE bank_transactions SET bank_id=?, date=?, amount=? WHERE edit_id=?";
                    connection.query(sql4, [data.payment_type, data.purchase_date, purchase_amount, edit_id], function (err, ins_data) {
                        if (err) {
                            console.log(err, "Insert Transactions Error");
                        } else {
                            var last_amount = parseInt(show_data[0].amount);
                            var new_amount = balance_amount + last_amount - parseInt(purchase_amount);

                            // Optional: Log if resulting balance is negative
                            if (new_amount < 0) {
                                console.log("⚠️ Bank balance will become negative:", new_amount);
                            }

                            var sql7 = "UPDATE bankings SET balance=? WHERE id=?";
                            connection.query(sql7, [new_amount, data.payment_type], function (err, up_date) {
                                if (err) {
                                    console.log(err, "Update Amount Error");
                                }
                            });
                        }
                    });
                } else {
                    console.log("Invalid Transactions ID");
                }
            });
        } else {
            console.log("Invalid Bank Id");
        }
    });
}

                                                    }
                                                })
                                                return res.status(200).json({ message: "Asset has been successfully updated!", statusCode: 200 })
                                            }
                                        })
                                    } else {
                                        return res.status(202).json({ message: "Asset Name Already Exists", statusCode: 201 })
                                    }
                                })
                            }
                        })
                    } else {
                        return res.status(201).json({ message: "Invalid Asset Details", statusCode: 201 })
                    }
                })
            } else {
                res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
            }

        } 
        else {

    if (is_admin == 1 || (role_permissions[8] && role_permissions[8].per_create == 1)) {

        let new_bank_id = data.bank_id ? data.bank_id : 0;
        var purchase_amount = data.price;

        if (data.payment_type) {

            let sql5 = "SELECT * FROM bankings WHERE id=? AND status=1";
            connection.query(sql5, [data.payment_type], function (err, sel_res) {
                if (err) {
                    console.log(err);
                    return res.status(201).json({ message: "Database Error" });
                }
                if (sel_res.length === 0) {
                    return res.status(201).json({ message: "Invalid Bank Id" });
                }

                // ✅ ALLOW NEGATIVE BALANCE: no check for insufficient balance
                insertasset(new_bank_id, sel_res);
            });

        } else {
            insertasset(new_bank_id, []);
        }

        function insertasset(new_bank_id, sel_res) {

            var sql5 = "SELECT * FROM assets WHERE serial_number=? AND status=1 AND hostel_id=?";
            connection.query(sql5, [data.serial_number, hostel_id], function (err, ass_res) {
                if (err) {
                    return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 });
                } else if (ass_res.length != 0) {
                    return res.status(201).json({ message: "Serial Number Already Exists", statusCode: 201 });
                } else {
                    var sql3 = "SELECT * FROM assets WHERE asset_name COLLATE latin1_general_ci = ? AND status=1 AND hostel_id=?";
                    connection.query(sql3, [data.asset_name, hostel_id], (err, asss_data) => {
                        if (err) {
                            return res.status(201).json({ message: "Unable to Get Asset Name Details", statusCode: 201 });
                        } else if (asss_data.length == 0) {

                            var sql2 = "INSERT INTO assets (asset_name,vendor_id,product_name,brand_name,serial_number,product_count,purchase_date,price,total_price,status,created_by,payment_mode,bank_id,hostel_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                            connection.query(sql2, [data.asset_name, data.vendor_id, data.product_name, data.brand_name, data.serial_number, 1, data.purchase_date, data.price, data.price, 1, user_id, data.payment_type, new_bank_id, hostel_id], (ins_err, ins_res) => {
                                if (ins_err) {
                                    console.log(ins_err);
                                    return res.status(201).json({ message: "Unable to Add Asset Details", statusCode: 201 });
                                } else {

                                    var edit_id = ins_res.insertId;

                                    var sql1 = "INSERT INTO transactions (invoice_id,amount,payment_type,payment_date,status,action,created_by,description) VALUES (?,?,?,?,?,?,?,?)";
                                    connection.query(sql1, [edit_id, data.price, data.payment_type, data.purchase_date, 1, 2, user_id, "Asset"], function (err, ins_trans) {
                                        if (err) {
                                            console.log(err, "Ins Trans Error");
                                        } else {

                                            if (data.payment_type) {
                                                var sql4 = "INSERT INTO bank_transactions (bank_id,date,amount,`desc`,type,status,createdby,edit_id,hostel_id) VALUES (?,?,?,?,?,?,?,?,?)";
                                                connection.query(sql4, [data.payment_type, data.purchase_date, data.price, 'Asset', 2, 1, user_id, edit_id, hostel_id], function (err, ins_data) {
                                                    if (err) {
                                                        console.log(err, "Insert Transactions Error");
                                                    } else {
                                                        // let new_amount = parseInt(sel_res[0].balance) - parseInt(data.price);

                                                        // var sql5 = "UPDATE bankings SET balance=? WHERE id=?";
                                                        // connection.query(sql5, [new_amount, data.bank_id], function (err, up_date) {
                                                        //     if (err) {
                                                        //         console.log(err, "Update Amount Error");
                                                        //     }
                                                        // });
                                                        let new_amount = parseInt(sel_res[0].balance) - parseInt(data.price);

var sql5 = "UPDATE bankings SET balance=? WHERE id=?";
connection.query(sql5, [new_amount, data.payment_type], function (err, up_date) {
    if (err) {
        console.log(err, "Update Amount Error");
    }
});
                                                    }
                                                });
                                            }

                                            return res.status(200).json({ message: "Asset Added Successfully", statusCode: 200 });
                                        }
                                    });
                                }
                            });

                        }
                    });
                }
            });
        }

    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

        // else {

        //     if (is_admin == 1 || (role_permissions[8] && role_permissions[8].per_create == 1)) {

        //         let new_bank_id = data.bank_id ? data.bank_id : 0;

        //         var purchase_amount = data.price;

        //         if (data.payment_type) {

        //             let sql5 = "SELECT * FROM bankings WHERE id=? AND status=1";
        //             connection.query(sql5, [data.payment_type], function (err, sel_res) {
        //                 if (err) {
        //                     console.log(err);
        //                     return res.status(201).json({ message: "Database Error" });
        //                 }
        //                 if (sel_res.length === 0) {
        //                     return res.status(201).json({ message: "Invalid Bank Id" });
        //                 }

        //                 const balance_amount = parseInt(sel_res[0].balance);

        //                 if (!balance_amount || purchase_amount > balance_amount) {
        //                     return res.status(203).json({ statusCode: 203, message: "Insufficient Bank Balance" });
        //                 }

        //                 insertasset(new_bank_id, sel_res);
        //             });
        //         } else {
        //             insertasset(new_bank_id, []);
        //         }

        //         function insertasset(new_bank_id, sel_res) {

        //             var sql5 = "SELECT * FROM assets WHERE serial_number=? AND status=1 AND hostel_id=?";
        //             connection.query(sql5, [data.serial_number, hostel_id], function (err, ass_res) {
        //                 if (err) {
        //                     return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
        //                 } else if (ass_res.length != 0) {
        //                     return res.status(201).json({ message: "Serial Number Already Exists", statusCode: 201 })
        //                 } else {
        //                     var sql3 = "SELECT * FROM assets WHERE asset_name COLLATE latin1_general_ci = '" + data.asset_name + "' AND status=1 AND hostel_id=?";
        //                     connection.query(sql3, [hostel_id], (err, asss_data) => {
        //                         if (err) {
        //                             return res.status(201).json({ message: "Unable to Get Asset Name Details", statusCode: 201 })
        //                         } else if (asss_data.length == 0) {

        //                             var sql2 = "INSERT INTO assets (asset_name,vendor_id,product_name,brand_name,serial_number,product_count,purchase_date,price,total_price,status,created_by,payment_mode,bank_id,hostel_id) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        //                             connection.query(sql2, [data.asset_name, data.vendor_id, data.product_name, data.brand_name, data.serial_number, 1, data.purchase_date, data.price, data.price, 1, user_id, data.payment_type, new_bank_id, hostel_id], (ins_err, ins_res) => {
        //                                 if (ins_err) {
        //                                     console.log(ins_err);
        //                                     return res.status(201).json({ message: "Unable to Add Asset Details", statusCode: 201 })
        //                                 } else {

        //                                     var edit_id = ins_res.insertId;

        //                                     var sql1 = "INSERT INTO transactions (invoice_id,amount,payment_type,payment_date,status,action,created_by,description) VALUES (?,?,?,?,?,?,?,?)";
        //                                     connection.query(sql1, [edit_id, data.price, data.payment_type, data.purchase_date, 1, 2, user_id, "Asset"], function (err, ins_trans) {
        //                                         if (err) {
        //                                             console.log(err, "Ins Trans Error");
        //                                         } else {

        //                                             if (data.payment_type) {

        //                                                 var sql4 = "INSERT INTO bank_transactions (bank_id,date,amount,`desc`,type,status,createdby,edit_id,hostel_id) VALUES (?,?,?,?,?,?,?,?,?)";
        //                                                 connection.query(sql4, [data.payment_type, data.purchase_date, data.price, 'Asset', 2, 1, user_id, edit_id, hostel_id], function (err, ins_data) {
        //                                                     if (err) {
        //                                                         console.log(err, "Insert Transactions Error");
        //                                                     } else {
        //                                                         let new_amount = parseInt(sel_res[0].balance) - parseInt(data.price);

        //                                                         var sql5 = "UPDATE bankings SET balance=? WHERE id=?";
        //                                                         connection.query(sql5, [new_amount, data.bank_id], function (err, up_date) {
        //                                                             if (err) {
        //                                                                 console.log(err, "Update Amount Error");
        //                                                             }
        //                                                         })
        //                                                     }
        //                                                 })
        //                                             }
        //                                             return res.status(200).json({ message: "Asset Added Successfully", statusCode: 200 })
        //                                         }
        //                                     })
        //                                 }
        //                             })

        //                         }
        //                     })
        //                 }
        //             })
        //         }
        //     } else {
        //         res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        //     }
        // }
    } else {
        res.status(201).send(validationResult);
    }
}

function remove_asset(req, res) {

    var asset_id = req.body.asset_id;
    var user_id = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    console.log("req.body.asset_id", req.body.asset_id)

    if (is_admin == 1 || (role_permissions[8] && role_permissions[8].per_delete == 1)) {

        if (!asset_id) {
            return res.status(201).json({ message: "Missing Asset Details", statusCode: 201 })
        }

        var sql2 = "SELECT * FROM assets WHERE id=? AND created_by=?";
        connection.query(sql2, [asset_id, user_id], (as_err, as_res) => {
            if (as_err) {
                return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
            } else if (as_res.length != 0) {

                var sql3 = "UPDATE assets SET status=0 WHERE id=?";
                connection.query(sql3, [asset_id], (up_err, up_res) => {
                    if (up_err) {
                        return res.status(201).json({ message: "Unable to Remove Asset Details", statusCode: 201 })
                    } else {
                        return res.status(200).json({ message: "Remove Asset Details", statusCode: 200 })
                    }
                })
            } else {
                return res.status(201).json({ message: "Invalid Asset Details", statusCode: 201 })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function asseign_asset(req, res) {

    var user_id = req.user_details.id;
    var asset_id = req.body.asset_id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[8] && role_permissions[8].per_create == 1)) {

        if (!asset_id) {
            return res.status(201).json({ message: "Missing Asset Details", statusCode: 201 })
        }
        var data = req.body;

        var validationResult = assign_validations(data);

        if (validationResult.statusCode == 200) {

            // Check Assets
            var sql1 = "SELECT * FROM assets WHERE id=?";
            connection.query(sql1, [asset_id], (err, Data) => {
                if (err) {
                    return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
                } else if (Data.length != 0) {

                    // Asset Id Valid Check add or edit 
                    var sql2 = "SELECT * FROM assigned_assets WHERE asset_id=?";
                    connection.query(sql2, [asset_id], (as_err, as_res) => {
                        if (as_err) {
                            return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
                        } else if (as_res.length == 0) {

                            // Assign Asset
                            var sql3 = "INSERT INTO assigned_assets (asset_id,hostel_id,floor_id,room_id,assigned_date,created_by) VALUES (?,?,?,?,?,?)";
                            connection.query(sql3, [asset_id, data.hostel_id, data.floor_id, data.room_id, data.asseign_date, user_id], (ins_err, ins_res) => {
                                if (ins_err) {
                                    console.log(ins_err);
                                    return res.status(201).json({ message: "Unable to Add Assign Asset Details", statusCode: 201 })
                                } else {
                                    return res.status(200).json({ message: "Asset Assigned Sucessfully", statusCode: 200 })
                                }
                            })
                        } else {

                            // Reassign Asset
                            var sql4 = "UPDATE assigned_assets SET hostel_id=?,floor_id=?,room_id=?,assigned_date=?,updated_by=? WHERE asset_id=?";
                            connection.query(sql4, [data.hostel_id, data.floor_id, data.room_id, data.asseign_date, user_id, asset_id], (up_err, up_res) => {
                                if (up_err) {
                                    return res.status(201).json({ message: "Unable to Update Assign Asset Details", statusCode: 201 })
                                } else {
                                    return res.status(200).json({ message: "Asset Reassigned Sucessfully", statusCode: 200 })
                                }
                            })
                        }
                    })
                } else {
                    return res.status(201).json({ message: "Invalid Asset Details", statusCode: 201 })
                }
            })
        } else {
            res.status(201).send(validationResult);
        }
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function assign_validations(data) {
    if (!data.hostel_id) {
        return { message: "Please Add Hostel Name", statusCode: 201 };
    } else if (!data.room_id) {
        return { message: "Please Add Room Details", statusCode: 201 };
    } else if (!data.asseign_date) {
        return { message: "Please Add Assigned Date", statusCode: 201 };
    } else {
        return { message: "Validation passed", statusCode: 200 };
    }
}


function input_validations(data) {

    if (!data.asset_name && data.asset_name.trim() === "") {
        return { message: "Please Add Asset Name", statusCode: 201 };
    } else if (!data.purchase_date && data.purchase_date.trim() === "") {
        return { message: "Please Add Purchase Date", statusCode: 201 };
    } else if (!data.serial_number && data.serial_number.trim() === "") {
        return { message: "Please Add Serial Number", statusCode: 201 };
    } else if (!data.price && data.price.trim() === "") {
        return { message: "Please Add Price Amount", statusCode: 201 };
    } else {
        return { message: "Validation passed", statusCode: 200 };
    }
}

function expense_validation(data) {
    // if (!data.asset_id) {
    //     return { message: "Please Add Asset Name", statusCode: 201 };
    // } else if (!data.vendor_id) {
    //     return { message: "Please Add Vendor Details", statusCode: 201 };
    // } else 
    if (!data.category_id) {
        return { message: "Please Add Category", statusCode: 201 };
    } else if (!data.purchase_date) {
        return { message: "Please Add Purchase Date", statusCode: 201 };
    } else if (!data.unit_count) {
        return { message: "Please Add Count", statusCode: 201 };
    } else if (!data.unit_amount) {
        return { message: "Please Add Amount", statusCode: 201 };
    } else {
        return { message: "Validation passed", statusCode: 200 };
    }
}

function add_expenses(req, res) {

    var user_id = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var data = req.body;

    var hostel_id = data.hostel_id;

    if (!hostel_id) {
        return res.json(201).json({ statusCode: 201, message: "Please Add Hostel Details" })
    }

    var validationResult = expense_validation(data);

    if (validationResult.statusCode == 200) {

        // validate vendor id
        // var sql1 = "SELECT * FROM Vendor WHERE id=? AND Status=1";
        // connection.query(sql1, [data.vendor_id], (ven_err, ven_res) => {
        //     if (ven_err) {
        //         return res.status(201).json({ message: "Unable to Get Vendor Details", statusCode: 201 })
        //     } else if (ven_res.length != 0) {

        //         // Check asset ID
        //         var sql2 = "SELECT * FROM assets WHERE id=? AND status=1";
        //         connection.query(sql2, [data.asset_id], (as_err, as_res) => {
        //             if (as_err) {
        //                 return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
        //             } else if (as_res.length != 0) {

        var purchase_amount = data.unit_count * data.unit_amount;

        if (data.id) {

            if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_edit == 1)) {

                // Update Expenses
                var sql3 = "SELECT * FROM expenses WHERE id=? AND hostel_id=?";
                connection.query(sql3, [data.id, hostel_id], (exp_err, exp_res) => {
                    if (exp_err) {
                        return res.status(201).json({ message: "Unable to Get Expenses Details", statusCode: 201 })
                    } else if (exp_res.length != 0) {

                        var sql4 = "UPDATE expenses SET category_id=?,purchase_date=?,unit_count=?,unit_amount=?,purchase_amount=?,description=?,updated_by=? WHERE id=?";
                        connection.query(sql4, [data.category_id, data.purchase_date, data.unit_count, data.unit_amount, purchase_amount, data.description, user_id, data.id], (up_err, up_res) => {
                            if (up_err) {
                                return res.status(201).json({ message: "Unable to Update Expenses Details", statusCode: 201 })
                            } else {
                                return res.status(200).json({ message: "Successfully Updated Expenses Details", statusCode: 200 })
                            }
                        })
                    } else {
                        return res.status(201).json({ message: "Invalid Espenses Details", statusCode: 201 })
                    }
                })
            } else {
                res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
            }
        } 
        else {
            if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_create == 1)) {

                // Add Expense
                var sql4 = "INSERT INTO expenses (category_id,purchase_date,unit_count,unit_amount,purchase_amount,description,created_by,hostel_id) VALUES (?,?,?,?,?,?,?,?)";
                connection.query(sql4, [data.category_id, data.purchase_date, data.unit_count, data.unit_amount, purchase_amount, data.description, user_id, hostel_id], (ins_err, ins_res) => {
                    if (ins_err) {
                        return res.status(201).json({ message: "Unable to Add Expenses Details", statusCode: 201 })
                    } else {
                        return res.status(200).json({ message: "Successfully Add Expenses Details", statusCode: 200 })
                    }
                })
            } else {
                res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
            }
        }
        //             } else {
        //                 return res.status(201).json({ message: "Invalid Or Inactive Asset Details", statusCode: 201 })
        //             }
        //         })
        //     } else {
        //         return res.status(201).json({ message: "Invalid Or Inactive Vendor Details", statusCode: 201 })
        //     }
        // })
    } else {
        res.status(201).send(validationResult);
    }
}

function remove_expenses(req, res) {

    var expense_id = req.body.expense_id;
    var user_id = req.user_details.id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_delete == 1)) {

        if (!expense_id) {
            return res.status(201).json({ message: "Missing Expenses Details", statusCode: 201 })
        }

        var sql2 = "SELECT * FROM expenses WHERE id=? AND created_by=?";
        connection.query(sql2, [expense_id, user_id], (as_err, as_res) => {
            if (as_err) {
                return res.status(201).json({ message: "Unable to Get Expenses Details", statusCode: 201 })
            } else if (as_res.length != 0) {

                var sql3 = "UPDATE expenses SET status=0 WHERE id=?";
                connection.query(sql3, [expense_id], (up_err, up_res) => {
                    if (up_err) {
                        return res.status(201).json({ message: "Unable to Remove Expenses Details", statusCode: 201 })
                    } else {
                        return res.status(200).json({ message: "Remove Expenses Details", statusCode: 200 })
                    }
                })
            } else {
                return res.status(201).json({ message: "Invalid Expenses Details", statusCode: 201 })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

// All Expenses Details
function all_expenses(req, res) {

    const user_id = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_view == 1)) {

        var sql1 = "SELECT ex.*,ven.Vendor_Name,ven.Vendor_profile,ass.asset_name,ass.brand_name,exca.category_Name FROM expenses AS ex LEFT JOIN Vendor AS ven ON ven.id=ex.vendor_id LEFT JOIN assets AS ass ON ass.id=ex.asset_id JOIN Expense_Category_Name AS exca ON exca.id=ex.category_id WHERE ex.status=1 AND ass.status=1 AND ex.created_by=? ORDER BY ex.id DESC";
        connection.query(sql1, [user_id], (err, data) => {
            if (err) {
                return res.status(201).json({ message: "Unable to Get Expenses Details", statusCode: 201 })
            }

            return res.status(200).json({ message: "All Expenses Details", statusCode: 200, expenses: data })
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}


function all_reports(req, res) {

    var created_by = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var bed_start_date = req.body.bed_start_date;
    var bed_end_date = req.body.bed_end_date;

    if (is_admin == 1 || (role_permissions[15] && role_permissions[15].per_view == 1)) {

        var sql_1 = "SELECT bd.*,hos.RoomRent FROM bed_details AS bd JOIN hostel AS hos ON hos.id=bd.user_id WHERE createdby='" + created_by + "' AND bd.status=1 AND bd.isfilled=1 ";

        if (bed_start_date && bed_end_date) {
            const startDateRange = `${bed_start_date} 00:00:00`;
            const endDateRange = `${bed_end_date} 23:59:59`;
            sql_1 += ` AND bd.createdat >= '${startDateRange}' AND bd.createdat <= '${endDateRange}'`;
        }

        connection.query(sql_1, function (err, bed_det) {
            if (err) {
                res.status(201).json({ statusCode: 201, message: "Unable to Get Bed Details" })
            } else {

                var sales_income = bed_det
                    .map(x => x.bed_amount)
                    .reduce((sum, value) => sum + value, 0);


                var total_income = bed_det
                    .map(x => x.RoomRent)
                    .reduce((sum, value) => sum + value, 0);

                var revenue = total_income - sales_income;

                var hostel_wise_projection = {
                    sales_income,
                    total_income,
                    revenue
                }

                res.status(201).json({ statusCode: 201, message: "Report Details", report: hostel_wise_projection })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function add_expense_tag(req, res) {

    var { id, asset_id, hostel_id } = req.body;

    if (!id || !asset_id || !hostel_id) {
        return res.status(201).json({ message: "Missing Mandatory Fields", statusCode: 201 })
    }

    var sql1 = "SELECT * FROM expenses WHERE id=? AND status=1 AND hostel_id=?";
    connection.query(sql1, [id, hostel_id], (err, ch_res) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Expense Details", reason: err.message })
        } else if (ch_res.length != 0) {

            var up_query = "UPDATE expenses SET asset_id=? WHERE id=?";
            connection.query(up_query, [asset_id, hostel_id], function (err, data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Update Expense Details", reason: err.message })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Expenses Tag Updated Successfully!" })
                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Expense Details" })
        }
    })

}

module.exports = { all_assets, add_asset, remove_asset, asseign_asset, add_expenses, remove_expenses, all_expenses, all_reports, add_expense_tag }