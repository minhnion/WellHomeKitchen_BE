import mongoose from "mongoose";
const { Schema } = mongoose;

const labelSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    colorBg: {
      type: String,
      default: "#3498db",
      trim: true,
    },
    colorText: {
      type: String,
      required: true,
      default: "#ffffff",
      trim: true,
    },
    icon: {
      type: Number,
    },
    specialBackground: {
      type: Number,
    },

    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model("Label", labelSchema);
