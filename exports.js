const connection = require('./config/connection')
const fs = require('fs');
const exports_file = require('./components/upload_image');

function export_customer(req, res) {

    var show_ids = req.show_ids;

    var type = req.body.type;

    if (!type) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" })
    }

    const allowedTypes = ['customers', 'assets', 'expenses', 'customer_readings', 'walkin', 'booking', 'checkout', 'complaint'];

    if (!allowedTypes.includes(type)) {
        return res.status(201).json({ statusCode: 201, message: `Invalid type` });
    }

    if (type == 'customers') {

        var sql1 = "SELECT hstl.*,bd.bed_no AS Bed,hstl.Bed AS hstl_Bed,hsroom.Room_Id AS Rooms,hstl.Rooms AS hstl_Rooms,hsroom.id AS room_id,hsroom.Room_Id,DATE_FORMAT(hstl.joining_Date, '%Y-%m-%d') AS user_join_date,hstl.Hostel_Id AS user_hostel,ca.first_name AS creator_name,ca.user_type FROM hosteldetails AS hstlDetails inner join hostel AS hstl on hstl.Hostel_Id=hstlDetails.id and hstl.isActive=true LEFT JOIN country_list AS cl ON hstl.country_code=cl.country_code Left Join hostelrooms hsroom ON hsroom.Hostel_Id = hstlDetails.id and hsroom.Floor_Id = hstl.Floor and hsroom.id = hstl.Rooms LEFT JOIN bed_details AS bd ON bd.id=hstl.Bed JOIN createaccount AS ca ON hstl.created_by=ca.id  WHERE hstl.created_By IN (?) ORDER BY hstl.ID DESC;";
        var file_name = 'all_customers';

    } else if (type == 'assets') {

        var sql1 = "SELECT ass.*,ven.Vendor_Name,hos.Name AS hostel_name,hosfloor.floor_name,hr.Room_Id AS room_name,ca.first_name AS creator_name,ca.user_type FROM assets AS ass JOIN Vendor AS ven ON ass.vendor_id=ven.id LEFT JOIN assigned_assets AS aa ON aa.asset_id=ass.id LEFT JOIN hosteldetails hos ON hos.id = aa.hostel_id LEFT JOIN Hostel_Floor hosfloor ON hosfloor.floor_id = aa.floor_id AND hosfloor.hostel_id = aa.hostel_id LEFT JOIN hostelrooms AS hr ON hr.id=aa.room_id JOIN createaccount AS ca ON ass.created_by=ca.id WHERE ass.created_by IN (?) AND ass.status=1;";
        var file_name = 'all_assets';

    } else if (type == 'expenses') {

        var sql1 = "SELECT ex.*,ca.category_Name,cas.first_name AS creator_name,cas.user_type FROM expenses AS ex JOIN Expense_Category_Name AS ca ON ex.category_id=ca.id JOIN createaccount AS cas ON ex.created_by=cas.id WHERE ex.created_by IN (?) AND ex.status=1 ORDER BY ex.id DESC;"
        var file_name = 'all_expenses';

    } else if (type == 'customer_readings') {

        var sql1 = "SELECT hos.Name AS user_name,cus.*,ca.first_name AS creator_name,ca.user_type FROM customer_eb_amount AS cus JOIN hostel AS hos ON hos.id=cus.user_id JOIN createaccount AS ca ON ca.id=cus.created_by WHERE cus.status=1 AND cus.created_by IN (?) ORDER BY cus.id DESC;"
        var file_name = 'customer_readings';

    } else if (type == 'walkin') {

        var sql1 = "SELECT cus.*,ca.first_name AS creator_name,ca.user_type FROM customer_walk_in_details AS cus JOIN createaccount AS ca ON ca.id=cus.created_by WHERE cus.isActive=1 AND cus.created_By IN (?) ORDER BY cus.id DESC;"
        var file_name = 'all_walkings';

    } else if (type == 'booking') {

        var sql1 = "SELECT bo.*,hstl.Name AS hostel_name,hf.floor_name,hr.Room_Id,bd.bed_no,ca.first_name AS creator_name,ca.user_type FROM bookings AS bo LEFT JOIN hosteldetails AS hstl ON hstl.ID=bo.hostel_id LEFT JOIN Hostel_Floor AS hf ON hf.floor_id=bo.floor_id LEFT JOIN hostelrooms AS hr ON hr.id=bo.room_id LEFT JOIN bed_details AS bd ON bd.id=bo.bed_id JOIN createaccount AS ca ON ca.id=bo.created_by WHERE bo.status=1 AND bo.created_by IN (?) ORDER BY bo.id DESC;"
        var file_name = 'all_bookings';

    } else if (type == 'checkout') {

        var sql1 = "SELECT hos.*,hstl.Name AS hostel_name,hf.floor_name,hr.Room_Id,bd.bed_no,ca.first_name AS creator_name,ca.user_type FROM hostel AS hos JOIN hosteldetails AS hstl ON hstl.ID=hos.Hostel_Id JOIN Hostel_Floor AS hf ON hf.floor_id=hos.Floor JOIN hostelrooms AS hr ON hr.id=hos.Rooms JOIN bed_details AS bd ON bd.id=hos.Bed JOIN createaccount AS ca ON ca.id=hos.created_by WHERE hos.isActive=1 AND hos.CheckoutDate != 'null' AND hos.created_by IN (?) ORDER BY hos.id DESC;"
        var file_name = 'all_checkouts';

    } else if (type == 'complaint') {

        var sql1 = "SELECT com.*,ct.complaint_name,hstl.Name AS hostel_name,hf.floor_name,hr.Room_Id,bd.bed_no,ca.first_name AS creator_name,ca.user_type FROM compliance AS com JOIN hosteldetails AS hstl ON hstl.ID=com.Hostel_id JOIN Hostel_Floor AS hf ON hf.floor_id=com.Floor_id JOIN hostelrooms AS hr ON hr.id=com.Room JOIN bed_details AS bd ON bd.id=com.Bed JOIN createaccount AS ca ON ca.id=com.created_by JOIN complaint_type AS ct ON com.Complainttype=ct.id WHERE com.created_by IN (?) ORDER BY com.id DESC;"
        var file_name = 'all_complaints';

    }

    connection.query(sql1, [show_ids], function (err, data) {
        if (err) {
            return res.status(201).json({ statusCode: 201, message: "Unable to Get All Details" })
        } else if (data.length != 0) {

            const filePath = `smartstay_${file_name}_${Date.now()}.xlsx`;

            exports_file.export_function(data, filePath)
                .then((s3Url) => {
                    return res.status(200).json({ statusCode: 200, message: "File Exported Successfully", fileUrl: s3Url });
                })
                .catch((exportErr) => {
                    console.error('Export Error:', exportErr);
                    return res.status(201).json({ statusCode: 201, message: "Error Exporting File" });
                });

        } else {
            return res.status(201).json({ statusCode: 201, message: "No Data Found" })
        }
    })

}


module.exports = { export_customer }