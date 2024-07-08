const moment = require('moment');

function AddExpense(connection, request, response) {
    let reqData = request.body;
    var createdBy = request.user_details.id;
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
  purchase_date = '${reqData.purchase_date}',
  unit_count = ${reqData.unit_count},
  unit_amount = ${reqData.unit_amount},
  purchase_amount = ${purchase_amount},
  description = '${reqData.description}',
  created_by = ${createdBy},
  createdate = '${createdate}'
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
  (${reqData.vendor_id}, ${reqData.asset_id}, ${reqData.category_id}, ${reqData.purchase_date}, ${reqData.unit_count}, ${reqData.unit_amount},${purchase_amount}, '${reqData.description}', ${createdBy}, '${createdate}','${reqData.payment_mode}');
`
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

function AddExpenseCategory(connection, request, response) {
    let reqData = request.body
    let category = reqData.category_Name.replace(" ", "")
    if (reqData) {
        connection.query(`select * from Expense_Category_Name where REPLACE(UPPER(category_Name), ' ', '') = UPPER('${category}')`, function (error, data) {
            if (error) {
                console.log("error", error);
                response.status(201).json({ message: "Error Fetching Data" });
            }
            else if (data.length > 0) {
                response.status(201).json({ message: "Data Already Exist" });
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

function GetExpensesCategory(connection, request, response) {
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

function CalculateExpenses(connection, request, response) {
    let reqData = request.body
    let startingYear = new Date(reqData.startingDate).getFullYear();
    console.log("startingYear", startingYear);
    let endingYear = reqData.endingDate ? new Date(reqData.endingDate).getFullYear() : new Date(reqData.startingDate).getFullYear();
    console.log("endingYear", endingYear);
    let query = `select expen.id,expen.vendor_id,expen.asset_id,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode, sum(expen.purchase_amount) as total_amount, category.category_Name from expenses expen
    join Expense_Category_Name category on category.id = expen.category_id
    where expen.status = true and (
            (YEAR(expen.createdate) = ${startingYear} )
            OR
            (YEAR(expen.createdate) = ${endingYear} )
        )
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

function GetHostelExpenses(connection, request, response) {
    let startingYear = new Date().getFullYear();
    var createdBy = request.user_details.id;
    // and expen.created_by = ${createdBy} 
    //and category.status = true 
    console.log("startingYear", startingYear);
    let endingYear = new Date().getFullYear();
    console.log("endingYear", endingYear);
    let query = `select expen.id,expen.vendor_id,expen.asset_id,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode,category.category_Name,ven.Vendor_Name,ast.asset_name from expenses expen
    join Expense_Category_Name category on category.id = expen.category_id
    join Vendor ven on ven.id = expen.vendor_id
    join assets ast on ast.id = expen.asset_id
        where expen.status = true and expen.created_by = ${createdBy} and (
            (YEAR(expen.createdate) = ${startingYear})
            OR
            (YEAR(expen.createdate) = ${endingYear} )
        ) `
    connection.query(query, function (err, data) {
        if (err) {
            console.log("err", err);
            response.status(201).json({ message: 'Error Fetching Data' });
        }
        else {
            if (data.length > 0) {
                response.status(200).json({ data: data });
            }
            else {
                response.status(201).json({ message: 'No Data Found' });
            }
        }
    })
}

function DeleteExpenses(connection, request, response) {
    let req = request.body
    if (req) {
        let query = `UPDATE expenses SET status=0 WHERE id=${req.id}`
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

function DeleteExpensesCategory(connection, request, response) {
    let reqBodyData = request.body
    if (reqBodyData) {
        let query = `Update Expense_Category_Name SET status = 0 WHERE id=${reqBodyData.id}`
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