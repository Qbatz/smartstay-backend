const bcrypt = require('bcrypt')
const connection = require('../config/connection')
const apiResponse = require('./api_response')

async function subscipition(req, res) {

    var { plan_code, customer_id } = req.body;

    var apiEndpoint = 'https://www.zohoapis.in/billing/v1/subscriptions';
    var method = "POST";

    const subscriptionDetails = {
        plan: {
            plan_code: plan_code
        },
        customer_id: customer_id,
        start_date: req.body.start_date,
        notes: req.body.notes
    };
    try {
        const response = await apiResponse(apiEndpoint, method, subscriptionDetails);
        console.log('Subscription successful:', response);

        var subscription_response = response.subscription;

        var subscription_id = subscription_response.subscription_id;
        var plan_type = subscription_response.status;
        var amount = subscription_response.amount;
        var start_date = subscription_response.trial_starts_at;
        var end_date = subscription_response.trial_ends_at;
        var plan_duration = subscription_response.trial_remaining_days;

        var sql2 = "INSERT INTO subscribtion_history (customer_id,plan_code,subscribtion_id,amount,plan_status,plan_type,plan_duration,start_date,end_date) VALUES (?,?,?,?,?,?,?,?,?,?)";
        connection.query(sql2, [customer_id, plan_code, subscription_id, amount, 1, plan_type, plan_duration, start_date, end_date], (err, ins_data) => {
            if (err) {
                return res.status(201).json({ message: "Unable to Add Subscribtion History", statusCode: 201 })
            } else {
                var sql1 = "UPDATE createaccount SET plan_status=1 WHERE customer_id='" + customer_id + "'";
                connection.query(sql1, function (err, data) {
                    if (err) {
                        return res.status(201).json({ message: "Unable to update Plan Details", statusCode: 201 })
                    } else {
                        return res.status(200).json({ message: "Successfully update Plan Details", statusCode: 200 })
                    }
                })
            }
        })
    } catch (error) {
        console.error('Error subscribing user:', error);
        return res.status(201).json({ message: "Unable to update Plan Details", statusCode: 201, error: error })
    }

}

async function checkAllSubscriptions() {

    var sql1 = "SELECT sh1.* FROM subscribtion_history sh1 LEFT JOIN (SELECT customer_id, MAX(id) as max_id FROM subscribtion_history WHERE plan_status = 1 GROUP BY customer_id) sh2 ON sh1.customer_id = sh2.customer_id AND sh1.id = sh2.max_id WHERE sh1.plan_status = 1;";
    connection.query(sql1, function (err, data) {
        if (err) {
            console.log(err);
        } else if (data.length != 0) {

            var currentDate = new Date();

            data.forEach(subscription => {

                var planExpirationDate = new Date(subscription.end_date);

                if (planExpirationDate < currentDate) {

                    var currentDate = new Date().toISOString().split('T')[0];

                    var startDate = new Date(currentDate);
                    var endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 30);
                    var formattedEndDate = endDate.toISOString().split('T')[0];

                    var sql3 = "INSERT INTO subscribtion_history (customer_id,plan_code,subscibtion_id,amount,plan_status,plan_type,plan_duration,payment_status,startdate,end_date) VALUES (?,?,?,?,?,?,?,?,?,?)";
                    connection.query(sql3, [subscription.customer_id, subscription.plan_code, subscription.subscibtion_id, subscription.amount, 1, 'live', 28, 0, currentDate, formattedEndDate], function (err, ins_res) {
                        if (err) {
                            console.log(err);
                        } else {
                            var sql2 = "UPDATE createaccount SET plan_status=0 WHERE customer_id='" + subscription.customer_id + "' AND   ";
                            connection.query(sql2, function (err, up_res) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    console.log(`User ${subscription.customer_id}'s subscription has ended`);
                                }
                            })
                        }
                    })
                } else {
                    console.log(`User ${subscription.customer_id}'s subscription is active`);
                }
            });

        } else {
            console.log("No Customer Subscibe Plans");
        }
    })
}

async function invoice_details(req, res) {

    var customer_id = req.body.customer_id;

    if (!customer_id) {
        return res.status(201).json({ statusCode: 201, message: "Please Add Customer Details" })
    }

    var apiEndpoint = " https://www.zohoapis.in/billing/v1/invoices?customer_id=" + customer_id;
    var method = 'GET'

    var input_body = 0;

    try {
        const response = await apiResponse(apiEndpoint, method, input_body);
        console.log("Invoice Details", response);

        var invoice_details = response.invoices;
        return res.status(200).json({ message: "Invoice Details", statusCode: 200, invoices: invoice_details })

    } catch (error) {
        console.error('Error subscribing user:', error);
        return res.status(201).json({ message: "Unable to update Plan Details", statusCode: 201, error: error })
    }
}

async function invoice_payments(req, res) {

    var invoice_id = req.body.invoice_id;

    if (!invoice_id) {
        return res.status(201).json({ statusCode: 201, message: "Please Add Invoice Details" })
    }

    var apiEndpoint = "https://www.zohoapis.in/billing/v1/hostedpages/invoicepayment";
    var method = 'POST'

    var input_body = {
        invoice_id: invoice_id
    }
    try {
        const response = await apiResponse(apiEndpoint, method, input_body);
        console.log("Invoice Details", response);

        if (response.code == 0) {
            var invoice_pay_url = response.hostedpage.url;
            return res.status(200).json({ statusCode: 200, message: response.message, payment_url: invoice_pay_url })
        } else {
            return res.status(201).json({ statusCode: 201, message: response.message })
        }

    } catch (error) {
        console.error('Error subscribing user:', error);
        return res.status(201).json({ message: "Unable to update Plan Details", statusCode: 201, error: error })
    }
}

module.exports = { subscipition, checkAllSubscriptions, invoice_details, invoice_payments }



// async function new_subscription(req, res) {

//     var reqBodyData = req.body;
//     if (reqBodyData.mobileNo && reqBodyData.emailId && reqBodyData.first_name && reqBodyData.password && reqBodyData.confirm_password && reqBodyData.plan_code) {

//         connection.query(
//             `SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`,
//             [reqBodyData.mobileNo, reqBodyData.emailId],
//             async function (error, data) {
//                 if (error) {
//                     console.error("Database error:", error);
//                     response.status(500).json({ message: 'Database error' });
//                     return;
//                 }

//                 if (data.length === 0) {

//                     var confirm_pass = reqBodyData.confirm_password;
//                     var currentDate = new Date().toISOString().split('T')[0];

//                     if (reqBodyData.password === confirm_pass) {

//                         const hash_password = await bcrypt.hash(reqBodyData.password, 10);

//                         var apiEndpoint = 'https://www.zohoapis.in/billing/v1/hostedpages/newsubscription';
//                         var method = "POST";

//                         var inbut_body = {
//                             plan: {
//                                 plan_code: reqBodyData.plan_code
//                             },
//                             customer: {
//                                 display_name: reqBodyData.first_name + ' ' + reqBodyData.last_name,
//                                 first_name: reqBodyData.first_name,
//                                 last_name: reqBodyData.last_name,
//                                 email: reqBodyData.emailId,
//                                 phone: reqBodyData.mobileNo
//                             },
//                             addons: [],
//                             custom_fields: [],
//                             redirect_url: reqBodyData.redirect_url,
//                             start_date: currentDate,
//                             notes: "New User Subscribtion"
//                         };

//                         apiResponse(apiEndpoint, method, inbut_body).then(api_data => {
//                             console.log('API Response:', api_data);

//                             if (api_data.code == 0) {

//                                 var subscription_response = api_data.hostedpage;

//                                 // var plan_code = reqBodyData.plan_code;
//                                 // var customer_id = subscription_response.customer.customer_id;
//                                 // var subscription_id = subscription_response.subscription_id;
//                                 // var plan_type = subscription_response.status;
//                                 // var amount = subscription_response.amount;
//                                 // var start_date = subscription_response.trial_starts_at;
//                                 // var end_date = subscription_response.trial_ends_at;
//                                 // var plan_duration = subscription_response.trial_remaining_days;

//                                 return res.status(200).json({ statusCode: 200, message: 'New Hosted Page', url: api_data.hostedpage.url });

//                                 // var sql13 = "INSERT INTO createaccount (first_name,last_name, mobileNo, email_Id, password,customer_id,subscription_id,plan_code,plan_status) VALUES (?,?,?,?,?,?,?,?,0)"
//                                 // connection.query(sql13, [reqBodyData.first_name, reqBodyData.last_name, reqBodyData.mobileNo, reqBodyData.emailId, hash_password, customer_id, subscription_id, plan_code], function (error, result) {
//                                 //     if (error) {
//                                 //         console.log(error);
//                                 //         return response.status(201).json({ message: 'Database error' });
//                                 //     } else {
//                                 //         return response.status(200).json({ statusCode: 200, message: 'New Hosted Page', url: api_data.hostedpage.url });
//                                 //     }
//                                 // });
//                             } else {
//                                 res.status(201).json({ message: api_data.message, statusCode: 201 });
//                             }
//                         })
//                             .catch(error => {
//                                 console.error('Error:', error)
//                                 res.status(201).json({ message: error, statusCode: 201 });
//                             })
//                     } else {
//                         res.status(210).json({ message: 'Password and Confirm Password Not Matched', statusCode: 210 });
//                     }

//                 } else {
//                     const mobileExists = data.some(record => record.mobileNo === reqBodyData.mobileNo);
//                     const emailExists = data.some(record => record.email_Id === reqBodyData.emailId);

//                     if (mobileExists && emailExists) {
//                         res.status(203).json({ message: 'Mobile Number and Email ID already exist', statusCode: 203 });
//                     } else if (emailExists) {
//                         res.status(201).json({ message: 'Email ID already exists', statusCode: 201 });
//                     } else if (mobileExists) {
//                         res.status(202).json({ message: 'Mobile Number already exists', statusCode: 202 });
//                     }
//                 }
//             }
//         );
//     } else {
//         res.status(400).json({ message: 'Missing Parameter' });
//     }
// }