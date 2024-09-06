const AWS = require('aws-sdk');
require('dotenv').config();
const connection = require('./config/connection');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();


// function ToAddAndUpdateVendor(connection, reqInvoice, response, request) {
//     if (reqInvoice) {

//         const timestamp = Date.now();
//         const firstName = reqInvoice.firstName;
//         const lastName = reqInvoice.LastName
//         const Vendor_Name = firstName + ' ' + lastName;
//         const created_by = request.user_details.id;
//         const checkQuery = `select * from Vendor where Vendor_Id = '${reqInvoice.Vendor_Id}'`
//         connection.query(checkQuery, function (error, getData) {

//             if (getData && getData.length > 0) {
//                 uploadProfilePictureToS3Bucket('smartstaydevs', 'Vendor_Logo/', 'Logo' + `${timestamp}` + '.jpg', reqInvoice.profile, (err, vendor_profile) => {
//                     if (err) {
//                         response.status(202).json({ message: 'Database error' });
//                     } else {

//     const updateVendor = `
//     UPDATE Vendor SET
//     Vendor_Name = '${Vendor_Name}',
//     Vendor_Mobile = '${reqInvoice.Vendor_Mobile}',
//     Vendor_Email = '${reqInvoice.Vendor_Email}',
//     Vendor_Address = '${reqInvoice.Vendor_Address}',
//     Vendor_profile = '${vendor_profile}',
//     UpdatedAt = NOW(), 
//     Status  = '${reqInvoice.Status}'
//     WHERE Vendor_Id = '${reqInvoice.Vendor_Id}' AND ID = '${reqInvoice.id}'`; 
//     connection.query(updateVendor, function (error, updateResult) {
//                             if (error) {
//                                 response.status(201).json({ message: "Internal Server Error", statusCode: 201, updateError: error });
//                             } else {
//                                 response.status(200).json({ message: "Update Successfully", statusCode: 200 });
//                             }
//                         });
//                     }
//                 })
//             } else {
//                 uploadProfilePictureToS3Bucket('smartstaydevs', 'Vendor_Logo/', 'Logo' + `${timestamp}` + '.jpg', reqInvoice.profile, (err, vendor_profile) => {
//                     if (err) {
//                         response.status(202).json({ message: 'Database error' });
//                     } else {

//                         const insertVendor = `INSERT INTO Vendor(Vendor_Name, Vendor_Mobile, Vendor_Email, Vendor_Address, Vendor_profile, CreatedBy) 
//                         VALUES ('${Vendor_Name}', '${reqInvoice.Vendor_Mobile}','${reqInvoice.Vendor_Email}','${reqInvoice.Vendor_Address}', '${vendor_profile}','${created_by}')`

//                         connection.query(insertVendor, function (error, insertVendorData) {
//                             if (error) {
//                                 response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
//                             } else {
//                                 var Row_id = insertVendorData.insertId;
//                                 const Create_Vendor_Id = GeneratedVendorId(firstName, Row_id)
//                                 console.log(" Create_Vendor_Id", Create_Vendor_Id)
//                                 console.log("Row_id",Row_id)
//                                 if(Create_Vendor_Id){
//                                                              const UpdateVendor_Id = `UPDATE Vendor SET  Vendor_Id = '${Create_Vendor_Id}' WHERE id = '${Row_id}'`
//                                                              console.log("UpdateVendor_Id",UpdateVendor_Id)
//                                 connection.query(UpdateVendor_Id, function (error, updateQuery) {
//                                     if (error) {
//                                         response.status(201).json({ message: "Internal Server Error", statusCode: 201, InsertError: error });
//                                     } else {
//                                         response.status(200).json({ message: "Save Successfully", statusCode: 200 });
//                                     }
//                                 })
//                             }else{
//                                 console.log("vendor id not generated")
//                             }
//                             }
//                         })


//                     }
//                 })

//             }

//         })
//     } else {
//         response.status(201).json({ message: 'No Data Found' })
//     }



// }




function ToAddAndUpdateVendor(connection, reqInvoice, response, request) {
    if (reqInvoice) {
        const timestamp = Date.now();
        const firstName = reqInvoice.firstName;
        const lastName = reqInvoice.LastName;
        // const Vendor_Name = firstName + ' ' + lastName;
        const Vendor_Name = firstName + (lastName ? ' ' + lastName : '');
        const created_by = request.user_details.id;

        console.log("firstName", firstName, lastName)
        const checkQuery = `SELECT * FROM Vendor WHERE id = '${reqInvoice.id}'`;


        connection.query(checkQuery, function (error, getData) {
            if (getData && getData.length > 0) {


                if (reqInvoice.profile) {
                    uploadProfilePictureToS3Bucket('smartstaydevs', 'Vendor_Logo/', 'Logo' + `${timestamp}` + '.jpg', reqInvoice.profile, (err, vendor_profile) => {
                        if (err) {
                            response.status(202).json({ message: 'Database error' });
                        } else {
                            const updateVendor = `
                                UPDATE Vendor SET
                                Vendor_Name = '${Vendor_Name}',
                                Vendor_Mobile = '${reqInvoice.Vendor_Mobile}',
                                Vendor_Email = '${reqInvoice.Vendor_Email}',
                                Vendor_Address = '${reqInvoice.Vendor_Address}',
                                Vendor_profile = '${vendor_profile}',
                                UpdatedAt = NOW(), 
                             Business_Name = '${reqInvoice.Business_Name}'
                                WHERE  id = '${reqInvoice.id}'`;
                            connection.query(updateVendor, function (error, updateResult) {
                                if (error) {
                                    response.status(201).json({ message: "Internal Server Error", statusCode: 201, updateError: error });
                                } else {
                                    response.status(200).json({ message: "Update Successfully", statusCode: 200 });
                                }
                            });
                        }
                    });
                } else {
                    const updateVendor = `
                        UPDATE Vendor SET
                        Vendor_Name = '${Vendor_Name}',
                        Vendor_Mobile = '${reqInvoice.Vendor_Mobile}',
                        Vendor_Email = '${reqInvoice.Vendor_Email}',
                        Vendor_Address = '${reqInvoice.Vendor_Address}',
                        UpdatedAt = NOW(), 
                        Business_Name = '${reqInvoice.Business_Name}'
                        WHERE  id = '${reqInvoice.id}'`;
                    connection.query(updateVendor, function (error, updateResult) {
                        if (error) {
                            response.status(201).json({ message: "Internal Server Error", statusCode: 201, updateError: error });
                        } else {
                            response.status(200).json({ message: "Update Successfully", statusCode: 200 });
                        }
                    });
                }

            }


            else {

                const checkVendorQuery = `SELECT * FROM Vendor WHERE Vendor_Email = '${reqInvoice.Vendor_Email}' OR Vendor_Mobile = '${reqInvoice.Vendor_Mobile}' AND Status = true`;

                connection.query(checkVendorQuery, function (error, results) {
                    if (error) {
                        return response.status(201).json({ message: "Internal Server Error", statusCode: 500 });
                    }

                    console.log("results", results)
                    console.log("err88888888", error)
                    if (results.length > 0) {

                        const existingVendor = results[0];
                        console.log("Email", existingVendor.Vendor_Email, existingVendor.Vendor_Mobile)
                        console.log("mobile", reqInvoice.Vendor_Email, reqInvoice.Vendor_Mobile)

                        console.log("existingVendor.Vendor_Email === reqInvoice.Vendor_Email", existingVendor.Vendor_Email === reqInvoice.Vendor_Email)
                        console.log("existingVendor.Vendor_Mobile === reqInvoice.Vendor_Mobile", existingVendor.Vendor_Mobile === reqInvoice.Vendor_Mobile)
                        if (existingVendor.Vendor_Email === reqInvoice.Vendor_Email) {
                            return response.status(202).json({ message: "Vendor with this email already exists", statusCode: 202 });
                        }
                        if (Number(existingVendor.Vendor_Mobile) === Number(reqInvoice.Vendor_Mobile)) {
                            return response.status(202).json({ message: "Vendor with this mobile number already exists", statusCode: 202 });
                        }
                    }
                    else {
                        if (reqInvoice.profile) {
                            uploadProfilePictureToS3Bucket('smartstaydevs', 'Vendor_Logo/', 'Logo' + `${timestamp}` + '.jpg', reqInvoice.profile, (err, vendor_profile) => {
                                if (err) {
                                    response.status(201).json({ message: 'Database error' });
                                } else {
                                    const insertVendor = `INSERT INTO Vendor(Vendor_Name, Vendor_Mobile, Vendor_Email, Vendor_Address, Vendor_profile, CreatedBy,  Business_Name) 
                            VALUES ('${Vendor_Name}', '${reqInvoice.Vendor_Mobile}','${reqInvoice.Vendor_Email}','${reqInvoice.Vendor_Address}', '${vendor_profile}','${created_by}' ,'${reqInvoice.Business_Name}')`;

                                    connection.query(insertVendor, function (error, insertVendorData) {
                                        if (error) {
                                            response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                                        } else {
                                            response.status(200).json({ message: "Save Successfully", statusCode: 200 });

                                            // var Row_id = insertVendorData.insertId;
                                            // const Create_Vendor_Id = GeneratedVendorId(firstName, Row_id);
                                            // if (Create_Vendor_Id) {
                                            //     const UpdateVendor_Id = `UPDATE Vendor SET Vendor_Id = '${Create_Vendor_Id}' WHERE id = '${Row_id}'`;
                                            //     connection.query(UpdateVendor_Id, function (error, updateQuery) {
                                            //         if (error) {
                                            //             response.status(201).json({ message: "Internal Server Error", statusCode: 201, InsertError: error });
                                            //         } else {
                                            //         }
                                            //     });
                                            // } else {
                                            //     console.log("vendor id not generated");
                                            // }
                                        }
                                    });
                                }
                            });
                        } else {
                            const insertVendor = `INSERT INTO Vendor(Vendor_Name, Vendor_Mobile, Vendor_Email, Vendor_Address, CreatedBy,  Business_Name ) 
                    VALUES ('${Vendor_Name}','${reqInvoice.Vendor_Mobile}','${reqInvoice.Vendor_Email}','${reqInvoice.Vendor_Address}','${created_by}','${reqInvoice.Business_Name}')`;

                            connection.query(insertVendor, function (error, insertVendorData) {
                                if (error) {
                                    response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                                } else {
                                    response.status(200).json({ message: "Save Successfully", statusCode: 200 });

                                    // var Row_id = insertVendorData.insertId;
                                    // const Create_Vendor_Id = GeneratedVendorId(firstName, Row_id);
                                    // if (Create_Vendor_Id) {
                                    // const UpdateVendor_Id = `UPDATE Vendor SET Vendor_Id = '${Create_Vendor_Id}' WHERE id = '${Row_id}'`;
                                    // connection.query(UpdateVendor_Id, function (error, updateQuery) {
                                    //     if (error) {
                                    //         response.status(201).json({ message: "Internal Server Error", statusCode: 201, InsertError: error });
                                    //     } else {
                                    //     }
                                    // });
                                    // } else {
                                    //     console.log("vendor id not generated");
                                    // }
                                }
                            });
                        }
                    }
                })
            }
        });
    } else {
        response.status(201).json({ message: 'No Data Found' });
    }
}







function GeneratedVendorId(firstName, Row_id) {

    if (typeof firstName !== 'string' || firstName.trim() === '') {
        console.error('Invalid firstName:', firstName);
        return null; // or handle as needed
    }

    const VendorIdPrefix = firstName.substring(0, 4).toUpperCase();
    const vendor_id = Row_id.toString().padStart(3, '0');
    const Vendor_Id = "VENDOR" + VendorIdPrefix + vendor_id;

    return Vendor_Id;
}


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



function GetVendorList(connection, response, request) {
    const admin_Id = request.user_details.id
    connection.query(`select * from Vendor where Status = true and  createdBy = '${admin_Id}' ORDER BY CreatedAt DESC`, function (error, getVendorList) {
        if (error) {
            response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
        } else {
            response.status(200).json({ VendorList: getVendorList });
        }
    })
}


function TodeleteVendorList(connection, response, request, reqVendor) {
    if (reqVendor) {
        const query = `UPDATE Vendor SET Status = '${reqVendor.Status}' where id = '${reqVendor.id}'`
        connection.query(query, function (error, updateData) {
            if (error) {
                response.status(201).json({ message: "Internal Server Error", statusCode: 201, updateError: error });
            } else {
                response.status(200).json({ message: "Update Successfully", statusCode: 200 });
            }
        })
    } else {
        response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
    }
}

function add_ebbilling_settings(req, res) {

    var created_by = req.user_details.id;
    var hostel_id = req.body.hostel_id;
    var unit = req.body.unit;
    var amount = req.body.amount;

    if (!hostel_id && !unit && !amount) {
        return res.status(201).json({ statusCode: 201, message: "Please Add Mantatory Fields" });
    }

    var sql1 = "SELECT * FROM eb_settings WHERE hostel_id='" + hostel_id + "'";
    connection.query(sql1, (err, sel_res) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unble to Get Eb Details" });
        } else if (sel_res.length != 0) {

            var up_id = sel_res[0].id;
            // Update Records
            var sql2 = "UPDATE eb_settings SET unit='" + unit + "',amount='" + amount + "' WHERE id='" + up_id + "'";
            connection.query(sql2, (err, ins_res) => {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unble to Update Eb Details" });
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Successfully Updated Eb Details" });
                }
            })
        } else {

            var sql3 = "INSERT INTO eb_settings (hostel_id,unit,amount,created_by) VALUES (?,?,?,?)";
            connection.query(sql3, [hostel_id, unit, amount, created_by], (err, ins_res) => {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unble to Add Eb Details" });
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Successfully Added Eb Details" });
                }
            })
        }
    })

}

function get_ebbilling_settings(req, res) {

    var created_by = req.user_details.id;

    var sql1 = "SELECT ebs.*,hos.Name FROM eb_settings AS ebs JOIN hosteldetails AS hos ON hos.id = ebs.hostel_id WHERE ebs.created_by='" + created_by + "';"
    connection.query(sql1, function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Eb Billing Settings" })
        } else {
            return res.status(200).json({ statusCode: 200, message: "Eb Billing Settings", eb_settings: data })
        }
    })
}


module.exports = { ToAddAndUpdateVendor, GetVendorList, TodeleteVendorList, add_ebbilling_settings, get_ebbilling_settings }