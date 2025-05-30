const fs = require('fs');
const PDFDocument = require('pdfkit');

function generateInvoice(invoiceDetails, outputPath) {
    const doc = new PDFDocument({ size: 'A4', margin: 0 });
    doc.pipe(fs.createWriteStream(outputPath));

    const pageWidth = doc.page.width;

    // === Header Background ===
    doc.rect(0, 0, pageWidth, 90).fill('#1E45E1');
   

    // === Logo & Tagline ===
    // doc.image('logo.png', 50, 30, { width: 40 }); // Replace with your actual logo
     doc.image('./Asset/Group@2x.png', 10, 30, { width: 35,height:35 });
    doc.image('./Asset/Rectangleblue.png', 35, 215, { width: 8,height:8 });
doc.image('./Asset/location 03.png', 35, 232, { width: 10,height:10 });
    doc
        .fillColor('white')
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('Smartstay', 50, 32)
        .fontSize(10)
        .font('Helvetica')
        .text('Meet All Your Needs.', 50, 52);

    // === Hostel Details Right ===
    doc
        .fillColor('white')
        .fontSize(12)
        .font('Helvetica-Bold')
        .text(invoiceDetails.hostelName, pageWidth - 250, 30, { width: 200, align: 'right' })
        .font('Helvetica')
        .fontSize(9)
        .text(invoiceDetails.address, pageWidth - 250, 48, { width: 200, align: 'right' });

    // === Payment Invoice Title ===
    doc
        .fillColor('black')
        .fontSize(14)
        .font('Helvetica-Bold')
        .text('Final Settlement Receipt', 0, 150, { align: 'center' });

    // === Bill To & Invoice Info ===
    const leftX = 50;
    const rightX = pageWidth - 250;
    const infoY = 180;
    const lineGap = 18;
    const fontSize = 10;
    const lineHeight = fontSize + 6;


   doc
  .fontSize(10)
  .fillColor('#1E45E1') // Blue color for label
  .font('Helvetica-Bold')
  .text('Bill To:', leftX, infoY)

  .fillColor('black') // Back to black for details
  .font('Helvetica')
  .text(invoiceDetails.username, leftX, infoY + lineGap)
  .text(invoiceDetails.phone, leftX, infoY + lineGap * 2)
  .text(invoiceDetails.address, leftX, infoY + lineGap * 3, { width: 250 });


  doc
  .font('Helvetica')
  .fillColor('grey')
  .text('Invoice No:', rightX + 90, infoY)
  .font('Helvetica')
   .fillColor('black')
  .text(invoiceDetails.invoiceNo, rightX + 150, infoY)
  .font('Helvetica')
  .fillColor('grey')
  .text('Invoice Date:', rightX + 90, infoY + lineHeight)
  .font('Helvetica')
   .fillColor('black')
  .text(invoiceDetails.date, rightX + 160, infoY + lineHeight)
  .font('Helvetica')
  .fillColor('grey')
  .text('Due Date:', rightX + 90, infoY + lineHeight * 2)
  .font('Helvetica')
   .fillColor('black')
  .text(invoiceDetails.dueDate, rightX + 160, infoY + lineHeight * 2);

    // === Table Header ===
    const tableY = 280;
    doc.roundedRect(leftX, tableY, pageWidth - 100, 25, 5).fill('#4768EA');

    doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('S.No', leftX + 10, tableY + 7)
        .text('Description', leftX + 60, tableY + 7)
        // .text('Month', leftX + 250, tableY + 7)
        .text('Amount (INR)', leftX + 400, tableY + 7);

    // === Table Rows ===
    
    let y = tableY + 35;
    doc.font('Helvetica').fillColor('black');
    invoiceDetails.items.forEach((item, i) => {
        doc
            .text(item.sno, leftX + 10, y)
            .text(item.desc, leftX + 60, y)
            // .text(item.month, leftX + 250, y)
            .text(`Rs. ${item.amount}`, leftX + 400, y);
        y += 25;
    });

    // === Summary ===
    const subtotal = invoiceDetails.items.reduce((sum, i) => sum + i.amount, 0);
    const tax = invoiceDetails.tax || 0;
    const total = subtotal + tax;
   // === Summary Section with Quote ===


// Right column – Subtotal, Tax, Total
doc
  .fillColor('black')
  .fontSize(10)
  .font('Helvetica-Bold')
  .text('Advance Amount', leftX + 300, y)
  .text(`Rs. ${subtotal.toFixed(2)}`, leftX + 400, y);

// y += 20;

// doc
//   .text('Tax', leftX + 300, y)
//   .text(`Rs. ${tax.toFixed(2)}`, leftX + 400, y);

y += 20;

doc
  .font('Helvetica-Bold')
  .text('Refundable Total', leftX + 300, y)
  .fontSize(12)
  .fillColor('black')
  .text(`Rs. ${total.toFixed(2)}`, leftX + 400, y);


    // === Account Details ===
    // y += 120;
    // doc
    //     .fillColor('#1E45E1')
    //     .font('Helvetica-Bold')
    //     .fontSize(11)
    //     .text('ACCOUNT DETAILS', leftX, y);
    // y += 20;

    // doc
    //     .fillColor('black')
    //     .font('Helvetica')
    //     .fontSize(10)
    //     .text(`Account No   : ${invoiceDetails.bank.accNo}`, leftX, y)
    //     .text(`IFSC Code    : ${invoiceDetails.bank.ifsc}`, leftX, y + 15)
    //     .text(`Bank Name    : ${invoiceDetails.bank.bankName}`, leftX, y + 30)
    //     .text(`UPI ID       : ${invoiceDetails.bank.upi}`, leftX, y + 45);

    // === QR Image ===
    // doc.image('qr.png', pageWidth - 120, y - 5, { width: 80 }); // Place your QR image here

    // === Terms and Signature ===
    y += 100;
    doc
        .fillColor('#1E45E1')
        .font('Helvetica-Bold')
        .fontSize(10)
        .text('Acknowledgment', leftX, y);
    y += 15;

    doc
        .fontSize(9)
        .fillColor('gray')
        .font('Helvetica')
        .text(invoiceDetails.terms || 'No refunds after due date.', leftX, y, { width: 300 });

        y += 10;

// Left column – Farewell message
doc
  .fillColor('#1E45E1')
  .fontSize(10)
  .font('Helvetica')
  .text('"Your comfort is our priority –\nSee you again at Smart Stay!"', leftX + 10, y + 70);

    doc
        .fillColor('#3D3D3D')
        .fontSize(10)
        .font('Helvetica-Bold')
        .text('Authorized Signature', pageWidth - 160, y);
          doc.image('./Asset/paidfull (2).png', 430, 570, { width: 100,height:60 });

    // === Footer ===
    const footerY = 800;
    const footerHeight = 30;
    const footerX = 20;
    const footerWidth = pageWidth - 40;

    doc.roundedRect(footerX, footerY, footerWidth, footerHeight, 15).fill('#1E45E1');

    doc
        .fillColor('white')
        .fontSize(10)
        .text(
            `email : ${invoiceDetails.contact.email}    Contact : ${invoiceDetails.contact.phone}`,
            footerX,
            footerY + 9,
            { width: footerWidth, align: 'center' }
        );

    doc.end();
}

// === Sample Data (same as yours) ===
const invoiceData = {
    date: '2025-05-10',
    invoiceNo: 'INV-2025-001',
    username: 'Muthukrish M',
    phone: '+91 45682 98322',
    address: '8 8th Avenue Ext, Somewhereso Nagar,\nChennai, Tamilnadu - 600 066',
    hostelName: 'Royal Grand Hostel',
    items: [
        { sno: 1, desc: 'Room Rent', month: 'May 2025', amount: 7000 },
         { sno: 2, desc: 'Room Rent', month: 'May 2025', amount: 7000 }
    ],
    dueDate: '2025-05-25',
    tax: 0,
    bank: {
        accNo: '123456789876',
        bankName: 'Bank of India',
        ifsc: 'BOI1234567',
        upi: 'smartstay@upi'
    },
    contact: {
        email: 'contact@royalgrandhostel.in',
        phone: '+91 99999 58491'
    },
    terms: 'This document confirms final settlement for the Tenant on 29/05/2025. All dues are cleared, and room has been vacated.'
};

generateInvoice(invoiceData, 'invoice5.pdf');
