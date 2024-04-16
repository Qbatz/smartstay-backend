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
        console.log(error);
        console.log(data);

        if (error) {
            response.status(403).json({ message: 'not connected' })
        }
        else {
            response.status(200).json(data)
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
// function InvoiceSettings(connection, reqInvoice, response) {
//     console.log("reqInvoice", reqInvoice)
//     if (reqInvoice.hostel_Id) {

//         uploadProfilePictureToS3('smartstaydevs', 'Logo/', 'Logo' + reqInvoice.hostel_Id + '.jpg', reqInvoice.profile, (err, s3Url) => {
//             console.log("s3URL", s3Url)
//             if (err) {
//                 console.error('Error uploading profile picture:', err);
//                 response.status(500).json({ message: 'Error uploading profile picture' });
//             }
//             else {
//                 const query = `UPDATE hosteldetails SET prefix='${reqInvoice.prefix}' , suffix ='${reqInvoice.suffix}' ,Profile= '${s3Url}' WHERE id='${reqInvoice.hostel_Id}'`
//                 connection.query(query, function (error, invoiceData) {
//                     console.log("invoiceData", invoiceData)
//                     console.log("error invoice", error)
//                     if (error) {
//                         response.status(202).json({ message: 'Database error' });
//                     } else {
//                         response.status(200).json({ message: 'Updated successfully', statusCode: 200 });
//                     }
//                 })
//             }
//         });

//     }
//     else {
//         response.status(201).json({ message: 'missing parameter' });
//     }
// }

function InvoiceSettings(connection, reqInvoice, response) {
    console.log("reqInvoice", reqInvoice);
    if (reqInvoice.hostel_Id) {
        if (reqInvoice.profile) {
            const timestamp = Date.now();
console.log("timestamp",timestamp)
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
                            response.status(200).json({ message: 'Updated successfully', statusCode: 200 });
                        }
                    });
                }
            });
        } else {
            const query = `UPDATE hosteldetails SET prefix='${reqInvoice.prefix}', suffix='${reqInvoice.suffix}' WHERE id='${reqInvoice.hostel_Id}'`;
            connection.query(query, function (error, invoiceData) {
                console.log("invoiceData", invoiceData);
                console.log("error invoice", error);
                if (error) {
                    response.status(202).json({ message: 'Database error' });
                } else {
                    response.status(200).json({ message: 'Updated successfully', statusCode: 200 });
                }
            });
        }
    } else {
        response.status(400).json({ message: 'Missing parameter' });
    }
}



// function UpdateEB(connection, atten, response) {
//       if (atten) {
//         connection.query(`UPDATE hosteldetails SET isHostelBased= ${atten.Ishostelbased} WHERE id='${atten.Id}'`, function (error, data) {
//             if (error) {
//                 response.status(201).json({ message: "doesn't update" });
//             } else {
//                 response.status(200).json({ message: "Update Successfully" });
//             }
//         });
//     } 
   
// };
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

// function AmenitiesSetting(connection, reqData, response) { 
//     console.log("reqData", reqData);
//     if (!reqData) {
//         response.status(201).json({ message: 'Missing parameter' });
//         return; 
//     }
    
//        connection.query(`select * from Amenities WHERE Hostel_Id = ${reqData.Hostel_Id}`, function(error, amenitiesData){
//         console.log("amenitiesData",amenitiesData)
//         if(amenitiesData[0]?.Hostel_Id == reqData.Hostel_Id &&
//             amenitiesData[0]?.AmenitiesName.toLowerCase() === reqData.AmenitiesName.toLowerCase()){
//             connection.query(`UPDATE Amenities SET Amount= ${reqData.Amount},setAsDefault= ${reqData.setAsDefault},Status= ${reqData.Status} WHERE Hostel_Id='${reqData.Hostel_Id}' and AmenitiesName ='${reqData.AmenitiesName}'`, function (error, data) {
//                 if (error) {
//                     console.error(error); 
//                     response.status(201).json({ message: "doesn't update" });
//                 } else {
//                     response.status(200).json({ message: "Update successful" });
//                 }
//             });
           
           
//         }
        
//          else {
//             connection.query(`INSERT INTO Amenities (AmenitiesName, Amount, setAsDefault, Hostel_Id) VALUES (\'${reqData.AmenitiesName}\',\'${reqData.Amount}\', ${reqData.setAsDefault},\'${reqData.Hostel_Id}\')`, function (error, data) {
//                 if (error) {
//                     console.error(error); 
//                     response.status(202).json({ message: 'Database error' });
//                 } else {
//                     response.status(200).json({ message: 'Inserted successfully', statusCode: 200 });
//                 }
//             });
           
//         }
//     })
  
// }
function AmenitiesSetting(connection, reqData, response) {
    console.log("reqData", reqData);
    if (!reqData  ) {
        response.status(201).json({ message: 'Missing parameter' });
        return;
    }
    else {
        connection.query(`select * from Amenities WHERE Hostel_Id = ${reqData.Hostel_Id}`, function (error, amenitiesData) {
            console.log("amenitiesData", amenitiesData)
            if (reqData.id) {
                connection.query(`UPDATE Amenities SET Amount= ${reqData.Amount},setAsDefault= ${reqData.setAsDefault},Status= ${reqData.Status} WHERE Hostel_Id='${reqData.Hostel_Id}' and AmenitiesName ='${reqData.AmenitiesName}'`, function (error, data) {
                    if (error) {
                        console.error(error);
                        response.status(201).json({ message: "doesn't update" });
                    } else {
                        response.status(200).json({ message: "Update successful" });
                    }
                });


            }
            else {
                connection.query(`SELECT * FROM AmnitiesName where id= \'${reqData.AmenitiesName}\'`, function (err, data) {
                    console.log("data...?", data)
                    if (data) {
                        const AmnitiName = data.filter((item) => {
                            return item.id == reqData.AmenitiesName;
                           
                        });
                     
            
                        console.log("AmnitiName", AmnitiName);
                        if (AmnitiName.length>0) {
                            const Amnities_Id = AmnitiName[0].id;
                            
                            connection.query(`INSERT INTO Amenities (AmenitiesName, Amount, setAsDefault, Hostel_Id,Status,Amnities_Id,createdBy) VALUES (\'${data[0].Amnities_Name}\',\'${reqData.Amount}\', ${reqData.setAsDefault},\'${reqData.Hostel_Id}\',\'${reqData.Status}\',\'${Amnities_Id}\' ,${reqData.createdBy})`, function (error, data) {
                                if (error) {
                                    console.error(error);
                                    response.status(202).json({ message: 'Database error' });
                                } else {
                                    response.status(200).json({ message: 'Inserted successfully', statusCode: 200 ,data :AmnitiName});
                                }
                            });
                        } else {
                            response.status(201).json({ message: 'No Amnities_Name ' });
                        }
                    } else {
                        response.status(201).json({ message: 'No Data Found' });
                    }
                });
            }
            
            
          
            
        })
    }

}



function getAmenitiesList(connection, response) {
    connection.query(`select * from Amenities `, function (err, data) {
        if (data) {
            response.status(200).json(data)
        }
        else {
            response.status(201).json({ message: 'No Data Found' })
        }
    })
}
function getAmenitiesName(connection, response) {
    connection.query(`select * from AmnitiesName `, function (err, data) {
        if (data) {
            response.status(200).json(data)
        }
        else {
            response.status(201).json({ message: 'No Data Found' })
        }
    })
}
function getEbReading(connection, response) {
    connection.query(`select * from EbReading `, function (err, data) {
        if (data) {
            response.status(200).json(data)
        }
        else {
            response.status(201).json({ message: 'No Data Found' })
        }
    })
}

// function EbReadingAmount(connection, atten, response) {
//     console.log("atten", atten);
//     if (!atten  ) {
//         response.status(201).json({ message: 'Missing parameter' });
//         return;
//     }
//     else {
//         connection.query(`select * from EbReading `, function (error, data) {
//             console.log("data", data)
//             if (atten.id) {
//                 connection.query(`UPDATE EbReading SET Floor= ${atten.Floor},Room= ${atten.Room},start_Meter_Reading= ${atten.start_Meter_Reading} end_Meter_Reading='${atten.end_Meter_Reading}' `, function (error, data) {
//                     if (error) {
//                         console.error(error);
//                         response.status(201).json({ message: "doesn't update" });
//                     } else {
//                         response.status(200).json({ message: "Update successful" });
//                     }
//                 });


//             }
//             else {
//                 connection.query(`SELECT * FROM hosteldetails `, function (err, datum) {
//                     console.log("datum...?", datum)
//                     if (datum.length>0) {                      
//                         if (datum[0].isHostelBased ==1) {                                                      
//                             connection.query(`INSERT INTO EbReading ( start_Meter_Reading, end_Meter_Reading,EbTotAmount) VALUES ( ${atten.start_Meter_Reading},${atten.end_Meter_Reading},${atten.EbTotAmount}`, function (error, data) {
//                                 if (error) {
//                                     console.error(error);
//                                     response.status(202).json({ message: 'Database error' });
//                                 } else {
//                                     response.status(200).json({ message: 'Inserted successfully', statusCode: 200 });
//                                 }
//                             });
//                         }
//                         else{
//                             connection.query(`INSERT INTO EbReading (Floor, Room, start_Meter_Reading, end_Meter_Reading,EbTotAmount) VALUES (\'${atten.Floor}\',\'${atten.Room}\', ${atten.start_Meter_Reading},\'${atten.end_Meter_Reading}\',\'${atten.EbTotAmount}\'`, function (error, data) {
//                                 if (error) {
//                                     console.error(error);
//                                     response.status(202).json({ message: 'Database error' });
//                                 } else {
//                                     response.status(200).json({ message: 'Inserted successfully', statusCode: 200 });
//                                 }
//                             });

//                         }
                       
//                     } else {
//                         response.status(201).json({ message: 'No Data Found' });
//                     }
//                 });
//             }
            
            
          
            
//         })
//     }

// }
function EbReadingAmount(connection, atten, response) {
    console.log("atten", atten);
    if (!atten) {
        response.status(400).json({ message: 'Missing parameter' });
        return;
    }

    connection.query(`SELECT isHostelBased FROM hosteldetails`, function (err, datum) {
        if (err) {
            console.error(err);
            response.status(500).json({ message: 'Database error' });
            return;
        }

        if (datum.length > 0) {
            if (atten.id) {
                const isHostelBasedUpdated = datum[0].isHostelBased;
                const updateQuery = isHostelBasedUpdated ?
                    `UPDATE EbReading SET start_Meter_Reading= ${atten.start_Meter_Reading},end_Meter_Reading=${atten.end_Meter_Reading}, EbTotAmount=${atten.EbTotAmount}  WHERE Hostel_Id= ${atten.Hostel_Id}` :
                    `UPDATE EbReading SET  Floor= ${atten.Floor},Room= ${atten.Room},start_Meter_Reading= ${atten.start_Meter_Reading} ,end_Meter_Reading=${atten.end_Meter_Reading} where Hostel_Id = ${atten.Hostel_Id}`;

                connection.query(updateQuery, function (error, data) {
                    if (error) {
                        console.error(error);
                        response.status(500).json({ message: 'Update failed' });
                    } else {
                        response.status(200).json({ message: 'Update successful' });
                    }
                });
            } else {
                const isHostelBased = datum[0].isHostelBased;
                const insertQuery = isHostelBased ?
                    `INSERT INTO EbReading (Hostel_Id,start_Meter_Reading, end_Meter_Reading, EbTotAmount) VALUES (${atten.Hostel_Id},${atten.start_Meter_Reading},${atten.end_Meter_Reading},${atten.EbTotAmount})` :
                    `INSERT INTO EbReading (Hostel_Id,Floor, Room, start_Meter_Reading, end_Meter_Reading, EbTotAmount) VALUES (\'${atten.Hostel_Id}\',\'${atten.Floor}\',\'${atten.Room}\', ${atten.start_Meter_Reading},\'${atten.end_Meter_Reading}\',\'${atten.EbTotAmount}\')`;
                // const insertValues = isHostelBased ?
                //     [atten.Hostel_Id, atten.start_Meter_Reading, atten.end_Meter_Reading, atten.EbTotAmount] :
                //     [atten.Hostel_Id, atten.Floor, atten.Room, atten.start_Meter_Reading, atten.end_Meter_Reading, atten.EbTotAmount];

                connection.query(insertQuery, insertValues, function (error, data) {
                    if (error) {
                        console.error(error);
                        response.status(500).json({ message: 'Insertion failed' });
                    } else {
                        response.status(200).json({ message: 'Inserted successfully' });
                    }
                });
            }
        } else {
            response.status(404).json({ message: 'No Data Found' });
        }
    });
}




module.exports = { IsEnableCheck, getAccount, InvoiceSettings, AmenitiesSetting ,UpdateEB,getAmenitiesList,getAmenitiesName,getEbReading,EbReadingAmount};