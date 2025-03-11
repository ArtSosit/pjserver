const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
const router = express.Router();
const app = express();
app.use(bodyParser.json());
app.use(cors());

const authRoutes = require("./routes/auth");
const storeRoutes = require("./routes/store");
const menuRoutes = require("./routes/menu");
const categoryRoutes = require("./routes/categories");
const orderRoutes = require("./routes/order");
const tableRoutes = require("./routes/tables");
const saleRoutes = require("./routes/sale");
app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/tables", tableRoutes);
app.use("/api/sales", saleRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/server-time", (req, res) => {
  const now = new Date();
  res.json({ serverTime: now.toISOString() });
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});
app.set("socketio", io);
io.on("connect", (socket) => {
  console.log("Client connected:", socket.id);
  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
