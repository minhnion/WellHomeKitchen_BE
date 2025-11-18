import bcrypt from "bcryptjs";
import { StatusCodes } from "http-status-codes";
import User from "../models/user.model.js";
import {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} from "../utils/jwt.js";

import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

import { checkPasswordStrength, hashPassword } from "../utils/password.js";
import { verifyRecaptcha } from "../utils/recaptcha.js";

const register = async (req, res) => {
  const { email, password, userName, phoneNumber } = req.body;
  try {
    if (!email || !password || !userName) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Email, mật khẩu và tên người dùng là bắt buộc"
      );
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendErrorResponse(
        res,
        StatusCodes.CONFLICT,
        "Email đã được sử dụng"
      );
    }

    const isPasswordStrong = checkPasswordStrength(password, res);
    if (!isPasswordStrong) {
      return;
    }

    const hashedPassword = await hashPassword(password);

    const newUser = new User({
      email,
      userName,
      password: hashedPassword,
      phoneNumber,
    });
    await newUser.save();

    return sendCreatedResponse(res, "Đăng ký thành công", {
      newUser,
    });
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

const login = async (req, res) => {
  try {
    const { email, password, token } = req.body;

    if (!email || !password || !token) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Email, mật khẩu và token reCAPTCHA là bắt buộc"
      );
    }

    const isRecaptchaValid = await verifyRecaptcha(req, res);
    if (!isRecaptchaValid) {
      return;
    }
    const user = await User.findOne({ email });
    if (!user) {
      return sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "Email không tồn tại"
      );
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "Mật khẩu không chính xác"
      );
    }

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    user.refreshToken = refreshToken;
    await user.save();

    return sendSuccessResponse(res, StatusCodes.OK, "Đăng nhập thành công", {
      accessToken,
      refreshToken,
      user: {
        id: user._id,
        email: user.email,
        userName: user.userName,
        phoneNumber: user.phoneNumber,
        role: user.role,
      },
    });
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

const logout = async (req, res) => {
  try {
    req.user.refreshToken = null;
    await req.user.save();

    return sendSuccessResponse(res, StatusCodes.OK, "Đăng xuất thành công");
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

const refreshToken = async (req, res) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendErrorResponse(
      res,
      StatusCodes.UNAUTHORIZED,
      "Không có refresh token"
    );
  }

  const token = authHeader.split(" ")[1];

  // Verify token
  const decoded = verifyRefreshToken(token);
  if (!decoded) {
    return sendErrorResponse(
      res,
      StatusCodes.UNAUTHORIZED,
      "Token không hợp lệ hoặc đã hết hạn"
    );
  }
  try {
    const user = await User.findById(decoded.id);
    const newAccessToken = generateAccessToken(user);

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Làm mới token thành công",
      { accessToken: newAccessToken }
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

const forgotPassword = async (req, res) => {
  const { email, newPassword } = req.body;
  try {
    // Validate input
    if (!email || !newPassword) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Email và mật khẩu mới là bắt buộc"
      );
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        "Email không tồn tại"
      );
    }

    // Hash new password
    const hashedPassword = await hashPassword(newPassword);

    // Update password and clear refresh token
    user.password = hashedPassword;
    user.refreshToken = null; // Invalidate refresh token for security
    await user.save();

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Đặt lại mật khẩu thành công"
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

const updateProfile = async (req, res) => {
  const { userName, phoneNumber, currentPassword, password } = req.body;

  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        "Không tìm thấy người dùng"
      );
    }

    if (userName) user.userName = userName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;

    if (password) {
      if (!currentPassword) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Mật khẩu hiện tại là bắt buộc để cập nhật mật khẩu"
        );
      }

      const isMatch = await bcrypt.compare(currentPassword, user.password);
      if (!isMatch) {
        return sendErrorResponse(
          res,
          StatusCodes.UNAUTHORIZED,
          "Mật khẩu hiện tại không đúng"
        );
      }

      const isPasswordStrong = checkPasswordStrength(password, res);
      if (!isPasswordStrong) {
        return;
      }

      user.password = await hashPassword(password);
    }

    await user.save();

    const userResponse = {
      _id: user._id,
      email: user.email,
      userName: user.userName,
      phoneNumber: user.phoneNumber,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật thông tin thành công",
      { user: userResponse }
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
  register,
  login,
  logout,
  refreshToken,
  forgotPassword,
  updateProfile,
};
