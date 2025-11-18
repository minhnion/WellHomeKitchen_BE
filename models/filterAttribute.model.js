import mongoose, { Schema } from "mongoose";

const filterAttributeSchema = new mongoose.Schema(
  {
    categoryId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    attributes: [
      {
        key: { type: String, required: true },
        values: [{ type: String }],
      },
    ],
  },
  { timestamps: true }
);

const FilterAttribute = mongoose.model(
  "FilterAttribute",
  filterAttributeSchema
);
export default FilterAttribute;
