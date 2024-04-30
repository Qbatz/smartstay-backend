
function getUsers(connection, response, ReqData) {
    const query = `SELECT * FROM hosteldetails hstlDetails inner join hostel hstl on hstl.Hostel_Id=hstlDetails.id and hstl.isActive=true WHERE hstlDetails.created_By ='${ReqData.loginId}' order by hstl.Hostel_Id;`;
      connection.query(query, function (error, hostelData) {
        console.log("hostelData",hostelData)
        if (error) {
            console.error(error);
            response.status(403).json({ message: 'Error  hostel data' });
            return;
        }else{
            response.status(200).json(hostelData);
        }
                     
    });
}


function createUser(connection, atten, response) {
    const FirstNameInitial = atten.firstname.charAt(0).toUpperCase();
    const LastNameInitial = atten.lastname.charAt(0).toUpperCase();
    const Circle = FirstNameInitial + LastNameInitial;
    // const Status = atten.BalanceDue > 0 ? 'Pending' : 'Success' 
    const Status = atten.BalanceDue < 0 ? 'Pending' : 'Success';

    const Name = atten.firstname + ' ' + atten.lastname;



    if (atten.ID) {
        connection.query(`UPDATE hostel SET Circle='${Circle}', Name='${Name}',Phone='${atten.Phone}', Email='${atten.Email}', Address='${atten.Address}', AadharNo='${atten.AadharNo}', PancardNo='${atten.PancardNo}',licence='${atten.licence}',HostelName='${atten.HostelName}',Hostel_Id='${atten.hostel_Id}', Floor='${atten.Floor}', Rooms='${atten.Rooms}', Bed='${atten.Bed}', AdvanceAmount='${atten.AdvanceAmount}', RoomRent='${atten.RoomRent}', BalanceDue='${atten.BalanceDue}', PaymentType='${atten.PaymentType}', Status='${Status}',isActive='${atten.isActive}'  WHERE ID='${atten.ID}' `, function (updateError, updateData) {
            if (updateError) {
                response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
            } else {
                response.status(200).json({ message: "Update Successfully", statusCode: 200 });
            }
        });
    } else {
        function generateUserId(firstName) {
            const userIdPrefix = firstName.substring(0, 4).toUpperCase();
            const randomNum = Math.floor(100 + Math.random() * 900);
            const userId = userIdPrefix + randomNum;
            return userId;
        }
        const User_Id = generateUserId(atten.firstname);
        console.log(" User_Id", User_Id)
        let userID;
        connection.query(`SELECT * FROM hostel WHERE User_Id='${User_Id}'`, function (error, data) {
            if (data.length > 0) {
                userID = generateUserId(firstName)
            }
            else {
                userID = User_Id
            }
            connection.query(`SELECT * FROM hostel WHERE Phone='${atten.Phone}'`, function (error, data) {
                if (data.length > 0) {
                    response.status(202).json({ message: "Phone Number Already Exists", statusCode: 202 });
                } else {
                    connection.query(`SELECT * FROM hostel WHERE Email='${atten.Email}'`, function (error, data) {
                        if (data.length > 0) {
                            response.status(203).json({ message: "Email Already Exists", statusCode: 203 });
                        } else {
                            connection.query(`INSERT INTO hostel (Circle,User_Id, Name, Phone, Email, Address, AadharNo, PancardNo, licence,HostelName, Hostel_Id, Floor, Rooms, Bed, AdvanceAmount, RoomRent, BalanceDue, PaymentType, Status) VALUES ('${Circle}','${userID}', '${Name}', '${atten.Phone}', '${atten.Email}', '${atten.Address}', '${atten.AadharNo}', '${atten.PancardNo}', '${atten.licence}','${atten.HostelName}' ,'${atten.hostel_Id}', '${atten.Floor}', '${atten.Rooms}', '${atten.Bed}', '${atten.AdvanceAmount}', '${atten.RoomRent}', '${atten.BalanceDue}', '${atten.PaymentType}', '${Status}')`, function (insertError, insertData) {
                                if (insertError) {
                                    console.log(insertError);
                                    response.status(201).json({ message: "Internal Server Error", statusCode: 201 });
                                } else {
                                    response.status(200).json({ message: "Save Successfully", statusCode: 200 });
                                }
                            });
                        }
                    });
                }
            });
        })
    }
}



function getPaymentDetails(connection, response) {
    connection.query(`SELECT hos.Name ,hos.Phone,hos.Email,hos.Address,hos.AdvanceAmount,hos.BalanceDue,hos.Status,hos.createdAt,inv.Name as invoiceName, inv.phoneNo as invoicePhone ,inv.Date as invDate, inv.Amount as invAmount ,inv.Status as invStatus, inv.Invoices as InvoiceNo FROM hostel hos INNER JOIN invoicedetails inv on inv.phoneNo= hos.Phone`, function (error, data) {
        console.log(error);
        if (error) {
            response.status(201).json({ message: 'No Data Found', statusCode: 201 })
        }
        else {
            response.status(200).json(data)
        }
    })
}


module.exports = { getUsers, createUser, getPaymentDetails }