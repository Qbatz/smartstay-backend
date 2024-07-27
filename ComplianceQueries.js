const connection = require('./config/connection')
const addNotification = require('./components/add_notification');

function AddCompliance(connection, request, response) {

    var created_by = request.user_details.id;

    var { User_id, date, Hostel_id, hostelname, Complainttype, Status, Assign, Bed, Description, Floor_id, Name, Room, id } = request.body;

    if (!User_id || !date || !Hostel_id || !hostelname || !Complainttype || !Status) {
        return response.status(201).json({ message: "Please Add Mandatory Fields", statusCode: 201 })
    }
    if (id) {
        var sql1 = "SELECT * FROM compliance WHERE ID='" + id + "' AND created_by='" + created_by + "'";
        connection.query(sql1, function (err, com_data) {
            if (err) {
                response.status(201).json({ message: "Unable to Get Complaince Detailis", statusCode: 201 });

            } else if (com_data.length != 0) {

                var sql2 = "UPDATE compliance SET Name='" + Name + "', Phone='" + Phone + "',Complainttype='" + Complainttype + "', Assign='" + Assign + "', Status='" + Status + "', hostelname='" + hostelname + "', Description='" + Description + "' WHERE ID=" + id + ""
                connection.query(sql2, function (up_err, up_res) {
                    if (up_err) {
                        response.status(201).json({ message: "Unable to Update Complaince Detailis", statusCode: 201 });
                    } else {
                        response.status(200).json({ message: "Sucessfully Update Complaince Detailis", statusCode: 200 });
                    }
                })
            } else {
                response.status(201).json({ message: "Invalid Complaince Detailis", statusCode: 201 });
            }
        })

    } else {

        var sql3 = "SELECT MAX(Requestid) AS total_count FROM compliance;";
        connection.query(sql1, function (err, data) {
            if (err) {
                response.status(201).json({ message: "Unable to Get Complaince Detailis", statusCode: 201 });
            } else {

                var total_count = data[0].total_count || "#100";
                var count = parseInt(data.replace('#', ''), 10);
                count += 1;
                total_count = `#${count}`;

                var sql4 = "INSERT INTO compliance (date,Requestid,Name,Complainttype,Assign,Status,Hostel_id,Floor_id,Room,Bed,hostelname,Description,User_id,created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
                connection.query(sql4, [date, total_count, Name, Complainttype, Assign, Status, Hostel_id, Floor_id, Room, Bed, hostelname, Description, User_id, created_by], async function (err, ins_data) {
                    if (err) {
                        console.log(err);
                        response.status(201).json({ message: "Unable to Add Complaince Detailis", statusCode: 201 });
                    } else {

                        var user_id = request.user_details.id;
                        var user_type = request.user_details.user_type;

                        if (user_type != 1) {

                            var title = "New Complaint";
                            var user_type = 0;
                            var message = "New Complaint Created by " + atten.Name + "";
                            var unseen_users = 0;

                            await addNotification.add_notification(user_id, title, user_type, message, unseen_users)
                        }

                        response.status(200).json({ message: "Sucessfully Add New Complaince Detailis", statusCode: 200 });
                    }
                })
            }
        })
    }

    // connection.query(`SELECT * FROM compliance WHERE User_id = '${atten.User_id}' and date='${atten.date}'`, function (err, hostelData) {
    //     if (err) {
    //         console.error("Error querying hostel data:", err);
    //         response.status(500).json({ message: "Internal Server Error" });
    //         return;
    //     }

    //     if (hostelData && hostelData.length > 0 && atten.id) {
    //         connection.query(`UPDATE compliance SET date='${atten.date}', Name='${atten.Name}', Phone='${atten.Phone}', Roomdetail='${atten.Roomdetail}', Complainttype='${atten.Complainttype}', Assign='${atten.Assign}', Status='${atten.Status}', Hostel_id='${atten.Hostel_id}', Floor_id='${atten.Floor_id}', Room='${atten.Room}', hostelname='${atten.hostelname}', Description='${atten.Description}' WHERE ID='${atten.id}'`, function (error, data) {
    //             if (error) {
    //                 response.status(500).json({ message: "Error updating record" });
    //             } else {
    //                 response.status(200).json({ message: "Update Successfully" });
    //             }
    //         });
    //     } else {
    //         connection.query(`SELECT MAX(Requestid) AS maxRequestId FROM compliance`, function (error, result) {
    //             if (error) {
    //                 console.log(error);
    //                 response.status(500).json({ message: "Error fetching last Requestid", statusCode: 500 });
    //                 return;
    //             }

    //             let maxRequestId = result[0].maxRequestId || "#100";
    //             let numericPart = parseInt(maxRequestId.substring(1));
    //             numericPart++;
    //             let nextRequestId = `#${numericPart.toString().padStart(2, '0')}`;


    //             connection.query(`SELECT * FROM compliance WHERE Requestid = '${nextRequestId}'`, function (error, rows) {
    //                 if (error) {
    //                     console.error(error);
    //                     response.status(500).json({ message: "Error checking for existing record", statusCode: 500 });
    //                     return;
    //                 }

    //                 while (rows.length > 0) {
    //                     numericPart++;
    //                     nextRequestId = `#${numericPart.toString().padStart(2, '0')}`;
    //                     connection.query(`SELECT * FROM compliance WHERE Requestid = '${nextRequestId}'`, function (error, rows) {
    //                         if (error) {
    //                             console.error(error);
    //                             response.status(500).json({ message: "Error checking for existing record", statusCode: 500 });
    //                             return;
    //                         }
    //                     });
    //                 }

    //                 connection.query(`INSERT INTO compliance(date, Name, Requestid, Roomdetail, Complainttype, Assign, Status, Hostel_id, Floor_id, Room, hostelname, Description, User_id,Bed,created_by) VALUES ('${atten.date}', '${atten.Name}', '${nextRequestId}', '${atten.Roomdetail}', '${atten.Complainttype}', '${atten.Assign}', '${atten.Status}', '${atten.Hostel_id}', '${atten.Floor_id}', '${atten.Room}', '${atten.hostelname}', '${atten.Description}','${atten.User_id}','${atten.Bed}','${created_by}')`, async function (error, data) {
    //                     if (error) {
    //                         console.error(error);
    //                         response.status(500).json({ message: "Error inserting record", statusCode: 500 });
    //                     } else {
    //                         var user_id = request.user_details.id;
    //                         var user_type = request.user_details.user_type;

    //                         if (user_type != 0) {

    //                             var title = "New Complaint";
    //                             var user_type = 0;
    //                             var message = "New Complaint Created by " + atten.Name + "";
    //                             var unseen_users = 0;

    //                             await addNotification.add_notification(user_id, title, user_type, message, unseen_users)
    //                         }
    //                         response.status(200).json({ message: "Save Successfully", statusCode: 200 });
    //                     }
    //                 });
    //             });
    //         });
    //     }
    // });
}

function GetComplianceList(connection, response, request) {
    const userDetails = request.user_details;

    const query1 = `SELECT comp.*,ct.complaint_name FROM hosteldetails hstlDetails inner join compliance comp  on comp.Hostel_id=hstlDetails.id JOIN complaint_type AS ct ON ct.id=comp.Complainttype WHERE hstlDetails.created_By ='${userDetails.id}' ORDER BY comp.ID DESC`;
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

function remove_complaint_types(req, res) {

    var id = req.body.id;
    var user_id = req.user_details.id;

    if (!id) {
        return res.status(201).json({ statusCode: 201, message: "Please Add Complaint Id" })
    }

    var sql1 = "SELECT * FROM complaint_type WHERE id='" + id + "' AND created_by='" + user_id + "'";
    connection.query(sql1, (sel_err, sel_res) => {
        if (sel_err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get Complaint Types" })
        } else if (sel_res.length != 0) {

            // Check in this id used or not used
            var sql2 = "SELECT * FROM compliance WHERE Complainttype='" + id + "'";
            connection.query(sql2, (err, com_data) => {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get Complaint Details" })
                } else if (com_data.length != 0) {
                    return res.status(201).json({ statusCode: 201, message: "In This Complaint Type added Complaint ,So We Cannot Remove this" })
                } else {
                    // Remove Complaint
                    var sql3 = "UPDATE complaint_type SET status=0 WHERE id='" + id + "'";
                    connection.query(sql3, (err, data) => {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Remove Complaint Type" })
                        } else {
                            return res.status(200).json({ statusCode: 200, message: "Successfully Removed Complaint Type" })
                        }
                    })
                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Complaint Type Id" })
        }
    })
}
module.exports = { AddCompliance, GetComplianceList, add_complainttypes, all_complaint_types, remove_complaint_types };