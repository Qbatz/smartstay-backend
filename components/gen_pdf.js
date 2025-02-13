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

const generateManualPDF = async (data, outputPath, filename) => {
    try {
        const doc = new PDFDocument({ margin: 50 });
        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        const inv_data = data[0];
        const formattedDate = moment(inv_data.Date).format('DD/MM/YYYY');
        // Validate and Set Logo URL
        let logoUrl = inv_data.hostel_profile ? inv_data.hostel_profile.trim() : null;
        const defaultLogo = 'https://smartstaydevs.s3.ap-south-1.amazonaws.com/Logo/Logo141717749724216.jpg';

        // Check if logoUrl is valid, otherwise use the default logo
        if (!logoUrl || !/^https?:\/\//.test(logoUrl)) {
            logoUrl = defaultLogo;
        }

        const localLogoPath = path.join(__dirname, 'temp_logo.jpg');

        await downloadImage(logoUrl, localLogoPath);

        const logoX = 50, logoY = 30, logoWidth = 80, logoHeight = 40;
        const textX = logoX + logoWidth + 15;

        doc.image(localLogoPath, logoX, logoY, { width: logoWidth, height: logoHeight });

        const rightColumnX = 400; // Adjusted for proper alignment

        doc.font('Helvetica-Bold').fontSize(12)
            .text(`Hostel Name: ${inv_data.Hostel_Name.toUpperCase()}`, rightColumnX, logoY, { align: 'right' });

        // Phone & Email (Right Side, One Below the Other)
        doc.font('Helvetica').fontSize(10)
            .text(`Phone: ${inv_data.phoneNo || '-'}`, rightColumnX, logoY + 15, { align: 'right' })
            .text(`Email: ${inv_data.EmailID || '-'}`, rightColumnX, logoY + 30, { align: 'right' });

        doc.moveDown(1);


        // Invoice Title
        doc.font('Helvetica-Bold').fontSize(16)
            .text('Invoice Receipt', 50, doc.y + 10, { align: 'center' });

        doc.moveDown(1);

        // Define positions for Customer and Invoice Details
        const leftColumnX = 50;
        const rightColumnX1 = 400;
        var lineSpacing = 4; // Reduced spacing for better alignment

        // Customer Details (Left Side - Reduced Spacing)
        doc.font('Helvetica').fontSize(10)
            .text(`Customer Name: ${inv_data.Name}`, leftColumnX, doc.y)
            .text(`Customer Phone: ${inv_data.phoneNo || '-'}`, leftColumnX, doc.y + lineSpacing)
            .text(`Customer Email: ${inv_data.EmailID || '-'}`, leftColumnX, doc.y + lineSpacing * 2)
            .text(`Customer Address: ${inv_data.user_address}`, leftColumnX, doc.y + lineSpacing * 3, { width: 250, lineGap: 2 });

        doc.moveDown(0.5);

        var lineSpacing = 20; // Reduced spacing for better alignment
        // Invoice Details (Right Side, Now Properly Aligned)
        const invoiceDetailsY = doc.y - (lineSpacing * 4); // Adjusted to align with customer details
        doc.font('Helvetica').fontSize(10)
            .text(`Invoice No: ${inv_data.Invoices}`, rightColumnX1, invoiceDetailsY, { align: 'right' })
            .text(`Invoice Date: ${formattedDate}`, rightColumnX1, invoiceDetailsY + lineSpacing, { align: 'right' });

        doc.moveDown(3);

        const startX = 50, startY = doc.y + 20, tableWidth = 500, columnWidth = tableWidth / 3;
        doc.rect(startX, startY, tableWidth, 25).fill('#b2b5b8').stroke();
        doc.rect(startX, startY, columnWidth, 25).stroke();
        doc.rect(startX + columnWidth, startY, columnWidth, 25).stroke();
        doc.rect(startX + 2 * columnWidth, startY, columnWidth, 25).stroke();

        doc.fontSize(10).fillColor('#000000')
            .text('SNo', startX + 15, startY + 7)
            .text('Description', startX + columnWidth + 15, startY + 7)
            .text('Amount', startX + 2 * columnWidth + 15, startY + 7);
        doc.fillColor('black');

        // Table Content with Full Borders and Extra Space Below Last Line
        let serialNumber = 1, dataY = startY + 25;
        data.forEach(row => {
            doc.rect(startX, dataY, tableWidth, 25).stroke();
            doc.rect(startX, dataY, columnWidth, 25).stroke();
            doc.rect(startX + columnWidth, dataY, columnWidth, 25).stroke();
            doc.rect(startX + 2 * columnWidth, dataY, columnWidth, 25).stroke();

            doc.fontSize(10)
                .text(serialNumber.toString(), startX + 15, dataY + 7)
                .text(row.am_name, startX + columnWidth + 15, dataY + 7)
                .text((row.amount ?? 0).toFixed(2), startX + 2 * columnWidth + 15, dataY + 7);
                serialNumber++;
            dataY += 25;
        });

        doc.rect(startX, dataY, tableWidth, 25).stroke();
        doc.fontSize(10).fillColor('black')
            .text('Total Amount', startX + columnWidth, dataY + 7)
            .text(inv_data.Amount.toFixed(2), startX + 2 * columnWidth + 15, dataY + 7);
        dataY += 25;

        if (inv_data.PaidAmount > 0) {

            doc.rect(startX, dataY, tableWidth, 25).stroke();
            doc.fontSize(10).fillColor('black')
                .text('Paid Amount', startX + columnWidth, dataY + 7)
                .text(inv_data.PaidAmount.toFixed(2), startX + 2 * columnWidth + 15, dataY + 7);
            dataY += 60;
        }


        doc.moveDown(3);
        const pageWidth = doc.page.width; // Get page width
        const textWidth = doc.widthOfString(`We have received your payment of ${converter.toWords(inv_data.Amount.toFixed(0))} Rupees and Zero Paise`);
        const centerX = (pageWidth - textWidth) / 2; // Calculate center position

        doc.fontSize(10).fillColor('black')
            .text(`We have received your payment of ${converter.toWords(inv_data.Amount.toFixed(0))} Rupees and Zero Paise`, centerX, doc.y);

        doc.moveDown(1);
        const footerText = "This is a system-generated receipt and no signature is required.";
        const footerWidth = doc.widthOfString(footerText);
        const footerX = (pageWidth - footerWidth) / 2; // Calculate center position

        doc.fontSize(9)
            .text(footerText, footerX, doc.y);

        doc.end();


        return new Promise((resolve, reject) => {
            stream.on('finish', async () => {
                fs.unlinkSync(localLogoPath);

                var inv_id = inv_data.id;

                const s3Url = await uploadToS3(outputPath, filename, inv_id);

                if (s3Url) {
                    fs.unlinkSync(outputPath); // Delete local file only after successful upload
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
};

const uploadToS3 = async (filePath, filename, inv_id) => {
    try {
        const fileContent = fs.readFileSync(filePath);

        const key = `Invoice/${filename}`;
        const bucketName = 'smartstaydevs';

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