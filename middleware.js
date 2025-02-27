const jwt = require('jsonwebtoken');
require('dotenv').config();
const connection = require('./config/connection');

module.exports = (req, res, next) => {

    // let token = req.headers.authorization; // Token
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    // console.log("token",token)

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
        '/user_amenities_history',
        '/customers/login',
        '/customers/verify_otp',
        '/get_invoice_id',
        '/billing/new_hosted_page'
    ];


    if (openEndpoints.includes(req.originalUrl) || req.originalUrl.startsWith('/login/login?') || req.originalUrl.startsWith('/customers')) {
        return next();
    } else {
        if (!token) {
            res.status(206).json({ message: "Access denied. No token provided", statusCode: 206 });
        } else {
            try {

                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user_details = decoded;
                req.user_type = decoded.user_type;

                const created_by = decoded.id;

                let show_ids = [];
                let role_permissions = [];
                let is_admin;

                // Query to get user details to determine createdby
                const sqlGetUser = "SELECT * FROM createaccount WHERE id=? AND user_status=1";
                connection.query(sqlGetUser, [created_by], async function (err, data) {
                    if (err) {
                        return res.status(206).json({ message: "Unable to Get User Details", statusCode: 206 });
                    }

                    if (data.length === 0) {
                        return res.status(206).json({ message: "Invalid User", statusCode: 206 });
                    }

                    const user = data[0];

                    if (decoded.user_type === "admin") {
                        show_ids.push(decoded.id);

                        const sqlAdminDirectUsers = "SELECT id FROM createaccount WHERE createdby = ?";
                        connection.query(sqlAdminDirectUsers, [decoded.id], function (err, directUsers) {
                            if (err) {
                                return res.status(206).json({ message: "Unable to Get Admin's Created Users", statusCode: 206 });
                            }

                            const directUserIds = directUsers.map(item => item.id);
                            show_ids.push(...directUserIds);

                            is_admin = 1;

                            // console.log(directUserIds);

                            if (directUserIds.length > 0) {
                                const sqlIndirectUsers = "SELECT id FROM createaccount WHERE createdby IN (?)";
                                connection.query(sqlIndirectUsers, [directUserIds], function (err, indirectUsers) {
                                    if (err) {
                                        return res.status(206).json({ message: "Unable to Get Indirectly Created Users", statusCode: 206 });
                                    }

                                    show_ids.push(...indirectUsers.map(item => item.id));
                                    sendResponseWithToken();
                                });
                            } else {
                                sendResponseWithToken();
                            }
                        });
                    } else if (decoded.user_type === "agent") {

                        is_admin = 1;
                        show_ids.push(decoded.id, user.createdby);
                        sendResponseWithToken();

                    } else {
                        const role_id = user.role_id;

                        const sqlRolePermissions = `
                            SELECT rp.*, per.permission_name, ro.role_name 
                            FROM role_permissions AS rp 
                            JOIN permissions AS per ON rp.permission_id = per.id 
                            JOIN roles AS ro ON ro.id = rp.role_id 
                            WHERE rp.role_id = ?`;

                        connection.query(sqlRolePermissions, [role_id], function (err, permissions) {
                            if (err) {
                                return res.status(206).json({ message: "Unable to Get Role Permissions", statusCode: 206 });
                            }

                            is_admin = 0;
                            role_permissions = permissions;
                            show_ids.push(decoded.id, user.createdby);
                            sendResponseWithToken();
                        });
                    }

                    function sendResponseWithToken() {
                        const currentTime = Math.floor(Date.now() / 1000);
                        const timeToExpire = decoded.exp - currentTime;

                        let newToken = null;

                        req.is_admin = is_admin;
                        req.show_ids = show_ids;
                        req.role_permissions = role_permissions;

                        // Refresh the token if about to expire
                        if (timeToExpire <= 600) {
                            newToken = jwt.sign(
                                { id: decoded.id, sub: decoded.id, user_type: decoded.user_type, username: decoded.username, role_id: decoded.role_id, plan_code: decoded.plan_code, plan_status: decoded.plan_status, start_date: decoded.startdate, end_date: decoded.end_date, hostel_count: decoded.hostel_count },
                                process.env.JWT_SECRET, { expiresIn: '30m' }
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
                    }
                });
            } catch (err) {
                res.status(206).json({ message: "Access denied. Invalid Token or Token Expired", statusCode: 206 });
            }
        }
    }

}