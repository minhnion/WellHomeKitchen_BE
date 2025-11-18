import Comment from "../models/comment.model.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

const createComment = async (req, res) => {
  try {
    const { content, name, author, product, parentComment, idAnonymous } =
      req.body;
    console.log("req.body", req.body);
    const comment = new Comment({
      content,
      name,
      author,
      product,
      parentComment: parentComment || null,
      idAnonymous,
    });
    if (!author && !idAnonymous) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tác giả hoặc ID ẩn danh là bắt buộc"
      );
    }

    if (parentComment) {
      const parentCommentData = await Comment.findById(parentComment);
      if (parentCommentData && parentCommentData.parentComment) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Không thể trả lời một bình luận trả lời"
        );
      }
    }
    await comment.save();
    sendCreatedResponse(res, "Tạo bình luận thành công", comment);
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Lỗi khi tạo bình luận",
      error
    );
  }
};

const getCommentsByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const { page, limit } = req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;

    const commentsQuery = Comment.find({
      product: productId,
      parentComment: null,
    })
      .populate("author", "name")
      .select("content name author parentComment createdAt")
      .sort({ createdAt: -1 });

    if (pageNum && limitNum) {
      commentsQuery.skip((pageNum - 1) * limitNum).limit(limitNum);
    }

    const filter = { product: productId, parentComment: null };

    const [comments, totalComments] = await Promise.all([
      commentsQuery.exec(),
      Comment.countDocuments(filter),
    ]);

    if (!comments || comments.length === 0) {
      return sendNotFoundResponse(
        res,
        "Không tìm thấy bình luận nào cho sản phẩm này"
      );
    }

    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replies = await Comment.find({
          parentComment: comment._id,
        })
          .populate("author", "name")
          .select("content name author parentComment createdAt")
          .sort({ createdAt: -1 });
        return {
          ...comment.toObject(),
          replies,
        };
      })
    );

    const paginationDetails = {
      currentPage: pageNum || 1,
      totalPages: limitNum ? Math.ceil(totalComments / limitNum) : 1,
      totalComments,
      limit: limitNum || totalComments,
    };
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách bình luận thành công",
      commentsWithReplies,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách bình luận",
      error
    );
  }
};

const getCommentById = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findById(id)
      .populate("author", "name")
      .populate("parentComment")
      .select("content name author parentComment createdAt");

    if (!comment) {
      return sendNotFoundResponse(res, "Không tìm thấy bình luận");
    }

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin bình luận thành công",
      comment
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin bình luận",
      error
    );
  }
};

const updateCommentByAuthor = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const comment = await Comment.findById(id);

    const userId = req.user._id;

    if (!comment) {
      return sendNotFoundResponse(res, "Không tìm thấy bình luận");
    }

    if (comment.author.toString() !== userId) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền cập nhật bình luận này"
      );
    }

    comment.content = content;
    await comment.save();

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật bình luận thành công",
      comment
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Lỗi khi cập nhật bình luận",
      error
    );
  }
};

const updateCommentByAnonymous = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const comment = await Comment.findById(id);

    if (!comment) {
      return sendNotFoundResponse(res, "Không tìm thấy bình luận");
    }

    if (comment.idAnonymous !== req.body.idAnonymous) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        "Bạn không có quyền cập nhật bình luận này"
      );
    }

    comment.content = content;
    await comment.save();

    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật bình luận thành công",
      comment
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Lỗi khi cập nhật bình luận",
      error
    );
  }
};

const deleteComment = async (req, res) => {
  try {
    const { id } = req.params;
    const comment = await Comment.findByIdAndDelete(id);

    if (!comment) {
      return sendNotFoundResponse(res, "Không tìm thấy bình luận");
    }

    sendSuccessResponse(res, StatusCodes.OK, "Xóa bình luận thành công");
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa bình luận",
      error
    );
  }
};

export {
  createComment,
  getCommentsByProduct,
  getCommentById,
  updateCommentByAuthor,
  updateCommentByAnonymous,
  deleteComment,
};
