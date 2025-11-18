import SubCategory from "../models/subCategory.model.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendNotFoundResponse,
  sendCreatedResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import { createSlug } from "../utils/helpers.js";
import Product from "../models/product.model.js";

const getAllSubCategories = async (req, res) => {
  try {
    const { categoryId, page, limit, keyword } = req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;
    const filter = {};

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    if (keyword && keyword.trim() !== "") {
      filter.slug = {
        $regex: createSlug(keyword),
        $options: "i",
      };
    }

    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : 0;

    const subcategoriesQuery = SubCategory.find(filter)
      .populate("categoryId", "name slug")
      .sort({ createdAt: -1 });

    if (pageNum && limitNum) {
      subcategoriesQuery.skip(skip).limit(limitNum);
    }

    const [subcategories, totalSubcategories] = await Promise.all([
      subcategoriesQuery.exec(),
      SubCategory.countDocuments(filter),
    ]);

    if (!subcategories?.length) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục con nào");
    }

    const subcategoriesWithCount = await Promise.all(
      subcategories.map(async (sub) => ({
        ...sub.toObject(),
        productCount: await Product.countDocuments({
          subCategory: sub._id,
          isDelete: false,
        }),
      }))
    );

    const paginationDetails = {
      currentPage: pageNum || 1,
      totalPages: limitNum ? Math.ceil(totalSubcategories / limitNum) : 1,
      totalSubcategories,
      limit: limitNum || totalSubcategories,
    };

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách danh mục con thành công",
      subcategoriesWithCount,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách danh mục con",
      error
    );
  }
};

const createSubCategory = async (req, res) => {
  try {
    const { name, categoryId, imageUrl } = req.body;

    if (!name) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tên danh mục con là bắt buộc"
      );
    }

    if (!categoryId) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "ID danh mục cha là bắt buộc"
      );
    }

    const slug = createSlug(name);

    const existingSubCategory = await SubCategory.findOne({
      slug: slug,
    });

    if (existingSubCategory) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Danh mục con đã tồn tại"
      );
    }

    const newSubCategory = new SubCategory({
      name,
      slug,
      categoryId,
      imageUrl,
    });

    await newSubCategory.save();

    sendCreatedResponse(res, "Tạo danh mục con thành công", newSubCategory);
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo danh mục con",
      error
    );
  }
};

const updateSubCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, categoryId, imageUrl } = req.body;

    // Tự động tạo slug mới nếu có trường name
    let slug;
    if (name) {
      slug = createSlug(name);
      const existingSubCategory = await SubCategory.findOne({
        slug: slug,
        _id: { $ne: id },
      });
      if (existingSubCategory) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Danh mục con đã tồn tại"
        );
      }
    }

    const updatedSubCategory = await SubCategory.findByIdAndUpdate(
      id,
      { name, slug, categoryId, imageUrl },
      { new: true, runValidators: true }
    );

    if (!updatedSubCategory) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục con");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật danh mục con thành công",
      updatedSubCategory
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật danh mục con",
      error
    );
  }
};

const deleteSubCategory = async (req, res) => {
  try {
    const { id } = req.params;

    // Kiểm tra xem có sản phẩm nào đang sử dụng danh mục con này không
    const productCount = await Product.countDocuments({
      subCategory: id,
      isDelete: false,
    });

    if (productCount > 0) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể xóa danh mục con đã được liên kết với sản phẩm"
      );
    }

    const deletedSubCategory = await SubCategory.findByIdAndDelete(id);

    if (!deletedSubCategory) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục con");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Xóa danh mục con thành công",
      deletedSubCategory
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa danh mục con",
      error
    );
  }
};

export default {
  getAllSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
};
