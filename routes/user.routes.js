import express from "express";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";
import userController from "../controllers/user.controller.js";

const router = express.Router();

router.get("/", authenticate, authorizeRoles("admin"), userController.getUsers);

router.post(
  "/",
  authenticate,
  authorizeRoles("admin"),
  userController.createUser
);

router.put(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  userController.updateById
);

router.delete(
  "/:id",
  authenticate,
  authorizeRoles("admin"),
  userController.deleteUser
);

export default router;