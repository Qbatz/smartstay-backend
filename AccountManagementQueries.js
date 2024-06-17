const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// const conn = require('./config/connection');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const conn = require('./config/connection');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();


function uploadProfilePictureToS3Bucket(bucketName, folderName, fileName, fileData, callback) {
    const s3 = new AWS.S3();

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
            uploadProfilePictureToS3Bucket('smartstaydevs', 'Profile/', 'Profile' + reqBodyData.id + `${timestamp}` + '.jpg', reqBodyData.profile, (err, S3URL) => {
                if (err) {
                    console.error('Error uploading profile picture:', err);
                    response.status(500).json({ message: 'Error uploading profile picture' });
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

            connection.query(`UPDATE createaccount SET Name='${reqBodyData.name}', mobileNo='${reqBodyData.mobileNo}', email_Id='${reqBodyData.emailId}', Address='${reqBodyData.Address}', Country='${reqBodyData.Country}', City='${reqBodyData.City}', State='${reqBodyData.State}' WHERE id='${reqBodyData.id}'`, function (error, data) {
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

function createnewAccount(connection, reqBodyData, response) {

    if (reqBodyData.mobileNo && reqBodyData.emailId && reqBodyData.name && reqBodyData.password) {
        connection.query(
            `SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`,
            [reqBodyData.mobileNo, reqBodyData.emailId],
            async function (error, data) {
                if (error) {
                    console.error("Database error:", error);
                    response.status(500).json({ message: 'Database error' });
                    return;
                }

                if (data.length === 0) {

                    const hash_password = await bcrypt.hash(reqBodyData.password, 10);
                    connection.query(
                        `INSERT INTO createaccount (Name, mobileNo, email_Id, password) VALUES (?,?,?,?)`,
                        [reqBodyData.name, reqBodyData.mobileNo, reqBodyData.emailId, hash_password],
                        function (error, result) {
                            if (error) {
                                console.error("Database error:", error);
                                response.status(500).json({ message: 'Database error' });
                                return;
                            } else {
                                response.status(200).json({ message: 'Created Successfully', statusCode: 200 });
                            }
                        }
                    );
                } else {
                    const mobileExists = data.some(record => record.mobileNo === reqBodyData.mobileNo);
                    const emailExists = data.some(record => record.email_Id === reqBodyData.emailId);

                    if (mobileExists && emailExists) {
                        response.status(203).json({ message: 'Mobile Number and Email ID already exist', statusCode: 203 });
                    } else if (emailExists) {
                        response.status(201).json({ message: 'Email ID already exists', statusCode: 201 });
                    } else if (mobileExists) {
                        response.status(202).json({ message: 'Mobile Number already exists', statusCode: 202 });
                    }
                    // else {
                    //     response.status(400).json({ message: 'Missing Parameter' });
                    // }
                }
            }
        );
    } else {
        response.status(400).json({ message: 'Missing Parameter' });
    }
}

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign({ id: user.id, sub: user.id, username: user.Name }, process.env.JWT_SECRET, { expiresIn: '30m' });
};

// Login API
function loginAccount(connection, response, email_Id, password) {
    if (email_Id && password) {
        connection.query(`SELECT * FROM createaccount WHERE email_Id='${email_Id}'`, async function (error, data) {
            if (error) {
                console.error(error);
                response.status(500).json({ message: "Internal Server Error", statusCode: 500 });
            } else {
                if (data.length > 0) {
                    if (await bcrypt.compare(password, data[0].password) || data[0].password === password) {
                        const isEnable = data[0].isEnable;
                        const LoginId = data[0].id;
                        if (isEnable == 1) {
                            sendOtpForMail(connection, response, email_Id, LoginId);
                            response.status(203).json({ message: "OTP sent successfully", statusCode: 203 });
                        } else {
                            const token = generateToken(data[0]); // token is generated

                            // var temp = data[0];
                            // temp['token'] = token;
                            // data[0] = temp;
                            response.status(200).json({ message: "Login successful", statusCode: 200, token: token });
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
function get_user_details(connection, request, response) {
    const userDetails = request.user_details;
    var sql1 = "SELECT * FROM createaccount WHERE id=?;";
    connection.query(sql1, [userDetails.id], function (sel_err, sel_res) {
        if (sel_err) {
            response.status(201).json({ message: "Unable to Get User Details" });
        } else if (sel_res.length == 0) {
            response.status(201).json({ message: "Inavlid User Details" });
        } else {
            response.status(200).json({ message: "User Details", user_details: sel_res[0] });
        }
    })
}

function forgetPassword(connection, response, reqData) {
    if (reqData.email) {
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
        response.status(203).json({ message: "Missing Parameter" })
    }

}

function forgetPasswordOtpSend(connection, response, requestData) {
    // console.log("requestData", requestData.email)
    if (requestData.email) {
        connection.query(`SELECT * FROM createaccount WHERE email_id= \'${requestData.email}\'`, function (error, data) {
            if (data && data.length > 0) {
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
                                pass: 'afki rrvo jcke zjdt',
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
                            console.log(" otpData*", otpData);
                            console.log("otp send error", err);
                            if (err) {
                                response.status(203).json({ message: "Failed to send OTP to email", statusCode: 203 });
                            } else {
                                console.log('Email sent: ' + otp);
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
    }
    else {
        response.status(203).json({ message: "Missing parameter", statusCode: 203 });
    }

}

function sendOtpForMail(connection, response, Email_Id, LoginId) {
    if (Email_Id) {

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        console.log("otp is ", otp);
        connection.query(`UPDATE createaccount SET Otp= \'${otp}\' WHERE email_id=\'${Email_Id}\' AND id = \'${LoginId}\' `, function (error, data) {
            if (data) {
                const transporter = nodemailer.createTransport({
                    service: 'gmail',
                    auth: {
                        user: 'smartstay1234@gmail.com',
                        pass: 'afki rrvo jcke zjdt',
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
                    console.log(" otpData*", otpData);
                    console.log("otp send error", err);
                    if (err) {
                        response.status(203).json({ message: "Failed to send OTP to email", statusCode: 203 });
                    } else {
                        console.log('Email sent: ' + otp);
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
            const token = generateToken(resData[0]); // token is generated
            console.log(`token`, token);
            response.status(200).json({ message: "OTP Verified Success", statusCode: 200, token: token })
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

    console.log(user_id);

    if (!user_id) {
        response.status(201).json({ message: "Missing User Id" })
    }

    var sql1 = "SELECT * FROM hostel WHERE ID=?;";
    connection.query(sql1, [user_id], function (sel_err, sel_res) {
        if (sel_err) {
            response.status(201).json({ message: "Unable to get User Details", statusCode: 201 })
        } else if (sel_res.length != 0) {

            var sql2 = "SELECT 'advance' AS type, id, user_id, advance_amount AS amount, createdAt AS created_at FROM advance_amount_transactions WHERE user_id = 5 UNION ALL SELECT 'rent' AS type, id, user_id, amount, createdAt AS created_at FROM transactions WHERE user_id = 5 ORDER BY created_at DESC";
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



module.exports = { createAccountForLogin, loginAccount, forgetPassword, sendOtpForMail, sendResponseOtp, forgetPasswordOtpSend, createnewAccount, get_user_details, forgotpassword_otp_response, payment_history }
