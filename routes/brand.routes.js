import express from "express";
import brandController from "../controllers/brand.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", brandController.getAllBrands);
router.get("/slug/:slug", brandController.getBrandBySlug);
router.get("/:id", brandController.getBrandById);
router.post(
  "/",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  brandController.createBrand
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  brandController.updateBrand
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  brandController.deleteBrand
);

export default router;
