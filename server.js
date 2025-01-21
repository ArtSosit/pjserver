const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const http = require("http"); // ใช้สร้าง HTTP server
const WebSocket = require("ws"); // ไลบรารี WebSocket

const app = express();

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

// สร้าง HTTP Server
const server = http.createServer(app);

// สร้าง WebSocket Server
const wss = new WebSocket.Server({ server });

// ฟังก์ชันสำหรับ broadcast ข้อมูล
function broadcast(data) {
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });
}

// เมื่อมีการเชื่อมต่อ WebSocket
wss.on("connection", (ws) => {
  console.log("New WebSocket connection");

  // รับข้อความจาก client
  ws.on("message", (message) => {
    console.log("Received from client:", message);
  });

  // เมื่อ client disconnect
  ws.on("close", () => {
    console.log("Client disconnected");
  });

  // ส่งข้อความต้อนรับ
  ws.send(JSON.stringify({ message: "Welcome to WebSocket server!" }));
});


// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
