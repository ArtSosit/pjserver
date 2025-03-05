const express = require("express");
const http = require("http");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const { Server } = require("socket.io");
const router = express.Router();
const app = express();
const server = http.createServer(app); // ✅ กำหนด server
const io = new Server(server, {
  cors: {
    origin: "*", // ✅ อนุญาตทุกโดเมน (หรือเปลี่ยนเป็น URL ของ frontend)
    methods: ["GET", "POST"],
  },
});

app.use(bodyParser.json());
app.use(cors());

// ✅ แชร์ io ให้ route อื่น ๆ ใช้
app.set("socketio", io);

// ✅ Import routes
const authRoutes = require("./routes/auth");
const storeRoutes = require("./routes/store");
const menuRoutes = require("./routes/menu");
const categoryRoutes = require("./routes/categories");
const orderRoutes = require("./routes/order"); // 👈 route นี้ต้องใช้ io
const tableRoutes = require("./routes/tables");

// ✅ Use routes
app.use("/api/auth", authRoutes);
app.use("/api/stores", storeRoutes);
app.use("/api/menus", menuRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/orders", orderRoutes); // 👈 ใช้งาน /orders
app.use("/api/tables", tableRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.get("/server-time", (req, res) => {
  const now = new Date(); // ✅ ใช้ Date() ถูกต้อง
  res.json({ serverTime: now.toISOString() }); // ✅ ส่งค่าเป็น ISO 8601
});
// ✅ Socket.io logic (เฉพาะ event ที่ใช้ทุกที่)
io.on("connection", (socket) => {
  console.log("⚡ Client connected:", socket.id);

  socket.on("cancelOrder", (orderId) => {
    console.log("❌ Order cancelled:", orderId);
    io.emit("orderCancelled", { orderId }); // แจ้งทุก client
  });

  socket.on("disconnect", () => {
    console.log("🚪 Client disconnected:", socket.id);
  });
});

// ✅ Start Server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
