const mysql = require("mysql2");
const connection = mysql.createConnection({
  host: "10.160.47.133",
  user: "arty",
  password: "00000000",
  database: "orderfoodonline",
  port: 3306,
});
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL");
});
module.exports = connection;
