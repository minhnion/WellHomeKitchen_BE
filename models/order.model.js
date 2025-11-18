import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    anonymousId: {
      type: String,
    },
    products: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    userName: {
      type: String,
    },
    userEmail: {
      type: String,
    },
    userPhone: {
      type: String,
    },
    district: {
      type: String,
    },
    address: {
      type: String,
    },
    note: {
      type: String,
    },
    paymentMethod: {
      type: String,
      enum: ["cod", "bank_transfer", "vn_pay", "momo"],
      default: "cod",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    orderCode: {
      type: String,
      required: true,
      unique: true,
    },
    voucher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Voucher",
    },
    shippingFee: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Order", orderSchema);
