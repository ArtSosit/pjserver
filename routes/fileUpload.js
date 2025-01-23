// const multer = require("multer");
// const path = require("path");
// const fs = require("fs");

// const ensureUploadDirectoryExists = () => {
//   const uploadDir = path.join(__dirname, "..", "uploads");
//   if (!fs.existsSync(uploadDir)) {
//     fs.mkdirSync(uploadDir);
//   }
//   return uploadDir;
// };

// const configureMulterStorage = () => {
//   const uploadDir = ensureUploadDirectoryExists();
//   return multer.diskStorage({
//     destination: (req, file, cb) => {
//       cb(null, uploadDir);
//     },
//     filename: (req, file, cb) => {
//       cb(null, Date.now() + path.extname(file.originalname)); // ใช้ชื่อไฟล์เดิม
//     },
//   });
// };

// // กำหนดการจำกัดประเภทไฟล์ เช่น อนุญาตเฉพาะไฟล์ .jpg, .png
// const fileFilter = (req, file, cb) => {
//   const allowedTypes = /jpeg|jpg|png/;
//   const extname = allowedTypes.test(
//     path.extname(file.originalname).toLowerCase()
//   );
//   const mimetype = allowedTypes.test(file.mimetype);

//   if (extname && mimetype) {
//     return cb(null, true);
//   } else {
//     cb(new Error("Only images are allowed"), false);
//   }
// };

// const uploadFiles = (fields) => {
//   const storage = configureMulterStorage();
//   const upload = multer({
//     storage: storage,
//     fileFilter: fileFilter, // ใช้การกรองประเภทไฟล์
//   });

//   return upload.fields(fields); // รับ fields ที่ต้องการใช้งาน
// };

// module.exports = { uploadFiles };
