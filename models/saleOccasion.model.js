import mongoose, { Schema } from "mongoose";

const saleProductSchema = new Schema(
  {
    productId: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      unique: true,
      index: true,
    },
    saleQuantity: {
      type: Number,
      required: true,
      min: [0, "Sale quantity cannot be negative"],
    },
    salePercent: {
      type: Number,
      required: true,
      min: [0, "Sale percent cannot be negative"],
      max: [100, "Sale percent cannot exceed 100"],
    },
  },
  { _id: false }
);

const saleOccasionSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, "Product slug is required"],
      unique: true,
      trim: true,
    },
    startAt: {
      type: Date,
      required: true,
      index: true,
    },
    endAt: {
      type: Date,
      required: true,
      index: true,
    },
    products: {
      type: [saleProductSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const SaleOccasion = mongoose.model("SaleOccasion", saleOccasionSchema);
export default SaleOccasion;
