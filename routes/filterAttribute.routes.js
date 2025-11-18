import express from "express";
import filterAttributeController from "../controllers/filterAttribute.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/", filterAttributeController.getAllFilterAttributes);
router.post(
  "/",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  filterAttributeController.createFilterAttributes
);
router.put(
  "/:categoryId",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  filterAttributeController.updateFilterAttributes
);
router.delete(
  "/:categoryId",
  authenticate,
  authorizeRoles("product-manager", "admin"),
  filterAttributeController.deleteFilterAttributes
);

export default router;
