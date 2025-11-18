import PostCategory from "../models/postCategory.model.js";
import Post from "../models/post.model.js";
import { createSlug } from "../utils/helpers.js";
import { StatusCodes } from "http-status-codes";
import { checkCircularReference } from "../utils/postCategoryTree.js";

import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

const createPostCategory = async (req, res) => {
  try {
    const { name, parent } = req.body;
    if (!name) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tên danh mục là bắt buộc"
      );
    }

    const slug = createSlug(name);
    const existingPostCategory = await PostCategory.findOne({ slug });
    if (existingPostCategory) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Danh mục bài viết đã tồn tại"
      );
    }

    if (parent) {
      const parentCategory = await PostCategory.findById(parent);
      if (!parentCategory) {
        return sendNotFoundResponse(res, "Không tìm thấy danh mục cha");
      }
    }

    const newCategory = new PostCategory({
      name,
      slug: createSlug(name),
      parent: parent || null,
    });
    const savedCategory = await newCategory.save();
    sendCreatedResponse(res, "Tạo danh mục thành công", savedCategory);
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

const getPostCategories = async (req, res) => {
  try {
    const { page, limit, isRoot, keyword } = req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;

    const filter = {};
    if (isRoot === "true") {
      filter.parent = null;
    }
    if (keyword && keyword.trim() !== "") {
      filter.slug = {
        $regex: createSlug(keyword),
        $options: "i",
      };
    }

    const categoryQuery = PostCategory.find(filter)
      .populate("parent", "name slug")
      .sort({ createdAt: -1 });
    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limitNum;
      categoryQuery.skip(skip).limit(limitNum);
    }

    const [categories, totalCategories] = await Promise.all([
      categoryQuery.exec(),
      PostCategory.countDocuments(filter),
    ]);

    if (!categories?.length) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục nào");
    }

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
      categories,
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

const getPostCategoryBySlug = async (req, res) => {
  try {
    const category = await PostCategory.findOne({
      slug: req.params.slug,
    }).populate("parent", "name slug");
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

const updatePostCategory = async (req, res) => {
  try {
    const { name, parent } = req.body;
    const updateData = { ...req.body };

    const currentCategory = await PostCategory.findOne({ slug: req.params.slug });
    if (!currentCategory) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục");
    }

    if (name) {
      const slug = createSlug(name);
      const existingPostCategory = await PostCategory.findOne({
        slug,
        _id: { $ne: currentCategory._id },
      });
      if (existingPostCategory) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Danh mục bài viết đã tồn tại"
        );
      }
      updateData.slug = slug;
    }

    if (parent) {
      const parentCategory = await PostCategory.findById(parent);
      if (!parentCategory) {
        return sendNotFoundResponse(res, "Không tìm thấy danh mục cha");
      }

      const hasCircularReference = await checkCircularReference(
        currentCategory._id.toString(),
        parent
      );
      if (hasCircularReference) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Không thể cập nhật vì tạo vòng lặp trong danh mục"
        );
      }
    }

    const updatedCategory = await PostCategory.findOneAndUpdate(
      { slug: req.params.slug },
      updateData,
      { new: true }
    ).populate("parent", "name slug");

    if (!updatedCategory) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật danh mục bài viết thành công",
      updatedCategory
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật danh mục bài viết",
      error
    );
  }
};

const deletePostCategory = async (req, res) => {
  try {
    const category = await PostCategory.findOne({ slug: req.params.slug });
    if (!category) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục");
    }

    const subCategories = await PostCategory.findOne({ parent: category._id });
    if (subCategories) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể xóa danh mục có danh mục con"
      );
    }

    const posts = await Post.findOne({ postCategory: category._id });
    if (posts) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể xóa danh mục đã được liên kết với bài viết"
      );
    }

    await PostCategory.deleteOne({ slug: req.params.slug });
    sendSuccessResponse(res, StatusCodes.OK, "Xóa danh mục thành công");
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
  createPostCategory,
  getPostCategories,
  getPostCategoryBySlug,
  updatePostCategory,
  deletePostCategory,
};
