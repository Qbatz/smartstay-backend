const nodemailer = require('nodemailer');




function createAccountForLogin(connection, reqBodyData, response) {
    if (reqBodyData.id) {
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
    else if (reqBodyData.mobileNo && reqBodyData.emailId) {
        connection.query(`SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`, function (error, data) {
            console.log("data for", data);

            if (data.length === 0) {
                connection.query(`INSERT INTO createaccount(Name, mobileNo, email_Id, password) VALUES ('${reqBodyData.name}', '${reqBodyData.mobileNo}', '${reqBodyData.emailId}', '${reqBodyData.password}')`, function (error, data) {
                    if (error) {
                        console.log("error", error);
                        response.status(500).json({ message: 'Database error' });
                    } else {
                        response.status(200).json({ message: 'Created Successfully', statusCode: 200 });
                    }
                });
            } else {
                const mobileExists = data.some(record => record.mobileNo === reqBodyData.mobileNo);
                const emailExists = data.some(record => record.email_Id === reqBodyData.emailId);

                if (mobileExists && emailExists) {
                    response.status(203).json({ message: 'Mobile Number and Email ID is already exist', statusCode: 203 });
                } else if (emailExists) {
                    response.status(201).json({ message: 'Email ID already exists', statusCode: 201 });
                } else if (mobileExists) {
                    response.status(202).json({ message: 'Mobile Number already exists', statusCode: 202 });
                }
            }
        });
    }

    else {
        response.status(201).json({ message: 'Missing Parameter' });
    }
}


function loginAccount(connection, response, email_Id, password) {
    if (email_Id && password) {
        connection.query(`SELECT * FROM createaccount WHERE email_Id='${email_Id}'`, function (error, data) {
            console.log('data', data, "error", error)
            if (error) {
                console.error(error);
                response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
            } else {
                if (data.length > 0) {
                    const storedPassword = data[0].password;
                    const isEnable = data[0].isEnable
                    const providedPassword = password;
                    if (isEnable == true) {

                    }
                    if (storedPassword === providedPassword) {
                        response.status(200).json({ message: "Login Successfully", statusCode: 200, Data: data });
                    } else {
                        response.status(201).json({ message: "Please Enter valid Password", statusCode: 201 });
                    }
                } else {
                    response.status(201).json({ message: "Please Enter valid Email ID", statusCode: 201 });
                }
            }
        });
    } else {
        response.status(202).json({ message: "Missing Parameter", statusCode: 202 });
    }

}


function forgetPassword(connection, response, reqData) {
    if (reqData.email) {
        connection.query(`SELECT * FROM createaccount WHERE email_id= \'${reqData.email}\'`, function (error, data) {
            console.log("data for reset", data[0].Otp)

            connection.query(`UPDATE createaccount SET password= \'${reqData.NewPassword}\' WHERE email_id=\'${reqData.email}\' `, function (error, data) {
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


function sendOtpForMail(connection, response, requestData) {
    if (requestData.email) {
        connection.query(`SELECT * FROM createaccount WHERE email_id= \'${requestData.email}\'`, function (error, data) {
            if (data && data.length > 0) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                console.log("otp is ", otp);
                connection.query(`UPDATE createaccount SET Otp= \'${otp}\' WHERE email_id=\'${requestData.email}\' `, function (error, data) {
                    if (data) {
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: requestData.email,
                                pass: 'afki rrvo jcke zjdt',
                            },

                        });
                        const mailOptions = {
                            from: requestData.email,
                            to: requestData.email,
                            subject: 'OTP for Password Reset',
                            text: `Your OTP for password reset is: ${otp}`
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
    } else {
        response.status(203).json({ message: "Missing parameter", statusCode: 203 });
    }

}




module.exports = { createAccountForLogin, loginAccount, forgetPassword, sendOtpForMail }