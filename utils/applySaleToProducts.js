import SaleOccasion from "../models/saleOccasion.model.js";

/**
 * Gắn thông tin sale đang hoạt động vào danh sách sản phẩm
 * @param {Array} products - mongoose documents
 * @returns {Array} products đã gắn sale
 */
export const applySaleToProducts = async (products) => {
    if (!products || products.length === 0) return products;

    const now = new Date();
    const productIds = products.map((p) => p._id);

    // 🔥 Lấy sale đang hoạt động, mỗi product lấy salePercent cao nhất
    const sales = await SaleOccasion.aggregate([
        {
            $match: {
                startAt: { $lte: now },
                endAt: { $gte: now },
                "products.productId": { $in: productIds },
            },
        },
        { $unwind: "$products" },
        {
            $match: {
                "products.productId": { $in: productIds },
            },
        },
        {
            $group: {
                _id: "$products.productId",
                salePercent: { $max: "$products.salePercent" },
            },
        },
    ]);

    // map productId -> salePercent
    const saleMap = {};
    sales.forEach((s) => {
        saleMap[s._id.toString()] = s.salePercent;
    });

    // Gắn sale vào product
    return products.map((p) => {
        const salePercent = saleMap[p._id.toString()] || 0;

        return {
            ...p.toObject(),
            discountPercent: salePercent > 0 ? salePercent : p.discountPercent,
            isInSale: salePercent > 0,

        };
    });
};
