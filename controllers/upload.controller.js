import { StatusCodes } from "http-status-codes";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import File from "../models/file.model.js";
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không có file được tải lên"
      );
    }

    const file = new File({
      name: req.body.name,
      originalName: req.file.originalname,
      path: req.uploadPath + "/" + req.file.filename,
    });

    await file.save();

    sendSuccessResponse(res, StatusCodes.OK, "Tải file lên thành công", {
      url: file.path,
    });
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tải file lên",
      error
    );
  }
};

const getListFile = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filters = {};
    const keyword = (req.query.keyword || "").trim();
    if (keyword) {
      filters.$text = { $search: `"${keyword}"` };
    }

    const totalFiles = await File.countDocuments(filters);

    const files = await File.find(filters)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const totalPages = Math.ceil(totalFiles / limit);

    const paginationDetails = {
      currentPage: page,
      limit,
      totalPages,
      totalFiles,
    };
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách file thành công",
      files,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách file",
      error
    );
  }
};

const deleteFile = async (req, res) => {
  try {
    const { filename } = req.params;

    const file = await File.findOne({ path: { $regex: `${filename}$` } });
    if (!file) {
      return sendNotFoundResponse(
        res,
        "Không tìm thấy file trong cơ sở dữ liệu"
      );
    }

    const filePath = path.join(__dirname, "../", file.path.replace(/^\//, ""));

    try {
      await fs.access(filePath);
    } catch (error) {
      logError(error, req);
      return sendNotFoundResponse(res, "Không tìm thấy file trên hệ thống");
    }

    await fs.unlink(filePath);

    await File.findOneAndDelete({ path: file.path });

    sendSuccessResponse(res, StatusCodes.OK, "Xóa file thành công");
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa file",
      error.message
    );
  }
};

export default {
  uploadFile,
  getListFile,
  deleteFile,
};
