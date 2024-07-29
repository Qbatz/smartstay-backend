const moment = require('moment')
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


function getHostelList(connection, response, request) {
    const userDetails = request.user_details;
    connection.query(`select * from hosteldetails where created_By = '${userDetails.id}' ORDER BY create_At DESC`, function (err, data) {
        if (data) {
            response.status(200).json({ data: data })
        }
        else {
            response.status(201).json({ message: 'No Data Found' })
        }
    })
}


function checkRoom(connection, response) {
    const query2 = `SELECT hosRom.Room_Id AS RoomId, hosRom.Number_Of_Beds AS NumberOfBeds, hosRom.Hostel_Id, hosRom.Floor_Id, host.id AS HostelDetailsId FROM hostelrooms hosRom INNER JOIN hosteldetails host ON host.id = hosRom.Hostel_Id`
    connection.query(query2, function (error, data) {
        if (error) {
            response.status(201).json({ message: 'No Data Found' })
        }
        else {
            response.status(200).json({ data: data })
        }
    })
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


// function createPG(connection, request, response) {
//     const userDetails = request.user_details;
//     const reqData = request.body;

//     let hostelID, errorMessage
//     if (reqData) {
//         const query = `insert into hosteldetails(Name,hostel_PhoneNo,number_Of_Floor,email_id,Address,created_By) values (\'${reqData.name}\',\'${reqData.phoneNo}\',\'${reqData.number_of_floors}\',\'${reqData.email_Id}\',\'${reqData.location}\',\'${userDetails.id}\')`
//         connection.query(query, function (error, data) {
//             if (error) {
//                 console.log("error", error);
//                 response.status(201).json({ message: 'Cannot Insert Details' })
//             }
//             else {
//                 console.log("Data for new hostel *=>", data)
//                 const query2 = ` select * from hosteldetails where hostel_PhoneNo=\'${reqData.phoneNo}\'`
//                 connection.query(query2, function (error, datum) {
//                     if (datum.length > 0) {
//                         // hostelID = datum[0].id
//                         // for (let i = 0; i < reqData.floorDetails.length; i++) {
//                         //     for (let j = 0; j < reqData.floorDetails[i].length; j++) {
//                         //         const bed = Number(reqData.floorDetails[i][j].number_Of_Bed)
//                         //         const room = Number(reqData.floorDetails[i][j].roomName)
//                         //         const price = Number(reqData.floorDetails[i][j].price)
//                         //         const query3 = insert into hostelrooms(Hostel_Id,Floor_Id,Room_Id,Number_Of_Beds,Created_By,Price) values(\'${hostelID}\',\'${i + 1}\',\'${room}\',\'${bed}\',\'${reqData.created_by}\',\'${price}\')
//                         //         connection.query(query3, function (error, data) {
//                         //             console.log(error);
//                         //             if (error) {
//                         //                 errorMessage = error;
//                         //             }

//                         //         })
//                         //     }
//                         // }
//                         // if (errorMessage) {

//                         //     response.status(201).json({ message: 'Cannot Insert Details' })
//                         // }
//                         // else {
//                         response.status(200).json({ message: 'Data Saved Successfully' })
//                         // }
//                     }

//                     else {
//                         response.status(201).json({ message: 'Phone number not Registered' })
//                     }

//                 })
//             }
//         })
//     }
//     else {
//         response.status(201).json({ message: 'Missing Parameter' })
//     }
// }


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




function createPG(connection, reqHostel, response, request) {
    const userDetails = request.user_details;
    const timestamp = Date.now();
    let hostelID, errorMessage
    if (reqHostel.profile) {
        uploadProfilePictureToS3Bucket('smartstaydevs', 'Hostel_Logo/', 'Logo' + `${timestamp}` + '.jpg', reqHostel.profile, (err, hostel_Logo) => {
            if (err) {
                response.status(202).json({ message: 'Database error' });
            } else {


                const query = `insert into hosteldetails(Name,hostel_PhoneNo,number_Of_Floor,email_id,Address,created_By, profile) values (\'${reqHostel.hostel_Name}\',\'${reqHostel.hostel_Phone}\',0,\'${reqHostel.hostel_email_Id}\',\'${reqHostel.hostel_location}\',\'${userDetails.id}\', \'${hostel_Logo}\')`
                connection.query(query, function (error, data) {
                    if (error) {
                        console.log("error", error);
                        response.status(201).json({ message: 'Cannot Insert Details' })
                    }
                    else {
                        console.log("Data for new hostel *=>", data)
                        const query2 = ` select * from hosteldetails where hostel_PhoneNo=\'${reqHostel.hostel_Phone}\'`
                        connection.query(query2, function (error, datum) {
                            if (datum.length > 0) {
                                response.status(200).json({ message: 'Data Saved Successfully', statusCode: 200 })

                            }

                            else {
                                response.status(201).json({ message: 'Phone number not Registered' })
                            }

                        })
                    }
                })
            }
        })
    }
    else {
        const query = `insert into hosteldetails(Name,hostel_PhoneNo,number_Of_Floor,email_id,Address,created_By) values (\'${reqHostel.hostel_Name}\',\'${reqHostel.hostel_Phone}\',0,\'${reqHostel.hostel_email_Id}\',\'${reqHostel.hostel_location}\',\'${userDetails.id}\')`
        connection.query(query, function (error, data) {
            if (error) {
                console.log("error", error);
                response.status(201).json({ message: 'Cannot Insert Details' })
            }
            else {
                console.log("Data for new hostel *=>", data)
                const query2 = ` select * from hosteldetails where hostel_PhoneNo=\'${reqHostel.hostel_Phone}\'`
                connection.query(query2, function (error, datum) {
                    if (datum.length > 0) {

                        response.status(200).json({ message: 'Data Saved Successfully', statusCode: 200 })

                    }

                    else {
                        response.status(201).json({ message: 'Phone number not Registered' })
                    }

                })
            }
        })


    }
}

function FloorList(connection, requestData, response) {
    if (requestData) {
        connection.query(`select * from hostelrooms where Hostel_Id = \'${requestData.hostel_Id}\ and isActive=1'`, function (error, data) {
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
}


function RoomList(connection, reqData, response) {

    if (reqData) {
        connection.query(`select * from hostelrooms where Hostel_Id = \'${reqData.hostel_Id}\'  and isActive=1`, function (error, data) {
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

}


function BedList(connection, requestBodyData, response) {
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
}

function RoomCount(connection, reqFloorID, response) {
    let responseData = [];
    let errorMessage;

    if (reqFloorID) {

        connection.query(`SELECT *,COALESCE(SUM(Number_Of_Beds),0) AS total_beds FROM hostelrooms WHERE Floor_Id = '${reqFloorID.floor_Id}' AND Hostel_Id = '${reqFloorID.hostel_Id}' AND isActive=1 GROUP BY Room_Id`, function (error, RoomsData) {
            if (error) {
                return response.status(201).json({ message: "Error occurred while fetching data" });
            }

            if (RoomsData.length > 0) {

                let roomsProcessed = 0;

                for (let i = 0; i < RoomsData.length; i++) {
                    const Room_Id = RoomsData[i].Room_Id;

                    connection.query(`SELECT COUNT('Bed') AS bookedBedCount, hos.Hostel_Id AS hostel_Id, hos.Floor, hos.Rooms FROM hostel hos WHERE Floor = '${reqFloorID.floor_Id}' AND Hostel_Id = '${reqFloorID.hostel_Id}' AND Rooms = '${Room_Id}' AND hos.isActive = true`, function (error, hostelData) {
                        if (error) {
                            errorMessage = error;
                        } else {
                            const objectFormation = {
                                bookedBedCount: hostelData[0].bookedBedCount,
                                Hostel_Id: RoomsData[i].Hostel_Id,
                                Floor_Id: RoomsData[i].Floor_Id,
                                Room_Id: RoomsData[i].Room_Id,
                                Number_Of_Beds: RoomsData[i].total_beds,
                                Room_Rent: RoomsData[i].Price
                            };
                            responseData.push(objectFormation);

                            var bed_query = `SELECT bd.bed_no, bd.bed_amount, bd.isfilled FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id = hr.id WHERE hr.Hostel_Id = '${objectFormation.Hostel_Id}' AND hr.Floor_Id = '${objectFormation.Floor_Id}' AND hr.Room_Id = '${objectFormation.Room_Id}' AND bd.status = 1 AND hr.isActive = 1`;

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
}


function ListForFloor(connection, reqData, response) {
    if (reqData) {
        connection.query(`select * from hostelrooms where  Hostel_Id = \'${reqData.hostel_Id}\' and isActive=1`, function (error, data) {

            if (data) {
                response.status(200).json({ data: data })
            }
            else {
                response.status(201).json({ message: "No User Found" })
            }
        })
    }
    else {
        response.status(201).json({ message: "Missing Parameter" })
    }

}

// function CreateRoom(connection, reqsData, response) {
//     let hostelId, errorMessage, message;
//     if (reqsData) {
//         const query1 = `SELECT * FROM hosteldetails WHERE id='${reqsData.id}'`;
//         connection.query(query1, function (error, data) {

//             if (data && data.length > 0) {
//                 hostelId = data[0].id;

//                 for (let i = 0; i < reqsData.floorDetails.length; i++) {
//                     const currentRoom = reqsData.floorDetails[i];
//                     const checkRoomQuery = `SELECT Room_Id, Number_Of_Beds FROM hostelrooms WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}' AND isActive=1`;

//                     connection.query(checkRoomQuery, function (error, existingRoom) {

//                         if (existingRoom && existingRoom.length > 0) {

//                             setTimeout(() => {
//                                 message = `Room ID is already exists.`;
//                             }, 1000)


//                             let updateQuery;
//                             if (currentRoom.number_of_beds && currentRoom.roomRent) {
//                                 updateQuery = ` UPDATE hostelrooms SET Number_Of_Beds = '${currentRoom.number_of_beds}', Price = '${currentRoom.roomRent}'  WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}'`;

//                             } else if (currentRoom.number_of_beds) {
//                                 let bed = Number(existingRoom[0].Number_Of_Beds) + Number(currentRoom.number_of_beds)
//                                 updateQuery = ` UPDATE hostelrooms SET Number_Of_Beds = '${bed}' WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}'`;
//                             }


//                             connection.query(updateQuery, function (error, updateResult) {
//                                 console.log("Update result", updateResult);
//                                 if (error) {
//                                     errorMessage = error;
//                                 }

//                             });
//                         } else {
//                             const insertQuery = `INSERT INTO hostelrooms (Hostel_Id, Floor_Id, Room_Id, Number_Of_Beds, Price)VALUES ('${hostelId}', '${currentRoom.floorId}', '${currentRoom.roomId}', '${currentRoom.number_of_beds}', '${currentRoom.roomRent}')`;

//                             connection.query(insertQuery, function (error, insertResult) {
//                                 if (error) {
//                                     errorMessage = error;
//                                 }

//                             });
//                         }
//                     });
//                 }

//                 if (errorMessage) {
//                     response.status(201).json({ message: 'Cannot Insert Details' });
//                 } else {
//                     response.status(200).json({ message: message && message.length > 0 ? message : 'Create Room Details successfully' })
//                 }
//             } else {
//                 response.status(201).json({ message: 'No Data Found' });
//             }
//         });
//     } else {
//         response.status(201).json({ message: 'Missing Parameter' });
//     }
// }
async function CreateRoom(connection, request, response) {

    var reqsData = request.body;
    var created_by = request.user_details.id;

    if (!reqsData) {
        return response.status(400).json({ message: 'Missing Parameter' });
    }

    try {
        const hostelIdQuery = `SELECT * FROM hosteldetails WHERE id='${reqsData.id}'`;
        const hostelData = await new Promise((resolve, reject) => {
            connection.query(hostelIdQuery, (error, results) => {
                if (error) return reject(error);
                resolve(results);
            });
        });

        if (!hostelData || hostelData.length === 0) {
            return response.status(404).json({ message: 'No Data Found' });
        }

        const hostelId = hostelData[0].id;
        let errorMessage = null;
        let message = null;

        for (const currentRoom of reqsData.floorDetails) {
            const checkRoomQuery = `SELECT Room_Id, Number_Of_Beds FROM hostelrooms WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}' AND isActive=1`;

            const existingRoom = await new Promise((resolve, reject) => {
                connection.query(checkRoomQuery, (error, results) => {
                    if (error) return reject(error);
                    resolve(results);
                });
            });

            if (existingRoom.length > 0) {
                message = `Room ID is already exists.`;

                if (currentRoom.number_of_beds && currentRoom.roomRent) {
                    errorMessage = message;
                } else {
                    const bed = Number(existingRoom[0].Number_Of_Beds) + Number(currentRoom.number_of_beds);
                    const updateQuery = `UPDATE hostelrooms SET Number_Of_Beds = '${bed}' WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}'`;

                    await new Promise((resolve, reject) => {
                        connection.query(updateQuery, (error, results) => {
                            if (error) return reject(error);
                            resolve(results);
                        });
                    });
                }
            } else {
                const insertQuery = `INSERT INTO hostelrooms (Hostel_Id, Floor_Id, Room_Id, Number_Of_Beds, Price,Created_By) VALUES ('${hostelId}', '${currentRoom.floorId}', '${currentRoom.roomId}', '${currentRoom.number_of_beds}', '${currentRoom.roomRent}','${created_by}')`;

                await new Promise((resolve, reject) => {
                    connection.query(insertQuery, (error, results) => {
                        if (error) return reject(error);
                        resolve(results);
                    });
                });
            }
        }

        if (errorMessage) {
            response.status(500).json({ message: errorMessage });
        } else {
            response.status(200).json({ message: message && message.length > 0 ? message : 'Create Room Details successfully' });
        }
    } catch (error) {
        response.status(500).json({ message: 'Database Error', error: error.message });
    }
}

function CreateFloor(connection, reqDataFloor, response) {
    let hostel_ID, errorMessage
    if (reqDataFloor) {
        // console.log("reqDataFloor **",reqDataFloor)
        const query1 = `select * from hosteldetails where id =\'${reqDataFloor.hostel_Id}\'`
        connection.query(query1, function (error, data) {
            // console.log("dta",data)
            if (data) {
                // console.log("data", data);
                hostel_ID = data[0].id
                const index = reqDataFloor.hostelDetails.length - 1
                const floor = data[0].number_Of_Floor + reqDataFloor.hostelDetails.length

                const query2 = `UPDATE hosteldetails SET number_Of_Floor='${floor}' WHERE id='${hostel_ID}'`
                connection.query(query2, function (error, create_floor) {
                    if (error) {
                        errorMessage = error;
                    }
                    if (errorMessage) {
                        response.status(201).json({ message: 'Cannot Update Floor Details' })
                    }
                    else {
                        response.status(200).json({ message: 'Update Floor Details Successfully' })
                    }

                })

            }
            else {
                response.status(201).json({ message: 'No data found' })
            }
        })

    }
    else {
        response.status(201).json({ message: 'Missing Parameter' })
    }
}

function RoomFull(connection, reqFloorID, response) {
    if (reqFloorID) {
        const query1 = `SELECT hos.Hostel_Id,hosRoom.Hostel_Id as hostel_Id, hos.Floor,hos.Rooms, hosRoom.Floor_Id,hosRoom.Room_Id, COUNT(hos.bed)as occupiedBeds ,hosRoom.Number_Of_Beds FROM hostel hos INNER JOIN hostelrooms hosRoom on hos.Floor = hosRoom.Floor_Id and hos.Rooms = hosRoom.Room_Id WHERE hosroom.Hostel_Id = \'${reqFloorID.hostel_Id}\' and hosroom.Floor_Id = \'${reqFloorID.floor_Id}\' and hosroom.Room_Id = \'${reqFloorID.room_Id}\' and hosroom.isActive=1`
        connection.query(query1, function (error, data) {
            if (data) {
                response.status(200).json({ data: data })
            }
            else {
                response.status(201).json({ message: "No Data Found" })
            }
        })
    }
    else {
        response.status(201).json({ message: "Missing Parameter" })
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

    var userDetails = request.user_details;
    var created_by = request.user_details.id;
    let startingYear = new Date().getFullYear() - 1;
    // console.log("startingYear", startingYear);
    let endingYear = new Date().getFullYear();
    // console.log("endingYear", endingYear);

    var sql1 = `select creaccount.first_name,creaccount.last_name,COALESCE((select count(id) from hosteldetails where created_By=details.created_By),0) as hostelCount,COALESCE(sum((select count(Room_Id) from hostelrooms where Hostel_Id=details.id)),0) as roomCount, COALESCE(sum((select sum(Number_Of_Beds) from hostelrooms where Hostel_Id=details.id)),0) as Bed ,COALESCE(sum((select count(id) from hostel where Hostel_Id= details.id and isActive =1)),0) as occupied_Bed ,
    (select COALESCE(SUM(COALESCE(icv.Amount, 0)),0) AS revenue
    FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id=hos.id WHERE hos.created_By='${created_by}') AS Revenue,(select COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) AS revenue
    FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id=hos.id WHERE hos.created_By='${created_by}' AND icv.BalanceDue != 0) AS overdue from hosteldetails details
    join createaccount creaccount on creaccount.id = details.created_by
    where details.created_By='${created_by}';`
    connection.query(sql1, function (error, data) {
        if (error) {
            console.log(error, "Error Message");
            // response.status(200).json({ dashboardList: [], Revenue_reports: [], totalAmount: [], categoryList: [], error: error });
            response.status(201).json({ message: "No data found", error: error.message });
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
                    obj = {
                        hostelCount: item.hostelCount,
                        roomCount: item.roomCount,
                        TotalBed: item.Bed,
                        occupied_Bed: item.occupied_Bed,
                        availableBed: item.Bed - item.occupied_Bed,
                        Revenue: item.Revenue,
                        overdue: item.overdue,
                        current: current,
                        first_name : item.first_name,
                        last_name: item.last_name
                    }
                    // tempArray.push(obj)
                    return obj

                })

                var sql2 = "SELECT com.*,CASE WHEN com.user_type = 1 THEN com.created_by ELSE hos.id END AS com_created_by,ct.complaint_name FROM compliance AS com JOIN hostel AS hos ON com.User_id = hos.User_Id JOIN complaint_type AS ct ON ct.id = com.Complainttype WHERE CASE WHEN com.user_type = 1 THEN com.created_by ELSE hos.id END = '" + created_by + "' AND com.Status != 'Completed' ORDER BY com.ID DESC LIMIT 5;"
                connection.query(sql2, function (err, com_data) {
                    if (err) {
                        response.status(201).json({ message: "Unable to Get Complaince Details", err: err.message });
                    } else {
                        // Get Revenue Details 
                        // var query1 = "SELECT m.month,COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL  SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS numbers ) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month,invo.RoomRent, invo.EbAmount,invo.AmnitiesAmount,invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.created_By = ?) AS invo ON m.month = invo.month GROUP BY m.month ORDER BY m.month; "
                        var query1 = `SELECT m.month,COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue,COALESCE(SUM(COALESCE(expen.purchase_amount, 0)), 0) AS expense FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.created_By = ${created_by}) AS invo ON m.month = invo.month LEFT JOIN (SELECT DATE_FORMAT(expen.createdate, '%Y-%m') AS month, expen.purchase_amount FROM expenses AS expen WHERE expen.created_by=${created_by}) AS expen ON m.month = expen.month GROUP BY m.month ORDER BY m.month;`
                        // Execute the query
                        connection.query(query1, [created_by], (error, results, fields) => {
                            if (error) {
                                console.error('Error executing query:', error);
                                return;
                            } else {
                                // expense category
                                let query = `select expen.id,expen.category_id,expen.vendor_id,expen.asset_id,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode, sum(expen.purchase_amount) as total_amount, category.category_Name from expenses expen
                                join Expense_Category_Name category on category.id = expen.category_id
                                where expen.status = true AND expen.created_by = ${created_by}
                                AND YEAR(expen.createdate) BETWEEN  ${startingYear} AND ${endingYear}
                                           GROUP BY 
                                        expen.id`
                                // console.log("query", query);
                                connection.query(query, function (error, data) {
                                    if (error) {
                                        console.log("error", error);
                                        response.status(201).json({ message: "Error fetching Data" });
                                    }
                                    else {
                                        if (data.length > 0) {
                                            console.log("data", data);
                                            let resArray = [];
                                            let totalAmount = 0;
                                            for (let i = 0; i < data.length; i++) {
                                                totalAmount += data[i].total_amount;
                                                let temp = {
                                                    id: data[i].id,
                                                    first_name:data[i].first_name,
                                                    last_name:data[i].last_name,
                                                    category_Name: data[i].category_Name,
                                                    Amount: data[i].purchase_amount
                                                }
                                                resArray.push(temp);
                                            }
                                            console.log("resArray", resArray.length);
                                            if (data.length === resArray.length) {
                                                response.status(200).json({ dashboardList: dashboardList, Revenue_reports: results, totalAmount: totalAmount, categoryList: resArray, com_data: com_data });
                                                // response.status(200).json({ totalAmount, resArray });
                                            }
                                        } else {
                                            response.status(200).json({ dashboardList: dashboardList, Revenue_reports: results, totalAmount: [], categoryList: [], com_data: com_data });
                                        }
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
    // } else {
    //     response.status(201).json({ message: "Missing Parameter" });
    // }
}


function deleteFloor(connection, response, reqData) {
    if (reqData) {
        connection.query(`select number_Of_Floor from hosteldetails where id='${reqData.id}'`, function (err, floorData) {
            if (floorData && floorData.length > 0) {
                let floor = Number(floorData[0].number_Of_Floor) - 1
                connection.query(`UPDATE hosteldetails SET number_Of_Floor= ${floor} WHERE id='${reqData.id}'`, function (error, data) {
                    if (error) {
                        response.status(201).json({ message: "doesn't update" });
                    } else {
                        response.status(200).json({ message: "Floor Update Successfully" });
                    }
                });
            }
            else {
                response.status(201).json({ message: "Invalid Credential" });
            }
        })

    }
    else {
        response.status(201).json({ message: "Missing parameter" });
    }

}

function deleteRoom(connection, response, reqData) {
    if (reqData.floorId && reqData.roomNo) {
        connection.query(`UPDATE hostelrooms SET isActive = 0 WHERE Hostel_Id='${reqData.hostelId}' AND Room_Id= ${reqData.roomNo} AND Floor_Id=${reqData.floorId}`, function (error, data) {
            // connection.query(`DELETE FROM hostelrooms WHERE Room_Id= ${reqData.roomNo} AND Hostel_Id='${reqData.hostelId}' AND Floor_Id=${reqData.floorId}`, function (error, data) {
            if (error) {
                response.status(201).json({ message: "doesn't update" });
            } else {
                response.status(200).json({ message: "Room Update Successfully" });
            }
        });
    }
    else {
        response.status(201).json({ message: "Missing parameter" });
    }
}

function deleteBed(req, res) {

    var created_by = req.user_details.id;
    var { hostelId, floorId, roomNo, bed_id } = req.body;

    if (!hostelId && !floorId && !roomNo && !bed_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Required Fields" })
    }

    var sql1 = "SELECT *,bd.id AS bed_detail_id FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id=hr.id WHERE bd.bed_no='" + bed_id + "' AND hr.Hostel_Id='" + hostelId + "' AND hr.Floor_Id='" + floorId + "' AND hr.Room_Id='" + roomNo + "' AND bd.status=1 AND hr.isActive=1"
    connection.query(sql1, (err, data) => {
        if (err) {
            res.status(201).json({ message: "Unable to Get Hostel Details", statusCode: 201 });
        } else if (data.length != 0) {
            var isfilled = data[0].isfilled;
            var bed_detail_id = data[0].bed_detail_id;

            if (isfilled == 0) {
                // Update Status 0
                var sql2 = "UPDATE bed_details SET status=0 WHERE id='" + bed_detail_id + "'";
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
}

// Get Particular Room Details
function get_room_details(connection, request, response) {
    var { hostel_id, floor_id, room_id } = request.body;

    if ((!hostel_id && hostel_id == undefined) || (!room_id && room_id == undefined)) {
        response.status(201).json({ message: "Missing Parameter Values", statusCode: 201 });
    } else {
        var sql1 = "SELECT * FROM hosteldetails WHERE id='" + hostel_id + "' AND isActive =1;";
        connection.query(sql1, function (sq_err, sq_res) {
            if (sq_err) {
                response.status(201).json({ message: "Unable to Get Hostel Details", statusCode: 201 });
            } else if (sq_res.length != 0) {

                var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND Room_Id=? AND isActive=1;";
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
}

// Update Particular Room Details
function update_room_details(connection, request, response) {

    var { hostel_id, room_id, floor_id, amount } = request.body;

    if ((!hostel_id && hostel_id == undefined) || (!room_id && room_id == undefined) || (!amount && amount < 0)) {
        response.status(201).json({ message: "Missing Parameter Values", statusCode: 201 });
    } else {
        var sql1 = "SELECT * FROM hosteldetails WHERE id='" + hostel_id + "' AND isActive =1;";
        connection.query(sql1, function (sq_err, sq_res) {
            if (sq_err) {
                response.status(201).json({ message: "Unable to Get Hostel Details", statusCode: 201 });
            } else if (sq_res.length != 0) {

                var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND Room_Id=?";
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

    var created_by = req.user_details.id

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

            var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND Room_Id=? AND isActive=1 AND Created_By='" + created_by + "'";
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
}

function bed_details(req, res) {

    var created_by = req.user_details.id

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

            var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND Room_Id=? AND isActive=1 AND Created_By=?";
            connection.query(sql2, [hostel_id, floor_id, room_id, created_by], (err, hs_res) => {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get Hostel Room Details" })
                } else if (hs_res.length > 0) {

                    var hos_detail_id = hs_res[0].id;

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
}

module.exports = { createBed, getHostelList, checkRoom, hostelListDetails, createPG, FloorList, RoomList, BedList, RoomCount, ListForFloor, CreateRoom, CreateFloor, RoomFull, UpdateEB, listDashBoard, deleteFloor, deleteRoom, deleteBed, get_room_details, update_room_details, bed_details }