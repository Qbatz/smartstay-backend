const connection = require('./config/connection')
const crypto = require('crypto');

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

        var sql1 = `SELECT re.*,hos.Name AS user_name,hos.profile AS user_profile,inv.*,inv.id AS inv_id,re.id AS id,hos.Address AS user_address,ca.Address AS admin_address FROM receipts AS re JOIN hostel AS hos ON hos.id = re.user_id JOIN invoicedetails AS inv ON inv.Invoices=re.invoice_number JOIN createaccount AS ca ON ca.id=re.created_by WHERE hos.Hostel_Id = ? AND re.status = 1 AND hos.isActive = 1 AND inv.invoice_status=1`;
        connection.query(sql1, [hostel_id], function (err, receipts) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Get Receipt Details", reason: err.message });
            }

            if (receipts.length === 0) {
                return res.status(200).json({ statusCode: 200, message: "No Receipts Found", all_receipts: [] });
            }

            let completed = 0;

            // Iterate through receipts to fetch amenities for each receipt
            receipts.forEach((receipt, index) => {

                var sql2 = "SELECT * FROM manual_invoice_amenities WHERE invoice_id = ?";
                connection.query(sql2, [receipt.inv_id], function (err, amenities) {
                    if (err) {
                        receipts[index]['amenity'] = [];
                    } else {
                        receipts[index]['amenity'] = amenities || [];
                    }

                    completed++;
                    if (completed === receipts.length) {
                        return res.status(200).json({
                            statusCode: 200,
                            message: "All Receipts with Amenities",
                            all_receipts: receipts,
                        });
                    }
                });
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

    var { id, user_id, invoice_number, amount, payment_date, payment_mode, notes } = req.body;

    if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_edit == 1)) {

        if (!user_id) {
            return res.status(201).json({ message: "Missing User Id", statusCode: 201 });
        }

        if (!amount) {
            return res.status(201).json({ message: "Missing Amount", statusCode: 201 });
        }

        if (!invoice_number) {
            return res.status(201).json({ message: "Missing Invoice Number", statusCode: 201 });
        }

        if (!payment_date) {
            return res.status(201).json({ message: "Missing Payment Date", statusCode: 201 });
        }

        if (!payment_mode) {
            return res.status(201).json({ message: "Missing Payment Type", statusCode: 201 });
        }

        var sql1 = "SELECT * FROM receipts WHERE id=? AND status=1";
        connection.query(sql1, [id], function (err, data) {
            if (err) {
                return res.status(201).json({ message: "Error to Get Receipts Details", reason: err.message, statusCode: 201 });
            }

            if (data.length == 0) {
                return res.status(201).json({ message: "Invalid Receipts Details", statusCode: 201 });
            }

            var sql2 = "UPDATE receipts SET invoice_number=?,amount_received=?,payment_date=?,notes=? WHERE id=?";
            connection.query(sql2, [invoice_number, amount, payment_date, notes, id], function (err, up_res) {
                if (err) {
                    return res.status(201).json({ message: "Error to Update Receipts Details", reason: err.message, statusCode: 201 });
                }


                return res.status(200).json({ message: "Receipts Details Updated", statusCode: 200 });
            })
        })
    } else {
        return res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

// exports.edit_receipt = (req, res) => {

//     var role_permissions = req.role_permissions;
//     var is_admin = req.is_admin;

//     var { id, user_id, invoice_number, amount, payment_date, payment_mode, notes, bank_id } = req.body;

//     if (is_admin == 1 || (role_permissions[10] && role_permissions[10].per_edit == 1)) {

//         if (!id) {
//             return res.status(201).json({ message: "Missing Receipt Id", statusCode: 201 });
//         }

//         if (!user_id) {
//             return res.status(201).json({ message: "Missing User Id", statusCode: 201 });
//         }

//         if (!amount) {
//             return res.status(201).json({ message: "Missing Amount", statusCode: 201 });
//         }

//         if (!invoice_number) {
//             return res.status(201).json({ message: "Missing Invoice Number", statusCode: 201 });
//         }

//         if (!payment_date) {
//             return res.status(201).json({ message: "Missing Payment Date", statusCode: 201 });
//         }

//         if (!payment_mode) {
//             return res.status(201).json({ message: "Missing Payment Mode", statusCode: 201 });
//         }

//         // Fetch the original receipt
//         var sql1 = "SELECT * FROM receipts AS re JOIN invoicedetails AS inv ON inv.Invoices=re.invoice_number WHERE re.id=? AND re.status=1";
//         connection.query(sql1, [id], function (err, receiptData) {
//             if (err) {
//                 return res.status(201).json({ message: "Error to Get Receipts Details", reason: err.message, statusCode: 201 });
//             }

//             if (receiptData.length === 0) {
//                 return res.status(201).json({ message: "Invalid Receipts Details", statusCode: 201 });
//             }

//             var bal_amount = receiptData[0].BalanceDue;

//             const originalReceipt = receiptData[0];
//             const originalAmount = parseInt(originalReceipt.amount_received);
//             const originalPaymentMode = originalReceipt.payment_mode;
//             const originalBankId = originalReceipt.bank_id;

//             // var sql2 = "UPDATE invoicedetails SET BalanceDue=?,PaidAmount=?,Status=? WHERE id=?";
//             // connection.query(sql2, [bal_amount, new_amount, Status, inv_id], function (up_err, up_res) {
//             //     if (up_err) {
//             //         response.status(201).json({ message: "Unable to Update User Details" });
//             //     } else {

//             //         var sql3 = "INSERT INTO transactions (user_id,invoice_id,amount,status,created_by,payment_type,payment_date,description,action) VALUES (?,?,?,1,?,?,?,'Invoice',1)";
//             //         connection.query(sql3, [user_id, invoice_number, amount, created_by, payment_mode, payment_date,],
//             //             function (ins_err, ins_res) {
//             //                 if (ins_err) {
//             //                     response.status(201).json({ message: "Unable to Add Transactions Details", });
//             //                 } else {
//             //                 }
//             //             })
//             //     }
//             // })

//             // Update the receipt details
//             var sql2 = "UPDATE receipts SET invoice_number=?,amount_received=?,payment_date=?,payment_mode=?,notes=?,bank_id=? WHERE id=?";
//             connection.query(sql2, [invoice_number, amount, payment_date, payment_mode, notes, bank_id, id], function (err, up_res) {
//                 if (err) {
//                     return res.status(201).json({ message: "Error to Update Receipts Details", reason: err.message, statusCode: 201 });
//                 }

//                 // If payment mode is Net Banking, update the bank transaction and balance
//                 if (payment_mode === "Net Banking" && bank_id) {
//                     var sql5 = "SELECT * FROM bankings WHERE id=? AND status=1";
//                     connection.query(sql5, [bank_id], function (err, bankData) {
//                         if (err) {
//                             console.error("Error fetching bank details:", err);
//                         } else if (bankData.length !== 0) {
//                             const balance = parseInt(bankData[0].balance);

//                             // Adjust the bank balance based on the updated amount
//                             const newBalance = balance - originalAmount + parseInt(amount);

//                             var sql6 = "UPDATE bankings SET balance=? WHERE id=?";
//                             connection.query(sql6, [newBalance, bank_id], function (err) {
//                                 if (err) {
//                                     console.error("Error updating bank balance:", err);
//                                 }
//                             });

//                             // Update or insert the bank transaction
//                             var sql7 = "UPDATE bank_transactions SET date=?, amount=?, type=?, status=?, edit_id=? WHERE edit_id=?";
//                             connection.query(sql7, [payment_date, amount, 'receipt', 1, id, id], function (err, txnUpdateRes) {
//                                 if (err || txnUpdateRes.affectedRows === 0) {
//                                     // If no transaction exists, insert a new one
//                                     var sql8 = "INSERT INTO bank_transactions (bank_id, date, amount, `desc`, type, status, createdby, edit_id) VALUES (?,?,?,?,?,?,?,?)";
//                                     connection.query(sql8, [bank_id, payment_date, amount, 'receipt', 1, 1, req.user_details.id, id], function (err) {
//                                         if (err) {
//                                             console.error("Error inserting new bank transaction:", err);
//                                         }
//                                     });
//                                 }
//                             });
//                         } else {
//                             console.error("Invalid Bank ID");
//                         }
//                     });
//                 }

//                 // Handle changes in payment mode (e.g., switching from Net Banking to Cash)
//                 if (originalPaymentMode === "Net Banking" && payment_mode !== "Net Banking") {
//                     var sql9 = "SELECT * FROM bankings WHERE id=? AND status=1";
//                     connection.query(sql9, [originalBankId], function (err, bankData) {
//                         if (!err && bankData.length !== 0) {
//                             const originalBalance = parseInt(bankData[0].balance);
//                             const updatedBalance = originalBalance - originalAmount;

//                             var sql10 = "UPDATE bankings SET balance=? WHERE id=?";
//                             connection.query(sql10, [updatedBalance, originalBankId], function (err) {
//                                 if (err) {
//                                     console.error("Error updating original bank balance:", err);
//                                 }
//                             });

//                             var sql11 = "DELETE FROM bank_transactions WHERE edit_id=?";
//                             connection.query(sql11, [id], function (err) {
//                                 if (err) {
//                                     console.error("Error deleting bank transaction:", err);
//                                 }
//                             });
//                         }
//                     });
//                 }

//                 return res.status(200).json({ message: "Receipt Details Updated Successfully", statusCode: 200 });
//             });
//         });
//     } else {
//         return res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
//     }
// };


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

            var bal_amount = data[0].BalanceDue;
            var paid_amount = data[0].PaidAmount;
            var inv_id = data[0].inv_id;
            var bank_id = data[0].bank_id;
            var invoice_number = data[0].invoice_number;
            var amount = data[0].amount_received;
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

                                            var bank_amount = bank_data[0].balance;

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