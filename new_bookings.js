

function add_booking(req, res) {

    var created_by = req.user_details.id;

    var role_permissions = req.role_permissions;
    var is_admin = req.is_admin;

    var { f_name, l_name, mob_no, email_id, address, joining_date, amount, hostel_id } = req.body;

    if (!f_name || !mob_no || !joining_date || !amount || !hostel_id) {
        return res.status(201).json({ statusCode: 201, message: "Missing Mandatory Fields" });
    }

    if (is_admin == 1 || (role_permissions[5] && role_permissions[5].per_create == 1)) {

        var sql1 = "SELECT * FROM bookings WHERE phone_number=? AND status=? AND hostel_id=?"

    } else {
        res.status(208).json({ message: "Permission Denied. Please contact your administrator for access.", statusCode: 208 });
    }


}

module.exports = { add_booking }