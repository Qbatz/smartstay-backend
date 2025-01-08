const connection = require('./config/connection')
const addNotification = require('./components/add_notification');

function AddCompliance(connection, request, response) {

    var created_by = request.user_details.id;

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    var { User_id, date, Hostel_id, hostelname, Complainttype, Status, Assign, Bed, Description, Floor_id, Name, Room, id } = request.body;

    if (!User_id || !date || !Hostel_id || !hostelname || !Complainttype) {
        return response.status(201).json({ message: "Please Add Mandatory Fields", statusCode: 201 })
    }

    if (id) {

        if (is_admin == 1 || (role_permissions[13] && role_permissions[13].per_edit === 1)) {

            var sql1 = "SELECT * FROM compliance WHERE ID='" + id + "'";
            connection.query(sql1, function (err, com_data) {
                if (err) {
                    response.status(201).json({ message: "Unable to Get Complaince Detailis", statusCode: 201 });

                } else if (com_data.length != 0) {

                    var sql2 = "UPDATE compliance SET Name='" + Name + "',Complainttype='" + Complainttype + "', Assign='" + Assign + "', Status='" + Status + "', hostelname='" + hostelname + "', Description='" + Description + "' WHERE ID=" + id + ""
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
            response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
    } else {

        if (is_admin == 1 || (role_permissions[13] && role_permissions[13].per_create === 1)) {

            var sql3 = "SELECT MAX(Requestid) AS total_count FROM compliance;";
            connection.query(sql3, function (err, data) {
                if (err) {
                    response.status(201).json({ message: "Unable to Get Complaince Detailis", statusCode: 201 });
                } else {

                    var total_count = data[0].total_count || "#100";
                    var count = parseInt(total_count.replace('#', ''), 10);
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
                                var message = "New Complaint Created by " + Name + "";
                                var unseen_users = 0;

                                await addNotification.add_notification(user_id, title, user_type, message, unseen_users)
                            }

                            response.status(200).json({ message: "Sucessfully Add New Complaince Detailis", statusCode: 200 });
                        }
                    })
                }
            })
        } else {
            response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
        }
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

    var show_ids = request.show_ids;
    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    var hostel_id = request.body.hostel_id;

    if (!hostel_id) {
        return response.status(201).json({ statusCode: 201, message: 'Missing Hostel Details' });
    }

    if (is_admin == 1 || (role_permissions[13] && role_permissions[13].per_view == 1)) {

        // const query1 = `SELECT comp.*,ct.complaint_name,hf.floor_name AS floor_name,hr.Room_Id AS room_name FROM hosteldetails hstlDetails inner join compliance comp on comp.Hostel_id=hstlDetails.id JOIN complaint_type AS ct ON ct.id=comp.Complainttype JOIN Hostel_Floor AS hf ON hf.floor_id=comp.Floor_id AND hf.hostel_id=comp.Hostel_id JOIN hostelrooms AS hr ON hr.id=comp.Room WHERE hstlDetails.created_By IN (${show_ids}) ORDER BY comp.ID DESC`;
        var sql1 = "SELECT comp.*,ct.complaint_name,hf.floor_name AS floor_name,hr.Room_Id AS room_name,cr.first_name AS assigner_name FROM hosteldetails hstlDetails inner join compliance comp on comp.Hostel_id=hstlDetails.id JOIN complaint_type AS ct ON ct.id=comp.Complainttype LEFT JOIN Hostel_Floor AS hf ON hf.floor_id=comp.Floor_id AND hf.hostel_id=comp.Hostel_id LEFT JOIN hostelrooms AS hr ON hr.id=comp.Room LEFT JOIN createaccount AS cr ON cr.id=comp.Assign  WHERE hstlDetails.ID =? AND comp.isActive=1 ORDER BY comp.ID DESC;"
        connection.query(sql1, [hostel_id], function (error, hostelData) {
            if (error) {
                console.error(error);
                response.status(403).json({ message: 'Error fetching hostel data' });
                return;
            } else {
                response.status(200).json({ hostelData: hostelData });
            }

        });
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function add_complainttypes(req, res) {

    var user_id = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var complaint_name = req.body.complaint_name;
    var hostel_id = req.body.hostel_id;


    if (is_admin == 1 || (role_permissions[13] && role_permissions[13].per_create == 1)) {

        if (!complaint_name) {
            return res.status(201).json({ statusCode: 201, message: "Please Add Complaint Name" })
        }

        if (!hostel_id) {
            return res.status(201).json({ statusCode: 201, message: "Please Add Hostel Details" })
        }

        var sql1 = "SELECT * FROM complaint_type WHERE complaint_name COLLATE latin1_general_ci = ? AND status=1 AND hostel_id ='" + hostel_id + "'";
        connection.query(sql1, [complaint_name], (err, sel_data) => {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Complaint Details" })
            } else if (sel_data.length == 0) {

                var sql2 = "INSERT INTO complaint_type (complaint_name,hostel_id,status,created_by) VALUES (?,?,1,?)";
                connection.query(sql2, [complaint_name, hostel_id, user_id], (err, ins_data) => {
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
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function all_complaint_types(req, res) {

    var user_id = req.user_details.id;

    var show_ids = req.show_ids;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var hostel_id = req.body.hostel_id;

    if (is_admin == 1 || (role_permissions[13] && role_permissions[13].per_view == 1)) {

        if (!hostel_id) {
            return res.status(201).json({ statusCode: 201, message: "Please Choose Hostel Details" })
        }

        var sql1 = "SELECT * FROM complaint_type WHERE status=1 AND created_by IN (" + show_ids + ") AND hostel_id=" + hostel_id + "";
        connection.query(sql1, (sql_err, sel_res) => {
            if (sql_err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Complaint Types" })
            } else {
                return res.status(200).json({ statusCode: 200, message: "All Complaint Types", complaint_types: sel_res })
            }
            // else {
            //     return res.status(201).json({ statusCode: 201, message: "No Data Found" });
            // }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function remove_complaint_types(req, res) {

    var id = req.body.id;
    var user_id = req.user_details.id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[13] && role_permissions[13].per_delete == 1)) {

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
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function change_details(req, res) {

    var { type, assigner, status, id, hostel_id } = req.body;

    if (!id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Complaints Details" })
    }

    if (!type) {
        return res.status(201).json({ statusCode: 201, message: "Missing Type Field" })
    }

    const allowedTypes = ['assign', 'status_change'];

    if (!allowedTypes.includes(type)) {
        return res.status(201).json({ statusCode: 201, message: `Invalid type. Allowed types are: ${allowedTypes.join(', ')}` });
    }

    if (type == 'assign' && !assigner) {
        return res.status(201).json({ statusCode: 201, message: "Missing Assigner Field" })
    }

    if (type == 'status_change' && !status) {
        return res.status(201).json({ statusCode: 201, message: "Missing Status Field" })
    }

    var sql1 = "SELECT * FROM compliance WHERE ID=? AND Hostel_id=?";
    connection.query(sql1, [id, hostel_id], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Missing Status Field" })
        } else if (data.length != 0) {

            if (type == 'assign') {
                var sql2 = `UPDATE compliance SET Status= '${status}' WHERE ID= ${id} `;
            } else {
                var sql2 = `UPDATE compliance SET Assign= '${assigner}' WHERE ID= ${id} `;
            }
            connection.query(sql2, function (err, up_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Update Compliance Details", reason: err.message })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Updated Complaince Details" })
                }
            })

        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Complaince Details" })
        }
    })
}

function edit_complaint_type(req, res) {

    var user_id = req.user_details.id;
    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var complaint_name = req.body.complaint_name;
    var hostel_id = req.body.hostel_id;
    var id = req.body.id;

    if (is_admin == 1 || (role_permissions[13] && role_permissions[13].per_edit == 1)) {

        if (!complaint_name) {
            return res.status(201).json({ statusCode: 201, message: "Please Add Complaint Name" })
        }

        if (!hostel_id) {
            return res.status(201).json({ statusCode: 201, message: "Please Add Hostel Details" })
        }

        if (!id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Complaint Id" })
        }

        var sql1 = "SELECT * FROM complaint_type WHERE id=? AND hostel_id =? AND status=1";
        connection.query(sql1, [id, hostel_id], (err, sel_data) => {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Complaint Details" })
            } else if (sel_data.length != 0) {

                var sql2 = "UPDATE complaint_type SET complaint_name=? WHERE id=?";
                connection.query(sql2, [complaint_name, id], (err, ins_data) => {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Add Complaint Details" })
                    } else {
                        return res.status(200).json({ statusCode: 200, message: "Successfully Updated Complaint Details" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Complaint Details" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }

}


function delete_compliant (req, res)  {

    var id = req.body.id;

    if (!id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var sql2 = "SELECT * FROM compliance WHERE id=? ";
    connection.query(sql2, [id], function (err, ch_data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error Fetching Contact Details", reason: err.message })
        } else if (ch_data.length != 0) {

            var sql3 = "UPDATE compliance SET isActive = 0  WHERE id=?";
            connection.query(sql3, [id], function (err, ins_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error Fetching Delete compliance Details", reason: err.message })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "compliance Deleted Successfully!" })
                }
            })

        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid compliance Details" })
        }
    })

}





module.exports = { AddCompliance, GetComplianceList, add_complainttypes, all_complaint_types, remove_complaint_types, change_details, edit_complaint_type,delete_compliant };