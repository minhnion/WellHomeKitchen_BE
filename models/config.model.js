import mongoose from "mongoose";

const configSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    value: {
      type: String,
      required: true,
    },
    type: {
      type: Number,
      required: true,
    },
    path: {
      type: String,
    },
    other: {
      type: String,
    },
    isView: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Config = mongoose.model("Config", configSchema);
export default Config;
