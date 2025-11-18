import { StatusCodes } from "http-status-codes";
import {
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import FilterAttribute from "../models/filterAttribute.model.js";

const getAllFilterAttributes = async (req, res) => {
  try {
    const { categoryId } = req.query;

    const filter = categoryId ? { categoryId } : {};

    const filterAttributes = categoryId
      ? await FilterAttribute.findOne(filter)
      : await FilterAttribute.find();

    if (
      !filterAttributes ||
      (Array.isArray(filterAttributes) && filterAttributes.length === 0)
    ) {
      return sendNotFoundResponse(res, "Không tìm thấy thuộc tính lọc nào");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thuộc tính lọc thành công",
      filterAttributes
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thuộc tính lọc",
      error
    );
  }
};

const createFilterAttributes = async (req, res) => {
  try {
    const { categoryId, attributes } = req.body;
    const existingFilterAttribute = await FilterAttribute.findOne({
      categoryId,
    });
    if (existingFilterAttribute) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thuộc tính lọc đã tồn tại cho danh mục này"
      );
    }

    const newFilterAttribute = new FilterAttribute({ categoryId, attributes });
    await newFilterAttribute.save();

    sendCreatedResponse(
      res,
      "Tạo thuộc tính lọc thành công",
      newFilterAttribute
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo thuộc tính lọc",
      error
    );
  }
};

const updateFilterAttributes = async (req, res) => {
  try {
    const { categoryId } = req.params;
    const { attributes } = req.body;

    const updatedFilterAttribute = await FilterAttribute.findOneAndUpdate(
      { categoryId },
      { attributes },
      { new: true, runValidators: true }
    );

    if (!updatedFilterAttribute) {
      return sendNotFoundResponse(
        res,
        "Không tìm thấy thuộc tính lọc cho danh mục này"
      );
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật thuộc tính lọc thành công",
      updatedFilterAttribute
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật thuộc tính lọc",
      error
    );
  }
};

const deleteFilterAttributes = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const deletedFilterAttribute = await FilterAttribute.findOneAndDelete({
      categoryId,
    });
    if (!deletedFilterAttribute) {
      return sendNotFoundResponse(
        res,
        "Không tìm thấy thuộc tính lọc cho danh mục này"
      );
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Xóa thuộc tính lọc thành công",
      deletedFilterAttribute
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa thuộc tính lọc",
      error
    );
  }
};

export default {
  getAllFilterAttributes,
  createFilterAttributes,
  updateFilterAttributes,
  deleteFilterAttributes,
};
