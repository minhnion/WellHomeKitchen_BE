import Label from "../models/label.model.js";
import Product from "../models/product.model.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

const createLabel = async (req, res) => {
  try {
    const { name, colorBg, colorText, icon, specialBackground } = req.body;

    if (!name) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tên nhãn là bắt buộc"
      );
    }
    const newLabel = new Label({
      name,
      colorBg,
      colorText,
      icon,
      specialBackground,
    });

    const savedLabel = await newLabel.save();

    return sendCreatedResponse(res, "Tạo nhãn thành công", savedLabel);
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo nhãn",
      error
    );
  }
};

const getLabels = async (req, res) => {
  try {
    const { page, limit } = req.query;
    const pageNum = page ? Number(page) : 1;
    const limitNum = limit ? Number(limit) : 10;

    const filter = { isDeleted: false };

    const skip = (pageNum - 1) * limitNum;

    const labelQuery = Label.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);

    const [labels, totalLabels] = await Promise.all([
      labelQuery.exec(),
      Label.countDocuments(filter),
    ]);

    if (!labels?.length) {
      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Không tìm thấy nhãn nào",
        []
      );
    }

    const paginationDetails = {
      currentPage: pageNum,
      totalPages: Math.ceil(totalLabels / limitNum),
      totalLabels,
      limit: limitNum,
    };

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách nhãn thành công",
      labels,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách nhãn",
      error
    );
  }
};

const getProductsByLabel = async (req, res) => {
  try {
    const labelId = req.params.id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Kiểm tra label có tồn tại không
    const label = await Label.findById(labelId);
    if (!label) {
      return sendNotFoundResponse(res, "Không tìm thấy nhãn");
    }

    if (label.isDeleted) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Nhãn này đã bị xóa"
      );
    }

    // Tìm sản phẩm theo label
    const filter = {
      label: labelId,
      isDelete: false,
    };

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
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalProductsQuery = Product.countDocuments(filter);

    const [products, totalProducts] = await Promise.all([
      productsQuery.exec(),
      totalProductsQuery.exec(),
    ]);

    if (!products || products.length === 0) {
      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Không có sản phẩm nào với nhãn này",
        [],
        {
          currentPage: parseInt(page),
          totalPages: 0,
          totalProducts: 0,
          limit: parseInt(limit),
          label: {
            _id: label._id,
            name: label.name,
            colorBg: label.colorBg,
            colorText: label.colorText,
            icon: label.icon,
          },
        }
      );
    }

    const totalPages = Math.ceil(totalProducts / limit);
    const paginationDetails = {
      currentPage: parseInt(page),
      totalPages,
      totalProducts,
      limit: parseInt(limit),
      label: {
        _id: label._id,
        name: label.name,
        colorBg: label.colorBg,
        colorText: label.colorText,
        icon: label.icon,
      },
    };

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách sản phẩm theo nhãn thành công",
      products,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy sản phẩm theo nhãn",
      error
    );
  }
};

const addLabelToProduct = async (req, res) => {
  try {
    const { productId, labelId } = req.body;

    // Validation đầu vào
    if (!productId || !labelId) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "ID sản phẩm và ID nhãn là bắt buộc"
      );
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm");
    }

    if (product.isDelete) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể thêm nhãn cho sản phẩm đã bị xóa"
      );
    }

    // Kiểm tra label có tồn tại không
    const label = await Label.findById(labelId);
    if (!label) {
      return sendNotFoundResponse(res, "Không tìm thấy nhãn");
    }

    if (label.isDeleted) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể sử dụng nhãn đã bị xóa"
      );
    }

    // Kiểm tra sản phẩm đã có nhãn này chưa
    if (product.label && product.label.toString() === labelId) {
      return sendErrorResponse(
        res,
        StatusCodes.CONFLICT,
        "Sản phẩm đã có nhãn này rồi"
      );
    }

    // Cập nhật nhãn cho sản phẩm
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { label: labelId },
      { new: true, runValidators: true }
    )
      .populate("label", "name colorBg colorText icon")
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("brand", "name imageUrl");

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Thêm nhãn cho sản phẩm thành công",
      {
        product: {
          _id: updatedProduct._id,
          name: updatedProduct.name,
          slug: updatedProduct.slug,
          mainImage: updatedProduct.mainImage,
          price: updatedProduct.price,
          category: updatedProduct.category,
          subCategory: updatedProduct.subCategory,
          brand: updatedProduct.brand,
          label: updatedProduct.label,
        },
        message: `Đã thêm nhãn "${label.name}" cho sản phẩm "${product.name}"`,
      }
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi thêm nhãn cho sản phẩm",
      error
    );
  }
};

// Thêm API bổ sung: Xóa nhãn khỏi sản phẩm
const removeLabelFromProduct = async (req, res) => {
  try {
    const { productId } = req.body;

    if (!productId) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "ID sản phẩm là bắt buộc"
      );
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm");
    }

    if (product.isDelete) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể xóa nhãn của sản phẩm đã bị xóa"
      );
    }

    // Kiểm tra sản phẩm có nhãn không
    if (!product.label) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Sản phẩm này chưa có nhãn"
      );
    }

    // Xóa nhãn khỏi sản phẩm
    const updatedProduct = await Product.findByIdAndUpdate(
      productId,
      { $unset: { label: 1 } },
      { new: true }
    )
      .populate("category", "name")
      .populate("subCategory", "name")
      .populate("brand", "name imageUrl");

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Xóa nhãn khỏi sản phẩm thành công",
      {
        product: {
          _id: updatedProduct._id,
          name: updatedProduct.name,
          slug: updatedProduct.slug,
          mainImage: updatedProduct.mainImage,
          price: updatedProduct.price,
          category: updatedProduct.category,
          subCategory: updatedProduct.subCategory,
          brand: updatedProduct.brand,
          label: null,
        },
        message: `Đã xóa nhãn khỏi sản phẩm "${product.name}"`,
      }
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa nhãn khỏi sản phẩm",
      error
    );
  }
};

const updateLabel = async (req, res) => {
  try {
    const { name, colorBg, colorText, icon, specialBackground } = req.body;
    if (!name) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tên nhãn là bắt buộc"
      );
    }
    const updatedLabel = await Label.findByIdAndUpdate(
      req.params.id,
      {
        name,
        colorBg,
        colorText,
        icon,
        specialBackground,
      },
      { new: true }
    );

    if (!updatedLabel) {
      return sendNotFoundResponse(res, "Không tìm thấy nhãn");
    }
    if (updatedLabel.isDeleted) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Không thể cập nhật nhãn đã bị xóa"
      );
    }
    const savedLabel = await updatedLabel.save();
    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật nhãn thành công",
      savedLabel
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật nhãn",
      error
    );
  }
};

const deleteLabel = async (req, res) => {
  try {
    // Soft delete by setting isDeleted to true
    const labelToDelete = await Label.findById(req.params.id);

    if (!labelToDelete) {
      return sendNotFoundResponse(res, "Không tìm thấy nhãn");
    }

    labelToDelete.isDeleted = true;
    const savedLabel = await labelToDelete.save();
    if (!savedLabel) {
      return sendErrorResponse(
        res,
        StatusCodes.INTERNAL_SERVER_ERROR,
        "Lỗi khi xóa nhãn"
      );
    }
    return sendSuccessResponse(res, StatusCodes.OK, "Xóa nhãn thành công");
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa nhãn",
      error
    );
  }
};

export default {
  createLabel,
  getLabels,
  updateLabel,
  deleteLabel,
  getProductsByLabel,
  addLabelToProduct,
  removeLabelFromProduct,
};
