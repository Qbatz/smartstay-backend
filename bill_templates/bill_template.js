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
                    logo_url = ?,
                    is_logo_specific_template = ?,
                    contact_number = ?,
                    is_contact_specific_template = ?,
                    email = ?,
                    is_email_specific_template = ?,
                    digital_signature_url = ?,
                    is_signature_specific_template = ?
                WHERE hostel_Id = ? AND template_type = ?
`;
          let completed = 0;
          template_type.forEach((type) => {
            const values = [
              logoFileUrl,
              toBool(is_logo_specific_template),
              contact_number,
              toBool(is_contact_specific_template),
              email,
              toBool(is_email_specific_template),
              signatureUrl,
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
                            logo_url, is_logo_specific_template,
                            contact_number, is_contact_specific_template,
                            email, is_email_specific_template,
                            digital_signature_url, is_signature_specific_template,
                            hostel_Id, template_type
                        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;
          let completedInsert = 0;
          template_type.forEach((type) => {
            const values = [
              logoFileUrl,
              toBool(is_logo_specific_template),
              contact_number,
              toBool(is_contact_specific_template),
              email,
              toBool(is_email_specific_template),
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


async function FetchTemplateList(){
console.log("FetchTemplateList")
}
module.exports = { BillTemplateGlobalSetting ,FetchTemplateList};
