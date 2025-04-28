const connection = require("./config/connection");

exports.get_receipt_detailsbyid = async (req, res) => {

    var receipt_id = req.params.receipt_id;

    var sql1 = "SELECT re.reference_id,re.payment_date,re.payment_mode,re.invoice_number,hs.Name AS uname,hs.Phone AS uphone,hs.Email AS uemail,hs.Address AS uaddress,hs.area AS uarea,hs.landmark AS ulandmark,hs.pincode AS upin_code,hs.city AS ucity,hs.state AS ustate,hos.Name AS hname,hos.Address AS haddress,hos.area AS harea,hos.landmark AS hlandmark,hos.pin_code AS hpincode,hos.city AS hcity,hos.state AS hstate,inv.id AS invoice_id  FROM receipts AS re JOIN hostel AS hs ON hs.ID=re.user_id JOIN hosteldetails AS hos ON hos.id=hs.Hostel_Id LEFT JOIN invoicedetails AS inv ON inv.Invoices=re.invoice_number WHERE re.id=?;";
    connection.query(sql1, receipt_id, function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get Receipt Details", reason: err.message })
        } else if (data.length != 0) {

            var invoice_id = data[0].invoice_id;

            var sql2 = "SELECT * FROM manual_invoice_amenities WHERE invoice_id=?";
            connection.query(sql2, [invoice_id], function (err, amenities) {
                if (err) {
                    return res.status(201).json({ statusCode: 201, message: "Error to Get Bill Details", reason: err.message })
                }

                const finalresponse = {
                    reference_id: data[0].reference_id,
                    payment_date: data[0].payment_date,
                    payment_mode: data[0].payment_mode,
                    invoice_number: data[0].invoice_number,
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
                    },
                    hostel_details: {
                        name: data[0].hname || "",
                        address: data[0].haddress || "",
                        area: data[0].harea || "",
                        landmark: data[0].hlandmark || "",
                        pincode: data[0].hpincode || "",
                        city: data[0].hcity || "",
                        state: data[0].hstate || "",
                    },
                    amenities: amenities || []
                };

                return res.status(200).json({ statusCode: 200, receipt: finalresponse })

            })
        } else {
            return res.status(201).json({ statusCode: 201, message: "Invalid Receipt Details" })
        }
    })
}

exports.get_bill_detailsbyid = async (req, res) => {

    var bill_id = req.params.bill_id;

    if (!bill_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Bill Details" })
    }

    var sql1 = "SELECT inv.id AS invoice_id,inv.Invoices,inv.Date,inv.DueDate,inv.Status,hs.Name AS uname,hs.Phone AS uphone,hs.Email AS uemail,hs.Address AS uaddress,hs.area AS uarea,hs.landmark AS ulandmark,hs.pincode AS upin_code,hs.city AS ucity,hs.state AS ustate,hos.Name AS hname,hos.Address AS haddress,hos.area AS harea,hos.landmark AS hlandmark,hos.pin_code AS hpincode,hos.city AS hcity,hos.state AS hstate FROM invoicedetails AS inv JOIN hosteldetails AS hos ON hos.id=inv.Hostel_Id JOIN hostel AS hs ON hs.id=inv.hos_user_id WHERE inv.id=?;";
    connection.query(sql1, bill_id, function (err, Data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Error to Get Bill Details", reason: err.message })
        }

        var invoice_id = Data[0].invoice_id;

        var sql2 = "SELECT * FROM manual_invoice_amenities WHERE invoice_id=?";
        connection.query(sql2, [invoice_id], function (err, amenities) {
            if (err) {
                return res.status(201).json({ statusCode: 201, message: "Error to Get Bill Details", reason: err.message })
            }
            

            const finalresponse = {
                id: Data[0].id,
                invoice_id: Data[0].Invoices,
                payment_date: Data[0].payment_date,
                payment_mode: Data[0].payment_mode,
                invoice_number: Data[0].invoice_number,
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
                },
                hostel_details: {
                    name: Data[0].hname || "",
                    address: Data[0].haddress || "",
                    area: Data[0].harea || "",
                    landmark: Data[0].hlandmark || "",
                    pincode: Data[0].hpincode || "",
                    city: Data[0].hcity || "",
                    state: Data[0].hstate || "",
                },
                amenities: amenities || []
            };

            return res.status(200).json({ statusCode: 200, receipt: finalresponse })

        })

    })
}