const connection = require('../config/connection')
const moment = require('moment');

exports.amenities_list = (req, res) => {

    var user_id = req.user_details.id;

    var sql = `SELECT amen.id,amen.user_Id,amen.amenity_Id,hostel.Hostel_Id,amen.status,amen.created_At,amname.Amnities_Name,am.Amount FROM AmenitiesHistory AS amen JOIN hostel ON hostel.User_Id = amen.user_Id JOIN Amenities AS am ON am.Amnities_Id = amen.amenity_Id AND amen.Hostel_Id=am.Hostel_Id JOIN AmnitiesName AS amname ON am.Amnities_Id = amname.id WHERE hostel.id = '${user_id}' AND am.Status=1 ORDER BY amen.created_At ASC`;
    connection.query(sql, (am_err, am_data) => {
        if (am_err) {
            return res.status(201).json({ message: "Unable to fetch amenity details", error: am_err });
        } else {
            const result = [];
            const lastStatusMap = {};
            const monthNames = [null, "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December",];

            const currentDate = new Date();
            const currentMonth = currentDate.getMonth() + 1; // Get current month (1-12)
            const currentYear = currentDate.getFullYear();

            const seenRecords = new Set();

            am_data.forEach((record) => {
                const status = record.status;
                const createdAt = new Date(record.created_At);
                const amenityId = record.amenity_Id;
                const startMonth = createdAt.getMonth() + 1; // Get month from createdAt
                const startYear = createdAt.getFullYear();
                const uniqueKey = `${record.user_Id}-${amenityId}-${startYear}-${startMonth}`;

                if (lastStatusMap[amenityId] !== undefined) {
                    const lastRecordDate = new Date(lastStatusMap[amenityId].created_At);
                    const lastMonth = lastRecordDate.getMonth() + 1;
                    const lastYear = lastRecordDate.getFullYear();

                    for (let year = lastYear; year <= startYear; year++) {
                        const start = year === lastYear ? lastMonth + 1 : 1;
                        const end = year === startYear ? startMonth : 12;

                        for (let month = start; month < end; month++) {
                            if (year > currentYear || (year === currentYear && month > currentMonth)) {
                                break;
                            }
                            const gapUniqueKey = `${record.user_Id}-${amenityId}-${year}-${month}`;
                            if (!seenRecords.has(gapUniqueKey)) {
                                seenRecords.add(gapUniqueKey);
                                result.push({
                                    id: null,
                                    user_Id: record.user_Id,
                                    amenity_Id: amenityId,
                                    hostel_Id: record.hostel_Id,
                                    created_At: `${year}-${String(month).padStart(
                                        2,
                                        "0"
                                    )}-01T00:00:00.000Z`,
                                    Amnities_Name: record.Amnities_Name,
                                    Amount: record.Amount,
                                    status: lastStatusMap[amenityId].status,
                                    month_name: monthNames[month],
                                });
                            }
                        }
                    }
                }

                if (startYear < currentYear || (startYear === currentYear && startMonth <= currentMonth)) {
                    result.push({
                        id: record.id,
                        user_Id: record.user_Id,
                        amenity_Id: record.amenity_Id,
                        hostel_Id: record.hostel_Id,
                        created_At: record.created_At,
                        Amnities_Name: record.Amnities_Name,
                        Amount: record.Amount,
                        status: record.status,
                        month_name: monthNames[startMonth],
                    });
                }

                // Update the last known status
                lastStatusMap[amenityId] = {
                    Amnities_Name: record.Amnities_Name,
                    Amount: record.Amount,
                    status: record.status,
                    created_At: record.created_At,
                };
            });

            console.log(lastStatusMap);

            // Fill missing months after the last record for each amenity
            Object.keys(lastStatusMap).forEach((amenityId) => {
                const lastRecordDate = new Date(
                    lastStatusMap[amenityId].created_At
                );
                const lastMonth = lastRecordDate.getMonth() + 1;
                const lastYear = lastRecordDate.getFullYear();

                for (let year = lastYear; year <= currentYear; year++) {
                    const start = year === lastYear ? lastMonth + 1 : 1;
                    const end = year === currentYear ? currentMonth : 12;

                    for (let month = start; month <= end; month++) {
                        if (year > currentYear || (year === currentYear && month > currentMonth)) {
                            break;
                        }
                        const gapUniqueKey = `${sel_res[0].User_Id}-${amenityId}-${year}-${month}`;
                        if (!seenRecords.has(gapUniqueKey)) {
                            seenRecords.add(gapUniqueKey);
                            result.push({
                                id: null,
                                user_Id: sel_res[0].User_Id,
                                amenity_Id: amenityId,
                                hostel_Id: sel_res[0].ID,
                                created_At: `${year}-${String(month).padStart(2, "0")}-01T00:00:00.000Z`,
                                Amnities_Name: lastStatusMap[amenityId].Amnities_Name,
                                Amount: lastStatusMap[amenityId].Amount,
                                status: lastStatusMap[amenityId].status,
                                month_name: monthNames[month],
                            });
                        }
                    }
                }
            });

            // Sort the result by created_At
            result.sort((a, b) => new Date(a.created_At) - new Date(b.created_At));

            return res.status(200).json({ statusCode: 200, message: "Amenity Details", data: result });
        }
    });
}

exports.eb_list = (req, res) => {

    var user_id = req.user_details.id;

    var sql1 = "SELECT * FROM customer_eb_amount WHERE user_id=? AND status=1";
    connection.query(sql1, [user_id], function (err, eb_data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get Eb Details", reason: err.message })
        }

        return res.status(200).json({ statusCode: 200, message: "Eb Details", eb_data: eb_data })
    })
}

exports.invoice_list = (req, res) => {

    var user_id = req.user_details.id;

    var sql6 = "SELECT inv.* FROM invoicedetails AS inv JOIN hosteldetails AS hs ON hs.id=inv.Hostel_Id WHERE inv.hos_user_id=? AND inv.invoice_status=1 ORDER BY id DESC"; // Invoice Query
    connection.query(sql6, [user_id], function (err, invoices) {
        if (err) {
            return res.status(201).json({ message: "Unable to Get Bill Details", statusCode: 201 });
        }

        if (invoices.length === 0) {
            return res.status(200).json({ message: "User Dashboard Details", statusCode: 200, bill_details: [] });
        }

        let completed = 0;

        invoices.forEach((invoice, index) => {
            var sql2 = "SELECT * FROM manual_invoice_amenities WHERE invoice_id=?";
            connection.query(sql2, [invoice.id], function (err, amenities) {
                if (err) {
                    console.log(err);
                    invoices[index]['amenity'] = [];
                } else {
                    invoices[index]['amenity'] = amenities || [];
                }

                completed++;
                if (completed === invoices.length) {
                    return res.status(200).json({ message: "All Bill Details", statusCode: 200, bill_details: invoices });
                }
            });
        });
    });

}

exports.getinvoice_byid = (req, res) => {

    var user_id = req.user_details.id;

    var invoice_id = req.body.invoice_id;

    if (!invoice_id) {
        return res.status(201).json({ message: "Missing Invoice Details", statusCode: 201 });
    }

    var sql6 = "SELECT inv.* FROM invoicedetails AS inv JOIN hosteldetails AS hs ON hs.id=inv.Hostel_Id WHERE inv.hos_user_id=? AND inv.invoice_status=1 AND inv.id=? ORDER BY id DESC"; // Invoice Query
    connection.query(sql6, [user_id, invoice_id], function (err, invoices) {
        if (err) {
            return res.status(201).json({ message: "Unable to Get Bill Details", statusCode: 201 });
        }

        if (invoices.length === 0) {
            return res.status(200).json({ message: "User Dashboard Details", statusCode: 200, bill_details: [] });
        }

        let completed = 0;

        invoices.forEach((invoice, index) => {
            var sql2 = "SELECT * FROM manual_invoice_amenities WHERE invoice_id=?";
            connection.query(sql2, [invoice.id], function (err, amenities) {
                if (err) {
                    console.log(err);
                    invoices[index]['amenity'] = [];
                } else {
                    invoices[index]['amenity'] = amenities || [];
                }

                completed++;
                if (completed === invoices.length) {
                    return res.status(200).json({ message: "All Bill Details", statusCode: 200, bill_details: invoices });
                }
            });
        });
    });

}

exports.create_complaint = (req, res) => {

    var { comp_type, message, date } = req.body;

    var user_id = req.user_details.id;

    if (!comp_type || !message) {
        return res.status(201).json({ message: "Missing Mandatory Fields", statusCode: 201 });
    }

    if (!date) {
        date = moment().format('YYYY-MM-DD');
    }

    var sql1 = "SELECT * FROM hostel WHERE id=? AND isActive=1";
    connection.query(sql1, [user_id], function (err, user_data1) {
        if (err) {
            return res.status(201).json({ message: "Unable to Get User Details", statusCode: 201 });
        }

        if (user_data1.length == 0) {
            return res.status(201).json({ message: "Invalid User Details", statusCode: 201 });
        }

        var user_data = user_data1[0]

        var sql1 = "SELECT MAX(Requestid) AS total_count FROM compliance;";
        connection.query(sql1, function (err, data) {
            if (err) {
                return res.status(201).json({ message: "Unable to Get Complaint Details", statusCode: 201 });
            } else {

                var total_count = data[0].total_count || "#100";
                var count = parseInt(total_count.replace('#', ''), 10);
                count += 1;
                total_count = `#${count}`;

                var sql2 = "INSERT INTO compliance (date,Requestid,Name,Complainttype,Status,Hostel_id,Floor_id,Room,Bed,hostelname,Description,User_id,user_type,created_by) VALUES (?)";
                var params = [date, total_count, user_data.Name, comp_type, "Pending", user_data.Hostel_Id, user_data.Floor, user_data.Rooms, user_data.Bed, user_data.HostelName, message, user_data.User_Id, 2, user_id]
                connection.query(sql2, [params], function (err, ins_data) {
                    if (err) {
                        console.log(err);
                        return res.status(201).json({ message: "Unable to Add Complaint Details", statusCode: 201 });
                    }

                    return res.status(200).json({ statusCode: 200, message: "Successfully Complaint Created !" })
                })
            }
        })
    })


}

exports.complaint_types = (req, res) => {

    var user_id = req.user_details.id;

    var sql1 = "SELECT * FROM hostel WHERE id=? AND isActive=1";
    connection.query(sql1, [user_id], function (err, data) {
        if (err) {
            return res.status(201).json({ message: "Unable to Get User Details", statusCode: 201 });
        }

        if (data.length == 0) {
            return res.status(201).json({ message: "Invalid User Details", statusCode: 201 });
        }

        var hostel_id = data[0].Hostel_Id;

        var sql2 = "SELECT * FROM complaint_type WHERE hostel_id=? AND status=1";
        connection.query(sql2, [hostel_id], function (err, comp_data) {
            if (err) {
                return res.status(201).json({ message: "Unable to Get Complaint Details", statusCode: 201 });
            }

            return res.status(200).json({ statusCode: 200, message: "Complaint Types", comp_types: comp_data });
        })
    })

}

exports.all_complaints = (req, res) => {

    var user_id = req.user_details.id;

    var sql1 = "SELECT * FROM hostel WHERE ID=? AND isActive=1";
    connection.query(sql1, [user_id], function (err, user_data1) {
        if (err) {
            return res.status(201).json({ message: "Unable to Get User Details", statusCode: 201 });
        }

        if (user_data1.length == 0) {
            return res.status(201).json({ message: "Invalid User Details", statusCode: 201 });
        }

        var user_details = user_data1[0];

        var un_userid = user_details.User_Id;

        var sql2 = "SELECT com.id,com.date,com.Requestid AS comp_id,ct.complaint_name,com.Status,com.User_id,com.Description,com.hostelname FROM compliance AS com LEFT JOIN complaint_type AS ct ON ct.id=com.Complainttype WHERE User_id=?;";
        connection.query(sql2, [un_userid], function (err, com_data) {
            if (err) {
                return res.status(201).json({ message: "Unable to Get Complaints Details", statusCode: 201 });
            }

            return res.status(200).json({ statusCode: 200, message: "Complaint Details", comp_data: com_data })
        })
    })

}