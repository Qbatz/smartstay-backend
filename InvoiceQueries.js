const moment = require("moment");
const AWS = require("aws-sdk");
require("dotenv").config();
const path = require("path");

var connection = require("./config/connection");
const phantomjs = require("phantomjs-prebuilt");
const addNotification = require("./components/add_notification");

const { generateManualPDF } = require("./components/gen_pdf");

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
const request = require("request");
const sharp = require("sharp");
const util = require("util");

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});
const s3 = new AWS.S3();

async function calculateAndInsertInvoice(connection, user, users, isFirstTime) {
  const query = util.promisify(connection.query).bind(connection);

  try {
    const existingData = await query(
      `
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
        `,
      [user.ID]
    );

    if (existingData.length != 0) {
      let roomPrice = existingData[0].RoomRent;
      let totalAmenitiesAmount = 0;
      let dedctAmenitiesAmount = 0;
      const currentDate = moment().format("YYYY-MM-DD");
      const joinDate = moment(user.createdAt).format("YYYY-MM-DD");
      const currentMonth = moment(currentDate).month() + 1;
      const currentYear = moment(currentDate).year();
      const createdAtMonth = moment(joinDate).month() + 1;
      const createdAtYear = moment(joinDate).year();
      let dueDate, invoiceDate;
      let invoiceDatebe, duedateeb;
      console.log("users", users);

      if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
        dueDate = moment(joinDate).endOf("month").format("YYYY-MM-DD");
        invoiceDate = moment(joinDate).format("YYYY-MM-DD");
      } else {
        dueDate = moment(currentDate).endOf("month").format("YYYY-MM-DD");
        invoiceDate = moment(currentDate).startOf("month").format("YYYY-MM-DD");
      }

      const formattedJoinDate = moment(invoiceDate).format("YYYY-MM-DD");
      console.log("formattedJoinDate", formattedJoinDate);
      const formattedDueDate = moment(dueDate).format("YYYY-MM-DD");
      console.log("formattedDueDate", formattedDueDate);
      const numberOfDays =
        moment(formattedDueDate).diff(moment(formattedJoinDate), "days") + 1;
      // console.log("numberOfDays", numberOfDays)

      let HostelBasedEb = 0;
      let roomBasedEb = 0;
      let roombase = 0;
      let totalDays = 0;

      let eb_amount_total;

      let eb_Hostel = 0;
      let AdvanceAmount = 0;
      const previousMonthDate = moment().subtract(1, "months");
      const previousMonth = previousMonthDate.month() + 1; // month() is zero-based
      const previousYear = previousMonthDate.year();

      if (existingData[0].isHostelBased == 1) {
        // Get the previous month's date
        const previousMonthDate = moment().subtract(1, "months");
        const previousMonth = previousMonthDate.month() + 1; // month() is zero-based
        const previousYear = previousMonthDate.year();

        console.log(
          "Previous Month:",
          previousMonth,
          "Previous Year:",
          previousYear
        );

        // Filter users based on the Hostel_Id and createdAt month/year being the previous month/year
        let filteredArray = users.filter((item) => {
          const createdAtDate = moment(item.createdAt);
          const createdAtMonth = createdAtDate.month() + 1; // month() is zero-based
          const createdAtYear = createdAtDate.year();
          return (
            item.Hostel_Id == existingData[0].roomHostel_Id &&
            createdAtMonth === previousMonth &&
            createdAtYear === previousYear
          );
        });

        console.log("filteredArray.length", filteredArray);

        if (filteredArray.length > 0) {
          let totalNumberOfDays = 0;

          // Map through filtered users to calculate the number of days and amounts
          let userDayAmounts = filteredArray.map((user) => {
            const joinDate = moment(user.createdAt).format("YYYY-MM-DD");
            console.log("joinDate", joinDate);
            const dueDateeb = previousMonthDate
              .endOf("month")
              .format("YYYY-MM-DD");

            // const invoiceDate = previousMonthDate.startOf('month').format('YYYY-MM-DD');

            invoiceDatebe = moment(joinDate).format("YYYY-MM-DD");
            const formattedJoinDateeb =
              moment(invoiceDatebe).format("YYYY-MM-DD");

            const formattedDueDateeb = moment(dueDateeb).format("YYYY-MM-DD");
            console.log("formattedDueDate", formattedDueDate);
            const numberOfDays =
              moment(formattedDueDateeb).diff(
                moment(formattedJoinDateeb),
                "days"
              ) + 1;
            console.log("numberOfDays,,,", numberOfDays);

            totalNumberOfDays += numberOfDays;
            // console.log(" totalNumberOfDays += numberOfDays;", totalNumberOfDays += numberOfDays);

            return {
              numberOfDays: numberOfDays,
              hostel_id: user.Hostel_Id,
              user_id: user.User_Id,
            };
          });

          // Calculate the room base cost per day
          const roombase = existingData[0].ebBill / totalNumberOfDays;

          console.log(
            userDayAmounts,
            "<<<<<<<<<<<<<<<<<<.............>>>>>>>>>>>>>>>>>>>>>"
          );

          // Calculate the amount each user owes
          let userAmounts = userDayAmounts.map((user) => ({
            user_id: user.user_id,
            hostel_id: user.hostel_id,
            amount: roombase * user.numberOfDays,
          }));

          console.log("User Amounts:", userAmounts);
          console.log(user.User_Id);

          let userAmount = userAmounts.find((x) => x.user_id === user.User_Id);

          eb_Hostel = userAmount ? userAmount.amount.toFixed() : 0;

          console.log("EB Hostel:", eb_Hostel);
        } else {
          eb_Hostel = 0;
        }

        eb_amount_total = 0;
      } else {
        let tempArray = users.filter((item) => {
          const createdAtDate = moment(item.createdAt);
          const createdAtMonth = createdAtDate.month() + 1; // month() is zero-based
          const createdAtYear = createdAtDate.year();
          return (
            item.Hostel_Id == existingData[0].roomHostel_Id &&
            item.Floor == existingData[0].roomFloor_Id &&
            item.Rooms == existingData[0].roomRoom_Id &&
            createdAtMonth === previousMonth &&
            createdAtYear === previousYear
          );
        });
        console.log("tempArray", tempArray);

        if (tempArray.length > 0) {
          let totalNumberOfDays = 0;

          let userDayAmounts = tempArray.map((user) => {
            const joinDate = moment(user.createdAt).format("YYYY-MM-DD");
            console.log("joinDate", joinDate);
            const dueDateeb = previousMonthDate
              .endOf("month")
              .format("YYYY-MM-DD");

            // const invoiceDate = previousMonthDate.startOf('month').format('YYYY-MM-DD');

            invoiceDatebe = moment(joinDate).format("YYYY-MM-DD");
            const formattedJoinDateeb =
              moment(invoiceDatebe).format("YYYY-MM-DD");

            const formattedDueDateeb = moment(dueDateeb).format("YYYY-MM-DD");
            console.log("formattedDueDate", formattedDueDate);
            const numberOfDays =
              moment(formattedDueDateeb).diff(
                moment(formattedJoinDateeb),
                "days"
              ) + 1;
            console.log("numberOfDays,,,", numberOfDays);

            totalNumberOfDays += numberOfDays;
            // console.log(" totalNumberOfDays += numberOfDays;", totalNumberOfDays += numberOfDays);

            return {
              numberOfDays: numberOfDays,
              hostel_id: user.Hostel_Id,
              user_id: user.User_Id,
            };
          });

          const roombase = existingData[0].ebBill / totalNumberOfDays;

          let userAmounts = userDayAmounts.map((user) => ({
            user_id: user.user_id,
            amount: roombase * user.numberOfDays,
          }));

          let userAmount = userAmounts.find(
            (user_id) => user_id.user_id === user.User_Id
          );

          eb_amount_total = userAmount.amount.toFixed();
        } else {
          eb_amount_total = 0;
        }
        eb_Hostel = 0;
      }

      const today = new Date();
      let lastMonth = today.getMonth(); // 0-based month (0 = January, 11 = December)
      let year = today.getFullYear();

      if (lastMonth === 0) {
        // If it's January, go back to December of the previous year
        lastMonth = 11; // December
        year -= 1;
      } else {
        lastMonth -= 1;
      }

      // Format lastMonth as a 2-digit number
      const formattedMonth = (lastMonth + 1).toString().padStart(2, "0");

      console.log(`Last month: ${formattedMonth}, Last year: ${year}`);

      var am_query =
        "SELECT amen.id,amen.user_Id,amen.amenity_Id,hostel.Hostel_Id,amen.status,amen.created_At,amname.Amnities_Name,am.Amount FROM AmenitiesHistory AS amen JOIN hostel ON hostel.User_Id = amen.user_Id JOIN Amenities AS am ON am.Amnities_Id = amen.amenity_Id JOIN AmnitiesName AS amname ON am.Amnities_Id = amname.id WHERE amen.user_Id = '" +
        user.User_Id +
        "' AND YEAR(amen.created_At) = '" +
        year +
        "' AND MONTH(amen.created_At) <= '" +
        formattedMonth +
        "' ORDER BY amen.created_At DESC LIMIT 1;";
      const amenitiesData = await query(am_query);
      if (amenitiesData.length > 0) {
        for (let j = 0; j < amenitiesData.length; j++) {
          if (amenitiesData[0].status == 1) {
            totalAmenitiesAmount += amenitiesData[j].Amount;
            dedctAmenitiesAmount += amenitiesData[j].Amount;
          }
        }
      }
      //  AdvanceAmount = ((roomPrice / moment(dueDate).daysInMonth()) * Number(numberOfDays)) + totalAmenitiesAmount +  Number(eb_Hostel);

      AdvanceAmount =
        (roomPrice / moment(dueDate).daysInMonth()) * Number(numberOfDays) +
        totalAmenitiesAmount +
        parseInt(eb_amount_total) +
        parseInt(eb_Hostel);
      let invoiceNo;

      const userID = user.User_Id.toString().slice(0, 4); // First 4 characters of User ID
      const month = moment(new Date()).format("MM"); // Current month in MM format
      var inv_year = moment(new Date()).format("YYYY"); // Current inv_year in YYYY format
      const baseInvoicePrefix = `INVC${month}${inv_year}${userID}`;

      var sql_12 = `SELECT Invoices FROM invoicedetails WHERE Hostel_id=? ORDER BY id DESC LIMIT 1;`;
      connection.query(sql_12, [user.Hostel_Id], async function (err, result) {
        if (err) {
          console.log("Unable to Get Invoice Details");
          return;
        } else {
          console.log(result[0].Invoices);

          let numericSuffix;
          if (result.length > 0) {
            const lastInvoice = result[0].Invoices;
            const lastSuffix = lastInvoice.substring(baseInvoicePrefix.length); // Extract suffix part
            numericSuffix = parseInt(lastSuffix, 10) || 0; // Convert to number (or use 0 if NaN)
            numericSuffix++; // Increment the suffix for the new invoice
          } else {
            numericSuffix = 1;
          }

          const incrementedSuffix = numericSuffix.toString().padStart(2, "0"); // Pad with '0' for consistency
          const invoiceNo = `${baseInvoicePrefix}${incrementedSuffix}`; // Complete invoice number

          console.log(`Generated Invoice Number: ${invoiceNo}`);

          // return;

          // if (existingData[0].prefix && existingData[0].suffix) {
          //     let numericSuffix;
          //     if (existingData[0].InvoiceDetails != null) {
          //         numericSuffix = parseInt(existingData[0].InvoiceDetails.substring(existingData[0].prefix.length)) || 0;
          //         numericSuffix++;
          //     } else {
          //         numericSuffix = existingData[0].suffix;
          //     }
          //     invoiceNo = existingData[0].prefix + numericSuffix;
          // } else {
          //     const userID = user.User_Id.toString().slice(0, 4);
          //     const month = moment(new Date()).month() + 1;
          //     const year = moment(new Date()).year();
          //     invoiceNo = 'INVC' + month + year + userID;
          // }

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
            numberOfDays: numberOfDays,
          };

          await query(
            `INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based, Bed,numberofdays,hos_user_id,BalanceDue) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${tempObj.AdvanceAmount}, '${user.Address}', '${tempObj.invoiceDate}', '${tempObj.dueDate}', '${tempObj.invoiceNo}', '${user.Status}', '${user.User_Id}', ${tempObj.roomPrice}, ${tempObj.ebBill}, ${tempObj.totalAmenitiesAmount},${tempObj.dedctAmenitiesAmount}, ${tempObj.HostelBasedEb}, ${tempObj.roomBasedEb},${user.Bed},${tempObj.numberOfDays},${user.ID},${tempObj.AdvanceAmount})`
          );
          if (isFirstTime) {
            var sql1 = "SELECT * FROM createaccount";
            connection.query(sql1, async function (err, data) {
              if (err) {
                console.log(err);
              } else {
                var unseen_users = data.map((x) => x.id);
                console.log(unseen_users);

                var title = "Invoice Generation";
                var user_type = 1;
                var user_id = 0;
                var message = "New Invoice Generate for All Users";

                await addNotification.add_notification(
                  user_id,
                  title,
                  user_type,
                  message,
                  unseen_users
                );
              }
            });

            var sql1 = "SELECT * FROM hostel WHERE isActive=1";
            connection.query(sql1, async function (err, data) {
              if (err) {
                console.log(err);
              } else {
                var unseen_users = data.map((x) => x.ID);
                console.log(unseen_users);

                var title = "Invoice Generation";
                var user_type = 0;
                var user_id = 0;
                var message = "New Month Invoice Generated";

                await addNotification.add_notification(
                  user_id,
                  title,
                  user_type,
                  message,
                  unseen_users
                );
              }
            });
          }
        }
      });
    } else {
      console.log("No existing data found for the given user ID");
    }
  } catch (err) {
    console.error("Error:", err);
  }
}

function CheckOutInvoice(connection, user, users) {
  connection.query(
    `
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
    hstl.isActive = false  AND hstl.id = ${user.ID}`,
    function (err, existingData) {
      console.log("existingData Array", existingData);
      if (err) {
        console.error("Error fetching hosteldetails:", err);
        return;
      } else {
        if (existingData.length > 0) {
          let finalArray = [];

          for (let i = 0; i < existingData.length; i++) {
            let tempObj = {};
            let roomPrice = existingData[i].RoomRent;
            console.log("roomPrice", roomPrice);
            let AdvanceAmount = 0;
            let HostelBasedEb = 0;
            let roomBasedEb = 0;
            let totalAmenitiesAmount = 0;
            let dedctAmenitiesAmount = 0;
            const currentDate = moment().format("YYYY-MM-DD");
            console.log("currentDate", currentDate);
            const joinDate = moment(user.createdAt).format("YYYY-MM-DD");
            const CheckoutDate = moment(user.CheckoutDate).format("YYYY-MM-DD");
            console.log("CheckoutDate ***", CheckoutDate);
            const currentMonth = moment(currentDate).month() + 1;
            const currentYear = moment(currentDate).year();
            const createdAtMonth = moment(joinDate).month() + 1;
            const createdAtYear = moment(joinDate).year();
            let dueDate, invoiceDate;

            if (
              currentMonth === createdAtMonth &&
              currentYear === createdAtYear
            ) {
              dueDate = moment(joinDate).endOf("month").format("YYYY-MM-DD");
              invoiceDate = moment(joinDate).format("YYYY-MM-DD");
            } else {
              dueDate = moment(currentDate).endOf("month").format("YYYY-MM-DD");
              invoiceDate = moment(currentDate)
                .startOf("month")
                .format("YYYY-MM-DD");
            }
            console.log("invoiceDate", invoiceDate);
            const formattedJoinDate = moment(invoiceDate).format("YYYY-MM-DD");
            const formattedCheckOutDate =
              moment(CheckoutDate).format("YYYY-MM-DD");
            const numberOfDays =
              moment(formattedCheckOutDate).diff(
                moment(formattedJoinDate),
                "days"
              ) + 1;
            console.log("numberOfDays", numberOfDays);

            let invoiceNo;
            const userID = user.User_Id.toString().slice(0, 4);
            if (
              existingData[i].prefix !== "" &&
              existingData[i].suffix !== "" &&
              existingData[i].prefix != "undefined" &&
              existingData[i].suffix != "undefined" &&
              existingData[i].prefix !== null &&
              existingData[i].suffix !== null
            ) {
              invoiceNo =
                existingData[i].prefix +
                existingData[i].suffix +
                user.Name +
                currentMonth +
                currentYear;
            } else {
              invoiceNo = "INVC" + currentMonth + currentYear + userID;
            }

            const month = moment(new Date()).month() + 1;
            const year = moment(new Date()).year();

            if (existingData[i].isHostelBased === 1) {
              let filteredArray = users.filter((item) => {
                // console.log("users-item", item)
                return (
                  item.Hostel_Id == existingData[i].roomHostel_Id &&
                  item.isActive == 1
                );
              });
              console.log("filteredArray", filteredArray.length);
              HostelBasedEb =
                filteredArray.length + 1 !== 0
                  ? existingData[i].ebBill == null
                    ? 0
                    : Number(
                        existingData[i].ebBill / (filteredArray.length + 1)
                      )
                  : 0;
              roomBasedEb = 0;
            } else {
              let tempArray = users.filter((Item) => {
                return (
                  Item.Hostel_Id == existingData[i].roomHostel_Id &&
                  Item.Floor == existingData[i].roomFloor_Id &&
                  Item.Rooms == existingData[i].roomRoom_Id &&
                  Item.isActive == 1
                );
              });
              console.log("tempArray", tempArray.length);
              if (tempArray.length > 0) {
                roomBasedEb = existingData[i].ebBill / (tempArray.length + 1);
                HostelBasedEb = 0;
              }
            }

            connection.query(
              `SELECT * FROM Amenities WHERE Hostel_Id = ${existingData[i].hosHostel_Id}`,
              function (err, amenitiesData) {
                if (err) {
                  console.log(
                    "Error occurred while fetching amenities data:",
                    err
                  );
                } else {
                  if (amenitiesData.length > 0) {
                    for (let j = 0; j < amenitiesData.length; j++) {
                      if (
                        amenitiesData[j].setAsDefault === 0 &&
                        amenitiesData[j].Status === 1
                      ) {
                        totalAmenitiesAmount += amenitiesData[j].Amount;
                      } else {
                        dedctAmenitiesAmount += amenitiesData[j].Amount;
                        console.log(
                          "dedctAmenitiesAmount",
                          dedctAmenitiesAmount
                        );
                      }
                    }
                  }

                  AdvanceAmount =
                    (roomPrice / moment(formattedCheckOutDate).daysInMonth()) *
                      Number(numberOfDays) +
                    totalAmenitiesAmount +
                    HostelBasedEb +
                    roomBasedEb;
                  console.log("AdvanceAmount", AdvanceAmount);
                  console.log("totalAmenitiesAmount", totalAmenitiesAmount);
                  console.log("TempOBject", tempObj);

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
                    AdvanceAmount: AdvanceAmount,
                  };
                  finalArray.push(tempObj);

                  if (i === existingData.length - 1) {
                    insertCheckOutInvoices(finalArray, user, connection);
                  }
                }
              }
            );
          }
        }
      }
    }
  );
}

function insertCheckOutInvoices(finalArray, user, connection) {
  for (let i = 0; i < finalArray.length; i++) {
    const invoiceDate = new Date(finalArray[i].invoiceDate);

    const year = invoiceDate.getFullYear();

    const month = invoiceDate.getMonth() + 1;

    const checkQuery = `SELECT COUNT(*) AS count FROM invoicedetails WHERE User_Id = '${user.User_Id}' AND MONTH(Date) = ${month} AND YEAR(Date) = ${year}`;

    connection.query(checkQuery, function (checkError, checkResult) {
      if (checkError) {
        console.error("Error checking for existing invoice:", checkError);
        return;
      }

      if (checkResult[0].count === 0) {
        const query = `INSERT INTO invoicedetails(Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based,Bed) VALUES ('${user.Name}', ${user.Phone}, '${user.Email}', '${user.HostelName}', ${user.Hostel_Id}, ${user.Floor}, ${user.Rooms}, ${finalArray[i].AdvanceAmount}, '${user.Address}', '${finalArray[i].invoiceDate}', '${finalArray[i].dueDate}', '${finalArray[i].invoiceNo}', '${user.Status}', '${user.User_Id}', ${finalArray[i].roomPrice}, ${finalArray[i].ebBill}, ${finalArray[i].totalAmenitiesAmount}, ${finalArray[i].dedctAmenitiesAmount}, ${finalArray[i].HostelBasedEb}, ${finalArray[i].roomBasedEb},${user.Bed})`;

        connection.query(query, function (error, data) {
          if (error) {
            console.error(
              "Error inserting invoice data for user:",
              user.User_Id,
              error
            );
            return;
          }
        });
      } else {
        console.log(
          "Invoice already exists for User_Id:",
          user.User_Id,
          "and Date:",
          finalArray[i].invoiceDate
        );
      }
    });
  }
}

//  Manual Invoice

function InsertManualInvoice(connection, users, reqData, ParticularUser) {
  let DateOfInvoice = reqData.DateOfInvoice
    ? moment(reqData.DateOfInvoice).format("YYYY-MM-DD")
    : moment().subtract(1, "month").startOf("month").format("YYYY-MM-DD");
  console.log("DateOfInvoice", DateOfInvoice);

  let month = moment(DateOfInvoice).format("MM");
  let year = moment(DateOfInvoice).format("YYYY");

  console.log("Month:", month);
  console.log("Year:", year);

  connection.query(
    `
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
            hstl.User_Id = '${reqData.User_Id}'`,
    function (err, existingData) {
      console.log(" existingData", existingData);
      if (err) {
        console.error("Error fetching hosteldetails:", err);
        return;
      } else {
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

            const currentDate = moment().format("YYYY-MM-DD");
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

            dueDate = moment(DateOfInvoice).endOf("month").format("YYYY-MM-DD");
            invoiceDate = moment(DateOfInvoice).format("YYYY-MM-DD");

            console.log("invoiceDate", invoiceDate);
            const formattedJoinDate = moment(invoiceDate).format("YYYY-MM-DD");
            const formattedDueDate = moment(dueDate).format("YYYY-MM-DD");
            const numberOfDays =
              moment(formattedDueDate).diff(moment(formattedJoinDate), "days") +
              1;

            console.log("numberOfDays Manual Api", numberOfDays);

            let invoiceNo;
            const userID = ParticularUser[0].User_Id.toString().slice(0, 4);
            if (
              existingData[i].prefix !== "" &&
              existingData[i].suffix !== "" &&
              existingData[i].prefix != "undefined" &&
              existingData[i].suffix != "undefined" &&
              existingData[i].prefix !== null &&
              existingData[i].suffix !== null
            ) {
              invoiceNo =
                existingData[i].prefix +
                existingData[i].suffix +
                ParticularUser[0].Name +
                currentMonth +
                currentYear;
            } else {
              invoiceNo = "INVC" + currentMonth + currentYear + userID;
            }

            const month = moment(new Date()).month() + 1;
            const year = moment(new Date()).year();
            if (existingData[i].isHostelBased === 1) {
              let filteredArray = users.filter((item) => {
                console.log("Users", item);
                return (
                  item.Hostel_Id == existingData[i].roomHostel_Id &&
                  item.isActive == 1
                );
              });
              console.log("filteredArray", filteredArray);
              console.log("ebBill", existingData[i].ebBill);
              HostelBasedEb =
                filteredArray.length !== 0
                  ? existingData[i].ebBill == null
                    ? 0
                    : Number(existingData[i].ebBill / filteredArray.length)
                  : 0;
              roomBasedEb = 0;
            } else {
              let tempArray = users.filter((Item) => {
                return (
                  Item.Hostel_Id == existingData[i].roomHostel_Id &&
                  Item.Floor == existingData[i].roomFloor_Id &&
                  Item.Rooms == existingData[i].roomRoom_Id &&
                  Item.isActive == 1
                );
              });
              if (tempArray.length > 0) {
                roomBasedEb = existingData[i].ebBill / tempArray.length;
                HostelBasedEb = 0;
              }

              // console.log("tempArray", tempArray)
            }

            connection.query(
              `SELECT * FROM Amenities WHERE Hostel_Id = ${existingData[i].hosHostel_Id}`,
              function (err, amenitiesData) {
                if (err) {
                  console.log(
                    "Error occurred while fetching amenities data:",
                    err
                  );
                } else {
                  if (amenitiesData.length > 0) {
                    for (let j = 0; j < amenitiesData.length; j++) {
                      if (
                        amenitiesData[j].setAsDefault === 0 &&
                        amenitiesData[j].Status === 1
                      ) {
                        totalAmenitiesAmount += amenitiesData[j].Amount;
                      } else {
                        dedctAmenitiesAmount += amenitiesData[j].Amount;
                        console.log(
                          "dedctAmenitiesAmount",
                          dedctAmenitiesAmount
                        );
                      }
                    }
                  }

                  AdvanceAmount =
                    (roomPrice / moment(dueDate).daysInMonth()) *
                      Number(numberOfDays) +
                    totalAmenitiesAmount +
                    HostelBasedEb +
                    roomBasedEb;

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
                    AdvanceAmount: AdvanceAmount,
                  };
                  finalArray.push(tempObj);

                  if (i === existingData.length - 1) {
                    insertManualInvoices(
                      finalArray,
                      ParticularUser,
                      connection
                    );
                  }
                }
              }
            );
          }
        }
      }
    }
  );
}

function insertManualInvoices(finalArray, ParticularUser, connection, reqData) {
  for (let i = 0; i < finalArray.length; i++) {
    const invoiceDate = new Date(finalArray[i].invoiceDate);

    const year = invoiceDate.getFullYear();

    const month = invoiceDate.getMonth() + 1;

    const checkQuery = `SELECT COUNT(*) AS count FROM Invoice_Details_For_All WHERE User_Id = '${ParticularUser[0].User_Id}' AND MONTH(Date) = ${month} AND YEAR(Date) = ${year}`;

    connection.query(checkQuery, function (checkError, checkResult) {
      if (checkError) {
        console.error("Error checking for existing invoice:", checkError);
        return;
      }

      if (checkResult[0].count === 0) {
        let query = `INSERT INTO Invoice_Details_For_All (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount,Amnities_deduction_Amount, Hostel_Based, Room_Based,Bed) VALUES ('${ParticularUser[0].Name}', ${ParticularUser[0].Phone}, '${ParticularUser[0].Email}', '${ParticularUser[0].HostelName}', ${ParticularUser[0].Hostel_Id}, ${ParticularUser[0].Floor}, ${ParticularUser[0].Rooms}, ${finalArray[i].AdvanceAmount}, '${ParticularUser[0].Address}', '${finalArray[i].invoiceDate}', '${finalArray[i].dueDate}', '${finalArray[i].invoiceNo}', '${ParticularUser[0].Status}', '${ParticularUser[0].User_Id}', ${finalArray[i].roomPrice}, ${finalArray[i].ebBill}, ${finalArray[i].totalAmenitiesAmount},${finalArray[i].dedctAmenitiesAmount}, ${finalArray[i].HostelBasedEb}, ${finalArray[i].roomBasedEb},${ParticularUser[0].Bed})`;

        connection.query(query, function (error, data) {
          if (error) {
            console.error(
              "Error inserting invoice data for user:",
              reqData.User_Id,
              error
            );
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
      response.status(403).json({ message: "not connected" });
    } else {
      response.status(200).json({ data: data });
    }
  });
}

function getInvoiceList(connection, response, request) {
  const userDetails = request.user_details;
  const sql1 = `SELECT hstlDetails.*,invoice.*,hos.profile as user_profile,hstlDetails.profile AS hostel_profile FROM hosteldetails hstlDetails inner join invoicedetails  invoice  on invoice.Hostel_Id=hstlDetails.id JOIN hostel as hos ON hos.ID=invoice.hos_user_id WHERE hstlDetails.created_By ='${userDetails.id}' ORDER BY invoice.id DESC`;
  connection.query(sql1, function (error, data) {
    if (error) {
      response.status(403).json({ message: "not connected" });
    } else {
      response.status(200).json({ data: data });
    }
  });
}

function embedImage(doc, imageUrl, fallbackPath, callback) {
  console.log(`Fetching image from URL: ${imageUrl}`);
  if (!imageUrl) {
    console.log("Image URL is empty. Using fallback image.");
    doc.image(fallbackPath, {
      fit: [80, 100],
      align: "center",
      valign: "top",
      margin: 50,
    });
    callback(new Error("Image URL is empty"));
    return;
  }

  request({ url: imageUrl, encoding: null }, async (error, response, body) => {
    if (error) {
      doc.image(fallbackPath, {
        fit: [80, 100],
        align: "center",
        valign: "top",
        margin: 50,
      });
      callback(error);
    } else if (response && response.statusCode === 200) {
      try {
        const imageBuffer = Buffer.from(body, "base64");
        const convertedImageBuffer = await convertImage(imageBuffer);

        doc.image(convertedImageBuffer, {
          fit: [50, 70],
          align: "center",
          valign: "top",
          margin: 10,
          continue: true,
        });

        callback(null, convertedImageBuffer);
      } catch (conversionError) {
        doc.image(fallbackPath, {
          fit: [80, 100],
          align: "center",
          valign: "top",
          margin: 50,
        });
        callback(conversionError);
      }
    } else {
      doc.image(fallbackPath, {
        fit: [80, 100],
        align: "center",
        valign: "top",
        margin: 50,
      });
      callback(
        new Error(`Failed to fetch image. Status code: ${response.statusCode}`)
      );
    }
  });
}

async function convertImage(imageBuffer) {
  const convertedImageBuffer = await sharp(imageBuffer).jpeg().toBuffer();

  return convertedImageBuffer;
}

function InvoicePDf(connection, request, response) {
  // console.log("reqBodyData", reqBodyData)

  var reqBodyData = request.body;

  var invocice_type = reqBodyData.invoice_type;
  var action_type = reqBodyData.action_type;

  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[10] && role_permissions[10].per_view === 1)
  ) {
    if (!action_type) {
      var action_type = "manual";
    }

    if (!invocice_type || invocice_type == undefined) {
      var invocice_type = 1;
    }

    // if (action_type == 'manual') {

    var sql2 = "SELECT * FROM invoicedetails WHERE id=?";
    connection.query(sql2, [reqBodyData.id], function (err, sel2_res) {
      if (err) {
        return response
          .status(201)
          .json({ message: "Unable to Get Invoice Details", statusCode: 201 });
      } else if (sel2_res.length == 0) {
        return response
          .status(201)
          .json({ message: "Invalid Invoice Details", statusCode: 201 });
      }

      var inv_details = sel2_res[0];
      var action = inv_details.action;

      var sql1 =
        "SELECT inv.*,man.*,hsv.email_id AS hostel_email,hsv.hostel_PhoneNo AS hostel_phone,hsv.area AS harea,hsv.landmark AS hlandmark,hsv.pin_code AS hpincode, hsv.state AS hstate,hsv.city AS hcity,hsv.Address AS hostel_address,hsv.profile AS hostel_profile,hs.Address AS user_address,hs.area AS uarea,hs.landmark AS ulandmark,hs.pincode AS upincode, hs.state AS ustate,hs.city AS ucity,hs.joining_Date,Insett.bankingId,Insett.privacyPolicyHtml,ban.acc_num,ban.ifsc_code,ban.acc_name,ban.upi_id FROM invoicedetails AS inv JOIN hostel AS hs ON hs.ID=inv.hos_user_id LEFT JOIN manual_invoice_amenities AS man ON man.invoice_id=inv.id JOIN hosteldetails AS hsv ON hsv.id=inv.Hostel_Id LEFT JOIN InvoiceSettings AS Insett ON Insett.hostel_Id=hsv.id LEFT JOIN bankings AS ban ON ban.id=Insett.bankingId WHERE inv.id=?";
      connection.query(sql1, [reqBodyData.id], async function (err, inv_data) {
        if (err) {
          return response
            .status(201)
            .json({
              message: "Unable to Get Invoice Details",
              statusCode: 201,
            });
        } else if (inv_data.length != 0) {
          const currentDate = moment().format("YYYY-MM-DD");
          const currentMonth = moment(currentDate).month() + 1;
          const currentYear = moment(currentDate).year();
          const currentTime = moment().format("HHmmss");

          const filename = `INV${currentMonth}${currentYear}${currentTime}${inv_data[0].User_Id}.pdf`;
          const outputPath = path.join(__dirname, filename);

          const pdfPath = await generateManualPDF(
            inv_data,
            outputPath,
            filename,
            action
          );

          response
            .status(200)
            .json({ message: "Insert PDF successfully", pdf_url: pdfPath });
        } else {
          return response
            .status(201)
            .json({ message: "Invalid Invoice Details", statusCode: 201 });
        }
      });
    });

    // } else {

    //     if (invocice_type == 2) {
    //         const sql1 = `
    //     SELECT hostel.isHostelBased, invoice.Floor_Id, invoice.Room_No, invoice.Hostel_Id as Inv_Hostel_Id,invoice.PaidAmount,invoice.BalanceDue,invoice.Amount AS inv_amount,
    //     hostel.id as Hostel_Id, invoice.RoomRent, invoice.EbAmount, invoice.id, invoice.Name as UserName,
    //     invoice.User_Id, invoice.UserAddress, invoice.Invoices, invoice.DueDate, invoice.Date,invoice.PaidAmount,
    //     hostel.hostel_PhoneNo, hostel.Address as HostelAddress, hostel.Name as Hostel_Name,
    //     hostel.email_id as HostelEmail_Id, hostel.profile as Hostel_Logo, invoice.Amount
    //     FROM invoicedetails invoice
    //     INNER JOIN hosteldetails hostel ON hostel.id = invoice.Hostel_Id
    //     WHERE invoice.User_Id = ? AND invoice.id = ?`;
    //         // console.log(sql1);

    //         connection.query(sql1, [reqBodyData.User_Id, reqBodyData.id], async (err, data) => {
    //             console.log("datadata", data)
    //             if (err) {
    //                 console.error('SQL query error:', err);
    //                 return;
    //             }

    //             if (data.length === 0) {
    //                 console.log('No data found');
    //                 return;
    //             }

    //             generatePDF(data[0]);
    //             // response.status(200).json({ message: 'Insert PDF successfully' });
    //         });
    //     }
    //     else {
    //         connection.query(`SELECT hos.User_Id,hostel.isHostelBased, invoice.Floor_Id, invoice.Room_No ,invoice.Hostel_Id as Inv_Hostel_Id ,invoice.PaidAmount,invoice.BalanceDue,hostel.id as Hostel_Id,invoice.RoomRent AS inv_amount,invoice.EbAmount, invoice.id, invoice.Name as UserName,invoice.invoice_type,invoice.AmnitiesAmount,invoice.User_Id,invoice.UserAddress,invoice.PaidAmount, invoice.Invoices,invoice.DueDate, invoice.Date, hostel.hostel_PhoneNo,hostel.Address as HostelAddress,hostel.Name as Hostel_Name,hostel.email_id as HostelEmail_Id , hostel.profile as Hostel_Logo ,invoice.Amount,hstlroom.Hostel_Id AS roomHostel_Id ,hstlroom.Floor_Id AS roomFloor_Id,hstlroom.Room_Id AS roomRoom_Id,hos.Hostel_Id AS hoshostel_id,hos.Floor AS hosfloor,hos.Rooms AS hosrooms,hos.createdAt,hos.User_Id FROM invoicedetails invoice INNER JOIN hosteldetails hostel INNER JOIN hostelrooms hstlroom INNER JOIN hostel hos on hostel.id = invoice.Hostel_Id WHERE hos.User_Id =? AND DATE(invoice.Date) = ? AND invoice.id = ? AND hos.isActive = 1 group by hos.id`,

    //             [reqBodyData.User_Id, reqBodyData.Date, reqBodyData.id], function (error, data) {
    //                 console.log("data", data)
    //                 if (error) {
    //                     console.log(error);
    //                     response.status(500).json({ message: 'Internal server error' });
    //                 } else if (data.length > 0) {
    //                     console.log("data[0].AmnitiesAmount", data[0].invoice_type)
    //                     // return

    //                     if (data[0].EbAmount == 0 && data[0].invoice_type == 1 && data[0].AmnitiesAmount == 0) {
    //                         generatePDF(data[0]);
    //                         // response.status(200).json({ message: 'Insert PDF successfully' });

    //                         console.log("vghghjhjh")
    //                     }

    //                     else {
    //                         data.forEach((hostel, index) => {
    //                             console.log("hostel", hostel)
    //                             let breakUpTable = []
    //                             const currentDate = moment().format('YYYY-MM-DD');
    //                             const joinDate = moment(hostel.createdAt).format('YYYY-MM-DD');
    //                             const currentMonth = moment(currentDate).month() + 1;
    //                             const currentYear = moment(currentDate).year();
    //                             const createdAtMonth = moment(joinDate).month() + 1;
    //                             const createdAtYear = moment(joinDate).year();
    //                             let dueDate, invoiceDate;

    //                             if (currentMonth === createdAtMonth && currentYear === createdAtYear) {
    //                                 dueDate = moment(joinDate).endOf('month').format('YYYY-MM-DD');
    //                                 invoiceDate = moment(joinDate).format('YYYY-MM-DD');
    //                             } else {
    //                                 dueDate = moment(currentDate).endOf('month').format('YYYY-MM-DD');
    //                                 invoiceDate = moment(currentDate).startOf('month').format('YYYY-MM-DD');
    //                             }

    //                             const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
    //                             const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
    //                             const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;
    //                             console.log("numberOfDays,,,,,,ere", numberOfDays)

    //                             const JoiningWiseRoomRent = (hostel.RoomRent / moment(dueDate).daysInMonth()) * numberOfDays
    //                             console.log("JoiningWiseRoomRent", hostel.RoomRent)

    //                             let RoomRent = {
    //                                 Rent: Math.round(JoiningWiseRoomRent),

    //                             }
    //                             console.log("RoomRent....?112", RoomRent)
    //                             breakUpTable.push(RoomRent)
    //                             connection.query(`select * from Amenities AmeList INNER JOIN AmnitiesName AmeName ON AmeList.Amnities_Id = AmeName.id  where AmeList.Hostel_Id = \'${hostel.Hostel_Id} \'`, async function (error, Amenitiesdata) {

    //                                 if (Amenitiesdata.length > 0) {
    //                                     for (let i = 0; i < Amenitiesdata.length; i++) {
    //                                         const tempObj = {};
    //                                         if (Amenitiesdata[i].setAsDefault == 0 && Amenitiesdata[i].Status == 1) {
    //                                             tempObj[Amenitiesdata[i].Amnities_Name] = Amenitiesdata[i].Amount
    //                                         } else if (Amenitiesdata[i].setAsDefault == 1 && Amenitiesdata[i].Status == 1) {
    //                                             tempObj[Amenitiesdata[i].Amnities_Name] = Amenitiesdata[i].Amount;
    //                                             RoomRent.Rent -= Amenitiesdata[i].Amount;
    //                                             console.log("Amenitiesdata[i].Amount", Amenitiesdata[i].Amount)
    //                                         }
    //                                         breakUpTable.push(tempObj);

    //                                     }
    //                                 }
    //                                 else {
    //                                 }
    //                                 connection.query(`select * from hostel where  isActive =1`, async function (error, hosdata) {
    //                                     console.log("hosdata", hosdata.length)

    //                                     let hostelbasedEb = 0;
    //                                     let roombasedEb = 0;
    //                                     let eb_amount_total;
    //                                     let eb_Hostel = 0
    //                                     let AdvanceAmount = 0;
    //                                     const previousMonthDate = moment().subtract(1, 'months');
    //                                     const previousMonth = previousMonthDate.month() + 1; // month() is zero-based
    //                                     const previousYear = previousMonthDate.year();

    //                                     if (data[0].isHostelBased === 1) {
    //                                         // Get the previous month's date
    //                                         const previousMonthDate = moment().subtract(1, 'months');
    //                                         const previousMonth = previousMonthDate.month() + 1; // month() is zero-based
    //                                         const previousYear = previousMonthDate.year();

    //                                         console.log("Previous Month:", previousMonth, "Previous Year:", previousYear);

    //                                         // Filter users based on the Hostel_Id and createdAt month/year being the previous month/year
    //                                         let filteredArray = hosdata.filter(item => {
    //                                             const createdAtDate = moment(item.createdAt);
    //                                             if (!createdAtDate.isValid()) {
    //                                                 console.error("Invalid date:", item.createdAt);
    //                                                 return false;
    //                                             }

    //                                             const createdAtMonth = createdAtDate.month() + 1; // moment.js months are 0-based
    //                                             const createdAtYear = createdAtDate.year();

    //                                             return item.Hostel_Id == data[0].Hostel_Id && createdAtMonth === previousMonth && createdAtYear === previousYear;
    //                                         });

    //                                         console.log("filteredArray.length", filteredArray.length);

    //                                         if (filteredArray.length > 0) {
    //                                             let totalNumberOfDays = 0;

    //                                             // Map through filtered users to calculate the number of days and amounts
    //                                             let userDayAmounts = filteredArray.map(user => {
    //                                                 const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
    //                                                 const dueDate = previousMonthDate.endOf('month').format('YYYY-MM-DD');
    //                                                 const invoiceDate = moment(joinDate).format('YYYY-MM-DD');
    //                                                 const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
    //                                                 const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
    //                                                 const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

    //                                                 totalNumberOfDays += numberOfDays;

    //                                                 return { numberOfDays: numberOfDays, hostel_id: user.Hostel_Id, user_id: user.User_Id };
    //                                             });

    //                                             // Calculate the room base cost per day
    //                                             const roombase = data[0].EbAmount / totalNumberOfDays;

    //                                             console.log(userDayAmounts, "<<<<<<<<<<<<<<<<<<.............>>>>>>>>>>>>>>>>>>>>>");

    //                                             // Calculate the amount each user owes
    //                                             let userAmounts = userDayAmounts.map(user => ({
    //                                                 user_id: user.user_id,
    //                                                 hostel_id: user.hostel_id,
    //                                                 amount: roombase * user.numberOfDays
    //                                             }));

    //                                             console.log("User Amounts:", userAmounts);
    //                                             console.log(reqBodyData.User_Id, "tytyy");

    //                                             let userAmount = userAmounts.find(x => x.user_id === reqBodyData.User_Id);

    //                                             console.log(userAmount, ";;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;;");

    //                                             eb_Hostel = userAmount ? userAmount.amount.toFixed() : 0;

    //                                             console.log("EB Hostel:", eb_Hostel);

    //                                             breakUpTable.push({ EbAmount: eb_Hostel });
    //                                         } else {
    //                                             eb_Hostel = 0;
    //                                             breakUpTable.push({ EbAmount: eb_Hostel });
    //                                         }

    //                                         generatePDFFor(breakUpTable, hosdata, hostel, data, response, connection);
    //                                     } else {
    //                                         let tempArray = hosdata.filter(item => {
    //                                             const createdAtDate = moment(item.createdAt);
    //                                             const createdAtMonth = createdAtDate.month() + 1; // month() is zero-based
    //                                             const createdAtYear = createdAtDate.year();
    //                                             return item.Hostel_Id == data[0].Hostel_Id && item.Floor == data[0].Floor_Id && item.Rooms == data[0].Room_No && createdAtMonth === previousMonth && createdAtYear === previousYear;
    //                                         });
    //                                         console.log("tempArray", tempArray);

    //                                         if (tempArray.length > 0) {
    //                                             let totalNumberOfDays = 0;

    //                                             let userDayAmounts = tempArray.map(user => {
    //                                                 const joinDate = moment(user.createdAt).format('YYYY-MM-DD');
    //                                                 const dueDate = previousMonthDate.endOf('month').format('YYYY-MM-DD');
    //                                                 const invoiceDate = moment(joinDate).format('YYYY-MM-DD');
    //                                                 const formattedJoinDate = moment(invoiceDate).format('YYYY-MM-DD');
    //                                                 const formattedDueDate = moment(dueDate).format('YYYY-MM-DD');
    //                                                 const numberOfDays = moment(formattedDueDate).diff(moment(formattedJoinDate), 'days') + 1;

    //                                                 totalNumberOfDays += numberOfDays;

    //                                                 return { numberOfDays: numberOfDays, hostel_id: user.Hostel_Id, user_id: user.User_Id };
    //                                             });

    //                                             const roombase = data[0].EbAmount / totalNumberOfDays;

    //                                             let userAmounts = userDayAmounts.map(user => ({
    //                                                 user_id: user.user_id,
    //                                                 amount: roombase * user.numberOfDays
    //                                             }));

    //                                             console.log("User Amounts:", userAmounts);
    //                                             console.log(reqBodyData.User_Id, "[][][][][][][]");
    //                                             let userAmount = userAmounts.find(x => x.user_id === reqBodyData.User_Id);

    //                                             eb_amount_total = userAmount ? userAmount.amount.toFixed() : 0;
    //                                             console.log("eb_amount_total123", eb_amount_total);

    //                                             breakUpTable.push({ EbAmount: eb_amount_total });
    //                                         } else {
    //                                             eb_amount_total = 0;
    //                                             breakUpTable.push({ EbAmount: eb_amount_total });
    //                                         }

    //                                         eb_Hostel = 0;
    //                                         generatePDFFor(breakUpTable, hosdata, hostel, data, response, connection);
    //                                     }

    //                                     console.log(eb_Hostel, "Ending Eb AMount.....?");
    //                                 })
    //                             })

    //                         })
    //                     }

    //                 } else {
    //                     response.status(404).json({ message: 'No data found' });
    //                 }

    //             });
    //     }
    // }

    const generatePDF = async (inv_data) => {
      try {
        const htmlFilePath = path.join(
          __dirname,
          "mail_templates",
          "invoicepdf.html"
        );
        let htmlContent = fs.readFileSync(htmlFilePath, "utf8");

        const amountInWords = converter.toWords(inv_data.PaidAmount);
        // console.log("amountInWords", amountInWords)
        const currentTimeFormatted = moment().format("hh:mm A");
        // console.log("currentTimeFormatted", currentTimeFormatted)
        const defaultLogoPath =
          "https://smartstaydevs.s3.ap-south-1.amazonaws.com/Logo/Logo141717749724216.jpg";
        var logoPathimage = inv_data.Hostel_Logo
          ? inv_data.Hostel_Logo
          : defaultLogoPath;
        // console.log(logoPathimage);
        const invdate = moment(inv_data.Date).format("DD/MM/YYYY");
        htmlContent = htmlContent
          .replace("{{hostal_name}}", inv_data.Hostel_Name)
          .replace("{{city}}", inv_data.HostelAddress)
          .replace("{{Phone}}", inv_data.hostel_PhoneNo)
          .replace("{{email}}", inv_data.HostelEmail_Id)
          .replace("{{user_name}}", inv_data.UserName)
          .replace("{{user_address}}", inv_data.UserAddress)
          .replace("{{invoice_number}}", inv_data.Invoices)
          .replace("{{invoice_date}}", invdate)
          .replace("{{amount_in_words}}", amountInWords)
          .replace("{{current_time}}", currentTimeFormatted)
          .replace("{{logo}}", logoPathimage)
          .replace("{{paid_amount}}", inv_data.PaidAmount)
          .replace("{{balance_amount}}", inv_data.BalanceDue)
          .replace("{{first_amount}}", inv_data.inv_amount);

        // Determine payment status based on amounts
        let paymentStatusClass = "";
        let paymentStatusText = "";

        if (inv_data.inv_amount === inv_data.BalanceDue) {
          paymentStatusClass = "pending";
          paymentStatusText = "Pending";
        } else if (inv_data.BalanceDue === 0) {
          paymentStatusClass = "success";
          paymentStatusText = "Success";
        } else {
          paymentStatusClass = "partial";
          paymentStatusText = "Partial Paid";
        }

        // Determine amount name based on invoice type
        const amountName =
          inv_data.invoice_type === 1 ? "Rent Amount" : "Advance Amount";

        // Replace all placeholders in the HTML content
        htmlContent = htmlContent
          .replace("{{payment_status_class}}", paymentStatusClass)
          .replace("{{payment_status_text}}", paymentStatusText)
          .replace("{{Amount_name}}", amountName);

        const currentDate = moment().format("YYYY-MM-DD");
        const currentMonth = moment(currentDate).month() + 1;
        const currentYear = moment(currentDate).year();
        const currentTime = moment().format("HHmmss");

        const filename = `INV${currentMonth}${currentYear}${currentTime}${inv_data.User_Id}.pdf`;
        const outputPath = path.join(__dirname, filename);

        const browser = await puppeteer.launch();
        const page = await browser.newPage();

        await page.setContent(htmlContent, { waitUntil: "domcontentloaded" });

        // Generate PDF
        await page.pdf({ path: outputPath, format: "A4" });

        await browser.close();
        console.log("PDF created successfully!");
        var inv_id = inv_data.id;
        await uploadToS3(outputPath, filename, inv_id);
        fs.unlinkSync(outputPath);
      } catch (error) {
        console.error("Error:", error);
      }
    };

    const uploadToS3 = async (filePath, filename, inv_id) => {
      try {
        const fileContent = fs.readFileSync(filePath);

        const key = `Invoice/${filename}`;
        const bucketName = process.env.AWS_BUCKET_NAME;

        const params = {
          Bucket: bucketName,
          Key: key,
          Body: fileContent,
          ContentType: "application/pdf",
        };

        const data = await s3.upload(params).promise();
        console.log("PDF uploaded successfully:", data.Location);

        var sql_query =
          "UPDATE invoicedetails SET invoicePDF='" +
          data.Location +
          "' WHERE id='" +
          inv_id +
          "';";
        connection.query(sql_query, function (err, Data) {
          if (err) {
            console.log(err);
            return;
          } else {
            response
              .status(200)
              .json({
                message: "Insert PDF successfully",
                pdf_url: data.Location,
              });
          }
        });

        return data.Location;
      } catch (err) {
        console.error("Error uploading PDF:", err);
      }
    };
  } else {
    response
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function generatePDFFor(
  breakUpTable,
  hosdata,
  hostel,
  data,
  response,
  connection
) {
  const currentDate = moment().format("YYYY-MM-DD");
  const currentMonth = moment(currentDate).month() + 1;
  const currentYear = moment(currentDate).year();
  const currentTime = moment().format("HHmmss");

  let filenames = [];

  let totalPDFs = data.length;
  let uploadedPDFs = 0;

  let pdfDetails = [];

  breakUpTable = breakUpTable.filter((obj) => Object.keys(obj).length !== 0);
  console.log(" breakUpTable......?...", breakUpTable);
  console.log(
    "////////////-----------------------------////////////////////////"
  );

  const filename = `Invoice${currentMonth}${currentYear}${currentTime}${hostel.User_Id}.pdf`;
  filenames.push(filename);

  const doc = new PDFDocument({ font: "Times-Roman" });
  const stream = doc.pipe(fs.createWriteStream(filename));

  let isFirstPage = true;

  if (!isFirstPage) {
    doc.addPage();
  } else {
    isFirstPage = false;
  }

  const hostelNameWidth = doc.widthOfString(hostel.Hostel_Name);
  const leftMargin = doc.page.width - hostelNameWidth - 1000;
  const textWidth = doc.widthOfString("Invoice Receipt");
  const textX = doc.page.width - textWidth - 500;
  const invoiceNoWidth = doc.widthOfString("Invoice No");
  const invoiceDateWidth = doc.widthOfString("Invoice Date");

  const rightMargin = doc.page.width - invoiceNoWidth - 50;
  const marginLeft = 30;
  const marginRight = doc.page.width / 2;
  const logoWidth = 100;
  const logoHeight = 100;
  const logoStartX = marginLeft;
  const logoStartY = doc.y;
  const textStartX = doc.page.width - rightMargin - textWidth;
  const textStartY = doc.y;
  const logoPath = "./Asset/Logo.jpeg";
  if (hostel.Hostel_Logo) {
    embedImage(doc, hostel.Hostel_Logo, logoPath, (error, body) => {
      if (error) {
        console.error(error);
      } else {
        doc
          .fontSize(10)
          .font("Times-Roman")
          .text(hostel.Hostel_Name.toUpperCase(), textStartX, textStartY, {
            align: "right",
          })
          .moveDown(0.1);
        doc
          .fontSize(10)
          .font("Times-Roman")
          .text(hostel.HostelAddress, textStartX, doc.y, { align: "right" })
          .text(hostel.hostel_PhoneNo, textStartX, doc.y, { align: "right" })
          .text(`Email : ${hostel.HostelEmail_Id}`, textStartX, doc.y, {
            align: "right",
          })
          .text("Website: example@smartstay.ae", textStartX, doc.y, {
            align: "right",
          })
          .text("GSTIN:", textStartX, doc.y, { align: "right" })
          .moveDown(2);

        doc
          .fontSize(14)
          .font("Helvetica")
          .text("Invoice Receipt", textX, doc.y, { align: "center" })
          .moveDown(0.5);

        const formattedTodayDate = moment().format("DD/MM/YYYY");

        console.log("formattedTodayDate ", formattedTodayDate);

        doc
          .fontSize(10)
          .font("Times-Roman")
          .text(`Name: ${hostel.UserName}`, {
            align: "left",
            continued: true,
            indent: marginLeft,
          })
          .text(`Invoice No: ${hostel.Invoices}`, {
            align: "right",
            indent: marginRight,
          })
          .moveDown(0.5);

        doc
          .fontSize(10)
          .font("Times-Roman")
          .text(`Address: ${hostel.UserAddress}`, {
            align: "left",
            continued: true,
            indent: marginLeft,
          })
          .text(`Invoice Date: ${formattedTodayDate}`, {
            align: "right",
            indent: marginRight,
          })
          .moveDown(0.5);

        const headers = ["SNo", "Description", "Amount"];
        const tableTop = 250;
        const startX = 50;
        const startY = tableTop;
        const cellPadding = 30;
        const tableWidth = 500;
        const columnWidth = tableWidth / headers.length;
        const marginTop = 80;
        const borderWidth = 1;

        const marginTopForAmount = 80;

        doc
          .rect(startX, startY, tableWidth, cellPadding)
          .fillColor("#b2b5b8")
          .fill()
          .stroke();

        let headerY = startY + cellPadding / 2 - doc.currentLineHeight() / 2;
        headers.forEach((header, index) => {
          const headerX =
            startX +
            columnWidth * index +
            (columnWidth - doc.widthOfString(header)) / 2;
          doc
            .fontSize(10)
            .fillColor("#000000")
            .text(header, headerX, headerY + 5);
        });

        doc
          .rect(
            startX,
            startY,
            tableWidth,
            (breakUpTable.length + 1) * cellPadding
          )
          .stroke();

        for (let rowIndex = 0; rowIndex < breakUpTable.length + 1; rowIndex++) {
          for (let colIndex = 0; colIndex < headers.length; colIndex++) {
            const cellX = startX + columnWidth * colIndex;
            const cellY = startY + cellPadding * rowIndex;

            doc.rect(cellX, cellY, columnWidth, cellPadding).stroke();
          }
        }

        let serialNumber = 1;
        let dataY =
          startY + cellPadding + cellPadding / 2 - doc.currentLineHeight() / 2;
        breakUpTable.forEach((row, rowIndex) => {
          console.log("row......?", row);
          let isEmptyRow = true;

          const serialX =
            startX +
            (columnWidth - doc.widthOfString(serialNumber.toString())) / 2;
          doc
            .fontSize(10)
            .fillColor("#000000")
            .text(serialNumber.toString(), serialX, dataY + 5);

          serialNumber++;

          // To keep track of the current column index
          let colIndex = 0;
          Object.entries(row).forEach(([description, price]) => {
            if (price !== undefined) {
              isEmptyRow = false;
              const cellX =
                startX +
                columnWidth * (colIndex + 1) +
                (columnWidth - doc.widthOfString(description)) / 2;
              doc.fontSize(10).text(description, cellX, dataY + 5);
              const priceX =
                startX +
                columnWidth * (colIndex + 2) +
                (columnWidth - doc.widthOfString(price.toString())) / 2;
              doc.fontSize(10).text(price.toString(), priceX, dataY + 5);
            }
            colIndex++;
          });

          if (!isEmptyRow) {
            dataY += cellPadding;
          }
        });

        dataY += cellPadding;

        const gapWidth = 120;
        doc
          .fontSize(10)
          .font("Times-Roman")
          .text("Total Amount", textX, doc.y + 20, {
            align: "center",
            continued: true,
          })
          .text(" ".repeat(gapWidth), { continued: true })
          .text(hostel.Amount.toFixed(2));

        doc
          .fontSize(10)
          .text(
            "We have received your payment of " +
              convertAmountToWords(hostel.Amount.toFixed(0)) +
              " Rupees and Zero Paise at " +
              moment().format("hh:mm A"),
            startX,
            dataY + 20,
            { align: "left", wordSpacing: 1.5 }
          );

        dataY += 20;

        doc
          .fontSize(9)
          .text(
            "This is a system generated receipt and no signature is required.",
            startX,
            dataY + marginTop,
            { align: "center", wordSpacing: 1, characterSpacing: 0.5 }
          );

        doc.end();

        stream.on("finish", function () {
          console.log(`PDF generated successfully for ${hostel.UserName}`);
          const fileContent = fs.readFileSync(filename);
          pdfDetails.push({
            filename: filename,
            fileContent: fs.readFileSync(filename),
            user: hostel.User_Id,
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
      align: "center",
      valign: "top",
      margin: 50,
    });

    doc
      .fontSize(10)
      .font("Times-Roman")
      .text(hostel.Hostel_Name.toUpperCase(), textStartX, textStartY, {
        align: "right",
      })
      .moveDown(0.1);
    doc
      .fontSize(10)
      .font("Times-Roman")
      .text(hostel.HostelAddress, textStartX, doc.y, { align: "right" })
      .text(hostel.hostel_PhoneNo, textStartX, doc.y, { align: "right" })
      .text(`Email : ${hostel.HostelEmail_Id}`, textStartX, doc.y, {
        align: "right",
      })
      .text("Website: example@smartstay.ae", textStartX, doc.y, {
        align: "right",
      })
      .text("GSTIN:", textStartX, doc.y, { align: "right" })
      .moveDown(2);

    doc
      .fontSize(14)
      .font("Helvetica")
      .text("Invoice Receipt", textX, doc.y, { align: "center" })
      .moveDown(0.5);

    const formattedTodayDate = moment().format("DD/MM/YYYY");

    doc
      .fontSize(10)
      .font("Times-Roman")
      .text(`Name: ${hostel.UserName}`, {
        align: "left",
        continued: true,
        indent: marginLeft,
      })
      .text(`Invoice No: ${hostel.Invoices}`, {
        align: "right",
        indent: marginRight,
      })
      .moveDown(0.5);

    doc
      .fontSize(10)
      .font("Times-Roman")
      .text(`Address: ${hostel.UserAddress}`, {
        align: "left",
        continued: true,
        indent: marginLeft,
      })
      .text(`Invoice Date: ${formattedTodayDate}`, {
        align: "right",
        indent: marginRight,
      })
      .moveDown(0.5);

    const headers = ["SNo", "Description", "Amount"];
    const tableTop = 250;
    const startX = 50;
    const startY = tableTop;
    const cellPadding = 30;
    const tableWidth = 500;
    const columnWidth = tableWidth / headers.length;
    const marginTop = 80;
    const borderWidth = 1;

    const marginTopForAmount = 80;

    doc
      .rect(startX, startY, tableWidth, cellPadding)
      .fillColor("#b2b5b8")
      .fill()
      .stroke();

    let headerY = startY + cellPadding / 2 - doc.currentLineHeight() / 2;
    headers.forEach((header, index) => {
      const headerX =
        startX +
        columnWidth * index +
        (columnWidth - doc.widthOfString(header)) / 2;
      doc
        .fontSize(10)
        .fillColor("#000000")
        .text(header, headerX, headerY + 5);
    });

    doc
      .rect(startX, startY, tableWidth, (breakUpTable.length + 1) * cellPadding)
      .stroke();

    for (let rowIndex = 0; rowIndex < breakUpTable.length + 1; rowIndex++) {
      for (let colIndex = 0; colIndex < headers.length; colIndex++) {
        const cellX = startX + columnWidth * colIndex;
        const cellY = startY + cellPadding * rowIndex;

        doc.rect(cellX, cellY, columnWidth, cellPadding).stroke();
      }
    }

    let serialNumber = 1;
    let dataY =
      startY + cellPadding + cellPadding / 2 - doc.currentLineHeight() / 2;
    breakUpTable.forEach((row, rowIndex) => {
      console.log("row......?", row);
      let isEmptyRow = true;

      const serialX =
        startX + (columnWidth - doc.widthOfString(serialNumber.toString())) / 2;
      doc
        .fontSize(10)
        .fillColor("#000000")
        .text(serialNumber.toString(), serialX, dataY + 5);

      serialNumber++;

      // To keep track of the current column index
      let colIndex = 0;
      Object.entries(row).forEach(([description, price]) => {
        if (price !== undefined) {
          isEmptyRow = false;
          const cellX =
            startX +
            columnWidth * (colIndex + 1) +
            (columnWidth - doc.widthOfString(description)) / 2;
          doc.fontSize(10).text(description, cellX, dataY + 5);
          const priceX =
            startX +
            columnWidth * (colIndex + 2) +
            (columnWidth - doc.widthOfString(price.toString())) / 2;
          doc.fontSize(10).text(price.toString(), priceX, dataY + 5);
        }
        colIndex++;
      });

      if (!isEmptyRow) {
        dataY += cellPadding;
      }
    });

    dataY += cellPadding;

    const gapWidth = 120;
    doc
      .fontSize(10)
      .font("Times-Roman")
      .text("Total Amount", textX, doc.y + 20, {
        align: "center",
        continued: true,
      })
      .text(" ".repeat(gapWidth), { continued: true })
      .text(hostel.Amount.toFixed(2));

    doc
      .fontSize(10)
      .text(
        "We have received your payment of " +
          convertAmountToWords(hostel.Amount.toFixed(0)) +
          " Rupees and Zero Paise at " +
          moment().format("hh:mm A"),
        startX,
        dataY + 20,
        { align: "left", wordSpacing: 1.5 }
      );

    dataY += 20;

    doc
      .fontSize(9)
      .text(
        "This is a system generated receipt and no signature is required.",
        startX,
        dataY + marginTop,
        { align: "center", wordSpacing: 1, characterSpacing: 0.5 }
      );

    doc.end();

    stream.on("finish", function () {
      console.log(`PDF generated successfully for ${hostel.UserName}`);
      const fileContent = fs.readFileSync(filename);
      pdfDetails.push({
        filename: filename,
        fileContent: fs.readFileSync(filename),
        user: hostel.User_Id,
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
      align: "center",
      valign: "top",
      margin: 50,
    });
    callback(new Error("Image URL is empty"));
    return;
  }

  request({ url: imageUrl, encoding: null }, async (error, response, body) => {
    if (error) {
      doc.image(fallbackPath, {
        fit: [80, 100],
        align: "center",
        valign: "top",
        margin: 50,
      });
      callback(error);
    } else if (response && response.statusCode === 200) {
      try {
        const imageBuffer = Buffer.from(body);
        const convertedImageBuffer = await convertImage(imageBuffer);

        doc.image(convertedImageBuffer, {
          fit: [50, 70],
          align: "center",
          valign: "top",
          margin: 10,
          continue: true,
        });

        callback(null, convertedImageBuffer);
      } catch (conversionError) {
        doc.image(fallbackPath, {
          fit: [80, 100],
          align: "center",
          valign: "top",
          margin: 50,
        });
        callback(conversionError);
      }
    } else {
      doc.image(fallbackPath, {
        fit: [80, 100],
        align: "center",
        valign: "top",
        margin: 50,
      });
      callback(
        new Error(`Failed to fetch image. Status code: ${response.statusCode}`)
      );
    }
  });
}

async function convertImage(imageBuffer) {
  const convertedImageBuffer = await sharp(imageBuffer)
    .toFormat("png")
    .toBuffer();

  return convertedImageBuffer;
}

function uploadToS31(response, pdfDetailsArray, connection) {
  //filenames, response, pdfDetails, connection
  let totalPDFs = pdfDetailsArray.length;
  console.log("totalPDFs", totalPDFs);
  let uploadedPDFs = 0;
  let pdfInfo = [];
  let errorMessage;
  pdfDetailsArray.forEach((pdfDetails) => {
    const { filename, fileContent, user } = pdfDetails;
    const key = `Invoice/${filename}`;
    const BucketName = process.env.AWS_BUCKET_NAME;
    const params = {
      Bucket: BucketName,
      Key: key,
      Body: fileContent,
      ContentType: "application/pdf",
    };

    s3.upload(params, function (err, uploadData) {
      if (err) {
        console.error("Error uploading PDF", err);
        response.status(500).json({ message: "Error uploading PDF to S3" });
      } else {
        console.log("PDF uploaded successfully", uploadData.Location);
        uploadedPDFs++;

        const pdfInfoItem = {
          user: user,
          url: uploadData.Location,
        };
        pdfInfo.push(pdfInfoItem);

        if (uploadedPDFs === totalPDFs) {
          var pdf_url = [];
          pdfInfo.forEach((pdf) => {
            console.log(pdf.url);
            pdf_url.push(pdf.url);
            const query = `UPDATE invoicedetails SET invoicePDF = '${pdf.url}' WHERE User_Id = '${pdf.user}'`;
            connection.query(query, function (error, pdfData) {
              if (error) {
                console.error("Error updating database", error);
                errorMessage = error;
              }
            });
          });

          if (errorMessage) {
            response
              .status(201)
              .json({ message: "Cannot Insert PDF to Database" });
          } else {
            response
              .status(200)
              .json({
                message: "Insert PDF successfully",
                pdf_url: uploadData.Location,
              });
          }
        }
      }
    });
  });
}

function deletePDfs(filenames) {
  console.log(filenames);
  filenames.forEach((filename) => {
    fs.unlink(filename, function (err) {
      if (err) {
        console.error("delete pdf error", err);
      } else {
        console.log("PDF file deleted successfully");
      }
    });
  });
}
function deleteAmenityPDfs(filename) {
  fs.unlink(filename, function (err) {
    if (err) {
      console.error("delete pdf error", err);
    } else {
      console.log("PDF file deleted successfully");
    }
  });
}

function convertAmountToWords(amount) {
  const units = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
  ];
  const teens = [
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  let words = "";

  let num = parseInt(amount);

  if (num === 0) {
    return "Zero";
  }

  if (num >= 1000) {
    words += convertAmountToWords(Math.floor(num / 1000)) + " Thousand ";
    num %= 1000;
  }

  if (num >= 100) {
    words += convertAmountToWords(Math.floor(num / 100)) + " Hundred ";
    num %= 100;
  }

  if (num >= 10 && num <= 19) {
    words += teens[num - 10] + " ";
    num = 0;
  } else if (num >= 20) {
    words += tens[Math.floor(num / 10)] + " ";
    num %= 10;
  }

  if (num > 0) {
    words += units[num] + " ";
  }

  return words.trim();
}

function EbAmount(connection, request, response) {
  var created_by = request.user_details.id;

  var atten = request.body;
  if (!atten) {
    return response.status(201).json({ message: "Missing parameter" });
  }
  console.log(atten);

  var sql2 = "SELECT * FROM eb_settings WHERE hostel_id=? AND status=1";
  connection.query(sql2, [atten.Hostel_Id], function (err, amount_details) {
    if (err) {
      return response
        .status(201)
        .json({ statusCode: 201, message: "Database error" });
    } else if (amount_details.length != 0) {
      // Check Date Validation

      var sql3 =
        "SELECT * FROM EbAmount WHERE hostel_Id= '" +
        atten.Hostel_Id +
        "' AND Floor= '" +
        atten.Floor +
        "' AND Room= '" +
        atten.Room +
        "' AND (date='" +
        atten.date +
        "' OR initial_date='" +
        atten.date +
        "') AND status=1";

      connection.query(sql3, function (err, date_res) {
        if (err) {
          return response
            .status(201)
            .json({ message: "Unable to Get Eb Amount Details", error: err });
        } else if (date_res.length == 0) {
          var sql_1 =
            "SELECT *,DATE_FORMAT(date, '%Y-%m-%d') AS get_date FROM EbAmount WHERE hostel_Id = '" +
            atten.Hostel_Id +
            "' AND Floor= '" +
            atten.Floor +
            "' AND Room= '" +
            atten.Room +
            "' AND status=1 ORDER BY id DESC";
          connection.query(sql_1, function (err, eb_data_list) {
            if (err) {
              console.log(err);

              return response
                .status(201)
                .json({
                  message: "Unable to Get Eb Amount Details",
                  error: err,
                });
            } else if (eb_data_list.length == 0) {
              var sql_2 =
                "INSERT INTO EbAmount (hostel_id,Floor,Room,initial_date,start_Meter_Reading,end_Meter_Reading,Eb_Unit,EbAmount) VALUES (?,?,?,?,?,0,0,0)";
              connection.query(
                sql_2,
                [
                  atten.Hostel_Id,
                  atten.Floor,
                  atten.Room,
                  atten.date,
                  atten.end_Meter_Reading,
                ],
                function (err, data) {
                  if (err) {
                    console.error(err);
                    return response
                      .status(202)
                      .json({ message: "Unable to Add Eb Amount", error: err });
                  } else {
                    return response
                      .status(200)
                      .json({ message: "Successfully Added Eb Amount" });
                  }
                }
              );
            } else {
              var initial_date = eb_data_list[0].get_date;
              let previous_reading = eb_data_list[0].end_Meter_Reading; //old meter Reading
              var startMeterReading = previous_reading; // Set as Start Meter Reading
              var end_Meter_Reading = atten.end_Meter_Reading;
              var total_reading = end_Meter_Reading - startMeterReading; //  Get Total Reading
              var particular_amount = amount_details[0].amount; // Get Single Amount
              var total_amount = particular_amount * total_reading; // Get Total Amount

              if (eb_data_list.length == 1 && eb_data_list[0].EbAmount == 0) {
                var id = eb_data_list[0].id; // Set as id for Update

                var startMeterReading = eb_data_list[0].start_Meter_Reading; // Set as Start Meter Reading

                var total_reading =
                  end_Meter_Reading - eb_data_list[0].start_Meter_Reading;
                var total_amount = particular_amount * total_reading;

                var sql_3 =
                  "UPDATE EbAmount SET date=?,end_Meter_Reading=?,EbAmount=?,Eb_Unit=? WHERE id=?";
                connection.query(
                  sql_3,
                  [
                    atten.date,
                    end_Meter_Reading,
                    total_amount,
                    total_reading,
                    id,
                  ],
                  function (err, data) {
                    if (err) {
                      console.error(err);
                      return response
                        .status(201)
                        .json({
                          message: "Unable to Update Eb Amount",
                          error: err,
                        });
                    } else {
                      var formattedDate = eb_data_list[0].initial_date;
                      var dateObject = new Date(formattedDate); // Create a Date object

                      // Format the date to YYYY-MM-DD
                      var last_cal_date = dateObject
                        .toISOString()
                        .split("T")[0];

                      var eb_id = id;

                      split_eb_amounts(
                        atten,
                        startMeterReading,
                        end_Meter_Reading,
                        last_cal_date,
                        total_amount,
                        total_reading,
                        eb_id,
                        function (result) {
                          if (result.statusCode === 200) {
                            return response
                              .status(200)
                              .json({
                                statusCode: 200,
                                message: result.message,
                              });
                          } else {
                            return response
                              .status(201)
                              .json({
                                statusCode: 201,
                                message: result.message,
                                error: result.error,
                              });
                          }
                        }
                      );
                    }
                  }
                );
              } else {
                console.log(initial_date, "===================");

                const insertQuery = `INSERT INTO EbAmount (hostel_Id, Floor, Room, start_Meter_Reading, end_Meter_Reading, EbAmount,Eb_Unit,date,initial_date) VALUES (${atten.Hostel_Id}, ${atten.Floor}, ${atten.Room}, ${startMeterReading}, '${end_Meter_Reading}', '${total_amount}',${total_reading},'${atten.date}','${initial_date}')`;
                connection.query(insertQuery, function (error, data) {
                  if (error) {
                    console.error(error);
                    return response
                      .status(202)
                      .json({
                        message: "Unable to Add Eb Amount",
                        error: error,
                      });
                  } else {
                    var formattedDate = eb_data_list[0].date;
                    var dateObject = new Date(formattedDate); // Create a Date object

                    // Format the date to YYYY-MM-DD
                    var last_cal_date = dateObject.toISOString().split("T")[0];

                    var eb_id = data.insertId;

                    split_eb_amounts(
                      atten,
                      startMeterReading,
                      end_Meter_Reading,
                      last_cal_date,
                      total_amount,
                      total_reading,
                      eb_id,
                      function (result) {
                        if (result.statusCode === 200) {
                          return response
                            .status(200)
                            .json({ statusCode: 200, message: result.message });
                        } else {
                          return response
                            .status(201)
                            .json({
                              statusCode: 201,
                              message: result.message,
                              result: response.error,
                            });
                        }
                      }
                    );
                  }
                });
              }
            }

            function split_eb_amounts(
              atten,
              startMeterReading,
              end_Meter_Reading,
              last_cal_date,
              total_amount,
              total_reading,
              eb_id,
              callback
            ) {
              // Check Eb Amounts
              // var sql1 = "SELECT *,CASE WHEN checkoutDate IS NULL THEN DATEDIFF(LEAST(CURDATE(), '" + atten.date + "'), GREATEST(joining_date, '" + last_cal_date + "')) + 1 ELSE DATEDIFF(LEAST(checkoutDate, '" + atten.date + "'), GREATEST(joining_date, '" + last_cal_date + "')) + 1 END AS days_stayed FROM hostel WHERE Hostel_Id = ? AND Floor = ? AND Rooms = ? AND joining_date <= '" + atten.date + "' AND (checkoutDate >= '" + last_cal_date + "' OR checkoutDate IS NULL) AND customer_Role = 'user';";
              var sql1 =
                "SELECT *, CASE WHEN checkoutDate IS NULL THEN DATEDIFF(LEAST(CURDATE(), '" +
                atten.date +
                "'), GREATEST(joining_date, '" +
                last_cal_date +
                "')) + 1 ELSE DATEDIFF(LEAST(checkoutDate, '" +
                atten.date +
                "'), GREATEST(joining_date, '" +
                last_cal_date +
                "')) + 1 END AS days_stayed FROM hostel WHERE Hostel_Id = ? AND Floor = ? AND Rooms = ? AND joining_date <= '" +
                atten.date +
                "' AND (checkoutDate >= '" +
                last_cal_date +
                "' OR checkoutDate IS NULL);";
              console.log(sql1);

              connection.query(
                sql1,
                [
                  atten.Hostel_Id,
                  atten.Floor,
                  atten.Room,
                  last_cal_date,
                  atten.date,
                ],
                function (err, user_data) {
                  if (err) {
                    // Send error response if the query fails
                    console.error("Error fetching user details:", err);
                    return callback({
                      statusCode: 201,
                      message: "Unable to Get User Details",
                      error: err,
                    });
                  } else if (user_data.length !== 0) {
                    let totalDays = user_data.reduce(
                      (acc, user) => acc + user.days_stayed,
                      0
                    ); // Total days stayed
                    const amountPerDay = total_amount / totalDays; // Calculate amount per day
                    console.log(amountPerDay);
                    let insertCounter = 0;

                    user_data.forEach((user) => {
                      const user_id = user.ID; // User ID from the result set
                      const userDays = user.days_stayed; // Get the days stayed for this user
                      const userAmount = Math.round(userDays * amountPerDay); // Calculate and round the amount for this user
                      let per_unit = Math.round(
                        (userAmount / total_amount) * total_reading
                      ); // Calculate and round the per unit

                      console.log("Stay Date", user.days_stayed);

                      console.log(
                        `User ID: ${user_id}, Per Unit: ₹${per_unit.toFixed(
                          2
                        )}, User Amount: ₹${userAmount.toFixed(2)}`
                      );
                      console.log(userAmount);

                      if (userAmount) {
                        var sql2 =
                          "INSERT INTO customer_eb_amount (user_id, start_meter, end_meter, unit, amount, created_by,date,eb_id) VALUES (?, ?, ?, ?, ?, ?,?,?)";
                        connection.query(
                          sql2,
                          [
                            user_id,
                            startMeterReading,
                            end_Meter_Reading,
                            per_unit,
                            userAmount,
                            created_by,
                            atten.date,
                            eb_id,
                          ],
                          function (err) {
                            if (err) {
                              console.error(
                                "Error inserting customer EB amount:",
                                err
                              );
                              return callback({
                                statusCode: 201,
                                message: "Unable to Add EB Amount for User",
                                error: err,
                              });
                            } else {
                              insertCounter++;
                              if (insertCounter === user_data.length) {
                                return callback({
                                  statusCode: 200,
                                  message: "Successfully Added EB Amount",
                                });
                              }
                            }
                          }
                        );
                      } else {
                        console.log(
                          `User ID: ${user_id} has a zero amount, skipping insertion.`
                        );
                        insertCounter++;
                        // return callback({ statusCode: 200, message: 'Successfully Added EB Amount' });
                        if (insertCounter === user_data.length) {
                          return callback({
                            statusCode: 200,
                            message: "Successfully Added EB Amount",
                          });
                        }
                      }
                    });
                  } else {
                    return callback({
                      statusCode: 200,
                      message: "Successfully Added EB Amount",
                    });
                  }
                }
              );
            }
          });
        } else {
          return response
            .status(201)
            .json({
              statusCode: 201,
              message:
                "Date already has an added in this Room. Please select a different date.",
            });
        }
      });
    } else {
      return response
        .status(201)
        .json({ statusCode: 201, message: "Kindly Add Eb Setings" });
    }
  });
}

function getEBList(connection, request, response) {
  connection.query(
    `SELECT 
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
    eb.createAt DESC;`,
    function (error, data) {
      if (error) {
        console.error(error);
        response.status(201).json({ message: "Internal Server Error" });
      } else {
        if (data.length > 0) {
          response.status(200).json({ data: data });
        } else {
          response.status(203).json({ message: "No data found" });
        }
      }
    }
  );
}

function getEbStart(connection, response, request) {
  var created_by = request.user_details.id;
  var show_ids = request.show_ids;
  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  var hostel_id = request.body.hostel_id;

  if (
    is_admin == 1 ||
    (role_permissions[12] && role_permissions[12].per_view == 1)
  ) {
    if (!hostel_id) {
      return response
        .status(201)
        .json({ statusCode: 201, message: "Missing Hostel Id" });
    }

    let query =
      "SELECT hos.Name as hoatel_Name,eb.id as eb_Id,hos.id as hostel_Id,hos.profile,eb.hostel_id,eb.floor_id,eb.room_id,eb.total_amount,eb.total_reading,hf.floor_name,hr.Room_Id,eb.date,eb.reading FROM room_readings eb JOIN hosteldetails hos ON hos.id = eb.hostel_id LEFT JOIN Hostel_Floor AS hf ON hf.floor_id=eb.floor_id AND hf.hostel_id=eb.hostel_id JOIN hostelrooms AS hr ON hr.id=eb.room_id where hos.created_By IN (" +
      show_ids +
      ") AND eb.hostel_id=? AND eb.status=1;";
    connection.query(query, [hostel_id], function (error, data) {
      if (error) {
        response
          .status(203)
          .json({ statusCode: 201, message: "not connected" });
      } else {
        response.status(200).json({ statusCode: 200, data: data });
      }
    });
  } else {
    response
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function UpdateInvoice(connection, response, atten) {
  // console.log("atten", atten);
  if (atten.id) {
    connection.query(
      `UPDATE invoicedetails SET BalanceDue= ${atten.BalanceDue},PaidAmount = ${atten.paidAmount} WHERE id=${atten.id}`,
      function (error, result) {
        if (error) {
          console.error(error);
          return response
            .status(203)
            .json({ message: "Error updating invoice" });
        } else {
          return response.status(200).json({ message: "Update successful" });
        }
      }
    );
  } else {
    return response
      .status(201)
      .json({ message: "Invoice id is required for update" });
  }
}

function UpdateAmenitiesHistory(connection, response, request) {
  const reqData = request.body;
  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[18] && role_permissions[18].per_create == 1)
  ) {
    if (reqData) {
      let created_By = request.user_details.id;
      connection.query(
        `select * from AmenitiesHistory where user_Id ='${reqData.userID}' and amenity_Id = ${reqData.amenityID} ORDER BY id DESC`,
        function (err, data) {
          if (data && data.length > 0) {
            if (data[0].status === 1) {
              // connection.query(`UPDATE AmenitiesHistory SET status = ${reqData.status} where user_Id ='${reqData.userID}' and amenity_Id = ${reqData.amenityID}`, function (updateError, updateData) {
              connection.query(
                `insert into AmenitiesHistory(user_Id,amenity_Id,hostel_Id,created_By,status) values('${reqData.userID}',${reqData.amenityID},${reqData.hostelID},${created_By},${reqData.Status})`,
                function (updateError, updateData) {
                  if (updateError) {
                    console.log("updateError", updateError);
                    response.status(201).json({ message: "Does not Update" });
                  } else {
                    response
                      .status(200)
                      .json({ message: "Amenities Update Successfully" });
                  }
                }
              );
            } else {
              connection.query(
                `insert into AmenitiesHistory(user_Id,amenity_Id,hostel_Id,created_By) values('${reqData.userID}',${reqData.amenityID},${reqData.hostelID},${created_By})`,
                function (error, insertData) {
                  if (error) {
                    response.status(201).json({ message: "Does not Insert" });
                  } else {
                    response
                      .status(200)
                      .json({ message: "Amenities Added Successfully" });
                  }
                }
              );
            }
          } else {
            if (err) {
              response.status(201).json({ message: "Does not Insert" });
            } else {
              connection.query(
                `insert into AmenitiesHistory(user_Id,amenity_Id,hostel_Id,created_By) values('${reqData.userID}',${reqData.amenityID},${reqData.hostelID},${created_By})`,
                function (error, insertData) {
                  if (error) {
                    console.log("error", error);
                    response.status(201).json({ message: "Does not Insert" });
                  } else {
                    response
                      .status(200)
                      .json({ message: "Amenities Added Successfully" });
                  }
                }
              );
            }
          }
        }
      );
    } else {
      response.status(201).json({ message: "Missing Parameter" });
    }
  } else {
    response
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}
// startdate to enddate
function GetAmenitiesHistory(connection, res, req) {
  // console.log("req", moment(req.endingDate).format('DD/MM/YYYY'));
  let endMonth = req.endingDate
    ? new Date(req.endingDate).getMonth() + 1
    : new Date(req.startingDate).getMonth() + 1;
  console.log("endMonth", endMonth);
  let endYear = req.endingDate
    ? new Date(req.endingDate).getFullYear()
    : new Date(req.startingDate).getFullYear();
  console.log("endYear", endYear);
  let startYear = new Date(req.startingDate).getFullYear();
  console.log("startYear", startYear);
  let startMonth = new Date(req.startingDate).getMonth() + 1;
  console.log("startMonth", startMonth);
  // let endMonth = currentMonth;
  let user_id = req.user_id;
  let hostelDetails = {};

  if (!user_id) {
    return res.status(201).json({ message: "User ID is required" });
  }

  var sql = `
        SELECT amen.*,trans.amount as PaidAmount,trans.createdAt as PaidDate,hostel.Name as userName,hostel.Address as UserAddress,hos.Name as hostel_Name,hos.hostel_PhoneNo, hos.email_id,hos.Address, hostel.RoomRent, amenityNm.Amnities_Name as AmenitiesName, am.Amount,inv.PaidAmount as roomrentPaidAmount,inv.BalanceDue as roomrentBalanceAmount
        FROM AmenitiesHistory AS amen
        JOIN hostel ON hostel.User_Id = amen.user_Id 
        JOIN Amenities AS am ON am.Amnities_Id = amen.amenity_Id
        JOIN AmnitiesName as amenityNm on am.Amnities_Id = amenityNm.id
         LEFT JOIN transactions as trans on trans.user_id = hostel.ID
         AND MONTH(trans.createdAt) = MONTH(amen.created_At)
        AND YEAR(trans.createdAt) = YEAR(amen.created_At)
        JOIN hosteldetails as hos on hos.id =${req.hostel_id}
        LEFT JOIN invoicedetails AS inv ON inv.user_id = amen.user_Id
        AND MONTH(inv.Date) = MONTH(amen.created_At)
        AND YEAR(inv.Date) = YEAR(amen.created_At)
        WHERE amen.user_Id = '${user_id}' 
        AND (
            (YEAR(amen.created_At) = ${startYear} AND MONTH(amen.created_At) BETWEEN ${startMonth} AND 12)
            OR
            (YEAR(amen.created_At) = ${endYear} AND MONTH(amen.created_At) BETWEEN 1 AND ${endMonth})
        )
        ORDER BY amen.created_At ASC;
    `;
  console.log("sql", sql);
  connection.query(sql, function (am_err, am_data) {
    if (am_err) {
      console.error("Error fetching amenities history:", am_err);
      return res
        .status(201)
        .json({ message: "Unable to get Amenities History" });
    }

    if (am_data.length === 0) {
      return res.status(202).json({ message: "No data found" });
    }

    let groupedData = {};
    am_data.forEach((item) => {
      hostelDetails = {
        hostelName: item.hostel_Name,
        hostelPhoneNo: item.hostel_PhoneNo,
        hostelEmailID: item.email_id,
        hostelAddress: item.Address,
        userAddress: item.UserAddress,
        userName: item.userName,
      };
      let key = `${item.user_Id}-${item.amenity_Id}-${item.hostel_Id}`;
      if (!groupedData[key]) {
        groupedData[key] = {
          user_Id: item.user_Id,
          amenity_Id: item.amenity_Id,
          hostel_Id: item.hostel_Id,
          name: item.AmenitiesName,
          rent: item.RoomRent,
          // rentPaidAmount: item.roomrentPaidAmount || 0,
          // rentBalanceAmount: item.roomrentBalanceAmount || 0,
          ebAmount: item.EbAmount,
          charges: item.Amount,
          PaidAmount: item.PaidAmount || 0,
          PaidDate: item.PaidDate || 0,
          history: [],
        };
      }
      groupedData[key].history.push({
        status: item.status,
        created_At: item.created_At,
        created_By: item.created_By,
      });
    });

    let result = Object.values(groupedData);

    let monthData = [];

    for (let month = startMonth; month <= endMonth; month++) {
      let ebAmount = 0;

      connection.query(
        `
        SELECT inv.EbAmount
        FROM invoicedetails AS inv
        WHERE MONTH(inv.Date) = ${month}
          AND YEAR(inv.Date) = ${endYear}  
          AND inv.user_id = '${user_id}';
    `,
        function (ebErr, ebData) {
          if (ebErr) {
            console.error("Error fetching EB Amount:", ebErr);
            return res
              .status(201)
              .json({ message: "Error fetching EB Amount" });
          } else if (ebData.length > 0) {
            console.log("ebData", ebData);
            ebAmount = ebData[0].EbAmount;
          }

          let currentMonthData = {
            Month: getMonthName(month),
            amenity_name: [],
            amenity_fees: [],
            room_rent: 0,
            // room_rent_PaidAmount:0,
            // room_rent_BalanceAmount: 0,
            eb_amount: ebAmount,
            total_amount: 0,
            paid_amount: [],
          };

          result.forEach((amenity) => {
            let lastStatus = null;
            let exclude = false;

            amenity.history.forEach((entry) => {
              let entryDate = new Date(entry.created_At);
              if (
                entryDate.getFullYear() === startYear &&
                entryDate.getMonth() + 1 === month &&
                entry.status === 0
              ) {
                exclude = true;
              }
              if (
                entryDate.getFullYear() < endYear ||
                (entryDate.getFullYear() === endYear &&
                  entryDate.getMonth() + 1 <= month)
              ) {
                lastStatus = entry;
              }
            });

            if (!exclude && lastStatus && lastStatus.status === 1) {
              // console.log("amenity.charges",amenity.charges);
              // let amenityFees = 0;
              // amenityFees += amenity.charges
              // console.log("amenityFees",amenityFees);

              currentMonthData.amenity_name.push(amenity.name);
              currentMonthData.amenity_fees.push(amenity.charges);
              currentMonthData.room_rent = amenity.rent;
              if (amenity.PaidAmount != 0) {
                currentMonthData.paid_amount.push({
                  PaidAmount: amenity.PaidAmount,
                  PaidDate: amenity.PaidDate,
                });
                console.log(
                  "currentMonthData.paid_amount",
                  currentMonthData.paid_amount
                );
              }
              // else{
              //     currentMonthData.paid_amount=[]
              // }

              // currentMonthData.paid_amount = amenity.PaidAmount;
              // currentMonthData.room_rent_PaidAmount = amenity.rentPaidAmount;
              // currentMonthData.room_rent_BalanceAmount = amenity.rentBalanceAmount;
              // currentMonthData.total_amount += (amenity.charges + currentMonthData.eb_amount);
              let amenityFees = currentMonthData.amenity_fees.reduce(
                (a, b) => Number(a) + Number(b),
                0
              );
              // .split(',').reduce((a, b) => Number(a) + Number(b), 0)
              // console.log("amenityFees",amenityFees);
              let totalAmount =
                amenityFees + currentMonthData.eb_amount + amenity.rent;
              // - amenity.PaidAmount
              //  - amenity.PaidAmount
              // console.log("totalAmount",totalAmount);
              currentMonthData.total_amount = totalAmount;
            } else {
              currentMonthData.room_rent = amenity.rent;
              // currentMonthData.total_amount += (amenity.charges + currentMonthData.eb_amount);
            }
          });

          if (currentMonthData.amenity_name.length > 0) {
            // currentMonthData.total_amount += currentMonthData.room_rent;
            // currentMonthData.total_amount += currentMonthData.eb_amount;
            currentMonthData.amenity_name =
              currentMonthData.amenity_name.join(",");
            currentMonthData.amenity_fees =
              currentMonthData.amenity_fees.join(",");
            monthData.push(currentMonthData);
          } else {
            let totalAmount =
              currentMonthData.eb_amount + currentMonthData.room_rent;
            console.log("totalAmount", totalAmount);
            currentMonthData.total_amount = totalAmount;
            // currentMonthData.total_amount += currentMonthData.room_rent;
            // currentMonthData.total_amount += currentMonthData.eb_amount;
            currentMonthData.amenity_name =
              currentMonthData.amenity_name.join(",");
            currentMonthData.amenity_fees =
              currentMonthData.amenity_fees.join(",");
            monthData.push(currentMonthData);
          }
          // console.log("monthData",monthData);
          if (month === endMonth) {
            if (monthData.length > 0) {
              AmenitiesPDF(hostelDetails, monthData, res);
              // res.status(200).json({ message: "Amenities History", amenity_details: monthData });
            } else {
              res
                .status(202)
                .json({
                  message:
                    "No active amenities found for the specified months and year",
                });
            }
          }
        }
      );
    }

    // if (monthData.length > 0) {
    //     res.status(200).json({ message: "Amenities History", amenity_details: monthData });
    // } else {
    //     res.status(202).json({ message: "No active amenities found for the specified months and year" });
    // }
  });
}

function getMonthName(month) {
  const date = new Date();
  date.setMonth(month - 1);
  return date.toLocaleString("default", { month: "long" });
}

function AmenitiesPDF(hostelDetails, monthData, response) {
  const htmlFilePath = path.join(
    __dirname,
    "mail_templates",
    "amenityHistory_template.html"
  );
  let htmlContent = fs.readFileSync(htmlFilePath, "utf8");

  function calculateTotalAmount(data) {
    let total = 0;
    for (let i = 0; i < data.length; i++) {
      total += parseFloat(data[i].total_amount);
    }
    return total.toFixed(2);
  }

  let invoiceRows = "";
  // let paidamountRows = '';
  for (let i = 0; i < monthData.length; i++) {
    let amenityFees = monthData[i].amenity_fees
      .split(",")
      .reduce((a, b) => Number(a) + Number(b), 0);
    if (monthData[i].paid_amount.length > 0) {
      for (let paid = 0; paid < monthData[i].paid_amount.length; paid++) {
        if (
          monthData[i].paid_amount[paid].PaidAmount != 0 &&
          monthData[i].paid_amount[paid].PaidAmount != []
        ) {
          //     paidamountRows += `
          // <td>you have paid ${monthData[i].paid_amount[paid].PaidAmount} on ${monthData[i].paid_amount[paid].PaidDate} </td>
          //  `
          invoiceRows += `
             <tr>
                 <td>${monthData[i].Month}</td>
                 <td>Room Rent : ${monthData[i].room_rent}<br/>${
            monthData[i].amenity_fees &&
            monthData[i].amenity_name + " : " + amenityFees + "<br/>"
          }  EB Amount : ${monthData[i].eb_amount}</td>
                 <td> you have paid ${
                   monthData[i].paid_amount[paid].PaidAmount
                 } on ${monthData[i].paid_amount[paid].PaidDate} </td>
                 <td>${monthData[i].total_amount}</td>
             </tr>
         `;
        }
      }
    } else {
      invoiceRows += `
            <tr>
                <td>${monthData[i].Month}</td>
                <td>Room Rent : ${monthData[i].room_rent}<br/>${
        monthData[i].amenity_fees &&
        monthData[i].amenity_name + " : " + amenityFees + "<br/>"
      }  EB Amount : ${monthData[i].eb_amount}</td>
                <td>you have not Paid for this month</td>
                <td>${monthData[i].total_amount}</td>
            </tr>
        `;
    }

    // }
  }

  htmlContent = htmlContent
    .replace("{{hostal_name}}", hostelDetails.hostelName)
    .replace("{{Phone}}", hostelDetails.hostelPhoneNo)
    .replace("{{email}}", hostelDetails.hostelEmailID)
    .replace("{{user_address}}", hostelDetails.userAddress)
    .replace("{{user_name}}", hostelDetails.userName)
    .replace("{{city}}", hostelDetails.hostelAddress)
    .replace("{{invoice_rows}}", invoiceRows)
    .replace("{{total_amount}}", calculateTotalAmount(monthData));

  // Write the modified HTML content to a PDF or any other output
  const outputPath = path.join(__dirname, "amenity.pdf");

  // Generate the PDF
  pdf
    .create(htmlContent, { phantomPath: phantomjs.path })
    .toFile(outputPath, async (err, res) => {
      if (err) {
        console.error("Error generating PDF:", err);
        return;
      }

      console.log("PDF generated:", res.filename);
      // if (res.filename) {
      //     console.log("res", res);
      //     response.status(200).json({ message: "Amenities History", filepath: res.filename, amenity_details: monthData });
      // }

      if (res.filename) {
        console.log("res", res);
        //upload to s3 bucket

        let uploadedPDFs = 0;
        let pdfInfo = [];
        const fileContent = fs.readFileSync(res.filename);
        const key = `amenity/${res.filename}`;
        const BucketName = process.env.AWS_BUCKET_NAME;
        const params = {
          Bucket: BucketName,
          Key: key,
          Body: fileContent,
          ContentType: "application/pdf",
        };

        s3.upload(params, function (err, uploadData) {
          if (err) {
            console.error("Error uploading PDF", err);
            response.status(201).json({ message: "Error uploading PDF to S3" });
          } else {
            console.log("PDF uploaded successfully", uploadData.Location);
            uploadedPDFs++;

            const pdfInfoItem = {
              // user: user,
              url: uploadData.Location,
            };
            pdfInfo.push(pdfInfoItem);

            if (pdfInfo.length > 0) {
              var pdf_url = [];
              pdfInfo.forEach((pdf) => {
                console.log(pdf.url);
                pdf_url.push(pdf.url);
              });

              if (pdf_url.length > 0) {
                response
                  .status(200)
                  .json({
                    message: "Insert PDF successfully",
                    pdf_url: pdf_url[0],
                    amenity_details: monthData,
                  });
                deleteAmenityPDfs(res.filename);
              } else {
                response
                  .status(201)
                  .json({ message: "Cannot Insert PDF to Database" });
              }
            }
          }
        });
      }
    });
}

function add_manual_invoice(req, res) {
  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[10] && role_permissions[10].per_create == 1)
  ) {
    var { user_id, due_date, date, invoice_id, amenity } = req.body;

    var sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
    connection.query(sql1, [user_id], function (err, user_details) {
      if (err) {
        console.log(err);
        return res
          .status(201)
          .json({ statusCode: 201, message: "Unable to Get User Details" });
      } else if (user_details.length != 0) {
        var user_data = user_details[0];

        var total_amount =
          amenity && amenity.length > 0
            ? amenity.reduce((sum, user) => sum + user.amount, 0)
            : 0;

        // var total_amount = parseInt(total_am_amount) + parseInt(room_rent) + parseInt(eb_amount) + parseInt(advance_amount);

        var sql2 =
          "INSERT INTO invoicedetails (Name,PhoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,DueDate,Date,Invoices,Status,User_Id,Bed,BalanceDue,action,invoice_type,hos_user_id,Amount) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
        connection.query(
          sql2,
          [
            user_data.Name,
            user_data.Phone,
            user_data.Email,
            user_data.HostelName,
            user_data.Hostel_Id,
            user_data.Floor,
            user_data.Rooms,
            due_date,
            date,
            invoice_id,
            "pending",
            user_data.User_Id,
            user_data.Bed,
            total_amount,
            "manual",
            1,
            user_id,
            total_amount,
          ],
          function (err, ins_data) {
            if (err) {
              console.log(err);
              return res
                .status(201)
                .json({
                  statusCode: 201,
                  message: "Unable to Add Invoice Details",
                });
            } else {
              var inv_id = ins_data.insertId;

              if (amenity && amenity.length > 0) {
                var remaining = amenity.length;
                amenity.forEach((item) => {
                  var sql3 =
                    "INSERT INTO manual_invoice_amenities (am_name, user_id, amount,invoice_id) VALUES (?, ?, ?,?)";
                  connection.query(
                    sql3,
                    [item.am_name, user_id, item.amount, inv_id],
                    function (err) {
                      if (err) {
                        console.log("Error inserting amenity details:", err);
                      }
                      remaining -= 1;
                      if (remaining === 0) {
                        return res
                          .status(200)
                          .json({
                            statusCode: 200,
                            message: "Invoice Added Successfully",
                          });
                      }
                    }
                  );
                });
              } else {
                return res
                  .status(200)
                  .json({
                    statusCode: 200,
                    message: "Invoice Added Successfully",
                  });
              }
            }
          }
        );
      } else {
        return res
          .status(201)
          .json({ statusCode: 201, message: "Invalid User Details" });
      }
    });
  } else {
    res
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function edit_manual_invoice(req, res) {
  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[10] && role_permissions[10].per_create == 1)
  ) {
    var { user_id, due_date, date, amenity, start_date, end_date, id } =
      req.body;

    if (!user_id || !due_date || !date || !amenity || !id) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    var total_amount =
      amenity && amenity.length > 0
        ? amenity.reduce((sum, user) => sum + parseInt(user.amount), 0)
        : 0;

    var sql1 = "SELECT * FROM invoicedetails WHERE id=? AND invoice_status=1";
    connection.query(sql1, [id], function (err, inv_data) {
      if (err) {
        return res
          .status(201)
          .json({
            statusCode: 201,
            message: "Error to Get Invoice Details",
            reason: err.message,
          });
      }

      if (inv_data.length == 0) {
        return res
          .status(201)
          .json({ statusCode: 201, message: "Invalid Invoice Details" });
      }

      var paid_amount = parseInt(inv_data[0].PaidAmount || 0);

      if (paid_amount > total_amount) {
        return res
          .status(201)
          .json({
            statusCode: 201,
            message: "Paid Amount Greater Than Total Amount",
          });
      }

      var balance_due = parseInt(total_amount) - parseInt(paid_amount);

      var sql2 =
        "UPDATE invoicedetails SET Date=?,DueDate=?,Amount=?,BalanceDue=?,start_date=?,end_date=? WHERE id=?";
      connection.query(
        sql2,
        [date, due_date, total_amount, balance_due, start_date, end_date, id],
        function (err, up_res) {
          if (err) {
            return res
              .status(201)
              .json({
                statusCode: 201,
                message: "Error to Update Invoice Details",
                reason: err.message,
              });
          }

          var sql3 =
            "DELETE FROM manual_invoice_amenities WHERE user_id=? AND invoice_id=?";
          connection.query(sql3, [user_id, id], function (err, del_inv) {
            if (err) {
              return res
                .status(201)
                .json({
                  statusCode: 201,
                  message: "Error to Remove Old Invoice Details",
                  reason: err.message,
                });
            }

            if (amenity && amenity.length > 0) {
              var remaining = amenity.length;

              amenity.forEach((item) => {
                var sql3 =
                  "INSERT INTO manual_invoice_amenities (am_name, user_id, amount,invoice_id) VALUES (?, ?, ?,?)";
                connection.query(
                  sql3,
                  [item.am_name, user_id, item.amount, id],
                  function (err) {
                    if (err) {
                      console.log("Error inserting amenity details:", err);
                    }
                    remaining -= 1;
                    if (remaining === 0) {
                      return res
                        .status(200)
                        .json({
                          statusCode: 200,
                          message: "Invoice Updated Successfully",
                        });
                    }
                  }
                );
              });
            } else {
              return res
                .status(200)
                .json({
                  statusCode: 200,
                  message: "Invoice Updated Successfully",
                });
            }
          });
        }
      );
    });
  } else {
    res
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function delete_manual_invoice(req, res) {
  var id = req.body.id;

  if (!id) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing Mandatory Fields" });
  }

  var sql1 = "SELECT * FROM invoicedetails WHERE id=? AND invoice_status=1";
  connection.query(sql1, [id], function (err, data) {
    if (err) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Error to Get Invoice Details" });
    }

    if (data.length == 0) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Invalid Invoice Details" });
    }

    var paid_amount = data[0].PaidAmount;

    if (paid_amount > 0) {
      return res
        .status(201)
        .json({
          statusCode: 201,
          message: "Paid amount already added in this invoice, so can't delete",
        });
    }

    var sql2 = "UPDATE invoicedetails SET invoice_status=0 WHERE id=?";
    connection.query(sql2, [id], function (err, up_res) {
      if (err) {
        return res
          .status(201)
          .json({
            statusCode: 201,
            message: "Error to Delete Invoice Details",
          });
      }

      return res
        .status(200)
        .json({ statusCode: 200, message: "Successfully Invoice Deleted!" });
    });
  });
}

function customer_readings(req, res) {
  const created_by = req.user_details.id;
  const role_permissions = req.role_permissions;
  const is_admin = req.is_admin;
  const hostel_id = req.body.hostel_id;

  const start_date_raw = req.body.start_date || null;
  const end_date_raw = req.body.end_date || null;
  const searchName = req.body.searchName?.trim() || null;

  if (!hostel_id) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing Hostel Details" });
  }

  if (
    !(
      is_admin == 1 ||
      (role_permissions[12] && role_permissions[12].per_view == 1)
    )
  ) {
    return res
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }

  const ch_query = "SELECT * FROM eb_settings WHERE hostel_id=? AND status=1";

  connection.query(ch_query, [hostel_id], function (err, ch_res) {
    if (err) {
      return res.status(201).json({ statusCode: 201, message: err.message });
    }

    if (ch_res.length === 0) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Not Added Settings" });
    }

    const hostel_based = ch_res[0].hostel_based;
    const is_hostel_based = hostel_based == 1;

    let sql1 = `
            SELECT cb.*, hos.Name AS username, hos.profile, hos.HostelName,
        `;

    if (is_hostel_based) {
      sql1 += `
                DATE_FORMAT(cb.date, '%Y-%m-%d') AS reading_date
                FROM customer_eb_amount AS cb
                JOIN hostel AS hos ON hos.ID = cb.user_id
                WHERE cb.type = 'hostel' AND hos.Hostel_Id = ?
            `;
    } else {
      sql1 += `
                hf.floor_name, hr.Room_Id,
                DATE_FORMAT(cb.date, '%Y-%m-%d') AS reading_date
                FROM customer_eb_amount AS cb
                JOIN hostel AS hos ON hos.ID = cb.user_id
                JOIN Hostel_Floor AS hf ON hf.floor_id = hos.Floor AND hf.hostel_id = hos.Hostel_Id
                JOIN hostelrooms AS hr ON hr.id = hos.Rooms
                WHERE cb.type = 'room' AND hos.Hostel_Id = ?
            `;
    }

    const params = [hostel_id];

    if (start_date_raw) {
      const start = new Date(start_date_raw);
      const start_time = `${start.toISOString().slice(0, 10)} 00:00:00`;

      let end_time;
      if (end_date_raw) {
        const end = new Date(end_date_raw);
        end_time = `${end.toISOString().slice(0, 10)} 23:59:59`;
      } else {
        end_time = `${start.toISOString().slice(0, 10)} 23:59:59`;
      }

      sql1 += ` AND cb.date BETWEEN ? AND ?`;
      params.push(start_time, end_time);
    }

    if (searchName) {
      sql1 += ` AND hos.Name LIKE ?`;
      params.push(`%${searchName}%`);
    }

    sql1 += ` ORDER BY cb.start_meter DESC`;

    console.log("sql_queryy-->" + sql1);

    connection.query(sql1, params, function (err, data) {
      if (err) {
        console.log(err);
        return res
          .status(201)
          .json({ statusCode: 201, message: "Unable to Get Eb Details" });
      }

      return res
        .status(200)
        .json({
          statusCode: 200,
          message: "Customer Eb Details",
          eb_details: data,
        });
    });
  });
}

function add_recuring_bill(req, res) {
  var {
    user_id,
    due_date,
    date,
    invoice_id,
    room_rent,
    eb_amount,
    amenity,
    advance_amount,
  } = req.body;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[11] && role_permissions[11].per_create == 1)
  ) {
    if (!user_id) {
      return res
        .status(200)
        .json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    var created_by = req.user_details.id;

    var sql1 =
      "SELECT * FROM hosteldetails AS hstl JOIN hostel AS hos ON hos.Hostel_Id = hstl.id LEFT JOIN RecurringBilling AS rb ON rb.hostel_id = hstl.id WHERE hos.id =? AND hos.isActive = 1 AND hstl.isActive = 1;";

    connection.query(sql1, [user_id], function (err, user_details) {
      if (err) {
        console.log(err);
        return res
          .status(201)
          .json({ statusCode: 201, message: "Unable to Get User Details" });
      } else if (user_details.length != 0) {
        var user_data = user_details[0];

        if (user_data.status == 0) {
          return res
            .status(201)
            .json({
              statusCode: 201,
              message: "Please enable the Recurring in the",
            });
        }

        var total_am_amount =
          amenity && amenity.length > 0
            ? amenity.reduce((sum, user) => sum + user.amount, 0)
            : 0;

        if (total_am_amount) {
          total_am_amount = total_am_amount;
        } else {
          total_am_amount = 0;
        }

        let today = moment(); // Current date

        let inv_date = user_data.inv_date ? parseInt(user_data.inv_date) : 1;
        let invoicedate = moment().set({
          year: today.year(),
          month: today.month(),
          date: inv_date,
        });

        if (today.date() > inv_date || !user_data.inv_date) {
          invoicedate.add(1, "month").set("date", 1); // Move to next month, set 1st day
        }

        let inv_day = invoicedate.format("YYYY-MM-DD");

        let dueDay = user_data.due_date ? parseInt(user_data.due_date) : 5;
        let dueDate = moment(invoicedate).set("date", dueDay);

        if (dueDate.isBefore(invoicedate)) {
          dueDate.add(1, "month").set("date", 5);
        }

        let due_day = dueDate.format("YYYY-MM-DD");

        console.log("Upcoming Invoice Date:", inv_day);
        console.log("Upcoming Due Date:", due_day);
        var eb = 1;
        var advance = 1;
        var rent = 1;
        var amen = 1;

        var sql2 =
          "SELECT * FROM recuring_inv_details WHERE user_id=? AND status=1";
        connection.query(sql2, [user_id], function (err, recure_data) {
          if (err) {
            return res
              .status(201)
              .json({
                statusCode: 201,
                message: "Unable to Get Invoice Details",
              });
          } else if (recure_data.length == 0) {
            var sql3 =
              "INSERT INTO invoicedetails (Name,PhoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,DueDate,Date,Invoices,Status,User_Id,Amnities_deduction_Amount,Bed,BalanceDue,action,invoice_type,hos_user_id,invoice_status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,2)";
            connection.query(
              sql3,
              [
                user_data.Name,
                user_data.Phone,
                user_data.Email,
                user_data.HostelName,
                user_data.Hostel_Id,
                user_data.Floor,
                user_data.Rooms,
                total_am_amount,
                due_day,
                inv_day,
                invoice_id,
                "pending",
                user_data.User_Id,
                0,
                user_data.Bed,
                total_am_amount,
                "recuring",
                2,
                user_id,
              ],
              function (err, ins_data) {
                if (err) {
                  console.log(err);
                  return res
                    .status(201)
                    .json({
                      statusCode: 201,
                      message: "Unable to Add Invoice Details",
                    });
                } else {
                  var sql4 =
                    "INSERT INTO recuring_inv_details (user_id,invoice_date,due_date,advance,rent,aminity,eb,status,created_by) VALUES (?,?,?,?,?,?,?,?,?)";
                  connection.query(
                    sql4,
                    [
                      user_id,
                      inv_date,
                      dueDay,
                      advance,
                      rent,
                      amen,
                      eb,
                      1,
                      created_by,
                    ],
                    function (err, ins_data) {
                      if (err) {
                        console.log(err);
                        return res
                          .status(201)
                          .json({
                            statusCode: 201,
                            message: "Unable to Add Invoice Details",
                          });
                      } else {
                        return res
                          .status(200)
                          .json({
                            statusCode: 200,
                            message: "Recuring Bill Setup Added Successfully!",
                          });
                      }
                    }
                  );
                }
              }
            );
          } else {
            return res
              .status(201)
              .json({
                statusCode: 201,
                message: "Already Added in this User!",
              });
          }
        });
      } else {
        return res
          .status(201)
          .json({ statusCode: 201, message: "Invalid User Details" });
      }
    });
  } else {
    res
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function addRecurringBills(req, res) {
  const {
    recure_id,
    hostel_id,
    billFrequency,
    billingDateOfMonth,
    dueDateOfMonth,
    isAutoSend,
    remainderDates,
    billDeliveryChannels,
    isActive,
  } = req.body;

  const role_permissions = req.role_permissions;
  const is_admin = req.is_admin;
  const created_by = req.user_details?.id;

  const isValidDayNumber = (day) => {
    const d = parseInt(day, 10);
    return d >= 1 && d <= 31;
  };

  if (
    !(
      is_admin === 1 ||
      (role_permissions[11] && role_permissions[11].per_create === 1)
    )
  ) {
    return res.status(208).json({
      statusCode: 208,
      message:
        "Permission Denied. Please contact your administrator for access.",
    });
  }

  if (!hostel_id) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing Mandatory Field: hostel_id" });
  }

  // Validate all day number fields
  if (
    !isValidDayNumber(billingDateOfMonth) ||
    !isValidDayNumber(dueDateOfMonth)
  ) {
    return res.status(201).json({
      statusCode: 201,
      message: "Invalid day number(s). Days must be between 1 and 31.",
    });
  }

  const now = moment();
  const year = now.year();
  const month = now.month();

  const createValidDate = (day) => {
    const maxDay = moment({ year, month }).daysInMonth();
    const validDay = Math.min(parseInt(day, 10), maxDay);
    return moment({ year, month, day: validDay }).format("YYYY-MM-DD");
  };

  const calcFromDateFull = createValidDate(billingDateOfMonth);

  const remainderDatesStr = Array.isArray(remainderDates)
    ? remainderDates.join(",")
    : "";
  const billDeliveryChannelsStr = Array.isArray(billDeliveryChannels)
    ? billDeliveryChannels.join(",")
    : "";

  const checkHostelSql =
    "SELECT id FROM hosteldetails WHERE id = ? AND isActive = 1";

  connection.query(checkHostelSql, [hostel_id], (err, hostelResults) => {
    if (err) {
      console.error(err);
      return res
        .status(201)
        .json({
          statusCode: 201,
          message: "Database error while verifying hostel.",
        });
    }

    if (hostelResults.length === 0) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Hostel not found or inactive" });
    }

    const invoiceUpdate = `
            UPDATE hosteldetails
            SET recure = ?, inv_startdate = ?, inv_enddate = ?, due_date = ?, bill_date = ?
            WHERE id = ?
        `;

    const invoiceData = [
      1,
      billingDateOfMonth,
      "",
      dueDateOfMonth,
      billingDateOfMonth,
      hostel_id,
    ];

    connection.query(invoiceUpdate, invoiceData, (err) => {
      if (err) {
        console.error(err);
        return res
          .status(201)
          .json({
            statusCode: 201,
            message: "Unable to update invoice settings.",
          });
      }

      if (recure_id) {
        const updateSql = `
                    UPDATE RecurringBilling
                    SET
                         billFrequency = ?, calculationFromDate = ?, calculationToDate = ?,
                        billingDateOfMonth = ?, dueDateOfMonth = ?, isAutoSend = ?, remainderDates = ?,
                        billDeliveryChannels = ?, status = ?, updated_at = NOW()
                    WHERE recure_id = ?
                `;

        const updateValues = [
          billFrequency,
          billingDateOfMonth,
          "",
          billingDateOfMonth,
          dueDateOfMonth,
          Number(isAutoSend) || 0,
          remainderDatesStr,
          billDeliveryChannelsStr,
          isActive,
          recure_id,
        ];

        connection.query(updateSql, updateValues, (err) => {
          if (err) {
            console.error(err);
            return res
              .status(201)
              .json({
                statusCode: 201,
                message: "Unable to update recurring billing.",
              });
          }

          return res.status(200).json({
            statusCode: 200,
            message: "Recurring Bill Setup Updated Successfully!",
          });
        });
      } else {
        const checkExistsSql =
          "SELECT * FROM RecurringBilling WHERE hostel_id = ?";
        connection.query(
          checkExistsSql,
          [hostel_id],
          (err, existingRecords) => {
            if (err) {
              console.error(err);
              return res
                .status(201)
                .json({
                  statusCode: 201,
                  message: "Database error while checking existing billing.",
                });
            }

            if (existingRecords.length > 0) {
              return res.status(201).json({
                statusCode: 201,
                message: "Recurring billing already setup for this hostel",
              });
            }

            const insertSql = `
                        INSERT INTO RecurringBilling (
                            hostel_id, billFrequency, calculationFromDate, calculationToDate,
                            billingDateOfMonth, dueDateOfMonth, isAutoSend, remainderDates, billDeliveryChannels,
                            status, created_at, updated_at
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
                    `;

            const insertValues = [
              hostel_id,
              billFrequency,
              billingDateOfMonth,
              "",
              billingDateOfMonth,
              dueDateOfMonth,
              Number(isAutoSend) || 0,
              remainderDatesStr,
              billDeliveryChannelsStr,
              isActive,
            ];

            connection.query(insertSql, insertValues, (err) => {
              if (err) {
                console.error(err);
                return res
                  .status(201)
                  .json({
                    statusCode: 201,
                    message: "Unable to add recurring billing.",
                  });
              }

              return res.status(200).json({
                statusCode: 200,
                message: "Recurring Bill Setup Added Successfully!",
              });
            });
          }
        );
      }
    });
  });
}

function get_recuring_amount(req, res) {
  var { user_id, hostel_id } = req.body;
  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[11] && role_permissions[11].per_view == 1)
  ) {
    if (!user_id) {
      return res
        .status(201)
        .json({ message: "Missing User Details", statusCode: 201 });
    }

    if (!hostel_id) {
      return res
        .status(201)
        .json({ message: "Missing Hostel Details", statusCode: 201 });
    }

    var sql1 =
      "SELECT * FROM hosteldetails AS hstl JOIN hostel AS hos ON hos.Hostel_Id=hstl.id WHERE hstl.id=? AND hos.id=? AND hos.isActive=1 AND hstl.isActive=1;";
    connection.query(sql1, [hostel_id, user_id], async function (err, hos_res) {
      if (err) {
        return res
          .status(201)
          .json({ message: "Error to Get Hostel Details", statusCode: 201 });
      } else if (hos_res.length != 0) {
        var recure_option = hos_res[0].recure;

        if (recure_option == 1) {
          var total_array = [];

          var inv_data = hos_res[0];
          var string_userid = inv_data.User_Id;

          const today = moment(); // Current Date

          let start_day = parseInt(inv_data.inv_startdate, 10) || 1; // Default to 1 if NULL

          const lastMonth = moment().subtract(1, "months");
          const inv_startdate = lastMonth.date(start_day).format("YYYY-MM-DD");
          const inv_enddate = moment(inv_startdate)
            .add(30, "days")
            .format("YYYY-MM-DD");
          const room_rent = inv_data.RoomRent;
          const startDate = new Date(inv_startdate);
          const endDate = new Date(inv_enddate);
          const joiningDate = new Date(inv_data.joining_Date); // Get user's joining date

          // Ensure valid dates
          if (isNaN(startDate) || isNaN(endDate) || isNaN(joiningDate)) {
            console.log("Invalid date provided.");
          }

          const effectiveStartDate =
            startDate < joiningDate ? joiningDate : startDate;

          if (effectiveStartDate > endDate) {
            // total_array.push({ key: "room_rent", amount: 0 });
            console.log("Amount is 0");
          }

          const total_days = Math.max(
            (endDate - effectiveStartDate) / (1000 * 60 * 60 * 24) + 1,
            0
          );

          // Calculate per-day room rent
          const daysInMonth = new Date(
            startDate.getFullYear(),
            startDate.getMonth() + 1,
            0
          ).getDate();
          const oneDayAmount = room_rent / daysInMonth;

          const totalRent = Math.round(oneDayAmount * total_days);

          total_array.push({ key: "Room Rent", amount: totalRent });

          const ebAmount = await new Promise((resolve, reject) => {
            var sql2 =
              "SELECT * FROM eb_settings WHERE hostel_id=? AND status=1";
            connection.query(sql2, [hostel_id], function (err, sql2_res) {
              if (err) {
                console.log("EB Settings Query Error:", err);
                return reject(err);
              }

              const today = moment();
              const lastMonth = moment().subtract(1, "months");

              let start_day = parseInt(sql2_res[0]?.start_date, 10) || 1; // Default to 1 if NULL
              var eb_start_date = lastMonth
                .date(start_day)
                .format("YYYY-MM-DD");
              var eb_end_date = moment(eb_start_date)
                .add(30, "days")
                .format("YYYY-MM-DD");

              eb_unit_amount = sql2_res[0]?.amount || 0;

              if (sql2_res[0]?.recuring == 0) {
                resolve(0);
              } else {
                var sql1 = `SELECT COALESCE(SUM(amount), 0) AS eb_amount FROM customer_eb_amount WHERE user_id = ? AND status = 1 AND date BETWEEN ? AND ?;`;
                connection.query(
                  sql1,
                  [inv_data.user_id, eb_start_date, eb_end_date],
                  function (err, eb_data) {
                    if (err) {
                      return reject(err);
                    }
                    resolve(eb_data[0].eb_amount || 0);
                  }
                );
              }
            });
          });

          total_array.push({ key: "Eb Amount", amount: ebAmount });

          var am_amounts = await new Promise((resolve, reject) => {
            var sql3 =
              "SELECT * FROM Amenities AS am JOIN AmnitiesName AS amname ON amname.id=am.Amnities_Id WHERE am.Status=1 AND am.Hostel_Id=?;";
            connection.query(sql3, [hostel_id], function (err, sql3_res) {
              if (err) {
                console.log("EB Settings Query Error:", err);
                return reject(err);
              }

              let amenityPromises = sql3_res.map((amenity) => {
                return new Promise((resolveAmenity, rejectAmenity) => {
                  if (amenity.recuring == 0) {
                    return resolveAmenity(null); // Skip non-recurring amenities
                  }

                  const lastMonth = moment().subtract(1, "months"); // Last month (e.g., Jan 2025)
                  const nextMonth = moment(); // Current month (Feb 2025)

                  let start_day = parseInt(amenity.startdate, 10) || 1;

                  const lastMonthDays = lastMonth.daysInMonth();
                  start_day = Math.min(Math.max(start_day, 1), lastMonthDays);

                  let am_start_date, am_end_date;
                  am_start_date = lastMonth
                    .date(start_day)
                    .format("YYYY-MM-DD");
                  am_end_date = moment(am_start_date)
                    .add(30, "days")
                    .format("YYYY-MM-DD");

                  const sql1 = `
                                        SELECT am.Amount, amname.Amnities_Name 
                                        FROM Amenities AS am 
                                        JOIN AmnitiesName AS amname ON amname.id = am.Amnities_Id 
                                        JOIN AmenitiesHistory AS ahis ON ahis.amenity_Id = am.id 
                                        WHERE ahis.user_Id = ? 
                                        AND ahis.status = 1 
                                        AND ahis.created_At BETWEEN ? AND ? 
                                        AND am.Status = 1
                                        AND NOT EXISTS (
                                            SELECT 1 FROM AmenitiesHistory ahis2 
                                            WHERE ahis2.amenity_Id = am.id 
                                            AND ahis2.status = 0 
                                            AND ahis2.created_At < ?
                                        );
                                    `;

                  // Execute query
                  connection.query(
                    sql1,
                    [string_userid, am_start_date, am_end_date, am_end_date],
                    function (err, sql1_res) {
                      if (err) {
                        return rejectAmenity(err);
                      }
                      console.log("SQL Result:", sql1_res);
                      resolveAmenity(sql1_res);
                    }
                  );
                });
              });

              Promise.all(amenityPromises)
                .then((results) => {
                  const filteredResults = results
                    .flat()
                    .filter((result) => result !== null);

                  console.log(
                    "All Amenity Queries Completed:",
                    filteredResults
                  );

                  filteredResults.forEach((item) => {
                    total_array.push({
                      key: item.Amnities_Name,
                      amount: item.Amount,
                    });
                  });

                  resolve(filteredResults);
                })
                .catch((error) => {
                  console.error("Error in Amenity Processing:", error);
                  reject(error);
                });
              // });
            });
          });

          console.log(
            `User: ${inv_data.ID}, Hostel: ${inv_data.Hostel_Id}, Start Date: ${inv_startdate}, End Date: ${inv_enddate}`
          );

          console.log(total_array);

          return res
            .status(200)
            .json({
              statusCode: 200,
              message: "Bill Amounts",
              data: total_array,
            });
        } else {
          return res
            .status(202)
            .json({
              message: "Kindly Enable Recuring Details",
              statusCode: 202,
              recure: 0,
            });
        }
      } else {
        return res
          .status(201)
          .json({ message: "Invalid Hostel Details", statusCode: 201 });
      }
    });
    // Rent Amount
    // var sql1 = "SELECT *, CASE WHEN checkoutDate IS NULL THEN DATEDIFF(LAST_DAY(CURDATE()), GREATEST(joining_date, DATE_FORMAT(CURDATE(), '%Y-%m-01'))) + 1 ELSE DATEDIFF(LEAST(checkoutDate, LAST_DAY(CURDATE())), GREATEST(joining_date, DATE_FORMAT(CURDATE(), '%Y-%m-01'))) + 1 END AS days_stayed FROM hostel WHERE Rooms != 'undefined' AND Floor != 'undefined' AND joining_date <= LAST_DAY(CURDATE()) AND (checkoutDate >= DATE_FORMAT(CURDATE(), '%Y-%m-01') OR checkoutDate IS NULL) AND isActive = 1 AND ID = ?";
    // connection.query(sql1, [user_id], (err, data) => {
    //     if (err) {
    //         return res.status(201).json({ message: "Unable to Get User Details", statusCode: 201 });
    //     } else if (data.length != 0) {

    //         var total_days = data[0].days_stayed;

    //         const currentDate = new Date(); // Current date
    //         const currentYear = currentDate.getFullYear(); // Get current year
    //         const currentMonth = currentDate.getMonth(); // Get current month (0-11)

    //         // Calculate total days in the current month
    //         const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    //         const oneDayAmount = data[0].RoomRent / daysInCurrentMonth;

    //         const totalRent = parseFloat((oneDayAmount * total_days).toFixed(2)); // Total rent rounded to 2 decimal places

    //         var roundedRent = Math.round(totalRent);

    //         var advance_amount = data[0].AdvanceAmount;

    //         var array_data = [{
    //             id: 1,
    //             name: "Room Rent",
    //             amount: roundedRent
    //         }, {
    //             id: 2,
    //             name: "Advance Amount",
    //             amount: advance_amount
    //         }, {
    //             id: 3,
    //             name: "Eb Rent",
    //             amount: 0
    //         }, {
    //             id: 4,
    //             name: "Amenities",
    //             amount: 0
    //         }
    //         ]

    //         return res.status(200).json({ statusCode: 200, message: "Bill Amounts", data: array_data })

    //     } else {
    //         return res.status(201).json({ message: "Invalid User Details", statusCode: 201 });
    //     }
    // });
  } else {
    res
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function all_recuring_bills(req, res) {
  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  var hostel_id = req.body.hostel_id;

  if (
    is_admin == 1 ||
    (role_permissions[11] && role_permissions[11].per_view == 1)
  ) {
    if (!hostel_id) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Missing Hostel Details" });
    }

    // var sql1 = "SELECT inv.id,inv.Name AS user_name,inv.Invoices,inv.DueDate,inv.Date AS invoice_date,DATE_ADD(inv.Date, INTERVAL 1 MONTH) AS next_invoice_date,inv.Status,inv.BalanceDue,inv.PaidAmount,inv.hos_user_id AS user_id,inv.action,inv.invoice_type FROM recuring_inv_details AS rec JOIN hostel AS hs ON hs.id=rec.user_id JOIN invoicedetails AS inv ON inv.hos_user_id=rec.user_id AND inv.action='recuring' WHERE rec.created_by=?";
    var sql1 =
      "SELECT rec.id AS recuire_id,inv.id,inv.Name AS user_name,inv.Invoices,inv.DueDate,inv.Date AS invoice_date,DATE_ADD(inv.Date, INTERVAL 1 MONTH) AS next_invoice_date,inv.Status,inv.BalanceDue,inv.PaidAmount, inv.Amount AS total_amount,inv.hos_user_id AS user_id,inv.action,inv.invoice_type,hs.stay_type FROM recuring_inv_details AS rec JOIN hostel AS hs ON hs.id = rec.user_id JOIN invoicedetails AS inv ON inv.hos_user_id = rec.user_id JOIN (SELECT hos_user_id, MAX(Date) AS latest_invoice_date FROM invoicedetails WHERE action IN ('recuring', 'auto_recuring') GROUP BY hos_user_id) AS latest_inv ON latest_inv.hos_user_id = inv.hos_user_id AND latest_inv.latest_invoice_date = inv.Date WHERE inv.action IN ('recuring', 'auto_recuring') AND inv.Hostel_Id=? AND rec.status=1 GROUP BY rec.user_id ORDER BY inv.id DESC;";
    connection.query(sql1, [hostel_id], function (err, inv_data) {
      if (err) {
        return res
          .status(201)
          .json({ message: "Unable to Get Bill Details", statusCode: 201 });
      } else {
        return res
          .status(200)
          .json({
            statusCode: 200,
            message: "Recuring Bill Details",
            data: inv_data,
          });
      }
    });
  } else {
    res
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function all_recuring_bills_stay_type(req, res) {
  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  var hostel_id = req.body.hostel_id;
  var stay_type = req.body.stay_type;

  if (
    is_admin == 1 ||
    (role_permissions[11] && role_permissions[11].per_view == 1)
  ) {
    if (!hostel_id) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Missing Hostel Details" });
    }
    if (!stay_type) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Missing stay_type Details" });
    }

    var sql1 = `SELECT 
        hstl.*, 
        CASE WHEN hstl.CheckoutDate IS NULL THEN 1 ELSE 0 END AS check_outed,
        bd.bed_no AS Bed,
        hstl.Bed AS hstl_Bed,
        hsroom.Room_Id AS Rooms,
        hstl.Rooms AS hstl_Rooms,
        hsroom.id AS room_id,
        hsroom.Room_Id,
        DATE_FORMAT(hstl.joining_Date, '%Y-%m-%d') AS user_join_date,
        hstl.Hostel_Id AS user_hostel,
        hf.floor_name 
      FROM hosteldetails AS hstlDetails 
      INNER JOIN hostel AS hstl 
        ON hstl.Hostel_Id = hstlDetails.id AND hstl.isActive = TRUE 
      LEFT JOIN country_list AS cl ON hstl.country_code = cl.country_code 
      LEFT JOIN hostelrooms hsroom 
        ON hsroom.Hostel_Id = hstlDetails.id AND hsroom.Floor_Id = hstl.Floor AND hsroom.id = hstl.Rooms 
      LEFT JOIN Hostel_Floor AS hf ON hf.floor_id = hstl.Floor AND hf.hostel_id = hstl.Hostel_Id 
      LEFT JOIN bed_details AS bd ON bd.id = hstl.Bed 
      WHERE hstl.Hostel_Id = ? and hstl.stay_type =?`;

    connection.query(sql1, [hostel_id, stay_type], function (err, inv_data) {
      if (err) {
        return res
          .status(201)
          .json({ message: "Unable to Get Bill Details", statusCode: 201 });
      } else {
        return res
          .status(200)
          .json({
            statusCode: 200,
            message: "Recuring Bill Details",
            data: inv_data,
          });
      }
    });
  } else {
    res
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function delete_recuring_bill(req, res) {
  var { id, user_id } = req.body;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[11] && role_permissions[11].per_delete == 1)
  ) {
    if (!id || !user_id) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    var sql1 = "SELECT * FROM recuring_inv_details WHERE id=? AND user_id=?";
    connection.query(sql1, [id, user_id], function (err, data) {
      if (err) {
        return res
          .status(201)
          .json({
            statusCode: 201,
            message: "Unable to Get Recuring Bill Details",
          });
      } else if (data.length != 0) {
        var sql2 = "UPDATE recuring_inv_details SET status=0 WHERE id=?";
        connection.query(sql2, [id], function (err, data) {
          if (err) {
            return res
              .status(201)
              .json({
                statusCode: 201,
                message: "Unable to Delete Recuring Bill Details",
              });
          } else {
            var sql3 =
              "UPDATE invoicedetails SET invoice_status=0 WHERE id=? AND action='recuring'";
            connection.query(sql3, [user_id], function (err, data) {
              if (err) {
                return res
                  .status(201)
                  .json({
                    statusCode: 201,
                    message: "Unable to Delete Recuring Bill Details",
                  });
              } else {
                return res
                  .status(200)
                  .json({
                    statusCode: 200,
                    message: "Recuring Bill Deleted Successfully!",
                  });
              }
            });
          }
        });
      } else {
        return res
          .status(201)
          .json({ statusCode: 201, message: "Invalid Bill Details" });
      }
    });
  } else {
    res
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function update_recuring_bill(req, res) {
  var { advance, rent, aminity, eb_amount, invoice_date, due_date, id } =
    req.body;

  if (!invoice_date || !due_date) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing Mandatory Fields" });
  }

  if (!advance) {
    advance = 0;
  }

  if (!rent) {
    rent = 0;
  }

  if (!aminity) {
    aminity = 0;
  }

  if (!eb_amount) {
    eb_amount = 0;
  }

  let dateObj = new Date(invoice_date); // Format: YYYY-MM-DD
  let inv_day = dateObj.getDate();

  let duedateObj = new Date(due_date); // Format: YYYY-MM-DD
  let due_day = duedateObj.getDate();

  var sql2 = "SELECT * FROM recuring_inv_details WHERE id=?";
  connection.query(sql2, [id], function (err, data) {
    if (err) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Unable to get Invoice Details" });
    } else if (data.length != 0) {
      var sql1 =
        "UPDATE recuring_inv_details SET invoice_date=?,due_date=?,advance=?,rent=?,aminity=?,eb=? WHERE id=?";
      connection.query(
        sql1,
        [inv_day, due_day, advance, rent, aminity, eb_amount],
        function (err, data) {
          if (err) {
            return res
              .status(201)
              .json({
                statusCode: 201,
                message: "Unable to Update Invoice Details",
              });
          } else {
            return res
              .status(201)
              .json({ statusCode: 201, message: "Changes Saved Successfully" });
          }
        }
      );
    } else {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Invalid Invoice Details" });
    }
  });
}

function edit_eb_readings(req, res) {
  var { id, hostel_id, floor_id, room_id, current_reading, date } = req.body;

  var atten = req.body;

  console.log(req.body);

  var created_by = req.user_details.id;

  if (!id || !current_reading || !date || !hostel_id || !floor_id || !room_id) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing Mandatory Fields" });
  }

  var sql1 =
    "SELECT * FROM EbAmount JOIN eb_settings ON eb_settings.hostel_Id=EbAmount.hostel_Id WHERE EbAmount.id=? AND eb_settings.status=1";
  connection.query(sql1, [id], function (err, eb_data) {
    if (err) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Unable to Get Eb Details" });
    } else if (eb_data.length != 0) {
      var end_Meter_Reading = eb_data[0].end_Meter_Reading;
      var total_reading = current_reading - eb_data[0].start_Meter_Reading;
      var total_amount = eb_data[0].amount * total_reading;
      var last_cal_date = eb_data[0].initial_date;
      var startMeterReading = eb_data[0].start_Meter_Reading;

      console.log("==========================", end_Meter_Reading);

      if (end_Meter_Reading == 0) {
        var sql2 = "UPDATE EbAmount SET start_Meter_Reading=? WHERE id=?";
        connection.query(sql2, [current_reading, id], function (err, up_res) {
          if (err) {
            return res
              .status(201)
              .json({
                statusCode: 201,
                message: "Unable to Update Eb Details",
              });
          } else {
            return res
              .status(200)
              .json({
                statusCode: 200,
                message: "Changes Saved Successfully1",
              });
          }
        });
      } else {
        var sql2 =
          "UPDATE EbAmount SET end_Meter_Reading=?,EbAmount=?,Eb_Unit=?,date=?,hostel_Id=?,Floor=?,Room=? WHERE id=?";
        connection.query(
          sql2,
          [
            current_reading,
            total_amount,
            total_reading,
            date,
            hostel_id,
            floor_id,
            room_id,
            id,
          ],
          function (err, up_res) {
            if (err) {
              return res
                .status(201)
                .json({
                  statusCode: 201,
                  message: "Unable to Update Eb Details",
                });
            } else {
              var sql3 = "SELECT * FROM customer_eb_amount WHERE eb_id=?";
              connection.query(sql3, [id], function (err, split_data) {
                if (err) {
                  return res
                    .status(201)
                    .json({
                      statusCode: 201,
                      message: "Unable to Update Customer Details",
                    });
                } else if (split_data.length != 0) {
                  var del_query =
                    "DELETE FROM customer_eb_amount WHERE eb_id=?";
                  connection.query(del_query, [id], function (err, del_data) {
                    if (err) {
                      return res
                        .status(201)
                        .json({
                          statusCode: 201,
                          message: "Unable to Update Customer Details",
                        });
                    } else {
                      split_eb_amounts(
                        atten,
                        startMeterReading,
                        current_reading,
                        last_cal_date,
                        total_amount,
                        total_reading,
                        id,
                        function (result) {
                          if (result.statusCode == 201) {
                            return res
                              .status(201)
                              .json({
                                statusCode: 201,
                                message: result.message,
                              });
                          } else {
                            console.log("First Step is ok");

                            const nextEntrySql =
                              "SELECT * FROM EbAmount WHERE id > ? ORDER BY id ASC LIMIT 1";
                            connection.query(
                              nextEntrySql,
                              [id],
                              function (err, nextEntryData) {
                                if (nextEntryData.length != 0) {
                                  const nextId = nextEntryData[0].id;
                                  const nextEndMeter =
                                    nextEntryData[0].end_Meter_Reading;
                                  const total_reading1 =
                                    nextEndMeter - current_reading;
                                  const total_amount1 =
                                    eb_data[0].amount * total_reading1;
                                  const nextStartMeterReading = current_reading;

                                  const updateNextEntrySql =
                                    "UPDATE EbAmount SET start_Meter_Reading = ?, EbAmount = ?, Eb_Unit = ? WHERE id = ?";
                                  connection.query(
                                    updateNextEntrySql,
                                    [
                                      nextStartMeterReading,
                                      total_amount1,
                                      total_reading1,
                                      nextId,
                                    ],
                                    function (err) {
                                      if (err) {
                                        return res
                                          .status(201)
                                          .json({
                                            statusCode: 201,
                                            message:
                                              "Unable to Update Next Entry Start Meter Reading",
                                          });
                                      } else {
                                        var del_query =
                                          "DELETE FROM customer_eb_amount WHERE eb_id=?";
                                        connection.query(
                                          del_query,
                                          [nextId],
                                          function (err, del_data) {
                                            if (err) {
                                              return res
                                                .status(201)
                                                .json({
                                                  statusCode: 201,
                                                  message:
                                                    "Unable to Update Customer Details",
                                                });
                                            } else {
                                              // Second call to split_eb_amounts with next data
                                              split_eb_amounts(
                                                atten,
                                                nextStartMeterReading,
                                                nextEndMeter,
                                                nextEntryData[0].initial_date,
                                                total_amount1,
                                                total_reading1,
                                                nextId,
                                                function (nextResult) {
                                                  if (
                                                    nextResult.statusCode ===
                                                    200
                                                  ) {
                                                    return res
                                                      .status(200)
                                                      .json({
                                                        statusCode: 200,
                                                        message:
                                                          "Changes Saved Successfully",
                                                      });
                                                  } else {
                                                    return res
                                                      .status(201)
                                                      .json({
                                                        statusCode: 201,
                                                        message:
                                                          nextResult.message,
                                                        error: nextResult.error,
                                                      });
                                                  }
                                                }
                                              );
                                            }
                                          }
                                        );
                                      }
                                    }
                                  );
                                } else {
                                  return res
                                    .status(200)
                                    .json({
                                      statusCode: 200,
                                      message: "Changes Saved Successfully",
                                    });
                                }
                              }
                            );
                            // return response.status(201).json({ statusCode: 201, message: result.message, error: result.error });
                            // return res.status(201).json({ statusCode: 201, message: result.message, error: result.error });
                          }
                        }
                      );
                    }
                  });
                } else {
                  return res
                    .status(200)
                    .json({
                      statusCode: 200,
                      message: "Changes Saved Successfully",
                    });
                }
              });
            }
          }
        );
      }

      function split_eb_amounts(
        atten,
        startMeterReading,
        end_Meter_Reading,
        last_cal_date,
        total_amount,
        total_reading,
        eb_id,
        callback
      ) {
        // Check Eb Amounts
        // var sql1 = "SELECT *,CASE WHEN checkoutDate IS NULL THEN DATEDIFF(LEAST(CURDATE(), '" + atten.date + "'), GREATEST(joining_date, '" + last_cal_date + "')) + 1 ELSE DATEDIFF(LEAST(checkoutDate, '" + atten.date + "'), GREATEST(joining_date, '" + last_cal_date + "')) + 1 END AS days_stayed FROM hostel WHERE Hostel_Id = ? AND Floor = ? AND Rooms = ? AND joining_date <= '" + atten.date + "' AND (checkoutDate >= '" + last_cal_date + "' OR checkoutDate IS NULL) AND customer_Role = 'user';";
        var sql1 =
          "SELECT *, CASE WHEN checkoutDate IS NULL THEN DATEDIFF(LEAST(CURDATE(), '" +
          atten.date +
          "'), GREATEST(joining_date, '" +
          last_cal_date +
          "')) + 1 ELSE DATEDIFF(LEAST(checkoutDate, '" +
          atten.date +
          "'), GREATEST(joining_date, '" +
          last_cal_date +
          "')) + 1 END AS days_stayed FROM hostel WHERE Hostel_Id = ? AND Floor = ? AND Rooms = ? AND joining_date <= '" +
          atten.date +
          "' AND (checkoutDate >= '" +
          last_cal_date +
          "' OR checkoutDate IS NULL);";
        console.log(sql1);

        connection.query(
          sql1,
          [
            atten.hostel_id,
            atten.floor_id,
            atten.room_id,
            last_cal_date,
            atten.date,
          ],
          function (err, user_data) {
            if (err) {
              // Send error response if the query fails
              console.error("Error fetching user details:", err);
              return callback({
                statusCode: 201,
                message: "Unable to Get User Details",
                error: err,
              });
            } else if (user_data.length !== 0) {
              let totalDays = user_data.reduce(
                (acc, user) => acc + user.days_stayed,
                0
              ); // Total days stayed
              const amountPerDay = total_amount / totalDays; // Calculate amount per day
              console.log(amountPerDay);
              let insertCounter = 0;

              user_data.forEach((user) => {
                const user_id = user.ID; // User ID from the result set
                const userDays = user.days_stayed; // Get the days stayed for this user
                const userAmount = Math.round(userDays * amountPerDay); // Calculate and round the amount for this user
                let per_unit = Math.round(
                  (userAmount / total_amount) * total_reading
                ); // Calculate and round the per unit

                console.log("Stay Date", user.days_stayed);

                console.log(
                  `User ID: ${user_id}, Per Unit: ₹${per_unit.toFixed(
                    2
                  )}, User Amount: ₹${userAmount.toFixed(2)}`
                );
                console.log(userAmount);

                if (userAmount) {
                  var sql2 =
                    "INSERT INTO customer_eb_amount (user_id, start_meter, end_meter, unit, amount, created_by,date,eb_id) VALUES (?, ?, ?, ?, ?, ?,?,?)";
                  connection.query(
                    sql2,
                    [
                      user_id,
                      startMeterReading,
                      end_Meter_Reading,
                      per_unit,
                      userAmount,
                      created_by,
                      atten.date,
                      eb_id,
                    ],
                    function (err) {
                      if (err) {
                        console.error(
                          "Error inserting customer EB amount:",
                          err
                        );
                        return callback({
                          statusCode: 201,
                          message: "Unable to Add EB Amount for User",
                          error: err,
                        });
                      } else {
                        insertCounter++;
                        if (insertCounter === user_data.length) {
                          return callback({
                            statusCode: 200,
                            message: "Changes Saved Successfully",
                          });
                        }
                      }
                    }
                  );
                } else {
                  console.log(
                    `User ID: ${user_id} has a zero amount, skipping insertion.`
                  );
                  insertCounter++;
                  // return callback({ statusCode: 200, message: 'Successfully Added EB Amount' });
                  if (insertCounter === user_data.length) {
                    return callback({
                      statusCode: 200,
                      message: "Changes Saved Successfully",
                    });
                  }
                }
              });
            } else {
              return callback({
                statusCode: 200,
                message: "Changes Saved Successfully",
              });
            }
          }
        );
      }
    } else {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Invalid Eb Details" });
    }
  });
}

function advance_invoice(req, res) {
  var user_id = req.body.user_id;
  var invoice_date = req.body.invoice_date;
  var due_date = req.body.due_date;

  if (!user_id || !invoice_date || !due_date) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing User or Invoice Details" });
  }

  var sql1 =
    "SELECT * FROM invoicedetails WHERE hos_user_id=? AND invoice_status=1 AND action='advance'";
  connection.query(sql1, [user_id], function (err, check_data) {
    if (err) {
      return res
        .status(201)
        .json({
          statusCode: 201,
          message: "Error to Fetch Invoice Details",
          reason: err.message,
        });
    }

    if (check_data.length != 0) {
      return res
        .status(201)
        .json({
          statusCode: 201,
          message: "Advance Invoice Already Generated",
        });
    }

    var sql2 =
      "SELECT rms.Price,rms.Hostel_Id AS roomHostel_Id,rms.Floor_Id AS roomFloor_Id,rms.Room_Id AS roomRoom_Id,dtls.id AS detHostel_Id,dtls.isHostelBased,dtls.prefix,dtls.suffix,dtls.Name,hstl.ID AS hos_user_id,hstl.User_Id,hstl.Address,hstl.Name AS UserName,hstl.Hostel_Id AS hosHostel_Id,hstl.Rooms AS hosRoom,hstl.Floor AS hosFloor,hstl.Bed,hstl.RoomRent,hstl.Name AS user_name,hstl.Phone,hstl.Email,hstl.Address,hstl.paid_advance,hstl.pending_advance,hstl.AdvanceAmount AS advance_amount, hstl.CheckoutDate,CASE WHEN dtls.isHostelBased = true THEN (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1)ELSE (SELECT eb.EbAmount FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1)END AS ebBill,(SELECT eb.Floor FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebFloor, (SELECT eb.hostel_Id FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1 ) AS ebhostel_Id,(SELECT eb.Room FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id ORDER BY eb.id DESC LIMIT 1) AS ebRoom,(SELECT eb.createAt FROM EbAmount eb WHERE eb.hostel_Id = hstl.Hostel_Id AND eb.Floor = hstl.Floor AND eb.Room = hstl.Rooms ORDER BY eb.id DESC LIMIT 1) AS createdAt,( SELECT invd.Invoices FROM invoicedetails invd WHERE invd.Invoices LIKE CONCAT(dtls.prefix, '%')ORDER BY CAST(SUBSTRING(invd.Invoices, LENGTH(dtls.prefix) + 1) AS UNSIGNED) DESC LIMIT 1) AS InvoiceDetails FROM hostel hstl INNER JOIN hosteldetails dtls ON dtls.id = hstl.Hostel_Id INNER JOIN hostelrooms rms ON rms.Hostel_Id = hstl.Hostel_Id AND rms.Floor_Id = hstl.Floor AND rms.id = hstl.Rooms WHERE hstl.isActive = true AND hstl.id =?;";
    connection.query(sql2, [user_id], async function (sel_err, sel_res) {
      if (sel_err) {
        return res
          .status(201)
          .json({
            statusCode: 201,
            message: "Error to Fetch User Details",
            reason: err.message,
          });
      } else if (sel_res.length != 0) {
        var inv_data = sel_res[0];

        var ad_amount = sel_res[0];

        var currentDate = moment().format("YYYY-MM-DD");
        var dueDate = moment(currentDate).endOf("month").format("YYYY-MM-DD");

        // if (inv_data.prefix && inv_data.suffix) {
        //     let numericSuffix;
        //     if (inv_data.InvoiceDetails != null) {
        //         numericSuffix = parseInt(inv_data.InvoiceDetails.substring(inv_data.prefix.length)) || 0;
        //         numericSuffix++;
        //     } else {
        //         numericSuffix = inv_data.suffix;
        //     }
        //     invoiceNo = inv_data.prefix + numericSuffix;
        // } else {
        //     const userID = inv_data.User_Id.toString().slice(0, 4);
        //     const month = moment(new Date()).month() + 1;
        //     const year = moment(new Date()).year();
        //     invoiceNo = "AD_INVC" + month + year + userID;
        // }

        const invoiceNo = await new Promise((resolve, reject) => {
          const options = {
            url: process.env.BASEURL + "/get_invoice_id",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ user_id: user_id }),
          };

          request(options, (error, response, body) => {
            if (error) {
              return reject(error);
            } else {
              const result = JSON.parse(body);
              console.log(result);

              if (result.statusCode == 200) {
                resolve(result.invoice_number);
              } else {
                resolve([]);
              }
            }
          });
        });

        console.log("invoice_id:", invoiceNo);

        var status = "Pending";

        var pending_advance = inv_data.advance_amount;

        var sql2 =
          "INSERT INTO invoicedetails (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, Date, DueDate, Invoices, Status, User_Id, RoomRent, EbAmount, AmnitiesAmount, Amnities_deduction_Amount, Hostel_Based, Room_Based, Bed,BalanceDue,PaidAmount,numberofdays,invoice_type,hos_user_id,action) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,0,2,?,'advance')";
        connection.query(
          sql2,
          [
            inv_data.user_name,
            inv_data.Phone,
            inv_data.Email,
            inv_data.Name,
            inv_data.detHostel_Id,
            inv_data.hosFloor,
            inv_data.hosRoom,
            inv_data.advance_amount,
            inv_data.Address,
            invoice_date,
            due_date,
            invoiceNo,
            status,
            inv_data.User_Id,
            0,
            0,
            0,
            0,
            0,
            0,
            inv_data.Bed,
            pending_advance,
            inv_data.paid_advance,
            inv_data.hos_user_id,
          ],
          function (ins_err, ins_res) {
            if (ins_err) {
              console.log("Insert Error", ins_err);
              return res
                .status(201)
                .json({
                  statusCode: 201,
                  message: "Error to Add Invoice Details",
                  reason: err?.message,
                });
            } else {
              var inv_id = ins_res.insertId;

              var sql3 =
                "INSERT INTO manual_invoice_amenities (am_name,user_id,amount,invoice_id) VALUES ('advance',?,?,?)";
              connection.query(
                sql3,
                [user_id, pending_advance, inv_id],
                function (err, ins_res) {
                  if (err) {
                    return res
                      .status(201)
                      .json({
                        statusCode: 201,
                        message: "Error to Add Invoice Details",
                        reason: err?.message,
                      });
                  } else {
                    console.log("Insert Successfully");
                    return res
                      .status(200)
                      .json({
                        statusCode: 200,
                        message: "Successfully Invoice Generated !",
                      });
                  }
                }
              );
            }
          }
        );
      } else {
        console.log("Invalid Advance User Details");
        return res
          .status(201)
          .json({ statusCode: 201, message: "In this User Not Assigned" });
      }
    });
  });
}

module.exports = {
  addRecurringBills,
  calculateAndInsertInvoice,
  getInvoiceList,
  InvoicePDf,
  EbAmount,
  getEBList,
  getEbStart,
  CheckOutInvoice,
  getInvoiceListForAll,
  InsertManualInvoice,
  UpdateInvoice,
  UpdateAmenitiesHistory,
  GetAmenitiesHistory,
  add_manual_invoice,
  customer_readings,
  add_recuring_bill,
  get_recuring_amount,
  all_recuring_bills,
  delete_recuring_bill,
  update_recuring_bill,
  edit_eb_readings,
  edit_manual_invoice,
  delete_manual_invoice,
  advance_invoice,
  all_recuring_bills_stay_type,
};
