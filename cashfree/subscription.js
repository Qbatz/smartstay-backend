const connection = require('../config/connection')
const request = require('request');
const { v4: uuidv4 } = require('uuid');

function generateSubscriptionId() {
    const uuid = uuidv4().replace(/-/g, ''); // Remove hyphens from UUID
    const numericId = BigInt(`0x${uuid}`).toString(); // Convert to numeric string
    return numericId.slice(0, 19); // Truncate to match the expected length
}

function generateLinkId() {
    const prefix = "my_link_id"; // Static prefix
    const timestamp = Date.now(); // Current timestamp in milliseconds
    const randomPart = Math.floor(1000 + Math.random() * 9000); // Random 4-digit number
    return `${prefix}_${timestamp}_${randomPart}`;
}

// exports.add_new_subscription = (req, res) => {

//     var user_id = req.user_details.id;
//     var plan_code = req.body.plan_code;
//     var amount = req.body.amount;

//     if (!plan_code || !amount) {
//         return res.status(201).json({ statusCode: 201, message: "Missing Plan Details" })
//     }

//     var sql1 = "SELECT *,sh.plan_status AS plan_diff FROM createaccount AS ca LEFT JOIN subscribtion_history AS sh ON sh.customer_id=ca.id WHERE ca.id=?";
//     connection.query(sql1, [user_id], function (err, data) {
//         if (err) {
//             return res.status(201).json({ statusCode: 201, message: "Error to Get User Details", reason: err.message });
//         }

//         if (data.length == 0) {
//             return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
//         }

//         var user_details = data[0];
//         var plan_diff = user_details.plan_diff;

//         if (plan_diff == 2) {  //2 is Initiated

//             const linkId = generateLinkId();

//             console.log(linkId);

//             const date = new Date();
//             date.setDate(date.getDate() + 1); // Add one day
//             const isoString = date.toISOString(); // Get the ISO string in UTC
//             console.log(isoString);


//             const options = {
//                 method: 'POST',
//                 url: 'https://sandbox.cashfree.com/pg/links',
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'x-client-id': process.env.CASHFREE_CLIENTID,
//                     'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
//                     'x-api-version': '2023-08-01',
//                 },
//                 body: JSON.stringify({
//                     customer_details: {
//                         customer_email: user_details.email_Id,
//                         customer_name: `${user_details.first_name} ${user_details.last_name}`,
//                         customer_phone: String(user_details.mobileNo)
//                     },
//                     link_amount: amount,
//                     link_auto_reminders: true,
//                     link_currency: 'INR',
//                     link_expiry_time: isoString,
//                     link_id: linkId,                    // A unique link ID
//                     link_meta: {
//                         notify_url: 'https://ee08e626ecd88c61c85f5c69c0418cb5.m.pipedream.net',
//                         return_url: 'https://www.cashfree.com/devstudio/thankyou',
//                         upi_intent: false
//                     },
//                     link_minimum_partial_amount: amount,
//                     link_notify: {
//                         send_email: true,
//                         send_sms: false                         // Don't send SMS notification
//                     },
//                     link_partial_payments: false,              // Allow partial payments
//                     link_purpose: 'Payment for Subscription', // Purpose of payment
//                 })
//             };

//             request(options, function (error, response, body) {
//                 if (error) {
//                     console.error('Error generating payment link:', error);
//                 } else {
//                     const responseBody = JSON.parse(body);
//                     console.log('Payment link generated:', responseBody);
//                     return res.status(response.statusCode).json({ statusCode: response.statusCode, message: responseBody });
//                 }
//             });
//         } else {

//             var subscriptionId = generateSubscriptionId();

//             const body_val = JSON.stringify({
//                 subscriptionId: subscriptionId,  // Keep the same subscription ID
//                 planId: plan_code,
//                 customerName: `${user_details.first_name} ${user_details.last_name}`,
//                 customerPhone: String(user_details.mobileNo),
//                 customerEmail: user_details.email_Id,
//                 returnUrl: 'https://www.merchant-site.com',
//                 authAmount: 1,
//                 expiresOn: '2025-02-21 00:00:00',
//                 notes: {
//                     key1: 'value1',
//                     key2: 'value2',
//                     key3: 'value3',
//                     key4: 'value4',
//                 },
//                 linkExpiry: 10,  // 10 minutes for link expiration
//                 notificationChannels: ['EMAIL', 'SMS'],
//             });

//             const options = {
//                 method: 'POST',
//                 url: 'https://sandbox.cashfree.com/api/v2/subscriptions/nonSeamless/subscription',  // API endpoint
//                 headers: {
//                     'Content-Type': 'application/json',
//                     'x-client-id': process.env.CASHFREE_CLIENTID,
//                     'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
//                     'x-api-version': '2023-08-01',
//                 },
//                 body: body_val
//             };

//             request(options, (error, response, body) => {
//                 if (error) {
//                     console.error('Error:', error);
//                     return res.status(201).json({ statusCode: 201, message: error });
//                 }

//                 const parsedData = JSON.parse(body);

//                 // console.log(body);

//                 if (response.statusCode == 200) {

//                     var sql2 = "INSERT INTO subscribtion_history (customer_id,amount,plan_code,subscribtion_id,plan_status,plan_duration) VALUES (?,?,?,?,?,?)"
//                     connection.query(sql2, [user_id, amount, plan_code, subscriptionId, 2, 30], function (err, ins_data) {
//                         if (err) {
//                             return res.status(201).json({ statusCode: 201, message: "Error to Add Subscription History", reason: err.message });
//                         }
//                         return res.status(200).json({ statusCode: response.statusCode, message: parsedData.message, data: parsedData });
//                     })
//                 } else {
//                     return res.status(201).json({ statusCode: response.statusCode, message: parsedData.message, data: parsedData });
//                 }
//             });
//         }
//     });
// }
exports.add_new_subscription = (req, res) => {
    return res.status(200).json({
        statusCode: 200,
    });
}