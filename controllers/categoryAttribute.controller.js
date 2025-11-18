import { StatusCodes } from "http-status-codes";
import {
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import CategoryAttribute from "../models/categoryAttribute.model.js";

const getAllCategoryAttributes = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const filter = categoryId ? { categoryId } : {};

    const filterCategoryAttributes = categoryId
      ? await CategoryAttribute.findOne(filter)
      : await CategoryAttribute.find();

    if (
      !filterCategoryAttributes ||
      (Array.isArray(filterCategoryAttributes) &&
        filterCategoryAttributes.length === 0)
    ) {
      return sendNotFoundResponse(
        res,
        "Không tìm thấy thuộc tính danh mục nào"
      );
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách thuộc tính danh mục thành công",
      filterCategoryAttributes
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách thuộc tính danh mục",
      error
    );
  }
};

const createCategoryAttributes = async (req, res) => {
  try {
    const { categoryId, attributes } = req.body;

    if (!categoryId || !attributes) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "ID danh mục và thuộc tính là bắt buộc"
      );
    }

    const existingCategoryAttribute = await CategoryAttribute.findOne({
      categoryId,
    });

    if (existingCategoryAttribute) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thuộc tính danh mục đã tồn tại cho danh mục này"
      );
    }

    const newCategoryAttribute = new CategoryAttribute({
      categoryId,
      attributes,
    });
    await newCategoryAttribute.save();

    sendCreatedResponse(
      res,
      "Tạo thuộc tính danh mục thành công",
      newCategoryAttribute
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo thuộc tính danh mục",
      error
    );
  }
};

const updateCategoryAttributes = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { attributes } = req.body;

    if (!attributes) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thuộc tính là bắt buộc để cập nhật"
      );
    }

    const updatedCategoryAttribute = await CategoryAttribute.findOneAndUpdate(
      { categoryId },
      { attributes },
      { new: true, runValidators: true }
    );

    if (!updatedCategoryAttribute) {
      return sendNotFoundResponse(
        res,
        "Không tìm thấy thuộc tính danh mục cho danh mục này"
      );
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật thuộc tính danh mục thành công",
      updatedCategoryAttribute
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật thuộc tính danh mục",
      error
    );
  }
};

const deleteCategoryAttributes = async (req, res) => {
  try {
    const { categoryId } = req.params;

    if (!categoryId) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "ID danh mục là bắt buộc"
      );
    }

    const deletedCategoryAttribute = await CategoryAttribute.findOneAndDelete({
      categoryId,
    });

    if (!deletedCategoryAttribute) {
      return sendNotFoundResponse(
        res,
        "Không tìm thấy thuộc tính danh mục cho danh mục này"
      );
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Xóa thuộc tính danh mục thành công",
      deletedCategoryAttribute
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa thuộc tính danh mục",
      error
    );
  }
};

export default {
  getAllCategoryAttributes,
  createCategoryAttributes,
  updateCategoryAttributes,
  deleteCategoryAttributes,
};
