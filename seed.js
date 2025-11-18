// File này dùng để khởi tạo dữ liệu mẫu cho database
// Chạy file này bằng lệnh: npm run seed
import mongoose from "mongoose";
import dotenv from "dotenv";
// Models
import Category from "./models/category.model.js";
import Brand from "./models/brand.model.js";
//
dotenv.config();
const categories = [
  { name: "bếp từ", imageUrl: "https://example.com/bep-tu.jpg" },
  { name: "máy rửa bát", imageUrl: "https://example.com/may-rua-bat.jpg" },
  { name: "máy sấy", imageUrl: "https://example.com/may-say.jpg" },
  { name: "tủ lạnh", imageUrl: "https://example.com/tu-lanh.jpg" },
  { name: "máy xay", imageUrl: "https://example.com/may-xay.jpg" },
  { name: "nồi cơm điện", imageUrl: "https://example.com/noi-com-dien.jpg" },
];
const brands = [
  {
    name: "Bosch",
    imageUrl: "https://example.com/bosch.jpg",
    categoryIds: ["68037c1478bb72bebf5f1500", "68037c1478bb72bebf5f1501"], // máy sấy, tủ lạnh
  },
  {
    name: "Electrolux",
    imageUrl: "https://example.com/electrolux.jpg",
    categoryIds: ["68037c1478bb72bebf5f1500", "68037c1478bb72bebf5f1501"], // máy sấy, tủ lạnh
  },
  {
    name: "Panasonic",
    imageUrl: "https://example.com/panasonic.jpg",
    categoryIds: ["68037c1478bb72bebf5f1502", "68037c1478bb72bebf5f1503"], // máy xay, nồi cơm điện
  },
  {
    name: "LG",
    imageUrl: "https://example.com/lg.jpg",
    categoryIds: ["68037c1478bb72bebf5f1500", "68037c1478bb72bebf5f1501"], // máy sấy, tủ lạnh
  },
  {
    name: "Samsung",
    imageUrl: "https://example.com/samsung.jpg",
    categoryIds: ["68037c1478bb72bebf5f1501"], // tủ lạnh
  },
  {
    name: "Sony",
    imageUrl: "https://example.com/sony.jpg",
    categoryIds: ["68037c1478bb72bebf5f1502"], // máy xay
  },
];

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 50,
    });
    console.log("MongoDB connected");

    // Tạo dữ liệu mới

    //const createdCategories = await Category.insertMany(categories);
    //console.log("Categories seeded:", createdCategories);

    // Tạo dữ liệu mới cho Brand
    // const deletedBrands = await Brand.deleteMany({});
    // const createdBrands = await Brand.insertMany(brands);
    // console.log("Brands seeded:", createdBrands);

    // Đóng kết nối
    await mongoose.connection.close();
  } catch (error) {
    logError(error, req);
    console.error("Error seeding database:", error);
  }
};

seedDatabase();
