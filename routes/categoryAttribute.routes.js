import express from "express";
import categoryAttribute from "../controllers/categoryAttribute.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", categoryAttribute.getAllCategoryAttributes);
router.post(
  "/",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  categoryAttribute.createCategoryAttributes
);
router.put(
  "/:categoryId",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  categoryAttribute.updateCategoryAttributes
);
router.delete(
  "/:categoryId",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  categoryAttribute.deleteCategoryAttributes
);

export default router;
