const bcrypt = require('bcrypt');
const connection = require('./config/connection');

function add_role(req, res) {

    var { role_name, permissions } = req.body;
    var created_by = req.user_details.id;
    var is_admin = req.is_admin;

    var hostel_id = req.body.hostel_id;

    if (is_admin == 1) {

        if (!role_name || !hostel_id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        var sq1 = "SELECT * FROM roles WHERE status=1 AND hostel_id=? AND LOWER(role_name) = LOWER(?)";
        connection.query(sq1, [hostel_id, role_name], function (err, data) {
            if (err) {
                console.log(err);
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Role Details" })
            } else if (data.length > 0) {
                return res.status(201).json({ statusCode: 201, message: "Role name already exists" });
            } else {

                // Insert Role Name
                var sql1 = "INSERT INTO roles (role_name,hostel_id,status,createdby) VALUES (?,?,?,?)";
                connection.query(sql1, [role_name, hostel_id, 1, created_by], function (err, ins_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Add Role Details" })
                    } else {

                        var role_id = ins_res.insertId;

                        let insertCount = 0;
                        let totalPermissions = permissions?.length;

                        for (let i = 0; i < permissions?.length; i++) {

                            var { permission_id, per_view, per_create, per_edit, per_delete } = permissions[i];

                            var sql2 = "INSERT INTO role_permissions (role_id, permission_id, per_view, per_create, per_edit, per_delete) VALUES (?, ?, ?, ?, ?, ?)";
                            connection.query(sql2, [role_id, permission_id, per_view, per_create, per_edit, per_delete], function (err) {
                                if (err) {
                                    console.log(err);
                                } else {
                                    insertCount++;

                                    if (insertCount === totalPermissions) {
                                        return res.status(200).json({ statusCode: 200, message: "Role and permissions added successfully" });
                                    }
                                }
                            });
                        }
                    }
                })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }

}

function edit_role(req, res) {

    var { role_name, permissions, id } = req.body;

    var hostel_id = req.body.hostel_id;

    var is_admin = req.is_admin;

    if (is_admin == 1) {

        if (!role_name || !hostel_id || !id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        var sql3 = "SELECT * FROM roles WHERE id=?";
        connection.query(sql3, [id], function (err, check_res) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Role Details" })
            } else if (check_res.length != 0) {

                var sq1 = "SELECT * FROM roles WHERE status=1 AND hostel_id=? AND LOWER(role_name) = LOWER(?) AND id !=?";
                connection.query(sq1, [role_name, hostel_id, id], function (err, data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to Get Role Details" })
                    } else if (data.length > 0) {
                        return res.status(201).json({ statusCode: 201, message: "Role name already exists" });
                    } else {

                        // Insert Role Name
                        // var sql1 = "INSERT INTO roles (role_name,status,createdby) VALUES (?,?,?)";
                        var sql1 = "UPDATE roles SET role_name=? WHERE id=?";
                        connection.query(sql1, [role_name, id], function (err, ins_res) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Add Role Details" })
                            } else {
                                var sql4 = "DELETE FROM role_permissions WHERE role_id=?";
                                connection.query(sql4, [id], function (err, del_data) {
                                    if (err) {
                                        return res.status(201).json({ statusCode: 201, message: "Unable to Update Role Permissions" })
                                    } else {

                                        let insertCount = 0;
                                        let totalPermissions = permissions.length;

                                        for (let i = 0; i < permissions.length; i++) {
                                            var { permission_id, per_view, per_create, per_edit, per_delete } = permissions[i];

                                            var sql2 = "INSERT INTO role_permissions (role_id, permission_id, per_view, per_create, per_edit, per_delete) VALUES (?, ?, ?, ?, ?, ?)";
                                            connection.query(sql2, [id, permission_id, per_view, per_create, per_edit, per_delete], function (err) {
                                                if (err) {
                                                    console.log(err);
                                                } else {
                                                    insertCount++;

                                                    if (insertCount === totalPermissions) {
                                                        return res.status(200).json({ statusCode: 200, message: "Role and permissions Updated successfully" });
                                                    }
                                                }
                                            });
                                        }
                                    }
                                })

                            }
                        })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Role Details" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function delete_role(req, res) {

    var id = req.body.id;
    var is_admin = req.is_admin;

    if (is_admin == 1) {

        if (!id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        var sql1 = "SELECT * FROM roles WHERE id=?";
        connection.query(sql1, [id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to get Roles Details" })
            } else if (data.length != 0) {

                // Check User 
                var sql2 = "SELECT * FROM createaccount WHERE role_id=? AND user_status=1";
                connection.query(sql2, [id], function (err, user_data) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: "Unable to get User Details" })
                    } else if (user_data.length != 0) {

                        return res.status(202).json({ statusCode: 202, message: "In this Role Assigned User" })

                    } else {

                        var sql3 = "UPDATE roles SET status=0 WHERE id=?";
                        connection.query(sql3, [id], function (err, up_res) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: "Unable to Remove Role Details" })
                            } else {

                                // Remove Role Permissions
                                var sql4 = "DELETE FROM role_permissions WHERE role_id=?";
                                connection.query(sql4, [id], function (err, remove_per) {
                                    if (err) {
                                        return res.status(201).json({ statusCode: 201, message: "Unable to Remove Role Permissions" })
                                    } else {
                                        return res.status(200).json({ statusCode: 200, message: "Role Deleted Successfully!" })
                                    }
                                })
                            }
                        })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Roles Details" })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }

}

function all_roles(req, res) {

    var created_by = req.user_details.id;
    var show_ids = req.show_ids;

    var hostel_id = req.body.hostel_id;

    var is_admin = req.is_admin;
    if (is_admin == 1) {

        var sql1 = "SELECT * FROM roles WHERE status=1 AND createdby IN (?) AND hostel_id=?";
        connection.query(sql1, [show_ids, hostel_id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Role Details" })
            } else {
                return res.status(200).json({ statusCode: 200, message: "Role Details", roles: data })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function role_permissions(req, res) {

    var role_id = req.body.role_id;
    var is_admin = req.is_admin;
    if (is_admin == 1) {

        if (!role_id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        var sql1 = "SELECT rp.*,per.permission_name,ro.role_name FROM role_permissions AS rp JOIN permissions AS per ON rp.permission_id=per.id JOIN roles AS ro ON ro.id=rp.role_id WHERE rp.role_id=?";
        connection.query(sql1, [role_id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get Role Details" })
            } else {
                return res.status(200).json({ statusCode: 200, message: "Role Details", role_details: data })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

async function add_staff_user(req, res) {

    var created_by = req.user_details.id;

    var is_admin = req.is_admin;
    if (is_admin == 1) {

        var { user_name, email_id, phone, role_id, password, description, id } = req.body;

        if (!user_name || !email_id || !phone || !role_id) {
            return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
        }

        if (id) {

            var sql1 = "SELECT * FROM createaccount WHERE id=?";
            connection.query(sql1, [id], function (err, check_user_data) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                } else if (check_user_data.length != 0) {

                    // Check Email
                    var sql2 = "SELECT * FROM createaccount WHERE email_id=? AND user_status=1 AND id !=?";
                    connection.query(sql2, [email_id, id], function (err, mail_data) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                        } else if (mail_data.length == 0) {

                            // Check Phone Number
                            var sql3 = "SELECT * FROM createaccount WHERE mobileNo=? AND user_status=1 AND id !=?";
                            connection.query(sql3, [phone, id], function (err, phone_data) {
                                if (err) {
                                    return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                                } else if (phone_data.length == 0) {

                                    // Update User Details
                                    var sql4 = "UPDATE createaccount SET first_name=?,mobileNo=?,email_Id=?,description=?,role_id=? WHERE id=?";
                                    connection.query(sql4, [user_name, phone, email_id, description, role_id, id], function (err, up_res) {
                                        if (err) {
                                            return res.status(201).json({ statusCode: 201, message: "Unable to Update User Details" })
                                        } else {
                                            return res.status(200).json({ statusCode: 200, message: "Save Changes Successfully!" })
                                        }
                                    })
                                } else {
                                    return res.status(203).json({ statusCode: 203, message: "Mobile Number Already Exists" })
                                }
                            })
                        } else {
                            return res.status(202).json({ statusCode: 202, message: "Email Id Already Exists" })
                        }
                    })
                } else {
                    return res.status(201).json({ statusCode: 201, message: "Invalid User Details" })
                }
            })
        } else {

            const hash_password = await bcrypt.hash(password, 10);

            var sql1 = "SELECT * FROM createaccount WHERE email_Id=? AND user_status=1";
            connection.query(sql1, [email_id], function (err, check_email) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                } else if (check_email.length == 0) {

                    var sql2 = "SELECT * FROM createaccount WHERE mobileNo=? AND user_status=1"
                    connection.query(sql2, [phone], function (err, phone_data) {
                        if (err) {
                            return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
                        } else if (phone_data.length == 0) {

                            var sql2 = "INSERT INTO createaccount (first_name,mobileNo,email_Id,password,role_id,user_type,description,createdby) VALUES (?,?,?,?,?,?,?,?)";
                            connection.query(sql2, [user_name, phone, email_id, hash_password, role_id, 'staff', description, created_by], function (err, ins_res) {
                                if (err) {
                                    return res.status(201).json({ statusCode: 201, message: "Unable to Add User Details" })
                                } else {
                                    return res.status(200).json({ statusCode: 200, message: "User created successfully!" })
                                }
                            })
                        } else {
                            return res.status(203).json({ statusCode: 203, message: "Mobile Number Already Exists" })
                        }
                    })
                } else {
                    return res.status(202).json({ statusCode: 202, message: "Email Id Already Exists" })
                }
            })
        }
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function get_all_staffs(req, res) {

    var created_by = req.user_details.id;
    var is_admin = req.is_admin;
    if (is_admin == 1) {

        var sql1 = "SELECT ca.id,ca.first_name,ca.email_Id,ca.mobileNo,ca.role_id,ro.role_name,ca.description FROM createaccount AS ca JOIN roles AS ro ON ca.role_id=ro.id WHERE ca.createdby=? AND ca.user_status=1;";
        connection.query(sql1, [created_by], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Unable to Get User Details" })
            } else {
                return res.status(200).json({ statusCode: 200, message: "User Details", user_details: data })
            }
        })
    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function delete_staff(req, res) {

    var staff_id = req.body.id;

    var created_by = req.user_details.id;

    if (!staff_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    var sql1 = "SELECT * FROM createaccount WHERE id=? AND user_status=1 AND createdby=? AND user_type='staff'";
    connection.query(sql1, [staff_id, created_by], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to get Staff details", reason: err.message })
        } else if (data.length != 0) {

            var sql2 = "UPDATE createaccount SET user_status=0 WHERE id=?";
            connection.query(sql2, [staff_id], function (err, up_res) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Unable to Delete Staff details", reason: err.message })
                } else {
                    return res.status(200).json({ statusCode: 200, message: "Staff Deleted Successfully!" })
                }
            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Staff details" })
        }
    })

}

module.exports = { add_role, edit_role, delete_role, all_roles, role_permissions, add_staff_user, get_all_staffs, delete_staff }