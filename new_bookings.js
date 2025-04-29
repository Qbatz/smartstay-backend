const connection = require("./config/connection");
const uploadImage = require("./components/upload_image");
const crypto = require('crypto');

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

                                var sql5 = "UPDATE bookings SET status=0 WHERE id=" + id + ";UPDATE hostel SET User_Id='" + gen_user_id + "' WHERE ID=" + user_ids + ";UPDATE bed_details SET user_id=" + user_ids + ", isfilled=1 WHERE id=" + bed + "";
                                connection.query(sql5, function (err, up_res) {
                                    if (err) {
                                        return res.status(201).json({ statusCode: 201, message: "Unable to Remove Booking Details", reason: err.message });
                                    } else {
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

    // Validate mandatory fields
    if (!id || !hostel_id || !checkout_date) {
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

                if (advance_amount >= totalBalanceDue) {
                    processInvoicesAndFinalizeCheckout(id, totalBalanceDue, advance_return, created_by, checkout_date, bed_id, advance_return, comments, reasons, new_hosdetails, res);
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

// Helper function to process invoices and finalize checkout
// function processInvoicesAndFinalizeCheckout(id, totalBalanceDue, roomRent, created_by, checkout_date, bed_id, advance_return, comments, reasons, new_hosdetails, res) {

//     const sql = `SELECT * FROM invoicedetails WHERE hos_user_id = ? AND BalanceDue != 0 AND invoice_status = 1`;
//     connection.query(sql, [id], (err, invoices) => {
//         if (err) {
//             return res.status(201).json({ statusCode: 201, message: "Unable to fetch invoices for processing", reason: err.message });
//         }


//         if (reasons && Array.isArray(reasons) && reasons.length > 0) {

//             var sql2 = "DELETE FROM checkout_deductions WHERE user_id=?";
//             connection.query(sql2, [id], function (err, data) {
//                 if (err) {
//                     return res.status(201).json({ statusCode: 201, message: "Error for Delete Previous Reasons", reason: err.message });
//                 }

//                 const insertValues = reasons.map(item => [item.reason, item.amount, id, created_by]);
//                 const insertQuery = "INSERT INTO checkout_deductions (reason, amount, user_id, created_by) VALUES ?";

//                 connection.query(insertQuery, [insertValues], function (err, result) {
//                     if (err) {
//                         return res.status(201).json({ statusCode: 201, message: "Error inserting reason data", reason: err.message });
//                     }
//                 });

//             })
//         }

//         // var sql3 = "INSERT INTO invoicedetails (Name,phoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,UserAddress,DueDate,Date,Invoices,Status,User_Id,Bed,BalanceDue,PaidAmount,action,invoice_type,hos_user_id,invoice_status) VALUES (?)";
//         // var params = [new_hosdetails.Name, new_hosdetails.Phone, new_hosdetails.Email, new_hosdetails.HostelName, new_hosdetails.Hostel_Id, new_hosdetails.Floor, new_hosdetails.Rooms,]

//         if (invoices.length == 0) {
//             finalizeCheckout(id, bed_id, advance_return, comments, res);

//         } else {

//             const queries = invoices.map((invoice) => {
//                 const { BalanceDue, Invoices: invoiceId, id: inv_id, PaidAmount } = invoice;
//                 const all_amount = Number(PaidAmount) + Number(BalanceDue);

//                 const generateUniqueReceiptNumber = () => {
//                     return new Promise((resolve, reject) => {
//                         const tryGenerate = () => {
//                             const receipt_number = crypto.randomBytes(5).toString("hex").toUpperCase(); // 10 char

//                             connection.query("SELECT COUNT(*) as count FROM receipts WHERE reference_id = ?", [receipt_number], (err, result) => {
//                                 if (err) return reject(err);

//                                 if (result[0].count > 0) {
//                                     tryGenerate(); // try again
//                                 } else {
//                                     resolve(receipt_number);
//                                 }
//                             });
//                         };

//                         tryGenerate();
//                     });
//                 };

//                 console.log(invoiceId);

//                 return new Promise(async (resolve, reject) => {
//                     try {
//                         const receipt_number = await generateUniqueReceiptNumber();

//                         const insertReceiptQuery = `
//                             INSERT INTO receipts 
//                             (user_id, reference_id, invoice_number, amount_received, payment_date, payment_mode, notes, created_by, bank_id) 
//                             VALUES (?, ?, ?, ?, ?, 'CASH', 'Checkout Payment', ?, 0)
//                         `;

//                         connection.query(insertReceiptQuery, [id, receipt_number, invoiceId, BalanceDue, checkout_date, created_by], (err) => {
//                             if (err) return reject(err);

//                             const updateInvoice = `UPDATE invoicedetails SET BalanceDue = 0, PaidAmount = ?, Status = 'Success' WHERE id = ?`;
//                             connection.query(updateInvoice, [all_amount, inv_id], (err) => {
//                                 if (err) return reject(err);

//                                 const insertTransaction = `
//                                     INSERT INTO transactions 
//                                     (user_id, invoice_id, amount, status, created_by, payment_type, payment_date, description, action) 
//                                     VALUES (?, ?, ?, 1, ?, 'CASH', ?, 'Invoice', 1)
//                                 `;

//                                 connection.query(insertTransaction, [id, invoiceId, BalanceDue, created_by, checkout_date], (err) => {
//                                     if (err) return reject(err);
//                                     resolve();
//                                 });
//                             });
//                         });
//                     } catch (err) {
//                         reject(err);
//                     }
//                 });
//             });


//             Promise.all(queries)
//                 .then(() => {
//                     finalizeCheckout(id, bed_id, advance_return, comments, res);
//                 })
//                 .catch((err) => {
//                     res.status(201).json({ statusCode: 201, message: "Error processing invoices", reason: err.message });
//                 });
//         }
//     });
// }

function processInvoicesAndFinalizeCheckout(id, totalBalanceDue, roomRent, created_by, checkout_date, bed_id, advance_return, comments, reasons, new_hosdetails, res) {
    const sql = `SELECT * FROM invoicedetails WHERE hos_user_id = ? AND BalanceDue != 0 AND invoice_status = 1`;
    connection.query(sql, [id], async (err, invoices) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to fetch invoices for processing", reason: err.message });
        }

        // Handle checkout_deductions
        if (reasons && Array.isArray(reasons) && reasons.length > 0) {
            const sql2 = "DELETE FROM checkout_deductions WHERE user_id=?";
            connection.query(sql2, [id], function (err) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error deleting previous reasons", reason: err.message });
                }

                const insertValues = reasons.map(item => [item.reason, item.amount, id, created_by]);
                const insertQuery = "INSERT INTO checkout_deductions (reason, amount, user_id, created_by) VALUES ?";
                connection.query(insertQuery, [insertValues], function (err) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error inserting reason data", reason: err.message });
                    }
                });
            });
        }

        // CASE 1: No pending invoices
        if (invoices.length === 0) {
            if (totalBalanceDue > 0 || (reasons && reasons.length > 0)) {

                const newInvoiceNumber = generateNewInvoiceNumber(id);

                let reasonTotalAmount = 0;
                if (reasons && reasons.length > 0) {
                    reasonTotalAmount = reasons.reduce((acc, item) => acc + Number(item.amount), 0);
                }

                const finalInvoiceAmount = totalBalanceDue + reasonTotalAmount;
                const currentDate = checkout_date;

                const insertInvoice = `
                    INSERT INTO invoicedetails
                    (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, DueDate, Date, Invoices, Status, User_Id, Bed, BalanceDue, PaidAmount, action, invoice_type, hos_user_id, invoice_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, 'Success', ?, ?, 0, ?, 'Checkout', ?, 1)
                `;

                const invoiceParams = [
                    new_hosdetails.Name,
                    new_hosdetails.Phone,
                    new_hosdetails.Email,
                    new_hosdetails.HostelName,
                    new_hosdetails.Hostel_Id,
                    new_hosdetails.Floor,
                    new_hosdetails.Rooms,
                    finalInvoiceAmount,
                    currentDate,
                    currentDate,
                    newInvoiceNumber,
                    id,
                    bed_id,
                    totalBalanceDue,
                    id
                ];

                connection.query(insertInvoice, invoiceParams, async (err, insert_details) => {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error inserting invoice", reason: err.message });
                    }

                    const inv_id = insert_details.insertId;

                    if (reasons && reasons.length > 0) {
                        reasons.forEach(item => {
                            const sql3 = "INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES (?, ?, ?, ?)";
                            connection.query(sql3, [item.reason, id, item.amount, inv_id], (err) => {
                                if (err) {
                                    console.log("Error inserting amenity details:", err);
                                }
                            });
                        });
                    } else {
                        const insertOutstandingDue = `INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES (?, ?, ?, ?)`;
                        connection.query(insertOutstandingDue, ["Outstanding Due", id, totalBalanceDue, inv_id], (err) => {
                            if (err) {
                                console.log("Error inserting Outstanding Due:", err);
                            }
                        });
                    }

                    const receipt_no = await generateUniqueReceiptNumber();
                    const insertReceipt = `
                            INSERT INTO receipts (user_id, invoice_id, amount, payment_mode, reference_id, date)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                    const params = [id, inv_id, totalBalanceDue, "Cash", receipt_no, new Date()];

                    connection.query(insertReceipt, params, (err) => {
                        if (err) {
                            console.log("Error inserting Receipt:", err);
                        }

                        finalizeCheckout(id, bed_id, advance_return, comments, res);
                    });
                });

            } else {
                // No dues, just create Advance Return Invoice
                const newInvoiceNumber = generateNewInvoiceNumber(id);
                const currentDate = checkout_date;

                const insertInvoice = `
                    INSERT INTO invoicedetails
                    (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, DueDate, Date, Invoices, Status, User_Id, Bed, BalanceDue, PaidAmount, action, invoice_type, hos_user_id, invoice_status)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, 'Success', ?, ?, 0, ?, 'Checkout', ?, 1)
                `;

                const invoiceParams = [
                    new_hosdetails.Name,
                    new_hosdetails.Phone,
                    new_hosdetails.Email,
                    new_hosdetails.HostelName,
                    new_hosdetails.Hostel_Id,
                    new_hosdetails.Floor,
                    new_hosdetails.Rooms,
                    advance_return,
                    currentDate,
                    currentDate,
                    newInvoiceNumber,
                    id,
                    bed_id,
                    advance_return,
                    id
                ];

                connection.query(insertInvoice, invoiceParams, async (err, insert_details) => {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error inserting invoice", reason: err.message });
                    }

                    const inv_id = insert_details.insertId;

                    const insertAdvanceReturn = `INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES (?, ?, ?, ?)`;
                    connection.query(insertAdvanceReturn, ["Advance Return", id, advance_return, inv_id], (err) => {
                        if (err) {
                            console.log("Error inserting Advance Return:", err);
                        }
                    });

                    const receipt_no = await generateUniqueReceiptNumber();
                    const insertReceipt = `
                            INSERT INTO receipts (user_id, invoice_id, amount, payment_mode, reference_id, date)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                    const params = [id, inv_id, advance_return, "Cash", receipt_no, new Date()];

                    connection.query(insertReceipt, params, (err) => {
                        if (err) {
                            console.log("Error inserting Receipt:", err);
                        }

                        finalizeCheckout(id, bed_id, advance_return, comments, res);
                    });

                    // finalizeCheckout(id, bed_id, advance_return, comments, res);
                });
            }
        }
        else {
            // CASE 2: Old invoices exist
            const queries = invoices.map((invoice) => {
                const { BalanceDue, Invoices: invoiceId, id: inv_id, PaidAmount } = invoice;
                const all_amount = Number(PaidAmount) + Number(BalanceDue);

                return new Promise(async (resolve, reject) => {
                    try {
                        const receipt_no = await generateUniqueReceiptNumber();
                        const insertReceipt = `
                            INSERT INTO receipts (user_id, invoice_id, amount, payment_mode, reference_id, date)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        const params = [id, inv_id, BalanceDue, "Cash", receipt_no, new Date()];

                        connection.query(insertReceipt, params, (err) => {
                            if (err) return reject(err);

                            // Update Invoice as Paid
                            const updateInvoice = `
                                UPDATE invoicedetails
                                SET PaidAmount = ?, BalanceDue = 0, Status = 'Paid', invoice_status = 0
                                WHERE id = ?
                            `;
                            connection.query(updateInvoice, [all_amount, inv_id], (err) => {
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
                .then(() => {
                    // After marking all old invoices as paid, insert new invoice for checkout
                    const newInvoiceNumber = generateNewInvoiceNumber(id);
                    let reasonTotalAmount = 0;
                    if (reasons && reasons.length > 0) {
                        reasonTotalAmount = reasons.reduce((acc, item) => acc + Number(item.amount), 0);
                    }
                    const finalInvoiceAmount = totalBalanceDue + reasonTotalAmount;
                    const currentDate = checkout_date;

                    const insertInvoice = `
                        INSERT INTO invoicedetails
                        (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, DueDate, Date, Invoices, Status, User_Id, Bed, BalanceDue, PaidAmount, action, invoice_type, hos_user_id, invoice_status)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', ?, ?, ?, 'Success', ?, ?, 0, ?, 'Checkout', ?, 1)
                    `;

                    const invoiceParams = [
                        new_hosdetails.Name,
                        new_hosdetails.Phone,
                        new_hosdetails.Email,
                        new_hosdetails.HostelName,
                        new_hosdetails.Hostel_Id,
                        new_hosdetails.Floor,
                        new_hosdetails.Rooms,
                        finalInvoiceAmount,
                        currentDate,
                        currentDate,
                        newInvoiceNumber,
                        id,
                        bed_id,
                        totalBalanceDue,
                        id
                    ];

                    connection.query(insertInvoice, invoiceParams, async (err, insert_details) => {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Error inserting invoice", reason: err.message });
                        }

                        const inv_id = insert_details.insertId;

                        if (reasons && reasons.length > 0) {
                            reasons.forEach(item => {
                                const sql3 = "INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES (?, ?, ?, ?)";
                                connection.query(sql3, [item.reason, id, item.amount, inv_id], (err) => {
                                    if (err) {
                                        console.log("Error inserting amenity details:", err);
                                    }
                                });
                            });
                        } else {
                            const insertOutstandingDue = `INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES (?, ?, ?, ?)`;
                            connection.query(insertOutstandingDue, ["Outstanding Due", id, totalBalanceDue, inv_id], (err) => {
                                if (err) {
                                    console.log("Error inserting Outstanding Due:", err);
                                }
                            });
                        }

                        const receipt_no = await generateUniqueReceiptNumber();
                        const insertReceipt = `
                            INSERT INTO receipts (user_id, invoice_id, amount, payment_mode, reference_id, date)
                            VALUES (?, ?, ?, ?, ?, ?)
                        `;
                        const params = [id, inv_id, totalBalanceDue, "Cash", receipt_no, new Date()];

                        connection.query(insertReceipt, params, (err) => {
                            if (err) {
                                console.log("Error inserting Receipt:", err);
                            }

                            finalizeCheckout(id, bed_id, advance_return, comments, res);
                        });

                        // finalizeCheckout(id, bed_id, advance_return, comments, res);
                    });

                })
                .catch((err) => {
                    return res.status(201).json({ statusCode: 201, message: "Error processing old invoices", reason: err.message });
                });
        }
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


function generateNewInvoiceNumber(hostel_id) {
    return new Promise((resolve, reject) => {
        var sql1 = "SELECT * FROM hosteldetails WHERE id=? AND isActive=1";
        connection.query(sql1, [hostel_id], function (err, hos_details) {
            if (err) return reject(new Error("Unable to Get Hostel Details"));

            if (hos_details.length > 0) {
                let prefix = (hos_details[0].prefix || hos_details[0].Name || "INV").replace(/\s+/g, '-');

                var sql2 = "SELECT * FROM invoicedetails WHERE Hostel_Id=? AND action != 'advance' ORDER BY id DESC LIMIT 1;";
                connection.query(sql2, [hostel_id], function (err, inv_data) {
                    if (err) return reject(new Error("Unable to Get Invoice Details"));

                    let newInvoiceNumber;

                    if (inv_data.length > 0) {
                        let lastInvoice = inv_data[0].Invoices || "";

                        let lastPrefix = lastInvoice.replace(/-\d+$/, '');
                        let lastSuffix = lastInvoice.match(/-(\d+)$/);
                        lastSuffix = lastSuffix ? lastSuffix[1] : "001";

                        if (prefix !== lastPrefix) {
                            newInvoiceNumber = `${prefix}-001`;
                        } else {
                            let newSuffix = (parseInt(lastSuffix) + 1).toString().padStart(3, '0');
                            newInvoiceNumber = `${prefix}-${newSuffix}`;
                        }
                    } else {
                        newInvoiceNumber = `${prefix}-001`;
                    }

                    resolve(newInvoiceNumber);
                });
            } else {
                reject(new Error("Invalid Hostel Details"));
            }
        });
    });
}


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

module.exports = { add_booking, assign_booking, add_confirm_checkout, upload_doc, delete_user, edit_customer_reading, delete_reading, recuring_bill_users }