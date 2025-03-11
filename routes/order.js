const express = require("express");
const connection = require("../db");
const router = express.Router();
const path = require("path");
const fs = require("fs");
const multer = require("multer");
console.log("order.js loaded");

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

const upload = multer({ storage });

// Get all orders
router.get("/", (req, res) => {
  // SQL Query ที่ใช้ description แทน special_instructions
  const query = `
    SELECT  
      orders.order_id, 
      orders.store_id, 
      orders.table_id, 
      orders.order_time, 
      orders.total_amount, 
      orders.payment_status, 
      orders.order_status, 
      order_details.item_id, 
      menu_items.item_name,  
      order_details.quantity, 
      order_details.price, 
      order_details.description  
    FROM orders
    JOIN order_details 
        ON orders.order_id = order_details.order_id
    JOIN menu_items 
        ON order_details.item_id = menu_items.item_id;
  `;
  // ใช้ connection.query เพื่อทำการ execute SQL query
  connection.query(query, (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message }); // กรณีมีข้อผิดพลาด
    }
    res.status(200).json(results); // ส่งข้อมูลกลับในรูปแบบ JSON
  });
});

router.get("/:storeId", (req, res) => {
  const { storeId } = req.params;
  const query = `
    SELECT 
      orders.order_id AS \`order\`,
      tables.table_number AS tableNumber,
      menu_items.item_name AS name,
      menu_items.item_id,
      order_details.order_detail_id AS detail_id,
      order_details.Status as status,
      order_details.description AS note,
      orders.order_status as orderstatus,
      
      SUM(order_details.quantity) AS quantity,
      MIN(order_details.price) AS price,
      orders.total_amount AS totalPrice
    FROM orders
    JOIN order_details ON orders.order_id = order_details.order_id
    JOIN menu_items ON order_details.item_id = menu_items.item_id
    LEFT JOIN tables ON orders.table_id = tables.table_id
    WHERE orders.store_id = ? 
    GROUP BY orders.order_id, tables.table_number, menu_items.item_name, menu_items.item_id, order_details.order_detail_id
    ORDER BY orders.order_id, tables.table_number;
  `;

  connection.query(query, [storeId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const groupedOrders = results.reduce((acc, row) => {
      let order = acc.find((order) => order.order === row.order);
      if (!order) {
        order = {
          order: row.order,
          tableNumber: row.tableNumber,
          items: [],
          totalPrice: row.totalPrice, // Use SQL-calculated totalPrice directly
          orderstatus: row.orderstatus,
        };
        acc.push(order);
      }
      let existingItem = order.items.find(
        (item) => item.detail_id === row.detail_id
      );
      if (existingItem) {
        existingItem.quantity += row.quantity; // Merge quantities for same item
      } else {
        order.items.push({
          detail_id: row.detail_id,
          name: row.name,
          quantity: row.quantity,
          price: row.price,
          status: row.status,
          note: row.note,
        });
      }
      return acc;
    }, []);
    res.status(200).json(groupedOrders);
  });
});

router.get("/paid/:storeId", (req, res) => {
  const { storeId } = req.params;
  const query = `
    SELECT 
      orders.order_id AS \`order\`,
      tables.table_number AS tableNumber,
      menu_items.item_name AS name,
      menu_items.item_id,
      menu_items.item_image as item_image,
      order_details.order_detail_id AS detail_id,
      order_details.Status as status,
      orders.order_status as orderstatus,
      SUM(order_details.quantity) AS quantity,
      MIN(order_details.price) AS price,
      orders.total_amount AS totalPrice,
      orders.payment_proof as proof,
      orders.payment_status as paymentstatus
    FROM orders
    JOIN order_details ON orders.order_id = order_details.order_id
    JOIN menu_items ON order_details.item_id = menu_items.item_id
    LEFT JOIN tables ON orders.table_id = tables.table_id
    WHERE orders.store_id = ? AND orders.order_status = 'success'
    GROUP BY orders.order_id, tables.table_number, menu_items.item_name, menu_items.item_id, order_details.order_detail_id
    ORDER BY orders.order_id, tables.table_number;
  `;

  connection.query(query, [storeId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    const groupedOrders = results.reduce((acc, row) => {
      let order = acc.find((order) => order.order === row.order);
      if (!order) {
        order = {
          order: row.order,
          tableNumber: row.tableNumber,
          items: [],
          totalPrice: row.totalPrice,
          orderstatus: row.orderstatus,
          proof: row.proof,
          paymentstatus: row.paymentstatus,
        };
        acc.push(order);
      }
      let existingItem = order.items.find(
        (item) => item.detail_id === row.detail_id
      );
      if (existingItem) {
        existingItem.quantity += row.quantity;
      } else {
        order.items.push({
          detail_id: row.detail_id,
          name: row.name,
          quantity: row.quantity,
          price: row.price,
          status: row.status,
          item_image: row.item_image,
        });
      }
      return acc;
    }, []);
    res.status(200).json(groupedOrders);
  });
});

router.get("/:storeId/:orderId", (req, res) => {
  const { storeId, orderId } = req.params;

  const query = `
    SELECT 
      orders.order_id AS orderId,
      orders.order_time AS ordertime,
      orders.order_status AS orderstatus,
      orders.payment_status AS paymentstatus,
      tables.table_number AS tableNumber,
      menu_items.item_name AS name,
      menu_items.item_image AS image ,
      menu_items.item_id,
      order_details.order_detail_id AS detail_id,
      order_details.Status as status ,
      order_details.description AS note,
      SUM(order_details.quantity) AS quantity,
      MIN(order_details.price) AS price,
      SUM(order_details.quantity * order_details.price) AS totalPrice
    FROM orders
    JOIN order_details ON orders.order_id = order_details.order_id
    JOIN menu_items ON order_details.item_id = menu_items.item_id
    JOIN tables ON orders.table_id = tables.table_id
    WHERE orders.store_id = ? AND orders.order_id = ?
    GROUP BY orders.order_id, tables.table_number, menu_items.item_name, menu_items.item_id,order_details.order_detail_id
    ORDER BY orders.order_id, tables.table_number;
  `;

  connection.query(query, [storeId, orderId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลออเดอร์" });
    }
    // จัดกลุ่มข้อมูล
    const groupedOrder = {
      orderId: results[0].orderId,
      orderTime: results[0].ordertime,
      orderStatus: results[0].orderstatus,
      paymentStatus: results[0].paymentstatus,
      tableNumber: results[0].tableNumber,
      items: results.map((row) => ({
        detail_id: row.detail_id,
        itemId: row.item_id,
        name: row.name,
        quantity: row.quantity,
        price: parseFloat(row.price),
        image: row.image,
        note: row.note,

        status: row.status,
      })),
      totalPrice: results.reduce((sum, row) => sum + row.totalPrice, 0), // คำนวณราคาทั้งหมด
    };

    res.status(200).json(groupedOrder);
  });
});

router.post("/", (req, res) => {
  console.log("📦 ORDER RECEIVED:", req.body);
  const io = req.app.get("socketio");
  const { store_id, table_id, items, order_id, price } = req.body;
  if (!store_id || !table_id || !items || items.length === 0) {
    return res.status(400).json({ error: "❌ ข้อมูลไม่ครบถ้วน!" });
  }

  const orderTime = new Date();
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    if (order_id) {
      // อัปเดตสถานะ order_status เป็น "pending"
      const updateOrderQuery = `
        UPDATE orders SET total_amount = total_amount + ? ,order_status = "pending" WHERE order_id = ?;
      `;

      connection.query(updateOrderQuery, [totalAmount, order_id], (err) => {
        if (err) {
          return connection.rollback(() =>
            res.status(400).json({ error: err.message })
          );
        }
        insertOrderDetails(order_id, store_id); // เรียกฟังก์ชันเพิ่มรายการสินค้า
      });
    } else {
      // ถ้าไม่มี order_id -> ให้สร้าง order ใหม่
      const insertOrderQuery = `
        INSERT INTO orders (store_id, table_id, order_time, total_amount, payment_status, order_status)
        VALUES (?, ?, ?, ?, "unpaid", "pending");
      `;

      connection.query(
        insertOrderQuery,
        [store_id, table_id, orderTime, totalAmount],
        (err, orderResult) => {
          if (err) {
            return connection.rollback(() =>
              res.status(400).json({ error: err.message })
            );
          }
          const newOrderId = orderResult.insertId;
          insertOrderDetails(newOrderId, store_id);
        }
      );
    }

    // ฟังก์ชันสำหรับ INSERT order_details
    function insertOrderDetails(orderId, storeId) {
      const orderDetailsQuery = `
        INSERT INTO order_details (order_id, item_id, quantity, price, description)
        VALUES (?, ?, ?, ?, ?);
      `;

      const orderDetailsPromises = items.map((item) => {
        return new Promise((resolve, reject) => {
          connection.query(
            orderDetailsQuery,
            [orderId, item.item_id, item.quantity, item.price, item.note],
            (err) => {
              if (err) return reject(err);
              resolve();
            }
          );
        });
      });

      Promise.all(orderDetailsPromises)
        .then(() => {
          connection.commit((err) => {
            if (err) {
              return connection.rollback(() =>
                res.status(400).json({ error: err.message })
              );
            }

            res.status(201).json({
              message: "✅ Order placed successfully!",
              orderId,
            });
            io.emit("ordering", { storeId });
          });
        })
        .catch((err) => {
          connection.rollback(() =>
            res.status(400).json({ error: err.message })
          );
        });
    }
  });
});

router.put("/cancel-order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const io = req.app.get("socketio"); // ✅ ดึง io จาก `server.js`

  const cancelOrderQuery = `UPDATE orders SET order_status = 'cancelled' WHERE order_id = ?;`;
  const cancelOrderDetailsQuery = `UPDATE order_details SET Status = 'cancelled' WHERE order_id = ?;`;

  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    connection.query(cancelOrderQuery, [orderId], (err) => {
      if (err) {
        return connection.rollback(() => {
          res.status(400).json({ error: err.message });
        });
      }

      connection.query(cancelOrderDetailsQuery, [orderId], (err) => {
        if (err) {
          return connection.rollback(() => {
            res.status(400).json({ error: err.message });
          });
        }

        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              res.status(500).json({ error: err.message });
            });
          }

          io.emit("orderCancelled", { orderId });
          res.json({ message: "Order cancelled successfully" });
        });
      });
    });
  });
});

router.put("/complete-order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const completeOrderQuery = `
    UPDATE orders 
    SET order_status = 'Success' 
    WHERE order_id = ?;
  `;
  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });
    connection.query(completeOrderQuery, [orderId], (err) => {
      if (err) {
        return connection.rollback(() => {
          res.status(400).json({ error: err.message });
        });
      }
    });
  });
});

router.put("/complete-paid/:orderId", (req, res) => {
  const { orderId } = req.params;
  const io = req.app.get("socketio");
  const completeOrderQuery = `
    UPDATE orders 
    SET payment_status = 'paid' 
    WHERE order_id = ?;
  `;

  const updateTableQuery = `
    UPDATE tables 
    SET table_status = 'available' 
    WHERE table_id = (
      SELECT table_id FROM orders WHERE order_id = ?
    );
  `;

  connection.beginTransaction((err) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Transaction error: " + err.message });
    }

    connection.query(completeOrderQuery, [orderId], (err, result) => {
      if (err) {
        return connection.rollback(() => {
          res
            .status(400)
            .json({ error: "Update payment status failed: " + err.message });
        });
      }

      connection.query(updateTableQuery, [orderId], (err, result) => {
        if (err) {
          return connection.rollback(() => {
            res
              .status(400)
              .json({ error: "Update table status failed: " + err.message });
          });
        }
        io.emit("confirmPayment", { orderId });
        res.status(200).json({
          message: "Order payment confirmed and table is now available.",
        });
      });
    });
  });
});

router.put("/complateDetail/:detailId", (req, res) => {
  const { detailId } = req.params;
  const sql = `UPDATE order_details
               SET Status = 'Success'
               WHERE order_detail_id = ?`;

  connection.beginTransaction((err) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Transaction error: " + err.message });
    }

    connection.query(sql, [detailId], (err, result) => {
      if (err) {
        return connection.rollback(() => {
          res.status(400).json({ error: "Update failed: " + err.message });
        });
      }

      if (result.affectedRows === 0) {
        return connection.rollback(() => {
          res.status(404).json({ error: "No matching order detail found." });
        });
      }

      connection.commit((err) => {
        if (err) {
          return connection.rollback(() => {
            res.status(500).json({ error: "Commit failed: " + err.message });
          });
        }
        res.status(200).json({ message: "Order detail updated successfully." });
      });
    });
  });
});

router.put("/cancelledDetail/:detailId", (req, res) => {
  const { detailId } = req.params;
  const sql = `UPDATE order_details
               SET Status = 'Cancelled'
               WHERE order_detail_id = ?`;

  connection.beginTransaction((err) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Transaction error: " + err.message });
    }

    connection.query(sql, [detailId], (err, result) => {
      if (err) {
        return connection.rollback(() => {
          res.status(400).json({ error: "Update failed: " + err.message });
        });
      }

      if (result.affectedRows === 0) {
        return connection.rollback(() => {
          res.status(404).json({ error: "No matching order detail found." });
        });
      }

      connection.commit((err) => {
        if (err) {
          return connection.rollback(() => {
            res.status(500).json({ error: "Commit failed: " + err.message });
          });
        }
        res.status(200).json({ message: "Order detail updated successfully." });
      });
    });
  });
});

router.put("/proof/:orderId", upload.single("proof"), (req, res) => {
  const { orderId } = req.params;
  const { storeId } = req.body;
  const io = req.app.get("socketio");
  const proofimg = req.file ? req.file.filename : null;
  console.log(storeId);
  if (!proofimg) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const updateOrderQuery = `
    UPDATE orders 
    SET payment_proof = ?,
    payment_status = 'pending'
    WHERE order_id = ?;
  `;

  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    connection.query(updateOrderQuery, [proofimg, orderId], (err) => {
      if (err) {
        return connection.rollback(() => {
          res.status(400).json({ error: err.message });
        });
      }
      connection.commit((err) => {
        if (err) {
          return connection.rollback(() => {
            res.status(500).json({ error: err.message });
          });
        }
        io.emit("sendproof", { storeId });
        res.status(200).json({
          message: "Payment proof uploaded successfully!",
          proof: proofimg,
        });
      });
    });
  });
});

module.exports = router;
