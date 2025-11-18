import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cấu hình lưu trữ file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Get current date
    const date = new Date();
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, "0") + year;

    // Create path with month and day folders
    const uploadPath = path.join(__dirname, "../public", month);

    // Create directories if they don't exist
    fs.mkdirSync(uploadPath, { recursive: true });
    req.uploadPath = "/public/" + month;
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

// Bộ lọc file upload
const fileFilterImg = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|JPG|jpeg|JPEG|png|PNG|gif|GIF|webp)$/)) {
    req.fileValidationError = "Only image files are allowed!";
    return cb(new Error("Only image files are allowed!"), false);
  }
  cb(null, true);
};

// Tạo instance multer với các cấu hình
const upload = multer({
  storage: storage,
  fileFilter: fileFilterImg,
  limits: {
    fileSize: 50 * 1024 * 1024,
  },
});

// Middleware xử lý upload
export const uploadMiddleware = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          message: "File size too large. Max size is 50MB",
        });
      }
      return res.status(400).json({
        message: `Upload error: ${err.message}`,
      });
    } else if (err) {
      return res.status(400).json({
        message: err.message,
      });
    }
    next();
  });
};

export default uploadMiddleware;
