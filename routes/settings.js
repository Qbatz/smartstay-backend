const connection = require('../config/connection');
const nodeCron = require('node-cron')
const request = require('request')
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
      tax,
      notes,
      isAgreed,
      paymentMethods,
      privacyPolicy,

      // Bank Fields
      accountName = "",
      accountNo = "",
      bankName = "",
      ifscCode = "",
      desc = "",
      benificiary_name = "",
      upi_id = "",
      card_type = "",
      card_holder = "",
      card_no = ""
    } = req.body;

    const created_by = req.user_details.id;
    const role_permissions = req.role_permissions;
    const is_admin = req.is_admin;

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

    // Multer files
    const files = req.files || {};
    const signatureFile = files["signature"]?.[0] || null;

    let updatedBankingId = null;

    // Insert or Update Bank Info based on account number
    const [existingBankRows] = await connection.promise().query(
      "SELECT * FROM bankings WHERE acc_num = ? AND status = 1",
      [accountNo]
    );

    if (existingBankRows.length > 0) {
      if (is_admin || (role_permissions[16]?.per_edit === 1)) {
        await connection.promise().query(
          `UPDATE bankings SET
            bank_name = ?, ifsc_code = ?
           WHERE acc_num = ? AND status = 1`,
          [
            bankName, ifscCode,
            accountNo
          ]
        );
        updatedBankingId = existingBankRows[0].id;
      } else {
        return res.status(403).json({ success: false, message: "Permission Denied for updating bank." });
      }
    } else {
      if (is_admin || (role_permissions[16]?.per_create === 1)) {
        const [insertResult] = await connection.promise().query(
          `INSERT INTO bankings
            (acc_name, acc_num, bank_name, ifsc_code, description,
             setus_default, balance, createdby, hostel_id,
             benificiary_name, upi_id, card_type, card_holder, card_no, type)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            accountName, accountNo, bankName, ifscCode, desc,
            0, 0, created_by, hostelId,
            benificiary_name, upi_id, card_type, card_holder, card_no, 'bank'
          ]
        );
        updatedBankingId = insertResult.insertId;
      } else {
        return res.status(403).json({ success: false, message: "Permission Denied for creating bank." });
      }
    }

    // Insert or Update InvoiceSettings
    const [existingRows] = await connection.promise().query(
      "SELECT * FROM InvoiceSettings WHERE hostel_Id = ?",
      [hostelId]
    );

    if (existingRows.length > 0) {
      await connection.promise().query(
        `UPDATE InvoiceSettings SET
          prefix = ?, suffix = ?, tax = ?, notes = ?, isAgreed = ?,
          paymentMethods = ?, privacyPolicyHtml = ?, bankingId = ?
         WHERE hostel_Id = ?`,
        [prefix, suffix, tax, notes, isAgreed, paymentMethodStr, privacyPolicy, updatedBankingId, hostelId]
      );
    } else {
      await connection.promise().query(
        `INSERT INTO InvoiceSettings
          (hostel_Id, prefix, suffix, tax, notes, isAgreed, paymentMethods, privacyPolicyHtml, bankingId)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [hostelId, prefix, suffix, tax, notes, isAgreed, paymentMethodStr, privacyPolicy, updatedBankingId]
      );
    }

    // Upload and record signature file
    if (signatureFile) {
      const fileName = `${hostelId}_${timestamp}_${signatureFile.originalname}`;

      // const signatureUrl = await uploadImage.uploadProfilePictureToS3Bucket(bucketName, folderName, fileName, signatureFile);

      await connection.promise().query(
        "INSERT INTO HostelPaymentFiles (invoice_id, file_url, file_type) VALUES (?, ?, ?)",
        [hostelId, fileName, "signature"]
      );
    }

    return res.json({
      success: true,
      message: "Invoice settings and bank info saved successfully."
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    return res.status(500).json({
      success: false,
      message: "Something went wrong while processing invoice settings."
    });
  }
}


async function generateRecurringInvoiceForDate(inv_data, inv_startdate, inv_enddate) {
  const currentdate = moment().format('YYYY-MM-DD');
  console.log("Invoice Already Generated");
  if (await isInvoiceAlreadyGenerated(inv_data.user_id, currentdate)) {
    console.log("Invoice Already Generated");
    return;
  }

  try {
    const total_array = [];
    const string_userid = inv_data.User_Id;
    const hostel_id = inv_data.Hostel_Id;

    const startDate = new Date(inv_startdate);
    const endDate = new Date(inv_enddate);
    const joiningDate = new Date(inv_data.joining_Date);

    if ([startDate, endDate, joiningDate].some(d => isNaN(d))) {
      console.log("Invalid date provided.");
      return;
    }

    const effectiveStartDate = startDate < joiningDate ? joiningDate : startDate;
    if (effectiveStartDate > endDate) {
      console.log("Amount is 0");
      return;
    }

    // Room Rent Calculation
    const roomRentAmount = calculateRoomRent(inv_data.RoomRent, effectiveStartDate, endDate);
    total_array.push({ key: "room_rent", amount: roomRentAmount });

    // EB Calculation
    const { amount: ebAmount, eb_start_date, eb_end_date, eb_unit_amount } = await getEbAmount(inv_data.user_id, hostel_id);
    total_array.push({ key: "eb_amount", amount: ebAmount });

    // Amenities Calculation
    const amenities = await getRecurringAmenities(string_userid, hostel_id);
    amenities.forEach(item => total_array.push({ key: item.Amnities_Name, amount: item.Amount }));

    const totalAmount = total_array.reduce((sum, item) => sum + item.amount, 0);
    console.log("total_amount---"+totalAmount)
    if (totalAmount <= 0) return;

    const invoice_id = await getInvoiceId(inv_data.user_id);
    const due_date = calculateDueDate(inv_data.dueDateOfMonth);
    console.log("inovice_number--->" + invoice_id)

    await insertInvoice(inv_data, totalAmount, invoice_id, due_date, inv_startdate, inv_enddate, eb_start_date, eb_end_date, eb_unit_amount, total_array);
  } catch (error) {
    console.error("Error occurred:", error);
  }
}



function isInvoiceAlreadyGenerated(user_id, currentdate) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM invoicedetails WHERE hos_user_id=? AND action='recuring' AND invoice_status=1 AND Date=?";
    connection.query(sql, [user_id, currentdate], (err, data) => {
      if (err) return reject(err);
      resolve(data.length !== 0);
    });
  });
}

function calculateRoomRent(room_rent, effectiveStartDate, endDate) {
  const total_days = Math.max((endDate - effectiveStartDate) / (1000 * 60 * 60 * 24) + 1, 0);
  const daysInMonth = new Date(effectiveStartDate.getFullYear(), effectiveStartDate.getMonth() + 1, 0).getDate();
  const oneDayAmount = room_rent / daysInMonth;
  return Math.round(oneDayAmount * total_days);
}

function getEbAmount(user_id, hostel_id) {
  return new Promise((resolve, reject) => {
    const sql = "SELECT * FROM eb_settings WHERE hostel_id=? AND status=1";
    connection.query(sql, [hostel_id], (err, settings) => {
      if (err || settings.length === 0) return reject(err || new Error("No EB Settings"));

      const setting = settings[0];
      const today = moment();
      const lastMonth = moment().subtract(1, "months");

      let start_day = parseInt(setting.start_date, 10) || 1;
      let end_day = parseInt(setting.end_date, 10) || lastMonth.endOf("month").date();
      if (setting.end_date && end_day < today.date()) {
        end_day = parseInt(setting.end_date, 10);
        start_day = parseInt(setting.start_date, 10) || 1;
      }

      const eb_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
      const eb_end_date = lastMonth.date(end_day).format("YYYY-MM-DD");

      if (setting.recuring == 0) return resolve({ amount: 0, eb_start_date, eb_end_date, eb_unit_amount: setting.amount });

      const sql2 = `SELECT COALESCE(SUM(amount), 0) AS eb_amount FROM customer_eb_amount WHERE user_id = ? AND status = 1 AND date BETWEEN ? AND ?`;
      connection.query(sql2, [user_id, eb_start_date, eb_end_date], (err, result) => {
        if (err) return reject(err);
        resolve({ amount: result[0].eb_amount || 0, eb_start_date, eb_end_date, eb_unit_amount: setting.amount });
      });
    });
  });
}

function getRecurringAmenities(user_id, hostel_id) {
  return new Promise((resolve, reject) => {
    const sql = `
            SELECT * FROM Amenities AS am 
            JOIN AmnitiesName AS amname ON amname.id=am.Amnities_Id 
            WHERE am.Status=1 AND am.Hostel_Id=?;
        `;
    connection.query(sql, [hostel_id], (err, amenities) => {
      if (err) return reject(err);

      const promises = amenities.map(amenity => {
        if (amenity.recuring == 0) return Promise.resolve(null);

        const lastMonth = moment().subtract(1, "months");
        const nextMonth = moment();

        let start_day = Math.min(Math.max(parseInt(amenity.startdate) || 1, 1), lastMonth.daysInMonth());
        let end_day = Math.min(Math.max(parseInt(amenity.enddate) || lastMonth.endOf("month").date(), start_day), lastMonth.daysInMonth());

        const am_start_date = lastMonth.date(start_day).format("YYYY-MM-DD");
        const am_end_date = amenity.startdate === amenity.enddate
          ? nextMonth.date(end_day).format("YYYY-MM-DD")
          : lastMonth.date(end_day).format("YYYY-MM-DD");

        const sql1 = `
                    SELECT am.Amount, amname.Amnities_Name 
                    FROM Amenities AS am 
                    JOIN AmnitiesName AS amname ON amname.id = am.Amnities_Id 
                    JOIN AmenitiesHistory AS ahis ON ahis.amenity_Id = am.id 
                    WHERE ahis.user_Id = ? 
                    AND ahis.status = 1 
                    AND ahis.created_At BETWEEN ? AND ? 
                    AND am.Status = 1
                    AND NOT EXISTS (
                        SELECT 1 FROM AmenitiesHistory ahis2 
                        WHERE ahis2.amenity_Id = am.id 
                        AND ahis2.status = 0 
                        AND ahis2.created_At < ?
                    );
                `;



        return new Promise((resolveA, rejectA) => {
          connection.query(sql1, [user_id, am_start_date, am_end_date, am_end_date], (err, res) => {
            if (err) return rejectA(err);
            resolveA(res);
          });
        });
      });

      Promise.all(promises).then(resArr => {
        const flatRes = resArr.flat().filter(Boolean);
        resolve(flatRes);
      }).catch(reject);
    });
  });
}

function getInvoiceId(user_id) {
  return new Promise((resolve, reject) => {
    const options = {
      url: process.env.BASEURL + '/get-InvoiceId',
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id })
    };
    request(options, (error, response, body) => {
      if (error) return reject(error);
      const result = JSON.parse(body);
      resolve(result.statusCode === 200 ? result.invoice_number : []);
    });
  });
}

function calculateDueDate(dueDay) {
  const due = moment().set('date', parseInt(dueDay));
  if (moment().date() > dueDay) due.add(1, 'month');
  return due.format('YYYY-MM-DD');
}

function insertInvoice(inv_data, totalAmount, invoice_id, due_date, inv_startdate, inv_enddate, eb_start_date, eb_end_date, eb_unit_amount, total_array) {
  return new Promise((resolve, reject) => {
    const currentDate = moment().format('YYYY-MM-DD');
    const params = [
      inv_data.Name, inv_data.Phone, inv_data.Email, inv_data.HostelName, inv_data.Hostel_Id,
      inv_data.Floor, inv_data.Rooms, totalAmount, inv_data.Address, due_date, currentDate, invoice_id,
      'Pending', inv_data.User_Id, inv_data.Bed, totalAmount, 0, 'recuring', 1, inv_data.user_id,
      inv_startdate, inv_enddate, eb_start_date, eb_end_date, eb_unit_amount
    ];

    const sql = `
            INSERT INTO invoicedetails (
                Name, phoneNo, EmailID, Hostel_Name, Hostel_Id, Floor_Id, Room_No, Amount, 
                UserAddress, DueDate, Date, Invoices, Status, User_Id, Bed, BalanceDue, PaidAmount, 
                action, invoice_type, hos_user_id, rec_invstartdate, rec_invenddate, 
                rec_ebstartdate, rec_ebenddate, rec_ebunit
            ) VALUES (?)`;

    connection.query(sql, [params], (err, result) => {
      if (err) return reject(err);

      const inv_id = result.insertId;
      if (total_array.length > 0) {
        const values = total_array.map(item => [item.key, inv_data.user_id, item.amount, inv_id]);
        const sql2 = `INSERT INTO manual_invoice_amenities (am_name, user_id, amount, invoice_id) VALUES ?`;
        connection.query(sql2, [values], err2 => {
          if (err2) return reject(err2);
          console.log("Invoice and Amenities Added Successfully");
          resolve();
        });
      } else {
        console.log("Invoice Added Successfully (No Amenities)");
        resolve();
      }
    });
  });
}

nodeCron.schedule('0 0 * * *', () => {
  console.log("Running Cron every 10 seconds");
  processRecurringInvoices().catch(err => console.error("Cron Error:", err));
});


async function processRecurringInvoices() {
  const today = moment().date();

  const sql = `
      SELECT rec.*, hs.*, hos.Name AS hostel_name, hos.inv_startdate, hos.inv_enddate, hs.ID as user_id
      FROM RecurringBilling AS rec
      JOIN hostel AS hs ON hs.Hostel_Id = rec.Hostel_Id
      JOIN hosteldetails AS hos ON hos.id = hs.Hostel_Id
      WHERE rec.status = 1 AND hs.isActive = 1;
    `;

  console.log(sql);

  connection.query(sql, async (err, rows) => {
    if (err) {
      console.error("DB Error:", err);
      return;
    }

    if (!rows.length) {
      console.log("No active recurring billing records found.");
      return;
    }

    for (const invData of rows) {
      const billingDate = parseInt(invData.billingDateOfMonth, 10);
      console.log(billingDate);
      if (billingDate !== today) {
        continue; // Skip if today is not billing day
      }

      const { inv_startdate, inv_enddate } = computeBillingRange(invData);
      console.log(`Generating invoice for UserID: ${invData.user_id} | Start: ${inv_startdate} | End: ${inv_enddate}`);

      try {
        await generateRecurringInvoiceForDate(invData, inv_startdate, inv_enddate);
      } catch (error) {
        console.error(`Invoice generation failed for UserID: ${invData.user_id}`, error);
      }
    }
  });
}

function computeBillingRange(data) {
  const lastMonth = moment().subtract(1, 'month');

  const startDay = parseInt(data.calculationFromDate, 10) || 1;
  let endDay = parseInt(data.calculationToDate, 10) ||
    lastMonth.endOf('month').date();

  // Prevent end date from being before start date
  if (endDay < startDay) endDay = startDay;

  const inv_startdate = lastMonth.date(startDay).format('YYYY-MM-DD');
  const inv_enddate = lastMonth.date(endDay).format('YYYY-MM-DD');

  return { inv_startdate, inv_enddate };
}





module.exports = { addOrEditInvoiceSettings };



