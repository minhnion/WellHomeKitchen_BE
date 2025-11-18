import express from "express";

const router = express.Router();
import configController from "../controllers/config.controller.js";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";

router.post(
  "/",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  configController.createConfig
);
router.get("/", configController.getAllConfigs);
router.get("/:key", configController.getConfigByKey);
router.put(
  "/:key",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  configController.updateConfig
);
router.delete(
  "/:key",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  configController.deleteConfig
);

export default router;
