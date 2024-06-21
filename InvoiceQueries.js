const moment = require('moment');
const AWS = require('aws-sdk');
require('dotenv').config();
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { Console, log } = require('console');
var connection = require('./config/connection');
const converter = require('number-to-words');
const phantomjs = require('phantomjs-prebuilt');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
const request = require('request');
const sharp = require('sharp');
const util = require('util');

const pdf = require('html-pdf');


AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();

const https = require('https');
const conn = require('./config/connection');


async function calculateAndInsertInvoice(connection, user, users) {
    const query = util.promisify(connection.query).bind(connection);

    try {
        const existingData = await query(`
            SELECT 
                rms.Price,
                rms.Hostel_Id AS roomHostel_Id,
                rms.Floor_Id AS roomFloor_Id,
                rms.Room_Id AS roomRoom_Id,    
                dtls.id AS detHostel_Id,
                dtls.isHostelBased,
                dtls.prefix,
                dtls.suffix,
                dtls.Name,
                hstl.Name AS UserName,
                hstl.Hostel_Id AS hosHostel_Id,
                hstl.Rooms AS hosRoom,
                hstl.Floor AS hosFloor,
                hstl.ID as hosUser_Id,
                hstl.Bed,
                hstl.RoomRent,
                hstl.CheckoutDate,

                CASE 
                    WHEN dtls.isHostelBased = true THEN 
                        (
                            SELECT eb.EbAmount 
                            FROM EbAmount eb
                            WHERE eb.hostel_Id = hstl.Hostel_Id  
                            ORDER BY eb.id DESC 
                            LIMIT 1
                        )
                    ELSE 
                        (
                            SELECT eb.EbAmount 
                            FROM EbAmount eb
                            WHERE eb.hostel_Id = hstl.Hostel_Id 
                            AND eb.Floor = hstl.Floor 
                            AND eb.Room = hstl.Rooms 
                            ORDER BY eb.id DESC 
                            LIMIT 1
                        )
                END AS ebBill,
                (
                    SELECT eb.Floor 
                    FROM EbAmount eb
                    WHERE eb.hostel_Id = hstl.Hostel_Id   
                    ORDER BY eb.id DESC 
                    LIMIT 1
                ) AS ebFloor,
                (
                    SELECT eb.hostel_Id 
                    FROM EbAmount eb
                    WHERE eb.hostel_Id = hstl.Hostel_Id 
                    ORDER BY eb.id DESC 
                    LIMIT 1
                ) AS ebhostel_Id,
                (
                    SELECT eb.Room 
                    FROM EbAmount eb
                    WHERE eb.hostel_Id = hstl.Hostel_Id 
                    ORDER BY eb.id DESC 
                    LIMIT 1
                ) AS ebRoom,
                (
                    SELECT eb.createAt 
                    FROM EbAmount eb
                    WHERE eb.hostel_Id = hstl.Hostel_Id 
                    AND eb.Floor = hstl.Floor 
                    AND eb.Room = hstl.Rooms 
                    ORDER BY eb.id DESC 
                    LIMIT 1
                ) AS createdAt,
                (
                    SELECT invd.Invoices 
                    FROM invoicedetails invd
                    WHERE invd.Invoices LIKE CONCAT(dtls.prefix, '%')
                    ORDER BY CAST(SUBSTRING(invd.Invoices, LENGTH(dtls.prefix) + 1) AS UNSIGNED) DESC 
                    LIMIT 1
                ) AS InvoiceDetails
            FROM 
                hostel hstl 
            INNER JOIN 
                hosteldetails dtls ON dtls.id = hstl.Hostel_Id 
            INNER JOIN 
                hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id 
                AND rms.Floor_Id = hstl.Floor 
                AND rms.Room_Id = hstl.Rooms 
            WHERE 
                hstl.isActive = 1 AND hstl.id = ?
        `, [user.ID]);
        console.log("existingData", existingData);

        if (existingData.length != 0) {
            let roomPrice = existingData[0].RoomRent;
            let totalAmenitiesAmount = 0;
            let dedctAmenitiesAmount = 0;
            const currentDate = moment().format('YYYY-MM-DD');
            const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
            const currentMonth = moment(currentDate).month() + 1;
            const currentYear = moment(currentDate).year();
            const createdAtMonth = moment(joinDate).month() + 1;
            const createdAtYear = moment(joinDate).year();
            let dueDate, invoiceDate;
            let invoiceDatebe, duedateeb



            if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
                dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
                invoiceDate = moment(joinDate).format('YYYY-MM-DD');
            } else {
                dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
                invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
            }


            const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
            console.log("formattedJoinDate", formattedJoinDate)
            const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
            console.log("formattedDueDate", formattedDueDate)
            const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;
            // console.log("numberOfDays", numberOfDays)

            let HostelBasedEb = 0;
            let roomBasedEb = 0;
            let roombase = 0;
            let totalDays = 0;

            let eb_amount_total;

            let eb_Hostel = 0
            let AdvanceAmount = 0;
            const previousMonthDate = moment().subtract(1, 'months');
            const previousMonth = previousMonthDate.month() + 1; // month() is zero-based
            const previousYear = previousMonthDate.year();


            if (existingData[0].isHostelBased == 1) {

                // Get the previous month's date
                const previousMonthDate = moment().subtract(1, 'months');
                const previousMonth = previousMonthDate.month() + 1; // month() is zero-based
                const previousYear = previousMonthDate.year();

                console.log("Previous Month:", previousMonth, "Previous Year:", previousYear);

                // Filter users based on the Hostel_Id and createdAt month/year being the previous month/year
                let filteredArray = users.filter(item => {
                    const createdAtDate = moment(item.createdAt);
                    const createdAtMonth = createdAtDate.month() + 1; // month() is zero-based
                    const createdAtYear = createdAtDate.year();
                    return item.Hostel_Id == existingData[0].roomHostel_Id && createdAtMonth === previousMonth && createdAtYear === previousYear;
                });

                console.log("filteredArray.length", filteredArray);

                if (filteredArray.length > 0) {
                    let totalNumberOfDays = 0;


                    // Map through filtered users to calculate the number of days and amounts
                    let userDayAmounts = filteredArray.map(user => {
                        const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
                        console.log("joinDate", joinDate)
                        const dueDateeb = previousMonthDate.endOf('month').format('YYYY-MM-DD');

                        // const invoiceDate = previousMonthDate.startOf('month').format('YYYY-MM-DD');

                        invoiceDatebe = moment(joinDate).format('YYYY-MM-DD');
                        const formattedJoinDateeb = moment(invoiceDatebe).format('YYYY-MM-DD');

                        const formattedDueDateeb = moment(dueDateeb).format('YYYY-MM-DD');
                        console.log("formattedDueDate", formattedDueDate)
                        const numberOfDays = moment(formattedDueDateeb).diff(moment(formattedJoinDateeb), 'days') + 1;
                        console.log("numberOfDays,,,", numberOfDays)

                        totalNumberOfDays += numberOfDays;
                        // console.log(" totalNumberOfDays += numberOfDays;", totalNumberOfDays += numberOfDays);

                        return { numberOfDays: numberOfDays, hostel_id: user.Hostel_Id, user_id: user.User_Id };
                    });

                    // Calculate the room base cost per day
                    const roombase = existingData[0].ebBill / totalNumberOfDays;

                    console.log(userDayAmounts, "<<<<<<<<<<<<<<<<<<.............>>>>>>>>>>>>>>>>>>>>>");

                    // Calculate the amount each user owes
                    let userAmounts = userDayAmounts.map(user => ({

                        user_id: user.user_id,
                        hostel_id: user.hostel_id,
                        amount: roombase * user.numberOfDays

                    }));

                    console.log("User Amounts:", userAmounts);
                    console.log(user.User_Id);

                    let userAmount = userAmounts.find(x => x.user_id === user.User_Id);

                    console.log(userAmount, ";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;");

                    eb_Hostel = userAmount ? userAmount.amount.toFixed() : 0;

                    console.log("EB Hostel:", eb_Hostel);
                } else {
                    eb_Hostel = 0;
                }

                eb_amount_total = 0;
            }
            else {


                let tempArray = users.filter(item => {
                    const createdAtDate = moment(item.createdAt);
                    const createdAtMonth = createdAtDate.month() + 1; // month() is zero-based
                    const createdAtYear = createdAtDate.year();
                    return item.Hostel_Id == existingData[0].roomHostel_Id && item.Floor == existingData[0].roomFloor_Id && item.Rooms == existingData[0].roomRoom_Id && createdAtMonth === previousMonth && createdAtYear === previousYear;
                });
                console.log("tempArray", tempArray)

                if (tempArray.length > 0) {
                    let totalNumberOfDays = 0;


                    let userDayAmounts = tempArray.map(user => {
                        // const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
                        // console.log("joinDate", joinDate)
                        // const dueDateeb = previousMonthDate.endOf('month').format('YYYY-MM-DD');

                        // // const invoiceDate = previousMonthDate.startOf('month').format('YYYY-MM-DD');

                        // invoiceDateeb = moment(joinDate).format('YYYY-MM-DD');
                        // const formattedJoinDateing = moment(invoiceDateeb).format('YYYY-MM-DD');

                        // const formattedDueDateeb = moment(duedateeb).format('YYYY-MM-DD');
                        // console.log("formattedDueDate", formattedDueDate)
                        // const numberOfDays = moment(formattedDueDateeb).diff(moment(formattedJoinDateing), 'days') + 1;
                        // console.log("numberOfDays..}]]]]]]]", numberOfDays)
                        const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
                        console.log("joinDate", joinDate)
                        const dueDateeb = previousMonthDate.endOf('month').format('YYYY-MM-DD');

                        // const invoiceDate = previousMonthDate.startOf('month').format('YYYY-MM-DD');

                        invoiceDatebe = moment(joinDate).format('YYYY-MM-DD');
                        const formattedJoinDateeb = moment(invoiceDatebe).format('YYYY-MM-DD');

                        const formattedDueDateeb = moment(dueDateeb).format('YYYY-MM-DD');
                        console.log("formattedDueDate", formattedDueDate)
                        const numberOfDays = moment(formattedDueDateeb).diff(moment(formattedJoinDateeb), 'days') + 1;
                        console.log("numberOfDays,,,", numberOfDays)

                        totalNumberOfDays += numberOfDays;
                        // console.log(" totalNumberOfDays += numberOfDays;", totalNumberOfDays += numberOfDays);

                        return { numberOfDays: numberOfDays, hostel_id: user.Hostel_Id, user_id: user.User_Id };
                    });

                    const roombase = existingData[0].ebBill / totalNumberOfDays;


                    let userAmounts = userDayAmounts.map(user => ({
                        user_id: user.user_id,
                        amount: roombase * user.numberOfDays
                    }));

                    console.log("User Amounts:", userAmounts);

                    let userAmount = userAmounts.find(user_id => user_id.user_id === user.User_Id);

                    eb_amount_total = userAmount.amount.toFixed();

                } else {
                    eb_amount_total = 0;
                }
                eb_Hostel = 0;
            }

            console.log(eb_Hostel, "Ending Eb AMount");



            const amenitiesData = await query(`SELECT * FROM Amenities WHERE Hostel_Id = ?`, [existingData[0].hosHostel_Id]);
            if (amenitiesData.length > 0) {
                for (let j = 0; j < amenitiesData.length; j++) {
                    if (amenitiesData[j].setAsDefault === 0 && amenitiesData[j].Status === 1) {
                        totalAmenitiesAmount += amenitiesData[j].Amount;
                    } else {
                        dedctAmenitiesAmount += amenitiesData[j].Amount;
                    }
                }
            }
            console.log("eb_Hostel....?", eb_Hostel)
            //  AdvanceAmount = ((roomPrice / moment(dueDate).daysInMonth()) * Number(numberOfDays)) + totalAmenitiesAmount +  Number(eb_Hostel);

            AdvanceAmount = ((roomPrice / moment(dueDate).daysInMonth()) * Number(numberOfDays)) + totalAmenitiesAmount + parseInt(eb_amount_total) + parseInt(eb_Hostel);

            console.log(AdvanceAmount);

            let invoiceNo;

            if (existingData[0].prefix && existingData[0].suffix) {
                let numericSuffix;
                if (existingData[0].InvoiceDetails != null) {
                    numericSuffix = parseInt(existingData[0].InvoiceDetails.substring(existingData[0].prefix.length)) || 0;
                    numericSuffix++;
                } else {
                    numericSuffix = existingData[0].suffix;
                }
                invoiceNo = existingData[0].prefix + numericSuffix;
            } else {
                const userID = user.User_Id.toString().slice(0, 4);
                const month = moment(new Date()).month() + 1;
                const year = moment(new Date()).year();
                invoiceNo = 'INVC' + month + year + userID;
            }

            let tempObj = {
                invoiceDate: invoiceDate,
                invoiceNo: invoiceNo,
                dueDate: dueDate,
                ebBill: existingData[0].ebBill,
                totalAmenitiesAmount: totalAmenitiesAmount,
                HostelBasedEb: eb_Hostel,
                dedctAmenitiesAmount: dedctAmenitiesAmount,
                roomPrice: roomPrice,
                roomBasedEb: eb_amount_total,
                AdvanceAmount: AdvanceAmount,
                numberOfDays: numberOfDays
            };


            await query(`INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based, Bed,numberofdays,hos_user_id) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${tempObj.AdvanceAmount}, '${user.Address}', '${tempObj.invoiceDate}', '${tempObj.dueDate}', '${tempObj.invoiceNo}', '${user.Status}', '${user.User_Id}', ${tempObj.roomPrice}, ${tempObj.ebBill}, ${tempObj.totalAmenitiesAmount},${tempObj.dedctAmenitiesAmount}, ${tempObj.HostelBasedEb}, ${tempObj.roomBasedEb},${user.Bed},${tempObj.numberOfDays},${user.ID})`, {

            });

        } else {
            console.log("No existing data found for the given user ID");
        }
    } catch (err) {
        console.error("Error:", err);
    }
}

function CheckOutInvoice(connection, user, users) {
    connection.query(`
    SELECT 
    rms.Price,
    rms.Hostel_Id AS roomHostel_Id,
    rms.Floor_Id AS roomFloor_Id,
    rms.Room_Id AS roomRoom_Id,    
    dtls.id AS detHostel_Id,
    dtls.isHostelBased,
    dtls.prefix,
    dtls.suffix,
    dtls.Name,
    hstl.Name AS UserName,
    hstl.Hostel_Id AS hosHostel_Id,
    hstl.Rooms AS hosRoom,
    hstl.Floor AS hosFloor,
    hstl.Bed,
    hstl.RoomRent,
    hstl.CheckoutDate,
    CASE 
        WHEN dtls.isHostelBased = true THEN 
            (
                SELECT eb.EbAmount 
                FROM EbAmount eb
                WHERE eb.hostel_Id = hstl.Hostel_Id  
                ORDER BY eb.id DESC 
                LIMIT 1
            )
        ELSE 
            (
                SELECT eb.EbAmount 
                FROM EbAmount eb
                WHERE eb.hostel_Id = hstl.Hostel_Id 
                 AND eb.Floor = hstl.Floor 
                AND eb.Room = hstl.Rooms 
                ORDER BY eb.id DESC 
                LIMIT 1
            )
    END AS ebBill,
    (
        SELECT eb.Floor 
        FROM EbAmount eb
        WHERE eb.hostel_Id = hstl.Hostel_Id   
        ORDER BY eb.id DESC 
        LIMIT 1
    ) AS ebFloor,
    (
        SELECT eb.hostel_Id 
        FROM EbAmount eb
        WHERE eb.hostel_Id = hstl.Hostel_Id 
        
        ORDER BY eb.id DESC 
        LIMIT 1
    ) AS ebhostel_Id,
    (
        SELECT eb.Room 
        FROM EbAmount eb
        WHERE eb.hostel_Id = hstl.Hostel_Id 
        ORDER BY eb.id DESC 
        LIMIT 1
    ) AS ebRoom,
    (
        SELECT eb.createAt 
        FROM EbAmount eb
        WHERE eb.hostel_Id = hstl.Hostel_Id 
        AND eb.Floor = hstl.Floor 
        AND eb.Room = hstl.Rooms 
        ORDER BY eb.id DESC 
        LIMIT 1
    ) AS createdAt    
FROM 
    hostel hstl 
INNER JOIN 
    hosteldetails dtls ON dtls.id = hstl.Hostel_Id 
INNER JOIN 
    hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id 
    AND rms.Floor_Id = hstl.Floor 
    AND rms.Room_Id = hstl.Rooms 
WHERE 
    hstl.isActive = false  AND hstl.id = ${user.ID}`, function (err, existingData) {

        console.log("existingData Array", existingData)
        if (err) {
            console.error("Error fetching hosteldetails:", err);
            return;
        }
        else {
            if (existingData.length > 0) {
                let finalArray = [];

                for (let i = 0; i < existingData.length; i++) {
                    let tempObj = {};
                    let roomPrice = existingData[i].RoomRent;
                    console.log("roomPrice", roomPrice)
                    let AdvanceAmount = 0;
                    let HostelBasedEb = 0;
                    let roomBasedEb = 0;
                    let totalAmenitiesAmount = 0;
                    let dedctAmenitiesAmount = 0;
                    const currentDate = moment().format('YYYY-MM-DD');
                    console.log("currentDate", currentDate)
                    const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
                    const CheckoutDate = moment(user.CheckoutDate).format('YYYY-MM-DD')
                    console.log("CheckoutDate ***", CheckoutDate)
                    const currentMonth = moment(currentDate).month() + 1;
                    const currentYear = moment(currentDate).year();
                    const createdAtMonth = moment(joinDate).month() + 1;
                    const createdAtYear = moment(joinDate).year();
                    let dueDate, invoiceDate;

                    if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
                        dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
                        invoiceDate = moment(joinDate).format('YYYY-MM-DD');
                    } else {
                        dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
                        invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
                    }
                    console.log("invoiceDate", invoiceDate)
                    const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
                    const formattedCheckOutDate = moment(CheckoutDate).format('YYYY-MM-DD');
                    const numberOfDays = moment(formattedCheckOutDate).diff(moment(formattedJoinDate), 'days') + 1;
                    console.log("numberOfDays", numberOfDays)

                    let invoiceNo;
                    const userID = user.User_Id.toString().slice(0, 4);
                    if (existingData[i].prefix !== '' && existingData[i].suffix !== '' &&
                        existingData[i].prefix != 'undefined' && existingData[i].suffix != 'undefined' &&
                        existingData[i].prefix !== null && existingData[i].suffix !== null) {
                        invoiceNo = existingData[i].prefix + existingData[i].suffix + user.Name + currentMonth + currentYear;
                    } else {
                        invoiceNo = 'INVC' + currentMonth + currentYear + userID;
                    }



                    const month = moment(new Date()).month() + 1;
                    const year = moment(new Date()).year();

                    if (existingData[i].isHostelBased === 1) {
                        let filteredArray = users.filter(item => {
                            // console.log("users-item", item)
                            return item.Hostel_Id == existingData[i].roomHostel_Id && item.isActive == 1;

                        });
                        console.log("filteredArray", filteredArray.length)
                        HostelBasedEb = (filteredArray.length + 1) !== 0 ? (existingData[i].ebBill == null ? 0 : Number(existingData[i].ebBill / (filteredArray.length + 1))) : 0;
                        roomBasedEb = 0
                    } else {
                        let tempArray = users.filter(Item => {
                            return Item.Hostel_Id == existingData[i].roomHostel_Id && Item.Floor == existingData[i].roomFloor_Id && Item.Rooms == existingData[i].roomRoom_Id && Item.isActive == 1;
                        });
                        console.log("tempArray", tempArray.length)
                        if (tempArray.length > 0) {
                            roomBasedEb = existingData[i].ebBill / (tempArray.length + 1);
                            HostelBasedEb = 0;
                        }
                    }



                    connection.query(`SELECT * FROM Amenities WHERE Hostel_Id = ${existingData[i].hosHostel_Id}`, function (err, amenitiesData) {
                        if (err) {
                            console.log("Error occurred while fetching amenities data:", err);
                        } else {
                            if (amenitiesData.length > 0) {
                                for (let j = 0; j < amenitiesData.length; j++) {
                                    if (amenitiesData[j].setAsDefault === 0 && amenitiesData[j].Status === 1) {
                                        totalAmenitiesAmount += amenitiesData[j].Amount;
                                    }
                                    else {
                                        dedctAmenitiesAmount += amenitiesData[j].Amount;
                                        console.log("dedctAmenitiesAmount", dedctAmenitiesAmount)
                                    }
                                }
                            }

                            AdvanceAmount = ((roomPrice / moment(formattedCheckOutDate).daysInMonth()) * Number(numberOfDays)) + totalAmenitiesAmount + HostelBasedEb + roomBasedEb;
                            console.log("AdvanceAmount", AdvanceAmount)
                            console.log("totalAmenitiesAmount", totalAmenitiesAmount)
                            console.log("TempOBject", tempObj)

                            tempObj = {
                                invoiceDate: invoiceDate,
                                invoiceNo: invoiceNo,
                                dueDate: CheckoutDate,
                                ebBill: existingData[i].ebBill,
                                totalAmenitiesAmount: totalAmenitiesAmount,
                                HostelBasedEb: HostelBasedEb,
                                dedctAmenitiesAmount: dedctAmenitiesAmount,
                                roomPrice: roomPrice,
                                roomBasedEb: roomBasedEb,
                                AdvanceAmount: AdvanceAmount
                            };
                            finalArray.push(tempObj);


                            if (i === existingData.length - 1) {

                                insertCheckOutInvoices(finalArray, user, connection);
                            }
                        }
                    });
                }
            }
        }
    });
}



function insertCheckOutInvoices(finalArray, user, connection) {
    for (let i = 0; i < finalArray.length; i++) {

        const invoiceDate = new Date(finalArray[i].invoiceDate)

        const year = invoiceDate.getFullYear()

        const month = invoiceDate.getMonth() + 1


        const checkQuery = `SELECT COUNT(*) AS count FROM invoicedetails WHERE User_Id = '${user.User_Id}' AND MONTH(Date) = ${month} AND YEAR(Date) = ${year}`


        connection.query(checkQuery, function (checkError, checkResult) {
            if (checkError) {
                console.error("Error checking for existing invoice:", checkError);
                return;
            }

            if (checkResult[0].count === 0) {
                const query = `INSERT INTO invoicedetails(Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based,Bed) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${finalArray[i].AdvanceAmount}, '${user.Address}', '${finalArray[i].invoiceDate}', '${finalArray[i].dueDate}', '${finalArray[i].invoiceNo}', '${user.Status}', '${user.User_Id}', ${finalArray[i].roomPrice}, ${finalArray[i].ebBill}, ${finalArray[i].totalAmenitiesAmount}, ${finalArray[i].dedctAmenitiesAmount}, ${finalArray[i].HostelBasedEb}, ${finalArray[i].roomBasedEb},${user.Bed})`;

                connection.query(query, function (error, data) {
                    if (error) {
                        console.error("Error inserting invoice data for user:", user.User_Id, error);
                        return;
                    }
                });
            } else {
                console.log("Invoice already exists for User_Id:", user.User_Id, "and Date:", finalArray[i].invoiceDate);
            }
        });
    }
}



//  Manual Invoice





function InsertManualInvoice(connection, users, reqData, ParticularUser) {

    let DateOfInvoice = reqData.DateOfInvoice ? moment(reqData.DateOfInvoice).format('YYYY-MM-DD') : moment().subtract(1, 'month').startOf('month').format('YYYY-MM-DD');
    console.log("DateOfInvoice", DateOfInvoice);


    let month = moment(DateOfInvoice).format('MM');
    let year = moment(DateOfInvoice).format('YYYY');


    console.log("Month:", month);
    console.log("Year:", year);

    connection.query(`
        SELECT 
            rms.Price,
            rms.Hostel_Id AS roomHostel_Id,
            rms.Floor_Id AS roomFloor_Id,
            rms.Room_Id AS roomRoom_Id,    
            dtls.id AS detHostel_Id,
            dtls.isHostelBased,
            dtls.prefix,
            dtls.suffix,
            dtls.Name,
            hstl.Name AS UserName,
            hstl.Hostel_Id AS hosHostel_Id,
            hstl.Rooms AS hosRoom,
            hstl.Floor As hosFloor,
            hstl.Bed,
             hstl.CheckoutDate,
            
         
            (
                SELECT EbAmount 
                FROM EbAmount 
                WHERE hostel_Id = hstl.Hostel_Id 
                AND MONTH(createAt) = '${month}' AND YEAR(createAt) = '${year}'
                ORDER BY id DESC 
                LIMIT 1
            ) AS ebBill,
            (
                SELECT createAt 
                FROM EbAmount 
                WHERE hostel_Id = hstl.Hostel_Id 
                AND Floor = hstl.Floor 
                AND Room = hstl.Rooms 
                AND MONTH(createAt) = '${month}' AND YEAR(createAt) = '${year}'
                ORDER BY id DESC 
                LIMIT 1
            ) AS createdAt    
        FROM 
            hostel hstl 
        INNER JOIN 
            hosteldetails dtls ON dtls.id = hstl.Hostel_Id 
        INNER JOIN 
            hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id 
            AND rms.Floor_Id = hstl.Floor 
            AND rms.Room_Id = hstl.Rooms 

        WHERE 
            hstl.User_Id = '${reqData.User_Id}'`, function (err, existingData) {

        console.log(" existingData", existingData)
        if (err) {
            console.error("Error fetching hosteldetails:", err);
            return;
        }
        else {
            if (existingData.length > 0) {
                let finalArray = [];
                for (let i = 0; i < existingData.length; i++) {
                    let tempObj = {};
                    let roomPrice = existingData[i].Price;
                    let AdvanceAmount = 0;
                    let HostelBasedEb = 0;
                    let roomBasedEb = 0;
                    let totalAmenitiesAmount = 0;
                    let dedctAmenitiesAmount = 0;


                    const currentDate = moment().format('YYYY-MM-DD');
                    const currentMonth = moment(currentDate).month() + 1;
                    const currentYear = moment(currentDate).year();
                    // const createdAtMonth = moment(DateForInvoice).month() + 1;
                    // const createdAtYear = moment(DateForInvoice).year();






                    let dueDate, invoiceDate;

                    // if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
                    //     dueDate = moment(DateForInvoice).endOf('month').format('YYYY-MM-DD');
                    //     invoiceDate = moment(DateForInvoice).format('YYYY-MM-DD');
                    // } else {
                    // dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
                    // invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
                    // }

                    dueDate = moment(DateOfInvoice).endOf('month').format('YYYY-MM-DD');
                    invoiceDate = moment(DateOfInvoice).format('YYYY-MM-DD');


                    console.log("invoiceDate", invoiceDate)
                    const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
                    const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
                    const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

                    console.log("numberOfDays Manual Api", numberOfDays)

                    let invoiceNo;
                    const userID = ParticularUser[0].User_Id.toString().slice(0, 4);
                    if (existingData[i].prefix !== '' && existingData[i].suffix !== '' &&
                        existingData[i].prefix != 'undefined' && existingData[i].suffix != 'undefined' &&
                        existingData[i].prefix !== null && existingData[i].suffix !== null) {
                        invoiceNo = existingData[i].prefix + existingData[i].suffix + ParticularUser[0].Name + currentMonth + currentYear;
                    } else {
                        invoiceNo = 'INVC' + currentMonth + currentYear + userID;
                    }



                    const month = moment(new Date()).month() + 1;
                    const year = moment(new Date()).year();
                    if (existingData[i].isHostelBased === 1) {
                        let filteredArray = users.filter(item => {
                            console.log("Users", item)
                            return item.Hostel_Id == existingData[i].roomHostel_Id && item.isActive == 1;
                        });
                        console.log("filteredArray", filteredArray)
                        console.log("ebBill", existingData[i].ebBill);
                        HostelBasedEb = filteredArray.length !== 0 ? (existingData[i].ebBill == null ? 0 : Number(existingData[i].ebBill / filteredArray.length)) : 0;
                        roomBasedEb = 0

                    }
                    else {
                        let tempArray = users.filter(Item => {
                            return Item.Hostel_Id == existingData[i].roomHostel_Id && Item.Floor == existingData[i].roomFloor_Id && Item.Rooms == existingData[i].roomRoom_Id && Item.isActive == 1;
                        });
                        if (tempArray.length > 0) {
                            roomBasedEb = existingData[i].ebBill / tempArray.length;
                            HostelBasedEb = 0;
                        }

                        // console.log("tempArray", tempArray)

                    }

                    connection.query(`SELECT * FROM Amenities WHERE Hostel_Id = ${existingData[i].hosHostel_Id}`, function (err, amenitiesData) {
                        if (err) {
                            console.log("Error occurred while fetching amenities data:", err);
                        } else {
                            if (amenitiesData.length > 0) {
                                for (let j = 0; j < amenitiesData.length; j++) {
                                    if (amenitiesData[j].setAsDefault === 0 && amenitiesData[j].Status === 1) {
                                        totalAmenitiesAmount += amenitiesData[j].Amount;
                                    }
                                    else {
                                        dedctAmenitiesAmount += amenitiesData[j].Amount;
                                        console.log("dedctAmenitiesAmount", dedctAmenitiesAmount)
                                    }
                                }
                            }

                            AdvanceAmount = ((roomPrice / moment(dueDate).daysInMonth()) * Number(numberOfDays)) + totalAmenitiesAmount + HostelBasedEb + roomBasedEb;


                            tempObj = {
                                invoiceDate: invoiceDate,
                                invoiceNo: invoiceNo,
                                dueDate: dueDate,
                                ebBill: existingData[i].ebBill,
                                totalAmenitiesAmount: totalAmenitiesAmount,
                                HostelBasedEb: HostelBasedEb,
                                dedctAmenitiesAmount: dedctAmenitiesAmount,
                                roomPrice: roomPrice,
                                roomBasedEb: roomBasedEb,
                                AdvanceAmount: AdvanceAmount
                            };
                            finalArray.push(tempObj);


                            if (i === existingData.length - 1) {

                                insertManualInvoices(finalArray, ParticularUser, connection);
                            }
                        }
                    });
                }
            }
        }
    });
}



function insertManualInvoices(finalArray, ParticularUser, connection, reqData) {
    for (let i = 0; i < finalArray.length; i++) {

        const invoiceDate = new Date(finalArray[i].invoiceDate)

        const year = invoiceDate.getFullYear()

        const month = invoiceDate.getMonth() + 1


        const checkQuery = `SELECT COUNT(*) AS count FROM Invoice_Details_For_All WHERE User_Id = '${ParticularUser[0].User_Id}' AND MONTH(Date) = ${month} AND YEAR(Date) = ${year}`


        connection.query(checkQuery, function (checkError, checkResult) {
            if (checkError) {
                console.error("Error checking for existing invoice:", checkError);
                return;
            }

            if (checkResult[0].count === 0) {
                let query = `INSERT INTO Invoice_Details_For_All (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount,Amnities_deduction_Amount, Hostel_Based, Room_Based,Bed) VALUES ('${ParticularUser[0].Name}', ${ParticularUser[0].Phone}, '${ParticularUser[0].Email}', '${ParticularUser[0].HostelName}', ${ParticularUser[0].Hostel_Id}, ${ParticularUser[0].Floor}, ${ParticularUser[0].Rooms}, ${finalArray[i].AdvanceAmount}, '${ParticularUser[0].Address}', '${finalArray[i].invoiceDate}', '${finalArray[i].dueDate}', '${finalArray[i].invoiceNo}', '${ParticularUser[0].Status}', '${ParticularUser[0].User_Id}', ${finalArray[i].roomPrice}, ${finalArray[i].ebBill}, ${finalArray[i].totalAmenitiesAmount},${finalArray[i].dedctAmenitiesAmount}, ${finalArray[i].HostelBasedEb}, ${finalArray[i].roomBasedEb},${ParticularUser[0].Bed})`;

                connection.query(query, function (error, data) {
                    if (error) {
                        console.error("Error inserting invoice data for user:", reqData.User_Id, error);
                        return;
                    }
                });
            } else {
                console.log("Invoice already exists");
            }
        });
    }
}



function getInvoiceListForAll(connection, response) {
    // const query = `SELECT * FROM  Invoice_Details_For_All  hstlDetails inner join invoicedetails  invoice  on invoice.Hostel_Id=hstlDetails.id  WHERE hstlDetails.created_By ='${reqData.loginId}' order by invoice.Hostel_Id;`;
    const query = `SELECT * FROM  Invoice_Details_For_All`;

    connection.query(query, function (error, data) {
        // console.log(error);
        // console.log("InvoiceData", data);
        if (error) {
            response.status(403).json({ message: 'not connected' })
        }
        else {
            response.status(200).json({ data: data })
        }
    })
}


function getInvoiceList(connection, response, request) {
    const userDetails = request.user_details;
    const query = `SELECT * FROM hosteldetails  hstlDetails inner join invoicedetails  invoice  on invoice.Hostel_Id=hstlDetails.id  WHERE hstlDetails.created_By ='${userDetails.id}' ORDER BY invoice.id DESC`;
    connection.query(query, function (error, data) {
        if (error) {
            response.status(403).json({ message: 'not connected' })
        } else {
            response.status(200).json({ data: data })
        }
    })
}

function embedImage(doc, imageUrl, fallbackPath, callback) {
    console.log(`Fetching image from URL: ${imageUrl}`);
    if (!imageUrl) {
        console.log("Image URL is empty. Using fallback image.");
        doc.image(fallbackPath, {
            fit: [80, 100],
            align: 'center',
            valign: 'top',
            margin: 50
        });
        callback(new Error("Image URL is empty"));
        return;
    }

    request({ url: imageUrl, encoding: null }, async (error, response, body) => {
        if (error) {

            doc.image(fallbackPath, {
                fit: [80, 100],
                align: 'center',
                valign: 'top',
                margin: 50
            });
            callback(error);
        } else if (response && response.statusCode === 200) {
            try {
                const imageBuffer = Buffer.from(body, 'base64');
                const convertedImageBuffer = await convertImage(imageBuffer);

                doc.image(convertedImageBuffer, {
                    fit: [50, 70],
                    align: 'center',
                    valign: 'top',
                    margin: 10,
                    continue: true
                });

                callback(null, convertedImageBuffer);
            } catch (conversionError) {
                doc.image(fallbackPath, {
                    fit: [80, 100],
                    align: 'center',
                    valign: 'top',
                    margin: 50
                });
                callback(conversionError);
            }
        } else {

            doc.image(fallbackPath, {
                fit: [80, 100],
                align: 'center',
                valign: 'top',
                margin: 50
            });
            callback(new Error(`Failed to fetch image. Status code: ${response.statusCode}`));
        }
    });
}

async function convertImage(imageBuffer) {
    const convertedImageBuffer = await sharp(imageBuffer)
        .jpeg()
        .toBuffer();

    return convertedImageBuffer;
}

function InvoicePDf(connection, reqBodyData, response) {
    console.log("reqBodyData", reqBodyData)

    var invocice_type = reqBodyData.invoice_type;

    if (!invocice_type || invocice_type == undefined) {
        var invocice_type = 1
    }


    const generatePDF = async (inv_data) => {
        try {
            const htmlFilePath = path.join(__dirname, 'mail_templates', 'invoicepdf.html');
            let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');


            const amountInWords = converter.toWords(inv_data.PaidAmount);
            console.log("amountInWords", amountInWords)
            const currentTimeFormatted = moment().format('hh:mm A');
            console.log("currentTimeFormatted", currentTimeFormatted)
            const defaultLogoPath = 'https://smartstaydevs.s3.ap-south-1.amazonaws.com/Logo/Logo141717749724216.jpg';
            var logoPathimage = inv_data.Hostel_Logo ? inv_data.Hostel_Logo : defaultLogoPath;
            console.log(logoPathimage);
            htmlContent = htmlContent
                .replace('{{hostal_name}}', inv_data.Hostel_Name)
                .replace('{{city}}', inv_data.HostelAddress)
                .replace('{{Phone}}', inv_data.hostel_PhoneNo)
                .replace('{{email}}', inv_data.HostelEmail_Id)
                .replace('{{user_name}}', inv_data.UserName)
                .replace('{{user_address}}', inv_data.UserAddress)
                .replace('{{invoice_number}}', inv_data.Invoices)
                .replace('{{invoice_date}}', inv_data.Date)
                .replace(/{{amount}}/g, inv_data.PaidAmount)
                .replace('{{amount_in_words}}', amountInWords)
                .replace('{{current_time}}', currentTimeFormatted)
                .replace('{{logo}}', logoPathimage);


            if (inv_data.invoice_type == 1) {
                htmlContent = htmlContent.replace('{{Amount_name}}', "Rent Amount")
            } else {
                htmlContent = htmlContent.replace('{{Amount_name}}', "Advance Amount")
            }



            const currentDate = moment().format('YYYY-MM-DD');
            const currentMonth = moment(currentDate).month() + 1;
            const currentYear = moment(currentDate).year();
            const currentTime = moment().format('HHmmss');

            const filename = `INV${currentMonth}${currentYear}${currentTime}${inv_data.User_Id}.pdf`;
            const outputPath = path.join(__dirname, filename);

            // Generate the PDF
            pdf.create(htmlContent, { phantomPath: phantomjs.path }).toFile(outputPath, async (err, res) => {
                if (err) {
                    console.error('Error generating PDF:', err);
                    return;
                }

                console.log('PDF generated:', res.filename);

                var inv_id = inv_data.id;

                // Upload the PDF to S3
                await uploadToS3(outputPath, filename, inv_id);

                // Remove the local PDF file after upload
                fs.unlinkSync(outputPath);

            });

        } catch (error) {
            console.error('Error:', error);
        }
    };

    const uploadToS3 = async (filePath, filename, inv_id) => {
        try {
            const fileContent = fs.readFileSync(filePath);

            const key = `Invoice/${filename}`;
            const bucketName = 'smartstaydevs';

            const params = {
                Bucket: bucketName,
                Key: key,
                Body: fileContent,
                ContentType: 'application/pdf',
            };

            const data = await s3.upload(params).promise();
            console.log('PDF uploaded successfully:', data.Location);

            var sql_query = "UPDATE invoicedetails SET invoicePDF='" + data.Location + "' WHERE id='" + inv_id + "';";
            connection.query(sql_query, function (err, data) {
                if (err) {
                    console.log(err);
                    return
                }
                else{
                    response.status(200).json({ message: 'Insert PDF successfully' });
                
                }
                
            })

            return data.Location;
        } catch (err) {
            console.error('Error uploading PDF:', err);
        }
    };

    // Assuming required libraries are imported at the beginning of the script

    if (invocice_type == 2) {
        const sql1 = `
        SELECT hostel.isHostelBased, invoice.Floor_Id, invoice.Room_No, invoice.Hostel_Id as Inv_Hostel_Id, 
        hostel.id as Hostel_Id, invoice.RoomRent, invoice.EbAmount, invoice.id, invoice.Name as UserName, 
        invoice.User_Id, invoice.UserAddress, invoice.Invoices, invoice.DueDate, invoice.Date,invoice.PaidAmount,
        hostel.hostel_PhoneNo, hostel.Address as HostelAddress, hostel.Name as Hostel_Name, 
        hostel.email_id as HostelEmail_Id, hostel.profile as Hostel_Logo, invoice.Amount 
        FROM invoicedetails invoice 
        INNER JOIN hosteldetails hostel ON hostel.id = invoice.Hostel_Id 
        WHERE invoice.User_Id = ? AND invoice.id = ?`;

        connection.query(sql1, [reqBodyData.User_Id, reqBodyData.id], async (err, data) => {
            console.log("datadata", data)
            if (err) {
                console.error('SQL query error:', err);
                return;
            }

            if (data.length === 0) {
                console.log('No data found');
                return;
            }

            generatePDF(data[0]);
            // response.status(200).json({ message: 'Insert PDF successfully' });
        });
    }
    else {
        connection.query(`SELECT hos.User_Id,hostel.isHostelBased, invoice.Floor_Id, invoice.Room_No ,invoice.Hostel_Id as Inv_Hostel_Id ,hostel.id as Hostel_Id,invoice.RoomRent,invoice.EbAmount, invoice.id, invoice.Name as UserName,invoice.invoice_type,invoice.AmnitiesAmount,invoice.User_Id,invoice.UserAddress,invoice.PaidAmount, invoice.Invoices,invoice.DueDate, invoice.Date, hostel.hostel_PhoneNo,hostel.Address as HostelAddress,hostel.Name as Hostel_Name,hostel.email_id as HostelEmail_Id , hostel.profile as Hostel_Logo ,invoice.Amount,hstlroom.Hostel_Id AS roomHostel_Id ,hstlroom.Floor_Id AS roomFloor_Id,hstlroom.Room_Id AS roomRoom_Id,hos.Hostel_Id AS hoshostel_id,hos.Floor AS hosfloor,hos.Rooms AS hosrooms,hos.createdAt,hos.User_Id FROM invoicedetails invoice INNER JOIN hosteldetails hostel INNER JOIN hostelrooms hstlroom INNER JOIN hostel hos on hostel.id = invoice.Hostel_Id WHERE hos.User_Id =? AND DATE(invoice.Date) = ? AND invoice.id = ? AND hos.isActive = 1 group by hos.id`,

            [reqBodyData.User_Id, reqBodyData.Date, reqBodyData.id], function (error, data) {
                console.log("data", data)
                if (error) {
                    console.log(error);
                    response.status(500).json({ message: 'Internal server error' });
                } else if (data.length > 0) {
                    console.log("data[0].AmnitiesAmount",data[0].invoice_type)
                    // return

                    if (data[0].EbAmount == 0 && data[0].invoice_type == 1 && data[0].AmnitiesAmount == 0) {
                        generatePDF(data[0]);
                        // response.status(200).json({ message: 'Insert PDF successfully' });
                      
                 console.log("vghghjhjh")
                    }
                   

                    else {
                        data.forEach((hostel, index) => {
                         console.log("hostel",hostel)
                            let breakUpTable = []
                            const currentDate = moment().format('YYYY-MM-DD');
                            const joinDate = moment(hostel.createdAt).format('YYYY-MM-DD');
                            const currentMonth = moment(currentDate).month() + 1;
                            const currentYear = moment(currentDate).year();
                            const createdAtMonth = moment(joinDate).month() + 1;
                            const createdAtYear = moment(joinDate).year();
                            let dueDate, invoiceDate;

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
                            console.log("numberOfDays,,,,,,ere", numberOfDays)

                            const JoiningWiseRoomRent = (hostel.RoomRent / moment(dueDate).daysInMonth()) * numberOfDays
                            console.log("JoiningWiseRoomRent", hostel.RoomRent)
                            
                            let RoomRent = {
                                Rent: Math.round(JoiningWiseRoomRent),

                            }
                            console.log("RoomRent....?112", RoomRent)
                            breakUpTable.push(RoomRent)
                            connection.query(`select * from Amenities AmeList INNER JOIN AmnitiesName AmeName ON AmeList.Amnities_Id = AmeName.id  where AmeList.Hostel_Id = \'${hostel.Hostel_Id} \'`, async function (error, Amenitiesdata) {


                                if (Amenitiesdata.length > 0) {
                                    for (let i = 0; i < Amenitiesdata.length; i++) {
                                        const tempObj = {};
                                        if (Amenitiesdata[i].setAsDefault == 0 && Amenitiesdata[i].Status == 1) {
                                            tempObj[Amenitiesdata[i].Amnities_Name] = Amenitiesdata[i].Amount
                                        } else if (Amenitiesdata[i].setAsDefault == 1 && Amenitiesdata[i].Status == 1) {
                                            tempObj[Amenitiesdata[i].Amnities_Name] = Amenitiesdata[i].Amount;
                                            RoomRent.Rent -= Amenitiesdata[i].Amount;
                                            console.log("Amenitiesdata[i].Amount", Amenitiesdata[i].Amount)
                                        }
                                        breakUpTable.push(tempObj);

                                    }
                                }
                                else {
                                }
                                connection.query(`select * from hostel where  isActive =1`, async function (error, hosdata) {
                                    console, log("hosdata", hosdata.length)

                                    let hostelbasedEb = 0;
                                    let roombasedEb = 0;
                                    let eb_amount_total;
                                    let eb_Hostel = 0
                                    let AdvanceAmount = 0;
                                    const previousMonthDate = moment().subtract(1, 'months');
                                    const previousMonth = previousMonthDate.month() + 1; // month() is zero-based
                                    const previousYear = previousMonthDate.year();

                                    if (data[0].isHostelBased === 1) {
                                        // Get the previous month's date
                                        const previousMonthDate = moment().subtract(1, 'months');
                                        const previousMonth = previousMonthDate.month() + 1; // month() is zero-based
                                        const previousYear = previousMonthDate.year();

                                        console.log("Previous Month:", previousMonth, "Previous Year:", previousYear);

                                        // Filter users based on the Hostel_Id and createdAt month/year being the previous month/year
                                        let filteredArray = hosdata.filter(item => {
                                            const createdAtDate = moment(item.createdAt);
                                            if (!createdAtDate.isValid()) {
                                                console.error("Invalid date:", item.createdAt);
                                                return false;
                                            }

                                            const createdAtMonth = createdAtDate.month() + 1; // moment.js months are 0-based
                                            const createdAtYear = createdAtDate.year();

                                            return item.Hostel_Id == data[0].Hostel_Id && createdAtMonth === previousMonth && createdAtYear === previousYear;
                                        });

                                        console.log("filteredArray.length", filteredArray.length);

                                        if (filteredArray.length > 0) {
                                            let totalNumberOfDays = 0;

                                            // Map through filtered users to calculate the number of days and amounts
                                            let userDayAmounts = filteredArray.map(user => {
                                                const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
                                                const dueDate = previousMonthDate.endOf('month').format('YYYY-MM-DD');
                                                const invoiceDate = moment(joinDate).format('YYYY-MM-DD');
                                                const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
                                                const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
                                                const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

                                                totalNumberOfDays += numberOfDays;

                                                return { numberOfDays: numberOfDays, hostel_id: user.Hostel_Id, user_id: user.User_Id };
                                            });

                                            // Calculate the room base cost per day
                                            const roombase = data[0].EbAmount / totalNumberOfDays;

                                            console.log(userDayAmounts, "<<<<<<<<<<<<<<<<<<.............>>>>>>>>>>>>>>>>>>>>>");

                                            // Calculate the amount each user owes
                                            let userAmounts = userDayAmounts.map(user => ({
                                                user_id: user.user_id,
                                                hostel_id: user.hostel_id,
                                                amount: roombase * user.numberOfDays
                                            }));

                                            console.log("User Amounts:", userAmounts);
                                            console.log(reqBodyData.User_Id, "tytyy");

                                            let userAmount = userAmounts.find(x => x.user_id === reqBodyData.User_Id);

                                            console.log(userAmount, ";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;");

                                            eb_Hostel = userAmount ? userAmount.amount.toFixed() : 0;

                                            console.log("EB Hostel:", eb_Hostel);

                                            breakUpTable.push({ EbAmount: eb_Hostel });
                                        } else {
                                            eb_Hostel = 0;
                                            breakUpTable.push({ EbAmount: eb_Hostel });
                                        }

                                        generatePDFFor(breakUpTable, hosdata, hostel, data, response, connection);
                                    } else {
                                        let tempArray = hosdata.filter(item => {
                                            const createdAtDate = moment(item.createdAt);
                                            const createdAtMonth = createdAtDate.month() + 1; // month() is zero-based
                                            const createdAtYear = createdAtDate.year();
                                            return item.Hostel_Id == data[0].Hostel_Id && item.Floor == data[0].Floor_Id && item.Rooms == data[0].Room_No && createdAtMonth === previousMonth && createdAtYear === previousYear;
                                        });
                                        console.log("tempArray", tempArray);

                                        if (tempArray.length > 0) {
                                            let totalNumberOfDays = 0;

                                            let userDayAmounts = tempArray.map(user => {
                                                const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
                                                const dueDate = previousMonthDate.endOf('month').format('YYYY-MM-DD');
                                                const invoiceDate = moment(joinDate).format('YYYY-MM-DD');
                                                const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
                                                const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
                                                const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

                                                totalNumberOfDays += numberOfDays;

                                                return { numberOfDays: numberOfDays, hostel_id: user.Hostel_Id, user_id: user.User_Id };
                                            });

                                            const roombase = data[0].EbAmount / totalNumberOfDays;

                                            let userAmounts = userDayAmounts.map(user => ({
                                                user_id: user.user_id,
                                                amount: roombase * user.numberOfDays
                                            }));

                                            console.log("User Amounts:", userAmounts);
                                            console.log(reqBodyData.User_Id, "[][][][][][][]");
                                            let userAmount = userAmounts.find(x => x.user_id === reqBodyData.User_Id);

                                            eb_amount_total = userAmount ? userAmount.amount.toFixed() : 0;
                                            console.log("eb_amount_total123", eb_amount_total);

                                            breakUpTable.push({ EbAmount: eb_amount_total });
                                        } else {
                                            eb_amount_total = 0;
                                            breakUpTable.push({ EbAmount: eb_amount_total });
                                        }

                                        eb_Hostel = 0;
                                        generatePDFFor(breakUpTable, hosdata, hostel, data, response, connection);
                                    }


                                    console.log(eb_Hostel, "Ending Eb AMount.....?");
                                })
                            })

                        })
                    }


                } else {
                    response.status(404).json({ message: 'No data found' });
                }

            });
    }
}

function generatePDFFor(breakUpTable, hosdata, hostel, data, response, connection) {
    const currentDate = moment().format('YYYY-MM-DD');
    const currentMonth = moment(currentDate).month() + 1;
    const currentYear = moment(currentDate).year();
    const currentTime = moment().format('HHmmss');


    let filenames = [];

    let totalPDFs = data.length;
    let uploadedPDFs = 0;

    let pdfDetails = [];

    breakUpTable = breakUpTable.filter(obj => Object.keys(obj).length !== 0);
    console.log(" breakUpTable......?...", breakUpTable)
    console.log("////////////-----------------------------////////////////////////");



    const filename = `Invoice${currentMonth}${currentYear}${currentTime}${hostel.User_Id}.pdf`;
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
            }
            else {

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
                    console.log("row......?", row)
                    let isEmptyRow = true;

                    const serialX = startX + (columnWidth - doc.widthOfString(serialNumber.toString())) / 2;
                    doc.fontSize(10)
                        .fillColor('#000000')
                        .text(serialNumber.toString(), serialX, dataY + 5);

                    serialNumber++;

                    // To keep track of the current column index
                    let colIndex = 0;
                    Object.entries(row).forEach(([description, price]) => {
                        if (price !== undefined) {
                            isEmptyRow = false;
                            const cellX = startX + columnWidth * (colIndex + 1) + (columnWidth - doc.widthOfString(description)) / 2;
                            doc.fontSize(10)
                                .text(description, cellX, dataY + 5);
                            const priceX = startX + columnWidth * (colIndex + 2) + (columnWidth - doc.widthOfString(price.toString())) / 2;
                            doc.fontSize(10)
                                .text(price.toString(), priceX, dataY + 5);
                        }
                        colIndex++;
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
                        uploadToS31(response, pdfDetails, connection);
                        deletePDfs(filenames);
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
            console.log("row......?", row)
            let isEmptyRow = true;

            const serialX = startX + (columnWidth - doc.widthOfString(serialNumber.toString())) / 2;
            doc.fontSize(10)
                .fillColor('#000000')
                .text(serialNumber.toString(), serialX, dataY + 5);

            serialNumber++;

            // To keep track of the current column index
            let colIndex = 0;
            Object.entries(row).forEach(([description, price]) => {
                if (price !== undefined) {
                    isEmptyRow = false;
                    const cellX = startX + columnWidth * (colIndex + 1) + (columnWidth - doc.widthOfString(description)) / 2;
                    doc.fontSize(10)
                        .text(description, cellX, dataY + 5);
                    const priceX = startX + columnWidth * (colIndex + 2) + (columnWidth - doc.widthOfString(price.toString())) / 2;
                    doc.fontSize(10)
                        .text(price.toString(), priceX, dataY + 5);
                }
                colIndex++;
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
                uploadToS31(response, pdfDetails, connection);
                deletePDfs(filenames);
            }
        });

    }

}

function embedImage(doc, imageUrl, fallbackPath, callback) {
    console.log(`Fetching image from URL: ${imageUrl}`);
    if (!imageUrl) {
        console.log("Image URL is empty. Using fallback image.");
        doc.image(fallbackPath, {
            fit: [80, 100],
            align: 'center',
            valign: 'top',
            margin: 50
        });
        callback(new Error("Image URL is empty"));
        return;
    }

    request({ url: imageUrl, encoding: null }, async (error, response, body) => {
        if (error) {

            doc.image(fallbackPath, {
                fit: [80, 100],
                align: 'center',
                valign: 'top',
                margin: 50
            });
            callback(error);
        } else if (response && response.statusCode === 200) {
            try {
                const imageBuffer = Buffer.from(body);
                const convertedImageBuffer = await convertImage(imageBuffer);

                doc.image(convertedImageBuffer, {
                    fit: [50, 70],
                    align: 'center',
                    valign: 'top',
                    margin: 10,
                    continue: true
                });

                callback(null, convertedImageBuffer);
            } catch (conversionError) {
                doc.image(fallbackPath, {
                    fit: [80, 100],
                    align: 'center',
                    valign: 'top',
                    margin: 50
                });
                callback(conversionError);
            }
        } else {

            doc.image(fallbackPath, {
                fit: [80, 100],
                align: 'center',
                valign: 'top',
                margin: 50
            });
            callback(new Error(`Failed to fetch image. Status code: ${response.statusCode}`));
        }
    });
}

async function convertImage(imageBuffer) {
    const convertedImageBuffer = await sharp(imageBuffer)
         .toFormat('png')
        .toBuffer();

    return convertedImageBuffer;
}


function uploadToS31(response, pdfDetailsArray, connection) { //filenames, response, pdfDetails, connection
    let totalPDFs = pdfDetailsArray.length;
    console.log("totalPDFs", totalPDFs)
    let uploadedPDFs = 0;
    let pdfInfo = [];
    let errorMessage;
    pdfDetailsArray.forEach(pdfDetails => {
        const { filename, fileContent, user } = pdfDetails;
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
                console.log("PDF uploaded successfully", uploadData.Location);
                uploadedPDFs++;

                const pdfInfoItem = {
                    user: user,
                    url: uploadData.Location
                };
                pdfInfo.push(pdfInfoItem);

                if (uploadedPDFs === totalPDFs) {

                    var pdf_url=[]
                    pdfInfo.forEach(pdf => {
                        console.log(pdf.url);
                        pdf_url.push(pdf.url)
                        const query = `UPDATE invoicedetails SET invoicePDF = '${pdf.url}' WHERE User_Id = '${pdf.user}'`;
                        console.log(query, ";;;;;;;;;;;;;;;;;;;;;;");
                        connection.query(query, function (error, pdfData) {
                            if (error) {
                                console.error('Error updating database', error);
                                errorMessage = error;
                            }
                        });
                    });

                    if (errorMessage) {
                        response.status(201).json({ message: 'Cannot Insert PDF to Database' });
                    } else {
                        response.status(200).json({ message: 'Insert PDF successfully',pdf_url:pdf_url[0]});
                    }
                }
            }
        });
    });
}


function deletePDfs(filenames) {
    console.log(filenames);
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
        response.status(201).json({ message: 'Missing parameter' });
        return;
    }
    connection.query(`SELECT isHostelBased FROM hosteldetails where id=${atten.Hostel_Id}`, function (err, datum) {
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
                        response.status(203).json({ message: 'Database error' });
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
                        `INSERT INTO EbAmount (hostel_Id, Floor, Room, start_Meter_Reading, end_Meter_Reading, EbAmount,Eb_Unit) VALUES (${atten.Hostel_Id}, ${atten.Floor}, ${atten.Room}, ${startMeterReading}, '${atten.end_Meter_Reading}', '${atten.EbAmount}',${difference})`;

                    connection.query(insertQuery, function (error, data) {
                        if (error) {
                            console.error(error);
                            response.status(202).json({ message: 'Insertion failed', error: error });
                            return;
                        }
                        else {
                            console.log("Inserted successfully");
                            response.status(200).json({ message: 'Inserted successfully' });
                        }

                    });
                });
            }
        }
    });

};




function getEBList(connection, request, response) {
    connection.query(`SELECT 
    inv.Name,
    inv.Hostel_Id,
    inv.Room_No,
    inv.Hostel_Based,
    inv.Room_Based,
    eb.Eb_Unit,
    eb.Hostel_Id,
    eb.createAt,
    eb.id
FROM 
    invoicedetails AS inv
INNER JOIN 
    EbAmount AS eb
ON 
    inv.Hostel_Id = eb.Hostel_Id
INNER JOIN (
    SELECT 
        Hostel_Id,
        MAX(createAt) as latestCreateAt
    FROM 
        EbAmount
    GROUP BY 
        Hostel_Id
) as latestEb
ON 
    eb.Hostel_Id = latestEb.Hostel_Id
AND 
    eb.createAt = latestEb.latestCreateAt
ORDER BY 
    eb.createAt DESC;`, function (error, data) {

        if (error) {
            console.error(error);
            response.status(201).json({ message: 'Internal Server Error' });
        } else {
            if (data.length > 0) {

                response.status(200).json({ data: data });
            } else {
                response.status(203).json({ message: 'No data found' });
            }
        }
    });
}

function getEbStart(connection, response) {
    connection.query('select * from EbAmount', function (error, data) {
        if (error) {
            response.status(203).json({ message: 'not connected' })
        }
        else {
            response.status(200).json({ data: data })
        }
    })
}

function UpdateInvoice(connection, response, atten) {
    // console.log("atten", atten);
    if (atten.id) {
        connection.query(`UPDATE invoicedetails SET BalanceDue= ${atten.BalanceDue},PaidAmount = ${atten.paidAmount} WHERE id=${atten.id}`, function (error, result) {
            if (error) {
                console.error(error);
                return response.status(203).json({ message: "Error updating invoice" });
            } else {
                return response.status(200).json({ message: "Update successful" });
            }
        });
    }
    else {

        return response.status(201).json({ message: "Invoice id is required for update" });
    }
}




module.exports = { calculateAndInsertInvoice, getInvoiceList, InvoicePDf, EbAmount, getEBList, getEbStart, CheckOutInvoice, getInvoiceListForAll, InsertManualInvoice, UpdateInvoice }