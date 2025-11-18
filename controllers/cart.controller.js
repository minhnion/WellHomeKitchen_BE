import { StatusCodes } from "http-status-codes";
import Cart from "../models/cart.model.js";
import {
  sendErrorResponse,
  sendSuccessResponse,
} from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import Product from "../models/product.model.js";

const addItemToCart = async (req, res) => {
  const userId = req.user._id;
  const { productId, quantity = 1 } = req.body;

  try {
    const product = await Product.findById(productId);

    if (!product) {
      return sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        "Không tìm thấy sản phẩm"
      );
    }

    let cart = await Cart.findOne({ user: userId });

    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const idx = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );

    let totalQuantity;

    if (idx >= 0) {
      totalQuantity = cart.items[idx].quantity + quantity;
      cart.items[idx].quantity = totalQuantity;
    } else {
      totalQuantity = quantity;
      cart.items.push({ product: productId, quantity });
    }

    await cart.save();
    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Thêm sản phẩm vào giỏ hàng thành công",
      {
        product: product.name,
        totalQuantityInCart: totalQuantity,
      }
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi hệ thống khi thêm sản phẩm vào giỏ hàng",
      error
    );
  }
};

const getCartDetail = async (req, res) => {
  const userId = req.user._id;
  const { selectedProduct = [] } = req.body;

  try {
    const cart = await Cart.findOne({ user: userId }).populate(
      "items.product",
      "name price discountPercent mainImage"
    );

    if (!cart || cart.items.length === 0) {
      return sendSuccessResponse(res, StatusCodes.OK, "Giỏ hàng trống", {
        items: [],
        totalItemsSelected: 0,
        originalTotalSelected: 0,
        discountedTotalSelected: 0,
        totalSavingsSelected: 0,
      });
    }

    // remove duplicate items
    const productMap = new Map();
    cart.items.forEach((item) => {
      const productId = item.product._id.toString();
      if (productMap.has(productId)) {
        const existingQuantity = productMap.get(productId).quantity;
        if (item.quantity > existingQuantity) {
          productMap.set(productId, item);
        }
      } else {
        productMap.set(productId, item);
      }
    });
    cart.items = Array.from(productMap.values());

    const items = cart.items.map((item) => {
      const prod = item.product;
      const qty = item.quantity;
      const price = prod.price;
      const discount = prod.discountPercent;
      const discountedPrice = price * (1 - discount / 100);

      return {
        productId: prod._id.toString(),
        name: prod.name,
        price,
        mainImage: prod.mainImage,
        discountPercent: discount,
        discountedPrice,
        quantity: qty,
        subtotalOriginal: price * qty,
        subtotalDiscounted: discountedPrice * qty,
      };
    });

    const selSet = new Set(selectedProduct.map((id) => id.toString()));
    const picked = items.filter((item) => selSet.has(item.productId));

    const totalItemsSelected = picked.reduce(
      (sum, item) => sum + item.quantity,
      0
    );

    const originalTotalSelected = picked.reduce(
      (sum, item) => sum + item.subtotalOriginal,
      0
    );

    const discountedTotalSelected = picked.reduce(
      (sum, it) => sum + it.subtotalDiscounted,
      0
    );

    const totalSavingsSelected =
      originalTotalSelected - discountedTotalSelected;

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Lấy chi tiết giỏ hàng thành công",
      {
        items,
        totalItemsSelected,
        originalTotalSelected,
        discountedTotalSelected,
        totalSavingsSelected,
      }
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi hệ thống khi lấy chi tiết giỏ hàng",
      error
    );
  }
};

const updateCartItemQuantity = async (req, res) => {
  const userId = req.user._id;
  const { itemId } = req.params;
  const { quantity } = req.body;

  try {
    if (quantity === null || quantity < 1) {
      return sendErrorResponse(
        res,
        StatusCodes.BAD_REQUEST,
        "Số lượng phải ít nhất là 1"
      );
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = new Cart({ user: userId, items: [] });
    }

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === itemId.toString()
    );

    if (itemIndex === -1) {
      cart.items.push({ product: itemId, quantity });
      await cart.save();
      return sendSuccessResponse(
        res,
        StatusCodes.OK,
        "Thêm sản phẩm vào giỏ hàng thành công",
        {
          productId: itemId,
          quantity: quantity,
        }
      );
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Cập nhật số lượng sản phẩm thành công",
      {
        productId: itemId,
        quantity: quantity,
      }
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi hệ thống khi cập nhật số lượng sản phẩm",
      error
    );
  }
};

const deleteItemsFromCart = async (req, res) => {
  const userId = req.user._id;
  const { productIds = [] } = req.body;

  if (!Array.isArray(productIds) || productIds.length === 0) {
    return sendErrorResponse(
      res,
      StatusCodes.BAD_REQUEST,
      "Không có ID sản phẩm nào được cung cấp"
    );
  }

  try {
    const cart = await Cart.findOne({ user: userId });
    if (!cart) {
      return sendErrorResponse(
        res,
        StatusCodes.NOT_FOUND,
        "Không tìm thấy giỏ hàng"
      );
    }

    cart.items = cart.items.filter(
      (item) => !productIds.includes(item.product.toString())
    );
    await cart.save();

    return sendSuccessResponse(
      res,
      StatusCodes.OK,
      "Xóa sản phẩm khỏi giỏ hàng thành công",
      {
        remainingItems: cart.items.length,
      }
    );
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Lỗi hệ thống khi xóa sản phẩm khỏi giỏ hàng",
      error
    );
  }
};

export default {
  addItemToCart,
  getCartDetail,
  updateCartItemQuantity,
  deleteItemsFromCart,
};
