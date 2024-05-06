
function AddCompliance(connection, atten, response) {
    if (!atten) {
        response.status(400).json({ message: "Missing Parameter" });
        return;
    }

    connection.query(`SELECT * FROM compliance WHERE User_id = '${atten.User_id}' and date='${atten.date}'`, function (err, hostelData) {
        if (err) {
            console.error("Error querying hostel data:", err);
            response.status(500).json({ message: "Internal Server Error" });
            return;
        }

        if (hostelData && hostelData.length > 0) {
            connection.query(`UPDATE compliance SET date='${atten.date}', Name='${atten.Name}', Phone='${atten.Phone}', Roomdetail='${atten.Roomdetail}', Complainttype='${atten.Complainttype}', Assign='${atten.Assign}', Status='${atten.Status}', Hostel_id='${atten.Hostel_id}', Floor_id='${atten.Floor_id}', Room='${atten.Room}', hostelname='${atten.hostelname}', Description='${atten.Description}' WHERE User_id='${atten.User_id}' and date='${atten.date}'`, function (error, data) {
                if (error) {
                    response.status(500).json({ message: "Error updating record" });
                } else {
                    response.status(200).json({ message: "Update Successfully" });
                }
            });
        } else {
            connection.query(`SELECT MAX(Requestid) AS maxRequestId FROM compliance`, function (error, result) {
                if (error) {
                    console.log(error);
                    response.status(500).json({ message: "Error fetching last Requestid", statusCode: 500 });
                    return;
                }

                let maxRequestId = result[0].maxRequestId || "#100";
                let numericPart = parseInt(maxRequestId.substring(1));
                numericPart++;
                let nextRequestId = `#${numericPart.toString().padStart(2, '0')}`;


                connection.query(`SELECT * FROM compliance WHERE Requestid = '${nextRequestId}'`, function (error, rows) {
                    if (error) {
                        console.error(error);
                        response.status(500).json({ message: "Error checking for existing record", statusCode: 500 });
                        return;
                    }

                    while (rows.length > 0) {
                        numericPart++;
                        nextRequestId = `#${numericPart.toString().padStart(2, '0')}`;
                        connection.query(`SELECT * FROM compliance WHERE Requestid = '${nextRequestId}'`, function (error, rows) {
                            if (error) {
                                console.error(error);
                                response.status(500).json({ message: "Error checking for existing record", statusCode: 500 });
                                return;
                            }
                        });
                    }

                    connection.query(`INSERT INTO compliance(date, Name, Phone, Requestid, Roomdetail, Complainttype, Assign, Status, Hostel_id, Floor_id, Room, hostelname, Description, User_id) VALUES ('${atten.date}', '${atten.Name}', '${atten.Phone}', '${nextRequestId}', '${atten.Roomdetail}', '${atten.Complainttype}', '${atten.Assign}', '${atten.Status}', '${atten.Hostel_id}', '${atten.Floor_id}', '${atten.Room}', '${atten.hostelname}', '${atten.Description}','${atten.User_id}')`, function (error, data) {
                        if (error) {
                            console.error(error);
                            response.status(500).json({ message: "Error inserting record", statusCode: 500 });
                        } else {
                            response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                        }
                    });
                });
            });
        }
    });
}

function GetComplianceList(connection, response, reqData) {
      const query = `SELECT * FROM hosteldetails hstlDetails inner join compliance comp  on comp.Hostel_id=hstlDetails.id  WHERE hstlDetails.created_By ='${reqData.loginId}'`;
     connection.query(query, function (error, hostelData) {
        if (error) {
            console.error(error);
            response.status(403).json({ message: 'Error fetching hostel data' });
                       return;
        }else{
            response.status(200).json(hostelData);
        }

    });
}


module.exports = { AddCompliance, GetComplianceList };