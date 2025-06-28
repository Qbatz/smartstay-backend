const fs = require('fs');
const https = require('https');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const converter = require('number-to-words');
const path = require('path');
const AWS = require('aws-sdk');
const paymentReceipt = require('../InvoicePdfDesign/paymentReceipt');
const paymentFinalsettlement = require('../InvoicePdfDesign/paymentFinalsettlement');
const paymentSecurityDeposit = require('../InvoicePdfDesign/paymentSecurityDeposit');


const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();

const downloadImage = (imageUrl, localPath) => {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(localPath);
        https.get(imageUrl, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Failed to download image. Status Code: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => file.close(() => resolve(localPath)));
        }).on('error', (err) => {
            fs.unlinkSync(localPath);
            reject(err);
        });
    });
};

const generatereceipt = async (data, inv_data, outputPath, filename, invoice_number, action) => {

    try {

        if (invoice_number == 0 || invoice_number == null) {
            await paymentFinalsettlement.generateReceipt(data, inv_data, outputPath);
        } else if (action == 'advance') {
            await paymentSecurityDeposit.generateReceipt(data, inv_data, outputPath);
        } else {
            await paymentReceipt.generateReceipt(data, inv_data, outputPath);
        }

        await new Promise(r => setTimeout(r, 1000));

        const inv_id = data[0].id;

        const s3Url = await uploadToS3(outputPath, filename, inv_id);

        if (s3Url) {
            fs.unlinkSync(outputPath); // Clean up local file after upload
            return s3Url;
        } else {
            throw new Error('S3 upload failed.');
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

// const uploadToS3 = async (filePath, filename) => {
//     try {
//         const fileContent = fs.readFileSync(filePath);

//         const key = `Receipts/${filename}`;
//         var bucketName = process.env.AWS_BUCKET_NAME;

//         const params = {
//             Bucket: bucketName,
//             Key: key,
//             Body: fileContent,
//             ContentType: 'application/pdf',
//         };

//         const data = await s3.upload(params).promise();
//         console.log('PDF uploaded successfully:', data.Location);

//         return data.Location;
//     } catch (err) {
//         console.error('Error uploading PDF:', err);
//     }
// };

module.exports = { downloadImage, generatereceipt };