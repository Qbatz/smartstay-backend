const moment = require('moment');
const path = require('path');

const connection = require('./config/connection')
const crypto = require('crypto');
const AWS = require('aws-sdk');
require('dotenv').config();

const { generatereceipt } = require('./components/receipts_pdf');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();

exports.add_receipt = (req, res) => {

    var { user_id, reference_id, invoice_number, amount, payment_date, payment_mode, notes, bank_id } = req.body;

    var created_by = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var bank_id = req.body.bank_id || 0;

    if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_create == 1)) {

        if (!user_id) {
            return res.status(201).json({ message: "Missing User Id", statusCode: 201 });
        }

        if (!reference_id) {
            return res.status(201).json({ message: "Missing Reference Id", statusCode: 201 });
        }

        if (!invoice_number) {
            return res.status(201).json({ message: "Missing Invoice Number", statusCode: 201 });
        }

        if (!amount) {
            return res.status(201).json({ message: "Missing Amount", statusCode: 201 });
        }

        if (!payment_date) {
            return res.status(201).json({ message: "Missing Payment Date", statusCode: 201 });
        }

        if (!payment_mode) {
            return res.status(201).json({ message: "Missing Payment Mode", statusCode: 201 });
        }

        var ch_query = "SELECT * FROM invoicedetails WHERE Invoices=? AND invoice_status=1";
        connection.query(ch_query, [invoice_number], function (err, ch_res) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Get Invoice Details", reason: err.message });
            }

            if (ch_res.length == 0) {
                return res.status(201).json({ statusCode: 201, message: "Invalid Invoice Details" });
            }

            var inv_id = ch_res[0].id;
            var due_amount = ch_res[0].BalanceDue;

            if (amount > due_amount) {
                return res.status(201).json({ message: "Pay Amount More than Due Amount, Kindly Check Due Amount", due_amount: due_amount });
            }

            var sql1 = "INSERT INTO receipts (user_id,reference_id,invoice_number,amount_received,payment_date,payment_mode,notes,created_by,bank_id) VALUES (?)";
            var params = [user_id, reference_id, invoice_number, amount, payment_date, payment_mode, notes, created_by, bank_id]
            connection.query(sql1, [params], function (err, ins_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error to Add Receipt Details", reason: err.message });
                }

                var id = ins_data.insertId;

                var total_amount = ch_res[0].Amount;

                var already_paid_amount = ch_res[0].PaidAmount;

                var new_amount = already_paid_amount + amount;

                if (new_amount == total_amount) {
                    var Status = "Success";
                } else {
                    var Status = "Pending";
                }

                var bal_amount = due_amount - amount;

                var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=?,Status=? WHERE id=?";
                connection.query(sql2, [bal_amount, new_amount, Status, inv_id], function (up_err, up_res) {
                    if (up_err) {
                        response.status(201).json({ message: "Unable to Update User Details" });
                    } else {

                        var sql3 = "INSERT INTO transactions (user_id,invoice_id,amount,status,created_by,payment_type,payment_date,description,action) VALUES (?,?,?,1,?,?,?,'Invoice',1)";
                        connection.query(sql3, [user_id, invoice_number, amount, created_by, payment_mode, payment_date,],
                            function (ins_err, ins_res) {
                                if (ins_err) {
                                    response.status(201).json({ message: "Unable to Add Transactions Details", });
                                } else {

                                    if (payment_mode == "Net Banking" && bank_id) {

                                        var sql5 = "SELECT * FROM bankings WHERE id=? AND status=1";
                                        connection.query(sql5, [bank_id], function (err, sel_res) {
                                            if (err) {
                                                console.log(err);
                                            } else if (sel_res.length != 0) {

                                                const balance_amount = parseInt(sel_res[0].balance);

                                                var sql4 = "INSERT INTO bank_transactions (bank_id,date,amount,`desc`,type,status,createdby,edit_id) VALUES (?,?,?,?,?,?,?,?)";
                                                connection.query(sql4, [bank_id, payment_date, amount, 'receipt', 1, 1, created_by, id], function (err, ins_data) {
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
                                    return res.status(200).json({ statusCode: 200, message: "Receipt generated Successfully" });
                                }
                            })
                    }
                })
            })
        })
    } else {
        return res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

exports.gen_reference = (req, res) => {
    try {
        const receipt_number = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 characters unique value
        return res.status(200).json({ statusCode: 200, message: "Reference ID generated successfully.", reference_id: receipt_number, });
    } catch (error) {
        console.error("Error generating reference ID:", error);
        return res.status(201).json({ statusCode: 201, message: "Failed to generate reference ID. Please try again later.", });
    }
};

exports.get_all_receipts = (req, res) => {

    var hostel_id = req.body.hostel_id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_edit == 1)) {
        if (!hostel_id) {
            return res.status(201).json({ message: "Missing Hostel Id", statusCode: 201 });
        }

        var sql1 = "SELECT re.*, hos.Name AS user_name, hos.profile AS user_profile, inv.id AS inv_id, re.id AS id, hos.Address AS user_address, ca.Address AS admin_address FROM receipts AS re JOIN hostel AS hos ON hos.id = re.user_id LEFT JOIN invoicedetails AS inv ON inv.Invoices = re.invoice_number AND inv.Hostel_Id = ? AND inv.invoice_status = 1 JOIN createaccount AS ca ON ca.id = hos.created_by WHERE hos.Hostel_Id = ? AND re.status = 1 ORDER BY re.id DESC;"
        connection.query(sql1, [hostel_id, hostel_id], function (err, receipts) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Get Receipt Details", reason: err.message });
            }

            if (receipts.length === 0) {
                return res.status(200).json({ statusCode: 200, message: "No Receipts Found", all_receipts: [] });
            }

            return res.status(200).json({
                statusCode: 200,
                message: "All Receipts",
                all_receipts: receipts,
            });

        });
    } else {
        return res.status(208).json({
            message: "Permission Denied. Please contact your administrator for access.",
            statusCode: 208,
        });
    }
};

exports.edit_receipt = (req, res) => {

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var { id, user_id, invoice_number, amount, payment_date, payment_mode, notes, bank_id } = req.body;

    if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_edit == 1)) {
        if (!id || !user_id || !amount || !invoice_number || !payment_date || !payment_mode) {
            return res.status(201).json({ message: "Missing required fields", statusCode: 201 });
        }

        var sql1 = "SELECT *, inv.id AS inv_id, re.amount_received AS old_amount, re.payment_mode AS old_payment_mode, re.bank_id AS old_bank_id FROM receipts AS re JOIN invoicedetails AS inv ON inv.Invoices = re.invoice_number WHERE re.id = ? AND re.status = 1";
        connection.query(sql1, [id], function (err, data) {
            if (err) {
                return res.status(201).json({ message: "Error to Get Receipts Details", reason: err.message, statusCode: 201 });
            }

            if (data.length == 0) {
                return res.status(201).json({ message: "Invalid Receipts Details", statusCode: 201 });
            }

            var receipt = data[0];
            var inv_id = receipt.inv_id;
            var old_amount = parseInt(receipt.old_amount);
            var old_payment_mode = receipt.old_payment_mode;
            var old_bank_id = receipt.old_bank_id;

            // Recalculate the BalanceDue and PaidAmount
            var bal_amount = parseInt(receipt.BalanceDue) + parseInt(old_amount) - parseInt(amount);
            var new_paidamount = parseInt(receipt.PaidAmount) - old_amount + parseInt(amount);

            // Update the receipts table
            var sql2 = "UPDATE receipts SET invoice_number = ?, amount_received = ?, payment_date = ?, payment_mode = ?, notes = ?, bank_id = ? WHERE id = ?";
            connection.query(sql2, [invoice_number, amount, payment_date, payment_mode, notes, bank_id, id], function (err, up_res) {
                if (err) {
                    return res.status(201).json({ message: "Error to Update Receipts Details", reason: err.message, statusCode: 201 });
                }

                // Update the invoicedetails table
                var sql3 = "UPDATE invoicedetails SET BalanceDue = ?, PaidAmount = ?, Status = ? WHERE id = ?";
                connection.query(sql3, [bal_amount, new_paidamount, bal_amount > 0 ? "Pending" : "Paid", inv_id], function (up_err) {
                    if (up_err) {
                        return res.status(201).json({ message: "Error to Update Invoice Details", reason: up_err.message, statusCode: 201 });
                    }

                    // Update the transactions table
                    var sql4 = "UPDATE transactions SET amount = ?, payment_date = ?, payment_type = ? WHERE invoice_id = ? AND payment_type = ? AND amount = ?";
                    connection.query(sql4, [amount, payment_date, payment_mode, invoice_number, old_payment_mode, old_amount], function (trans_err) {
                        if (trans_err) {
                            return res.status(201).json({ message: "Error to Update Transaction Details", reason: trans_err.message, statusCode: 201 });
                        }

                        // Handle bank balance changes if payment mode is Net Banking
                        if (payment_mode === 'Net Banking') {
                            // Adjust the old bank balance
                            if (old_bank_id) {
                                var sql5 = "UPDATE bankings SET balance = balance - ? WHERE id = ?";
                                connection.query(sql5, [old_amount, old_bank_id], function (err) {
                                    if (err) console.log("Error updating old bank balance:", err);
                                });
                            }

                            // Adjust the new bank balance
                            if (bank_id) {
                                var sql6 = "UPDATE bankings SET balance = balance + ? WHERE id = ?";
                                connection.query(sql6, [amount, bank_id], function (err) {
                                    if (err) console.log("Error updating new bank balance:", err);
                                });

                                // Update the bank transactions
                                var sql7 = "UPDATE bank_transactions SET amount = ?, date = ?, bank_id = ? WHERE edit_id = ?";
                                connection.query(sql7, [amount, payment_date, bank_id, inv_id], function (err) {
                                    if (err) console.log("Error updating bank transactions:", err);
                                });
                            }
                        }

                        return res.status(200).json({ message: "Receipt updated successfully!", statusCode: 200 });
                    });
                });
            });
        });
    } else {
        return res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
};



exports.delete_receipt = (req, res) => {

    var id = req.body.id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var { id } = req.body;

    if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_delete == 1)) {

        if (!id) {
            return res.status(201).json({ message: "Missing Receipt Id", statusCode: 201 });
        }

        var sql1 = "SELECT *,inv.id AS inv_id,re.id AS id FROM receipts AS re JOIN invoicedetails AS inv ON inv.Invoices=re.invoice_number WHERE re.id=? AND re.status=1";
        connection.query(sql1, [id], function (err, data) {
            if (err) {
                return res.status(201).json({ message: "Error to Get Receipts Details", reason: err.message, statusCode: 201 });
            }

            if (data.length == 0) {
                return res.status(201).json({ message: "Invalid Receipts Details", statusCode: 201 });
            }

            var bal_amount = parseInt(data[0].BalanceDue);
            var paid_amount = parseInt(data[0].PaidAmount);
            var inv_id = data[0].inv_id;
            var bank_id = data[0].bank_id;
            var invoice_number = data[0].invoice_number;
            var amount = parseInt(data[0].amount_received);
            var balance_due = bal_amount + amount;
            var new_paidamount = paid_amount - amount;
            var payment_date = data[0].payment_date;
            var payment_by = data[0].payment_mode;

            var sql2 = "UPDATE receipts SET status=0 WHERE id=?";
            connection.query(sql2, [id], function (err, up_res) {
                if (err) {
                    return res.status(201).json({ message: "Error to Delete Receipts Details", reason: err.message, statusCode: 201 });
                }

                var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=?,Status=? WHERE id=?";
                connection.query(sql2, [balance_due, new_paidamount, "Pending", inv_id], function (up_err, up_res) {
                    if (up_err) {
                        return res.status(201).json({ message: "Unable to Update User Details", reason: err.message, statusCode: 201 });
                    } else {

                        var sql3 = "UPDATE transactions SET status=0 WHERE payment_date=? AND payment_type=? AND invoice_id=? AND amount=?";
                        connection.query(sql3, [payment_date, payment_by, invoice_number, amount], function (ins_err, ins_res) {
                            if (ins_err) {
                                return res.status(201).json({ message: "Unable to Remove Transactions Details", reason: err.message, statusCode: 201 });
                            } else {

                                console.log(ins_res);

                                if (payment_by == 'Net Banking') {

                                    var sql5 = "SELECT * FROM bankings WHERE id=?";
                                    connection.query(sql5, [bank_id], function (err, bank_data) {
                                        if (err) {
                                            console.log("error to Get Bank Details");
                                        } else if (bank_data.length != 0) {

                                            var bank_amount = parseInt(bank_data[0].balance);

                                            var new_bal = bank_amount + amount;

                                            var sql4 = "UPDATE bank_transactions SET status=0 WHERE 'desc'='Invoice' AND edit_id=? AND date=? AND bank_id=?";
                                            connection.query(sql4, [inv_id, bank_id], function (err, data) {
                                                if (err) {
                                                    console.log("Not Remove Bank Transactions");
                                                }

                                                var sql10 = "UPDATE bankings SET balance=? WHERE id=?";
                                                connection.query(sql10, [new_bal, bank_id], function (err) {
                                                    if (err) {
                                                        console.error("Error updating original bank balance:", err);
                                                    }
                                                });
                                            })

                                        } else {
                                            console.log("Invalid Bank Details");

                                        }
                                    })
                                }
                                return res.status(200).json({ message: "Receipts Deleted Successfully!", statusCode: 200 });
                            }
                        })
                    }
                })

            })
        })
    } else {
        return res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }

}

exports.pdf_generate = (req, res) => {

    var id = req.body.id;

    if (!id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Receipt Details" })
    }

    var sql1 = "SELECT rs.*,inv.*,man.*,hs.Name AS user_name,hs.Address AS user_address,hsv.Name AS hostel_name,hsv.Address AS hostel_address,hsv.profile AS hostel_profile,hsv.hostel_PhoneNo AS hostel_phone FROM receipts AS rs JOIN invoicedetails AS inv ON rs.invoice_number=inv.Invoices JOIN hostel AS hs ON hs.ID=inv.hos_user_id LEFT JOIN manual_invoice_amenities AS man ON man.invoice_id=inv.id JOIN hosteldetails AS hsv ON hsv.id=inv.Hostel_Id WHERE rs.id=? AND rs.status=1;";
    connection.query(sql1, [id], async function (err, data) {
        if (err) {
            console.log(err);
            return res.status(201).json({ message: "Unable to Get Receipt Details", statusCode: 201 })
        }

        if (data.length == 0) {
            return res.status(201).json({ message: "Invalid Receipt Details", statusCode: 201 })
        }

        var inv_data = data[0];

        const currentDate = moment().format('YYYY-MM-DD');
        const currentMonth = moment(currentDate).month() + 1;
        const currentYear = moment(currentDate).year();
        const currentTime = moment().format('HHmmss');

        const filename = `RECEIPT${currentMonth}${currentYear}${currentTime}${inv_data.reference_id}.pdf`;
        const outputPath = path.join(__dirname, filename);

        const pdfPath = await generatereceipt(inv_data, outputPath, filename);

        return res.status(200).json({ message: 'Receipt Pdf Generated', pdf_url: pdfPath });

        // const filename = `INV${currentMonth}${currentYear}${currentTime}${inv_data[0].User_Id}.pdf`;
        // const outputPath = path.join(__dirname, filename);

        // const pdfPath = await generateManualPDF(inv_data, outputPath, filename);

        // return res.status(200).json({ message: 'Insert PDF successfully', pdf_url: pdfPath, statusCode: 200 });

    })
}

exports.wallet_details = (req, res) => {

    var user_id = req.user_details.id;
    var sql1 = "SELECT * FROM wallet WHERE user_id=? AND is_active=1";
    connection.query(sql1, user_id, function (err, wall_data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get Wallet Details" })
        } else if (wall_data.length == 0) {

            var sql2 = "INSERT INTO wallet (amount,user_id) VALUES (0,?)";
            connection.query(sql2, user_id, function (err, ins_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error to Get Wallet Detail" })
                } else {

                    var sql1 = "SELECT * FROM wallet WHERE user_id=? AND is_active=1";
                    connection.query(sql1, user_id, function (err, data) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Error to Get Wallet Details" })
                        } else {
                            return res.status(200).json({ statusCode: 200, message: "Wallet Detail", wallet_data: data })
                        }
                    })
                }
            })
        } else {
            return res.status(200).json({ statusCode: 200, message: "Wallet Detail", wallet_data: wall_data })
        }
    })
}