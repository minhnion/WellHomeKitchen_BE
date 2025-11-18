import express from "express";
import { authenticate } from "../middlewares/auth.middleware.js";

import {
  createComment,
  getCommentsByProduct,
  getCommentById,
  updateCommentByAuthor,
  updateCommentByAnonymous,
  deleteComment,
} from "../controllers/comment.controller.js";

const router = express.Router();

// Public routes
router.post("/", createComment);
router.get("/product/:productId", getCommentsByProduct);
router.get("/:id", getCommentById);
router.put("/anonymous/:id", updateCommentByAnonymous);

// Protected routes (require authentication)
router.put("/author/:id", authenticate, updateCommentByAuthor);
router.delete("/:id", authenticate, deleteComment);

export default router;
