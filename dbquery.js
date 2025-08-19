const connection = require("./config/connection");

// Usage
const queries = [];

queries.forEach(executeQuery);

function executeQuery(sql) {
  connection.query(sql, function (err, data) {
    if (err) {
      // console.log(err);
    } else {
      console.log("Query executed successfully");
    }
  });
}
