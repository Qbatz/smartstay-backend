const request = require('request')
const connection = require('../config/connection')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.user_login = (req, res) => {

    var mob_no = req.body.mob_no;j

    if (!mob_no) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mobile Number" });
    }

    var new_mob = "91" + mob_no;

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    var sq1 = "SELECT * FROM hostel WHERE Phone='" + new_mob + "' AND isActive=1";
    console.log(sq1);
    connection.query(sq1, function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching User Details", reason: err.message });
        } else if (data.length != 0) {

            var sql2 = "INSERT INTO otp_verification (phone_number, otp, expires_at) VALUES (?, ?, ?)";
            connection.query(sql2, [mob_no, otp, expiresAt], function (err, Data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error Inserting Otp Details", reason: err.message });
                } else {

                    var api_url = "https://www.fast2sms.com/dev/bulkV2";
                    var api_key = process.env.FASTSMAS_KEY;

                    const method = "POST";

                    const options = {
                        url: api_url,
                        method: method,
                        headers: {
                            Authorization: api_key,
                            'Content-Type': 'application/json'
                        },

                        body: JSON.stringify({
                            "route": "otp",
                            "variables_values": otp,
                            "numbers": mob_no,
                        })
                    };

                    request(options, (error, response, body) => {
                        if (error) {
                            console.error("error:", error);
                            res.status(201).json({ statusCode: 201, message: 'Message sending failed' });
                        } else {
                            console.log("response body", body);
                            res.status(200).json({ statusCode: 200, message: 'Message sent successfully' });
                        }
                    });

                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Mobile Number" });
        }
    })
}

function generateOtp() {
    return Math.floor(1000 + Math.random() * 9000).toString(); // 4-digit OTP
}

// Generate JWT Token
const generateToken = (user) => {
    return jwt.sign({ id: user.ID, sub: "customers", username: user.Name, hostel_id: user.Hostel_Id }, process.env.JWT_SECRET, { expiresIn: '30m' });
};

exports.verify_otp = (req, res) => {

    var { otp, mob_no } = req.body;

    if (!otp || !mob_no) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    var sql1 = "SELECT * FROM otp_verification WHERE phone_number = ? AND otp = ?";
    connection.query(sql1, [mob_no, otp], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching Verfication Details" })
        }

        if (data.length === 0) {
            return res.status(201).json({ statusCode: 201, message: 'Invalid OTP' });
        }

        const { expires_at, verified } = data[0];

        if (verified) {
            return res.status(201).json({ statusCode: 201, message: 'OTP already verified' });
        }

        if (new Date() > new Date(expires_at)) {
            return res.status(201).json({ statusCode: 201, message: 'OTP expired' });
        }

        var sql2 = "UPDATE otp_verification SET verified = TRUE WHERE phone_number = ? AND otp = ?";
        connection.query(sql2, [mob_no, otp], function (err, up_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: 'Error Fetching for Update Otp Details' });
            } else {

                var new_mob = "91" + mob_no;

                var sql3 = "SELECT * FROM hostel WHERE Phone=? AND isActive=1";
                connection.query(sql3, [new_mob], function (err, sel_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: 'Error Fetching Get User Details', reason: err.message });
                    } else if (sel_res.length != 0) {

                        const token = generateToken(sel_res[0]); // token is generated

                        return res.status(200).json({ statusCode: 200, message: "OTP verified successfully", token: token });
                    } else {

                        return res.status(201).json({ statusCode: 201, message: "Invalid User Details" });
                    }
                })
            }
        })
    })
}

exports.dashborad = (req, res) => {

    var id = req.body.id;

    var sql1 = "SELECT * FROM customer_eb_amount "
}