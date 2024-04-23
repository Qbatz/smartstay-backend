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

//     connection.query(`
//         SELECT hos.id AS Hosteldetails_Id, hos.prefix, hos.suffix, hos.Name, hos.isHostelBased, eb.Hostel_Id AS EbHostel_Id, eb.Floor, eb.Room, eb.EbAmount,eb.createAt FROM hosteldetails AS hos  
//         INNER JOIN EbAmount AS eb ON hos.id = eb.Hostel_Id 
//         WHERE hos.id = ${user.Hostel_Id} 
//         GROUP BY hos.id`, function (err, existingData) {
//         console.log("existingData", existingData)


//         if (err) {
//             console.error("Error fetching hosteldetails:", err);
//             return;
//         }

//         connection.query(`SELECT * FROM Amenities`, function (err, amenitiesData) {
//             if (err) {
//                 console.error("Error fetching amenities data:", err);
//                 return;
//             }

//             // console.log("amenitiesData", amenitiesData);


//             connection.query(`SELECT * FROM hostelrooms WHERE Hostel_Id = ${user.Hostel_Id} AND Floor_Id = ${user.Floor} AND Room_Id = ${user.Rooms}`, function (err, roomData) {
//                 if (err) {
//                     console.error("Error fetching room data:", err);
//                     return;
//                 }


//                 let roomPrice;
//                 const currentDate = moment().format('YYYY-MM-DD');
//                 const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
//                 let dueDate, invoiceDate;
//                 let invoiceNo = '';

//                 const currentMonth = moment(currentDate).month() + 1;
//                 const currentYear = moment(currentDate).year();
//                 const createdAtMonth = moment(joinDate).month() + 1;
//                 const createdAtYear = moment(joinDate).year();


//                 roomPrice = roomData[0]?.Price;
//                 console.log("roomPrice", roomPrice)



//                 let filteredRoomsLength = [];

//                 filteredRoomsLength = roomData.filter(item => item.Hostel_Id == user.Hostel_Id && item.Floor_Id == user.Floor);



//                 if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
//                     dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
//                     invoiceDate = moment(joinDate).format('YYYY-MM-DD');
//                 } else {
//                     dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
//                     invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
//                 }

//                 const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
//                 const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
//                 console.log("formattedJoinDate",formattedJoinDate)
                
//                 let AdvanceAmount = 0;
//                 let HostelBasedEb = 0;
//                 let roomBasedEb = 0;
//                 let creatAtMonth
//                 // const createAtFormate = existingData[0].createAt
//                 // console.log("createAtFormate",createAtFormate)
               
//                 // const formateCreateAt =moment(createAtFormate).format('YYYY-MM-DD');
//                 // console.log("formateCreateAt",formateCreateAt)
//                 // if (existingData && existingData.length > 0) {
//                 //     for (let i = 0; i < existingData.length; i++) {
//                 //         const createAtFormate = moment(existingData[i].createAt).format('YYYY-MM-DD');
//                 //         console.log("createAtFormate for index", i, ":", createAtFormate);

                        
                       
//                 //     }
//                 // } else {
//                 //     console.log("No existing data found.");
                    
//                 // }
//                 if (existingData && existingData.length > 0) {
//                     for (let i = 0; i < existingData.length; i++) {
//                         const createAtFormate = moment(existingData[i].createAt).format('YYYY-MM-DD');
//                         console.log("createAtFormate for index", i, ":", createAtFormate);
                
//                         // If the formattedJoinDate month matches the createAtFormate month, add HostelBasedEb and roomBasedEb to AdvanceAmount
//                         if (moment(formattedJoinDate).month() === moment(createAtFormate).month()) {
//                             AdvanceAmount += HostelBasedEb + roomBasedEb;
//                         }
//                     }
//                 } else {
//                     console.log("No existing data found.");
//                 }
                



//                 const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

                

//                 let totalAmenitiesAmount = 0;

//                 for (let i = 0; i < amenitiesData.length; i++) {
//                     if (amenitiesData[i].Hostel_Id === user.Hostel_Id && amenitiesData[i].setAsDefault === 0 && amenitiesData[i].Status === 1) {
//                         totalAmenitiesAmount += amenitiesData[i].Amount;
//                     }

//                 }

//                 console.log("Total Amenities Amount:", totalAmenitiesAmount);



//                 if (existingData.length > 0) {
//                     let filteredArray = existingData.filter(item => item.Hostel_Id == user.Hostel_Id);

                  
//                     connection.query(`SELECT * from hostel WHERE Hostel_Id = ${user.Hostel_Id}`, function (error, result) {
                     

//                         if (result.length > 0) {
//                             if (existingData[0].isHostelBased === 1) {
//                                 HostelBasedEb = existingData[0].EbAmount / result.length;

//                                 console.log("HostelBasedEb", HostelBasedEb);

//                             } else {
//                                 console.log("No users found for the given hostel ID");
//                             }
//                         } else {
//                             console.log("No users found for the given hostel ID");
//                         }

//                         connection.query(`
//                             SELECT * 
//                             FROM hostel 
//                             WHERE Hostel_Id = ${user.Hostel_Id} 
//                             AND Floor = ${user.Floor} 
//                             AND Rooms = ${user.Rooms}`, function (error, resultData) {

//                             if (resultData.length > 0) {
//                                 let tempArray = existingData.filter(item => {
//                                     return item.EbHostel_Id === resultData[0].Hostel_Id && item.Floor === resultData[0].Floor && item.Room === resultData[0].Rooms
//                                 });
//                                 // console.log("tempArray", tempArray);
//                                 if (tempArray.length > 0 && tempArray[0].isHostelBased === 0) {
//                                     roomBasedEb = tempArray[0].EbAmount / resultData.length;

//                                     console.log("roomBasedEb", roomBasedEb);

//                                 }
//                             } else {
//                                 console.log("No users found for the given hostel ID");
//                             }


//                             const userID = user.User_Id.toString().slice(0, 4);
//                             if (existingData[0].prefix != '' && existingData[0].suffix != '' && existingData[0].prefix != 'undefined' && existingData[0].suffix != 'undefined' && existingData[0].prefix != '' && existingData[0].suffix != '') {
//                                 invoiceNo = existingData[0].prefix + existingData[0].suffix + user.Name + currentMonth + currentYear;
//                             } else {
//                                 invoiceNo = 'INVC' + currentMonth + currentYear + userID;
//                             }


//                             if (amenitiesData[0].setAsDefault == 0 && amenitiesData[0].Status == 1 ) {
//                                 AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + totalAmenitiesAmount + HostelBasedEb + roomBasedEb;


//                                 if (!isNaN(AdvanceAmount)) {
//                                     const query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id,RoomRent,EbAmount,AmnitiesAmount,Hostel_Based,Room_Based) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${AdvanceAmount},'${user.Address}', '${formattedJoinDate}', '${formattedDueDate}', '${invoiceNo}', '${user.Status}', '${user.User_Id}',${roomPrice},${existingData[0].EbAmount},${totalAmenitiesAmount},${HostelBasedEb},${roomBasedEb})`;

//                                     connection.query(query, function (error, data) {
//                                         if (error) {
//                                             console.error("Error inserting invoice data for user:", user.User_Id, error);
//                                             return;
//                                         }
//                                     });
//                                 }
//                             } else {
//                                 AdvanceAmount = (roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays + HostelBasedEb + roomBasedEb;


//                                 if (!isNaN(AdvanceAmount) && isFinite(AdvanceAmount)) {
//                                     const query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id,RoomRent,EbAmount,AmnitiesAmount,Hostel_Based,Room_Based) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${AdvanceAmount},'${user.Address}', '${formattedJoinDate}', '${formattedDueDate}', '${invoiceNo}', '${user.Status}', '${user.User_Id}',${roomPrice},${existingData[0].EbAmount},${totalAmenitiesAmount},${HostelBasedEb},${roomBasedEb})`;

//                                     connection.query(query, function (error, data) {
//                                         if (error) {
//                                             console.error("Error inserting invoice data for user:", user.User_Id, error);
//                                             return;
//                                         }
//                                     });
//                                 }
//                             }
//                         });
//                     });
//                 }
//             });
//         });
//     });
// }
function calculateAndInsertInvoice(connection, user) {
    connection.query(`
        SELECT hos.id AS Hosteldetails_Id, hos.prefix, hos.suffix, hos.Name, hos.isHostelBased, eb.Hostel_Id AS EbHostel_Id, eb.Floor, eb.Room, eb.EbAmount, eb.createAt 
        FROM hosteldetails AS hos  
        INNER JOIN EbAmount AS eb ON hos.id = eb.Hostel_Id 
        WHERE hos.id = ${user.Hostel_Id} 
        GROUP BY hos.id`, function (err, existingData) {
        console.log("existingData", existingData);

        if (err) {
            console.error("Error fetching hosteldetails:", err);
            return;
        }

        connection.query(`SELECT * FROM Amenities`, function (err, amenitiesData) {
            if (err) {
                console.error("Error fetching amenities data:", err);
                return;
            }

            connection.query(`SELECT * FROM hostelrooms WHERE Hostel_Id = ${user.Hostel_Id} AND Floor_Id = ${user.Floor} AND Room_Id = ${user.Rooms}`, function (err, roomData) {
                if (err) {
                    console.error("Error fetching room data:", err);
                    return;
                }

                let roomPrice;
                const currentDate = moment().format('YYYY-MM-DD');
                const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
                let dueDate, invoiceDate;
                let invoiceNo = '';

                const currentMonth = moment(currentDate).month() + 1;
                const currentYear = moment(currentDate).year();
                const createdAtMonth = moment(joinDate).month() + 1;
                const createdAtYear = moment(joinDate).year();

                roomPrice = roomData[0]?.Price;
                console.log("roomPrice", roomPrice);

                let filteredRoomsLength = [];
                filteredRoomsLength = roomData.filter(item => item.Hostel_Id == user.Hostel_Id && item.Floor_Id == user.Floor);

                if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
                    dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
                    invoiceDate = moment(joinDate).format('YYYY-MM-DD');
                } else {
                    dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
                    invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
                }

                const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
                const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
                console.log("formattedJoinDate",formattedJoinDate);
                
                let AdvanceAmount = 0;
                let HostelBasedEb = 0;
                let roomBasedEb = 0;
                let createAtFormate ;

                if (existingData && existingData.length > 0) {
                    for (let i = 0; i < existingData.length; i++) {
                         createAtFormate = moment(existingData[i].createAt).format('YYYY-MM-DD');
                        console.log("createAtFormate for index", i, ":", createAtFormate);
                
                       
                        if (moment(formattedJoinDate).month() === moment(createAtFormate).month()+1) {
                            console.log("joinMonth",moment(formattedJoinDate).month())
                            console.log("createmonth",moment(createAtFormate).month()+1)
                          
                            if (existingData[i].isHostelBased === 1) {
                                
                                AdvanceAmount += existingData[i].EbAmount;
                            }
                        }
                    }
                } else {
                    console.log("No existing data found.");
                }
                

         
                const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;
                
                let totalAmenitiesAmount = 0;
                for (let i = 0; i < amenitiesData.length; i++) {
                    if (amenitiesData[i].Hostel_Id === user.Hostel_Id && amenitiesData[i].setAsDefault === 0 && amenitiesData[i].Status === 1) {
                        totalAmenitiesAmount += amenitiesData[i].Amount;
                    }
                }
                console.log("Total Amenities Amount:", totalAmenitiesAmount);

                if (existingData.length > 0) {
                    let filteredArray = existingData.filter(item => item.Hostel_Id == user.Hostel_Id);
                    connection.query(`SELECT * from hostel WHERE Hostel_Id = ${user.Hostel_Id}`, function (error, result) {
                        if (result.length > 0) {
                            if (existingData[0].isHostelBased === 1) {
                                HostelBasedEb = existingData[0].EbAmount / result.length;
                                console.log("HostelBasedEb", HostelBasedEb);
                            } else {
                                console.log("No users found for the given hostel ID");
                            }
                        } else {
                            console.log("No users found for the given hostel ID");
                        }

                        connection.query(`
                            SELECT * 
                            FROM hostel 
                            WHERE Hostel_Id = ${user.Hostel_Id} 
                            AND Floor = ${user.Floor} 
                            AND Rooms = ${user.Rooms}`, function (error, resultData) {

                            if (resultData.length > 0) {
                                let tempArray = existingData.filter(item => {
                                    return item.EbHostel_Id === resultData[0].Hostel_Id && item.Floor === resultData[0].Floor && item.Room === resultData[0].Rooms
                                });
                                if (tempArray.length > 0 && tempArray[0].isHostelBased === 0) {
                                    roomBasedEb = tempArray[0].EbAmount / resultData.length;
                                    console.log("roomBasedEb", roomBasedEb);
                                }
                            } else {
                                console.log("No users found for the given hostel ID");
                            }

                            const userID = user.User_Id.toString().slice(0, 4);
                            if (existingData[0].prefix != '' && existingData[0].suffix != '' && existingData[0].prefix != 'undefined' && existingData[0].suffix != 'undefined' && existingData[0].prefix != null && existingData[0].suffix != null) {
                                invoiceNo = existingData[0].prefix + existingData[0].suffix + user.Name + currentMonth + currentYear;
                            } else {
                                invoiceNo = 'INVC' + currentMonth + currentYear + userID;
                            }

                            if (amenitiesData[0].setAsDefault == 0 && amenitiesData[0].Status == 1  ) {
                                AdvanceAmount = ((roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays) + totalAmenitiesAmount + HostelBasedEb + roomBasedEb;
                                if (!isNaN(AdvanceAmount)) {
                                    const query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id,RoomRent,EbAmount,AmnitiesAmount,Hostel_Based,Room_Based) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${AdvanceAmount},'${user.Address}', '${formattedJoinDate}', '${formattedDueDate}', '${invoiceNo}', '${user.Status}', '${user.User_Id}',${roomPrice},${existingData[0].EbAmount},${totalAmenitiesAmount},${HostelBasedEb},${roomBasedEb})`;
                                    connection.query(query, function (error, data) {
                                        if (error) {
                                            console.error("Error inserting invoice data for user:", user.User_Id, error);
                                            return;
                                        }
                                    });
                                }
                            } else {
                                AdvanceAmount = (roomPrice / moment(formattedDueDate).daysInMonth()) * numberOfDays + HostelBasedEb + roomBasedEb;
                                if (!isNaN(AdvanceAmount) && isFinite(AdvanceAmount)) {
                                    const query = `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id,RoomRent,EbAmount,AmnitiesAmount,Hostel_Based,Room_Based) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${AdvanceAmount},'${user.Address}', '${formattedJoinDate}', '${formattedDueDate}', '${invoiceNo}', '${user.Status}', '${user.User_Id}',${roomPrice},${existingData[0].EbAmount},${totalAmenitiesAmount},${HostelBasedEb},${roomBasedEb})`;
                                    connection.query(query, function (error, data) {
                                        if (error) {
                                            console.error("Error inserting invoice data for user:", user.User_Id, error);
                                            return;
                                        }
                                    });
                                }
                            }
                        });
                    });
                }
            });
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
function InvoicePDf(connection, reqBodyData, response) {
    console.log("reqBodyData", reqBodyData)
    connection.query(`SELECT hostel.isHostelBased, invoice.Floor_Id, invoice.Room_No ,invoice.Hostel_Id as Inv_Hostel_Id ,hostel.id as Hostel_Id,invoice.RoomRent,invoice.EbAmount, invoice.id, invoice.Name as UserName,invoice.User_Id,invoice.UserAddress, invoice.Invoices,invoice.DueDate, invoice.Date, hostel.hostel_PhoneNo,hostel.Address as HostelAddress,hostel.Name as Hostel_Name,hostel.email_id as HostelEmail_Id , hostel.profile as Hostel_Logo ,invoice.Amount FROM invoicedetails invoice INNER JOIN hosteldetails hostel on hostel.id = invoice.Hostel_Id WHERE invoice.User_Id = ? AND DATE(invoice.Date) = ?`,
        [reqBodyData.User_Id, reqBodyData.Date], function (error, data) {
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
                    let breakUpTable = []


                    const JoiningDate = hostel.Date

                    const DueDate = hostel.DueDate


                    const numberOfDays = moment(DueDate).diff(moment(JoiningDate), 'days') + 1;

                    console.log("numberOfDays", numberOfDays)


                    const JoiningWiseRoomRent = (hostel.RoomRent / moment(DueDate).daysInMonth()) * numberOfDays

                    let RoomRent = {
                        Rent: Math.round(JoiningWiseRoomRent),

                    }

                    console.log("RoomRent", RoomRent)


                    breakUpTable.push(RoomRent)




                    connection.query(`select * from Amenities where Hostel_Id = \'${hostel.Hostel_Id} \'`, function (error, Amenitiesdata) {
                        console.log("Amenitiesdata", Amenitiesdata)

                        if (Amenitiesdata.length > 0) {
                            for (let i = 0; i < Amenitiesdata.length; i++) {
                                const tempObj = {};
                                if (Amenitiesdata[i].setAsDefault == 0 && Amenitiesdata[i].Status == 1) {
                                    tempObj[Amenitiesdata[i].AmenitiesName] = Amenitiesdata[i].Amount
                                } else if (Amenitiesdata[i].setAsDefault == 1 && Amenitiesdata[i].Status == 1) {
                                    tempObj[Amenitiesdata[i].AmenitiesName] = Amenitiesdata[i].Amount;
                                    RoomRent.Rent -= Amenitiesdata[i].Amount;
                                }
                                breakUpTable.push(tempObj);
                            }
                        }
                        else {
                            // breakUpTable.push(RoomRent);
                        }



                        connection.query(`SELECT * from hostel WHERE Hostel_Id = ${hostel.Hostel_Id}`, function (error, resultDataForIsHostelbased) {
                            console.log("resultDataForIsHostelbased", resultDataForIsHostelbased.length)



                            if (hostel.isHostelBased == 1) {
                                const Is_EbAmount_Hostel_Based = hostel.EbAmount / resultDataForIsHostelbased.length
                                const rounded_Is_EbAmount_Hostel_Based = Math.round(Is_EbAmount_Hostel_Based)
                                breakUpTable.push({ EbAmount: rounded_Is_EbAmount_Hostel_Based })
                            } else {
                                console.log("No Data found in hostel_id")
                            }


                            connection.query(`SELECT * FROM hostel WHERE Hostel_Id = ${hostel.Hostel_Id} 
                            AND Floor = ${hostel.Floor_Id} 
                            AND Rooms = ${hostel.Room_No}`, function (error, resultDataForRoomBased) {

                                console.log("resultDataForRoomBased", resultDataForRoomBased.length)



                                if (hostel.isHostelBased == 0) {
                                    const Is_EbAmount_Room_based = hostel.EbAmount / resultDataForRoomBased.length
                                    const rounded_Is_EbAmount_Room_based = Math.round(Is_EbAmount_Room_based)

                                    breakUpTable.push({ EbAmount: rounded_Is_EbAmount_Room_based })
                                } else {
                                    console.log("No Data found in hostel_id")
                                }


                                breakUpTable = breakUpTable.filter(obj => Object.keys(obj).length !== 0);
                                console.log(" breakUpTable", breakUpTable)
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





                                            const headers = ['SNo', 'Description', 'Amount'];
                                            const tableTop = 250;
                                            const startX = 50;
                                            const startY = tableTop;
                                            const cellPadding = 30;
                                            const tableWidth = 500;
                                            const columnWidth = tableWidth / headers.length;
                                            const marginTop = 80;
                                            const borderWidth = 1;

                                            const marginTopForAmount = 80;


                                            doc.rect(startX, startY, tableWidth, cellPadding)
                                                .fillColor('#b2b5b8')
                                                .fill()
                                                .stroke();


                                            let headerY = startY + (cellPadding / 2) - (doc.currentLineHeight() / 2);
                                            headers.forEach((header, index) => {
                                                const headerX = startX + columnWidth * index + (columnWidth - doc.widthOfString(header)) / 2;
                                                doc.fontSize(10)
                                                    .fillColor('#000000')
                                                    .text(header, headerX, headerY + 5);
                                            });


                                            doc.rect(startX, startY, tableWidth, (breakUpTable.length + 1) * cellPadding)
                                                .stroke();


                                            for (let rowIndex = 0; rowIndex < breakUpTable.length + 1; rowIndex++) {
                                                for (let colIndex = 0; colIndex < headers.length; colIndex++) {
                                                    const cellX = startX + columnWidth * colIndex;
                                                    const cellY = startY + cellPadding * rowIndex;

                                                    doc.rect(cellX, cellY, columnWidth, cellPadding)
                                                        .stroke();
                                                }
                                            }


                                            let serialNumber = 1;
                                            let dataY = startY + cellPadding + (cellPadding / 2) - (doc.currentLineHeight() / 2);
                                            breakUpTable.forEach((row, rowIndex) => {
                                                let isEmptyRow = true;

                                                const serialX = startX + (columnWidth - doc.widthOfString(serialNumber.toString())) / 2;
                                                doc.fontSize(10)
                                                    .fillColor('#000000')
                                                    .text(serialNumber.toString(), serialX, dataY + 5);

                                                serialNumber++;

                                                Object.entries(row).forEach(([description, price], colIndex) => {
                                                    if (price !== undefined) {
                                                        isEmptyRow = false;
                                                        const cellX = startX + columnWidth * (colIndex + 1) + (columnWidth - doc.widthOfString(description)) / 2;
                                                        doc.fontSize(10)
                                                            .text(description, cellX, dataY + 5);
                                                        const priceX = startX + columnWidth * (colIndex + 2) + (columnWidth - doc.widthOfString(price.toString())) / 2;
                                                        doc.fontSize(10)
                                                            .text(price.toString(), priceX, dataY + 5);
                                                    }
                                                });
                                                if (!isEmptyRow) {
                                                    dataY += cellPadding;
                                                }
                                            });

                                            dataY += cellPadding;


                                            const gapWidth = 120;
                                            doc.fontSize(10).font('Times-Roman')
                                                .text('Total Amount', textX, doc.y + 20, { align: 'center', continued: true })
                                                .text(' '.repeat(gapWidth), { continued: true })
                                                .text(hostel.Amount.toFixed(2));


                                            doc.fontSize(10)
                                                .text('We have received your payment of ' + convertAmountToWords(hostel.Amount.toFixed(0)) + ' Rupees and Zero Paise at ' + moment().format('hh:mm A'), startX, dataY + 20, { align: 'left', wordSpacing: 1.5 });

                                            dataY += 20;

                                            doc.fontSize(9)
                                                .text('This is a system generated receipt and no signature is required.', startX, dataY + marginTop, { align: 'center', wordSpacing: 1, characterSpacing: 0.5 });

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


                                    const headers = ['SNo', 'Description', 'Amount'];
                                    const tableTop = 250;
                                    const startX = 50;
                                    const startY = tableTop;
                                    const cellPadding = 30;
                                    const tableWidth = 500;
                                    const columnWidth = tableWidth / headers.length;
                                    const marginTop = 80;
                                    const borderWidth = 1;

                                    const marginTopForAmount = 80;


                                    doc.rect(startX, startY, tableWidth, cellPadding)
                                        .fillColor('#b2b5b8')
                                        .fill()
                                        .stroke();


                                    let headerY = startY + (cellPadding / 2) - (doc.currentLineHeight() / 2);
                                    headers.forEach((header, index) => {
                                        const headerX = startX + columnWidth * index + (columnWidth - doc.widthOfString(header)) / 2;
                                        doc.fontSize(10)
                                            .fillColor('#000000')
                                            .text(header, headerX, headerY + 5);
                                    });


                                    doc.rect(startX, startY, tableWidth, (breakUpTable.length + 1) * cellPadding)
                                        .stroke();


                                    for (let rowIndex = 0; rowIndex < breakUpTable.length + 1; rowIndex++) {
                                        for (let colIndex = 0; colIndex < headers.length; colIndex++) {
                                            const cellX = startX + columnWidth * colIndex;
                                            const cellY = startY + cellPadding * rowIndex;

                                            doc.rect(cellX, cellY, columnWidth, cellPadding)
                                                .stroke();
                                        }
                                    }


                                    let serialNumber = 1;
                                    let dataY = startY + cellPadding + (cellPadding / 2) - (doc.currentLineHeight() / 2);
                                    breakUpTable.forEach((row, rowIndex) => {
                                        let isEmptyRow = true;

                                        const serialX = startX + (columnWidth - doc.widthOfString(serialNumber.toString())) / 2;
                                        doc.fontSize(10)
                                            .fillColor('#000000')
                                            .text(serialNumber.toString(), serialX, dataY + 5);

                                        serialNumber++;

                                        Object.entries(row).forEach(([description, price], colIndex) => {
                                            if (price !== undefined) {
                                                isEmptyRow = false;
                                                const cellX = startX + columnWidth * (colIndex + 1) + (columnWidth - doc.widthOfString(description)) / 2;
                                                doc.fontSize(10)
                                                    .text(description, cellX, dataY + 5);
                                                const priceX = startX + columnWidth * (colIndex + 2) + (columnWidth - doc.widthOfString(price.toString())) / 2;
                                                doc.fontSize(10)
                                                    .text(price.toString(), priceX, dataY + 5);
                                            }
                                        });
                                        if (!isEmptyRow) {
                                            dataY += cellPadding;
                                        }
                                    });

                                    dataY += cellPadding;


                                    const gapWidth = 120;
                                    doc.fontSize(10).font('Times-Roman')
                                        .text('Total Amount', textX, doc.y + 20, { align: 'center', continued: true })
                                        .text(' '.repeat(gapWidth), { continued: true })
                                        .text(hostel.Amount.toFixed(2));



                                    doc.fontSize(10)
                                        .text('We have received your payment of ' + convertAmountToWords(hostel.Amount.toFixed(0)) + ' Rupees and Zero Paise at ' + moment().format('hh:mm A'), startX, dataY + 20, { align: 'left', wordSpacing: 1.5 });

                                    dataY += 20;

                                    doc.fontSize(9)
                                        .text('This is a system generated receipt and no signature is required.', startX, dataY + marginTop, { align: 'center', wordSpacing: 1, characterSpacing: 0.5 });

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

                            })

                        });
                    })


                })

            } else {
                response.status(404).json({ message: 'No data found' });
            }
        });
}


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
    console.log("atten", atten);
    if (!atten) {
        response.status(400).json({ message: 'Missing parameter' });
        return;
    }
    connection.query(`SELECT isHostelBased FROM hosteldetails`, function (err, datum) {
        console.log("datum..?", datum)
        if (err) {
            console.error(err);
            response.status(203).json({ message: 'Database error' });
            return;
        }
        if (datum.length > 0) {
            if (atten.id) {
                const isHostelBasedUpdated = datum[0].isHostelBased;
                const updateQuery = isHostelBasedUpdated ?
                    `UPDATE EbAmount SET EbAmount=${atten.EbAmount} WHERE Hostel_Id= ${atten.Hostel_Id}` :
                    `UPDATE EbAmount SET EbAmount=${atten.EbAmount}  where Hostel_Id = ${atten.Hostel_Id}, Floor= ${atten.Floor},Room= ${atten.Room}`;
                connection.query(updateQuery, function (error, data) {
                    if (error) {
                        console.error(error);
                        response.status(201).json({ message: 'Update failed' });
                    } else {
                        response.status(200).json({ message: 'Update successful' });
                    }
                });
            }

            else {
                connection.query(`SELECT * FROM EbAmount WHERE hostel_Id = ${atten.Hostel_Id} AND Floor = '${atten.Floor}' AND Room = '${atten.Room}' ORDER BY id DESC LIMIT 1`, function (err, temdata) {
                    if (err) {
                        console.error(err);
                        response.status(500).json({ message: 'Database error' });
                        return;
                    }

                    let startMeterReading;

                    const previousEndMeterReading = temdata.length > 0 ? temdata[0].end_Meter_Reading : 0;
                    const isHostelBased = datum[0].isHostelBased;

                    if (isHostelBased) {
                        startMeterReading = previousEndMeterReading;
                    } else {
                        let sameRoomFound = temdata.length > 0;
                        if (!sameRoomFound) {
                            startMeterReading = 0;
                        } else {
                            startMeterReading = previousEndMeterReading;
                        }
                    }
                    const difference = atten.end_Meter_Reading - startMeterReading;

                    const insertQuery = isHostelBased ?
                        `INSERT INTO EbAmount (hostel_Id, start_Meter_Reading, end_Meter_Reading, EbAmount,Eb_Unit) VALUES (${atten.Hostel_Id}, ${startMeterReading}, ${atten.end_Meter_Reading}, ${atten.EbAmount},${difference})` :
                        `INSERT INTO EbAmount (hostel_Id, Floor, Room, start_Meter_Reading, end_Meter_Reading, EbAmount,Eb_Unit) VALUES ('${atten.Hostel_Id}', '${atten.Floor}', '${atten.Room}', ${startMeterReading}, '${atten.end_Meter_Reading}', '${atten.EbAmount}',${difference})`;

                    connection.query(insertQuery, function (error, data) {
                        if (error) {
                            console.error(error);
                            response.status(500).json({ message: 'Insertion failed', error: error });
                            return;
                        }
                        console.log("Inserted successfully");
                        response.status(200).json({ message: 'Inserted successfully' });
                    });
                });
            }
        }
    });

};


function getEBList(connection, request, response) {
    connection.query('select inv.Name ,inv.Hostel_Id,inv.Room_No,inv.Hostel_Based,inv.Room_Based, eb.Eb_Unit ,eb.Hostel_Id  FROM invoicedetails AS inv INNER JOIN EbAmount AS eb ON inv.Hostel_Id = eb.Hostel_Id  ', function (error, data) {

        if (error) {
            console.error(error);
            response.status(201).json({ message: 'Internal Server Error' });
        } else {
            if (data.length > 0) {

                response.status(200).json(data);
            } else {
                response.status(203).json({ message: 'No data found' });
            }
        }
    });
}

function getEbStart(connection, response) {
    connection.query('select * from EbAmount', function (error, data) {
        console.log(error);
        console.log(data);

        if (error) {
            response.status(203).json({ message: 'not connected' })
        }
        else {
            response.status(200).json(data)
        }
    })
}





module.exports = { calculateAndInsertInvoice, getInvoiceList, InvoicePDf, EbAmount, getEBList, getEbStart };