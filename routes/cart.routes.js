import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";
import cartController from "../controllers/cart.controller.js";

const router = express.Router();

router.post("/add-item", authenticate, cartController.addItemToCart);
router.post("/get-detail", authenticate, cartController.getCartDetail);
router.put("/:itemId", authenticate, cartController.updateCartItemQuantity);
router.delete("/", authenticate, cartController.deleteItemsFromCart);
export default router;
