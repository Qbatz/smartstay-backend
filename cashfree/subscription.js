const connection = require('../config/connection')
const request = require('request');

exports.add_new_subscription = (req, res) => {

    var user_id = req.user_details.id;
    var plan_code = req.body.plan_code;

    if (!plan_code) {
        return res.status(201).json({ statusCode: 201, message: "Missing Plan Details" })
    }

    var sql1 = "SELECT * FROM createaccount WHERE id=?";
    connection.query(sql1, [user_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get User Details", reason: err.message });
        }

        if (data.length == 0) {
            return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
        }

        var user_details = data[0];

        const subscriptionExpiryTime = new Date();
        subscriptionExpiryTime.setMinutes(subscriptionExpiryTime.getMinutes() + 10);

        const currentTime = new Date();
        console.log(subscriptionExpiryTime, currentTime);

        console.log('Current Time:', currentTime);
        console.log('Subscription Expiry Time:', subscriptionExpiryTime);
        console.log('Is Current Time > Subscription Expiry Time?', currentTime > subscriptionExpiryTime);


        // return;

        // Get the current time

        const body_val = JSON.stringify({
            subscriptionId: 'test-subscription-3',  // Keep the same subscription ID
            planId: plan_code,
            customerName: `${user_details.first_name} ${user_details.last_name}`,
            customerPhone: String(user_details.mobileNo),
            customerEmail: user_details.email_Id,
            returnUrl: 'https://www.merchant-site.com',
            authAmount: 1,
            expiresOn: '2025-02-21 00:00:00',
            notes: {
                key1: 'value1',
                key2: 'value2',
                key3: 'value3',
                key4: 'value4',
            },
            linkExpiry: 10,  // 10 minutes for link expiration
            notificationChannels: ['EMAIL', 'SMS'],
        });

        if (currentTime > subscriptionExpiryTime) {

            console.log('Payment link expired, creating a new one...');
            // Create a new payment link by sending a POST request
            const options = {
                method: 'POST',
                url: 'https://sandbox.cashfree.com/pg/subscriptions/nonSeamless/subscription',  // API endpoint
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': process.env.CASHFREE_CLIENTID,
                    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
                    'x-api-version': '2023-08-01',
                },
                body: body_val,
            };

            request(options, (error, response) => {
                if (error) {
                    console.error('Error creating new payment link:', error);
                    return res.status(500).json({ statusCode: 500, message: 'Error creating new payment link', reason: error.message });
                }

                const responseBody = JSON.parse(response.body);
                console.log('New payment link created:', responseBody);

                if (response.statusCode == 200) {
                    // Send back the new payment link information
                    return res.status(200).json({ statusCode: response.statusCode, message: 'New payment link created', data: responseBody });
                } else {
                    return res.status(201).json({ statusCode: response.statusCode, message: responseBody.message, data: responseBody });
                }
            });
        } else {
            const options = {
                method: 'POST',
                url: 'https://sandbox.cashfree.com/api/v2/subscriptions/nonSeamless/subscription',  // API endpoint
                headers: {
                    'Content-Type': 'application/json',
                    'x-client-id': process.env.CASHFREE_CLIENTID,
                    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
                    'x-api-version': '2023-08-01',
                },
                body: body_val
            };

            request(options, (error, response, body) => {
                if (error) {
                    console.error('Error:', error);
                    return res.status(201).json({ statusCode: 201, message: error });
                }

                const parsedData = JSON.parse(body);

                console.log(body);

                if (response.statusCode == 200) {
                    return res.status(200).json({ statusCode: response.statusCode, message: parsedData.message, data: parsedData });
                } else {
                    return res.status(201).json({ statusCode: response.statusCode, message: parsedData.message, data: parsedData });
                }
            });
        }
    });


    // var sql1 = "SELECT * FROM createaccount WHERE id=?";
    // connection.query(sql1, [user_id], function (err, data) {
    //     if (err) {
    //         return res.status(201).json({ statusCode: 201, message: "Error to Get User Details", reason: err.message })
    //     }

    //     if (data.length == 0) {
    //         return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
    //     }

    //     var user_details = data[0];

    //     const subscriptionExpiryTime = new Date();
    //     subscriptionExpiryTime.setMinutes(subscriptionExpiryTime.getMinutes() + 10);
    //     const currentTime = new Date();

    //     const body_val = JSON.stringify({
    //         subscriptionId: 'test-subscription-1',
    //         planId: plan_code,
    //         customerName: `${user_details.first_name} ${user_details.last_name}`,
    //         customerPhone: String(user_details.mobileNo),
    //         customerEmail: user_details.email_Id,
    //         returnUrl: 'https://www.merchant-site.com',
    //         authAmount: 1,
    //         expiresOn: '2025-02-21 00:00:00',
    //         notes: {
    //             key1: 'value1',
    //             key2: 'value2',
    //             key3: 'value3',
    //             key4: 'value4',
    //         },
    //         linkExpiry: 10,
    //         notificationChannels: ['EMAIL', 'SMS'],
    //     });

    //     if (currentTime > subscriptionExpiryTime) {
    //         console.log('Payment link expired, creating a new one...');
    //         // createNewPaymentLink();

    //         const options = {
    //             method: 'POST',
    //             url: 'https://sandbox.cashfree.com/pg/subscriptions/nonSeamless/subscription',  // API endpoint
    //             headers: {
    //                 'Content-Type': 'application/json',
    //                 'x-client-id': process.env.CASHFREE_CLIENTID,
    //                 'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
    //                 'x-api-version': '2023-08-01',
    //             },
    //             body: body_val
    //         };

    //         // Send the request to create a new payment link
    //         request(options, (error, response) => {
    //             if (error) {
    //                 console.error('Error creating new payment link:', error);
    //                 return;
    //             }

    //             const responseBody = JSON.parse(response.body);
    //             console.log('New payment link created:', responseBody);
    //             // Provide the new payment link to the user
    //         });
    //     }

    //     const options = {
    //         method: 'POST',
    //         url: 'https://sandbox.cashfree.com/api/v2/subscriptions/nonSeamless/subscription', // 'https://api.cashfree.com/api/v2/subscriptions/nonSeamless/subscription',
    //         headers: {
    //             'Content-Type': 'application/json',
    //             'x-client-id': process.env.CASHFREE_CLIENTID,
    //             'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
    //             'x-api-version': '2023-08-01',
    //         },
    //         body: body_val
    //     };

    //     request(options, (error, response, body) => {
    //         if (error) {
    //             console.error('Error:', error);
    //             return res.status(201).json({ statusCode: 201, message: error })
    //         }

    //         // console.log('Response:', response.statusCode);
    //         // console.log('Body:', body);

    //         if (response.statusCode == 200) {
    //             return res.status(200).json({ statusCode: response.statusCode, message: body.message, data: body.data })
    //         } else {
    //             return res.status(201).json({ statusCode: response.statusCode, message: body.message, data: body })
    //         }
    //     });

    // })
}