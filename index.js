const express = require('express')
const nodemailer = require('nodemailer');
const mysql = require('mysql');
var cors = require('cors');
const cron = require('node-cron');

const app = express()

var corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
};
cron.schedule("0 0 * * *", function () {
    console.log("This task runs every day");
});
cron.schedule("0 0 1 * *", function () {
    console.log("This task runs every month ");
});
cron.schedule("0 0 1 1 *", function () {
    console.log("This task runs on the 1st day of January every year");
});
// cron.schedule("* * * * * *", function () {
//     console.log("This task runs every second");
// });
// cron.schedule("* * * * *", function () {
//     console.log("This task runs every minute");
// });
const cronFunction = cron.schedule("* * * * * ", function () {
    console.log("This task runs every minute");
    connection.query(`SELECT * FROM hostel`, function (err, users) {
        console.log(" users", users)
        if (err) {
            console.error("Error fetching users:", err);
            return;
        }
             users.forEach(user => {
            const userID = user.User_Id;
            console.log(" userID", userID)
                     calculateAndInsertInvoice(userID, users);
        });
    });
});

function calculateAndInsertInvoice(userID, reqdatum) {
       console.log("reqdatum *********", reqdatum)
    for (let i = 0; i < reqdatum.length; i++) {
    connection.query(`SELECT * FROM invoicedetails WHERE User_Id = '${userID}'`, function (err, existingData) {
        if (err) {
            console.error("Error querying existing invoice data for user:", userID, err);
            return;
        }
        // if (existingData.length > 0) {
        //     console.log("Invoice already exists for user:", userID);
        //     return;
        // }
            const query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, BalanceDue, Date, DueDate, Invoices, Status, User_Id) VALUES ('${reqdatum[i].Name}', '${reqdatum[i].Phone}', '${reqdatum[i].Email}', '${reqdatum[i].HostelName}', '${reqdatum[i].Hostel_Id}', '${reqdatum[i].Floor}', '${reqdatum[i].Rooms}', '${reqdatum[i].AdvanceAmount}', '${reqdatum[i].BalanceDue}', '${reqdatum[i].createdAt}', '${reqdatum[i].DueDate}', '${reqdatum[i].invoiceNo}', '${reqdatum[i].Status}', '${reqdatum[i].User_Id}')`
            connection.query(query, function (error, data) {
                console.log("data ****", data)
                if (error) {
                    console.error("Error inserting invoice data for user:", userID, error);
                    return;
                }
                console.log("Invoice inserted successfully for user:", userID);
            });
            });
}
}




// cron.schedule("* * * * * ", function () {
//     console.log("This task runs every minute");
   
// });
app.use(cors(corsOptions));
app.options('*', cors());
app.use(express.json())
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Accept");
    next();
})

const connection = mysql.createConnection({
    host: 'ls-f4c1514e53cc8c27ec23a4ce119af8c49d7b1ce7.crocoq6qec8l.ap-south-1.rds.amazonaws.com',
    database: 'smart_stay',
    user: 'dbadmin',
    password: 'Password!#$0'
})

connection.connect(function (error) {
    if (error) {
        console.log(error)
    }
    else {
        console.log("connection success")
    }
})

app.get('/users/user-list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*')
    connection.query('select * from hostel', function (error, data) {
        console.log(error);
        console.log(data);

        if (error) {
            response.status(403).json({ message: 'not connected' })
        }
        else {
            response.status(200).json(data)
        }
    })
})
app.post('/create/create-account', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    console.log("request", request.body);
    let reqBodyData = request.body;

    if (reqBodyData.id) {
        // const isEnable = reqBodyData.isEnable ? reqBodyData.isEnable : false
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
});
app.post('/create/isEnable', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    console.log("request.......", request.body);
    let reqBodyData = request.body;

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
});





app.get('/login/login', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    console.log("request.query", request.query);
    const { email_Id, password } = request.query;
    console.log("EmailId:", email_Id);
    console.log("Password:", password);
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
});

app.post('/forget/select-list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*')
    console.log("request.body", request.body)
    if (request.body.email) {
        connection.query(`SELECT * FROM createaccount WHERE email_id= \'${request.body.email}\'`, function (error, data) {
            console.log("data for reset", data[0].Otp)

            connection.query(`UPDATE createaccount SET password= \'${request.body.NewPassword}\' WHERE email_id=\'${request.body.email}\' `, function (error, data) {
                if ((data)) {
                    connection.query(`UPDATE createaccount SET Otp = 0 WHERE email_id=\'${request.body.email}\' `, function (error, resetData) {
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
})

app.post('/add/new-hostel', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    const reqData = request.body;
    console.log("reqData", reqData);
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
                                const query3 = `insert into hostelrooms(Hostel_Id,Floor_Id,Room_Id,Number_Of_Beds,Created_By,Price) values(\'${hostelID}\',\'${i + 1}\',\'${room}\',\'${bed}\',\'${reqData.created_by}\',0)`
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
})


app.get('/list/hostel-list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    connection.query(`select * from hosteldetails`, function (err, data) {
        if (data) {
            response.status(200).json(data)
        }
        else {
            response.status(201).json({ message: 'No Data Found' })
        }
    })
})

app.post('/list/floor-list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    const requestData = request.body
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
})

app.post('/list/rooms-list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    const reqData = request.body;
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
})

app.post('/list/bed-list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    const requestBodyData = request.body;
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
})



app.post('/list/numberOf-Rooms', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    const reqFloorID = request.body;
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

                    connection.query(`SELECT COUNT('Bed') AS bookedBedCount, hos.Hostel_Id AS hostel_Id, hos.Floor, hos.Rooms FROM hostel hos WHERE Floor = '${reqFloorID.floor_Id}' AND Hostel_Id = '${reqFloorID.hostel_Id}' AND Rooms = '${Room_Id}'`, function (error, hostelData) {
                        if (error) {
                            errorMessage = error;
                        } else {
                            const objectFormation = {
                                bookedBedCount: hostelData[0].bookedBedCount,
                                Hostel_Id: RoomsData[i].Hostel_Id,
                                Floor_Id: RoomsData[i].Floor_Id,
                                Room_Id: RoomsData[i].Room_Id,
                                Number_Of_Beds: RoomsData[i].Number_Of_Beds
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
});



app.post('/add/invoice-add', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    const reqdatum = request.body;

    console.log("reqdatum", reqdatum);

    if (!reqdatum.User_Id) {
        response.status(400).json({ message: "Missing Parameter: User_Id" });
        return;
    }

    connection.query(`SELECT * FROM hostel WHERE User_Id = \'${reqdatum.User_Id}\'`, function (err, hostelData) {
        if (err) {
            console.error("Error querying hostel data:", err);
            response.status(500).json({ message: "Internal Server Error" });
            return;
        }

        console.log("hostelData", hostelData);

        if (hostelData.length > 0) {
            const UserID = hostelData[0].User_Id;

            connection.query(`SELECT * FROM invoicedetails WHERE Date = \'${reqdatum.Date}\' and User_Id=\'${UserID}\'`, function (err, existingData) {
                if (err) {
                    console.error("Error querying existing invoice data:", err);
                    response.status(500).json({ message: "Internal Server Error" });
                    return;
                }

                if (existingData.length > 0) {

                    let query = `UPDATE invoicedetails SET Name='${reqdatum.Name}', phoneNo='${reqdatum.Phone}', EmailID='${reqdatum.Email}', Hostel_Name='${reqdatum.hostel_Name}', Hostel_Id='${reqdatum.hostel_Id}', Floor_Id='${reqdatum.Floor_Id}', Room_No='${reqdatum.RoomNo}', Amount='${reqdatum.Amount}', BalanceDue='${reqdatum.BalanceDue}', DueDate='${reqdatum.DueDate}', Status='${reqdatum.Status}' WHERE User_Id='${UserID}' AND Date='${reqdatum.Date}'`;

                    connection.query(query, function (error, data) {
                        if (error) {
                            console.error("Error updating invoice data:", error);
                            response.status(500).json({ message: "Internal Server Error" });
                            return;
                        }
                        response.status(200).json({ message: "Data Updated Successfully" });
                    });
                } 
                else {
                  
                        // let query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, BalanceDue, Date, DueDate, Invoices, Status, User_Id) VALUES ('${reqdatum.Name}', '${reqdatum.Phone}', '${reqdatum.Email}', '${reqdatum.hostel_Name}', '${reqdatum.hostel_Id}', '${reqdatum.Floor_Id}', '${reqdatum.RoomNo}', '${reqdatum.Amount}', '${reqdatum.BalanceDue}', '${reqdatum.Date}', '${reqdatum.DueDate}', '${reqdatum.invoiceNo}', '${reqdatum.Status}', '${UserID}')`;

                        // connection.query(query, function (error, data) {
                        //     if (error) {
                        //         console.error("Error inserting invoice data:", error);
                        //         response.status(500).json({ message: "Internal Server Error" });
                        //         return;
                        //     }
                        //     response.status(200).json({ message: "Data Inserted Successfully" });
                        // });
                        // cronFunction()
                    
                  
                }
            });
        } else {
            response.status(204).json({ message: "User not found" });
        }
    });
});




app.get('/list/invoice-list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*')
    connection.query('select * from invoicedetails', function (error, data) {
        console.log(error);
        console.log(data);

        if (error) {
            response.status(403).json({ message: 'not connected' })
        }
        else {
            response.status(200).json(data)
        }
    })
})

app.get('/compliance/compliance-list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*')
    connection.query('select * from compliance', function (error, data) {
        console.log(error);
        console.log(data);

        if (error) {
            response.status(403).json({ message: 'not connected' })
        }
        else {
            response.status(200).json(data)
        }
    })
})

app.get('/hostel/list-details', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*')
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
})

app.post('/compliance/add-details', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    console.log(request.body);
    var atten = request.body;
    console.log(atten);

    if (atten.id) {
        connection.query(`UPDATE compliance SET date='${atten.date}', Name='${atten.Name}', Phone='${atten.Phone}', Roomdetail='${atten.Roomdetail}', Complainttype='${atten.Complainttype}', Assign='${atten.Assign}', Status='${atten.Status}', Hostel_id='${atten.Hostel_id}', Floor_id='${atten.Floor_id}', Room='${atten.Room}', hostelname='${atten.hostelname}', Description='${atten.Description}' WHERE ID='${atten.id}'`, function (error, data) {
            if (error) {
                response.status(201).json({ message: "No User Found" });
            } else {
                response.status(200).json({ message: "Update Successfully" });
            }
        });


    }
    else {

        connection.query(`SELECT MAX(Requestid) AS maxRequestId FROM compliance`, function (error, result) {
            if (error) {
                console.log(error);
                response.status(201).json({ message: "Error fetching last Requestid", statusCode: 201 });
            } else {
                let maxRequestId = result[0].maxRequestId || "#100"
                let numericPart = parseInt(maxRequestId.substring(1));
                numericPart++;
                const nextRequestId = ` #${numericPart.toString().padStart(2, '0')}`;


                connection.query(`INSERT INTO compliance(date, Name, Phone, Requestid, Roomdetail, Complainttype, Assign, Status, Hostel_id, Floor_id, Room, hostelname, Description) VALUES  
            ('${atten.date}', '${atten.Name}', '${atten.Phone}', '${nextRequestId}', '${atten.Roomdetail}', '${atten.Complainttype}', '${atten.Assign}', '${atten.Status}', '${atten.Hostel_id}', '${atten.Floor_id}', '${atten.Room}', '${atten.hostelname}', '${atten.Description}')`, function (error, data) {
                    if (error) {
                        console.log(error);
                        response.status(201).json({ message: "Error inserting record", statusCode: 201 });
                    } else {
                        response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                    }
                });
            }
        });


    }
});

app.post('/floor_list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*')
    const reqData = request.body;
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

})




app.post('/add/adduser-list', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    console.log("request.body......?", request.body);
    var atten = request.body;
    console.log(atten); ``
    const FirstNameInitial = atten.firstname.charAt(0).toUpperCase();
    const LastNameInitial = atten.lastname.charAt(0).toUpperCase();
    const Circle = FirstNameInitial + LastNameInitial;
    const Status = atten.BalanceDue > 0 ? 'Pending' : 'Success';
    const Name = atten.firstname + ' ' + atten.lastname;

    if (atten.ID) {
        connection.query(`UPDATE hostel SET Circle='${Circle}', Name='${Name}',Phone='${atten.Phone}', Email='${atten.Email}', Address='${atten.Address}', AadharNo='${atten.AadharNo}', PancardNo='${atten.PancardNo}',licence='${atten.licence}',HostelName='${atten.HostelName}',Hostel_Id='${atten.hostel_Id}', Floor='${atten.Floor}', Rooms='${atten.Rooms}', Bed='${atten.Bed}', AdvanceAmount='${atten.AdvanceAmount}', RoomRent='${atten.RoomRent}', BalanceDue='${atten.BalanceDue}', PaymentType='${atten.PaymentType}', Status='${Status}'  WHERE ID='${atten.ID}' `, function (updateError, updateData) {
            if (updateError) {
                response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
            } else {
                response.status(200).json({ message: "Update Successfully", statusCode: 200 });
            }
        });
    } else {
        function generateUserId(firstName) {
            const userIdPrefix = firstName.substring(0, 4).toUpperCase();
            const randomNum = Math.floor(100 + Math.random() * 900);
            const userId = userIdPrefix + randomNum;
            return userId;
        }
        const User_Id = generateUserId(atten.firstname);
        console.log(" User_Id", User_Id)
        let userID;
        connection.query(`SELECT * FROM hostel WHERE User_Id='${User_Id}'`, function (error, data) {
            if (data.length > 0) {
                userID = generateUserId(firstName)
            }
            else {
                userID = User_Id
            }
            connection.query(`SELECT * FROM hostel WHERE Phone='${atten.Phone}'`, function (error, data) {
                if (data.length > 0) {
                    response.status(202).json({ message: "Phone Number Already Exists", statusCode: 202 });
                } else {
                    connection.query(`SELECT * FROM hostel WHERE Email='${atten.Email}'`, function (error, data) {
                        if (data.length > 0) {
                            response.status(203).json({ message: "Email Already Exists", statusCode: 203 });
                        } else {
                            connection.query(`INSERT INTO hostel (Circle,User_Id, Name, Phone, Email, Address, AadharNo, PancardNo, licence,HostelName, Hostel_Id, Floor, Rooms, Bed, AdvanceAmount, RoomRent, BalanceDue, PaymentType, Status) VALUES ('${Circle}','${userID}', '${Name}', '${atten.Phone}', '${atten.Email}', '${atten.Address}', '${atten.AadharNo}', '${atten.PancardNo}', '${atten.licence}','${atten.HostelName}' ,'${atten.hostel_Id}', '${atten.Floor}', '${atten.Rooms}', '${atten.Bed}', '${atten.AdvanceAmount}', '${atten.RoomRent}', '${atten.BalanceDue}', '${atten.PaymentType}', '${Status}')`, function (insertError, insertData) {
                                if (insertError) {
                                    console.log(insertError);
                                    response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                                } else {
                                    response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                                }
                            });
                        }
                    });
                }
            });
        })


    }
});



app.get('/user-list/bill-payment', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*')
    connection.query(`SELECT hos.Name ,hos.Phone,hos.Email,hos.Address,hos.AdvanceAmount,hos.BalanceDue,hos.Status,hos.createdAt,inv.Name as invoiceName, inv.phoneNo as invoicePhone ,inv.Date as invDate, inv.Amount as invAmount,inv.BalanceDue as invBalance ,inv.Status as invStatus, inv.Invoices as InvoiceNo FROM hostel hos INNER JOIN invoicedetails inv on inv.phoneNo= hos.Phone`, function (error, data) {
        console.log(error);
        if (error) {
            response.status(201).json({ message: 'No Data Found', statusCode: 201 })
        }
        else {
            response.status(200).json(data)
        }
    })
})

app.post('/room/create-room', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    console.log("requestBody is", request.body);
    const reqsData = request.body;
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

                            const updateQuery = ` UPDATE hostelrooms SET Number_Of_Beds = '${currentRoom.number_of_beds}' WHERE Hostel_Id = '${hostelId}' AND Floor_Id = '${currentRoom.floorId}' AND Room_Id = '${currentRoom.roomId}'`;
                            console.log("Update Query:", updateQuery);
                            connection.query(updateQuery, function (error, updateResult) {
                                console.log("Update result", updateResult);
                                if (error) {
                                    errorMessage = error;
                                }

                            });
                        } else {
                            const insertQuery = `INSERT INTO hostelrooms (Hostel_Id, Floor_Id, Room_Id, Number_Of_Beds)VALUES ('${hostelId}', '${currentRoom.floorId}', '${currentRoom.roomId}', '${currentRoom.number_of_beds}')`;

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
});

app.post('/floor/create-floor', async function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    console.log("requestBody is floor", request.body);
    const reqDataFloor = request.body;
    console.log('reqDataFloor', reqDataFloor);
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
})

app.get('/room-id/check-room-id', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*')
    const query2 = `SELECT hosRom.Room_Id AS RoomId, hosRom.Number_Of_Beds AS NumberOfBeds, hosRom.Hostel_Id, hosRom.Floor_Id, host.id AS HostelDetailsId FROM hostelrooms hosRom INNER JOIN hosteldetails host ON host.id = hosRom.Hostel_Id`
    connection.query(query2, function (error, data) {
        if (error) {
            response.status(201).json({ message: 'No Data Found' })
        }
        else {
            response.status(200).json(data)
        }
    })

})

app.post('/check/room-full', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    const reqFloorID = request.body
    console.log("request.bodys *", request.body)
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
})

app.post('/otp-send/send-mail', function (request, response) {
    response.set('Access-Control-Allow-Origin', '*');
    console.log("request.body", request.body)
    if (request.body.email) {
        connection.query(`SELECT * FROM createaccount WHERE email_id= \'${request.body.email}\'`, function (error, data) {
            if (data && data.length > 0) {
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                console.log("otp is ", otp);
                connection.query(`UPDATE createaccount SET Otp= \'${otp}\' WHERE email_id=\'${request.body.email}\' `, function (error, data) {
                    if (data) {
                        const transporter = nodemailer.createTransport({
                            service: 'gmail',
                            auth: {
                                user: request.body.email,
                                pass: 'afki rrvo jcke zjdt',
                            },

                        });
                        const mailOptions = {
                            from: request.body.email,
                            to: request.body.email,
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
                response.status(201).json({ message: `${request.body.email} is doesn't exist`, statusCode: 201 });
            }
        });
    } else {
        response.status(203).json({ message: "Missing parameter", statusCode: 203 });
    }
});




app.listen('2001', function () {
    console.log("node is started at 2001")
})