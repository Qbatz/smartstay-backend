const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');

function generateReceipt(data, invoiceDetails, outputPath) {
    const doc = new PDFDocument({ size: 'A4', margin: 20 });
    doc.pipe(fs.createWriteStream(outputPath));

    const margin = doc.page.margins.left;
    const pageWidth = doc.page.width;

    // Border
    doc.lineWidth(1).strokeColor('#E0E0E0')
        .rect(margin, margin, pageWidth - margin * 2, doc.page.height - margin * 2).stroke();

    // Header
    doc.rect(margin, margin, pageWidth - margin * 2, 80).fill('#1E45E1');

    // Images
    const logoPath = path.resolve(__dirname, '../Asset/Group@2x.png');
    const rectBluePath = path.resolve(__dirname, '../Asset/Rectangleblue.png');
    const locationIconPath = path.resolve(__dirname, '../Asset/location 03.png');
    const paidFullPath = path.resolve(__dirname, '../Asset/paidfull (2).png');

    doc.image(logoPath, margin + 16, margin + 10, { width: 25, height: 25 });
    doc.image(rectBluePath, 35, 194, { width: 8, height: 8 });
    doc.image(locationIconPath, 35, 215, { width: 10, height: 10 });

    // Left Header
    doc.fillColor('white')
        .fontSize(18).font('Helvetica-Bold').text('Smartstay', margin + 50, margin + 17)
        .fontSize(10).font('Helvetica').text('Meet All Your Needs.', margin + 35, margin + 49);

    // Right Header
    doc.font('Helvetica-Bold').fontSize(15).text(invoiceDetails.hname, pageWidth - margin - 150, margin + 10, { width: 200, align: 'left' })
        .font('Helvetica').fontSize(9)
        .text([invoiceDetails.haddress, invoiceDetails.harea, invoiceDetails.hcity].filter(Boolean).join(', '), pageWidth - margin - 150, margin + 28, { width: 200, align: 'left' })
        .text([invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - '), pageWidth - margin - 150, margin + 40, { width: 200, align: 'left' });

    // Title
    doc.fillColor('black').fontSize(14).font('Helvetica-Bold').text('Final Settlement Receipt', 0, margin + 100, { align: 'center' });

    // === Billing Info ===
    const leftX = margin + 30;
    const rightX = pageWidth - margin - 270;
    const infoY = margin + 140;
    const lineGap = 18;
    const fontSize = 10;
    const lineHeight = fontSize + 6;

    doc.fontSize(fontSize).fillColor('#1E45E1').font('Helvetica-Oblique').text('Bill To:', leftX, infoY);

    doc.fillColor('black').font('Helvetica');
    let currentY = infoY + lineGap;

    if (invoiceDetails.uname) {
        doc.text(invoiceDetails.uname, leftX, currentY, { width: 250 }); currentY += lineGap;
    }
    if (invoiceDetails.uphone) {
        doc.text(invoiceDetails.uphone, leftX, currentY, { width: 250 }); currentY += lineGap;
    }
    const addr1 = [invoiceDetails.uaddress, invoiceDetails.uarea].filter(Boolean).join(', ');
    if (addr1) {
        const h1 = doc.heightOfString(addr1, { width: 250 });
        doc.text(addr1, leftX, currentY, { width: 250 }); currentY += h1 + 2;
    }
    const addr2 = [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - ');
    if (addr2) {
        const h2 = doc.heightOfString(addr2, { width: 250 });
        doc.text(addr2, leftX, currentY, { width: 250 }); currentY += h2 + 2;
    }
    const addr3 = [invoiceDetails.upincode, invoiceDetails.ustate].filter(Boolean).join(' - ');
    if (addr3) {
        const h3 = doc.heightOfString(addr3, { width: 250 });
        doc.text(addr3, leftX, currentY, { width: 250 }); currentY += h3 + 2;
    }

    const formattedDate = moment(invoiceDetails.payment_date).format('DD-MM-YYYY');

    doc.font('Helvetica').fillColor('grey')
        .text('Receipt No:', rightX + 90, infoY).fillColor('black')
        .text(invoiceDetails.reference_id, rightX + 160, infoY)

        .fillColor('grey').text('Date:', rightX + 90, infoY + lineHeight).fillColor('black')
        .text(formattedDate, rightX + 160, infoY + lineHeight)

        .fillColor('grey').text('Room No:', rightX + 90, infoY + lineHeight * 2).fillColor('black')
        .text(invoiceDetails.room_no, rightX + 160, infoY + lineHeight * 2)

        .fillColor('grey').text('Payment Mode:', rightX + 90, infoY + lineHeight * 3).fillColor('black')
        .text(invoiceDetails.bank_type || invoiceDetails.payment_mode, rightX + 160, infoY + lineHeight * 3);

    // === Table Header ===
  // === Custom Header (only top corners rounded) ===
const tableY = currentY + 35;
const tableWidth = pageWidth - margin * 2 - 60;

doc.save();
doc.moveTo(leftX + 5, tableY)
    .lineTo(leftX + tableWidth - 5, tableY)
    .quadraticCurveTo(leftX + tableWidth, tableY, leftX + tableWidth, tableY + 5)
    .lineTo(leftX + tableWidth, tableY + 25)
    .lineTo(leftX, tableY + 25)
    .lineTo(leftX, tableY + 5)
    .quadraticCurveTo(leftX, tableY, leftX + 5, tableY)
    .fill('#4768EA');
doc.restore();

// === Header Text ===
doc.fillColor('white').font('Helvetica-Bold').fontSize(10)
    .text('S.No', leftX + 10, tableY + 7)
    .text('Description', leftX + 120, tableY + 7)
    .text('Amount / INR', leftX + 400, tableY + 7);

// === Table Body (horizontal borders only) ===
let y = tableY + 25;
const rowHeight = 25;

data.forEach((item, i) => {
    // Top border of row
    doc.moveTo(leftX, y).lineTo(leftX + tableWidth, y).strokeColor('#D3D3D3').stroke();

    doc.fillColor('black').font('Helvetica')
        .text(i + 1, leftX + 11, y + 7)
        .text(item.reason, leftX + 123, y + 7)
        .text(`Rs. ${item.amount.toFixed(2)}`, leftX + 400, y + 7);

    y += rowHeight;
});

// Final bottom border
doc
  .moveTo(leftX, y)
  .lineTo(leftX + tableWidth, y)
  .strokeColor('#D3D3D3')
  .lineWidth(0.1) // Ensures the line is 1px thick
  .stroke();


 // === Totals ===
    const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
    const total = subtotal + (invoiceDetails.tax || 0);
y += 30;
    doc
        .fillColor('black')
        .fontSize(10)
        .font('Helvetica')
        .text('Advance Amount', leftX + 300, y)
        .text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);

    y += 20;
    doc
        .text('Refundable Total', leftX + 300, y)
        .fontSize(10)
        .text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);
      y += 30;

doc
  .moveTo(margin, y) // Use margin instead of leftX
  .lineTo(pageWidth - margin, y) // Ends at right margin
  .lineWidth(1)
  .strokeColor('#E0E0E0')
  .stroke();


    


    // Acknowledgment
    y += 80;
    doc.fillColor('#1E45E1').font('Helvetica').fontSize(11)
        .text('Acknowledgment', leftX, y);
    y += 17;

    const ackText = `This document confirms final settlement for the Tenant on ${moment(invoiceDetails.payment_date).format('DD/MM/YYYY')}. All dues are cleared, and room has been vacated.`;
    doc.fontSize(9).fillColor('gray').font('Helvetica').text(ackText, leftX, y, { width: 300 });
      doc.fillColor('#3D3D3D').fontSize(10).font('Helvetica-Bold')
        .text('Authorized Signature', pageWidth - 160, y );

    // Footer message & signature
    doc.fillColor('#1E45E1').fontSize(10)
        .text('"Your comfort is our priority –\nSee you again at Smart Stay!"', leftX + 10, y + 100);

  

    doc.image(paidFullPath, pageWidth - 180, y + 90, { width: 100, height: 60 });

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
   .text(`email: ${invoiceDetails.hemail}  |  Contact: ${invoiceDetails.hphone}`, footerX, footerY + 13, {
       width: footerWidth,
       align: 'center'
   });




    doc.end();
}

module.exports = { generateReceipt };
