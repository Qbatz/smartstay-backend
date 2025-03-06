const bcrypt = require('bcrypt')
const request = require('request')

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

            var currentDates = new Date();

            data.forEach(subscription => {

                var planExpirationDate = new Date(subscription.end_date);

                if (planExpirationDate < currentDates) {

                    var currentDate = new Date().toISOString().split('T')[0];

                    var startDate = new Date(currentDate);
                    var endDate = new Date(startDate);
                    endDate.setDate(endDate.getDate() + 30);
                    var formattedEndDate = endDate.toISOString().split('T')[0];

                    var sql2 = "UPDATE createaccount SET plan_status=0 WHERE customer_id='" + subscription.customer_id + "'";
                    connection.query(sql2, function (err, up_res) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log(`User ${subscription.customer_id}'s subscription has ended`);
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

async function check_trail_end() {

    var sql1 = "SELECT ca.*,tpc.*,tpc.createdat AS start_date,tpc.updatedat AS end_date FROM createaccount AS ca JOIN trial_plan_details as tpc ON ca.id=tpc.user_id WHERE tpc.plan_status =1;";
    connection.query(sql1, function (err, data1) {
        if (err) {
            console.log(err);
        } else if (data1.length != 0) {

            var currentDate = new Date();

            data1.forEach(subscription => {

                var start_date = subscription.start_date;
                var startDateObject = new Date(start_date);
                var duration = Math.ceil((currentDate - startDateObject) / (1000 * 60 * 60 * 24));

                if (duration == 1) {
                    var sql2 = "UPDATE createaccount SET plan_status=0 WHERE id=?";
                    connection.query(sql2, [subscription.user_id], function (up_err, up_res) {
                        if (err) {
                            console.log(err);
                        } else {
                            console.log("Plan Status Updated");
                        }
                    })
                } else {
                    console.log("Not to end the Trail Plan");
                }
            });

        } else {
            console.log("No Need to Check the details");
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

// async function new_subscription(req, res) {

//     var { customer_id, plan_code } = req.body;

//     if (!customer_id || !plan_code) {
//         return res.status(201).json({ message: "Missing Parameter ", statusCode: 201 })
//     }

//     var currentDate = new Date().toISOString().split('T')[0];

//     var apiEndpoint = "https://www.zohoapis.in/billing/v1/hostedpages/newsubscription";
//     var method = "POST";

//     var inbut_body = {
//         plan: {
//             plan_code: plan_code
//         },
//         customer_id: customer_id,
//         addons: [],
//         custom_fields: [],
//         redirect_url: req.body.redirect_url,
//         start_date: currentDate,
//         notes: "New User Subscribtion"
//     };
//     apiResponse(apiEndpoint, method, inbut_body).then(api_data => {
//         console.log('API Response:', api_data);

//         if (api_data.code == 0) {
//             return res.status(200).json({ message: api_data.message, data: api_data.hostedpage })
//         } else {
//             return res.status(201).json({ message: api_data.message, statusCode: 201, error: error })
//         }
//     })
// }

async function new_subscription(req, res) {
    try {
        var { user_id, customer_id, plan_code, hostel_ids, hostel_count } = req.body;

        if (!user_id || !customer_id || !plan_code) {
            return res.status(201).json({ message: "Missing or Invalid Parameters" });
        }

        var wallet_amount = req.body.wallet_amount || 0;

        if (!hostel_count) {
            hostel_count = 1
        }

        var currentDate = new Date().toISOString().split('T')[0];

        if (hostel_ids && Array.isArray(hostel_ids) && hostel_ids.length > 0) {
            var sql = `SELECT hs.id, hs.Name,ca.subscription_id FROM hosteldetails AS hs JOIN createaccount AS ca ON ca.id=hs.created_By WHERE hs.id IN (?) AND hs.isActive=1`;
            connection.query(sql, [hostel_ids], async (err, hostels) => {
                if (err) {
                    return res.status(201).json({ message: "Database Error", error: err });
                }

                if (hostels.length === 0) {
                    return res.status(201).json({ message: "No valid hostels found" });
                } else {
                    add_new_subs_func(hostels);
                }
            })
        } else {
            add_new_subs_func([]);
        }

        async function add_new_subs_func(hostels) {

            var price = 500 - Number(wallet_amount || 0);

            if (wallet_amount) {

                var sql1 = "SELECT * FROM wallet WHERE user_id=? AND is_active=1";
                connection.query(sql1, [user_id], function (err, wal_data) {
                    if (err) {
                        return res.status(201).json({ message: "Database Error", error: err });
                    } else if (wal_data.length != 0) {

                        var acc_amount = wal_data[0].amount;

                        if (wallet_amount > acc_amount) {
                            return res.status(201).json({ message: "Wallet Amount Less than Selected Am" });
                        }

                    } else {
                        return res.status(201).json({ message: "Wallet Amount Not Added" });
                    }
                })
            }

            var addons = [
                {
                    addon_code: "hostel_addon",
                    name: "Hostel Subscription Addon",
                    price: price,
                    quantity: hostel_count,
                    type: "one_time"
                }
            ];

            var apiEndpoint = "https://www.zohoapis.in/billing/v1/hostedpages/newsubscription";
            var method = "POST";

            var input_body = {
                plan: { plan_code: plan_code },
                customer_id: customer_id,
                addons: addons,
                custom_fields: [],
                redirect_url: "",
                start_date: currentDate,
                notes: "New User Subscription with multiple hostels"
            };

            let api_data = await apiResponse(apiEndpoint, method, input_body);

            if (api_data.code == 0) {

                if (hostels.length > 0) {

                    let hostelIdsArray = hostels.map(hostel => hostel.id);
                    let hostelIdsString = JSON.stringify(hostelIdsArray);

                    var sql2 = "UPDATE createaccount SET hostel_ids=?,hostel_count=? WHERE id=?";
                    connection.query(sql2, [hostelIdsString, hostel_count, user_id], (err, result) => {
                        if (err) {
                            console.error("Error saving hostels:", err);
                        }
                    })
                } else {
                    var sql2 = "UPDATE createaccount SET hostel_count=? WHERE id=?";
                    connection.query(sql2, [hostel_count, user_id], (err, result) => {
                        if (err) {
                            console.error("Error saving hostels:", err);
                        }
                    })
                }

                return res.status(200).json({ statusCode: 200, message: api_data.message, data: api_data.hostedpage, selected_hostels: hostels });
            } else {
                return res.status(201).json({ statusCode: 201, message: api_data.message });
            }
        }
    } catch (error) {
        return res.status(201).json({ statusCode: 201, message: "Internal Server Error", error: error.message });
    }
}



async function webhook_status(req, res) {

    var event = req.body.event_type;

    console.log(req.body);

    var body_val = req.body;

    if (event == 'payment_thankyou') {

        const paymentId = req.body.data.payment.payment_id;
        const subscriptionId = 0;
        const amount = req.body.data.payment.amount;
        var customer_id = body_val.data.payment.customer_id;

        var wallet_amount = 10 - amount;

        var event_id = body_val.event_id;

        var plan_code = 'addon_plan';
        var plan_status = 1;
        var plan_type = 'paid';
        var plan_duration = 30;
        var payment_status = 1;
        var start_date = new Date();
        var end_date = new Date();
        end_date.setMonth(end_date.getMonth() + 1);

        var sql1 = `INSERT INTO subscribtion_history 
            (customer_id, plan_code, subscribtion_id, amount, plan_status, plan_type, plan_duration, payment_status, startdate, end_date,payment_id,event_id) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)
        `;
        connection.query(sql1, [
            customer_id, plan_code, subscriptionId, amount, plan_status, plan_type, plan_duration, payment_status, start_date, end_date, paymentId, event_id
        ], function (error, results, fields) {
            if (error) {
                console.error('Error executing query:', error);
            }

            var sql3 = "SELECT * FROM createaccount WHERE customer_id=?";
            connection.query(sql3, [customer_id], function (err, get_data) {
                if (err) {
                    console.log("Unbale to get user details");
                } else if (get_data.length != 0) {

                    var user_id = get_data[0].id;

                    var sql4 = "SELECT * FROM wallet WHERE user_id=? AND is_active=1";
                    connection.query(sql4, [user_id], function (err, wal_data) {
                        if (err) {
                            console.log("Wallet error", err);
                        } else if (wal_data.length != 0) {

                            var old_wallet = wal_data[0].amount;

                            var new_wallet = old_wallet - wallet_amount

                            var row_id = wal_data[0].id;
                            var sql5 = "UPDATE wallet amount=? WHERE id=?";
                            connection.query(sql5, [new_wallet, row_id], function (err, data) {
                                if (err) {
                                    console.log("Wallet error", err);
                                } else {
                                    var logs = "Subscribe Your Wallet Amount for " + " " + wallet_amount
                                    var sql6 = "INSERT INTO wallet_logs (logs,used_by) VALUES (?,?)";
                                    connection.query(sql6, [logs, user_id], function (err, ins_err) {
                                        if (err) {
                                            console.log("Wallet error", err);
                                        } else {
                                            console.log("Wallet Updated");

                                        }
                                    })
                                }
                            })
                        } else {
                            console.log("No Wallet Added");
                        }
                    })

                    var hostel_ids = get_data[0].hostel_ids;

                    if (hostel_ids != 0 && Array.isArray(hostel_ids)) {

                        var user_id = get_data[0].id;

                        var sql4 = "SELECT * FROM hosteldetails WHERE created_By=?";
                        connection.query(sql4, [user_id], function (err, hs_data) {
                            if (err) {
                                console.log("Hostel Details API Error");
                            } else if (hs_data.length !== 0) {
                                var hostel_id = hs_data.map(x => x.id); // Extract hostel IDs

                                console.log("hostel_id:", hostel_id);

                                if (hostel_id.length > 0) {
                                    var sql5 = "UPDATE hosteldetails SET isActive=2 WHERE id IN (?)";
                                    connection.query(sql5, [hostel_id], function (err, up_data) {
                                        if (err) {
                                            console.log("Update Hostel Details Query Error", err);
                                        } else {
                                            var sql6 = "UPDATE hosteldetails SET isActive=1 WHERE id IN (?)";
                                            connection.query(sql6, [hostel_ids], function (err, up_res2) {
                                                if (err) {
                                                    console.log("Update Error for Active Hostel Details Query Error", err);
                                                } else {
                                                    console.log("Updated New Hostel Details");
                                                }
                                            });
                                        }
                                    });
                                } else {
                                    console.log("No Hostels to Update");
                                }
                            } else {
                                console.log("No Hostels Added");
                            }
                        });

                    }
                } else {
                    console.log("Invalid user details");
                }
            })

            var sql2 = "UPDATE createaccount SET plan_status=1 WHERE customer_id=?";
            connection.query(sql2, [customer_id], function (err, up_date) {
                if (err) {
                    console.log(err);
                } else {
                    console.log('Subscription history inserted:', results);
                }
            })


        });
        console.log(`Payment ${paymentId} for subscription ${subscriptionId} was successful. Amount: ${amount}`);

    } else if (event === 'payment_failed') {
        const paymentId = req.body.data.payment_id;
        console.log(`Payment ${paymentId} failed.`);
        // res.status(200).send('Payment failed');
    } else {
        console.log("In this Evenot not Success and Not Failure Event");
        console.log(event);
        res.status(200).json({ success: true, message: "Webhook received" });
    }
}

async function plans_list(req, res) {

    var apiEndpoint = " https://www.zohoapis.in/billing/v1/plans";
    var method = 'GET'

    var input_body = 0;

    try {
        const response = await apiResponse(apiEndpoint, method, input_body);
        console.log("Invoice Details", response);

        var plan_details = response.plans;
        return res.status(200).json({ message: "Plan Details", statusCode: 200, plan_details: plan_details })

    } catch (error) {
        console.error('Error subscribing user:', error);
        return res.status(201).json({ message: "Unable to update Plan Details", statusCode: 201, error: error })
    }
}

async function new_hosted_page(req, res) {

    var { first_name, last_name, mob_no, email } = req.body;

    if (!first_name || !mob_no || !email) {
        return res.json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    last_name = last_name || '';

    var currentDate = new Date().toISOString().split('T')[0];

    var input_body = {
        plan: { plan_code: 'test_499' },
        customer: {
            display_name: first_name + " " + last_name,
            first_name: first_name,
            last_name: last_name,
            email: email,
            mobile: mob_no
        },
        redirect_url: "https://fullstack.qbatzclay.com/",
        start_date: currentDate,
        notes: `New Subscription - Order ID: ${Date.now()}`
    };

    var apiEndpoint = "https://www.zohoapis.in/billing/v1/hostedpages/newsubscription";
    var method = "POST";

    let api_data = await apiResponse(apiEndpoint, method, input_body);

    if (api_data.code == 0) {

        return res.status(200).json({ statusCode: 200, message: api_data.message, data: api_data.hostedpage });
    } else {
        return res.status(201).json({ statusCode: 201, message: api_data.message });
    }

}

function all_reviews(req, res) {

    var api_url = "https://maps.googleapis.com/maps/api/place/details/json?place_id=ChIJ994DNHInBDsR4ouAItexpm0&fields=name,rating,reviews&key=AIzaSyBq3a6aID7NM9FJ-tl_c9iSsURCEHcFMDU";

    const method = "GET";

    const options = {
        url: api_url,
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
    };

    request(options, (error, response, body) => {
        if (error) {
            res.status(201).send({ error: 'Message sending failed' });
        } else {
            const parsedBody = JSON.parse(body);
            res.status(200).send({ message: "All Reviews", data: parsedBody });
        }
    });

}

async function redirect_func(req, res) {

    console.log(req.params);

    let invoiceId = req.params.invoiceUrl;

    console.log(invoiceId);

    if (!invoiceId) {
        return res.status(201).send('Invalid Invoice ID');
    }

    var apiEndpoint = "https://www.zohoapis.in/billing/v1/invoices/" + invoiceId;
    var method = "GET";

    var input_body = 0;

    let api_data = await apiResponse(apiEndpoint, method, input_body);

    if (api_data.code == 0) {

        console.log(api_data);
        res.redirect(api_data.invoice.invoice_url);
        // return res.status(200).json({ statusCode: 200, message: api_data.message, data: api_data.hostedpage });
    } else {
        console.log(api_data);
        // return res.status(201).json({ statusCode: 201, message: api_data.message });
    }
}

module.exports = { subscipition, invoice_details, invoice_payments, check_trail_end, checkAllSubscriptions, new_subscription, webhook_status, plans_list, new_hosted_page, all_reviews, redirect_func }


// async function new_subscription(req, res) {

//     var reqBodyData = req.body;
//     if (reqBodyData.mobileNo && reqBodyData.emailId && reqBodyData.first_name && reqBodyData.password && reqBodyData.confirm_password && reqBodyData.plan_code) {

//         connection.query(
//             `SELECT * FROM createaccount WHERE mobileNo='${reqBodyData.mobileNo}' OR email_Id='${reqBodyData.emailId}'`,
//             [reqBodyData.mobileNo, reqBodyData.emailId],
//             async function (error, data) {
//                 if (error) {
//                     console.error("Database error:", error);
//                     response.status(201).json({ message: 'Database error' });
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
//         res.status(201).json({ message: 'Missing Parameter' });
//     }
// }