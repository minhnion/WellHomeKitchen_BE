import Post from "../models/post.model.js";
import PostCategory from "../models/postCategory.model.js";
import { createSlug } from "../utils/helpers.js";
import {
  getDescendantCategoryIds,
  getPostCategoryPath,
} from "../utils/postCategoryTree.js";
import { StatusCodes } from "http-status-codes";
import {
  sendSuccessResponse,
  sendCreatedResponse,
  sendErrorResponse,
  sendNotFoundResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";

const createPost = async (req, res) => {
  try {
    const { title, postCategory } = req.body;
    if (!title) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Tiêu đề là bắt buộc"
      );
    }

    if (!postCategory) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Danh mục bài viết là bắt buộc"
      );
    }

    const slug = createSlug(title);
    const existingPost = await Post.findOne({
      slug: slug,
    });
    if (existingPost) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Bài viết đã tồn tại"
      );
    }

    const category = await PostCategory.findById(postCategory);
    if (!category) {
      return sendNotFoundResponse(res, "Không tìm thấy danh mục bài viết");
    }

    const newPost = new Post({
      ...req.body,
      slug: createSlug(title),
      postCategory,
    });
    const savedPost = await newPost.save();
    const { categories } = await getPostCategoryPath(savedPost.postCategory);
    sendCreatedResponse(res, "Tạo bài viết thành công", {
      ...savedPost._doc,
      categoryHierarchy: categories,
    });
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi tạo bài viết",
      error
    );
  }
};

const getPosts = async (req, res) => {
  try {
    const { page, limit, status, postCategory, keyword } = req.query;
    const pageNum = page ? Number(page) : undefined;
    const limitNum = limit ? Number(limit) : undefined;

    const filter = {};
    if (status) {
      filter.status = status;
    }
    if (keyword && keyword.trim() !== "") {
      filter.slug = {
        $regex: createSlug(keyword),
        $options: "i",
      };
    }
    if (postCategory) {
      const category = await PostCategory.findById(postCategory);
      if (!category) {
        return sendNotFoundResponse(res, "Không tìm thấy danh mục bài viết");
      }
      const descendantIds = await getDescendantCategoryIds(postCategory);
      filter.postCategory = { $in: descendantIds };
    }

    const postQuery = Post.find(filter)
      .populate("postCategory", "name slug parent")
      .sort({ createdAt: -1 });
    if (pageNum && limitNum) {
      const skip = (pageNum - 1) * limit;
      postQuery.skip(skip).limit(limitNum);
    }
    const [posts, totalPosts] = await Promise.all([
      postQuery.exec(),
      Post.countDocuments(filter),
    ]);

    if (!posts?.length) {
      return sendNotFoundResponse(res, "Không tìm thấy bài viết nào");
    }

    const postsWithCategoryHierarchy = await Promise.all(
      posts.map(async (post) => {
        const { categories } = await getPostCategoryPath(post.postCategory._id);
        return { ...post._doc, categoryHierarchy: categories };
      })
    );

    const paginationDetails = {
      currentPage: pageNum || 1,
      totalPages: limitNum ? Math.ceil(totalPosts / limitNum) : 1,
      totalPosts,
      limit: limitNum || totalPosts,
    };
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy danh sách bài viết thành công",
      postsWithCategoryHierarchy,
      paginationDetails
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy danh sách bài viết",
      error
    );
  }
};

const getPostBySlug = async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug }).populate(
      "postCategory",
      "name slug parent"
    );
    if (!post) {
      return sendNotFoundResponse(res, "Không tìm thấy bài viết");
    }
    const { categories } = await getPostCategoryPath(post.postCategory._id);
    sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thông tin bài viết thành công",
      {
        ...post._doc,
        categoryHierarchy: categories,
      }
    );
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thông tin bài viết",
      error
    );
  }
};

const updatePost = async (req, res) => {
  try {
    const { title, postCategory } = req.body;
    const updateData = { ...req.body };

    const currentPost = await Post.findOne({ slug: req.params.slug });
    if (!currentPost) {
      return sendNotFoundResponse(res, "Không tìm thấy bài viết");
    }

    if (title) {
      updateData.slug = createSlug(title);
      const existingPost = await Post.findOne({
        slug: updateData.slug,
        _id: { $ne: currentPost._id },
      });
      if (existingPost) {
        return sendErrorResponse(
          res,
          StatusCodes.BAD_REQUEST,
          "Bài viết đã tồn tại"
        );
      }
    }
    if (postCategory) {
      const category = await PostCategory.findById(postCategory);
      if (!category) {
        return sendNotFoundResponse(res, "Không tìm thấy danh mục bài viết");
      }
      updateData.postCategory = postCategory;
    }

    const updatedPost = await Post.findOneAndUpdate(
      { slug: req.params.slug },
      updateData,
      { new: true }
    ).populate("postCategory", "name slug parent");

    if (!updatedPost) {
      return sendNotFoundResponse(res, "Không tìm thấy bài viết");
    }
    const { categories } = await getPostCategoryPath(
      updatedPost.postCategory._id
    );
    sendSuccessResponse(res, StatusCodes.OK, "Cập nhật bài viết thành công", {
      ...updatedPost._doc,
      categoryHierarchy: categories,
    });
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi cập nhật bài viết",
      error
    );
  }
};

const deletePost = async (req, res) => {
  try {
    const deletedPost = await Post.findOneAndDelete({ slug: req.params.slug });
    if (!deletedPost) {
      return sendNotFoundResponse(res, "Không tìm thấy bài viết");
    }
    sendSuccessResponse(res, StatusCodes.OK, "Xóa bài viết thành công");
  } catch (error) {
    logError(error, req);
    sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi xóa bài viết",
      error
    );
  }
};

const getPostStatistics = async (req, res) => {
  try {
    const [totalPosts, publishedPosts, draftPosts] = await Promise.all([
      Post.countDocuments(),
      Post.countDocuments({ status: "published" }),
      Post.countDocuments({ status: "draft" }),
    ]);

    const stats = {
      totalPosts,
      publishedPosts,
      draftPosts,
    };

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy thống kê bài viết thành công",
      stats
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi khi lấy thống kê bài viết",
      error
    );
  }
};

export default {
  createPost,
  getPosts,
  getPostBySlug,
  updatePost,
  deletePost,
  getPostStatistics,
};
