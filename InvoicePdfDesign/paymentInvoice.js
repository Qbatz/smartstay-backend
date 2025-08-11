const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');
const axios = require('axios');
const request = require('sync-request');

// manual invoice, recurring, checkout invoice

async function generateInvoice(data, invoiceDetails, outputPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  doc.pipe(fs.createWriteStream(outputPath));

  console.log("invoiceDetails", invoiceDetails)
  doc.registerFont('Gilroy-Bold', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Bold_0.ttf'));
  doc.registerFont('Gilroy-Regular', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Regular_0.ttf'));
  doc.registerFont('Gilroy-Medium', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Medium_0.ttf'));
  console.log(path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Bold_0.ttf'));



  await drawOuterBorder(doc);
  await drawHeader(doc, invoiceDetails);
  await drawInvoiceHeading(doc, 'Payment Invoice');
  await drawBillToSection(doc, invoiceDetails);
  await drawInvoiceDetails(doc, invoiceDetails);
  await drawInvoiceTable(doc, data, invoiceDetails);
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
        .text(invoiceDetails.Hostel_Name || '', hostelInfoX, 30, { width: hostelInfoWidth });

    doc.fontSize(9).font('Gilroy-Bold');

    
    const lines = [
  [invoiceDetails.hostel_address, invoiceDetails.harea]
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


  drawIconText(profileIcon, invoiceDetails.Name);
  drawIconText(phoneIcon, invoiceDetails.phoneNo);
  drawIconText(bedIcon, invoiceDetails.Room_No ? `${invoiceDetails.Room_No} - ${invoiceDetails.Bed}` : null);


  const safe = value => {
    if (value == null) return '';
    if (String(value).toLowerCase() === 'undefined') return '';
    if (String(value).toLowerCase() === 'null') return '';
    return value;
  };


  const addressText = [
    [safe(invoiceDetails.UserAddress), safe(invoiceDetails.uarea)].filter(Boolean).join(', '),
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
    .text('Invoice: ', rightX, startY, { continued: true })
    .fillColor('#000000')
    .text(invoiceDetails.Invoices || '');


  doc.fillColor('#808080')
    .text('Invoice Date: ', rightX, startY + lineGap, { continued: true })
    .fillColor('#000000')
    .text(formatDate(invoiceDetails.Date));

  doc.fillColor('#808080')
    .text('Due Date: ', rightX, startY + lineGap * 2, { continued: true })
    .fillColor('#000000')
    .text(formatDate(invoiceDetails.DueDate));


  doc.fillColor('#808080')
    .text('Joining Date: ', rightX, startY + lineGap * 3, { continued: true })
    .fillColor('#000000')
    .text(formatDate(invoiceDetails.joining_Date));
}



function drawInvoiceTable(doc, data, invoiceDetails) {

  console.log("Data***", data)

  const leftX = 50;
  const tableY = 280;
  const tableWidth = doc.page.width - 100;


  doc.roundedRect(leftX, tableY, tableWidth, 25, 5).fill('#4768EA');
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





  const tax = Number(invoiceDetails?.tax) || 0;

  const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
  const total = subtotal + tax;




  y += 10;
  doc.moveTo(leftX, y).lineTo(leftX + tableWidth, y).strokeColor('#E0E0E0').lineWidth(1).stroke();

  y += 10;
  doc.font('Gilroy-Regular').text('Tax', leftX + 300, y).text(`Rs. ${tax?.toFixed(2)}`, leftX + 400, y);
  y += 20;

  doc.font('Gilroy-Regular').text('Sub Total', leftX + 300, y).text(`Rs. ${subtotal?.toFixed(2)}`, leftX + 400, y);
  y += 20;
  doc.font('Gilroy-Bold').text('Total', leftX + 300, y).text(`Rs. ${total?.toFixed(2)}`, leftX + 400, y);



}





function drawAccountDetails(doc, invoiceDetails) {
  let y = 500;
  const leftX = 50;
  const valueX = leftX + 100;
  const pageWidth = doc.page.width;

  doc.fillColor('#1E45E1').font('Gilroy-Bold').fontSize(11).text('ACCOUNT DETAILS', leftX, y);
  y += 20;

  doc.fontSize(10).fillColor('black').font('Gilroy-Medium');
  doc.text('Account No', leftX, y).text(`: ${invoiceDetails.banking.acc_num || "NA"}`, valueX, y);
  y += 15;

  doc.text('IFSC Code', leftX, y).text(`: ${invoiceDetails.banking.ifsc_code || "NA"}`, valueX, y);
  y += 15;

  doc.text('Bank Name', leftX, y).text(`: ${invoiceDetails.banking.bank_name || "NA"}`, valueX, y);
  y += 15;

  doc.text('UPI ID', leftX, y).text(`: ${invoiceDetails.banking.upi_id || "NA"}`, valueX, y);


  const qrImagePath = invoiceDetails?.qr_url && invoiceDetails?.qr_url;

  const paytmLogo = path.resolve(__dirname, '../Asset/paytm.png');
  const phonepeLogo = path.resolve(__dirname, '../Asset/download.png');
  const gpayLogo = path.resolve(__dirname, '../Asset/gpay.png');

  const logoSize = 40;
  const gap = 10;

  const qrX = 400;
  const qrY = 500;


  if (qrImagePath.startsWith('http')) {

    try {
      const res = request('GET', qrImagePath);
      const qrBuffer = res.getBody();
      doc.image(qrBuffer, qrX, qrY, { width: 100, height: 80 });
    } catch (err) {
      console.error("QR code download failed:", err);
    }
  } else if (fs.existsSync(qrImagePath)) {
    doc.image(qrImagePath, qrX, qrY, { width: 100, height: 100 });
  }

  const logoY = qrY + 90;
  let currentX = qrX;

  if (fs.existsSync(paytmLogo)) {
    doc.image(paytmLogo, currentX, logoY, { width: logoSize, height: logoSize });
    currentX += logoSize + gap;
  }
  if (fs.existsSync(phonepeLogo)) {
    doc.image(phonepeLogo, currentX, logoY, { width: logoSize, height: logoSize });
    currentX += logoSize + gap;
  }
  if (fs.existsSync(gpayLogo)) {
    doc.image(gpayLogo, currentX, logoY, { width: logoSize, height: logoSize });
  }
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



module.exports = { generateInvoice };











// function generateInvoice(data, invoiceDetails, outputPath) {

//     const doc = new PDFDocument({ size: 'A4', margin: 0 });
//     doc.pipe(fs.createWriteStream(outputPath));
//  const margin = 20;
//     const pageWidth = doc.page.width;
//     const pageHeight = doc.page.height;
//     const outerPadding = 20;
//     const contentStartY = outerPadding + 90 + 20; // 90 header + 20 gap = 130

//     // === Draw Outer Rounded Border ===
//     doc
//         .lineWidth(1)
//         .strokeColor('#D9D9D9')
//         .roundedRect(outerPadding, outerPadding, pageWidth - 2 * outerPadding, pageHeight - 2 * outerPadding, 10)
//         .stroke();

//     // === Header Background Inside Border ===
//     doc
//         .save()
//         .fillColor('#1E45E1')
//         .rect(outerPadding, outerPadding, pageWidth - 2 * outerPadding, 90)
//         .fill()
//         .restore();

//     // === Assets ===
//     const logoPath = path.resolve(__dirname, '../Asset/Group@2x.png');
//       const rectBluePath = path.resolve(__dirname, '../Asset/Rectangleblue.png');
//      const locationIconPath = path.resolve(__dirname, '../Asset/location 03.png');
//      const locationuserPath = path.resolve(__dirname, '../Asset/user.png');

//     // === Logo & Tagline ===
//     doc.image(logoPath, outerPadding + 16, outerPadding + 15, { width: 25, height: 25 });


//       doc.image(locationuserPath, 50, 198, { width: 8, height: 8 });
//     doc.image(rectBluePath, 50, 215, { width: 8, height: 8 });
//     doc.image(locationIconPath, 50, 233, { width: 10, height: 10 });

//     const logoTextY = outerPadding + 20;
// const subtitleY = logoTextY + 24;


//     // doc
//     //     .fillColor('white')
//     //     .fontSize(18)
//     //     .font('Helvetica-Bold')
//     //     .text('Smartstay', outerPadding + 50, outerPadding + 10)
//     //     .fontSize(10)
//     //     .font('Helvetica')
//     //     .text('Meet All Your Needs.', outerPadding + 50, outerPadding + 30);
//     doc
//   .fillColor('white')
//   .fontSize(18)
//   .font('Helvetica-Bold')
//   .text('Smartstay', outerPadding + 45, logoTextY)
//   .fontSize(10)
//   .font('Helvetica')
//   .text('Meet All Your Needs.', outerPadding + 30, subtitleY);

//     // === Hostel Details Right ===
//     // doc
//     //     .fillColor('white')
//     //     .fontSize(12)
//     //     .font('Helvetica-Bold')
//     //     .text(invoiceDetails.Hostel_Name, pageWidth - 150, outerPadding + 10, { width: 200, align: 'left' })
//     //     .font('Helvetica')
//     //     .fontSize(9)
//     //     .text(
//     //         [invoiceDetails.hostel_address, invoiceDetails.harea].filter(Boolean).join(', '),
//     //         pageWidth - 150,
//     //         outerPadding + 30,
//     //         { width: 200, align: 'left' }
//     //     )
//     //     .text(
//     //         [invoiceDetails.hlandmark, invoiceDetails.hcity].filter(Boolean).join(' - '),
//     //         pageWidth - 150,
//     //         outerPadding + 42,
//     //         { width: 200, align: 'left' }
//     //     )
//     //     .text(
//     //         [invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - '),
//     //         pageWidth - 150,
//     //         outerPadding + 54,
//     //         { width: 200, align: 'left' }
//     //     );
//     let currentYh = outerPadding + 10;

// doc
//   .fillColor('white')
//   .fontSize(12)
//   .font('Helvetica-Bold')
//   .text(invoiceDetails.Hostel_Name, pageWidth - 150, currentYh, {
//     width: 200,
//     align: 'left',
//   });

// currentYh += 15; // spacing after hostel name
// doc.font('Helvetica').fontSize(9);

// const lines = [
//   [invoiceDetails.hostel_address, invoiceDetails.harea].filter(Boolean).join(', '),
//   [invoiceDetails.hlandmark, invoiceDetails.hcity].filter(Boolean).join(' - '),
//   [invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - ')
// ];

// lines.forEach(line => {
//   if (line) {
//     doc.text(line, pageWidth - 150, currentYh, { width: 200, align: 'left' });
//     currentYh += 12; // only move down if line exists
//   }
// });

//     // === Payment Invoice Title ===
//     // doc
//     //     .fillColor('black')
//     //     .fontSize(14)
//     //     .font('Helvetica-Bold')
//     //     .text('Payment Invoice', 0, outerPadding + 100, { align: 'center' });
//     const invoiceTitleY = outerPadding + 120; // You can tweak this value (e.g., 130)
// doc
//   .fillColor('black')
//   .fontSize(14)
//   .font('Helvetica-Bold')
//   .text('Payment Invoice', 0, invoiceTitleY, { align: 'center' });

//     // === Bill To & Invoice Info ===
//     const leftX = outerPadding + 30;
//     const rightX = pageWidth - 250;
//     const infoY = contentStartY +50;
//     const lineGap = 18;
//     const fontSize = 10;
//     const lineHeight = fontSize + 6;


//     doc
//         .fontSize(10)
//         .fillColor('#1E45E1')
//         .font('Helvetica-Oblique')
//         .text('Bill To:', leftX, infoY);

//     doc.fillColor('black').font('Helvetica');
//     let currentY = infoY + lineGap;

//     if (invoiceDetails.Name) {
//         doc.text(invoiceDetails.Name, leftX + 13, currentY); currentY += lineGap;
//     }
//     if (invoiceDetails.phoneNo) {
//         doc.text(invoiceDetails.phoneNo, leftX + 13, currentY); currentY += lineGap;
//     }

//     const addressLine1 = [invoiceDetails.UserAddress, invoiceDetails.uarea].filter(Boolean).join(', ');
//     if (addressLine1) {
//         doc.text(addressLine1, leftX + 13, currentY, { width: 250 }); currentY += lineGap;
//     }

//     const addressLine2 = [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - ');
//     if (addressLine2) {
//         doc.text(addressLine2, leftX + 13, currentY, { width: 250 }); currentY += lineGap;
//     }

//     const addressLine3 = [invoiceDetails.ustate, invoiceDetails.upincode].filter(Boolean).join(' - ');
//     if (addressLine3) {
//         doc.text(addressLine3, leftX + 13, currentY, { width: 250 }); currentY += lineGap;
//     }

//     // const formattedDate = moment(invoiceDetails.Date).format('DD-MM-YYYY');
//     // const formattedDueDate = moment(invoiceDetails.DueDate).format('DD-MM-YYYY');
// //  const formattedDate = new Date(invoiceDetails.Date).toISOString().substring(0, 10);
// const utcDate = new Date(invoiceDetails.Date);
// const formattedDate = utcDate.toLocaleDateString('en-GB', {
//   day: '2-digit',
//   month: 'short',
//   year: 'numeric',
//   timeZone: 'UTC',
// });
// const utcDate2 = new Date(invoiceDetails.DueDate);
// const formattedDueDate = utcDate2.toLocaleDateString('en-GB', {
//   day: '2-digit',
//   month: 'short',
//   year: 'numeric',
//   timeZone: 'UTC',
// });
// const utcDate3 = new Date(invoiceDetails.joining_Date);
// const formattedJoiningDate = utcDate3.toLocaleDateString('en-GB', {
//   day: '2-digit',
//   month: 'short',
//   year: 'numeric',
//   timeZone: 'UTC',
// });
// // const formattedDueDate =new Date(invoiceDetails.DueDate).toISOString().substring(0, 10);
//     doc
//         .font('Helvetica')
//         .fillColor('grey')
//         .text('Invoice No:', rightX + 70, infoY)
//         .fillColor('black')
//         .text(invoiceDetails.Invoices, rightX + 140, infoY)
//         .fillColor('grey')
//         .text('Invoice Date:', rightX + 70, infoY + lineHeight * 1.2)
//         .fillColor('black')
//         .text(formattedDate, rightX + 140, infoY + lineHeight * 1.2)
//         .fillColor('grey')
//         .text('Due Date:', rightX + 70, infoY + lineHeight * 2.3)
//         .fillColor('black')
//         .text(formattedDueDate, rightX + 140, infoY + lineHeight * 2.3)
//          .fillColor('grey')
//         .text('Joining Date:', rightX + 70, infoY + lineHeight * 3.5)
//         .fillColor('black')
//         .text(formattedJoiningDate, rightX + 140, infoY + lineHeight * 3.5);

//     // === Table Header ===
//     // const tableY = contentStartY + 120;
//     // doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#4768EA');

//     // doc
//     //     .fillColor('white')
//     //     .font('Helvetica-Bold')
//     //     .fontSize(10)
//     //     .text('S.No', leftX + 10, tableY + 7)
//     //     .text('Description', leftX + 120, tableY + 7)
//     //     .text('Amount', leftX + 400, tableY + 7);

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


//     const tableY = contentStartY + 160;
// doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#4768EA');

// doc
//     .fillColor('white')
//     .font('Helvetica-Bold')
//     .fontSize(10)
//     .text('S.No', leftX + 10, tableY + 7)
//     .text('Description', leftX + 120, tableY + 7)
//     .text('Amount', leftX + 400, tableY + 7);

// // === Table Rows ===
// // let y = tableY + 35;
// // doc.font('Helvetica').fillColor('black');
// // data.forEach((item, i) => {
// //     doc
// //         .text(i + 1, leftX + 10, y)
// //         .text(item.am_name, leftX + 120, y)
// //         .text((item.amount ?? 0).toFixed(2), leftX + 400, y);
// //     y += 25;
// // });
// let y = tableY + 35;
// doc.font('Helvetica').fillColor('black');

// data.forEach((item, i) => {
//   // Draw row text
//   doc
//     .text(i + 1, leftX + 10, y)
//     .text(item.am_name, leftX + 120, y)
//     .text((item.amount ?? 0).toFixed(2), leftX + 400, y);

//   // Draw horizontal line under the row
//   doc
//     .moveTo(leftX + 10, y + 20) // line start
//     .lineTo(pageWidth - 50, y + 20) // line end
//     .strokeColor('#D9D9D9') // light gray line
//     .lineWidth(0.2)
//     .stroke();

//   y += 25;
// });

// // === HR line after table rows ===




//     // === Summary Section ===
//     const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
//     const tax = invoiceDetails.tax || 0;
//     const total = subtotal + tax;

//     y += 10;
//     doc
//         .fillColor('#1E45E1')
//         .fontSize(10)
//         .text('"Your comfort is our priority –\nSee you again at Smart Stay!"', leftX + 10, y + 10);

//     doc
//         .fillColor('black')
//         .font('Helvetica-Bold')
//         .fontSize(10)
//         .text('Sub Total', leftX + 300, y)
//         .text(`Rs.${subtotal.toFixed(2)}`, leftX + 400, y);

//     y += 20;
//     doc.text('Tax', leftX + 300, y).text(`Rs.${tax.toFixed(2)}`, leftX + 400, y);

//     y += 20;
//     doc
//         .font('Helvetica-Bold')
//         .text('Total', leftX + 300, y)
//         .fontSize(12)
//         .fillColor('black')
//         .text(`Rs.${total.toFixed(2)}`, leftX + 400, y);

//           y += 22;
//     doc
//         .moveTo(margin, y)
//         .lineTo(pageWidth - margin, y)
//         .strokeColor('#E0E0E0')
//         .stroke();

//     // === Account Details ===
//     y += 40;
//     doc
//         .fillColor('#1E45E1')
//         .font('Helvetica-Bold')
//         .fontSize(11)
//         .text('ACCOUNT DETAILS', leftX, y);

//     y += 20;
//     doc.fillColor('black').font('Helvetica').fontSize(10);
//     const labelX = leftX;
//     const valueX = leftX + 100;
//     let accountY = y;

//     doc.text("Account No", labelX, accountY);
//     doc.text(`: ${invoiceDetails.acc_num || " NA "}`, valueX, accountY); accountY += 15;
//     doc.text("IFSC Code", labelX, accountY);
//     doc.text(`: ${invoiceDetails.ifsc_code || " NA "}`, valueX, accountY); accountY += 15;
//     doc.text("Bank Name", labelX, accountY);
//     doc.text(`: ${invoiceDetails.acc_name || " NA "}`, valueX, accountY); accountY += 15;
//     doc.text("UPI ID", labelX, accountY);
//     doc.text(`: ${invoiceDetails.upi_id || " NA "}`, valueX, accountY); accountY += 15;


//     const qrImagePath = path.resolve(__dirname, '../Asset/barcode.png');
// const paytmLogo = path.resolve(__dirname, '../Asset/paytm.png');
// const phonepeLogo = path.resolve(__dirname, '../Asset/phonepay.png');
// const gpayLogo = path.resolve(__dirname, '../Asset/gpay.png');

// let qrY = y - 30;
// doc.image(qrImagePath, pageWidth - 140, qrY, { width: 100 });

// const logoY = qrY + 90;
// doc.image(paytmLogo, pageWidth - 160, logoY, { width: 30 });
// doc.image(phonepeLogo, pageWidth - 120, logoY, { width: 40 });
// doc.image(gpayLogo, pageWidth - 70, logoY + 3, { width: 30 });

//     // === Terms and Conditions & Signature ===
//     y = accountY + 80;
//     doc
//         .fillColor('#1E45E1')
//         .font('Helvetica-Bold')
//         .fontSize(10)
//         .text('Terms and Conditions', leftX, y);
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
//     const sideSpacing = 20; // ⬅️ spacing from both sides

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
//    .text(`email: ${invoiceDetails.hostel_email}  |  Contact: ${invoiceDetails.hostel_phone}`, footerX, footerY + 13, {
//        width: footerWidth,
//        align: 'center'
//    });


//     doc.end();
// }
