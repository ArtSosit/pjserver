const express = require("express");
const connection = require("../db");
const router = express.Router();
console.log("cate.js loaded");
// Get all categories
router.get("/", (req, res) => {
  console.log("im in get");
  const query = "SELECT * FROM food_categories";
  connection.query(query, (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json(results);
  });
});
// Get categories by store ID
router.get("/:id", (req, res) => {
  const storeId = req.params.id;
  const query = "SELECT * FROM food_categories WHERE store_id = ?";
  connection.query(query, [storeId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json(results);
  });
});
// add category
router.post("/", (req, res) => {
  console.log("im in post");
  const { store_id, name } = req.body;
  console.log(store_id, name);
  const query =
    "SELECT * FROM food_categories WHERE store_id = ? AND category_name = ?";
  connection.query(query, [store_id, name], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (results.length > 0) {
      return res.status(400).json({ error: "มีหมวดหมู่นี้แล้ว" });
    }
    const query =
      "INSERT INTO food_categories (store_id,category_name) VALUES (?,?)";
    connection.query(query, [store_id, name], (err, results) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res
        .status(201)
        .json({ message: "Category added successfully", id: results.insertId });
    });
  });
});
// delete category
router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM food_categories WHERE category_id = ?";
  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Category not found" });
    }
    res.status(200).json({ message: "Category deleted successfully" });
  });
});
// update category
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { store_id, name } = req.body;
  const query =
    "UPDATE food_categories SET store_id = ?, category_name = ? WHERE category_id = ?";
  connection.query(query, [store_id, name, id], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json({ message: "Category updated successfully" });
  });
});
module.exports = router;
