import express from "express";
import authController from "../controllers/auth.controller.js";
import {
  authenticate,
} from "../middlewares/auth.middleware.js";

const router = express.Router()

router.post("/register", authController.register);
router.post("/login", authController.login);
router.post("/logout", authenticate, authController.logout);
router.get("/refresh-token", authController.refreshToken);
router.post("/forgot-password", authController.forgotPassword);
router.put("/profile", authenticate, authController.updateProfile);

export default router;
