const express = require("express");
var cors = require("cors");
const cron = require("node-cron");
const middleware = require("./middleware");
const connection = require("./config/connection");
const notifications = require("./notifications");
const assets = require("./assets");
const crons = require("./crons");
const whatsappCrons = require("./appCrons/whatsAppCrons");
const invoiceGenerationCrons = require("./appCrons/InvoiceGenerationCron");
const payments = require("./payments");
const importFunc = require("./components/import_func");
const xlsx = require("xlsx");
const fs = require("fs");
const bookings = require("./bookings");
const roles = require("./roles");
const exports_routes = require("./exports");
const newBookings = require("./new_bookings");
const BillTemplate = require("./bill_templates/bill_template");

var user_announcements_routes = require("./2factor/user_announcements");
const receipts = require("./receipts");
const referrals = require("./referrals");
const receiptPdf = require("./receipt_pdf");

const app = express();
const userQueries = require("./UserQueries");
const accountManagement = require("./AccountManagementQueries");
const invoiceQueries = require("./InvoiceQueries");
const recuringFrequencyQueries = require("./routes/frequencyTypes");
const profileQueries = require("./ProfileQueries");
const complianceQueries = require("./ComplianceQueries");
const pgQueries = require("./PgQueries");
const vendorQueries = require("./vendorQueries");
const expensesManagement = require("./ExpensesManagement");
var billings = require("./zoho_billing/billings");

const masterDataQueries = require("./routes/masterData");
const settingsQueries = require("./routes/settings");
const kycQueries = require("./routes/kycVerification");

const { sendTemplateMessage } = require("./whatsappTemplate");

const multer = require("multer");
const request = require("request");
const upload = multer();

const WEBHOOK_VERIFY_TOKEN = process.env.MYTOKEN;

var corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options("*", cors());

app.use(express.json());

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Headers",
    "X-Requested-With,Content-Type,Accept"
  );
  next();
});
const dbquery = require("./dbquery");

app.use(middleware);

app.listen(process.env.PORT, function () {
  console.log("node is started at " + process.env.PORT + "");
});

//Whatsapp_Clous_api

app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const challenge = req.query["hub.challenge"];
  const token = req.query["hub.verify_token"];

  if (mode && token === WEBHOOK_VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.status(201).json({ message: "Missing Token Details" });
  }
});

app.post("/webhook", async (req, res) => {
  const { entry } = req.body;

  if (!entry || entry.length === 0) {
    return res.status(400).send("Invalid Request");
  }

  const changes = entry[0].changes;

  if (!changes || changes.length === 0) {
    return res.status(400).send("Invalid Request");
  }

  const statuses = changes[0].value.statuses
    ? changes[0].value.statuses[0]
    : null;
  const messages = changes[0].value.messages
    ? changes[0].value.messages[0]
    : null;

  if (statuses) {
    console.log(
      `MESSAGE STATUS UPDATE: ID: ${statuses.id}, STATUS: ${statuses.status}`
    );
  }

  if (messages) {
    if (messages.type === "text") {
      const userPhoneNumber = messages.from;
      const messageText = messages.text.body;

      console.log(`Received message from ${userPhoneNumber}: ${messageText}`);

      // Save the message to in-memory array
      savedMessages.push({
        from: userPhoneNumber,
        text: messageText,
        timestamp: new Date(),
      });
    }
  }

  res.status(200).send("Webhook processed");
});

app.post("/send-whatsapp", async (req, res) => {
  const { to, templateName, parameters } = req.body;

  try {
    await sendTemplateMessage(to, templateName, parameters);

    return res.status(200).json({
      statusCode: 200,
      message: "WhatsApp message sent successfully",
    });
  } catch (err) {
    console.error("WhatsApp Error:", err.message);

    return res.status(500).json({
      statusCode: 500,
      error: "Failed to send WhatsApp message",
      details: err.message,
    });
  }
});

// ExpensesManagement

app.post("/add/add-expense", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  expensesManagement.AddExpense(request, response);
});
app.post("/add/expense-category", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  expensesManagement.AddExpenseCategory(request, response);
});

app.post("/edit/expense_category", (req, res) => {
  expensesManagement.edit_expense_category(req, res);
});

app.post("/get/expense-category", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  expensesManagement.GetExpensesCategory(request, response);
});

app.post("/calculate/hostel-expenses", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  expensesManagement.CalculateExpenses(request, response);
});

app.post("/get/get-hostel-expenses", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  expensesManagement.GetHostelExpenses(request, response);
});

app.post("/delete/delete-expenses", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  expensesManagement.DeleteExpenses(request, response);
});

app.post("/delete/delete-category", (req, res) => {
  // response.set('Access-Control-Allow-Origin', '*');
  expensesManagement.DeleteExpensesCategory(req, res);
});

app.post("/pdf/expense-pdf", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  expensesManagement.GenerateExpenseHistoryPDF(request, response);
});

// app.post('/add/add-salary',(request,response)=>{
//     response.set('Access-Control-Allow-Origin', '*');
//     expensesManagement.AddSalaryDetails(connection,request,response)
// })

// userQueries.js

app.post("/users/user-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  userQueries.getUsers(connection, response, request);
});

app.post("/users/delete", (req, res) => {
  newBookings.delete_user(req, res);
});

app.post("/reassign_checkIn", (req, res) => {
  userQueries.reassign_checkIn(req, res);
});



app.post("/add/adduser-list", upload.single("profile"), (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  userQueries.createUser(connection, request, response);
});

app.post("/unassigned-user-list", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  userQueries.unAssignedUserList(req, res);
});


app.post("/generate/advance_invoice", (req, res) => {
  invoiceQueries.advance_invoice(req, res);
});

// Not Use
app.get("/user-list/bill-payment", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  userQueries.getPaymentDetails(connection, response);
});

app.post(
  "/create/create-account",
  upload.single("profile"),
  (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");

    const reqBodyData = {
      profile: request.file,
      id: request.body.id,
      name: request.body.name,
      mobileNo: request.body.mobileNo,
      emailId: request.body.emailId,
      Address: request.body.Address,
      Country: request.body.Country,
      City: request.body.City,
      State: request.body.State,
      password: request.body.password,
    };
    console.log("reqBodyData **", reqBodyData);
    accountManagement.createAccountForLogin(connection, reqBodyData, response);
  }
);

// Update Admin Details API
app.post(
  "/update_account_details",
  upload.single("profile"),
  (request, response) => {
    accountManagement.update_account_details(request, response);
  }
);

app.post("/newaccount/create-account", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  // const reqBodyData = request.body
  accountManagement.createnewAccount(request, response);
});

app.get("/login/login", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const { email_Id, password } = request.query;
  accountManagement.loginAccount(connection, response, email_Id, password);
});

// forgetPassword API
app.post("/forget/select-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const reqData = request.body;
  accountManagement.forgetPassword(connection, response, reqData);
});

app.post("/otp-send/send-mail", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const requestData = request.body;
  // console.log("requestData", requestData)
  accountManagement.forgetPasswordOtpSend(connection, response, requestData);
});
app.post("/otp-send/response", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const requestData = request.body;
  accountManagement.sendResponseOtp(connection, response, requestData);
});

// cron.schedule("0 0 1 * * ", function () {
//     console.log("This task runs every minute");
//     connection.query(`SELECT * FROM hostel where isActive=true`, async function (err, users) {
//         if (err) {
//             console.error("Error fetching users:", err);
//             return;
//         } else {
//             let isFirstTime = true;
//             for (const user of users) {
//                 await invoiceQueries.calculateAndInsertInvoice(connection, user, users, isFirstTime);
//                 isFirstTime = false;
//             }
//         }
//     });
// });

// Not Use
app.get("/checkout/checkout-invoice", (request, response) => {
  connection.query(`SELECT * FROM hostel`, function (err, users) {
    // console.log("users",users)
    if (err) {
      console.error("Error fetching users:", err);
      return;
    }
    users.forEach((user) => {
      const userID = user.User_Id;
      invoiceQueries.CheckOutInvoice(connection, user, users);
    });
  });
});

// Not Use
app.post("/manual/manual-invoice", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const reqData = request.body;
  // console.log("reqData", reqData)
  connection.query(`SELECT * FROM hostel`, function (err, users) {
    //  console.log(" users", users)
    if (err) {
      console.error("Error fetching users:", err);
      return;
    }
    const ParticularUser = users.filter((user) => {
      return user.User_Id == reqData.User_Id;
    });
    // console.log("ParticularUser",ParticularUser)
    invoiceQueries.InsertManualInvoice(
      connection,
      users,
      reqData,
      ParticularUser
    );
  });
});

// Not Use
app.get("/list/invoice-for-all-user-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  invoiceQueries.getInvoiceListForAll(connection, response);
});

app.post("/list/invoice-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  invoiceQueries.getInvoiceList(connection, response, request);
});

// Not Use
app.get("/list/eb_list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  invoiceQueries.getEBList(connection, request, response);
});

app.post("/invoice/invoice-list-pdf", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  invoiceQueries.InvoicePDf(connection, request, response);
});

app.post("/create/isEnable", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  let reqBodyData = request.body;
  profileQueries.IsEnableCheck(connection, reqBodyData, response);
});

// Not use
app.get("/get/userAccount", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  profileQueries.getAccount(connection, response);
});

app.post("/compliance/add-details", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  complianceQueries.AddCompliance(connection, request, response);
});

app.post("/compliance/change_details", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  complianceQueries.change_details(request, response);
});

app.post("/compliance/compliance-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  complianceQueries.GetComplianceList(connection, response, request);
});

// app.post('/complaint/delete_compliant', complianceQueries.delete_compliant)

app.post("/complaint/delete_compliant", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  complianceQueries.delete_compliant(request, response);
});

app.post("/list/hostel-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.getHostelList(request, response);
});

app.get("/list/hosteldetails", (req, res) => {
  pgQueries.hosteldetails(req, res);
});

app.get("/room-id/check-room-id", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.checkRoom(connection, request, response);
});

// Not Use
app.get("/hostel/list-details", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.hostelListDetails(connection, response);
});

// app.post('/add/new-hostel', (request, response) => {
//     response.set('Access-Control-Allow-Origin', '*');
//     pgQueries.createPG(connection, request, response)
// })

// {name: pgName, phoneNo: mobile,email_Id: email, location: location

// app.post('/add/new-hostel', upload.single('profile'), (request, response) => {
//     response.set('Access-Control-Allow-Origin', '*');
//     const reqHostel = {
//         profile: request.file,
//         hostel_Name: request.body.name,
//         hostel_Phone: request.body.phoneNo,
//         hostel_email_Id: request.body.email_Id,
//         hostel_location: request.body.location,
//         id: request.body.id
//     };

//     pgQueries.createPG(connection, reqHostel, response, request)
// })

app.post(
  "/add/new-hostel",
  upload.fields([
    { name: "profile", maxCount: 1 },
    { name: "image1", maxCount: 1 },
    { name: "image2", maxCount: 1 },
    { name: "image3", maxCount: 1 },
    { name: "image4", maxCount: 1 },
  ]),
  (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    const reqHostel = {
      // profile: request.file,
      profile: req.files["profile"] ? req.files["profile"][0] : 0,
      image1: req.files["image1"] ? req.files["image1"][0] : 0,
      image2: req.files["image2"] ? req.files["image2"][0] : 0,
      image3: req.files["image3"] ? req.files["image3"][0] : 0,
      image4: req.files["image4"] ? req.files["image4"][0] : 0,
      hostel_name: req.body.name,
      hostel_phone: req.body.phoneNo,
      hostel_email: req.body.email_Id,
      hostel_location: req.body.location,
      id: req.body.id,
    };
    console.log(reqHostel.profile);

    pgQueries.createPG(reqHostel, res, req);
  }
);

app.post("/list/floor-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.FloorList(connection, request, response);
});

app.post("/list/rooms-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.RoomList(connection, request, response);
});

app.post("/list/bed-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.BedList(connection, request, response);
});

app.post("/list/numberOf-Rooms", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.RoomCount(connection, request, response);
});

app.post("/floor_list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.ListForFloor(connection, request, response);
});

app.post("/room/create-room", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.CreateRoom(connection, request, response);
});

app.post("/floor/create-floor", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.CreateFloor(request, response);
});

app.post("/update_floor", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.update_floor(request, response);
});

app.post("/check/room-full", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.RoomFull(connection, request, response);
});

app.post("/invoice/settings", upload.single("profile"), (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");

  // console.log("reqInvoice **", reqInvoice)
  profileQueries.InvoiceSettings(connection, request, response);
});

app.post("/list/amenities-list", (req, res) => {
  // response.set('Access-Control-Allow-Origin', '*')
  profileQueries.getAmenitiesList(req, res);
});

// Not Use
app.post("/EB/Hostel_Room_based", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  var atten = request.body;
  profileQueries.UpdateEB(connection, atten, response);
});

app.post("/amenities/setting", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  profileQueries.AmenitiesSetting(connection, request, response);
});

app.post("/amenities/delete", (req, res) => {
  notifications.delete_amenities(req, res);
});

// Not Use
app.post("/ebamount/setting", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  invoiceQueries.EbAmount(connection, request, response);
});
// app.post('/AmnitiesName_list', (request, response) => {
//     response.set('Access-Control-Allow-Origin', '*');
//     const atten = request.body
//     invoiceQueries.AmenitiesName(connection, atten, response)
// })

// Check API Use or Not
app.get("/list/EbReading", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  profileQueries.getEbReading(connection, response);
});

app.post("/list/Ebstartmeter", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  invoiceQueries.getEbStart(connection, response, request);
});
app.post("/amenities/amnityUpdate", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  profileQueries.UpdateAmnity(request, response);
});
app.get("/list/AmnitiesName", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  userQueries.getAmnitiesName(connection, request, response);
});

// Not use
app.post("/checkout/checkout-user", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const attenData = request.body;
  userQueries.CheckOutUser(connection, response, attenData);
});

app.post("/list/dashboard", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.listDashBoard(connection, response, request);
});

app.post("/get_user_details", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  accountManagement.get_user_details(connection, request, response);
});

app.get("/plan_details", (req, res) => {
  accountManagement.plan_details(req, res);
});

// Not Use
app.post("/invoice/invoiceUpdate", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const atten = request.body;
  console.log("request.body", request.body);
  invoiceQueries.UpdateInvoice(connection, response, atten);
});

// delete API

app.post("/delete/delete-hostel", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.deleteHostel(request, response);
});

app.post("/delete/delete-floor", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.deleteFloor(connection, response, request);
});
app.post("/delete/delete-room", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.deleteRoom(connection, response, request);
});
app.post("/delete/delete-bed", (req, res) => {
  pgQueries.deleteBed(req, res);
});

// Add Invoice Record Payment API
app.post("/transaction/list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  userQueries.transitionlist(request, response);
});

app.post("/Refundtransitionlist", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  userQueries.Refundtransitionlist(request, response);
});

// Forgot Password Otp Response
app.post("/forgot_otp_response", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const requestData = request.body;
  accountManagement.forgotpassword_otp_response(
    connection,
    response,
    requestData
  );
});

// Payment History
// Not Use
app.post("/payment_history", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  accountManagement.payment_history(connection, response, request);
});

// transactionHistory
// Not Use
app.post("/hostel/transaction-history", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  accountManagement.transactionHistory(connection, response, request);
});

// Not Use
app.post("/hostel/transaction-pdf", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  accountManagement.transactionHistoryPDF(connection, response, request);
});

app.post("/add/amenity-history", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  invoiceQueries.UpdateAmenitiesHistory(connection, response, request);
});

// Not use
app.post("/amenity/list-amenity-history", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  const reqdata = req.body;
  invoiceQueries.GetAmenitiesHistory(connection, res, reqdata);
});

// ************* Use it Later ***********//
// Get Room Details
app.post("/get_room_details", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.get_room_details(connection, request, response);
});

// Update Particular Room Details
// Not use
app.post("/update_room_details", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  pgQueries.update_room_details(connection, request, response);
});
// ************* Use it Later ***********//

// Truncate all tables
app.get("/truncate_tables", (request, response) => {
  const excludeTable = "createaccount";

  var sql1 = "SHOW TABLES";
  connection.query(sql1, function (err, tables) {
    if (err) {
      return response
        .status(201)
        .json({ message: "Unable to Connect Database", statusCode: 201 });
    }

    var tableNames = tables
      .map((row) => Object.values(row)[0])
      .filter((name) => name !== excludeTable);

    if (tableNames.length === 0) {
      console.log("No tables to truncate.");
      return response
        .status(201)
        .json({ message: "No tables found to truncate", statusCode: 201 });
    }

    const truncateQueries = tableNames
      .map((name) => `TRUNCATE TABLE \`${name}\`;`)
      .join(" ");

    connection.query(truncateQueries, (err) => {
      if (err) {
        return response
          .status(201)
          .json({
            message: "Failed to truncate some tables",
            reason: err.message,
            statusCode: 201,
          });
      }

      console.log("All tables truncated successfully, except createaccount.");
      return response
        .status(200)
        .json({
          message:
            "All tables truncated successfully (excluding createaccount)",
          statusCode: 200,
        });
    });
  });
});

// ****************** Notification Start ***************** //
// Get all Notifications
app.get("/all_notifications", (req, res) => {
  notifications.all_notifications(req, res);
});

// Add New Notification
app.post("/add_notification", (req, res) => {
  notifications.add_notification(req, res);
});

// Update Notification
app.post("/update_notification", (req, res) => {
  notifications.update_notification_status(req, res);
});

// ****************** Notification End ***************** //

app.post(
  "/add/update_vendor",
  upload.single("profile"),
  (request, response) => {
    response.set("Access-Control-Allow-Origin", "*");
    const reqInvoice = {
      profile: request.file,
      firstName: request.body.first_Name,
      LastName: request.body.Last_Name,
      Vendor_Mobile: request.body.Vendor_Mobile,
      Vendor_Email: request.body.Vendor_Email,
      Vendor_Address: request.body.Vendor_Address,
      Vendor_Id: request.body.Vendor_Id,
      Business_Name: request.body.Business_Name,
      id: request.body.id,
      Country: request.body.Country,
      Pincode: request.body.Pincode,
    };
    console.log("reqInvoice", reqInvoice);
    vendorQueries.ToAddAndUpdateVendor(
      connection,
      reqInvoice,
      response,
      request
    );
  }
);

app.post("/get/vendor_list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  vendorQueries.GetVendorList(connection, response, request);
});

app.post("/delete-vendor-list", (request, response) => {
  response.set("Access-Control-Allow-Origin", "*");
  const reqVendor = request.body;
  vendorQueries.TodeleteVendorList(connection, response, request, reqVendor);
});
// ****************** Assets Start ***************** //

// All Asset Details
app.post("/all_assets", (req, res) => {
  assets.all_assets(req, res);
});

app.post("/add_asset", (req, res) => {
  assets.add_asset(req, res);
});

app.post("/remove_asset", (req, res) => {
  assets.remove_asset(req, res);
});

// Assign Asset
app.post("/assign_asset", (req, res) => {
  assets.asseign_asset(req, res);
});

// ****************** Assets End ******************* //

// Get Customer all details
app.post("/customer_details", (req, res) => {
  userQueries.customer_details(req, res);
});

// Amentites Details for particular user
app.post("/user_amenities_history", (req, res) => {
  userQueries.user_amenities_history(req, res);
});

// ****************** Expenses Start ******************* //

// Add Expenses
app.post("/add_expenses", (req, res) => {
  assets.add_expenses(req, res);
});

app.post("/add_expense_tag", (req, res) => {
  assets.add_expense_tag(req, res);
});

app.post("/remove_expenses", (req, res) => {
  assets.remove_expenses(req, res);
});

app.get("/all_expenses", (req, res) => {
  assets.all_expenses(req, res);
});

// CREATE BED .............

app.post("/create-bed", (req, res) => {
  pgQueries.createBed(req, res);
});

app.post("/bed_details", (req, res) => {
  pgQueries.bed_details(req, res);
});

app.post("/complaint_types", (req, res) => {
  complianceQueries.add_complainttypes(req, res);
});

app.post("/edit_complaint_type", (req, res) => {
  complianceQueries.edit_complaint_type(req, res);
});

app.post("/all_complaint_types", (req, res) => {
  complianceQueries.all_complaint_types(req, res);
});

app.post("/remove_complaint_type", (req, res) => {
  complianceQueries.remove_complaint_types(req, res);
});

//  Eb Billing Amount values
app.post("/add_ebbilling_settings", (req, res) => {
  vendorQueries.add_ebbilling_settings(req, res);
});

app.post("/get_ebbilling_settings", (req, res) => {
  vendorQueries.get_ebbilling_settings(req, res);
});

app.post("/aadhar_verify_otp", (req, res) => {
  userQueries.aadhar_verify_otp(req, res);
});

app.post("/aadhaar_otp_verification", (req, res) => {
  userQueries.aadhaar_otp_verify(req, res);
});

// Reports API
app.post("/all_reports", (req, res) => {
  assets.all_reports(req, res);
});

//================= Zoho Billing API =======================//

app.get("/invoice_details/:customer_id", (req, res) => {
  billings.invoice_details(req, res);
});

// // Add Payment for Subscription
app.post("/new_subscription", (req, res) => {
  billings.new_subscription(req, res);
});

app.post("/webhook/payment-status", (req, res) => {
  billings.webhook_status(req, res);
});

// Invoice Payment
app.post("/invoice_record_payments", (req, res) => {
  billings.invoice_payments(req, res);
});

app.get("/plans_list", (req, res) => {
  billings.plans_list(req, res);
});

// Add Razorpay details
app.post("/add_payment_details", (req, res) => {
  payments.add_payment_details(req, res);
});

app.get("/payment_details", (req, res) => {
  payments.payment_details(req, res);
});

// app.post('/cancel_plan', (req, res) => {
//     payments.payment_details(req, res)
// })

//================= Zoho Billing API =======================//

app.get("/conutry_list", (req, res) => {
  userQueries.conutry_list(req, res);
});

app.post("/whatsapp_message", (req, res) => {
  const api_url = "https://graph.facebook.com/v20.0/419212591270391/messages";
  const method = "POST";

  const options = {
    url: api_url,
    method: method,
    headers: {
      Authorization:
        "Bearer EAAHVgyMqRjMBOyORrmc40ZBozdMZAGusy2OhZBZChQVEViE2ar0fHYyGMzKZA9BKP5Hd4anGfSrqHuiOQe8FdjfehOXPhZBDM43ziZBPaCkmOT6ZBGDU3IgR3QZCs6xLrjT5Y7Yn7XyLhNR1YPuWSRM2BrLlrHR2A33ZAd005ZCMplPtPrKETO5VepWOjqNMnxjuNyD1EzZAYH0ZCWWF2pJzOsSJIfZBXqmhYZD",
      "Content-Type": "application/json",
    },
    // body: JSON.stringify({
    //     messaging_product: "whatsapp",
    //     to: "919965003581",
    //     type: "text",
    //     text: {
    //         body: "Hello! Welcome to Smart Stay",
    //     },
    // })
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: "919965003581",
      type: "template",
      template: {
        name: "hello_world",
        language: { code: "en_US" },
      },
    }),
  };

  request(options, (error, response, body) => {
    if (error) {
      console.error("error:", error);
      res.status(201).send({ error: "Message sending failed" });
    } else {
      console.log("response body", body);
      res.status(200).send({ message: "Message sent successfully" });
    }
  });
});

app.post("/import_hostel_users", upload.single("xlfile"), (req, res) => {
  importFunc.import_hostel_users(req, res);
});

app.post("/import_hostel_details", upload.single("hos_details"), (req, res) => {
  importFunc.import_hostel_details(req, res);
});

app.post("/add_manual_invoice", (req, res) => {
  invoiceQueries.add_manual_invoice(req, res);
});

app.post("/edit_manual_invoice", (req, res) => {
  invoiceQueries.edit_manual_invoice(req, res);
});

app.post("/delete_manual_invoice", (req, res) => {
  invoiceQueries.delete_manual_invoice(req, res);
});

// Show Invoice Id
app.post("/get_invoice_id", (req, res) => {
  userQueries.get_invoice_id(req, res);
});

//New Changes
app.post("/get-InvoiceId", (req, res) => {
  userQueries.getInvoiceIDNew(req, res);
});

// Get Rent, Eb and Amenity Amount
app.post("/get_user_amounts", (req, res) => {
  userQueries.get_user_amounts(req, res);
});

// Export Expenses
app.post("/export_expenses", (req, res) => {
  var sql1 =
    "SELECT ex.*,ca.category_Name FROM expenses AS ex JOIN Expense_Category_Name AS ca ON ex.category_id=ca.id WHERE ex.created_by=5 AND ex.status=1;";
  // Get Month Based
  // var sql1 = "SELECT ex.*, ca.category_Name FROM expenses AS ex JOIN Expense_Category_Name AS ca ON ex.category_id = ca.id WHERE ex.created_by = 5 AND YEAR(ex.purchase_date) = ? AND MONTH(ex.purchase_date) = ?"
  connection.query(sql1, function (err, data) {
    if (err) {
      return res.status(201).json({ message: "Unable to Get Expense Details" });
    } else if (data.length != 0) {
      const worksheet = xlsx.utils.json_to_sheet(data);

      // Create a new workbook and append the worksheet
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // Export the workbook to an Excel file
      const filePath = "prod_expenses.xlsx";
      xlsx.writeFile(workbook, filePath);
      console.log(`Excel file saved as ${filePath}`);
    }
  });
});

// Export Expenses
app.post("/export_invoices", (req, res) => {
  var sql1 =
    "SELECT ass.*,ven.Vendor_Name FROM assets AS ass JOIN Vendor AS ven ON ass.vendor_id=ven.id WHERE ass.created_by=5 AND ass.status=1;";
  connection.query(sql1, function (err, data) {
    if (err) {
      return res.status(201).json({ message: "Unable to Get Invoice Details" });
    } else if (data.length != 0) {
      const worksheet = xlsx.utils.json_to_sheet(data);

      // Create a new workbook and append the worksheet
      const workbook = xlsx.utils.book_new();
      xlsx.utils.book_append_sheet(workbook, worksheet, "Sheet1");

      // Export the workbook to an Excel file
      const filePath = "invoices_prod.xlsx";
      xlsx.writeFile(workbook, filePath);
      console.log(`Excel file saved as ${filePath}`);
    }
  });
});

// Show Invoice Id
app.post("/get_beduser_details", (req, res) => {
  userQueries.get_beduser_details(req, res);
});

app.post("/get_bill_details", (req, res) => {
  userQueries.get_bill_details(req, res);
});

app.post("/add_write_Off", (req, res) => {
  userQueries.add_write_Off(req, res);
});

app.post(
  "/add_booking",
  upload.fields([{ name: "profile", maxCount: 1 }]),
  (req, res) => {
    newBookings.add_booking(req, res);
  }
);

app.post("/Booking_Inactive", (req, res) => {
  bookings.Booking_Inactive(req, res);
});

app.post("/ChangeBookingBed", (req, res) => {
  bookings.ChangeBookingBed(req, res);
});

app.post("/all_bookings", (req, res) => {
  bookings.all_bookings(req, res);
});

app.post("/delete_booking", (req, res) => {
  bookings.delete_booking(req, res);
});

app.post("/assign_booking", (req, res) => {
  newBookings.assign_booking(req, res);
});

// Customer Eb Reading
app.post("/customer_readings", (req, res) => {
  invoiceQueries.customer_readings(req, res);
});

// add walk-in customer
app.post(
  "/add_walkin-customer",
  upload.fields([{ name: "profile", maxCount: 1 }]),
  (req, res) => {
    userQueries.add_walk_in_customer(req, res);
  }
);

// get walk-in customer_list
app.post("/get_walkin-customer", (req, res) => {
  userQueries.get_walk_in_customer_list(req, res);
});

// delete walk-in customer
app.post("/delete_walkin-customer", (req, res) => {
  userQueries.delete_walk_in_customer(req, res);
});

// Checkout API
app.post("/user_check_out", (req, res) => {
  userQueries.user_check_out(req, res);
});

app.post("/get/confirm_checkout", (req, res) => {
  userQueries.get_confirm_checkout(req, res);
});

app.post("/update_CheckoutDate",(req,res) =>{
  userQueries.update_CheckoutDate(req, res);
})

app.post("/generate_checkout_invoice",(req,res) =>{
    userQueries.generate_checkout_invoice(req, res);
})

app.post("/checkout_detail_view", (req, res) => {
  userQueries.checkout_detail_view(req, res);
});

// app.post("/add/confirm_checkout", (req, res) => {
//   newBookings.add_confirm_checkout(req, res);
// });
app.post(
  "/add/confirm_checkout",
  upload.fields([{ name: "attach", maxCount: 1 }]),
  (req, res) => {
     newBookings.add_confirm_checkout(req, res);
  }
);
app.post(
  "/update/confirm_checkout_due_customer",
  upload.fields([{ name: "profile", maxCount: 1 }]),
  (req, res) => {
     newBookings.update_confirm_checkout_due_amount(req, res);
  }
);

app.post("/edit/confirm_checkout", (req, res) => {
  newBookings.edit_confirm_checkout(req, res);
});

app.post("/checkout_list", (req, res) => {
  userQueries.checkout_list(req, res);
});

app.post("/delete_check_out", (req, res) => {
  userQueries.delete_check_out(req, res);
});

// Delete Hostel Image
app.post("/delete_hostel_image", (req, res) => {
  pgQueries.delete_hostel_image(req, res);
});

// Recuring Bills
app.post("/add_recuring_bill", (req, res) => {
  invoiceQueries.add_recuring_bill(req, res);
});

// Recuring Bills
app.post("/add_recuring_bill_enabled", (req, res) => {
  invoiceQueries.add_recuring_bill_enabled(req, res);
});



app.post("/all_recuring_bills", (req, res) => {
  invoiceQueries.all_recuring_bills(req, res);
});
app.post("/all_recuring_bills_stay_type", (req, res) => {
  invoiceQueries.all_recuring_bills_stay_type(req, res);
});


app.post("/get_recuring_amounts", (req, res) => {
  invoiceQueries.get_recuring_amount(req, res);
});

app.post("/delete_recuring_bill", (req, res) => {
  invoiceQueries.delete_recuring_bill(req, res);
});

// Need to validate cron
// Not Use
app.post("/update_recuring_bill", (req, res) => {
  invoiceQueries.update_recuring_bill(req, res);
});

app.post("/available_checkout_users", (req, res) => {
  userQueries.available_checkout_users(req, res);
});

// Bed Details
app.post("/available_beds", (req, res) => {
  userQueries.available_beds(req, res);
});

// Add and Edit Bankings
app.post("/add_bank", (req, res) => {
  payments.add_bank(req, res);
});

// Get All Bankings
app.post("/all_bankings", (req, res) => {
  payments.all_bankings(req, res);
});

// Remove Bank
app.post("/delete_bank", (req, res) => {
  payments.delete_bank(req, res);
});

// Add Amount in Bank
app.post("/add_bank_amount", (req, res) => {
  payments.add_bank_amount(req, res);
});

app.post("/add_default_account", (req, res) => {
  payments.add_default_account(req, res);
});

app.post("/edit_bank_trans", (req, res) => {
  payments.edit_bank_trans(req, res);
});

app.post("/delete_bank_trans", (req, res) => {
  payments.delete_bank_trans(req, res);
});

// Create New Role
app.post("/add_role", (req, res) => {
  roles.add_role(req, res);
});

app.post("/edit_role", (req, res) => {
  roles.edit_role(req, res);
});

app.post("/delete_role", (req, res) => {
  roles.delete_role(req, res);
});

app.post("/all_roles", (req, res) => {
  roles.all_roles(req, res);
});

app.post("/role_permissions", (req, res) => {
  roles.role_permissions(req, res);
});

// Add User
app.post("/add_staff_user", (req, res) => {
  roles.add_staff_user(req, res);
});

app.post("/get_all_staffs", (req, res) => {
  roles.get_all_staffs(req, res);
});

app.post("/staffs/delete_staff", (req, res) => {
  roles.delete_staff(req, res);
});

// ( *********************  Eb Readings  ********************** )

// Edit Room Reading
// Not Use
app.post("/edit_eb_readings", (req, res) => {
  invoiceQueries.edit_eb_readings(req, res);
});

// Delete Room Reading
// app.post('/delete_eb_readings', (req, res) => {
//     invoiceQueries.delete_eb_readings(req, res)
// })

app.post("/add_room_reading", (req, res) => {
  notifications.add_room_reading(req, res);
});

app.post("/add_hostel_reading", (req, res) => {
  notifications.add_hostel_reading(req, res);
});

app.post("/edit_room_reading", (req, res) => {
  notifications.edit_room_reading(req, res);
});

app.post("/edit_hostel_reading", (req, res) => {
  notifications.edit_hostel_reading(req, res);
});

// Delete room Reading
app.post("/delete_room_reading", (req, res) => {
  notifications.delete_room_reading(req, res);
});

// Hostel Reading Details
app.post("/get_hostel_reading", (req, res) => {
  notifications.get_hostel_reading(req, res);
});

// Delete room Reading
app.post("/delete_hostel_reading", (req, res) => {
  notifications.delete_hostel_reading(req, res);
});

// ********************* Export API **********************

app.post("/export_details", (req, res) => {
  exports_routes.export_customer(req, res);
});

// dashboard filter api

app.post("/dash_filter", (req, res) => {
  exports_routes.dash_filter(req, res);
});

app.post(
  "/users/upload_doc",
  upload.fields([{ name: "file1", maxCount: 1 }]),
  (req, res) => {
    newBookings.upload_doc(req, res);
  }
);

app.post(
  "/users/upload_Manualdoc",
  upload.fields([{ name: "file1", maxCount: 1 }]),
  (req, res) => {
    newBookings.upload_Manualdoc(req, res);
  }
);

app.post("/users/updateKycDocs", (req, res) => {
  newBookings.updateKycDocs(req, res);
});

app.post("/users/updateManualDocs", (req, res) => {
  newBookings.updateManualDocs(req, res);
});

app.post("/users/edit_reading", (req, res) => {
  newBookings.edit_customer_reading(req, res);
});

app.post("/users/delete_reading", (req, res) => {
  newBookings.delete_reading(req, res);
});

app.post("/users/recuring_bill_users", (req, res) => {
  newBookings.recuring_bill_users(req, res);
});

// Qbatzclay Landing Page API

app.post("/billing/new_hosted_page", (req, res) => {
  billings.new_hosted_page(req, res);
});

app.get("/reviews/all_review", (req, res) => {
  billings.all_reviews(req, res);
});

app.get("/invoice_redirect/:invoiceUrl", (req, res) => {
  billings.redirect_func(req, res);
});

// Qbatzclay Landing Page API

// Settings Page API
var settings_router = require("./settings/general");

app.post(
  "/settings/add_general_user",
  upload.fields([{ name: "profile", maxCount: 1 }]),
  settings_router.add_general_user
);

app.get("/settings/all_general_users", settings_router.all_general_user);

app.post("/settings/check_password", settings_router.check_password);

app.post("/settings/change_staff_password", settings_router.change_password);

app.post("/settings/delete_general_user", settings_router.delete_general_user);

app.post("/settings/delete_eb_settings", settings_router.delete_eb_settings);

var recure_settings_router = require("./settings/recurings");

app.post("/settings/add_recuring", recure_settings_router.add_recuring);

var amen_settings_router = require("./settings/amenities");

app.post("/settings/all_customer_list", amen_settings_router.all_customer_list);

app.post(
  "/settings/remove_assigned_amenitie",
  amen_settings_router.remove_assigned_amenitie
);

app.post("/settings/assign_amenity", amen_settings_router.assign_amenity);

app.post("/settings/assign_amenity", amen_settings_router.assign_amenity);

var contacts_router = require("./new_pages/contacts");

app.post("/contacts/add_contact", contacts_router.add_contact);

app.post("/contacts/delete_contact", contacts_router.delete_contact);

app.post("/users/reassign_bed", contacts_router.reassign_bed);


app.post("/users/all_contacts", contacts_router.all_contacts);

app.post("/add/announcement", contacts_router.add_annoncement);

app.post("/delete/announcement", contacts_router.delete_announcement);

app.post("/announcement/all_announcement", contacts_router.all_announce);

app.post("/announcement/add_comment", user_announcements_routes.add_comment);

app.post(
  "/announcement/reply_to_comment",
  user_announcements_routes.reply_to_comment
);

app.post("/announcement/all_comments", user_announcements_routes.all_comments);

app.post(
  "/complaints/add_complaint_comment",
  user_announcements_routes.add_complaint_comment
);

app.post(
  "/complaints/all_complaint_comments",
  user_announcements_routes.all_complaint_comments
);

app.post(
  "/announcement/comment_like",
  user_announcements_routes.announcment_comment_like
);

app.post("/receipts/add", receipts.add_receipt);

app.get("/receipts/gen_reference", receipts.gen_reference);

app.post("/receipts/all_receipts", receipts.get_all_receipts);

app.post("/receipts/edit", receipts.edit_receipt);

app.post("/receipts/delete", receipts.delete_receipt);

app.post("/receipts/pdf_generate", receipts.pdf_generate);

app.get("/wallet/details", receipts.wallet_details);

// Receipt Details

app.get("/get_receipt_details/:receipt_id", receiptPdf.get_receipt_detailsbyid);

app.get("/get_bill_details/:bill_id", receiptPdf.get_bill_detailsbyid);

//New changes for the Invoice and Recurring
app.get("/frequency-types", recuringFrequencyQueries.getFrequencyTypes);

app.post("/frequency-types", recuringFrequencyQueries.addFrequencyType);

app.get("/master-types", masterDataQueries.getMasterTypes);

app.post(
  "/invoice-settings",
  upload.fields([{ name: "signature", maxCount: 1 }]),
  (req, res) => {
    settingsQueries.addOrEditInvoiceSettings(req, res);
  }
);

app.get("/getInvoice-settings/:hostel_id", (req, res) => {
  const hostel_id = req.params.hostel_id;
  settingsQueries.getInvoiceSettings(req, res, hostel_id);
});

app.get("/getRecurringBills/:hostel_id", (req, res) => {
  const hostel_id = req.params.hostel_id;
  settingsQueries.getRecurringBills(req, res, hostel_id);
});

app.post("/add-recuringBill", (req, res) => {
  invoiceQueries.addRecurringBills(req, res);
});

app.post("/verify-kyc", (req, res) => {
  const customer_id = req.body.customer_id;
  kycQueries.verifyAndStoreKyc(req, res, customer_id);
});

app.post("/getKycDetails", (req, res) => {
  const customer_id = req.body.customer_id;
  kycQueries.fetchAndUpdateKycStatus(req, res, customer_id);
});

app.post("/getCustomerDetails", (req, res) => {
  const customer_id = req.body.customer_id;
  kycQueries.fetchAndUpdateCustomerKycStatus(req, res, customer_id);
});

//Bill_Template

app.post(
  "/BillTemplateGlobalSetting",
  upload.fields([
    { name: "logo_url", maxCount: 1 },
    { name: "digital_signature_url", maxCount: 1 },
  ]),
  (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    BillTemplate.BillTemplateGlobalSetting(req, res);
  }
);

app.post("/FetchTemplateList", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  BillTemplate.FetchTemplateList(req, res);
}); 

app.post("/FetchTemplateListDetails", (req, res) => {
  res.set("Access-Control-Allow-Origin", "*");
  BillTemplate.FetchTemplateListDetails(req, res);
}); 

app.post(
  "/BillTemplateSetting",
  upload.fields([
    { name: "logo_url", maxCount: 1 },
    { name: "digital_signature_url", maxCount: 1 },
    { name: "qr_url", maxCount: 1 },
  ]),
  (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    BillTemplate.BillTemplateSetting(req, res);
  }
);
// **************************** Start Cashfree Subscription ****************************

// Add Subscription

var subsc_route = require("./cashfree/subscription");

app.post("/add_new_subscription", subsc_route.add_new_subscription);

// **************************** End Cashfree Subscription  *****************************

app.post("/referrals/generate_code", referrals.generate_code);

// Mobile API

var twofactor_routes = require("./2factor/otp");
var user_list_routes = require("./2factor/user_details");

var user_middleware = require("./user_middleware");

app.post("/customers/login", user_middleware, twofactor_routes.user_login);

app.post("/customers/verify_otp", twofactor_routes.verify_otp);

app.post("/customers/dashboard", user_middleware, twofactor_routes.dashborad);

app.get(
  "/customers/amenities_list",
  user_middleware,
  user_list_routes.amenities_list
);

app.get("/customers/eb_list", user_middleware, user_list_routes.eb_list);

app.get(
  "/customers/invoice_list",
  user_middleware,
  user_list_routes.invoice_list
);

app.post(
  "/customers/getinvoice_byid",
  user_middleware,
  user_list_routes.getinvoice_byid
);

app.post(
  "/customers/create_complaint",
  user_middleware,
  user_list_routes.create_complaint
);

app.get(
  "/customers/all_complaints",
  user_middleware,
  user_list_routes.all_complaints
);

app.get(
  "/customers/complaint_types",
  user_middleware,
  user_list_routes.complaint_types
);

app.post(
  "/customers/announcement/add_like",
  user_middleware,
  user_announcements_routes.like_announcement
);

app.get(
  "/customers/announcement/all_announcements",
  user_middleware,
  user_announcements_routes.all_announcements
);

app.post(
  "/customers/announcement/add_comment",
  user_middleware,
  user_announcements_routes.add_comment
);

app.post(
  "/customers/announcement/all_comments",
  user_middleware,
  user_announcements_routes.all_comments
);

app.post(
  "/customers/complaints/add_complaint_comment",
  user_middleware,
  user_announcements_routes.add_complaint_comment
);

app.post(
  "/customers/download_bill",
  user_middleware,
  user_list_routes.download_bill
);
app.get('/TestCron',invoiceGenerationCrons.TestCron)