const bcrypt = require('bcrypt')
const connection = require('../config/connection')
const uploadImage = require('../components/upload_image')

exports.add_general_user = async (req, res) => {

    var { f_name, l_name, mob_no, email_id, address, password, id, area, landmark, pin_code, city, state } = req.body;

    var created_by = req.user_details.id;

    var user_type = req.user_details.user_type;

    if (user_type == 'admin') {

        var bucket_name = process.env.AWS_BUCKET_NAME;
        var folderName = "general_user_profile/";
        var timestamp = Date.now();

        const profile = req.files?.profile || 0;

        if (id) {

            if (!f_name || !email_id || !mob_no || !address || !area || !landmark || !pin_code || !city || !state ) {
                return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
            }

            var sql1 = "SELECT * FROM createaccount WHERE id=?";
            connection.query(sql1, [id], function (err, check_user_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                } else if (check_user_data.length != 0) {

                    // Check Email
                    var sql2 = "SELECT * FROM createaccount WHERE email_id=? AND user_status=1 AND id !=?";
                    connection.query(sql2, [email_id, id], function (err, mail_data) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                        } else if (mail_data.length == 0) {

                            // Check Phone Number
                            var sql3 = "SELECT * FROM createaccount WHERE mobileNo=? AND user_status=1 AND id !=?";
                            connection.query(sql3, [mob_no, id], async function (err, phone_data) {
                                if (err) {
                                    return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                                } else if (phone_data.length == 0) {

                                    let profile_url = 0;

                                    if (!profile) {
                                        profile_url = req.body.profile || 0
                                    } else {
                                        try {
                                            // Upload profile picture to S3 and get the URL
                                            profile_url = await uploadImage.uploadProfilePictureToS3Bucket(
                                                bucket_name, folderName, `${f_name}${timestamp}${profile[0].originalname}`, profile[0]
                                            );
                                            console.log(profile_url);  // Log the URL
                                        } catch (error) {
                                            console.error("Error uploading profile picture: ", error);
                                        }
                                    }

                                    // Update User Details
                                    var sql4 = "UPDATE createaccount SET first_name=?,last_name=?,mobileNo=?,email_Id=?,Address=?,profile=?,area=?,landmark=?,pin_code=?,city=?,state=? WHERE id=?";
                                    connection.query(sql4, [f_name, l_name, mob_no, email_id, address, profile_url,area,landmark,pin_code,city,state, id], function (err, up_res) {
                                        if (err) {
                                            return res.status(201).json({ statusCode: 201, message: "Unable to Update User Details" })
                                        } else {
                                            return res.status(200).json({ statusCode: 200, message: "Save Changes Successfully!" })
                                        }
                                    })
                                } else {
                                    return res.status(203).json({ statusCode: 203, message: "Mobile Number Already Exists" })
                                }
                            })
                        } else {
                            return res.status(202).json({ statusCode: 202, message: "Email Id Already Exists" })
                        }
                    })
                } else {
                    return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
                }
            })
        } else {

            if (!f_name || !email_id || !mob_no || !password || !address || !area || !landmark || !pin_code || !city || !state) {
                return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
            }

            const hash_password = await bcrypt.hash(password, 10);

            var sql1 = "SELECT * FROM createaccount WHERE email_Id=? AND user_status=1";
            connection.query(sql1, [email_id], function (err, check_email) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                } else if (check_email.length == 0) {

                    var sql2 = "SELECT * FROM createaccount WHERE mobileNo=? AND user_status=1"
                    connection.query(sql2, [mob_no], async function (err, phone_data) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                        } else if (phone_data.length == 0) {

                            let profile_url = 0;

                            if (!profile) {
                                profile_url = req.body.profile || 0
                            } else {
                                try {
                                    // Upload profile picture to S3 and get the URL
                                    profile_url = await uploadImage.uploadProfilePictureToS3Bucket(
                                        bucket_name, folderName, `${f_name}${timestamp}${profile[0].originalname}`, profile[0]
                                    );
                                    console.log(profile_url);  // Log the URL
                                } catch (error) {
                                    console.error("Error uploading profile picture: ", error);
                                }
                            }

                            var sql2 = "INSERT INTO createaccount (first_name,last_name,mobileNo,email_Id,password,user_type,Address,profile,user_status,createdby,area,landmark,pin_code,city,state) VALUES (?,?,?,?,?,?,?,?,1,?,?,?,?,?,?)";
                            connection.query(sql2, [f_name, l_name, mob_no, email_id, hash_password, 'agent', address, profile_url, created_by,area,landmark,pin_code,city,state], function (err, ins_res) {
                                if (err) {
                                    return res.status(201).json({ statusCode: 201, message: "Unable to Add User Details" })
                                } else {
                                    return res.status(200).json({ statusCode: 200, message: "General User created successfully!" })
                                }
                            })
                        } else {
                            return res.status(203).json({ statusCode: 203, message: "Mobile Number Already Exists" })
                        }
                    })
                } else {
                    return res.status(202).json({ statusCode: 202, message: "Email Id Already Exists" })
                }
            })
        }
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

exports.all_general_user = (req, res) => {

    var created_by = req.user_details.id;
    var user_type = req.user_details.user_type;

    if (user_type == 'admin') {

        var sql1 = "SELECT id,first_name,last_name,mobileNo,email_Id,Address,profile,user_status,createdby FROM createaccount WHERE (createdby=? OR id=?) AND user_status=1";
        connection.query(sql1, [created_by, created_by], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
            } else {
                return res.status(200).json({ statusCode: 200, message: "General User Details", general_users: data })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

exports.change_password = (req, res) => {

    var { new_pass, cn_pass, id } = req.body;
    var created_by = req.user_details.id;
    var user_type = req.user_details.user_type;

    if (user_type == 'admin') {

        if (!new_pass || !cn_pass || !id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
        }

        if (new_pass == cn_pass) {

            var sql1 = "SELECT * FROM createaccount WHERE id=?";
            connection.query(sql1, [id], async (err, data) => {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                } else if (data.length != 0) {

                    const hash_password = await bcrypt.hash(new_pass, 10);

                    // Update query
                    var sql2 = "UPDATE createaccount SET password=? WHERE id=?";
                    connection.query(sql2, [hash_password, id], function (err, up_data) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Update New Password" })
                        } else {
                            return res.status(200).json({ statusCode: 200, message: "Password Changed Successfully !" })
                        }
                    })
                } else {
                    return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
                }
            })

        } else {
            return res.status(201).json({ statusCode: 201, message: "Password and Confirm Password Does Not Match" });
        }
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

exports.delete_general_user = (req, res) => {

    var id = req.body.id;

    var user_type = req.user_details.user_type;

    if (user_type == 'admin') {

        if (!id) {
            return res.status(201).json({ statusCode: 201, message: "Missing User Id" });
        }

        var sql1 = "SELECT * FROM createaccount WHERE id=?";
        connection.query(sql1, [id], function (err, check_user_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
            } else if (check_user_data.length != 0) {

                var user_type = check_user_data[0].user_type;

                if (user_type == 'admin') {
                    return res.status(201).json({ statusCode: 201, message: "Admin Data Not Deleted Options" })
                } else {

                    var sql2 = "UPDATE createaccount SET user_status=0 WHERE id=?";
                    connection.query(sql2, [id], function (err, up_res) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Delete User Details" })
                        } else {
                            return res.status(200).json({ statusCode: 200, message: "User Deleted Successfully !" })
                        }
                    })
                }
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
            }
        })

    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

exports.check_password = (req, res) => {

    var { id, password } = req.body;

    if (!id || !password) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var sql1 = "SELECT * FROM createaccount WHERE id=? AND user_status=1";
    connection.query(sql1, [id], async function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching User Details", reason: err.message })
        }

        if (data.length == 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
        }

        var old_pass = data[0].password;

        try {
            const isMatch = await bcrypt.compare(password, old_pass);
            if (isMatch) {
                return res.status(200).json({ statusCode: 200, message: "Password Matched!" });
            } else {
                return res.status(201).json({ statusCode: 201, message: "Password Does Not Matched" });
            }
        } catch (bcryptError) {
            return res.status(201).json({ statusCode: 201, message: "Error Verifying Password", reason: bcryptError.message });
        }
    })
}

exports.delete_eb_settings = (req, res) => {

    var { settings_id, hostel_id } = req.body

    if (!settings_id || !hostel_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var sql1 = "SELECT * FROM eb_settings WHERE id=? AND hostel_id=? AND status=1";
    connection.query(sql1, [settings_id, hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching Eb Details", reason: err.message })
        }

        if (data.length == 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid Eb Details" })
        }

        var sql2 = "UPDATE eb_settings SET status=0 WHERE id=?";
        connection.query(sql2, [settings_id], function (err, del_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Delete Eb Details", reason: err.message })
            }

            return res.status(200).json({ statusCode: 200, message: "Successfully Deleted Eb Details!" })
        })
    })
}