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
import { createSlug } from "../utils/helpers.js";

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
      //  Chỉ lấy sale đang diễn ra
      {
        $match: {
          startAt: { $lte: targetDate },
          endAt: { $gte: targetDate },
        },
      },

      //  Nếu có nhiều sale → lấy sale có startAt gần time nhất
      {
        $sort: { startAt: -1 },
      },

      //  Đảm bảo chỉ lấy 1 đợt sale
      {
        $limit: 1,
      },

      //  Bắt đầu xử lý products
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

      //  Group theo category, giữ saleSlug
      {
        $group: {
          _id: "$product.category",
          saleSlug: { $first: "$slug" },
        },
      },

      //  Lấy thông tin category
      {
        $lookup: {
          from: mongoose.model("Category").collection.name,
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      { $unwind: "$category" },

      //  Output
      {
        $project: {
          _id: "$category._id",
          name: "$category.name",
          slug: "$category.slug",
          saleSlug: 1,
        },
      },
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

    //  find sale
    const saleOccasion = await SaleOccasion.findOne({
      startAt: { $lte: targetDate },
      endAt: { $gte: targetDate },
    })
      .sort({ startAt: -1 })
      .select("name slug products startAt endAt")
      .lean();

    if (!saleOccasion) {
      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Không tìm thấy sản phẩm khuyến mãi nào",
        {
          sale: null,
          products: [],
        },
        { page, limit, total: 0 }
      );
    }

    // sale info tách riêng
    const sale = {
      name: saleOccasion.name,
      slug: saleOccasion.slug,
      startAt: saleOccasion.startAt,
      endAt: saleOccasion.endAt,
    };

    // map productId → sale info
    const saleMap = new Map();
    saleOccasion.products.forEach((item) => {
      saleMap.set(item.productId.toString(), {
        salePercent: item.salePercent,
        saleQuantity: item.saleQuantity,
      });
    });

    const productIds = Array.from(saleMap.keys()).map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const filter = {
      _id: { $in: productIds },
      isDelete: { $ne: true },
    };

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = new mongoose.Types.ObjectId(category);
    }

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .select("name slug mainImage price category brand")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const productData = products.map((prod) => {
      const saleInfo = saleMap.get(prod._id.toString());
      return {
        productId: prod._id,
        name: prod.name,
        slug: prod.slug,
        mainImage: prod.mainImage,
        price: prod.price,
        category: prod.category,
        brand: prod.brand,
        salePercent: saleInfo.salePercent,
        saleQuantity: saleInfo.saleQuantity,
      };
    });

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách sản phẩm khuyến mãi thành công",
      {
        sale,
        products: productData,
      },
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
    const {
      page = 1,
      limit = 10,
      search = "",
    } = req.query;

    const query = {};

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { slug: { $regex: search, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;

    const [sales, totalRecords] = await Promise.all([
      SaleOccasion.find(query)
        .populate({
          path: "products.productId",
          select: "name slug price mainImage category brand",
        })
        .sort({ startAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),

      SaleOccasion.countDocuments(query),
    ]);

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách tất cả đợt khuyến mãi thành công",
      {
        sales,
        totalRecords,
        totalPages: Math.ceil(totalRecords / limit),
        currentPage: Number(page),
      }
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

    const slug = createSlug(name);

    const existingSale = await SaleOccasion.findOne({
      slug,
    });

    if (existingSale) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Chương trình khuyến mãi đã tồn tại"
      );
    }

    //  Create and save
    const saleOccasion = new SaleOccasion({
      name,
      slug,
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
      "Lỗi hệ thống hoặc sản phẩm khuyến mãi đã tồn tại ở đợt sale khác",
      error
    );
  }
};

const updateSaleOccasion = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startAt, endAt, products } = req.body;

    /* ========= VALIDATE ID ========= */
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

    /* ========= SALE ĐÃ KẾT THÚC ========= */
    if (now > sale.endAt) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể chỉnh sửa chương trình khuyến mãi đã kết thúc"
      );
    }

    /* ========= SALE ĐANG DIỄN RA: CẤM ĐỔI START ========= */
    if (
      now >= sale.startAt &&
      startAt !== undefined &&
      new Date(startAt).getTime() !== sale.startAt.getTime()
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể thay đổi thời gian bắt đầu khi khuyến mãi đang diễn ra"
      );
    }

    /* ========= BODY RỖNG ========= */
    if (
      name === undefined &&
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

    /* ========= TIME ========= */
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

    /* =====================================================
       ================= UPDATE PRODUCTS ===================
       ===================================================== */
    if (products !== undefined) {
      if (!Array.isArray(products)) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Danh sách sản phẩm không hợp lệ"
        );
      }

      const normalizedProducts = [];

      for (const item of products) {
        let { productId, saleQuantity, salePercent } = item;

        if (!productId) {
          return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Thiếu productId"
          );
        }

        if (typeof productId === "object") {
          productId = productId._id || productId.value;
        }

        if (!mongoose.Types.ObjectId.isValid(productId)) {
          return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "productId không hợp lệ"
          );
        }

        if (
          saleQuantity !== undefined &&
          (typeof saleQuantity !== "number" || saleQuantity < 0)
        ) {
          return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "saleQuantity không hợp lệ"
          );
        }

        if (
          salePercent !== undefined &&
          (typeof salePercent !== "number" ||
            salePercent < 0 ||
            salePercent > 100)
        ) {
          return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "salePercent không hợp lệ"
          );
        }

        normalizedProducts.push({
          productId: productId.toString(),
          saleQuantity,
          salePercent,
        });
      }

      /* =====  TRÙNG SẢN PHẨM TRONG CHÍNH REQUEST ===== */
      const productIds = normalizedProducts.map(p => p.productId);
      const duplicated = productIds.filter(
        (id, index) => productIds.indexOf(id) !== index
      );

      if (duplicated.length > 0) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Sản phẩm bị trùng trong cùng một đợt khuyến mãi"
        );
      }

      /* ===== 2️ TRÙNG VỚI ĐỢT SALE KHÁC (OVERLAP TIME) ===== */
      const conflictSale = await SaleOccasion.findOne({
        _id: { $ne: sale._id },
        startAt: { $lt: endDate },
        endAt: { $gt: startDate },
        "products.productId": { $in: productIds },
      });

      if (conflictSale) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Một hoặc nhiều sản phẩm đã tồn tại trong đợt khuyến mãi khác cùng thời gian"
        );
      }

      sale.products = normalizedProducts;
    }

    /* ========= UPDATE NAME ========= */
    if (name !== undefined) {
      const newSlug = createSlug(name);

      if (newSlug !== sale.slug) {
        const existed = await SaleOccasion.findOne({
          slug: newSlug,
          _id: { $ne: sale._id },
        });

        if (existed) {
          return sendErrorResponse(
            res,
            StatusCodes.BAD_REQUEST,
            "Tên chương trình khuyến mãi đã tồn tại"
          );
        }

        sale.slug = newSlug;
      }

      sale.name = name;
    }

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
      "Lỗi hệ thống hoặc sản phẩm khuyến mãi chưa được thay đổi giá bán so với giá ban đầu",
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

const getAllActiveSaleProducts = async (req, res) => {
  try {
    const { time, category } = req.query;
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.max(parseInt(req.query.limit, 10) || 10, 1);

    if (!time) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thiếu tham số thời gian"
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

    //  Lấy TẤT CẢ sale đang diễn ra
    const sales = await SaleOccasion.find({
      startAt: { $lte: targetDate },
      endAt: { $gte: targetDate },
    })
      .sort({ startAt: -1 }) // sale gần nhất ưu tiên
      .lean();

    if (sales.length === 0) {
      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Không có khuyến mãi nào",
        { sale: null, products: [] },
        { page, limit, total: 0 }
      );
    }

    //  Map productId → sale info (sale gần nhất thắng)
    const saleMap = new Map();

    for (const sale of sales) {
      for (const item of sale.products) {
        const key = item.productId.toString();
        if (!saleMap.has(key)) {
          saleMap.set(key, {
            salePercent: item.salePercent,
            saleQuantity: item.saleQuantity,
            saleName: sale.name,
            saleSlug: sale.slug,
            startAt: sale.startAt,
            endAt: sale.endAt,
          });
        }
      }
    }

    const productIds = [...saleMap.keys()].map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const filter = {
      _id: { $in: productIds },
      isDelete: { $ne: true },
    };

    if (category && mongoose.Types.ObjectId.isValid(category)) {
      filter.category = new mongoose.Types.ObjectId(category);
    }

    const total = await Product.countDocuments(filter);

    const products = await Product.find(filter)
      .select("name slug mainImage price category brand")
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    const productData = products.map((prod) => {
      const saleInfo = saleMap.get(prod._id.toString());
      return {
        productId: prod._id,
        name: prod.name,
        slug: prod.slug,
        mainImage: prod.mainImage,
        price: prod.price,
        category: prod.category,
        brand: prod.brand,
        ...saleInfo,
      };
    });

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy tất cả sản phẩm khuyến mãi thành công",
      {
        sale: { slug: "all", name: "Tất cả khuyến mãi" },
        products: productData,
      },
      { page, limit, total }
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
  getAllActiveSaleProducts,
  getSaleProducts,
  getAllSaleOccasions,
  createSaleOccasion,
  getSaleCategories,
  updateSaleOccasion,
  deleteSaleOccasion
};
