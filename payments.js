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
    }
}

function all_bankings(req, res) {

    var created_by = req.user_details.id;

    var sql1 = "SELECT * FROM bankings WHERE createdby=? AND status=1";
    connection.query(sql1, [created_by], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Add Bank Details" })
        } else {
            var sql2 = "SELECT trans.*,ban.acc_name,ban.bank_name FROM bank_transactions AS trans JOIN bankings AS ban ON ban.id=trans.bank_id WHERE trans.status=1 AND trans.createdby=?";
            connection.query(sql2, [created_by], function (err, trans_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get Bank Transactions" })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Bank Details", banks: data, bank_trans: trans_data })
                }
            })
        }
    })
}

function delete_bank(req, res) {

    var id = req.body.id;
    var created_by = req.user_details.id;

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
}

function add_bank_amount(req, res) {

    var id = req.body.id;
    var amount = req.body.amount;

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
}

function add_default_account(req, res) {

    var { id, type } = req.body;

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
}

module.exports = { add_payment_details, payment_details, add_bank, all_bankings, delete_bank, add_bank_amount, add_default_account }