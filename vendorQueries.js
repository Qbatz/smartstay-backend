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
        const Vendor_Name = firstName + ' ' + lastName;
        const created_by = request.user_details.id;
        const checkQuery = `SELECT * FROM Vendor WHERE Vendor_Id = '${reqInvoice.Vendor_Id}'`;
        
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
                                Status  = '${reqInvoice.Status}'
                                WHERE Vendor_Id = '${reqInvoice.Vendor_Id}' AND id = '${reqInvoice.id}'`;
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
                        Status  = '${reqInvoice.Status}'
                        WHERE Vendor_Id = '${reqInvoice.Vendor_Id}' AND id = '${reqInvoice.id}'`;
                    connection.query(updateVendor, function (error, updateResult) {
                        if (error) {
                            response.status(201).json({ message: "Internal Server Error", statusCode: 201, updateError: error });
                        } else {
                            response.status(200).json({ message: "Update Successfully", statusCode: 200 });
                        }
                    });
                }
            } else {
                if (reqInvoice.profile) {
                    uploadProfilePictureToS3Bucket('smartstaydevs', 'Vendor_Logo/', 'Logo' + `${timestamp}` + '.jpg', reqInvoice.profile, (err, vendor_profile) => {
                        if (err) {
                            response.status(202).json({ message: 'Database error' });
                        } else {
                            const insertVendor = `INSERT INTO Vendor(Vendor_Name, Vendor_Mobile, Vendor_Email, Vendor_Address, Vendor_profile, CreatedBy) 
                            VALUES ('${Vendor_Name}', '${reqInvoice.Vendor_Mobile}','${reqInvoice.Vendor_Email}','${reqInvoice.Vendor_Address}', '${vendor_profile}','${created_by}')`;

                            connection.query(insertVendor, function (error, insertVendorData) {
                                if (error) {
                                    response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                                } else {
                                    var Row_id = insertVendorData.insertId;
                                    const Create_Vendor_Id = GeneratedVendorId(firstName, Row_id);
                                    if (Create_Vendor_Id) {
                                        const UpdateVendor_Id = `UPDATE Vendor SET Vendor_Id = '${Create_Vendor_Id}' WHERE id = '${Row_id}'`;
                                        connection.query(UpdateVendor_Id, function (error, updateQuery) {
                                            if (error) {
                                                response.status(201).json({ message: "Internal Server Error", statusCode: 201, InsertError: error });
                                            } else {
                                                response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                                            }
                                        });
                                    } else {
                                        console.log("vendor id not generated");
                                    }
                                }
                            });
                        }
                    });
                } else {
                    const insertVendor = `INSERT INTO Vendor(Vendor_Name, Vendor_Mobile, Vendor_Email, Vendor_Address, CreatedBy) 
                    VALUES ('${Vendor_Name}', '${reqInvoice.Vendor_Mobile}','${reqInvoice.Vendor_Email}','${reqInvoice.Vendor_Address}','${created_by}')`;

                    connection.query(insertVendor, function (error, insertVendorData) {
                        if (error) {
                            response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                        } else {
                            var Row_id = insertVendorData.insertId;
                            const Create_Vendor_Id = GeneratedVendorId(firstName, Row_id);
                            if (Create_Vendor_Id) {
                                const UpdateVendor_Id = `UPDATE Vendor SET Vendor_Id = '${Create_Vendor_Id}' WHERE id = '${Row_id}'`;
                                connection.query(UpdateVendor_Id, function (error, updateQuery) {
                                    if (error) {
                                        response.status(201).json({ message: "Internal Server Error", statusCode: 201, InsertError: error });
                                    } else {
                                        response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                                    }
                                });
                            } else {
                                console.log("vendor id not generated");
                            }
                        }
                    });
                }
            }
        });
    } else {
        response.status(201).json({ message: 'No Data Found' });
    }
}


function GeneratedVendorId(firstName, Row_id) {
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



function GetVendorList(connection, response, request){
    const admin_Id = request.user_details.id
    connection.query(`select * from Vendor where createdBy = '${admin_Id}'`,function(error, getVendorList){
        if(error){
            response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
        }else{
            response.status(200).json({ VendorList: getVendorList});
        }
    })
}












module.exports = { ToAddAndUpdateVendor ,GetVendorList}