const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');
const axios = require('axios');
const request = require('sync-request');
const numberToWords = require('number-to-words');





async function generateReceipt(data, invoiceDetails, outputPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  doc.pipe(fs.createWriteStream(outputPath));

  console.log("invoiceDetails", invoiceDetails)
  doc.registerFont('Gilroy-Bold', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Bold_0.ttf'));
  doc.registerFont('Gilroy-Regular', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Regular_0.ttf'));
  doc.registerFont('Gilroy-Medium', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Medium_0.ttf'));
  console.log(path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Bold_0.ttf'));



  await drawOuterBorder(doc);
  await drawHeader(doc, invoiceDetails);
  await drawInvoiceHeading(doc, 'Final Settlement Receipt');
  await drawBillToSection(doc, invoiceDetails);
  await drawInvoiceDetails(doc, invoiceDetails);
     await drawInvoiceTable(doc, data, invoiceDetails);
  
  const signatureEndY = drawTermsAndSignature(doc, invoiceDetails);
drawNotes(doc, invoiceDetails, signatureEndY);
  await drawFooter(doc, invoiceDetails);

  doc.end();
}


function drawOuterBorder(doc) {
  const margin = 20;
  const pageWidth = doc.page.width;
  const pageHeight = doc.page.height;
  const radius = 10;

  doc.lineWidth(1)
    .strokeColor('#E0E0E0')
    .roundedRect(
      margin,
      margin,
      pageWidth - margin * 2,
      pageHeight - margin * 2,
      radius
    )
    .stroke();
}





async function drawHeader(doc, invoiceDetails) {
  const margin = 20;
  const pageWidth = doc.page.width;
  const headerHeight = 80;

  drawHeaderBackground(doc, margin, pageWidth, headerHeight);
  await drawLogo(doc, invoiceDetails, margin);
  drawHostelDetails(doc, invoiceDetails, pageWidth);
}

function drawHeaderBackground(doc, margin, pageWidth, headerHeight) {
  const radius = 10;
  const x = margin;
  const y = margin;
  const w = pageWidth - margin * 2;
  const h = headerHeight;

  doc.moveTo(x + radius, y)
    .lineTo(x + w - radius, y)
    .quadraticCurveTo(x + w, y, x + w, y + radius)
    .lineTo(x + w, y + h)
    .lineTo(x, y + h)
    .lineTo(x, y + radius)
    .quadraticCurveTo(x, y, x + radius, y)
    .fill('#1E45E1');
}




async function drawLogo(doc, invoiceDetails, margin) {
  const logoPath = path.resolve(__dirname, '../Asset/Group@2x.png');
  const x = margin + 18;
  const y = 34;
  const width = 100;
  const height = 60;
  const radius = 2;

  try {
    doc.save();
    doc.roundedRect(x, y, width, height, radius).clip();

    if (invoiceDetails.logo_url) {
      const url = encodeURI(invoiceDetails.logo_url);
      const { data: imageBuffer } = await axios.get(url, { responseType: 'arraybuffer' });
      doc.image(imageBuffer, x, y, { width, height });
    } else {
      doc.image(logoPath, x, y, { width, height });
    }


    doc.restore();
  } catch (err) {
    console.error("Failed to load remote logo:", err.message);
    doc.save();
    doc.roundedRect(x, y, width, height, radius).clip();
    doc.image(logoPath, x, y, { width, height });
    doc.restore();
  }
}


function drawHostelDetails(doc, invoiceDetails, pageWidth) {
  const hostelInfoX = pageWidth - 200;
  const hostelInfoWidth = 150;

  doc.fillColor('white')
    .fontSize(14)
    .font('Gilroy-Bold')
    .text(invoiceDetails.hname || '', hostelInfoX, 30, { width: hostelInfoWidth });

  doc.fontSize(9).font('Gilroy-Bold');


  const lines = [
    [invoiceDetails.haddress, invoiceDetails.harea]
      .filter(v => v && v.trim() !== '')
      .join(', '),


    (() => {
      const parts = [invoiceDetails.hlandmark, invoiceDetails.hcity].filter(v => v && v.trim() !== '');
      return parts.length === 2 ? parts.join(' - ') : (parts[0] || '');
    })(),


    (() => {
      const parts = [invoiceDetails.hstate, invoiceDetails.hpincode ? invoiceDetails.hpincode.toString() : '']
        .filter(v => v && v.trim() !== '');
      return parts.length === 2 ? parts.join(' - ') : (parts[0] || '');
    })()
  ];



  const nonEmptyLines = lines.filter(line => line && line.trim() !== '');


  let y = 52;

  nonEmptyLines.forEach((line, index) => {
    doc.fillColor('white').text(line, hostelInfoX, y, { width: hostelInfoWidth });

    if (index === 0) {
      y += 12;
    } else {
      y += 12;
    }
  });


}


function drawInvoiceHeading(doc, headingText) {
  const x = 230;
  const y = 130;
  const paddingX = 10;
  const paddingY = 4;


  doc.font('Gilroy-Bold').fontSize(15);
  const textWidth = doc.widthOfString(headingText);
  const textHeight = doc.currentLineHeight();

  doc
    .roundedRect(
      x - paddingX,
      y - paddingY,
      textWidth + paddingX * 2,
      textHeight + paddingY * 2,
    )
    .fill('#fff');

  doc
    .fillColor('#1E45E1')
    .text(headingText, x, y, { align: 'left', continued: false });


  doc.fillColor('#1E45E1');
}



function drawBillToSection(doc, invoiceDetails) {
  const leftX = 50;
  const infoY = 170;
  const lineGap = 18;


  doc.fillColor('#1E45E1').font('Gilroy-Bold').fontSize(10).text('Bill To:', leftX, infoY);
  doc.fillColor('black').font('Gilroy-Medium');

  let y = infoY + lineGap;

  function drawIconText(iconPath, text) {
    if (!text) return;
    doc.image(iconPath, leftX, y - 2, { width: 10, height: 10 });
    doc.text(text, leftX + 15, y);
    y += lineGap;
  }


  const profileIcon = path.resolve(__dirname, '../Asset/user.png');
  const phoneIcon = path.resolve(__dirname, '../Asset/call.png');
  const bedIcon = path.resolve(__dirname, '../Asset/bed.png');
  const locationIcon = path.resolve(__dirname, '../Asset/location.png');


  drawIconText(profileIcon, invoiceDetails.uname);
  drawIconText(phoneIcon, invoiceDetails.uphone);
  drawIconText(bedIcon, invoiceDetails.uRooms ? `${invoiceDetails.uRooms} - ${invoiceDetails.uBed}` : null);


  const safe = value => {
    if (value == null) return '';
    if (String(value).toLowerCase() === 'undefined') return '';
    if (String(value).toLowerCase() === 'null') return '';
    return value;
  };


  const addressText = [
    [safe(invoiceDetails.uaddress), safe(invoiceDetails.uarea)].filter(Boolean).join(', '),
    [safe(invoiceDetails.ulandmark), safe(invoiceDetails.ucity)].filter(Boolean).join(' - '),
    [safe(invoiceDetails.ustate), safe(invoiceDetails.upincode)].filter(Boolean).join(' - ')
  ].filter(line => line.trim()).join('\n');

  if (addressText) {
    doc.image(locationIcon, leftX, y - 2, { width: 10, height: 10 });
    doc.font('Gilroy-Medium').text(addressText, leftX + 15, y, { width: 450 });
    y += doc.heightOfString(addressText, { width: 250 }) + 2;
  }




}


function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d)) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}-${month}-${year}`;
}

function drawInvoiceDetails(doc, invoiceDetails) {
  const rightX = 350;
  const startY = 170;
  const lineGap = 18;


  doc.font('Gilroy-Regular').fontSize(10)
    .fillColor('#808080')
    .text('Receipt No: ', rightX, startY, { continued: true })
    .fillColor('#000000')
    .text(invoiceDetails.reference_id || '');
 

  doc.fillColor('#808080')
    .text('Date: ', rightX, startY + lineGap * 2, { continued: true })
    .fillColor('#000000')
    .text(formatDate(invoiceDetails.payment_date));


    doc.fillColor('#808080')
  .text('Room No: ', rightX, startY + lineGap, { continued: true })
  .fillColor('#000000')
  .text(invoiceDetails.uRooms && invoiceDetails.uBed
    ? `${invoiceDetails.uRooms} - ${invoiceDetails.uBed}`
    : invoiceDetails.uRooms || '-'
  );



  doc.fillColor('#808080')
    .text('Payment Mode : ', rightX, startY + lineGap * 3, { continued: true })
    .fillColor('#000000')
    .text(invoiceDetails.banking.type);
}









function drawInvoiceTable(doc, data, invoiceDetails) {

console.log("Data***  Final settle ment",data)

    const leftX = 50;
    const tableY = 280;
    const tableWidth = doc.page.width - 100;


    doc.roundedRect(leftX, tableY, tableWidth, 25, 5).fill('#4768EA');
    doc.font('Gilroy-Regular').fillColor('white').font('Gilroy-Bold').fontSize(10)
        .text('S.No', leftX + 10, tableY + 7)
               .text('Description', leftX + 200, tableY + 7)
        .text('Amount (INR)', leftX + 400, tableY + 7);

  
    let y = tableY + 35;
    doc.font('Gilroy-Regular').fillColor('black');
    data.forEach((item, i) => {
        doc.text(i + 1, leftX + 10, y)
                      .text(item.reason || '-', leftX + 200, y)
            .text((item?.amount ?? 0).toFixed(2), leftX + 400, y);
        y += 25;
    });


    const RefundableTotal = data
  .filter(item => item.am_name?.toLowerCase() !== 'advance') 
  .reduce((sum, item) => sum + (item.amount || 0), 0);

    const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
   
    const total = subtotal - RefundableTotal ;





    y += 10;
    doc.moveTo(leftX, y).lineTo(leftX + tableWidth, y).strokeColor('#E0E0E0').lineWidth(1).stroke();

    y += 10;
    doc.font('Gilroy-Regular').text('Advance Amount', leftX + 300, y).text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);
       y += 20;
    doc.font('Gilroy-Regular').text('Refundable Amount', leftX + 300, y).text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);

}


async function drawTermsAndSignature(doc, invoiceDetails) {
    let y = 700;
    const leftX = 50;
    const rightX = 400;

    doc.fillColor('#1E45E1')
        .font('Gilroy-Bold')
        .fontSize(10)
        .text('Terms and Conditions', leftX, y);

   
    if (invoiceDetails.digital_signature_url) {
        const response = await axios.get(invoiceDetails.digital_signature_url, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data, 'binary');

        const signatureWidth = 100;
        const signatureHeight = 60;
        const sigX = rightX + 50;
        const sigY = y - signatureHeight - 5;

        doc.image(imageBuffer, sigX, sigY, {
            width: signatureWidth,
            height: signatureHeight
        });
    }

    doc.fillColor('black')
        .font('Gilroy-Bold')
        .fontSize(10)
        .text('Authorized Signature', rightX, y, { align: 'right', width: 150 });

    y += 15;

    doc.fontSize(9)
        .fillColor('gray')
        .font('Gilroy-Medium')
        .text(
            invoiceDetails.terms_and_condition
                ? invoiceDetails.terms_and_condition
                : "Tenants must pay all dues on or before the due date, maintain cleanliness, and follow PG rules; failure may lead to penalties or termination of stay.",
            leftX,
            y,
            { width: 300 }
        );
         return doc.y;
}


function drawNotes(doc, invoiceDetails, startY) {
  const paidIcon = path.resolve(__dirname, '../Asset/paidfull (2).png');
  const pageWidth = doc.page.width;
  const margin = 50;

 
  const text = invoiceDetails.notes
    ? invoiceDetails.notes.replace(/<br\s*\/?>/gi, '\n') 
    : "Thank you for choosing SmartStay.\nYour transaction is completed.";

  const imageSize = 70;
  const imageX = pageWidth - margin - imageSize; 
  const imageY = startY + 30; 

  doc.fontSize(10)
    .fillColor('#1E45E1')
    .text(text, margin, imageY, {
      width: pageWidth - margin * 2 - imageSize - 10, 
      align: 'left'
    });

  doc.image(paidIcon, imageX, imageY, { width: imageSize, height: imageSize });
}







function drawFooter(doc, invoiceDetails) {
  const margin = 20;
  const pageWidth = doc.page.width;
  const footerHeight = 26;
  const sideSpacing = 60;
  const footerWidth = pageWidth - margin * 2 - sideSpacing * 2;
  const footerX = margin + sideSpacing;
  const footerY = doc.page.height - margin - footerHeight;
  const cornerRadius = 20;
  const padding = 30;  

 
  doc.save();
  doc.moveTo(footerX + cornerRadius, footerY)
    .lineTo(footerX + footerWidth - cornerRadius, footerY)
    .quadraticCurveTo(footerX + footerWidth, footerY, footerX + footerWidth, footerY + cornerRadius)
    .lineTo(footerX + footerWidth, footerY + footerHeight)
    .lineTo(footerX, footerY + footerHeight)
    .lineTo(footerX, footerY + cornerRadius)
    .quadraticCurveTo(footerX, footerY, footerX + cornerRadius, footerY)
    .fill('#1E45E1');
  doc.restore();

  doc.fillColor('white').fontSize(10).font('Gilroy-Medium');


  doc.text(`email: ${invoiceDetails.common_email ? invoiceDetails.common_email : invoiceDetails.hemail}`, footerX + padding, footerY + 13);

 
  const phoneText = `Contact: ${invoiceDetails.common_contact_number ?  invoiceDetails.common_contact_number : invoiceDetails.hphone}`;
  const phoneTextWidth = doc.widthOfString(phoneText);

  doc.text(phoneText, footerX + footerWidth - phoneTextWidth - padding, footerY + 13);
}






module.exports = { generateReceipt };



























// function generateReceipt(data, invoiceDetails, outputPath) {
//      console.log("invoiceDetails...?",invoiceDetails)
//       console.log("data.....?",data)
//     const doc = new PDFDocument({ size: 'A4', margin: 20 });
//     doc.pipe(fs.createWriteStream(outputPath));

//     const margin = doc.page.margins.left;
//     const pageWidth = doc.page.width;

//     // Border
//     doc.lineWidth(1).strokeColor('#E0E0E0')
//         .rect(margin, margin, pageWidth - margin * 2, doc.page.height - margin * 2).stroke();

//     // Header
//     doc.rect(margin, margin, pageWidth - margin * 2, 80).fill('#1E45E1');

//     // Images
//     const logoPath = path.resolve(__dirname, '../Asset/Group@2x.png');
//     const rectBluePath = path.resolve(__dirname, '../Asset/Rectangleblue.png');
//     const locationIconPath = path.resolve(__dirname, '../Asset/location 03.png');
//     const paidFullPath = path.resolve(__dirname, '../Asset/paidfull (2).png');
//     const locationuserPath = path.resolve(__dirname, '../Asset/user.png');

 
//     doc.image(logoPath, margin + 16, margin + 10, { width: 25, height: 25 });
//     doc.image(locationuserPath, 50, 178, { width: 8, height: 8 });
//     doc.image(rectBluePath, 50, 194, { width: 8, height: 8 });
//     doc.image(locationIconPath, 50, 215, { width: 10, height: 10 });

//     // Left Header
//     doc.fillColor('white')
//         .fontSize(18).font('Helvetica-Bold').text('Smartstay', margin + 50, margin + 17)
//         .fontSize(10).font('Helvetica').text('Meet All Your Needs.', margin + 35, margin + 49);

//     // Right Header
//     // doc.font('Helvetica-Bold').fontSize(15).text(invoiceDetails.hname, pageWidth - margin - 150, margin + 10, { width: 200, align: 'left' })
//     //     .font('Helvetica').fontSize(9)
//     //     .text([invoiceDetails.haddress, invoiceDetails.harea].filter(Boolean).join(', '), pageWidth - margin - 150, margin + 28, { width: 200, align: 'left' })
//     //      .text([invoiceDetails.hcity].filter(Boolean).join(', '), pageWidth - margin - 150, margin + 40, { width: 200, align: 'left' })
//     //     .text([invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - '), pageWidth - margin - 150, margin + 52, { width: 200, align: 'left' });
//     let addressY = margin + 28; // starting Y below the heading
// const addressX = pageWidth - margin - 150;
// const addressWidth = 200;

// doc.font('Helvetica-Bold').fontSize(15).text(invoiceDetails.hname, addressX, margin + 10, {
//   width: addressWidth,
//   align: 'left',
// });

// doc.font('Helvetica').fontSize(9);

// const addressLines = [
//   [invoiceDetails.haddress, invoiceDetails.harea].filter(Boolean).join(', '),
//   invoiceDetails.hlandmark, // optional line
//   invoiceDetails.hcity,
//   [invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - ')
// ].filter(Boolean); // removes empty or undefined lines

// addressLines.forEach((line) => {
//   const lineHeight = doc.heightOfString(line, { width: addressWidth });
//   doc.text(line, addressX, addressY, {
//     width: addressWidth,
//     align: 'left',
//   });
//   addressY += lineHeight + 2;
// });

//     // Title
//     doc.fillColor('black').fontSize(14).font('Helvetica-Bold').text('Final Settlement Receipt', 0, margin + 100, { align: 'center' });

//     // === Billing Info ===
//     const leftX = margin + 30;
//     const rightX = pageWidth - margin - 270;
//     const infoY = margin + 140;
//     const lineGap = 18;
//     const fontSize = 10;
//     const lineHeight = fontSize + 6;

//     doc.fontSize(fontSize).fillColor('#1E45E1').font('Helvetica-Oblique').text('Bill To:', leftX, infoY);

//     doc.fillColor('black').font('Helvetica');
//     let currentY = infoY + lineGap;

//     if (invoiceDetails.uname) {
//         doc.text(invoiceDetails.uname, leftX + 15, currentY, { width: 250 }); currentY += lineGap;
//     }
//     if (invoiceDetails.uphone) {
//         doc.text(invoiceDetails.uphone, leftX + 15, currentY, { width: 250 }); currentY += lineGap;
//     }
//     const addr1 = [invoiceDetails.uaddress, invoiceDetails.uarea].filter(Boolean).join(', ');
//     if (addr1) {
//         const h1 = doc.heightOfString(addr1, { width: 250 });
//         doc.text(addr1, leftX + 15, currentY, { width: 250 }); currentY += h1 + 2;
//     }
//     const addr2 = [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - ');
//     if (addr2) {
//         const h2 = doc.heightOfString(addr2, { width: 250 });
//         doc.text(addr2, leftX + 15, currentY, { width: 250 }); currentY += h2 + 2;
//     }
//     const addr3 = [invoiceDetails.upincode, invoiceDetails.ustate].filter(Boolean).join(' - ');
//     if (addr3) {
//         const h3 = doc.heightOfString(addr3, { width: 250 });
//         doc.text(addr3, leftX + 15, currentY, { width: 250 }); currentY += h3 + 2;
//     }

//     const formattedDate = moment(invoiceDetails.payment_date).format('DD-MM-YYYY');

//     doc.font('Helvetica').fillColor('grey')
//         .text('Receipt No:', rightX + 90, infoY).fillColor('black')
//         .text(invoiceDetails.reference_id, rightX + 160, infoY)

//         .fillColor('grey').text('Date:', rightX + 90, infoY + lineHeight).fillColor('black')
//         .text(formattedDate, rightX + 160, infoY + lineHeight)

//         .fillColor('grey').text('Room No:', rightX + 90, infoY + lineHeight * 2).fillColor('black')
//         .text(invoiceDetails.room_no, rightX + 160, infoY + lineHeight * 2)

//         .fillColor('grey').text('Payment Mode:', rightX + 90, infoY + lineHeight * 3).fillColor('black')
//         .text(invoiceDetails.bank_type || invoiceDetails.payment_mode, rightX + 160, infoY + lineHeight * 3);

//     // === Table Header ===
//   // === Custom Header (only top corners rounded) ===
// const tableY = currentY + 35;
// const tableWidth = pageWidth - margin * 2 - 60;

// doc.save();
// doc.moveTo(leftX + 5, tableY)
//     .lineTo(leftX + tableWidth - 5, tableY)
//     .quadraticCurveTo(leftX + tableWidth, tableY, leftX + tableWidth, tableY + 5)
//     .lineTo(leftX + tableWidth, tableY + 25)
//     .lineTo(leftX, tableY + 25)
//     .lineTo(leftX, tableY + 5)
//     .quadraticCurveTo(leftX, tableY, leftX + 5, tableY)
//     .fill('#4768EA');
// doc.restore();

// // === Header Text ===
// doc.fillColor('white').font('Helvetica-Bold').fontSize(10)
//     .text('S.No', leftX + 10, tableY + 7)
//     .text('Description', leftX + 120, tableY + 7)
//     .text('Amount / INR', leftX + 400, tableY + 7);

// // === Table Body (horizontal borders only) ===
// let y = tableY + 25;
// const rowHeight = 25;

// data.forEach((item, i) => {
//     // Top border of row
//     doc.moveTo(leftX, y).lineTo(leftX + tableWidth, y).strokeColor('#D3D3D3').stroke();

//     doc.fillColor('black').font('Helvetica')
//         .text(i + 1, leftX + 11, y + 7)
//         .text(item.reason, leftX + 123, y + 7)
//         .text(`Rs. ${item.amount.toFixed(2)}`, leftX + 400, y + 7);

//     y += rowHeight;
// });

// // Final bottom border
// doc
//   .moveTo(leftX, y)
//   .lineTo(leftX + tableWidth, y)
//   .strokeColor('#D3D3D3')
//   .lineWidth(0.1) // Ensures the line is 1px thick
//   .stroke();


//  // === Totals ===
//     const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
//     const total = subtotal + (invoiceDetails.tax || 0);
// y += 30;
//     doc
//         .fillColor('black')
//         .fontSize(10)
//         .font('Helvetica')
//         .text('Advance Amount', leftX + 300, y)
//         .text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);

//     y += 20;
//     doc
//         .text('Refundable Total', leftX + 300, y)
//         .fontSize(10)
//         .text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);
//       y += 30;

// doc
//   .moveTo(margin, y) // Use margin instead of leftX
//   .lineTo(pageWidth - margin, y) // Ends at right margin
//   .lineWidth(1)
//   .strokeColor('#E0E0E0')
//   .stroke();


    


//     // Acknowledgment
//     y += 80;
//     doc.fillColor('#1E45E1').font('Helvetica').fontSize(11)
//         .text('Acknowledgment', leftX, y);
//     y += 17;

//     const ackText = `This document confirms final settlement for the Tenant on ${moment(invoiceDetails.payment_date).format('DD/MM/YYYY')}. All dues are cleared, and room has been vacated.`;
//     doc.fontSize(9).fillColor('gray').font('Helvetica').text(ackText, leftX, y, { width: 300 });
//       doc.fillColor('#3D3D3D').fontSize(10).font('Helvetica-Bold')
//         .text('Authorized Signature', pageWidth - 160, y );

//     // Footer message & signature
//     doc.fillColor('#1E45E1').fontSize(10)
//         .text('"Your comfort is our priority –\nSee you again at Smart Stay!"', leftX + 10, y + 100);

  

//     doc.image(paidFullPath, pageWidth - 180, y + 90, { width: 100, height: 60 });

//     // === Footer Bar ===
// const sideSpacing = 20; // ⬅️ spacing from both sides

// const footerHeight = 26;
// const footerWidth = pageWidth - margin * 2 - sideSpacing * 2; // subtract left & right spacing
// const footerX = margin + sideSpacing; // shift right to leave left spacing
// const footerY = doc.page.height - margin - footerHeight;
// const cornerRadius = 15;

// doc.save();
// doc.moveTo(footerX + cornerRadius, footerY) // start after top-left curve
//     .lineTo(footerX + footerWidth - cornerRadius, footerY) // top straight line
//     .quadraticCurveTo(footerX + footerWidth, footerY, footerX + footerWidth, footerY + cornerRadius) // top-right corner
//     .lineTo(footerX + footerWidth, footerY + footerHeight) // right straight down
//     .lineTo(footerX, footerY + footerHeight) // bottom line
//     .lineTo(footerX, footerY + cornerRadius) // left straight up
//     .quadraticCurveTo(footerX, footerY, footerX + cornerRadius, footerY) // top-left corner
//     .fill('#1E45E1');
// doc.restore();

// // === Footer Text ===
// doc.fillColor('white')
//    .fontSize(10)
//    .font('Helvetica')
//    .text(`email: ${invoiceDetails.hemail}  |  Contact: ${invoiceDetails.hphone}`, footerX, footerY + 13, {
//        width: footerWidth,
//        align: 'center'
//    });




//     doc.end();
// }

// module.exports = { generateReceipt };
