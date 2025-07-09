const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');

function generateInvoice(data, invoiceDetails, outputPath) {
  
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(fs.createWriteStream(outputPath));
 const margin = 20;
    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const outerPadding = 20;
    const contentStartY = outerPadding + 90 + 20; // 90 header + 20 gap = 130

    // === Draw Outer Rounded Border ===
    doc
        .lineWidth(1)
        .strokeColor('#D9D9D9')
        .roundedRect(outerPadding, outerPadding, pageWidth - 2 * outerPadding, pageHeight - 2 * outerPadding, 10)
        .stroke();

    // === Header Background Inside Border ===
    doc
        .save()
        .fillColor('#1E45E1')
        .rect(outerPadding, outerPadding, pageWidth - 2 * outerPadding, 90)
        .fill()
        .restore();

    // === Assets ===
    const logoPath = path.resolve(__dirname, '../Asset/Group@2x.png');
      const rectBluePath = path.resolve(__dirname, '../Asset/Rectangleblue.png');
     const locationIconPath = path.resolve(__dirname, '../Asset/location 03.png');
     const locationuserPath = path.resolve(__dirname, '../Asset/user.png');

    // === Logo & Tagline ===
    doc.image(logoPath, outerPadding + 16, outerPadding + 15, { width: 25, height: 25 });
  

      doc.image(locationuserPath, 35, 198, { width: 8, height: 8 });
    doc.image(rectBluePath, 35, 215, { width: 8, height: 8 });
    doc.image(locationIconPath, 35, 233, { width: 10, height: 10 });

    const logoTextY = outerPadding + 20; 
const subtitleY = logoTextY + 24;


    // doc
    //     .fillColor('white')
    //     .fontSize(18)
    //     .font('Helvetica-Bold')
    //     .text('Smartstay', outerPadding + 50, outerPadding + 10)
    //     .fontSize(10)
    //     .font('Helvetica')
    //     .text('Meet All Your Needs.', outerPadding + 50, outerPadding + 30);
    doc
  .fillColor('white')
  .fontSize(18)
  .font('Helvetica-Bold')
  .text('Smartstay', outerPadding + 45, logoTextY)
  .fontSize(10)
  .font('Helvetica')
  .text('Meet All Your Needs.', outerPadding + 30, subtitleY);

    // === Hostel Details Right ===
    doc
        .fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(invoiceDetails.Hostel_Name, pageWidth - 150, outerPadding + 10, { width: 200, align: 'left' })
        .font('Helvetica')
        .fontSize(9)
        .text(
            [invoiceDetails.hostel_address, invoiceDetails.harea].filter(Boolean).join(', '),
            pageWidth - 150,
            outerPadding + 30,
            { width: 200, align: 'left' }
        )
        .text(
            [invoiceDetails.hlandmark, invoiceDetails.hcity].filter(Boolean).join(' - '),
            pageWidth - 150,
            outerPadding + 42,
            { width: 200, align: 'left' }
        )
        .text(
            [invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - '),
            pageWidth - 150,
            outerPadding + 54,
            { width: 200, align: 'left' }
        );

    // === Payment Invoice Title ===
    // doc
    //     .fillColor('black')
    //     .fontSize(14)
    //     .font('Helvetica-Bold')
    //     .text('Payment Invoice', 0, outerPadding + 100, { align: 'center' });
    const invoiceTitleY = outerPadding + 120; // You can tweak this value (e.g., 130)
doc
  .fillColor('black')
  .fontSize(14)
  .font('Helvetica-Bold')
  .text('Payment Invoice', 0, invoiceTitleY, { align: 'center' });

    // === Bill To & Invoice Info ===
    const leftX = outerPadding + 30;
    const rightX = pageWidth - 250;
    const infoY = contentStartY +50;
    const lineGap = 18;
    const fontSize = 10;
    const lineHeight = fontSize + 6;
    

    doc
        .fontSize(10)
        .fillColor('#1E45E1')
        .font('Helvetica-Bold')
        .text('Bill To:', leftX, infoY);

    doc.fillColor('black').font('Helvetica');
    let currentY = infoY + lineGap;

    if (invoiceDetails.Name) {
        doc.text(invoiceDetails.Name, leftX, currentY); currentY += lineGap;
    }
    if (invoiceDetails.phoneNo) {
        doc.text(invoiceDetails.phoneNo, leftX, currentY); currentY += lineGap;
    }

    const addressLine1 = [invoiceDetails.UserAddress, invoiceDetails.uarea].filter(Boolean).join(', ');
    if (addressLine1) {
        doc.text(addressLine1, leftX, currentY, { width: 250 }); currentY += lineGap;
    }

    const addressLine2 = [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - ');
    if (addressLine2) {
        doc.text(addressLine2, leftX, currentY, { width: 250 }); currentY += lineGap;
    }

    const addressLine3 = [invoiceDetails.ustate, invoiceDetails.upincode].filter(Boolean).join(' - ');
    if (addressLine3) {
        doc.text(addressLine3, leftX, currentY, { width: 250 }); currentY += lineGap;
    }

    // const formattedDate = moment(invoiceDetails.Date).format('DD-MM-YYYY');
    // const formattedDueDate = moment(invoiceDetails.DueDate).format('DD-MM-YYYY');
//  const formattedDate = new Date(invoiceDetails.Date).toISOString().substring(0, 10);
const utcDate = new Date(invoiceDetails.Date);
const formattedDate = utcDate.toLocaleDateString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const utcDate2 = new Date(invoiceDetails.DueDate);
const formattedDueDate = utcDate2.toLocaleDateString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const utcDate3 = new Date(invoiceDetails.joining_Date);
const formattedJoiningDate = utcDate3.toLocaleDateString('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
// const formattedDueDate =new Date(invoiceDetails.DueDate).toISOString().substring(0, 10);
    doc
        .font('Helvetica')
        .fillColor('grey')
        .text('Invoice No:', rightX + 90, infoY)
        .fillColor('black')
        .text(invoiceDetails.Invoices, rightX + 150, infoY)
        .fillColor('grey')
        .text('Invoice Date:', rightX + 90, infoY + lineHeight)
        .fillColor('black')
        .text(formattedDate, rightX + 150, infoY + lineHeight)
        .fillColor('grey')
        .text('Due Date:', rightX + 90, infoY + lineHeight * 2)
        .fillColor('black')
        .text(formattedDueDate, rightX + 150, infoY + lineHeight * 2)
         .fillColor('grey')
        .text('Joining Date:', rightX + 90, infoY + lineHeight * 3)
        .fillColor('black')
        .text(formattedJoiningDate, rightX + 150, infoY + lineHeight * 3);

    // === Table Header ===
    // const tableY = contentStartY + 120;
    // doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#4768EA');

    // doc
    //     .fillColor('white')
    //     .font('Helvetica-Bold')
    //     .fontSize(10)
    //     .text('S.No', leftX + 10, tableY + 7)
    //     .text('Description', leftX + 120, tableY + 7)
    //     .text('Amount', leftX + 400, tableY + 7);

    // // === Table Rows ===
    // let y = tableY + 35;
    // doc.font('Helvetica').fillColor('black');
    // data.forEach((item, i) => {
    //     doc
    //         .text(i + 1, leftX + 10, y)
    //         .text(item.am_name, leftX + 120, y)
    //         .text((item.amount ?? 0).toFixed(2), leftX + 400, y);
    //     y += 25;
    // });


    const tableY = contentStartY + 160;
doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#4768EA');

doc
    .fillColor('white')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('S.No', leftX + 10, tableY + 7)
    .text('Description', leftX + 120, tableY + 7)
    .text('Amount', leftX + 400, tableY + 7);

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

// === HR line after table rows ===
doc
    .moveTo(leftX, y - 7) // start a bit above the gap
    .lineTo(pageWidth - leftX, y - 7)
    .lineWidth(0.5)
    .strokeColor('#D9D9D9')
    .stroke();


    

    // === Summary Section ===
    const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
    const tax = invoiceDetails.tax || 0;
    const total = subtotal + tax;

    y += 10;
    doc
        .fillColor('#1E45E1')
        .fontSize(10)
        .text('"Your comfort is our priority –\nSee you again at Smart Stay!"', leftX + 10, y + 10);

    doc
        .fillColor('black')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Sub Total', leftX + 300, y)
        .text(`Rs.${subtotal.toFixed(2)}`, leftX + 400, y);

    y += 20;
    doc.text('Tax', leftX + 300, y).text(`Rs.${tax.toFixed(2)}`, leftX + 400, y);

    y += 20;
    doc
        .font('Helvetica-Bold')
        .text('Total', leftX + 300, y)
        .fontSize(12)
        .fillColor('black')
        .text(`Rs.${total.toFixed(2)}`, leftX + 400, y);

          y += 22;
    doc
        .moveTo(margin, y)
        .lineTo(pageWidth - margin, y)
        .strokeColor('#E0E0E0')
        .stroke();

    // === Account Details ===
    y += 40;
    doc
        .fillColor('#1E45E1')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('ACCOUNT DETAILS', leftX, y);

    y += 20;
    doc.fillColor('black').font('Helvetica').fontSize(10);
    const labelX = leftX;
    const valueX = leftX + 100;
    let accountY = y;

    doc.text("Account No", labelX, accountY);
    doc.text(`: ${invoiceDetails.acc_num || " NA "}`, valueX, accountY); accountY += 15;
    doc.text("IFSC Code", labelX, accountY);
    doc.text(`: ${invoiceDetails.ifsc_code || " NA "}`, valueX, accountY); accountY += 15;
    doc.text("Bank Name", labelX, accountY);
    doc.text(`: ${invoiceDetails.acc_name || " NA "}`, valueX, accountY); accountY += 15;
    doc.text("UPI ID", labelX, accountY);
    doc.text(`: ${invoiceDetails.upi_id || " NA "}`, valueX, accountY); accountY += 15;


    const qrImagePath = path.resolve(__dirname, '../Asset/barcode.png');
const paytmLogo = path.resolve(__dirname, '../Asset/paytm.png');
const phonepeLogo = path.resolve(__dirname, '../Asset/phonepay.png');
const gpayLogo = path.resolve(__dirname, '../Asset/gpay.png');

let qrY = y - 30; 
doc.image(qrImagePath, pageWidth - 140, qrY, { width: 100 });

const logoY = qrY + 90;
doc.image(paytmLogo, pageWidth - 160, logoY, { width: 30 });
doc.image(phonepeLogo, pageWidth - 120, logoY, { width: 40 });
doc.image(gpayLogo, pageWidth - 70, logoY + 3, { width: 30 });

    // === Terms and Conditions & Signature ===
    y = accountY + 80;
    doc
        .fillColor('#1E45E1')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Terms and Conditions', leftX, y);
    y += 15;

    doc
        .fontSize(9)
        .fillColor('gray')
        .font('Helvetica')
        .text(invoiceDetails.privacyPolicyHtml || 'No refunds after due date.', leftX, y, { width: 300 });

    doc
        .fillColor('#3D3D3D')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Authorized Signature', pageWidth - 160, y - 10);

    // === Footer ===
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
