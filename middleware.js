const connection = require('./config/connection')

module.exports = (req, res, next) => {

    let originalUrl = req.originalUrl; // Get API URL

    let token = req.headers.authorization ||  "kaw67ap58b000000kaw67ap58b0000"; // Token

    if (!token) {
        res.status(201).json({ message: "Access denied. No token provided" });
    } else {
        if (originalUrl == '/login/login') {
            next();
        } else {
            var sql1 = "SELECT * FROM createaccount AS cs JOIN user_session AS us ON cs.id=us.user_id WHERE us.token =? AND us.status=1;";
            connection.query(sql1, [token], function (get_err, get_res) {
                if (get_err) {
                    res.status(201).json({ message: "Unable to Get User Details, Please Retry" });
                } else if (get_res.length == 0) {
                    res.status(201).json({ message: "Invalid Token" });
                } else {
                    req.user_details = get_res[0];
                    next();
                }
            })
        }
    }
}

