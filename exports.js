const connection = require('./config/connection')
const fs = require('fs');
const exports_file = require('./components/upload_image');
const moment = require('moment')

function export_customer(req, res) {

    var show_ids = req.show_ids;

    var type = req.body.type;
    var hostel_id = req.body.hostel_id;

    var category = req.body?.category ? req.body.category : null;
    var max_amount = req.body?.max_amount ? Number(req.body.max_amount) : null;
    var min_amount = req.body?.min_amount ? Number(req.body.min_amount) : null;
    var start_date = req.body?.start_date ? moment(new Date(req.body.start_date)).format('YYYY-MM-DD') : null;
    var end_date = req.body?.end_date ? moment(new Date(req.body.end_date)).format('YYYY-MM-DD') : null;
    var payment_mode = req.body?.payment_mode ? req.body.payment_mode : null;
    var price_range = req.body?.price_range || null;
    var searchName = req.body.searchName?.trim() || null;

    var status = req.body?.status || null;

    if (!type || !hostel_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    const allowedTypes = ['customers', 'assets', 'expenses', 'customer_readings', 'walkin', 'booking', 'checkout', 'complaint'];

    if (!allowedTypes.includes(type)) {
        return res.status(201).json({ statusCode: 201, message: `Invalid type` });
    }

    if (type == 'customers') {

        var sql1 = `
        SELECT 
            hstl.*,
            bd.bed_no AS Bed,
            hstl.Bed AS hstl_Bed,
            hsroom.Room_Id AS Rooms,
            hstl.Rooms AS hstl_Rooms,
            hsroom.id AS room_id,
            hsroom.Room_Id,
            DATE_FORMAT(hstl.joining_Date, '%Y-%m-%d') AS user_join_date,
            hstl.Hostel_Id AS user_hostel,
            ca.first_name AS creator_name,
            ca.user_type
        FROM hosteldetails AS hstlDetails
        INNER JOIN hostel AS hstl ON hstl.Hostel_Id = hstlDetails.id AND hstl.isActive = true
        LEFT JOIN country_list AS cl ON hstl.country_code = cl.country_code
        LEFT JOIN hostelrooms hsroom ON hsroom.Hostel_Id = hstlDetails.id AND hsroom.Floor_Id = hstl.Floor AND hsroom.id = hstl.Rooms
        LEFT JOIN bed_details AS bd ON bd.id = hstl.Bed
        JOIN createaccount AS ca ON hstl.created_by = ca.id
        WHERE hstl.Hostel_Id = ?
    `;

        if (searchName) {
            sql1 += ` AND hstl.Name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') `;
        }

        sql1 += ` ORDER BY hstl.ID DESC`;
        var file_name = 'all_customers';



    } else if (type == 'assets') {

        var sql1 = `SELECT ass.*,ven.Vendor_Name,hos.Name AS hostel_name,hosfloor.floor_name,hr.Room_Id AS room_name,ca.first_name AS creator_name,ca.user_type 
                    FROM assets AS ass 
                    LEFT JOIN Vendor AS ven ON ass.vendor_id=ven.id 
                    LEFT JOIN assigned_assets AS aa ON aa.asset_id=ass.id 
                    LEFT JOIN hosteldetails hos ON hos.id = aa.hostel_id 
                    LEFT JOIN Hostel_Floor hosfloor ON hosfloor.floor_id = aa.floor_id AND hosfloor.hostel_id = aa.hostel_id 
                    LEFT JOIN hostelrooms AS hr ON hr.id=aa.room_id 
                    JOIN createaccount AS ca ON ass.created_by=ca.id 
                    WHERE ass.hostel_id = ? AND ass.status=1`;

        if (price_range) {
            if (price_range === '0-100') {
                sql1 += ' AND ass.price BETWEEN 0 AND 100';
            } else if (price_range === '100-500') {
                sql1 += ' AND ass.price BETWEEN 100 AND 500';
            } else if (price_range === '500-1000') {
                sql1 += ' AND ass.price BETWEEN 500 AND 1000';
            } else if (price_range === '1000+') {
                sql1 += ' AND ass.price > 1000';
            }
        }

        if (start_date && end_date) {
            sql1 += ` AND ass.purchase_date BETWEEN '${start_date}' AND '${end_date}'`;
        } else if (start_date) {
            sql1 += ` AND ass.purchase_date = '${start_date}'`;
        }

        if (searchName) {
            sql1 += `
            AND (
                ass.asset_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                ass.product_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                ass.brand_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                ven.Vendor_Name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                hos.Name LIKE CONCAT('%', ${connection.escape(searchName)}, '%')
            )
        `;
        }

        sql1 += ` ORDER BY ass.id DESC`;
        var file_name = 'all_assets';

    } else if (type == 'expenses') {

        sql1 = `SELECT ex.*, ca.category_Name, ass.asset_name, cas.first_name AS creator_name, cas.user_type 
                FROM expenses AS ex 
                JOIN Expense_Category_Name AS ca ON ex.category_id=ca.id 
                JOIN createaccount AS cas ON ex.created_by=cas.id 
                LEFT JOIN assets AS ass ON ass.id=ex.asset_id  
                WHERE ex.hostel_id = ? AND ex.status = 1`;


        if (searchName) {
            sql1 += `
            AND (
                ca.category_Name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                ass.asset_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                cas.first_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%')
            )
        `;
        }

        if (category) {
            sql1 += ` AND ex.category_id = ${connection.escape(category)}`;
        }


        if (payment_mode) {
            sql1 += ` AND ex.payment_mode = ${connection.escape(payment_mode)}`;
        }

        if (min_amount !== null && max_amount !== null) {
            sql1 += ` AND ex.purchase_amount BETWEEN ${min_amount} AND ${max_amount}`;
        } else if (min_amount !== null) {
            sql1 += ` AND ex.purchase_amount >= ${min_amount}`;
        } else if (max_amount !== null) {
            sql1 += ` AND ex.purchase_amount <= ${max_amount}`;
        }

        if (start_date && end_date) {
            sql1 += ` AND ex.purchase_date BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59'`;
        } else if (start_date) {
            sql1 += ` AND ex.purchase_date BETWEEN '${start_date} 00:00:00' AND '${start_date} 23:59:59'`;
        }

        sql1 += ` ORDER BY ex.id DESC`;
        file_name = 'all_expenses';

    } else if (type == 'customer_readings') {



        var sql1 = `
        SELECT 
            hos.Name AS user_name,
            cus.*,
            ca.first_name AS creator_name,
            ca.user_type 
        FROM customer_eb_amount AS cus 
        JOIN hostel AS hos ON hos.id = cus.user_id 
        JOIN createaccount AS ca ON ca.id = cus.created_by 
        WHERE cus.status = 1 AND hos.Hostel_Id = ?
    `;

        if (searchName) {
            sql1 += ` AND hos.Name LIKE CONCAT('%', ${connection.escape(searchName)}, '%')`;
        }

        if (start_date && end_date) {
            sql1 += ` AND cus.date BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59'`;
        } else if (start_date) {
            sql1 += ` AND cus.date BETWEEN '${start_date} 00:00:00' AND '${start_date} 23:59:59'`;
        }


        sql1 += ` ORDER BY cus.id DESC`;

        var file_name = 'customer_readings';

    } else if (type == 'walkin') {

        var sql1 = `
        SELECT cus.*, 
               ca.first_name AS creator_name, 
               ca.user_type 
        FROM customer_walk_in_details AS cus 
        JOIN createaccount AS ca ON ca.id = cus.created_by 
        WHERE cus.isActive = 1 AND cus.hostel_id = ?
    `;

        if (searchName) {
            sql1 += `
            AND (
                CONCAT(cus.first_name, ' ', cus.last_name) LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                cus.first_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                cus.last_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%')
            )
        `;
        }

        sql1 += ` ORDER BY cus.id DESC;`;
        var file_name = 'all_walkings';
    } else if (type == 'booking') {

        var sql1 = `
        SELECT bo.*, hstl.Name AS hostel_name, hf.floor_name, hr.Room_Id, bd.bed_no,
               ca.first_name AS creator_name, ca.user_type 
        FROM bookings AS bo 
        LEFT JOIN hosteldetails AS hstl ON hstl.ID = bo.hostel_id 
        LEFT JOIN Hostel_Floor AS hf ON hf.floor_id = bo.floor_id 
        LEFT JOIN hostelrooms AS hr ON hr.id = bo.room_id 
        LEFT JOIN bed_details AS bd ON bd.id = bo.bed_id 
        JOIN createaccount AS ca ON ca.id = bo.created_by 
        WHERE bo.status = 1 AND bo.hostel_id = ?
    `;

        if (searchName) {
            sql1 += `
            AND (
                CONCAT(bo.first_name, ' ', bo.last_name) LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                bo.first_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                bo.last_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%')
            )
        `;
        }

        sql1 += ` ORDER BY bo.id DESC;`;
        var file_name = 'all_bookings';

    } else if (type == 'checkout') {

        var sql1 = `
        SELECT hos.*, 
               MAX(hstl.Name) AS hostel_name, 
               MAX(hf.floor_name) AS floor_name, 
               MAX(hr.Room_Id) AS Room_Id, 
               MAX(bd.bed_no) AS bed_no, 
               MAX(ca.first_name) AS creator_name, 
               MAX(ca.user_type) AS user_type 
        FROM hostel AS hos 
        JOIN hosteldetails AS hstl ON hstl.id = hos.Hostel_Id 
        JOIN Hostel_Floor AS hf ON hf.floor_id = hos.Floor 
        JOIN hostelrooms AS hr ON hr.id = hos.Rooms 
        JOIN bed_details AS bd ON bd.id = hos.Bed 
        LEFT JOIN createaccount AS ca ON ca.id = hos.created_by 
        WHERE hos.CheckoutDate IS NOT NULL AND hos.Hostel_Id = ?
    `;

        if (searchName) {
            sql1 += `
            AND (
                CONCAT(hos.first_name, ' ', hos.last_name) LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                hos.first_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%') OR
                hos.last_name LIKE CONCAT('%', ${connection.escape(searchName)}, '%')
            )
        `;
        }

        sql1 += `
        GROUP BY hos.id 
        ORDER BY hos.id DESC;
    `;

        var file_name = 'all_checkouts';

    } else if (type == 'complaint') {

        var sql1 = `
        SELECT 
            com.*, ct.complaint_name,
            hstl.Name AS hostel_name,
            hf.floor_name,
            hr.Room_Id,
            bd.bed_no,
            ca.first_name AS creator_name,
            ca.user_type 
        FROM compliance AS com 
        JOIN hosteldetails AS hstl ON hstl.ID = com.Hostel_id 
        JOIN Hostel_Floor AS hf ON hf.floor_id = com.Floor_id 
        JOIN hostelrooms AS hr ON hr.id = com.Room 
        JOIN bed_details AS bd ON bd.id = com.Bed 
        JOIN createaccount AS ca ON ca.id = com.created_by 
        JOIN complaint_type AS ct ON com.Complainttype = ct.id 
        WHERE com.Hostel_Id = ?
    `;

        if (searchName) {
            sql1 += ` AND com.Name LIKE CONCAT('%', ${connection.escape(searchName)}, '%')`;
        }

        if (status) {
            sql1 += ` AND com.status = ${connection.escape(status)}`;
        }

        if (start_date && end_date) {
            sql1 += ` AND com.createdat BETWEEN '${start_date} 00:00:00' AND '${end_date} 23:59:59'`;
        } else if (start_date) {
            sql1 += ` AND com.createdat BETWEEN '${start_date} 00:00:00' AND '${start_date} 23:59:59'`;
        }

        sql1 += ` ORDER BY com.id DESC`;
        var file_name = 'all_complaints';

    }
    connection.query(sql1, [hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get All Details" })
        } else if (data.length != 0) {

            const filePath = `smartstay_${file_name}_${Date.now()}.xlsx`;
            exports_file.export_function(data, filePath)
                .then((s3Url) => {
                    return res.status(200).json({ statusCode: 200, message: "File Exported Successfully", fileUrl: s3Url });
                })
                .catch((exportErr) => {
                    console.error('Export Error:', exportErr);
                    return res.status(201).json({ statusCode: 201, message: "Error Exporting File" });
                });

        } else {
            return res.status(201).json({ statusCode: 201, message: "No Data Found" })
        }
    })

}


function dash_filter(req, res) {

    var type = req.body.type;
    var range = req.body.range;

    var show_ids = req.show_ids;

    const now = new Date(); // Get the current date

    const year = now.getFullYear(); // Get the current year (e.g., 2024)
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Get the current month (e.g., 11 for November)

    var hostel_id = req.body.hostel_id;

    if (!hostel_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Hostel Details" })
    }

    if (!type) {
        return res.status(201).json({ statusCode: 201, message: "Missing Data Type" })
    }

    const allowedTypes = ['expenses', 'cashback', 'exp_vs_rev', 'advance'];

    if (!allowedTypes.includes(type)) {
        return res.status(201).json({ statusCode: 201, message: `Invalid type` });
    }

    if (type == 'expenses') {

        if (range == 'this_month') {

            var sql1 = "SELECT SUM(expen.purchase_amount) AS purchase_amount, expen.category_id, category.category_Name FROM expenses expen JOIN Expense_Category_Name category ON category.id = expen.category_id WHERE expen.status = true AND expen.hostel_id=" + hostel_id + " AND YEAR(expen.purchase_date) = YEAR(CURDATE()) AND MONTH(expen.purchase_date) = MONTH(CURDATE()) GROUP BY expen.category_id"

        } else if (range == 'last_month') {

            var sql1 = "SELECT SUM(expen.purchase_amount) AS purchase_amount, expen.category_id, category.category_Name FROM expenses expen JOIN Expense_Category_Name category ON category.id = expen.category_id WHERE expen.status = true AND expen.hostel_id=" + hostel_id + " AND YEAR(expen.purchase_date) = YEAR(CURDATE() - INTERVAL 1 MONTH) AND MONTH(expen.purchase_date) = MONTH(CURDATE() - INTERVAL 1 MONTH) GROUP BY expen.category_id";

        } else if (range == 'last_three_months') {

            var sql1 = "SELECT SUM(expen.purchase_amount) AS purchase_amount, expen.category_id, category.category_Name FROM expenses expen JOIN Expense_Category_Name category ON category.id = expen.category_id WHERE expen.status = true AND expen.hostel_id=" + hostel_id + " AND expen.purchase_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND CURDATE() GROUP BY expen.category_id";

        } else if (range == 'last_six_months') {

            var sql1 = "SELECT SUM(expen.purchase_amount) AS purchase_amount, expen.category_id, category.category_Name FROM expenses expen JOIN Expense_Category_Name category ON category.id = expen.category_id WHERE expen.status = true AND expen.hostel_id=" + hostel_id + " AND expen.purchase_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND CURDATE() GROUP BY expen.category_id";

        } else if (range == 'this_year') {

            // var sql1 = "SELECT SUM(expen.purchase_amount) AS purchase_amount, expen.category_id, category.category_Name FROM expenses expen JOIN Expense_Category_Name category ON category.id = expen.category_id WHERE expen.status = true AND expen.hostel_id="+hostel_id+" AND expen.purchase_date BETWEEN DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND CURDATE() GROUP BY expen.category_id";
            var sql1 = "SELECT SUM(expen.purchase_amount) AS purchase_amount, expen.category_id, category.category_Name FROM expenses expen JOIN Expense_Category_Name category ON category.id = expen.category_id WHERE expen.status = true AND expen.hostel_id=" + hostel_id + " AND expen.purchase_date BETWEEN DATE_FORMAT(CURDATE(), '%Y-01-01') AND DATE_FORMAT(CURDATE(), '%Y-12-31') GROUP BY expen.category_id";

        } else {
            // last 24 months
            var sql1 = "SELECT SUM(expen.purchase_amount) AS purchase_amount, expen.category_id, category.category_Name FROM expenses expen JOIN Expense_Category_Name category ON category.id = expen.category_id WHERE expen.status = true AND expen.hostel_id=" + hostel_id + " AND YEAR(expen.purchase_date) = YEAR(CURDATE()) - 1 AND MONTH(expen.purchase_date) BETWEEN 1 AND 12 GROUP BY expen.category_id;";

        }

        connection.query(sql1, function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Expenses Details" })
            } else if (data.length != 0) {

                let total_amount = 0;

                console.log(data);

                for (let i of data) {
                    // console.log("i",i);
                    total_amount += i.purchase_amount;
                }

                const aggregatedData = Object.values(
                    data.reduce((acc, { category_Name, purchase_amount }) => {
                        acc[category_Name] = acc[category_Name] || { category_Name, purchase_amount: 0 };
                        acc[category_Name].purchase_amount += purchase_amount;
                        return acc;
                    }, {})
                ).sort((a, b) => b.purchase_amount - a.purchase_amount);

                const result = [
                    ...aggregatedData.slice(0, 5),
                    {
                        category_Name: "Others",
                        purchase_amount: aggregatedData.slice(5).reduce((sum, { purchase_amount }) => sum + purchase_amount, 0)
                    }
                ];

                return res.status(200).json({ statusCode: 200, message: "Expenses Details", exp_data: result, total_amount: total_amount })


            } else {
                return res.status(200).json({ statusCode: 200, message: "Expenses Details", exp_data: data, total_amount: 0 })
            }
        })

    } else if (type == 'cashback') {

        if (range == 'this_month') {

            var sql2 = "SELECT creaccount.first_name, creaccount.last_name, (SELECT COALESCE(SUM(COALESCE(icv.PaidAmount, 0)), 0) AS revenue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND YEAR(icv.Date) = YEAR(CURDATE()) AND MONTH(icv.Date) = MONTH(CURDATE())) AS Revenue, (SELECT COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) AS overdue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id =" + hostel_id + " AND YEAR(icv.Date) = YEAR(CURDATE()) AND MONTH(icv.Date) = MONTH(CURDATE())) AS overdue FROM hosteldetails details JOIN createaccount creaccount ON creaccount.id = details.created_by WHERE details.id=" + hostel_id + " GROUP BY creaccount.id;"

        } else if (range == 'last_month') {

            var sql2 = "SELECT creaccount.first_name, creaccount.last_name, (SELECT COALESCE(SUM(COALESCE(icv.PaidAmount, 0)), 0) AS revenue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND YEAR(icv.Date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(icv.Date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))) AS Revenue, (SELECT COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) AS overdue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND YEAR(icv.Date) = YEAR(DATE_SUB(CURDATE(), INTERVAL 1 MONTH)) AND MONTH(icv.Date) = MONTH(DATE_SUB(CURDATE(), INTERVAL 1 MONTH))) AS overdue FROM hosteldetails details JOIN createaccount creaccount ON creaccount.id = details.created_by WHERE details.id=" + hostel_id + " GROUP BY creaccount.id;";

        } else if (range == 'last_three_months') {

            var sql2 = "SELECT creaccount.first_name, creaccount.last_name, (SELECT COALESCE(SUM(COALESCE(icv.PaidAmount, 0)), 0) AS revenue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND icv.Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND CURDATE()) AS Revenue, (SELECT COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) AS overdue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND icv.Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 3 MONTH) AND CURDATE()) AS overdue FROM hosteldetails details JOIN createaccount creaccount ON creaccount.id = details.created_by WHERE details.id=" + hostel_id + " GROUP BY creaccount.id;";

        } else if (range == 'last_six_months') {

            var sql2 = "SELECT creaccount.first_name, creaccount.last_name, (SELECT COALESCE(SUM(COALESCE(icv.PaidAmount, 0)), 0) AS revenue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND icv.Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND CURDATE()) AS Revenue, (SELECT COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) AS overdue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND icv.Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 6 MONTH) AND CURDATE()) AS overdue FROM hosteldetails details JOIN createaccount creaccount ON creaccount.id = details.created_by WHERE details.id=" + hostel_id + " GROUP BY creaccount.id;";

        } else if (range == 'this_year') {

            // var sql2 = "SELECT creaccount.first_name, creaccount.last_name, (SELECT COALESCE(SUM(COALESCE(icv.PaidAmount, 0)), 0) AS revenue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id="+hostel_id+" AND icv.Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND CURDATE()) AS Revenue, (SELECT COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) AS overdue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id="+hostel_id+" AND icv.Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND CURDATE()) AS overdue FROM hosteldetails details JOIN createaccount creaccount ON creaccount.id = details.created_by WHERE details.id="+hostel_id+" GROUP BY creaccount.id;";

            var sql2 = "SELECT creaccount.first_name, creaccount.last_name, (SELECT COALESCE(SUM(COALESCE(icv.PaidAmount, 0)), 0) AS revenue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND icv.Date BETWEEN DATE_FORMAT(CURDATE(), '%Y-01-01') AND DATE_FORMAT(CURDATE(), '%Y-12-31')) AS Revenue, (SELECT COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) AS overdue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND icv.Date BETWEEN DATE_FORMAT(CURDATE(), '%Y-01-01') AND DATE_FORMAT(CURDATE(), '%Y-12-31')) AS overdue FROM hosteldetails details JOIN createaccount creaccount ON creaccount.id = details.created_by WHERE details.id=" + hostel_id + " GROUP BY creaccount.id;";

        } else {
            // last year
            var sql2 = "SELECT creaccount.first_name, creaccount.last_name, (SELECT COALESCE(SUM(COALESCE(icv.PaidAmount, 0)), 0) AS revenue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND YEAR(icv.Date) = YEAR(CURDATE()) - 1 AND icv.Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND CURDATE()) AS Revenue, (SELECT COALESCE(SUM(COALESCE(icv.BalanceDue, 0)), 0) AS overdue FROM invoicedetails AS icv JOIN hosteldetails AS hos ON icv.Hostel_Id = hos.id WHERE hos.id=" + hostel_id + " AND YEAR(icv.Date) = YEAR(CURDATE()) - 1 AND icv.Date BETWEEN DATE_SUB(CURDATE(), INTERVAL 12 MONTH) AND CURDATE()) AS overdue FROM hosteldetails details JOIN createaccount creaccount ON creaccount.id = details.created_by WHERE details.id=" + hostel_id + " GROUP BY creaccount.id;";

        }

        connection.query(sql2, function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Cashback Details" })
            } else {
                return res.status(200).json({ statusCode: 200, message: "Cashback Details", cash_back_data: data })
            }
        })


    } else if (type == 'advance') {

        if (range == 'six_month') {

            var sql4 = "SELECT m.month, COALESCE(SUM(inv.PaidAmount), 0) AS advance_amount, COALESCE(SUM(hs.return_advance), 0) AS return_advance FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL seq MONTH), '%Y-%m') AS month FROM (SELECT 0 AS seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS seqs) AS m LEFT JOIN invoicedetails inv ON DATE_FORMAT(inv.Date, '%Y-%m') = m.month AND inv.action = 'advance' AND inv.invoice_status = 1 AND inv.Hostel_Id = ? LEFT JOIN hostel hs ON hs.id = inv.hos_user_id AND hs.isActive = 1 GROUP BY m.month ORDER BY m.month;"

        } else if (range == 'this_year') {

            var sql4 = "SELECT m.month, COALESCE(SUM(inv.PaidAmount), 0) AS advance_amount, COALESCE(SUM(hs.return_advance), 0) AS return_advance FROM (SELECT DATE_FORMAT(MAKEDATE(YEAR(CURDATE()), 1) + INTERVAL seq MONTH, '%Y-%m') AS month FROM (SELECT 0 AS seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS seqs WHERE seq < MONTH(CURDATE())) AS m LEFT JOIN invoicedetails inv ON DATE_FORMAT(inv.Date, '%Y-%m') = m.month AND inv.action = 'advance' AND inv.invoice_status = 1 AND inv.Hostel_Id = ? LEFT JOIN hostel hs ON hs.id = inv.hos_user_id AND hs.isActive = 1 GROUP BY m.month ORDER BY m.month;"

        } else {

            var sql4 = "SELECT m.month, COALESCE(SUM(inv.PaidAmount), 0) AS advance_amount, COALESCE(SUM(hs.return_advance), 0) AS return_advance FROM (SELECT DATE_FORMAT(MAKEDATE(YEAR(CURDATE()) - 1, 1) + INTERVAL seq MONTH, '%Y-%m') AS month FROM (SELECT 0 AS seq UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS seqs) AS m LEFT JOIN invoicedetails inv ON DATE_FORMAT(inv.Date, '%Y-%m') = m.month AND inv.action = 'advance' AND inv.invoice_status = 1 AND inv.Hostel_Id = ? LEFT JOIN hostel hs ON hs.id = inv.hos_user_id AND hs.isActive = 1 GROUP BY m.month ORDER BY m.month;"
        }

        connection.query(sql4, [hostel_id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Advance Details" })
            } else {
                return res.status(200).json({ statusCode: 200, message: "Advance Details", advance_data: data })
            }
        })

    } else {

        if (range == 'six_month') {

            // var sql3 = "SELECT m.month, COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue, COALESCE(SUM(COALESCE(expen.purchase_amount, 0)), 0) AS expense FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.created_By IN (" + show_ids + ")) AS invo ON m.month = invo.month LEFT JOIN (SELECT DATE_FORMAT(expen.purchase_date, '%Y-%m') AS month, expen.purchase_amount FROM expenses AS expen WHERE expen.created_by IN (" + show_ids + ")) AS expen ON m.month = expen.month GROUP BY m.month ORDER BY m.month;"
            var sql1 = "SELECT m.month,COALESCE(SUM(expen.purchase_amount), 0) AS expense FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(expen.purchase_date, '%Y-%m') AS month, expen.purchase_amount  FROM expenses AS expen WHERE expen.hostel_id=" + hostel_id + " AND expen.status = 1 ) AS expen ON m.month = expen.month GROUP BY m.month ORDER BY m.month;";
            // var sql2 = "SELECT m.month,COALESCE(SUM(invo.PaidAmount), 0) AS revenue FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.id =" + hostel_id + ") AS invo ON m.month = invo.month GROUP BY m.month ORDER BY m.month;"
            var sql2 = "SELECT m.month, COALESCE(SUM(invo.PaidAmount), 0) AS revenue FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.id = " + hostel_id + " AND invo.action != 'advance') AS invo ON m.month = invo.month GROUP BY m.month ORDER BY m.month;";

        } else if (range == 'this_year') {

            // var sql3 = "SELECT m.month, COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue, COALESCE(SUM(COALESCE(expen.purchase_amount, 0)), 0) AS expense FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.created_By IN (" + show_ids + ") AND YEAR(invo.Date) = YEAR(CURDATE())) AS invo ON m.month = invo.month LEFT JOIN (SELECT DATE_FORMAT(expen.purchase_date, '%Y-%m') AS month, expen.purchase_amount FROM expenses AS expen WHERE expen.created_by IN (" + show_ids + ") AND YEAR(expen.purchase_date) = YEAR(CURDATE())) AS expen ON m.month = expen.month WHERE m.month BETWEEN CONCAT(YEAR(CURDATE()), '-01') AND CONCAT(YEAR(CURDATE()), '-12') GROUP BY m.month ORDER BY m.month;";
            var sql1 = "SELECT m.month,COALESCE(SUM(COALESCE(expen.purchase_amount, 0)), 0) AS expense FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(expen.purchase_date, '%Y-%m') AS month, expen.purchase_amount FROM expenses AS expen WHERE expen.hostel_id=" + hostel_id + " AND expen.status=1 AND YEAR(expen.purchase_date) = YEAR(CURDATE())) AS expen ON m.month = expen.month WHERE m.month BETWEEN CONCAT(YEAR(CURDATE()), '-01') AND CONCAT(YEAR(CURDATE()), '-12') GROUP BY m.month ORDER BY m.month";
            // var sql2 = "SELECT m.month, COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.id=" + hostel_id + " AND YEAR(invo.Date) = YEAR(CURDATE())) AS invo ON m.month = invo.month WHERE m.month BETWEEN CONCAT(YEAR(CURDATE()), '-01') AND CONCAT(YEAR(CURDATE()), '-12') GROUP BY m.month ORDER BY m.month"
            var sql2 = "SELECT m.month, COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue FROM (SELECT DATE_FORMAT(DATE_SUB(CURDATE(), INTERVAL n MONTH), '%Y-%m') AS month FROM (SELECT 0 AS n UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.id=" + hostel_id + " AND YEAR(invo.Date) = YEAR(CURDATE()) AND invo.action != 'advance') AS invo ON m.month = invo.month WHERE m.month BETWEEN CONCAT(YEAR(CURDATE()), '-01') AND CONCAT(YEAR(CURDATE()), '-12') GROUP BY m.month ORDER BY m.month";
        } else {

            // last Year
            // var sql3 = "SELECT m.month, COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue, COALESCE(SUM(COALESCE(expen.purchase_amount, 0)), 0) AS expense FROM (SELECT DATE_FORMAT(DATE(CONCAT(YEAR(CURDATE()) - 1, '-', LPAD(n, 2, '0'), '-01')), '%Y-%m') AS month FROM (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.created_By IN (" + show_ids + ") AND YEAR(invo.Date) = YEAR(CURDATE()) - 1) AS invo ON m.month = invo.month LEFT JOIN (SELECT DATE_FORMAT(expen.purchase_date, '%Y-%m') AS month, expen.purchase_amount FROM expenses AS expen WHERE expen.created_by IN (" + show_ids + ") AND YEAR(expen.purchase_date) = YEAR(CURDATE()) - 1) AS expen ON m.month = expen.month GROUP BY m.month ORDER BY m.month;";
            var sql1 = "SELECT m.month,COALESCE(SUM(COALESCE(expen.purchase_amount, 0)), 0) AS expense FROM (SELECT DATE_FORMAT(DATE(CONCAT(YEAR(CURDATE()) - 1, '-', LPAD(n, 2, '0'), '-01')), '%Y-%m') AS month FROM (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(expen.purchase_date, '%Y-%m') AS month, expen.purchase_amount FROM expenses AS expen WHERE expen.hostel_id = " + hostel_id + " AND expen.status=1 AND YEAR(expen.purchase_date) = YEAR(CURDATE()) - 1) AS expen ON m.month = expen.month GROUP BY m.month ORDER BY m.month;"
            // var sql2 = "SELECT m.month,COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue FROM ( SELECT DATE_FORMAT(DATE(CONCAT(YEAR(CURDATE()) - 1, '-', LPAD(n, 2, '0'), '-01')), '%Y-%m') AS month FROM (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12) AS numbers) AS m LEFT JOIN ( SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month,invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.id =" + hostel_id + " AND YEAR(invo.Date) = YEAR(CURDATE()) - 1) AS invo ON m.month = invo.month GROUP BY  m.month ORDER BY m.month"
            var sql2 = "SELECT m.month, COALESCE(SUM(COALESCE(invo.PaidAmount, 0)), 0) AS revenue FROM (SELECT DATE_FORMAT(DATE(CONCAT(YEAR(CURDATE()) - 1, '-', LPAD(n, 2, '0'), '-01')), '%Y-%m') AS month FROM (SELECT 1 AS n UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL SELECT 8 UNION ALL SELECT 9 UNION ALL SELECT 10 UNION ALL SELECT 11 UNION ALL SELECT 12) AS numbers) AS m LEFT JOIN (SELECT DATE_FORMAT(invo.Date, '%Y-%m') AS month, invo.PaidAmount FROM invoicedetails AS invo JOIN hosteldetails AS hos ON hos.id = invo.Hostel_Id WHERE hos.id = " + hostel_id + " AND YEAR(invo.Date) = YEAR(CURDATE()) - 1 AND invo.action != 'advance') AS invo ON m.month = invo.month GROUP BY m.month ORDER BY m.month";
        }

        connection.query(sql1, function (err, expenseData) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Cashback Details" })
            } else {

                connection.query(sql2, [show_ids], function (err, rev_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Reveue Cashback Details" })
                    } else {

                        let result = expenseData.map(expenseItem => {
                            let revenueItem = rev_data.find(rev => rev.month === expenseItem.month) || { revenue: 0 };
                            return {
                                month: expenseItem.month,
                                expense: expenseItem.expense,
                                revenue: revenueItem.revenue
                            };
                        });

                        return res.status(200).json({ statusCode: 200, message: "Cashback Details", cash_back_data: result });

                    }
                })
            }
        })

    }

}



module.exports = { export_customer, dash_filter }