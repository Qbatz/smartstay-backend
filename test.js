const fs = require('fs');
const PDFDocument = require('pdfkit');

function generateInvoice() {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    doc.pipe(fs.createWriteStream('perfect-invoice.pdf'));

    const blue = '#1232B4';
    const gray = '#4868EA';
    const border = '#ccc';

    const width = doc.page.width;
    const height = 130;
    const radius = 20;

    doc.save();
    doc.fillColor(blue);

    doc.moveTo(0, 0)
        .lineTo(width, 0)
        .lineTo(width, height - radius)
        .quadraticCurveTo(width, height, width - radius, height)
        .lineTo(radius, height)
        .quadraticCurveTo(0, height, 0, height - radius)
        .lineTo(0, 0)
        .fill();

    doc.restore();


    doc
        .fillColor('#fff')
        .font('Helvetica-Bold')
        .fontSize(20)
        .text('Smartstay', 50, 40);

    // 🏨 Hostel address (right-aligned)
    // Set alignment explicitly for both with x and width
    doc
        .font('Helvetica')
        .fontSize(12)
        .text('Royal Grand Hostel', 300, 30, { width: 250, align: 'right' }) // draws from x=300, 250px wide, right aligned
        .fontSize(10)
        .text('9 8th Avenue Rd, Someshwara Nagar,\nChennai, Tamilnadu - 600 056', 300, 50, {
            width: 250,
            align: 'right'
        });


    // 🧾 Title
    doc
        .roundedRect(0, 0, doc.page.width, 0, 20)
        .fill('#FFFFFF');

    doc.moveDown().fillColor('#000')
        .fontSize(16)
        .font('Helvetica-Bold')
        .text('Security Deposit Invoice', { align: 'center' });

    // 📄 Section: Bill To + Invoice Details
    const startY = 160;
    doc.font('Helvetica').fontSize(10).fillColor('#000');
    doc.text('Bill to:', 50, startY);
    doc.font('Helvetica-Bold').text('Mr. Muthuraja M', 50, startY + 15);
    doc.font('Helvetica')
        .text('+91 85647 85332', 50, startY + 30)
        .text('8th Main Rd, Someshwara Nagar,\nBengaluru, Karnataka 560011', 50, startY + 45);

    // Right column
    doc.text('Invoice #: 234535', 350, startY)
        .text('Date: 31 March 2024', 350, startY + 15)
        .text('Billing: Mar - June 2024', 350, startY + 30)
        .text('Joining Date: 01 Jan 2024', 350, startY + 45)
        .text('Total Stay: 120 Days', 350, startY + 60);

    // 🧾 Table header with background
    const tableY = 250;
    doc
        .fillColor(blue)
        .roundedRect(50, tableY, 500, 25, 4)
        .fill();

    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(10);
    doc.text('S.NO', 60, tableY + 7);
    doc.text('Inv no', 100, tableY + 7);
    doc.text('Description', 170, tableY + 7);
    doc.text('Duration', 320, tableY + 7);
    doc.text('Amount', 450, tableY + 7);

    // Table rows
    doc.font('Helvetica').fillColor('#000');
    doc.text('1', 60, tableY + 35)
        .text('INV-004', 100, tableY + 35)
        .text('Room Rental', 170, tableY + 35)
        .text('May 2025', 320, tableY + 35)
        .text('₹8,000.00', 450, tableY + 35);

    doc.text('2', 60, tableY + 55)
        .text('INV-005', 100, tableY + 55)
        .text('Electricity', 170, tableY + 55)
        .text('Apr - May 2025', 320, tableY + 55)
        .text('₹950.00', 450, tableY + 55);

    // 🧾 Totals
    const totalY = tableY + 90;
    doc.font('Helvetica-Bold')
        .text('Tax', 400, totalY)
        .text('₹1,150.00', 450, totalY)
        .text('Sub Total', 400, totalY + 20)
        .text('₹8,950.00', 450, totalY + 20)
        .fillColor(blue)
        .fontSize(12)
        .text('Total', 400, totalY + 50)
        .text('Rs. 10,100.00', 450, totalY + 50);

    // 🏦 Account Details box
    const accY = totalY + 90;
    doc
        .roundedRect(45, accY, 510, 90, 8)
        .strokeColor(border)
        .lineWidth(1)
        .stroke();

    doc.fillColor(blue).font('Helvetica-Bold').text('ACCOUNT DETAILS', 55, accY + 10);
    doc.font('Helvetica').fillColor('#000')
        .text('Account No: 85743210984', 55, accY + 25)
        .text('IFSC Code: SBIN0017915', 55, accY + 40)
        .text('Bank Name: State Bank Of India', 55, accY + 55)
        .text('UPI Details: Net Banking', 55, accY + 70);

    // 🔻 Footer line and contact
    const footerY = accY + 110;
    doc.moveTo(45, footerY).lineTo(550, footerY).strokeColor(blue).stroke();

    doc
        .fillColor(gray)
        .fontSize(8)
        .text('Terms and Conditions\nSecurity deposits will be refunded after final due date.', 50, footerY + 10);

    doc
        .fontSize(10)
        .fillColor('#000')
        .text('Authorized Signature', 400, footerY + 30);

    doc.end();
}

generateInvoice();
