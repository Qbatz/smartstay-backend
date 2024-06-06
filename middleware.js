const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {

    // let token = req.headers.authorization; // Token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    const openEndpoints = [
        '/login/login',
        '/otp-send/response',
        '/otp-send/send-mail',
        '/forget/select-list'
    ];

    if (openEndpoints.includes(req.originalUrl) || req.originalUrl.startsWith('/login/login?')) {
        return next();
    } else {
        if (!token) {
            res.status(401).json({ message: "Access denied. No token provided",statusCode:206 });
        } else {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user_details = decoded;

                const currentTime = Math.floor(Date.now() / 1000);
                const timeToExpire = decoded.exp - currentTime;

                let newToken = null;
                console.log(`timeToExpire`, timeToExpire);
                // Refresh the token
                if (timeToExpire <= 600) {
                    newToken = jwt.sign(
                        { id: decoded.id, sub: decoded.id, username: decoded.username }, process.env.JWT_SECRET, { expiresIn: '30m' }
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

            } catch (err) {
                res.status(401).json({ message: "Access denied. Invalid Token or Token Expired",statusCode:206 });
            }
        }
    }
}