const express = require("express");
const connection = require("../db");
const router = express.Router();

router.get("/:storeId", (req, res) => {
  const storeId = parseInt(req.params.storeId, 10);
  const { startDate, endDate } = req.query; // รับค่าจาก Query Parameters

  console.log("Store ID received:", storeId);
  console.log("Date Range:", startDate, endDate); // Debugging

  if (isNaN(storeId)) {
    return res.status(400).json({ error: "Invalid store ID" });
  }

  let query = `SELECT menu_items.item_name, 
      SUM(order_details.quantity) AS total_quantity_sold, 
      SUM(order_details.quantity * order_details.price) AS total_sales
    FROM order_details
    JOIN orders ON order_details.order_id = orders.order_id
    JOIN menu_items ON order_details.item_id = menu_items.item_id
    WHERE orders.payment_status = 'paid'
    AND order_details.Status = 'Success'
    AND orders.store_id = ?`;

  const queryParams = [storeId];

  // ตรวจสอบว่ามีการส่ง startDate และ endDate มาหรือไม่
  if (startDate && endDate) {
    query += ` AND orders.order_date BETWEEN ? AND ?`;
    queryParams.push(startDate, endDate);
  }

  query += ` GROUP BY menu_items.item_id`;

  connection.query(query, queryParams, (err, results) => {
    if (err) {
      console.error("Database Error:", err);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "No sales data found" });
    }

    res.status(200).json(results);
  });
});

module.exports = router;
