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



function IsEnableCheck(connection, reqBodyData, response) {
    if (reqBodyData.emailId && reqBodyData.isEnable !== undefined) {
        let isEnable = reqBodyData.isEnable ? 1 : 0;
        connection.query(`SELECT * FROM createaccount WHERE email_Id='${reqBodyData.emailId}'`, function (error, data) {
            if (error) {
                console.log("error", error);
                response.status(202).json({ message: 'Database error' });
            } else {
                if (data.length === 0) {
                    response.status(201).json({ message: 'Record not found' });
                } else {
                    connection.query(`UPDATE createaccount SET isEnable=${isEnable} WHERE email_Id='${reqBodyData.emailId}'`, function (error, result) {
                        if (error) {
                            console.log("error", error);
                            response.status(202).json({ message: 'Database error' });
                        } else {
                            response.status(200).json({ message: 'Updated successfully', statusCode: 200 });
                        }
                    });
                }
            }
        });
    } else {
        response.status(201).json({ message: 'Bad request: Missing Parameter or Invalid isEnable value' });
    }
}

function getAccount(connection, response) {
    connection.query('select * from createaccount', function (error, data) {
        // console.log(error);
        // console.log(data);
        if (error) {
            response.status(403).json({ message: 'not connected' })
        }
        else {
            response.status(200).json({ data: data })
        }
    })
}



function uploadProfilePictureToS3(bucketName, folderName, fileName, fileData, callback) {
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


function InvoiceSettings(connection, reqInvoice, response) {
    console.log("reqInvoice", reqInvoice);
    if (reqInvoice.hostel_Id) {

        const Prefix = reqInvoice.prefix !== undefined && reqInvoice.prefix !== null && reqInvoice.prefix !== '';
        const Suffix = reqInvoice.suffix !== undefined && reqInvoice.suffix !== null && reqInvoice.suffix !== '';
        const Profile = reqInvoice.profile !== undefined && reqInvoice.profile !== null;


        if (Prefix && Suffix && Profile) {
            const timestamp = Date.now();
            uploadProfilePictureToS3('smartstaydevs', 'Logo/', 'Logo' + reqInvoice.hostel_Id + `${timestamp}` + '.jpg', reqInvoice.profile, (err, s3Url) => {
                if (err) {
                    response.status(202).json({ message: 'Database error' });
                } else {
                    const query = `UPDATE hosteldetails SET Profile='${s3Url}', prefix='${reqInvoice.prefix}', suffix='${reqInvoice.suffix}' WHERE id='${reqInvoice.hostel_Id}'`;
                    connection.query(query, function (error, invoiceData) {
                        console.log("invoiceData", invoiceData);
                        console.log("error invoice", error);
                        if (error) {
                            response.status(202).json({ message: 'Database error' });
                        } else {
                            response.status(200).json({ message: 'Prefix suffix and profile Updated successfully', statusCode: 200 });
                        }
                    });
                }
            });
        } else if (Profile) {
            const timestamp = Date.now();
            console.log("timestamp", timestamp)
            uploadProfilePictureToS3('smartstaydevs', 'Logo/', 'Logo' + reqInvoice.hostel_Id + `${timestamp}` + '.jpg', reqInvoice.profile, (err, s3Url) => {
                console.log("s3URL", s3Url);
                if (err) {
                    console.error('Error uploading profile picture:', err);
                    response.status(500).json({ message: 'Error uploading profile picture' });
                } else {
                    const query = `UPDATE hosteldetails SET Profile='${s3Url}' WHERE id='${reqInvoice.hostel_Id}'`;
                    connection.query(query, function (error, invoiceData) {
                        console.log("invoiceData", invoiceData);
                        console.log("error invoice", error);
                        if (error) {
                            response.status(202).json({ message: 'Database error' });
                        } else {
                            response.status(200).json({ message: 'Profile Updated successfully', statusCode: 200 });
                        }
                    });
                }
            });
        } else if (Prefix && Suffix) {
            const query = `UPDATE hosteldetails SET  prefix='${reqInvoice.prefix}', suffix='${reqInvoice.suffix}' WHERE id='${reqInvoice.hostel_Id}'`;
            connection.query(query, function (error, invoiceData) {
                console.log("invoiceData", invoiceData);
                console.log("error invoice", error);
                if (error) {
                    response.status(202).json({ message: 'Database error' });
                } else {
                    response.status(200).json({ message: 'prefix and suffix Updated successfully', statusCode: 200 });
                }
            });
        }
    } else {
        response.status(400).json({ message: 'Missing parameter' });
    }
}




function UpdateEB(connection, attenArray, response) {
    if (attenArray && Array.isArray(attenArray)) {
        const numUpdates = attenArray.length;
        let numCompleted = 0;

        for (let i = 0; i < numUpdates; i++) {
            const atten = attenArray[i];
            connection.query(`UPDATE hosteldetails SET isHostelBased = ${atten.isHostelBased} WHERE id = '${atten.id}'`, function (error, data) {
                if (error) {
                    console.error("Error updating hostel details:", error);
                    response.status(500).json({ message: "Error updating hostel details" });
                } else {
                    numCompleted++;
                    if (numCompleted === numUpdates) {
                        response.status(200).json({ message: "Update Successfully" });
                    }
                }
            });
        }
    } else {
        response.status(400).json({ message: "Invalid input" });
    }
}


function AmenitiesSetting(connection, request, response) {

    var reqData=request.body;
    const userDetails = request.user_details;
    
    var created_by=userDetails.id;

    console.log("reqData", reqData);
    if (!reqData) {
        response.status(201).json({ message: 'Missing parameter' });
        return;
    }
    else {
        const amenitiesName = reqData?.AmenitiesName?.trim().replace(/\s+/g, '');
        const capitalizedAmenitiesName = amenitiesName?.charAt(0).toUpperCase() + amenitiesName?.slice(1).toLowerCase();

        connection.query(`SELECT * FROM Amenities WHERE Hostel_Id = ${reqData.Hostel_Id}`, function (error, amenitiesData) {
            console.log("amenitiesData", amenitiesData)
            console.log("capitalizedAmenitiesName", capitalizedAmenitiesName)

            let amenityId = reqData.amenityId;
            if (reqData.amenityId != undefined || reqData.AmenitiesName != undefined) {
                connection.query(`SELECT * FROM AmnitiesName WHERE LOWER(Amnities_Name) = '${capitalizedAmenitiesName}'`, function (err, data) {
                    console.log("data..?", data)
                    if (error) {
                        console.error(error);
                        response.status(202).json({ message: 'Database error' });
                    } else if (data.length > 0) {
                        insertAminity(data[0].id,created_by)
                    } else {
                        if (!reqData.amenityId && reqData.amenityId != 0 && reqData.amenityId != "") {
                            connection.query(`INSERT INTO AmnitiesName (Amnities_Name) VALUES ('${capitalizedAmenitiesName}')`, function (error, data) {
                                if (!error) {
                                    connection.query("SELECT * FROM AmnitiesName WHERE Amnities_Name='" + capitalizedAmenitiesName + "' LIMIT 1", function (error, amenityData) {
                                        if (!error) {
                                            amenityId = amenityData[0].id
                                            console.log("amenityData", amenityData[0].id);
                                            insertAminity(amenityData[0].id,created_by)
                                        }
                                    })
                                }
                                if (error) {
                                    response.status(202).json({ message: 'Database error' });
                                }
                            })
                        } else {
                            insertAminity(reqData.amenityId,created_by)
                        }
                    }
                })
            }
        })
    }

    function insertAminity(id,created_by) {
        connection.query(`SELECT * FROM Amenities WHERE Hostel_Id = ${reqData.Hostel_Id} AND Amnities_Id = ${id}`, function (error, existingAmenity) {
            if (error) {
                console.error(error);
                response.status(202).json({ message: 'Database error' });
            } else if (existingAmenity.length > 0) {
                response.status(203).json({ message: 'Amenity already exists for this Hostel_Id' });
            } else {
                connection.query(`INSERT INTO Amenities (Amount, setAsDefault, Hostel_Id,  Amnities_Id, createdBy) VALUES (${reqData.Amount}, ${reqData.setAsDefault}, ${reqData.Hostel_Id}, ${id}, ${created_by})`, function (error, data) {
                    if (error) {
                        console.error(error);
                        response.status(202).json({ message: 'Database error' });
                    } else {
                        response.status(200).json({ message: 'Inserted successfully', statusCode: 200 });
                    }
                })
            }
        })
    }

    // else {


    //     const amenitiesName = reqData?.AmenitiesName?.trim().replace(/\s+/g, '');

    //     const capitalizedAmenitiesName = amenitiesName?.charAt(0).toUpperCase() + amenitiesName?.slice(1).toLowerCase();


    //     connection.query(`select * from Amenities WHERE Hostel_Id = ${reqData.Hostel_Id}`, function (error, amenitiesData) {
    //         console.log("amenitiesData", amenitiesData)

    //         console.log("capitalizedAmenitiesName", capitalizedAmenitiesName)

    //         let amenityId = reqData.amenityId;
    //         if (reqData.amenityId != undefined || reqData.AmenitiesName != undefined) {
    //             connection.query(`SELECT * FROM AmnitiesName WHERE LOWER(Amnities_Name) = '${capitalizedAmenitiesName}'`, function (err, data) {
    //                 console.log("data..?", data)
    //                 if (error) {
    //                     console.error(error);
    //                     response.status(202).json({ message: 'Database error' });
    //                 }
    //                 else if (data.length > 0) {
    //                     insertAminity(data[0].id)
    //                 }
    //                 else {
    //                     if (!reqData.amenityId && reqData.amenityId != 0 && reqData.amenityId != "") {
    //                         connection.query(`INSERT INTO AmnitiesName (Amnities_Name) VALUES ('${capitalizedAmenitiesName}')`, function (error, data) {
    //                             if (!error) {
    //                                 connection.query("SELECT * FROM AmnitiesName WHERE Amnities_Name='" + capitalizedAmenitiesName + "' LIMIT 1", function (error, amenityData) {
    //                                     if (!error) {
    //                                         amenityId = amenityData[0].id
    //                                         console.log("amenityData", amenityData[0].id);
    //                                         insertAminity(amenityData[0].id)
    //                                     }
    //                                 })
    //                             }
    //                             if (error) {
    //                                 response.status(202).json({ message: 'Database error' });
    //                             }
    //                         })
    //                     }
    //                     else {
    //                         insertAminity(reqData.amenityId)
    //                     }
    //                 }
    //             })

    //         }

    //     })
    // }
    // function insertAminity(id) {
    //     connection.query(`INSERT INTO Amenities (Amount, setAsDefault, Hostel_Id,  Amnities_Id, createdBy) VALUES (${reqData.Amount}, ${reqData.setAsDefault}, ${reqData.Hostel_Id}, ${id}, ${reqData.createdBy})`, function (error, data) {
    //         if (error) {
    //             console.error(error);
    //             response.status(202).json({ message: 'Database error' });
    //         } else {
    //             response.status(200).json({ message: 'Inserted successfully', statusCode: 200 });
    //         }

    //     })

    // }

}



function getAmenitiesList(connection, response) {
    connection.query(`select * from Amenities AmeList INNER JOIN AmnitiesName AmeName ON AmeList.Amnities_Id = AmeName.id `, function (err, data) {
        if (data) {
            response.status(200).json({ data: data })
        }
        else {
            response.status(201).json({ message: 'No Data Found' })
        }
    })
}

function getEbReading(connection, response) {
    connection.query(`select * from EbReading `, function (err, data) {
        if (data) {
            response.status(200).json({data:data})
        }
        else {
            response.status(201).json({ message: 'No Data Found' })
        }
    })
}

function UpdateAmnity(connection, attenArray, response) {
    // console.log(" attenArray", attenArray)
    connection.query(`SELECT * FROM Amenities WHERE Hostel_Id = ${attenArray.Hostel_Id}`, function (error, amenitiesData) {
        // console.log("amenitiesData", amenitiesData)
        if (attenArray.id) {
            connection.query(`UPDATE Amenities SET Amount= ${attenArray.Amount},setAsDefault= ${attenArray.setAsDefault},Status= ${attenArray.Status} WHERE  Amnities_Id='${attenArray.id}' and Hostel_Id = '${attenArray.Hostel_Id}'`, function (error, data) {
                if (error) {
                    console.error(error);
                    response.status(201).json({ message: "doesn't update" });
                } else {
                    response.status(200).json({ message: "Update successful" });
                }
            });


        }
    })
}







module.exports = { IsEnableCheck, getAccount, InvoiceSettings, AmenitiesSetting, UpdateEB, getAmenitiesList, getEbReading, UpdateAmnity };