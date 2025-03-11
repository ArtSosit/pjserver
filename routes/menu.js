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
  const item_image = req.file ? req.file.filename : null;

  // Validate input fields
  if (!category_id || !store_id || !name || !price) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check for duplicate menu items in the same store
  const checkDuplicateQuery = `
    SELECT * FROM menu_items 
    WHERE store_id = ? AND item_name = ?;
  `;

  connection.query(checkDuplicateQuery, [store_id, name], (err, results) => {
    if (err) {
      console.error("Error checking for duplicate menu item:", err.message);
      return res.status(500).json({ error: "Error checking for duplicates" });
    }

    if (results.length > 0) {
      // Duplicate found, do not proceed with insertion
      return res.status(409).json("มีเมนูนี้แล้วในร้านค้า");
    }

    // No duplicates found, proceed with insertion
    const insertQuery = `
      INSERT INTO menu_items (category_id, store_id, item_name, price, item_image) 
      VALUES (?, ?, ?, ?, ?);
    `;

    connection.query(
      insertQuery,
      [category_id, store_id, name, price, item_image],
      (err, results) => {
        if (err) {
          console.error("Error inserting menu item:", err.message);
          return res.status(400).json({ error: err.message });
        }

        res.status(201).json({
          message: "Menu item created successfully",
          menuItemId: results.insertId, // Return the new item's ID
        });
      }
    );
  });
});

// Update menu item
router.put("/:id", upload.single("item_image"), (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { category_id, store_id, name, price } = req.body;
  const item_image = req.file ? req.file.filename : null;

  // Validate input fields except for category_id
  if (!store_id || !name || !price || isNaN(id)) {
    return res
      .status(400)
      .json({ message: "Store ID, name, price, and valid ID are required" });
  }

  // First, check for duplicate menu items in the same store excluding the current item
  const duplicateCheckQuery = `
    SELECT * FROM menu_items 
    WHERE item_name = ? AND store_id = ? AND item_id != ?;
  `;

  connection.query(
    duplicateCheckQuery,
    [name, store_id, id],
    (err, results) => {
      if (err) {
        console.error("Error checking for duplicates:", err);
        return res.status(500).json({ error: "Error checking for duplicates" });
      }

      if (results.length > 0) {
        // Duplicate found, do not proceed with update
        return res.status(409).json({
          message:
            "Another menu item with the same name already exists in this store",
        });
      }

      // Construct the update query dynamically based on provided fields
      let query = "UPDATE menu_items SET ";
      let updates = [];
      let values = [];

      // Only update category_id if it is provided and not empty
      if (category_id) {
        updates.push("category_id = ?");
        values.push(category_id);
      }

      // Always update these fields
      updates.push("store_id = ?", "item_name = ?", "price = ?");
      values.push(store_id, name, price);

      if (item_image) {
        updates.push("item_image = ?");
        values.push(item_image);
      }

      query += updates.join(", ") + " WHERE item_id = ? AND store_id = ?;";
      values.push(id, store_id);

      connection.query(query, values, (err, results) => {
        if (err) {
          console.error("Error updating menu item:", err);
          return res.status(500).json({ error: err.message });
        }
        if (results.affectedRows === 0) {
          return res
            .status(404)
            .json({ message: "Menu item not found or no changes made" });
        }
        res.status(200).json({ message: "Menu item updated successfully" });
      });
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
