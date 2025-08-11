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

  console.log("invoiceDetails", invoiceDetails);

  try {
    doc.registerFont('Gilroy-Bold', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Bold_0.ttf'));
    doc.registerFont('Gilroy-Regular', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Regular_0.ttf'));
    doc.registerFont('Gilroy-Medium', path.join(__dirname, '..', 'Asset', 'Fonts', 'Gilroy-Medium_0.ttf'));
  } catch (err) {
    console.error("❌ Failed in font registration:", err);
    throw err;
  }

  try { await drawOuterBorder(doc); }
  catch (err) { console.error("❌ Failed in drawOuterBorder:", err); throw err; }

  try { await drawHeader(doc, invoiceDetails); }
  catch (err) { console.error("❌ Failed in drawHeader:", err); throw err; }

  try { await drawInvoiceHeading(doc, 'Final Settlement Receipt'); }
  catch (err) { console.error("❌ Failed in drawInvoiceHeading:", err); throw err; }

  try { await drawBillToSection(doc, invoiceDetails); }
  catch (err) { console.error("❌ Failed in drawBillToSection:", err); throw err; }

  try { await drawInvoiceDetails(doc, invoiceDetails); }
  catch (err) { console.error("❌ Failed in drawInvoiceDetails:", err); throw err; }

  try { await drawInvoiceTable(doc, data, invoiceDetails); }
  catch (err) { console.error("❌ Failed in drawInvoiceTable:", err); throw err; }

  let signatureEndY;
  try { signatureEndY = await drawTermsAndSignature(doc, invoiceDetails); }
  catch (err) { console.error("❌ Failed in drawTermsAndSignature:", err); throw err; }

  try { drawNotes(doc, invoiceDetails, signatureEndY); }
  catch (err) { console.error("❌ Failed in drawNotes:", err); throw err; }

  try { await drawFooter(doc, invoiceDetails); }
  catch (err) { console.error("❌ Failed in drawFooter:", err); throw err; }

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
    .text(invoiceDetails?.banking?.type);
}









function drawInvoiceTable(doc, data, invoiceDetails) {

  console.log("Data***  Final settle ment", data)

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
  invoiceDetails?.Non_Refundable_Amount?.forEach((item, i) => {
    doc.text(i + 1, leftX + 10, y)
      .text(item?.reason || '-', leftX + 200, y)
      .text((item?.amount ?? 0).toFixed(2), leftX + 400, y);
    y += 25;
  });




  const RefundableTotal = invoiceDetails?.Non_Refundable_Amount.reduce((sum, i) => sum + i.amount, 0);

  const total = invoiceDetails?.AdvanceAmount - RefundableTotal;

  console.log("RefundableTotal", RefundableTotal)

  y += 10;
  doc.moveTo(leftX, y).lineTo(leftX + tableWidth, y).strokeColor('#E0E0E0').lineWidth(1).stroke();

  y += 10;
  doc.font('Gilroy-Regular').text('Advance Amount', leftX + 300, y).text(`Rs. ${invoiceDetails?.AdvanceAmount.toFixed(2)}`, leftX + 400, y);
  y += 20;
  doc.font('Gilroy-Regular').text('Refundabled ', leftX + 300, y).text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);

}


async function drawTermsAndSignature(doc, invoiceDetails) {
  let y = 550;
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


  doc.text(`email: ${invoiceDetails.common_email ? invoiceDetails.common_email :  invoiceDetails.hemail || "-"  }`, footerX + padding, footerY + 13);


  const phoneText = `Contact: ${invoiceDetails.common_contact_number ? invoiceDetails.common_contact_number : invoiceDetails.hphone || "-"}`;
  const phoneTextWidth = doc.widthOfString(phoneText);

  doc.text(phoneText, footerX + footerWidth - phoneTextWidth - padding, footerY + 13);
}






module.exports = { generateReceipt };



