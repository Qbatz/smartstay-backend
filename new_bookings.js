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

    console.log(profile);

    var { f_name, l_name, mob_no, email_id, address, joining_date, amount, hostel_id, id } = req.body;

    if (!f_name || !mob_no || !joining_date || !amount || !hostel_id || !email_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    if (id) {

        if (is_admin == 1 || (role_permissions[5] && role_permissions[5].per_edit == 1)) {

            var sql1 = "SELECT * FROM bookings WHERE phone_number=? AND status=1 AND hostel_id=? AND id !=?"
            connection.query(sql1, [mob_no, hostel_id, id], function (err, ph_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get Phone Details", reason: err.message });
                } else if (ph_data.length == 0) {

                    var sql2 = "SELECT * FROM bookings WHERE email_id=? AND status=1 AND hostel_id=? AND id !=?";
                    connection.query(sql2, [email_id, hostel_id, id], async function (err, em_res) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Get Email Details", reason: err.message });
                        } else if (em_res.length == 0) {

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
                        } else {
                            return res.status(202).json({ statusCode: 202, message: "Email Id Already Exists" });
                        }
                    })

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

                    var sql2 = "SELECT * FROM bookings WHERE email_id=? AND status=1 AND hostel_id=?";
                    connection.query(sql2, [email_id, hostel_id], async function (err, em_res) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Get Email Details", reason: err.message });
                        } else if (em_res.length == 0) {

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
                        } else {
                            return res.status(202).json({ statusCode: 202, message: "Email Id Already Exists" });
                        }
                    })

                } else {
                    return res.status(203).json({ statusCode: 203, message: "Phone Number Already Exists" });
                }
            })
        } else {
            res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    }

}

module.exports = { add_booking }