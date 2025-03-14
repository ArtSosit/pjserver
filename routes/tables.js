const express = require("express");
const connection = require("../db");
const router = express.Router();
console.log("table.js loaded");
//get tables
router.get("/", (req, res) => {
  const query = "SELECT * FROM tables";
  connection.query(query, (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json(results);
  });
});
//get tables from store
router.get("/:id", (req, res) => {
  const storeId = req.params.id;
  const query = "SELECT * FROM tables WHERE store_id = ?";
  connection.query(query, [storeId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json(results);
  });
});
//create table
router.post("/", (req, res) => {
  const { userId, table_number, table_qr } = req.body;
  const query =
    "INSERT INTO tables (store_id, table_number,table_qr_code) VALUES (?,?,?)";
  const values = [userId, table_number, table_qr];
  connection.query(query, values, (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json({
      message: "Table added successfully!",
      results,
      table_id: results.insertId,
    });
  });
});
//delete table
router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM tables WHERE table_id = ?";
  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json({ message: "Table deleted successfully" });
  });
});

router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { table_number } = req.body;
  const query = "UPDATE tables SET table_number = ? WHERE table_id = ?";
  const values = [table_number, id];
  connection.query(query, values, (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json({ message: "Table updated successfully" });
  });
});

module.exports = router;
