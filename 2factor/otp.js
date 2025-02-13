const request = require('request')
const connection = require('../config/connection')
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

exports.user_login = (req, res) => {

    var mob_no = req.body.mob_no;

    if (!mob_no) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mobile Number" });
    }

    var new_mob = "91" + mob_no;

    const otp = generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    var sq1 = "SELECT * FROM hostel WHERE Phone='" + new_mob + "' AND isActive=1 AND Floor != 'undefined'";
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
    return jwt.sign({ id: user.ID, sub: "customers", username: user.Name, hostel_id: user.Hostel_Id }, process.env.JWT_SECRET, { expiresIn: '1hr' });
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

    var id = req.user_details.id;

    var sql1 = "SELECT COALESCE(SUM(amount),0) AS last_month_ebamount FROM customer_eb_amount WHERE DATE_FORMAT(date, '%Y-%m') = DATE_FORMAT(CURDATE() - INTERVAL 1 MONTH, '%Y-%m') AND user_id=" + id + " AND status=1;"
    var sql2 = "SELECT ID.user_id, COALESCE((SELECT MIA.amount FROM manual_invoice_amenities MIA WHERE MIA.invoice_id = ID.id AND LOWER(MIA.am_name) IN ('roomrent', 'room rent', 'rent', 'room') ORDER BY MIA.id DESC LIMIT 1), ID.RoomRent, 0) AS last_month_room_rent FROM invoicedetails ID WHERE ID.Date = (SELECT MAX(Date) FROM invoicedetails WHERE Date >= DATE_FORMAT(DATE_ADD(CURDATE(), INTERVAL -1 MONTH), '%Y-%m-01') AND Date < DATE_FORMAT(CURDATE(), '%Y-%m-01') AND hos_user_id = ID.hos_user_id) AND ID.hos_user_id = " + id + " GROUP BY ID.user_id;";

    var sql3 = "SELECT * FROM compliance WHERE created_by=? AND user_type=2 ORDER BY id DESC"; // Complaints Query
    var sql4 = "SELECT * FROM customer_eb_amount WHERE user_id=? AND status=1 ORDER BY id DESC"; // Eb Details

    var sql5 = "SELECT ahs.*, amname.Amnities_Name FROM AmenitiesHistory AS ahs JOIN hostel AS hos ON hos.User_Id = ahs.user_Id JOIN AmnitiesName AS amname ON amname.id = ahs.amenity_Id WHERE ahs.status = 1 AND ahs.id = (SELECT MAX(sub_ahs.id) FROM AmenitiesHistory AS sub_ahs WHERE sub_ahs.amenity_Id = ahs.amenity_Id AND sub_ahs.user_Id = ahs.user_Id) AND hos.id = ? ORDER BY ahs.id DESC;" // Amenities Details

    var sql6 = "SELECT inv.* FROM invoicedetails AS inv JOIN hosteldetails AS hs ON hs.id=inv.Hostel_Id WHERE inv.hos_user_id=? AND inv.invoice_status=1 ORDER BY id DESC"; // Invoice Query

    var main_query1 = sql1 + sql2;
    connection.query(main_query1, function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching User Details", reason: err.message })
        }

        console.log(data);

        const last_month_ebamount = (data[0] && data[0][0] && data[0][0].last_month_ebamount) || 0;
        const last_month_rent = (data[1] && data[1][0] && data[1][0].last_month_room_rent) || 0;

        connection.query(sql3, [id], function (err, comp_data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error Fetching Complaince Details", reason: err.message })
            }

            connection.query(sql4, [id], function (err, eb_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error Fetching Eb Details", reason: err.message })
                }

                connection.query(sql5, [id], function (err, am_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Error Fetching Amenities Details", reason: err.message })
                    }

                    connection.query(sql6, [id], function (err, invoices) {
                        if (err) {
                            return res.status(201).json({ message: "Unable to Get Bill Details", statusCode: 201 });
                        }

                        if (invoices.length === 0) {
                            return res.status(200).json({ message: "User Dashboard Details", statusCode: 200, last_month_ebamount: last_month_ebamount, last_month_rent: last_month_rent, comp_data: comp_data, eb_data: eb_data, am_data: am_data, bill_details: [] });
                        }

                        let completed = 0;

                        invoices.forEach((invoice, index) => {
                            var sql2 = "SELECT * FROM manual_invoice_amenities WHERE invoice_id=?";
                            connection.query(sql2, [invoice.id], function (err, amenities) {
                                if (err) {
                                    console.log(err);
                                    invoices[index]['amenity'] = [];
                                } else {
                                    invoices[index]['amenity'] = amenities || [];
                                }

                                completed++;
                                if (completed === invoices.length) {
                                    return res.status(200).json({ message: "All Bill Details", statusCode: 200, last_month_ebamount: last_month_ebamount, last_month_rent: last_month_rent, comp_data: comp_data, eb_data: eb_data, am_data: am_data, bill_details: invoices });
                                }
                            });
                        });
                    });

                })
            })
        })
    })

}