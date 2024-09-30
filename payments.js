const connection = require('./config/connection');

function add_payment_details(req, res) {

    var created_by = req.user_details.id;

    var { key_id, key_secret, status, description } = req.body;

    if (!key_id || !key_secret || !status) {
        return res.status(201).json({ statusCode: 201, message: "Kindly Add Mandatory Fields" })
    }

    var sql1 = "SELECT * FROM payment_settings WHERE created_by=?";
    connection.query(sql1, [created_by], function (err, data) {
        if (err) {
            console.log(err);
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Payment Details" })
        } else if (data.length != 0) {
            // Update Process
            var pay_id = data[0].id;
            var sql2 = "UPDATE payment_settings SET key_id=?,key_secret=?,description=?,status=? WHERE id=" + pay_id + "";
            connection.query(sql2, [key_id, key_secret, description, status], function (err, up_res) {
                if (err) {
                    console.log(err);
                    return res.status(201).json({ statusCode: 201, message: "Unable to Update Payment Details" })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Successfully Updated Payment Details" })
                }
            })
        } else {
            // Insert Process
            var sql3 = "INSERT INTO payment_settings (key_id,key_secret,description,status,created_by) VALUES (?,?,?,?,?)";
            connection.query(sql3, [key_id, key_secret, description, status, created_by], function (ins_err, ins_res) {
                if (ins_err) {
                    console.log(ins_err);
                    return res.status(201).json({ statusCode: 201, message: "Unable to Add Payment Details" })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Successfully Add Payment Details" })
                }
            })
        }
    })


}

function payment_details(req, res) {

    var created_by = req.user_details.id;

    var sql1 = "SELECT * FROM payment_settings WHERE created_by='" + created_by + "'";
    connection.query(sql1, function (err, data) {
        if (err) {
            console.log(err);
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Payment Settings" })
        } else {
            return res.status(200).json({ statusCode: 200, message: "Successfully Get Payment Settings", payment_details: data })
        }
    })
}

module.exports = { add_payment_details, payment_details }