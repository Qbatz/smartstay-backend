const moment = require('moment');
const connection = require('./config/connection')
const path = require('path');
const fs = require('fs');
const AWS = require('aws-sdk');
const pdf = require('html-pdf');
const phantomjs = require('phantomjs-prebuilt');
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;
AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});

const s3 = new AWS.S3();

function AddExpense(request, response) {

    let reqData = request.body;
    var createdBy = request.user_details.id;
    let purchase_date = reqData.purchase_date ? moment(new Date(reqData.purchase_date)).format('YYYY-MM-DD') : ''
    console.log("purchase_date", purchase_date);
    let purchase_amount = Number(reqData.unit_count) * Number(reqData.unit_amount)
    purchase_amount = isNaN(purchase_amount) ? reqData.unit_amount : purchase_amount;
    // console.log("purchase_amount", purchase_amount);
    let createdate = moment(new Date()).format('yyyy-MM-DD HH:mm:ss')

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    var hostel_id = request.body.hostel_id;

    if (!hostel_id) {
        return response.status(201).json({ statusCode: 201, message: "Missing Hostel Details" })
    }

    // console.log("createdate", createdate);
    if (reqData) {

        if (reqData.id != null && reqData.id != undefined && reqData.id != '') {

            if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_edit == 1)) {

                var sql1 = "SELECT * FROM expenses WHERE id=?";
                connection.query(sql1, [reqData.id], function (err, ex_data) {
                    if (err) {
                        response.status(201).json({ message: "Unable to Get Expenses Data" });
                    } else if (ex_data.length != 0) {

                        var old_bank = ex_data[0].bank_id;
                        var last_amount = ex_data[0].purchase_amount;

                        if (!reqData.bank_id) {
                            var new_bank_id = 0
                        } else {
                            var new_bank_id = reqData.bank_id;
                        }

                        let query = `UPDATE expenses SET vendor_id = '${reqData.vendor_id}',asset_id = '${reqData.asset_id}',category_id = ${reqData.category_id},purchase_date = '${purchase_date}',unit_count = ${reqData.unit_count},unit_amount = ${reqData.unit_amount},purchase_amount = ${purchase_amount},description = '${reqData.description}',created_by = ${createdBy},createdate = '${createdate}',payment_mode = '${reqData.payment_mode}',hostel_id ='${reqData.hostel_id}',bank_id='${new_bank_id}' WHERE id = ${reqData.id};`
                        connection.query(query, function (updateErr, updateData) {
                            if (updateErr) {
                                console.log(updateErr);
                                response.status(201).json({ message: "Internal Server Error" });
                            } else {

                                var sql1 = "SELECT * FROM transactions WHERE invoice_id=? AND description='Expenses'";
                                connection.query(sql1, [reqData.id], function (err, trans_data) {
                                    if (err) {
                                        console.log(err, "Update Trans Err");
                                    } else if (trans_data.length != 0) {

                                        var sql2 = "UPDATE transactions SET amount=?,payment_type=?,payment_date=? WHERE invoice_id=?";
                                        connection.query(sql2, [purchase_amount, reqData.payment_mode, purchase_date, reqData.id], function (err, up_trans) {
                                            if (err) {
                                                console.log(err, "Up_trans Err");
                                            } else {

                                                if (reqData.payment_mode) {

                                                    var edit_id = reqData.id;

                                                    var sql5 = "SELECT * FROM bankings WHERE id=? AND status=1";
                                                    connection.query(sql5, [reqData.bank_id], function (err, sel_res) {
                                                        console.log(sel_res);
                                                        if (err) {
                                                            console.log(err);
                                                        } else if (sel_res.length != 0) {

                                                            const balance_amount = parseInt(sel_res[0].balance);

                                                            if (balance_amount && balance_amount != 0) {

                                                                if (purchase_amount > balance_amount) {
                                                                    console.log("Purchase Amont is Greater than Balance Amount");

                                                                } else {

                                                                    var sql6 = "SELECT * FROM bank_transactions WHERE edit_id=? AND `desc`='Expenses' AND status=1";
                                                                    connection.query(sql6, [edit_id], function (err, show_data) {
                                                                        if (err) {
                                                                            console.log(err, "Unable to check edit id");
                                                                        } else if (show_data.length != 0) {

                                                                            // var sql4 = "INSERT INTO bank_transactions (bank_id,date,amount,desc,type,status,createdby,edit_id) VALUES (?,?,?,?,?,?,?,?)";
                                                                            var sql4 = "UPDATE bank_transactions SET bank_id=?,date=?,amount=? WHERE edit_id=?";
                                                                            connection.query(sql4, [reqData.payment_mode, purchase_date, purchase_amount, edit_id], function (err, ins_data) {
                                                                                if (err) {
                                                                                    console.log(err, "Insert Transactions Error");
                                                                                } else {

                                                                                    var new_amount = parseInt(balance_amount) + parseInt(last_amount) - parseInt(purchase_amount);

                                                                                    var sql5 = "UPDATE bankings SET balance=? WHERE id=?";
                                                                                    connection.query(sql5, [new_amount, reqData.payment_mode], function (err, up_date) {
                                                                                        if (err) {
                                                                                            console.log(err, "Update Amount Error");
                                                                                        }
                                                                                    })

                                                                                    if (old_bank == reqData.payment_mode) {

                                                                                        console.log("Updated All Process 1");

                                                                                    } else {

                                                                                        var sql7 = "SELECT * FROM bankings WHERE id=?";
                                                                                        connection.query(sql7, [old_bank], function (err, old_bank_data) {
                                                                                            if (err) {
                                                                                                console.log(err);
                                                                                            } else if (old_bank_data.length != 0) {

                                                                                                var total_amount = parseInt(old_bank_data[0].balance) + parseInt(last_amount);

                                                                                                var sql5 = "UPDATE bankings SET balance=? WHERE id=?";
                                                                                                connection.query(sql5, [total_amount, old_bank], function (err, up_res) {
                                                                                                    if (err) {
                                                                                                        console.log(err);
                                                                                                        // return res.status(201).json({ statusCode: 201, message: "Unable to Update Balance Amount Details" })
                                                                                                    } else {

                                                                                                        var remain_amount = parseInt(balance_amount) - parseInt(purchase_amount);

                                                                                                        // Update New Bank amount
                                                                                                        connection.query(sql5, [remain_amount, reqData.payment_mode], function (err, ins_res) {
                                                                                                            if (err) {
                                                                                                                console.log(err);
                                                                                                                // return res.status(201).json({ statusCode: 201, message: "Unable to Update Balance Amount Details" })
                                                                                                            } else {
                                                                                                                console.log("Updated All Process");

                                                                                                                // return res.status(200).json({ statusCode: 200, message: "Save Changes Successfully!" })
                                                                                                            }
                                                                                                        })
                                                                                                    }
                                                                                                })
                                                                                            } else {
                                                                                                console.log("Invalid Bank");
                                                                                                // return res.status(201).json({ statusCode: 201, message: "Invalid Bank Details" })
                                                                                            }
                                                                                        })

                                                                                    }
                                                                                }
                                                                            })

                                                                        } else {
                                                                            console.log("Invalid Transactions ID");
                                                                        }
                                                                    })
                                                                }
                                                            }
                                                        } else {
                                                            console.log("Invalid Bank Id");
                                                        }
                                                    })
                                                }
                                            }
                                        })
                                    } else {
                                        console.log("Invalid Id Or Not Added in the ID");
                                    }
                                })
                                response.status(200).json({ message: "Data Updated successfully" });
                            }
                        })
                    } else {
                        response.status(201).json({ message: "Invalid Expense Details" });
                    }
                })

            } else {
                response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
            }

        } else {

            if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_create == 1)) {
                let createdate = moment(new Date()).format('yyyy-MM-DD HH:mm:ss');
                let new_bank_id = reqData.bank_id ? reqData.bank_id : 0;

                if (reqData.payment_mode) {

                    let sql5 = "SELECT * FROM bankings WHERE id=? AND status=1";
                    connection.query(sql5, [reqData.payment_mode], function (err, sel_res) {
                        if (err) {
                            console.log(err);
                            return response.status(201).json({ statusCode: 201, message: "Database Error" });
                        }
                        if (sel_res.length === 0) {
                            return response.status(201).json({ statusCode: 201, message: "Invalid Bank Id" });
                        }

                        const balance_amount = parseInt(sel_res[0].balance);

                        if (!balance_amount || purchase_amount > balance_amount) {
                            return response.status(201).json({ statusCode: 201, message: "Insufficient Bank Balance" });
                        }

                        insertExpense(new_bank_id, createdate, sel_res);
                    });
                } else {
                    insertExpense(new_bank_id, createdate, []);
                }
            } else {
                response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
            }

            function insertExpense(new_bank_id, createdate, sel_res) {

                let query = `INSERT INTO expenses (vendor_id, asset_id, category_id, purchase_date, unit_count, unit_amount, purchase_amount, description, created_by, createdate, payment_mode, hostel_id, bank_id) VALUES ('${reqData.vendor_id}', '${reqData.asset_id}', '${reqData.category_id}', '${purchase_date}', '${reqData.unit_count}', '${reqData.unit_amount}', '${purchase_amount}', '${reqData.description}', ${createdBy}, '${createdate}', '${reqData.payment_mode}', '${hostel_id}', '${reqData.payment_mode}');`;

                connection.query(query, function (insertErr, insertData) {
                    if (insertErr) {
                        console.log("Insert Error", insertErr);
                        return response.status(201).json({ statusCode: 201, message: "Internal Server Error" });
                    }

                    let query1 = `SELECT * FROM expenses ORDER BY id DESC`;
                    connection.query(query1, function (select_Err, select_Data) {
                        if (select_Err || select_Data.length === 0) {
                            return response.status(201).json({ statusCode: 201, message: "Error while fetching Data" });
                        }

                        let sql3 = `INSERT INTO transactions (user_id, invoice_id, amount, created_by, payment_type, payment_date, action, status, description) VALUES (0, ${select_Data[0].id}, ${purchase_amount}, ${createdBy}, '${reqData.payment_mode}', '${purchase_date}', 2, 1, 'Expenses')`;
                        connection.query(sql3, function (ins_err) {
                            if (ins_err) {
                                console.log("Transaction Error", ins_err);
                                return response.status(201).json({ statusCode: 201, message: "Unable to Add Transactions Details" });
                            }

                            if (reqData.payment_mode) {

                                var edit_id = insertData.insertId

                                let sql4 = "INSERT INTO bank_transactions (bank_id, date, amount, `desc`, type, status, createdby, edit_id, hostel_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
                                connection.query(sql4, [reqData.payment_mode, purchase_date, purchase_amount, 'Expenses', 2, 1, createdBy, edit_id, hostel_id], function (err) {
                                    if (err) {
                                        console.log("Insert Transactions Error", err);
                                        return response.status(201).json({ statusCode: 201, message: "Error processing bank transaction" });
                                    }
                                    let new_amount = parseInt(sel_res[0].balance) - parseInt(purchase_amount);
                                    let sql5 = "UPDATE bankings SET balance=? WHERE id=?";
                                    connection.query(sql5, [new_amount, reqData.payment_mode], function (err) {
                                        if (err) {
                                            console.log("Update Amount Error", err);
                                        }
                                        response.status(200).json({ statusCode: 200, message: "Added Successfully" });
                                    });
                                });
                            } else {
                                response.status(200).json({ statusCode: 200, message: "Added Successfully" });
                            }
                        });
                    });
                });
            }
        }
    }
    else {
        response.status(201).json({ message: "Missing Parameter" });
    }
}

function AddExpenseCategory(request, response) {

    let reqData = request.body;
    var created_by = request.user_details.id;

    var hostel_id = request.body.hostel_id;

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_create == 1)) {

        if (!reqData.category_Name) {
            return response.status(201).json({ statusCode: 201, message: "Missing Category Name" })
        }
        if (!hostel_id) {
            return response.status(201).json({ statusCode: 201, message: "Missing Hostel Details" })
        }

        if (reqData.category_Name) {

            var category_Name = reqData.category_Name.replace(/\s+/g, '').toLowerCase();
            var sql1 = "SELECT * FROM Expense_Category_Name WHERE REPLACE(LOWER(category_Name), ' ', '') = '" + category_Name + "' AND status=1 AND hostel_id ='" + hostel_id + "'";
            connection.query(sql1, function (error, data) {
                if (error) {
                    console.log("error", error);
                    response.status(201).json({ statusCode: 201, message: "Error Fetching Data" });
                }
                else if (data && data.length > 0) {

                    if (!reqData.id) {
                        return response.status(201).json({ statusCode: 201, message: "Category Name Already Exist" });
                    }
                    if (reqData.sub_Category) {

                        var subcategory = reqData.sub_Category.replace(/\s+/g, '').toLowerCase();
                        var sql3 = "SELECT * FROM Expense_Subcategory_Name WHERE REPLACE(LOWER(subcategory), ' ', '') = '" + subcategory + "' AND status=1 AND hostel_id ='" + hostel_id + "'";
                        connection.query(sql3, function (err, sql3_res) {
                            if (err) {
                                return response.status(201).json({ statusCode: 201, message: "Unble to Get Subcategory Details" });
                            } else if (sql3_res.length > 0) {
                                return response.status(201).json({ statusCode: 201, message: "Sub Category Name Already Exist" });
                            } else {
                                // Add Subcategory
                                var sql4 = "INSERT INTO Expense_Subcategory_Name (category_id,subcategory,hostel_id,status,created_by) VALUES ('" + reqData.id + "','" + reqData.sub_Category + "'," + hostel_id + ",1,'" + created_by + "')";
                                connection.query(sql4, function (ins_err, ins_res) {
                                    if (ins_err) {
                                        console.log(ins_err);
                                        return response.status(201).json({ statusCode: 201, message: "Unble to Add Subcategory Details" });
                                    } else {
                                        response.status(200).json({ statusCode: 200, message: "Successfully Added Sub Category", type: 2 });
                                    }
                                })
                            }
                        })

                    } else {
                        return response.status(201).json({ statusCode: 201, message: "Category Name Already Exist" });
                    }
                } else {
                    var sql2 = `INSERT INTO Expense_Category_Name(category_Name,hostel_id,created_by) VALUES('${reqData.category_Name}',${hostel_id},'${created_by}');`;
                    connection.query(sql2, function (insertErr, insertData) {
                        if (insertErr) {
                            response.status(201).json({ statusCode: 201, message: "Does not Save" });
                        } else {
                            response.status(200).json({ statusCode: 200, message: "New Category Added successfully", type: 1 });
                        }
                    })
                }
            })
        }
        else {
            response.status(201).json({ message: "Missing Parameter" });
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function GetExpensesCategory(request, response) {

    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;
    var show_ids = request.show_ids;

    var hostel_id = request.body.hostel_id;

    if (!hostel_id) {
        return response.status(201).json({ message: "Missing Hostel Id" });
    }

    if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_view === 1)) {

        // var sql1 = "SELECT category.category_Name,category.id as category_Id,category.status,subcategory.id as subcategory_Id,subcategory.subcategory FROM Expense_Category_Name category LEFT JOIN Expense_Subcategory_Name subcategory on subcategory.category_id = category.id and subcategory.status = true WHERE category.status = true AND category.created_by IN (" + show_ids + ") AND category.hostel_id=" + hostel_id + "";

        // connection.query(sql1, function (error, data) {
        //     if (error) {
        //         response.status(201).json({ message: "Error fetching Data" });
        //     } else {
        //         response.status(200).json({ message: "Expense Categories", statusCode: 200, data: data });
        //     }
        // })

        var sql1 = `SELECT category.category_Name,category.id AS category_Id,subcategory.id AS subcategory_Id,subcategory.subcategory FROM Expense_Category_Name category LEFT JOIN Expense_Subcategory_Name subcategory ON subcategory.category_id = category.id AND subcategory.status = true WHERE category.status = true AND category.created_by IN (${show_ids}) AND category.hostel_id = ${hostel_id}`;

        connection.query(sql1, function (error, data) {
            if (error) {
                response.status(201).json({ message: "Error fetching Data" });
            } else {
                const result = [];

                data.forEach(item => {
                    // Check if the category already exists
                    let category = result.find(cat => cat.category_Id === item.category_Id);

                    if (!category) {
                        // If not, add a new category object
                        category = {
                            category_Name: item.category_Name,
                            category_Id: item.category_Id,
                            subcategory: []
                        };
                        result.push(category);
                    }

                    // Add subcategory if it exists
                    if (item.subcategory_Id && item.subcategory) {
                        category.subcategory.push({
                            subcategory_Id: item.subcategory_Id,
                            category_Name: item.category_Name,
                            cat_id: item.category_Id,
                            subcategory: item.subcategory
                        });
                    }
                });

                response.status(200).json({ message: "Expense Categories", statusCode: 200, data: result });
            }
        });

    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function CalculateExpenses(request, response) {
    let reqData = request.body
    let startingYear = new Date(reqData.startingDate).getFullYear();
    // console.log("startingYear", startingYear);
    let endingYear = reqData.endingDate ? new Date(reqData.endingDate).getFullYear() : new Date(reqData.startingDate).getFullYear();
    // console.log("endingYear", endingYear);
    let query = `select expen.id,expen.category_id,expen.vendor_id,expen.asset_id,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode, sum(expen.purchase_amount) as total_amount, category.category_Name from expenses expen
    join Expense_Category_Name category on category.id = expen.category_id
    where expen.status = true 
    AND YEAR(expen.createdate) BETWEEN  ${startingYear} AND ${endingYear}
               GROUP BY 
            expen.id`
    // console.log("query", query);
    connection.query(query, function (error, data) {
        if (error) {
            console.log("error", error);
            response.status(201).json({ message: "Error fetching Data" });
        }
        else {
            if (data.length > 0) {
                console.log("data", data);
                let resArray = [];
                let totalAmount = 0;
                for (let i = 0; i < data.length; i++) {
                    totalAmount += data[i].total_amount;
                    let temp = {
                        id: data[i].id,
                        category_Name: data[i].category_Name,
                        Amount: data[i].purchase_amount
                    }
                    resArray.push(temp);
                }
                // console.log("resArray", resArray.length);
                if (data.length === resArray.length) {
                    response.status(200).json({ totalAmount, resArray });
                }


            }
            else {
                response.status(201).json({ message: "No Data Found" });
            }
        }
    })
}

function getAllfilter(createdBy, response, data, total_amount) {
    let query = `select hos.Name as hostel_name,hos.email_id as hostel_email,hos.Address as hostel_address,hos.hostel_PhoneNo as hostel_phoneNo, expen.id,expen.category_id,expen.vendor_id,expen.asset_id,ven.Vendor_profile,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode,category.category_Name,ven.Vendor_Name,asname.asset_name from expenses expen
    left join Expense_Category_Name category on category.id = expen.category_id
    left join Vendor ven on ven.id = expen.vendor_id
    left join assets ast on ast.id = expen.asset_id
    left join asset_names asname on asname.id=expen.asset_id
left join hosteldetails hos on hos.id = expen.hostel_id
        where expen.status = true and expen.created_by = ${createdBy}`
    connection.query(query, function (getErr, getData) {
        if (getErr) {
            console.log("getErr", getErr);
            response.status(201).json({ message: 'Error while get Data' });
        }
        else {
            if (getData && getData.length > 0) {
                let categorylist = [];
                let vendorList = [];
                let assetList = [];
                let paymentModeList = [];
                // let total_amount = 0;

                for (let i = 0; i < getData.length; i++) {
                    // total_amount += getData[i].purchase_amount;
                    if (!categorylist.some(item => item.category_id === getData[i].category_id)) {
                        categorylist.push({ category_id: getData[i].category_id, category_Name: getData[i].category_Name });
                    }

                    if (!vendorList.some(item => item.vendor_id === getData[i].vendor_id)) {
                        vendorList.push({ vendor_id: getData[i].vendor_id, Vendor_Name: getData[i].Vendor_Name });
                    }

                    if (!assetList.some(item => item.asset_id === getData[i].asset_id)) {
                        assetList.push({ asset_id: getData[i].asset_id, asset_name: getData[i].asset_name });
                    }

                    if (!paymentModeList.some(item => item.payment_mode === getData[i].payment_mode)) {
                        paymentModeList.push({ payment_mode: getData[i].payment_mode });
                    }
                }
                let tempobj = {
                    categorylist: categorylist,
                    vendorList: vendorList,
                    assetList: assetList,
                    paymentModeList: paymentModeList,
                    total_amount: total_amount
                }
                if (Array.isArray(data) && data.length > 0) {
                    tempobj = { ...tempobj, data: data }
                    response.status(200).json(tempobj);
                    // GenerateExpenseHistoryPDF(data, tempobj, response)
                }
                else {
                    tempobj = { ...tempobj, message: data }
                    response.status(200).json(tempobj);
                }
            }
            else {
                response.status(201).json({ message: 'No data found' });
            }
        }
    })
}

function GetHostelExpenses(request, response) {

    var show_ids = request.show_ids;
    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    var createdBy = request.user_details.id;
    var category = request.body?.category ? request.body.category : null;
    var max_amount = request.body?.max_amount ? Number(request.body.max_amount) : null;
    var min_amount = request.body?.min_amount ? Number(request.body.min_amount) : null;
    var asset_id = request.body?.asset_id ? request.body.asset_id : null;
    var payment_mode = request.body?.payment_mode ? request.body.payment_mode : null;
    var vendor_id = request.body?.vendor_id ? request.body.vendor_id : null;
    var start_date = request.body?.start_date ? moment(new Date(request.body.start_date)).format('YYYY-MM-DD') : null;
    var end_date = request.body?.end_date ? moment(new Date(request.body.end_date)).format('YYYY-MM-DD') : null;

    var hostel_id = request.body.hostel_id;

    if (!hostel_id) {
        return response.status(201).json({ statusCode: 201, message: "Missing Hostel Details" })
    }

    // let query = `select expen.id,expen.category_id,expen.vendor_id,expen.asset_id,ven.Vendor_profile,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode,category.category_Name,ven.Vendor_Name,ast.asset_name from expenses expen
    // join Expense_Category_Name category on category.id = expen.category_id
    // join Vendor ven on ven.id = expen.vendor_id
    // join assets ast on ast.id = expen.asset_id
    //     where expen.status = true and expen.created_by = ${createdBy}`

    if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_view === 1)) {

        let query = `SELECT expen.hostel_id,hos.Name as hostel_name,hos.email_id as hostel_email,hos.Address as hostel_address,hos.hostel_PhoneNo as hostel_phoneNo, expen.id, expen.category_id, expen.vendor_id, expen.asset_id, ven.Vendor_profile, expen.purchase_date, expen.unit_count, expen.unit_amount, expen.purchase_amount, expen.status, expen.description, expen.created_by, expen.createdate, expen.payment_mode,expen.bank_id, category.category_Name, ven.Vendor_Name, asname.asset_name,ban.acc_name,ban.acc_num 
                    FROM expenses expen
                    LEFT JOIN Expense_Category_Name category ON category.id = expen.category_id
                    LEFT JOIN Vendor ven ON ven.id = expen.vendor_id
                    LEFT JOIN assets ast ON ast.id = expen.asset_id
                    LEFT JOIN asset_names asname ON asname.id=expen.asset_id
                    LEFT JOIN hosteldetails hos ON hos.id = expen.hostel_id
                    LEFT JOIN bankings ban ON ban.id=expen.bank_id
                    WHERE expen.status = true AND expen.hostel_id=${hostel_id}`;

        if (asset_id) {
            query += ` AND expen.asset_id = ${asset_id}`;
        }

        if (category) {
            query += ` AND expen.category_id = ${category}`;
        }

        if (payment_mode) {
            query += ` AND expen.payment_mode = '${payment_mode}'`;
        }
        if (vendor_id) {
            query += ` AND expen.vendor_id = ${vendor_id}`
        }
        if (min_amount && !max_amount) {
            query += ` AND expen.purchase_amount >= ${min_amount}`
        }
        if (min_amount == 0 && max_amount || min_amount == undefined && max_amount) {
            query += ` AND expen.purchase_amount <= ${max_amount}`
        }
        // if (min_amount && max_amount) {
        //     query += `AND expen.purchase_amount BETWEEN ${min_amount} AND ${max_amount}`
        //     // query += `AND expen.purchase_amount >= ${min_amount} AND expen.purchase_amount <= ${max_amount}`
        // }
        if (min_amount !== undefined && max_amount !== undefined && min_amount !== null && max_amount !== null) {
            query += ` AND expen.purchase_amount >= ${min_amount} AND expen.purchase_amount <= ${max_amount}`;
        }
        if (start_date && !end_date) {
            const startDateRange = `${start_date} 00:00:00`;
            const endDateRange = `${start_date} 23:59:59`;
            // query += ` AND expen.createdate >= '${startDateRange}' AND expen.createdate <= '${endDateRange}'`;
            query += ` AND expen.purchase_date = '${startDateRange}' AND expen.purchase_date <= '${endDateRange}'`;
        }
        if (start_date && end_date) {
            const startDateRange = `${start_date} 00:00:00`;
            const endDateRange = `${end_date} 23:59:59`;
            // query += ` AND expen.createdate >= '${startDateRange}' AND expen.createdate <= '${endDateRange}'`;

            query += ` AND expen.purchase_date >= '${startDateRange}' AND expen.purchase_date <= '${endDateRange}'`;
        }

        query += ` ORDER BY expen.id DESC`;

        connection.query(query, function (err, data) {
            if (err) {
                console.log("err", err);
                response.status(201).json({ message: 'Error Fetching Data' });
            }
            else {
                let total_amount = 0;
                if (data && data.length > 0) {
                    // console.log("data", data);
                    data.map((v) => {
                        return total_amount += v.purchase_amount
                    })
                    // console.log("total_amount", total_amount);
                    basicDetails = getAllfilter(createdBy, response, data, total_amount)
                }
                else {
                    let message = 'No Data Found';
                    basicDetails = getAllfilter(createdBy, response, message, total_amount)
                }
            }
        })

    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function DeleteExpenses(request, response) {
    let req = request.body
    var role_permissions = request.role_permissions;
    var is_admin = request.is_admin;

    if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_delete == 1)) {

        if (req) {
            let query = `UPDATE expenses SET status = false WHERE id=${req.id}`
            connection.query(query, function (err, data) {
                if (err) {
                    response.status(201).json({ message: 'Error while delete the Expenses' });
                }
                else {
                    response.status(200).json({ message: 'Expense deleted successfully' });
                }
            })
        }
        else {
            response.status(201).json({ message: 'Missing Parameter' });
        }
    } else {
        response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

// function DeleteExpensesCategory(request, response) {
//     let reqBodyData = request.body

//     var role_permissions = request.role_permissions;
//     var is_admin = request.is_admin;

//     if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_delete === 1)) {

//         if (reqBodyData.id && reqBodyData.sub_Category_Id == undefined) {
//             connection.query(`select * from Expense_Subcategory_Name where category_id=${reqBodyData.id} and status = true`, function (selectErr, selectData) {
//                 if (selectErr) {
//                     response.status(201).json({ message: 'Error while fetching Data' });
//                 }
//                 else {
//                     let query = `Update Expense_Category_Name SET status = false WHERE id=${reqBodyData.id}`
//                     if (selectData && selectData.length > 0) {
//                         connection.query(query, function (err, data) {
//                             if (err) {
//                                 response.status(201).json({ message: 'Error Deleting category' });
//                             }
//                             else {
//                                 connection.query(`Update Expense_Subcategory_Name SET status = false where category_id = ${reqBodyData.id}`, function (updateErr, updateData) {
//                                     if (updateErr) {
//                                         response.status(201).json({ message: 'Error Deleting Sub category' });
//                                     }
//                                     else {
//                                         response.status(200).json({ message: 'Category Deleted Successfully' });
//                                     }
//                                 })
//                                 // response.status(200).json({ message: 'Category Deleted Successfully' });
//                             }
//                         })
//                     }
//                     else {
//                         connection.query(query, function (deleteErr, deleteData) {
//                             if (deleteErr) {
//                                 response.status(201).json({ message: 'Error While Deleting Category' });
//                             }
//                             else {
//                                 response.status(200).json({ message: 'Category Deleted Successfully' });
//                             }
//                         })

//                     }
//                 }
//             })

//         }
//         else if (reqBodyData && reqBodyData.sub_Category_Id) {
//             connection.query(`Update Expense_Subcategory_Name SET status = false where id = ${reqBodyData.sub_Category_Id} and category_id =${reqBodyData.id}`, function (updateErr, updateData) {
//                 if (updateErr) {
//                     response.status(201).json({ message: 'Error Deleting Sub category' });
//                 }
//                 else {
//                     response.status(200).json({ message: 'Sub Category Deleted Successfully' });
//                 }
//             })
//         }
//         else {
//             response.status(201).json({ message: 'Missing Parameter' });
//         }
//     } else {
//         response.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
//     }
// }

function DeleteExpensesCategory(req, res) {

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    if (is_admin == 1 || (role_permissions[14] && role_permissions[14].per_delete === 1)) {

        var { cat_id, subcat_id } = req.body;

        if (!cat_id) {
            return res.status(201).json({ message: "Missing Category Id", statusCode: 201 });
        }

        if (subcat_id) {

            var sql1 = "SELECT * FROM Expense_Subcategory_Name WHERE category_id=? AND id=? AND status=1";
            connection.query(sql1, [cat_id, subcat_id], function (err, data) {
                if (err) {
                    return res.status(201).json({ message: "Error to Fetch Subcategory Details", statusCode: 201, reason: err.message });
                }

                if (data.length == 0) {
                    return res.status(201).json({ message: "Invalid Subcategory Details", statusCode: 201 });
                }

                var sql2 = "UPDATE Expense_Subcategory_Name SET status=0 WHERE id=?";
                connection.query(sql2, [subcat_id], function (err, data) {
                    if (err) {
                        return res.status(201).json({ message: "Error to Delete Subcategory Details", statusCode: 201, reason: err.message });
                    }

                    return res.status(200).json({ message: "Subcategory Deleted Successfully!", statusCode: 200 });
                })

            })

        } else {

            var sql1 = "SELECT * FROM Expense_Category_Name WHERE id=? AND status=1";
            connection.query(sql1, [cat_id], function (err, data) {
                if (err) {
                    return res.status(201).json({ message: "Error to Fetch Category Details", statusCode: 201, reason: err.message });
                }

                if (data.length == 0) {
                    return res.status(201).json({ message: "Invalid Category Details", statusCode: 201 });
                }

                var sql2 = "UPDATE Expense_Category_Name SET status=0 WHERE id=?";
                connection.query(sql2, [cat_id], function (err, data) {
                    if (err) {
                        return res.status(201).json({ message: "Error to Delete Subcategory Details", statusCode: 201, reason: err.message });
                    }

                    var sql3 = "UPDATE Expense_Subcategory_Name SET status=0 WHERE category_id=?";
                    connection.query(sql3, [cat_id], function (err, up_res) {
                        if (err) {
                            return res.status(201).json({ message: "Error to Delete Category Details", statusCode: 201, reason: err.message });
                        }

                        return res.status(200).json({ message: "Category Deleted Successfully!", statusCode: 200 });
                    })
                })
            })
        }

    } else {
        return res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }
}

function GenerateExpenseHistoryPDF(request, response) {
    const htmlFilePath = path.join(__dirname, 'mail_templates', 'expensesHistory.html');
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');

    let total_amount = 0;


    var createdBy = request.user_details.id;
    var category = request.body?.category ? request.body.category : null;
    var max_amount = request.body?.max_amount ? Number(request.body.max_amount) : null;
    var min_amount = request.body?.min_amount ? Number(request.body.min_amount) : null;
    var asset_id = request.body?.asset_id ? request.body.asset_id : null;
    var payment_mode = request.body?.payment_mode ? request.body.payment_mode : null;
    var vendor_id = request.body?.vendor_id ? request.body.vendor_id : null;
    var start_date = request.body?.start_date ? moment(new Date(request.body.start_date)).format('YYYY-MM-DD') : null;
    var end_date = request.body?.end_date ? moment(new Date(request.body.end_date)).format('YYYY-MM-DD') : null;

    // let query = `select expen.id,expen.category_id,expen.vendor_id,expen.asset_id,ven.Vendor_profile,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode,category.category_Name,ven.Vendor_Name,ast.asset_name from expenses expen
    // join Expense_Category_Name category on category.id = expen.category_id
    // join Vendor ven on ven.id = expen.vendor_id
    // join assets ast on ast.id = expen.asset_id
    //     where expen.status = true and expen.created_by = ${createdBy}`

    let query = `SELECT expen.hostel_id,hos.Name as hostel_name,hos.email_id as hostel_email,hos.Address as hostel_address,hos.hostel_PhoneNo as hostel_phoneNo, expen.id, expen.category_id, expen.vendor_id, expen.asset_id, ven.Vendor_profile, expen.purchase_date, expen.unit_count, expen.unit_amount, expen.purchase_amount, expen.status, expen.description, expen.created_by, expen.createdate, expen.payment_mode, category.category_Name, ven.Vendor_Name, asname.asset_name 
FROM expenses expen
LEFT JOIN Expense_Category_Name category ON category.id = expen.category_id
LEFT JOIN Vendor ven ON ven.id = expen.vendor_id
LEFT JOIN assets ast ON ast.id = expen.asset_id
LEFT JOIN asset_names asname ON asname.id=ast.asset_id
LEFT JOIN hosteldetails hos ON hos.id = expen.hostel_id
WHERE expen.status = true AND expen.created_by = ${createdBy}`;

    if (asset_id) {
        query += ` AND expen.asset_id = ${asset_id}`;
    }

    if (category) {
        query += ` AND expen.category_id = ${category}`;
    }

    if (payment_mode) {
        query += ` AND expen.payment_mode = '${payment_mode}'`;
    }
    if (vendor_id) {
        query += ` AND expen.vendor_id = ${vendor_id}`
    }
    if (min_amount && !max_amount) {
        query += ` AND expen.purchase_amount >= ${min_amount}`
    }
    if (min_amount == 0 && max_amount || min_amount == undefined && max_amount) {
        query += ` AND expen.purchase_amount <= ${max_amount}`
    }
    // if (min_amount && max_amount) {
    //     query += `AND expen.purchase_amount BETWEEN ${min_amount} AND ${max_amount}`
    //     // query += `AND expen.purchase_amount >= ${min_amount} AND expen.purchase_amount <= ${max_amount}`
    // }
    if (min_amount !== undefined && max_amount !== undefined && min_amount !== null && max_amount !== null) {
        query += ` AND expen.purchase_amount >= ${min_amount} AND expen.purchase_amount <= ${max_amount}`;
    }
    if (start_date && !end_date) {
        const startDateRange = `${start_date} 00:00:00`;
        const endDateRange = `${start_date} 23:59:59`;
        query += ` AND expen.createdate >= '${startDateRange}' AND expen.createdate <= '${endDateRange}'`;
        // query += ` AND expen.purchase_date = '${startDateRange}' AND expen.purchase_date <= '${endDateRange}'`;
    }
    if (start_date && end_date) {
        const startDateRange = `${start_date} 00:00:00`;
        const endDateRange = `${end_date} 23:59:59`;
        query += ` AND expen.createdate >= '${startDateRange}' AND expen.createdate <= '${endDateRange}'`;

        // query += ` AND expen.purchase_date >= '${startDateRange}' AND expen.purchase_date <= '${endDateRange}'`;
    }
    // console.log("query", query);
    connection.query(query, function (err, data) {
        if (err) {
            console.log("err", err);
            response.status(201).json({ message: 'Error Fetching Data' });
        }

        if (data && data.length > 0) {
            console.log("data", data);
            data.map((v) => {
                return total_amount += v.purchase_amount
            })
            console.log("total_amount", total_amount);
            let invoiceRows = '';
            for (let i = 0; i < data.length; i++) {
                let purchase_date = moment(data[i].purchase_date).format('DD-MM-YYYY')
                invoiceRows += `
                    <tr>
                        <td>${purchase_date}</td>
                        <td>${data[i].Vendor_Name}</td>
                        <td>${data[i].asset_name}</td>
                        <td>${data[i].unit_amount}</td>
                        <td>${data[i].unit_count}</td>
                        <td></td>
                        <td>${data[i].purchase_amount}</td>
                    </tr>
                `;
            }
            htmlContent = htmlContent
                .replace('{{hostal_name}}', data[0].hostel_name)
                .replace('{{Phone}}', data[0].hostel_phoneNo)
                .replace('{{email}}', data[0].hostel_email)
                .replace('{{city}}', data[0].hostel_address)
                .replace('{{invoice_rows}}', invoiceRows)
                .replace('{{total_amount}}', total_amount)
            const outputPath = path.join(__dirname, 'expenseHistory.pdf');

            // Generate the PDF
            pdf.create(htmlContent, { phantomPath: phantomjs.path }).toFile(outputPath, async (err, res) => {
                if (err) {
                    console.error('Error generating PDF:', err);
                    return;
                }

                // console.log('PDF generated:', res.filename);
                if (res.filename) {
                    console.log("res", res);
                    //upload to s3 bucket

                    let uploadedPDFs = 0;
                    let pdfInfo = [];
                    const fileContent = fs.readFileSync(res.filename);
                    const key = `expense/${res.filename}`;
                    const BucketName = process.env.AWS_BUCKET_NAME;
                    const params = {
                        Bucket: BucketName,
                        Key: key,
                        Body: fileContent,
                        ContentType: 'application/pdf'
                    };

                    s3.upload(params, function (err, uploadData) {
                        if (err) {
                            console.error("Error uploading PDF", err);
                            response.status(201).json({ message: 'Error uploading PDF to S3' });
                        } else {
                            // console.log("PDF uploaded successfully", uploadData.Location);
                            uploadedPDFs++;

                            const pdfInfoItem = {
                                // user: user,
                                url: uploadData.Location
                            };
                            pdfInfo.push(pdfInfoItem);

                            if (pdfInfo.length > 0) {

                                var pdf_url = []
                                pdfInfo.forEach(pdf => {
                                    // console.log(pdf.url);
                                    pdf_url.push(pdf.url)
                                });

                                if (pdf_url.length > 0) {
                                    response.status(200).json({ message: 'Insert PDF successfully', pdf_url: pdf_url[0] });
                                    deletePDfs(res.filename);
                                } else {
                                    response.status(201).json({ message: 'Cannot Insert PDF to Database' });
                                }

                            }
                        }
                    });
                }
            });
        }
        else {
            response.status(201).json({ message: 'No Data Found' });
        }

    })
}


function deletePDfs(filename) {
    if (filename) {
        fs.unlink(filename, function (err) {
            if (err) {
                console.error("delete pdf error", err);
            } else {
                console.log("PDF file deleted successfully");
            }
        });
    }
}

function edit_expense_category(req, res) {

    var { id, name, type, hostel_id } = req.body;

    if (!id || !name || !type || !hostel_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    if (type == 1) {
        // Main Category

        var sql1 = "SELECT * FROM Expense_Category_Name WHERE id=? AND hostel_id=? AND status=1";
        connection.query(sql1, [id, hostel_id], function (err, data) {
            if (err) {
                console.log(err);
                return res.status(201).json({ statusCode: 201, message: err.message })
            } else if (data.length != 0) {

                var sq3 = "SELECT * FROM Expense_Category_Name WHERE status=1 AND hostel_id=? AND LOWER(category_Name) = LOWER(?) AND id !=?";
                connection.query(sq3, [hostel_id, name, id], function (err, ch_res) {
                    if (err) {
                        console.log(err);
                        return res.status(201).json({ statusCode: 201, message: err.message })
                    } else if (ch_res.length == 0) {

                        var sql2 = "UPDATE Expense_Category_Name SET category_Name=? WHERE id=?";
                        connection.query(sql2, [name, id], function (err, up_res) {
                            if (err) {
                                console.log(err);
                                return res.status(201).json({ statusCode: 201, message: err.message })
                            } else {
                                return res.status(200).json({ statusCode: 200, message: "Category Updated Successfully!" })
                            }
                        })
                    } else {
                        return res.status(201).json({ statusCode: 201, message: "Category Name Already Exists" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Category Details" })
            }
        })

    } else {
        // Sub Category

        var sql1 = "SELECT * FROM Expense_Subcategory_Name WHERE id=? AND hostel_id=? AND status=1";
        connection.query(sql1, [id, hostel_id], function (err, data) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: err.message })
            } else if (data.length != 0) {

                var sq3 = "SELECT * FROM Expense_Subcategory_Name WHERE status=1 AND hostel_id=? AND LOWER(subcategory) = LOWER(?) AND id !=?";
                connection.query(sq3, [hostel_id, name, id], function (err, ch_res) {
                    if (err) {
                        return res.status(201).json({ statusCode: 201, message: err.message })
                    } else if (ch_res.length == 0) {

                        var sql2 = "UPDATE Expense_Subcategory_Name SET subcategory=? WHERE id=?";
                        connection.query(sql2, [name, id], function (err, up_res) {
                            if (err) {
                                return res.status(201).json({ statusCode: 201, message: err.message })
                            } else {
                                return res.status(200).json({ statusCode: 200, message: "Successfully Update Sub Category!" })
                            }
                        })
                    } else {
                        return res.status(201).json({ statusCode: 201, message: "Sub Category Name Already Exists" })
                    }
                })
            } else {
                return res.status(201).json({ statusCode: 201, message: "Invalid Category Details" })
            }
        })

    }

}

module.exports = { AddExpense, AddExpenseCategory, GetExpensesCategory, CalculateExpenses, GetHostelExpenses, DeleteExpenses, DeleteExpensesCategory, GenerateExpenseHistoryPDF, edit_expense_category };