import mongoose from "mongoose";
const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    parentComment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Comment",
    },
    idAnonymous: {
      type: String,
      trim: true,
      select: false, // This will hide idAnonymous by default
    },
  },
  {
    timestamps: true,
  }
);

commentSchema.pre("find", function () {
  this.sort({ createdAt: -1 });
});

const Comment = mongoose.model("Comment", commentSchema);
export default Comment;
