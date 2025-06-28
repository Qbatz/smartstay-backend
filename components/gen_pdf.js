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
    if (!data || !Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid data provided to generate PDF.');
    }

    const invoiceDetails = data[0];
    const inv_id = invoiceDetails.id;

    try {
        // === Generate PDF ===
        const generateFn = action === 'advance'
            ? paymentInvoiceSecurity.generateInvoice
            : paymentInvoice.generateInvoice;

        await generateFn(data, invoiceDetails, outputPath);

        // === Wait briefly to ensure file is written ===
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // === Validate File Exists ===
        if (!fs.existsSync(outputPath)) {
            throw new Error(`Generated PDF not found at path: ${outputPath}`);
        }

        const stats = fs.statSync(outputPath);
        console.log(` PDF generated: ${outputPath} (${stats.size} bytes)`);

        // === Upload to S3 ===
        const s3Url = await uploadToS3(outputPath, filename, inv_id);

        if (!s3Url) {
            throw new Error(' S3 upload failed.');
        }

        // === Delete local file after upload (optional) ===
        fs.unlinkSync(outputPath);
        console.log(` Local PDF file deleted: ${outputPath}`);

        return s3Url;

    } catch (err) {
        console.error(' Error in generateManualPDF:', err.message);
        throw err;
    }
};



// const uploadToS3 = async (filePath, filename, inv_id) => {
//     try {
//         const fileContent = fs.readFileSync(filePath);
//         console.log(`Read file ${filePath} - size: ${fileContent.length} bytes`);

//         const key = `Invoice/${filename}`;
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
//         throw err;  // Important: propagate error
//     }
// };


module.exports = { downloadImage, generateManualPDF };