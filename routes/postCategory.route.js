import express from "express";
import {
  authenticate,
  authorizeRoles,
} from "../middlewares/auth.middleware.js";
import postCategoryController from "../controllers/postCategory.controller.js";

const router = express.Router();

router.post(
  "/",
  authenticate,
  authorizeRoles("content-creator", "admin"),
  postCategoryController.createPostCategory
);
router.get("/", postCategoryController.getPostCategories);
router.get("/:slug", postCategoryController.getPostCategoryBySlug);
router.put(
  "/:slug",
  authenticate,
  authorizeRoles("content-creator", "admin"),
  postCategoryController.updatePostCategory
);
router.delete(
  "/:slug",
  authenticate,
  authorizeRoles("content-creator", "admin"),
  postCategoryController.deletePostCategory
);

export default router;
