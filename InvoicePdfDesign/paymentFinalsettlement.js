const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');

function generateReceipt(data, invoiceDetails, outputPath) {

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(fs.createWriteStream(outputPath));

    const pageWidth = doc.page.width;

    doc.rect(0, 0, pageWidth, 90).fill('#1E45E1');

    const logoPath = path.resolve(__dirname, '../Asset/Group@2x.png');
    const rectBluePath = path.resolve(__dirname, '../Asset/Rectangleblue.png');
    const locationIconPath = path.resolve(__dirname, '../Asset/location 03.png');
    const cotactPath = path.resolve(__dirname, '../Asset/paidfull (2).png');

    doc.image(logoPath, 10, 30, { width: 35, height: 35 });
    doc.image(rectBluePath, 35, 215, { width: 8, height: 8 });
    doc.image(locationIconPath, 35, 232, { width: 10, height: 10 });
    doc
        .fillColor('white')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Smartstay', 50, 32)
        .fontSize(10)
        .font('Helvetica')
        .text('Meet All Your Needs.', 50, 52);

    // === Hostel Details Right ===
    doc
        .fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(invoiceDetails.hname, pageWidth - 250, 30, { width: 200, align: 'right' })
        .font('Helvetica')
        .fontSize(9)
        .text(
            [invoiceDetails.haddress, invoiceDetails.harea].filter(Boolean).join(', '),
            pageWidth - 250,
            48,
            { width: 200, align: 'right' }
        )
        .text(
            [invoiceDetails.hlandmark, invoiceDetails.hpincode].filter(Boolean).join(' - '),
            pageWidth - 250,
            60,
            { width: 200, align: 'right' }
        )
        .text(
            [invoiceDetails.hcity, invoiceDetails.hstate].filter(Boolean).join(' - '),
            pageWidth - 250,
            72,
            { width: 200, align: 'right' }
        );
    // === Payment Invoice Title ===
    doc
        .fillColor('black')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Final Settlement Receipt', 0, 150, { align: 'center' });

    // === Bill To & Invoice Info ===
    const leftX = 50;
    const rightX = pageWidth - 250;
    const infoY = 180;
    const lineGap = 18;
    const fontSize = 10;
    const lineHeight = fontSize + 6;


    doc
        .fontSize(10)
        .fillColor('#1E45E1') // Blue color for label
        .font('Helvetica-Bold')
        .text('Bill To:', leftX, infoY)

    doc.fillColor('black').font('Helvetica');

    let currentY = infoY + lineGap;

    if (invoiceDetails.uname) {
        doc.text(invoiceDetails.uname, leftX, currentY, {
            width: 250,
            lineBreak: true
        });
        currentY += lineGap;
    }

    if (invoiceDetails.uphone) {
        doc.text(invoiceDetails.uphone, leftX, currentY, {
            width: 250,
            lineBreak: true
        });
        currentY += lineGap;
    }

    const addressLine1 = [invoiceDetails.uaddress, invoiceDetails.uarea].filter(Boolean).join(', ');
    if (addressLine1) {
        const address1Height = doc.heightOfString(addressLine1, {
            width: 250,
            align: 'left'
        });

        doc.text(addressLine1, leftX, currentY, {
            width: 250,
            align: 'left'
        });

        currentY += address1Height + 2; // small vertical margin
    }

    const addressLine2 = [invoiceDetails.ulandmark, invoiceDetails.upincode].filter(Boolean).join(' - ');
    if (addressLine2) {
        const address2Height = doc.heightOfString(addressLine2, {
            width: 250,
            align: 'left'
        });

        doc.text(addressLine2, leftX, currentY, {
            width: 450,
            align: 'left'
        });

        currentY += address2Height + 2; // add small margin after
    }

    const addressLine3 = [invoiceDetails.ucity, invoiceDetails.ustate].filter(Boolean).join(' - ');
    if (addressLine3) {
        const address3Height = doc.heightOfString(addressLine3, {
            width: 250,
            align: 'left'
        });

        doc.text(addressLine3, leftX, currentY, {
            width: 250,
            align: 'left'
        });

        currentY += address3Height + 2;
    }

    const formattedDate = moment(invoiceDetails.payment_date).format('DD-MM-YYYY');

    doc
        .font('Helvetica')
        .fillColor('grey')
        .text('Receipt No:', rightX + 90, infoY)
        .fillColor('black')
        .text(invoiceDetails.reference_id, rightX + 160, infoY)

        .fillColor('grey')
        .text('Payment Date:', rightX + 90, infoY + lineHeight)
        .fillColor('black')
        .text(formattedDate, rightX + 160, infoY + lineHeight)

        .fillColor('grey')
        .text('Payment Mode:', rightX + 90, infoY + lineHeight * 2)
        .fillColor('black')
        .text(
            invoiceDetails.bank_type ? invoiceDetails.bank_type : invoiceDetails.payment_mode,
            rightX + 160,
            infoY + lineHeight * 2
        );

    // === Table Header ===
    const tableY = 300;
    doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#4768EA');

    doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('S.No', leftX + 10, tableY + 7)
        .text('Description', leftX + 120, tableY + 7)
        // .text('Month', leftX + 250, tableY + 7)
        .text('Amount (INR)', leftX + 400, tableY + 7);

    // === Table Rows ===

    let y = tableY + 35;
    doc.font('Helvetica').fillColor('black');
    data.forEach((item, i) => {
        doc
            .text(i + 1, leftX + 10, y)
            .text(item.reason, leftX + 120, y)
            .text((item.amount ?? 0).toFixed(2), leftX + 400, y);
        y += 25;
    });

    // === Summary ===
    const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
    const tax = invoiceDetails.tax || 0;
    const total = subtotal + tax;
    // === Summary Section with Quote ===


    // Right column – Subtotal, Tax, Total
    doc
        .fillColor('black')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Advance Amount', leftX + 300, y)
        .text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);

    // y += 20;

    // doc
    //   .text('Tax', leftX + 300, y)
    //   .text(`Rs. ${tax.toFixed(2)}`, leftX + 400, y);

    y += 20;

    doc
        .font('Helvetica-Bold')
        .text('Refundable Total', leftX + 300, y)
        .fontSize(12)
        .fillColor('black')
        .text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);


    // === Account Details ===
    // y += 120;
    // doc
    //     .fillColor('#1E45E1')
    //     .font('Helvetica-Bold')
    //     .fontSize(11)
    //     .text('ACCOUNT DETAILS', leftX, y);
    // y += 20;

    // doc
    //     .fillColor('black')
    //     .font('Helvetica')
    //     .fontSize(10)
    //     .text(`Account No   : ${invoiceDetails.bank.accNo}`, leftX, y)
    //     .text(`IFSC Code    : ${invoiceDetails.bank.ifsc}`, leftX, y + 15)
    //     .text(`Bank Name    : ${invoiceDetails.bank.bankName}`, leftX, y + 30)
    //     .text(`UPI ID       : ${invoiceDetails.bank.upi}`, leftX, y + 45);

    // === QR Image ===
    // doc.image('qr.png', pageWidth - 120, y - 5, { width: 80 }); // Place your QR image here

    // === Terms and Signature ===
    y += 100;
    doc
        .fillColor('#1E45E1')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Acknowledgment', leftX, y);
    y += 15;

    doc
        .fontSize(9)
        .fillColor('gray')
        .font('Helvetica')
        .text(invoiceDetails.privacyPolicyHtml || 'No refunds after due date.', leftX, y, { width: 300 });

    y += 10;

    // Left column – Farewell message
    doc
        .fillColor('#1E45E1')
        .fontSize(10)
        .font('Helvetica')
        .text('"Your comfort is our priority –\nSee you again at Smart Stay!"', leftX + 10, y + 70);

    doc
        .fillColor('#3D3D3D')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Authorized Signature', pageWidth - 160, y);
    doc.image(cotactPath, 430, 570, { width: 100, height: 60 });

    // === Footer ===
    const footerY = 800;
    const footerHeight = 30;
    const footerX = 20;
    const footerWidth = pageWidth - 40;

    doc.roundedRect(footerX, footerY, footerWidth, footerHeight, 15).fill('#1E45E1');

    doc
        .fillColor('white')
        .fontSize(10)
        .text(
            `email : ${invoiceDetails.hemail}    Contact : ${invoiceDetails.hphone}`,
            footerX,
            footerY + 9,
            { width: footerWidth, align: 'center' }
        );

    doc.end();
}

module.exports = { generateReceipt }