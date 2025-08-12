const fs = require('fs');
const PDFDocument = require('pdfkit');
const path = require('path');
const moment = require('moment');
const axios = require('axios');
const request = require('sync-request');
const numberToWords = require('number-to-words');
const sharp = require('sharp');


// Recurring receipt

async function generateReceipt(data, invoiceDetails, outputPath) {
  const doc = new PDFDocument({ size: 'A4', margin: 0 });
  doc.pipe(fs.createWriteStream(outputPath));

  console.log("invoiceDetails", invoiceDetails)
  doc.registerFont('Gilroy-Bold', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Bold_0.ttf'));
  doc.registerFont('Gilroy-Regular', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Regular_0.ttf'));
  doc.registerFont('Gilroy-Medium', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Medium_0.ttf'));
  

let themeColor = invoiceDetails?.template_theme || '#00B14F';

  
  
  if (themeColor.startsWith('rgba')) {
    const match = themeColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      themeColor = [parseInt(match[1]), parseInt(match[2]), parseInt(match[3])];
    }
  }

  await drawOuterBorder(doc);
  await drawHeader(doc, invoiceDetails,themeColor );
  await drawInvoiceHeading(doc, 'Payment Receipt', themeColor);
  await drawBillToSection(doc, invoiceDetails, themeColor);
  await drawInvoiceDetails(doc, invoiceDetails, themeColor);
  const amountBoxX = 360;
  const amountBoxY = 300;  

  await drawAmountBox(doc, data, invoiceDetails, amountBoxX, amountBoxY, themeColor);

 
  const tableStartY = amountBoxY + 60 + 20; 

  await drawInvoiceTable(doc, data, invoiceDetails, tableStartY, themeColor);
  
  await drawAccountDetails(doc, invoiceDetails, themeColor);
  await drawTermsAndSignature(doc, invoiceDetails, themeColor);
  await drawFooter(doc, invoiceDetails, themeColor);

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





async function drawHeader(doc, invoiceDetails,themeColor ) {
  const margin = 20;
  const pageWidth = doc.page.width;
  const headerHeight = 80;

  drawHeaderBackground(doc, margin, pageWidth, headerHeight,themeColor);
  await drawLogo(doc, invoiceDetails, margin);
  drawHostelDetails(doc, invoiceDetails, pageWidth,themeColor );
}

function drawHeaderBackground(doc, margin, pageWidth, headerHeight, themeColor) {
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
    .fill(themeColor);
}




async function drawLogo(doc, invoiceDetails, margin) {
  const logoPath = path.resolve(__dirname, '../Asset/receiptlogo.png');
  const x = margin + 18;
  const y = 34;
  const width = 60;
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


function drawInvoiceHeading(doc, headingText, themeColor) {
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
    .fillColor(themeColor)
    .text(headingText, x, y, { align: 'left', continued: false });


  doc.fillColor(themeColor);
}



async function drawBillToSection(doc, invoiceDetails, themeColor) {
  const leftX = 50;
  const infoY = 170;
  const lineGap = 18;


  doc.fillColor(themeColor).font('Gilroy-Bold').fontSize(10).text('Bill To:', leftX, infoY);
  doc.fillColor('black').font('Gilroy-Medium');

  let y = infoY + lineGap;



async function loadThemedSVGAsPNG(filePath, themeColor) {
  let colorStr = themeColor;
  if (Array.isArray(themeColor)) {
    colorStr = `rgb(${themeColor[0]}, ${themeColor[1]}, ${themeColor[2]})`;
  }

  let svgContent = fs.readFileSync(filePath, 'utf8');

  
  svgContent = svgContent.replace(/\sfill="[^"]*"/g, '');
  svgContent = svgContent.replace(/\sstroke="[^"]*"/g, '');

  
  svgContent = svgContent.replace(
    /<(path|rect|circle|polygon|ellipse)([^>]*?)(\/?)>/g,
    `<$1$2 fill="${colorStr}"$3>`
  );

  
  svgContent = svgContent.replace(
    /<svg([^>]*)>/,
    `<svg$1 fill="${colorStr}" stroke="${colorStr}">`
  );

  return await sharp(Buffer.from(svgContent)).png().toBuffer();
}






  async function drawIconText(iconPath, text) {
  if (!text) return;
  const iconBuffer = await loadThemedSVGAsPNG(iconPath, themeColor);
  doc.image(iconBuffer, leftX, y - 2, { width: 10, height: 10 });
  doc.text(text, leftX + 15, y);
  y += lineGap;
}



  const profileIcon = path.resolve(__dirname, '../Asset/Name.svg');
  const phoneIcon = path.resolve(__dirname, '../Asset/Phone.svg');
  const bedIcon = path.resolve(__dirname, '../Asset/Bed.svg');
  const locationIcon = path.resolve(__dirname, '../Asset/location.svg');


  await drawIconText(profileIcon, invoiceDetails.uname);
  await drawIconText(phoneIcon, invoiceDetails.uphone);
  await drawIconText(bedIcon, invoiceDetails.uRooms ? `${invoiceDetails.uRooms} - ${invoiceDetails.uBed}` : null);


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
  const locationBuffer = await loadThemedSVGAsPNG(locationIcon, themeColor);
  if (!locationBuffer || locationBuffer.length < 100) {
    throw new Error(`Invalid icon buffer for ${locationIcon}`);
  }
  doc.image(locationBuffer, leftX, y - 2, { width: 10, height: 10 });
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





function drawAmountBox(doc, data, invoiceDetails, boxX, boxY,themeColor ) {
  const pageWidth = doc.page.width;
  const margin = 50;
  const lineY = boxY;

  
  doc
    .fontSize(12)
    .fillColor('black')
    .font('Gilroy-Regular')
    .text('Payment For', margin, lineY);

  
  const amountReceivedText = 'Amount received';
  const textWidth = doc.widthOfString(amountReceivedText);
  const centerX = pageWidth / 2 - textWidth / 2;

  doc
    .fontSize(10)
    .fillColor('black')
    .font('Gilroy-Regular')
    .text(amountReceivedText, centerX, lineY);

 
  const rectWidth = 200;
  const rectHeight = 50;

  doc
    .roundedRect(boxX, lineY - 5, rectWidth, rectHeight, 5)
    .strokeColor(themeColor)
    .lineWidth(1)
    .stroke();


  const subtotal = data.reduce((sum, i) => sum + parseFloat(i.amount_received || 0), 0);
  const tax = parseFloat(invoiceDetails.tax || 0);
  const total = subtotal;

  
  doc
    .fontSize(14)
    .fillColor(themeColor)
    .font('Gilroy-Bold')
    .text(total.toFixed(2), boxX, lineY, {
      width: rectWidth,
      align: 'center',
    });

  
  const amountInWords = convertAmountToWords(total);
  doc
    .fontSize(9)
    .fillColor('#555555')
    .font('Gilroy-Bold')
    .text(amountInWords, boxX + 5, lineY + 18, { 
      width: rectWidth - 10,
      align: 'center',
    });
}


function drawInvoiceTable(doc, data, invoiceDetails, tableY = 280, themeColor) {
  const leftX = 50;
  const tableWidth = doc.page.width - 100;

  doc.roundedRect(leftX, tableY, tableWidth, 25, 5).fill(themeColor);
  doc.font('Gilroy-Regular').fillColor('white').font('Gilroy-Bold').fontSize(10)
    .text('S.No', leftX + 10, tableY + 7)
    .text('INV', leftX + 70, tableY + 7)
    .text('Description', leftX + 200, tableY + 7)
    .text('Duration', leftX + 300, tableY + 7)
    .text('Amount (INR)', leftX + 400, tableY + 7);

  let y = tableY + 35;
  doc.font('Gilroy-Regular').fillColor('black');






data.forEach((item, i) => {
  const formattedDate = item.Date
    ? new Date(item.Date).toLocaleString('en-US', { month: 'short', year: 'numeric' })
    : '-';

  doc
    .text(i + 1, leftX + 10, y) 
    .text(item.invoice_number || '-', leftX + 70, y)
    .text(item.action || '-', leftX + 200, y)
    .text(formattedDate, leftX + 300, y)
    .text(
      parseFloat(item.amount_received ?? 0).toFixed(2), 
      leftX + 400,
      y
    );

  y += 25; 
  doc.moveTo(leftX, y).lineTo(leftX + tableWidth, y).strokeColor('#E0E0E0').lineWidth(1).stroke();
});

  
}





function drawAccountDetails(doc, invoiceDetails,themeColor) {
  let y = 500;
  const leftX = 50;
  const valueX = leftX + 100;
  const pageWidth = doc.page.width;

  doc.fillColor(themeColor).font('Gilroy-Bold').fontSize(11).text('ACCOUNT DETAILS', leftX, y);
  y += 20;

  doc.fontSize(10).fillColor('black').font('Gilroy-Medium');
  doc.text('Payment Mode', leftX, y).text(`: ${invoiceDetails?.banking?.type || "NA"}`, valueX, y);
  y += 15;

  doc.text('Payment Recorded By', leftX, y).text(` : ${" "} ${invoiceDetails?.Payment_Recorded_By || ""}`, valueX, y);
  y += 15;
 
  doc.text('Status', leftX, y).text(`: ${"Paid"}`, valueX, y);
  y += 15;

   const immage1 = path.resolve(__dirname, '../Asset/image 32.png');
  

  const qrX = 400;
  const qrY = 500;

   if (fs.existsSync(immage1)) {
    doc.image(immage1, qrX, qrY, { width: 100, height:70 });
  }

   y = Math.max(y, qrY + 70) + 20; 


  doc
    .fontSize(12)
    .fillColor(themeColor)
    .text(invoiceDetails?.notes ||
      'Thank you for choosing SmartStay.\nYour transaction is completed.',
      50, 
      y,
      {
        width: pageWidth - 100, 
        align: 'right'
      }
    );


}





async function drawTermsAndSignature(doc, invoiceDetails,themeColor) {
    const leftX = 50;
    const rightX = 400;
    const blockY = 700;
    const signatureWidth = 100;
    const signatureHeight = 60;

    
    doc.fillColor(themeColor)
        .font('Gilroy-Bold')
        .fontSize(10)
        .text('Terms and Conditions', leftX, blockY);


    const termsText = invoiceDetails.terms_and_condition
        ? invoiceDetails.terms_and_condition
        : "Tenants must pay all dues on or before the due date, maintain cleanliness, and follow PG rules; failure may lead to penalties or termination of stay.";

    const termsHeight = doc.heightOfString(termsText, { width: 300 });

    doc.fillColor('gray')
        .font('Gilroy-Medium')
        .fontSize(9)
        .text(termsText, leftX, blockY + 15, { width: 300 });

   
    const sigY = blockY + (termsHeight / 2) - (signatureHeight / 2);
    const sigX = rightX + 50; 

    if (invoiceDetails.digital_signature_url) {
        const response = await axios.get(invoiceDetails.digital_signature_url, { responseType: 'arraybuffer' });
        const imageBuffer = Buffer.from(response.data, 'binary');

        doc.image(imageBuffer, sigX, sigY, {
            width: signatureWidth,
            height: signatureHeight
        });
    }

    
    doc.fillColor('black')
        .font('Gilroy-Bold')
        .fontSize(10)
        .text('Authorized Signature', sigX, sigY + signatureHeight + 5, {
            align: 'center',
            width: signatureWidth 
        });
}

function drawFooter(doc, invoiceDetails,themeColor) {
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
    .fill(themeColor);
  doc.restore();

  doc.fillColor('white').fontSize(10).font('Gilroy-Medium');


  doc.text(`email: ${invoiceDetails.common_email ? invoiceDetails.common_email : invoiceDetails.hemail || '-'}`, footerX + padding, footerY + 13);

 
  const phoneText = `Contact: ${invoiceDetails.common_contact_number ?  invoiceDetails.common_contact_number : invoiceDetails.hphone || '-'}`;
  const phoneTextWidth = doc.widthOfString(phoneText);

  doc.text(phoneText, footerX + footerWidth - phoneTextWidth - padding, footerY + 13);
}






module.exports = { generateReceipt };





























// function generateReceipt(data, invoiceDetails, outputPath) {
 
//     const doc = new PDFDocument({ size: 'A4', margin: 0 });
//     doc.pipe(fs.createWriteStream(outputPath));

//     const pageWidth = doc.page.width;
//     const pageHeight = doc.page.height;
//     const outerPadding = 20;
     

//     // ==== Outer Border ====
//     doc.lineWidth(1)
//         .strokeColor('#DADADA')
//         .roundedRect(outerPadding, outerPadding, pageWidth - 2 * outerPadding, pageHeight - 2 * outerPadding, 10)
//         .stroke();

//     // ==== Green Header ====
//     const headerHeight = 90;
//     doc.rect(outerPadding, outerPadding, pageWidth - 2 * outerPadding, headerHeight)
//         .fill('#00A32E');

//     // ==== Logo and Host Details ====
//     const logoPath = path.resolve(__dirname, '../Asset/receiptlogo.png');
//     const contactIconPath = path.resolve(__dirname, '../Asset/image 32.png');
//     const stampPath = path.resolve(__dirname, '../Asset/payment_stamp.png'); 
//       const rectBluePath = path.resolve(__dirname, '../Asset/Rectangle 77.png');
//      const locationIconPath = path.resolve(__dirname, '../Asset/Subtract.png');
//      const locationuserPath = path.resolve(__dirname, '../Asset/usertwo.png');

//     doc.image(logoPath, outerPadding + 10, outerPadding + 20, { width: 30, height: 30 });

//       doc.image(locationuserPath, 50, 188, { width: 8, height: 8 });
//     doc.image(rectBluePath, 50, 203, { width: 8, height: 8 });
//     doc.image(locationIconPath, 50, 220, { width: 10, height: 10 });
//     doc
//         .fillColor('white')
//         .font('Helvetica-Bold').fontSize(18)
//         .text('Smartstay', outerPadding + 50, outerPadding + 20)
//         .font('Helvetica').fontSize(10)
//         .text('Meet All Your Needs', outerPadding + 40, outerPadding + 50);

//     doc
//         .fillColor('white')
//         .font('Helvetica-Bold').fontSize(12)
//         .text(invoiceDetails.hname, pageWidth - outerPadding - 120, outerPadding + 20, {
//             width: 180, align: 'left'
//         })
//         .font('Helvetica').fontSize(9)
//         .text([invoiceDetails.haddress, invoiceDetails.harea].filter(Boolean).join(', '), {
//             width: 180, align: 'left'
//         })
//         .text([invoiceDetails.hlandmark, invoiceDetails.hcity].filter(Boolean).join(' - '), {
//             width: 180, align: 'left'
//         })
//         .text([invoiceDetails.hstate, invoiceDetails.hpincode].filter(Boolean).join(' - '), {
//             width: 180, align: 'left'
//         });

//     // ==== Title ====
//     doc
//         .fillColor('black')
//         .font('Helvetica-Bold').fontSize(14)
//         .text('Payment Receipt', 0, outerPadding + headerHeight + 30, { align: 'center' });

//     // ==== Bill To ====
//     const leftX = outerPadding + 30;
//     const rightX = pageWidth - outerPadding - 230;
//     let infoY = outerPadding + headerHeight + 60;
//     const lineGap = 18;
//     const lineHeight = 14;

//     doc
//         .fontSize(10)
//         .fillColor('#00A32E')
//         .font('Helvetica-Oblique')
//         .text('Bill To:', leftX - 3, infoY);

//     doc.fillColor('black').font('Helvetica');
//     infoY += lineGap;

//     if (invoiceDetails.uname) {
//         doc.text(invoiceDetails.uname, leftX + 16, infoY); infoY += lineGap;
//     }
//     if (invoiceDetails.uphone) {
//         doc.text(
//             `+${invoiceDetails.uphone}`, leftX + 16, infoY); infoY += lineGap;
//     }

//     const addressLines = [
//         [invoiceDetails.uaddress, invoiceDetails.uarea].filter(Boolean).join(', '),
        
//         [invoiceDetails.ulandmark, invoiceDetails.ucity].filter(Boolean).join(' - '),
//         [invoiceDetails.ustate, invoiceDetails.upincode].filter(Boolean).join(' - ')
//     ];
//     addressLines.forEach(line => {
//         if (line) {
//             doc.text(line, leftX + 16, infoY);
//             infoY += lineGap -4 
//         }
//     });

//     const formattedDate = moment(invoiceDetails.payment_date).format('DD-MM-YYYY');
//     const formattedDueDate = moment(invoiceDetails.DueDate).format('DD-MM-YYYY');

//     doc.fillColor('gray').font('Helvetica').fontSize(10);
//     const rightStartY = outerPadding + headerHeight + 60;
//     doc.text('Receipt No:', rightX + 60, rightStartY);
//     doc.text('Invoice Ref:', rightX + 60, rightStartY + lineHeight * 1.3);
//     doc.text('Date:', rightX + 60, rightStartY + lineHeight * 2.6);
//     doc.text('Payment Mode:', rightX + 60, rightStartY + lineHeight * 4);

//     doc.fillColor('black');
//     doc.text( `# ${invoiceDetails.reference_id}`, rightX + 130, rightStartY);
//     doc.text(`# ${invoiceDetails.invoice_number}`, rightX + 130, rightStartY + lineHeight * 1.3);
//     doc.text(formattedDate, rightX + 130, rightStartY + lineHeight * 2.6);
//     doc.text(invoiceDetails.bank_type || invoiceDetails.payment_mode, rightX + 135, rightStartY + lineHeight * 4);

//     // ==== Table Header ====
//     // const tableY = rightStartY + 100;
//     // doc.roundedRect(leftX, tableY, pageWidth - 2 * outerPadding - 40, 25, 5).fill('#00A32E');

//     // doc
//     //     .fillColor('white')
//     //     .font('Helvetica-Bold').fontSize(10)
//     //     .text('S.NO', leftX + 10, tableY + 7)
//     //     .text('Inv No', leftX + 70, tableY + 7)
//     //     .text('Description', leftX + 150, tableY + 7)
//     //     .text('Duration', leftX + 300, tableY + 7)
//     //     .text('Amount / INR', leftX + 420, tableY + 7);

//     // // ==== Table Rows ====
//     // let y = tableY + 30;
//     // const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
//     // const tax = invoiceDetails.tax || 0;
//     // const total = subtotal + tax;

//     // doc.fillColor('black').font('Helvetica').fontSize(10);
//     // data.forEach((item, i) => {
//     //     doc
//     //         .text(i + 1, leftX + 10, y)
//     //         .text(item.invoice_number || '-', leftX + 70, y)
//     //         .text(item.am_name, leftX + 150, y)
//     //         .text(item.month, leftX + 300, y)
//     //         .text((item.amount ?? 0).toFixed(2), leftX + 420, y);
//     //     y += 25;
//     // });
// const tableY = rightStartY + 100;

// doc.roundedRect(leftX, tableY, pageWidth - 2 * outerPadding - 50, 25, 5).fill('#00A32E');

// doc
//     .fillColor('white')
//     .font('Helvetica-Bold').fontSize(10)
//     .text('S.NO', leftX + 10, tableY + 7)
//     .text('Inv No', leftX + 70, tableY + 7)
//     .text('Description', leftX + 150, tableY + 7)
//     .text('Duration', leftX + 300, tableY + 7)
//     .text('Amount / INR', leftX + 420, tableY + 7);

// // === Table Rows ===
// // let y = tableY + 30;
// // const subtotal = data.reduce((sum, i) => sum + i.amount, 0);
// // const tax = invoiceDetails.tax || 0;
// // const total = subtotal + tax;

// // doc.fillColor('black').font('Helvetica').fontSize(10);
// // data.forEach((item, i) => {
// //     doc
// //         .text(i + 1, leftX + 10, y)
// //         .text(item.invoice_number || '-', leftX + 70, y)
// //         .text(item.am_name, leftX + 150, y)
// //         .text(item.month, leftX + 300, y)
// //         .text((item.amount ?? 0).toFixed(2), leftX + 420, y);
// //     y += 25;
// // });
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
//         .text(moment(item?.created_at).format("MMM YYYY"), leftX + 300, y)
//         .text((item.amount ?? 0).toFixed(2), leftX + 420, y);

//     // Horizontal line after each row
//     doc
//         .moveTo(leftX , y + 15)
//         .lineTo(leftX + 505, y + 15)
//         .strokeColor('#D9D9D9') // light grey (optional)
//         .lineWidth(0.10)
//         .stroke();

//     y += 25;
// });

// // === Horizontal Line Below Rows ===
// // doc
// //     .moveTo(leftX, y - 5)
// //     .lineTo(pageWidth - outerPadding - 20, y - 5)
// //     .lineWidth(1)
// //     .strokeColor('#DADADA')
// //     .stroke();
//     // ==== Total Section ====
//     y += 10;
//     doc
//         .font('Helvetica')
//         .text('Sub Total', leftX + 300, y)
//         .text(`${subtotal.toFixed(2)}`, leftX + 420, y);
//     y += 20;
//     doc
//         .text('Total', leftX + 300, y)
//         .fontSize(12)
//         .fillColor('black')
//         .text(`${total.toFixed(2)}`, leftX + 420, y);


//       y += 30;

// doc
//   .moveTo(outerPadding, y) // Use outerPadding instead of margin
//   .lineTo(pageWidth - outerPadding, y) // Respect outer padding on right too
//   .lineWidth(1)
//   .strokeColor('#E0E0E0') // Light gray line like in Figma
//   .stroke();

//     // ==== "PAYMENT RECEIVED" stamp ====
//     if (fs.existsSync(stampPath)) {
//         doc.image(stampPath, leftX + 380, tableY + 130, { width: 120 });
//     }

//     // ==== Payment Details ====
//     y += 80;
//     doc.fillColor('#00A32E').fontSize(11).font('Helvetica-Bold').text('PAYMENT DETAILS', leftX, y);
//     y += 20;

//     doc.fillColor('black').fontSize(10).font('Helvetica');
//     doc.text(`Payment Mode : ${invoiceDetails.bank_type || invoiceDetails.payment_mode}`, leftX, y); y += 15;
//     doc.text(`Transaction ID: ${invoiceDetails.trans_id || '—'}`, leftX, y); y += 15;
//     doc.text(`Received By : ${invoiceDetails.benificiary_name || "Account"}`, leftX, y); y += 15;
//     doc.text(`Status : Paid`, leftX, y);

//     // ==== Contact Image ====
//     doc.image(contactIconPath, pageWidth - outerPadding - 130, y - 40, { width: 100 });

//     // ==== Acknowledgment ====
//     y += 80;
//     doc.fillColor('#00A32E').font('Helvetica-Bold').fontSize(10).text('Acknowledgment', leftX, y);
//     y += 15;
//     doc.fillColor('gray').font('Helvetica').fontSize(9)
//         .text(invoiceDetails.terms || 'Once payment is confirmed, this invoice shall be treated as paid. Services availed are calculated based on service rules.', leftX, y, { width: 350 });

//     doc
//         .fillColor('#3D3D3D')
//         .font('Helvetica-Bold')
//         .fontSize(10)
//         .text('Authorized Signature', pageWidth - outerPadding - 150, y + 10);

//     // ==== Footer ====
// const footerHeight = 30;
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




