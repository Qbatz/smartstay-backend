const AWS = require("aws-sdk");
require("dotenv").config();
const connection = require("./config/connection");

const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_REGION = process.env.AWS_REGION;

AWS.config.update({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION,
});
const s3 = new AWS.S3();

function ToAddAndUpdateVendor(connection, reqInvoice, response, request) {
  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  var hostel_id = request.body.hostel_id;
  var area = request.body.area;
  var landmark = request.body.landmark;
  var city = request.body.city;
  var state = request.body.state;

  if (!hostel_id) {
    return response
      .status(201)
      .json({ statusCode: 201, message: "Missing Hostel Details" });
  }
  if (!city || !state) {
    return response.status(201).json({ statusCode: 201, message: "Missing Mandatory Field" });
  }

  if (reqInvoice) {
    const timestamp = Date.now();
    const firstName = reqInvoice.firstName;
    const lastName = reqInvoice.LastName;
    // const Vendor_Name = firstName + ' ' + lastName;
    var Vendor_Name = firstName + (lastName ? " " + lastName : "");
    const created_by = request.user_details.id;

    const checkQuery = `SELECT * FROM Vendor WHERE id = '${reqInvoice.id}'`;
    connection.query(checkQuery, function (error, getData) {
      if (getData && getData.length > 0) {
        if (
          is_admin == 1 ||
          (role_permissions[9] && role_permissions[9].per_edit == 1)
        ) {
          const sq11 = `SELECT * FROM Vendor WHERE createdBy = '${created_by}' AND Vendor_Mobile = '${reqInvoice.Vendor_Mobile}' AND Status = true AND id !=?`;
          connection.query(sq11, [reqInvoice.id], function (err, mob_data) {
            if (err) {
              return response
                .status(201)
                .json({ message: "Internal Server Error", statusCode: 201 });
            } else if (mob_data.length != 0) {
              return response
                .status(202)
                .json({
                  message: "Vendor with this mobile number already exists",
                  statusCode: 202,
                });
            } else {
              if (reqInvoice.Vendor_Email) {
                var sql2 =
                  "SELECT * FROM Vendor WHERE Vendor_Email=? AND Status=1 AND hostel_id=? AND id !=?";
                connection.query(
                  sql2,
                  [reqInvoice.Vendor_Email, hostel_id, reqInvoice.id],
                  async function (err, em_res) {
                    if (err) {
                      return response
                        .status(201)
                        .json({
                          statusCode: 201,
                          message: "Unable to Get Email Details",
                          reason: err.message,
                        });
                    } else if (em_res.length == 0) {
                      updatevendor();
                    } else {
                      return response
                        .status(203)
                        .json({
                          statusCode: 203,
                          message: "Email Id Already Exists",
                        });
                    }
                  }
                );
              } else {
                updatevendor();
              }
            }
          });

          function updatevendor() {
            if (reqInvoice.profile) {
              var bucketName = process.env.AWS_BUCKET_NAME;

              uploadProfilePictureToS3Bucket(
                bucketName,
                "Vendor_Logo/",
                "Logo" + `${timestamp}` + ".jpg",
                reqInvoice.profile,
                (err, vendor_profile) => {
                  if (err) {
                    response.status(202).json({ message: "Database error" });
                  } else {
                    const updateVendor = `
                                    UPDATE Vendor SET
                                    Vendor_Name = '${Vendor_Name}',
                                    Vendor_Mobile = '${reqInvoice.Vendor_Mobile}',
                                    Vendor_Email = '${reqInvoice.Vendor_Email}',
                                    Vendor_Address = '${reqInvoice.Vendor_Address}',
                                    Vendor_profile = '${vendor_profile}',
                                    Country = '${reqInvoice.Country || ""}',
                                    Pincode = ${reqInvoice.Pincode},
                                    area = '${area}',
                                    landmark = '${landmark}',
                                    city= '${city}',
                                    state= '${state}',
                                    UpdatedAt = NOW(), 
                                 Business_Name = '${reqInvoice.Business_Name}'
                                    WHERE  id = '${reqInvoice.id}'`;
                    connection.query(
                      updateVendor,
                      function (error, updateResult) {
                        if (error) {
                          response
                            .status(201)
                            .json({
                              message: "Internal Server Error",
                              statusCode: 201,
                              updateError: error,
                            });
                        } else {
                          response
                            .status(200)
                            .json({
                              message: "Vendor has been successfully updated!",
                              statusCode: 200,
                            });
                        }
                      }
                    );
                  }
                }
              );
            } else {
              const updateVendor = `
                            UPDATE Vendor SET
                            Vendor_Name = '${Vendor_Name}',
                            Vendor_Mobile = '${reqInvoice.Vendor_Mobile}',
                            Vendor_Email = '${reqInvoice.Vendor_Email}',
                            Vendor_Address = '${reqInvoice.Vendor_Address}',
                            Country = '${reqInvoice.Country || ""}',
                            Pincode = ${reqInvoice.Pincode},
                            area = '${area}',
                            landmark = '${landmark}',
                            city= '${city}',
                            state= '${state}',
                            UpdatedAt = NOW(), 
                            Business_Name = '${reqInvoice.Business_Name}'
                            WHERE  id = '${reqInvoice.id}'`;
              connection.query(updateVendor, function (error, updateResult) {
                if (error) {
                  response
                    .status(201)
                    .json({
                      message: "Internal Server Error",
                      statusCode: 201,
                      updateError: error,
                    });
                } else {
                  response
                    .status(200)
                    .json({
                      message: "Vendor has been successfully updated!",
                      statusCode: 200,
                    });
                }
              });
            }
          }
        } else {
          response
            .status(208)
            .json({
              message:
                "Permission Denied. Please contact your administrator for access.",
              statusCode: 208,
            });
        }
      } else {
        if (
          is_admin == 1 ||
          (role_permissions[9] && role_permissions[9].per_create == 1)
        ) {
          const checkVendorQuery = `SELECT * FROM Vendor WHERE createdBy = '${created_by}' AND Vendor_Mobile = '${reqInvoice.Vendor_Mobile}' AND Status = true`;
          connection.query(checkVendorQuery, function (error, results) {
            if (error) {
              return response
                .status(201)
                .json({ message: "Internal Server Error", statusCode: 201 });
            }

            if (results.length > 0) {
              const existingVendor = results[0];

              if (
                Number(existingVendor.Vendor_Mobile) ===
                Number(reqInvoice.Vendor_Mobile)
              ) {
                return response
                  .status(202)
                  .json({
                    message: "Vendor with this mobile number already exists",
                    statusCode: 202,
                  });
              }
            } else {
              if (reqInvoice.Vendor_Email) {
                var sql2 =
                  "SELECT * FROM Vendor WHERE Vendor_Email=? AND Status=1 AND hostel_id=?";
                connection.query(
                  sql2,
                  [reqInvoice.Vendor_Email, hostel_id],
                  async function (err, em_res) {
                    if (err) {
                      return response
                        .status(201)
                        .json({
                          statusCode: 201,
                          message: "Unable to Get Email Details",
                          reason: err.message,
                        });
                    } else if (em_res.length == 0) {
                      insertVendor();
                    } else {
                      return response
                        .status(203)
                        .json({
                          statusCode: 203,
                          message: "Email Id Already Exists",
                        });
                    }
                  }
                );
              } else {
                insertVendor();
              }

              function insertVendor() {
                if (reqInvoice.profile) {
                  var bucketName = process.env.AWS_BUCKET_NAME;

                  uploadProfilePictureToS3Bucket(
                    bucketName,
                    "Vendor_Logo/",
                    "Logo" + `${timestamp}` + ".jpg",
                    reqInvoice.profile,
                    (err, vendor_profile) => {
                      if (err) {
                        response
                          .status(201)
                          .json({ message: "Database error" });
                      } else {
                        const insertVendor = `INSERT INTO Vendor(Vendor_Name, Vendor_Mobile, Vendor_Email, Vendor_Address, Vendor_profile, CreatedBy,  Business_Name, Country, Pincode,hostel_id, area, landmark, city, state) 
                                VALUES ('${Vendor_Name}', '${reqInvoice.Vendor_Mobile}','${reqInvoice.Vendor_Email}','${reqInvoice.Vendor_Address}', '${vendor_profile}','${created_by}' ,'${reqInvoice.Business_Name}', '${reqInvoice.Country}',${reqInvoice.Pincode},'${hostel_id}','${area}','${landmark}','${city}','${state}')`;

                        connection.query(
                          insertVendor,
                          function (error, insertVendorData) {
                            if (error) {
                              response
                                .status(201)
                                .json({
                                  message: "Internal Server Error",
                                  statusCode: 201,
                                });
                            } else {
                              response
                                .status(200)
                                .json({
                                  message: "Succsessfully added  a new vendor",
                                  statusCode: 200,
                                });

                              // var Row_id = insertVendorData.insertId;
                              // const Create_Vendor_Id = GeneratedVendorId(firstName, Row_id);
                              // if (Create_Vendor_Id) {
                              //     const UpdateVendor_Id = `UPDATE Vendor SET Vendor_Id = '${Create_Vendor_Id}' WHERE id = '${Row_id}'`;
                              //     connection.query(UpdateVendor_Id, function (error, updateQuery) {
                              //         if (error) {
                              //             response.status(201).json({ message: "Internal Server Error", statusCode: 201, InsertError: error });
                              //         } else {
                              //         }
                              //     });
                              // } else {
                              //     console.log("vendor id not generated");
                              // }
                            }
                          }
                        );
                      }
                    }
                  );
                } else {
                  const insertVendor = `INSERT INTO Vendor(Vendor_Name, Vendor_Mobile, Vendor_Email, Vendor_Address, CreatedBy,  Business_Name, Country, Pincode,hostel_id, area, landmark, city, state ) 
                                    VALUES ('${Vendor_Name}','${reqInvoice.Vendor_Mobile}','${reqInvoice.Vendor_Email}','${reqInvoice.Vendor_Address}','${created_by}','${reqInvoice.Business_Name}', '${reqInvoice.Country}', ${reqInvoice.Pincode},${hostel_id},'${area}','${landmark}','${city}','${state}')`;

                  connection.query(
                    insertVendor,
                    function (error, insertVendorData) {
                      if (error) {
                        console.log("err", error);
                        response
                          .status(201)
                          .json({
                            message: "Internal Server Error",
                            statusCode: 201,
                          });
                      } else {
                        response
                          .status(200)
                          .json({
                            message: "Succsessfully added  a new vendor",
                            statusCode: 200,
                          });
                      }
                    }
                  );
                }
              }
            }
          });
        } else {
          response
            .status(208)
            .json({
              message:
                "Permission Denied. Please contact your administrator for access.",
              statusCode: 208,
            });
        }
      }
    });
  } else {
    response.status(201).json({ message: "No Data Found" });
  }
}

function GeneratedVendorId(firstName, Row_id) {
  if (typeof firstName !== "string" || firstName.trim() === "") {
    console.error("Invalid firstName:", firstName);
    return null; // or handle as needed
  }

  const VendorIdPrefix = firstName.substring(0, 4).toUpperCase();
  const vendor_id = Row_id.toString().padStart(3, "0");
  const Vendor_Id = "VENDOR" + VendorIdPrefix + vendor_id;

  return Vendor_Id;
}

function uploadProfilePictureToS3Bucket(
  bucketName,
  folderName,
  fileName,
  fileData,
  callback
) {
  const s3 = new AWS.S3();

  const params = {
    Bucket: bucketName,
    Key: folderName + fileName,
    Body: fileData.buffer,
    ACL: "public-read",
  };

  s3.upload(params, (err, data) => {
    if (err) {
      console.error("Error uploading file to S3:", err);
      callback(err);
    } else {
      console.log("File uploaded successfully:", data.Location);
      callback(null, data.Location);
    }
  });
}

function GetVendorList(connection, response, request) {
  const admin_Id = request.user_details.id;
  var show_ids = request.show_ids;
  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  var hostel_id = request.body.hostel_id;

  if (
    is_admin == 1 ||
    (role_permissions[9] && role_permissions[9].per_view == 1)
  ) {
    if (!hostel_id) {
      return response
        .status(201)
        .json({ statusCode: 201, message: "Missing Hostel Details" });
    }

    var sql1 =
      "SELECT * FROM Vendor WHERE Status =1 AND hostel_id=? ORDER BY CreatedAt DESC";
    connection.query(sql1, [hostel_id], function (error, getVendorList) {
      if (error) {
        response
          .status(201)
          .json({ message: "Internal Server Error", statusCode: 201 });
      } else {
        response
          .status(200)
          .json({ VendorList: getVendorList, statusCode: 200 });
      }
    });
  } else {
    response
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function TodeleteVendorList(connection, response, request, reqVendor) {
  var role_permissions = request.role_permissions;
  var is_admin = request.is_admin;

  if (
    is_admin == 1 ||
    (role_permissions[9] && role_permissions[9].per_delete == 1)
  ) {
    if (reqVendor) {
      const query = `UPDATE Vendor SET Status = '${reqVendor.Status}' where id = '${reqVendor.id}'`;
      connection.query(query, function (error, updateData) {
        if (error) {
          response
            .status(201)
            .json({
              message: "Internal Server Error",
              statusCode: 201,
              updateError: error,
            });
        } else {
          response
            .status(200)
            .json({
              message: "Vendor has been successfully deleted",
              statusCode: 200,
            });
        }
      });
    } else {
      response
        .status(201)
        .json({ message: "Internal Server Error", statusCode: 201 });
    }
  } else {
    response
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

function add_ebbilling_settings(req, res) {
  var created_by = req.user_details.id;
  var hostel_id = req.body.hostel_id;
  var unit = req.body.unit;
  var amount = req.body.amount;
  var hostel_based = req.body.hostel_based;
  var room_based = req.body.room_based;

  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  if (!hostel_id && !unit && !amount) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Please Add Mantatory Fields" });
  }

  if (amount < 0 || isNaN(amount)) {
    return res
      .status(201)
      .json({
        statusCode: 201,
        message: "Amount cannot be negative or invalid",
      });
  }

  var sql1 =
    "SELECT * FROM eb_settings WHERE hostel_id='" +
    hostel_id +
    "' AND status=1";
  connection.query(sql1, (err, sel_res) => {
    if (err) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Unble to Get Eb Details" });
    } else if (sel_res.length != 0) {
      if (
        is_admin == 1 ||
        (role_permissions[12] && role_permissions[12].per_edit == 1)
      ) {
        var up_id = sel_res[0].id;
        // Update Records
        var sql2 =
          "UPDATE eb_settings SET unit='" +
          unit +
          "',amount='" +
          amount +
          "', hostel_based = '" +
          hostel_based +
          "', room_based = '" +
          room_based +
          "' WHERE id='" +
          up_id +
          "'";
        connection.query(sql2, (err, ins_res) => {
          if (err) {
            return res
              .status(201)
              .json({ statusCode: 201, message: "Unble to Update Eb Details" });
          } else {
            return res
              .status(200)
              .json({
                statusCode: 200,
                message: "Successfully Updated Eb Details",
              });
          }
        });
      } else {
        res
          .status(208)
          .json({
            message:
              "Permission Denied. Please contact your administrator for access.",
            statusCode: 208,
          });
      }
    } else {
      if (
        is_admin == 1 ||
        (role_permissions[12] && role_permissions[12].per_create == 1)
      ) {
        var sql3 =
          "INSERT INTO eb_settings (hostel_id,unit,amount,created_by) VALUES (?,?,?,?)";
        connection.query(
          sql3,
          [hostel_id, unit, amount, created_by],
          (err, ins_res) => {
            if (err) {
              return res
                .status(201)
                .json({ statusCode: 201, message: "Unble to Add Eb Details" });
            } else {
              return res
                .status(200)
                .json({
                  statusCode: 200,
                  message: "Successfully Added Eb Details",
                });
            }
          }
        );
      } else {
        res
          .status(208)
          .json({
            message:
              "Permission Denied. Please contact your administrator for access.",
            statusCode: 208,
          });
      }
    }
  });
}

function get_ebbilling_settings(req, res) {
  var created_by = req.user_details.id;

  var show_ids = req.show_ids;
  var role_permissions = req.role_permissions;
  var is_admin = req.is_admin;

  var hostel_id = req.body.hostel_id;

  if (
    is_admin == 1 ||
    (role_permissions[12] && role_permissions[12].per_view == 1)
  ) {
    if (!hostel_id) {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Missing Hostel Id" });
    }

    var sql1 =
      "SELECT ebs.*,hos.Name FROM eb_settings AS ebs JOIN hosteldetails AS hos ON hos.id = ebs.hostel_id WHERE ebs.created_by IN (" +
      show_ids +
      ") AND ebs.hostel_id=" +
      hostel_id +
      " AND ebs.status=1";
    connection.query(sql1, function (err, data) {
      if (err) {
        return res
          .status(201)
          .json({
            statusCode: 201,
            message: "Unable to Get Eb Billing Settings",
          });
      } else {
        return res
          .status(200)
          .json({
            statusCode: 200,
            message: "Eb Billing Settings",
            eb_settings: data,
          });
      }
    });
  } else {
    res
      .status(208)
      .json({
        message:
          "Permission Denied. Please contact your administrator for access.",
        statusCode: 208,
      });
  }
}

module.exports = {
  ToAddAndUpdateVendor,
  GetVendorList,
  TodeleteVendorList,
  add_ebbilling_settings,
  get_ebbilling_settings,
};
