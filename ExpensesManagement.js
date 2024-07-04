function AddExpense(connection, request, response) {
    let reqData = request.body
    if (reqData) {
        connection.query(`insert into Hostel_Expense(hostel_Id,category_id,amount) values(${reqData.hostel_ID},${reqData.category},${reqData.amount})`, function (insertErr, insertData) {
            if (insertErr) {
                response.status(201).json({ message: "Internal Server Error" });
            }
            else {
                response.status(200).json({ message: "Data Saved successfully" });
            }
        })
    }
    else {
        response.status(201).json({ message: "Missing Parameter" });
    }
}

function AddExpenseCategory(connection, request, response) {
    let reqData = request.body
    let category = reqData.category_Name.toUpperCase()
    if (reqData) {
        connection.query(`select * from Expense_Category_Name where category_Name = '${reqData.category_Name}'`, function (error, data) {
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
    let query = `select * , sum(amount) as total_amount from Hostel_Expense where hostel_Id = 1 AND (
            (YEAR(created_At) = 2024 )
            OR
            (YEAR(created_At) = 2024 )
        )`

    connection.query(query, function (error, data) {
        if (error) {
            console.log("error", error);
            response.status(201).json({ message: "Error fetching Data" });
        }
        else {
            if (data.length > 0) {
                console.log("data", data);
                for (let i = 0; i < data.length; i++) {

                }

                response.status(200).json({ data: data });
            }
            else {
                response.status(201).json({ message: "No Data Found" });
            }
        }
    })
}


module.exports = { AddExpense, AddExpenseCategory, GetExpensesCategory, CalculateExpenses };