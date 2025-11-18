import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendErrorResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import { createSlug } from "../utils/helpers.js";

/**
 * Search products with pagination
 */
const searchProducts = async (req, res) => {
  try {
    const { searchTerm, page = 1, limit = 10, sortPrice, sortNew } = req.query;

    if (!searchTerm || searchTerm.trim() === "") {
      const skip = (parseInt(page) - 1) * parseInt(limit);

      // Sửa: Query sản phẩm và đếm tổng số song song
      const productsQuery = Product.find({ isDelete: false })
        .skip(skip)
        .limit(parseInt(limit))
        .sort({
          ...(sortPrice && { price: sortPrice === "1" ? 1 : -1 }),
          ...(sortNew && { createdAt: sortNew === "1" ? 1 : -1 }),
          ...(!sortPrice && !sortNew && { createdAt: -1 }),
        })
        .select(
          "name description price discountPercent sku mainImage quantitySold slug isSpecial createdAt starAverage numberOfReviews"
        )
        .populate({
          path: "subCategory",
          select: "name",
        })
        .populate({
          path: "label",
          select: "name colorBg colorText icon specialBackground",
        });

      const totalProductsQuery = Product.countDocuments({ isDelete: false });

      const [products, totalProducts] = await Promise.all([
        productsQuery.exec(),
        totalProductsQuery.exec(),
      ]);

      const totalPages = Math.ceil(totalProducts / parseInt(limit));

      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Không có từ khóa tìm kiếm, trả về tất cả sản phẩm",
        products,
        {
          currentPage: parseInt(page),
          totalPages,
          totalProducts,
          limit: parseInt(limit),
        }
      );
    }

    const normalizedSearchTerm = createSlug(searchTerm);

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {
      slug: {
        $regex: normalizedSearchTerm,
        $options: "i",
      },
      isDelete: false,
    };

    const productsQuery = Product.find(filter)
      .select(
        "name description price discountPercent sku mainImage quantitySold slug isSpecial createdAt starAverage numberOfReviews"
      )
      .populate({
        path: "subCategory",
        select: "name",
      })
      .populate({
        path: "label",
        select: "name colorBg colorText icon specialBackground",
      })
      .skip(skip)
      .limit(parseInt(limit))
      .sort({
        ...(sortPrice && { price: sortPrice === "1" ? 1 : -1 }),
        ...(sortNew && { createdAt: sortNew === "1" ? 1 : -1 }),
        ...(!sortPrice && !sortNew && { createdAt: -1 }),
      });

    const totalProductsQuery = Product.countDocuments(filter);

    const [products, totalProducts] = await Promise.all([
      productsQuery.exec(),
      totalProductsQuery.exec(),
    ]);

    if (!products || products.length === 0) {
      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Không tìm thấy sản phẩm nào phù hợp",
        [],
        {
          currentPage: parseInt(page),
          totalPages: 0,
          totalProducts: 0,
          limit: parseInt(limit),
        }
      );
    }

    const totalPages = Math.ceil(totalProducts / limit);
    const paginationDetails = {
      currentPage: parseInt(page),
      totalPages,
      totalProducts,
      limit: parseInt(limit),
    };

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Tìm kiếm sản phẩm thành công",
      products,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tìm kiếm sản phẩm",
      error
    );
  }
};

/**
 * Auto search products and categories (suggestions)
 */
const autoSearchProducts = async (req, res) => {
  try {
    const { searchTerm, limit = 5 } = req.query;

    if (!searchTerm || searchTerm.trim() === "") {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Từ khóa tìm kiếm là bắt buộc"
      );
    }

    const normalizedSearchTerm = createSlug(searchTerm);

    const productFilter = {
      slug: {
        $regex: normalizedSearchTerm,
        $options: "i",
      },
      isDelete: false,
    };

    const products = await Product.find(productFilter)
      .select("name slug mainImage price discountPercent")
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    const categoryFilter = {
      slug: {
        $regex: normalizedSearchTerm,
        $options: "i",
      },
      isDeleted: false,
    };

    const categories = await Category.find(categoryFilter)
      .select("name slug imageUrl")
      .limit(parseInt(limit));

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy gợi ý tìm kiếm thành công",
      {
        products,
        categories,
      }
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy gợi ý tìm kiếm",
      error
    );
  }
};

export default {
  searchProducts,
  autoSearchProducts,
};
