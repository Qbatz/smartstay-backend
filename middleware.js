const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {

    let token = req.headers.authorization; // Token
    if (req.originalUrl === '/login/login' || req.originalUrl.startsWith('/login/login?')) {
        next();
    } else {
        if (!token) {
            res.status(201).json({ message: "Access denied. No token provided" });
        } else {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user_details = decoded;
                next();
            } catch (err) {
                res.status(201).json({ message: "Access denied. Invalid Token" });
            }
        }
    }
}