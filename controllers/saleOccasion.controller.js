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
        const existing = saleMap.get(pid);

        if (!existing || item.salePercent > existing.salePercent) {
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

const getAllSaleOccasions = async (req, res) => {
  try {
    const sales = await SaleOccasion.find()
      .populate({
        path: "products.productId",
        select: "name slug price mainImage category brand",
      })
      .sort({ startAt: -1 })
      .lean();

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách tất cả đợt khuyến mãi thành công",
      sales
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

const updateSaleOccasion = async (req, res) => {
  try {
    const { id } = req.params;
    const { startAt, endAt, products } = req.body;

    //  Validate sale ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "ID chương trình khuyến mãi không hợp lệ"
      );
    }

    const sale = await SaleOccasion.findById(id);
    if (!sale) {
      return sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        "Không tìm thấy chương trình khuyến mãi"
      );
    }

    const now = new Date();

    //  Sale đã kết thúc → cấm sửa
    if (now > sale.endAt) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể chỉnh sửa chương trình khuyến mãi đã kết thúc"
      );
    }

    //  Sale đang diễn ra → cấm sửa startAt
    if (now >= sale.startAt && startAt !== undefined) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể thay đổi thời gian bắt đầu khi khuyến mãi đang diễn ra"
      );
    }

    //  Body rỗng
    if (
      startAt === undefined &&
      endAt === undefined &&
      products === undefined
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không có dữ liệu để cập nhật"
      );
    }

    // 5️⃣ Validate & merge thời gian
    const startDate = startAt ? new Date(startAt) : sale.startAt;
    const endDate = endAt ? new Date(endAt) : sale.endAt;

    if (
      isNaN(startDate.getTime()) ||
      isNaN(endDate.getTime()) ||
      endDate <= startDate
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thời gian khuyến mãi không hợp lệ"
      );
    }

    //  Update products (partial update)
    if (products !== undefined) {
      if (!Array.isArray(products) || products.length === 0) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Danh sách sản phẩm không hợp lệ"
        );
      }

      for (const item of products) {
        const { productId, saleQuantity, salePercent } = item;

        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "productId không hợp lệ"
          );
        }

        if (saleQuantity === undefined && salePercent === undefined) {
          return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Phải có ít nhất saleQuantity hoặc salePercent"
          );
        }

        if (saleQuantity !== undefined) {
          if (typeof saleQuantity !== "number" || saleQuantity < 0) {
            return sendErrorResponse(
              res,
              StatusCodes.BAD_REQUEST,
              "saleQuantity không hợp lệ"
            );
          }
        }

        if (salePercent !== undefined) {
          if (
            typeof salePercent !== "number" ||
            salePercent < 0 ||
            salePercent > 100
          ) {
            return sendErrorResponse(
              res,
              StatusCodes.BAD_REQUEST,
              "salePercent không hợp lệ"
            );
          }
        }

        const idx = sale.products.findIndex(
          (p) => p.productId.toString() === productId
        );

        if (idx === -1) {
          return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            `Sản phẩm không tồn tại trong chương trình`
          );
        }

        // chỉ update field được gửi
        if (saleQuantity !== undefined) {
          sale.products[idx].saleQuantity = saleQuantity;
        }

        if (salePercent !== undefined) {
          sale.products[idx].salePercent = salePercent;
        }
      }
    }

    // Gán thời gian
    if (startAt !== undefined) sale.startAt = startDate;
    if (endAt !== undefined) sale.endAt = endDate;

    await sale.save();

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật chương trình khuyến mãi thành công",
      sale
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

const deleteSaleOccasion = async (req, res) => {
  try {
    const { id } = req.params;

    //  Validate sale ID
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "ID chương trình khuyến mãi không hợp lệ"
      );
    }

    const sale = await SaleOccasion.findById(id);
    if (!sale) {
      return sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        "Không tìm thấy chương trình khuyến mãi"
      );
    }

    const now = new Date();

    //  Đang diễn ra → cấm xoá
    if (now >= sale.startAt && now <= sale.endAt) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể xoá chương trình khuyến mãi đang diễn ra"
      );
    }

    //  Đã kết thúc → cấm xoá
    if (now > sale.endAt) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể xoá chương trình khuyến mãi đã kết thúc"
      );
    }

    // Chưa bắt đầu → cho xoá
    await SaleOccasion.findByIdAndDelete(id);

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Xoá chương trình khuyến mãi thành công"
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
  getSaleProducts,
  getAllSaleOccasions,
  createSaleOccasion,
  getSaleCategories,
  updateSaleOccasion,
  deleteSaleOccasion
};
