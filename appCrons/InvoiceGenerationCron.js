const connection = require("../config/connection");
const nodeCron = require("node-cron");
const moment = require("moment");
const request = require("request");
const util = require("util");

// Make sure `connection` is already defined (like: const connection = mysql.createConnection(...))
const query = util.promisify(connection.query).bind(connection);

nodeCron.schedule("0 0 * * *", async () => {
  const today = moment().date();
  var sql1 =
    "SELECT rec.*,hs.*,hos.Name AS hostel_name,hos.inv_startdate,hos.inv_enddate,hos.bill_date FROM recuring_inv_details AS rec JOIN hostel AS hs ON hs.ID=rec.user_id JOIN hosteldetails AS hos ON hos.id=hs.Hostel_Id WHERE rec.status=1 AND hs.isActive=1;";
  connection.query(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else if (data.length != 0) {
      data.forEach((inv_data) => {
        const billingDate = parseInt(inv_data.bill_date, 10) || 0;
        let start_day = parseInt(inv_data.inv_startdate, 10) || 1;
        const lastMonth = moment().subtract(1, "months");
        const inv_startdate = lastMonth.date(start_day).format("YYYY-MM-DD");
        const inv_enddate = moment(inv_startdate)
          .add(30, "days")
          .format("YYYY-MM-DD");
        if (billingDate === today) {
          generateInvoiceForDate(inv_data, inv_startdate, inv_enddate);
        }
      });
    } else {
      console.log("No need to Check in this Cron");
    }
  });
});

function TestCron1 (){
   const today = moment().date();
  var sql1 =
    "SELECT rec.*,hs.*,hos.Name AS hostel_name,hos.inv_startdate,hos.inv_enddate,hos.bill_date FROM recuring_inv_details AS rec JOIN hostel AS hs ON hs.ID=rec.user_id JOIN hosteldetails AS hos ON hos.id=hs.Hostel_Id WHERE rec.status=1 AND hs.isActive=1;";
  connection.query(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else if (data.length != 0) {
      data.forEach((inv_data) => {
        const billingDate = parseInt(inv_data.bill_date, 10) || 0;
        let start_day = parseInt(inv_data.inv_startdate, 10) || 1;
        const lastMonth = moment().subtract(1, "months");
        const inv_startdate = lastMonth.date(start_day).format("YYYY-MM-DD");
        const inv_enddate = moment(inv_startdate)
          .add(30, "days")
          .format("YYYY-MM-DD");
          
        if (billingDate === today) {
          generateInvoiceForDate(inv_data, inv_startdate, inv_enddate);
        }
      });
    } else {
      console.log("No need to Check in this Cron");
    }
  });
}

async function generateInvoiceForDate1 (inv_data, inv_startdate, inv_enddate) {

  var total_array = [];

  var currentdate = moment().format("YYYY-MM-DD");

  var sql1 =
    "SELECT * FROM invoicedetails WHERE hos_user_id=? AND action='recuring' AND invoice_status=1 AND Date=?";
  connection.query(
    sql1,
    [inv_data.user_id, currentdate],
    async function (err, data) {
      if (err) {
        console.log(err);
      } else if (data.length != 0) {
        console.log("Invoice Already Generated");
      } else {
        try {
            console.log("-----------",inv_data,inv_data.length)
          const room_rent = inv_data.RoomRent;
          var hostel_id = inv_data.Hostel_Id;
          var string_userid = inv_data.User_Id;

          // Convert dates to Date objects
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
            console.log("Amount is 0",effectiveStartDate,endDate);
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
                    // console.log('*****',daysInMonth)
          const oneDayAmount = room_rent / daysInMonth;

          const totalRent = Math.round(oneDayAmount * total_days);

          total_array.push({ key: "room_rent", amount: room_rent });

          let eb_start_date;
          let eb_end_date;
          let eb_unit_amount;

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
              let end_day =
                parseInt(sql2_res[0]?.end_date, 10) ||
                lastMonth.endOf("month").date(); // Last month's last day if NULL

              if (sql2_res[0]?.end_date && end_day < today.date()) {
                end_day = parseInt(sql2_res[0]?.end_date, 10);
                start_day = parseInt(sql2_res[0]?.start_date, 10) || 1; // Get start date if provided, else default to 1
              }

              eb_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
              eb_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");

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

          total_array.push({ key: "eb_amount", amount: ebAmount });
          console.log("Total EB Amount:", ebAmount);
          console.log("eb_start_date:", eb_start_date);
          console.log("eb_end_date :", eb_end_date);

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
                  let end_day =
                    parseInt(amenity.enddate, 10) ||
                    lastMonth.endOf("month").date();

                  const lastMonthDays = lastMonth.daysInMonth();
                  start_day = Math.min(Math.max(start_day, 1), lastMonthDays);
                  end_day = Math.min(
                    Math.max(end_day, start_day),
                    lastMonthDays
                  );

                  let am_start_date, am_end_date;

                  if (
                    amenity.startdate &&
                    amenity.startdate === amenity.enddate
                  ) {
                    am_start_date = lastMonth
                      .date(start_day)
                      .format("YYYY-MM-DD");
                    am_end_date = nextMonth.date(end_day).format("YYYY-MM-DD"); // Moves end date to next month
                  } else {
                    am_start_date = lastMonth
                      .date(start_day)
                      .format("YYYY-MM-DD");
                    am_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");
                  }

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

          const totalAmount = total_array.reduce(
            (sum, item) => Number(sum) + Number(item.amount),
            0
          );

          console.log("Total Amount:", totalAmount);
console.log("inv_data",inv_data)
          if (totalAmount > 0) {
            // Generate Invoice Number
            const invoice_id = await new Promise((resolve, reject) => {
              const options = {
                url: process.env.BASEURL + "/get_invoice_id",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: inv_data.user_id ,template_type:"Rental Invoice"}),
              };

              request(options, (error, response, body) => {
                if (error) {
                  return reject(error);
                } else {
                  const result = JSON.parse(body);
                  console.log(result);

                  if (result.statusCode == 200) {
            //         let invoice_id =result.invoice_number
            //          console.log("invoice_id:", result.invoice_number);

            // const currentDate = moment().format("YYYY-MM-DD");

            // let today = moment();
            // let dueDay = parseInt(inv_data.due_date); // Convert due_date to integer

            // let dueDate = moment().set("date", dueDay);

            // if (today.date() > dueDay) {
            //   dueDate.add(1, "month");
            // }

            // var due_date = dueDate.format("YYYY-MM-DD");
            //          var sql2 =
            //   "INSERT INTO invoicedetails (Name,phoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,UserAddress,DueDate,Date,Invoices,Status,User_Id,Bed,BalanceDue,PaidAmount,action,invoice_type,hos_user_id,rec_invstartdate,rec_invenddate,rec_ebstartdate,rec_ebenddate,rec_ebunit,bill_enable) VALUES (?)";
            // var params = [
            //   inv_data.Name,
            //   inv_data.Phone,
            //   inv_data.Email,
            //   inv_data.HostelName,
            //   inv_data.Hostel_Id,
            //   inv_data.Floor,
            //   inv_data.Rooms,
            //   totalAmount,
            //   inv_data.Address,
            //   due_date,
            //   currentDate,
            //   invoice_id,
            //   "Pending",
            //   string_userid,
            //   inv_data.Bed,
            //   totalAmount,
            //   0,
            //   "recuring",
            //   1,
            //   inv_data.user_id,
            //   inv_startdate,
            //   inv_enddate,
            //   eb_start_date,
            //   eb_end_date,
            //   eb_unit_amount,
            //   true
            // ];
            // console.log(sql2,params)
            // connection.query(sql2, [params], function (err, ins_data) {
            //   if (err) {
            //     console.log("Add Invoice Error", err);
            //   } else {
            //     var inv_id = ins_data.insertId;
            //    console.log("ins_data",ins_data)
            //     if (total_array && total_array.length > 0) {
            //       // Prepare bulk insert values
            //       var amenityValues = total_array.map((item) => [
            //         item.key,
            //         inv_data.user_id,
            //         item.amount,
            //         inv_id,
            //       ]);

            //       var sql3 =
            //         "INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES ?";
            //       connection.query(sql3, [amenityValues], function (err) {
            //         if (err) {
            //           console.log("Error inserting amenity details:", err);
            //         } else {
            //           console.log("Invoice and Amenities Added Successfully");
            //         }
            //       });
            //     } else {
            //       console.log("Invoice Added Successfully (No Amenities)");
            //     }

            //     console.log("Recuring Invoice created");
            //   }
            // });
                  
            resolve(result.invoice_number);
                  } else {
                    resolve([]);
                  }
                }
              });
            });

            console.log("invoice_id:", invoice_id);

            const currentDate = moment().format("YYYY-MM-DD");

            let today = moment();
            let dueDay = parseInt(inv_data.due_date); // Convert due_date to integer

            let dueDate = moment().set("date", dueDay);

            if (today.date() > dueDay) {
              dueDate.add(1, "month");
            }

            var due_date = dueDate.format("YYYY-MM-DD");
            console.log("dueDate:", due_date);
            console.log(total_array);
            // return;

            var sql2 =
              "INSERT INTO invoicedetails (Name,phoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,UserAddress,DueDate,Date,Invoices,Status,User_Id,Bed,BalanceDue,PaidAmount,action,invoice_type,hos_user_id,rec_invstartdate,rec_invenddate,rec_ebstartdate,rec_ebenddate,rec_ebunit,bill_enable) VALUES (?)";
            var params = [
              inv_data.Name,
              inv_data.Phone,
              inv_data.Email,
              inv_data.HostelName,
              inv_data.Hostel_Id,
              inv_data.Floor,
              inv_data.Rooms,
              totalAmount,
              inv_data.Address,
              due_date,
              currentDate,
              invoice_id,
              "Pending",
              string_userid,
              inv_data.Bed,
              totalAmount,
              0,
              "recuring",
              1,
              inv_data.user_id,
              inv_startdate,
              inv_enddate,
              eb_start_date,
              eb_end_date,
              eb_unit_amount,
              true
            ];
            console.log(sql2,params)
            connection.query(sql2, [params], function (err, ins_data) {
              if (err) {
                console.log("Add Invoice Error", err);
              } else {
                var inv_id = ins_data.insertId;

                if (total_array && total_array.length > 0) {
                  // Prepare bulk insert values
                  var amenityValues = total_array.map((item) => [
                    item.key,
                    inv_data.user_id,
                    item.amount,
                    inv_id,
                  ]);

                  var sql3 =
                    "INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES ?";
                  connection.query(sql3, [amenityValues], function (err) {
                    if (err) {
                      console.log("Error inserting amenity details:", err);
                    } else {
                      console.log("Invoice and Amenities Added Successfully");
                    }
                  });
                } else {
                  console.log("Invoice Added Successfully (No Amenities)");
                }

                console.log("Recuring Invoice created");
              }
            });
          }
        } catch (error) {
          console.error("Error occurred:", error);
        }
      }
    }
  );
}
function TestCron (){
   const today = moment().date();
  var sql1 =
    "SELECT rec.*,hs.*,hos.Name AS hostel_name,hos.inv_startdate,hos.inv_enddate,hos.bill_date FROM recuring_inv_details AS rec JOIN hostel AS hs ON hs.ID=rec.user_id JOIN hosteldetails AS hos ON hos.id=hs.Hostel_Id WHERE rec.status=1 AND hs.isActive=1;";
  connection.query(sql1, function (err, data) {
    if (err) {
      console.log(err);
    } else if (data.length != 0) {
      data.forEach((inv_data) => {
        const billingDate = parseInt(inv_data.bill_date, 10) || 0;
        let start_day = parseInt(inv_data.inv_startdate, 10) || 1;
        const lastMonth = moment().subtract(1, "months");
        const inv_startdate = lastMonth.date(start_day).format("YYYY-MM-DD");
        const inv_enddate = moment(inv_startdate)
          .add(30, "days")
          .format("YYYY-MM-DD");
          
        if (billingDate === today) {
          generateInvoiceForDate(inv_data, inv_startdate, inv_enddate);
        }
      });
    } else {
      console.log("No need to Check in this Cron");
    }
  });
}

async function generateInvoiceForDate (inv_data, inv_startdate, inv_enddate) {

  var total_array = [];

  var currentdate = moment().format("YYYY-MM-DD");

  var sql1 =
    "SELECT * FROM invoicedetails WHERE hos_user_id=? AND action='recuring' AND invoice_status=1 AND Date=?";
  connection.query(
    sql1,
    [inv_data.user_id, currentdate],
    async function (err, data) {
      if (err) {
        console.log(err);
      } else if (data.length != 0) {
        console.log("Invoice Already Generated");
      } else {
        try {
            console.log("-----------1",inv_data)
          const room_rent = inv_data.RoomRent;
          var hostel_id = inv_data.Hostel_Id;
          var string_userid = inv_data.User_Id;

          // Convert dates to Date objects
          const startDate = new Date(inv_startdate);
          const endDate = new Date(inv_enddate);
          const joiningDate = new Date(inv_data.joining_Date); // Get user's joining date
   console.log("-----------2",joiningDate,inv_data.User_Id)
          // Ensure valid dates
          if (isNaN(startDate) || isNaN(endDate) || isNaN(joiningDate)) {
            console.log("Invalid date provided.");
          }

          const effectiveStartDate =
            startDate < joiningDate ? joiningDate : startDate;

          if (effectiveStartDate > endDate) {
            // total_array.push({ key: "room_rent", amount: 0 });
            console.log("Amount is 0",effectiveStartDate,endDate);
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
                    // console.log('*****',daysInMonth)
          const oneDayAmount = room_rent / daysInMonth;

          const totalRent = Math.round(oneDayAmount * total_days);

          total_array.push({ key: "room_rent", amount: room_rent });

          var eb_start_date;
          var eb_end_date;
          var eb_unit_amount;
          var ebAmount;
console.log("-----------3",total_array,inv_data.User_Id)
          // const ebAmount = await new Promise((resolve, reject) => {
//             var sql2 =
//               "SELECT * FROM eb_settings WHERE hostel_id=? AND status=1";
//             connection.query(sql2, [hostel_id], function (err, sql2_res) {
//               if (err) {
//                 console.log("EB Settings Query Error:", err);
//                 // return err;
//               }

//               const today = moment();
//               const lastMonth = moment().subtract(1, "months");

//               let start_day = parseInt(sql2_res[0]?.start_date, 10) || 1; // Default to 1 if NULL
//               let end_day =
//                 parseInt(sql2_res[0]?.end_date, 10) ||
//                 lastMonth.endOf("month").date(); // Last month's last day if NULL

//               if (sql2_res[0]?.end_date && end_day < today.date()) {
//                 end_day = parseInt(sql2_res[0]?.end_date, 10);
//                 start_day = parseInt(sql2_res[0]?.start_date, 10) || 1; // Get start date if provided, else default to 1
//               }

//               eb_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
//               eb_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");
// console.log("eb_start_date",eb_start_date)
//               eb_unit_amount = sql2_res[0]?.amount || 0;

//               if (sql2_res[0]?.recuring == 0) {
//                 // resolve(0);
//                 ebAmount =  0;
//               } else {
//                 var sql1 = `SELECT COALESCE(SUM(amount), 0) AS eb_amount FROM customer_eb_amount WHERE user_id = ? AND status = 1 AND date BETWEEN ? AND ?;`;
//                 connection.query(
//                   sql1,
//                   [inv_data.user_id, eb_start_date, eb_end_date],
//                   function (err, eb_data) {
//                     if (err) {
//                       return reject(err);
//                     }
//                     ebAmount = eb_data[0].eb_amount || 0;
//                   }
//                 );
//               }

// //  total_array.push({ key: "eb_amount", amount: ebAmount });
// //           console.log("Total EB Amount:", ebAmount);
// //           console.log("eb_start_date:", eb_start_date);
// //           console.log("eb_end_date :", eb_end_date);
//             });
// Step 1: Get EB settings
const ebSettings = await query("SELECT * FROM eb_settings WHERE hostel_id=? AND status=1", [hostel_id]);

if (!ebSettings.length) {
  console.log("No EB settings found.");
  eb_unit_amount = 0;
  eb_start_date = null;
  eb_end_date = null;
  ebAmount = 0;
} else {
  const ebConfig = ebSettings[0];

  const today = moment();
  const lastMonth = moment().subtract(1, "months");

  let start_day = parseInt(ebConfig.start_date, 10) || 1;
  let end_day = parseInt(ebConfig.end_date, 10) || lastMonth.endOf("month").date();

  if (ebConfig.end_date && end_day < today.date()) {
    end_day = parseInt(ebConfig.end_date, 10);
    start_day = parseInt(ebConfig.start_date, 10) || 1;
  }

  eb_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
  eb_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");
  eb_unit_amount = ebConfig.amount || 0;

  if (ebConfig.recuring == 0) {
    ebAmount = 0;
  } else {
    const ebData = await query(
      `SELECT COALESCE(SUM(amount), 0) AS eb_amount 
       FROM customer_eb_amount 
       WHERE user_id = ? AND status = 1 AND date BETWEEN ? AND ?`,
      [inv_data.user_id, eb_start_date, eb_end_date]
    );
    ebAmount = ebData[0].eb_amount || 0;
  }
}

          // });
// var ebAmount = await EBAmount(hostel_id,inv_data)
      
    
    // console.log('---------4')
          total_array.push({ key: "eb_amount", amount: ebAmount });
          console.log("Total EB Amount:", ebAmount);
          console.log("eb_start_date:", eb_start_date);
          console.log("eb_end_date :", eb_end_date);
     
// var am_amounts =await EBAmount();
console.log('------------4',total_array,inv_data.user_id)
          // var am_amounts = await new Promise((resolve, reject) => {
          //   var sql3 =
          //     "SELECT * FROM Amenities AS am JOIN AmnitiesName AS amname ON amname.id=am.Amnities_Id WHERE am.Status=1 AND am.Hostel_Id=?;";
          //   connection.query(sql3, [hostel_id], function (err, sql3_res) {
          //     if (err) {
          //       console.log("EB Settings Query Error:", err);
          //       return reject(err);
          //     }

          //     let amenityPromises = sql3_res.map((amenity) => {
          //       return new Promise((resolveAmenity, rejectAmenity) => {
          //         if (amenity.recuring == 0) {
          //           return resolveAmenity(null); // Skip non-recurring amenities
          //         }

          //         const lastMonth = moment().subtract(1, "months"); // Last month (e.g., Jan 2025)
          //         const nextMonth = moment(); // Current month (Feb 2025)

          //         let start_day = parseInt(amenity.startdate, 10) || 1;
          //         let end_day =
          //           parseInt(amenity.enddate, 10) ||
          //           lastMonth.endOf("month").date();

          //         const lastMonthDays = lastMonth.daysInMonth();
          //         start_day = Math.min(Math.max(start_day, 1), lastMonthDays);
          //         end_day = Math.min(
          //           Math.max(end_day, start_day),
          //           lastMonthDays
          //         );

          //         let am_start_date, am_end_date;

          //         if (
          //           amenity.startdate &&
          //           amenity.startdate === amenity.enddate
          //         ) {
          //           am_start_date = lastMonth
          //             .date(start_day)
          //             .format("YYYY-MM-DD");
          //           am_end_date = nextMonth.date(end_day).format("YYYY-MM-DD"); // Moves end date to next month
          //         } else {
          //           am_start_date = lastMonth
          //             .date(start_day)
          //             .format("YYYY-MM-DD");
          //           am_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");
          //         }

          //         const sql1 = `
          //                           SELECT am.Amount, amname.Amnities_Name 
          //                           FROM Amenities AS am 
          //                           JOIN AmnitiesName AS amname ON amname.id = am.Amnities_Id 
          //                           JOIN AmenitiesHistory AS ahis ON ahis.amenity_Id = am.id 
          //                           WHERE ahis.user_Id = ? 
          //                           AND ahis.status = 1 
          //                           AND ahis.created_At BETWEEN ? AND ? 
          //                           AND am.Status = 1
          //                           AND NOT EXISTS (
          //                               SELECT 1 FROM AmenitiesHistory ahis2 
          //                               WHERE ahis2.amenity_Id = am.id 
          //                               AND ahis2.status = 0 
          //                               AND ahis2.created_At < ?
          //                           );
          //                       `;

          //         // Execute query
          //         connection.query(
          //           sql1,
          //           [string_userid, am_start_date, am_end_date, am_end_date],
          //           function (err, sql1_res) {
          //             if (err) {
          //               return rejectAmenity(err);
          //             }
          //             console.log("SQL Result:", sql1_res);
          //             resolveAmenity(sql1_res);
          //           }
          //         );
          //       });
          //     });

          //     Promise.all(amenityPromises)
          //       .then((results) => {
          //         const filteredResults = results
          //           .flat()
          //           .filter((result) => result !== null);

          //         console.log(
          //           "All Amenity Queries Completed:",
          //           filteredResults
          //         );

          //         filteredResults.forEach((item) => {
          //           total_array.push({
          //             key: item.Amnities_Name,
          //             amount: item.Amount,
          //           });
          //         });

          //         resolve(filteredResults);
          //       })
          //       .catch((error) => {
          //         console.error("Error in Amenity Processing:", error);
          //         reject(error);
          //       });
          //     // });
          //   });
          // });

          let am_amounts = [];

const amenities = await query(
  `SELECT * FROM Amenities AS am 
   JOIN AmnitiesName AS amname ON amname.id = am.Amnities_Id 
   WHERE am.Status = 1 AND am.Hostel_Id = ?`,
  [hostel_id]
);

for (const amenity of amenities) {
  if (amenity.recuring == 0) continue; // Skip non-recurring

  const lastMonth = moment().subtract(1, "months");
  const nextMonth = moment();

  let start_day = parseInt(amenity.startdate, 10) || 1;
  let end_day = parseInt(amenity.enddate, 10) || lastMonth.endOf("month").date();

  const lastMonthDays = lastMonth.daysInMonth();
  start_day = Math.min(Math.max(start_day, 1), lastMonthDays);
  end_day = Math.min(Math.max(end_day, start_day), lastMonthDays);

  let am_start_date, am_end_date;

  if (amenity.startdate && amenity.startdate === amenity.enddate) {
    am_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
    am_end_date = nextMonth.date(end_day).format("YYYY-MM-DD");
  } else {
    am_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
    am_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");
  }

  const sql = `
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
      )
  `;

  try {
    const results = await query(sql, [string_userid, am_start_date, am_end_date, am_end_date]);
    if (results.length) {
      results.forEach((item) => {
        total_array.push({
          key: item.Amnities_Name,
          amount: item.Amount,
        });
        am_amounts.push(item);
      });
    }
  } catch (err) {
    console.error("Error in Amenity Query:", err);
  }
}

console.log("All Amenity Queries Completed:", am_amounts);
          const totalAmount = total_array.reduce(
            (sum, item) => Number(sum) + Number(item.amount),
            0
          );

          console.log("Total Amount:", totalAmount);
// console.log("inv_data",inv_data)
          if (totalAmount > 0) {
            const invoiceID  = await generateInvoice(inv_data,totalAmount, total_array, connection)
            // Generate Invoice Number
            // const invoice_id = await new Promise((resolve, reject) => {
            //   const options = {
            //     url: process.env.BASEURL + "/get_invoice_id",
            //     method: "POST",
            //     headers: { "Content-Type": "application/json" },
            //     body: JSON.stringify({ user_id: inv_data.user_id ,template_type:"Rental Invoice"}),
            //   };

            //   request(options, (error, response, body) => {
            //     if (error) {
            //       return reject(error);
            //     } else {
            //       const result = JSON.parse(body);
            //       console.log(result);

            //       if (result.statusCode == 200) {
            //         let invoice_id =result.invoice_number
            //          console.log("invoice_id:", result.invoice_number);

            // const currentDate = moment().format("YYYY-MM-DD");

            // let today = moment();
            // let dueDay = parseInt(inv_data.due_date); // Convert due_date to integer

            // let dueDate = moment().set("date", dueDay);

            // if (today.date() > dueDay) {
            //   dueDate.add(1, "month");
            // }

            // var due_date = dueDate.format("YYYY-MM-DD");
            //          var sql2 =
            //   "INSERT INTO invoicedetails (Name,phoneNo,EmailID,Hostel_Name,Hostel_Id,Floor_Id,Room_No,Amount,UserAddress,DueDate,Date,Invoices,Status,User_Id,Bed,BalanceDue,PaidAmount,action,invoice_type,hos_user_id,rec_invstartdate,rec_invenddate,rec_ebstartdate,rec_ebenddate,rec_ebunit,bill_enable) VALUES (?)";
            // var params = [
            //   inv_data.Name,
            //   inv_data.Phone,
            //   inv_data.Email,
            //   inv_data.HostelName,
            //   inv_data.Hostel_Id,
            //   inv_data.Floor,
            //   inv_data.Rooms,
            //   totalAmount,
            //   inv_data.Address,
            //   due_date,
            //   currentDate,
            //   invoice_id,
            //   "Pending",
            //   string_userid,
            //   inv_data.Bed,
            //   totalAmount,
            //   0,
            //   "recuring",
            //   1,
            //   inv_data.user_id,
            //   inv_startdate,
            //   inv_enddate,
            //   eb_start_date,
            //   eb_end_date,
            //   eb_unit_amount,
            //   true
            // ];
            // console.log(sql2,params)
            // connection.query(sql2, [params], function (err, ins_data) {
            //   if (err) {
            //     console.log("Add Invoice Error", err);
            //   } else {
            //     var inv_id = ins_data.insertId;
            //    console.log("ins_data",ins_data)
            //     if (total_array && total_array.length > 0) {
            //       // Prepare bulk insert values
            //       var amenityValues = total_array.map((item) => [
            //         item.key,
            //         inv_data.user_id,
            //         item.amount,
            //         inv_id,
            //       ]);

            //       var sql3 =
            //         "INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES ?";
            //       connection.query(sql3, [amenityValues], function (err) {
            //         if (err) {
            //           console.log("Error inserting amenity details:", err);
            //         } else {
            //           console.log("Invoice and Amenities Added Successfully");
            //         }
            //       });
            //     } else {
            //       console.log("Invoice Added Successfully (No Amenities)");
            //     }

            //     console.log("Recuring Invoice created");
            //   }
            // });
                  
            // resolve(result.invoice_number);
            //       } else {
            //         resolve([]);
            //       }
            //     }
            //   });
            // });
          }
        } catch (error) {
          console.error("Error occurred:", error);
        }
      }
    }
  );
}


// async function generateInvoice(inv_data, totalAmount, total_array, connection) {
//   try {
//     const response = await fetch(`${process.env.BASEURL}/get_invoice_id`, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({
//         user_id: inv_data.user_id,
//         template_type: "Rental Invoice",
//       }),
//     });

//     const result = await response.json();
//     console.log("Invoice ID API Response:", result);

//     if (result.statusCode !== 200) {
//       console.error("Invoice number fetch failed");
//       return [];
//     }

//     const invoice_id = result.invoice_number;
//     console.log("Invoice ID:", invoice_id);

//     const currentDate = moment().format("YYYY-MM-DD");
//     const today = moment();
//     const dueDay = parseInt(inv_data.due_date);
//     let dueDate = moment().set("date", dueDay);

//     if (today.date() > dueDay) {
//       dueDate.add(1, "month");
//     }

//     const due_date = dueDate.format("YYYY-MM-DD");
//     const string_userid = inv_data.user_id.toString();

//     const sql2 = `
//       INSERT INTO invoicedetails 
//       (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, 
//       DueDate, Date, Invoices, Status, User_Id, Bed, BalanceDue, PaidAmount, action, invoice_type, 
//       hos_user_id, rec_invstartdate, rec_invenddate, rec_ebstartdate, rec_ebenddate, rec_ebunit, bill_enable) 
//       VALUES (?)`;

//     const params = [
//       inv_data.Name,
//       inv_data.Phone,
//       inv_data.Email,
//       inv_data.HostelName,
//       inv_data.Hostel_Id,
//       inv_data.Floor,
//       inv_data.Rooms,
//       totalAmount,
//       inv_data.Address,
//       due_date,
//       currentDate,
//       invoice_id,
//       "Pending",
//       string_userid,
//       inv_data.Bed,
//       totalAmount,
//       0,
//       "recuring",
//       1,
//       inv_data.user_id,
//       inv_data.inv_startdate,
//       inv_data.inv_enddate,
//       inv_data.eb_start_date,
//       inv_data.eb_end_date,
//       inv_data.eb_unit_amount,
//       true,
//     ];

//     console.log("SQL2:", sql2);
//     console.log("Params:", params);

//     // Insert into invoicedetails
//     connection.query(sql2, [params], function (err, ins_data) {
//       if (err) {
//         console.log("Add Invoice Error", err);
//         return;
//       }

//       const inv_id = ins_data.insertId;
//       console.log("Invoice Inserted ID:", inv_id);

//       if (total_array && total_array.length > 0) {
//         const amenityValues = total_array.map((item) => [
//           item.key,
//           inv_data.user_id,
//           item.amount,
//           inv_id,
//         ]);

//         const sql3 = `
//           INSERT INTO manual_invoice_amenities 
//           (am_name, user_id, amount, invoice_id) VALUES ?`;

//         connection.query(sql3, [amenityValues], function (err) {
//           if (err) {
//             console.log("Error inserting amenity details:", err);
//           } else {
//             console.log("Invoice and Amenities Added Successfully");
//           }
//         });
//       } else {
//         console.log("Invoice Added Successfully (No Amenities)");
//       }

//       console.log("Recurring Invoice Created Successfully");
//     });

//     return invoice_id;
//   } catch (err) {
//     console.error("Error generating invoice:", err);
//     return [];
//   }
// }


async function generateInvoice(inv_data, totalAmount, total_array, connection) {
  try {
    const fetch = global.fetch || require('node-fetch'); // fallback if fetch not defined in older Node versions

    // 1. Fetch invoice number from API
    const response = await fetch(`${process.env.BASEURL}/get_invoice_id`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: inv_data.user_id, template_type: "Rental Invoice" }),
    });

    const result = await response.json();
    if (result.statusCode !== 200) {
      console.log("❌ Failed to get invoice number");
      return null;
    }

    const invoice_id = result.invoice_number;
    console.log("✅ Invoice ID received from API:", invoice_id);

    const currentDate = moment().format("YYYY-MM-DD");
    const today = moment();
    const dueDay = parseInt(inv_data.due_date);
    let dueDate = moment().set("date", dueDay);

    if (today.date() > dueDay) {
      dueDate.add(1, "month");
    }

    const due_date = dueDate.format("YYYY-MM-DD");

    // 2. Insert into invoicedetails
    const sql2 = `INSERT INTO invoicedetails 
      (Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, UserAddress, DueDate, Date, Invoices, Status, User_Id, Bed, BalanceDue, PaidAmount, action, invoice_type, hos_user_id, rec_invstartdate, rec_invenddate, rec_ebstartdate, rec_ebenddate, rec_ebunit, bill_enable) 
      VALUES (?)`;

    const params = [
      inv_data.Name,
      inv_data.Phone,
      inv_data.Email,
      inv_data.HostelName,
      inv_data.Hostel_Id,
      inv_data.Floor,
      inv_data.Rooms,
      totalAmount,
      inv_data.Address,
      due_date,
      currentDate,
      invoice_id,
      "Pending",
      inv_data.user_id.toString(),
      inv_data.Bed,
      totalAmount,
      0,
      "recuring",
      1,
      inv_data.user_id,
      inv_data.inv_startdate,
      inv_data.inv_enddate,
      inv_data.eb_start_date,
      inv_data.eb_end_date,
      inv_data.eb_unit_amount,
      true,
    ];

    console.log("🔄 Inserting invoice details...");
    const insertResult = await new Promise((resolve, reject) => {
      connection.query(sql2, [params], (err, data) => {
        if (err) return reject(err);
        resolve(data);
      });
    });

    const insertedId = insertResult.insertId;
    console.log("✅ Invoice inserted with ID:", insertedId);

    // 3. Re-check inserted invoice from DB
    const invoiceRow = await new Promise((resolve, reject) => {
      connection.query(
        "SELECT * FROM invoicedetails WHERE id = ?",
        [insertedId],
        (err, results) => {
          if (err) return reject(err);
          resolve(results[0]);
        }
      );
    });

    console.log("🔍 Verified inserted invoice:", invoiceRow);

    // 4. Insert amenities if present
    if (total_array && total_array.length > 0) {
      const amenityValues = total_array.map((item) => [
        item.key,
        inv_data.user_id,
        item.amount,
        insertedId,
      ]);

      const sql3 = `INSERT INTO manual_invoice_amenities 
        (am_name, user_id, amount, invoice_id) VALUES ?`;

      await new Promise((resolve, reject) => {
        connection.query(sql3, [amenityValues], (err) => {
          if (err) return reject(err);
          resolve();
        });
      });

      console.log("✅ Amenities inserted successfully");
    } else {
      console.log("ℹ️ No amenities to insert");
    }

    console.log("🎉 Recuring Invoice created successfully");
    return invoice_id;
  } catch (error) {
    console.error("🚨 Error in generateInvoice:", error);
    throw error;
  }
}




async function AMAmount (){
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
                  let end_day =
                    parseInt(amenity.enddate, 10) ||
                    lastMonth.endOf("month").date();

                  const lastMonthDays = lastMonth.daysInMonth();
                  start_day = Math.min(Math.max(start_day, 1), lastMonthDays);
                  end_day = Math.min(
                    Math.max(end_day, start_day),
                    lastMonthDays
                  );

                  let am_start_date, am_end_date;

                  if (
                    amenity.startdate &&
                    amenity.startdate === amenity.enddate
                  ) {
                    am_start_date = lastMonth
                      .date(start_day)
                      .format("YYYY-MM-DD");
                    am_end_date = nextMonth.date(end_day).format("YYYY-MM-DD"); // Moves end date to next month
                  } else {
                    am_start_date = lastMonth
                      .date(start_day)
                      .format("YYYY-MM-DD");
                    am_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");
                  }

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
          return am_amounts
}
async function EBAmount(hostel_id,inv_data){
  console.log("EBAMOUNT TRIGGERED")
    // const ebAmount = await new Promise((resolve, reject) => {
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
              let end_day =
                parseInt(sql2_res[0]?.end_date, 10) ||
                lastMonth.endOf("month").date(); // Last month's last day if NULL

              if (sql2_res[0]?.end_date && end_day < today.date()) {
                end_day = parseInt(sql2_res[0]?.end_date, 10);
                start_day = parseInt(sql2_res[0]?.start_date, 10) || 1; // Get start date if provided, else default to 1
              }

              eb_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
              eb_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");

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
                    return eb_data[0].eb_amount || 0;
                  }
                );
              }
            });
          // });
          // return ebAmount
}
module.exports ={TestCron}