const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');
const axios = require('axios');
  const request = require('sync-request');


// advance only


async function generateInvoice(data, invoiceDetails, outputPath) {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(fs.createWriteStream(outputPath));

    console.log("invoiceDetails advance bill", invoiceDetails)
    doc.registerFont('Gilroy-Bold', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Bold_0.ttf'));
    doc.registerFont('Gilroy-Regular', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Regular_0.ttf'));
    doc.registerFont('Gilroy-Medium', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Medium_0.ttf'));
    console.log(path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Bold_0.ttf'));



    await drawOuterBorder(doc);
    await drawHeader(doc, invoiceDetails);
    await drawInvoiceHeading(doc, 'Security Deposit Invoice');
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

console.log("Data***",data)

    const leftX = 50;
    const tableY = 280;
    const tableWidth = doc.page.width - 100;


    doc.roundedRect(leftX, tableY, tableWidth, 25, 5).fill('#4768EA');
    doc.font('Gilroy-Regular').fillColor('white').font('Gilroy-Bold').fontSize(10)
        .text('S.No', leftX + 10, tableY + 7)
        .text('INV', leftX + 70, tableY + 7)
        .text('Description', leftX + 200, tableY + 7)
        .text('Amount (INR)', leftX + 400, tableY + 7);

    // Rows
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
   
    const total = subtotal - RefundableTotal ;





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


// console.log("invoiceDetails",invoiceDetails)

//     const doc = new PDFDocument({ size: 'A4', margin: 0 });
//     doc.pipe(fs.createWriteStream(outputPath));

//     const pageWidth = doc.page.width;
//     const pageHeight = doc.page.height;
//     const margin = 20;
//     const leftX = 50;

//     // === Outer Border ===
//     doc.lineWidth(1).strokeColor('#E0E0E0')
//         .rect(margin, margin, pageWidth - margin * 2, pageHeight - margin * 2).stroke();

//     // === Header Background ===
//     doc.rect(margin, margin, pageWidth - margin * 2, 80).fill('#1E45E1');

//     // === Logo and Branding ===

//     const logoPath = path.resolve(__dirname, '../Asset/Group@2x.png');
//     const rectBluePath = path.resolve(__dirname, '../Asset/Rectangleblue.png');
//     const locationIconPath = path.resolve(__dirname, '../Asset/location 03.png');
//     const qrPath = path.resolve(__dirname, '../Asset/qr.png'); // Optional QR
//      const locationuserPath = path.resolve(__dirname, '../Asset/user.png');

//     doc.image(invoiceDetails.logo_url ? invoiceDetails.logo_url : logoPath, margin + 18, 34, { width: 50, height: 50 });
//     doc
//         .fillColor('white')
//         .fontSize(18)
//         .font('Helvetica-Bold')
//                .fontSize(10)
//         .font('Helvetica')


//     // === Hostel Info Right Side ===

//     // doc
//     //     .fillColor('white')
//     //     .fontSize(12)
//     //     .font('Helvetica-Bold')
//     //     .text(invoiceDetails.Hostel_Name, pageWidth - 200, 30, { width: 200, align: 'left' })
//     //     .fontSize(9)
//     //     .font('Helvetica')
//     //     .text(
//     //         [invoiceDetails.hostel_address, invoiceDetails.harea].filter(Boolean).join(', '),
//     //         pageWidth - 200,
//     //         48,
//     //         { width: 200, align: 'left' }
//     //     )
//     //     .text(
//     //         [invoiceDetails.hlandmark, invoiceDetails.hpincode].filter(Boolean).join(' - '),
//     //         pageWidth - 200,
//     //         60,
//     //         { width: 200, align: 'left' }
//     //     )
//     //     .text(
//     //         [invoiceDetails.hcity, invoiceDetails.hstate].filter(Boolean).join(' - '),
//     //         pageWidth - 200,
//     //         72,
//     //         { width: 200, align: 'left' }
//     //     );
//     const hostelInfoX = pageWidth - 160; // starting point for right-aligned block
// const hostelInfoWidth = 250;

// // doc
// //   .fillColor('white')
// //   .fontSize(12)
// //   .font('Helvetica-Bold')
// //   .text(invoiceDetails.Hostel_Name, hostelInfoX, 30, {
// //     width: hostelInfoWidth,
// //     align: 'left'
// //   })
// //   .fontSize(9)
// //   .font('Helvetica')
// //   .text(
// //     [invoiceDetails.hostel_address, invoiceDetails.harea].filter(Boolean).join(', '),
// //     hostelInfoX,
// //     48,
// //     { width: hostelInfoWidth, align: 'left' }
// //   )
// //   .text(
// //     [invoiceDetails.hlandmark, invoiceDetails.hcity].filter(Boolean).join(' - '),
// //     hostelInfoX,
// //     60,
// //     { width: hostelInfoWidth, align: 'left' }
// //   )
// //   .text(
// //     [invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - '),
// //     hostelInfoX,
// //     72,
// //     { width: hostelInfoWidth, align: 'left' }
// //   );
// doc
//   .fillColor('white')
//   .fontSize(12)
//   .font('Helvetica-Bold')
//   .text(invoiceDetails.Hostel_Name, hostelInfoX, 30, {
//     width: hostelInfoWidth,
//     align: 'left',
//   })
//   .fontSize(9)
//   .font('Helvetica');

// let currentwY = 48; 

// const lines = [
//   [invoiceDetails.hostel_address, invoiceDetails.harea].filter(Boolean).join(', '),
//   [invoiceDetails.hlandmark, invoiceDetails.hcity].filter(Boolean).join(' - '),
//   [invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - ')
// ];

// lines.forEach(line => {
//   if (line) {
//     doc.text(line, hostelInfoX, currentwY, {
//       width: hostelInfoWidth,
//       align: 'left'
//     });
//     currentwY += 12;
//   }
// });



//     // === Invoice Title ===
//     doc
//         .fillColor('black')
//         .fontSize(14)
//         .font('Helvetica-Bold')
//         .text('Security Deposit Invoice', 0, 150, { align: 'center' });

//     // === Bill To Section ===
//     const infoY = 180;
//     const lineGap = 18;
//     const rightX = pageWidth - 250;

//   doc.image(locationuserPath, 50, 197, { width: 8, height: 8 });
//     doc.image(rectBluePath, 50, 215, { width: 8, height: 8 });
//     doc.image(locationIconPath, 50, 234, { width: 10, height: 10 });

//     doc
//         .fontSize(10)
//         .fillColor('#1E45E1')
//         .font('Helvetica-Oblique')
//         .text('Bill To:', leftX, infoY);

//     doc.fillColor('black').font('Helvetica');
//     let currentY = infoY + lineGap;

//     if (invoiceDetails.Name) {
//         doc.text(invoiceDetails.Name, leftX + 12, currentY);
//         currentY += lineGap;
//     }

//     if (invoiceDetails.phoneNo) {
//         doc.text(invoiceDetails.phoneNo, leftX + 12, currentY);
//         currentY += lineGap;
//     }

//     const addressLines = [
//         [invoiceDetails.UserAddress, invoiceDetails.uarea].filter(Boolean).join(', '),
//         [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - '),
//         [invoiceDetails.ustate, invoiceDetails.upincode].filter(Boolean).join(' - ')
//     ];
//     addressLines.forEach(line => {
//         const height = doc.heightOfString(line, { width: 250 });
//         doc.text(line, leftX + 12, currentY, { width: 250 });
//         currentY += height + 2;
//     });

//     // const formattedDate = moment(invoiceDetails.Date).format('DD-MM-YYYY');
//     const utcDate = new Date(invoiceDetails.Date);
// const formattedDate = utcDate.toLocaleDateString('en-GB', {
//   day: '2-digit',
//   month: 'short',
//   year: 'numeric',
//   timeZone: 'UTC',
// });
//     const utcDate1 = new Date(invoiceDetails.DueDate);
// const formattedDueDate = utcDate1.toLocaleDateString('en-GB', {
//   day: '2-digit',
//   month: 'short',
//   year: 'numeric',
//   timeZone: 'UTC',
// });
//    const utcDate2 = new Date(invoiceDetails.joining_Date);
// const formattedJoinDate = utcDate2.toLocaleDateString('en-GB', {
//   day: '2-digit',
//   month: 'short',
//   year: 'numeric',
//   timeZone: 'UTC',
// });




//     const labelX = rightX + 70;
//     doc
//         .font('Helvetica')
//         .fillColor('grey')
//         .text('Invoice No:', labelX, infoY)
//         .fillColor('black')
//         // .text('#',invoiceDetails.Invoices, labelX + 60, infoY)
//         .text(`# ${invoiceDetails.Invoices}`, labelX + 70, infoY)
//         .fillColor('grey')
//         .text('Invoice Date:', labelX, infoY + lineGap)
//         .fillColor('black')
//         .text(formattedDate, labelX + 70, infoY + lineGap)
//         .fillColor('grey')
//         .text('Due Date:', labelX, infoY + lineGap * 2)
//         .fillColor('black')
//         .text(formattedDueDate, labelX + 70, infoY + lineGap * 2)
//         // .fillColor('grey')
//         // .text('Joining Date:', labelX, infoY + lineGap * 3 + 5)
//         // .fillColor('black')
//         // .text(formattedJoinDate, labelX + 70, infoY + lineGap * 3 + 5);
//         .fillColor('grey')
// .text('Joining Date:', labelX, infoY + lineGap * 2.8)
// .fillColor('black')
// .text(formattedJoinDate, labelX + 70, infoY + lineGap * 2.8);

//     // === Table Header ===
//     const tableY = 280;
//     const tableWidth = pageWidth - 100;
//     doc.roundedRect(leftX, tableY, tableWidth, 25, 5).fill('#4768EA');

//     doc
//   .fillColor('white')
//   .font('Helvetica-Bold')
//   .fontSize(10)
//   .text('S.No', leftX + 10, tableY + 7)
//   .text('INV', leftX + 70, tableY + 7)
//   .text('Description', leftX + 200, tableY + 7)
//   .text('Amount (INR)', leftX + 400, tableY + 7);


//     // === Table Rows ===
//   let y = tableY + 35;
// doc.font('Helvetica').fillColor('black');

// data.forEach((item, i) => {
//     doc
//         .text(i + 1, leftX + 10, y) // S.No
//         .text(item.Invoices || '-', leftX + 70, y) // Invoice Number
//         .text(item.am_name || '-', leftX + 200, y) // Description
//         .text((item.amount ?? 0).toFixed(2), leftX + 400, y); // Amount
//     y += 25;
// });

//     // === Horizontal Line after Table ===
//     doc
//         .moveTo(leftX, y)
//         .lineTo(leftX + tableWidth, y)
//         .lineWidth(1)
//         .strokeColor('#D3D3D3')
//         .stroke();

//     // === Subtotal/Tax/Total ===
//     const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
//     const tax = invoiceDetails.tax || 0;
//     const total = subtotal + tax;

//     y += 10;
//     doc
//         .font('Helvetica-Bold')
//         .text('Sub Total', leftX + 300, y)
//         .text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);

//     y += 20;
//     doc
//         .font('Helvetica')
//         .text('Tax', leftX + 300, y)
//         .text(`Rs. ${tax.toFixed(2)}`, leftX + 400, y);

//     y += 20;
//     doc
//         .font('Helvetica-Bold')
//         .fontSize(12)
//         .text('Total', leftX + 300, y)
//         .text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);

//     // === Horizontal Line under summary ===
//     y += 20;
//     doc
//         .moveTo(margin, y)
//         .lineTo(pageWidth - margin, y)
//         .strokeColor('#E0E0E0')
//         .stroke();

//     // === Account Details ===
//     y += 20;
//     doc
//         .fillColor('#1E45E1')
//         .font('Helvetica-Bold')
//         .fontSize(11)
//         .text('ACCOUNT DETAILS', leftX, y);
//     y += 20;

//     doc.fontSize(10).fillColor('black').font('Helvetica');
//     const valueX = leftX + 100;
//     let accountY = y;

//     doc.text('Account No', leftX, accountY);
//     doc.text(`: ${invoiceDetails.acc_num || "NA"}`, valueX, accountY);
//     accountY += 15;

//     doc.text('IFSC Code', leftX, accountY);
//     doc.text(`: ${invoiceDetails.ifsc_code || "NA"}`, valueX, accountY);
//     accountY += 15;

//     doc.text('Bank Name', leftX, accountY);
//     doc.text(`: ${invoiceDetails.acc_name || "NA"}`, valueX, accountY);
//     accountY += 15;

//     doc.text('UPI ID', leftX, accountY);
//     doc.text(`: ${invoiceDetails.upi_id || "NA"}`, valueX, accountY);
//     accountY += 15;

//     // === QR Code (optional) ===
//     if (fs.existsSync(qrPath)) {
//         doc.image(qrPath, pageWidth - 120, y - 5, { width: 80 });
//     }


// //     const qrImagePath = path.resolve(__dirname, '../Asset/barcode.png');
// // const paytmLogo = path.resolve(__dirname, '../Asset/paytm.png');
// // const phonepeLogo = path.resolve(__dirname, '../Asset/phonepay.png');
// // const gpayLogo = path.resolve(__dirname, '../Asset/gpay.png');


// // let qrY = y - 5;

// // // Draw QR Code
// // doc.image(qrImagePath, rightX + 60, qrY, { width: 100 });

// // // Payment Logos below QR
// // const logoY = qrY + 85;
// // doc.image(paytmLogo, rightX + 35, logoY + 5, { width: 30 });
// // doc.image(phonepeLogo, rightX + 70, logoY + 5, { width: 40 });
// // doc.image(gpayLogo, rightX + 120, logoY + 8, { width: 30 });

//     // === Terms and Signature ===
//     // y += 100;

//     //     doc
//     //         .fillColor('#1E45E1')
//     //         .font('Helvetica-Bold')
//     //         .fontSize(10)
//     //         .text('Terms and Conditions', leftX, y + 100);
//     //     y += 115;

//     //     doc
//     //         .fontSize(9)
//     //         .fillColor('gray')
//     //         .font('Helvetica')
//     //         .text("Tenants must pay all dues on or before the due date, maintain cleanliness, and follow PG rules; failure may lead to penalties or termination of stay.", leftX, y, { width: 300 });




// const qrImagePath = path.resolve(__dirname, '../Asset/barcode.png');
// const paytmLogo = path.resolve(__dirname, '../Asset/paytm.png');
// const phonepeLogo = path.resolve(__dirname, '../Asset/phonepay.png');
// const gpayLogo = path.resolve(__dirname, '../Asset/gpay.png');

// let qrY = y - 30; // Safer to use +10 for spacing
// doc.image(qrImagePath, pageWidth - 140, qrY, { width: 100 });

// const logoY = qrY + 90;
// doc.image(paytmLogo, pageWidth - 160, logoY, { width: 30 });
// doc.image(phonepeLogo, pageWidth - 120, logoY, { width: 40 });
// doc.image(gpayLogo, pageWidth - 70, logoY + 3, { width: 30 });

// // Terms & Conditions
// let termsY = logoY + 120;
// // if (invoiceDetails.privacyPolicyHtml) {
//     doc
//         .fillColor('#1E45E1')
//         .font('Helvetica-Bold')
//         .fontSize(10)
//         .text('Terms and Conditions', leftX, termsY);

//     termsY += 15;

//     doc
//         .fontSize(9)
//         .fillColor('gray')
//         .font('Helvetica')
//         .text(
//             "Tenants must pay all dues on or before the due date, maintain cleanliness, and follow PG rules; failure may lead to penalties or termination of stay.",
//             leftX,
//             termsY,
//             { width: 300 }
//         );
// // }

// // Authorized Signature aligned nicely near QR bottom
// doc
//     .fillColor('#3D3D3D')
//     .fontSize(10)
//     .font('Helvetica-Bold')
//     .text('Authorized Signature', pageWidth - 160, logoY + 120);

//     // === Footer ===


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
//    .text(`email: ${invoiceDetails.hostel_email}  |  Contact: ${invoiceDetails.hostel_phone}`, footerX, footerY + 13, {
//        width: footerWidth,
//        align: 'center'
//    });



//     doc.end();
// }