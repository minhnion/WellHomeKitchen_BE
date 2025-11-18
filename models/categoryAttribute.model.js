import mongoose, { Schema } from "mongoose";

const categoryAttribute = new mongoose.Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    attributes: [String],
  },
  { timestamps: true }
);

const CategoryAttribute = mongoose.model(
  "CategoryAttribute",
  categoryAttribute
);
export default CategoryAttribute;
