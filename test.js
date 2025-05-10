const fs = require('fs');
const PDFDocument = require('pdfkit');

function generateInvoice(invoiceDetails, outputPath) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    doc.pipe(fs.createWriteStream(outputPath));

    // ==== Header Background ====
    doc.rect(0, 0, doc.page.width, 120).fill('#1E45E1');

    // ==== LEFT HEADER ====
    doc
        .fillColor('white')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('Smartstay', 40, 30);

    doc
        .fontSize(12)
        .font('Helvetica')
        .text('Meet All Your Needs', 40, 58);

    // ==== RIGHT HEADER ====
    const rightX = doc.page.width - 250;
    doc
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('Demo Hostel', rightX, 30);

    doc
        .fontSize(12)
        .font('Helvetica')
        .text('kaluneerkulam,', rightX, 58);

    // ==== Centered Message ====
    doc
        .moveDown()
        .fillColor('black')
        .fontSize(12)
        .text('This text is centered!', { align: 'center' });

    // ==== Billing Section ====
    const baseY = 180;
    const leftX = 50;

    doc
        .fillColor('black')
        .fontSize(10)
        .font('Helvetica')
        .text(
            `Date: ${invoiceDetails.date}\nInvoice No: ${invoiceDetails.invoiceNo}\nUser: ${invoiceDetails.username}\nRoom No: ${invoiceDetails.roomNo}\nMonth: ${invoiceDetails.month}\nDue Date: ${invoiceDetails.dueDate}`,
            leftX,
            baseY,
            { lineGap: 10.86 }
        );

    // ==== Billed To Section (Right) ====
    doc
        .font('Helvetica-Bold')
        .text('Billed To:', rightX, baseY)
        .font('Helvetica')
        .text(invoiceDetails.username, rightX, baseY + 15)
        .text(invoiceDetails.hostelName + ', ' + invoiceDetails.city, rightX, baseY + 30)
        .text('Phone: ' + invoiceDetails.phone, rightX, baseY + 45);

    // ==== Table Header ====
    const tableTop = 300;
    const itemX = [50, 150, 250, 450];

    doc
        .fillColor('#1E45E1')
        .rect(0, tableTop, doc.page.width, 25)
        .fill();

    doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('S.NO', itemX[0], tableTop + 7)
        .text('Inv No', itemX[1], tableTop + 7)
        .text('Description', itemX[2], tableTop + 7)
        .text('Amount / INR', itemX[3], tableTop + 7);

    // ==== Table Rows ====
    let rowTop = tableTop + 30;
    doc.font('Helvetica').fontSize(12).fillColor('black');

    invoiceDetails.items.forEach((item, i) => {
        doc
            .text(item.sno, itemX[0], rowTop)
            .text(item.invNo, itemX[1], rowTop)
            .text(item.desc, itemX[2], rowTop)
            .text(`Rs. ${item.amount}`, itemX[3], rowTop);
        rowTop += 25;
    });

    // ==== Summary Section ====
    rowTop += 30;
    const total = invoiceDetails.items.reduce((sum, i) => sum + i.amount, 0);

    doc
        .font('Helvetica-Bold')
        .text('Tax', itemX[2], rowTop)
        .text('Rs. 0.00', itemX[3], rowTop);
    rowTop += 20;

    doc
        .text('Sub Total', itemX[2], rowTop)
        .text(`Rs. ${total}`, itemX[3], rowTop);
    rowTop += 20;

    doc
        .text('Total', itemX[2], rowTop)
        .text(`Rs. ${total}`, itemX[3], rowTop);

    // ==== Footer ====
    doc
        .fontSize(10)
        .fillColor('gray')
        .text('Thank you for staying with us!', 50, 750, { align: 'center' });

    doc.end();
}

// === Example Usage ===
const invoiceData = {
    date: '2025-05-10',
    invoiceNo: 'INV-2025-001',
    username: 'Arun Kumar',
    roomNo: '101A',
    month: 'May 2025',
    dueDate: '2025-05-15',
    phone: '9876543210',
    hostelName: 'Anna Hostel',
    city: 'Chennai',
    items: [
        { sno: 1, invNo: 'INV-2025-001', desc: 'EB', amount: 300 },
        { sno: 2, invNo: 'INV-2025-001', desc: 'Room Rent', amount: 5000 }
    ]
};

generateInvoice(invoiceData, 'invoice.pdf');
