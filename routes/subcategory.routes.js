import express from "express";
import subCategoryController from "../controllers/subCategory.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", subCategoryController.getAllSubCategories);
router.post(
  "/",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  subCategoryController.createSubCategory
);
router.put(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  subCategoryController.updateSubCategory
);
router.delete(
  "/:id",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  subCategoryController.deleteSubCategory
);

export default router;
