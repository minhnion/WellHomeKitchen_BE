import express from "express";
import productController from "../controllers/product.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
  "/overview-stats",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  productController.getProductOverviewStats
);
router.get("/", productController.getAllProducts);
router.get("/topSelling", productController.getTopSellingProductsByCategory);
router.post("/extra-filter", productController.getAllProductsWithFilter);
router.post(
  "/",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  productController.createProduct
);
router.get("/:id", productController.getProductById);
router.get("/slug/:slug", productController.getProductBySlug);
router.get("/sku/:sku", productController.getProductBySku);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  productController.updateProduct
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  productController.deleteProduct
);
export default router;
