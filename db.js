const mysql = require("mysql2");

const connection = mysql.createConnection({
  host: "100.112.89.18",
  user: "arty",
  password: "00000000",
  database: "orderfoodonline",
});

connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL");
});

module.exports = connection;
