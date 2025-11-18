import mongoose, { Schema } from "mongoose";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
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

    description: {
      type: String,
      trim: true,
      default: "",
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price must be a positive number"],
    },

    discountPercent: {
      type: Number,
      default: 0,
      min: [0, "Discount percent cannot be negative"],
      max: [100, "Discount percent cannot exceed 100"],
    },

    quantitySold: {
      type: Number,
      default: 0,
      min: [0, "Quantity sold cannot be negative"],
    },

    sku: {
      type: String,
      required: [true, "SKU is required"],
      unique: true,
      trim: true,
    },

    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Product category is required"],
      index: true,
    },

    subCategory: {
      type: Schema.Types.ObjectId,
      ref: "SubCategory",
      required: [true, "Product SubCategory is required"],
      index: true,
    },

    brand: {
      type: Schema.Types.ObjectId,
      ref: "Brand",
      required: [true, "Product category is required"],
      index: true,
    },

    mainImage: {
      type: String,
      trim: true,
      required: [true, "Main image is required"],
    },

    galleryImages: [
      {
        type: String,
        trim: true,
      },
    ],

    specifications: [
      {
        key: { type: String, required: true },
        value: { type: String, required: true },
      },
    ],

    introductionContent: [
      {
        type: {
          type: String,
          enum: ["paragraph", "heading", "image", "list"],
        },
        data: mongoose.Schema.Types.Mixed,
      },
    ],

    isSpecial: {
      type: Boolean,
      default: false,
      index: true,
    },
    label: {
      type: Schema.Types.ObjectId,
      ref: "Label",
    },

    isDelete: {
      type: Boolean,
      default: false,
      index: true,
    },
    starAverage: {
      type: Number,
      default: 0,
    },
    numberOfReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

productSchema.index({ slug: 1, isDelete: 1 }, { unique: true });
productSchema.index({ price: 1 });
productSchema.index({ discountPercent: 1 });
productSchema.index({ createdAt: -1 });

const Product = mongoose.model("Product", productSchema);
export default Product;
