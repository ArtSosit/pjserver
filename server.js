const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const cors = require("cors"); // Import cors
const multer = require("multer");
const app = express();
app.use(bodyParser.json());
app.use(cors());
const bcrypt = require("bcrypt");
const saltRounds = 10;
app.use(express.json()); // Make sure to use JSON middleware
// Configure multer for file uploads
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

const connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "pwmysql",
  database: "orderfoodonline",
});
connection.connect((err) => {
  if (err) {
    console.error("Error connecting to MySQL:", err);
    return;
  }
  console.log("Connected to MySQL");
});

// Register Route
app.post("/api/register", (req, res) => {
  const { username, email, password } = req.body;

  console.log("Received data:", req.body); // Log the received data

  if (!username || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.error("Error hashing password:", err); // Log the error
      return res.status(500).json({ error: "Error hashing password" });
    }

    const query =
      "INSERT INTO stores (username, email, password) VALUES (?, ?, ?)";
    connection.query(query, [username, email, hash], (err, results) => {
      if (err) {
        console.error("Database error:", err); // Log the database error
        if (err.code === "ER_DUP_ENTRY") {
          return res
            .status(400)
            .json({ error: "Username or email already exists" });
        }
        return res
          .status(500)
          .json({ error: "Database error: " + err.message });
      }

      const userID = results.insertId;
      res
        .status(201)
        .json({ message: "User registered successfully!", userID });
    });
  });
});

app.post(
  "/api/additional-info",
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
    console.log("Received data:", {
      storeName,
      storeDetails,
      contactInfo,
      promptpay,
      storeImage,
    });
    // คำสั่ง UPDATE เพื่ออัปเดตข้อมูลที่มีอยู่
    const query = `
    UPDATE stores
    SET store_name = ?, details = ?, contact = ?, promptpay_number = ?, store_image = ?, promptpay_qr = ?, open_time=? ,close_time=?
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
      res.status(200).json({
        message: "Data updated successfully!",
        results,
        userID,
      });
    });
  }
);

// Get user by ID
app.get("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  const query = "SELECT * FROM stores WHERE id = ?";
  connection.query(query, [userId], (err, results) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.status(200).json(results[0]);
  });
});

// Get all users
app.get("/api/users", (req, res) => {
  const query = "SELECT * FROM stores";
  connection.query(query, (err, results) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    res.status(200).json(results);
  });
});

app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  // Retrieve the user from the database
  const query = "SELECT * FROM stores WHERE email = ?";
  connection.query(query, [email], (err, results) => {
    if (err) {
      res.status(400).json({ error: err.message });
      return;
    }
    if (results.length === 0) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const user = results[0];

    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        res.status(500).json({ error: "Error comparing passwords" });
        return;
      }
      if (isMatch) {
        res.status(200).json({ message: "Login successful!" });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
