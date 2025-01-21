const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const connection = require("../db");
const router = express.Router();
console.log("store.js loaded");
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "./uploads";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(
      null,
      file.fieldname + "-" + Date.now() + path.extname(file.originalname)
    );
  },
});
const upload = multer({ storage: storage });
// Add additional info route
router.post(
  "/additional-info",
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
    const storeImage = req.files["storeImage"]
      ? req.files["storeImage"][0].filename
      : null;
    const promptpayImage = req.files["promptpayimage"]
      ? req.files["promptpayimage"][0].filename
      : null;
    const query = `
      UPDATE stores
      SET store_name = ?, details = ?, contact = ?, promptpay_number = ?, store_image = ?, promptpay_qr = ?, open_time=?, close_time=?
      WHERE store_id = ?;
    `;
    const values = [
      storeName,
      storeDetails,
      contactInfo,
      promptpay,
      storeImage,
      promptpayImage,
      openTime,
      closeTime,
      userID,
    ];
    connection.query(query, values, (err, results) => {
      if (err) {
        return res.status(500).json({ error: "Error updating data" });
      }
      res
        .status(200)
        .json({ message: "Data updated successfully!", results, userID });
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
  const query = "SELECT * FROM stores WHERE store_id = ?";
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
module.exports = router;
