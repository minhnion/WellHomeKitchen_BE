import express from "express"
import { authenticate, authorizeAdmin } from "../middlewares/auth.middleware.js";
import bannerController from "../controllers/banner.controller.js";

const router = express.Router();

router.get("/", bannerController.getBanners);
router.post("/", authenticate, authorizeAdmin, bannerController.createBanner);
router.put("/:id", authenticate, authorizeAdmin, bannerController.updateBanner);
router.delete("/:id", authenticate, authorizeAdmin, bannerController.deleteBanner);

export default router;