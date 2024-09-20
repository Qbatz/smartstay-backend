const xlsx = require('xlsx')
const connection = require('../config/connection')

const path = require('path');

// Function to check if the file is an Excel file
function isExcelFile(file) {
    const allowedExtensions = ['.xlsx', '.xls'];
    const fileExtension = path.extname(file.originalname).toLowerCase();
    return allowedExtensions.includes(fileExtension);
}

function import_hostel_users(req, res) {
    // Check if a file was uploaded
    console.log(req.file);

    if (!req.file) {
        return res.status(201).send('No file uploaded.');
    }

    // Load the uploaded Excel file
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });

    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Convert the sheet data to JSON
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Insert data into the database
    // var names = {
    //     Name: firstname + lastname,
    //     Phone: phone_number,
    //     country_code: country_code,
    //     Email: email_id,
    //     Address: address,
    //     Hostel_Id: hostel_id,
    //     Floor: floor,
    //     Rooms: room,
    //     Bed: bed, //Update Bed Details Table
    //     AdvanceAmount: advance_amount,
    //     RoomRent: roomrent,
    //     status: 1,
    //     paid_advance: 0,
    //     pending_advance: advance_amount,
    // }

    // Send a response
    res.json({ message: 'File uploaded and data inserted successfully.', data: data });
}

async function check_floor(hostel_id, floor_id, floorName) {
    return new Promise((resolve, reject) => {
        var sql2 = "SELECT * FROM Hostel_Floor WHERE hostel_id=? AND floor_id=? AND status=1";
        connection.query(sql2, [hostel_id, floor_id], function (err, fl_data) {
            if (err) {
                return reject(err);
            } else if (fl_data.length != 0) {
                resolve(floor_id);
            } else {
                var sql3 = "INSERT INTO Hostel_Floor (hostel_id,floor_name,status,floor_id) VALUES (?,?,1,?)";
                connection.query(sql3, [hostel_id, floorName, floor_id], function (err, ins_data) {
                    if (err) {
                        return reject(err);
                    } else {
                        resolve(floor_id);
                    }
                })
            }
        })
    });
}

async function check_room(hostel_id, floor_id, room_id, created_by) {
    return new Promise((resolve, reject) => {
        var sql2 = "SELECT * FROM hostelrooms WHERE Hostel_Id=? AND Floor_Id=? AND Room_Id=? AND isActive=1";
        connection.query(sql2, [hostel_id, floor_id, room_id], function (err, fl_data) {
            if (err) {
                return reject(err);
            } else if (fl_data.length != 0) {
                resolve(fl_data[0].id);
            } else {
                var sql3 = "INSERT INTO hostelrooms (Hostel_Id,Floor_Id,Room_Id,isActive,Created_By) VALUES (?,?,?,1,?)";
                connection.query(sql3, [hostel_id, floor_id, room_id, created_by], function (err, ins_data) {
                    if (err) {
                        return reject(err);
                    } else {
                        resolve(ins_data.insertId);
                    }
                })
            }
        })
    });
}

async function check_bed(bed_id, hos_detail_id, amount, created_by) {
    return new Promise((resolve, reject) => {
        var sql1 = "SELECT * FROM bed_details WHERE hos_detail_id=? AND bed_no=? AND status=1";
        connection.query(sql1, [hos_detail_id, bed_id], function (err, bed_data) {
            if (err) {
                return reject(err);
            } else if (bed_data.length != 0) {
                resolve("Success");
            } else {
                var sql3 = "INSERT INTO bed_details (hos_detail_id,bed_no,bed_amount,status,isfilled,createdby) VALUES (?,?,?,1,0,?)";
                connection.query(sql3, [hos_detail_id, bed_id, amount, created_by], function (err, ins_data) {
                    if (err) {
                        return reject(err);
                    } else {
                        resolve("Inserted");
                    }
                })
            }
        })
    });
}

async function import_hostel_details(req, res) {
    try {
        // Validate file and hostel_id
        if (!req.file) {
            return res.status(201).json({ statusCode: 201, message: 'No file uploaded.' });
        }
        if (!req.body.hostel_id) {
            return res.status(201).json({ statusCode: 201, message: 'Hostel Id Missing' });
        }

        // Check if the file is an Excel file
        if (!isExcelFile(req.file)) {
            return res.status(201).json({ statusCode: 201, message: 'Please upload a valid Excel file.' });
        }

        const created_by = req.user_details.id;

        const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(worksheet);

        const errors = []; // Store errors for failed rows
        const results = []; // Store successful rows

        // Process each row asynchronously
        for (const row of data) {
            const hostel_id = req.body.hostel_id;
            const floorName = row['Floor Name'];
            const floorid = row['Floor Id'];
            const room_id = row['Room No'];
            const bed_id = row['Bed Number'];
            const amount = row['Amount'];

            let insertedFloorId = null;
            let insertedRoomId = null;

            try {
                // Check Hostel Id
                const sql1 = "SELECT * FROM hosteldetails WHERE id=?";
                const hostelDetails = await new Promise((resolve, reject) => {
                    connection.query(sql1, [hostel_id], (err, data) => {
                        if (err) reject(err);
                        else resolve(data);
                    });
                });

                if (hostelDetails.length === 0) {
                    throw new Error("Hostel not found.");
                }

                // Floor check and insertion
                insertedFloorId = await check_floor(hostel_id, floorid, floorName);

                // Room check and insertion
                insertedRoomId = await check_room(hostel_id, floorid, room_id, created_by);

                // Bed check and insertion
                await check_bed(bed_id, insertedRoomId, amount, created_by);

                // If success, add to results
                results.push({ row, status: "Success" });
            } catch (err) {
                // Rollback logic for room and floor if error occurs

                if (insertedRoomId) {
                    await delete_room(insertedRoomId);
                    await delete_floor(floorid, hostel_id);
                }

                if (insertedFloorId) {
                    await delete_floor(insertedFloorId, hostel_id);
                }

                // Collect error for this row
                errors.push({ row, error: err.message });
            }
        }

        // After all rows are processed, return the response
        if (errors.length > 0) {
            return res.status(201).json({ statusCode: 201, message: "File processed with some errors", errors });
        } else {
            return res.status(200).json({ statusCode: 201, message: "File uploaded and data inserted successfully", data: results });
        }

    } catch (error) {
        // Catch any unexpected errors
        return res.status(201).json({ statusCode: 201, message: 'Error processing the file.', error: error.message });
    }
}

// Function to delete a room
async function delete_room(room_id) {
    return new Promise((resolve, reject) => {
        const deleteRoomSQL = "DELETE FROM hostelrooms WHERE id=? ";
        connection.query(deleteRoomSQL, [room_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}

// Function to delete a floor
async function delete_floor(floor_id, hostel_id) {
    return new Promise((resolve, reject) => {
        const deleteFloorSQL = "DELETE FROM Hostel_Floor WHERE floor_id=? AND hostel_id=?";
        connection.query(deleteFloorSQL, [floor_id, hostel_id], (err, result) => {
            if (err) return reject(err);
            resolve(result);
        });
    });
}



module.exports = { import_hostel_users, import_hostel_details }