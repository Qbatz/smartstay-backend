const moment = require('moment');

function AddExpense(connection, request, response) {
    let reqData = request.body
    let createdate = moment(new Date()).format('yyyy-MM-DD HH:mm:ss')
    console.log("createdate", createdate);
    if (reqData) {
        if (reqData.id) {
            let query = `UPDATE expenses SET
  vendor_id = ${reqData.vendor_id},
  asset_id = ${reqData.asset_id},
  category_id = ${reqData.category_id},
  purchase_date = '${reqData.purchase_date}',
  unit_count = ${reqData.unit_count},
  unit_amount = ${reqData.unit_amount},
  purchase_amount = ${reqData.purchase_amount},
  description = '${reqData.description}',
  created_by = ${reqData.created_by},
  createdate = '${createdate}' WHERE id = ${reqData.id};`
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
            let query = `INSERT INTO expenses ( vendor_id, asset_id, category_id, purchase_date, unit_count, unit_amount, purchase_amount, description, created_by,createdate)
VALUES
  (${reqData.vendor_id}, ${reqData.asset_id}, ${reqData.category_id}, ${reqData.purchase_date}, ${reqData.unit_count}, ${reqData.unit_amount},${reqData.purchase_amount}, '${reqData.description}', ${reqData.created_by}, '${createdate}');
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
                connection.query(`insert into Expense_Category_Name(category_Name) values('${reqData.category_Name}');`, function (insertErr, insertData) {
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
    connection.query(`select * from Expense_Category_Name`, function (error, data) {
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


// function AddSalaryDetails(connection,request,response) {
//     let reqData = request.body  
//     if (reqData) {
//         if (reqData.id) {
//            let query=`` 
//         }
//         else{

//         }
//     }
//     else{
//         response.status(201).json({ message: "Missing Parameter" });
//     }

// }




function CalculateExpenses(connection, request, response) {
    let reqData = request.body
    let startingYear = new Date(reqData.startingDate).getFullYear();
    console.log("startingYear", startingYear);
    let endingYear = reqData.endingDate ? new Date(reqData.endingDate).getFullYear() : new Date(reqData.startingDate).getFullYear();
    console.log("endingYear", endingYear);
    let query = `select * , sum(expen.purchase_amount) as total_amount, category.category_Name from expenses expen
    join Expense_Category_Name category on category.id = expen.category_id
    where  (
            (YEAR(expen.createdate) = ${startingYear} )
            OR
            (YEAR(expen.createdate) = ${endingYear} )
        )
            GROUP BY 
            category.id, category.category_Name`
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
                    console.log("resArray...loop", resArray);
                }
                console.log("resArray", resArray);
                //  resobj = {...resobj,resArray}
                //  console.log("resobj",resobj);

                response.status(200).json({ totalAmount, resArray });
            }
            else {
                response.status(201).json({ message: "No Data Found" });
            }
        }
    })
}


module.exports = { AddExpense, AddExpenseCategory, GetExpensesCategory, CalculateExpenses };