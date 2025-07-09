const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');

function generateReceipt(data, invoiceDetails, outputPath) {
  

    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(fs.createWriteStream(outputPath));

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;

    // === Outer Border (20px all around) ===
    doc
        .save()
        .lineWidth(1)
        .strokeColor('#DADADA')
        .rect(20, 20, pageWidth - 40, pageHeight - 40)
        .stroke()
        .restore();

    const logoPath = path.resolve(__dirname, '../Asset/receiptlogo.png');
    const rectBluePath = path.resolve(__dirname, '../Asset/Rectangle 77.png');
    const locationIconPath = path.resolve(__dirname, '../Asset/Subtract.png');
    const immage1 = path.resolve(__dirname, '../Asset/image 32.png');
    const locationuserPath = path.resolve(__dirname, '../Asset/usertwo.png');

    // === Header Background ===
    doc.rect(20, 20, pageWidth - 40, 70).fill('#00A32E');

    // === Logo & Tagline ===
    doc.image(logoPath, 30, 35, { width: 30, height: 30 });
    doc.image(locationuserPath, 50, 168, { width: 10, height: 10 });
    doc.image(rectBluePath, 50, 190, { width: 8, height: 8 });
    doc.image(locationIconPath, 50, 208, { width: 10, height: 10 });
    doc
        .fillColor('white')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Smartstay', 70, 40)
        .fontSize(10)
        .font('Helvetica')
        .text('Meet All Your Needs.', 45, 70);

  


let currentYq = 35;
const blockX = pageWidth - 170; // Shift left for margin
const blockWidth = 180;

doc
  .fillColor('white')
  .fontSize(12)
  .font('Helvetica-Bold')
  .text(invoiceDetails.hname, blockX, currentYq, {
    width: blockWidth,
    align: 'left',
  });

currentYq += 18;

doc.font('Helvetica').fontSize(9);

const lines = [
  [invoiceDetails.haddress, invoiceDetails.harea].filter(Boolean).join(', '),
  [invoiceDetails.hlandmark, invoiceDetails.hcity].filter(Boolean).join(' - '),
  [invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - ')
];

lines.forEach((line) => {
  if (line) {
    const textHeight = doc.heightOfString(line, {
      width: blockWidth,
      align: 'left',
    });

    doc.text(line, blockX, currentYq, {
      width: blockWidth,
      align: 'left',
    });

    currentYq += textHeight + 2; // increase Y based on actual line height
  }
});



    // === Title ===
    doc
        .fillColor('black')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Security Deposit Receipt', 0, 120, { align: 'center' });

    // === Bill To & Invoice Info ===
    const leftX = 50;
    const rightX = pageWidth - 250;
    const infoY = 150;
    const lineGap = 18;
    const fontSize = 11;
    const lineHeight = fontSize + 6;

    doc
        .fontSize(fontSize)
        .fillColor('#00A32E')
        .font('Helvetica-Oblique')
        .text('Bill To:', leftX, infoY);

    doc.fillColor('black').font('Helvetica');

    let currentY = infoY + lineGap;

    if (invoiceDetails.uname) {
        doc.text(invoiceDetails.uname, leftX + 15, currentY, { width: 250 });
        currentY += lineGap;
    }

    if (invoiceDetails.uphone) {
        doc.text(invoiceDetails.uphone, leftX + 15, currentY + 5, { width: 250 });
        currentY += lineGap;
    }

    const addressLine1 = [invoiceDetails.uaddress, invoiceDetails.uarea].filter(Boolean).join(', ');
    if (addressLine1) {
        const address1Height = doc.heightOfString(addressLine1, { width: 250 });
        doc.text(addressLine1, leftX + 15, currentY + 5, { width: 250 });
        currentY += address1Height + 2;
    }

    const addressLine2 = [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - ');
    if (addressLine2) {
        const address2Height = doc.heightOfString(addressLine2, { width: 250 });
        doc.text(addressLine2, leftX + 15, currentY + 2, { width: 450 });
        currentY += address2Height + 2;
    }

    const addressLine3 = [invoiceDetails.ustate, invoiceDetails.upincode].filter(Boolean).join(' - ');
    if (addressLine3) {
        const address3Height = doc.heightOfString(addressLine3, { width: 250 });
        doc.text(addressLine3, leftX + 15, currentY + 2, { width: 250 });
        currentY += address3Height + 2;
    }

    const formattedDate = moment(invoiceDetails.payment_date).format('DD-MM-YYYY');

    // doc
    //     .font('Helvetica')
    //     .fillColor('grey')
    //     .text('Receipt No:', rightX + 60, infoY)
    //     .fillColor('black')
    //     .text(` # ${invoiceDetails.reference_id}`, rightX + 150, infoY)

    //      .fillColor('grey')
    //     .text('Invoice Ref:', rightX + 60, infoY)
    //     .fillColor('black')
    //     .text(`# ${invoiceDetails.invoice_number}`, rightX + 150, infoY)
    //     .fillColor('grey')
    //     .text('Payment Date:', rightX + 60, infoY + lineHeight)
    //     .fillColor('black')
    //     .text(formattedDate, rightX + 150, infoY + lineHeight)
    //     .fillColor('grey')
    //     .text('Payment Mode:', rightX + 60, infoY + lineHeight * 2)
    //     .fillColor('black')
    //     .text(invoiceDetails.bank_type || invoiceDetails.payment_mode, rightX + 150, infoY + lineHeight * 2);
    doc
  .font('Helvetica')
  .fillColor('grey')
  .text('Receipt No:', rightX + 60, infoY)
  .fillColor('black')
  .text(`# ${invoiceDetails.reference_id}`, rightX + 140, infoY)

  .fillColor('grey')
  .text('Invoice Ref:', rightX + 60, infoY + lineHeight * 1.2)
  .fillColor('black')
  .text(`# ${invoiceDetails.invoice_number}`, rightX + 140, infoY + lineHeight * 1.2)

  .fillColor('grey')
  .text('Payment Date:', rightX + 60, infoY + lineHeight * 2.3)
  .fillColor('black')
  .text(formattedDate, rightX + 140, infoY + lineHeight * 2.3)

  .fillColor('grey')
  .text('Payment Mode:', rightX + 60, infoY + lineHeight * 3.6)
  .fillColor('black')
  .text(invoiceDetails.bank_type || invoiceDetails.payment_mode, rightX + 140, infoY + lineHeight * 3.6);



  

 doc
        .fillColor('#3D3D3D')
        .fontSize(11)
        .font('Helvetica-Bold')
        
        .text('Payment For',rightX - 295,infoY + 200);
    // === Amount Box ===
   const subtotal = data.reduce((sum, i) => sum + parseFloat(i.amount_received || 0), 0);
const tax = parseFloat(invoiceDetails.tax || 0);
const total = subtotal + tax;
    const boxX = 360;
    const boxY = currentY + 40;

    doc.roundedRect(boxX, boxY, 200, 60, 5)
        .strokeColor('#00B14F')
        .lineWidth(1)
        .stroke();

    doc
        .fontSize(14)
        .fillColor('#00B14F')
        .font('Helvetica-Bold')
        .text(` ${total.toFixed(2)}`, boxX - 30, boxY + 5, { align: 'center' });

    doc
        .fontSize(10)
        .fillColor('#555555')
        .font('Helvetica-Oblique')
        .text('Nine Thousand and Nine Fifty\nRupees Only', boxX - 10, boxY + 25, { align: 'center' });


        
    doc
        .fontSize(8)
        .fillColor('black')
        .font('Helvetica')
        .text('Amount received', boxX - 80, boxY + 20);

 


    // === Table Header ===
    // const tableY = boxY + 80;
    // doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#00A32E');

    // doc
    //     .fillColor('white')
    //     .font('Helvetica-Bold')
    //     .fontSize(10)
    //     .text('S.No', leftX + 10, tableY + 7)
    //     .text('Description', leftX + 120, tableY + 7)
    //     .text('Amount (INR)', leftX + 400, tableY + 7);

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
    // === Table Rows ===
const tableY = boxY + 80; // ✅ Define before using it

// === Table Header ===
doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#00A32E');

doc
    .fillColor('white')
    .font('Helvetica-Bold')
    .fontSize(10)
    .text('S.No', leftX + 10, tableY + 7)
    .text('Description', leftX + 120, tableY + 7)
    .text('Amount (INR)', leftX + 400, tableY + 7);

// === Table Rows ===
let y = tableY + 35;
doc.font('Helvetica').fillColor('black');

data.forEach((item, i) => {
    doc
        .font('Helvetica') // ensure font stays consistent
        .fontSize(10)
        .fillColor('black')
        .text(i + 1, leftX + 10, y)
        .text(item.am_name || '-', leftX + 120, y) // default to '-' if name missing
        .text((parseFloat(item.amount_received) || 0).toFixed(2), leftX + 400, y);
    y += 25;
});

// === Horizontal Line below table ===
doc
    .moveTo(leftX, y - 5)
    .lineTo(pageWidth - 50, y - 5)
    .lineWidth(1)
    .strokeColor('#BDBDBD')
    .stroke();


    

    // === Summary ===
    // y += 10;
    // doc
    //     .fillColor('black')
    //     .fontSize(10)
    //     .font('Helvetica-Bold')
    //     .text('Sub Total', leftX + 300, y)
    //     .text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);
    // y += 20;

    // doc
    //     .text('Tax', leftX + 300, y)
    //     .text(`Rs. ${tax.toFixed(2)}`, leftX + 400, y);
    // y += 20;

    // doc
    //     .font('Helvetica-Bold')
    //     .text('Total', leftX + 300, y)
    //     .fontSize(12)
    //     .fillColor('black')
    //     .text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);

           y += 30;
const outerPadding = 20;
doc
  .moveTo(outerPadding, y) 
  .lineTo(pageWidth - outerPadding, y) // Respect outer padding on right too
  .lineWidth(1)
  .strokeColor('#E0E0E0') // Light gray line like in Figma
  .stroke();



    // === Account Details ===
    y += 60;
    doc
        .fillColor('#00A32E')
        .font('Helvetica-Bold')
        .fontSize(11)
        .text('ACCOUNT DETAILS', leftX, y);
    y += 20;

    doc
        .fillColor('black')
        .font('Helvetica')
        .fontSize(10);

    doc.text(`Payment Mode   : ${invoiceDetails.bank_type || invoiceDetails.paymentmode}`, leftX, y);
    doc.text(`Received By : ${invoiceDetails.benificiary_name || " Account "}`, leftX, y + 15);
    doc.text(`Status   : Paid`, leftX, y + 30);

    // === QR or Signature Image ===
    doc.image(immage1, 430, y - 30, { width: 100, height: 70 });

    // === Terms & Signature ===
  

    y += 110;
    doc
        .fillColor('#00A32E')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Acknowledgment', leftX, y);
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
    // const footerY = pageHeight - 50;
    // const footerHeight = 30;
    // const footerX = 20;
    // const footerWidth = pageWidth - 40;

    // doc.roundedRect(footerX, footerY, footerWidth, footerHeight, 15).fill('#00A32E');

    // doc
    //     .fillColor('white')
    //     .fontSize(10)
    //     .text(`email : ${invoiceDetails.hemail}    Contact : ${invoiceDetails.hphone}`, footerX, footerY + 9, {
    //         width: footerWidth,
    //         align: 'center',
    //     });
    const footerHeight = 30;
const sideSpacing = 40; // ⬅️ Add more space from edges
const footerWidth = pageWidth - 2 * sideSpacing;
const footerX = sideSpacing;
const footerY = pageHeight - footerHeight - 20;
const radius = 15;

doc.save();
doc
  .moveTo(footerX + radius, footerY)
  .lineTo(footerX + footerWidth - radius, footerY)
  .quadraticCurveTo(footerX + footerWidth, footerY, footerX + footerWidth, footerY + radius)
  .lineTo(footerX + footerWidth, footerY + footerHeight)
  .lineTo(footerX, footerY + footerHeight)
  .lineTo(footerX, footerY + radius)
  .quadraticCurveTo(footerX, footerY, footerX + radius, footerY)
  .fill('#00A32E');
doc.restore();

const textY = footerY + 9;
const padding = 10;
const columnWidth = (footerWidth - padding * 2) / 2;

doc
  .fillColor('white')
  .fontSize(10)
  .font('Helvetica')
  .text(`email: ${invoiceDetails.hemail}`, footerX + padding, textY, {
    width: columnWidth,
    align: 'center'
  })
  .text(`Contact: ${invoiceDetails.hphone}`, footerX + columnWidth + padding, textY, {
    width: columnWidth,
    align: 'center'
  });

    doc.end();
}

module.exports = { generateReceipt };
