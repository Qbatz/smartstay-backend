const jwt = require('jsonwebtoken');
require('dotenv').config();
const connection = require('./config/connection');

module.exports = (req, res, next) => {

    // let token = req.headers.authorization; // Token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Not Need to Token
    const openEndpoints = [
        '/login/login',
        '/otp-send/response',
        '/otp-send/send-mail',
        '/forget/select-list',
        '/forgot_otp_response',
        '/newaccount/create-account',
        '/invoice_details',
        '/invoice_record_payments',
        '/new_subscription',
        '/webhook/payment-status',
        '/conutry_list',
        '/export_expenses',
        '/export_invoices',
        '/user_amenities_history'
    ];

    if (openEndpoints.includes(req.originalUrl) || req.originalUrl.startsWith('/login/login?')) {
        return next();
    } else {
        if (!token) {
            res.status(206).json({ message: "Access denied. No token provided", statusCode: 206 });
        } else {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user_details = decoded;

                var created_by = decoded.id;

                var sql1 = "SELECT * FROM createaccount WHERE id='" + created_by + "'";
                connection.query(sql1, function (err, data) {
                    if (err) {
                        res.status(206).json({ message: "Unable to Get Admin Details", statusCode: 206 });
                    } else if (data.length != 0) {

                        const currentTime = Math.floor(Date.now() / 1000);
                        const timeToExpire = decoded.exp - currentTime;

                        let newToken = null;

                        // Refresh the token
                        if (timeToExpire <= 600) {
                            newToken = jwt.sign(
                                { id: decoded.id, sub: decoded.id, user_type: 1, username: decoded.username }, process.env.JWT_SECRET, { expiresIn: '30m' }
                            );
                            res.locals.refresh_token = newToken;
                        }

                        const originalJson = res.json.bind(res);

                        res.json = (body) => {
                            if (newToken) {
                                body.refresh_token = newToken;
                            }
                            originalJson(body);
                        };

                        next();
                    } else {
                        res.status(206).json({ message: "Invalid User", statusCode: 206 });
                    }
                })
            } catch (err) {
                res.status(206).json({ message: "Access denied. Invalid Token or Token Expired", statusCode: 206 });
            }
        }
    }
}