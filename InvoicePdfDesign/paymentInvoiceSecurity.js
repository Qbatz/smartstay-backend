const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');

function generateInvoice(data, invoiceDetails, outputPath) {
    console.log("invoiceDetails",invoiceDetails)
    console.log("data",data)
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(fs.createWriteStream(outputPath));

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const margin = 20;
    const leftX = 50;

    // === Outer Border ===
    doc.lineWidth(1).strokeColor('#E0E0E0')
        .rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2).stroke();

    // === Header Background ===
    doc.rect(margin, margin, pageWidth - margin * 2, 80).fill('#1E45E1');

    // === Logo and Branding ===
    const logoPath = path.resolve(__dirname, '../Asset/Group@2x.png');
    const rectBluePath = path.resolve(__dirname, '../Asset/Rectangleblue.png');
    const locationIconPath = path.resolve(__dirname, '../Asset/location 03.png');
    const qrPath = path.resolve(__dirname, '../Asset/qr.png'); // Optional QR
     const locationuserPath = path.resolve(__dirname, '../Asset/user.png');

    doc.image(logoPath, margin + 18, 34, { width: 25, height: 25 });
    doc
        .fillColor('white')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Smartstay', margin + 53, 38)
        .fontSize(10)
        .font('Helvetica')
        .text('Meet All Your Needs.', margin + 26, 65);

    // === Hostel Info Right Side ===
   
    // doc
    //     .fillColor('white')
    //     .fontSize(12)
    //     .font('Helvetica-Bold')
    //     .text(invoiceDetails.Hostel_Name, pageWidth - 200, 30, { width: 200, align: 'left' })
    //     .fontSize(9)
    //     .font('Helvetica')
    //     .text(
    //         [invoiceDetails.hostel_address, invoiceDetails.harea].filter(Boolean).join(', '),
    //         pageWidth - 200,
    //         48,
    //         { width: 200, align: 'left' }
    //     )
    //     .text(
    //         [invoiceDetails.hlandmark, invoiceDetails.hpincode].filter(Boolean).join(' - '),
    //         pageWidth - 200,
    //         60,
    //         { width: 200, align: 'left' }
    //     )
    //     .text(
    //         [invoiceDetails.hcity, invoiceDetails.hstate].filter(Boolean).join(' - '),
    //         pageWidth - 200,
    //         72,
    //         { width: 200, align: 'left' }
    //     );
    const hostelInfoX = pageWidth - 160; // starting point for right-aligned block
const hostelInfoWidth = 250;

doc
  .fillColor('white')
  .fontSize(12)
  .font('Helvetica-Bold')
  .text(invoiceDetails.Hostel_Name, hostelInfoX, 30, {
    width: hostelInfoWidth,
    align: 'left'
  })
  .fontSize(9)
  .font('Helvetica')
  .text(
    [invoiceDetails.hostel_address, invoiceDetails.harea].filter(Boolean).join(', '),
    hostelInfoX,
    48,
    { width: hostelInfoWidth, align: 'left' }
  )
  .text(
    [invoiceDetails.hlandmark, invoiceDetails.hpincode].filter(Boolean).join(' - '),
    hostelInfoX,
    60,
    { width: hostelInfoWidth, align: 'left' }
  )
  .text(
    [invoiceDetails.hcity, invoiceDetails.hstate].filter(Boolean).join(' - '),
    hostelInfoX,
    72,
    { width: hostelInfoWidth, align: 'left' }
  );


    // === Invoice Title ===
    doc
        .fillColor('black')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Security Deposit Invoice', 0, 150, { align: 'center' });

    // === Bill To Section ===
    const infoY = 180;
    const lineGap = 18;
    const rightX = pageWidth - 250;

  doc.image(locationuserPath, 35, 197, { width: 8, height: 8 });
    doc.image(rectBluePath, 35, 215, { width: 8, height: 8 });
    doc.image(locationIconPath, 35, 232, { width: 10, height: 10 });

    doc
        .fontSize(10)
        .fillColor('#1E45E1')
        .font('Helvetica-Oblique')
        .text('Bill To:', leftX, infoY);

    doc.fillColor('black').font('Helvetica');
    let currentY = infoY + lineGap;

    if (invoiceDetails.Name) {
        doc.text(invoiceDetails.Name, leftX, currentY);
        currentY += lineGap;
    }

    if (invoiceDetails.phoneNo) {
        doc.text(invoiceDetails.phoneNo, leftX, currentY);
        currentY += lineGap;
    }

    const addressLines = [
        [invoiceDetails.UserAddress, invoiceDetails.uarea].filter(Boolean).join(', '),
        [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - '),
        [invoiceDetails.ustate, invoiceDetails.upincode].filter(Boolean).join(' - ')
    ];
    addressLines.forEach(line => {
        const height = doc.heightOfString(line, { width: 250 });
        doc.text(line, leftX, currentY, { width: 250 });
        currentY += height + 2;
    });

    const formattedDate = moment(invoiceDetails.Date).format('DD-MM-YYYY');
    const formattedDueDate = moment(invoiceDetails.DueDate).format('DD-MM-YYYY');
    const formattedJoinDate = moment(invoiceDetails.joining_Date).format('DD-MM-YYYY');

    const labelX = rightX + 90;
    doc
        .font('Helvetica')
        .fillColor('grey')
        .text('Invoice No:', labelX, infoY)
        .fillColor('black')
        // .text('#',invoiceDetails.Invoices, labelX + 60, infoY)
        .text(`# ${invoiceDetails.Invoices}`, labelX + 60, infoY)
        .fillColor('grey')
        .text('Invoice Date:', labelX, infoY + lineGap)
        .fillColor('black')
        .text(formattedDate, labelX + 70, infoY + lineGap)
        .fillColor('grey')
        .text('Due Date:', labelX, infoY + lineGap * 2)
        .fillColor('black')
        .text(formattedDueDate, labelX + 70, infoY + lineGap * 2)
        .fillColor('grey')
        .text('Joining Date:', labelX, infoY + lineGap * 3 + 5)
        .fillColor('black')
        .text(formattedJoinDate, labelX + 70, infoY + lineGap * 3 + 5);

    // === Table Header ===
    const tableY = 280;
    const tableWidth = pageWidth - 100;
    doc.roundedRect(leftX, tableY, tableWidth, 25, 5).fill('#4768EA');

    doc
  .fillColor('white')
  .font('Helvetica-Bold')
  .fontSize(10)
  .text('S.No', leftX + 10, tableY + 7)
  .text('INV', leftX + 70, tableY + 7)
  .text('Description', leftX + 200, tableY + 7)
  .text('Amount (INR)', leftX + 400, tableY + 7);


    // === Table Rows ===
  let y = tableY + 35;
doc.font('Helvetica').fillColor('black');

data.forEach((item, i) => {
    doc
        .text(i + 1, leftX + 10, y) // S.No
        .text(item.Invoices || '-', leftX + 70, y) // Invoice Number
        .text(item.am_name || '-', leftX + 200, y) // Description
        .text((item.amount ?? 0).toFixed(2), leftX + 400, y); // Amount
    y += 25;
});

    // === Horizontal Line after Table ===
    doc
        .moveTo(leftX, y)
        .lineTo(leftX + tableWidth, y)
        .lineWidth(1)
        .strokeColor('#D3D3D3')
        .stroke();

    // === Subtotal/Tax/Total ===
    const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
    const tax = invoiceDetails.tax || 0;
    const total = subtotal + tax;

    y += 10;
    doc
        .font('Helvetica-Bold')
        .text('Sub Total', leftX + 300, y)
        .text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);

    y += 20;
    doc
        .font('Helvetica')
        .text('Tax', leftX + 300, y)
        .text(`Rs. ${tax.toFixed(2)}`, leftX + 400, y);

    y += 20;
    doc
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Total', leftX + 300, y)
        .text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);

    // === Horizontal Line under summary ===
    y += 20;
    doc
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .strokeColor('#E0E0E0')
        .stroke();

    // === Account Details ===
    y += 20;
    doc
        .fillColor('#1E45E1')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('ACCOUNT DETAILS', leftX, y);
    y += 20;

    doc.fontSize(10).fillColor('black').font('Helvetica');
    const valueX = leftX + 100;
    let accountY = y;

    doc.text('Account No', leftX, accountY);
    doc.text(`: ${invoiceDetails.acc_num || "NA"}`, valueX, accountY);
    accountY += 15;

    doc.text('IFSC Code', leftX, accountY);
    doc.text(`: ${invoiceDetails.ifsc_code || "NA"}`, valueX, accountY);
    accountY += 15;

    doc.text('Bank Name', leftX, accountY);
    doc.text(`: ${invoiceDetails.acc_name || "NA"}`, valueX, accountY);
    accountY += 15;

    doc.text('UPI ID', leftX, accountY);
    doc.text(`: ${invoiceDetails.upi_id || "NA"}`, valueX, accountY);
    accountY += 15;

    // === QR Code (optional) ===
    if (fs.existsSync(qrPath)) {
        doc.image(qrPath, pageWidth - 120, y - 5, { width: 80 });
    }


//     const qrImagePath = path.resolve(__dirname, '../Asset/barcode.png');
// const paytmLogo = path.resolve(__dirname, '../Asset/paytm.png');
// const phonepeLogo = path.resolve(__dirname, '../Asset/phonepay.png');
// const gpayLogo = path.resolve(__dirname, '../Asset/gpay.png');


// let qrY = y - 5;

// // Draw QR Code
// doc.image(qrImagePath, rightX + 60, qrY, { width: 100 });

// // Payment Logos below QR
// const logoY = qrY + 85;
// doc.image(paytmLogo, rightX + 35, logoY + 5, { width: 30 });
// doc.image(phonepeLogo, rightX + 70, logoY + 5, { width: 40 });
// doc.image(gpayLogo, rightX + 120, logoY + 8, { width: 30 });

//     // === Terms and Signature ===
//     y += 100;
//     if (invoiceDetails.privacyPolicyHtml) {
//         doc
//             .fillColor('#1E45E1')
//             .font('Helvetica-Bold')
//             .fontSize(10)
//             .text('Terms and Conditions', leftX, y);
//         y += 15;

//         doc
//             .fontSize(9)
//             .fillColor('gray')
//             .font('Helvetica')
//             .text("Tenants must pay all dues on or before the due date, maintain cleanliness, and follow PG rules; failure may lead to penalties or termination of stay.", leftX, y, { width: 300 });
//     }

//     // === Authorized Signature ===
//     doc
//         .fillColor('#3D3D3D')
//         .fontSize(10)
//         .font('Helvetica-Bold')
//         .text('Authorized Signature', pageWidth - 160, y - 90);


const qrImagePath = path.resolve(__dirname, '../Asset/barcode.png');
const paytmLogo = path.resolve(__dirname, '../Asset/paytm.png');
const phonepeLogo = path.resolve(__dirname, '../Asset/phonepay.png');
const gpayLogo = path.resolve(__dirname, '../Asset/gpay.png');

let qrY = y - 30; // Safer to use +10 for spacing
doc.image(qrImagePath, pageWidth - 140, qrY, { width: 100 });

const logoY = qrY + 90;
doc.image(paytmLogo, pageWidth - 160, logoY, { width: 30 });
doc.image(phonepeLogo, pageWidth - 120, logoY, { width: 40 });
doc.image(gpayLogo, pageWidth - 70, logoY + 3, { width: 30 });

// Terms & Conditions
let termsY = logoY + 120;
if (invoiceDetails.privacyPolicyHtml) {
    doc
        .fillColor('#1E45E1')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Terms and Conditions', leftX, termsY);

    termsY += 15;

    doc
        .fontSize(9)
        .fillColor('gray')
        .font('Helvetica')
        .text(
            "Tenants must pay all dues on or before the due date, maintain cleanliness, and follow PG rules; failure may lead to penalties or termination of stay.",
            leftX,
            termsY,
            { width: 300 }
        );
}

// Authorized Signature aligned nicely near QR bottom
doc
    .fillColor('#3D3D3D')
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Authorized Signature', pageWidth - 160, logoY + 120);

    // === Footer ===
     

    // === Footer Bar ===
const sideSpacing = 20; // ⬅️ spacing from both sides

const footerHeight = 26;
const footerWidth = pageWidth - margin * 2 - sideSpacing * 2; // subtract left & right spacing
const footerX = margin + sideSpacing; // shift right to leave left spacing
const footerY = doc.page.height - margin - footerHeight;
const cornerRadius = 15;

doc.save();
doc.moveTo(footerX + cornerRadius, footerY) // start after top-left curve
    .lineTo(footerX + footerWidth - cornerRadius, footerY) // top straight line
    .quadraticCurveTo(footerX + footerWidth, footerY, footerX + footerWidth, footerY + cornerRadius) // top-right corner
    .lineTo(footerX + footerWidth, footerY + footerHeight) // right straight down
    .lineTo(footerX, footerY + footerHeight) // bottom line
    .lineTo(footerX, footerY + cornerRadius) // left straight up
    .quadraticCurveTo(footerX, footerY, footerX + cornerRadius, footerY) // top-left corner
    .fill('#1E45E1');
doc.restore();

// === Footer Text ===
doc.fillColor('white')
   .fontSize(10)
   .font('Helvetica')
   .text(`email: ${invoiceDetails.hostel_email}  |  Contact: ${invoiceDetails.hostel_phone}`, footerX, footerY + 13, {
       width: footerWidth,
       align: 'center'
   });



    doc.end();
}

module.exports = { generateInvoice };
