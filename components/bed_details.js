const connection = require('../config/connection')

function check_bed_details(bed_details_obj) {

    return new Promise((resolve, reject) => {

        console.log(bed_details_obj, "====================");

        if (bed_details_obj.old_hostel != 0 && bed_details_obj.old_hostel != bed_details_obj.hostel_id) {

            var up_query1 = "SELECT *,bd.id AS bed_detail_id FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id=hr.id WHERE hr.Hostel_Id='" + bed_details_obj.hostel_id + "' AND bd.status=1 AND hr.isActive=1";
            connection.query(up_query1, function (err, up_res1) {
                if (err) {
                    reject(err)
                } else if (up_res1.length != 0) {

                    var sql1 = "UPDATE bed_details SET isfilled=0, user_id=0 WHERE user_id='" + bed_details_obj.user_id + "'";
                    console.log(sql1);
                    connection.query(sql1, (err, up_data) => {
                        if (err) {
                            console.log(err);
                            reject(err)
                        } else {
                            resolve("sucess")
                        }
                    })
                } else {
                    resolve("No need to Update Hostel Details")
                }
            })
        } else if (bed_details_obj.floor_id == 0 || bed_details_obj.floor_id == undefined && bed_details_obj.room == 0 || bed_details_obj.room == undefined) {
            resolve("No Need to Validate in this User");
        } else {

            if (bed_details_obj.old_floor == bed_details_obj.floor_id && bed_details_obj.old_room == bed_details_obj.room && bed_details_obj.old_bed == bed_details_obj.bed) {
                resolve("Success")

            } else {
                var be_query1 = "SELECT *,bd.id AS bed_detail_id FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id=hr.id WHERE bd.id='" + bed_details_obj.bed + "' AND hr.Hostel_Id='" + bed_details_obj.hostel_id + "' AND hr.Floor_Id='" + bed_details_obj.floor_id + "' AND hr.id='" + bed_details_obj.room + "' AND bd.isfilled=0 AND bd.status=1 AND hr.isActive=1";
                console.log(be_query1);
                connection.query(be_query1, (err, be_res) => {
                    if (err) {
                        reject(err)
                    } else if (be_res.length != 0) {
                        var bed_details_id = be_res[0].bed_detail_id;

                        var sql1 = "UPDATE bed_details SET isfilled=1, user_id='" + bed_details_obj.user_id + "',createdat = now() WHERE id='" + bed_details_id + "'";
                        connection.query(sql1, (err, up_data) => {
                            if (err) {
                                reject(err)
                            } else {

                                if (bed_details_obj.old_bed != 'undefined' && bed_details_obj.old_bed != 0) {

                                    var sql2 = "SELECT *,bd.id AS bed_detail_id FROM hostelrooms AS hr JOIN bed_details AS bd ON bd.hos_detail_id=hr.id WHERE bd.id='" + bed_details_obj.old_bed + "' AND hr.Hostel_Id='" + bed_details_obj.old_hostel + "' AND hr.Floor_Id='" + bed_details_obj.old_floor + "' AND hr.id='" + bed_details_obj.old_room + "' AND bd.status=1 AND hr.isActive=1";
                                    connection.query(sql2, (err, sql2_res) => {
                                        if (err) {
                                            reject(err)
                                        } else if (sql2_res.length != 0) {

                                            var bed_details_id1 = sql2_res[0].bed_detail_id;

                                            var sql1 = "UPDATE bed_details SET isfilled=0,user_id=0 WHERE id='" + bed_details_id1 + "'";
                                            connection.query(sql1, (err, up_data) => {
                                                if (err) {
                                                    reject(err)
                                                } else {
                                                    resolve("sucess")
                                                }
                                            })
                                        } else {
                                            resolve("No need to update Bed Details")
                                        }
                                    })
                                } else {
                                    resolve("Sucess")
                                }
                            }
                        })
                    } else {
                        reject("Unable to Get Hostel Details")
                    }
                })
            }
        }
    });
};

module.exports = { check_bed_details }