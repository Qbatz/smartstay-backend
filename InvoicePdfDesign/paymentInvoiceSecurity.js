const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');


function generateInvoice(data, invoiceDetails, outputPath) {

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(fs.createWriteStream(outputPath));

    const pageWidth = doc.page.width;

    // === Header Background ===
    doc.rect(0, 0, pageWidth, 90).fill('#1E45E1');

    const logoPath = path.resolve(__dirname, '../Asset/Group@2x.png');
    const rectBluePath = path.resolve(__dirname, '../Asset/Rectangleblue.png');
    const locationIconPath = path.resolve(__dirname, '../Asset/location 03.png');

    // === Logo & Tagline ===
    // doc.image('logo.png', 50, 30, { width: 40 }); // Replace with your actual logo
    doc.image(logoPath, 10, 30, { width: 35, height: 35 });
    // doc.image(rectBluePath, 35, 215, { width: 8, height: 8 });
    // doc.image(locationIconPath, 35, 232, { width: 10, height: 10 });
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
        .text(invoiceDetails.Hostel_Name, pageWidth - 250, 30, { width: 200, align: 'right' })
        .font('Helvetica')
        .fontSize(9)
        .text(
            [invoiceDetails.hostel_address, invoiceDetails.harea].filter(Boolean).join(', '),
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
        .text('Security Deposit Invoice', 0, 150, { align: 'center' });

    // === Bill To & Invoice Info ===
    const leftX = 50;
    const rightX = pageWidth - 250;
    const infoY = 180;
    const lineGap = 18;
    const fontSize = 10;
    const lineHeight = fontSize + 6;
    doc.image(rectBluePath, 35, 215, { width: 8, height: 8 });
    doc.image(locationIconPath, 35, 232, { width: 10, height: 10 });

    doc
        .fontSize(10)
        .fillColor('#1E45E1') // Blue color for label
        .font('Helvetica-Bold')
        .text('Bill To:', leftX, infoY)

    doc.fillColor('black').font('Helvetica').fontSize(10);

    let currentY = infoY + lineGap;

    if (invoiceDetails.Name) {
        doc.text(invoiceDetails.Name, leftX, currentY, {
            width: 250,
            lineBreak: true
        });
        currentY += lineGap;
    }

    if (invoiceDetails.phoneNo) {
        doc.text(invoiceDetails.phoneNo, leftX, currentY, {
            width: 250,
            lineBreak: true
        });
        currentY += lineGap;
    }

    const addressLine1 = [invoiceDetails.UserAddress, invoiceDetails.uarea].filter(Boolean).join(', ');
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

    const formattedDate = moment(invoiceDetails.Date).format('DD-MM-YYYY');
    const formattedDueDate = moment(invoiceDetails.DueDate).format('DD-MM-YYYY');
    const formattedJoinDate = moment(invoiceDetails.joining_Date).format('DD-MM-YYYY');

    doc
        .font('Helvetica')
        .fillColor('grey')
        .text('Invoice No:', rightX + 90, infoY)
        .font('Helvetica')
        .fillColor('black')
        .text(invoiceDetails.Invoices, rightX + 150, infoY)
        .font('Helvetica')
        .fillColor('grey')
        .text('Invoice Date:', rightX + 90, infoY + lineHeight)
        .font('Helvetica')
        .fillColor('black')
        .text(formattedDate, rightX + 160, infoY + lineHeight)
        .font('Helvetica')
        .fillColor('grey')
        .text('Due Date:', rightX + 90, infoY + lineHeight * 2)
        .font('Helvetica')
        .fillColor('black')
        .text(formattedDueDate, rightX + 160, infoY + lineHeight * 2)
        .fillColor('grey')
        .text('Joining Date:', rightX + 90, infoY + 50)
        .font('Helvetica')
        .fillColor('black')
        .text(formattedJoinDate, rightX + 160, infoY + 50);

    // === Table Header ===
    const tableY = 280;
    doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#4768EA');

    doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('S.No', leftX + 10, tableY + 7)
        .text('Inv No', leftX + 60, tableY + 7)
        .text('Description', leftX + 250, tableY + 7)
        .text('Amount (INR)', leftX + 400, tableY + 7);

    // === Table Rows ===

    let y = tableY + 35;
    doc.font('Helvetica').fillColor('black');
    data.forEach((item, i) => {
        doc
            .text(i + 1, leftX + 10, y)
            .text(item.am_name, leftX + 120, y)
            .text((item.amount ?? 0).toFixed(2), leftX + 400, y);
        y += 25;
    });

    // === Summary ===
    const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
    const tax = invoiceDetails.tax || 0;
    const total = subtotal + tax;
    // === Summary Section with Quote ===
    y += 10;

    // Right column – Subtotal, Tax, Total
    doc
        .fillColor('black')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Sub Total', leftX + 300, y)
        .text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);

    y += 20;

    doc
        .text('Tax', leftX + 300, y)
        .text(`Rs. ${tax.toFixed(2)}`, leftX + 400, y);

    y += 20;

    doc
        .font('Helvetica-Bold')
        .text('Total', leftX + 300, y)
        .fontSize(12)
        .fillColor('black')
        .text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);


    // === Account Details ===
    y += 120;


    doc
        .fillColor('#1E45E1')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('ACCOUNT DETAILS', leftX, y);
    y += 20;
    // doc
    //     .fillColor('#1E45E1')
    //     .font('Helvetica-Bold')
    //     .fontSize(11)
    //     .text('ACCOUNT DETAILS', leftX, y);
    // y += 20;

    doc
        .fillColor('black')
        .font('Helvetica')
        .fontSize(10)
    const labelX = leftX;
    const valueX = leftX + 100; // adjust spacing as needed
    let accountY = y;

    doc.text("Account No", labelX, accountY);
    doc.text(`: ${invoiceDetails.acc_num || " NA "}`, valueX, accountY);
    accountY += 15;

    doc.text("IFSC Code", labelX, accountY);
    doc.text(`: ${invoiceDetails.ifsc_code || " NA "}`, valueX, accountY);
    accountY += 15;

    doc.text("Bank Name", labelX, accountY);
    doc.text(`: ${invoiceDetails.acc_name || " NA "}`, valueX, accountY);
    accountY += 15;

    doc.text("UPI ID", labelX, accountY);
    doc.text(`: ${invoiceDetails.upi_id || " NA "}`, valueX, accountY);
    accountY += 15;


    // === QR Image ===
    // doc.image('qr.png', pageWidth - 120, y - 5, { width: 80 }); // Place your QR image here

    // === Terms and Signature ===
    y += 100;
    doc
        .fillColor('#1E45E1')
        .font('Helvetica-Bold')
        .fontSize(10)

    if (invoiceDetails.privacyPolicyHtml) {
        doc.text('Terms and Conditions', leftX, y);
    }
    y += 15;

    doc
        .fontSize(9)
        .fillColor('gray')
        .font('Helvetica');

    if (invoiceDetails.privacyPolicyHtml) {
        doc.text(invoiceDetails.privacyPolicyHtml, leftX, y, { width: 300 });
    }

    doc
        .fillColor('#3D3D3D')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Authorized Signature', pageWidth - 160, y - 90);

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
            `email : ${invoiceDetails.hostel_email}    Contact : ${invoiceDetails.hostel_phone}`,
            footerX,
            footerY + 9,
            { width: footerWidth, align: 'center' }
        );

    doc.end();
}

module.exports = { generateInvoice }
