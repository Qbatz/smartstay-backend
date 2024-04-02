function IsEnableCheck(connection, reqBodyData, response) {
    if (reqBodyData.emailId && reqBodyData.isEnable !== undefined) {
        let isEnable = reqBodyData.isEnable ? 1 : 0;
        connection.query(`SELECT * FROM createaccount WHERE email_Id='${reqBodyData.emailId}'`, function (error, data) {
            if (error) {
                console.log("error", error);
                response.status(202).json({ message: 'Database error' });
            } else {
                if (data.length === 0) {
                    response.status(201).json({ message: 'Record not found' });
                } else {
                    connection.query(`UPDATE createaccount SET isEnable=${isEnable} WHERE email_Id='${reqBodyData.emailId}'`, function (error, result) {
                        if (error) {
                            console.log("error", error);
                            response.status(202).json({ message: 'Database error' });
                        } else {
                            response.status(200).json({ message: 'Updated successfully', statusCode: 200 });
                        }
                    });
                }
            }
        });
    } else {
        response.status(201).json({ message: 'Bad request: Missing Parameter or Invalid isEnable value' });
    }
}

function getAccount(connection, response) {
    connection.query('select * from createaccount', function (error, data) {
        console.log(error);
        console.log(data);

        if (error) {
            response.status(403).json({ message: 'not connected' })
        }
        else {
            response.status(200).json(data)
        }
    })
}
function InvoiceSettings(connection, reqInvoice, response) {
    console.log("reqInvoice",reqInvoice)
    if (reqInvoice) {
        const query = `UPDATE hosteldetails SET prefix='${reqInvoice.prefix}' and startingNumber ='${reqInvoice.startNumber}'  WHERE id='${reqInvoice.hostel_Id}'`
        connection.query(query, function (error, invoiceData) {
            console.log("invoiceData",invoiceData)
            console.log("error invoice",error)
            if (error) {
                response.status(202).json({ message: 'Database error' });
            } else {
                response.status(200).json({ message: 'Updated successfully', statusCode: 200 });
            }
        })
    }
    else {
        response.status(201).json({ message: 'missing parameter' });
    }
}

module.exports = { IsEnableCheck, getAccount,InvoiceSettings };