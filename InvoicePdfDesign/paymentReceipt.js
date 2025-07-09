const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');

function generateReceipt(data, invoiceDetails, outputPath) {
 
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(fs.createWriteStream(outputPath));

    const pageWidth = doc.page.width;
    const pageHeight = doc.page.height;
    const outerPadding = 20;
     

    // ==== Outer Border ====
    doc.lineWidth(1)
        .strokeColor('#DADADA')
        .roundedRect(outerPadding, outerPadding, pageWidth - 2 * outerPadding, pageHeight - 2 * outerPadding, 10)
        .stroke();

    // ==== Green Header ====
    const headerHeight = 90;
    doc.rect(outerPadding, outerPadding, pageWidth - 2 * outerPadding, headerHeight)
        .fill('#00A32E');

    // ==== Logo and Host Details ====
    const logoPath = path.resolve(__dirname, '../Asset/receiptlogo.png');
    const contactIconPath = path.resolve(__dirname, '../Asset/image 32.png');
    const stampPath = path.resolve(__dirname, '../Asset/payment_stamp.png'); 
      const rectBluePath = path.resolve(__dirname, '../Asset/Rectangle 77.png');
     const locationIconPath = path.resolve(__dirname, '../Asset/Subtract.png');
     const locationuserPath = path.resolve(__dirname, '../Asset/usertwo.png');

    doc.image(logoPath, outerPadding + 10, outerPadding + 20, { width: 30, height: 30 });

      doc.image(locationuserPath, 50, 188, { width: 8, height: 8 });
    doc.image(rectBluePath, 50, 203, { width: 8, height: 8 });
    doc.image(locationIconPath, 50, 220, { width: 10, height: 10 });
    doc
        .fillColor('white')
        .font('Helvetica-Bold').fontSize(18)
        .text('Smartstay', outerPadding + 50, outerPadding + 20)
        .font('Helvetica').fontSize(10)
        .text('Meet All Your Needs', outerPadding + 40, outerPadding + 50);

    doc
        .fillColor('white')
        .font('Helvetica-Bold').fontSize(12)
        .text(invoiceDetails.hname, pageWidth - outerPadding - 120, outerPadding + 20, {
            width: 180, align: 'left'
        })
        .font('Helvetica').fontSize(9)
        .text([invoiceDetails.haddress, invoiceDetails.harea].filter(Boolean).join(', '), {
            width: 180, align: 'left'
        })
        .text([invoiceDetails.hlandmark, invoiceDetails.hcity].filter(Boolean).join(' - '), {
            width: 180, align: 'left'
        })
        .text([invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - '), {
            width: 180, align: 'left'
        });

    // ==== Title ====
    doc
        .fillColor('black')
        .font('Helvetica-Bold').fontSize(14)
        .text('Payment Receipt', 0, outerPadding + headerHeight + 30, { align: 'center' });

    // ==== Bill To ====
    const leftX = outerPadding + 30;
    const rightX = pageWidth - outerPadding - 230;
    let infoY = outerPadding + headerHeight + 60;
    const lineGap = 18;
    const lineHeight = 14;

    doc
        .fontSize(10)
        .fillColor('#00A32E')
        .font('Helvetica-Oblique')
        .text('Bill To:', leftX - 3, infoY);

    doc.fillColor('black').font('Helvetica');
    infoY += lineGap;

    if (invoiceDetails.uname) {
        doc.text(invoiceDetails.uname, leftX + 16, infoY); infoY += lineGap;
    }
    if (invoiceDetails.uphone) {
        doc.text(
            `+${invoiceDetails.uphone}`, leftX + 16, infoY); infoY += lineGap;
    }

    const addressLines = [
        [invoiceDetails.uaddress, invoiceDetails.uarea].filter(Boolean).join(', '),
        
        [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - '),
        [invoiceDetails.ustate, invoiceDetails.upincode].filter(Boolean).join(' - ')
    ];
    addressLines.forEach(line => {
        if (line) {
            doc.text(line, leftX + 16, infoY);
            infoY += lineGap -4 
        }
    });

    const formattedDate = moment(invoiceDetails.payment_date).format('DD-MM-YYYY');
    const formattedDueDate = moment(invoiceDetails.DueDate).format('DD-MM-YYYY');

    doc.fillColor('gray').font('Helvetica').fontSize(10);
    const rightStartY = outerPadding + headerHeight + 60;
    doc.text('Receipt No:', rightX + 60, rightStartY);
    doc.text('Invoice Ref:', rightX + 60, rightStartY + lineHeight * 1.3);
    doc.text('Date:', rightX + 60, rightStartY + lineHeight * 2.6);
    doc.text('Payment Mode:', rightX + 60, rightStartY + lineHeight * 4);

    doc.fillColor('black');
    doc.text( `# ${invoiceDetails.reference_id}`, rightX + 130, rightStartY);
    doc.text(`# ${invoiceDetails.invoice_number}`, rightX + 130, rightStartY + lineHeight * 1.3);
    doc.text(formattedDate, rightX + 130, rightStartY + lineHeight * 2.6);
    doc.text(invoiceDetails.bank_type || invoiceDetails.payment_mode, rightX + 135, rightStartY + lineHeight * 4);

    // ==== Table Header ====
    // const tableY = rightStartY + 100;
    // doc.roundedRect(leftX, tableY, pageWidth - 2 * outerPadding - 40, 25, 5).fill('#00A32E');

    // doc
    //     .fillColor('white')
    //     .font('Helvetica-Bold').fontSize(10)
    //     .text('S.NO', leftX + 10, tableY + 7)
    //     .text('Inv No', leftX + 70, tableY + 7)
    //     .text('Description', leftX + 150, tableY + 7)
    //     .text('Duration', leftX + 300, tableY + 7)
    //     .text('Amount / INR', leftX + 420, tableY + 7);

    // // ==== Table Rows ====
    // let y = tableY + 30;
    // const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
    // const tax = invoiceDetails.tax || 0;
    // const total = subtotal + tax;

    // doc.fillColor('black').font('Helvetica').fontSize(10);
    // data.forEach((item, i) => {
    //     doc
    //         .text(i + 1, leftX + 10, y)
    //         .text(item.invoice_number || '-', leftX + 70, y)
    //         .text(item.am_name, leftX + 150, y)
    //         .text(item.month, leftX + 300, y)
    //         .text((item.amount ?? 0).toFixed(2), leftX + 420, y);
    //     y += 25;
    // });
const tableY = rightStartY + 100;

doc.roundedRect(leftX, tableY, pageWidth - 2 * outerPadding - 50, 25, 5).fill('#00A32E');

doc
    .fillColor('white')
    .font('Helvetica-Bold').fontSize(10)
    .text('S.NO', leftX + 10, tableY + 7)
    .text('Inv No', leftX + 70, tableY + 7)
    .text('Description', leftX + 150, tableY + 7)
    .text('Duration', leftX + 300, tableY + 7)
    .text('Amount / INR', leftX + 420, tableY + 7);

// === Table Rows ===
// let y = tableY + 30;
// const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
// const tax = invoiceDetails.tax || 0;
// const total = subtotal + tax;

// doc.fillColor('black').font('Helvetica').fontSize(10);
// data.forEach((item, i) => {
//     doc
//         .text(i + 1, leftX + 10, y)
//         .text(item.invoice_number || '-', leftX + 70, y)
//         .text(item.am_name, leftX + 150, y)
//         .text(item.month, leftX + 300, y)
//         .text((item.amount ?? 0).toFixed(2), leftX + 420, y);
//     y += 25;
// });
let y = tableY + 30;
const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
const tax = invoiceDetails.tax || 0;
const total = subtotal + tax;

doc.fillColor('black').font('Helvetica').fontSize(10);

data.forEach((item, i) => {
    doc
        .text(i + 1, leftX + 10, y)
        .text(item.invoice_number || '-', leftX + 70, y)
        .text(item.am_name, leftX + 150, y)
        .text(moment(item?.created_at).format("MMM YYYY"), leftX + 300, y)
        .text((item.amount ?? 0).toFixed(2), leftX + 420, y);

    // Horizontal line after each row
    doc
        .moveTo(leftX , y + 15)
        .lineTo(leftX + 505, y + 15)
        .strokeColor('#D9D9D9') // light grey (optional)
        .lineWidth(0.10)
        .stroke();

    y += 25;
});

// === Horizontal Line Below Rows ===
// doc
//     .moveTo(leftX, y - 5)
//     .lineTo(pageWidth - outerPadding - 20, y - 5)
//     .lineWidth(1)
//     .strokeColor('#DADADA')
//     .stroke();
    // ==== Total Section ====
    y += 10;
    doc
        .font('Helvetica')
        .text('Sub Total', leftX + 300, y)
        .text(`${subtotal.toFixed(2)}`, leftX + 420, y);
    y += 20;
    doc
        .text('Total', leftX + 300, y)
        .fontSize(12)
        .fillColor('black')
        .text(`${total.toFixed(2)}`, leftX + 420, y);


      y += 30;

doc
  .moveTo(outerPadding, y) // Use outerPadding instead of margin
  .lineTo(pageWidth - outerPadding, y) // Respect outer padding on right too
  .lineWidth(1)
  .strokeColor('#E0E0E0') // Light gray line like in Figma
  .stroke();

    // ==== "PAYMENT RECEIVED" stamp ====
    if (fs.existsSync(stampPath)) {
        doc.image(stampPath, leftX + 380, tableY + 130, { width: 120 });
    }

    // ==== Payment Details ====
    y += 80;
    doc.fillColor('#00A32E').fontSize(11).font('Helvetica-Bold').text('PAYMENT DETAILS', leftX, y);
    y += 20;

    doc.fillColor('black').fontSize(10).font('Helvetica');
    doc.text(`Payment Mode : ${invoiceDetails.bank_type || invoiceDetails.payment_mode}`, leftX, y); y += 15;
    doc.text(`Transaction ID: ${invoiceDetails.trans_id || '—'}`, leftX, y); y += 15;
    doc.text(`Received By : ${invoiceDetails.benificiary_name || "Account"}`, leftX, y); y += 15;
    doc.text(`Status : Paid`, leftX, y);

    // ==== Contact Image ====
    doc.image(contactIconPath, pageWidth - outerPadding - 130, y - 40, { width: 100 });

    // ==== Acknowledgment ====
    y += 80;
    doc.fillColor('#00A32E').font('Helvetica-Bold').fontSize(10).text('Acknowledgment', leftX, y);
    y += 15;
    doc.fillColor('gray').font('Helvetica').fontSize(9)
        .text(invoiceDetails.terms || 'Once payment is confirmed, this invoice shall be treated as paid. Services availed are calculated based on service rules.', leftX, y, { width: 350 });

    doc
        .fillColor('#3D3D3D')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Authorized Signature', pageWidth - outerPadding - 150, y + 10);

    // ==== Footer ====
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
