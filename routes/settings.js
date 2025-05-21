const db = require('../config/connection');
const moment = require('moment')
const AWS = require('aws-sdk');
require('dotenv').config();
const uploadImage = require('../components/upload_image');

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
    region: AWS_REGION
});
const s3 = new AWS.S3();

async function addOrEditInvoiceSettings(req, res) {
  try {
    const timestamp = Date.now();
    const bucketName = process.env.AWS_BUCKET_NAME;
    const folderName = "Hostel-Payments/";


    const {
      hostelId,
      prefix,
      suffix,
      bankingId,
      tax,
      notes,
      isAgreed,
      paymentMethods,
    } = req.body;

    if (!hostelId) {
      return res.status(400).json({ success: false, message: "hostelId is required" });
    }


    let parsedPaymentMethods = [];
    try {
      parsedPaymentMethods = Array.isArray(paymentMethods)
        ? paymentMethods
        : JSON.parse(paymentMethods || "[]");
    } catch (parseErr) {
      return res.status(400).json({ success: false, message: "Invalid paymentMethods format" });
    }

    const paymentMethodStr = parsedPaymentMethods.join(",");

   
    const files = req.files || {};
    const paymentFiles = files["paymentReference"] || [];
    const signatureFile = files["signature"]?.[0] || null;

   
    const insertInvoiceSQL = `
      INSERT INTO InvoiceSettings 
        (hostel_Id, prefix, suffix, bankingId, tax, notes, isAgreed, paymentMethods)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE 
        prefix = VALUES(prefix),
        suffix = VALUES(suffix),
        bankingId = VALUES(bankingId),
        tax = VALUES(tax),
        notes = VALUES(notes),
        isAgreed = VALUES(isAgreed),
        paymentMethods = VALUES(paymentMethods)
    `;

    const [result] = await db.promise().query(insertInvoiceSQL, [
      hostelId,
      prefix,
      suffix,
      bankingId,
      tax,
      notes,
      isAgreed,
      paymentMethodStr,
    ]);

    const invoiceId = result.insertId || hostelId;

    // Remove old files if new reference files exist
    if (paymentFiles.length > 0) {
      await db.promise().query("DELETE FROM HostelPaymentFiles WHERE invoice_id = ?", [invoiceId]);
    }

    // Upload and insert payment reference files
    for (const file of paymentFiles) {
      const fileName = `${invoiceId}_${timestamp}_${file.originalname}`;
      // const fileUrl = await uploadImage.uploadProfilePictureToS3Bucket(bucketName, folderName, fileName, file);

      await db.promise().query(
        "INSERT INTO HostelPaymentFiles (invoice_id, file_url, file_type) VALUES (?, ?, ?)",
        [invoiceId, fileName, "reference"]
      );
    }

    // Upload and insert signature file
    if (signatureFile) {
      const fileName = `${invoiceId}_${timestamp}_${signatureFile.originalname}`;
      // const signatureUrl = await uploadImage.uploadProfilePictureToS3Bucket(bucketName, folderName, fileName, signatureFile);

      await db.promise().query(
        "INSERT INTO HostelPaymentFiles (invoice_id, file_url, file_type) VALUES (?, ?, ?)",
        [invoiceId, fileName, "signature"]
      );
    }

    return res.json({
      success: true,
      message: "Invoice settings saved and files updated.",
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while processing invoice settings.",
    });
  }
}




module.exports = { addOrEditInvoiceSettings };



