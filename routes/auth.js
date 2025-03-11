const express = require("express");
const bcrypt = require("bcrypt");
const connection = require("../db"); // Assuming db.js is used for DB connection
const router = express.Router();
const saltRounds = 10;
const jwt = require("jsonwebtoken"); // ใช้งาน jwt
console.log("auth.js loaded");
// Login Route
// router.post("/login", (req, res) => {
//   const { email, password } = req.body;
//   // Validate input
//   if (!email || !password) {
//     return res.status(400).json({ message: "Email and password are required" });
//   }
//   // Retrieve the user from the database
//   const query = "SELECT * FROM stores WHERE email = ?";
//   connection.query(query, [email], (err, results) => {
//     if (err) {
//       console.error("Database error:", err);
//       return res.status(500).json({ error: "Internal server error" });
//     }
//     // Check if user exists
//     if (results.length === 0) {
//       return res.status(401).json({ message: "Invalid email" });
//     }
//     const user = results[0];
//     // Use bcrypt.compare to compare entered password with hashed password
//     bcrypt.compare(password, user.password, (err, isMatch) => {
//       if (err) {
//         console.error("Error comparing passwords:", err);
//         return res.status(500).json({ error: "Internal server error" });
//       }
//       if (isMatch) {
//         // ส่ง id ของผู้ใช้กลับไปใน response
//         console.log(user.id),
//           res.status(200).json({
//             message: "Login successful! ",
//             userId: user.store_id, // ส่ง id ของผู้ใช้กลับไป
//           });
//       } else {
//         res.status(401).json({ message: "Invalid password" });
//       }
//     });
//   });
// });
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Using a single parameter for both email and username to avoid confusion and potential security risks
  const userIdentifier = email;

  // First try to retrieve the user from the stores table
  const storeQuery = "SELECT * FROM stores WHERE email = ? OR username = ?";
  connection.query(
    storeQuery,
    [userIdentifier, userIdentifier],
    (err, results) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (results.length > 0) {
        const user = results[0];
        // Use bcrypt to compare entered password with hashed password
        bcrypt.compare(password, user.password, (err, isMatch) => {
          if (err) {
            console.error("Error comparing passwords:", err);
            return res.status(500).json({ error: "Internal server error" });
          }

          if (isMatch) {
            // Create JWT token
            const token = jwt.sign(
              { userId: user.store_id, type: "store" }, // Note: Ensure this ID reflects your actual key name
              "your_secret_key", // Replace 'your_secret_key' with your actual secret key
              { expiresIn: "24h" } // Token expires in 24 hours
            );

            // Send token back
            return res.status(200).json({
              message: "Login successful!",
              token: token,
            });
          } else {
            return res.status(401).json({ message: "Invalid password" });
          }
        });
      } else {
        // User not found in stores, check kitchen_users table
        const kitchenQuery = "SELECT * FROM kitchen_users WHERE username = ?";
        connection.query(
          kitchenQuery,
          [userIdentifier],
          (err, kitchenResults) => {
            if (err) {
              console.error("Database error:", err);
              return res.status(500).json({ error: "Internal server error" });
            }

            if (kitchenResults.length === 0) {
              return res
                .status(401)
                .json({ message: "Invalid username or email" });
            }

            const kitchenUser = kitchenResults[0];
            bcrypt.compare(password, kitchenUser.password, (err, isMatch) => {
              if (err) {
                console.error("Error comparing passwords:", err);
                return res.status(500).json({ error: "Internal server error" });
              }

              if (isMatch) {
                const token = jwt.sign(
                  { userId: kitchenUser.store_id, type: "kitchen" }, // Note: Ensure this ID reflects your actual key name
                  "your_secret_key",
                  { expiresIn: "24h" }
                );

                return res.status(200).json({
                  message: "Login successful!",
                  token: token,
                });
              } else {
                return res.status(401).json({ message: "Invalid password" });
              }
            });
          }
        );
      }
    }
  );
});

// Register Route
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  // ตรวจสอบว่ามี username หรือ email นี้อยู่แล้วหรือไม่
  const checkQuery = "SELECT * FROM stores WHERE username = ? OR email = ?";
  connection.query(checkQuery, [username, email], (err, results) => {
    if (err) {
      return res.status(500).json({ error: "Database error" });
    }
    if (results.length > 0) {
      return res
        .status(400)
        .json({ error: "Username or email already exists" });
    }

    // ถ้าไม่มีข้อมูลซ้ำ ให้ทำการแฮชรหัสผ่านและ INSERT
    bcrypt.hash(password, saltRounds, (err, hash) => {
      if (err) {
        return res.status(500).json({ error: "Error hashing password" });
      }
      const insertQuery =
        "INSERT INTO stores (username, email, password) VALUES (?, ?, ?)";
      connection.query(insertQuery, [username, email, hash], (err, results) => {
        if (err) {
          return res.status(500).json({ error: "Database error" });
        }
        const token = jwt.sign(
          { userId: results.insertId }, // ข้อมูลที่จะเก็บใน token
          "your_secret_key", // ใช้ secret key ของคุณ
          { expiresIn: "24h" }
        ); // กำหนดเวลาให้หมดอายุใน 1 ชั่วโมง
        res.status(201).json({
          message: "User registered successfully!",
          token: token,
        });
      });
    });
  });
});

module.exports = router;
