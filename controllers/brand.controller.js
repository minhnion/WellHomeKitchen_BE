import Brand from "../models/brand.model.js";
import { createSlug, deletedName } from "../utils/helpers.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import Product from "../models/product.model.js";

const getBrandById = async (req, res) => {
  try {
    const { id } = req.params;
    const brand = await Brand.findById(id, {
      isDeleted: false,
    });
    if (!brand) {
      return sendNotFoundResponse(res, "Không tìm thấy thương hiệu");
    }
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin thương hiệu thành công",
      {
        brand,
      }
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin thương hiệu",
      error
    );
  }
};

const getAllBrands = async (req, res) => {
  try {
    const { categoryId, page, limit, keyword } = req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;

    const filter = { isDeleted: false };

    if (categoryId) filter.categoryIds = { $in: [categoryId] };
    if (keyword && keyword.trim() !== "") {
      filter.slug = {
        $regex: createSlug(keyword),
        $options: "i",
      };
    }

    const brandsQuery = Brand.find(filter)
      .populate("categoryIds", "name")
      .sort({ createdAt: -1 });

    if (pageNum && limitNum) {
      brandsQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const [brands, totalBrands] = await Promise.all([
      brandsQuery.exec(),
      Brand.countDocuments(filter),
    ]);

    if (!brands?.length) {
      return sendNotFoundResponse(res, "Không tìm thấy thương hiệu nào");
    }

    const brandsWithCount = await Promise.all(
      brands.map(async (bra) => ({
        ...bra.toObject(),
        productCount: await Product.countDocuments({
          brand: bra._id,
          isDelete: false,
        }),
      }))
    );

    const paginationDetails = {
      currentPage: pageNum || 1,
      totalPages: limitNum ? Math.ceil(totalBrands / limitNum) : 1,
      totalBrands,
      limit: limitNum || totalBrands,
    };

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách thương hiệu thành công",
      brandsWithCount,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách thương hiệu",
      error
    );
  }
};

const createBrand = async (req, res) => {
  try {
    const newData = req.body;

    if (!newData.name) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tên thương hiệu là bắt buộc"
      );
    }
    newData.slug = createSlug(newData.name);

    const newBrand = new Brand(newData);
    const existingBrand = await Brand.findOne({
      slug: newData.slug,
      isDeleted: false,
    });

    if (existingBrand) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Thương hiệu đã tồn tại"
      );
    }
    const savedBrand = await newBrand.save();
    sendCreatedResponse(res, "Tạo thương hiệu thành công", savedBrand);
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo thương hiệu",
      error
    );
  }
};

const updateBrand = async (req, res) => {
  try {
    const { id } = req.params;

    const updateData = req.body;

    if (updateData.name) {
      updateData.slug = createSlug(updateData.name);
      const existingBrand = await Brand.findOne({
        slug: updateData.slug,
        isDeleted: false,
        _id: { $ne: id },
      });
      if (existingBrand) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Thương hiệu đã tồn tại"
        );
      }
    }

    const updatedBrand = await Brand.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedBrand) {
      return sendNotFoundResponse(res, "Không tìm thấy thương hiệu");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật thương hiệu thành công",
      updatedBrand
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật thương hiệu",
      error
    );
  }
};

const deleteBrand = async (req, res) => {
  try {
    const { id } = req.params;
    const deletedBrand = await Brand.findById(id);
    if (!deletedBrand) {
      return sendNotFoundResponse(res, "Không tìm thấy thương hiệu");
    }
    const result = await Brand.findByIdAndUpdate(
      id,
      {
        isDeleted: true,
        name: deletedName(deletedBrand.name),
        slug: deletedName(deletedBrand.slug),
      },
      { new: true }
    );
    if (!result) {
      return sendNotFoundResponse(res, "Không tìm thấy thương hiệu");
    }
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Xóa thương hiệu thành công",
      result
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa thương hiệu",
      error
    );
  }
};

const getBrandBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const brand = await Brand.findOne({ slug, isDeleted: false });

    if (!brand) {
      return sendNotFoundResponse(res, "Không tìm thấy thương hiệu");
    }

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin thương hiệu thành công",
      brand
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin thương hiệu theo slug",
      error
    );
  }
};

export default {
  getBrandById,
  createBrand,
  getAllBrands,
  updateBrand,
  deleteBrand,
  getBrandBySlug,
};
