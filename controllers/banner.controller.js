import { StatusCodes } from "http-status-codes";
import {
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import Banner from "../models/banner.model.js";
import { createSlug } from "../utils/helpers.js";

const getBanners = async (req, res) => {
  try {
    const { page, limit, isShow, type, keyword } = req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;

    const filter = {};
    if (isShow) filter.isShow = isShow;
    if (type) filter.type = type;
    if (keyword && keyword.trim() !== "") {
      filter.slug = {
        $regex: createSlug(keyword),
        $options: "i",
      };
    }
    const bannerQuery = Banner.find(filter).sort({ priority: 1 });
    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      bannerQuery.skip(skip).limit(limitNum);
    }
    const [banners, totalBanners] = await Promise.all([
      bannerQuery.exec(),
      Banner.countDocuments(filter),
    ]);

    if (!banners?.length) {
      return sendNotFoundResponse(res, "Không tìm thấy banner nào");
    }
    const paginationDetails = {
      currentPage: pageNum || 1,
      totalPages: limitNum ? Math.ceil(totalBanners / limitNum) : 1,
      totalBanners,
      limit: limitNum || totalBanners,
    };
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách banner thành công",
      banners,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách banner",
      error
    );
  }
};

const createBanner = async (req, res) => {
  try {
    const newData = req.body;

    // Validate required fields
    if (!newData.title) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tiêu đề banner là bắt buộc"
      );
    }

    const slug = createSlug(newData.title);
    newData.slug = slug;
    const existingBanner = await Banner.findOne({ slug: newData.slug });

    if (existingBanner) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Banner với tiêu đề này đã tồn tại"
      );
    }

    const createdBanner = await Banner.create(newData);
    sendCreatedResponse(res, "Tạo banner thành công", createdBanner);
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo banner",
      error
    );
  }
};

const updateBanner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    const updateData = req.body;

    if (updateData.title) {
      const newSlug = createSlug(updateData.title);

      // Check if another banner with this slug exists
      const existingBanner = await Banner.findOne({
        slug: newSlug,
        _id: { $ne: bannerId },
      });

      if (existingBanner) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Banner với tiêu đề này đã tồn tại"
        );
      }

      updateData.slug = newSlug;
    }

    const updatedBanner = await Banner.findByIdAndUpdate(bannerId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedBanner) {
      return sendNotFoundResponse(res, "Không tìm thấy banner");
    }

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật banner thành công",
      updatedBanner
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật banner",
      error
    );
  }
};

const deleteBanner = async (req, res) => {
  try {
    const bannerId = req.params.id;
    const deletedBanner = await Banner.findByIdAndDelete(bannerId);

    if (!deletedBanner) {
      return sendNotFoundResponse(res, "Không tìm thấy banner");
    }

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      `Đã xóa banner '${deletedBanner.title || deletedBanner.name}' thành công`
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa banner",
      error
    );
  }
};

export default {
  getBanners,
  createBanner,
  updateBanner,
  deleteBanner,
};
