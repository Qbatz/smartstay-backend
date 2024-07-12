const moment = require('moment');
const connection = require('./config/connection')

function AddExpense(request, response) {
    let reqData = request.body;
    var createdBy = request.user_details.id;
    let purchase_date = moment(new Date(reqData.purchase_date)).format('yyyy-MM-DD')
    console.log("purchase_date", purchase_date);
    let purchase_amount = Number(reqData.unit_count) * Number(reqData.unit_amount)
    console.log("purchase_amount", purchase_amount);
    let createdate = moment(new Date()).format('yyyy-MM-DD HH:mm:ss')
    console.log("createdate", createdate);
    if (reqData) {
        if (reqData.id != null && reqData.id != undefined) {
            let query = `UPDATE expenses SET
  vendor_id = ${reqData.vendor_id},
  asset_id = ${reqData.asset_id},
  category_id = ${reqData.category_id},
  purchase_date = '${purchase_date}',
  unit_count = ${reqData.unit_count},
  unit_amount = ${reqData.unit_amount},
  purchase_amount = ${purchase_amount},
  description = '${reqData.description}',
  created_by = ${createdBy},
  createdate = '${createdate}',
  payment_mode = '${reqData.payment_mode}'
   WHERE id = ${reqData.id};`
            connection.query(query, function (updateErr, updateData) {
                if (updateErr) {
                    response.status(201).json({ message: "Internal Server Error" });
                }
                else {
                    response.status(200).json({ message: "Data Updated successfully" });
                }
            })
        }
        else {
            let createdate = moment(new Date()).format('yyyy-MM-DD HH:mm:ss')
            console.log("createdate", createdate);
            let query = `INSERT INTO expenses ( vendor_id, asset_id, category_id, purchase_date, unit_count, unit_amount, purchase_amount, description, created_by,createdate,payment_mode)
VALUES
  (${reqData.vendor_id}, ${reqData.asset_id}, ${reqData.category_id}, '${purchase_date}', ${reqData.unit_count}, ${reqData.unit_amount},${purchase_amount}, '${reqData.description}', ${createdBy}, '${createdate}','${reqData.payment_mode}');
`
            console.log("query", query);
            connection.query(query, function (insertErr, insertData) {
                if (insertErr) {
                    console.log("insertErr", insertErr);
                    response.status(201).json({ message: "Internal Server Error" });
                }
                else {
                    response.status(200).json({ message: "Data Saved successfully" });
                }
            })
        }

    }
    else {
        response.status(201).json({ message: "Missing Parameter" });
    }
}

function AddExpenseCategory(request, response) {
    let reqData = request.body
    let category = reqData.category_Name.replace(" ", "")
    if (reqData) {
        connection.query(`select * from Expense_Category_Name where REPLACE(UPPER(category_Name), ' ', '') = UPPER('${category}') and status = true`, function (error, data) {
            if (error) {
                console.log("error", error);
                response.status(201).json({ message: "Error Fetching Data" });
            }
            else if (data.length > 0) {
                if (reqData.sub_Category) {
                    connection.query(`update Expense_Category_Name set sub_Category ='${reqData.sub_Category}' where id=${reqData.id}`, function (updateErr, updateData) {
                        if (updateErr) {
                            console.log("updateErr", updateErr);
                            response.status(201).json({ message: "Error while Add sub category" });
                        }
                        else {
                            response.status(200).json({ message: "Sub Category Added successfully" });
                        }
                    })
                }
                else {
                    response.status(201).json({ message: "Missing Parameter" });
                }



            }
            else {
                connection.query(`insert into Expense_Category_Name(category_Name,sub_Category) values('${reqData.category_Name}','${reqData.sub_Category}');`, function (insertErr, insertData) {
                    if (insertErr) {
                        console.log("insertErr", insertErr);
                        response.status(201).json({ message: "Does not Save" });
                    }
                    else {
                        response.status(200).json({ message: "Data saved successfully" });
                    }
                })
            }
        })
    }
    else {
        response.status(201).json({ message: "Missing Parameter" });
    }


}

function GetExpensesCategory(request, response) {
    connection.query(`select * from Expense_Category_Name where status = true`, function (error, data) {
        if (error) {
            response.status(201).json({ message: "Error fetching Data" });
        }
        else if (data.length > 0) {
            response.status(200).json({ data: data });
        }
        else {
            response.status(201).json({ message: "No Data Found" });
        }
    })
}

function CalculateExpenses(request, response) {
    let reqData = request.body
    let startingYear = new Date(reqData.startingDate).getFullYear();
    console.log("startingYear", startingYear);
    let endingYear = reqData.endingDate ? new Date(reqData.endingDate).getFullYear() : new Date(reqData.startingDate).getFullYear();
    console.log("endingYear", endingYear);
    let query = `select expen.id,expen.category_id,expen.vendor_id,expen.asset_id,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode, sum(expen.purchase_amount) as total_amount, category.category_Name from expenses expen
    join Expense_Category_Name category on category.id = expen.category_id
    where expen.status = true 
    AND YEAR(expen.createdate) BETWEEN  ${startingYear} AND ${endingYear}
               GROUP BY 
            expen.id`
    console.log("query", query);
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
                console.log("resArray", resArray.length);
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

function getAllfilter(createdBy, response, data) {
    let query = `select expen.id,expen.category_id,expen.vendor_id,expen.asset_id,ven.Vendor_profile,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode,category.category_Name,ven.Vendor_Name,ast.asset_name from expenses expen
    join Expense_Category_Name category on category.id = expen.category_id
    join Vendor ven on ven.id = expen.vendor_id
    join assets ast on ast.id = expen.asset_id
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
                let total_amount = 0;

                for (let i = 0; i < getData.length; i++) {
                    total_amount += getData[i].purchase_amount;
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
                    total_amount: total_amount,
                    data: data
                }
                if (typeof (data) == Array && data.length > 0) {
                    response.status(200).json(tempobj);
                }
                else {
                    tempobj = { ...tempobj, message: data, data: [] }
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
    var createdBy = request.user_details.id;
    var category = request.body?.category ? request.body.category : null;
    var max_amount = request.body?.max_amount ? request.body.max_amount : null;
    var min_amount = request.body?.min_amount ? request.body.min_amount : null;
    var asset_id = request.body?.asset_id ? request.body.asset_id : null;
    var payment_mode = request.body?.payment_mode ? request.body.payment_mode : null;
    var vendor_id = request.body?.vendor_id ? request.body.vendor_id : null;
    var start_date = request.body?.start_date ? moment(new Date(request.body.start_date)).format('YYYY-MM-DD') : null;
    var end_date = request.body?.end_date ? moment(new Date(request.body.end_date)).format('YYYY-MM-DD') : null;

    let query = `select expen.id,expen.category_id,expen.vendor_id,expen.asset_id,ven.Vendor_profile,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode,category.category_Name,ven.Vendor_Name,ast.asset_name from expenses expen
    join Expense_Category_Name category on category.id = expen.category_id
    join Vendor ven on ven.id = expen.vendor_id
    join assets ast on ast.id = expen.asset_id
        where expen.status = true and expen.created_by = ${createdBy}`

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
    if (min_amount && max_amount) {
        query += `AND expen.purchase_amount >= ${min_amount} AND expen.purchase_amount <= ${max_amount}`
    }
    if (start_date && !end_date) {
        const startDateRange = `${start_date} 00:00:00`;
        const endDateRange = `${start_date} 23:59:59`;
        query += ` AND expen.createdate >= '${startDateRange}' AND expen.createdate <= '${endDateRange}'`;
    }
    if (start_date && end_date) {
        const startDateRange = `${start_date} 00:00:00`;
        const endDateRange = `${end_date} 23:59:59`;
        query += ` AND expen.createdate >= '${startDateRange}' AND expen.createdate <= '${endDateRange}'`;
    }
    connection.query(query, function (err, data) {
        if (err) {
            console.log("err", err);
            response.status(201).json({ message: 'Error Fetching Data' });
        }
        else {
            if (data && data.length > 0) {
                basicDetails = getAllfilter(createdBy, response, data)
            }
            else {
                let message = 'No Data Found';
                basicDetails = getAllfilter(createdBy, response, message)
            }
        }
    })

}

function DeleteExpenses(request, response) {
    let req = request.body
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
}

function DeleteExpensesCategory(request, response) {
    let reqBodyData = request.body
    if (reqBodyData) {
        let query = `Update Expense_Category_Name SET status = false WHERE id=${reqBodyData.id}`
        connection.query(query, function (err, data) {
            if (err) {
                response.status(201).json({ message: 'Error Deleting category' });
            }
            else {
                response.status(200).json({ message: 'Category Deleted Successfully' });
            }
        })
    }
    else {
        response.status(201).json({ message: 'Missing Parameter' });
    }
}

module.exports = { AddExpense, AddExpenseCategory, GetExpensesCategory, CalculateExpenses, GetHostelExpenses, DeleteExpenses, DeleteExpensesCategory };