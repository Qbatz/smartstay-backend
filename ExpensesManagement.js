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

    let reqData = request.body;
    var created_by = request.user_details.id;

    if (!reqData.category_Name) {
        return response.status(201).json({ statusCode: 201, message: "Missing Category Name" })
    }
    if (reqData) {
        var sql1 = "SELECT * FROM Expense_Category_Name WHERE category_Name COLLATE latin1_general_ci = '" + reqData.category_Name + "' AND status=1 AND created_by ='" + created_by + "'";
        connection.query(sql1, function (error, data) {
            if (error) {
                console.log("error", error);
                response.status(201).json({ statusCode: 201, message: "Error Fetching Data" });
            }
            else if (data.length > 0) {

                if (!reqData.id) {
                    return response.status(201).json({ statusCode: 201, message: "Category Name Already Exist" });
                }
                if (reqData.sub_Category) {

                    var sql3 = "SELECT * FROM Expense_Subcategory_Name WHERE subcategory COLLATE latin1_general_ci = '" + reqData.sub_Category + "' AND status=1 AND created_by ='" + created_by + "'";
                    connection.query(sql3, function (err, sql3_res) {
                        if (err) {
                            return response.status(201).json({ statusCode: 201, message: "Unble to Get Subcategory Details" });
                        } else if (sql3_res.length > 0) {
                            return response.status(201).json({ statusCode: 201, message: "Sub Category Name Already Exist" });
                        } else {
                            // Add Subcategory
                            var sql4 = "INSERT INTO Expense_Subcategory_Name (cat_id,subcategory,status,created_by) VALUES ('" + reqData.id + "','" + reqData.sub_Category + "',1,'" + created_by + "')";
                            connection.query(sql4, function (ins_err, ins_res) {
                                if (ins_err) {
                                    console.log(ins_err);
                                    return response.status(201).json({ statusCode: 201, message: "Unble to Add Subcategory Details" });
                                } else {
                                    response.status(200).json({ statusCode: 200, message: "Successfully Added Sub Category" });
                                }
                            })
                        }
                    })

                } else {
                    return response.status(201).json({ statusCode: 201, message: "Missing Subcategory Name" });
                }
            } else {
                var sql2 = `INSERT INTO Expense_Category_Name(category_Name,created_by) VALUES('${reqData.category_Name}','${created_by}');`;
                connection.query(sql2, function (insertErr, insertData) {
                    if (insertErr) {
                        response.status(201).json({ statusCode: 201, message: "Does not Save" });
                    } else {
                        response.status(200).json({ statusCode: 200, message: "New Category Added successfully" });
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
    connection.query(`SELECT category.category_Name,category.id as category_Id,category.status,subcategory.id as subcategory_Id,subcategory.subcategory FROM Expense_Category_Name category
JOIN Expense_Subcategory_Name subcategory on subcategory.category_id = category.id
WHERE category.status = true and subcategory.status`, function (error, data) {
        // connection.query(`select * from Expense_Category_Name where status = true`, function (error, data) {
        if (error) {
            console.log("error",error)
            response.status(201).json({ message: "Error fetching Data" });
        }
        else if (data && data.length > 0) {
            console.log("data",data)
            response.status(200).json({ data: data });
        }
        else {
            console.log("data",data)
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

function getAllfilter(createdBy, response, data, total_amount) {
    let query = `select expen.id,expen.category_id,expen.vendor_id,expen.asset_id,ven.Vendor_profile,expen.purchase_date,expen.unit_count,expen.unit_amount,expen.purchase_amount,expen.status,expen.description,expen.created_by,expen.createdate,expen.payment_mode,category.category_Name,ven.Vendor_Name,asname.asset_name from expenses expen
    join Expense_Category_Name category on category.id = expen.category_id
    join Vendor ven on ven.id = expen.vendor_id
    join assets ast on ast.id = expen.asset_id
    join asset_names asname on asname.id=ast.asset_id
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

    let query = `SELECT expen.id, expen.category_id, expen.vendor_id, expen.asset_id, ven.Vendor_profile, expen.purchase_date, expen.unit_count, expen.unit_amount, expen.purchase_amount, expen.status, expen.description, expen.created_by, expen.createdate, expen.payment_mode, category.category_Name, ven.Vendor_Name, asname.asset_name 
FROM expenses expen
JOIN Expense_Category_Name category ON category.id = expen.category_id
JOIN Vendor ven ON ven.id = expen.vendor_id
JOIN assets ast ON ast.id = expen.asset_id
JOIN asset_names asname ON asname.id=ast.asset_id
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
    console.log("query", query);
    connection.query(query, function (err, data) {
        if (err) {
            console.log("err", err);
            response.status(201).json({ message: 'Error Fetching Data' });
        }
        else {
            let total_amount = 0;
            if (data && data.length > 0) {
                console.log("data", data);
                data.map((v) => {
                    return total_amount += v.purchase_amount
                })
                console.log("total_amount", total_amount);
                basicDetails = getAllfilter(createdBy, response, data, total_amount)
            }
            else {
                let message = 'No Data Found';
                basicDetails = getAllfilter(createdBy, response, message, total_amount)
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
    if (reqBodyData.id && reqBodyData.sub_Category_Id == undefined) {
        connection.query(`select * from Expense_Subcategory_Name where category_id=${reqBodyData.id} and status = true`,function(selectErr,selectData){
            if (selectErr) {
                response.status(201).json({ message: 'Error while fetching Data' });
            }
            else{
                 let query = `Update Expense_Category_Name SET status = false WHERE id=${reqBodyData.id}`
                if (selectData && selectData.length > 0) {                   
                    connection.query(query, function (err, data) {
                        if (err) {
                            response.status(201).json({ message: 'Error Deleting category' });
                        }
                        else {
                            connection.query(`Update Expense_Subcategory_Name SET status = false where category_id = ${reqBodyData.id}`,function(updateErr,updateData){
                                if (updateErr) {
                                    response.status(201).json({ message: 'Error Deleting Sub category' });
                                }
                                else{
                                    response.status(200).json({ message: 'Category Deleted Successfully' });
                                }
                            })
                            // response.status(200).json({ message: 'Category Deleted Successfully' });
                        }
                    })  
                }
                else{
                    connection.query(query,function(deleteErr,deleteData){
                        if (deleteErr) {
                            response.status(201).json({ message: 'Error While Deleting Category' });
                        }
                        else{
                            response.status(200).json({ message: 'Category Dleted Successfully' });
                        }
                    })
                   
                }
            }
        })
        
    }
    else if(reqBodyData && reqBodyData.sub_Category_Id){
        connection.query(`Update Expense_Subcategory_Name SET status = false where id = ${reqBodyData.sub_Category_Id}`,function(updateErr,updateData){
            if (updateErr) {
                response.status(201).json({ message: 'Error Deleting Sub category' });
            }
            else{
                response.status(200).json({ message: 'Sub Category Deleted Successfully' });
            }
        })
    }
    else {
        response.status(201).json({ message: 'Missing Parameter' });
    }
}

function GenerateExpenseHistoryPDF(request,response){
    const htmlFilePath = path.join(__dirname, 'mail_templates', 'expensesHistory.html');
    let htmlContent = fs.readFileSync(htmlFilePath, 'utf8');
    var createdBy = request.user_details.id;
    var category = request.body?.category ? request.body.category : null;
    var max_amount = request.body?.max_amount ? Number(request.body.max_amount) : null;
    var min_amount = request.body?.min_amount ? Number(request.body.min_amount) : null;
    var asset_id = request.body?.asset_id ? request.body.asset_id : null;
    var payment_mode = request.body?.payment_mode ? request.body.payment_mode : null;
    var vendor_id = request.body?.vendor_id ? request.body.vendor_id : null;
    var start_date = request.body?.start_date ? moment(new Date(request.body.start_date)).format('YYYY-MM-DD') : null;
    var end_date = request.body?.end_date ? moment(new Date(request.body.end_date)).format('YYYY-MM-DD') : null;

    let query = `SELECT expen.id, expen.category_id, expen.vendor_id, expen.asset_id, ven.Vendor_profile, expen.purchase_date, expen.unit_count, expen.unit_amount, expen.purchase_amount, expen.status, expen.description, expen.created_by, expen.createdate, expen.payment_mode, category.category_Name, ven.Vendor_Name, asname.asset_name 
FROM expenses expen
JOIN Expense_Category_Name category ON category.id = expen.category_id
JOIN Vendor ven ON ven.id = expen.vendor_id
JOIN assets ast ON ast.id = expen.asset_id
JOIN asset_names asname ON asname.id=ast.asset_id
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
    console.log("query", query);
    connection.query(query, function (err, data) {
        if (err) {
            console.log("err", err);
            response.status(201).json({ message: 'Error Fetching Data' });
        }
        else {
            let total_amount = 0;
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
{/* <td>category_Name : ${data[i].category_Name}<br/>purchase_amount : ${data[i].purchase_amount}</td>
                    <td> asset_name : ${data[i].asset_name} <br/> unit_count : ${data[i].unit_count} <br/> unit_amount : ${data[i].unit_amount}</td> */}
               
htmlContent = htmlContent
        // .replace('{{hostal_name}}', hostelDetails.hostelName)
        // .replace('{{Phone}}', hostelDetails.hostelPhoneNo)
        // .replace('{{email}}', hostelDetails.hostelEmailID)
        // .replace('{{user_address}}', hostelDetails.userAddress)
        // .replace('{{user_name}}', hostelDetails.userName)
        // .replace('{{city}}', hostelDetails.hostelAddress)
        .replace('{{invoice_rows}}', invoiceRows)
        .replace('{{total_amount}}', total_amount)
        const outputPath = path.join(__dirname, 'expenseHistory.pdf');

    // Generate the PDF
    pdf.create(htmlContent, { phantomPath: phantomjs.path }).toFile(outputPath, async (err, res) => {
        if (err) {
            console.error('Error generating PDF:', err);
            return;
        }

        console.log('PDF generated:', res.filename);
        if (res.filename) {
            console.log("res", res);
//upload to s3 bucket

            
            let uploadedPDFs = 0;
            let pdfInfo = [];
            const fileContent = fs.readFileSync(res.filename);
                const key = `expense/${res.filename}`;
                const BucketName = 'smartstaydevs';
                const params = {
                    Bucket: BucketName,
                    Key: key,
                    Body: fileContent,
                    ContentType: 'application/pdf'
                };
        
                s3.upload(params, function (err, uploadData) {
                    if (err) {
                        console.error("Error uploading PDF", err);
                        response.status(500).json({ message: 'Error uploading PDF to S3' });
                    } else {
                        console.log("PDF uploaded successfully", uploadData.Location);
                        uploadedPDFs++;
        
                        const pdfInfoItem = {
                            // user: user,
                            url: uploadData.Location
                        };
                        pdfInfo.push(pdfInfoItem);
        
                        if (pdfInfo.length > 0) {
        
                            var pdf_url = []
                            pdfInfo.forEach(pdf => {
                                console.log(pdf.url);
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

///////-------------------------

            // response.status(200).json({ message: "Expenses History", filepath: res.filename, expenseDetails: data });
        }
        // var inv_id = inv_data.id;

        // Upload the PDF to S3
        // await uploadToS3(outputPath, 'amenity.pdf', inv_id);

        // Remove the local PDF file after upload
        // fs.unlinkSync(res.filename);

    });

                // response.status(200).json({ data:data, total_amount:total_amount})
                // basicDetails = getAllfilter(createdBy, response, data, total_amount)
            }
            else {
                response.status(201).json({ message: 'No Data Found' });
            }
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

module.exports = { AddExpense, AddExpenseCategory, GetExpensesCategory, CalculateExpenses, GetHostelExpenses, DeleteExpenses, DeleteExpensesCategory ,GenerateExpenseHistoryPDF};