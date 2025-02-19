const moment = require('moment')
const AWS = require('aws-sdk');
require('dotenv').config();
const connection = require('./config/connection');
const uploadImage = require('./components/upload_image');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();

function getHostelList(request, response) {

    const created_by = request.user_details.id;
    let hostelDetails = [];

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    var show_ids = request.show_ids;
    var hostel_id = request.body.hostel_id;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {
        var queryHostelList = `SELECT hstl.*,eb.amount AS eb_amount FROM hosteldetails AS hstl LEFT JOIN eb_settings AS eb ON hstl.id=eb.hostel_id AND eb.status=1 WHERE hstl.created_By IN (${show_ids}) AND hstl.isActive = true`;
        // var queryHostelList = `SELECT hstl.*,eb.amount AS eb_amount FROM hosteldetails AS hstl LEFT JOIN eb_settings AS eb ON hstl.id=eb.hostel_id WHERE hstl.created_By IN (${show_ids}) AND hstl.isActive = true AND eb.status=1`;
        // Query to get the hostels

        if (hostel_id) {
            queryHostelList += " AND hstl.id=" + hostel_id + ""
        }

        queryHostelList += " ORDER BY hstl.id DESC"

        connection.query(queryHostelList, function (err, hostels) {
            if (err) {
                console.error("Error fetching hostels: ", err);
                return response.status(201).json({ statusCode: 201, message: 'Internal Server Error' });
            }

            if (!hostels || hostels.length === 0) {
                return response.status(201).json({ statusCode: 201, message: 'No Data Found' });
            }

            let processedHostels = 0;

            hostels.forEach((hostel, index) => {
                const queryFloorDetails = `SELECT * FROM Hostel_Floor WHERE hostel_id = ${hostel.id} AND status = true ORDER BY id`;

                connection.query(queryFloorDetails, function (floorErr, floorDetails) {
                    if (floorErr) {
                        console.error("Error fetching floor details: ", floorErr);
                        return response.status(201).json({ statusCode: 201, message: 'Error fetching floor details' });
                    } else {
                        // Fetch additional details
                        const additionalDetailsQuery = `
                        SELECT 
                            COALESCE(SUM((SELECT COUNT(id) FROM Hostel_Floor WHERE Hostel_Id='${hostel.id}' AND status=1)), 0) AS floorcount,
                            COALESCE(SUM((SELECT COUNT(Room_Id) FROM hostelrooms WHERE Hostel_Id='${hostel.id}' AND isActive=1)), 0) AS roomCount,
                            COALESCE((SELECT COUNT(bd.id) FROM hostelrooms AS hr 
                                JOIN bed_details AS bd ON bd.hos_detail_id=hr.id 
                                JOIN hosteldetails AS hd ON hd.id=hr.Hostel_Id 
                                WHERE hd.isActive=1 AND hr.isActive=1 AND bd.status=1 AND bd.isfilled=0 AND hr.Hostel_Id='${hostel.id}'), 0) AS Bed,
                            COALESCE((SELECT COUNT(bd.id) FROM hostelrooms AS hr 
                                JOIN bed_details AS bd ON bd.hos_detail_id=hr.id 
                                JOIN hosteldetails AS hd ON hd.id=hr.Hostel_Id 
                                WHERE hd.isActive=1 AND hr.isActive=1 AND bd.status=1 AND bd.isfilled=1 AND hd.created_By IN ('${show_ids}') AND hr.Hostel_Id='${hostel.id}'), 0) AS occupied_Bed 
                        FROM hosteldetails details 
                        JOIN createaccount creaccount ON creaccount.id = details.created_by 
                        WHERE details.created_By IN (${show_ids}) AND details.id='${hostel.id}' 
                        GROUP BY creaccount.id`;

                        connection.query(additionalDetailsQuery, function (additionalErr, additionalDetails) {
                            if (additionalErr) {
                                console.error("Error fetching additional details: ", additionalErr);
                                return response.status(201).json({ statusCode: 201, message: 'Error fetching additional details' });
                            } else {
                                const image_list = [1, 2, 3, 4].map(i => ({
                                    name: `image${i}`,
                                    image: hostel[`image${i}`]
                                }));

                                hostelDetails.push({
                                    ...hostel,
                                    floorDetails: floorDetails || [],
                                    ...additionalDetails[0],
                                    image_list: image_list
                                });

                                processedHostels++;
                                if (processedHostels === hostels.length) {
                                    return response.status(200).json({ data: hostelDetails });
                                }
                            }
                        });
                    }

                });
            });
        });



    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}


function checkRoom(connection, request, response) {

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

        const query2 = `SELECT hosRom.Room_Id AS RoomId, hosRom.Number_Of_Beds AS NumberOfBeds, hosRom.Hostel_Id, hosRom.Floor_Id, host.id AS HostelDetailsId FROM hostelrooms hosRom INNER JOIN hosteldetails host ON host.id = hosRom.Hostel_Id`
        connection.query(query2, function (error, data) {
            if (error) {
                response.status(201).json({ message: 'No Data Found' })
            }
            else {
                response.status(200).json({ data: data })
            }
        })
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}


function hostelListDetails(connection, response) {
    connection.query('select * from hostel_details', function (error, data) {
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

// function createPG(connection, reqHostel, response, request) {
//     const userDetails = request.user_details;
//     const timestamp = Date.now();

//     if (!reqHostel.hostel_Name || !reqHostel.hostel_Phone) {
//         return response.status(201).json({ message: "Please Add All Required Fields", statusCode: 201 })
//     }

//     if (reqHostel.id) {
//         if (reqHostel.profile) {
//             uploadProfilePictureToS3Bucket('smartstaydevs', 'Hostel_Logo/', 'Logo' + `${timestamp}` + '.jpg', reqHostel.profile, (err, hostel_Logo) => {
//                 if (err) {
//                     console.log(err);
//                     response.status(201).json({ message: 'Error while store profile into the S3 bucket' })
//                 }
//                 else {
//                     let updateQuery = `update hosteldetails set Name= \'${reqHostel.hostel_Name}\', email_id ='${reqHostel.hostel_email_Id}', Address =\'${reqHostel.hostel_location}\', hostel_PhoneNo ='${reqHostel.hostel_Phone}', number_Of_Floor=0,created_By=\'${userDetails.id}\', profile=\'${hostel_Logo}\' where id = ${reqHostel.id};`
//                     connection.query(updateQuery, function (update_Err, update_Data) {
//                         if (update_Err) {
//                             response.status(201).json({ message: 'Error while update the data' })
//                         } else {
//                             response.status(200).json({ message: 'Hostel Details Updated Successfully', statusCode: 200 })
//                         }
//                     })
//                 }
//             })
//         } else {
//             let updateQuery = `update hosteldetails set Name= \'${reqHostel.hostel_Name}\', email_id ='${reqHostel.hostel_email_Id}', Address =\'${reqHostel.hostel_location}\', hostel_PhoneNo ='${reqHostel.hostel_Phone}', number_Of_Floor=0,created_By=\'${userDetails.id}\'
//                 where id = ${reqHostel.id};`
//             connection.query(updateQuery, function (update_Err, update_Data) {
//                 if (update_Err) {
//                     response.status(201).json({ message: 'Error while update the data' })
//                 } else {
//                     response.status(200).json({ message: 'Hostel Details Updated Successfully', statusCode: 200 })
//                 }
//             })
//         }
//     }
//     else if ((reqHostel.id == undefined && reqHostel.profile) || (reqHostel.id == '' && reqHostel.profile)) {

//         uploadProfilePictureToS3Bucket('smartstaydevs', 'Hostel_Logo/', 'Logo' + `${timestamp}` + '.jpg', reqHostel.profile, (err, hostel_Logo) => {
//             if (err) {
//                 response.status(202).json({ message: 'Database error' });
//             } else {
//                 // const query2 = ` select * from hosteldetails where hostel_PhoneNo=\'${reqHostel.hostel_Phone}\'`
//                 // connection.query(query2, function (error, datum) {
//                 //     if (datum && datum.length > 0) {
//                 //         response.status(201).json({ message: 'Phone already Saved', statusCode: 201 })
//                 //     }
//                 //     else {
//                 //         if (error) {
//                 //             response.status(201).json({ message: 'Error while fetching data', statusCode: 201 })
//                 //         } else {

//                 if ((reqHostel.image1 == undefined && reqHostel.image1 != 0)) {

//                     uploadProfilePictureToS3Bucket('smartstaydevs', 'Hostel_Images/', 'Logo' + `${timestamp}` + '.jpg', reqHostel.profile)

//                 }

//                 const query = `INSERT INTO hosteldetails(Name,hostel_PhoneNo,number_Of_Floor,email_id,Address,created_By, profile,isHostelBased) VALUES (\'${reqHostel.hostel_Name}\',\'${reqHostel.hostel_Phone}\',0,\'${reqHostel.hostel_email_Id}\',\'${reqHostel.hostel_location}\',\'${userDetails.id}\', \'${hostel_Logo}\',0)`
//                 connection.query(query, function (error, data) {
//                     if (error) {
//                         console.log("error", error);
//                         response.status(201).json({ statusCode: 201, message: 'Cannot Insert Details' })
//                     }
//                     else {
//                         response.status(200).json({ statusCode: 200, message: 'Succsessfully added  a new hostel' })
//                     }
//                 })
//                 //     }
//                 // }

//                 // })
//             }
//         })
//     } else {
//         // var query2 = "SELECT * FROM hosteldetails WHERE Name = CONVERT(? USING utf8mb4);";
//         // connection.query(query2, [reqHostel.hostel_Name], function (error, datum) {
//         //     if (error) {
//         //         console.log(error);
//         //         response.status(201).json({ message: 'Unable to Get Hostel Details', statusCode: 201 })
//         //     }
//         //      else if (datum.length != 0) {
//         //         response.status(201).json({ message: 'Hostel Name Already Exists', statusCode: 201 })
//         //     } 
//         //     else {
//         const query = `INSERT INTO hosteldetails(Name,hostel_PhoneNo,number_Of_Floor,email_id,Address,created_By,isHostelBased) VALUES (\'${reqHostel.hostel_Name}\',\'${reqHostel.hostel_Phone}\',0,\'${reqHostel.hostel_email_Id}\',\'${reqHostel.hostel_location}\',\'${userDetails.id}\',0)`
//         connection.query(query, function (error, data) {
//             if (error) {
//                 console.log("error", error);
//                 response.status(201).json({ statusCode: 201, message: 'Cannot Insert Details' })
//             } else {
//                 response.status(200).json({ statusCode: 200, message: 'Succsessfully added  a new hostel' })
//             }
//         })


//         //     }
//         // })
//         // connection.query(query, function (error, data) {
//         //     if (error) {
//         //         console.log("error", error);
//         //         response.status(201).json({ message: 'Cannot Insert Details' })
//         //     }
//         //     else {
//         //         const query2 = ` select * from hosteldetails where hostel_PhoneNo=\'${reqHostel.hostel_Phone}\'`
//         //         connection.query(query2, function (error, datum) {
//         //             if (datum.length > 0) {
//         //                 response.status(200).json({ message: 'Data Saved Successfully', statusCode: 200 })
//         //             }

//         //             else {
//         //                 response.status(201).json({ message: 'Phone number not Registered' })
//         //             }

//         //         })
//         //     }
//         // })
//     }
// }

async function createPG(reqHostel, res, req) {

    const created_by = req.user_details.id;
    const timestamp = Date.now();

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var bucket_name = "smartstaydevs";
    var folderName = "Hostel-Images/";

    var { hostel_name, hostel_phone, hostel_email, hostel_location, profile, image1, image2, image3, image4, id } = reqHostel

    if (!hostel_name || !hostel_phone || !hostel_location) {
        return res.status(201).json({ message: "Please Add All Required Fields", statusCode: 201 })
    }

    let profile_url = 0;
    let image1_url = 0;
    let image2_url = 0;
    let image3_url = 0;
    let image4_url = 0;

    if (!profile) {
        profile_url = req.body.profile || 0
    } else {

        profile_url = await uploadImage.uploadProfilePictureToS3Bucket(bucket_name, folderName, `${hostel_name}` + `${timestamp}` + `${profile.originalname}`, profile)
        console.log(profile_url);
    }

    if (!image1) {
        image1_url = req.body.image1 || 0
    } else {
        image1_url = await uploadImage.uploadProfilePictureToS3Bucket(bucket_name, folderName, `${hostel_name}` + `${timestamp}` + `${image1.originalname}`, image1)
    }

    if (!image2) {
        image2_url = req.body.image2 || 0
    } else {
        image2_url = await uploadImage.uploadProfilePictureToS3Bucket(bucket_name, folderName, `${hostel_name}` + `${timestamp}` + `${image2.originalname}`, image2)
    }

    if (!image3) {
        image3_url = req.body.image3 || 0
    } else {
        image3_url = await uploadImage.uploadProfilePictureToS3Bucket(bucket_name, folderName, `${hostel_name}` + `${timestamp}` + `${image3.originalname}`, image3)
    }

    if (!image4) {
        image4_url = req.body.image4 || 0
    } else {
        image4_url = await uploadImage.uploadProfilePictureToS3Bucket(bucket_name, folderName, `${hostel_name}` + `${timestamp}` + `${image4.originalname}`, image4)
    }

    if (id) {

        if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_edit == 1)) {

            var sql1 = "SELECT * FROM hosteldetails WHERE id=? AND isActive=1";
            connection.query(sql1, [id, created_by], function (err, hos_data) {
                if (err) {
                    return res.status(201).json({ message: "Unable to Get Hostel Details", statusCode: 201 })
                } else if (hos_data.length != 0) {

                    var sql2 = "UPDATE hosteldetails SET Name=?,email_id=?,Address=?,hostel_PhoneNo=?,profile=?,image1=?,image2=?,image3=?,image4=? WHERE id=?";
                    connection.query(sql2, [hostel_name, hostel_email, hostel_location, hostel_phone, profile_url, image1_url, image2_url, image3_url, image4_url, id], function (err, up_data) {
                        if (err) {
                            return res.status(201).json({ message: "Unable to Update Hostel Details", statusCode: 201 })
                        } else {

                            var sql3 = "UPDATE hostel SET HostelName='" + hostel_name + "' WHERE Hostel_Id=" + id + " AND isActive=1;";
                            var sql4 = "UPDATE compliance SET hostelname='" + hostel_name + "' WHERE Hostel_id=" + id + " AND isActive=1;";
                            var sql6 = "UPDATE invoicedetails SET Hostel_Name='" + hostel_name + "' WHERE Hostel_Id=" + id + "";
                            var sql5 = sql3 + sql4 + sql6;
                            connection.query(sql5, function (err, up_res) {
                                if (err) {
                                    return res.status(201).json({ message: "Unable to Update Hostel Details", statusCode: 201 })
                                } else {
                                    return res.status(200).json({ message: 'Changes Saved Successfully', statusCode: 200 })
                                }
                            })
                        }
                    })
                } else {
                    return res.status(201).json({ message: "Invalid Hostel Details", statusCode: 201 })
                }
            })
        } else {
            res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    } else {

        if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_create == 1)) {

            const sql1 = "INSERT INTO hosteldetails(Name,hostel_PhoneNo,email_id,Address,created_By,isHostelBased,profile,image1,image2,image3,image4) VALUES (?,?,?,?,?,?,?,?,?,?,?)";
            connection.query(sql1, [hostel_name, hostel_phone, hostel_email, hostel_location, created_by, 0, profile_url, image1_url, image2_url, image3_url, image4_url], function (error, data) {
                if (error) {
                    console.log("error", error);
                    return res.status(201).json({ statusCode: 201, message: 'Cannot Insert Details' })
                } else {
                    return res.status(200).json({ statusCode: 200, message: 'PG Added Succsessfully' })
                }
            })
        } else {
            res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    }
}

function FloorList(connection, request, response) {

    const requestData = request.body

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

        if (requestData) {
            let query = `SELECT hos.id,hos.hostel_id,hos.floor_id,hos.floor_name,hos.status,hosroom.Room_Id,
        hosroom.Number_Of_Beds,hosroom.Price,hosroom.Created_By,hosroom.Created_At 
FROM Hostel_Floor hos 
LEFT JOIN hostelrooms hosroom 
ON hos.hostel_id = hosroom.Hostel_Id AND hos.id = hosroom.Floor_Id  
WHERE hos.hostel_id =  ${requestData.hostel_Id} AND hos.status= true`
            connection.query(query, function (error, data) {
                if (data) {
                    response.status(200).json({ data: data })
                }
                else {
                    response.status(201).json({ message: 'No Data Found' })
                }
            })
        }
        else {
            response.status(201).json({ message: 'Missing Parameter' })
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}


function RoomList(connection, request, response) {

    const reqData = request.body;
    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

        if (reqData) {
            connection.query(`select * from hostelrooms where Hostel_Id = \'${reqData.hostel_Id}\' and Floor_Id =  \'${reqData.floor_Id}\' and isActive=1`, function (error, data) {
                if (data) {
                    response.status(200).json({ data: data })
                }
                else {
                    response.status(201).json({ message: 'No Data Found' })
                }
            })
        }
        else {
            response.status(201).json({ message: 'Missing Parameter' })
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }

}


function BedList(connection, request, response) {

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;
    const requestBodyData = request.body;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

        if (requestBodyData) {
            connection.query(`select hosroom.Hostel_Id,hosroom.Floor_Id,hosroom.Room_Id,hosroom.Number_Of_Beds,hosroom.Price,COUNT(hos.Bed) as availableBed from hostelrooms hosroom INNER JOIN hostel hos on hosroom.Room_Id = hos.Rooms where hosroom.Hostel_Id = \'${requestBodyData.hostel_Id}\' and hosroom.Floor_Id = \'${requestBodyData.floor_Id}\' and hosroom.Room_Id = \'${requestBodyData.room_Id}\' and hosroom.isActive=1;`, function (error, data) {

                if (data) {
                    // console.log("data", data);
                    let responseData = data.map((val) => ({
                        Hostel_Id: val.Hostel_Id,
                        Floor_Id: val.Floor_Id,
                        Room_Id: val.Room_Id,
                        AvailableBed: val.Number_Of_Beds - val.availableBed
                    }
                    ))
                    response.status(200).json({ responseData: responseData })
                }
                else {
                    response.status(201).json({ message: 'No Data Found' })
                }
            })
        }
        else {
            response.status(201).json({ message: 'Missing Parameter' })
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function RoomCount(connection, request, response) {
    let responseData = [];
    let errorMessage;

    const reqFloorID = request.body;

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

        if (reqFloorID) {

            var sql1 = "SELECT *,hs.id AS room_id, hs.Room_Id  FROM hostelrooms AS hs JOIN Hostel_Floor AS hf ON hf.hostel_id=hs.Hostel_Id AND hf.floor_id=hs.Floor_Id WHERE hs.Floor_Id=? AND hs.Hostel_Id=? AND hs.isActive=true   ORDER BY CASE WHEN hs.Room_Id REGEXP '^[0-9]+$' THEN CAST(hs.Room_Id AS UNSIGNED) ELSE 0  END ASC, hs.Room_Id ASC";
            connection.query(sql1, [reqFloorID.floor_Id, reqFloorID.hostel_Id], function (error, RoomsData) {
                if (error) {
                    console.log(error);

                    return response.status(201).json({ message: "Error occurred while fetching data" });
                }

                console.log("RoomsData", RoomsData)

                if (RoomsData.length > 0) {

                    let roomsProcessed = 0;

                    for (let i = 0; i < RoomsData.length; i++) {
                        const Room_Id = RoomsData[i].room_id;


                        connection.query(`SELECT COUNT('Bed') AS bookedBedCount, hos.Hostel_Id AS hostel_Id, hos.Floor, hos.Rooms FROM hostel hos WHERE Floor = '${reqFloorID.floor_Id}' AND Hostel_Id = '${reqFloorID.hostel_Id}' AND Rooms = '${Room_Id}' AND hos.isActive = true`, function (error, hostelData) {
                            if (error) {
                                errorMessage = error;
                            } else {
                                const objectFormation = {
                                    bookedBedCount: hostelData[0].bookedBedCount,
                                    Hostel_Id: RoomsData[i].Hostel_Id,
                                    Floor_Id: RoomsData[i].Floor_Id,
                                    Room_Id: RoomsData[i].room_id,
                                    Room_Name: RoomsData[i].Room_Id,
                                    Number_Of_Beds: RoomsData[i].Number_Of_Beds,
                                    Room_Rent: RoomsData[i].Price,
                                    isActive: RoomsData[i].isActive
                                };

                                responseData.push(objectFormation);

                                var bed_query = `SELECT bd.id,bd.bed_no, bd.bed_amount, bd.isfilled FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id = hr.id WHERE hr.Hostel_Id = '${objectFormation.Hostel_Id}' AND hr.Floor_Id = '${objectFormation.Floor_Id}' AND hr.id = '${objectFormation.Room_Id}' AND bd.status = 1 AND hr.isActive = 1`;

                                connection.query(bed_query, (err, bed_data) => {
                                    if (err) {
                                        responseData[i]['bed_details'] = 0;
                                    } else {
                                        responseData[i]['bed_details'] = bed_data;
                                    }

                                    roomsProcessed++;

                                    if (roomsProcessed === RoomsData.length) {
                                        if (errorMessage) {
                                            response.status(202).json({ message: "Error occurred while fetching data" });
                                        } else {
                                            response.status(200).json({ responseData: responseData });
                                        }
                                    }
                                });
                            }
                        });
                    }
                } else {
                    response.status(201).json({ message: "No Data Found" });
                }
            });
        } else {
            response.status(201).json({ message: "Missing Parameter" });
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function ListForFloor(connection, request, response) {

    const reqData = request.body;
    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

        if (reqData && reqData.hostel_Id) {
            let query = `SELECT hos.id,hos.hostel_id,hos.floor_id,hos.floor_name,hos.status,hosroom.Room_Id,
        hosroom.Number_Of_Beds,hosroom.Price,hosroom.Created_By,hosroom.Created_At 
FROM Hostel_Floor hos 
LEFT JOIN hostelrooms hosroom 
ON hos.hostel_id = hosroom.Hostel_Id AND hos.id = hosroom.Floor_Id  
WHERE hos.hostel_id =  ${reqData.hostel_Id} AND hos.status= true`
            // connection.query(`select * from hostelrooms where  Hostel_Id = \'${reqData.hostel_Id}\' and isActive= true`, function (error, hostel_data) {
            connection.query(query, function (error, hostel_data) {
                if (error) {
                    response.status(201).json({ message: "No User Found" })
                }
                else {
                    if (hostel_data && hostel_data.length > 0) {

                        const floorsMap = new Map();

                        hostel_data.forEach(row => {
                            // If the floor does not exist in the map, add it
                            if (!floorsMap.has(row.floor_id)) {
                                floorsMap.set(row.floor_id, {
                                    id: row.id,
                                    hostel_id: row.hostel_id,
                                    floor_id: row.floor_id,
                                    floor_name: row.floor_name,
                                    status: row.status,
                                    floor_Details: []
                                });
                            }

                            // Add room details if they exist
                            if (row.Room_Id) {
                                floorsMap.get(row.floor_id).floor_Details.push({
                                    Room_Id: row.Room_Id,
                                    Number_Of_Beds: row.Number_Of_Beds,
                                    Price: row.Price,
                                    Created_By: row.Created_By,
                                    Created_At: row.Created_At
                                });
                            }
                        });

                        // Convert map values to an array
                        // return Array.from(floorsMap.values());
                        // console.log("Array.from(floorsMap.values())", Array.from(floorsMap.values()));

                        response.status(200).json({ hostel_data: Array.from(floorsMap.values()) })
                    } else {

                        response.status(200).json({ hostel_data: hostel_data })
                    }

                }
            })
        }
        else {
            response.status(201).json({ message: "Missing Parameter" })
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

// async function CreateRoom(connection, request, response) {

//     var reqsData = request.body;
//     var created_by = request.user_details.id;

//     if (!reqsData) {
//         return response.status(400).json({ message: 'Missing Parameter' });
//     }

//     try {
//         const hostelIdQuery = `SELECT * FROM hosteldetails WHERE id='${reqsData.id}'`;
//         const hostelData = await new Promise((resolve, reject) => {
//             connection.query(hostelIdQuery, (error, results) => {
//                 if (error) return reject(error);
//                 resolve(results);
//             });
//         });

//         if (!hostelData || hostelData.length === 0) {
//             return response.status(404).json({ message: 'No Data Found' });
//         }

//         const hostelId = hostelData[0].id;
//         let errorMessage = null;
//         let message = null;

//         for (const currentRoom of reqsData.floorDetails) {
//             const checkRoomQuery = `SELECT Room_Id, Number_Of_Beds FROM hostelrooms WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}' AND isActive=1`;

//             const existingRoom = await new Promise((resolve, reject) => {
//                 connection.query(checkRoomQuery, (error, results) => {
//                     if (error) return reject(error);
//                     resolve(results);
//                 });
//             });

//             if (existingRoom.length > 0) {
//                 message = `Room ID is already exists.`;

//                 if (currentRoom.number_of_beds && currentRoom.roomRent) {
//                     errorMessage = message;
//                 } else {
//                     const bed = Number(existingRoom[0].Number_Of_Beds) + Number(currentRoom.number_of_beds);
//                     const updateQuery = `UPDATE hostelrooms SET Number_Of_Beds = '${bed}' WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}'`;

//                     await new Promise((resolve, reject) => {
//                         connection.query(updateQuery, (error, results) => {
//                             if (error) return reject(error);
//                             resolve(results);
//                         });
//                     });
//                 }
//             } else {
//                 const insertQuery = `INSERT INTO hostelrooms (Hostel_Id, Floor_Id, Room_Id, Number_Of_Beds, Price,Created_By) VALUES ('${hostelId}', '${currentRoom.floorId}', '${currentRoom.roomId}', '${currentRoom.number_of_beds}', '${currentRoom.roomRent}','${created_by}')`;

//                 await new Promise((resolve, reject) => {
//                     connection.query(insertQuery, (error, results) => {
//                         if (error) return reject(error);
//                         resolve(results);
//                     });
//                 });
//             }
//         }

//         if (errorMessage) {
//             response.status(201).json({ message: errorMessage,statusCode:201 });
//         } else {

//             response.status(200).json({ message: message && message.length > 0 ? message : 'Create Room Details successfully' });
//         }
//     } catch (error) {
//         response.status(201).json({ message: 'Database Error', error: error.message });
//     }
// }


function CreateRoom(connection, request, response) {

    var reqsData = request.body;
    var created_by = request.user_details.id;

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    console.log("reqsData", reqsData)

    if (!reqsData) {
        return response.status(201).json({ message: 'Missing Parameter' });
    }

    if (reqsData.id) {

        if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_edit == 1)) {

            var sql1 = "SELECT * FROM hostelrooms WHERE id='" + reqsData.id + "'";
            connection.query(sql1, function (err, data) {
                if (err) {
                    return response.status(201).json({ statusCode: 201, message: "Unable to Get Room Details" })
                } else if (data.length != 0) {

                    var old_room = data[0].Room_Id;
                    var floor_id = data[0].Floor_Id;
                    var hostel_id = reqsData.hostel_id;
                    var room_id = reqsData.roomId;

                    var sql3 = "SELECT * FROM hostelrooms WHERE Room_Id=? AND id !=? AND Hostel_Id=? AND isActive=1";
                    connection.query(sql3, [room_id, reqsData.id, hostel_id], function (err, sel_data) {
                        if (err) {
                            return response.status(201).json({ statusCode: 201, message: "Unable to Get Room Details" })
                        } else if (sel_data.length == 0) {

                            var sql2 = "UPDATE hostelrooms SET Room_Id=? WHERE id=?";
                            connection.query(sql2, [room_id, reqsData.id], function (err, ins_data) {
                                if (err) {
                                    return response.status(201).json({ statusCode: 201, message: "Unable to Update Room Details" })
                                } else {

                                    return response.status(200).json({ statusCode: 200, message: "Successfully Room Updated" })

                                    // var sql3 = "UPDATE hostel SET Rooms=? WHERE Rooms=? AND Hostel_Id=? AND Floor=? AND isActive=1";
                                    // connection.query(sql3, [room_id, old_room, hostel_id, floor_id], function (err, up_hos) {
                                    //     if (err) {
                                    //         return res.status(201).json({ statusCode: 201, message: "Unable to Update Room Details" })
                                    //     } else {

                                    //         var sql4 = "UPDATE compliance SET Room=? WHERE Hostel_id=? AND Floor_Id=?";
                                    //         connection.query(sql4, [room_id, hostel_id, floor_id], function (err, up_hos) {
                                    //             if (err) {
                                    //                 return res.status(201).json({ statusCode: 201, message: "Unable to Update Room Details" })
                                    //             } else {

                                    //                 var sql5 = "UPDATE EbAmount SET Room=? WHERE hostel_Id=? AND Floor=?";
                                    //                 connection.query(sql5, [room_id, hostel_id, floor_id], function (err, up_hos) {
                                    //                     if (err) {
                                    //                         return res.status(201).json({ statusCode: 201, message: "Unable to Update Room Details" })
                                    //                     } else {

                                    //                         var sql6 = "UPDATE invoicedetails SET Room_No=? WHERE Hostel_Id=? AND Floor_Id=?";
                                    //                         connection.query(sql6, [room_id, hostel_id, floor_id], function (err, up_hos) {
                                    //                             if (err) {
                                    //                                 return res.status(201).json({ statusCode: 201, message: "Unable to Update Room Details" })
                                    //                             } else {
                                    //                                 return res.status(200).json({ statusCode: 200, message: "Successfully Room Updated" })
                                    //                             }
                                    //                         })
                                    //                     }
                                    //                 })
                                    //             }
                                    //         })
                                    //     }

                                    // })
                                }
                            })
                        } else {
                            return response.status(201).json({ statusCode: 201, message: "Room Name Already Exist!" })
                        }
                    })

                } else {
                    return response.status(201).json({ statusCode: 201, message: "Invalid Room Details" })
                }
            })
        } else {
            response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    } else {

        if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_create == 1)) {

            const checkRoomQuery = `SELECT * FROM hostelrooms WHERE Hostel_Id = '${reqsData.hostel_id}' AND Floor_Id = '${reqsData.floorId}' AND Room_Id = '${reqsData.roomId}' AND isActive=1;`
            connection.query(checkRoomQuery, (error, existingRoom) => {
                if (error) {
                    return response.status(500).json({ message: 'Database Error', error: error.message });
                }
                if (existingRoom.length > 0) {
                    return response.status(201).json({ message: 'Room ID already exists', statusCode: 201 });
                } else {
                    const insertQuery = `INSERT INTO hostelrooms (Hostel_Id, Floor_Id, Room_Id, Created_By) VALUES ('${reqsData.hostel_id}', '${reqsData.floorId}', '${reqsData.roomId}',  '${created_by}');`

                    connection.query(insertQuery, (error, results) => {
                        if (error) {
                            return response.status(500).json({ message: 'Database Error', error: error.message });
                        }

                        return response.status(200).json({ message: 'Room created successfully' });
                    });
                }


            });
        } else {
            response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    }
}

function CreateFloor(req, res) {

    var floor_name = req.body.floor_Id;
    var hostel_id = req.body.hostel_Id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_create == 1)) {

        if (!floor_name || !hostel_id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        var normalizedFloorName = floor_name.replace(/\s+/g, '').toLowerCase();

        var sq1 = "SELECT * FROM Hostel_Floor WHERE hostel_id =? AND REPLACE(LOWER(floor_name), ' ', '') = ? AND status=1";
        connection.query(sq1, [hostel_id, normalizedFloorName], function (err, floor_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: 'Unable to Get Floor Details' })
            } else if (floor_data.length == 0) {

                var sql3 = "SELECT * FROM Hostel_Floor WHERE hostel_id='" + hostel_id + "' ORDER BY id DESC LIMIT 1";
                connection.query(sql3, function (err, fl_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: 'Unable to Get Floor Details' })
                    } else {
                        var floor_id;
                        if (fl_data.length != 0) {
                            floor_id = fl_data[0].floor_id + 1;
                        } else {
                            floor_id = 1;
                        }

                        var sql2 = "INSERT INTO Hostel_Floor(hostel_id,floor_name,floor_id,status) VALUES (?,?,?,1)";
                        connection.query(sql2, [hostel_id, floor_name, floor_id], function (err, ins_data) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: 'Unable to Add Floor Details' })
                            } else {
                                return res.status(200).json({ statusCode: 200, message: 'Successfully Added ' + floor_name })
                            }
                        })
                    }
                })

            } else {
                return res.status(202).json({ statusCode: 202, message: 'Floor Name is Already Exist' })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function update_floor(req, res) {

    var floor_name = req.body.floor_Id;
    var hostel_id = req.body.hostel_Id;
    var id = req.body.id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_edit == 1)) {

        if (!floor_name || !hostel_id || !id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        var normalizedFloorName = floor_name.replace(/\s+/g, '').toLowerCase();

        var sq1 = "SELECT * FROM Hostel_Floor WHERE hostel_id =? AND REPLACE(LOWER(floor_name), ' ', '') = ? AND status=1 AND floor_id !='" + id + "'";
        connection.query(sq1, [hostel_id, normalizedFloorName], function (err, floor_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: 'Unable to Get Floor Details' })
            } else if (floor_data.length == 0) {

                var sql2 = "UPDATE Hostel_Floor SET floor_name=? WHERE hostel_id=? AND floor_id=?";
                connection.query(sql2, [floor_name, hostel_id, id], function (err, up_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: 'Unable to Add Floor Details' })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: 'Successfully Updated ' + floor_name })
                    }
                })

            } else {
                return res.status(202).json({ statusCode: 202, message: 'Floor Name is Already Exist' })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}


// function CreateFloor(connection, reqDataFloor, response) {

//     if (reqDataFloor && reqDataFloor.hostel_Id && reqDataFloor.floor_Id) {
//         let floor_Name = reqDataFloor.floor_Name ? reqDataFloor.floor_Name : null;
//         let query1 = `select * from Hostel_Floor where hostel_id = ${reqDataFloor.hostel_Id} and floor_name = ${reqDataFloor.floor_Id} and status = true`
//         connection.query(query1, function (select_err, select_data) {
//             if (select_err) {
//                 console.log("select_err", select_err);
//                 response.status(201).json({ message: 'Unable to Get Floor Details' })
//             }
//             else {
//                 if (select_data && select_data.length > 0) {
//                     response.status(202).json({ message: 'Floor Number is already exist' })
//                 } else {
//                     let query2 = `insert into Hostel_Floor(hostel_id,floor_name) values(${reqDataFloor.hostel_Id},${reqDataFloor.floor_Id},'${floor_Name}');`

//                     connection.query(query2, function (inserror, create_floor) {
//                         if (inserror) {
//                             console.log("inserror", inserror);
//                             response.status(201).json({ message: 'Cannot save Floor Details' })
//                         }
//                         else {
//                             response.status(200).json({ message: 'Floor Details Saved Successfully' })
//                         }
//                     })
//                 }
//             }
//         })
//     }
//     else {
//         response.status(201).json({ message: 'Missing Parameter' })
//     }
// }


function RoomFull(connection, request, response) {

    const reqFloorID = request.body;
    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

        if (reqFloorID) {
            const query1 = `SELECT hos.Hostel_Id,hosRoom.Hostel_Id as hostel_Id, hos.Floor,hos.Rooms, hosRoom.Floor_Id,hosRoom.id as Room_Id,hosRoom.Room_Id as Room_Name, COUNT(hos.bed)as occupiedBeds ,hosRoom.Number_Of_Beds FROM hostel hos INNER JOIN hostelrooms hosRoom on hos.Floor = hosRoom.Floor_Id and hos.Rooms = hosRoom.Room_Id WHERE hosroom.Hostel_Id = \'${reqFloorID.hostel_Id}\' and hosroom.Floor_Id = \'${reqFloorID.floor_Id}\' and hosroom.id = \'${reqFloorID.room_Id}\' and hosroom.isActive=1`
            connection.query(query1, function (error, data) {
                if (data) {
                    response.status(200).json({ data: data })
                }
                else {
                    response.status(201).json({ message: "No Data Found" })
                }
            })
        } else {
            response.status(201).json({ message: "Missing Parameter" })
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function UpdateEB(connection, atten, response) {

    if (atten) {
        connection.query(`UPDATE hosteldetails SET isHostelBased= ${atten.Ishostelbased} WHERE id='${atten.Id}'`, function (error, data) {
            if (error) {
                response.status(201).json({ message: "doesn't update" });
            } else {
                response.status(200).json({ message: "Update Successfully" });
            }
        });
    }

};
function listDashBoard(connection, response, request) {

    var created_by = request.user_details.id;
    let startingYear = new Date().getFullYear() - 1;
    // console.log("startingYear", startingYear);
    let endingYear = new Date().getFullYear();

    var show_ids = request.show_ids;
    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[0] && role_permissions[0].per_view == 1)) {

        var hostel_id = request.body.hostel_id;

        if (!hostel_id) {
            return response.status(201).json({ statusCode: 201, message: "Missing Hostel Details" });
        }

        // var sql1 = "select creaccount.first_name,creaccount.last_name,COALESCE((select count(id) from hosteldetails where created_By=details.created_By AND isActive=1),0) as hostelCount,COALESCE(sum((select count(Room_Id) from hostelrooms where Hostel_Id=details.id AND isActive=1)),0) as roomCount,COALESCE((SELECT COUNT(bd.id) FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id=hr.id JOIN hosteldetails AS hd ON hd.id=hr.Hostel_Id AND hd.isActive=1 AND hr.isActive=1 AND bd.status=1 AND bd.isfilled=0 AND hd.created_By IN (" + show_ids + ")),0) as Bed,COALESCE((SELECT COUNT(bd.id) FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id=hr.id JOIN hosteldetails AS hd ON hd.id=hr.Hostel_Id AND hd.isActive=1 AND hr.isActive=1 AND bd.status=1 AND bd.isfilled=1 AND hd.created_By IN (" + show_ids + ")),0) as occupied_Bed,(select COALESCE(SUM(COALESCE(icv.Amount, 0)),0) AS revenue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id=hos.id WHERE hos.created_By IN (" + show_ids + ")) AS Revenue,(select COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) AS revenue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id=hos.id WHERE hos.created_By IN (" + show_ids + ") AND icv.BalanceDue != 0) AS overdue,(select COALESCE(COUNT(COALESCE(hos.id, 0)), 0) AS customer_count FROM hostel AS hos JOIN hosteldetails AS hrtl ON hos.Hostel_Id=hrtl.id AND hos.isActive=1 WHERE hos.created_By IN (" + show_ids + ") AND hrtl.isActive = 1) AS customer_count,(select COALESCE(SUM(COALESCE(rr.total_amount, 0)), 0) AS eb_amount FROM room_readings AS rr WHERE rr.created_By IN (" + show_ids + ") AND rr.status = 1) AS eb_amount,(select COALESCE(SUM(COALESCE(total_price, 0)), 0) AS asset_amount FROM assets WHERE created_by IN (" + show_ids + ") AND status = 1) AS asset_amount from hosteldetails details join createaccount creaccount on creaccount.id = details.created_by where details.created_By IN (" + show_ids + ") GROUP BY creaccount.id;";
        var sql1 = "SELECT creaccount.first_name, creaccount.last_name, COALESCE((SELECT COUNT(id) FROM hosteldetails WHERE created_By = details.created_By AND isActive = 1), 0) AS hostelCount, COALESCE((SELECT COUNT(Room_Id) FROM hostelrooms WHERE Hostel_Id = details.id AND isActive = 1), 0) AS roomCount, COALESCE((SELECT COUNT(bd.id) FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id = hr.id WHERE hr.Hostel_Id = details.id AND hr.isActive = 1 AND bd.status = 1 AND bd.isfilled = 0), 0) AS Bed, COALESCE((SELECT COUNT(bd.id) FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id = hr.id WHERE hr.Hostel_Id = details.id AND hr.isActive = 1 AND bd.status = 1 AND bd.isfilled = 1), 0) AS occupied_Bed, (SELECT COALESCE(SUM(COALESCE(icv.Amount, 0)), 0) FROM invoicedetails AS icv WHERE icv.Hostel_Id = details.id) AS Revenue, (SELECT COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) FROM invoicedetails AS icv WHERE icv.Hostel_Id = details.id AND icv.BalanceDue != 0) AS overdue, (SELECT COALESCE(COUNT(hos.id), 0) FROM hostel AS hos WHERE hos.Hostel_Id = details.id AND hos.isActive = 1) AS customer_count, (SELECT COALESCE(SUM(COALESCE(rr.total_amount, 0)), 0) FROM room_readings AS rr WHERE rr.hostel_id = details.id AND rr.status = 1) AS eb_amount, (SELECT COALESCE(SUM(COALESCE(total_price, 0)), 0) FROM assets WHERE hostel_id = details.id AND status = 1) AS asset_amount FROM hosteldetails AS details JOIN createaccount AS creaccount ON creaccount.id = details.created_by WHERE details.id = ? GROUP BY creaccount.id;"
        connection.query(sql1, [hostel_id], function (error, data) {
            if (error) {
                console.log(error, "Error Message");
                response.status(201).json({ message: "No data found", error: error.message });
            } else {

                let project_amount;

                var sql12 = "SELECT *, CASE WHEN CheckoutDate IS NOT NULL AND ((MONTH(CheckoutDate) <= MONTH(NOW()) AND YEAR(CheckoutDate) = YEAR(NOW())) OR (YEAR(CheckoutDate) < YEAR(NOW()))) THEN 0 WHEN CheckoutDate IS NOT NULL AND MONTH(CheckoutDate) = MONTH(DATE_ADD(NOW(), INTERVAL 1 MONTH)) AND YEAR(CheckoutDate) = YEAR(DATE_ADD(NOW(), INTERVAL 1 MONTH)) THEN ROUND((DAY(CheckoutDate) / DAY(LAST_DAY(DATE_ADD(NOW(), INTERVAL 1 MONTH)))) * RoomRent, 2) ELSE RoomRent END AS projected_amount FROM hostel WHERE Hostel_Id=? AND isActive = 1;";
                connection.query(sql12, [hostel_id], function (err, pro_res) {
                    if (err) {
                        console.log("Unable to get Projection");
                        response.status(201).json({ message: "Unable to get Projection", error: err.message });
                    } else {

                        if (data.length > 0) {
                            let obj = {};
                            // let tempArray = []
                            let dashboardList = data.map((item) => {
                                if (item.Revenue > 0) {
                                    var current = item.Revenue - item.overdue
                                } else {
                                    var current = 0
                                }

                                if (pro_res.length != 0) {

                                    pro_res.forEach((item) => {
                                        console.log(item.projected_amount);
                                    });

                                    const projectedAmounts = pro_res.map((item) => item.projected_amount || 0);

                                    project_amount = projectedAmounts.reduce((total, amount) => total + amount, 0);

                                } else {
                                    project_amount = 0;
                                }

                                obj = {
                                    hostelCount: item.hostelCount,
                                    roomCount: item.roomCount,
                                    TotalBed: item.occupied_Bed + item.Bed,
                                    occupied_Bed: item.occupied_Bed,
                                    availableBed: item.Bed,
                                    Revenue: item.Revenue,
                                    overdue: item.overdue,
                                    current: current,
                                    first_name: item.first_name,
                                    last_name: item.last_name,
                                    eb_amount: item.eb_amount,
                                    asset_amount: item.asset_amount,
                                    free_bed: item.Bed,
                                    customer_count: item.customer_count,
                                    project_amount: project_amount
                                }
                                // tempArray.push(obj)
                                return obj
                            })
                            // })

                            // Complaint list
                            var sql2 = "SELECT com.*,hos.profile,CASE WHEN com.user_type = 1 THEN com.created_by ELSE hos.id END AS com_created_by,ct.complaint_name FROM compliance AS com JOIN hostel AS hos ON com.User_id = hos.User_Id JOIN complaint_type AS ct ON ct.id = com.Complainttype WHERE CASE WHEN com.user_type = 1 THEN com.hostel_id ELSE hos.id END =? AND com.Status != 'Completed' ORDER BY com.ID DESC LIMIT 5;"
                            connection.query(sql2, [hostel_id], function (err, com_data) {
                                if (err) {
                                    response.status(201).json({ message: "Unable to Get Complaince Details", err: err.message });
                                } else {
                                    // Get Revenue Details 
                                    // var query1 = `SELECT m.month,COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue,COALESCE(SUM(COALESCE(expen.purchase_amount, 0)), 0) AS expense FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.created_By IN (${created_by})) AS invo ON m.month = invo.month LEFT JOIN (SELECT DATE_FORMAT(expen.createdate, '%Y-%m') AS month, expen.purchase_amount FROM expenses AS expen WHERE expen.created_by IN (${created_by})) AS expen ON m.month = expen.month GROUP BY m.month ORDER BY m.month;`

                                    // Booking Data
                                    var sql4 = "SELECT id,first_name,last_name,amount,joining_date FROM bookings WHERE status=1 AND hostel_id=? ORDER BY id DESC LIMIT 5;";
                                    connection.query(sql4, [hostel_id], function (err, book_data) {
                                        if (err) {
                                            response.status(201).json({ message: "Error fetching Booking Data" });
                                        } else {

                                            var sql5 = "SELECT inv.id,inv.Invoices,inv.DueDate,inv.Amount AS total_amount FROM invoicedetails AS inv JOIN hosteldetails AS hs ON hs.id=inv.Hostel_Id WHERE hs.id =? AND inv.invoice_status=1 and inv.BalanceDue !=0 ORDER BY id DESC LIMIT 5;"
                                            connection.query(sql5, [hostel_id], function (err, bill_details) {
                                                if (err) {
                                                    response.status(201).json({ message: "Error fetching Bill Data" });
                                                } else {

                                                    // var query1 = "SELECT m.month,COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue,COALESCE(SUM(COALESCE(expen.purchase_amount, 0)), 0) AS expense FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month,invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.id=?) AS invo ON m.month = invo.month LEFT JOIN (SELECT DATE_FORMAT(expen.createdate, '%Y-%m') AS month, expen.purchase_amount FROM expenses AS expen WHERE expen.hostel_id=?) AS expen ON m.month = expen.month GROUP BY m.month ORDER BY  m.month;"
                                                    // Execute the query
                                                    var query1 = "SELECT m.month, COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue, COALESCE(SUM(COALESCE(expen.purchase_amount, 0)), 0) AS expense FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.id = ? AND invo.action != 'advance') AS invo ON m.month = invo.month LEFT JOIN (SELECT DATE_FORMAT(expen.createdate, '%Y-%m') AS month, expen.purchase_amount FROM expenses AS expen WHERE expen.hostel_id = ?) AS expen ON m.month = expen.month GROUP BY m.month ORDER BY m.month;"
                                                    connection.query(query1, [hostel_id, hostel_id], (error, results, fields) => {
                                                        if (error) {
                                                            console.error('Error executing query:', error);
                                                            return;
                                                        } else {
                                                            // expense category
                                                            var sql2 = "SELECT SUM(expen.purchase_amount) AS purchase_amount, expen.category_id, category.category_Name FROM expenses expen JOIN Expense_Category_Name category ON category.id = expen.category_id WHERE expen.status = true AND expen.hostel_id=? AND YEAR(expen.purchase_date) = YEAR(CURDATE()) AND MONTH(expen.createdate) = MONTH(CURDATE()) GROUP BY expen.category_id";
                                                            // console.log("query", query);
                                                            connection.query(sql2, [hostel_id], function (error, data) {
                                                                if (error) {
                                                                    console.log("error", error);
                                                                    response.status(201).json({ message: "Error fetching Data" });
                                                                }
                                                                else {
                                                                    if (data.length > 0) {
                                                                        // console.log("data",data);

                                                                        let total_amount = 0
                                                                        for (let i of data) {
                                                                            // console.log("i",i);

                                                                            total_amount += i.purchase_amount;
                                                                        }

                                                                        response.status(200).json({ dashboardList: dashboardList, Revenue_reports: results, total_amount: total_amount, categoryList: data, com_data: com_data, book_data: book_data, bill_details: bill_details });

                                                                    } else {
                                                                        response.status(200).json({ dashboardList: dashboardList, Revenue_reports: results, total_amount: 0, categoryList: [], com_data: com_data, book_data: book_data, bill_details: bill_details });
                                                                    }
                                                                }
                                                            })
                                                        }
                                                    })
                                                }
                                            })
                                        }
                                    })


                                }
                            })
                        } else {
                            response.status(200).json({ dashboardList: [], Revenue_reports: [], totalAmount: [], categoryList: [], com_data: [] });
                        }
                    }

                })
            }
        })
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
    // } else {
    //     response.status(201).json({ message: "Missing Parameter" });
    // }
}

function deleteHostel(request, response) {
    let req = request.body
    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_delete == 1)) {

        if (req && req.hostel_Id) {

            let query = `SELECT * FROM hostel where Hostel_Id = ${req.hostel_Id} and isActive = true;`
            connection.query(query, function (floorError, floorData) {
                if (floorError) {
                    response.status(201).json({ message: "Error While Fetching Hostel room details" });
                }
                else {
                    if (floorData && floorData.length != 0) {
                        response.status(201).json({ message: "This hostel has some users, so first delete the users.", FloorStatus: 201 });
                    }
                    else {
                        connection.query(`SELECT * FROM hosteldetails WHERE id = ${req.hostel_Id} and isActive = true`, function (selErr, selData) {
                            if (selErr) {
                                response.status(201).json({ message: "Error While Fetching Hostel details" });
                            }
                            else {
                                if (selData && selData.length > 0) {
                                    let query = `UPDATE hosteldetails SET isActive = false WHERE id = ${req.hostel_Id}`
                                    connection.query(query, function (delErr, deldata) {
                                        if (delErr) {
                                            response.status(201).json({ message: "doesn't update" });
                                        } else {
                                            connection.query(`select * from Hostel_Floor where hostel_id= ${req.hostel_Id}`, function (err, floorData) {
                                                if (err) {
                                                    return response.status(201).json({ message: "Unable to Get Floor Details" });
                                                }
                                                if (floorData && floorData.length > 0) {
                                                    connection.query(`UPDATE Hostel_Floor SET status= false WHERE hostel_id= ${req.hostel_Id}`, function (error, data) {
                                                        if (error) {
                                                            response.status(201).json({ message: "doesn't update" });
                                                        } else {
                                                            let query1 = `select * from hostelrooms where Hostel_Id =${req.hostel_Id} and isActive = true;`
                                                            connection.query(query1, function (room_Error, room_Data) {
                                                                if (room_Error) {
                                                                    response.status(201).json({ message: "Error while fetching Room details" });
                                                                }
                                                                else {
                                                                    if (room_Data && room_Data.length > 0) {
                                                                        connection.query(`UPDATE hostelrooms SET isActive = false WHERE Hostel_Id='${req.hostel_Id}'`, function (error, data) {
                                                                            if (error) {
                                                                                response.status(201).json({ message: "doesn't update" });
                                                                            } else {
                                                                                // response.status(200).json({ message: "Hostel Deleted Successfully", statusCode: 200 });
                                                                                // response.status(200).json({ message: "Room Update Successfully" });
                                                                                let query = `select * from bed_details where hos_detail_id = ${req.hostel_Id} and status = true`
                                                                                connection.query(query, function (bed_Err, bed_Data) {
                                                                                    if (bed_Err) {
                                                                                        res.status(201).json({ message: "Unable to Fetch bed Details", statusCode: 201 });
                                                                                    }
                                                                                    else {
                                                                                        if (bed_Data && bed_Data.length > 0) {
                                                                                            var sql2 = "UPDATE bed_details SET status= false WHERE hos_detail_id='" + req.hostel_Id + "'";
                                                                                            connection.query(sql2, (err, data) => {
                                                                                                if (err) {
                                                                                                    res.status(201).json({ message: "Unable to Remove Hostel Details", statusCode: 201 });
                                                                                                } else {
                                                                                                    response.status(200).json({ message: "Hostel Deleted Successfully", statusCode: 200 });
                                                                                                }
                                                                                            })
                                                                                        }
                                                                                        else {
                                                                                            response.status(200).json({ message: "Hostel Deleted Successfully", statusCode: 200 });
                                                                                        }
                                                                                    }
                                                                                })



                                                                            }
                                                                        });
                                                                    } else {
                                                                        response.status(200).json({ message: "Hostel Deleted Successfully", statusCode: 200 });
                                                                    }
                                                                }
                                                            })

                                                            // response.status(200).json({ message: "Floor Update Successfully" });
                                                        }
                                                    });
                                                }
                                                else {
                                                    response.status(200).json({ message: "Hostel Deleted Successfully", statusCode: 200 });
                                                }
                                            })
                                            // response.status(200).json({ message: "Hostel Deleted Successfully", statusCode: 200 });
                                        }
                                    })
                                }
                                else {
                                    response.status(201).json({ message: "No data found in the hostel" });
                                }
                            }
                        })
                    }
                }
            })
        } else {
            response.status(201).json({ message: "Missing Parameter" });
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }

}

function deleteFloor(connection, response, request) {

    let reqData = request.body
    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_delete == 1)) {

        if (reqData && reqData.id && reqData.floor_id) {
            let query = `SELECT * FROM hostel where Hostel_Id = ${reqData.id} and Floor = ${reqData.floor_id} and isActive = true;`
            // let query = `select * from hostelrooms where Hostel_Id = ${reqData.id} and Floor_Id = ${reqData.floor_id} and isActive = true;`
            connection.query(query, function (roomError, roomData) {
                if (roomError) {
                    response.status(201).json({ message: "Error While Fetching Hostel room details" });
                }
                else {
                    if (roomData && roomData.length > 0) {
                        response.status(201).json({ message: "This Floor has some users, so first delete the users.", RoomStatus: 201 });
                    }
                    else {
                        connection.query(`select * from Hostel_Floor where hostel_id= ${reqData.id} and floor_id =${reqData.floor_id}`, function (err, floorData) {
                            if (floorData && floorData.length > 0) {
                                connection.query(`UPDATE Hostel_Floor SET status= false WHERE hostel_id= ${reqData.id} AND floor_id =${reqData.floor_id}`, function (error, data) {
                                    if (error) {
                                        response.status(201).json({ message: "doesn't update" });
                                    } else {

                                        let query1 = `select * from hostelrooms where Hostel_Id =${reqData.id} and Floor_Id = ${reqData.floor_id} and isActive = true;`
                                        connection.query(query1, function (room_Error, room_Data) {
                                            if (room_Error) {
                                                response.status(201).json({ message: "Error while fetching Room details" });
                                            }
                                            else {
                                                if (room_Data && room_Data.length > 0) {
                                                    connection.query(`UPDATE hostelrooms SET isActive = false WHERE Hostel_Id='${reqData.id}' and Floor_Id = ${reqData.floor_id}`, function (error, data) {
                                                        if (error) {
                                                            response.status(201).json({ message: "doesn't update" });
                                                        } else {

                                                            response.status(200).json({ message: "Floor Deleted Successfully" });
                                                        }
                                                    });
                                                } else {
                                                    response.status(200).json({ message: "Floor Deleted Successfully", statusCode: 200 });
                                                }
                                            }
                                        })
                                    }
                                });
                            }
                            else {
                                response.status(200).json({ message: "Floor Deleted Successfully", statusCode: 200 });
                            }
                        })
                    }
                }
            })

        } else {
            response.status(201).json({ message: "Missing parameter" });
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function deleteRoom(connection, response, request) {

    let reqData = request.body

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_delete == 1)) {

        if (reqData && reqData.hostelId && reqData.floorId && reqData.roomNo) {

            let query = `SELECT * FROM hostel where Hostel_Id = ${reqData.hostelId} and Floor = '${reqData.floorId}' and Rooms = '${reqData.roomNo}' and isActive = true;`
            // let query = `select * from hostelrooms where Hostel_Id =${reqData.hostelId} and Floor_Id = ${reqData.floorId} and Room_Id = ${reqData.roomNo} and isActive = true;`;
            console.log(query);
            connection.query(query, function (sel_Error, selData) {
                if (sel_Error) {
                    console.log(sel_Error);
                    response.status(201).json({ message: "Error while fetching user details" });
                }
                else {
                    if (selData.length != 0) {
                        response.status(201).json({ message: "This Room has some users, so first delete the users.", BedStatus: 201 });
                    } else {
                        let query1 = `select * from hostelrooms where Hostel_Id =${reqData.hostelId} and Floor_Id = '${reqData.floorId}' and id = '${reqData.roomNo}' and isActive = true;`
                        console.log(query1);
                        connection.query(query1, function (room_Error, room_Data) {
                            if (room_Error) {
                                console.log(room_Error);
                                response.status(201).json({ message: "Error while fetching Room details" });
                            }
                            else {
                                if (room_Data && room_Data.length > 0) {
                                    connection.query(`UPDATE hostelrooms SET isActive = false WHERE Hostel_Id='${reqData.hostelId}' AND id= '${reqData.roomNo}' AND Floor_Id='${reqData.floorId}';`, function (error, data) {
                                        if (error) {
                                            response.status(201).json({ message: "doesn't update" });
                                        } else {
                                            response.status(200).json({ message: "Room Update Successfully" });
                                        }
                                    });
                                } else {
                                    response.status(200).json({ message: "Room Update Successfully" });
                                }
                            }
                        })


                    }
                }
            })

        } else {
            response.status(201).json({ message: "Missing parameter" });
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function deleteBed(req, res) {

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var created_by = req.user_details.id;
    var { hostelId, floorId, roomNo, bed_id } = req.body;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_delete == 1)) {

        if (!hostelId && !floorId && !roomNo && !bed_id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Required Fields" })
        }

        var sql1 = "SELECT *,bd.id AS bed_detail_id FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id=hr.id WHERE bd.bed_no='" + bed_id + "' AND hr.Hostel_Id='" + hostelId + "' AND hr.Floor_Id='" + floorId + "' AND hr.id='" + roomNo + "' AND bd.status=1 AND hr.isActive= true"
        connection.query(sql1, (err, data) => {
            if (err) {
                res.status(201).json({ message: "Unable to Get Hostel Details", statusCode: 201 });
            } else if (data.length != 0) {
                var isfilled = data[0].isfilled;
                var bed_detail_id = data[0].bed_detail_id;

                if (isfilled == 0) {
                    // Update Status 0
                    var sql2 = "UPDATE bed_details SET status= false WHERE id='" + bed_detail_id + "'";
                    connection.query(sql2, (err, data) => {
                        if (err) {
                            res.status(201).json({ message: "Unable to Remove Hostel Details", statusCode: 201 });
                        } else {
                            res.status(200).json({ message: "Sucessfully Bed Removed", statusCode: 200 });
                        }
                    })
                } else {
                    res.status(210).json({ message: "User Assigned In this Bed, So Not Remove this Bed", statusCode: 210 });
                }
            } else {
                res.status(201).json({ message: "Invalid Hostel Details", statusCode: 201 });
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

// Get Particular Room Details
function get_room_details(connection, request, response) {

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;
    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

        var { hostel_id, floor_id, room_id } = request.body;

        if ((!hostel_id && hostel_id == undefined) || (!room_id && room_id == undefined)) {
            response.status(201).json({ message: "Missing Parameter Values", statusCode: 201 });
        } else {
            var sql1 = "SELECT * FROM hosteldetails WHERE id='" + hostel_id + "' AND isActive =1;";
            connection.query(sql1, function (sq_err, sq_res) {
                if (sq_err) {
                    response.status(201).json({ message: "Unable to Get Hostel Details", statusCode: 201 });
                } else if (sq_res.length != 0) {

                    // var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND Room_Id=? AND isActive= true;";
                    var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND id=? AND isActive= true;";
                    connection.query(sql2, [hostel_id, floor_id, room_id], function (room_err, room_res) {
                        if (room_err) {
                            response.status(201).json({ message: "Unable to Get Room Details", statusCode: 201 });
                        } else if (room_res.length != 0) {
                            response.status(200).json({ message: "Room Details", statusCode: 200, room_details: room_res[0] });
                        } else {
                            response.status(201).json({ message: "Invalid Or Inactive Room ID", statusCode: 201 });
                        }
                    })

                } else {
                    response.status(201).json({ message: "Invalid or Inactive Hostel Details", statusCode: 201 });
                }
            })
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

// Update Particular Room Details
function update_room_details(connection, request, response) {

    var { hostel_id, room_id, floor_id, amount } = request.body;

    if ((!hostel_id && hostel_id == undefined) || (!room_id && room_id == undefined) || (!amount && amount < 0)) {
        response.status(201).json({ message: "Missing Parameter Values", statusCode: 201 });
    } else {
        var sql1 = "SELECT * FROM hosteldetails WHERE id='" + hostel_id + "' AND isActive = true;";
        connection.query(sql1, function (sq_err, sq_res) {
            if (sq_err) {
                response.status(201).json({ message: "Unable to Get Hostel Details", statusCode: 201 });
            } else if (sq_res.length != 0) {

                // var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND Room_Id=?";
                var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND id=?";
                connection.query(sql2, [hostel_id, floor_id, room_id], function (room_err, room_res) {
                    if (room_err) {
                        response.status(201).json({ message: "Unable to Get Room Details", statusCode: 201 });
                    } else if (room_res.length != 0) {

                        var id = room_res[0].id;

                        var update_query = "UPDATE hostelrooms SET Price=? WHERE id=?";
                        connection.query(update_query, [amount, id], function (up_err, up_res) {
                            if (up_err) {
                                response.status(201).json({ message: "Unable to Update Room Details", statusCode: 201 });
                            } else {

                                var update_user_query = "UPDATE hostel SET RoomRent=? WHERE Hostel_Id=? AND Floor=? AND Rooms=? AND isActive=1";
                                connection.query(update_user_query, [amount, hostel_id, floor_id, room_id], function (err, data) {
                                    if (err) {
                                        response.status(201).json({ message: "Unable to Update Users Rent", statusCode: 201 });
                                    } else {
                                        response.status(200).json({ message: "Update Successfully", statusCode: 200 });
                                    }
                                })

                            }
                        })
                    } else {
                        response.status(201).json({ message: "Invalid Room ID", statusCode: 201 });
                    }
                })
            } else {
                response.status(201).json({ message: "Invalid or Inactive Hostel Details", statusCode: 201 });
            }
        })
    }
}

function createBed(req, res) {

    var created_by = req.user_details.id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_create == 1)) {

        var { hostel_id, floor_id, room_id, bed_no, amount } = req.body;

        if (!hostel_id || !floor_id || !room_id || !bed_no || !amount) {
            return res.status(201).json({ statusCode: 201, message: "Missing Parameters." });
        }

        if (isNaN(amount)) {
            return res.status(201).json({ statusCode: 201, message: "Amount must be a number." });
        }

        var sql1 = "SELECT * FROM hosteldetails WHERE id='" + hostel_id + "' AND created_By='" + created_by + "'";
        // console.log(sql1);
        connection.query(sql1, (err, hs_data) => {
            if (err) {
                console.log(err);
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" })
            } else if (hs_data.length != 0) {

                var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND id=? AND isActive= true AND Created_By='" + created_by + "'";
                connection.query(sql2, [hostel_id, floor_id, room_id], (err, hs_res) => {

                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Room Details" })
                    } else if (hs_res.length > 0) {

                        var hos_detail_id = hs_res[0].id;
                        var total_beds = hs_res[0].Number_Of_Beds;

                        // Check Bed Details
                        var sql4 = "SELECT * FROM bed_details WHERE bed_no='" + bed_no + "' AND status=1 AND hos_detail_id='" + hos_detail_id + "'";
                        connection.query(sql4, (err, bed_res) => {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Get Bed Details" })
                            } else if (bed_res.length != 0) {
                                return res.status(201).json({ statusCode: 201, message: "Bed Number Already Exists" })
                            } else {
                                var sql5 = "INSERT INTO bed_details (hos_detail_id,bed_no,bed_amount,status,createdby) VALUES (?,?,?,1,?)";
                                connection.query(sql5, [hos_detail_id, bed_no, amount, created_by], (err, ins_data) => {
                                    if (err) {
                                        return res.status(201).json({ statusCode: 201, message: "Unable to Add Bed Details" })
                                    } else {
                                        var number_of_beds = total_beds + 1;
                                        var sql3 = "UPDATE hostelrooms SET Number_Of_Beds='" + number_of_beds + "' WHERE id='" + hos_detail_id + "'";
                                        connection.query(sql3, (up_err, up_res) => {
                                            if (up_err) {
                                                return res.status(201).json({ statusCode: 201, message: "Unable to Update Total Bed Details" })
                                            } else {
                                                return res.status(200).json({ statusCode: 200, message: "Successfully Add New Bed Details" })
                                            }
                                        })

                                    }
                                })
                            }
                        })
                    } else {

                        return res.status(201).json({ statusCode: 201, message: "Invalid Hostel Details" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Hostel ID" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function bed_details(req, res) {

    var created_by = req.user_details.id;

    var show_ids = req.show_ids;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_view == 1)) {

        var { hostel_id, floor_id, room_id } = req.body;

        if (!hostel_id || !floor_id || !room_id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Parameters." });
        }

        var sql1 = "SELECT * FROM hosteldetails WHERE id='" + hostel_id + "'";
        connection.query(sql1, (err, hs_data) => {
            if (err) {
                console.log(err);
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" })
            } else if (hs_data.length != 0) {

                // var sql2="SELECT *,hs.id AS bed_details_id FROM hostelrooms AS hs JOIN Hostel_Floor AS hf ON hf.hostel_id=hs.Hostel_Id AND hf.floor_id=hs.Floor_Id WHERE hs.Hostel_Id=? AND hs.Floor_Id=? AND hs.Room_Id=? AND hs.isActive=1 AND hs.Created_By=?"
                var sql2 = "SELECT hs.id as Room_Id,hs.Hostel_Id,hs.Floor_Id,hs.Room_Id as Room_Name,hs.Number_Of_Beds,hs.isActive as Room_Status,hs.Created_By,hf.id,hf.floor_id,hf.floor_name,hf.status as Floor_Status,hs.id AS bed_details_id FROM hostelrooms AS hs JOIN Hostel_Floor AS hf ON hf.hostel_id=hs.Hostel_Id AND hf.floor_id=hs.Floor_Id WHERE hs.Hostel_Id=? AND hs.Floor_Id=? AND hs.id=? AND hs.isActive=1 AND hs.Created_By IN (?)"
                connection.query(sql2, [hostel_id, floor_id, room_id, show_ids], (err, hs_res) => {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Room Details" })
                    } else if (hs_res.length != 0) {

                        var hos_detail_id = hs_res[0].bed_details_id;

                        var sql3 = "SELECT * FROM bed_details WHERE hos_detail_id='" + hos_detail_id + "' AND status=1 AND isfilled=0 AND createdby='" + created_by + "'";
                        connection.query(sql3, (err, bed_data) => {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Get Bed Details" })
                            } else {
                                return res.status(200).json({ statusCode: 200, message: "Bed Details", hostel_details: hs_res, bed_details: bed_data })
                            }
                        })
                    } else {
                        return res.status(201).json({ statusCode: 201, message: "Invalid Hostel or Room Details" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Hostel Details" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function getKeyFromUrl(url) {
    const urlParts = url.split("/");
    const key = urlParts.slice(3).join("/"); // Get everything after the bucket name
    return key;
}

function delete_hostel_image(req, res) {

    var { hostel_id, image_name } = req.body;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[3] && role_permissions[3].per_delete == 1)) {

        var created_by = req.user_details.id;

        if (!hostel_id || !image_name) {
            return res.status(201).json({ statusCode: 201, message: "Missing Parameters." });
        }
        var sql1 = "SELECT " + image_name + " AS image FROM hosteldetails WHERE id=? AND isActive=1 AND created_By=?";
        connection.query(sql1, [hostel_id, created_by], async function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get PG Details" });
            } else if (data.length != 0) {

                var Data = data[0].image
                // console.log(Data);

                if (Data != 0) {
                    const old_profile_key = await getKeyFromUrl(Data);
                    var deleteResponse = await uploadImage.deleteImageFromS3Bucket("smartstaydevs", old_profile_key);
                    console.log("Image deleted successfully");
                }

                var sql2 = "UPDATE hosteldetails SET " + image_name + "=0 WHERE id='" + hostel_id + "'"
                connection.query(sql2, function (err, up_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Delete Image" });
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Image Deleted Successfully!" });
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid PG Details" });
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function hosteldetails(req, res) {

    var created_by = req.user_details.id;

    var show_ids = req.show_ids;

    var user_type = req.user_type;

    if (user_type == 'staff') {

        var sql2 = "SELECT ro.hostel_id FROM createaccount AS ca JOIN roles AS ro ON ca.role_id=ro.id WHERE ca.id=? AND ca.user_status=1 AND ro.status=1 ORDER BY ca.id DESC;";
        connection.query(sql2, [created_by], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" });
            } else if (data.length == 0) {
                return res.status(201).json({ statusCode: 201, message: 'Invalid User Details' });
            } else {
                var hostel_id = data[0].hostel_id;

                var sql1 = "SELECT id,Name,profile FROM hosteldetails WHERE isActive=1 AND id=?";
                connection.query(sql1, [hostel_id], function (err, data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" });
                    } else if (data.length == 0) {
                        return res.status(201).json({ statusCode: 201, message: 'No Data Found' });
                    } else {
                        return res.status(200).json({ statusCode: 200, message: 'Hostel Details', data: data });
                    }
                })
            }
        })
    } else {

        var sql1 = "SELECT id,Name,profile FROM hosteldetails WHERE isActive=1 AND created_By IN (?)";
        connection.query(sql1, [show_ids], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Details" });
            } else if (data.length == 0) {
                return res.status(201).json({ statusCode: 201, message: 'No Data Found' });
            } else {
                return res.status(200).json({ statusCode: 200, message: 'Hostel Details', data: data });
            }
        })
    }

}

module.exports = { createBed, getHostelList, checkRoom, hostelListDetails, createPG, FloorList, RoomList, BedList, RoomCount, ListForFloor, CreateRoom, CreateFloor, update_floor, RoomFull, UpdateEB, listDashBoard, deleteHostel, deleteFloor, deleteRoom, deleteBed, get_room_details, update_room_details, bed_details, delete_hostel_image, hosteldetails }