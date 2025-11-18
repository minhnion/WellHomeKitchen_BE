import mongoose from "mongoose";
import SaleOccasion from "../models/saleOccasion.model.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendErrorResponse,
  sendCreatedResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import Product from "../models/product.model.js";

const getSaleCategories = async (req, res) => {
  try {
    const { time } = req.query;

    const targetDate = new Date(time);
    if (!time || isNaN(targetDate.getTime())) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thiếu hoặc không hợp lệ tham số thời gian"
      );
    }
    const categories = await SaleOccasion.aggregate([
      {
        $match: { startAt: { $lte: targetDate }, endAt: { $gte: targetDate } },
      },
      { $unwind: "$products" },
      {
        $lookup: {
          from: mongoose.model("Product").collection.name,
          localField: "products.productId",
          foreignField: "_id",
          as: "product",
        },
      },
      { $unwind: "$product" },
      { $group: { _id: "$product.category" } },
      {
        $lookup: {
          from: mongoose.model("Category").collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },
      { $project: { name: "$category.name" } },
    ]);

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh mục có sản phẩm khuyến mãi thành công",
      categories
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

const getSaleProducts = async (req, res) => {
  try {
    const { time, category } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);

    if (!time) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thiếu tham số thời gian bắt buộc"
      );
    }

    const targetDate = new Date(time);
    if (isNaN(targetDate.getTime())) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tham số thời gian không hợp lệ"
      );
    }

    const categoryIdObj = new mongoose.Types.ObjectId(category);

    // Find all active sale occasions at the target time
    const saleOccasions = await SaleOccasion.find({
      startAt: { $lte: targetDate },
      endAt: { $gte: targetDate },
    })
      .select("products startAt endAt")
      .lean();

    // If no sale occasions found, return empty
    if (!saleOccasions || saleOccasions.length === 0) {
      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Không tìm thấy sản phẩm khuyến mãi nào",
        [],
        { page, limit, total: 0 }
      );
    }

    const saleMap = new Map();
    saleOccasions.forEach((so) => {
      so.products.forEach((item) => {
        const pid = item.productId.toString();
        if (!saleMap.has(pid)) {
          saleMap.set(pid, {
            saleQuantity: item.saleQuantity,
            salePercent: item.salePercent,
            saleStart: so.startAt,
            saleEnd: so.endAt,
          });
        }
      });
    });

    const productIds = Array.from(saleMap.keys()).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const filter = {
      _id: { $in: productIds },
      isDelete: { $ne: true },
    };
    if (category) {
      filter.category = categoryIdObj;
    }

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .select("name slug mainImage price")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const data = products.map((prod) => {
      const saleInfo = saleMap.get(prod._id.toString());
      return {
        productId: prod._id,
        name: prod.name,
        slug: prod.slug,
        mainImage: prod.mainImage,
        category: prod.category,
        brand: prod.brand,
        price: prod.price,
        salePercent: saleInfo.salePercent,
        saleQuantity: saleInfo.saleQuantity,
        saleStart: saleInfo.saleStart,
        saleEnd: saleInfo.saleEnd,
      };
    });

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách sản phẩm khuyến mãi thành công",
      data,
      { page, limit, total }
    );
  } catch (error) {
    logError(error, req);
    console.error("Error in getSaleProducts:", error);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi hệ thống",
      error
    );
  }
};

const createSaleOccasion = async (req, res) => {
  try {
    const { name, startAt, endAt, products } = req.body;
    // Validate required fields
    if (!name || !startAt || !endAt || !Array.isArray(products)) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thiếu hoặc không hợp lệ các trường bắt buộc: tên, thời gian bắt đầu, thời gian kết thúc, danh sách sản phẩm"
      );
    }

    // Validate dates
    const startDate = new Date(startAt);
    const endDate = new Date(endAt);
    if (
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thời gian không hợp lệ: đảm bảo định dạng ngày hợp lệ và thời gian kết thúc phải sau thời gian bắt đầu"
      );
    }

    // Validate products entries
    for (const item of products) {
      if (
        !mongoose.Types.ObjectId.isValid(item.productId) ||
        typeof item.saleQuantity !== "number" ||
        typeof item.salePercent !== "number"
      ) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Mỗi sản phẩm phải có ID sản phẩm hợp lệ, số lượng khuyến mãi (số) và phần trăm khuyến mãi (số)"
        );
      }
      if (
        item.saleQuantity < 0 ||
        item.salePercent < 0 ||
        item.salePercent > 100
      ) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Số lượng khuyến mãi phải >= 0 và phần trăm khuyến mãi phải từ 0 đến 100"
        );
      }
    }

    // Create and save
    const saleOccasion = new SaleOccasion({
      name,
      startAt: startDate,
      endAt: endDate,
      products,
    });
    await saleOccasion.save();

    return sendCreatedResponse(
      res,
      "Tạo chương trình khuyến mãi thành công",
      saleOccasion
    );
  } catch (error) {
    logError(error, req);
    console.error("Error in createSaleOccasion:", error);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi hệ thống",
      error
    );
  }
};

export default {
  getSaleProducts,
  createSaleOccasion,
  getSaleCategories,
};
