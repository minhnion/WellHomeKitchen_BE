import { verifyAccessToken } from "../utils/jwt.js";
import User from "../models/user.model.js";
import { sendErrorResponse } from "../utils/responseUtils.js";
import logError from "../utils/loggerError.js";
import { StatusCodes } from "http-status-codes";

export const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return sendErrorResponse(
      res,
      StatusCodes.UNAUTHORIZED,
      "Access denied. No token provided."
    );
  }

  const token = authHeader.split(" ")[1];

  // Verify token
  const decoded = verifyAccessToken(token);
  if (!decoded) {
    return sendErrorResponse(
      res,
      StatusCodes.UNAUTHORIZED,
      "Invalid or expired token."
    );
  }

  try {
    const user = await User.findById(decoded.id).select("-password");
    if (!user) {
      return sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "User not found."
      );
    }

    req.user = user;
    next();
  } catch (error) {
    logError(error, req);
    return sendErrorResponse(
      res,
      StatusCodes.INTERNAL_SERVER_ERROR,
      "Server error during authentication.",
      err
    );
  }
};

//check is Admin?
export const authorizeAdmin = (req, res, next) => {
  if (!req.user) {
    return sendErrorResponse(
      res,
      StatusCodes.UNAUTHORIZED,
      "Access denied. Not authenticated."
    );
  }

  if (req.user.role !== "admin") {
    return sendErrorResponse(
      res,
      StatusCodes.FORBIDDEN,
      "Access denied. Admin privileges required."
    );
  }

  next();
};

export const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return sendErrorResponse(
        res,
        StatusCodes.UNAUTHORIZED,
        "Access denied. Not authenticated."
      );
    }

    if (!allowedRoles.includes(req.user.role)) {
      return sendErrorResponse(
        res,
        StatusCodes.FORBIDDEN,
        `Access denied. Required role: ${allowedRoles.join(", ")}.`
      );
    }
    next();
  };
};
