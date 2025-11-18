import Category from "../models/category.model.js";
import { StatusCodes } from "http-status-codes";
import { createSlug, deletedName } from "../utils/helpers.js";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import Product from "../models/product.model.js";

const getAllCategories = async (req, res) => {
  try {
    const { page, limit, keyword } = req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;

    const filter = { isDeleted: { $ne: true } };
    if (keyword && keyword.trim() !== "") {
      filter.slug = {
        $regex: createSlug(keyword),
        $options: "i",
      };
    }
    const categoriesQuery = Category.find(filter)
      .populate({
        path: "brands",
        select: "name imageUrl _id slug",
        match: { isDeleted: false },
      })
      .populate({
        path: "subcategories",
        select: "name imageUrl _id slug",
      })
      .sort({ priority: 1 });

    if (pageNum && limitNum) {
      categoriesQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [categories, totalCategories] = await Promise.all([
      categoriesQuery.exec(),
      Category.countDocuments(filter),
    ]);

    if (!categories?.length) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục nào");
    }

    const categoriesWithCount = await Promise.all(
      categories.map(async (cat) => ({
        ...cat.toObject(),
        productCount: await Product.countDocuments({
          category: cat._id,
          isDelete: false,
        }),
      }))
    );

    const paginationDetails = {
      currentPage: pageNum || 1,
      totalPages: limitNum ? Math.ceil(totalCategories / limitNum) : 1,
      totalCategories,
      limit: limitNum || totalCategories,
    };

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách danh mục thành công",
      categoriesWithCount,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách danh mục",
      error
    );
  }
};

const getCategoryById = async (req, res) => {
  try {
    const category = await Category.findOne({
      _id: req.params.id,
      isDeleted: { $ne: true },
    }).populate({
      path: "brands",
      select: "name imageUrl _id",
      match: { isDeleted: false },
    });
    if (!category) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục");
    }
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin danh mục thành công",
      category
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin danh mục",
      error
    );
  }
};

const getCategoryBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;
    const category = await Category.findOne({ slug, isDeleted: false });
    if (!category) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục");
    }
    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin danh mục thành công",
      category
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin danh mục theo slug",
      error
    );
  }
};

const createCategory = async (req, res) => {
  try {
    const newData = req.body;
    const slug = createSlug(newData.name);
    newData.slug = slug;
    const newCategory = new Category({ ...newData, isDeleted: false });
    const existingCategory = await Category.findOne({
      slug: newData.slug,
      isDeleted: false,
    });
    if (existingCategory) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Danh mục đã tồn tại"
      );
    }
    await newCategory.save();
    sendCreatedResponse(res, "Tạo danh mục thành công", newCategory);
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo danh mục",
      error
    );
  }
};

const updateCategory = async (req, res) => {
  try {
    const updateData = req.body;
    const categoryId = req.params.id;

    if (updateData.name) {
      updateData.slug = createSlug(updateData.name);
      const existingCategory = await Category.findOne({
        slug: updateData.slug,
        isDeleted: false,
        _id: { $ne: categoryId },
      });
      if (existingCategory) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Danh mục đã tồn tại"
        );
      }
    }

    const updatedCategory = await Category.findOneAndUpdate(
      { _id: categoryId, isDeleted: { $ne: true } },
      updateData,
      {
        new: true,
        runValidators: true,
      }
    );
    if (!updatedCategory) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục");
    }
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật danh mục thành công",
      updatedCategory
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật danh mục",
      error
    );
  }
};

const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category || category.isDeleted) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục");
    }
    const deletedCategory = await Category.findOneAndUpdate(
      { _id: req.params.id },
      {
        isDeleted: true,
        name: deletedName(category.name),
        slug: deletedName(category.slug),
      },
      { new: true }
    );
    if (!deletedCategory) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục");
    }
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Xóa danh mục thành công",
      deletedCategory
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa danh mục",
      error
    );
  }
};

export default {
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
