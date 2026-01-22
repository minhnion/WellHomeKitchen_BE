import Product from "../models/product.model.js";
import { deletedName } from "../utils/helpers.js";
import {
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
  sendSuccessResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import { createSlug } from "../utils/helpers.js";
import { StatusCodes } from "http-status-codes";
import { applySaleToProducts } from "../utils/applySaleToProducts.js";

const createProduct = async (req, res) => {
  try {
    const productData = req.body;
    if (!productData.name) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tên sản phẩm là bắt buộc"
      );
    }
    const slug = createSlug(productData.name);
    const existingProduct = await Product.findOne({
      slug: slug,
      isDelete: false,
    });
    if (existingProduct) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Sản phẩm đã tồn tại"
      );
    }

    productData.slug = slug;
    const newProduct = await Product.create(productData);
    const populatedProduct = await Product.findById(newProduct._id)
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("brand", "name logo");

    return sendCreatedResponse(
      res,
      "Tạo sản phẩm thành công",
      populatedProduct || newProduct
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo sản phẩm",
      error
    );
  }
};

const getAllProducts = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;
    const { category, subCategory, brand, keyword, isSpecial } = req.query;

    const filter = { isDelete: false };
    if (category) {
      filter.category = category;
    }
    if (subCategory) {
      filter.subCategory = subCategory;
    }
    if (brand) {
      filter.brand = brand;
    }
    if (keyword && keyword.trim() !== "") {
      filter.slug = {
        $regex: createSlug(keyword),
        $options: "i",
      };
    }
    if (isSpecial) {
      filter.isSpecial = isSpecial;
    }

    const productsQuery = Product.find(filter)
      .select(
        "name description price discountPercent sku mainImage quantitySold slug isSpecial createdAt starAverage numberOfReviews"
      )
      .populate({
        path: "category",
        select: "name",
      })
      .populate({
        path: "subCategory",
        select: "name",
      })
      .populate({
        path: "brand",
        select: "name imageUrl",
      })
      .populate({
        path: "label",
        select: "name colorBg colorText icon specialBackground",
      });

    const sortOptions = { createdAt: -1 };

    productsQuery.sort(sortOptions).skip(skip).limit(limit);

    const totalProductsQuery = Product.countDocuments(filter);
    const [products, totalProducts] = await Promise.all([
      productsQuery.exec(),
      totalProductsQuery.exec(),
    ]);
    const productsWithSale = await applySaleToProducts(products);
    const totalPages = Math.ceil(totalProducts / limit);
    const paginationDetails = {
      currentPage: page,
      totalPages: totalPages,
      totalProducts: totalProducts,
      limit: limit,
    };
    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách sản phẩm thành công",
      productsWithSale,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách sản phẩm",
      error
    );
  }
};

const getAllProductsWithFilter = async (req, res) => {
  try {
    const page = parseInt(req.body.page, 10) || 1;
    const limit = parseInt(req.body.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const {
      categoryId,
      subCategoryId,
      brand,
      minPrice,
      maxPrice,
      newest,
      bestseller,
      discount,
      sortPrice,
      filter = {},
      keyword,
    } = req.body;

    const queryFilter = { isDelete: false };

    // Lọc theo danh mục
    if (categoryId) {
      queryFilter.category = categoryId;
    }

    // Lọc theo danh mục con
    if (subCategoryId) {
      queryFilter.subCategory = subCategoryId;
    }

    // Lọc theo thương hiệu
    if (brand) {
      queryFilter.brand = brand;
    }

    if (keyword && keyword.trim() !== "") {
      queryFilter.slug = {
        $regex: createSlug(keyword),
        $options: "i",
      };
    }

    // Lọc theo giá
    const minPriceValue = parseFloat(minPrice);
    const maxPriceValue = parseFloat(maxPrice);
    if (!isNaN(minPriceValue) || !isNaN(maxPriceValue)) {
      queryFilter.price = {};
      if (!isNaN(minPriceValue)) {
        queryFilter.price.$gte = minPriceValue;
      }
      if (!isNaN(maxPriceValue)) {
        queryFilter.price.$lte = maxPriceValue;
      }
    }

    // Lọc theo giảm giá
    if (discount === true) {
      queryFilter.discountPercent = { $gt: 0 };
    }

    // Lọc theo các thông số kỹ thuật (filter)
    if (filter && Object.keys(filter).length > 0) {
      queryFilter.specifications = {
        $elemMatch: {
          $and: Object.entries(filter).map(([key, values]) => ({
            key: key,
            value: { $in: values },
          })),
        },
      };
    }

    // Sắp xếp
    let sortOptions = { createdAt: -1 };
    if (newest === true) {
      sortOptions = { createdAt: -1 };
    }
    if (bestseller === true) {
      sortOptions = { quantitySold: -1 };
    }
    if (sortPrice === "asc") {
      sortOptions = { price: 1 };
    } else if (sortPrice === "desc") {
      sortOptions = { price: -1 };
    }

    const productsQuery = Product.find(queryFilter)
      .select(
        "name description price discountPercent sku mainImage quantitySold slug isSpecial createdAt starAverage numberOfReviews"
      )
      .populate({
        path: "category",
        select: "name",
      })
      .populate({
        path: "subCategory",
        select: "name",
      })
      .populate({
        path: "brand",
        select: "name imageUrl",
      })
      .populate({
        path: "label",
        select: "name colorBg colorText icon specialBackground",
      })
      .sort(sortOptions)
      .skip(skip)
      .limit(limit);

    const totalProductsQuery = Product.countDocuments(queryFilter);

    const [products, totalProducts] = await Promise.all([
      productsQuery.exec(),
      totalProductsQuery.exec(),
    ]);

    const totalPages = Math.ceil(totalProducts / limit);
    const paginationDetails = {
      currentPage: page,
      totalPages: totalPages,
      totalProducts: totalProducts,
      limit: limit,
    };

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách sản phẩm có lọc thành công",
      products,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách sản phẩm có lọc",
      error
    );
  }
};

const getProductById = async (req, res) => {
  try {
    const productId = req.params.id;

    const product = await Product.findById(productId);

    if (!product) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm");
    }
    const [productsWithSale] = await applySaleToProducts([product]);

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy chi tiết sản phẩm thành công",
      productsWithSale
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy chi tiết sản phẩm",
      error
    );
  }
};

const getProductBySlug = async (req, res) => {
  try {
    const slug = req.params.slug;

    const product = await Product.findOne({ slug });
    if (!product) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm");
    }
    const populatedProduct = await Product.findOne({ slug })
      .populate("category", "name slug imageUrl")
      .populate("brand", "name imageUrl slug")
      .populate("subCategory", "name slug imageUrl");
    const [productsWithSale] = await applySaleToProducts([populatedProduct]);
    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy chi tiết sản phẩm thành công",
      productsWithSale
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy chi tiết sản phẩm",
      error
    );
  }
};

const getProductBySku = async (req, res) => {
  try {
    const sku = req.params.sku;
    const product = await Product.findOne({ sku, isDelete: false });
    if (!product) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm");
    }
    const [productsWithSale] = await applySaleToProducts([product]);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy sản phẩm theo SKU thành công",
      product
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy sản phẩm theo SKU"
    );
  }
};

const updateProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const updateData = req.body;

    if (updateData.name) {
      updateData.slug = createSlug(updateData.name);
      const existingProduct = await Product.findOne({
        slug: updateData.slug,
        isDelete: false,
        _id: { $ne: productId },
      });
      if (existingProduct) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Sản phẩm đã tồn tại"
        );
      }
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      updateData,
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    );

    if (!updatedProduct) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm");
    }

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật sản phẩm thành công",
      updatedProduct
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật sản phẩm",
      error
    );
  }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;
    const deletedProduct = await Product.findById(productId);

    if (!deletedProduct) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm");
    }

    await Product.findByIdAndUpdate(
      productId,
      {
        isDelete: true,
        name: deletedName(deletedProduct.name),
        sku: deletedName(deletedProduct.sku),
      },
      { new: true }
    );

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      `Xóa sản phẩm '${deletedProduct.name}' thành công`
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa sản phẩm",
      error
    );
  }
};

const getTopSellingProductsByCategory = async (req, res) => {
  try {
    const { category } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const skip = (page - 1) * limit;

    const filter = { isDelete: false };

    if (category) {
      filter.category = category;
    }

    const productsQuery = Product.find(filter)
      .sort({ quantitySold: -1 })
      .skip(skip)
      .limit(limit)
      .select(
        "name description price discountPercent sku mainImage quantitySold slug isSpecial createdAt starAverage numberOfReviews galleryImages"
      )
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("brand", "name logo")
      .populate({
        path: "label",
        select: "name colorBg colorText icon specialBackground",
      });

    const totalProductsQuery = Product.countDocuments(filter);

    const [products, totalProducts] = await Promise.all([
      productsQuery.exec(),
      totalProductsQuery.exec(),
    ]);
    const productsWithSale = await applySaleToProducts(products);
    const totalPages = Math.ceil(totalProducts / limit);
    const paginationDetails = {
      currentPage: page,
      totalPages: totalPages,
      totalProducts: totalProducts,
      limit: limit,
    };

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách sản phẩm bán chạy thành công",
      productsWithSale,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách sản phẩm bán chạy",
      error
    );
  }
};

const getProductOverviewStats = async (req, res) => {
  try {
    const [totalProducts, specialProducts, discountedProducts, quantityResult] =
      await Promise.all([
        Product.countDocuments({ isDelete: false }),
        Product.countDocuments({ isDelete: false, isSpecial: true }),
        Product.countDocuments({
          isDelete: false,
          discountPercent: { $gt: 0 },
        }),
        Product.aggregate([
          { $match: { isDelete: false } },
          {
            $group: { _id: null, totalQuantitySold: { $sum: "$quantitySold" } },
          },
        ]),
      ]);
    const totalQuantitySold = quantityResult[0]?.totalQuantitySold || 0;
    const stats = {
      totalProducts,
      specialProducts,
      discountedProducts,
      totalQuantitySold,
    };

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thống kê tổng quan sản phẩm thành công",
      stats
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thống kê tổng quan sản phẩm",
      error
    );
  }
};

export default {
  getAllProducts,
  createProduct,
  getProductById,
  getProductBySlug,
  updateProduct,
  deleteProduct,
  getTopSellingProductsByCategory,
  getAllProductsWithFilter,
  getProductBySku,
  getProductOverviewStats,
};