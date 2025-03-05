const express = require("express");
const cors = require("cors");
const connection = require("../db");
const router = express.Router();
const multer = require("multer");
console.log("menu.js loaded");
const path = require("path");
const fs = require("fs");
// Get all menus
const app = express();
app.use(cors());
app.use(express.json());

const uploadDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Save to 'uploads' directory
  },
  filename: (req, file, cb) => {
    // Save file with original name
    cb(null, Date.now() + path.extname(file.originalname));
  },
});

const upload = multer({ storage });
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
    "SELECT menu_items.status,menu_items.item_id, menu_items.item_name, menu_items.price, menu_items.item_image,menu_items.is_recommended,menu_items.discount,food_categories.category_name AS category FROM menu_items JOIN food_categories ON menu_items.category_id = food_categories.category_id WHERE menu_items.store_id = ?";
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
router.post("/", upload.single("item_image"), (req, res) => {
  const { category_id, store_id, name, price } = req.body;
  // Get the uploaded file's name (if any)
  const item_image = req.file ? req.file.filename : null;
  // Validate input fields
  if (!category_id || !store_id || !name || !price) {
    return res.status(400).json({ message: "All fields are required" });
  }
  // SQL query to insert a new menu item
  const query = `
    INSERT INTO menu_items (category_id, store_id, item_name, price, item_image) 
    VALUES (?, ?, ?, ?, ?);
  `;

  connection.query(
    query,
    [category_id, store_id, name, price, item_image],
    (err, results) => {
      if (err) {
        console.error("Error inserting menu item:", err.message);
        return res.status(400).json({ error: err.message });
      }

      res.status(201).json({
        message: "Menu created successfully",
        menuItemId: results.insertId, // Return the new item's ID
      });
    }
  );
});

// Update menu item
router.put("/:id", upload.single("item_image"), (req, res) => {
  const id = req.params.id;
  const { category_id, store_id, name, price } = req.body;
  const item_image = req.file ? req.file.filename : null;

  if (!category_id || !store_id || !name || !price) {
    return res.status(400).json({ error: "All fields are required" });
  }

  let query = `UPDATE menu_items SET category_id = ?, item_name = ?, price = ?`;
  let values = [category_id, name, price];

  // เช็คว่า item_image มีค่าหรือไม่ ถ้ามีให้เพิ่มเข้าไป
  if (item_image) {
    query += `, item_image = ?`;
    values.push(item_image);
  }

  query += ` WHERE item_id = ? AND store_id = ?;`;
  values.push(id, store_id);

  connection.query(query, values, (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (results.affectedRows === 0) {
      return res.status(404).json({ message: "Menu not found" });
    }
    res.status(200).json({ message: "Menu updated successfully" });
  });
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

router.post("/status", upload.none(), (req, res) => {
  console.log("📩 Received FormData:", req.body); // ✅ Debug ค่าที่ได้รับ

  const { menuId, status } = req.body;

  if (!menuId || !status) {
    return res.status(400).json({ error: "❌ Missing menuId or status" });
  }

  const updateQuery = `UPDATE menu_items SET status = ? WHERE item_id = ?`;
  connection.query(updateQuery, [status, menuId], (err, result) => {
    if (err) {
      console.error("❌ Database Error:", err.message);
      return res.status(500).json({ error: "Database error: " + err.message });
    }

    console.log("✅ SQL Result:", result);
    if (result.affectedRows === 0) {
      console.warn("⚠️ No menu updated!");
      return res.status(404).json({ error: "Menu not found" });
    }

    res.status(200).json({ message: "✅ Menu status updated successfully" });
  });
});

router.put("/recommend/:itemId", (req, res) => {
  const { itemId } = req.params;
  let { recommended } = req.body;

  // 🔹 ตรวจสอบว่า recommended เป็น 0 หรือ 1 เท่านั้น
  if (recommended !== 0 && recommended !== 1) {
    return res
      .status(400)
      .json({ error: "ค่า recommended ต้องเป็น 0 หรือ 1 เท่านั้น" });
  }

  const updateQuery = `UPDATE menu_items SET is_recommended = ? WHERE item_id = ?`;

  connection.query(updateQuery, [recommended, itemId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    // 🔹 ถ้าไม่มีแถวไหนถูกอัปเดต แสดงว่า item_id ไม่ถูกต้อง
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบเมนูที่ต้องการอัปเดต" });
    }

    res.json({ success: true, message: "⭐ อัปเดตเมนูแนะนำสำเร็จ" });
  });
});

router.put("/discount/:itemId", (req, res) => {
  const { itemId } = req.params;
  const { discount } = req.body;
  const updateQuery = `UPDATE menu_items SET discount = ? WHERE item_id = ?`;

  connection.query(updateQuery, [discount, itemId], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: "ไม่พบเมนูที่ต้องการอัปเดต" });
    }

    res.json({ success: true, message: "⭐ อัปเดตส่วนลดสำเร็จ" });
  });
});

router.get("/top-menu/:storeId", (req, res) => {
  const storeId = req.params.storeId;
  if (!storeId) {
    return res.status(400).json({ error: "Missing storeId" });
  }
  const query = ` SELECT od.item_id, m.item_name, COUNT(od.item_id) AS order_count
      FROM order_details od
      JOIN menu_items m ON od.item_id = m.item_id
      JOIN orders o ON od.order_id = o.order_id
      WHERE m.store_id = ? 
      AND o.order_time >= DATE_SUB(NOW(), INTERVAL 7 DAY)	
      GROUP BY od.item_id
      ORDER BY order_count DESC
      LIMIT 1`;
  connection.query(query, [storeId], (err, results) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.status(200).json(results);
  });
});

module.exports = router;
