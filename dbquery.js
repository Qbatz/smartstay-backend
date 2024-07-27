const connection = require('./config/connection')

// Usage
const queries = [
    "DROP TABLE hello",
    // Add Our Update Query
    `CREATE TABLE Hostel_Floor (
        id INT NOT NULL AUTO_INCREMENT,
        hostel_id INT NULL,
        floor_name VARCHAR(45) NULL DEFAULT 'Null',
        status TINYINT NULL,
        PRIMARY KEY (id));`
      



];

queries.forEach(executeQuery);

function executeQuery(sql) {
    connection.query(sql, function (err, data) {
        if (err) {
            console.log(err);
        } else {
            console.log('Query executed successfully');
        }
    });
}