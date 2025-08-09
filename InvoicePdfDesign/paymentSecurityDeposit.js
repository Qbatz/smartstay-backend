

// function generateReceipt(data, invoiceDetails, outputPath) {


//   console.log("invoiceDetails",invoiceDetails)
//   console.log("data",data)


//     const doc = new PDFDocument({ size: 'A4', margin: 0 });
//     doc.pipe(fs.createWriteStream(outputPath));

//     const pageWidth = doc.page.width;
//     const pageHeight = doc.page.height;

//     // === Outer Border (20px all around) ===
//     doc
//         .save()
//         .lineWidth(1)
//         .strokeColor('#DADADA')
//         .rect(20, 20, pageWidth - 40, pageHeight - 40)
//         .stroke()
//         .restore();

//     const logoPath = path.resolve(__dirname, '../Asset/receiptlogo.png');
//     const rectBluePath = path.resolve(__dirname, '../Asset/Rectangle 77.png');
//     const locationIconPath = path.resolve(__dirname, '../Asset/Subtract.png');
//     const immage1 = path.resolve(__dirname, '../Asset/image 32.png');
//     const locationuserPath = path.resolve(__dirname, '../Asset/usertwo.png');

//     // === Header Background ===
//     doc.rect(20, 20, pageWidth - 40, 70).fill('#00A32E');

//     // === Logo & Tagline ===
//     doc.image(logoPath, 30, 35, { width: 50, height: 50 });
//     doc.image(locationuserPath, 50, 168, { width: 10, height: 10 });
//     doc.image(rectBluePath, 50, 190, { width: 8, height: 8 });
//     doc.image(locationIconPath, 50, 208, { width: 10, height: 10 });
//     doc
//         .fillColor('white')
//         .fontSize(18)
//         .font('Helvetica-Bold')
//         .text('Smartstay', 70, 40)
//         .fontSize(10)
//         .font('Helvetica')





// let currentYq = 35;
// const blockX = pageWidth - 170; // Shift left for margin
// const blockWidth = 180;

// doc
//   .fillColor('white')
//   .fontSize(12)
//   .font('Helvetica-Bold')
//   .text(invoiceDetails.hname, blockX, currentYq, {
//     width: blockWidth,
//     align: 'left',
//   });

// currentYq += 18;

// doc.font('Helvetica').fontSize(9);

// const lines = [
//   [invoiceDetails.haddress, invoiceDetails.harea].filter(Boolean).join(', '),
//   [invoiceDetails.hlandmark, invoiceDetails.hcity].filter(Boolean).join(' - '),
//   [invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - ')
// ];

// lines.forEach((line) => {
//   if (line) {
//     const textHeight = doc.heightOfString(line, {
//       width: blockWidth,
//       align: 'left',
//     });

//     doc.text(line, blockX, currentYq, {
//       width: blockWidth,
//       align: 'left',
//     });

//     currentYq += textHeight + 2; // increase Y based on actual line height
//   }
// });



//     // === Title ===
//     doc
//         .fillColor('black')
//         .fontSize(14)
//         .font('Helvetica-Bold')
//         .text('Security Deposit Receipt', 0, 120, { align: 'center' });

//     // === Bill To & Invoice Info ===
//     const leftX = 50;
//     const rightX = pageWidth - 250;
//     const infoY = 150;
//     const lineGap = 18;
//     const fontSize = 11;
//     const lineHeight = fontSize + 6;

//     doc
//         .fontSize(fontSize)
//         .fillColor('#00A32E')
//         .font('Helvetica-Oblique')
//         .text('Bill To:', leftX, infoY);

//     doc.fillColor('black').font('Helvetica');

//     let currentY = infoY + lineGap;

//     if (invoiceDetails.uname) {
//         doc.text(invoiceDetails.uname, leftX + 15, currentY, { width: 250 });
//         currentY += lineGap;
//     }

//     if (invoiceDetails.uphone) {
//         doc.text(invoiceDetails.uphone, leftX + 15, currentY + 5, { width: 250 });
//         currentY += lineGap;
//     }

//     const addressLine1 = [invoiceDetails.uaddress, invoiceDetails.uarea].filter(Boolean).join(', ');
//     if (addressLine1) {
//         const address1Height = doc.heightOfString(addressLine1, { width: 250 });
//         doc.text(addressLine1, leftX + 15, currentY + 5, { width: 250 });
//         currentY += address1Height + 2;
//     }

//     const addressLine2 = [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - ');
//     if (addressLine2) {
//         const address2Height = doc.heightOfString(addressLine2, { width: 250 });
//         doc.text(addressLine2, leftX + 15, currentY + 2, { width: 450 });
//         currentY += address2Height + 2;
//     }

//     const addressLine3 = [invoiceDetails.ustate, invoiceDetails.upincode].filter(Boolean).join(' - ');
//     if (addressLine3) {
//         const address3Height = doc.heightOfString(addressLine3, { width: 250 });
//         doc.text(addressLine3, leftX + 15, currentY + 2, { width: 250 });
//         currentY += address3Height + 2;
//     }

//     const formattedDate = moment(invoiceDetails.payment_date).format('DD-MM-YYYY');

//     // doc
//     //     .font('Helvetica')
//     //     .fillColor('grey')
//     //     .text('Receipt No:', rightX + 60, infoY)
//     //     .fillColor('black')
//     //     .text(` # ${invoiceDetails.reference_id}`, rightX + 150, infoY)

//     //      .fillColor('grey')
//     //     .text('Invoice Ref:', rightX + 60, infoY)
//     //     .fillColor('black')
//     //     .text(`# ${invoiceDetails.invoice_number}`, rightX + 150, infoY)
//     //     .fillColor('grey')
//     //     .text('Payment Date:', rightX + 60, infoY + lineHeight)
//     //     .fillColor('black')
//     //     .text(formattedDate, rightX + 150, infoY + lineHeight)
//     //     .fillColor('grey')
//     //     .text('Payment Mode:', rightX + 60, infoY + lineHeight * 2)
//     //     .fillColor('black')
//     //     .text(invoiceDetails.bank_type || invoiceDetails.payment_mode, rightX + 150, infoY + lineHeight * 2);
//     doc
//   .font('Helvetica')
//   .fillColor('grey')
//   .text('Receipt No:', rightX + 60, infoY)
//   .fillColor('black')
//   .text(`# ${invoiceDetails.reference_id}`, rightX + 140, infoY)

//   .fillColor('grey')
//   .text('Invoice Ref:', rightX + 60, infoY + lineHeight * 1.2)
//   .fillColor('black')
//   .text(`# ${invoiceDetails.invoice_number}`, rightX + 140, infoY + lineHeight * 1.2)

//   .fillColor('grey')
//   .text('Payment Date:', rightX + 60, infoY + lineHeight * 2.3)
//   .fillColor('black')
//   .text(formattedDate, rightX + 140, infoY + lineHeight * 2.3)

//   .fillColor('grey')
//   .text('Payment Mode:', rightX + 60, infoY + lineHeight * 3.6)
//   .fillColor('black')
//   .text(invoiceDetails.bank_type || invoiceDetails.payment_mode, rightX + 140, infoY + lineHeight * 3.6);





//  doc
//         .fillColor('#3D3D3D')
//         .fontSize(11)
//         .font('Helvetica-Bold')

//         .text('Payment For',rightX - 295,infoY + 180);
//     // === Amount Box ===
//    const subtotal = data.reduce((sum, i) => sum + parseFloat(i.amount_received || 0), 0);
// const tax = parseFloat(invoiceDetails.tax || 0);
// const total = subtotal + tax;
//     const boxX = 360;
//     const boxY = currentY + 40;

//     doc.roundedRect(boxX, boxY, 200, 60, 5)
//         .strokeColor('#00B14F')
//         .lineWidth(1)
//         .stroke();

//     doc
//         .fontSize(14)
//         .fillColor('#00B14F')
//         .font('Helvetica-Bold')
//         .text(` ${total.toFixed(2)}`, boxX - 30, boxY + 5, { align: 'center' });

//     doc
//         .fontSize(10)
//         .fillColor('#555555')
//         .font('Helvetica-Oblique')
//         .text('Nine Thousand and Nine Fifty\nRupees Only', boxX - 10, boxY + 25, { align: 'center' });



//     doc
//         .fontSize(8)
//         .fillColor('black')
//         .font('Helvetica')
//         .text('Amount received', boxX - 80, boxY + 20);




//     // === Table Header ===
//     // const tableY = boxY + 80;
//     // doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#00A32E');

//     // doc
//     //     .fillColor('white')
//     //     .font('Helvetica-Bold')
//     //     .fontSize(10)
//     //     .text('S.No', leftX + 10, tableY + 7)
//     //     .text('Description', leftX + 120, tableY + 7)
//     //     .text('Amount (INR)', leftX + 400, tableY + 7);

//     // // === Table Rows ===
//     // let y = tableY + 35;
//     // doc.font('Helvetica').fillColor('black');
//     // data.forEach((item, i) => {
//     //     doc
//     //         .text(i + 1, leftX + 10, y)
//     //         .text(item.am_name, leftX + 120, y)
//     //         .text((item.amount ?? 0).toFixed(2), leftX + 400, y);
//     //     y += 25;
//     // });
//     // === Table Rows ===
// const tableY = boxY + 80; // ✅ Define before using it

// // === Table Header ===
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
//         .font('Helvetica') // ensure font stays consistent
//         .fontSize(10)
//         .fillColor('black')
//         .text(i + 1, leftX + 10, y)
//         .text(item.am_name || '-', leftX + 120, y) // default to '-' if name missing
//         .text((parseFloat(item.amount_received) || 0).toFixed(2), leftX + 400, y);
//     y += 25;
// });

// // === Horizontal Line below table ===
// doc
//     .moveTo(leftX, y - 5)
//     .lineTo(pageWidth - 50, y - 5)
//     .lineWidth(1)
//     .strokeColor('#BDBDBD')
//     .stroke();




//     // === Summary ===
//     // y += 10;
//     // doc
//     //     .fillColor('black')
//     //     .fontSize(10)
//     //     .font('Helvetica-Bold')
//     //     .text('Sub Total', leftX + 300, y)
//     //     .text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);
//     // y += 20;

//     // doc
//     //     .text('Tax', leftX + 300, y)
//     //     .text(`Rs. ${tax.toFixed(2)}`, leftX + 400, y);
//     // y += 20;

//     // doc
//     //     .font('Helvetica-Bold')
//     //     .text('Total', leftX + 300, y)
//     //     .fontSize(12)
//     //     .fillColor('black')
//     //     .text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);

//            y += 30;
// const outerPadding = 20;
// doc
//   .moveTo(outerPadding, y) 
//   .lineTo(pageWidth - outerPadding, y) // Respect outer padding on right too
//   .lineWidth(1)
//   .strokeColor('#E0E0E0') // Light gray line like in Figma
//   .stroke();



//     // === Account Details ===
//     y += 60;
//     doc
//         .fillColor('#00A32E')
//         .font('Helvetica-Bold')
//         .fontSize(11)
//         .text('ACCOUNT DETAILS', leftX, y);
//     y += 20;

//     doc
//         .fillColor('black')
//         .font('Helvetica')
//         .fontSize(10);

//     doc.text(`Payment Mode   : ${invoiceDetails.bank_type || invoiceDetails.paymentmode}`, leftX, y);
//     doc.text(`Received By : ${invoiceDetails.benificiary_name || " Account "}`, leftX, y + 15);
//     doc.text(`Status   : Paid`, leftX, y + 30);

//     // === QR or Signature Image ===
//     doc.image(immage1, 430, y - 30, { width: 100, height: 70 });

//     // === Terms & Signature ===


//     y += 110;
//     doc
//         .fillColor('#00A32E')
//         .font('Helvetica-Bold')
//         .fontSize(10)
//         .text('Acknowledgment', leftX, y);
//     y += 15;

//     doc
//         .fontSize(9)
//         .fillColor('gray')
//         .font('Helvetica')
//         .text(invoiceDetails.privacyPolicyHtml || 'No refunds after due date.', leftX, y, { width: 300 });

//     doc
//         .fillColor('#3D3D3D')
//         .fontSize(10)
//         .font('Helvetica-Bold')
//         .text('Authorized Signature', pageWidth - 160, y - 10);

//     // === Footer ===
//     // const footerY = pageHeight - 50;
//     // const footerHeight = 30;
//     // const footerX = 20;
//     // const footerWidth = pageWidth - 40;

//     // doc.roundedRect(footerX, footerY, footerWidth, footerHeight, 15).fill('#00A32E');

//     // doc
//     //     .fillColor('white')
//     //     .fontSize(10)
//     //     .text(`email : ${invoiceDetails.hemail}    Contact : ${invoiceDetails.hphone}`, footerX, footerY + 9, {
//     //         width: footerWidth,
//     //         align: 'center',
//     //     });
//     const footerHeight = 30;
// const sideSpacing = 40; // ⬅️ Add more space from edges
// const footerWidth = pageWidth - 2 * sideSpacing;
// const footerX = sideSpacing;
// const footerY = pageHeight - footerHeight - 20;
// const radius = 15;

// doc.save();
// doc
//   .moveTo(footerX + radius, footerY)
//   .lineTo(footerX + footerWidth - radius, footerY)
//   .quadraticCurveTo(footerX + footerWidth, footerY, footerX + footerWidth, footerY + radius)
//   .lineTo(footerX + footerWidth, footerY + footerHeight)
//   .lineTo(footerX, footerY + footerHeight)
//   .lineTo(footerX, footerY + radius)
//   .quadraticCurveTo(footerX, footerY, footerX + radius, footerY)
//   .fill('#00A32E');
// doc.restore();

// const textY = footerY + 9;
// const padding = 10;
// const columnWidth = (footerWidth - padding * 2) / 2;

// doc
//   .fillColor('white')
//   .fontSize(10)
//   .font('Helvetica')
//   .text(`email: ${invoiceDetails.hemail}`, footerX + padding, textY, {
//     width: columnWidth,
//     align: 'center'
//   })
//   .text(`Contact: ${invoiceDetails.hphone}`, footerX + columnWidth + padding, textY, {
//     width: columnWidth,
//     align: 'center'
//   });

//     doc.end();
// }

// module.exports = { generateReceipt };



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
  await drawInvoiceHeading(doc, 'Security Deposit Receipt');
  await drawBillToSection(doc, invoiceDetails);
  await drawInvoiceDetails(doc, invoiceDetails);
  const amountBoxX = 360;
  const amountBoxY = 250;  

  await drawAmountBox(doc, data, invoiceDetails, amountBoxX, amountBoxY);

  // Now draw table starting *below* amount box + box height (60) + some margin (say 20)
  const tableStartY = amountBoxY + 60 + 20; // 310

  await drawInvoiceTable(doc, data, invoiceDetails, tableStartY);
  
  await drawAccountDetails(doc, invoiceDetails);
  await drawTermsAndSignature(doc, invoiceDetails);
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
    .fill('#00A32E');
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
      y += 22;
    } else {
      y += 15;
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
    .fillColor('#00A32E')
    .text(headingText, x, y, { align: 'left', continued: false });


  doc.fillColor('#00A32E');
}



function drawBillToSection(doc, invoiceDetails) {
  const leftX = 50;
  const infoY = 170;
  const lineGap = 18;


  doc.fillColor('#00A32E').font('Gilroy-Bold').fontSize(10).text('Bill To:', leftX, infoY);
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
  drawIconText(bedIcon, invoiceDetails.Room_No ? `${invoiceDetails.Room_No} - ${invoiceDetails.Bed}` : null);


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
    .text('Invoice Ref: ', rightX, startY + lineGap, { continued: true })
    .fillColor('#000000')
    .text(invoiceDetails.invoice_number);

  doc.fillColor('#808080')
    .text('Date: ', rightX, startY + lineGap * 2, { continued: true })
    .fillColor('#000000')
    .text(formatDate(invoiceDetails.payment_date));


  doc.fillColor('#808080')
    .text('Payment Mode : ', rightX, startY + lineGap * 3, { continued: true })
    .fillColor('#000000')
    .text(invoiceDetails.banking.type);
}



function convertAmountToWords(amount) {
  const integerPart = Math.floor(amount);
  const decimalPart = Math.round((amount - integerPart) * 100);
  let words = numberToWords.toWords(integerPart) + " Rupees";
  if (decimalPart > 0) {
    words += " and " + numberToWords.toWords(decimalPart) + " Paise";
  }
  words += " Only";
  return words.charAt(0).toUpperCase() + words.slice(1);  
}

function drawAmountBox(doc, data, invoiceDetails, boxX, boxY) {
  const pageWidth = doc.page.width;
  const margin = 50;


  doc
    .fontSize(12)
    .fillColor('black')
    .font('Gilroy-Bold')
    .text('Payment For', margin, 100);  
 
  const centerX = pageWidth / 2;
  const amountReceivedText = 'Amount received';
  
  const textWidth = doc.widthOfString(amountReceivedText);
  doc
    .fontSize(10)
    .fillColor('black')
    .font('Gilroy-Regular')
    .text(amountReceivedText, centerX - textWidth / 2, 100);


  const rectWidth = 200;
  const rectHeight = 60;
  
 
  doc.roundedRect(rectWidth, rectHeight, 5)
    .strokeColor('#00B14F')
    .lineWidth(1)
    .stroke();

  const subtotal = data.reduce((sum, i) => sum + parseFloat(i.amount_received || 0), 0);
  const tax = parseFloat(invoiceDetails.tax || 0);
  const total = subtotal + tax;


  doc
    .fontSize(14)
    .fillColor('#00B14F')
    .font('Gilroy-Bold')
    .text(total.toFixed(2), boxX, boxY + 10, {
      width: rectWidth,
      align: 'center',
    });

 
  const amountInWords = convertAmountToWords(total);
  doc
    .fontSize(10)
    .fillColor('#555555')
    .font('Gilroy-Bold')  
    .text(amountInWords, boxX + 10, boxY + 30, {
      width: rectWidth - 20,
      align: 'center',
    });
}


// function drawAmountBox(doc, data, invoiceDetails, boxX, boxY) {
//   const subtotal = data.reduce((sum, i) => sum + parseFloat(i.amount_received || 0), 0);
//   const tax = parseFloat(invoiceDetails.tax || 0);
//   const total = subtotal + tax;

//   const rectWidth = 200;
//   const paddingX = 10;
//  doc
//     .fontSize(8)
//     .fillColor('black')
//     .font('Gilroy-Bold')
//     .text('Amount received', boxX + paddingX, boxY + 45, {
//       width: rectWidth - paddingX * 2,
//       align: 'left',
//     });
//   doc.roundedRect(boxX, boxY, rectWidth, 60, 5)
//     .strokeColor('#00B14F')
//     .lineWidth(1)
//     .stroke();

//   doc
//     .fontSize(14)
//     .fillColor('#00B14F')
//     .font('Gilroy-Bold')
//     .text(total.toFixed(2), boxX + 70, boxY + 10, { align: 'center' });

//   const amountInWords = convertAmountToWords(total);
//   doc
//     .fontSize(10)
//     .fillColor('#555555')
//     .font('Gilroy-Bold')
//     .text(amountInWords, boxX + paddingX, boxY + 30, {
//       width: rectWidth - paddingX * 2,
//       align: 'center',
//     });

 
// }



function drawInvoiceTable(doc, data, invoiceDetails, tableY = 280) {
  const leftX = 50;
  const tableWidth = doc.page.width - 100;

  doc.roundedRect(leftX, tableY, tableWidth, 25, 5).fill('#00A32E');
  doc.font('Gilroy-Regular').fillColor('white').font('Gilroy-Bold').fontSize(10)
    .text('S.No', leftX + 10, tableY + 7)
    .text('INV', leftX + 70, tableY + 7)
    .text('Description', leftX + 200, tableY + 7)
    .text('Amount (INR)', leftX + 400, tableY + 7);

  let y = tableY + 35;
  doc.font('Gilroy-Regular').fillColor('black');
  data.forEach((item, i) => {
    doc.text(i + 1, leftX + 10, y)
      .text(item.Invoices || '-', leftX + 70, y)
      .text(item.am_name || '-', leftX + 200, y)
      .text((item.amount ?? 0).toFixed(2), leftX + 400, y);
    y += 25;
  });

  const RefundableTotal = data
    .filter(item => item.am_name?.toLowerCase() !== 'advance')
    .reduce((sum, item) => sum + (item.amount || 0), 0);

  const subtotal = data.reduce((sum, i) => sum + i.amount, 0);

  const total = subtotal - RefundableTotal;

  y += 10;
  doc.moveTo(leftX, y).lineTo(leftX + tableWidth, y).strokeColor('#E0E0E0').lineWidth(1).stroke();

  y += 10;
  doc.font('Gilroy-Regular').text('Payable Amount', leftX + 300, y).text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);
  y += 20;
  doc.font('Gilroy-Regular').text('Non Refundable', leftX + 300, y).text(`Rs. ${RefundableTotal.toFixed(2)}`, leftX + 400, y);
  y += 20;
  doc.font('Gilroy-Regular').text('Refundable Amount', leftX + 300, y).text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);
}





function drawAccountDetails(doc, invoiceDetails) {
  let y = 500;
  const leftX = 50;
  const valueX = leftX + 100;
  const pageWidth = doc.page.width;

  doc.fillColor('#00A32E').font('Gilroy-Bold').fontSize(11).text('ACCOUNT DETAILS', leftX, y);
  y += 20;

  doc.fontSize(10).fillColor('black').font('Gilroy-Medium');
  doc.text('Payment Mode', leftX, y).text(`: ${invoiceDetails.banking.type || "NA"}`, valueX, y);
  y += 15;

  doc.text('Received By', leftX, y).text(`: ${invoiceDetails.benificiary_name || " Account "}`, valueX, y);
  y += 15;

  doc.text('Status', leftX, y).text(`: ${"Paid"}`, valueX, y);
  y += 15;

  

 const immage1 = path.resolve(__dirname, '../Asset/image 32.png');
 

  

  const qrX = 400;
  const qrY = 500;


   if (fs.existsSync(immage1)) {
    doc.image(immage1, qrX, qrY, { width: 100, height:70 });
  }


}


function drawTermsAndSignature(doc, invoiceDetails) {
  let y = 700;
  const leftX = 50;
  const rightX = 400;


  doc.fillColor('#00A32E')
    .font('Gilroy-Bold')
    .fontSize(10)
    .text('Acknowledgment', leftX, y);


  doc.fillColor('black')
    .font('Gilroy-Bold')
    .fontSize(10)
    .text('Authorized Signature', rightX, y, { align: 'right', width: 150 });

  y += 15;


  doc.fontSize(9)
    .fillColor('gray')
    .font('Gilroy-Medium')
    .text(
      "No refunds after due date.",
      leftX,
      y,
      { width: 300 }
    );
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
    .fill('#00A32E');
  doc.restore();

  doc.fillColor('white').fontSize(10).font('Gilroy-Medium');


  doc.text(`email: ${invoiceDetails.hemail || "N/A"}`, footerX + padding, footerY + 13);

  const phoneText = `Contact: ${invoiceDetails.hphone || ""}`;
  const phoneTextWidth = doc.widthOfString(phoneText);

  doc.text(phoneText, footerX + footerWidth - phoneTextWidth - padding, footerY + 13);
}






module.exports = { generateReceipt };