const connection = require('./config/connection')

// All Assets Details
function all_assets(req, res) {

    const user_id = req.user_details.id;

    var sql1 = "SELECT assets.*,ven.Vendor_Name,aa.asset_id,aa.hostel_id,aa.room_id,aa.assigned_date FROM assets JOIN Vendor AS ven ON ven.id=assets.vendor_id LEFT JOIN assigned_assets AS aa ON assets.id=aa.asset_id WHERE assets.created_by=? AND assets.status=1 ORDER BY assets.id DESC";
    connection.query(sql1, [user_id], (err, data) => {
        if (err) {
            return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
        }

        return res.status(200).json({ message: "All Asset Details", statusCode: 200, assets: data })
    })

}

function add_asset(req, res) {

    var user_id = req.user_details.id;
    var data = req.body;

    var validationResult = input_validations(data);

    if (validationResult.statusCode == 200) {

        if (!data.serial_number || data.serial_number == undefined) {
            data.serial_number = 0;
        }

        if (data.id) {
            // Update Process
            var sql1 = "SELECT * FROM Vendor WHERE id=?";
            connection.query(sql1, [data.vendor_id], (sel_err, sel_res) => {
                if (sel_err) {
                    return res.status(201).json({ message: "Unable to Get Vendor Details", statusCode: 201 })
                } else if (sel_res.length != 0) {
                    // Check asset 
                    var sql2 = "SELECT * FROM assets WHERE id=?";
                    connection.query(sql2, [data.id], (as_err, as_res) => {
                        if (as_err) {
                            return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
                        } else if (as_res.length != 0) {

                            var total_price = data.price * data.product_count;

                            var sql3 = "UPDATE assets SET asset_name=?,vendor_id=?,brand_name=?,serial_number=?,product_count=?,purchase_date=?,price=?,total_price=? WHERE id=?";
                            connection.query(sql3, [data.asset_name, data.vendor_id, data.brand_name, data.serial_number, data.product_count, data.purchase_date, data.price, total_price, data.id], (up_err, up_res) => {
                                if (up_err) {
                                    return res.status(201).json({ message: "Unable to Update Asset Details", statusCode: 201 })
                                } else {
                                    return res.status(200).json({ message: "Succsssfully Update Asset Details", statusCode: 200 })
                                }
                            })
                        } else {
                            return res.status(201).json({ message: "Invalid Asset Details", statusCode: 201 })
                        }
                    })
                } else {
                    return res.status(201).json({ message: "Invalid Vendor Details", statusCode: 201 })
                }
            })
        } else {

            // Add Process
            //  Check vendor id valid or invalid
            var sql1 = "SELECT * FROM Vendor WHERE id=?";
            connection.query(sql1, [data.vendor_id], (sel_err, sel_res) => {
                if (sel_err) {
                    return res.status(201).json({ message: "Unable to Get Vendor Details", statusCode: 201 })
                } else if (sel_res.length != 0) {

                    var total_price = data.price * data.product_count;

                    var sql2 = "INSERT INTO assets (asset_name,vendor_id,brand_name,serial_number,product_count,purchase_date,price,total_price,status,created_by) VALUES (?,?,?,?,?,?,?,?,?,?)";
                    connection.query(sql2, [data.asset_name, data.vendor_id, data.brand_name, data.serial_number, data.product_count, data.purchase_date, data.price, total_price, 1, user_id], (ins_err, ins_res) => {
                        if (ins_err) {
                            return res.status(201).json({ message: "Unable to Add Asset Details", statusCode: 201 })
                        } else {
                            return res.status(200).json({ message: "To create asset is successfully", statusCode: 200 })
                        }
                    })
                } else {
                    return res.status(201).json({ message: "Invalid Vendor Details", statusCode: 201 })
                }
            })
        }

    } else {
        res.status(201).send(validationResult);
    }
}

function remove_asset(req, res) {

    var asset_id = req.body.asset_id;
    var user_id = req.user_details.id;

    console.log("req.body.asset_id", req.body.asset_id)

    if (!asset_id) {
        return res.status(201).json({ message: "Missing Asset Details", statusCode: 201 })
    }

    var sql2 = "SELECT * FROM assets WHERE id=? AND created_by=?";
    connection.query(sql2, [asset_id, user_id], (as_err, as_res) => {
        if (as_err) {
            return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
        } else if (as_res.length != 0) {

            var sql3 = "UPDATE assets SET status=0 WHERE id=?";
            connection.query(sql3, [asset_id], (up_err, up_res) => {
                if (up_err) {
                    return res.status(201).json({ message: "Unable to Remove Asset Details", statusCode: 201 })
                } else {
                    return res.status(200).json({ message: "Remove Asset Details", statusCode: 200 })
                }
            })
        } else {
            return res.status(201).json({ message: "Invalid Asset Details", statusCode: 201 })
        }
    })

}

function asseign_asset(req, res) {

    var user_id = req.user_details.id;
    var asset_id = req.body.asset_id;

    if (!asset_id) {
        return res.status(201).json({ message: "Missing Asset Details", statusCode: 201 })
    }
    var data = req.body;

    var validationResult = assign_validations(data);

    if (validationResult.statusCode == 200) {

        // Check Assets
        var sql1 = "SELECT * FROM assets WHERE id=?";
        connection.query(sql1, [asset_id], (err, Data) => {
            if (err) {
                return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
            } else if (Data.length != 0) {

                // Asset Id Valid Check add or edit 
                var sql2 = "SELECT * FROM assigned_assets WHERE asset_id=?";
                connection.query(sql2, [asset_id], (as_err, as_res) => {
                    if (as_err) {
                        return res.status(201).json({ message: "Unable to Get Asset Details", statusCode: 201 })
                    } else if (as_res.length == 0) {

                        // Assign Asset
                        var sql3 = "INSERT INTO assigned_assets (asset_id,hostel_id,room_id,assigned_date,created_by) VALUES (?,?,?,?,?)";
                        connection.query(sql3, [asset_id, data.hostel_id, data.room_id, data.asseign_date, user_id], (ins_err, ins_res) => {
                            if (ins_err) {
                                console.log(ins_err);
                                return res.status(201).json({ message: "Unable to Add Assign Asset Details", statusCode: 201 })
                            } else {
                                return res.status(200).json({ message: "Asset Assigned Sucessfully", statusCode: 200 })
                            }
                        })
                    } else {

                        // Reassign Asset
                        var sql4 = "UPDATE assigned_assets SET hostel_id=?,room_id=?,assigned_date=?,updated_by=? WHERE asset_id=?";
                        connection.query(sql4, [data.hostel_id, data.room_id, data.asseign_date, user_id, asset_id], (up_err, up_res) => {
                            if (up_err) {
                                return res.status(201).json({ message: "Unable to Update Assign Asset Details", statusCode: 201 })
                            } else {
                                return res.status(200).json({ message: "Asset Reassigned Sucessfully", statusCode: 200 })
                            }
                        })
                    }
                })
            } else {
                return res.status(201).json({ message: "Invalid Asset Details", statusCode: 201 })
            }
        })
    } else {
        res.status(201).send(validationResult);
    }
}

function assign_validations(data) {
    if (!data.hostel_id) {
        return { message: "Please Add Hostel Name", statusCode: 201 };
    } else if (!data.room_id) {
        return { message: "Please Add Room Details", statusCode: 201 };
    } else if (!data.asseign_date) {
        return { message: "Please Add Assigned Date", statusCode: 201 };
    } else {
        return { message: "Validation passed", statusCode: 200 };
    }
}


function input_validations(data) {

    if (!data.asset_name) {
        return { message: "Please Add Asset Name", statusCode: 201 };
    } else if (!data.vendor_id) {
        return { message: "Please Add Vendor Details", statusCode: 201 };
    } else if (!data.product_count) {
        return { message: "Please Add Product Count", statusCode: 201 };
    } else if (!data.purchase_date) {
        return { message: "Please Add Purchase Date", statusCode: 201 };
    } else if (!data.price) {
        return { message: "Please Add Price Amount", statusCode: 201 };
    } else {
        return { message: "Validation passed", statusCode: 200 };
    }
}


module.exports = { all_assets, add_asset, remove_asset, asseign_asset }