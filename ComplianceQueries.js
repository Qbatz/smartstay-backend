const connection = require('./config/connection')

function AddCompliance(connection, request, response) {

    var atten = request.body;

    if (!atten) {
        response.status(400).json({ message: "Missing Parameter" });
        return;
    }

    var created_by = request.user_details.id;

    connection.query(`SELECT * FROM compliance WHERE User_id = '${atten.User_id}' and date='${atten.date}'`, function (err, hostelData) {
        if (err) {
            console.error("Error querying hostel data:", err);
            response.status(500).json({ message: "Internal Server Error" });
            return;
        }

        if (hostelData && hostelData.length > 0 && atten.id) {
            connection.query(`UPDATE compliance SET date='${atten.date}', Name='${atten.Name}', Phone='${atten.Phone}', Roomdetail='${atten.Roomdetail}', Complainttype='${atten.Complainttype}', Assign='${atten.Assign}', Status='${atten.Status}', Hostel_id='${atten.Hostel_id}', Floor_id='${atten.Floor_id}', Room='${atten.Room}', hostelname='${atten.hostelname}', Description='${atten.Description}' WHERE ID='${atten.id}'`, function (error, data) {
                if (error) {
                    response.status(500).json({ message: "Error updating record" });
                } else {
                    response.status(200).json({ message: "Update Successfully" });
                }
            });
        } else {
            connection.query(`SELECT MAX(Requestid) AS maxRequestId FROM compliance`, function (error, result) {
                if (error) {
                    console.log(error);
                    response.status(500).json({ message: "Error fetching last Requestid", statusCode: 500 });
                    return;
                }

                let maxRequestId = result[0].maxRequestId || "#100";
                let numericPart = parseInt(maxRequestId.substring(1));
                numericPart++;
                let nextRequestId = `#${numericPart.toString().padStart(2, '0')}`;


                connection.query(`SELECT * FROM compliance WHERE Requestid = '${nextRequestId}'`, function (error, rows) {
                    if (error) {
                        console.error(error);
                        response.status(500).json({ message: "Error checking for existing record", statusCode: 500 });
                        return;
                    }

                    while (rows.length > 0) {
                        numericPart++;
                        nextRequestId = `#${numericPart.toString().padStart(2, '0')}`;
                        connection.query(`SELECT * FROM compliance WHERE Requestid = '${nextRequestId}'`, function (error, rows) {
                            if (error) {
                                console.error(error);
                                response.status(500).json({ message: "Error checking for existing record", statusCode: 500 });
                                return;
                            }
                        });
                    }

                    connection.query(`INSERT INTO compliance(date, Name, Requestid, Roomdetail, Complainttype, Assign, Status, Hostel_id, Floor_id, Room, hostelname, Description, User_id,Bed,created_by) VALUES ('${atten.date}', '${atten.Name}', '${nextRequestId}', '${atten.Roomdetail}', '${atten.Complainttype}', '${atten.Assign}', '${atten.Status}', '${atten.Hostel_id}', '${atten.Floor_id}', '${atten.Room}', '${atten.hostelname}', '${atten.Description}','${atten.User_id}','${atten.Bed}','${created_by}')`, async function (error, data) {
                        if (error) {
                            console.error(error);
                            response.status(500).json({ message: "Error inserting record", statusCode: 500 });
                        } else {
                            var user_id = req.user_details.id;
                            var user_type = req.user_details.user_type;

                            if (user_type != 0) {

                                var title = "New Complaint";
                                var user_type = 0;
                                var message = "New Complaint Created by " + atten.Name + "";
                                var unseen_users = 0;

                                await addNotification.add_notification(user_id, title, user_type, message, unseen_users)
                            }
                            response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                        }
                    });
                });
            });
        }
    });
}

function GetComplianceList(connection, response, request) {
    const userDetails = request.user_details;
    const query1 = `SELECT * FROM hosteldetails hstlDetails inner join compliance comp  on comp.Hostel_id=hstlDetails.id  WHERE hstlDetails.created_By ='${userDetails.id}' ORDER BY comp.ID DESC`;
    connection.query(query1, function (error, hostelData) {
        if (error) {
            console.error(error);
            response.status(403).json({ message: 'Error fetching hostel data' });
            return;
        } else {
            response.status(200).json({ hostelData: hostelData });
        }

    });
}

function add_complainttypes(req, res) {

    var user_id = req.user_details.id;

    var complaint_name = req.body.complaint_name;

    if (!complaint_name) {
        return res.status(201).json({ statusCode: 201, message: "Please Add Complaint Name" })
    }

    var sql1 = "SELECT * FROM complaint_type WHERE complaint_name COLLATE latin1_general_ci = ? AND status=1 AND created_by ='" + user_id + "'";
    connection.query(sql1, [complaint_name], (err, sel_data) => {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Complaint Details" })
        } else if (sel_data.length == 0) {

            var sql2 = "INSERT INTO complaint_type (complaint_name,status,created_by) VALUES (?,1,?)";
            connection.query(sql2, [complaint_name, user_id], (err, ins_data) => {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Add Complaint Details" })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Successfully Add Complaint Details" })
                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Complaint Type Already Exists" })
        }
    })
}

function all_complaint_types(req, res) {

    var user_id = req.user_details.id;

    var sql1 = "SELECT * FROM complaint_type WHERE status=1 AND created_by='" + user_id + "'";
    connection.query(sql1, (sql_err, sel_res) => {
        if (sql_err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Complaint Types" })
        } else if (sel_res.length > 0) {
            return res.status(200).json({ statusCode: 200, message: "All Complaint Types", complaint_types: sel_res })
        } else {
            return res.status(201).json({ statusCode: 201, message: "No Data Found" });
        }
    })
}


module.exports = { AddCompliance, GetComplianceList, add_complainttypes, all_complaint_types };