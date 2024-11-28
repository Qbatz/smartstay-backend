const AWS = require('aws-sdk');
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');


const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();

function uploadProfilePictureToS3Bucket(bucketName, folderName, fileName, fileData) {

    return new Promise((resolve, reject) => {

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
                reject(err);
            } else {
                console.log('File uploaded successfully:', data.Location);
                resolve(data.Location);
            }
        });
    })
}

function deleteImageFromS3Bucket(bucket, key) {
    return new Promise((resolve, reject) => {
        const params = {
            Bucket: bucket,
            Key: key,
        };

        s3.deleteObject(params, (err, data) => {
            if (err) {
                return reject(err);
            }
            console.log(data);
            resolve(data);
        });
    });
};

function export_function(data, filePath) {

    return new Promise((resolve, reject) => {

        try {
            var bucket_name = 'smartstaydevs';

            const worksheet = xlsx.utils.json_to_sheet(data);
            const workbook = xlsx.utils.book_new();
            xlsx.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
            xlsx.writeFile(workbook, filePath);
            const fileContent = fs.readFileSync(filePath);

            const params = {
                Bucket: bucket_name,
                Key: `exports/${filePath}`,
                Body: fileContent,
                ContentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            };

            s3.upload(params, (err, data) => {
                fs.unlinkSync(filePath);

                if (err) {
                    console.error('Error uploading to S3:', err);
                    return reject(err);
                }

                console.log(`File uploaded successfully. S3 URL: ${data.Location}`);
                resolve(data.Location);
            });

        } catch (error) {
            console.error('Error generating or uploading file:', error);
            reject(error);
        }
    });
}

module.exports = { uploadProfilePictureToS3Bucket, deleteImageFromS3Bucket, export_function }