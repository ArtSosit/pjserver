const express = require("express");
const bcrypt = require("bcrypt");
const connection = require("../db"); // Assuming db.js is used for DB connection
const router = express.Router();
const saltRounds = 10;
console.log("auth.js loaded");
// Login Route
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  // Retrieve the user from the database
  const query = "SELECT * FROM stores WHERE email = ?";
  connection.query(query, [email], (err, results) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }

    // Check if user exists
    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid email" });
    }

    const user = results[0];

    // Use bcrypt.compare to compare entered password with hashed password
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error("Error comparing passwords:", err);
        return res.status(500).json({ error: "Internal server error" });
      }

      if (isMatch) {
        // ส่ง id ของผู้ใช้กลับไปใน response
        console.log(user.id),
          res.status(200).json({
            message: "Login successful! ",

            userId: user.store_id, // ส่ง id ของผู้ใช้กลับไป
          });
      } else {
        res.status(401).json({ message: "Invalid password" });
      }
    });
  });
});

// Register Route
router.post("/register", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      return res.status(500).json({ error: "Error hashing password" });
    }

    const query =
      "INSERT INTO stores (username, email, password) VALUES (?, ?, ?)";
    connection.query(query, [username, email, hash], (err, results) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(400)
            .json({ error: "Username or email already exists" });
        }
        return res.status(500).json({ error: "Database error" });
      }

      res.status(201).json({
        message: "User registered successfully!",
        userID: results.insertId,
      });
    });
  });
});

module.exports = router;
