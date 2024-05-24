const express = require('express')
const mysql = require('mysql');
var cors = require('cors');
const cron = require('node-cron');
const moment = require('moment');
const app = express()
const userQueries = require('./UserQueries');
const accountManagement = require('./AccountManagementQueries')
const invoiceQueries = require('./InvoiceQueries')
const profileQueries = require('./ProfileQueries')
const complianceQueries = require('./ComplianceQueries')
const pgQueries = require('./PgQueries')

const multer = require('multer');
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

const connection = mysql.createConnection({
    host: 'ls-f4c1514e53cc8c27ec23a4ce119af8c49d7b1ce7.crocoq6qec8l.ap-south-1.rds.amazonaws.com',
    database: 'smart_stay',
    user: 'dbadmin',
    password: 'Password!#$0'
})

// connection.connect(function (error) {
//     if (error) {
//         console.log(error)
//     }
//     else {
//         console.log("connection success")
//     }
// })

try{
    connection.connect(function (error) {
        if (error) {
            console.log(error)
        }
        else {
            console.log("connection success")
        }
    }) 
}
catch(error){
    console.log(error)
}

app.listen('2001', function () {
    console.log("node is started at 2001")
})




// userQueries.js

app.post('/users/user-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');

    const ReqData = request.body
    userQueries.getUsers(connection, response, ReqData);

});


app.post('/add/adduser-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    var atten = request.body;
    userQueries.createUser(connection, atten, response)
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
        password:request.body.password

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
    console.log("requestData", requestData)
    accountManagement.forgetPasswordOtpSend(connection, response, requestData)
})
app.post('/otp-send/response', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const requestData = request.body
    accountManagement.sendResponseOtp(connection, response, requestData)
})


cron.schedule("0 0 1 * * ", function () {
    console.log("This task runs every minute");
    connection.query(`SELECT * FROM hostel where isActive=true`, function (err, users) {
        // console.log(" users", users)
        if (err) {
            console.error("Error fetching users:", err);
            return;
        }
        users.forEach(user => {
            const userID = user.User_Id;
            invoiceQueries.calculateAndInsertInvoice(connection, user,users);
        });
    });
});


app.get('/checkout/checkout-invoice', (request, response) => {
    connection.query(`SELECT * FROM hostel`, function (err, users) {
        console.log("users",users)
               if (err) {
            console.error("Error fetching users:", err);
            return;
        }
        users.forEach(user => {
            const userID = user.User_Id;
            invoiceQueries.CheckOutInvoice(connection, user,users);
        });
    });
})


app.post('/manual/manual-invoice', (request, response)=>{
    response.set('Access-Control-Allow-Origin', '*')
    const reqData = request.body;
    console.log("reqData",reqData)
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
        invoiceQueries.InsertManualInvoice(connection,users,reqData,ParticularUser );

    });
})







app.get('/list/invoice-for-all-user-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
        invoiceQueries.getInvoiceListForAll(connection, response)
})



app.post('/list/invoice-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    const reqData = request.body
    invoiceQueries.getInvoiceList(connection, response, reqData)
})

app.get('/list/eb_list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    invoiceQueries.getEBList(connection, request, response)
})


app.post('/invoice/invoice-list-pdf', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    let reqBodyData = request.body;
    console.log("reqBodyData", reqBodyData)
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
    var atten = request.body;
    complianceQueries.AddCompliance(connection, atten, response)

})


app.post('/compliance/compliance-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    const reqData = request.body
    complianceQueries.GetComplianceList(connection, response,  reqData)

})


app.post('/list/hostel-list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqData = request.body
    pgQueries.getHostelList(connection, response, reqData)
})

app.get('/room-id/check-room-id', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    pgQueries.checkRoom(connection, response)
})

app.get('/hostel/list-details', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*')
    pgQueries.hostelListDetails(connection, response)

})

app.post('/add/new-hostel', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const reqData = request.body;
    pgQueries.createPG(connection, reqData, response)
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
    console.log("reqInvoice **", reqInvoice)
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
    const reqData = request.body
    profileQueries.AmenitiesSetting(connection, reqData, response)


})
app.post('/ebamount/setting', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const atten = request.body
    invoiceQueries.EbAmount(connection, atten, response)


})
app.post('/AmnitiesName_list', (request, response) => {
    response.set('Access-Control-Allow-Origin', '*');
    const atten = request.body
    invoiceQueries.AmenitiesName(connection, atten, response)


})

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
    userQueries.CheckOutUser(connection, response, attenData )
})

app.post('/list/dashboard',(request,response)=>{
    response.set('Access-Control-Allow-Origin', '*');
    const reqdata = request.body ;
    pgQueries.listDashBoard(connection,response,reqdata)
})