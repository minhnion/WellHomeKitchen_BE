import express from "express";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";
import postController from "../controllers/post.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("content-creator", "admin"),
  postController.createPost
);
router.get(
  "/overview-stats",
  authenticate,
  authorizeRoles("content-creator", "product-manager", "admin"),
  postController.getPostStatistics
);
router.get("/", postController.getPosts);
router.get("/:slug", postController.getPostBySlug);
router.put(
  "/:slug",
  authenticate,
  authorizeRoles("content-creator", "admin"),
  postController.updatePost
);
router.delete(
  "/:slug",
  authenticate,
  authorizeRoles("content-creator", "admin"),
  postController.deletePost
);

export default router;
