import { StatusCodes } from "http-status-codes";
import logError from "../utils/loggerError.js";
import { sendErrorResponse, sendSuccessResponse } from "../utils/responseUtils.js";
import Notification from "../models/notification.model.js";

const getNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const type = req.query.type;
    const isRead = req.query.isRead ? req.query.isRead === "true" : undefined;

    const query = { recipientId: req.user._id };
    if (type) {
      const validTypes = ["ORDER", "PRODUCT", "POST", "COMMENT", "REVIEW"];
      if (!validTypes.includes(type)) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Loại thông báo không hợp lệ"
        );
      }
      query.type = type;
    }
    if (isRead) {
      query.isRead = isRead;
    }
    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalNotifications = await Notification.countDocuments(query);
    const totalPages = Math.ceil(totalNotifications / limit);
    const paginationDetails = {
      currentPage: page,
      totalPages: totalPages,
      totalNotifications: totalNotifications,
      limit: limit,
    };
    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách thông báo thành công",
      notifications,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi hệ thống",
      error
    );
  }
};

const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findOne({
      _id: id,
      recipientId: req.user._id,
    });
    if (!notification) {
      return sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        "Không tìm thấy thông báo"
      );
    }
    notification.isRead = true;
    await notification.save();
    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Đã đánh dấu thông báo là đã đọc",
      { notification }
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi hệ thống",
      error
    );
  }
};

const markAllNotificationsAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true }
    );
     return sendSuccessResponse(
      res,
      StatusCodes.OK,
      'Đã đánh dấu tất cả thông báo là đã đọc'
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi hệ thống",
      error
    );
  }
};

export default {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
