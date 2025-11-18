import express from "express";
import saleOccasionController from "../controllers/saleOccasion.controller.js";

const router = express.Router();

router.get("/products", saleOccasionController.getSaleProducts);
router.get("/categories", saleOccasionController.getSaleCategories);
router.post("/", saleOccasionController.createSaleOccasion);
export default router;
