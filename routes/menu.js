const express = require("express");
const connection = require("../db");

const router = express.Router();
console.log("menu.js loaded");
// Get all menus
router.get("/", (req, res) => {
  const query = "SELECT * FROM menu_items";
  connection.query(query, (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json(results);
  });
});

// Get menu by store ID
router.get("/:id", (req, res) => {
  const storeId = req.params.id;
  const query =
    "SELECT menu_items.item_id, menu_items.item_name, menu_items.price, menu_items.item_image, food_categories.category_name AS category FROM menu_items JOIN food_categories ON menu_items.category_id = food_categories.category_id WHERE menu_items.store_id = ?";

  connection.query(query, [storeId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "Menu not found" });
    }
    res.status(200).json(results);
  });
});

// Create new menu item
router.post("/", (req, res) => {
  const { category_id, store_id, name, price, item_image } = req.body;

  if (!category_id || !store_id || !name || !price) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const query =
    "INSERT INTO menu_items (category_id, store_id, item_name, price, item_image) VALUES (?, ?, ?, ?, ?)";

  connection.query(
    query,
    [category_id, store_id, name, price, item_image],
    (err, results) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      res.status(201).json({ message: "Menu created successfully", results });
    }
  );
});

// Update menu item
router.put("/:id", (req, res) => {
  const id = req.params.id;
  const { category_id, store_id, name, price, item_image } = req.body;


  if (!category_id || !store_id || !name || !price) {
    return res.status(400).json({ error: "All fields are required" });
  }

  const query =
    "UPDATE menu_items SET category_id = ?, item_name = ?, price = ?, item_image = ? WHERE item_id = ? AND store_id = ?";
  connection.query(
    query,
    [category_id, name, price, item_image, id, store_id],
    (err, results) => {
      if (err) {
        return res.status(400).json({ error: err.message });
      }
      if (results.affectedRows === 0) {
        return res.status(404).json({ message: "Menu not found" });
      }
      res.status(200).json({ message: "Menu updated successfully" });
    }
  );
});

// Delete menu item
router.delete("/:id", (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM menu_items WHERE item_id = ?";
  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json({ message: "Menu deleted successfully" });
  });
});

module.exports = router;