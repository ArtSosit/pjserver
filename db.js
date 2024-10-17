const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "100.112.89.18",
  user: "arty",
  password: "00000000",
  database: "orderfoodonline",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

pool.getConnection((err, connection) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL");
  connection.release(); // ปล่อยการเชื่อมต่อหลังจากใช้งาน
});

module.exports = pool;
