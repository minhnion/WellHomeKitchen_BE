import Review from "../models/review.model.js";
import Product from "../models/product.model.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user._id;

    if (!productId || !rating) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "ID sản phẩm và đánh giá là bắt buộc"
      );
    }

    if (rating < 1 || rating > 5) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Đánh giá phải từ 1 đến 5 sao"
      );
    }

    // Kiểm tra sản phẩm có tồn tại không
    const product = await Product.findById(productId);
    if (!product) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm");
    }

    // Kiểm tra người dùng đã đánh giá sản phẩm này chưa
    const existingReview = await Review.findOne({ productId, userId });
    if (existingReview) {
      return sendErrorResponse(
        res,
        StatusCodes.CONFLICT,
        "Bạn đã đánh giá sản phẩm này rồi"
      );
    }

    // Cập nhật số lượng đánh giá và điểm trung bình của sản phẩm
    product.numberOfReviews += 1;
    product.starAverage =
      (product.starAverage * (product.numberOfReviews - 1) + rating) /
      product.numberOfReviews;
    await product.save();

    const newReview = new Review({
      productId,
      userId,
      rating,
      comment,
    });

    await newReview.save();

    sendCreatedResponse(res, "Tạo đánh giá thành công", newReview);
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo đánh giá",
      error
    );
  }
};

const getReviewsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 10, rating } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { productId };
    if (rating) {
      filter.rating = parseInt(rating);
    }

    const reviews = await Review.find(filter)
      .populate("userId", "userName")
      .select("rating comment createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalReviews = await Review.countDocuments(filter);

    if (!reviews || reviews.length === 0) {
      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Chưa có đánh giá nào cho sản phẩm này",
        [],
        {
          currentPage: parseInt(page),
          totalPages: 0,
          totalReviews: 0,
          limit: parseInt(limit),
        }
      );
    }

    const totalPages = Math.ceil(totalReviews / limit);
    const paginationDetails = {
      currentPage: parseInt(page),
      totalPages,
      totalReviews,
      limit: parseInt(limit),
    };

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách đánh giá thành công",
      reviews,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách đánh giá",
      error
    );
  }
};

const getReviewsByUser = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const reviews = await Review.find({ userId })
      .populate("productId", "name mainImage")
      .select("rating comment createdAt")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const totalReviews = await Review.countDocuments({ userId });

    if (!reviews || reviews.length === 0) {
      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Bạn chưa có đánh giá nào",
        [],
        {
          currentPage: parseInt(page),
          totalPages: 0,
          totalReviews: 0,
          limit: parseInt(limit),
        }
      );
    }

    const totalPages = Math.ceil(totalReviews / limit);
    const paginationDetails = {
      currentPage: parseInt(page),
      totalPages,
      totalReviews,
      limit: parseInt(limit),
    };

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách đánh giá của bạn thành công",
      reviews,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách đánh giá của người dùng",
      error
    );
  }
};

const getReviewById = async (req, res) => {
  try {
    const { id } = req.params;
    const review = await Review.findById(id)
      .populate("userId", "userName")
      .populate("productId", "name mainImage");

    if (!review) {
      return sendNotFoundResponse(res, "Không tìm thấy đánh giá");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin đánh giá thành công",
      review
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin đánh giá",
      error
    );
  }
};

const updateReview = async (req, res) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user._id;

    if (rating && (rating < 1 || rating > 5)) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Đánh giá phải từ 1 đến 5 sao"
      );
    }

    const review = await Review.findById(id);
    if (!review) {
      return sendNotFoundResponse(res, "Không tìm thấy đánh giá");
    }
    // Cập nhật số lượng đánh giá và điểm trung bình của sản phẩm
    const product = await Product.findById(review.productId);
    if (!product) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm liên quan");
    }
    // Nếu rating được cập nhật, tính lại điểm trung bình

    // Kiểm tra quyền sở hữu
    if (review.userId.toString() !== userId.toString()) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền cập nhật đánh giá này"
      );
    }

    if (rating) {
      // Cập nhật số lượng đánh giá và điểm trung bình của sản phẩm
      product.starAverage =
        (product.starAverage * product.numberOfReviews -
          review.rating +
          rating) /
        product.numberOfReviews;
      review.rating = rating; // Cập nhật rating trong review
    }

    const updatedReview = await Review.findByIdAndUpdate(
      id,
      { rating, comment },
      { new: true, runValidators: true }
    )
      .populate("userId", "userName")
      .populate("productId", "name");

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật đánh giá thành công",
      updatedReview
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật đánh giá",
      error
    );
  }
};

const deleteReview = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id;

    const review = await Review.findById(id);
    if (!review) {
      return sendNotFoundResponse(res, "Không tìm thấy đánh giá");
    }

    // Kiểm tra quyền sở hữu (hoặc admin có thể xóa)
    if (
      review.userId.toString() !== userId.toString() &&
      req.user.role !== "admin"
    ) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền xóa đánh giá này"
      );
    }
    // Cập nhật số lượng đánh giá và điểm trung bình của sản phẩm
    const product = await Product.findById(review.productId);
    if (!product) {
      return sendNotFoundResponse(res, "Không tìm thấy sản phẩm liên quan");
    }
    product.numberOfReviews -= 1;
    if (product.numberOfReviews > 0) {
      product.starAverage =
        (product.starAverage * (product.numberOfReviews + 1) - review.rating) /
        product.numberOfReviews;
    } else {
      product.starAverage = 0;
    }
    await product.save();

    await Review.findByIdAndDelete(id);

    sendSuccessResponse(res, StatusCodes.OK, "Xóa đánh giá thành công");
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa đánh giá",
      error
    );
  }
};

export default {
  createReview,
  getReviewsByProduct,
  getReviewsByUser,
  getReviewById,
  updateReview,
  deleteReview,
};
