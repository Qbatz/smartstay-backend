const connection = require("./config/connection");
const uploadImage = require("./components/upload_image");

function add_booking(req, res) {

    var created_by = req.user_details.id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var bucket_name = "smartstaydevs";
    var folderName = "booking_user_profile/";
    var timestamp = Date.now();

    const profile = req.files?.profile || 0;
    var l_name = req.body.l_name;

    if (!l_name) {
        l_name = " "
    }

    var { f_name, mob_no, email_id, address, joining_date, amount, hostel_id, id } = req.body;

    if (!f_name || !mob_no || !joining_date || !amount || !hostel_id) {
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
                        var sql3 = "UPDATE bookings SET first_name=?,last_name=?,joining_date=?,amount=?,hostel_id=?,phone_number=?,email_id=?,address=?,profile=? WHERE id=?";
                        connection.query(sql3, [f_name, l_name, joining_date, amount, hostel_id, mob_no, email_id, address, profile_url, id], function (err, ins_data) {
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

                        var sql3 = "INSERT INTO bookings (first_name,last_name,joining_date,amount,hostel_id,phone_number,email_id,address,created_by,profile) VALUES (?)";
                        var params = [f_name, l_name, joining_date, amount, hostel_id, mob_no, email_id, address, created_by, profile_url]

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

                        var sql4 = "INSERT INTO hostel (Circle, Name, Phone, Email, Address,HostelName, Hostel_Id, Floor, Rooms, Bed, AdvanceAmount, RoomRent,paid_advance,pending_advance,created_by,joining_Date,profile) VALUES (?)";
                        var params = [circle, name, mob_no, email_id, address, hostel_name, hostel_id, floor, room, bed, ad_amount, rent_amount, 0, ad_amount, created_by, join_date, profile];
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

    const { id, hostel_id, checkout_date, advance_return, due_amount, comments, reinburse } = req.body;

    const created_by = req.user_details.id;

    // Validate mandatory fields
    if (!id || !hostel_id || !checkout_date || !advance_return) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    const sql1 = `SELECT * FROM hostel WHERE ID = ? AND Hostel_Id = ? AND isActive = 1 AND CheckoutDate IS NOT NULL`;
    connection.query(sql1, [id, hostel_id], (err, hostelData) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to fetch hostel details", reason: err.message });
        }

        if (hostelData.length === 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
        }

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

                if (advance_return >= totalBalanceDue) {
                    processInvoicesAndFinalizeCheckout(id, totalBalanceDue, advance_return, created_by, checkout_date, bed_id, advance_return, comments, res);
                } else {
                    return res.status(201).json({ statusCode: 201, message: "Room rent is less than total balance due" });
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
function processInvoicesAndFinalizeCheckout(id, totalBalanceDue, roomRent, created_by, checkout_date, bed_id, advance_return, comments, res) {

    const sql = `SELECT * FROM invoicedetails WHERE hos_user_id = ? AND BalanceDue != 0 AND invoice_status = 1`;
    connection.query(sql, [id], (err, invoices) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to fetch invoices for processing", reason: err.message });
        }

        const queries = invoices.map((invoice) => {

            const { BalanceDue, id: invoiceId, PaidAmount } = invoice;

            const all_amount = PaidAmount + totalBalanceDue

            const updateInvoice = `UPDATE invoicedetails SET BalanceDue = 0, PaidAmount = ?, Status = 'Success' WHERE id = ?`;
            const insertTransaction = `
                INSERT INTO transactions 
                (user_id, invoice_id, amount, status, created_by, payment_type, payment_date, description, action) 
                VALUES (?, ?, ?, 1, ?, 'CASH', ?, 'Invoice', 1)
            `;
            return new Promise((resolve, reject) => {
                connection.query(updateInvoice, [all_amount, invoiceId], (err) => {
                    if (err) return reject(err);

                    connection.query(insertTransaction, [id, invoiceId, BalanceDue, created_by, checkout_date], (err) => {
                        if (err) return reject(err);
                        resolve();
                    });
                });
            });
        });

        Promise.all(queries)
            .then(() => {
                finalizeCheckout(id, bed_id, advance_return, comments, res);
            })
            .catch((err) => {
                res.status(201).json({ statusCode: 201, message: "Error processing invoices", reason: err.message });
            });
    });
}

// function upload_doc(req, res) {

//     const file1 = req.files && req.files['file1'] ? req.files['file1'][0].originalname : null;

//     const bodyFile1 = req.body['file1'];

//     var user_id = req.body.user_id;
//     var type = req.body.type;

//     if (!user_id || !type) {
//         return res.status(201).json({ statusCode: 201, message: "Missing User Details" });
//     }

//     if (!file1 && !bodyFile1) {
//         return res.status(201).json({ statusCode: 201, message: "No files or file URLs provided in the payload" });
//     }

//     // if (file1) {
//     //     return res.status(201).json({ statusCode: 201, message: "Don't Upload Same Files" });
//     // }


//     var bucket_name = "smartstaydevs";
//     var folderName = "customer/uploaded_docs/";
//     var timestamp = Date.now();

//     var sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
//     connection.query(sql1, [user_id], async function (err, data) {
//         if (err) {
//             return res.status(201).json({ statusCode: 201, message: "Error to Get User Details", reason: err.message });
//         }

//         if (data.length == 0) {
//             return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
//         }

//         if (type == 'doc1') { // Aadhar
//             var a_detail = data[0].doc2;
//         } else {
//             var a_detail = data[0].doc1;
//         }

//         console.log(a_detail);

//         if (a_detail == file1) {
//             return res.status(201).json({ statusCode: 201, message: "Don't Upload Same Files" });
//         }

//         var un_userid = data[0].User_Id;

//         try {

//             var file_url = await uploadImage.uploadProfilePictureToS3Bucket(bucket_name, folderName, `${un_userid}_${timestamp}_${file1.originalname}`, file1);

//             var sql2 = "UPDATE hostel SET " + type + "=? WHERE id=?";
//             connection.query(sql2, [file_url, user_id], function (err, up_data) {
//                 if (err) {
//                     return res.status(201).json({ statusCode: 201, message: "Error to Update Documents Details", reason: err.message });
//                 }

//                 return res.status(200).json({ statusCode: 200, message: "Documents Successfully Updated!" });
//             })

//         } catch (error) {
//             return res.status(201).json({ statusCode: 201, message: error.message })
//         }
//     })



// }

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

    const bucket_name = "smartstaydevs";
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

module.exports = { add_booking, assign_booking, add_confirm_checkout, upload_doc, delete_user }