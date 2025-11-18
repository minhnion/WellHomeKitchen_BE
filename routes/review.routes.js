import express from "express";
import reviewController from "../controllers/review.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes - Lấy đánh giá (không cần đăng nhập)
router.get("/product/:productId", reviewController.getReviewsByProduct);
router.get("/:id", reviewController.getReviewById);

// Protected routes - Cần đăng nhập
router.use(authenticate);

// User routes - Người dùng đã đăng nhập
router.post("/", reviewController.createReview);
router.get("/user/my-reviews", reviewController.getReviewsByUser);
router.put("/:id", reviewController.updateReview);
router.delete("/:id", reviewController.deleteReview);

export default router;
