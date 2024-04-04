const AWS = require('aws-sdk');
require('dotenv').config();


const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();



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



function uploadProfilePictureToS3(bucketName, folderName, fileName, fileData, callback) {
    const s3 = new AWS.S3();

    const params = {
        Bucket: bucketName,
        Key: folderName + fileName,
        Body: fileData.buffer,
        ACL: 'public-read'
    };

    s3.upload(params, (err, data) => {
        if (err) {
            console.error('Error uploading file to S3:', err);
            callback(err);
        } else {
            console.log('File uploaded successfully:', data.Location);
            callback(null, data.Location);
        }
    });
}
function InvoiceSettings(connection, reqInvoice, response) {
    console.log("reqInvoice", reqInvoice)
    if (reqInvoice) {

        uploadProfilePictureToS3('smartstaydevs', 'Logo/', 'Logo' + reqInvoice.hostel_Id + '.jpg', reqInvoice.profile, (err, s3Url) => {
            console.log("s3URL", s3Url)
            if (err) {
                console.error('Error uploading profile picture:', err);
                response.status(500).json({ message: 'Error uploading profile picture' });
            }
            else {
                const query = `UPDATE hosteldetails SET prefix='${reqInvoice.prefix}' , suffix ='${reqInvoice.suffix}' ,Profile= '${s3Url}' WHERE id='${reqInvoice.hostel_Id}'`
                connection.query(query, function (error, invoiceData) {
                    console.log("invoiceData", invoiceData)
                    console.log("error invoice", error)
                    if (error) {
                        response.status(202).json({ message: 'Database error' });
                    } else {
                        response.status(200).json({ message: 'Updated successfully', statusCode: 200 });
                    }
                })
            }
        });

    }
    else {
        response.status(201).json({ message: 'missing parameter' });
    }
}


function AmenitiesSetting(connection, reqData, response) {
    console.log("reqData", reqData);
    if (reqData) {
        connection.query(`INSERT INTO Amenities(AmenitiesName,Amount,setAsDefault,Hostel_Id,Status) VALUES (\'${reqData.AmenitiesName}\',\'${reqData.Amount}\', ${reqData.setAsDefault},\'${reqData.Hostel_Id}\',${reqData.Status})`, function (error, data) {

            if (error) {
                response.status(202).json({ message: 'Database error' });
            }
            else {
                response.status(200).json({ message: 'Inserted successfully', statusCode: 200 });
            }

        })
    } else {
        response.status(201).json({ message: 'missing parameter' });
    }



}



function UpdateEB(connection, atten, response) {
      if (atten) {
        connection.query(`UPDATE hosteldetails SET isHostelBased= ${atten.Ishostelbased} WHERE id='${atten.Id}'`, function (error, data) {
            if (error) {
                response.status(201).json({ message: "doesn't update" });
            } else {
                response.status(200).json({ message: "Update Successfully" });
            }
        });
    } 
   
};


function AmeniesSetting(connection, reqData, response) { 
    console.log("reqData", reqData);
    if(reqData){
        connection.query(`INSERT INTO Amenities(AmenitiesName,Amount,setAsDefault,Hostel_Id,Status) VALUES (\'${reqData.AmenitiesName}\',\'${reqData.Amount}\', ${reqData.setAsDefault},\'${reqData.Hostel_Id}\',${reqData.Status})`, function (error, data) {
           
            if (error) {
                response.status(202).json({ message: 'Database error' });
            }
             else {
                response.status(200).json({ message: 'Inserted successfully', statusCode: 200 });
            }
            
        })
      
    }else{
        response.status(201).json({ message: 'Missing parameter' });
    }
        
      
    }

module.exports = { IsEnableCheck, getAccount, InvoiceSettings, AmenitiesSetting ,UpdateEB,AmeniesSetting};