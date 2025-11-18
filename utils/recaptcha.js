import { StatusCodes } from "http-status-codes";
import { sendErrorResponse } from "./responseUtils.js";
import axios from "axios";

export const verifyRecaptcha = async (req, res) => {
  const { token } = req.body;
  const secretKey = process.env.GOOGLE_RECAPTCHA_SECRET_KEY;

  if (!token) {
    return sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Không tìm thấy token reCAPTCHA"
    );
  }

  try {
    const response = await axios.post(
      `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${token}`
    );
    const { success } = response.data;
    if (!success) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Xác thực reCAPTCHA thất bại"
      );
    }
    return true;
  } catch (error) {
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xác thực reCAPTCHA",
      error
    );
  }
};
