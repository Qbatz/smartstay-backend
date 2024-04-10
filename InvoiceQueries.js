const moment = require('moment');
const AWS = require('aws-sdk');
require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Console } = require('console');
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
const request = require('request');


AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();

const https = require('https');


// function calculateAndInsertInvoice(connection, user) {
//     console.log("user.Hostel_Id", user);
//     connection.query(`SELECT hos.id AS Hosteldetails_Id, hos.prefix, hos.suffix, hos.Name, hos.isHostelBased, amen.AmenitiesName, amen.Amount, amen.setAsDefault, amen.Hostel_Id, amen.Status, eb.Hostel_Id AS EbHostel_Id, eb.Floor, eb.Room, eb.EbAmount 
//     FROM hosteldetails AS hos 
//     INNER JOIN Amenities AS amen ON hos.id = amen.Hostel_Id 
//     INNER JOIN EbAmount AS eb ON hos.id = eb.Hostel_Id AND amen.Hostel_Id = eb.Hostel_Id 
//     WHERE hos.id = ${user.Hostel_Id};`, function (err, existingData) {

//         console.log("existingData..?",existingData);
//         if (err) {
//             console.error("Error fetching hosteldetails:", err);
//             return;
//         }


//         connection.query(`SELECT price FROM hostelrooms WHERE Hostel_Id = ${user.Hostel_Id} AND Floor_Id = ${user.Floor} AND Room_Id = ${user.Rooms}`, function (err, roomData) {
//             if (err) {
//                 console.error("Error fetching room data:", err);
//                 return;
//             }

//             let roomPrice;
//             const currentDate = moment(new Date()).format('YYYY-MM-DD');
//             const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
//             let dueDate, invoiceDate;
//             let invoiceNo = '';

//             const currentMonth = moment(currentDate).month() + 1;
//             const currentYear = moment(currentDate).year();
//             const createdAtMonth = moment(joinDate).month() + 1;
//             const createdAtYear = moment(joinDate).year();

//             roomPrice = roomData[0].price;

//             if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
//                 dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
//                 invoiceDate = moment(joinDate).format('YYYY-MM-DD');
//             } else {
//                 dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
//                 invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
//             }

//             const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
//             const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');

//             const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

//             let AdvanceAmount;

//             if (existingData.length > 0) {
//                 let filteredArray = existingData.filter(item => item.Hostel_Id == user.Hostel_Id);

//                 if (filteredArray[0].setAsDefault == 0 && filteredArray[0].Status == 1 ) {
//                     AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + filteredArray[0].Amount;
//                 } 
//                 else if (user.Hostel_Id === existingData[0].EbHostel_Id){
//                     let EbAmountCalculation = existingData.filter(()=>{

//                     })
//                 }
//                 else {
//                     AdvanceAmount = (roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays;
//                 }

//                 const userID = user.User_Id.toString().slice(0, 4);

//                 if (filteredArray[0].prefix != '' && filteredArray[0].suffix != ''  && filteredArray[0].prefix != undefined && filteredArray[0].suffix != undefined  && filteredArray[0].prefix != '' && filteredArray[0].suffix != '') {
//                     invoiceNo = filteredArray[0].prefix + filteredArray[0].suffix + user.Name + currentMonth + currentYear;
//                 } else {
//                     invoiceNo = 'INVC' + currentMonth + currentYear + userID; 
//                 }
//             } else {
//                 AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays);
//                 const userID = user.User_Id.toString().slice(0, 4);
//                 invoiceNo = 'INVC' + currentMonth + currentYear + userID;
//             }

//             // const query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${AdvanceAmount},'${user.Address}', '${formattedJoinDate}', '${formattedDueDate}', '${invoiceNo}', '${user.Status}', '${user.User_Id}')`;

//             // connection.query(query, function (error, data) {
//             //     if (error) {
//             //         console.error("Error inserting invoice data for user:", user.User_Id, error);
//             //         return;
//             //     }
//             // });
//         });
//     });
// }


// function calculateAndInsertInvoice(connection, user) {
//     console.log("user **", user);
//     connection.query(`SELECT  hos.id AS Hosteldetails_Id, hos.prefix, hos.suffix,  hos.Name, hos.isHostelBased, amen.AmenitiesName, amen.Amount,amen.setAsDefault, amen.Hostel_Id, amen.Status, eb.Hostel_Id AS EbHostel_Id, eb.Floor,eb.Room, eb.EbAmount FROM  hosteldetails AS hos INNER JOIN  Amenities AS amen ON hos.id = amen.Hostel_Id  INNER JOIN  EbAmount AS eb ON hos.id = eb.Hostel_Id where  hos.id = ${user.Hostel_Id}`, function (err, existingData) {
//         if (err) {
//             console.error("Error fetching hosteldetails:", err);
//             return;
//         }

//         console.log("existingData", existingData)
//         connection.query(`SELECT price FROM hostelrooms WHERE Hostel_Id = ${user.Hostel_Id} AND Floor_Id = ${user.Floor} AND Room_Id = ${user.Rooms}`, function (err, roomData) {
//             if (err) {
//                 console.error("Error fetching room data:", err);
//                 return;
//             }

//             let roomPrice;
//             const currentDate = moment(new Date()).format('YYYY-MM-DD');
//             const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
//             let dueDate, invoiceDate;
//             let invoiceNo = '';

//             const currentMonth = moment(currentDate).month() + 1;
//             const currentYear = moment(currentDate).year();
//             const createdAtMonth = moment(joinDate).month() + 1;
//             const createdAtYear = moment(joinDate).year();

//             roomPrice = roomData[0].price;

//             if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
//                 dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
//                 invoiceDate = moment(joinDate).format('YYYY-MM-DD');
//             } else {
//                 dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
//                 invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
//             }

//             const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
//             const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');

//             const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

//             let AdvanceAmount = 0
//             let HostelBasedEb = 0

//             if (existingData.length > 0) {
//                 let filteredArray = existingData.filter(item => item.Hostel_Id == user.Hostel_Id);
//                 // console.log("filteredArray", filteredArray)

//                 let tempArray = [];

//                 tempArray.push(user)

//                 // console.log("tempArray", tempArray);

//                 // if (filteredArray[0].isHostelBased == 1) {
//                 //     HostelBasedEb = filteredArray[0].EbAmount / (5 + 1)
//                 //     HostelBasedEb = Math.round(HostelBasedEb);
//                 //     console.log(" HostelBasedEb", HostelBasedEb)
//                 //     console.log("NumberOFUsers", 5)
//                 // }
//                 // if(filteredArray[0].isHostelBased == 1){
//                 //     const filteredUserFortempArray = tempArray.filter((view=> view.Hostel_Id == user.Hostel_Id ))
//                 //     // console.log("filteredUserFortempArray",filteredUserFortempArray)
//                 //     HostelBasedEb = filteredArray[0].EbAmount / (filteredUserFortempArray.length)
//                 //     console.log("filteredArray[0].EbAmount",filteredArray[0].EbAmount)
//                 //     // HostelBasedEb = Math.round(HostelBasedEb);
//                 //     console.log(" HostelBasedEb", HostelBasedEb)
//                 //     console.log("NumberOFUsers")
//                 // }
//                 console.log("AdvanceAmount...????....",AdvanceAmount)
//                 connection.query(`SELECT * from hostel WHERE Hostel_Id = ${user.Hostel_Id}`, function (error, result) {
//                     console.log("result",result)
//                     if (filteredArray[0].isHostelBased === 1) {
//                         // console.log("filteredArray[0].EbAmount", filteredArray[0].EbAmount);
//                         // const filteredUserFortempArray = tempArray.filter(view => view.Hostel_Id === user.Hostel_Id);
                    
//                         if (result.length > 0) {
//                             HostelBasedEb = filteredArray[0].EbAmount / result.length;
//                             console.log("filteredArray[0].EbAmount", filteredArray[0].EbAmount);
//                             console.log("HostelBasedEb", HostelBasedEb);
//                             console.log("NumberOFUsers:", result.length);
                            
//                         } else {
//                             console.log("No users found for the given hostel ID");
//                         }
                    
                    
                    
                   
    
//                     if (filteredArray[0].setAsDefault == 0 && filteredArray[0].Status == 1) {
//                         AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + filteredArray[0].Amount + HostelBasedEb;
//                         console.log("AdvanceAmount...?.....?",AdvanceAmount)
//                     } else {
//                         AdvanceAmount = (roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays + HostelBasedEb;
//                         console.log("AdvanceAmount...????",AdvanceAmount)
//                     }
    
//                     // if (filteredArray[0].isHostelBased == 1) {
//                     //     AdvanceAmount += HostelBasedEb;
//                     // }
    
    
    
//                     const userID = user.User_Id.toString().slice(0, 4);
    
//                     if (filteredArray[0].prefix != '' && filteredArray[0].suffix != '' && filteredArray[0].prefix != undefined && filteredArray[0].suffix != undefined && filteredArray[0].prefix != '' && filteredArray[0].suffix != '') {
//                         invoiceNo = filteredArray[0].prefix + filteredArray[0].suffix + user.Name + currentMonth + currentYear;
//                     } else {
//                         invoiceNo = 'INVC' + currentMonth + currentYear + userID;
//                     }
//                 } else {
//                     AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + HostelBasedEb;
//                     console.log("AdvanceAmount...????1234",AdvanceAmount)
//                     const userID = user.User_Id.toString().slice(0, 4);
//                     invoiceNo = 'INVC' + currentMonth + currentYear + userID;
//                 }
//                     }
//                 )}
//                 AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + HostelBasedEb;
//                 console.log("advance rupees",AdvanceAmount);

            
//             const query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${AdvanceAmount},'${user.Address}', '${formattedJoinDate}', '${formattedDueDate}', '${invoiceNo}', '${user.Status}', '${user.User_Id}')`;

//             connection.query(query, function (error, data) {
//                 if (error) {
//                     console.error("Error inserting invoice data for user:", user.User_Id, error);
//                     return;
//                 }
//             });
//         });
//     });
// }



// function calculateAndInsertInvoice(connection, user) {
//     console.log("user **", user);
//     connection.query(`SELECT  hos.id AS Hosteldetails_Id, hos.prefix, hos.suffix,  hos.Name, hos.isHostelBased, amen.AmenitiesName, amen.Amount,amen.setAsDefault, amen.Hostel_Id, amen.Status, eb.Hostel_Id AS EbHostel_Id, eb.Floor,eb.Room, eb.EbAmount FROM  hosteldetails AS hos INNER JOIN  Amenities AS amen ON hos.id = amen.Hostel_Id  INNER JOIN  EbAmount AS eb ON hos.id = eb.Hostel_Id where  hos.id = ${user.Hostel_Id}`, function (err, existingData) {
//         if (err) {
//             console.error("Error fetching hosteldetails:", err);
//             return;
//         }

//         console.log("existingData", existingData)
//         connection.query(`SELECT price FROM hostelrooms WHERE Hostel_Id = ${user.Hostel_Id} AND Floor_Id = ${user.Floor} AND Room_Id = ${user.Rooms}`, function (err, roomData) {
//             if (err) {
//                 console.error("Error fetching room data:", err);
//                 return;
//             }

//             let roomPrice;
//             const currentDate = moment(new Date()).format('YYYY-MM-DD');
//             const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
//             let dueDate, invoiceDate;
//             let invoiceNo = '';

//             const currentMonth = moment(currentDate).month() + 1;
//             const currentYear = moment(currentDate).year();
//             const createdAtMonth = moment(joinDate).month() + 1;
//             const createdAtYear = moment(joinDate).year();

//             roomPrice = roomData[0].price;

//             if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
//                 dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
//                 invoiceDate = moment(joinDate).format('YYYY-MM-DD');
//             } else {
//                 dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
//                 invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
//             }

//             const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
//             const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');

//             const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

//             let AdvanceAmount = 0
//             let HostelBasedEb = 0

//             if (existingData.length > 0) {
//                 let filteredArray = existingData.filter(item => item.Hostel_Id == user.Hostel_Id);
//                 // console.log("filteredArray", filteredArray)

//                 let tempArray = [];

//                 tempArray.push(user)

//                 // console.log("tempArray", tempArray);

//                 // if (filteredArray[0].isHostelBased == 1) {
//                 //     HostelBasedEb = filteredArray[0].EbAmount / (5 + 1)
//                 //     HostelBasedEb = Math.round(HostelBasedEb);
//                 //     console.log(" HostelBasedEb", HostelBasedEb)
//                 //     console.log("NumberOFUsers", 5)
//                 // }
//                 // if(filteredArray[0].isHostelBased == 1){
//                 //     const filteredUserFortempArray = tempArray.filter((view=> view.Hostel_Id == user.Hostel_Id ))
//                 //     // console.log("filteredUserFortempArray",filteredUserFortempArray)
//                 //     HostelBasedEb = filteredArray[0].EbAmount / (filteredUserFortempArray.length)
//                 //     console.log("filteredArray[0].EbAmount",filteredArray[0].EbAmount)
//                 //     // HostelBasedEb = Math.round(HostelBasedEb);
//                 //     console.log(" HostelBasedEb", HostelBasedEb)
//                 //     console.log("NumberOFUsers")
//                 // }
//                 console.log("AdvanceAmount...????....",AdvanceAmount)
//                 connection.query(`SELECT * from hostel WHERE Hostel_Id = ${user.Hostel_Id}`, function (error, result) {
//                     console.log("result",result)
//                     if (filteredArray[0].isHostelBased === 1) {
//                         // console.log("filteredArray[0].EbAmount", filteredArray[0].EbAmount);
//                         // const filteredUserFortempArray = tempArray.filter(view => view.Hostel_Id === user.Hostel_Id);
                    
//                         if (result.length > 0) {
//                             HostelBasedEb = filteredArray[0].EbAmount / result.length;
//                             console.log("filteredArray[0].EbAmount", filteredArray[0].EbAmount);
//                             console.log("HostelBasedEb", HostelBasedEb);
//                             console.log("NumberOFUsers:", result.length);
                            
//                         } else {
//                             console.log("No users found for the given hostel ID");
//                         }
                    
                    
                    
                   
    
//                     if (filteredArray[0].setAsDefault == 0 && filteredArray[0].Status == 1) {
//                         AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + filteredArray[0].Amount + HostelBasedEb;
//                         console.log("AdvanceAmount...?.....?",AdvanceAmount)
//                     } else {
//                         AdvanceAmount = (roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays + HostelBasedEb;
//                         console.log("AdvanceAmount...????",AdvanceAmount)
//                     }
    
//                     if (filteredArray[0].isHostelBased == 1) {
//                        const lastAmount= AdvanceAmount ;
//                         console.log("lastAmount",lastAmount)
//                     }
    
    
    
//                     const userID = user.User_Id.toString().slice(0, 4);
    
//                     if (filteredArray[0].prefix != '' && filteredArray[0].suffix != '' && filteredArray[0].prefix != undefined && filteredArray[0].suffix != undefined && filteredArray[0].prefix != '' && filteredArray[0].suffix != '') {
//                         invoiceNo = filteredArray[0].prefix + filteredArray[0].suffix + user.Name + currentMonth + currentYear;
//                     } else {
//                         invoiceNo = 'INVC' + currentMonth + currentYear + userID;
//                     }
//                 } else {
//                     AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + HostelBasedEb;
//                     console.log("AdvanceAmount...????1234",AdvanceAmount)
//                     const userID = user.User_Id.toString().slice(0, 4);
//                     invoiceNo = 'INVC' + currentMonth + currentYear + userID;
//                 }
//                     }
//                 )}
                
//                 AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + HostelBasedEb;
//                 console.log("advance rupees",AdvanceAmount);

            
//             const query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${AdvanceAmount},'${user.Address}', '${formattedJoinDate}', '${formattedDueDate}', '${invoiceNo}', '${user.Status}', '${user.User_Id}')`;

//             connection.query(query, function (error, data) {
//                 if (error) {
//                     console.error("Error inserting invoice data for user:", user.User_Id, error);
//                     return;
//                 }
//             });
//         });
//     });
// }

function calculateAndInsertInvoice(connection, user) {
    console.log("user **", user);
    connection.query(`SELECT hos.id AS Hosteldetails_Id, hos.prefix, hos.suffix, hos.Name, hos.isHostelBased, amen.AmenitiesName, amen.Amount, amen.setAsDefault, amen.Hostel_Id, amen.Status, eb.Hostel_Id AS EbHostel_Id, eb.Floor, eb.Room, eb.EbAmount FROM hosteldetails AS hos INNER JOIN Amenities AS amen ON hos.id = amen.Hostel_Id INNER JOIN EbAmount AS eb ON hos.id = eb.Hostel_Id WHERE hos.id = ${user.Hostel_Id}`, function (err, existingData) {
        if (err) {
            console.error("Error fetching hosteldetails:", err);
            return;
        }

        console.log("existingData", existingData)
        connection.query(`SELECT price FROM hostelrooms WHERE Hostel_Id = ${user.Hostel_Id} AND Floor_Id = ${user.Floor} AND Room_Id = ${user.Rooms}`, function (err, roomData) {
            if (err) {
                console.error("Error fetching room data:", err);
                return;
            }

            let roomPrice;
            const currentDate = moment(new Date()).format('YYYY-MM-DD');
            const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
            let dueDate, invoiceDate;
            let invoiceNo = '';

            const currentMonth = moment(currentDate).month() + 1;
            const currentYear = moment(currentDate).year();
            const createdAtMonth = moment(joinDate).month() + 1;
            const createdAtYear = moment(joinDate).year();

            roomPrice = roomData[0].price;

            if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
                dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
                invoiceDate = moment(joinDate).format('YYYY-MM-DD');
            } else {
                dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
                invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
            }

            const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
            const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');

            const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

            let AdvanceAmount = 0;
            let HostelBasedEb = 0;

            if (existingData.length > 0) {
                let filteredArray = existingData.filter(item => item.Hostel_Id == user.Hostel_Id);

                console.log("AdvanceAmount...????....", AdvanceAmount);
                connection.query(`SELECT * from hostel WHERE Hostel_Id = ${user.Hostel_Id}`, function (error, result) {
                    console.log("result", result)
                    if (filteredArray[0].isHostelBased === 1) {
                        if (result.length > 0) {
                            HostelBasedEb = filteredArray[0].EbAmount / result.length;
                            console.log("filteredArray[0].EbAmount", filteredArray[0].EbAmount);
                            console.log("HostelBasedEb", HostelBasedEb);
                            console.log("NumberOFUsers:", result.length);
                        } else {
                            console.log("No users found for the given hostel ID");
                        }

                        if (filteredArray[0].setAsDefault == 0 && filteredArray[0].Status == 1) {
                            AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + filteredArray[0].Amount + HostelBasedEb;
                            console.log("AdvanceAmount...?.....?", AdvanceAmount);
                        } else {
                            AdvanceAmount = (roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays + HostelBasedEb;
                            console.log("AdvanceAmount...????", AdvanceAmount);
                        }
                    }

                    const userID = user.User_Id.toString().slice(0, 4);

                    if (filteredArray[0].prefix != '' && filteredArray[0].suffix != '' && filteredArray[0].prefix != undefined && filteredArray[0].suffix != undefined && filteredArray[0].prefix != '' && filteredArray[0].suffix != '') {
                        invoiceNo = filteredArray[0].prefix + filteredArray[0].suffix + user.Name + currentMonth + currentYear;
                    } else {
                        invoiceNo = 'INVC' + currentMonth + currentYear + userID;
                    }
                });
            }

            AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + HostelBasedEb;
            console.log("advance rupees", AdvanceAmount);

            // const query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${AdvanceAmount},'${user.Address}', '${formattedJoinDate}', '${formattedDueDate}', '${invoiceNo}', '${user.Status}', '${user.User_Id}')`;

            // connection.query(query, function (error, data) {
            //     if (error) {
            //         console.error("Error inserting invoice data for user:", user.User_Id, error);
            //         return;
            //     }
            // });
        });
    });
}



function getInvoiceList(connection, response) {
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
}

function embedImage(doc, imageUrl, fallbackPath, callback) {
    console.log(`Fetching image from URL: ${imageUrl}`);
    if (imageUrl == null) {
        doc.image(fallbackPath, {
            fit: [80, 100],
            align: 'center',
            valign: 'top',
            margin: 50
        });
        callback(new Error("Image URL is null"));
        return;
    }
    request({ url: imageUrl, encoding: null }, (error, response, body) => {
        if (error) {
            doc.image(fallbackPath, {
                fit: [80, 100],
                align: 'center',
                valign: 'top',
                margin: 50
            });
            callback(error);
        } else if (response && response.statusCode === 200) {
            const img = Buffer.from(body, 'base64');
            doc.image(img, {
                fit: [50, 70],
                align: 'center',
                valign: 'top',
                margin: 10,
                continue: true,

            });
            callback(null, body);
        } else {
            console.error(`Failed to fetch image`);
            doc.image(fallbackPath, {
                fit: [80, 100],
                align: 'center',
                valign: 'top',
                margin: 50
            });
            callback(new Error(`Failed to fetch image`));
        }
    });
}


function InvoicePDf(connection, response) {
    connection.query(`SELECT invoice.Name as UserName,invoice.User_Id,invoice.UserAddress, invoice.Invoices,invoice.DueDate,hostel.hostel_PhoneNo,hostel.Address as HostelAddress,hostel.Name as Hostel_Name,hostel.email_id as HostelEmail_Id , hostel.profile as Hostel_Logo ,invoice.Amount FROM invoicedetails invoice INNER JOIN hosteldetails hostel on hostel.id = invoice.Hostel_Id `, function (error, data) {
        if (error) {
            console.log(error);
            response.status(500).json({ message: 'Internal server error' });
        } else if (data.length > 0) {
            let totalPDFs = data.length;
            let uploadedPDFs = 0;
            let filenames = [];
            let pdfDetails = [];

            data.forEach((hostel, index) => {
                console.log("hostelData **", hostel);

                const currentDate = new Date();
                const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
                const year = currentDate.getFullYear().toString();

                const filename = `Invoice${month}${year}${hostel.User_Id}.pdf`;
                filenames.push(filename);

                const doc = new PDFDocument({ font: 'Times-Roman' });
                const stream = doc.pipe(fs.createWriteStream(filename));

                let isFirstPage = true;

                if (!isFirstPage) {
                    doc.addPage();
                } else {
                    isFirstPage = false;
                }

                const hostelNameWidth = doc.widthOfString(hostel.Hostel_Name);
                const leftMargin = doc.page.width - hostelNameWidth - 1000;
                const textWidth = doc.widthOfString('Invoice Receipt');
                const textX = doc.page.width - textWidth - 500;
                const invoiceNoWidth = doc.widthOfString('Invoice No');
                const invoiceDateWidth = doc.widthOfString('Invoice Date');

                const rightMargin = doc.page.width - invoiceNoWidth - 50;
                const marginLeft = 30;
                const marginRight = doc.page.width / 2;
                const logoWidth = 100;
                const logoHeight = 100;
                const logoStartX = marginLeft;
                const logoStartY = doc.y;
                const textStartX = doc.page.width - rightMargin - textWidth;
                const textStartY = doc.y;
                const logoPath = './Asset/Logo.jpeg';
                if (hostel.Hostel_Logo) {
                    embedImage(doc, hostel.Hostel_Logo, logoPath, (error, body) => {
                        if (error) {
                            console.error(error);
                        } else {

                            doc.fontSize(10).font('Times-Roman')
                                .text(hostel.Hostel_Name.toUpperCase(), textStartX, textStartY, { align: 'right' })
                                .moveDown(0.1);
                            doc.fontSize(10).font('Times-Roman')
                                .text(hostel.HostelAddress, textStartX, doc.y, { align: 'right' })
                                .text(hostel.hostel_PhoneNo, textStartX, doc.y, { align: 'right' })
                                .text(`Email : ${hostel.HostelEmail_Id}`, textStartX, doc.y, { align: 'right' })
                                .text('Website: example@smartstay.ae', textStartX, doc.y, { align: 'right' })
                                .text('GSTIN:', textStartX, doc.y, { align: 'right' })
                                .moveDown(2);


                            doc.fontSize(14).font('Helvetica')
                                .text('Invoice Receipt', textX, doc.y, { align: 'center' })
                                .moveDown(0.5);

                            const formattedDueDate = moment(hostel.DueDate).format('DD/MM/YYYY');

                            doc.fontSize(10).font('Times-Roman')
                                .text(`Name: ${hostel.UserName}`, { align: 'left', continued: true, indent: marginLeft, })
                                .text(`Invoice No: ${hostel.Invoices}`, { align: 'right', indent: marginRight })
                                .moveDown(0.5);

                            doc.fontSize(10).font('Times-Roman')
                                .text(`Address: ${hostel.UserAddress}`, { align: 'left', continued: true, indent: marginLeft, })
                                .text(`Invoice Date: ${formattedDueDate}`, { align: 'right', indent: marginRight })
                                .moveDown(0.5);
                            const tableTop = 250;
                            const startX = 50;
                            const startY = tableTop;
                            const cellPadding = 30;
                            const tableWidth = 500;
                            const columnWidth = tableWidth / 4;
                            const marginTop = 80;

                            doc.rect(startX, startY, tableWidth, cellPadding).fillColor('#b2b5b8').fill().stroke();
                            doc.rect(startX, startY, tableWidth, cellPadding * 2).stroke();

                            doc.moveTo(startX + columnWidth, startY).lineTo(startX + columnWidth, startY + cellPadding * 2).stroke();
                            doc.moveTo(startX + columnWidth * 2, startY).lineTo(startX + columnWidth * 2, startY + cellPadding * 2).stroke();
                            doc.moveTo(startX + columnWidth * 3, startY).lineTo(startX + columnWidth * 3, startY + cellPadding * 2).stroke();

                            doc.moveTo(startX, startY + cellPadding).lineTo(startX + tableWidth, startY + cellPadding).stroke();

                            doc.fontSize(12).font('Times-Roman').fillColor('#000000');

                            let headerY = startY + (cellPadding / 2) - (doc.currentLineHeight() / 2);

                            const sNoX = startX + (columnWidth - doc.widthOfString('S.No')) / 2;
                            const paymentModeX = startX + columnWidth + (columnWidth - doc.widthOfString('Payment Mode')) / 2;
                            const descriptionX = startX + columnWidth * 2 + (columnWidth - doc.widthOfString('Description')) / 2;
                            const amountX = startX + columnWidth * 3 + (columnWidth - doc.widthOfString('Amount')) / 2;

                            doc.fontSize(10).text('S.No', sNoX, headerY + 5);
                            doc.fontSize(10).text('Payment Mode', paymentModeX, headerY + 5);
                            doc.fontSize(10).text('Description', descriptionX, headerY + 5);
                            doc.fontSize(10).text('Amount', amountX, headerY + 5);

                            const formattedAmount = `${hostel.Amount.toFixed(2)}`;
                            const paymentMode = 'Online';
                            const sNo = index + 1;

                            headerY += cellPadding;

                            let dataY = startY + cellPadding + (cellPadding / 2) - (doc.currentLineHeight() / 2);
                            doc.fontSize(10).text(sNo.toString(), sNoX, dataY + 5);
                            doc.fontSize(10).text(paymentMode, paymentModeX, dataY + 5);
                            doc.fontSize(10).text('Null', descriptionX, dataY + 5);
                            doc.fontSize(10).text(formattedAmount, amountX, dataY + 5);

                            dataY += cellPadding;

                            doc.fontSize(10).text('We have received your payment of ' + convertAmountToWords(hostel.Amount.toFixed(0)) + ' Rupees and Zero Paise at ' + moment().format('hh:mm A'), startX, startY + cellPadding * 2 + 20, { align: 'left', wordSpacing: 1.5 }).moveDown(10);

                            doc.fontSize(9).text('This is a system generated receipt and no signature is required.', startX, startY + cellPadding * 2 + 20 + marginTop, { align: 'center', wordSpacing: 1, characterSpacing: 0.5 });
                            doc.end();

                            stream.on('finish', function () {
                                console.log(`PDF generated successfully for ${hostel.UserName}`);
                                const fileContent = fs.readFileSync(filename);
                                pdfDetails.push({
                                    filename: filename,
                                    fileContent: fs.readFileSync(filename),
                                    user: hostel.User_Id
                                });

                                uploadedPDFs++;
                                if (uploadedPDFs === totalPDFs) {
                                    deletePDfs(filenames);
                                    uploadToS3(filenames, response, pdfDetails, connection);
                                }
                            });





                        }
                    });
                } else {
                    doc.image(logoPath, {
                        fit: [80, 100],
                        align: 'center',
                        valign: 'top',
                        margin: 50
                    });

                    doc.fontSize(10).font('Times-Roman')
                        .text(hostel.Hostel_Name.toUpperCase(), textStartX, textStartY, { align: 'right' })
                        .moveDown(0.1);
                    doc.fontSize(10).font('Times-Roman')
                        .text(hostel.HostelAddress, textStartX, doc.y, { align: 'right' })
                        .text(hostel.hostel_PhoneNo, textStartX, doc.y, { align: 'right' })
                        .text(`Email : ${hostel.HostelEmail_Id}`, textStartX, doc.y, { align: 'right' })
                        .text('Website: example@smartstay.ae', textStartX, doc.y, { align: 'right' })
                        .text('GSTIN:', textStartX, doc.y, { align: 'right' })
                        .moveDown(2);


                    doc.fontSize(14).font('Helvetica')
                        .text('Invoice Receipt', textX, doc.y, { align: 'center' })
                        .moveDown(0.5);

                    const formattedDueDate = moment(hostel.DueDate).format('DD/MM/YYYY');

                    doc.fontSize(10).font('Times-Roman')
                        .text(`Name: ${hostel.UserName}`, { align: 'left', continued: true, indent: marginLeft, })
                        .text(`Invoice No: ${hostel.Invoices}`, { align: 'right', indent: marginRight })
                        .moveDown(0.5);

                    doc.fontSize(10).font('Times-Roman')
                        .text(`Address: ${hostel.UserAddress}`, { align: 'left', continued: true, indent: marginLeft, })
                        .text(`Invoice Date: ${formattedDueDate}`, { align: 'right', indent: marginRight })
                        .moveDown(0.5);
                    const tableTop = 250;
                    const startX = 50;
                    const startY = tableTop;
                    const cellPadding = 30;
                    const tableWidth = 500;
                    const columnWidth = tableWidth / 4;
                    const marginTop = 80;

                    doc.rect(startX, startY, tableWidth, cellPadding).fillColor('#b2b5b8').fill().stroke();
                    doc.rect(startX, startY, tableWidth, cellPadding * 2).stroke();

                    doc.moveTo(startX + columnWidth, startY).lineTo(startX + columnWidth, startY + cellPadding * 2).stroke();
                    doc.moveTo(startX + columnWidth * 2, startY).lineTo(startX + columnWidth * 2, startY + cellPadding * 2).stroke();
                    doc.moveTo(startX + columnWidth * 3, startY).lineTo(startX + columnWidth * 3, startY + cellPadding * 2).stroke();

                    doc.moveTo(startX, startY + cellPadding).lineTo(startX + tableWidth, startY + cellPadding).stroke();

                    doc.fontSize(12).font('Times-Roman').fillColor('#000000');

                    let headerY = startY + (cellPadding / 2) - (doc.currentLineHeight() / 2);

                    const sNoX = startX + (columnWidth - doc.widthOfString('S.No')) / 2;
                    const paymentModeX = startX + columnWidth + (columnWidth - doc.widthOfString('Payment Mode')) / 2;
                    const descriptionX = startX + columnWidth * 2 + (columnWidth - doc.widthOfString('Description')) / 2;
                    const amountX = startX + columnWidth * 3 + (columnWidth - doc.widthOfString('Amount')) / 2;

                    doc.fontSize(10).text('S.No', sNoX, headerY + 5);
                    doc.fontSize(10).text('Payment Mode', paymentModeX, headerY + 5);
                    doc.fontSize(10).text('Description', descriptionX, headerY + 5);
                    doc.fontSize(10).text('Amount', amountX, headerY + 5);

                    const formattedAmount = `${hostel.Amount.toFixed(2)}`;
                    const paymentMode = 'Online';
                    const sNo = index + 1;

                    headerY += cellPadding;

                    let dataY = startY + cellPadding + (cellPadding / 2) - (doc.currentLineHeight() / 2);
                    doc.fontSize(10).text(sNo.toString(), sNoX, dataY + 5);
                    doc.fontSize(10).text(paymentMode, paymentModeX, dataY + 5);
                    doc.fontSize(10).text('Null', descriptionX, dataY + 5);
                    doc.fontSize(10).text(formattedAmount, amountX, dataY + 5);

                    dataY += cellPadding;

                    doc.fontSize(10).text('We have received your payment of ' + convertAmountToWords(hostel.Amount.toFixed(0)) + ' Rupees and Zero Paise at ' + moment().format('hh:mm A'), startX, startY + cellPadding * 2 + 20, { align: 'left', wordSpacing: 1.5 }).moveDown(10);

                    doc.fontSize(9).text('This is a system generated receipt and no signature is required.', startX, startY + cellPadding * 2 + 20 + marginTop, { align: 'center', wordSpacing: 1, characterSpacing: 0.5 });
                    doc.end();

                    stream.on('finish', function () {
                        console.log(`PDF generated successfully for ${hostel.UserName}`);
                        const fileContent = fs.readFileSync(filename);
                        pdfDetails.push({
                            filename: filename,
                            fileContent: fs.readFileSync(filename),
                            user: hostel.User_Id
                        });

                        uploadedPDFs++;
                        if (uploadedPDFs === totalPDFs) {
                            deletePDfs(filenames);
                            uploadToS3(filenames, response, pdfDetails, connection);
                        }
                    });













                }



            });
        } else {
            response.status(404).json({ message: 'No data found' });
        }
    });
}


// function InvoicePDf(connection, response) {
//     connection.query(`SELECT invoice.Name as UserName, invoice.Invoices,invoice.DueDate,hostel.hostel_PhoneNo,hostel.Address as HostelAddress,hostel.Name as Hostel_Name,hostel.email_id as HostelEmail_Id ,invoice.Amount FROM invoicedetails invoice INNER JOIN hosteldetails hostel on hostel.id = invoice.Hostel_Id `, function (error, data) {
//         if (error) {
//             console.log(error);
//             response.status(500).json({ message: 'Internal server error' });
//         } else if (data.length > 0) {
//             console.log("Data for Invoie Table", data)
//             const currentDate = new Date();
//             const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
//             const year = currentDate.getFullYear().toString();
//             const timestamp = currentDate.getTime().toString();
//             console.log("timestamp", timestamp)
//             const folderName = 'Invoices';
//             // const folderPath = path.join('D:/SMARTSTAY 05.02.2024/smartstay_backend_latest/Smartstay_Backend', folderName);


//             const filename = `Invoice${month}${year}${timestamp}.pdf`;
//             const doc = new PDFDocument({ font: 'Times-Roman' });
//             const stream = doc.pipe(fs.createWriteStream(filename));
//             let totalUsers = data.length;
//             let usersProcessed = 0;
//             let isFirstPage = true;

//             data.forEach((hostel, index) => {
//                 console.log("hostelData **", hostel);
//                 if (!isFirstPage) {
//                     doc.addPage();
//                 } else {
//                     isFirstPage = false;
//                 }
//                 const hostelNameWidth = doc.widthOfString(hostel.Hostel_Name);
//                 const leftMargin = doc.page.width - hostelNameWidth - 1000;
//                 const textWidth = doc.widthOfString('Invoice Receipt');
//                 const textX = doc.page.width - textWidth - 500;
//                 const invoiceNoWidth = doc.widthOfString('Invoice No');
//                 const invoiceDateWidth = doc.widthOfString('Invoice Date');
//                 const rightMargin = doc.page.width - invoiceNoWidth - 50;
//                 const marginLeft = 30;
//                 const marginRight = doc.page.width / 2;



//                 const logoPath = './Asset/Logo.jpeg';
//                 doc.image(logoPath, {
//                     fit: [180, 150],
//                     align: 'center',
//                     valign: 'top',
//                     margin: 50
//                 });


//                 doc.fontSize(10).font('Times-Roman')
//                     .text(hostel.Hostel_Name.toUpperCase(), leftMargin, doc.y, { align: 'right' })
//                     .moveDown(0.1);
//                 doc.fontSize(10).font('Times-Roman')
//                     .text(hostel.HostelAddress, leftMargin, doc.y, { align: 'right' })
//                     .text(hostel.hostel_PhoneNo, leftMargin, doc.y, { align: 'right' })
//                     .text(`Email : ${hostel.HostelEmail_Id}`, leftMargin, doc.y, { align: 'right' })
//                     .text('Website: example@smartstay.ae', leftMargin, doc.y, { align: 'right' })
//                     .text('GSTIN:', leftMargin, doc.y, { align: 'right' })
//                     .moveDown(0.9);



//                 doc.fontSize(14).font('Helvetica')
//                     .text('Invoice Receipt', textX, doc.y, { align: 'center' })
//                     .moveDown(0.5);

//                 const formattedDueDate = moment(hostel.DueDate).format('DD/MM/YYYY');

//                 doc.fontSize(10).font('Times-Roman')
//                     .text(`Name: ${hostel.UserName}`, { align: 'left', continued: true, indent: marginLeft, })
//                     .text(`Invoice No: ${hostel.Invoices}`, { align: 'right', indent: marginRight })
//                     .moveDown(0.5);

//                 doc.fontSize(10).font('Times-Roman')
//                     .text(`Address: ${hostel.Address}`, { align: 'left', continued: true, indent: marginLeft, })
//                     .text(`Invoice Date: ${formattedDueDate}`, { align: 'right', indent: marginRight });



//                 const tableTop = 280;
//                 const startX = 50;
//                 const startY = tableTop;
//                 const cellPadding = 30;
//                 const tableWidth = 500;
//                 const columnWidth = tableWidth / 4;
//                 const marginTop = 80;

//                 doc.rect(startX, startY, tableWidth, cellPadding).fillColor('#b2b5b8').fill().stroke();
//                 doc.rect(startX, startY, tableWidth, cellPadding * 2).stroke();


//                 doc.moveTo(startX + columnWidth, startY).lineTo(startX + columnWidth, startY + cellPadding * 2).stroke();
//                 doc.moveTo(startX + columnWidth * 2, startY).lineTo(startX + columnWidth * 2, startY + cellPadding * 2).stroke();
//                 doc.moveTo(startX + columnWidth * 3, startY).lineTo(startX + columnWidth * 3, startY + cellPadding * 2).stroke();

//                 doc.moveTo(startX, startY + cellPadding).lineTo(startX + tableWidth, startY + cellPadding).stroke();

//                 doc.fontSize(12).font('Times-Roman').fillColor('#000000');

//                 let headerY = startY + (cellPadding / 2) - (doc.currentLineHeight() / 2);

//                 const sNoX = startX + (columnWidth - doc.widthOfString('S.No')) / 2;
//                 const paymentModeX = startX + columnWidth + (columnWidth - doc.widthOfString('Payment Mode')) / 2;
//                 const descriptionX = startX + columnWidth * 2 + (columnWidth - doc.widthOfString('Description')) / 2;
//                 const amountX = startX + columnWidth * 3 + (columnWidth - doc.widthOfString('Amount')) / 2;

//                 doc.fontSize(10).text('S.No', sNoX, headerY + 5);
//                 doc.fontSize(10).text('Payment Mode', paymentModeX, headerY + 5);
//                 doc.fontSize(10).text('Description', descriptionX, headerY + 5);
//                 doc.fontSize(10).text('Amount', amountX, headerY + 5);

//                 const formattedAmount = `${hostel.Amount.toFixed(2)}`;
//                 const paymentMode = 'Online';
//                 const sNo = index + 1;


//                 headerY += cellPadding;

//                 let dataY = startY + cellPadding + (cellPadding / 2) - (doc.currentLineHeight() / 2);
//                 doc.fontSize(10).text(sNo.toString(), sNoX, dataY + 5);
//                 doc.fontSize(10).text(paymentMode, paymentModeX, dataY + 5);
//                 doc.fontSize(10).text('Null', descriptionX, dataY + 5);
//                 doc.fontSize(10).text(formattedAmount, amountX, dataY + 5);

//                 dataY += cellPadding;


//                 doc.fontSize(10).text('We have received your payment of ' + convertAmountToWords(hostel.Amount.toFixed(0)) + ' Rupees and Zero Paise at ' + moment().format('hh:mm A'), startX, startY + cellPadding * 2 + 20, { align: 'left', wordSpacing: 1.5 }).moveDown(10);

//                 doc.fontSize(9).text('This is a system generated receipt and no signature is required.', startX, startY + cellPadding * 2 + 20 + marginTop, { align: 'center', wordSpacing: 1, characterSpacing: 0.5 });

//                 usersProcessed++;

//                 if (usersProcessed === totalUsers) {
//                     doc.end();
//                     stream.on('finish', function () {
//                         console.log('All PDFs generated successfully');
//                         const fileContent = fs.readFileSync(filename);
//                         const BucketName = 'smartstaydevs';

//                         const params = {
//                             Bucket: BucketName,
//                             Key: 'AKIAW3MEBCZQRO3I7LF3',
//                             Body: fileContent
//                         };
//                         // response.status(200).download(filename);
//                         s3.upload(params, function (err, data) {
//                             if (err) {
//                                 console.error("Error uploading PDF", err);
//                                 response.status(500).json({ message: 'Error uploading PDF to S3' });
//                             } else {
//                                 console.log("PDF uploaded successfully");
//                                 response.status(200).json({ message: 'PDF uploaded s3 bucket successfully', location: data.Location });
//                                 // console.log("filePath", filePath)
//                             }
//                         });

//                     });
//                 }
//             });
//         }
//     });
// }



// function embedImage(doc, imageUrl, fallbackPath, callback) {
//     console.log(`Fetching image from URL: ${imageUrl}`);
//     request.get({ url: imageUrl, encoding: null }, (error, response, body) => {
//         if (error) {
//             console.error(`Error fetching image from ${imageUrl}: ${error.message}`);
//             doc.image(fallbackPath, {
//                 fit: [180, 150],
//                 align: 'center',
//                 valign: 'top',
//                 margin: 50
//             });
//             callback();
//         } else if (response && response.statusCode === 200) {
//             const imageData = Buffer.from(body, 'binary');
//             doc.image(imageData, {
//                 width: 180,
//                 height: 150,
//                 align: 'center',
//                 valign: 'top',
//                 margin: 50
//             });
//             callback();
//         } else {
//             console.error(`Failed to fetch image from ${imageUrl}. Status code: ${response ? response.statusCode : 'Unknown'}`);
//             doc.image(fallbackPath, {
//                 fit: [180, 150],
//                 align: 'center',
//                 valign: 'top',
//                 margin: 50
//             });
//             callback();
//         }
//     });
// }

// function InvoicePDf(connection, response) {
//     connection.query(`SELECT invoice.Name as UserName,invoice.User_Id, invoice.Invoices,invoice.DueDate,hostel.hostel_PhoneNo,hostel.Address as HostelAddress,hostel.Name as Hostel_Name,hostel.email_id as HostelEmail_Id , hostel.profile as Hostel_Logo ,invoice.Amount FROM invoicedetails invoice INNER JOIN hosteldetails hostel on hostel.id = invoice.Hostel_Id `, function (error, data) {
//         if (error) {
//             console.log(error);
//             response.status(500).json({ message: 'Internal server error' });
//         } else if (data.length > 0) {

//             let totalPDFs = data.length;
//             let uploadedPDFs = 0;
//             let filenames = [];
//             let pdfDetails = [];

//             data.forEach((hostel, index) => {
//                 console.log("hostelData **", hostel);

//                 const currentDate = new Date();
//                 const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
//                 const year = currentDate.getFullYear().toString();

//                 const filename = `Invoice${month}${year}${hostel.User_Id}.pdf`;
//                 filenames.push(filename);




//                 const doc = new PDFDocument({ font: 'Times-Roman' });
//                 const stream = doc.pipe(fs.createWriteStream(filename));

//                 let isFirstPage = true;


//                 if (!isFirstPage) {
//                     doc.addPage();
//                 } else {
//                     isFirstPage = false;
//                 }
//                 const hostelNameWidth = doc.widthOfString(hostel.Hostel_Name);
//                 const leftMargin = doc.page.width - hostelNameWidth - 1000;
//                 const textWidth = doc.widthOfString('Invoice Receipt');
//                 const textX = doc.page.width - textWidth - 500;
//                 const invoiceNoWidth = doc.widthOfString('Invoice No');
//                 const invoiceDateWidth = doc.widthOfString('Invoice Date');
//                 const rightMargin = doc.page.width - invoiceNoWidth - 50;
//                 const marginLeft = 30;
//                 const marginRight = doc.page.width / 2;


//                 const logoPath = './Asset/Logo.jpeg';
//                 // doc.image(hostel.Hostel_Logo ? hostel.Hostel_Logo : logoPath, {
//                 //     fit: [180, 150],
//                 //     align: 'center',
//                 //     valign: 'top',
//                 //     margin: 50
//                 // });

//                 if (hostel.Hostel_Logo) {
//                     embedImage(doc, hostel.Hostel_Logo, './Asset/Logo.jpeg', () => {
//                         if (uploadedPDFs === totalPDFs) {
//                             doc.end();
//                         }
//                     });
//                 } else {
//                     doc.image('./Asset/Logo.jpeg', {
//                         fit: [180, 150],
//                         align: 'center',
//                         valign: 'top',
//                         margin: 50
//                     });
//                     if (uploadedPDFs === totalPDFs) {
//                         doc.end();
//                     }
//                 }





//                 doc.fontSize(10).font('Times-Roman')
//                     .text(hostel.Hostel_Name.toUpperCase(), leftMargin, doc.y, { align: 'right' })
//                     .moveDown(0.1);
//                 doc.fontSize(10).font('Times-Roman')
//                     .text(hostel.HostelAddress, leftMargin, doc.y, { align: 'right' })
//                     .text(hostel.hostel_PhoneNo, leftMargin, doc.y, { align: 'right' })
//                     .text(`Email : ${hostel.HostelEmail_Id}`, leftMargin, doc.y, { align: 'right' })
//                     .text('Website: example@smartstay.ae', leftMargin, doc.y, { align: 'right' })
//                     .text('GSTIN:', leftMargin, doc.y, { align: 'right' })
//                     .moveDown(0.9);



//                 doc.fontSize(14).font('Helvetica')
//                     .text('Invoice Receipt', textX, doc.y, { align: 'center' })
//                     .moveDown(0.5);

//                 const formattedDueDate = moment(hostel.DueDate).format('DD/MM/YYYY');

//                 doc.fontSize(10).font('Times-Roman')
//                     .text(`Name: ${hostel.UserName}`, { align: 'left', continued: true, indent: marginLeft, })
//                     .text(`Invoice No: ${hostel.Invoices}`, { align: 'right', indent: marginRight })
//                     .moveDown(0.5);

//                 doc.fontSize(10).font('Times-Roman')
//                     .text(`Address: ${hostel.Address}`, { align: 'left', continued: true, indent: marginLeft, })
//                     .text(`Invoice Date: ${formattedDueDate}`, { align: 'right', indent: marginRight });



//                 const tableTop = 280;
//                 const startX = 50;
//                 const startY = tableTop;
//                 const cellPadding = 30;
//                 const tableWidth = 500;
//                 const columnWidth = tableWidth / 4;
//                 const marginTop = 80;

//                 doc.rect(startX, startY, tableWidth, cellPadding).fillColor('#b2b5b8').fill().stroke();
//                 doc.rect(startX, startY, tableWidth, cellPadding * 2).stroke();


//                 doc.moveTo(startX + columnWidth, startY).lineTo(startX + columnWidth, startY + cellPadding * 2).stroke();
//                 doc.moveTo(startX + columnWidth * 2, startY).lineTo(startX + columnWidth * 2, startY + cellPadding * 2).stroke();
//                 doc.moveTo(startX + columnWidth * 3, startY).lineTo(startX + columnWidth * 3, startY + cellPadding * 2).stroke();

//                 doc.moveTo(startX, startY + cellPadding).lineTo(startX + tableWidth, startY + cellPadding).stroke();

//                 doc.fontSize(12).font('Times-Roman').fillColor('#000000');

//                 let headerY = startY + (cellPadding / 2) - (doc.currentLineHeight() / 2);

//                 const sNoX = startX + (columnWidth - doc.widthOfString('S.No')) / 2;
//                 const paymentModeX = startX + columnWidth + (columnWidth - doc.widthOfString('Payment Mode')) / 2;
//                 const descriptionX = startX + columnWidth * 2 + (columnWidth - doc.widthOfString('Description')) / 2;
//                 const amountX = startX + columnWidth * 3 + (columnWidth - doc.widthOfString('Amount')) / 2;

//                 doc.fontSize(10).text('S.No', sNoX, headerY + 5);
//                 doc.fontSize(10).text('Payment Mode', paymentModeX, headerY + 5);
//                 doc.fontSize(10).text('Description', descriptionX, headerY + 5);
//                 doc.fontSize(10).text('Amount', amountX, headerY + 5);

//                 const formattedAmount = `${hostel.Amount.toFixed(2)}`;
//                 const paymentMode = 'Online';
//                 const sNo = index + 1;


//                 headerY += cellPadding;

//                 let dataY = startY + cellPadding + (cellPadding / 2) - (doc.currentLineHeight() / 2);
//                 doc.fontSize(10).text(sNo.toString(), sNoX, dataY + 5);
//                 doc.fontSize(10).text(paymentMode, paymentModeX, dataY + 5);
//                 doc.fontSize(10).text('Null', descriptionX, dataY + 5);
//                 doc.fontSize(10).text(formattedAmount, amountX, dataY + 5);

//                 dataY += cellPadding;


//                 doc.fontSize(10).text('We have received your payment of ' + convertAmountToWords(hostel.Amount.toFixed(0)) + ' Rupees and Zero Paise at ' + moment().format('hh:mm A'), startX, startY + cellPadding * 2 + 20, { align: 'left', wordSpacing: 1.5 }).moveDown(10);

//                 doc.fontSize(9).text('This is a system generated receipt and no signature is required.', startX, startY + cellPadding * 2 + 20 + marginTop, { align: 'center', wordSpacing: 1, characterSpacing: 0.5 });


//                 doc.end();
//                 stream.on('finish', function () {
//                     console.log(`PDF generated successfully for ${hostel.UserName}`);
//                     const fileContent = fs.readFileSync(filename);
//                     pdfDetails.push({
//                         filename: filename,
//                         fileContent: fs.readFileSync(filename),
//                         user: hostel.User_Id
//                     });

//                     uploadedPDFs++;
//                     if (uploadedPDFs === totalPDFs) {
//                         deletePDfs(filenames)
//                         uploadToS3(filenames, response, pdfDetails, connection);
//                     }


//                 });

//             });
//         }
//         else {
//             response.status(404).json({ message: 'No data found' });
//         }
//     });
// }





function uploadToS3(filenames, response, pdfDetails, connection) {
    let totalPDFs = filenames.length;
    let uploadedPDFs = 0;
    let pdfInfo = [];
    let errorMessage;


    pdfDetails.forEach(pdf => {

        const { filename, fileContent, user } = pdf;
        const key = `Invoice/${filename}`;
        const BucketName = 'smartstaydevs';
        const params = {
            Bucket: BucketName,
            Key: key,
            Body: fileContent,
            ContentType: 'application/pdf'
        };

        s3.upload(params, function (err, uploadData) {
            if (err) {
                console.error("Error uploading PDF", err);
                response.status(500).json({ message: 'Error uploading PDF to S3' });
            } else {
                console.log("PDF uploaded successfully");
                uploadedPDFs++;

                const pdfInfoItem = {
                    user: user,
                    url: uploadData.Location
                };
                pdfInfo.push(pdfInfoItem);

                if (uploadedPDFs === totalPDFs) {
                    // response.status(200).json({message: 'All PDFs uploaded to S3 bucket successfully', pdfInfoList: pdfInfo});

                    pdfInfo.forEach(pdf => {
                        console.log(pdf.url);
                        const query = `UPDATE invoicedetails SET invoicePDF = '${pdf.url}' where User_Id = '${pdf.user}'`
                        connection.query(query, function (error, pdfData) {
                            console.log("pdfData", pdfData)
                            console.log("error pdfData", error)
                            if (error) {
                                errorMessage = error;
                            }

                        })
                    });
                    if (errorMessage) {
                        response.status(201).json({ message: 'Cannot Insert Pdf to Database' })
                    }
                    else {
                        response.status(200).json({ message: 'Insert PDf successfully' })
                    }

                }
            }
        });
    });
}


function deletePDfs(filenames) {
    filenames.forEach(filename => {
        fs.unlink(filename, function (err) {
            if (err) {
                console.error("delete pdf error", err);
            } else {
                console.log("PDF file deleted successfully");
            }
        });
    });
}






function convertAmountToWords(amount) {
    const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
    const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
    const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    let words = '';

    let num = parseInt(amount);

    if (num === 0) {
        return 'Zero';
    }

    if (num >= 1000) {
        words += convertAmountToWords(Math.floor(num / 1000)) + ' Thousand ';
        num %= 1000;
    }

    if (num >= 100) {
        words += convertAmountToWords(Math.floor(num / 100)) + ' Hundred ';
        num %= 100;
    }

    if (num >= 10 && num <= 19) {
        words += teens[num - 10] + ' ';
        num = 0;
    } else if (num >= 20) {
        words += tens[Math.floor(num / 10)] + ' ';
        num %= 10;
    }

    if (num > 0) {
        words += units[num] + ' ';
    }


    return words.trim();
}

function EbAmount(connection, atten, response) {
    if (atten) {
        connection.query(`INSERT INTO EbAmount (hostel_Id, Floor, Room, EbAmount) VALUES (\'${atten.hostel_Id}\',\'${atten.Floor}\', ${atten.Room},\'${atten.EbAmount}\')`, function (error, data) {
            if (error) {
                console.error(error);
                response.status(202).json({ message: 'Database error' });
            } else {
                response.status(200).json({ message: 'Inserted successfully', statusCode: 200 });
            }
        });
    }

};



module.exports = { calculateAndInsertInvoice, getInvoiceList, InvoicePDf, EbAmount };