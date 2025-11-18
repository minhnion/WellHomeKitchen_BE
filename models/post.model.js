import mongoose from "mongoose";

const PostSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    slug: {
      type: String,
      unique: true,
      required: true,
    },
    excerpt: String,
    coverImage: String,
    author: {
      _id: mongoose.Schema.Types.ObjectId,
      name: String,
    },
    tags: [String],
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
    },
    content: [
      {
        type: {
          type: String,
          enum: ["paragraph", "heading", "image", "list"],
        },
        data: mongoose.Schema.Types.Mixed,
      },
    ],
    postCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PostCategory",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model("Post", PostSchema);
