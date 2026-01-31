import express from "express";
import saleOccasionController from "../controllers/saleOccasion.controller.js";
import { authenticate, authorizeRoles } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/products", saleOccasionController.getSaleProducts);
router.get("/products/all", saleOccasionController.getAllActiveSaleProducts);
router.get("/categories", saleOccasionController.getSaleCategories);
router.post("/", authenticate,
    authorizeRoles("product-manager", "admin"),
    saleOccasionController.createSaleOccasion);
router.put("/:id", authenticate,
    authorizeRoles("product-manager", "admin"),
    saleOccasionController.updateSaleOccasion);
router.delete("/:id", authenticate,
    authorizeRoles("product-manager", "admin"),
    saleOccasionController.deleteSaleOccasion);
router.get("/", authenticate,
    authorizeRoles("product-manager", "admin"),
    saleOccasionController.getAllSaleOccasions);
export default router;
