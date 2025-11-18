import express from "express";
import labelController from "../controllers/label.controller.js";
import {
  authenticate,
  authorizeAdmin,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

// Public routes - Lấy danh sách labels và sản phẩm theo label
router.get("/", labelController.getLabels);
router.get("/:id/products", labelController.getProductsByLabel);

// Protected admin routes - Quản lý labels
router.post("/", authenticate, authorizeAdmin, labelController.createLabel);
router.put("/:id", authenticate, authorizeAdmin, labelController.updateLabel);
router.delete(
  "/:id",
  authenticate,
  authorizeAdmin,
  labelController.deleteLabel
);

// Protected admin routes - Quản lý labels cho sản phẩm
router.post(
  "/add-to-product",
  authenticate,
  authorizeAdmin,
  labelController.addLabelToProduct
);
router.post(
  "/remove-from-product",
  authenticate,
  authorizeAdmin,
  labelController.removeLabelFromProduct
);

export default router;
