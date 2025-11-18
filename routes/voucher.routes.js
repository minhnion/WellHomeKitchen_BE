import express from "express";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";
import voucherController from "../controllers/voucher.controller.js";

const router = express.Router();

// Public routes
router.get("/code/:code", voucherController.getVoucherByCode);
router.post("/validate", voucherController.validateVoucher);

// Protected routes (admin only)
router.post(
  "/",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  voucherController.createVoucher
);
router.get(
  "/",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  voucherController.getAllVouchers
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  voucherController.updateVoucher
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  voucherController.deleteVoucher
);

export default router;
