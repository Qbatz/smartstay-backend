const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {

    // let token = req.headers.authorization; // Token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (req.originalUrl === '/login/login' || req.originalUrl.startsWith('/login/login?')) {
        next();
    } else {
        if (!token) {
            res.status(201).json({ message: "Access denied. No token provided" });
        } else {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user_details = decoded;

                const currentTime = Math.floor(Date.now() / 1000);
                const timeToExpire = decoded.exp - currentTime;

                let newToken = null;

                // Refresh the token
                if (timeToExpire <= 60) {
                    newToken = jwt.sign(
                        { user_id: decoded.user_id, sub: decoded.user_id, username: decoded.username }, process.env.JWT_SECRET, { expiresIn: '30m' }
                    );
                    res.locals.refresh_token = newToken;
                }

                const originalJson = res.json.bind(res);

                console.log(`originalJson`, originalJson);
                res.json = (body) => {
                    if (newToken) {
                        body.newToken = newToken;
                    }
                    originalJson(body);
                };

                next();

            } catch (err) {
                res.status(201).json({ message: "Access denied. Invalid Token or Token Expired" });
            }
        }
    }
}