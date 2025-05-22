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

    // Parse paymentMethods safely
    let parsedPaymentMethods = [];
    try {
      parsedPaymentMethods = Array.isArray(paymentMethods)
        ? paymentMethods
        : JSON.parse(paymentMethods || "[]");
    } catch (parseErr) {
      return res.status(400).json({ success: false, message: "Invalid paymentMethods format" });
    }

    const paymentMethodStr = parsedPaymentMethods.join(",");

    // Files from multer
    const files = req.files || {};
    const signatureFile = files["signature"]?.[0] || null;
    const privacyPolicyFile = files["privacyPolicy"]?.[0] || null;

    // Read privacyPolicy content from buffer (multer memory storage)
    let privacyHtml = null;
    if (privacyPolicyFile) {
      try {
        privacyHtml = privacyPolicyFile.buffer.toString("utf-8");
      } catch (readErr) {
        return res.status(500).json({
          success: false,
          message: "Failed to read privacy policy file (buffer)",
        });
      }
    }

    // Check if record exists for this hostelId
    const [existingRows] = await db.promise().query(
      "SELECT * FROM InvoiceSettings WHERE hostel_Id = ?",
      [hostelId]
    );

    if (existingRows.length > 0) {
      // Update existing record
      await db.promise().query(
        `UPDATE InvoiceSettings SET
          prefix = ?, suffix = ?, bankingId = ?, tax = ?, notes = ?, isAgreed = ?,
          paymentMethods = ?, privacyPolicyHtml = ?
         WHERE hostel_Id = ?`,
        [prefix, suffix, bankingId, tax, notes, isAgreed, paymentMethodStr, privacyHtml, hostelId]
      );
    } else {
      // Insert new record
      await db.promise().query(
        `INSERT INTO InvoiceSettings
          (hostel_Id, prefix, suffix, bankingId, tax, notes, isAgreed, paymentMethods, privacyPolicyHtml)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [hostelId, prefix, suffix, bankingId, tax, notes, isAgreed, paymentMethodStr, privacyHtml]
      );
    }

    // Use hostelId as invoiceId since insertId may not be reliable here
    const invoiceId = hostelId;

    // Upload and insert signature file (if exists)
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



