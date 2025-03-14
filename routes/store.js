const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const connection = require("../db");
const router = express.Router();
console.log("store.js loaded");
const bcrypt = require("bcrypt");

const { uploadFiles } = require("./fileUpload");

// Add additional info route
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

const upload = multer({ storage: storage });
router.put(
  "/additional-info/",
  upload.fields([
    { name: "storeImage", maxCount: 1 },
    { name: "promptpayimage", maxCount: 1 },
  ]),
  (req, res) => {
    const {
      userID,
      storeName,
      storeDetails,
      contactInfo,
      promptpay,
      openTime,
      closeTime,
    } = req.body;

    // ไฟล์รูปภาพ (อาจไม่มี)
    const storeImage = req.files?.storeImage?.[0]?.filename || null;
    const promptpayImage = req.files?.promptpayimage?.[0]?.filename || null;

    // ตรวจสอบค่าที่ต้องการอัปเดต
    if (!storeName) {
      return res.status(400).json({ error: "storeName is required." });
    }

    // สร้าง SQL Dynamic
    let query = `UPDATE stores SET `;
    let values = [];
    let fields = [];

    // เพิ่มเฉพาะค่าที่มี
    if (storeName) {
      fields.push("store_name = ?");
      values.push(storeName);
    }
    if (storeDetails) {
      fields.push("details = ?");
      values.push(storeDetails);
    }
    if (contactInfo) {
      fields.push("contact = ?");
      values.push(contactInfo);
    }
    if (promptpay) {
      fields.push("promptpay_number = ?");
      values.push(promptpay);
    }
    if (storeImage) {
      fields.push("store_image = ?");
      values.push(storeImage);
    }
    if (promptpayImage) {
      fields.push("promptpay_qr = ?");
      values.push(promptpayImage);
    }
    if (openTime) {
      fields.push("open_time = ?");
      values.push(openTime);
    }
    if (closeTime) {
      fields.push("close_time = ?");
      values.push(closeTime);
    }

    // ถ้าไม่มีค่าที่ต้องอัปเดต ให้ return error
    if (fields.length === 0) {
      return res.status(400).json({ error: "No fields to update." });
    }

    // รวมคำสั่ง SQL
    query += fields.join(", ") + " WHERE store_id = ?;";
    values.push(userID);

    // รันคำสั่ง SQL
    connection.query(query, values, (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ error: "Error updating data", details: err.message });
      }
      res.status(200).json({
        message: "Data updated successfully!",
        results,
      });
    });
  }
);

//Add kitchen user
router.post("/kitchen", (req, res) => {
  const { store_id, username, password } = req.body;
  const query =
    "INSERT INTO kitchen_users (store_id,username,password) VALUES (?,?,?)";
  const values = [store_id, username, password];
  connection.query(query, values, (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Error updating data" });
    }
    res
      .status(200)
      .json({ message: "Data updated successfully!", results, userID });
  });
});
// Delete kitchen user
router.delete("/kitchen/:id", (req, res) => {
  const id = req.params.id;
  const query = "DELETE FROM kitchen_users WHERE kitchen_user_id = ?";
  connection.query(query, [id], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    res.status(200).json({ message: "Kitchen user deleted successfully" });
  });
});
// Get store by ID
router.get("/:id", (req, res) => {
  const userId = req.params.id;
  const query =
    "SELECT store_name,username,email,store_image,details,promptpay_number,promptpay_qr,open_time,close_time,contact FROM stores WHERE store_id = ?";
  connection.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(results[0]);
  });
});
// Get all stores
// router.get("/", (req, res) => {
//   const query = "SELECT * FROM stores";
//   connection.query(query, (err, results) => {
//     if (err) {
//       return res.status(400).json({ error: err.message });
//     }
//     res.status(200).json(results);
//   });
// });

router.get("/ppqr/:id", (req, res) => {
  const userId = req.params.id;
  const query = "SELECT promptpay_qr FROM stores WHERE store_id = ?";
  connection.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(results[0]);
  });
});

router.get("/time/:id", (req, res) => {
  const userId = req.params.id;
  const query = "SELECT open_time,close_time FROM stores WHERE store_id = ?";
  connection.query(query, [userId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    if (results.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(results[0]);
  });
});

router.post("/add-user/:storeId", async (req, res) => {
  const { username, password } = req.body;
  const store_id = req.params.storeId;

  if (!store_id || !username || !password) {
    return res.status(400).json({ error: "กรุณากรอกข้อมูลให้ครบถ้วน" });
  }

  try {
    bcrypt.hash(password, 10, (err, hash) => {
      if (err) {
        return res.status(500).json({ error: "Error hashing password" });
      }
      const sql = `
      INSERT INTO kitchen_users (store_id, username, password) 
      VALUES (?, ?, ?)
    `;

      // ใช้ connection.query() แทน query()
      connection.query(sql, [store_id, username, hash], (err, results) => {
        if (err) {
          console.error("Database error:", err);
          return res
            .status(500)
            .json({ error: "Database error: " + err.message });
        }
        res.status(201).json({ message: "เพิ่มผู้ใช้สำเร็จ!" });
      });
    });
  } catch (error) {
    console.error("Error adding user:", error.massage);
    res
      .status(500)
      .json({ error: "เกิดข้อผิดพลาดในการเพิ่มผู้ใช้! " + error.message });
  }
});

router.get("/kitchen/:storeId", async (req, res) => {
  try {
    const storeId = req.params.storeId;

    // ตรวจสอบว่ามี storeId และเป็นตัวเลข
    if (!storeId || isNaN(storeId)) {
      return res.status(400).json({ error: "Invalid store ID" });
    }

    const sql = "SELECT * FROM kitchen_users WHERE store_id = ?";

    // ใช้ Promise wrapper แทน callback
    connection.query(sql, [storeId], (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }
      res.status(200).json(results);
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    res.status(500).json({ error: "Unexpected server error" });
  }
});

router.delete("/kitchen/:userId", (req, res) => {
  const { userId } = req.params;
  const sql = "DELETE FROM kitchen_users WHERE kitchen_user_id = ?";

  connection.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }
    res.status(200).json({ message: "User deleted successfully" });
  });
});

router.put("/kitchen/password/:userId", (req, res) => {
  const { userId } = req.params;
  const { password } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const sql = "UPDATE kitchen_users SET password = ? WHERE kitchen_user_id = ?";

  connection.query(sql, [hashedPassword, userId], (err, result) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Database error: " + err.message });
    }
    res.status(200).json({ message: "User deleted successfully" });
  });
});
  
router.put("/update-password/", (req, res) => {
  const { userId, oldPassword, newPassword } = req.body;

  if (!userId || !oldPassword || !newPassword) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // ✅ 1. ค้นหารหัสผ่านเก่าของผู้ใช้
  connection.query(
    "SELECT password FROM stores WHERE store_id = ?",
    [userId],
    (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      if (result.length === 0) {
        return res.status(404).json({ message: "User not found" });
      }

      const storedPassword = result[0].password;
      const isPasswordMatch = bcrypt.compareSync(oldPassword, storedPassword);

      if (!isPasswordMatch) {
        return res.status(400).json({ error: "Invalid old password" });
      }

      // ✅ 2. แฮชรหัสผ่านใหม่
      const hashedPassword = bcrypt.hashSync(newPassword, 10);

      // ✅ 3. อัปเดตรหัสผ่านในฐานข้อมูล
      connection.query(
        "UPDATE stores SET password = ? WHERE store_id = ?",
        [hashedPassword, userId],
        (updateErr, updateResult) => {
          if (updateErr) {
            console.error("Database error:", updateErr);
            return res
              .status(500)
              .json({ error: "Database error: " + updateErr.message });
          }
          res.status(200).json({ message: "Password updated successfully" });
        }
      );
    }
  );
});

module.exports = router;
