const db = require('../config/connection');
const kycService = require('../service/kycService');


async function verifyAndStoreKyc(req, res, customer_id) {
  db.query('SELECT * FROM hostel WHERE ID = ?', [customer_id], async (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(500).json({ success: false, error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    const hostel = results[0];
    const normalizedPhone = hostel.Phone.toString().replace(/^(\+)?91/, ''); // removes +91 or 91
    const isValidPhone = /^\d{10}$/.test(normalizedPhone);

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hostel.Email);

    if (!isValidPhone) {
      return res.status(400).json({ success: false, message: 'Invalid phone number format' });
    }

   const email = (hostel.Email || '').trim().toLowerCase();

    // if (!isValidEmail) {
      // return res.status(400).json({ success: false, message: 'Invalid email format' });
    // }
const cleanedPhone = cleanPhoneNumber(hostel.Phone.toString());
    const payload = {
      customer_identifier: cleanedPhone,
      notify_customer: true,
      customer_notification_mode: 'SMS',
      customer_name: hostel.Name,
      template_name: process.env.KYC_TEMPLATE_NAME,
      identifier: email.toString,
      type: 'geo_location',
      generate_access_token: true
    };

    try {
      const response = await kycService.verifyKyc(payload);

      const {
        id,
        created_at,
        status,
        reference_id,
        transaction_id,
        expire_in_days,
        reminder_registered,
        auto_approved,
        template_id,
        access_token
      } = response;

      const insertQuery = `
        INSERT INTO customer_kyc_verification (
          customer_id, kyc_id, created_at, status, reference_id, transaction_id,
          expire_in_days, reminder_registered, auto_approved, template_id,
          access_entity_id, access_id, access_valid_till, access_created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE 
          kyc_id = VALUES(kyc_id),
          created_at = VALUES(created_at),
          status = VALUES(status),
          reference_id = VALUES(reference_id),
          transaction_id = VALUES(transaction_id),
          expire_in_days = VALUES(expire_in_days),
          reminder_registered = VALUES(reminder_registered),
          auto_approved = VALUES(auto_approved),
          template_id = VALUES(template_id),
          access_entity_id = VALUES(access_entity_id),
          access_id = VALUES(access_id),
          access_valid_till = VALUES(access_valid_till),
          access_created_at = VALUES(access_created_at)
      `;

      const insertValues = [
        hostel.ID,
        id,
        created_at,
        status,
        reference_id,
        transaction_id,
        expire_in_days,
        reminder_registered,
        auto_approved,
        template_id,
        access_token.entity_id,
        access_token.id,
        access_token.valid_till,
        access_token.created_at
      ];

      db.query(insertQuery, insertValues, (insertErr) => {
        if (insertErr) {
          console.error('Insert Error:', insertErr);
          return res.status(500).json({ success: false, error: 'Failed to store KYC data. Try again later.' });
        }

        res.status(200).json({ success: true, message: 'KYC request has been sent via SMS. Kindly complete the verification.' });
      });

    } catch (apiErr) {
      console.error('KYC API Error:', apiErr);
      res.status(502).json({ success: false, error: 'KYC request failed. Please try again later.', details: apiErr.message || apiErr });
    }
  });
}
function cleanPhoneNumber(rawPhone) {
 
  rawPhone = rawPhone.replace('+', '');

  
  if (/^91\d{10}$/.test(rawPhone)) {
    return rawPhone.slice(2); 
  }

  if (/^\d{10}$/.test(rawPhone)) {
    return rawPhone;
  }
  throw new Error('Invalid phone number format');
}


module.exports = { verifyAndStoreKyc };


