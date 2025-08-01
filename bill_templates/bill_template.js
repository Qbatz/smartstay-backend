const connection = require("../config/connection");
const AWS = require("aws-sdk");
const uploadImage = require("../components/upload_image");
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});

async function BillTemplateGlobalSetting(req, res) {
  try {
    const timestamp = Date.now();
    const bucketName = process.env.AWS_BUCKET_NAME;
    const folderName = "Hostel-Payments/";
    const template_type = [
      "Rental Invoice",
      "Security Deposit Invoice",
      "Rental Receipt",
      "Security Deposit Receipt",
      "NOC Receipt",
    ];

    const {
      is_logo_specific_template,
      contact_number,
      is_contact_specific_template,
      email,
      is_email_specific_template,
      is_signature_specific_template,
      hostel_Id,
      digital_signature_url,
      logo_url,
    } = req.body;

    const logoFile = req.files?.["logo_url"]?.[0] || null;
    const signatureFile = req.files?.["digital_signature_url"]?.[0] || null;

    let signatureUrl = null;
    let logoFileUrl = null;

    if (signatureFile) {
      const fileName = `${hostel_Id}_${timestamp}_${signatureFile.originalname}`;
      signatureUrl = await uploadImage.uploadProfilePictureToS3Bucket(
        bucketName,
        folderName,
        fileName,
        signatureFile
      );
    }

    if (logoFile) {
      const fileName = `${hostel_Id}_${timestamp}_${logoFile.originalname}`;
      logoFileUrl = await uploadImage.uploadProfilePictureToS3Bucket(
        bucketName,
        folderName,
        fileName,
        logoFile
      );
    }

    if (!hostel_Id) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "hostelId is required" });
    }
    const toBool = (val) => val === "true" || val === true;
    const sqlSelect = `select * from bill_template where hostel_Id=?;`;
    connection.query(sqlSelect, [hostel_Id], (err, result) => {
      if (err) {
        console.log(err);
      } else {
        if (result.length > 0) {
          const updatesql = `
                UPDATE bill_template SET
                common_logo_url =?,
                    logo_url = ?,
                    is_logo_specific_template = ?,
                    common_contact_number = ?,
                    contact_number = ?,
                    is_contact_specific_template = ?,
                    common_email = ?,
                    email = ?,
                    is_email_specific_template = ?,
                    common_digital_signature_url = ?,
                    digital_signature_url = ?,
                    is_signature_specific_template = ?
                WHERE hostel_Id = ? AND template_type = ?
`;
          let completed = 0;
          template_type.forEach((type) => {
            const values = [
              logoFileUrl || logo_url,
              logoFileUrl || logo_url,
              toBool(is_logo_specific_template),
              contact_number,
              contact_number,
              toBool(is_contact_specific_template),
              email,
              email,
              toBool(is_email_specific_template),
              signatureUrl || digital_signature_url,
              signatureUrl || digital_signature_url,
              toBool(is_signature_specific_template),
              hostel_Id,
              type,
            ];

            connection.query(updatesql, values, (err, result) => {
              if (err) {
                console.log(err);
                return res.status(500).json({ error: err.message });
              }
              completed++;
              if (completed === template_type.length) {
                return res.status(200).json({
                  successCode: 200,
                  message:
                    "Invoice settings Bill Template updated successfully.",
                });
              }
            });
          });
        } else {
          const insertsql = `
                        INSERT INTO bill_template (
                        common_logo_url,
                            logo_url, is_logo_specific_template,
                            common_contact_number,contact_number, is_contact_specific_template,
                            common_email,email, is_email_specific_template,
                            common_digital_signature_url, digital_signature_url,is_signature_specific_template,
                            hostel_Id, template_type
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?,?,?)
`;
          let completedInsert = 0;
          template_type.forEach((type) => {
            const values = [
              logoFileUrl,
              logoFileUrl,
              toBool(is_logo_specific_template),
              contact_number,
              contact_number,
              toBool(is_contact_specific_template),
              email,
              email,
              toBool(is_email_specific_template),
              signatureUrl,
              signatureUrl,
              toBool(is_signature_specific_template),
              hostel_Id,
              type,
            ];

            connection.query(insertsql, values, (err, result) => {
              if (err) {
                console.error("Insert failed for:", type, err.message);
                return;
              }
              completedInsert++;
              if (completedInsert === template_type.length) {
                return res.status(200).json({
                  successCode: 200,
                  message: "Invoice settings Bill Template added successfully.",
                });
              }
            });
          });
        }
      }
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Something went wrong while processing invoice settings.",
    });
  }
}

async function FetchTemplateList(req, res) {
  const { hostel_Id } = req.body;
  const Query = `SELECT distinct 
  common_logo_url, 
  common_contact_number, 
  common_email,
  common_digital_signature_url,
  is_logo_specific_template,
  is_contact_specific_template,
  is_email_specific_template,
  is_signature_specific_template
FROM bill_template where hostel_Id=?;`;

  connection.query(Query, [hostel_Id], (err, result) => {
    if (err) {
      return res.status(404).json({
        statusCode: 404,
        message: "No Data Found.",
      });
    } else {
      return res.status(200).json({
        statusCode: 200,
        message: result,
      });
    }
  });
}

async function FetchTemplateListDetails(req, res) {
  const { hostel_Id } = req.body;
  const Query = `SELECT 
  bt.*,
  IF(
    b.id IS NOT NULL,
    JSON_OBJECT(
      'id', b.id,
      'acc_num', b.acc_num,
      'ifsc_code', b.ifsc_code,
      'bank_name', b.bank_name,
      'acc_name', b.acc_name,
      'description', b.description,
      'setus_default', b.setus_default,
      'balance', b.balance,
      'hostel_id', b.hostel_id,
      'status', b.status,
      'type', b.type,
      'benificiary_name', b.benificiary_name,
      'upi_id', b.upi_id,
      'card_type', b.card_type,
      'card_holder', b.card_holder,
      'card_no', b.card_no
    ),
    NULL
  ) AS banking
FROM 
  bill_template bt
LEFT JOIN 
  bankings b ON bt.banking_id = b.id
WHERE 
  bt.hostel_Id = ?;
`;

  connection.query(Query, [hostel_Id], (err, result) => {
    if (err) {
      return res.status(404).json({
        statusCode: 404,
        message: "No Data Found.",
      });
    } else {
      return res.status(200).json({
        statusCode: 200,
        message: result,
      });
    }
  });
}

async function BillTemplateSetting(req, res) {
  try {
    const timestamp = Date.now();
    const bucketName = process.env.AWS_BUCKET_NAME;
    const folderName = "Hostel-Payments/";
    const toBool = (val) => val === "true" || val === true;

    const {
      is_logo_specific_template,
      contact_number,
      is_contact_specific_template,
      email,
      is_email_specific_template,
      is_signature_specific_template,
      hostel_Id,
      id,
      prefix,
      suffix,
      banking_id,
      tax,
      notes,
      terms_and_condition,
      template_theme,
      logo_url,
      digital_signature_url,
      qr_url
    } = req.body;

    const logoFile = req.files?.["logo_url"]?.[0] || null;
    const signatureFile = req.files?.["digital_signature_url"]?.[0] || null;
    const qrurlFile = req.files?.["qr_url"]?.[0] || null;

    let signatureUrl = null;
    let logoFileUrl = null;
    let QrFileUrl = null;

    if (signatureFile) {
      const fileName = `${hostel_Id}_${timestamp}_${signatureFile.originalname}`;
      signatureUrl = await uploadImage.uploadProfilePictureToS3Bucket(
        bucketName,
        folderName,
        fileName,
        signatureFile
      );
    }

    if (logoFile) {
      const fileName = `${hostel_Id}_${timestamp}_${logoFile.originalname}`;
      logoFileUrl = await uploadImage.uploadProfilePictureToS3Bucket(
        bucketName,
        folderName,
        fileName,
        logoFile
      );
    }

    if (qrurlFile) {
      const fileName = `${hostel_Id}_${timestamp}_${qrurlFile.originalname}`;
      QrFileUrl = await uploadImage.uploadProfilePictureToS3Bucket(
        bucketName,
        folderName,
        fileName,
        qrurlFile
      );
    }
    const sqlSelect = `select * from bill_template where hostel_Id=? AND id=?;`;
    console.log("sql",sqlSelect)
    connection.query(sqlSelect, [hostel_Id, id], (err, result) => {
      if (err) {
        return res.status(404).json({
          statusCode: 404,
          message: err,
        });
      } else {
        if(result.length>0){
        const updateQuery = `
  UPDATE bill_template
  SET
    email = CASE
      WHEN ? = true THEN ?
      ELSE common_email
    END,
    contact_number = CASE
      WHEN ? = true THEN ?
      ELSE common_contact_number
    END,
    logo_url = CASE
      WHEN ? = true THEN ?
      ELSE common_logo_url
    END,
    digital_signature_url = CASE
      WHEN ? = true THEN ?
      ELSE common_digital_signature_url
    END, 

    is_email_specific_template = ?,
    is_logo_specific_template = ?,
    is_contact_specific_template = ?,
    is_signature_specific_template = ?,

    prefix = ?,
    suffix = ?,
    tax = ?,
    notes = ?,
    terms_and_condition = ?,
    template_theme = ?,
    banking_id = ?,
    qr_url = ?

  WHERE hostel_Id = ? AND id = ?;
`;

        const values = [
          toBool(is_email_specific_template),
          email,
          toBool(is_contact_specific_template),
          contact_number,
          toBool(is_logo_specific_template),
          logoFileUrl ||logo_url,
          toBool(is_signature_specific_template),
          signatureUrl || digital_signature_url,

          toBool(is_email_specific_template),
          toBool(is_logo_specific_template),
          toBool(is_contact_specific_template),
          toBool(is_signature_specific_template),

          prefix,
          suffix,
          tax,
          notes,
          terms_and_condition,
          template_theme,
          banking_id,
          QrFileUrl || qr_url,

          hostel_Id,
          id,
        ];

        connection.query(updateQuery, values, (err, result) => {
          if (err) {
            console.log("Update error for id", singleId, err);
            return res.status(500).json({ error: err.message });
          } else {
            return res.status(200).json({
              successCode: 200,
              message: "Template updated successfully.",
            });
          }
        });
      }
      else{
         return res.status(404).json({
          statusCode: 404,
          message: "Please send Proper hostel ID and TemplateID",
        });
      }
    }
    });
  } catch (error) {
    console.error("Unexpected Error:", error);
    return res.status(500).json({
      statusCode: 500,
      message: "Something went wrong while processing invoice settings.",
    });
  }
}

module.exports = {
  BillTemplateGlobalSetting,
  FetchTemplateList,
  FetchTemplateListDetails,
  BillTemplateSetting,
};
