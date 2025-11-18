import { StatusCodes } from "http-status-codes";
import {
  sendCreatedResponse,
  sendErrorResponse,
  sendSuccessResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import User from "../models/user.model.js";
import { hashPassword } from "../utils/password.js";

const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const role = req.query.role;
    const keyword = req.query.keyword;

    const query = {};
    if (role) {
      const validRoles = [
        "user",
        "content-creator",
        "product-manager",
        "admin",
      ];
      if (!validRoles.includes(role)) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Vai trò không hợp lệ"
        );
      }
      query.role = role;
    }

    if (keyword) {
      query.$or = [
        { userName: { $regex: keyword, $options: "i" } },
        { email: { $regex: keyword, $options: "i" } },
        { phoneNumber: { $regex: keyword, $options: "i" } },
      ];
    }

    const users = await User.find(query)
      .select("-password -refreshToken")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const totalUsers = await User.countDocuments(query);
    const totalPages = Math.ceil(totalUsers / limit);

    const paginationDetails = {
      currentPage: page,
      totalPages: totalPages,
      totalUsers: totalUsers,
      limit: limit,
    };
    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách người dùng thành công",
      users,
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

const createUser = async (req, res) => {
  const { email, password, userName, phoneNumber, role } = req.body;
  try {
    if (!email || !password || !userName) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Email, mật khẩu và tên người dùng là bắt buộc"
      );
    }

    // Validate role
    const validRoles = ["user", "content-creator", "product-manager", "admin"];
    if (role && !validRoles.includes(role)) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Vai trò không hợp lệ"
      );
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return sendErrorResponse(
        res,
        StatusCodes.CONFLICT,
        "Email đã được sử dụng"
      );
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create new user
    const newUser = new User({
      email,
      userName,
      password: hashedPassword,
      phoneNumber,
      role: role || "user",
    });
    await newUser.save();
    return sendCreatedResponse(res, "Tạo người dùng thành công", {
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

// Update a user by ID
const updateById = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  try {
    // Find user by ID
    const user = await User.findById(id);
    if (!user) {
      return sendNotFoundResponse(res, "Không tìm thấy người dùng");
    }

    // Validate role if provided
    if (role !== undefined) {
      const validRoles = [
        "user",
        "content-creator",
        "product-manager",
        "admin",
      ];
      if (!validRoles.includes(role)) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Vai trò không hợp lệ"
        );
      }
      user.role = role;
    } else {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Vai trò là bắt buộc để cập nhật"
      );
    }

    await user.save();

    // Exclude sensitive fields from response
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
      "Cập nhật vai trò người dùng thành công",
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

// Delete a user by ID
const deleteUser = async (req, res) => {
  const { id } = req.params;
  try {
    // Find and delete user by ID
    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return sendNotFoundResponse(res, "Không tìm thấy người dùng");
    }

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Xóa người dùng thành công"
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
  getUsers,
  createUser,
  updateById,
  deleteUser,
};
