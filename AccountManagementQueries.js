const nodemailer = require('nodemailer');
const AWS = require('aws-sdk');
require('dotenv').config();


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

    }

    //  else if (reqBodyData.mobileNo && reqBodyData.emailId) {
    //     connection.query(`SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`, function (error, data) {
    //         console.log("data for", data);

    //         if (data.length === 0) {
    //             connection.query(`INSERT INTO createaccount(Name, mobileNo, email_Id, password) VALUES ('${reqBodyData.name}', '${reqBodyData.mobileNo}', '${reqBodyData.emailId}', '${reqBodyData.password}')`, function (error, data) {
                   
    //                 if (error) {
    //                     console.log("error", error);
    //                     response.status(500).json({ message: 'Database error' });
    //                 } else {
    //                     response.status(200).json({ message: 'Created Successfully', statusCode: 200 });
    //                 }
    //             });
    //         } else {
    //             const mobileExists = data.some(record => record.mobileNo === reqBodyData.mobileNo);
    //             const emailExists = data.some(record => record.email_Id === reqBodyData.emailId);

    //             if (mobileExists && emailExists) {
    //                 response.status(203).json({ message: 'Mobile Number and Email ID is already exist', statusCode: 203 });
    //             } else if (emailExists) {
    //                 response.status(201).json({ message: 'Email ID already exists', statusCode: 201 });
    //             } else if (mobileExists) {
    //                 response.status(202).json({ message: 'Mobile Number already exists', statusCode: 202 });
    //             }
    //         }
    //     });
    // }

    else {
        response.status(201).json({ message: 'Missing Parameter' });
    }
}


function createnewAccount(connection, reqBodyData, response) {
   
    if (reqBodyData.mobileNo && reqBodyData.emailId && reqBodyData.name && reqBodyData.password) {
        connection.query(
            `SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`,
            [reqBodyData.mobileNo, reqBodyData.emailId],
            function (error, data) {
                if (error) {
                    console.error("Database error:", error);
                    response.status(500).json({ message: 'Database error' });
                    return;
                }

                if (data.length === 0) {
                    connection.query(
                        `INSERT INTO createaccount (Name, mobileNo, email_Id, password) VALUES ('${reqBodyData.name}', '${reqBodyData.mobileNo}', '${reqBodyData.emailId}', '${reqBodyData.password}')`,
                        [reqBodyData.name, reqBodyData.mobileNo, reqBodyData.emailId, reqBodyData.password],
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



// function createnewAccount(connection, reqBodyData, response) {
//     if (reqBodyData.mobileNo && reqBodyData.emailId && reqBodyData.name && reqBodyData.password) {
       
//         connection.query(`SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`, function (error, data) {
//             if (error) {
//                 console.error("Database error:", error);
//                 response.status(500).json({ message: 'Database error' });
//                 return;
//             }

//             if (data.length === 0) {
            
//                 connection.query(`INSERT INTO createaccount(Name, mobileNo, email_Id, password) VALUES ('${reqBodyData.name}', '${reqBodyData.mobileNo}', '${reqBodyData.emailId}', '${reqBodyData.password}')`, function (error, result) {
//                     if (error) {
//                         console.error("Database error:", error);
//                         response.status(500).json({ message: 'Database error' });
//                         return;
//                     }
//                     else{
//                         response.status(200).json({ message: 'Created Successfully', statusCode: 200 });
//                     }
                   
//                 });
//             } else {
               
//                 const mobileExists = data.some(record => record.mobileNo === reqBodyData.mobileNo);
//                 const emailExists = data.some(record => record.email_Id === reqBodyData.emailId);

//                 if (mobileExists && emailExists) {
//                     response.status(203).json({ message: 'Mobile Number and Email ID already exist', statusCode: 203 });
//                 } else if (emailExists) {
//                     response.status(201).json({ message: 'Email ID already exists', statusCode: 201 });
//                 } else if (mobileExists) {
//                     response.status(202).json({ message: 'Mobile Number already exists', statusCode: 202 });
//                 }
//                 else{
//                     response.status(201).json({ message: 'Missing Parameter' });
//                 }
//             }
//         });
//     }
    
// }




function loginAccount(connection, response, email_Id, password) {
    if (email_Id && password) {
        connection.query(`SELECT * FROM createaccount WHERE email_Id='${email_Id}' and password = '${password}' `, function (error, data) {
            console.log('data *&*', data, "error", error)
            if (error) {
                console.error(error);
                response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
            } else {
                if (data.length > 0) {
             
                    const isEnable = data[0].isEnable
                     const LoginId = data[0].id  


                    if (isEnable == 1) {
                        sendOtpForMail(connection, response, email_Id, LoginId)
                        response.status(203).json({ message: "otp Send Successfully", statusCode: 203 })
                                           } else {
                        response.status(200).json({ message: "Login Successfully", statusCode: 200, Data: data });

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

function forgetPasswordOtpSend(connection, response, requestData) {
    console.log("requestData",requestData.email)
    if (requestData.email) {
        connection.query(`SELECT * FROM createaccount WHERE email_id= \'${requestData.email}\'`, function (error, data) {
            if (data && data.length > 0) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                console.log("otp is ", otp);

             const LoginId = data[0].id
             console.log("LoginId",LoginId)
                connection.query(`UPDATE createaccount SET Otp= \'${otp}\' WHERE email_id=\'${requestData.email}\' AND id = \' ${LoginId}\'  `, function (error, data) {
                    if (data) {
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user:'smartstay1234@gmail.com',
                                pass: 'afki rrvo jcke zjdt',
                            },
                            tls: {
                                // do not fail on invalid certs
                                rejectUnauthorized: false,
                              },
                        });
                        const mailOptions = {
                            from: 'smartstay1234@gmail.com',
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
                                response.status(200).json({ message: "Otp send  Successfully", otp: otp});
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

function sendOtpForMail(connection, response, Email_Id,LoginId) {
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
                        const mailOptions = {
                            from: 'smartstay1234@gmail.com',
                            to: Email_Id,
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
                                response.status(200).json({ message: "Otp send  Successfully", otp: otp});
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


 
function sendResponseOtp(connection, response, requestData){
    connection.query(`SELECT * FROM createaccount WHERE email_id= \'${requestData.Email_Id}\' ` ,function (error, resData){
      console.log("resData",resData)
       if(resData.length > 0 && resData[0].Otp == requestData.OTP){
         
        response.status(200).json({ message: "OTP Verified Success",statusCode: 200, Data:resData })
       } else {
         
        response.status(201).json({ message: "Enter Valid Otp", statusCode: 201 })
       }
 
    })
 }




module.exports = { createAccountForLogin, loginAccount, forgetPassword, sendOtpForMail, sendResponseOtp, forgetPasswordOtpSend,createnewAccount }