const moment = require('moment')


function getHostelList(connection, response, reqData) {
    connection.query(`select * from hosteldetails where created_By = '${reqData.loginId}' `, function (err, data) {
        if (data) {
            response.status(200).json(data)
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
            response.status(200).json(data)
        }
    })
}


function hostelListDetails(connection, response) {
    connection.query('select * from hostel_details', function (error, data) {
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

function createPG(connection, reqData, response) {
    let hostelID, errorMessage
    if (reqData) {
        const query = `insert into hosteldetails(Name,hostel_PhoneNo,number_Of_Floor,email_id,Address,created_By) values (\'${reqData.name}\',\'${reqData.phoneNo}\',\'${reqData.number_of_floors}\',\'${reqData.email_Id}\',\'${reqData.location}\',\'${reqData.created_by}\')`
        connection.query(query, function (error, data) {
            if (error) {
                console.log("error", error);
                response.status(201).json({ message: 'Cannot Insert Details' })
            }
            else {
                console.log("Data for new hostel *=>", data)
                const query2 = ` select * from hosteldetails where hostel_PhoneNo=\'${reqData.phoneNo}\'`
                connection.query(query2, function (error, datum) {
                    if (datum.length > 0) {
                        hostelID = datum[0].id
                        for (let i = 0; i < reqData.floorDetails.length; i++) {
                            for (let j = 0; j < reqData.floorDetails[i].length; j++) {
                                const bed = Number(reqData.floorDetails[i][j].number_Of_Bed)
                                const room = Number(reqData.floorDetails[i][j].roomName)
                                const price = Number(reqData.floorDetails[i][j].price)
                                const query3 = `insert into hostelrooms(Hostel_Id,Floor_Id,Room_Id,Number_Of_Beds,Created_By,Price) values(\'${hostelID}\',\'${i + 1}\',\'${room}\',\'${bed}\',\'${reqData.created_by}\',\'${price}\')`
                                connection.query(query3, function (error, data) {
                                    console.log(error);
                                    if (error) {
                                        errorMessage = error;
                                    }

                                })
                            }
                        }
                        if (errorMessage) {

                            response.status(201).json({ message: 'Cannot Insert Details' })
                        }
                        else {
                            response.status(200).json({ message: 'Data Saved Successfully' })
                        }
                    }

                    else {
                        response.status(201).json({ message: 'Phone number not Registered' })
                    }

                })
            }
        })
    }
    else {
        response.status(201).json({ message: 'Missing Parameter' })
    }
}


function FloorList(connection, requestData, response) {
    if (requestData) {
        connection.query(`select * from hostelrooms where Hostel_Id = \'${requestData.hostel_Id}\'`, function (error, data) {
            if (data) {
                response.status(200).json(data)
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
        connection.query(`select * from hostelrooms where Hostel_Id = \'${reqData.hostel_Id}\' and Floor_Id = \'${reqData.floor_Id}\'`, function (error, data) {
            if (data) {
                response.status(200).json(data)
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
        connection.query(`select hosroom.Hostel_Id,hosroom.Floor_Id,hosroom.Room_Id,hosroom.Number_Of_Beds,hosroom.Price,COUNT(hos.Bed) as availableBed from hostelrooms hosroom INNER JOIN hostel hos on hosroom.Room_Id = hos.Rooms where hosroom.Hostel_Id = \'${requestBodyData.hostel_Id}\' and hosroom.Floor_Id = \'${requestBodyData.floor_Id}\' and hosroom.Room_Id = \'${requestBodyData.room_Id}\';`, function (error, data) {

            if (data) {
                console.log("data", data);
                let responseData = data.map((val) => ({
                    Hostel_Id: val.Hostel_Id,
                    Floor_Id: val.Floor_Id,
                    Room_Id: val.Room_Id,
                    AvailableBed: val.Number_Of_Beds - val.availableBed
                }
                ))
                response.status(200).json(responseData)
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
        connection.query(`SELECT * FROM hostelrooms WHERE Floor_Id = '${reqFloorID.floor_Id}' AND Hostel_Id = '${reqFloorID.hostel_Id}'`, function (error, RoomsData) {
            if (error) {
                response.status(500).json({ message: "Error occurred while fetching data" });
                return;
            }

            if (RoomsData.length > 0) {

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
                                Number_Of_Beds: RoomsData[i].Number_Of_Beds,
                                Room_Rent: RoomsData[i].Price
                            };
                            responseData.push(objectFormation);
                        }

                        if (responseData.length === RoomsData.length) {
                            if (errorMessage) {
                                response.status(202).json({ message: "Error occurred while fetching data" });
                            } else {
                                console.log("responseData", responseData);
                                response.status(200).json(responseData);
                            }
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
        connection.query(`select * from hostelrooms where  Hostel_Id = \'${reqData.hostel_Id}\'`, function (error, data) {

            if (data) {
                response.status(200).json(data)
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

function CreateRoom(connection, reqsData, response) {
    let hostelId, errorMessage, message;
    if (reqsData) {
        const query1 = `SELECT * FROM hosteldetails WHERE id='${reqsData.id}'`;
        connection.query(query1, function (error, data) {

            if (data && data.length > 0) {
                hostelId = data[0].id;

                for (let i = 0; i < reqsData.floorDetails.length; i++) {
                    const currentRoom = reqsData.floorDetails[i];
                    const checkRoomQuery = `SELECT Room_Id, Number_Of_Beds FROM hostelrooms WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}'`;

                    connection.query(checkRoomQuery, function (error, existingRoom) {


                        if (existingRoom && existingRoom.length > 0) {

                            setTimeout(() => {
                                message = `Room ID is already exists.`;
                            }, 1000)


                            let updateQuery;
                            if (currentRoom.number_of_beds && currentRoom.roomRent) {
                                updateQuery = ` UPDATE hostelrooms SET Number_Of_Beds = '${currentRoom.number_of_beds}', Price = '${currentRoom.roomRent}'  WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}'`;

                            } else if (currentRoom.number_of_beds) {
                                updateQuery = ` UPDATE hostelrooms SET Number_Of_Beds = '${currentRoom.number_of_beds}' WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}'`;
                            }


                            connection.query(updateQuery, function (error, updateResult) {
                                console.log("Update result", updateResult);
                                if (error) {
                                    errorMessage = error;
                                }

                            });
                        } else {
                            const insertQuery = `INSERT INTO hostelrooms (Hostel_Id, Floor_Id, Room_Id, Number_Of_Beds, Price)VALUES ('${hostelId}', '${currentRoom.floorId}', '${currentRoom.roomId}', '${currentRoom.number_of_beds}', '${currentRoom.roomRent}')`;

                            connection.query(insertQuery, function (error, insertResult) {
                                if (error) {
                                    errorMessage = error;
                                }

                            });
                        }
                    });
                }

                if (errorMessage) {
                    response.status(201).json({ message: 'Cannot Insert Details' });
                } else {
                    response.status(200).json({ message: message && message.length > 0 ? message : 'Create Room Details successfully' })
                }
            } else {
                response.status(201).json({ message: 'No Data Found' });
            }
        });
    } else {
        response.status(201).json({ message: 'Missing Parameter' });
    }
}

function CreateFloor(connection, reqDataFloor, response) {
    let hostel_ID, errorMessage
    if (reqDataFloor) {
        const query1 = `select * from hosteldetails where hostel_PhoneNo=\'${reqDataFloor.phoneNo}\'`
        connection.query(query1, function (error, data) {
            if (data) {
                console.log("data", data);
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
                response.status(201).json({ message: 'Phone number not Registered' })
            }
        })

    }
    else {
        response.status(201).json({ message: 'Missing Parameter' })
    }
}

function RoomFull(connection, reqFloorID, response) {
    if (reqFloorID) {
        const query1 = `SELECT hos.Hostel_Id,hosRoom.Hostel_Id as hostel_Id, hos.Floor,hos.Rooms, hosRoom.Floor_Id,hosRoom.Room_Id, COUNT(hos.bed)as occupiedBeds ,hosRoom.Number_Of_Beds FROM hostel hos INNER JOIN hostelrooms hosRoom on hos.Floor = hosRoom.Floor_Id and hos.Rooms = hosRoom.Room_Id WHERE hosroom.Hostel_Id = \'${reqFloorID.hostel_Id}\' and hosroom.Floor_Id = \'${reqFloorID.floor_Id}\' and hosroom.Room_Id = \'${reqFloorID.room_Id}\'`
        connection.query(query1, function (error, data) {
            if (data) {
                response.status(200).json(data)
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
function listDashBoard(connection, response, reqdata) {
    if (reqdata) {
        let query = `select (select count(id) from smart_stay.hosteldetails where created_By=details.created_By) as hostelCount, sum((select count(Room_Id) from smart_stay.hostelrooms where Hostel_Id=details.id)) as roomCount,  sum((select sum(Number_Of_Beds) from smart_stay.hostelrooms where Hostel_Id=details.id)) as Bed ,sum((select count(id) from smart_stay.hostel where Hostel_Id= details.id and isActive =1)) as occupied_Bed ,(select COALESCE(SUM(COALESCE(icv.RoomRent, 0) + COALESCE(icv.EbAmount, 0) + COALESCE(icv.AmnitiesAmount, 0)), 0) AS revenue
        FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id=hos.id WHERE hos.created_By=?) AS Revenue,(select COALESCE(SUM(COALESCE(icv.RoomRent, 0) + COALESCE(icv.EbAmount, 0) + COALESCE(icv.AmnitiesAmount, 0)), 0) AS revenue
        FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id=hos.id WHERE hos.created_By=? AND icv.Status='Pending') AS overdue from smart_stay.hosteldetails details where details.created_By=?;`
        connection.query(query,[reqdata.created_by,reqdata.created_by,reqdata.created_by], function (error, data) {
            if (error) {
                response.status(201).json({ message: "No data found" });
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
                            current: current
                        }
                        // tempArray.push(obj)
                        return obj

                    })

                    // Get Revenue Details 
                    var query1 = "SELECT m.month,COALESCE(SUM(COALESCE(invo.RoomRent, 0) + COALESCE(invo.EbAmount, 0) + COALESCE(invo.AmnitiesAmount, 0)), 0) AS revenue FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL  SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS numbers ) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month,invo.RoomRent, invo.EbAmount,invo.AmnitiesAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.created_By = ?  AND invo.Status = 'Success' ) AS invo ON m.month = invo.month GROUP BY m.month ORDER BY m.month; "
                    // Execute the query
                    connection.query(query1, [reqdata.created_by], (error, results, fields) => {
                        if (error) {
                            console.error('Error executing query:', error);
                            return;
                        }
                        // Process the results
                        response.status(200).json({ dashboardList, Revenue_reports: results });
                    })
                }
            }
        })
    }
    else {
        response.status(201).json({ message: "Missing Parameter" });
    }
}



module.exports = { getHostelList, checkRoom, hostelListDetails, createPG, FloorList, RoomList, BedList, RoomCount, ListForFloor, CreateRoom, CreateFloor, RoomFull, UpdateEB, listDashBoard }