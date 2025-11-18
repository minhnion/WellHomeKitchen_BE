import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";
import compression from "compression";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
// Routes
import productRoutes from "./routes/product.routes.js";
import categoryRoutes from "./routes/category.routes.js";
import brandRoutes from "./routes/brand.routes.js";
import uploadRoutes from "./routes/upload.routes.js";
import configRoutes from "./routes/config.routes.js";
import postCategoryRoutes from "./routes/postCategory.route.js";
import postRouters from "./routes/post.routes.js";
import authRoutes from "./routes/auth.routes.js";
import cartRoutes from "./routes/cart.routes.js";
import salesRoutes from "./routes/saleOccasion.routes.js";
import commentRoutes from "./routes/comment.routes.js";
import filterAttributeRoute from "./routes/filterAttribute.routes.js";
import categoryAttributeRoute from "./routes/categoryAttribute.routes.js";
import subCategoryRoute from "./routes/subcategory.routes.js";
import voucherRoutes from "./routes/voucher.routes.js";
import orderRoutes from "./routes/order.routes.js";
import searchRoutes from "./routes/search.routes.js";
import bannerRoutes from "./routes/banner.routes.js";
import labelRoutes from "./routes/label.routes.js";
import userRoutes from "./routes/user.routes.js";
import reviewRoutes from "./routes/review.routes.js";
import notificationRoutes from "./routes/notification.route.js";
import logger from "./utils/logger.js"; // Import logger
//
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
dotenv.config();

// Log
const morganFormat =
  ":method :url :status :response-time ms - :res[content-length]";

// Log HTTP requests với Morgan + Pino
app.use(
  morgan(morganFormat, {
    stream: {
      write: (message) => {
        const trimmed = message.trim();
        const parts = trimmed.split(" ");
        const method = parts[0];
        const url = parts[1];
        const status = parseInt(parts[2]);
        const responseTime = parts[3];

        logger.info(
          {
            method,
            url,
            status,
            responseTime: `${responseTime} ms`,
            type: "http_request",
          },
          `${method} ${url} ${status} - ${responseTime} ms`
        );
      },
    },
  })
);

// Middleware
app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(compression());
app.use(helmet());

// MongoDB connection
mongoose
  .connect(process.env.MONGODB_URI, {
    maxPoolSize: 50,
  })
  .then(() => console.log("MongoDB connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Routes
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/brands", brandRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/config", configRoutes);
app.use("/api/post-categories", postCategoryRoutes);
app.use("/api/posts", postRouters);
app.use("/api/auth", authRoutes);
app.use("/api/cart", cartRoutes);
app.use("/api/sales", salesRoutes);
app.use("/api/comments", commentRoutes);
app.use("/api/filter-attributes", filterAttributeRoute);
app.use("/api/category-attributes", categoryAttributeRoute);
app.use("/api/subCategory", subCategoryRoute);
app.use("/api/vouchers", voucherRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/banners", bannerRoutes);
app.use("/api/labels", labelRoutes);
app.use("/api/users", userRoutes);
app.use("/api/reviews", reviewRoutes);
app.use("/api/notifications", notificationRoutes);
// Static files
app.use(
  "/public",
  express.static(path.join(__dirname, "public"), {
    setHeaders: (res, _path) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
      res.setHeader("Cache-Control", "public, max-age=900");
    },
  })
);

//
export default app;
