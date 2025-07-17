const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const moment = require('moment');
const pdf = require('html-pdf');
const phantomjs = require('phantomjs-prebuilt');

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const connection = require('./config/connection');
const uploadImage = require('./components/upload_image');
const apiResponse = require('./zoho_billing/api_response');
const { sendTemplateMessage } = require('./whatsappTemplate');


const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();


function uploadProfilePictureToS3Bucket(folderName, fileName, fileData, callback) {
    const s3 = new AWS.S3();

    var bucketName = process.env.AWS_BUCKET_NAME

    const params = {
        Bucket: bucketName,
        Key: folderName + fileName,
        Body: fileData.buffer,
        ACL: 'public-read'
    };

    s3.upload(params, (err, data) => {
        if (err) {
            console.error('Error uploading file to S3:', err);
            callback(err);
        } else {
            console.log('File uploaded successfully:', data.Location);
            callback(null, data.Location);
        }
    });
}

function createAccountForLogin(connection, reqBodyData, response) {

    if (reqBodyData.id != "" && reqBodyData.id != undefined) {

        if (reqBodyData.profile) {
            const timestamp = Date.now();
            uploadProfilePictureToS3Bucket('Profile/', 'Profile' + reqBodyData.id + `${timestamp}` + '.jpg', reqBodyData.profile, (err, S3URL) => {
                if (err) {
                    console.error('Error uploading profile picture:', err);
                    response.status(201).json({ message: 'Error uploading profile picture' });
                } else {
                    const query = `UPDATE createaccount SET profile='${S3URL}' WHERE id='${reqBodyData.id}'`;
                    connection.query(query, function (error, profileData) {
                        if (error) {
                            response.status(202).json({ message: 'Database error' });
                        } else {
                            response.status(200).json({ message: 'profile Updated successfully', statusCode: 200 });
                        }
                    });
                }
            });

        } else {

            connection.query(`UPDATE createaccount SET Name='${reqBodyData.name}', mobileNo='${reqBodyData.mobileNo}', email_Id='${reqBodyData.emailId}', Address='${reqBodyData.Address}' WHERE id='${reqBodyData.id}'`, function (error, data) {
                if (error) {
                    console.log("error", error);
                    response.status(201).json({ message: "No User Found" });
                } else {
                    response.status(200).json({ message: "Update Successfully" });
                    console.log("Success")
                }
            });
        }

    } else {
        response.status(201).json({ message: 'Missing Parameter' });
    }
}

function getKeyFromUrl(url) {
    const urlParts = url.split('/');
    const key = urlParts.slice(3).join('/'); // Get everything after the bucket name
    return key;
}

function update_account_details(request, response) {

    var { first_name, last_name, email_id, phone, address } = request.body;
    var user_id = request.user_details.id;
    var profile = request.file;

    // console.log(request.body);
    var is_admin = request.is_admin;
    var show_ids = request.show_ids;
    var role_permissions = request.role_permissions;

    if (!first_name || !email_id || !phone || !address) {
        response.status(201).json({ message: "Please Add Mandatory Details", statusCode: 201 });
    } else {

        if (is_admin == 1 || (role_permissions[17] && role_permissions[17].per_edit == 1)) {

            var sql1 = "SELECT * FROM createaccount WHERE id='" + user_id + "'";
            connection.query(sql1, async function (err, data) {
                if (err) {
                    response.status(201).json({ message: "Unable to Get Admin Details", statusCode: 201 });
                } else if (data.length != 0) {

                    var sql3 = "SELECT * FROM createaccount WHERE email_Id=? AND id !='" + user_id + "'"
                    connection.query(sql3, [email_id], function (err, email_data) {
                        if (err) {
                            response.status(201).json({ message: "Unable to Get Admin Details", statusCode: 201 });
                        } else if (email_data.length == 0) {

                            var sql4 = "SELECT * FROM createaccount WHERE mobileNo=? AND id !='" + user_id + "'"
                            connection.query(sql4, [phone], async function (err, mob_data) {
                                if (err) {
                                    response.status(201).json({ message: "Unable to Get Admin Details", statusCode: 201 });
                                } else if (mob_data.length == 0) {

                                    var old_profile = data[0].profile;

                                    // console.log(old_profile);

                                    if (profile) {
                                        try {
                                            const timestamp = Date.now();
                                            profile_url = await uploadImage.uploadProfilePictureToS3Bucket('Profile/', 'Profile' + user_id + timestamp + '.jpg', profile);

                                            if (old_profile != null && old_profile != undefined && old_profile != 0 && old_profile != '') {
                                                const old_profile_key = getKeyFromUrl(old_profile);
                                                var deleteResponse = await uploadImage.deleteImageFromS3Bucket(old_profile_key);
                                                console.log("Image deleted successfully:", deleteResponse);
                                            } else {
                                                console.error("Failed to extract key from URL:", old_profile);
                                            }
                                        } catch (err) {
                                            console.log(err);
                                            profile_url = 0;
                                        }
                                    } else {
                                        profile_url = 0;
                                    }

                                    if (!profile) {
                                        profile_url = request.body.profile || 0;
                                    }

                                    // console.log(profile_url);

                                    var sql2 = "UPDATE createaccount SET first_name=?,last_name=?,mobileNo=?,email_Id=?,Address=?,profile=? WHERE id='" + user_id + "'";
                                    connection.query(sql2, [first_name, last_name, phone, email_id, address, profile_url], function (err, up_data) {
                                        if (err) {
                                            response.status(201).json({ message: "Unable to Update Admin Details", statusCode: 201 });
                                        } else {
                                            response.status(200).json({ message: "Successfully Updated Admin Details", statusCode: 200 });
                                        }
                                    })
                                } else {
                                    response.status(201).json({ message: "Mobile Number Already Exists", statusCode: 201 });
                                }
                            })
                        } else {
                            response.status(201).json({ message: "Email Id Already Exists", statusCode: 201 });
                        }
                    })

                } else {
                    response.status(201).json({ message: "Invalid Admin Details", statusCode: 201 });
                }
            })
        } else {
            response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    }
}

// function createnewAccount(request, response) {

//     var reqBodyData = request.body;
//     if (reqBodyData.mobileNo && reqBodyData.emailId && reqBodyData.first_name && reqBodyData.password && reqBodyData.confirm_password) {

//         connection.query(
//             `SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`,
//             [reqBodyData.mobileNo, reqBodyData.emailId],
//             async function (error, data) {
//                 if (error) {
//                     console.error("Database error:", error);
//                     response.status(201).json({ message: 'Database error' });
//                     return;
//                 }

//                 if (data.length === 0) {

//                     var confirm_pass = reqBodyData.confirm_password;

//                     if (reqBodyData.password === confirm_pass) {

//                         const hash_password = await bcrypt.hash(reqBodyData.password, 10);

//                         // var apiEndpoint = "https://www.zohoapis.in/billing/v1/customers";
//                         // var method = "POST"
//                         // var inbut_body = {
//                         //     display_name: reqBodyData.first_name + ' ' + reqBodyData.last_name,
//                         //     first_name: reqBodyData.first_name,
//                         //     last_name: reqBodyData.last_name,
//                         //     email: reqBodyData.emailId,
//                         //      phone:reqBodyData.mobileNo
//                         // };

//                         // apiResponse(apiEndpoint, method, inbut_body).then(api_data => {
//                         //     console.log('API Response:', api_data);

//                         //     const customerId = api_data.customer.customer_id; // Adjust the path based on actual response structure
//                         //     console.log('Customer ID:', customerId)

//                         var customerId = 0;

//                         connection.query(
//                             `INSERT INTO createaccount (first_name,last_name, mobileNo, email_Id, password,customer_id) VALUES (?,?,?,?,?,?)`,
//                             [reqBodyData.first_name, reqBodyData.last_name, reqBodyData.mobileNo, reqBodyData.emailId, hash_password, customerId],
//                             function (error, result) {
//                                 if (error) {
//                                     console.error("Database error:", error);
//                                     response.status(201).json({ message: 'Database error' });
//                                     return;
//                                 } else {
//                                     response.status(200).json({ message: 'Created Successfully', statusCode: 200 });
//                                 }
//                             }
//                         );
//                         // })
//                         // .catch(error => {
//                         //     console.error('Error:', error)
//                         //     response.status(201).json({ message: error, statusCode: 201 });
//                         // })
//                     } else {
//                         response.status(210).json({ message: 'Password and Confirm Password Not Matched', statusCode: 210 });
//                     }

//                 } else {
//                     const mobileExists = data.some(record => record.mobileNo === reqBodyData.mobileNo);
//                     const emailExists = data.some(record => record.email_Id === reqBodyData.emailId);

//                     if (mobileExists && emailExists) {
//                         response.status(203).json({ message: 'Mobile Number and Email ID already exist', statusCode: 203 });
//                     } else if (emailExists) {
//                         response.status(201).json({ message: 'Email ID already exists', statusCode: 201 });
//                     } else if (mobileExists) {
//                         response.status(202).json({ message: 'Mobile Number already exists', statusCode: 202 });
//                     }
//                     // else {
//                     //     response.status(400).json({ message: 'Missing Parameter' });
//                     // }
//                 }
//             }
//         );
//     } else {
//         response.status(400).json({ message: 'Missing Parameter' });
//     }
// }


// function createnewAccount(request, response) {

//     var reqBodyData = request.body;
//     if (reqBodyData.mobileNo && reqBodyData.emailId && reqBodyData.first_name && reqBodyData.password && reqBodyData.confirm_password) {

//         connection.query(
//             `SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`,
//             [reqBodyData.mobileNo, reqBodyData.emailId],
//             async function (error, data) {
//                 if (error) {
//                     console.error("Database error:", error);
//                     response.status(201).json({ message: 'Database error' });
//                     return;
//                 }

//                 if (data.length === 0) {

//                     var confirm_pass = reqBodyData.confirm_password;
//                     var currentDate = new Date().toISOString().split('T')[0];

//                     if (reqBodyData.password === confirm_pass) {

//                         const hash_password = await bcrypt.hash(reqBodyData.password, 10);

//                         var apiEndpoint = 'https://www.zohoapis.in/billing/v1/subscriptions';
//                         var method = "POST";

//                         var inbut_body = {
//                             plan: {
//                                 plan_code: 'one_day'
//                             },
//                             customer: {
//                                 display_name: reqBodyData.first_name + ' ' + reqBodyData.last_name,
//                                 first_name: reqBodyData.first_name,
//                                 last_name: reqBodyData.last_name,
//                                 email: reqBodyData.emailId,
//                                 mobile: reqBodyData.mobileNo
//                             },
//                             start_date: currentDate,
//                             notes: "New User Subscribtion"
//                         };

//                         apiResponse(apiEndpoint, method, inbut_body).then(api_data => {
//                             console.log('API Response:', api_data);

//                             if (api_data.code == 0) {

//                                 var subscription_response = api_data.subscription;
//                                 var plan_code = reqBodyData.plan_code;
//                                 var customer_id = subscription_response.customer.customer_id;
//                                 var subscription_id = subscription_response.subscription_id;
//                                 var plan_duration = subscription_response.trial_remaining_days;

//                                 var sql13 = "INSERT INTO createaccount (first_name,last_name, mobileNo, email_Id, password,customer_id,subscription_id,plan_code,plan_status) VALUES (?,?,?,?,?,?,?,?,1)"
//                                 connection.query(sql13, [reqBodyData.first_name, reqBodyData.last_name, reqBodyData.mobileNo, reqBodyData.emailId, hash_password, customer_id, subscription_id, plan_code], function (error, result) {
//                                     if (error) {
//                                         console.log(error);
//                                         return response.status(201).json({ message: 'Database error' });
//                                     } else {
//                                         var user_id = result.insertId;

//                                         var sql2 = "INSERT INTO trial_plan_details (plan_code,user_id,customer_id,subscription_id,plan_status,plan_duration) VALUES (?,?,?,?,?,?)";
//                                         connection.query(sql2, [plan_code, user_id, customer_id, subscription_id, 1, plan_duration], (err, ins_data) => {
//                                             if (err) {
//                                                 console.log(err);
//                                                 return response.status(201).json({ message: "Unable to Add Subscribtion History", statusCode: 201 })
//                                             } else {
//                                                 return response.status(200).json({ message: 'New User Subscription Created Successfully', statusCode: 200 });
//                                             }
//                                         })
//                                     }
//                                 });
//                             } else {
//                                 response.status(201).json({ message: api_data.message, statusCode: 201 });
//                             }
//                         })
//                             .catch(error => {
//                                 console.error('Error:', error)
//                                 response.status(201).json({ message: error, statusCode: 201 });
//                             })
//                     } else {
//                         response.status(210).json({ message: 'Password and Confirm Password Not Matched', statusCode: 210 });
//                     }

//                 } else {
//                     const mobileExists = data.some(record => record.mobileNo === reqBodyData.mobileNo);
//                     const emailExists = data.some(record => record.email_Id === reqBodyData.emailId);

//                     if (mobileExists && emailExists) {
//                         response.status(203).json({ message: 'Mobile Number and Email ID already exist', statusCode: 203 });
//                     } else if (emailExists) {
//                         response.status(201).json({ message: 'Email ID already exists', statusCode: 201 });
//                     } else if (mobileExists) {
//                         response.status(202).json({ message: 'Mobile Number already exists', statusCode: 202 });
//                     }
//                     // else {
//                     //     response.status(400).json({ message: 'Missing Parameter' });
//                     // }
//                 }
//             }
//         );
//     } else {
//         response.status(400).json({ message: 'Missing Parameter' });
//     }
// }

function createnewAccount(request, response) {

    var reqBodyData = request.body;

    var reference_id = request.body.reference_id;

    let mobile_no = reqBodyData.mobileNo;

    // Remove any spaces or dashes
    mobile_no = mobile_no.replace(/\D/g, '');

    // If it starts with '91' and is 12 digits total
    if (mobile_no.startsWith('91') && mobile_no.length === 12) {
        mobile_no = `+${mobile_no}`;
    } else if (mobile_no.length === 10) {
        mobile_no = `+91${mobile_no}`;
    } else {
        throw new Error('Invalid mobile number format');
    }
    if (reqBodyData.mobileNo && reqBodyData.emailId && reqBodyData.first_name && reqBodyData.password && reqBodyData.confirm_password) {

        connection.query(`SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`,
            [reqBodyData.mobileNo, reqBodyData.emailId], async function (error, data) {
                if (error) {
                    console.error("Database error:", error);
                    return response.status(201).json({ message: 'Database error' });
                }

                if (data.length === 0) {

                    var confirm_pass = reqBodyData.confirm_password;
                    var currentDate = new Date();

                    var plan_code = 'one_day'

                    if (reqBodyData.password === confirm_pass) {

                        const hash_password = await bcrypt.hash(reqBodyData.password, 10);

                        var currentDate = new Date().toISOString().split('T')[0];

                        var apiEndpoint = 'https://www.zohoapis.in/billing/v1/subscriptions';
                        var method = "POST";

                        var last_name = reqBodyData.last_name || ''

                        var inbut_body = {
                            plan: {
                                plan_code: plan_code
                            },
                            customer: {
                                display_name: reqBodyData.first_name + ' ' + last_name,
                                first_name: reqBodyData.first_name,
                                last_name: last_name,
                                email: reqBodyData.emailId,
                                mobile: reqBodyData.mobileNo
                            },
                            start_date: currentDate,
                            notes: "New Trail Subscribtion"
                        };

                        apiResponse(apiEndpoint, method, inbut_body).then(api_data => {
                            console.log('API Response:', api_data);

                            if (api_data.code == 0) {

                                var subscription_response = api_data.subscription;
                                var customer_id = subscription_response.customer.customer_id;
                                var subscription_id = subscription_response.subscription_id;
                                var plan_duration = subscription_response.trial_remaining_days;
                                var plan_code = subscription_response.plan.plan_code;

                                // var futureDate = new Date(currentDate);
                                // futureDate.setDate(futureDate.getDate() + Number(plan_duration));
                                // var formattedFutureDate = futureDate?.toISOString().split('T')[0];

                                const today = new Date();
                                const planDuration = Number(plan_duration) || 0;
                                const futureDate = new Date(today.getTime() + planDuration * 24 * 60 * 60 * 1000);
                                const currentDate = today.toISOString().split('T')[0];
                                const formattedFutureDate = futureDate.toISOString().split('T')[0];

                                if (reference_id && reference_id != 0) {

                                    var sql3 = "SELECT * FROM referral_codes WHERE referral_code=? AND is_active=1";
                                    connection.query(sql3, [reference_id], function (err, ref_res) {
                                        if (err) {
                                            console.log("Error for Reference", err);
                                            return response.status(201).json({ message: 'Error to Get Reference Details' });
                                        } else if (ref_res.length != 0) {

                                            var full_name = reqBodyData.first_name + " " + reqBodyData.last_name
                                            var ref_id = ref_res[0].id;
                                            var logs = full_name + " Added for Receipt Id"

                                            var sql13 = "INSERT INTO createaccount (first_name,last_name, mobileNo, email_Id, password,customer_id,subscription_id,plan_code,plan_status,reference_id,is_credited) VALUES (?,?,?,?,?,?,?,?,1,?,0)"
                                            connection.query(sql13, [reqBodyData.first_name, reqBodyData.last_name, reqBodyData.mobileNo, reqBodyData.emailId, hash_password, customer_id, subscription_id, 'free_plan', ref_id], function (error, result) {
                                                if (error) {
                                                    console.log(error);
                                                    return response.status(201).json({ message: 'Database error' });
                                                } else {
                                                    var user_id = result.insertId;

                                                    var sql4 = "INSERT INTO wallet_logs (logs,ref_id,used_by,status) VALUES (?,?,?,?)";
                                                    connection.query(sql4, [logs, ref_id, user_id, 1], function (err, wall_data) {
                                                        if (err) {
                                                            console.log(error);
                                                        }
                                                    })
                                                    // return response.status(200).json({ message: 'New User Subscription Created Successfully', statusCode: 200 });

                                                    var sql12 = "INSERT INTO subscription_details (customer_id,user_id,plan_start,plan_end,amount,plan_type,plan_code,selected_hostels,status) VALUES ?";
                                                    var params = [customer_id, user_id, currentDate, futureDate, 0, 'trail', plan_code, 0, 1]
                                                    connection.query(sql12, params, function (err, ins_data) {
                                                        if (err) {
                                                            return response.status(201).json({ message: 'Error to Add Subscription Details' });
                                                        }

                                                        var sql4 = "INSERT INTO wallet (amount,user_id,is_active) VALUES (?,?,?)";
                                                        connection.query(sql4, [0, user_id, 1], function (err, wal_res) {
                                                            if (err) {
                                                                console.log("Unable to Add Wallet Details");
                                                            }
                                                            sendTemplateMessage(
                                                                mobile_no,
                                                                'welcome_signup_msg',
                                                                [reqBodyData.first_name]
                                                            );
                                                            return response.status(200).json({ message: 'New User Subscription Created Successfully', statusCode: 200 });
                                                        })
                                                    })
                                                }
                                            });

                                        } else {
                                            return response.status(201).json({ message: 'Invalid Reference Details' });
                                        }
                                    })

                                } else {

                                    var sql13 = "INSERT INTO createaccount (first_name,last_name, mobileNo, email_Id, password,customer_id,subscription_id,plan_code,plan_status) VALUES (?,?,?,?,?,?,?,?,1)"
                                    connection.query(sql13, [reqBodyData.first_name, reqBodyData.last_name, reqBodyData.mobileNo, reqBodyData.emailId, hash_password, customer_id, subscription_id, plan_code], function (error, result) {
                                        if (error) {
                                            console.log(error);
                                            return response.status(201).json({ message: 'Database error' });
                                        } else {
                                            var user_id = result.insertId;

                                            var sql12 = "INSERT INTO subscription_details (customer_id,user_id,plan_start,plan_end,amount,plan_type,plan_code,hostel_count,selected_hostels,status) VALUES (?)";
                                            var params = [customer_id, user_id, currentDate, formattedFutureDate, 0, 'trail', plan_code, 2, 0, 1]
                                            connection.query(sql12, [params], function (err, ins_data) {
                                                if (err) {
                                                    console.log(err);
                                                    return response.status(201).json({ message: 'Error to Add Subscription Details' });
                                                }

                                                var sql4 = "INSERT INTO wallet (amount,user_id,is_active) VALUES (?,?,?)";
                                                connection.query(sql4, [0, user_id, 1], function (err, wal_res) {
                                                    if (err) {
                                                        console.log("Unable to Add Wallet Details");
                                                    }
                                                    sendTemplateMessage(
                                                        mobile_no,
                                                        'welcome_signup_msg',
                                                        [reqBodyData.first_name]
                                                    );
                                                    return response.status(200).json({ message: 'New User Subscription Created Successfully', statusCode: 200 });
                                                })
                                            })
                                        }
                                    });
                                }

                            } else {
                                return response.status(210).json({ message: api_data, statusCode: 210 });
                            }
                        })
                    } else {
                        return response.status(201).json({ message: 'Password and Confirm Password Not Same' });
                    }
                    // }
                } else {
                    const mobileExists = data.some(record => Number(record.mobileNo) === Number(reqBodyData.mobileNo));

                    const emailExists = data.some(record => record.email_Id === reqBodyData.emailId);

                    if (mobileExists && emailExists) {
                        response.status(203).json({ message: 'Mobile Number and Email ID already exist', statusCode: 203 });
                    } else if (emailExists) {
                        response.status(201).json({ message: 'Email ID already exists', statusCode: 201 });
                    } else if (mobileExists) {
                        response.status(202).json({ message: 'Mobile Number already exists', statusCode: 202 });
                    }
                    else {
                        response.status(201).json({ message: 'Missing Parameter' });
                    }
                }
            });
    } else {
        response.status(201).json({ message: 'Missing Parameter' });
    }
}

// Generate JWT Token
const generateToken = (user, plan_details) => {
    return jwt.sign({ id: user.id, sub: user.id, user_type: user.user_type, username: user.Name, role_id: user.role_id, plan_code: plan_details.plan_code, plan_status: user.plan_status }, process.env.JWT_SECRET, { expiresIn: '30m' });
};

// Login API
function loginAccount(connection, response, email_Id, password) {
    if (email_Id && password) {
        connection.query(`SELECT * FROM createaccount WHERE email_Id='${email_Id}' AND user_status=1`, async function (error, data) {
            if (error) {
                console.error(error);
                response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
            } else {
                if (data.length > 0) {
                    if (await bcrypt.compare(password, data[0].password) || password == data[0].password) {
                        const isEnable = data[0].isEnable;
                        const LoginId = data[0].id;
                        if (isEnable == 1) {
                            sendOtpForMail(connection, response, email_Id, LoginId);
                            response.status(203).json({ message: "OTP sent successfully", statusCode: 203 });
                        } else {

                            var sql2 = "SELECT * FROM subscription_details WHERE user_id=? AND status=1 ORDER BY id DESC LIMIT 1 ";
                            connection.query(sql2, [LoginId], function (err, plan_data) {
                                if (err) {
                                    return response.status(201).json({ message: "Error to Get Plan Details", statusCode: 201 });
                                }

                                if (plan_data.length != 0) {
                                    var plan_details = plan_data[0]
                                    const token = generateToken(data[0], plan_details);
                                    return response.status(200).json({ message: "Login successful", statusCode: 200, token: token });
                                }

                                var plan_details = {
                                    plan_code: 'one_day',
                                }
                                const token = generateToken(data[0], plan_details);
                                return response.status(200).json({ message: "Login successful", statusCode: 200, token: token });
                            })
                        }
                    } else {
                        response.status(202).json({ message: "Enter Valid Password", statusCode: 202 });
                    }
                } else {
                    response.status(201).json({ message: "Enter Valid Email ID", statusCode: 201 });
                }
            }
        });
    } else {
        response.status(202).json({ message: "Missing parameter", statusCode: 202 });
    }
}

// Get User Details Based on Token

// function get_user_details(connection, request, response) {

//     const created_by = request.user_details.id;

//     var sql1 = "SELECT * FROM createaccount WHERE id = ?;";
//     connection.query(sql1, [created_by], function (sel_err, sel_res) {
//         if (sel_err) {
//             return response.status(201).json({ message: "Unable to Get User Details" });
//         } else if (sel_res.length > 0) {

//             var user_type = sel_res[0].user_type;
//             var role_id = sel_res[0].role_id;

//             const { password, createdat, ...filtered_user } = sel_res[0];

//             if (user_type === 'admin') {

//                 const sql2 = `SELECT * FROM subscription_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`;
//                 connection.query(sql2, [created_by], function (err, plan_data) {
//                     if (err) return response.status(500).json({ message: "Error fetching plan", statusCode: 500 });

//                     if (!plan_data.length) {
//                         return response.status(200).json({
//                             message: "User Details",
//                             statusCode: 200,
//                             user_details: filtered_user,
//                             is_owner: 1,
//                             role_permissions: [],
//                             plan_data: []
//                         });
//                     }

//                     const latestPlan = plan_data[0];
//                     let selectedHostels = [];
//                     try {
//                         selectedHostels = JSON.parse(latestPlan.selected_hostels);
//                         if (!Array.isArray(selectedHostels)) selectedHostels = [];
//                     } catch (e) {
//                         selectedHostels = [];
//                     }

//                     const sql3 = `SELECT hs.id AS hostel_id, hs.Name AS hostel_name,sd.plan_code, sd.plan_start, sd.plan_end, sd.status AS plan_status FROM hosteldetails hs LEFT JOIN (SELECT * FROM subscription_details WHERE status = 1 AND user_id = ?) sd ON hs.id = sd.hostel_id WHERE hs.created_By = ? AND hs.isActive = 1 GROUP BY hs.id`;
//                     connection.query(sql3, [created_by, created_by], function (err, hostel_data) {
//                         if (err) {
//                             console.log(err);
//                             return response.status(201).json({ message: "Error fetching hostel info", statusCode: 201 });
//                         }

//                         // Map to formatted structure
//                         const hostel_details = hostel_data.map(row => ({
//                             id: row.hostel_id,
//                             name: row.hostel_name || "",
//                             plan_start: row.plan_start || "",
//                             plan_end: row.plan_end || "",
//                             plan_status: row.plan_status || 0,
//                             plan_code: row.plan_code || ""
//                         }));

//                         latestPlan.hostel_details = hostel_details;

//                         return response.status(200).json({
//                             message: "User Details",
//                             statusCode: 200,
//                             user_details: filtered_user,
//                             is_owner: 1,
//                             role_permissions: [],
//                             plan_data: [latestPlan]
//                         });
//                     });
//                 });


//             } else {

//                 var sql2 = `SELECT rp.*, per.permission_name, ro.role_name FROM role_permissions AS rp JOIN permissions AS per ON rp.permission_id = per.id JOIN roles AS ro ON ro.id = rp.role_id WHERE rp.role_id = ?`;
//                 connection.query(sql2, [role_id], function (err, data) {
//                     if (err) {
//                         console.log(err);
//                         return response.status(201).json({ message: "Unable to Get Role Permissions" });
//                     } else {
//                         response.status(200).json({ message: "User Details", user_details: filtered_user, is_owner: 0, role_permissions: data });
//                     }
//                 });
//             }
//         } else {
//             response.status(201).json({ message: "Invalid User Details" });
//         }
//     });
// }




function get_user_details(connection, request, response) {
    const current_user_id = request.user_details.id;

    const sql1 = "SELECT * FROM createaccount WHERE id = ?";
    connection.query(sql1, [current_user_id], function (sel_err, sel_res) {
        if (sel_err) {
            return response.status(500).json({ message: "Unable to Get User Details" });
        }

        if (!sel_res.length) {
            return response.status(404).json({ message: "Invalid User Details" });
        }

        const user = sel_res[0];
        const { password, createdat, ...filtered_user } = user;
        const user_type = user.user_type;
        const role_id = user.role_id;

        if (user_type === 'admin') {
            // Admin user
            getPlanAndHostelDetails(connection, current_user_id, function (plan_data) {
                return response.status(200).json({
                    message: "User Details",
                    statusCode: 200,
                    user_details: filtered_user,
                    is_owner: 1,
                    role_permissions: [],
                    plan_data
                });
            });
        }


        // else{
        //      getPlanAndHostelDetails(connection, user.createdby, function (plan_data) {
        //         return response.status(200).json({
        //             message: "User Details",
        //             statusCode: 200,
        //             user_details: filtered_user,
        //             is_owner: 1,
        //             role_permissions: [],
        //             plan_data
        //         });
        //     });
        // }
    else {
            // Staff user — get role permissions and admin's plan data
            const role_sql = `
                SELECT rp.*, per.permission_name, ro.role_name 
                FROM role_permissions AS rp 
                JOIN permissions AS per ON rp.permission_id = per.id 
                JOIN roles AS ro ON ro.id = rp.role_id 
                WHERE rp.role_id = ?`;

            connection.query(role_sql, [role_id], function (err, roleData) {
                if (err) {
                    return response.status(500).json({ message: "Unable to Get Role Permissions" });
                }

                // Get admin_id for staff
                const getAdminSql = `SELECT createdby FROM createaccount WHERE id = ? LIMIT 1`;
                connection.query(getAdminSql, [current_user_id], function (adminErr, adminRes) {
                    
                    console.log("current_user_id",current_user_id)
                    console.log("getAdminSql",getAdminSql)
                    if (adminErr || !adminRes.length) {
                        console.log("Error fetching admin_id:", adminErr);
                        return response.status(200).json({
                            message: "User Details",
                            user_details: filtered_user,
                            is_owner: 0,
                            role_permissions: roleData,
                            plan_data: []
                        });
                    }
                    console.log("Admin ID for staff:", adminRes[0]?.createdby);

                    const admin_id = adminRes[0].createdby;

                    getPlanAndHostelDetails(connection, admin_id, function (plan_data) {
                        return response.status(200).json({
                            message: "User Details",
                            user_details: filtered_user,
                            is_owner: 0,
                            role_permissions: roleData,
                            plan_data
                        });
                    });
                });
            });
        }
    });
}

// 🔁 Reusable function for getting plan + hostel details
// function getPlanAndHostelDetails(connection, admin_id, callback) {
//     const sqlPlan = `SELECT * FROM subscription_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`;
//     connection.query(sqlPlan, [admin_id], function (err, planData) {
//         if (err || !planData.length) return callback([]);

//         const latestPlan = planData[0];

//         let selectedHostels = [];
//         try {
//             selectedHostels = JSON.parse(latestPlan.selected_hostels);
//             if (!Array.isArray(selectedHostels)) selectedHostels = [];
//         } catch (e) {
//             selectedHostels = [];
//         }

//         const sqlHostel = `SELECT hs.id AS hostel_id, hs.Name AS hostel_name, sd.plan_code, sd.plan_start, sd.plan_end, sd.status AS plan_status 
//                            FROM hosteldetails hs 
//                            LEFT JOIN (
//                                SELECT * FROM subscription_details 
//                                WHERE status = 1 AND user_id = ?
//                            ) sd ON hs.id = sd.hostel_id 
//                            WHERE hs.created_By = ? AND hs.isActive = 1 
//                            GROUP BY hs.id`;

//         connection.query(sqlHostel, [admin_id, admin_id], function (err, hostelData) {
//             if (err || !hostelData.length) {
//                 latestPlan.hostel_details = [];
//                 return callback([latestPlan]);
//             }

//             const hostel_details = hostelData.map(row => ({
//                 id: row.hostel_id,
//                 name: row.hostel_name || "",
//                 plan_start: row.plan_start || "",
//                 plan_end: row.plan_end || "",
//                 plan_status: row.plan_status || 0,
//                 plan_code: row.plan_code || ""
//             }));

//             latestPlan.hostel_details = hostel_details;
//             return callback([latestPlan]);
//         });
//     });
// }

function getPlanAndHostelDetails(connection, admin_id, callback) {
    const sqlPlan = `SELECT * FROM subscription_details WHERE user_id = ? ORDER BY id DESC LIMIT 1`;

    connection.query(sqlPlan, [admin_id], function (err, planData) {
        if (err || !planData.length) {
           
            return callback([]);
        }

        const latestPlan = planData[0];

        let selectedHostels = [];
        try {
            selectedHostels = JSON.parse(latestPlan.selected_hostels || '[]');
            if (!Array.isArray(selectedHostels)) selectedHostels = [];
        } catch (e) {
            console.log("Invalid selected_hostels JSON:", latestPlan.selected_hostels);
            selectedHostels = [];
        }

        const sqlHostel = `
            SELECT hs.id AS hostel_id, hs.Name AS hostel_name, 
                   sd.plan_code, sd.plan_start, sd.plan_end, sd.status AS plan_status 
            FROM hosteldetails hs 
            LEFT JOIN (
                SELECT * FROM subscription_details 
                WHERE status = 1 AND user_id = ?
            ) sd ON hs.id = sd.hostel_id 
            WHERE hs.created_By = ? AND hs.isActive = 1 
            GROUP BY hs.id`;

        connection.query(sqlHostel, [admin_id, admin_id], function (err, hostelData) {
            if (err) {
               
                latestPlan.hostel_details = [];
                return callback([latestPlan]);
            }

            const hostel_details = hostelData.map(row => ({
                id: row.hostel_id,
                name: row.hostel_name || "",
                plan_start: row.plan_start || "",
                plan_end: row.plan_end || "",
                plan_status: row.plan_status || 0,
                plan_code: row.plan_code || ""
            }));

            latestPlan.hostel_details = hostel_details;
           
            return callback([latestPlan]); 
        });
    });
}

function forgetPassword(connection, response, reqData) {

    if (reqData.email && reqData.NewPassword) {

        var confirm_password = reqData.confirm_password;

        var password = reqData.NewPassword;

        if (confirm_password === password) {
            connection.query(`SELECT * FROM createaccount WHERE email_id= \'${reqData.email}\'`, async function (error, data) {
                console.log("data for reset", data[0].Otp)

                const hash_password = await bcrypt.hash(reqData.NewPassword, 10);

                connection.query(`UPDATE createaccount SET password= \'${hash_password}\' WHERE email_id=\'${reqData.email}\' `, function (error, data) {
                    if ((data)) {
                        connection.query(`UPDATE createaccount SET Otp = 0 WHERE email_id=\'${reqData.email}\' `, function (error, resetData) {
                            if (resetData) {
                                response.status(200).json({ message: "New Password Update Successfully" })
                            } else {
                                response.status(201).json({ message: "Cannot Update NewPassowrd", statusCode: 201 })
                            }
                        })
                    }
                    else {
                        response.status(201).json({ message: "Cannot Update NewPassowrd", statusCode: 201 })
                    }
                })

            })
        } else {
            response.status(201).json({ message: "Password and Confirm Password Not Matched", statusCode: 201 })
        }
    } else {
        response.status(203).json({ message: "Missing Parameter" })
    }

}

function forgetPasswordOtpSend(connection, response, requestData) {
    // console.log("requestData", requestData.email)
    if (requestData.email) {
        connection.query(`SELECT * FROM createaccount WHERE email_id= \'${requestData.email}\'`, function (error, data) {
            if (error) {
                response.status(201).json({ message: "Unable to Get User Details", statusCode: 201 });
            } else if (data.length != 0) {

                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                console.log("otp is ", otp);

                const LoginId = data[0].id
                console.log("LoginId", LoginId)
                connection.query(`UPDATE createaccount SET Otp= \'${otp}\' WHERE email_id=\'${requestData.email}\' AND id = \' ${LoginId}\'  `, function (error, data) {
                    if (data) {
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: 'smartstay1234@gmail.com',
                                pass: 'yhud ljoo ynhl kszs',
                            },
                            tls: {
                                // do not fail on invalid certs
                                rejectUnauthorized: false,
                            },
                        });

                        const logoURL = 'https://smartstaydevs.s3.ap-south-1.amazonaws.com/Logo/Logo141717749724216.jpg'; // Replace with Smart Stay Logo

                        const htmlFilePath = path.join(__dirname, '/mail_templates', 'forgot_otp.html');

                        let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

                        htmlContent = htmlContent.replace('{{OTP}}', otp).replace('{{LOGO_URL}}', logoURL);

                        const mailOptions = {
                            from: 'smartstay1234@gmail.com',
                            to: requestData.email,
                            subject: 'OTP for Password Reset',
                            html: htmlContent
                        };
                        transporter.sendMail(mailOptions, function (err, otpData) {
                            // console.log(" otpData*", otpData);
                            // console.log("otp send error", err);
                            if (err) {
                                response.status(203).json({ message: "Failed to send OTP to email", statusCode: 203 });
                            } else {
                                // console.log('Email sent: ' + otp);
                                response.status(200).json({ message: "Otp send  Successfully", otp: otp });
                            }
                        });
                    } else {
                        response.status(201).json({ message: "No User Found" });
                    }
                });
            } else {
                response.status(201).json({ message: `${requestData.email} is doesn't exist`, statusCode: 201 });
            }
        });
    } else {
        response.status(203).json({ message: "Missing parameter", statusCode: 203 });
    }
}

function sendOtpForMail(connection, response, Email_Id, LoginId) {
    if (Email_Id) {

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        // console.log("otp is ", otp);
        connection.query(`UPDATE createaccount SET Otp= \'${otp}\' WHERE email_id=\'${Email_Id}\' AND id = \'${LoginId}\' `, function (error, data) {
            if (data) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'smartstay1234@gmail.com',
                        pass: 'yhud ljoo ynhl kszs',
                    },
                    tls: {
                        // do not fail on invalid certs
                        rejectUnauthorized: false,
                    },
                });

                const logoURL = 'https://smartstaydevs.s3.ap-south-1.amazonaws.com/Logo/Logo141717749724216.jpg'; // Replace with Smart Stay Logo

                const htmlFilePath = path.join(__dirname, '/mail_templates', 'otp_template.html');

                let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

                htmlContent = htmlContent.replace('{{OTP}}', otp).replace('{{LOGO_URL}}', logoURL);

                const mailOptions = {
                    from: 'smartstay1234@gmail.com',
                    to: Email_Id,
                    subject: 'OTP for Login Account',
                    html: htmlContent
                };
                transporter.sendMail(mailOptions, function (err, otpData) {
                    // console.log(" otpData*", otpData);
                    // console.log("otp send error", err);
                    if (err) {
                        response.status(203).json({ message: "Failed to send OTP to email", statusCode: 203 });
                    } else {
                        // console.log('Email sent: ' + otp);
                        response.status(200).json({ message: "Otp send  Successfully", otp: otp });
                    }
                });
            } else {
                response.status(201).json({ message: "No User Found" });
            }
        });

    } else {
        response.status(201).json({ message: `${Email_Id} is doesn't exist`, statusCode: 201 });
    }

}



function sendResponseOtp(connection, response, requestData) {
    connection.query(`SELECT * FROM createaccount WHERE email_id= \'${requestData.Email_Id}\' `, function (error, resData) {
        if (resData.length > 0 && resData[0].Otp == requestData.OTP) {

            var plan_code = resData[0].plan_code;
            var user_id = resData[0].id;

            if (plan_code == 'free_plan') {
                var sql2 = "SELECT * FROM trial_plan_details WHERE user_id=?";
            } else {
                var sql2 = "SELECT * FROM subscribtion_history WHERE customer_id=?";
            }
            connection.query(sql2, [user_id], function (err, Data) {
                if (err) {
                    response.status(201).json({ message: "Error to Get Plan Details", statusCode: 201 });
                } else if (Data.length != 0) {
                    var plan_details = Data[0]
                    const token = generateToken(resData[0], plan_details); // token is generated
                    response.status(200).json({ message: "OTP Verified Success", statusCode: 200, token: token })
                } else {
                    var plan_details = {
                        startdate: 0,
                        end_date: 0
                    }
                    const token = generateToken(resData[0], plan_details); // token is generated
                    response.status(200).json({ message: "OTP Verified Success", statusCode: 200, token: token })
                }
            })

            // const token = generateToken(resData[0]); // token is generated
            // console.log(`token`, token);
            // response.status(200).json({ message: "OTP Verified Success", statusCode: 200, token: token })
        } else {
            response.status(201).json({ message: "Enter Valid Otp", statusCode: 201 })
        }

    })
}

// Forgot Password Otp Response
function forgotpassword_otp_response(connection, response, requestData) {

    connection.query(`SELECT * FROM createaccount WHERE email_id= \'${requestData.Email_Id}\' `, function (error, resData) {
        if (resData.length > 0 && resData[0].Otp == requestData.OTP) {
            // const token = generateToken(resData[0]); // token is generated
            // console.log(`token`, token);
            response.status(200).json({ message: "OTP Verified Success", statusCode: 200 })
        } else {
            response.status(201).json({ message: "Enter Valid Otp", statusCode: 201 })
        }

    })
}

// Get Payment History

function payment_history(connection, response, request) {

    var user_id = request.body.user_id;

    // console.log(user_id);

    if (!user_id) {
        response.status(201).json({ message: "Missing User Id" })
    }

    var sql1 = "SELECT * FROM hostel WHERE ID=?;";
    connection.query(sql1, [user_id], function (sel_err, sel_res) {
        if (sel_err) {
            response.status(201).json({ message: "Unable to get User Details", statusCode: 201 })
        } else if (sel_res.length != 0) {

            var sql2 = "SELECT 'advance' AS type, id, user_id, advance_amount AS amount,payment_status AS status, createdAt AS created_at FROM advance_amount_transactions WHERE user_id =? UNION ALL SELECT 'rent' AS type, id, user_id, amount,status, createdAt AS created_at FROM transactions WHERE user_id =? ORDER BY created_at DESC";
            connection.query(sql2, [user_id, user_id], function (err, results) {
                if (err) {
                    response.status(201).json({ message: "Unable to get Payment History", statusCode: 201 });
                } else {
                    response.status(200).json({ message: "Payment History", statusCode: 200, history: results });
                }
            });


        } else {
            response.status(201).json({ message: "Inavlid User Details" })
        }
    })


}


// function transactionHistory(connection, response, request){
//     var createdBy = request.user_details.id;
// let query = `select * from transactions where created_by = ${createdBy}`
// connection.query(query,function(err,data){
//     if (err) {
//         response.status(201).json({ message: "Error while fetching transaction history", statusCode: 201 }) 
//     }
//     else{
//         if (data && data.length > 0) {

//         }
//         response.status(200).json({ data:data, statusCode: 200 })
//     }
// })
// }

function transactionHistory(connection, response, request) {
    var createdBy = request.user_details.id;
    var show_ids = request.show_ids;
    let total_credit = 0;
    let total_debit = 0;
    let total_balance = 0;
    let start_date = request.body?.start_date ? request.body.start_date : null;
    let end_date = request.body?.end_date ? request.body.end_date : null;
    // let query = `SELECT * FROM transactions WHERE created_by = ${createdBy} AND status = true`;
    let query1 = `SELECT trans.id,trans.user_id,trans.invoice_id,trans.amount,trans.payment_date,trans.payment_type,trans.status,trans.createdAt,trans.created_by,trans.action,
exp.category_id,exp.asset_id,exp.vendor_id,excat.category_Name,
hos.Hostel_Id, hos_details.Name as hostel_Name,hos_details.profile
FROM transactions trans Left Join expenses exp on exp.id = trans.invoice_id 
Left Join Expense_Category_Name excat on excat.id = exp.category_id
Left Join hostel hos on hos.ID = trans.user_id
Left Join hosteldetails hos_details on hos_details.id = hos.Hostel_Id
where trans.status = true and trans.created_by IN (${createdBy}) 
`
    // if (!start_date && !end_date) {
    //    query1 += `group by trans.invoice_id;` 
    // }

    if (start_date && !end_date) {
        const startDateRange = `${start_date} 00:00:00`;
        const endDateRange = `${start_date} 23:59:59`;
        query1 += `and trans.createdAt >=  '${startDateRange}' AND trans.createdAt <= '${endDateRange}'`
        // console.log("query1",query1);
    }


    if (start_date && end_date) {
        const startDateRange = `${start_date} 00:00:00`;
        const endDateRange = `${end_date} 23:59:59`;
        query1 += `and trans.createdAt >=  '${startDateRange}' AND trans.createdAt <= '${endDateRange}'`
        // query1 += `and trans.createdAt BETWEEN  ${startDateRange} AND ${endDateRange}`
    }

    connection.query(query1, function (err, data) {
        if (err) {
            console.log("err", err);

            response.status(201).json({ message: "Error while fetching transaction history", statusCode: 201 });
        } else {
            if (data && data.length > 0) {
                let balance = 0;
                let formattedData = data.map(item => {
                    // let credit = item.status === 1 ? item.amount : 0; 
                    // let debit = item.status === 0 ? item.amount : 0; 
                    // balance += credit - debit; 
                    // action
                    let credit = item.action === 1 ? item.amount : 0;
                    let debit = item.action === 2 ? item.amount : 0;
                    balance += credit - debit;
                    total_credit += credit;
                    total_debit += debit;

                    return {
                        id: item.id,
                        hostel_Name: item.hostel_Name,
                        hostel_Profile: item.profile,
                        date: formatDate(item.payment_date),
                        payment_type: item.payment_type,
                        category_Name: item.category_Name ? item.category_Name : null,
                        credit: credit,
                        debit: debit,
                        balance: balance,
                        createdAt: item.createdAt
                    };

                });
                if (formattedData.length === data.length) {
                    total_balance += total_credit - total_debit;
                    response.status(200).json({ data: formattedData, total_credit: total_credit, total_debit: total_debit, total_balance: total_balance, statusCode: 200 });
                }
            } else {
                response.status(200).json({ data: [], statusCode: 200 });
            }
        }
    });

}

// transactionHistoryPDF
function transactionHistoryPDF(connection, response, request) {
    var createdBy = request.user_details.id;
    let total_credit = 0;
    let total_debit = 0;
    let total_balance = 0;
    let start_date = request.body?.start_date ? request.body.start_date : null;
    let end_date = request.body?.end_date ? request.body.end_date : null;
    // let query = `SELECT * FROM transactions WHERE created_by = ${createdBy} AND status = true`;
    let query1 = `SELECT trans.id,trans.user_id,trans.invoice_id,trans.amount,trans.payment_date,trans.payment_type,trans.status,trans.createdAt,trans.created_by,trans.action,
exp.category_id,exp.asset_id,exp.vendor_id,excat.category_Name,
hos.Hostel_Id, hos_details.Name as hostel_Name,hos_details.profile
FROM transactions trans Left Join expenses exp on exp.id = trans.invoice_id 
Left Join Expense_Category_Name excat on excat.id = exp.category_id
Left Join hostel hos on hos.ID = trans.user_id
Left Join hosteldetails hos_details on hos_details.id = hos.Hostel_Id
where trans.status = true and trans.created_by = ${createdBy} 
`
    // if (!start_date && !end_date) {
    //    query1 += `group by trans.invoice_id;` 
    // }

    if (start_date && !end_date) {
        const startDateRange = `${start_date} 00:00:00`;
        const endDateRange = `${start_date} 23:59:59`;
        query1 += `and trans.createdAt >=  '${startDateRange}' AND trans.createdAt <= '${endDateRange}'`
        // console.log("query1",query1);
    }


    if (start_date && end_date) {
        const startDateRange = `${start_date} 00:00:00`;
        const endDateRange = `${end_date} 23:59:59`;
        query1 += `and trans.createdAt >=  '${startDateRange}' AND trans.createdAt <= '${endDateRange}'`
        // query1 += `and trans.createdAt BETWEEN  ${startDateRange} AND ${endDateRange}`
    }

    connection.query(query1, function (err, data) {
        if (err) {
            console.log("err", err);

            response.status(201).json({ message: "Error while fetching transaction history", statusCode: 201 });
        } else {
            if (data && data.length > 0) {
                let balance = 0;
                let formattedData = data.map(item => {
                    // let credit = item.status === 1 ? item.amount : 0; 
                    // let debit = item.status === 0 ? item.amount : 0; 
                    // balance += credit - debit; 
                    // action
                    let credit = item.action === 1 ? item.amount : 0;
                    let debit = item.action === 2 ? item.amount : 0;
                    balance += credit - debit;
                    total_credit += credit;
                    total_debit += debit;

                    return {
                        id: item.id,
                        hostel_Name: item.hostel_Name,
                        hostel_Profile: item.profile,
                        date: formatDate(item.payment_date),
                        payment_type: item.payment_type,
                        category_Name: item.category_Name ? item.category_Name : null,
                        credit: credit,
                        debit: debit,
                        balance: balance,
                        createdAt: item.createdAt
                    };

                });
                if (formattedData.length === data.length) {
                    total_balance += total_credit - total_debit;
                    const htmlFilePath = path.join(__dirname, 'mail_templates', 'transactionHistory.html');
                    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
                    let invoiceRows = '';
                    for (let i = 0; i < data.length; i++) {
                        // let purchase_date = moment(data[i].purchase_date).format('DD-MM-YYYY')
                        invoiceRows += `
                            <tr>
                                <td>${formatDate(data[i].payment_date)}</td>
                                <td>${data[i].Vendor_Name}</td>
                                <td>${data[i].asset_name}</td>
                                <td>${data[i].unit_amount}</td>
                                <td>${data[i].unit_count}</td>
                                <td></td>
                                <td>${data[i].purchase_amount}</td>
                            </tr>
                        `;
                    }
                    htmlContent = htmlContent
                        .replace('{{hostal_name}}', data[0].hostel_name)
                        .replace('{{Phone}}', data[0].hostel_phoneNo)
                        .replace('{{email}}', data[0].hostel_email)
                        .replace('{{city}}', data[0].hostel_address)
                        .replace('{{invoice_rows}}', invoiceRows)
                    // .replace('{{total_amount}}', total_amount)
                    const outputPath = path.join(__dirname, 'transactionHistory.pdf');

                    // Generate the PDF
                    pdf.create(htmlContent, { phantomPath: phantomjs.path }).toFile(outputPath, async (err, res) => {
                        if (err) {
                            console.error('Error generating PDF:', err);
                            return;
                        }

                        // console.log('PDF generated:', res.filename);
                        if (res.filename) {
                            console.log("res", res);
                            //upload to s3 bucket

                            let uploadedPDFs = 0;
                            let pdfInfo = [];
                            const fileContent = fs.readFileSync(res.filename);
                            const key = `transaction/${res.filename}`;
                            const BucketName = process.env.AWS_BUCKET_NAME;
                            const params = {
                                Bucket: BucketName,
                                Key: key,
                                Body: fileContent,
                                ContentType: 'application/pdf'
                            };

                            s3.upload(params, function (err, uploadData) {
                                if (err) {
                                    console.error("Error uploading PDF", err);
                                    response.status(201).json({ message: 'Error uploading PDF to S3' });
                                } else {
                                    // console.log("PDF uploaded successfully", uploadData.Location);
                                    uploadedPDFs++;

                                    const pdfInfoItem = {
                                        // user: user,
                                        url: uploadData.Location
                                    };
                                    pdfInfo.push(pdfInfoItem);

                                    if (pdfInfo.length > 0) {

                                        var pdf_url = []
                                        pdfInfo.forEach(pdf => {
                                            console.log(pdf.url);
                                            pdf_url.push(pdf.url)
                                        });

                                        if (pdf_url.length > 0) {
                                            response.status(200).json({ message: 'Insert PDF successfully', pdf_url: pdf_url[0] });
                                            deletePDfs(res.filename);
                                        } else {
                                            response.status(201).json({ message: 'Cannot Insert PDF to Database' });
                                        }

                                    }
                                }
                            });
                        }
                    });





                    response.status(200).json({ data: formattedData, total_credit: total_credit, total_debit: total_debit, total_balance: total_balance, statusCode: 200 });
                }
            } else {
                response.status(200).json({ data: [], statusCode: 200 });
            }
        }
    });

}



// format the date
function formatDate(dateString) {
    if (!dateString || dateString === "0000-00-00") return ""; // Handle invalid date
    let date = new Date(dateString);
    let day = date.getDate().toString().padStart(2, '0');
    let month = (date.getMonth() + 1).toString().padStart(2, '0');
    let year = date.getFullYear();
    return `${day}/${month}/${year}`;
}


function plan_details(req, res) {

    var customer_id = req.customer_id;
    var plan_code = req.plan_code;

    if (!plan_code || plan_code == 'free_plan') {

        var sql1 = "SELECT * FROM trial_plan_details WHERE plan_code=?";
        connection.query(sql1, function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Get Plan Details" })
            } else if (data.length == 0) {
                return res.status(200).json({ statusCode: 200, message: "Not Added Trail Plan", plan_details: [] })
            } else {
                return res.status(200).json({ statusCode: 200, message: "Trail Plan Detail", plan_details: data })
            }
        })
    } else {

        var sql1 = "SELECT * FROM manage_plan_details WHERE customer_id=? AND status != 2 ORDER BY id DESC LIMIT 1;"
        connection.query(sql1, [customer_id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Get Plan Details" })
            } else if (data.length == 0) {
                return res.status(200).json({ statusCode: 200, message: "Not Added Recent Plans", plan_details: [] })
            } else {
                return res.status(200).json({ statusCode: 200, message: "Plan Details", plan_details: data })
            }
        })
    }
}

module.exports = { createAccountForLogin, loginAccount, forgetPassword, sendOtpForMail, sendResponseOtp, forgetPasswordOtpSend, createnewAccount, get_user_details, forgotpassword_otp_response, payment_history, update_account_details, transactionHistory, transactionHistoryPDF, plan_details }
