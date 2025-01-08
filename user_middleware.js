const jwt = require('jsonwebtoken');
require('dotenv').config();
const connection = require('./config/connection');

module.exports = (req, res, next) => {

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // Endpoints that do not require validation
    const openEndpoints = [
        '/customers/login',
        '/customers/verify_otp',
        '/customers/user-list'
    ];

    if (openEndpoints.includes(req.originalUrl)) {
        return next();
    }

    if (!token) {
        return res.status(206).json({ message: "Access denied. No token provided", statusCode: 206 });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user_details = decoded;

        const user_id = decoded.id;

        if (decoded.sub == 'customers') {

            var sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
            connection.query(sql1, [decoded.id], function (err, data) {
                if (err) {
                    return res.status(201).json({ message: "Error Fetching User Details", statusCode: 201, reason: err.message });
                } else if (data.length != 0) {

                    const currentTime = Math.floor(Date.now() / 1000);
                    const timeToExpire = decoded.exp - currentTime;

                    req.hostel_id = data[0].Hostel_Id;

                    let newToken = null;

                    if (timeToExpire <= 600) {
                        newToken = jwt.sign(
                            { id: decoded.id, sub: "customers", username: decoded.username, hostel_id: decoded.hostel_id },
                            process.env.JWT_SECRET, { expiresIn: '2hr' }
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
                    return res.status(201).json({ message: "Access denied. Invalid User Detail", statusCode: 201 });
                }
            })
        } else {
            return res.status(201).json({ message: "Access denied. Invalid User Token", statusCode: 201 });
        }

    } catch (err) {
        return res.status(201).json({ message: "Access denied. Invalid User Token or Token Expired", statusCode: 201 });
    }
};
