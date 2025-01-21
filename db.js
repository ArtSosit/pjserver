const mysql = require("mysql2/promise"); // ใช้ promise-based client

// สร้างการเชื่อมต่อกับฐานข้อมูล
const pool = mysql.createPool({
  host: "localhost",
  user: "arty",
  password: "00000000",
  database: "orderfoodonline",
  waitForConnections: true,
  connectionLimit: 10, // กำหนดจำนวนการเชื่อมต่อสูงสุด
  queueLimit: 0,
});

// ฟังก์ชันสำหรับการ query ฐานข้อมูล
async function query(sql, params) {
  const [results] = await pool.execute(sql, params);
  return results;
}

// ทดสอบการเชื่อมต่อ
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Connected to MySQL");
    connection.release();
  } catch (err) {
    console.error("Error connecting to MySQL:", err);
  }
})();

module.exports = {
  query,
  pool,
};
