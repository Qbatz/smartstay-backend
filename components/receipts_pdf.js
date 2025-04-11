const fs = require('fs');
const https = require('https');
const PDFDocument = require('pdfkit');
const moment = require('moment');
const converter = require('number-to-words');
const path = require('path');
const AWS = require('aws-sdk');

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

const generatereceipt = async (inv_data, outputPath, filename) => {

    try {

        const doc = new PDFDocument({ size: 'A4', margin: 50 });

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        let logoUrl = inv_data.hostel_profile ? inv_data.hostel_profile.trim() : null;
        const defaultLogo = 'https://smartstaydevs.s3.ap-south-1.amazonaws.com/Logo/Logo141717749724216.jpg';

        var amount_received = Number(inv_data.amount_received) || 0; // Convert to number, default to 0 if null/undefined
        var amount_words = converter.toWords(amount_received.toFixed(0)).toUpperCase();

        // Check if logoUrl is valid, otherwise use the default logo
        if (!logoUrl || !/^https?:\/\//.test(logoUrl)) {
            logoUrl = defaultLogo;
        }
        const payment_date = moment(inv_data.payment_date).format('DD/MM/YYYY');
        const invoice_date = moment(inv_data.Date).format('DD/MM/YYYY');

        const localLogoPath = path.join(__dirname, 'temp_logo.jpg');

        await downloadImage(logoUrl, localLogoPath);

        doc.image(localLogoPath, 50, 50, { width: 120, height: 50 });

        doc.font('Helvetica-Bold').fontSize(14).fillColor('black')
            .text(inv_data.hostel_name, 400, 50, { align: 'right' });

        doc.font('Helvetica').fontSize(10).fillColor('#666')
            .text(inv_data.hostel_address, 400, 70, { align: 'right' })

        doc.moveDown(10);

        const text = 'PAYMENT RECEIPT';
        const textX = 225;

        const textY = 125;

        // Draw Centered Text
        doc.font('Helvetica-Bold')
            .fontSize(16)
            .fillColor('black')
            .text(text, textX, textY);

        const detailStartY = 200;
        doc.font('Helvetica').fontSize(10).fillColor('#666');
        doc.text('Payment Date:', 50, detailStartY)
            .text('Reference Number:', 50, detailStartY + 25)
            .text('Payment Mode:', 50, detailStartY + 50)
            .text('Amount Received in Words:', 50, detailStartY + 75);

        doc.font('Helvetica-Bold').fillColor('black');
        doc.text(payment_date, 180, detailStartY)
            .text(inv_data.reference_id, 180, detailStartY + 25)
            .text(inv_data.payment_mode, 180, detailStartY + 50)
            .text(amount_words + ' ONLY', 180, detailStartY + 75);

        const blueBoxX = 380, blueBoxY = detailStartY;
        const boxWidth = 170, boxHeight = 50;
        doc.roundedRect(blueBoxX, blueBoxY, boxWidth, boxHeight, 5).fill('#0057FF');

        const labelText = 'Amount Received';
        const labelWidth = doc.widthOfString(labelText, { font: 'Helvetica', size: 10 });
        const labelX = blueBoxX + (boxWidth / 2) - (labelWidth / 2);

        console.log(inv_data.amount_received);

        const amountText = String(inv_data.amount_received);
        const amountWidth = doc.widthOfString(amountText, { font: 'Helvetica-Bold', size: 14 });
        const amountX = blueBoxX + (boxWidth / 2) - (amountWidth / 2);

        doc.fontSize(10).fillColor('white').text(labelText, labelX, blueBoxY + 10);
        doc.fontSize(14).font('Helvetica-Bold').text(amountText, amountX, blueBoxY + 30);

        doc.moveDown(10);

        const tableStartY = detailStartY + 150; // Increased space above table
        const colWidths = [50, 140, 100, 120, 120]; // Adjusted column widths
        const rowHeight = 30;

        // Draw Table Borders
        function drawTableBorders(y) {
            let x = 50;
            for (let i = 0; i < colWidths.length; i++) {
                doc.rect(x, y, colWidths[i], rowHeight).stroke();
                x += colWidths[i];
            }
            doc.rect(50, y, 530, rowHeight).stroke(); // Full horizontal border
        }

        doc.font('Helvetica-Bold').fontSize(10).fillColor('black');
        doc.rect(50, tableStartY, 530, rowHeight).fill('#f2f2f2'); // Header background
        doc.fillColor('black')
            .text('S.No', 60, tableStartY + 10)
            .text('Invoice Number', 110, tableStartY + 10)
            .text('Invoice Date', 260, tableStartY + 10)
            .text('Invoice Amount', 360, tableStartY + 10)
            .text('Paid Amount', 480, tableStartY + 10); // Right-aligned
        drawTableBorders(tableStartY);

        // === TABLE DATA ROW ===
        const rowStartY = tableStartY + rowHeight;
        doc.fillColor('black')
            .text('1', 60, rowStartY + 10) // Removed '1' before amount
            .text(inv_data.invoice_number, 110, rowStartY + 10)
            .text(invoice_date, 260, rowStartY + 10)
            .text(inv_data.Amount, 380, rowStartY + 10)
            .text(inv_data.PaidAmount, 500, rowStartY + 10); // Right-aligned
        drawTableBorders(rowStartY);

        doc.moveDown(2);
        doc.fontSize(10).fillColor('black').text('Total:', 430, rowStartY + 50);
        doc.font('Helvetica-Bold').text(inv_data.Amount, 500, rowStartY + 50);

        doc.moveDown(8);
        doc.fontSize(10).fillColor('#666').text('Received From:', 50, rowStartY + 90);
        doc.fontSize(12).fillColor('black').text(inv_data.user_name, 50, rowStartY + 110); // Demo now appears below

        doc.fontSize(10).fillColor('black').text('Authorized Signature', 400, rowStartY + 110);

        // Finalize and Save PDF
        doc.end();
        console.log('Updated PDF Generated:', filename);

        return new Promise((resolve, reject) => {
            stream.on('finish', async () => {
                fs.unlinkSync(localLogoPath);

                const s3Url = await uploadToS3(outputPath, filename);

                if (s3Url) {
                    fs.unlinkSync(outputPath);
                    resolve(s3Url);
                } else {
                    reject(new Error('S3 upload failed.'));
                }
            });
            stream.on('error', reject);
        });
    } catch (error) {
        console.error('Error generating PDF:', error);
        throw error;
    }
}

const uploadToS3 = async (filePath, filename) => {
    try {
        const fileContent = fs.readFileSync(filePath);

        const key = `Receipts/${filename}`;
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

module.exports = { downloadImage, generatereceipt };