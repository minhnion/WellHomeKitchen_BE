import express from "express";
import searchController from "../controllers/search.controller.js";

const router = express.Router();

router.get("/", searchController.searchProducts);

router.get("/auto", searchController.autoSearchProducts);

export default router;
