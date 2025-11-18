import { StatusCodes } from "http-status-codes";
import Notification from "../models/notification.model.js";
import User from "../models/user.model.js";
import logError from "./loggerError.js";

export const sendNotification = async ({
  type,
  message,
  roles = ["admin"],
}) => {
  try {
    const recipients = await User.find({ role: { $in: roles } }).select("_id");

    const notificationPromises = recipients.map((recipient) =>
      Notification.create({
        recipientId: recipient._id,
        message,
        type,
      })
    );

    await Promise.all(notificationPromises);
    return { success: true, message: "Thông báo đã được gửi" };
  } catch (error) {
    logError(error, { method: "sendNotification" });
    return {
      success: false,
      error: "Lỗi khi gửi thông báo",
      status: StatusCodes.INTERNAL_SERVER_ERROR,
    };
  }
};
