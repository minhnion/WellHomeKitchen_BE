import mongoose from "mongoose";

const categorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
    },
    priority: {
      type: Number,
      required: true,
      min: 0,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    imageUrl: {
      type: String,
      required: true,
    },
    bannerUrl: {
      type: String,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

categorySchema.virtual("brands", {
  ref: "Brand",
  localField: "_id",
  foreignField: "categoryIds",
});

categorySchema.virtual("subcategories", {
  ref: "SubCategory",
  localField: "_id",
  foreignField: "categoryId",
});

categorySchema.set("toObject", { virtuals: true });
categorySchema.set("toJSON", { virtuals: true });

categorySchema.index({ slug: 1, isDeleted: 1 }, { unique: true });


const Category = mongoose.model("Category", categorySchema);
export default Category;
