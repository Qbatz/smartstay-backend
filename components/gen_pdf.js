const fs = require('fs');
const https = require('https');
const path = require('path');
const AWS = require('aws-sdk');
const paymentInvoice = require('../InvoicePdfDesign/paymentInvoice');
const paymentInvoiceSecurity = require('../InvoicePdfDesign/paymentInvoiceSecurity');

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

const generateManualPDF = async (data, outputPath, filename, action) => {
    try {
        if (action == 'advance') {
            await paymentInvoiceSecurity.generateInvoice(data, data[0], outputPath);
        } else {
            await paymentInvoice.generateInvoice(data, data[0], outputPath);
        }

        const stats = fs.statSync(outputPath);
        console.log(`PDF size before upload: ${stats.size} bytes`);

        await new Promise(r => setTimeout(r, 1000));

        const inv_id = data[0].id;
        const s3Url = await uploadToS3(outputPath, filename, inv_id);

        if (s3Url) {
            fs.unlinkSync(outputPath); // Uncomment if you want to delete after upload
            return s3Url;
        } else {
            throw new Error('S3 upload failed.');
        }
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
};


const uploadToS3 = async (filePath, filename, inv_id) => {
    try {
        const fileContent = fs.readFileSync(filePath);
        console.log(`Read file ${filePath} - size: ${fileContent.length} bytes`);

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
        throw err;  // Important: propagate error
    }
};


module.exports = { downloadImage, generateManualPDF };