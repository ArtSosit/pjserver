const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const app = express();
const path = require("path");
app.use(bodyParser.json());
app.use(cors());

// Import routes
const authRoutes = require("./routes/auth");
const storeRoutes = require("./routes/store");
const menuRoutes = require("./routes/menu");
const categoryRoutes = require("./routes/categories");
const orderRoutes = require("./routes/order");
const tableRoutes = require("./routes/tables");

// Use routes
app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tables", tableRoutes);

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
