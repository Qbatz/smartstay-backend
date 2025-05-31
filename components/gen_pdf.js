const fs = require('fs');
const https = require('https');
const path = require('path');
const AWS = require('aws-sdk');
const paymentInvoice = require('../InvoicePdfDesign/paymentInvoice');

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

const generateManualPDF = async (data, outputPath, filename) => {
    try {
        await paymentInvoice.generateInvoice(data, data[0], outputPath);

        const inv_id = data[0].id;

        console.log('====================================');
        console.log("000000000000000000000");
        console.log('====================================');

        // const s3Url = await uploadToS3(outputPath, filename, inv_id);

        // if (s3Url) {
        //     // fs.unlinkSync(outputPath); // Clean up local file after upload
        //     return s3Url;
        // } else {
        //     throw new Error('S3 upload failed.');
        // }
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};

const uploadToS3 = async (filePath, filename, inv_id) => {
    try {
        const fileContent = fs.readFileSync(filePath);

        const key = `Invoice/${filename}`;
        var bucketName = process.env.AWS_BUCKET_NAME;

        const params = {
            Bucket: bucketName,
            Key: key,
            Body: fileContent,
            ContentType: 'application/pdf',
        };

        const data = await s3.upload(params).promise();
        console.log('PDF uploaded successfully:', data.Location);

        return data.Location;
    } catch (err) {
        console.error('Error uploading PDF:', err);
    }
};

module.exports = { downloadImage, generateManualPDF };