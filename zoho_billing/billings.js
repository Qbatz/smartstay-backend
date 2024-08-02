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

    console.log(subscriptionDetails);

    try {
        const response = await apiResponse(apiEndpoint, method, subscriptionDetails);
        console.log('Subscription successful:', response);

        if (response.hostedpage && response.hostedpage.url) {
            console.log('Redirecting to payment page:', response.hostedpage.url);
        } else {
            console.log('Subscription created without hosted payment page.');
        }

        var sql1 = "UPDATE createaccount SET plan_status=1 WHERE customer_id='" + customer_id + "'";
        connection.query(sql1, function (err, data) {
            if (err) {
                return res.status(201).json({ message: "Unable to update Plan Details", statusCode: 201 })
            } else {
                return res.status(200).json({ message: "Successfully update Plan Details", statusCode: 200 })
            }
        })
    } catch (error) {
        console.error('Error subscribing user:', error);
        return res.status(201).json({ message: "Unable to update Plan Details", statusCode: 201, error: error })
    }

}

async function update_subscipition(req, res) {

    var { subscipition_id, plan_code, customer_id } = req.body;

    var apiEndpoint = 'https://www.zohoapis.in/billing/v1/subscriptions/' + subscipition_id;
    var method = "PUT";

    const subscriptionDetails = {
        plan: {
            plan_code: plan_code
        },
        customer_id: customer_id,
        auto_collect: true,
        custom_fields: [],
        addons: [],
        coupons: [],
        notes: 'Additional notes here'
    };

    try {
        const response = await apiResponse(apiEndpoint, method, subscriptionDetails);
        console.log('Subscription successful:', response);

        if (response.hostedpage && response.hostedpage.url) {
            console.log('Redirecting to payment page:', response.hostedpage.url);
        } else {
            console.log('Subscription created without hosted payment page.');
        }

    } catch (error) {
        console.error('Error subscribing user:', error);
        return res.status(201).json({ message: "Unable to update Plan Details", statusCode: 201, error: error })
    }

}
module.exports = { subscipition, update_subscipition }