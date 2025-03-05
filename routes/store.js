const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const connection = require("../db");
const router = express.Router();
console.log("store.js loaded");

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
module.exports = router;
