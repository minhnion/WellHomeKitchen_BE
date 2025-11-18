import mongoose from "mongoose";

const BannerSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      unique: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
    },
    url: {
      type: String,
      required: true,
    },
    mobileUrl: {
      type: String,
    },
    link: {
      type: String,
      default: "#",
    },
    type: {
      type: String,
      enum: ["slider-full", "slider-part"],
      default: "slider-full",
    },
    priority: {
      type: Number,
    },
    isShow: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Banner = mongoose.model("Banner", BannerSchema);
export default Banner;
