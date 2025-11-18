import Voucher from "../models/voucher.model.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

const createVoucher = async (req, res) => {
  try {
    const newVoucher = new Voucher(req.body);

    if (new Date(newVoucher.endDate) <= new Date(newVoucher.startDate)) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Ngày kết thúc phải sau ngày bắt đầu"
      );
    }

    if (
      newVoucher.discountType === "percentage" &&
      newVoucher.discountValue > 100
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Phần trăm giảm giá không thể vượt quá 100%"
      );
    }

    const existingVoucher = await Voucher.findOne({ code: newVoucher.code });
    if (existingVoucher) {
      return sendErrorResponse(
        res,
        StatusCodes.CONFLICT,
        "Mã voucher đã tồn tại"
      );
    }

    const savedVoucher = await newVoucher.save();
    sendCreatedResponse(res, "Tạo voucher thành công", savedVoucher);
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo voucher",
      error
    );
  }
};

const getAllVouchers = async (req, res) => {
  try {
    const { active, page, limit, keyword } = req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;
    const skip = pageNum && limitNum ? (pageNum - 1) * limitNum : 0;

    let query = {};

    if (active === "true") {
      const now = new Date();
      query = {
        startDate: { $lte: now },
        endDate: { $gte: now },
      };
    }

    if (keyword && keyword.trim() !== "") {
      query.code = {
        $regex: keyword,
        $options: "i",
      };
    }

    const vouchersQuery = Voucher.find(query)
      .populate("excludedProducts", "name")
      .sort({ createdAt: -1 });

    if (pageNum && limitNum) {
      vouchersQuery.skip(skip).limit(limitNum);
    }

    const [vouchers, totalVouchers] = await Promise.all([
      vouchersQuery.exec(),
      Voucher.countDocuments(query),
    ]);

    if (!vouchers?.length) {
      return sendNotFoundResponse(res, "Không tìm thấy voucher nào");
    }

    const paginationDetails = {
      currentPage: pageNum || 1,
      totalPages: limitNum ? Math.ceil(totalVouchers / limitNum) : 1,
      totalVouchers,
      limit: limitNum || totalVouchers,
    };
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách voucher thành công",
      vouchers,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách voucher",
      error
    );
  }
};

const getVoucherByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const voucher = await Voucher.findOne({ code });

    if (!voucher) {
      return sendNotFoundResponse(res, "Không tìm thấy voucher");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin voucher thành công",
      voucher
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin voucher",
      error
    );
  }
};

const updateVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Validate dates if updating them
    if (updateData.startDate && updateData.endDate) {
      if (new Date(updateData.endDate) <= new Date(updateData.startDate)) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Ngày kết thúc phải sau ngày bắt đầu"
        );
      }
    } else if (updateData.startDate) {
      const voucher = await Voucher.findById(id);
      if (new Date(voucher.endDate) <= new Date(updateData.startDate)) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Ngày kết thúc phải sau ngày bắt đầu"
        );
      }
    } else if (updateData.endDate) {
      const voucher = await Voucher.findById(id);
      if (new Date(updateData.endDate) <= new Date(voucher.startDate)) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Ngày kết thúc phải sau ngày bắt đầu"
        );
      }
    }

    if (
      updateData.discountType === "percentage" &&
      updateData.discountValue > 100
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Phần trăm giảm giá không thể vượt quá 100%"
      );
    }

    if (updateData.code) {
      const existingVoucher = await Voucher.findOne({
        code: updateData.code,
        _id: { $ne: id },
      });

      if (existingVoucher) {
        return sendErrorResponse(
          res,
          StatusCodes.CONFLICT,
          "Mã voucher đã tồn tại"
        );
      }
    }

    const updatedVoucher = await Voucher.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedVoucher) {
      return sendNotFoundResponse(res, "Không tìm thấy voucher");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật voucher thành công",
      updatedVoucher
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật voucher",
      error
    );
  }
};

const deleteVoucher = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedVoucher = await Voucher.findByIdAndDelete(id);

    if (!deletedVoucher) {
      return sendNotFoundResponse(res, "Không tìm thấy voucher");
    }

    sendSuccessResponse(res, StatusCodes.OK, "Xóa voucher thành công");
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa voucher",
      error
    );
  }
};

const validateVoucher = async (req, res) => {
  try {
    const { code, cartTotal, productIds } = req.body;

    if (!code) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Mã voucher là bắt buộc"
      );
    }

    const voucher = await Voucher.findOne({ code });

    if (!voucher) {
      return sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        "Mã voucher không hợp lệ"
      );
    }

    // Check if voucher is active
    const now = new Date();
    if (now < voucher.startDate || now > voucher.endDate) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Voucher chưa có hiệu lực hoặc đã hết hạn"
      );
    }

    // Check minimum purchase amount
    if (voucher.minPurchaseAmount && cartTotal < voucher.minPurchaseAmount) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        `Cần mua tối thiểu ${voucher.minPurchaseAmount.toLocaleString(
          "vi-VN"
        )} VNĐ để sử dụng voucher này`
      );
    }

    // Check for excluded products
    if (
      voucher.excludedProducts &&
      voucher.excludedProducts.length > 0 &&
      productIds
    ) {
      const excludedProductsInCart = productIds.filter((id) =>
        voucher.excludedProducts.some(
          (excludedId) => excludedId.toString() === id
        )
      );

      if (excludedProductsInCart.length > 0) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Voucher không thể áp dụng cho một số sản phẩm trong giỏ hàng của bạn"
        );
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (voucher.discountType === "percentage") {
      discountAmount = (cartTotal * voucher.discountValue) / 100;
      if (
        voucher.maxDiscountAmount &&
        discountAmount > voucher.maxDiscountAmount
      ) {
        discountAmount = voucher.maxDiscountAmount;
      }
    } else {
      discountAmount = voucher.discountValue;
      if (discountAmount > cartTotal) {
        discountAmount = cartTotal;
      }
    }

    sendSuccessResponse(res, StatusCodes.OK, "Voucher hợp lệ", {
      voucher,
      discountAmount,
      finalAmount: cartTotal - discountAmount,
    });
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xác thực voucher",
      error
    );
  }
};

export default {
  createVoucher,
  getAllVouchers,
  getVoucherByCode,
  updateVoucher,
  deleteVoucher,
  validateVoucher,
};
