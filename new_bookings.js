const connection = require("./config/connection");
const uploadImage = require("./components/upload_image");
const crypto = require('crypto');

const { sendTemplateMessage } = require('./whatsappTemplate');

function add_booking(req, res) {

    var created_by = req.user_details.id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var bucket_name = process.env.AWS_BUCKET_NAME;
    var folderName = "booking_user_profile/";
    var timestamp = Date.now();

    const profile = req.files?.profile || 0;
    var l_name = req.body.l_name;

    if (!l_name) {
        l_name = ""
    }

    var { f_name, mob_no, email_id, address, joining_date, amount, hostel_id, id, area, landmark, pin_code, city, state } = req.body;

    if (!f_name || !mob_no || !joining_date || !amount || !hostel_id || !pin_code || !city || !state) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    if (id) {

        if (is_admin == 1 || (role_permissions[5] && role_permissions[5].per_edit == 1)) {

            var sql1 = "SELECT * FROM bookings WHERE phone_number=? AND status=1 AND hostel_id=? AND id !=?"
            connection.query(sql1, [mob_no, hostel_id, id], function (err, ph_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get Phone Details", reason: err.message });
                } else if (ph_data.length == 0) {

                    if (email_id) {

                        var sql2 = "SELECT * FROM bookings WHERE email_id=? AND status=1 AND hostel_id=? AND id !=?";
                        connection.query(sql2, [email_id, hostel_id, id], async function (err, em_res) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Get Email Details", reason: err.message });
                            } else if (em_res.length == 0) {

                                update_booking()

                            } else {
                                return res.status(202).json({ statusCode: 202, message: "Email Id Already Exists" });
                            }
                        })

                    } else {
                        update_booking()
                    }


                    async function update_booking() {

                        let profile_url = 0;

                        if (!profile) {
                            profile_url = req.body.profile || 0
                        } else {
                            try {
                                profile_url = await uploadImage.uploadProfilePictureToS3Bucket(
                                    bucket_name, folderName, `${f_name}${timestamp}${profile[0].originalname}`, profile[0]
                                );
                                console.log(profile_url);  // Log the URL
                            } catch (error) {
                                console.error("Error uploading profile picture: ", error);
                            }
                        }

                        // var sql3 = "INSERT INTO bookings (first_name,last_name,joining_date,amount,hostel_id,phone_number,email_id,address,created_by,profile) VALUES (?)";
                        var sql3 = "UPDATE bookings SET first_name=?,last_name=?,joining_date=?,amount=?,hostel_id=?,phone_number=?,email_id=?,address=?,profile=?,area=?,landmark=?,pin_code=?,city=?,state=? WHERE id=?";
                        connection.query(sql3, [f_name, l_name, joining_date, amount, hostel_id, mob_no, email_id, address, profile_url, area, landmark, pin_code, city, state, id], function (err, ins_data) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Add Booking Details", reason: err.message });
                            } else {
                                return res.status(200).json({ statusCode: 200, message: "Booking Updated Successfully!" })
                            }
                        })
                    }

                } else {
                    return res.status(203).json({ statusCode: 203, message: "Phone Number Already Exists" });
                }
            })
        } else {
            res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }

    } else {

        if (is_admin == 1 || (role_permissions[5] && role_permissions[5].per_create == 1)) {

            var sql1 = "SELECT * FROM bookings WHERE phone_number=? AND status=1 AND hostel_id=?"
            connection.query(sql1, [mob_no, hostel_id], function (err, ph_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get Phone Details", reason: err.message });
                } else if (ph_data.length == 0) {

                    if (email_id) {

                        var sql2 = "SELECT * FROM bookings WHERE email_id=? AND status=1 AND hostel_id=?";
                        connection.query(sql2, [email_id, hostel_id], async function (err, em_res) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Get Email Details", reason: err.message });
                            } else if (em_res.length == 0) {
                                insert_booking()
                            } else {
                                return res.status(202).json({ statusCode: 202, message: "Email Id Already Exists" });
                            }
                        })
                    } else {
                        insert_booking()
                    }


                    async function insert_booking() {

                        let profile_url = 0;

                        if (!profile) {
                            profile_url = req.body.profile || 0
                        } else {
                            try {
                                profile_url = await uploadImage.uploadProfilePictureToS3Bucket(
                                    bucket_name, folderName, `${f_name}${timestamp}${profile[0].originalname}`, profile[0]
                                );
                                console.log(profile_url);  // Log the URL
                            } catch (error) {
                                console.error("Error uploading profile picture: ", error);
                            }
                        }

                        var sql3 = "INSERT INTO bookings (first_name,last_name,joining_date,amount,hostel_id,phone_number,email_id,address,created_by,profile, area,landmark,pin_code,city,state) VALUES (?)";
                        var params = [f_name, l_name, joining_date, amount, hostel_id, mob_no, email_id, address, created_by, profile_url, area, landmark, pin_code, city, state]

                        connection.query(sql3, [params], function (err, ins_data) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Add Booking Details", reason: err.message });
                            } else {
                                return res.status(200).json({ statusCode: 200, message: "Booking Added Successfully!" })
                            }
                        })
                    }


                } else {
                    return res.status(203).json({ statusCode: 203, message: "Phone Number Already Exists" });
                }
            })
        } else {
            res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    }

}

function generateUserId(firstName, user_id) {
    const userIdPrefix = firstName.substring(0, 4).toUpperCase();
    const user_ids = user_id.toString().padStart(3, "0");
    const userId = userIdPrefix + user_ids;
    return userId;
}

function assign_booking(req, res) {

    var { id, floor, room, hostel_id, bed, join_date, ad_amount, rent_amount } = req.body;

    var created_by = req.user_details.id;

    if (!id || !floor || !room || !hostel_id || !bed || !join_date || !ad_amount || !rent_amount) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    var sql1 = "SELECT bo.*,hstl.Name AS hostel_name FROM bookings AS bo JOIN hosteldetails AS hstl ON hstl.id=bo.hostel_id WHERE bo.id=? AND bo.status=1 AND bo.hostel_id=?";
    connection.query(sql1, [id, hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Booking Details", reason: err.message });
        } else if (data.length != 0) {

            var booking_details = data[0];
            var mob_no = booking_details.phone_number;
            var email_id = booking_details.email_id || 'NA';

            var area = booking_details.area;
            var landmark = booking_details.landmark;
            var pincode = booking_details.pin_code;
            var city = booking_details.city;
            var state = booking_details.state;

            if (email_id != 'NA') {

                var sql3 = "SELECT * FROM hostel WHERE Email=? AND isActive=1 AND Hostel_Id=?";
                connection.query(sql3, [email_id, hostel_id], function (err, em_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Email Details", reason: err.message });
                    } else if (em_data.length != 0) {
                        return res.status(201).json({ statusCode: 201, message: "Email Already Exists" });
                    } else {
                        next_function();
                    }
                })
            } else {
                next_function();
            }

            function next_function() {

                var sql3 = "SELECT * FROM hostel WHERE Phone=? AND isActive=1 AND Hostel_Id=?";
                connection.query(sql3, [mob_no, hostel_id], function (err, ph_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Phone Details", reason: err.message });
                    } else if (ph_data.length == 0) {

                        var f_name = booking_details.first_name;
                        var l_name = booking_details.last_name;

                        const FirstNameInitial = f_name.charAt(0).toUpperCase();
                        var LastNameInitial2 = f_name.charAt(1).toUpperCase();
                        if (l_name) {
                            var LastNameInitial = l_name.charAt(0).toUpperCase();
                            var circle = FirstNameInitial + LastNameInitial;
                        } else {
                            var circle = FirstNameInitial + LastNameInitial2;
                        }

                        if (!l_name) {
                            var name = f_name;
                        } else {
                            var name = f_name + l_name;
                        }

                        var address = booking_details.address;
                        var hostel_name = booking_details.hostel_name;
                        var profile = booking_details.profile || 0;
                        var sql4 = "INSERT INTO hostel (Circle, Name, Phone, Email, Address,HostelName, Hostel_Id, Floor, Rooms, Bed, AdvanceAmount, RoomRent,paid_advance,pending_advance,created_by,joining_Date,profile,area,landmark,pincode,city,state) VALUES (?)";
                        var params = [circle, name, mob_no, email_id, address, hostel_name, hostel_id, floor, room, bed, ad_amount, rent_amount, 0, ad_amount, created_by, join_date, profile, area, landmark, pincode, city, state];
                        connection.query(sql4, [params], function (err, ins_data) {
                            if (err) {
                                console.log(err);
                                return res.status(201).json({ statusCode: 201, message: "Unable to Assign Checkin Details", reason: err.message });
                            } else {

                                var user_ids = ins_data.insertId;
                                const gen_user_id = generateUserId(f_name, user_ids);
                                console.log("mob_no", mob_no)

                                let mobilenumber = mob_no;

                                mobilenumber = mobilenumber.replace(/\D/g, '');

                                if (mobilenumber.startsWith('91') && mobilenumber.length === 12) {
                                    mobilenumber = `+${mobilenumber}`;
                                } else if (mobilenumber.length === 10) {
                                    mobilenumber = `+91${mobilenumber}`;
                                } else {
                                    throw new Error('Invalid mobile number format');
                                }
                                var sql5 = "UPDATE bookings SET status=0 WHERE id=" + id + ";UPDATE hostel SET User_Id='" + gen_user_id + "' WHERE ID=" + user_ids + ";UPDATE bed_details SET user_id=" + user_ids + ", isfilled=1 WHERE id=" + bed + "";
                                connection.query(sql5, function (err, up_res) {
                                    if (err) {
                                        return res.status(201).json({ statusCode: 201, message: "Unable to Remove Booking Details", reason: err.message });
                                    } else {
                                        sendTemplateMessage(
                                            mobilenumber,
                                            'customer_welcome_msg',
                                            [f_name, hostel_name] 
                                        );
                                        return res.status(200).json({ statusCode: 200, message: "Checkin Assigned Successfully" });
                                    }
                                })
                            }
                        })
                    } else {
                        return res.status(201).json({ statusCode: 201, message: "Mobile Number Already Exists" });
                    }
                })
            }
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Booking Details" });
        }
    })
}

function add_confirm_checkout(req, res) {

    const { id, hostel_id, checkout_date, advance_return, due_amount, comments, reinburse, reasons } = req.body;

    const created_by = req.user_details.id;

    var payment_id = req.body.payment_id;

    // Validate mandatory fields
    if (!id || !hostel_id || !checkout_date || !payment_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    if (Array.isArray(reasons) || reasons.length > 0) {

        for (let reson of reasons) {
            if (!reson.reason || !reson.amount) {
                return res.status(201).json({ statusCode: 201, message: "Missing Required Fields in Reason Details" });
            }
        }
    }


    const sql1 = `SELECT * FROM hostel WHERE ID = ? AND Hostel_Id = ? AND isActive = 1 AND CheckoutDate IS NOT NULL`;
    connection.query(sql1, [id, hostel_id], (err, hostelData) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to fetch hostel details", reason: err.message });
        }

        if (hostelData.length === 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
        }

        var new_hosdetails = hostelData[0]

        const advance_amount = hostelData[0].AdvanceAmount

        const bed_id = hostelData[0].Bed;

        // Handle non-reimbursement case
        if (!reinburse || reinburse === 0) {
            const sql2 = `SELECT * FROM invoicedetails WHERE hos_user_id = ? AND BalanceDue != 0 AND invoice_status = 1`;
            connection.query(sql2, [id], (err, invoiceData) => {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to fetch invoice details", reason: err.message });
                }

                if (invoiceData.length > 0) {
                    return res.status(201).json({ statusCode: 201, message: "Kindly pay due amounts before checkout" });
                }

                finalizeCheckout(id, bed_id, advance_return, comments, res);
            });
        } else {
            // Handle reimbursement case
            const sql3 = `SELECT SUM(BalanceDue) AS totalBalanceDue FROM invoicedetails WHERE hos_user_id = ? AND BalanceDue != 0 AND invoice_status = 1`;
            connection.query(sql3, [id], (err, result) => {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error fetching balance due", reason: err.message });
                }

                const totalBalanceDue = result[0]?.totalBalanceDue || 0;

                const reasonTotalAmount = reasons?.reduce((acc, item) => acc + Number(item.amount || 0), 0) || 0;

                var check_amount = Number(totalBalanceDue) + Number(reasonTotalAmount)

                if (Number(advance_amount) >= check_amount) {
                    processInvoicesAndFinalizeCheckout(id, totalBalanceDue, advance_return, created_by, checkout_date, bed_id, advance_return, comments, reasons, new_hosdetails, payment_id, hostel_id, res);
                } else {
                    return res.status(201).json({ statusCode: 201, message: "Advance Amount is Less than Total Balance Due" });
                }
            });
        }
    });
}

// Helper function to finalize checkout
function finalizeCheckout(id, bed_id, advance_return, comments, res) {
    const sql = `
        UPDATE hostel SET isActive = 0, return_advance = ?, checkout_comment = ? WHERE ID = ?;
        UPDATE bed_details SET user_id = 0, isfilled = 0 WHERE id = ?;
    `;
    connection.query(sql, [advance_return, comments, id, bed_id], (err) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to finalize checkout", reason: err.message });
        }
        res.status(200).json({ statusCode: 200, message: "Checkout added successfully!" });
    });
}

async function processInvoicesAndFinalizeCheckout(id, totalBalanceDue, roomRent, created_by, checkout_date, bed_id, advance_return, comments, reasons, new_hosdetails, payment_id, hostel_id, res) {

    const sql = `SELECT * FROM invoicedetails WHERE hos_user_id = ? AND BalanceDue != 0 AND invoice_status = 1`;
    connection.query(sql, [id], async (err, invoices) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to fetch invoices for processing", reason: err.message });
        }

        const reasonTotalAmount = reasons?.reduce((acc, item) => acc + Number(item.amount || 0), 0) || 0;
        const finalInvoiceAmount = Number(totalBalanceDue || 0) + reasonTotalAmount;

        var sql1 = "SELECT * FROM bankings WHERE id=? AND status=1";
        connection.query(sql1, [payment_id], async function (err, bank_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Get Bank Details", reason: err.message });
            }

            if (bank_data.length == 0) {
                return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" });
            }

            var bankamount = Number(bank_data[0].balance);

            var new_amount = bankamount - advance_return;

            if (bankamount >= advance_return) {

                if (invoices.length === 0) {

                    const receipt_no = await generateUniqueReceiptNumber();
                    const receiptAmount = finalInvoiceAmount > 0 ? finalInvoiceAmount : advance_return;

                    const insertReceiptSQL = `
                        INSERT INTO receipts (user_id, invoice_number, amount_received, payment_mode, reference_id, payment_date, created_by)
                        VALUES (?, ?, ?, ?, ?, ?, ?)
                    `;
                    const receiptParams = [id, '', advance_return, payment_id, receipt_no, checkout_date, created_by];

                    connection.query(insertReceiptSQL, receiptParams, (err, receipt_data) => {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Error inserting receipt", reason: err.message });
                        }

                        const receipt_id = receipt_data.insertId;

                        let sql4 = "INSERT INTO bank_transactions (bank_id, date, amount, `desc`, type, status, createdby, edit_id, hostel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                        connection.query(sql4, [payment_id, checkout_date, advance_return, 'Receipt', 2, 1, created_by, receipt_id, hostel_id], function (err) {
                            if (err) {
                                console.log("Insert Transactions Error", err);
                                return res.status(201).json({ statusCode: 201, message: "Error processing bank transaction" });
                            }

                            let sql5 = "UPDATE bankings SET balance=? WHERE id=?";
                            connection.query(sql5, [new_amount, payment_id], function (err) {
                                if (err) {
                                    console.log("Update Amount Error", err);
                                }
                            });
                        });

                        const handleDeductions = () => {
                            const insertValues = [];

                            if (Array.isArray(reasons) && reasons.length > 0) {
                                insertValues.push(...reasons.map(item => [item.reason, item.amount, id, created_by, receipt_id]));
                            }

                            if (totalBalanceDue) {
                                insertValues.push(["Outstanding Due", totalBalanceDue, id, created_by, receipt_id]);
                            }

                            if ((!Array.isArray(reasons) || reasons.length === 0) && !totalBalanceDue) {
                                insertValues.push(["Advance Return", advance_return, id, created_by, receipt_id]);
                            }

                            if (insertValues.length > 0) {
                                const insertQuery = `
                                    INSERT INTO checkout_deductions (reason, amount, user_id, created_by, receipt_id)
                                    VALUES ?
                                `;
                                connection.query(insertQuery, [insertValues], (err) => {
                                    if (err) {
                                        return res.status(201).json({ statusCode: 201, message: "Error inserting checkout deductions", reason: err.message });
                                    }
                                    finalizeCheckout(id, bed_id, advance_return, comments, res);
                                });
                            } else {
                                finalizeCheckout(id, bed_id, advance_return, comments, res);
                            }
                        };

                        connection.query("DELETE FROM checkout_deductions WHERE user_id = ?", [id], (err) => {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Error deleting previous reasons", reason: err.message });
                            }
                            handleDeductions();
                        });
                    });

                } else {
                    const queries = invoices.map((invoice) => {
                        const { BalanceDue, Invoices: invoiceId, id: inv_id, PaidAmount } = invoice;
                        const all_amount = Number(PaidAmount) + Number(BalanceDue);

                        return new Promise(async (resolve, reject) => {
                            try {
                                const receipt_no = await generateUniqueReceiptNumber();

                                const insertReceiptSQL = `
                                    INSERT INTO receipts (user_id, invoice_number, amount_received, payment_mode, reference_id, payment_date, created_by)
                                    VALUES (?, ?, ?, ?, ?, ?, ?)
                                `;
                                const receiptParams = [id, invoiceId, advance_return, payment_id, receipt_no, checkout_date, created_by];

                                connection.query(insertReceiptSQL, receiptParams, (err) => {
                                    if (err) return reject(err);

                                    const updateInvoiceSQL = `
                                        UPDATE invoicedetails
                                        SET PaidAmount = ?, BalanceDue = 0, Status = 'Paid'
                                        WHERE id = ?
                                    `;
                                    connection.query(updateInvoiceSQL, [all_amount, inv_id], (err) => {
                                        if (err) return reject(err);
                                        resolve();
                                    });
                                });
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });

                    Promise.all(queries)
                        .then(async () => {
                            const receipt_no = await generateUniqueReceiptNumber();
                            const insertReceiptSQL = `
                                INSERT INTO receipts (user_id, invoice_number, amount_received, payment_mode, reference_id, payment_date, created_by)
                                VALUES (?, ?, ?, ?, ?, ?, ?)
                            `;
                            const receiptParams = [id, 0, advance_return, payment_id, receipt_no, checkout_date, created_by];

                            connection.query(insertReceiptSQL, receiptParams, (err, receipt_data) => {
                                if (err) {
                                    return res.status(201).json({ statusCode: 201, message: "Error inserting final receipt", reason: err.message });
                                }

                                const receipt_id = receipt_data.insertId;

                                let sql4 = "INSERT INTO bank_transactions (bank_id, date, amount, `desc`, type, status, createdby, edit_id, hostel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                                connection.query(sql4, [payment_id, checkout_date, advance_return, 'Receipt', 2, 1, created_by, receipt_id, hostel_id], function (err) {
                                    if (err) {
                                        console.log("Insert Transactions Error", err);
                                        return res.status(201).json({ statusCode: 201, message: "Error processing bank transaction" });
                                    }

                                    let sql5 = "UPDATE bankings SET balance=? WHERE id=?";
                                    connection.query(sql5, [new_amount, payment_id], function (err) {
                                        if (err) {
                                            console.log("Update Amount Error", err);
                                        }
                                    });
                                });

                                const insertValues = [];

                                if (Array.isArray(reasons) && reasons.length > 0) {
                                    insertValues.push(...reasons.map(item => [item.reason, item.amount, id, created_by, receipt_id]));
                                }

                                if (totalBalanceDue) {
                                    insertValues.push(["Outstanding Due", totalBalanceDue, id, created_by, receipt_id]);
                                } else if (advance_return) {
                                    insertValues.push(["Advance Return", advance_return, id, created_by, receipt_id]);
                                }

                                const insertQuery = `
                                    INSERT INTO checkout_deductions (reason, amount, user_id, created_by, receipt_id)
                                    VALUES ?
                                `;

                                connection.query("DELETE FROM checkout_deductions WHERE user_id = ?", [id], (err) => {
                                    if (err) {
                                        return res.status(201).json({ statusCode: 201, message: "Error deleting previous reasons", reason: err.message });
                                    }

                                    if (insertValues.length > 0) {
                                        connection.query(insertQuery, [insertValues], (err) => {
                                            if (err) {
                                                return res.status(201).json({ statusCode: 201, message: "Error inserting checkout deductions", reason: err.message });
                                            }
                                            finalizeCheckout(id, bed_id, advance_return, comments, res);
                                        });
                                    } else {
                                        finalizeCheckout(id, bed_id, advance_return, comments, res);
                                    }
                                });
                            });
                        })
                        .catch((err) => {
                            return res.status(201).json({ statusCode: 201, message: "Error processing previous invoices", reason: err.message });
                        });
                }

            } else {
                return res.status(201).json({ statusCode: 201, message: "Insufficient Bank Balance" });
            }

        })

        // CASE: No previous pending invoices

    });
}

const generateUniqueReceiptNumber = () => {
    return new Promise((resolve, reject) => {
        const tryGenerate = () => {
            const receipt_number = crypto.randomBytes(5).toString("hex").toUpperCase();
            connection.query("SELECT COUNT(*) as count FROM receipts WHERE reference_id = ?", [receipt_number], (err, result) => {
                if (err) return reject(err);
                if (result[0].count > 0) {
                    tryGenerate();
                } else {
                    resolve(receipt_number);
                }
            });
        };
        tryGenerate();
    });
};

function upload_doc(req, res) {

    const file1 = req.files && req.files['file1'] ? req.files['file1'][0] : null;
    const file1Name = file1 ? file1.originalname : null;
    const bodyFile1 = req.body['file1'];
    const user_id = req.body.user_id;
    const type = req.body.type;

    // Validate required fields
    if (!user_id || !type) {
        return res.status(201).json({ statusCode: 201, message: "Missing User Details" });
    }

    if (!file1 && !bodyFile1) {
        return res.status(201).json({ statusCode: 201, message: "No files or file URLs provided in the payload" });
    }

    var bucket_name = process.env.AWS_BUCKET_NAME;
    const folderName = "customer/uploaded_docs/";
    const timestamp = Date.now();

    // Fetch user details
    const sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
    connection.query(sql1, [user_id], async function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error fetching user details", reason: err.message });
        }

        if (data.length === 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
        }

        const existingFile = type === 'doc1' ? data[0].doc1 : data[0].doc2;

        // Extract the file name from the existing URL
        const existingFileName = existingFile ? decodeURIComponent(existingFile.split('/').pop()) : null;

        // Extract the base names for comparison
        const existingBaseName = existingFileName ? existingFileName.split('_').pop() : null;
        const currentBaseName = file1Name ? file1Name.split('_').pop() : null;

        if (existingBaseName === currentBaseName) {
            return res.status(201).json({ statusCode: 201, message: "Duplicate file: The same file is already uploaded." });
        }

        console.log("Existing File Name:", existingFileName);
        console.log("Current File Name:", file1Name);

        // if (existingFileName === file1Name) {
        //     return res.status(201).json({ statusCode: 201, message: "Duplicate file: The same file is already uploaded." });
        // }
        const un_userid = data[0].User_Id;

        try {
            const file_url = await uploadImage.uploadProfilePictureToS3Bucket(
                bucket_name,
                folderName,
                `${un_userid}_${timestamp}_${file1Name}`, file1);

            // Update the database with the new file URL
            const sql2 = `UPDATE hostel SET ${type}=? WHERE id=?`;
            connection.query(sql2, [file_url, user_id], function (err, up_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error updating document details", reason: err.message });
                }
                return res.status(200).json({ statusCode: 200, message: "Document successfully updated!" });
            });
        } catch (error) {
            return res.status(201).json({ statusCode: 201, message: error.message });
        }
    });
}

function delete_user(req, res) {

    var user_id = req.body.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[4] && role_permissions[4].per_delete == 1)) {

        if (!user_id) {
            return res.status(201).json({ statusCode: 201, message: "Missing User Id" })
        }

        var sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1;";
        connection.query(sql1, [user_id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Get User Details", reason: err.message })
            }

            if (data.length == 0) {
                return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
            }

            var floor_id = data[0].Floor;

            if (floor_id == "undefined") {

                var sql2 = "UPDATE hostel SET isActive=0 WHERE ID=?";
                connection.query(sql2, [user_id], function (err, data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error to Delete User Details", reason: err.message })
                    }
                    return res.status(200).json({ statusCode: 200, message: "User Deleted Successfully!" })
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "In this User Not Delete Option, Use Checkout Option" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function edit_customer_reading(req, res) {

    var { id, amount, unit } = req.body;

    if (!id || !amount || !unit) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }
    var sql1 = "SELECT * FROM customer_eb_amount WHERE id=? AND status=1";
    connection.query(sql1, [id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get User Details" })
        }

        if (data.length == 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid Reading Details" })
        }

        var sql2 = "UPDATE customer_eb_amount SET amount=?,unit=? WHERE id=?";
        connection.query(sql2, [amount, unit, id], function (err, up_res) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Update Reading Details" })
            }

            return res.status(200).json({ statusCode: 200, message: "Successfully Updated Customer Readings" })
        })

    })

}

function delete_reading(req, res) {

    var id = req.body.id;

    if (!id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }
    var sql1 = "SELECT * FROM customer_eb_amount WHERE id=? AND status=1";
    connection.query(sql1, [id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get User Details" })
        }

        if (data.length == 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid Reading Details" })
        }

        var sql2 = "UPDATE customer_eb_amount SET status=0 WHERE id=?";
        connection.query(sql2, [id], function (err, up_res) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Delete Reading Details" })
            }

            return res.status(200).json({ statusCode: 200, message: "Successfully Deleted Customer Readings" })
        })

    })

}

function recuring_bill_users(req, res) {

    var { hostel_id } = req.body;

    if (!hostel_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Hostel Details" })
    }

    var sql1 = "SELECT h.id,h.Name FROM hostel h WHERE h.Rooms != 'undefined' AND h.Floor != 'undefined' AND h.joining_date <= LAST_DAY(CURDATE()) AND (h.checkoutDate >= DATE_FORMAT(CURDATE(), '%Y-%m-01') OR h.checkoutDate IS NULL) AND h.isActive = 1 AND h.Hostel_Id = ? AND h.id NOT IN (SELECT user_id FROM recuring_inv_details WHERE status=1)"
    connection.query(sql1, hostel_id, function (err, data) {
        if (err) {
            console.log(err);
            return res.status(201).json({ statusCode: 201, message: "Error to Get User Details" })
        }

        return res.status(200).json({ statusCode: 200, message: "User Details", user_data: data })
    })
}

function edit_confirm_checkout(req, res) {

    var { payment_date, reasons, user_id, hostel_id, comments, payment_id } = req.body;

    var created_by = req.user_details.id;

    if (!user_id || !hostel_id || !payment_date || !payment_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }
    if (Array.isArray(reasons) && reasons.length > 0) {
        for (let reson of reasons) {
            if (!reson.reason || !reson.amount) {
                return res.status(201).json({ statusCode: 201, message: "Missing Required Fields in Reason Details" });
            }
        }
    }

    const sql1 = `SELECT * FROM hostel WHERE ID = ? AND Hostel_Id = ?`;
    connection.query(sql1, [user_id, hostel_id], (err, hostelData) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to fetch hostel details", reason: err.message });
        }

        if (hostelData.length === 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
        }

        var new_hosdetails = hostelData[0];

        const advance_amount = Number(new_hosdetails.AdvanceAmount);
        const totalAmount = Array.isArray(reasons) && reasons.length > 0 ? reasons.reduce((sum, r) => sum + Number(r.amount), 0) : 0;

        const advance_return = advance_amount - totalAmount;

        if (totalAmount > advance_amount) {
            return res.status(201).json({ statusCode: 201, message: "Advance Amount is Less than Total Balance Due" });
        }

        var sql2 = "SELECT id,payment_mode,amount_received FROM receipts WHERE user_id = ? AND (invoice_number IS NULL OR invoice_number = '' OR invoice_number = '0')";
        connection.query(sql2, user_id, function (err, receipt_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to fetch Receipt details", reason: err.message });
            } else if (receipt_data.length != 0) {

                var receipt_id = receipt_data[0].id;
                var old_bank_id = receipt_data[0].payment_mode;

                var last_amount = Number(receipt_data[0].amount_received);

                var sql22 = "SELECT * FROM bankings WHERE id=? AND status=1";
                connection.query(sql22, [payment_id], function (err, bank_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to fetch Bank details", reason: err.message });
                    }

                    if (bank_data.length == 0) {
                        return res.status(201).json({ statusCode: 201, message: "Invalid and Inactive Bank details", reason: err.message });
                    }

                    var currentbankamount = Number(bank_data[0].balance);
                    var check_amount = currentbankamount + last_amount;

                    if (check_amount >= Number(advance_return)) {

                        var new_amount = check_amount - Number(advance_return)

                        var sql5 = "UPDATE receipts SET amount_received=?,payment_date=?,payment_mode=? WHERE id=?";
                        connection.query(sql5, [advance_return, payment_date, payment_id, receipt_id], function (err, up_rec) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Update Receipt details", reason: err.message });
                            } else {

                                if (Array.isArray(reasons) && reasons.length > 0) {
                                    var sql3 = "DELETE FROM checkout_deductions WHERE receipt_id=?";
                                    connection.query(sql3, [receipt_id], function (err, del_receipt) {
                                        if (err) {
                                            return res.status(201).json({ statusCode: 201, message: "Unable to Delete Receipt details", reason: err.message });
                                        } else {
                                            const values = reasons.map(r => [r.reason, r.amount, user_id, receipt_id, created_by]);

                                            var sql4 = "INSERT INTO checkout_deductions (reason,amount,user_id,receipt_id,created_by) VALUES ?"
                                            connection.query(sql4, [values], function (err, ch_res) {
                                                if (err) {
                                                    return res.status(201).json({ statusCode: 201, message: "Unable to add Receipt details", reason: err.message });
                                                }


                                                updateHostel();
                                            });
                                        }
                                    });
                                } else {

                                    updateHostel();
                                }

                                function updateHostel() {

                                    if (payment_id) {
                                        // Adjust the old bank balance
                                        if (old_bank_id) {
                                            var sql5 = "UPDATE bankings SET balance = balance + ? WHERE id = ?";
                                            connection.query(sql5, [last_amount, old_bank_id], function (err) {
                                                if (err) console.log("Error updating old bank balance:", err);
                                            });
                                        }

                                        // Adjust the new bank balance
                                        if (payment_id) {
                                            var sql6 = "UPDATE bankings SET balance =  ? WHERE id = ?";
                                            connection.query(sql6, [new_amount, payment_id], function (err) {
                                                if (err) console.log("Error updating new bank balance:", err);
                                            });

                                            // Update the bank transactions
                                            var sql7 = "UPDATE bank_transactions SET amount = ?, date = ?, bank_id = ? WHERE edit_id = ?";
                                            connection.query(sql7, [advance_return, payment_date, payment_id, receipt_id], function (err) {
                                                if (err) console.log("Error updating bank transactions:", err);
                                            });
                                        }
                                    }

                                    var sql6 = "UPDATE hostel SET return_advance=?,checkout_comment=? WHERE ID=?";
                                    connection.query(sql6, [advance_return, comments, user_id], function (err, ch_res) {
                                        if (err) {
                                            return res.status(201).json({ statusCode: 201, message: "Unable to Update Advance details", reason: err.message });
                                        } else {
                                            return res.status(200).json({ message: "Changes saved successfully." });
                                        }
                                    });
                                }
                            }
                        })

                    } else {
                        return res.status(201).json({ statusCode: 201, message: "Insufficient Bank Balance" });
                    }

                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Not Found Receipt details", reason: err?.message || "No matching receipt" });
            }
        });
    });
}


module.exports = { add_booking, assign_booking, add_confirm_checkout, upload_doc, delete_user, edit_customer_reading, delete_reading, recuring_bill_users, edit_confirm_checkout }