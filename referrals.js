const connection = require('./config/connection')


function generateReferralCode() {
    let code = Math.random().toString(36).slice(-10).toUpperCase();
    return code;
}

exports.generate_code = (req, res) => {

    var user_id = req.user_details.id;

    try {

        var sql2 = "SELECT * FROM referral_codes WHERE user_id=? AND is_active=1 ORDER BY id DESC";
        connection.query(sql2, [user_id], async function (err, data) {
            if (err) {
                res.status(201).json({ statusCode: 201, message: "Error to Get referral code", reason: err.message });
            } else if (data.length != 0) {

                var referral_code = data[0].referral_code;

                res.status(200).json({ statusCode: 200, message: "Referral Code", referral_code: referral_code });

            } else {
                let referral_code = await generateUniqueReferralCode();
                console.log("Final Referral Code:", referral_code);

                var sql1 = "INSERT INTO referral_codes (user_id,referral_code,is_used,amount,created_by) VALUES (?,?,0,500,?)";
                connection.query(sql1, [user_id, referral_code, user_id], function (err, data) {
                    if (err) {
                        res.status(201).json({ statusCode: 201, message: "Error to add referral code", reason: err.message });
                    }
                })
            }
        })

    } catch (err) {
        console.log(err);
        res.status(201).json({ statusCode: 201, message: "Error generating referral code", reason: err.message });
    }
}

function generateUniqueReferralCode() {

    return new Promise((resolve, reject) => {

        let referral_code = generateReferralCode();

        let sql = "SELECT * FROM referral_codes WHERE referral_code=? AND is_active=1";
        connection.query(sql, [referral_code], async function (err, data) {
            if (err) {
                return reject(err);
            }

            if (data.length !== 0) {
                return resolve(await generateUniqueReferralCode());
            }

            resolve(referral_code); // Return the unique referral code
        });
    });
}