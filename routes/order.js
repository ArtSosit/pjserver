const express = require("express");
const connection = require("../db");
const router = express.Router();
console.log("order.js loaded");
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
  menu_items.item_id,  -- แสดง item_id
  SUM(order_details.quantity) AS quantity,  -- รวม quantity ของ item_id เดียวกัน
  MIN(menu_items.price) AS price,  -- ใช้ MIN เพื่อให้แน่ใจว่าราคาเมนูถูกต้อง
  SUM(order_details.quantity * menu_items.price) AS totalPrice  -- คำนวณราคาทั้งหมด
FROM orders
JOIN order_details ON orders.order_id = order_details.order_id
JOIN menu_items ON order_details.item_id = menu_items.item_id
JOIN tables ON orders.table_id = tables.table_id
WHERE orders.store_id = ?
GROUP BY orders.order_id, tables.table_number, menu_items.item_name, menu_items.item_id
ORDER BY orders.order_id, tables.table_number;


  `;

  connection.query(query, [storeId], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }

    // Group the result into desired format
    const groupedOrders = results.reduce((acc, row) => {
      // Find if the order already exists in the accumulator
      let order = acc.find((order) => order.order === row.order);
      if (!order) {
        // If not, create a new order object
        order = {
          order: row.order,
          tableNumber: row.tableNumber,
          items: [],
          totalPrice: 0,
        };
        acc.push(order);
      }

      // Add item to the order
      order.items.push({
        name: row.name,
        quantity: row.quantity,
        price: row.price,
      });

      // Update total price for the order
      order.totalPrice += row.quantity * row.price;

      return acc;
    }, []);

    // Return the grouped result
    res.status(200).json(groupedOrders);
  });
});

router.get("/:storeId/:orderId", (req, res) => {
  const { storeId, orderId } = req.params;

  const query = `
    SELECT 
      orders.order_id AS orderId,
      tables.table_number AS tableNumber,
      menu_items.item_name AS name,
      menu_items.item_image AS image ,
      menu_items.item_id,
      SUM(order_details.quantity) AS quantity,
      MIN(menu_items.price) AS price,
      SUM(order_details.quantity * menu_items.price) AS totalPrice
    FROM orders
    JOIN order_details ON orders.order_id = order_details.order_id
    JOIN menu_items ON order_details.item_id = menu_items.item_id
    JOIN tables ON orders.table_id = tables.table_id
    WHERE orders.store_id = ? AND orders.order_id = ?
    GROUP BY orders.order_id, tables.table_number, menu_items.item_name, menu_items.item_id
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
      tableNumber: results[0].tableNumber,
      items: results.map((row) => ({
        itemId: row.item_id,
        name: row.name,
        quantity: row.quantity,
        price: parseFloat(row.price),
        image: row.image,
      })),
      totalPrice: results.reduce((sum, row) => sum + row.totalPrice, 0), // คำนวณราคาทั้งหมด
    };

    res.status(200).json(groupedOrder);
  });
});

router.post("/", (req, res) => {
  console.log("📦 ORDER RECEIVED:", req.body);

  const { store_id, table_id, items } = req.body;
  if (!store_id || !table_id || !items || items.length === 0) {
    return res.status(400).json({ error: "❌ ข้อมูลไม่ครบถ้วน!" });
  }

  const orderTime = new Date();
  const totalAmount = items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const orderQuery = `
    INSERT INTO orders (store_id, table_id, order_time, total_amount, payment_status, order_status)
    VALUES (?, ?, ?, ?, "unpaid", "pending");
  `;

  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });

    connection.query(
      orderQuery,
      [store_id, table_id, orderTime, totalAmount],
      (err, orderResult) => {
        if (err) {
          return connection.rollback(() =>
            res.status(400).json({ error: err.message })
          );
        }

        const orderId = orderResult.insertId;
        const orderDetailsQuery = `
        INSERT INTO order_details (order_id, item_id, quantity, price, description)
        VALUES (?, ?, ?, ?, ?);
      `;

        const orderDetailsPromises = items.map((item) => {
          return new Promise((resolve, reject) => {
            connection.query(
              orderDetailsQuery,
              [
                orderId,
                item.item_id,
                item.quantity,
                item.price,
                item.description,
              ],
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
              res
                .status(201)
                .json({ message: "✅ Order placed successfully!", orderId });
            });
          })
          .catch((err) => {
            connection.rollback(() =>
              res.status(400).json({ error: err.message })
            );
          });
      }
    );
  });
});

router.put("/cancel-order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const completeOrderQuery = `
    UPDATE orders 
    SET order_status = 'cancelled' 
    WHERE order_id = ?;
  `;
  const updateTableQuery = `
    UPDATE tables 
    SET status = 'available' 
    WHERE table_id = (
      SELECT table_id FROM orders WHERE order_id = ?
    );
  `;
  connection.beginTransaction((err) => {
    if (err) return res.status(500).json({ error: err.message });
    connection.query(completeOrderQuery, [orderId], (err) => {
      if (err) {
        return connection.rollback(() => {
          res.status(400).json({ error: err.message });
        });
      }
      connection.query(updateTableQuery, [orderId], (err) => {
        if (err) {
          return connection.rollback(() => {
            res.status(400).json({ error: err.message });
          });
        }
        connection.commit((err) => {
          if (err) {
            return connection.rollback(() => {
              res.status(400).json({ error: err.message });
            });
          }
          res
            .status(200)
            .json({ message: "Order cancelled and table is now available." });
        });
      });
    });
  });
});
router.put("/complete-order/:orderId", (req, res) => {
  const { orderId } = req.params;
  const completeOrderQuery = `
    UPDATE orders 
    SET order_status = 'completed' 
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
  const completeOrderQuery = `
    UPDATE orders 
    SET payment_status = 'paid' 
    WHERE order_id = ?;
  `;
  const updateTableQuery = `
    UPDATE tables 
    SET status = 'available' 
    WHERE table_id = (
      SELECT table_id FROM orders WHERE order_id = ?
    );
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
  connection.query(updateTableQuery, [orderId], (err) => {
    if (err) {
      return connection.rollback(() => {
        res.status(400).json({ error: err.message });
      });
    }
    connection.commit((err) => {
      if (err) {
        return connection.rollback(() => {
          res.status(400).json({ error: err.message });
        });
      }
      res
        .status(200)
        .json({ message: "Order cancelled and table is now available." });
    });
  });
});
// Route to get daily sales for paid orders
router.get("/sales", (req, res) => {
  const { store_id, date } = req.query; // รับ store_id และวันที่จาก query parameters
  // คำสั่ง SQL เพื่อคำนวณยอดขายรายวัน โดยเลือกเฉพาะคำสั่งที่ชำระเงินแล้ว (payment_status = 'paids')
  const salesQuery = `
    SELECT 
      SUM(total_amount) AS total_sales 
    FROM orders 
    WHERE store_id = ? 
      AND DATE(order_time) = DATE(?) 
      AND payment_status = 'paids' -- เพิ่มเงื่อนไขเฉพาะคำสั่งที่ชำระเงินแล้ว
      AND order_status = 'completed'; -- หรือสถานะออเดอร์ที่สมบูรณ์
  `;
  // ทำการ query ข้อมูลยอดขาย
  connection.query(salesQuery, [store_id, date], (err, results) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    // ตรวจสอบผลลัพธ์
    if (results.length === 0 || results[0].total_sales === null) {
      return res.status(200).json({ total_sales: 0 }); // ถ้ายอดขายไม่มี ให้ส่ง 0
    }
    // ส่งผลลัพธ์กลับ
    res.status(200).json({ total_sales: results[0].total_sales });
  });
});
module.exports = router;
