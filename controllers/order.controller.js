import Order from "../models/order.model.js";
import Product from "../models/product.model.js";
import Voucher from "../models/voucher.model.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

import { generateOrderCode } from "../utils/helpers.js";
import { sendNotification } from "../utils/notificationUtils.js";

/**
 * Create a new order
 */
const createOrder = async (req, res) => {
  try {
    const {
      userId,
      anonymousId,
      products,
      userName,
      userEmail,
      userPhone,
      district,
      address,
      note,
      paymentMethod,
      voucherCode,
      orderCode,
    } = req.body;

    // Validate required fields
    if (!products || products.length === 0) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Sản phẩm là bắt buộc"
      );
    }

    if (!userName || !userPhone || !district || !address) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thông tin giao hàng chưa đầy đủ"
      );
    }

    // Calculate order total and validate product availability
    let totalAmount = 0;
    const orderProducts = [];

    for (const item of products) {
      const product = await Product.findById(item.productId);
      if (!product || product.isDelete) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          `Sản phẩm ${item.productId} không tìm thấy hoặc không khả dụng`
        );
      }

      const price = product.price * (1 - product.discountPercent / 100);
      totalAmount += price * item.quantity;
      orderProducts.push({
        productId: item.productId,
        quantity: item.quantity,
      });
    }

    // Apply voucher if provided
    let voucher = null;
    if (voucherCode) {
      voucher = await Voucher.findOne({ code: voucherCode });
      if (!voucher) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Mã voucher không hợp lệ"
        );
      }

      // Check if voucher is valid
      const now = new Date();
      if (now < voucher.startDate || now > voucher.endDate) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Voucher chưa có hiệu lực hoặc đã hết hạn"
        );
      }

      // Check minimum purchase
      if (
        voucher.minPurchaseAmount &&
        totalAmount < voucher.minPurchaseAmount
      ) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          `Cần mua tối thiểu ${voucher.minPurchaseAmount.toLocaleString(
            "vi-VN"
          )} VNĐ để sử dụng voucher này`
        );
      }

      // Calculate discount
      let discountAmount = 0;
      if (voucher.discountType === "percentage") {
        discountAmount = (totalAmount * voucher.discountValue) / 100;
        if (
          voucher.maxDiscountAmount &&
          discountAmount > voucher.maxDiscountAmount
        ) {
          discountAmount = voucher.maxDiscountAmount;
        }
      } else {
        discountAmount = voucher.discountValue;
        if (discountAmount > totalAmount) {
          discountAmount = totalAmount;
        }
      }

      totalAmount -= discountAmount;
    }

    // Create new order
    const newOrder = new Order({
      userId,
      anonymousId: anonymousId || null,
      products: orderProducts,
      totalAmount,
      userName,
      userEmail,
      userPhone,
      district,
      address,
      note,
      paymentMethod,
      voucher: voucher ? voucher._id : null,
      orderCode,
    });

    const savedOrder = await newOrder.save();

    // Update product quantities sold
    for (const item of products) {
      await Product.findByIdAndUpdate(item.productId, {
        $inc: { quantitySold: item.quantity },
      });
    }

    sendCreatedResponse(res, "Tạo đơn hàng thành công", savedOrder);
    const notificationResult = await sendNotification({
      type: "ORDER",
      message: `Đơn hàng mới #${orderCode} được tạo từ khách hàng ${
        userName || anonymousId
      }`,
      roles: ["admin", "product-manager"],
    });

    if (!notificationResult.success) {
      throw new Error(notificationResult.error);
    }
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo đơn hàng",
      error
    );
  }
};

/**
 * Get order by ID
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id)
      .populate("products.productId", "name price discountPercent mainImage")
      .populate("voucher", "code discountType discountValue");

    if (!order) {
      return sendNotFoundResponse(res, "Không tìm thấy đơn hàng");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin đơn hàng thành công",
      order
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin đơn hàng",
      error
    );
  }
};

/**
 * Get all orders (admin)
 */
const getAllOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10, keyword } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }
    if (keyword) {
      query.$or = [
        { userName: { $regex: keyword, $options: "i" } },
        { userEmail: { $regex: keyword, $options: "i" } },
        { userPhone: { $regex: keyword, $options: "i" } },
        { orderCode: { $regex: keyword, $options: "i" } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("products.productId", "name price mainImage discountPercent")
      .populate("voucher", "code");

    const total = await Order.countDocuments(query);

    const pagination = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách đơn hàng thành công",
      orders,
      pagination
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách đơn hàng",
      error
    );
  }
};

/**
 * Get orders by user
 */
const getOrdersByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10, status, keyword } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { userId };

    if (
      status &&
      ["pending", "shipped", "delivered", "cancelled"].includes(status)
    ) {
      query.status = status;
    }

    if (keyword) {
      query.orderCode = { $regex: keyword, $options: "i" };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("products.productId", "name price mainImage discountPercent");

    const total = await Order.countDocuments(query);

    const pagination = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách đơn hàng của người dùng thành công",
      orders,
      pagination
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách đơn hàng của người dùng",
      error
    );
  }
};

/**
 * Get orders by anonymous ID
 */
const getOrdersByAnonymousId = async (req, res) => {
  try {
    const { anonymousId } = req.params;
    const { page = 1, limit = 10, status, keyword } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { anonymousId };

    if (
      status &&
      ["pending", "shipped", "delivered", "cancelled"].includes(status)
    ) {
      query.status = status;
    }

    if (keyword) {
      query.orderCode = { $regex: keyword, $options: "i" };
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate("products.productId", "name price mainImage discountPercent");

    const total = await Order.countDocuments(query);

    const pagination = {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    };

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách đơn hàng khách vãng lai thành công",
      orders,
      pagination
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách đơn hàng khách vãng lai",
      error
    );
  }
};

/**
 * Update order status
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (
      !status ||
      !["pending", "shipped", "delivered", "cancelled"].includes(status)
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Trạng thái đơn hàng không hợp lệ"
      );
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedOrder) {
      return sendNotFoundResponse(res, "Không tìm thấy đơn hàng");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật trạng thái đơn hàng thành công",
      updatedOrder
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật trạng thái đơn hàng",
      error
    );
  }
};

/**
 * Update payment status
 */
const updatePaymentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body;

    if (
      !paymentStatus ||
      !["pending", "paid", "failed"].includes(paymentStatus)
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Trạng thái thanh toán không hợp lệ"
      );
    }

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { paymentStatus },
      { new: true }
    );

    if (!updatedOrder) {
      return sendNotFoundResponse(res, "Không tìm thấy đơn hàng");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật trạng thái thanh toán thành công",
      updatedOrder
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật trạng thái thanh toán",
      error
    );
  }
};

/**
 * Cancel order
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      return sendNotFoundResponse(res, "Không tìm thấy đơn hàng");
    }

    if (order.status === "delivered") {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể hủy đơn hàng đã giao"
      );
    }

    order.status = "cancelled";
    await order.save();

    sendSuccessResponse(res, StatusCodes.OK, "Hủy đơn hàng thành công", order);
    const notificationResult = await sendNotification({
      type: "ORDER",
      message: `Đơn hàng #${order.orderCode} đã được hủy từ khách hàng ${
        order.userName || order.anonymousId
      }`,
      roles: ["admin"],
    });

    if (!notificationResult.success) {
      throw new Error(notificationResult.error);
    }
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi hủy đơn hàng",
      error
    );
  }
};

/**
 * Get order statistics (admin)
 */
const getOrderStatistics = async (req, res) => {
  try {
    const totalOrders = await Order.countDocuments();
    const pendingOrders = await Order.countDocuments({ status: "pending" });
    const shippedOrders = await Order.countDocuments({ status: "shipped" });
    const deliveredOrders = await Order.countDocuments({ status: "delivered" });
    const cancelledOrders = await Order.countDocuments({ status: "cancelled" });

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thống kê đơn hàng thành công",
      {
        totalOrders,
        pendingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
      }
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thống kê đơn hàng",
      error
    );
  }
};

const getRevenueStatistics = async (req, res) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfQuarter = new Date(
      now.getFullYear(),
      Math.floor(now.getMonth() / 3) * 3,
      1
    );
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalRevenue,
      revenueThisMonth,
      revenueThisQuarter,
      revenueThisYear,
      revenueByMonth,
    ] = await Promise.all([
      Order.aggregate([
        { $match: { status: "delivered" } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]).then((result) => result[0]?.total || 0),

      Order.aggregate([
        { $match: { status: "delivered", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]).then((result) => result[0]?.total || 0),

      Order.aggregate([
        {
          $match: { status: "delivered", createdAt: { $gte: startOfQuarter } },
        },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]).then((result) => result[0]?.total || 0),

      Order.aggregate([
        { $match: { status: "delivered", createdAt: { $gte: startOfYear } } },
        { $group: { _id: null, total: { $sum: "$totalAmount" } } },
      ]).then((result) => result[0]?.total || 0),

      Order.aggregate([
        {
          $match: {
            status: "delivered",
            createdAt: { $gte: startOfYear, $lte: now },
          },
        },
        {
          $group: {
            _id: { $month: "$createdAt" },
            total: { $sum: "$totalAmount" },
          },
        },
        {
          $project: {
            month: "$_id",
            total: 1,
            _id: 0,
          },
        },
        { $sort: { month: 1 } },
      ]).then((result) =>
        Array.from({ length: now.getMonth() + 1 }, (_, i) => ({
          month: i + 1,
          total: result.find((r) => r.month === i + 1)?.total || 0,
        }))
      ),
    ]);

    const stats = {
      totalRevenue,
      revenueThisMonth,
      revenueThisQuarter,
      revenueThisYear,
      revenueByMonth,
    };

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thống kê doanh thu thành công",
      stats
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thống kê doanh thu",
      error
    );
  }
};

const getOrderCode = async (req, res) => {
  try {
    let orderCode = generateOrderCode();
    let existingOrder = await Order.findOne({ orderCode });
    while (existingOrder) {
      orderCode = generateOrderCode();
      existingOrder = await Order.findOne({ orderCode });
    }
    sendSuccessResponse(res, StatusCodes.OK, "Tạo mã đơn hàng thành công", {
      orderCode,
    });
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo mã đơn hàng",
      error
    );
  }
};

/**
 * Update payment status by user (for their own orders)
 */
const updatePaymentStatusByUser = async (req, res) => {
  try {
    const { id, userId } = req.params;
    const { paymentStatus, paymentMethod, transactionId } = req.body;
    const requestUserId = req.user._id.toString();

    // Kiểm tra userId trong params có khớp với user đang đăng nhập không
    if (userId !== requestUserId) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Bạn chỉ có thể cập nhật thanh toán cho đơn hàng của mình"
      );
    }

    // Validation trạng thái thanh toán
    if (
      !paymentStatus ||
      !["pending", "paid", "failed"].includes(paymentStatus)
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Trạng thái thanh toán không hợp lệ"
      );
    }

    // Tìm đơn hàng và kiểm tra quyền sở hữu
    const order = await Order.findById(id);
    if (!order) {
      return sendNotFoundResponse(res, "Không tìm thấy đơn hàng");
    }

    // Kiểm tra đơn hàng có thuộc về user này không
    if (order.userId?.toString() !== userId) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền cập nhật đơn hàng này"
      );
    }

    // Kiểm tra trạng thái đơn hàng có thể cập nhật thanh toán không
    if (order.status === "cancelled") {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể cập nhật thanh toán cho đơn hàng đã hủy"
      );
    }

    if (order.status === "delivered" && paymentStatus === "failed") {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể đặt trạng thái thanh toán thất bại cho đơn hàng đã giao"
      );
    }

    const updateData = {
      paymentStatus,
    };

    if (paymentMethod && ["cod", "vnpay", "momo"].includes(paymentMethod)) {
      updateData.paymentMethod = paymentMethod;
    }

    if (transactionId && paymentStatus === "paid") {
      updateData.transactionId = transactionId;
      updateData.paidAt = new Date();
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("products.productId", "name price mainImage discountPercent")
      .populate("voucher", "code discountType discountValue");

    if (paymentStatus === "paid" && order.paymentStatus !== "paid") {
      try {
        await sendNotification({
          type: "ORDER",
          message: `Đơn hàng #${order.orderCode} đã được thanh toán thành công bởi khách hàng ${order.userName}`,
          roles: ["admin", "product-manager"],
          orderId: order._id,
        });
      } catch (notificationError) {
        logError(notificationError, req);
      }
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật trạng thái thanh toán thành công",
      {
        order: updatedOrder,
        message: getPaymentStatusMessage(paymentStatus, paymentMethod),
      }
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật trạng thái thanh toán",
      error
    );
  }
};

const getPaymentStatusMessage = (paymentStatus, paymentMethod) => {
  const methodText = {
    cod: "thanh toán khi nhận hàng",
    vnpay: "VNPay",
    momo: "MoMo",
  };

  switch (paymentStatus) {
    case "paid":
      return paymentMethod
        ? `Thanh toán thành công qua ${
            methodText[paymentMethod] || paymentMethod
          }`
        : "Thanh toán thành công";
    case "failed":
      return "Thanh toán thất bại";
    case "pending":
      return "Đang chờ thanh toán";
    default:
      return "Cập nhật trạng thái thanh toán";
  }
};

/**
 * Update payment status by Anonymous User (for their own orders)
 */
const updatePaymentStatusByAnonymous = async (req, res) => {
  try {
    const { id, anonymousId } = req.params;
    const { paymentStatus, paymentMethod, transactionId } = req.body;

    // Validation anonymousId
    if (!anonymousId) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "anonymousId là bắt buộc"
      );
    }

    // Validation trạng thái thanh toán
    if (
      !paymentStatus ||
      !["pending", "paid", "failed"].includes(paymentStatus)
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Trạng thái thanh toán không hợp lệ"
      );
    }

    // Tìm đơn hàng và kiểm tra quyền sở hữu
    const order = await Order.findById(id);
    if (!order) {
      return sendNotFoundResponse(res, "Không tìm thấy đơn hàng");
    }

    // Kiểm tra đơn hàng có thuộc về anonymous user này không
    if (order.anonymousId !== anonymousId) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền cập nhật đơn hàng này"
      );
    }

    // Kiểm tra đơn hàng phải là của anonymous user (không có userId)
    if (order.userId) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Đơn hàng này thuộc về người dùng đã đăng ký"
      );
    }

    // Kiểm tra trạng thái đơn hàng có thể cập nhật thanh toán không
    if (order.status === "cancelled") {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể cập nhật thanh toán cho đơn hàng đã hủy"
      );
    }

    if (order.status === "delivered" && paymentStatus === "failed") {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể đặt trạng thái thanh toán thất bại cho đơn hàng đã giao"
      );
    }

    // Kiểm tra nếu đơn hàng đã được thanh toán rồi
    if (order.paymentStatus === "paid" && paymentStatus !== "paid") {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể thay đổi trạng thái thanh toán của đơn hàng đã thanh toán"
      );
    }

    const updateData = {
      paymentStatus,
    };

    // Validation và update payment method
    if (paymentMethod && ["cod", "vnpay", "momo"].includes(paymentMethod)) {
      updateData.paymentMethod = paymentMethod;
    }

    // Update transaction info nếu thanh toán thành công
    if (transactionId && paymentStatus === "paid") {
      updateData.transactionId = transactionId;
      updateData.paidAt = new Date();
    }

    // Auto update order status nếu thanh toán thành công
    if (paymentStatus === "paid" && order.status === "pending") {
      updateData.status = "processing";
    }

    const updatedOrder = await Order.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("products.productId", "name price mainImage discountPercent")
      .populate("voucher", "code discountType discountValue");

    // Send notification to admin nếu thanh toán thành công
    if (paymentStatus === "paid" && order.paymentStatus !== "paid") {
      try {
        await sendNotification({
          type: "ORDER",
          message: `Đơn hàng #${order.orderCode} đã được thanh toán thành công bởi khách vãng lai ${order.userName}`,
          roles: ["admin", "product-manager"],
          orderId: order._id,
        });
      } catch (notificationError) {
        logError(notificationError, req);
        // Không throw error ở đây để không làm gián đoạn flow chính
      }
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật trạng thái thanh toán thành công",
      {
        order: updatedOrder,
        message: getPaymentStatusMessage(paymentStatus, paymentMethod),
      }
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật trạng thái thanh toán",
      error
    );
  }
};


export default {
  createOrder,
  getOrderById,
  getAllOrders,
  getOrdersByUser,
  getOrdersByAnonymousId,
  updateOrderStatus,
  updatePaymentStatus,
  updatePaymentStatusByUser,
  updatePaymentStatusByAnonymous,
  cancelOrder,
  getOrderStatistics,
  getRevenueStatistics,
  getOrderCode,
};
