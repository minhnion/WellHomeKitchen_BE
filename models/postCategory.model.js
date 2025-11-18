import mongoose from "mongoose";

const PostCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    parent: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PostCategory",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);


export default mongoose.model("PostCategory", PostCategorySchema);
