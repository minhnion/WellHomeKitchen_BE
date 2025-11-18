import Config from "../models/config.model.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

const createConfig = async (req, res) => {
  try {
    const newConfig = new Config(req.body);
    const savedConfig = await newConfig.save();
    sendCreatedResponse(res, "Tạo cấu hình thành công", savedConfig);
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo cấu hình",
      error
    );
  }
};

const getAllConfigs = async (req, res) => {
  try {
    const configs = await Config.find({ isView: true }).sort({ type: 1 });
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách cấu hình thành công",
      configs
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách cấu hình",
      error
    );
  }
};

const getConfigByKey = async (req, res) => {
  try {
    const config = await Config.findOne({ key: req.params.key, isView: true });
    if (!config) {
      return sendNotFoundResponse(res, "Không tìm thấy cấu hình");
    }
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin cấu hình thành công",
      config
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin cấu hình",
      error
    );
  }
};

const updateConfig = async (req, res) => {
  try {
    const updatedConfig = await Config.findOneAndUpdate(
      { key: req.params.key, isView: true },
      req.body,
      { new: true }
    );
    if (!updatedConfig) {
      return sendNotFoundResponse(res, "Không tìm thấy cấu hình");
    }
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật cấu hình thành công",
      updatedConfig
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật cấu hình",
      error
    );
  }
};

const deleteConfig = async (req, res) => {
  try {
    const deletedConfig = await Config.findOneAndDelete({
      key: req.params.key,
    });
    if (!deletedConfig) {
      return sendNotFoundResponse(res, "Không tìm thấy cấu hình");
    }
    sendSuccessResponse(res, StatusCodes.OK, "Xóa cấu hình thành công");
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa cấu hình",
      error
    );
  }
};

export default {
  createConfig,
  getAllConfigs,
  getConfigByKey,
  updateConfig,
  deleteConfig,
};
