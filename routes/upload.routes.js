import express from "express";
import uploadController from "../controllers/upload.controller.js";
import uploadMiddleware from "../middlewares/upload.middleware.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  uploadMiddleware,
  uploadController.uploadFile
);
router.get(
  "/",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  uploadController.getListFile
);
router.delete(
  "/:filename",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  uploadController.deleteFile
);

export default router;
