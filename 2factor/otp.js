const request = require('request')
const connection = require('../config/connection')

exports.user_login = (req, res) => {

    var mob_no = req.body.mob_no;

    var api_key = process.env.FACTOR_KEY;
    var template_id = "temp_2";

    if (!mob_no) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mobile Number" });
    }

    var new_mob = "91" + mob_no;
    console.log(new_mob);

    var sq1 = "SELECT * FROM hostel WHERE Phone='" + new_mob + "' AND isActive=1";
    console.log(sq1);
    connection.query(sq1, function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching User Details", reason: err.message });
        } else if (data.length != 0) {

            var api_url = "https://2factor.in/API/V1/" + api_key + "/SMS/+" + new_mob + "/AUTOGEN3/" + template_id + "";

            console.log(api_url);

            const options = {
                url: api_url,
                method: 'get',
            };

            request(options, (error, response, body) => {
                if (error) {
                    console.error("error:", error);
                    return res.status(201).send({ error: 'Login API error', reason: error });
                } else {
                    const Datas = JSON.parse(body);

                    console.log(Datas);

                    if (Datas.Status == "Success") {
                        res.status(200).send({ statusCode: 200, message: 'Message sent successfully', data_val: Datas });
                    } else {
                        res.status(201).send({ statusCode: 201, message: Datas.Details, data_val: Datas });
                    }
                }
            });

        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Mobile Number" });
        }
    })
}

exports.verify_otp = (req, res) => {

    var { otp, mob_no } = req.body;

    if (!otp || !mob_no) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    var new_mob = "91" + mob_no;
    console.log(new_mob);

    var api_key = process.env.FACTOR_KEY;

    var api_url = "https://2factor.in/API/V1/" + api_key + "/SMS/VERIFY3/" + new_mob + "/" + otp + "";

    console.log(api_url);

    const options = {
        url: api_url,
        method: 'get',
    };

    request(options, (error, response, body) => {
        if (error) {
            console.error("error:", error);
            return res.status(201).send({ error: 'Login API error', reason: error });
        } else {
            const Datas = JSON.parse(body);

            if (Datas.Status == "Success") {
                res.status(200).send({ statusCode: 200, message: 'OTP Matched', data_val: Datas });
            } else {
                res.status(201).send({ statusCode: 201, message: Datas.Details, data_val: Datas });
            }
        }
    });
}

exports.dashborad = (req, res) => {

    var id = req.body.id;

    var sql1="SELECT * FROM customer_eb_amount "
}