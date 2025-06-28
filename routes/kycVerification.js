const db = require('../config/connection');
const cron = require('node-cron')
const kycService = require('../service/kycService');


async function verifyAndStoreKyc(req, res, customer_id) {
  db.query('SELECT * FROM hostel WHERE ID = ?', [customer_id], async (err, results) => {
    if (err) {
      console.error('DB error:', err);
      return res.status(201).json({ success: false, error: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(201).json({ success: false, message: 'Customer not found' });
    }

    const hostel = results[0];
    const normalizedPhone = hostel.Phone.toString().replace(/^(\+)?91/, ''); // removes +91 or 91
    const isValidPhone = /^\d{10}$/.test(normalizedPhone);

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(hostel.Email);

    if (!isValidPhone) {
      return res.status(201).json({ success: false, message: 'Invalid phone number format' });
    }

    const email = (hostel?.Email || '').trim().toLowerCase();

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
      generate_access_token: true
    };

    try {
      const response = await kycService.verifyKyc(payload);

      console.log("response_data" + response.toString)

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
          return res.status(201).json({ success: false, error: 'Failed to store KYC data. Try again later.' });
        }

        res.status(200).json({ statusCode: 200, success: true, message: 'KYC request has been sent via SMS. Kindly complete the verification.' });
      });

    } catch (apiErr) {
      console.error('KYC API Error:', apiErr);
      res.status(201).json({ success: false, error: 'KYC request failed. Please try again later.', details: apiErr.message || apiErr });
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

async function fetchAndUpdateKycStatus(req, res, customer_id) {
  try {
    const [rows] = await db.promise().query(
      'SELECT kyc_id FROM customer_kyc_verification WHERE customer_id = ?',
      [customer_id]
    );

    if (rows.length === 0) {
      return res.status(200).json({ statusCode: 200, message: 'KYC ID not found for this customer', status: "KYC Pending" });
    }

    const kyc_id = rows[0].kyc_id;
    console.log("kyc_id:", kyc_id);

    const kycResponse = await kycService.fetchKycApiResponse(kyc_id);
    console.log("kyc_response:", JSON.stringify(kycResponse, null, 2));

    const result = await insertOrUpdateKycData(customer_id, kycResponse);

    if (result.success) {
      return res.status(200).json({ statusCode: 200, message: 'KYC status fetched and updated successfully', status: kycResponse.status });
    } else {
      return res.status(201).json({ message: 'KYC status fetched, but DB update failed', status: kycResponse.status });
    }

  } catch (error) {
    console.error(`[KYC MAIN SERVICE ERROR] Customer ID ${customer_id}:`, error);
    return res.status(201).json({ message: 'Failed to fetch or update KYC status', status: null });
  }
}

async function fetchAndUpdateCustomerKycStatus(req, res, customer_id) {
  try {
    console.log("[KYC] Customer ID:", customer_id);

    const [rows] = await db.promise().query(
      'SELECT kyc_id, status, image, updated_at,current_address,officialName,id_number  FROM customer_kyc_verification WHERE customer_id = ?',
      [customer_id]
    );

    if (rows.length === 0) {
      return res.status(200).json({ message: 'KYC ID not found for this customer', status: "KYC Pending" });
    }

    const { kyc_id, status, image, updated_at, officialName, current_address, id_number } = rows[0];
    console.log("[KYC] Found - KYC ID:", kyc_id, "| Status:", status);

    if (status === 'approved') {
      return res.status(200).json({ statusCode: 200, message: 'KYC Completed', pic: image, status, updated_at, name: officialName, address: current_address, aadhaarNumber: id_number });
    }

    if (status === 'requested') {
      const kycResponse = await kycService.fetchKycApiResponse(kyc_id);
      console.log("[KYC] API Response:", JSON.stringify(kycResponse, null, 2));

      if (kycResponse.status === 'approved') {
        const result = await insertOrUpdateKycDataApproved(customer_id, kycResponse);
        const nameInDoc = kycResponse.actions?.[0]?.details?.aadhaar?.name ||
          kycResponse.actions?.[0]?.details?.pan?.name ||
          kycResponse.customer_name || null;

        const address = kycResponse.actions?.[0]?.details?.aadhaar?.current_address_details?.address || null;
        const image = kycResponse.actions?.[0]?.details?.aadhaar?.image || null;
        const aadhaarNumber = kycResponse.actions?.[0]?.details?.aadhaar?.id_number || null;

        return res.status(200).json({
          statusCode: 200,
          message: 'KYC Completed',
          name: nameInDoc,
          aadhaarNumber,
          pic: image,
          status: kycResponse.status,
          currentAddress: address,
          updated_at: kycResponse.updated_at || null,

        });
      } else {
        return res.status(200).json({
          statusCode: 200,
          message: 'KYC Pending',
          status: kycResponse.status,
          updated_at: kycResponse.updated_at || null
        });
      }
    }
    return res.status(200).json({ statusCode: 200, message: 'KYC Failed Retry', status, updated_at });

  } catch (error) {
    console.error(`[KYC MAIN SERVICE ERROR] Customer ID ${customer_id}:`, error);
    return res.status(201).json({ message: 'Failed to fetch or update KYC status', status: null });
  }
}



async function insertOrUpdateKycData(customer_id, kycResponse) {
  try {
    const {
      id,
      created_at,
      status,
      reference_id,
      transaction_id,
      expire_in_days,
      reminder_registered,
      auto_approved,
      template_id
    } = kycResponse;

    const query = `
      INSERT INTO customer_kyc_verification (
        customer_id, kyc_id, created_at, status, reference_id,
        transaction_id, expire_in_days, reminder_registered,
        auto_approved, template_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        updated_at = NOW()
    `;

    const values = [
      customer_id,
      id,
      created_at,
      status,
      reference_id,
      transaction_id,
      expire_in_days,
      reminder_registered ? 1 : 0,
      auto_approved ? 1 : 0,
      template_id
    ];

    await db.promise().query(query, values);

    return { success: true };

  } catch (error) {
    console.error('[DB INSERT/UPDATE ERROR]', error);
    return { success: false, error };
  }
}


//commented based on the request  
// cron.schedule('0 12 * * *', async () => {
//   const clientIds = await getRequestedClientIds();
//   for (const clientId of clientIds) {
//     const kycResponse = kycService.fetchKycApiResponse(clientId);
//     const result = await insertOrUpdateKycData(clientId, kycResponse);
//   }
// });

async function getRequestedClientIds() {
  const [rows] = await db.promise().query(`
    SELECT kyc_id
    FROM customer_kyc_verification
    WHERE status = 'requested'
  `);
  return rows.map(row => row.kyc_id);
}

async function insertOrUpdateKycDataApproved(customer_id, kycResponse) {
  try {
    const {
      id,
      created_at,
      status,
      reference_id,
      transaction_id,
      expire_in_days,
      reminder_registered,
      auto_approved,
      template_id
    } = kycResponse;

    // Defaults
    let image = null;
    let gender = null;
    let id_number = null;
    let document_type = null;
    let current_address = null;
    let officialName = null;

    if (status === 'approved' && Array.isArray(kycResponse.actions)) {
      const details = kycResponse.actions[0]?.details;
      officialName =
        details?.aadhaar?.name ||
        details?.pan?.name ||
        kycResponse.customer_name ||
        null;

      if (details?.aadhaar) {
        const aadhaar = details.aadhaar;
        image = aadhaar.image || null;
        gender = aadhaar.gender || null;
        id_number = aadhaar.id_number || null;
        document_type = aadhaar.document_type || null;
        current_address = aadhaar.current_address_details?.address || null;
      } else if (details?.pan) {
        const pan = details.pan;
        image = null;
        gender = pan.gender || null;
        id_number = pan.id_number || null;
        document_type = pan.document_type || null;
        current_address = null;
      }
    }

    const query = `
      INSERT INTO customer_kyc_verification (
        customer_id, kyc_id, created_at, status, reference_id,
        transaction_id, expire_in_days, reminder_registered,
        auto_approved, template_id, image, gender,
        id_number, document_type, current_address, officialName
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        image = VALUES(image),
        gender = VALUES(gender),
        id_number = VALUES(id_number),
        document_type = VALUES(document_type),
        current_address = VALUES(current_address),
        officialName = VALUES(officialName),
        updated_at = NOW()
    `;

    const values = [
      customer_id,
      id,
      created_at || new Date(),
      status,
      reference_id,
      transaction_id,
      expire_in_days,
      reminder_registered ? 1 : 0,
      auto_approved ? 1 : 0,
      template_id,
      image,
      gender,
      id_number,
      document_type,
      current_address,
      officialName
    ];

    await db.promise().query(query, values);
    console.log(`[KYC DB Saved] CID: ${customer_id}, ID: ${id_number}, Name: ${officialName}`);
    return { success: true };

  } catch (err) {
    console.error("[insertOrUpdateKycData ERROR]", err);
    return { success: false, error: err.message };
  }
}



//const payload = {
    //   customer_identifier: cleanedPhone,
    //   notify_customer: true,
    //   customer_notification_mode: 'SMS',
    //   customer_name: hostel.Name,
    //   template_name: process.env.KYC_TEMPLATE_NAME,
    //    identifier: email || '',
    //    type: 'geo_location',
    //   generate_access_token: true
    // };

module.exports = { verifyAndStoreKyc, fetchAndUpdateKycStatus, fetchAndUpdateCustomerKycStatus };


