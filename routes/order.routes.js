import express from "express";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";
import orderController from "../controllers/order.controller.js";

const router = express.Router();

// Admin routes
router.get(
  "/",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  orderController.getAllOrders
);
router.get(
  "/overview-stats",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  orderController.getOrderStatistics
);
router.get(
  "/revenue-stats",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  orderController.getRevenueStatistics
);
router.put(
  "/:id/status",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  orderController.updateOrderStatus
);
router.put(
  "/:id/payment",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  orderController.updatePaymentStatus
);

// Public routes
router.get("/order-code", orderController.getOrderCode);
router.post("/", orderController.createOrder); // Allow anyone to create an order
router.get("/anonymous/:anonymousId", orderController.getOrdersByAnonymousId);
router.post("/:id/cancel", orderController.cancelOrder);
router.put(
  "/:id/payment/anonymous/:anonymousId",
  orderController.updatePaymentStatusByAnonymous
);

// User routes (authenticated)
router.get("/user/:userId", authenticate, orderController.getOrdersByUser);
router.get("/:id", authenticate, orderController.getOrderById);
router.put(
  "/:id/payment/:userId",
  authenticate,
  orderController.updatePaymentStatusByUser
);
export default router;
