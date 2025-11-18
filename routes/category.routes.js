import express from "express";
import categoryController from "../controllers/category.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", categoryController.getAllCategories);
router.get("/slug/:slug", categoryController.getCategoryBySlug);
router.get("/:id", categoryController.getCategoryById);
router.post(
  "/",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  categoryController.createCategory
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  categoryController.updateCategory
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  categoryController.deleteCategory
);
export default router;
