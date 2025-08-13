const moment = require("moment");

const connection = require("./config/connection");

exports.get_receipt_detailsbyid = async (req, res) => {
  var receipt_id = req.params.receipt_id;

  var sql1 =
    "SELECT re.id,re.reference_id,re.payment_date,re.payment_mode,re.invoice_number,re.amount_received,hs.Name AS uname,hs.Phone AS uphone,hs.Email AS uemail,hs.Address AS uaddress,hs.AdvanceAmount,hs.return_advance,hs.area AS uarea,hs.landmark AS ulandmark,hs.pincode AS upin_code,hs.city AS ucity,hs.state AS ustate,hos.Name AS hname,hos.Address AS haddress,hos.area AS harea,hos.id AS hostel_id,hos.landmark AS hlandmark,hos.pin_code AS hpincode,hos.city AS hcity,hos.state AS hstate,hos.email_id,hostel_PhoneNo,hr.Room_Id,bd.bed_no,ban.type FROM receipts AS re JOIN hostel AS hs ON hs.ID=re.user_id JOIN hosteldetails AS hos ON hos.id=hs.Hostel_Id JOIN hostelrooms AS hr ON hr.id=hs.Rooms JOIN bed_details AS bd ON bd.id=hs.Bed LEFT JOIN bankings AS ban ON ban.id=re.payment_mode WHERE re.id=?";
  connection.query(sql1, receipt_id, function (err, data) {
    if (err) {
      return res.status(201).json({
        statusCode: 201,
        message: "Error to Get Receipt Details",
        reason: err.message,
      });
    } else if (data.length != 0) {
      var invoice_number = data[0].invoice_number;
      var hostel_id = data[0].hostel_id;

      console.log(invoice_number, "invoice_number");

      if (invoice_number == 0) {
        var sql2 = "SELECT * FROM checkout_deductions WHERE receipt_id=?";
        connection.query(sql2, [receipt_id], function (err, receipt_details) {
          if (err) {
            return res.status(201).json({
              statusCode: 201,
              message: "Error to Get Receipt Details",
              reason: err.message,
            });
          } else if (data.length != 0) {
            const formattedAmenities = receipt_details.map((item) => ({
              am_name: item.reason,
              amount: item.amount,
            }));

            // var total_amount = formattedAmenities.reduce(
            //   (sum, item) => sum + item.amount,
            //   0
            // );

            let advance = 0;
            let others = 0;
            var total_amount = 0;

            const hasAdvance = formattedAmenities.some(
              (item) => (item.am_name || "").toLowerCase() === "outstanding due"
            );
            // // First pass: Calculate total_amount properly
            formattedAmenities.forEach((item) => {
              const amt = Number(item.amount) || 0;
              const name = (item.am_name || "").toLowerCase();

              if (hasAdvance) {
                if (name === "outstanding due") {
                  console.log("amt", amt);
                  advance += amt;
                } else {
                  console.log("others", amt);
                  others += amt;
                }
              } else {
                total_amount += amt;
              }
            });

            console.log("total_amount", others, advance);
            if (hasAdvance) {
              total_amount = advance - others;
            }
            console.log("total_amount", total_amount, formattedAmenities);

            var sql2Template =
              "select * from bill_template where hostel_Id=? AND template_type=?;";
            connection.query(
              sql2Template,
              [hostel_id, "NOC Receipt"],
              function (err, bill_template) {
                const finalresponse = {
                  reference_id: data[0].reference_id,
                  payment_date: moment(data[0].payment_date).format(
                    "YYYY-MM-DD"
                  ),
                  payment_mode: data[0].payment_mode,
                  invoice_number: data[0].invoice_number,
                  invoice_type: "checkout",
                  total_advance_amount: data[0].AdvanceAmount,
                  advance_return: data[0].return_advance,
                  total_amount: total_amount || "",
                  amount_received: Number(data[0].amount_received),
                  bank_type: data[0].type || "",
                  user_details: {
                    name: data[0].uname || "",
                    phone: data[0].uphone || "",
                    email: data[0].uemail || "",
                    address: data[0].uaddress || "",
                    area: data[0].uarea || "",
                    landmark: data[0].ulandmark || "",
                    pincode: data[0].upin_code || "",
                    city: data[0].ucity || "",
                    state: data[0].ustate || "",
                    floor_name: data[0].floor_name,
                    room_name: data[0].Room_Id,
                    bed_name: data[0].bed_no,
                  },
                  hostel_details: {
                    name: data[0].hname || "",
                    email: data[0].email_id || "",
                    phone: data[0].hostel_PhoneNo || "",
                    address: data[0].haddress || "",
                    area: data[0].harea || "",
                    landmark: data[0].hlandmark || "",
                    pincode: data[0].hpincode || "",
                    city: data[0].hcity || "",
                    state: data[0].hstate || "",
                  },
                  bill_template: bill_template[0] || null,
                  amenities: formattedAmenities || [],
                };
                return res
                  .status(200)
                  .json({ statusCode: 200, receipt: finalresponse });
              }
            );

            // })
          } else {
            return res.status(201).json({
              statusCode: 201,
              message: "Invalid Invoice Receipt Details",
            });
          }
        });
      } else {
        var sql2 =
          "SELECT id,action,hos_user_id FROM invoicedetails WHERE Invoices=? AND Hostel_Id=?";
        connection.query(
          sql2,
          [invoice_number, hostel_id],
          function (err, inv_details) {
            if (err) {
              return res.status(201).json({
                statusCode: 201,
                message: "Error to Get Receipt Details",
                reason: err.message,
              });
            } else if (data.length != 0) {
              var invoice_id = inv_details[0].id;
              var action = inv_details[0].action;
              var user_id = inv_details[0].hos_user_id;

              var sql2 =
                "SELECT * FROM manual_invoice_amenities WHERE invoice_id=? AND user_id=?";
              connection.query(
                sql2,
                [invoice_id, user_id],
                function (err, amenities) {
                  if (err) {
                    return res.status(201).json({
                      statusCode: 201,
                      message: "Error to Get Bill Details",
                      reason: err.message,
                    });
                  }
                  var template_type =
                    action == "advance"
                      ? "Security Deposit Receipt"
                      : "Rental Receipt";
                  var total_amount = amenities.reduce(
                    (sum, item) => sum + item.amount,
                    0
                  );
                  var sql2Template =
                    "select * from bill_template where hostel_Id=? AND template_type=?;";
                  connection.query(
                    sql2Template,
                    [hostel_id, template_type],
                    function (err, bill_template) {
                      if (err) {
                        console.log("err");
                      }
                      const finalresponse = {
                        reference_id: data[0].reference_id,
                        payment_date: moment(data[0].payment_date).format(
                          "YYYY-MM-DD"
                        ),
                        payment_mode: data[0].payment_mode,
                        invoice_number: data[0].invoice_number,
                        invoice_type: action,
                        total_advance_amount: data[0].AdvanceAmount,
                        advance_return: data[0].return_advance,
                        total_amount: total_amount,
                        amount_received: Number(data[0].amount_received),
                        bank_type: data[0].type || "",
                        user_details: {
                          name: data[0].uname || "",
                          phone: data[0].uphone || "",
                          email: data[0].uemail || "",
                          address: data[0].uaddress || "",
                          area: data[0].uarea || "",
                          landmark: data[0].ulandmark || "",
                          pincode: data[0].upin_code || "",
                          city: data[0].ucity || "",
                          state: data[0].ustate || "",
                          floor_name: data[0].floor_name,
                          room_name: data[0].Room_Id,
                          bed_name: data[0].bed_no,
                        },
                        hostel_details: {
                          name: data[0].hname || "",
                          email: data[0].email_id || "",
                          phone: data[0].hostel_PhoneNo || "",
                          address: data[0].haddress || "",
                          area: data[0].harea || "",
                          landmark: data[0].hlandmark || "",
                          pincode: data[0].hpincode || "",
                          city: data[0].hcity || "",
                          state: data[0].hstate || "",
                        },
                        bill_template: bill_template[0] || null,
                        amenities: amenities || [],
                      };

                      return res
                        .status(200)
                        .json({ statusCode: 200, receipt: finalresponse });
                    }
                  );
                }
              );
            } else {
              return res.status(201).json({
                statusCode: 201,
                message: "Invalid Invoice Receipt Details",
              });
            }
          }
        );
      }
    } else {
      return res
        .status(201)
        .json({ statusCode: 201, message: "Invalid Receipt Details" });
    }
  });
};

exports.get_bill_detailsbyid = async (req, res) => {
  var bill_id = req.params.bill_id;
  if (!bill_id) {
    return res
      .status(201)
      .json({ statusCode: 201, message: "Missing Bill Details" });
  }

  try {
    var sql1 = `SELECT
   inv.id AS invoice_id,
   inv.Invoices,
   inv.Date,
   inv.DueDate,
   inv.Status,
   inv.rec_invstartdate,
   inv.rec_invenddate,
   inv.action,
   hs.Name AS uname,
   hs.Phone AS uphone,
   hs.Email AS uemail,
   hs.Address AS uaddress,
   hs.area AS uarea,
   hs.landmark AS ulandmark,
   hs.pincode AS upin_code,
   hs.city AS ucity,
   hs.state AS ustate,
   hos.Name AS hname,
   hos.email_id AS hemail,
   hos.hostel_PhoneNo AS hphone,
   hos.Address AS haddress,
   hos.area AS harea,
   hos.landmark AS hlandmark,
   hos.pin_code AS hpincode,
   hos.city AS hcity,
   hos.state AS hstate,
   hs.joining_Date,
   hr.Room_Id,
   bd.bed_no,
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
   invoicedetails AS inv 
   JOIN
      hosteldetails AS hos 
      ON hos.id = inv.Hostel_Id 
   JOIN
      hostel AS hs 
      ON hs.id = inv.hos_user_id 
   JOIN
      hostelrooms AS hr 
      ON hr.id = hs.Rooms 
   JOIN
      bed_details AS bd 
      ON bd.id = hs.Bed 
LEFT JOIN bill_template AS bt
  ON bt.Hostel_Id = hs.hostel_Id
  AND (
    (inv.action = 'advance' AND bt.template_type = 'Security Deposit Invoice')
    OR
    (inv.action != 'advance' AND bt.template_type = 'Rental Invoice')
  )
     left JOIN 
  bankings b ON  b.id = bt.banking_id
WHERE
   inv.id = ? ;`;
    // var sql1 =
    //   "SELECT inv.id AS invoice_id,inv.Invoices,inv.Date,inv.DueDate,inv.Status,inv.rec_invstartdate,inv.rec_invenddate,inv.action,hs.Name AS uname,hs.Phone AS uphone,hs.Email AS uemail,hs.Address AS uaddress,hs.area AS uarea,hs.landmark AS ulandmark,hs.pincode AS upin_code,hs.city AS ucity,hs.state AS ustate,hos.Name AS hname,hos.email_id AS hemail,hos.hostel_PhoneNo AS hphone,hos.Address AS haddress,hos.area AS harea,hos.landmark AS hlandmark,hos.pin_code AS hpincode,hos.city AS hcity,hos.state AS hstate,hs.joining_Date,hr.Room_Id,bd.bed_no FROM invoicedetails AS inv JOIN hosteldetails AS hos ON hos.id=inv.Hostel_Id JOIN hostel AS hs ON hs.id=inv.hos_user_id JOIN hostelrooms AS hr ON hr.id=hs.Rooms JOIN bed_details AS bd ON bd.id=hs.Bed WHERE inv.id=?;";
    connection.query(sql1, bill_id, function (err, Data) {
      if (err) {
        return res.status(201).json({
          statusCode: 201,
          message: "Error to Get Bill Details 1",
          reason: err.message,
        });
      }

      if (Data.length != 0) {
        var invoice_id = Data[0].invoice_id;

        var sql2 = "SELECT * FROM manual_invoice_amenities WHERE invoice_id=?";
        connection.query(sql2, [invoice_id], function (err, amenities) {
          if (err) {
            return res.status(201).json({
              statusCode: 201,
              message: "Error to Get Bill Details",
              reason: err.message,
            });
          }
          var sql2 = `SELECT 
    t.*,
    r.reference_id
FROM transactions t
LEFT JOIN receipts r 
    ON t.invoice_id = r.invoice_number AND t.id = r.trans_Id
WHERE t.invoice_id = ? AND t.user_id =?`;
          connection.query(
            sql2,
            [Data[0].Invoices,amenities[0].user_id],
            function (err, Transaction) {
              if (err) {
                return res.status(201).json({
                  statusCode: 201,
                  message: "Error to transaction Bill Details",
                  reason: err.message,
                });
              } else {
                console.log("Transaction",Transaction)
                let total_amount = 0;

                // Check once if "advance" is present in any item
                const hasAdvance = amenities.some(
                  (item) => (item.am_name || "").toLowerCase() === "advance"
                );

                let advance = 0;
                let others = 0;

                // First pass: Calculate total_amount properly
                amenities.forEach((item) => {
                  const amt = Number(item.amount) || 0;
                  const name = (item.am_name || "").toLowerCase();

                  if (hasAdvance) {
                    if (name === "advance") {
                      advance += amt;
                    } else {
                      others += amt;
                    }
                  } else {
                    total_amount += amt;
                  }
                });

                if (hasAdvance) {
                  total_amount = advance - others;
                }
                //    const amenitiesName = amenities.map(item => (item.am_name || "").toLowerCase());
                const amenitiesWithInvoiceId = amenities.map((item) => {
                  let duration = "";

                  if (Data[0].action === "recuring") {
                    const startDate = new Date(Data[0].rec_invstartdate);
                    const endDate = new Date(Data[0].rec_invenddate);

                    const startMonthYear = startDate.toLocaleString("default", {
                      month: "short",
                      year: "numeric",
                    });
                    const endMonthYear = endDate.toLocaleString("default", {
                      month: "short",
                      year: "numeric",
                    });

                    if (startMonthYear === endMonthYear) {
                      duration = startMonthYear;
                    } else {
                      duration = `${startMonthYear} - ${endMonthYear}`;
                    }
                  } else {
                    const createdAt = new Date(Data[0].Date);
                    duration = createdAt.toLocaleString("default", {
                      month: "long",
                      year: "numeric",
                    });
                  }
                  return {
                    ...item,
                    invoice_id: Data[0].Invoices,
                    duration: duration,
                  };
                });

                const finalresponse = {
                  id: invoice_id,
                  invoice_details: {
                    invoice_id: Data[0].Invoices,
                    invioice_date:
                      moment.utc(Data[0].Date).format("YYYY-MM-DD") || "",
                    due_date:
                      moment.utc(Data[0].DueDate).format("YYYY-MM-DD") || "",
                    invoice_number: Data[0].invoice_number,
                    invoice_type: Data[0].action,
                    total_amount: hasAdvance ? advance : total_amount,
                    refundable_Amount: hasAdvance ? total_amount : 0,
                    non_refundable_amount: hasAdvance ? others : 0,
                  },
                  user_details: {
                    name: Data[0].uname || "",
                    phone: Data[0].uphone || "",
                    email: Data[0].uemail || "",
                    address: Data[0].uaddress || "",
                    area: Data[0].uarea || "",
                    landmark: Data[0].ulandmark || "",
                    pincode: Data[0].upin_code || "",
                    city: Data[0].ucity || "",
                    state: Data[0].ustate || "",
                    joining_date:
                      moment.utc(Data[0].joining_Date).format("YYYY-MM-DD") ||
                      "",
                    floor_name: Data[0].floor_name,
                    room_name: Data[0].Room_Id,
                    bed_name: Data[0].bed_no,
                  },
                  hostel_details: {
                    name: Data[0].hname || "",
                    phone: Data[0].hphone || "",
                    email: Data[0].hemail || "",
                    address: Data[0].haddress || "",
                    area: Data[0].harea || "",
                    landmark: Data[0].hlandmark || "",
                    pincode: Data[0].hpincode || "",
                    city: Data[0].hcity || "",
                    state: Data[0].hstate || "",
                  },
                  bill_template: {
                    id: Data[0].id || "",
                    template_type: Data[0].template_type || "",
                    logo_url: Data[0].logo_url || "",
                    contact_number: Data[0].contact_number || "",
                    email: Data[0].email || "",
                    digital_signature_url: Data[0].digital_signature_url || "",
                    tax: Data[0].tax || "",
                    banking_id: Data[0].banking_id || "",
                    qr_url: Data[0].qr_url || "",
                    notes: Data[0].notes,
                    terms_and_condition: Data[0].terms_and_condition,
                    template_theme: Data[0].template_theme,
                    hostel_Id: Data[0].hostel_Id,
                  },
                  amenities: amenitiesWithInvoiceId,
                  banking_details: Data[0].banking || [],
                  Transaction: Transaction,
                };

                return res
                  .status(200)
                  .json({ statusCode: 200, receipt: finalresponse });
              }
            }
          );
        });
      } else {
        return res
          .status(201)
          .json({ statusCode: 201, message: "Invalid Bill Details" });
      }
    });
  } catch (error) {
    console.log(error);
    return res
      .status(201)
      .json({ statusCode: 201, message: "Error to Get Bill Details" });
  }
};
