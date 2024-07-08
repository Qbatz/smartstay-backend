const express = require('express')
var cors = require('cors');
const cron = require('node-cron');
const middleware = require('./middleware');
const connection = require('./config/connection');
const notifications = require('./notifications');
const assets = require('./assets');

const app = express()
const userQueries = require('./UserQueries');
const accountManagement = require('./AccountManagementQueries')
const invoiceQueries = require('./InvoiceQueries')
const profileQueries = require('./ProfileQueries')
const complianceQueries = require('./ComplianceQueries')
const pgQueries = require('./PgQueries')
const vendorQueries = require('./vendorQueries')
const expensesManagement = require('./ExpensesManagement')

const multer = require('multer');
const request = require('request');
const upload = multer();

var corsOptions = {
    origin: '*',
    credentials: true,
    optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.options('*', cors());
app.use(express.json())
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With,Content-Type,Accept");
    next();
})

app.use(middleware);

app.listen('2001', function () {
    console.log("node is started at 2001")
})

// ExpensesManagement 

app.post('/add/add-expense',(request,response)=>{
    response.set('Access-Control-Allow-Origin', '*');
    expensesManagement.AddExpense(connection,request,response)
})
app.post('/add/expense-category',(request,response)=>{
    response.set('Access-Control-Allow-Origin', '*');
    expensesManagement.AddExpenseCategory(connection,request,response)
})
app.post('/get/expense-category',(request,response)=>{
    response.set('Access-Control-Allow-Origin', '*');
    expensesManagement.GetExpensesCategory(connection,request,response)
})

app.post('/calculate/hostel-expenses',(request,response)=>{
    response.set('Access-Control-Allow-Origin', '*');
    expensesManagement.CalculateExpenses(connection,request,response)
})
// app.post('/add/add-salary',(request,response)=>{
//     response.set('Access-Control-Allow-Origin', '*');
//     expensesManagement.AddSalaryDetails(connection,request,response)
// })

// userQueries.js

app.post('/users/user-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    userQueries.getUsers(connection, response, request);

});


app.post('/add/adduser-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    userQueries.createUser(connection, request, response)
})

app.get('/user-list/bill-payment', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    userQueries.getPaymentDetails(connection, response)
})

app.post('/create/create-account', upload.single('profile'), (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');

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
        password: request.body.password

    };
    console.log("reqBodyData **", reqBodyData)
    accountManagement.createAccountForLogin(connection, reqBodyData, response)
})


app.post('/newaccount/create-account', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqBodyData = request.body
    accountManagement.createnewAccount(connection, reqBodyData, response);
})

app.get('/login/login', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const { email_Id, password } = request.query;
    accountManagement.loginAccount(connection, response, email_Id, password);
})

app.post('/forget/select-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqData = request.body
    accountManagement.forgetPassword(connection, response, reqData);
})

app.post('/otp-send/send-mail', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const requestData = request.body
    // console.log("requestData", requestData)
    accountManagement.forgetPasswordOtpSend(connection, response, requestData)
})
app.post('/otp-send/response', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const requestData = request.body
    accountManagement.sendResponseOtp(connection, response, requestData)
})

cron.schedule("0 0 1 * * ", function () {
    console.log("This task runs every minute");
    connection.query(`SELECT * FROM hostel where isActive=true`, async function (err, users) {
        if (err) {
            console.error("Error fetching users:", err);
            return;
        } else {
            let isFirstTime = true;
            for (const user of users) {
                await invoiceQueries.calculateAndInsertInvoice(connection, user, users, isFirstTime);
                isFirstTime = false;
            }
        }
    });
});


app.get('/checkout/checkout-invoice', (request, response) => {
    connection.query(`SELECT * FROM hostel`, function (err, users) {
        // console.log("users",users)
        if (err) {
            console.error("Error fetching users:", err);
            return;
        }
        users.forEach(user => {
            const userID = user.User_Id;
            invoiceQueries.CheckOutInvoice(connection, user, users);
        });
    });
})


app.post('/manual/manual-invoice', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    const reqData = request.body;
    // console.log("reqData", reqData)
    connection.query(`SELECT * FROM hostel`, function (err, users) {
        //  console.log(" users", users)
        if (err) {
            console.error("Error fetching users:", err);
            return;
        }
        const ParticularUser = users.filter(user => {
            return user.User_Id == reqData.User_Id

        });
        // console.log("ParticularUser",ParticularUser)
        invoiceQueries.InsertManualInvoice(connection, users, reqData, ParticularUser);

    });
})

app.get('/list/invoice-for-all-user-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    invoiceQueries.getInvoiceListForAll(connection, response)
})


app.post('/list/invoice-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    invoiceQueries.getInvoiceList(connection, response, request)
})


app.get('/list/eb_list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    invoiceQueries.getEBList(connection, request, response)
})


app.post('/invoice/invoice-list-pdf', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    let reqBodyData = request.body;
    // console.log("reqBodyData", reqBodyData)
    invoiceQueries.InvoicePDf(connection, reqBodyData, response)
})


app.post('/create/isEnable', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    let reqBodyData = request.body;
    profileQueries.IsEnableCheck(connection, reqBodyData, response)

})


app.get('/get/userAccount', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    profileQueries.getAccount(connection, response)
})


app.post('/compliance/add-details', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    complianceQueries.AddCompliance(connection, request, response)

})


app.post('/compliance/compliance-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    complianceQueries.GetComplianceList(connection, response, request)

})


app.post('/list/hostel-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    pgQueries.getHostelList(connection, response, request)
})


app.get('/room-id/check-room-id', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    pgQueries.checkRoom(connection, response)
})

app.get('/hostel/list-details', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    pgQueries.hostelListDetails(connection, response)

})

// app.post('/add/new-hostel', (request, response) => {
//     response.set('Access-Control-Allow-Origin', '*');
//     pgQueries.createPG(connection, request, response)
// })



// {name: pgName, phoneNo: mobile,email_Id: email, location: location


app.post('/add/new-hostel', upload.single('profile'), (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqHostel = {
        profile: request.file,
       hostel_Name: request.body.name,
       hostel_Phone : request.body.phoneNo,
       hostel_email_Id : request.body.email_Id,
       hostel_location : request.body.location
               };

    pgQueries.createPG(connection,reqHostel, response, request)
})


app.post('/list/floor-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const requestData = request.body
    pgQueries.FloorList(connection, requestData, response)
})

app.post('/list/rooms-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqData = request.body;
    pgQueries.RoomList(connection, reqData, response)
})

app.post('/list/bed-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const requestBodyData = request.body;
    pgQueries.BedList(connection, requestBodyData, response)
})

app.post('/list/numberOf-Rooms', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqFloorID = request.body;
    pgQueries.RoomCount(connection, reqFloorID, response)
})

app.post('/floor_list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    const reqData = request.body;
    pgQueries.ListForFloor(connection, reqData, response)
})


app.post('/room/create-room', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqsData = request.body;
    pgQueries.CreateRoom(connection, reqsData, response)
})

app.post('/floor/create-floor', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqDataFloor = request.body;
    pgQueries.CreateFloor(connection, reqDataFloor, response)

})


app.post('/check/room-full', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqFloorID = request.body
    pgQueries.RoomFull(connection, reqFloorID, response)
})

app.post('/invoice/settings', upload.single('profile'), (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqInvoice = {
        profile: request.file,
        hostel_Id: request.body.hostel_Id,
        prefix: request.body.prefix,
        suffix: request.body.suffix
    };
    // console.log("reqInvoice **", reqInvoice)
    profileQueries.InvoiceSettings(connection, reqInvoice, response)
})


app.get('/list/amenities-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    profileQueries.getAmenitiesList(connection, response)
})

app.post('/EB/Hostel_Room_based', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    var atten = request.body;
    profileQueries.UpdateEB(connection, atten, response)

})


app.post('/amenities/setting', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    profileQueries.AmenitiesSetting(connection, request, response)
})

app.post('/ebamount/setting', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const atten = request.body
    invoiceQueries.EbAmount(connection, atten, response)

})
// app.post('/AmnitiesName_list', (request, response) => {
//     response.set('Access-Control-Allow-Origin', '*');
//     const atten = request.body
//     invoiceQueries.AmenitiesName(connection, atten, response)
// })

app.get('/list/EbReading', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    profileQueries.getEbReading(connection, response)
})

app.get('/list/Ebstartmeter', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    invoiceQueries.getEbStart(connection, response)
})
app.post('/amenities/amnityUpdate', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    var atten = request.body;
    profileQueries.UpdateAmnity(connection, atten, response)

})


app.post('/checkout/checkout-user', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const attenData = request.body;
    userQueries.CheckOutUser(connection, response, attenData)
})

app.post('/list/dashboard', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    pgQueries.listDashBoard(connection, response, request)
})

app.post('/get_user_details', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    accountManagement.get_user_details(connection, request, response);
})

app.post('/invoice/invoiceUpdate', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const atten = request.body;
    console.log("request.body", request.body)
    invoiceQueries.UpdateInvoice(connection, response, atten)
})

app.post('/delete/delete-floor', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    let reqData = request.body
    pgQueries.deleteFloor(connection, response, reqData)
})
app.post('/delete/delete-room', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    let reqData = request.body
    pgQueries.deleteRoom(connection, response, reqData)
})
app.post('/delete/delete-bed', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    let reqData = request.body
    pgQueries.deleteBed(connection, response, reqData)
})

app.post('/transaction/list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    userQueries.transitionlist(connection, request, response)
})

// Forgot Password Otp Response
app.post('/forgot_otp_response', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const requestData = request.body;
    accountManagement.forgotpassword_otp_response(connection, response, requestData)
})

// Payment History
app.post('/payment_history', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    accountManagement.payment_history(connection, response, request)
})


app.post('/add/amenity-history', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqData = request.body;
    invoiceQueries.UpdateAmenitiesHistory(connection, response, reqData)
})


app.post('/amenity/list-amenity-history', (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    const reqdata = req.body;
    invoiceQueries.GetAmenitiesHistory(connection, res, reqdata)
})

// ************* Use it Later ***********//
// Get Room Details
app.post('/get_room_details', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    pgQueries.get_room_details(connection, request, response)
})

// Update Particular Room Details
app.post('/update_room_details', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    pgQueries.update_room_details(connection, request, response)
})
// ************* Use it Later ***********//

// Truncate all tables
app.get('/truncate_tables', (request, response) => {

    var sql1 = "SHOW TABLES";
    connection.query(sql1, function (err, tables) {
        if (err) {
            response.status(201).json({ message: "Unable to Connect Database", statusCode: 201 });
        } else {
            var tableNames = tables.map(row => Object.values(row)[0]);
            if (tableNames.length === 0) {
                console.log('No tables found in the database.');
                response.status(201).json({ message: "No tables found in the database", statusCode: 201 });
            } else {
                const truncateQueries = tableNames.map(name => `TRUNCATE TABLE \`${name}\`;`).join('');
                connection.query(truncateQueries, err => {
                    if (err) {
                        response.status(201).json({ message: "No tables found in the database", statusCode: 201 });
                    } else {
                        console.log('All tables truncated successfully.');
                        response.status(200).json({ message: "All tables truncated successfully", statusCode: 200 });
                    }
                });
            }
        }
    })
})

// ****************** Notification Start ***************** //
// Get all Notifications
app.get('/all_notifications', (req, res) => {
    notifications.all_notifications(req, res);
})

// Add New Notification
app.post('/add_notification', (req, res) => {
    notifications.add_notification(req, res);
})

// Update Notification
app.post('/update_notification', (req, res) => {
    notifications.update_notification_status(req, res);
})

// ****************** Notification End ***************** //


app.post('/add/update_vendor', upload.single('profile'), (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqInvoice = {
        profile: request.file,
        firstName: request.body.first_Name,
        LastName: request.body.Last_Name,
        Vendor_Mobile: request.body.Vendor_Mobile,
        Vendor_Email: request.body.Vendor_Email,
        Vendor_Address: request.body.Vendor_Address,
        Vendor_Id: request.body.Vendor_Id,
        Business_Name: request.body.Business_Name,
        id: request.body.id
    };
    console.log("reqInvoice", reqInvoice)
    vendorQueries.ToAddAndUpdateVendor(connection, reqInvoice, response, request)
})

app.post('/get/vendor_list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    vendorQueries.GetVendorList(connection, response, request)
})


app.post('/delete-vendor-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqVendor = request.body;
    vendorQueries.TodeleteVendorList(connection, response, request, reqVendor)
})
// ****************** Assets Start ***************** //

// All Asset Details
app.get('/all_assets', (req, res) => {
    assets.all_assets(req, res);
})

app.post('/add_asset', (req, res) => {
    assets.add_asset(req, res);
})

app.post('/remove_asset', (req, res) => {
    assets.remove_asset(req, res);
})

// Assign Asset
app.post('/assign_asset', (req, res) => {
    assets.asseign_asset(req, res);
})


// ****************** Assets End ******************* //

// Get Customer all details
app.post('/customer_details', (req, res) => {
    userQueries.customer_details(req, res);
})

// Amentites Details for particular user
app.post('/user_amenities_history', (req, res) => {
    userQueries.user_amenities_history(req, res);
})

// ****************** Expenses Start ******************* //

// Add Expenses
app.post('/add_expenses', (req, res) => {
    assets.add_expenses(req, res);
})

app.post('/remove_expenses', (req, res) => {
    assets.remove_expenses(req, res);
})

app.get('/all_expenses', (req, res) => {
    assets.all_expenses(req, res);
})

// CREATE BED .............

app.post('/create/create-bed', (request, response) => {
    pgQueries.createBed(connection, response, request)
})
