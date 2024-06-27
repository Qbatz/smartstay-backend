const AWS = require('aws-sdk');
require('dotenv').config();
const fs = require('fs');
const path = require('path');

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

module.exports = { uploadProfilePictureToS3Bucket, deleteImageFromS3Bucket }