const connection = require('./config/connection');

function add_payment_details(req, res) {

    var created_by = req.user_details.id;

    var { key_id, key_secret, status, description } = req.body;

    if (!key_id || !key_secret || !status) {
        return res.status(201).json({ statusCode: 201, message: "Kindly Add Mandatory Fields" })
    }

    var sql1 = "SELECT * FROM payment_settings WHERE created_by=?";
    connection.query(sql1, [created_by], function (err, data) {
        if (err) {
            console.log(err);
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Payment Details" })
        } else if (data.length != 0) {
            // Update Process
            var pay_id = data[0].id;
            var sql2 = "UPDATE payment_settings SET key_id=?,key_secret=?,description=?,status=? WHERE id=" + pay_id + "";
            connection.query(sql2, [key_id, key_secret, description, status], function (err, up_res) {
                if (err) {
                    console.log(err);
                    return res.status(201).json({ statusCode: 201, message: "Unable to Update Payment Details" })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Successfully Updated Payment Details" })
                }
            })
        } else {
            // Insert Process
            var sql3 = "INSERT INTO payment_settings (key_id,key_secret,description,status,created_by) VALUES (?,?,?,?,?)";
            connection.query(sql3, [key_id, key_secret, description, status, created_by], function (ins_err, ins_res) {
                if (ins_err) {
                    console.log(ins_err);
                    return res.status(201).json({ statusCode: 201, message: "Unable to Add Payment Details" })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Successfully Add Payment Details" })
                }
            })
        }
    })


}

function payment_details(req, res) {

    var created_by = req.user_details.id;

    var sql1 = "SELECT * FROM payment_settings WHERE created_by='" + created_by + "'";
    connection.query(sql1, function (err, data) {
        if (err) {
            console.log(err);
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Payment Settings" })
        } else {
            return res.status(200).json({ statusCode: 200, message: "Successfully Get Payment Settings", payment_details: data })
        }
    })
}

function add_bank(req, res) {

    var created_by = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var acc_name = req.body.acc_name;
    var acc_no = req.body.acc_no || 0;
    var bank_name = req.body.bank_name;
    var ifsc_code = req.body.ifsc_code || 0;
    var desc = req.body.desc || 0;
    var id = req.body.id;

    if (!acc_name || !bank_name) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    if (id) {
        // Update Process

        if (is_admin == 1 || (role_permissions[16] && role_permissions[16].per_edit == 1)) {

            var sql1 = "SELECT * FROM bankings WHERE id=? AND status=1";
            connection.query(sql1, [id], function (err, sel_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Details" })
                } else if (sel_data.length != 0) {

                    var sql1 = "SELECT * FROM bankings WHERE acc_name=? AND bank_name=? AND status=1 AND id !=?";
                    connection.query(sql1, [acc_name, bank_name, id], function (err, acc_data) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Details" })
                        } else if (acc_data.length != 0) {
                            return res.status(202).json({ statusCode: 202, message: "Account Name and Bank Name Already Exists!" })
                        } else {

                            var sql2 = "UPDATE bankings SET acc_name=?,acc_num=?,bank_name=?,ifsc_code=?,description=? WHERE id=?";
                            connection.query(sql2, [acc_name, acc_no, bank_name, ifsc_code, desc, id], function (err, data) {
                                if (err) {
                                    console.log(err);
                                    return res.status(201).json({ statusCode: 201, message: "Unable to Update Bank Details" })
                                } else {
                                    return res.status(200).json({ statusCode: 200, message: "Changes Saved Successfully!" })
                                }
                            })

                        }
                    })
                } else {
                    return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" })
                }
            })
        } else {
            res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    } else {

        if (is_admin == 1 || (role_permissions[16] && role_permissions[16].per_create == 1)) {

            // Add Process
            var sql1 = "SELECT * FROM bankings WHERE acc_name=? AND bank_name=? AND status=1";
            connection.query(sql1, [acc_name, bank_name], function (err, acc_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Details" })
                } else if (acc_data.length != 0) {
                    return res.status(202).json({ statusCode: 202, message: "Account Name and Bank Name Already Exists!" })
                } else {

                    var sql1 = "INSERT INTO bankings (acc_name,acc_num,bank_name,ifsc_code,description,setus_default,balance,createdby) VALUES (?,?,?,?,?,?,?,?)";
                    connection.query(sql1, [acc_name, acc_no, bank_name, ifsc_code, desc, 0, 0, created_by], function (err, data) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Add Bank Details" })
                        } else {
                            return res.status(200).json({ statusCode: 200, message: "Bank Added Successfully!" })
                        }
                    })

                }
            })
        } else {
            res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    }
}

function all_bankings(req, res) {

    var created_by = req.user_details.id;

    var show_ids = req.show_ids;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[16] && role_permissions[16].per_view == 1)) {

        var sql1 = "SELECT * FROM bankings WHERE createdby IN (?) AND status=1";
        connection.query(sql1, [show_ids], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Add Bank Details" })
            } else {
                var sql2 = "SELECT trans.*,ban.acc_name,ban.bank_name FROM bank_transactions AS trans JOIN bankings AS ban ON ban.id=trans.bank_id WHERE trans.status=1 AND trans.createdby IN (?)";
                connection.query(sql2, [show_ids], function (err, trans_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Transactions" })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Bank Details", banks: data, bank_trans: trans_data })
                    }
                })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function delete_bank(req, res) {

    var id = req.body.id;
    var created_by = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[16] && role_permissions[16].per_delete == 1)) {

        if (!id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        var sql1 = "SELECT * FROM bankings WHERE id=? AND createdby=?";
        connection.query(sql1, [id, created_by], function (err, sel_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Details" })
            } else if (sel_data.length != 0) {

                var sql2 = "UPDATE bankings SET status=0 WHERE id=?";
                connection.query(sql2, [id], function (err, up_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Delete Bank Details" })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Bank Deleted Successfully!" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function add_bank_amount(req, res) {

    var id = req.body.id;
    var amount = req.body.amount;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[16] && role_permissions[16].per_create == 1)) {

        if (!id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Field" })
        }

        var sql1 = "SELECT * FROM bankings WHERE id=?";
        connection.query(sql1, [id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Details" })
            } else if (data != 0) {

                // var old_amount = data[0].balance;

                // var new_bal = parseInt(amount) + parseInt(old_amount);

                var sql2 = "UPDATE bankings SET balance=? WHERE id=?";
                connection.query(sql2, [amount, id], function (err, up_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Add Bank Details" })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Balance Added Successfully!" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function add_default_account(req, res) {

    var { id, type } = req.body;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[16] && role_permissions[16].per_create == 1)) {

        if (!id || !type) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        // type 1 is Credit 2 is Debit 3 is Both

        var sql1 = "SELECT * FROM bankings WHERE id=?";
        connection.query(sql1, [id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Details" })
            } else if (data != 0) {

                var sql2 = "UPDATE bankings SET setus_default=? WHERE id=?";
                connection.query(sql2, [type, id], function (err, up_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Add Bank Details" })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Bank Set as Default Successfully!" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function edit_bank_trans(req, res) {

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[16] && role_permissions[16].per_edit == 1)) {

        var { id, bank_id, date, amount, type, desc } = req.body;

        if (!id || !bank_id || !date || !amount) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        var sql3 = "SELECT * FROM bankings WHERE id=?";
        connection.query(sql3, [bank_id], function (err, bank_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Details" })
            } else if (bank_data.length != 0) {

                var sql1 = "SELECT * FROM bank_transactions WHERE id=?";
                connection.query(sql1, [id], function (err, data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Transaction Details" })
                    } else if (data.length != 0) {

                        var old_bank = data[0].bank_id;
                        var balance_amount = bank_data[0].balance;
                        var last_amount = data[0].amount;

                        // var new_amount = parseInt(balance_amount) + parseInt(last_amount) - parseInt(purchase_amount);

                        var sql2 = "UPDATE bank_transactions SET bank_id=?,date=?,amount=?,type=?,description=? WHERE id=?";
                        connection.query(sql2, [bank_id, date, amount, type, desc, id], function (err, up_data) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Update Transaction Details" })
                            } else {

                                if (bank_id == old_bank) {

                                    if (last_amount == amount) {

                                        return res.status(200).json({ statusCode: 200, message: "Save Changes Successfully!" })

                                    } else {

                                        var total_amount = parseInt(balance_amount) + parseInt(last_amount) - parseInt(amount);

                                        var sql4 = "UPDATE bankings SET balance=? WHERE id=?";
                                        connection.query(sql4, [total_amount, bank_id], function (err, up_res) {
                                            if (err) {
                                                return res.status(201).json({ statusCode: 201, message: "Unable to Update Balance Amount Details" })
                                            } else {
                                                return res.status(200).json({ statusCode: 200, message: "Save Changes Successfully!" })
                                            }
                                        })
                                    }

                                } else {
                                    var sql7 = "SELECT * FROM bankings WHERE id=?";
                                    connection.query(sql7, [old_bank], function (err, old_bank_data) {
                                        if (err) {
                                            console.log(err);
                                            return res.status(201).json({ statusCode: 201, message: "Unable to Update Balance Amount Details" })
                                        } else if (old_bank_data.length != 0) {

                                            var total_amount = parseInt(old_bank_data[0].balance) + parseInt(last_amount);

                                            var sql5 = "UPDATE bankings SET balance=? WHERE id=?";
                                            connection.query(sql5, [total_amount, old_bank], function (err, up_res) {
                                                if (err) {
                                                    console.log(err);
                                                    return res.status(201).json({ statusCode: 201, message: "Unable to Update Balance Amount Details" })
                                                } else {

                                                    var remain_amount = parseInt(balance_amount) - parseInt(amount);

                                                    // Update New Bank amount
                                                    connection.query(sql5, [remain_amount, bank_id], function (err, ins_res) {
                                                        if (err) {
                                                            console.log(err);
                                                            return res.status(201).json({ statusCode: 201, message: "Unable to Update Balance Amount Details" })
                                                        } else {
                                                            return res.status(200).json({ statusCode: 200, message: "Save Changes Successfully!" })
                                                        }
                                                    })
                                                }
                                            })
                                        } else {
                                            return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" })
                                        }
                                    })
                                }
                            }
                        })
                    } else {
                        return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function delete_bank_trans(req, res) {

    var id = req.body.id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[16] && role_permissions[16].per_delete == 1)) {

        if (!id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        var sql1 = "SELECT * FROM bank_transactions WHERE id=?";
        connection.query(sql1, [id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Details" })
            } else if (data != 0) {

                var sql2 = "UPDATE bank_transactions SET status=0 WHERE id=?";
                connection.query(sql2, [id], function (err, up_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Delete Bank Transactions" })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Transaction Deleted Successfully!" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

module.exports = { add_payment_details, payment_details, add_bank, all_bankings, delete_bank, add_bank_amount, add_default_account, edit_bank_trans, delete_bank_trans }