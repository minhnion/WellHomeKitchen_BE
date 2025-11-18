import { StatusCodes } from "http-status-codes";
import logger from "./logger.js";

export const sendSuccessResponse = (
  res,
  statusCode = 200,
  message = "Success",
  data = null,
  pagination = null
) => {
  const response = {
    success: true,
    message,
  };

  if (data !== null) {
    if (Array.isArray(data)) {
      response.count = data.length;
    }
    response.data = data;
  }

  if (pagination) {
    response.pagination = pagination;
  }
  return res.status(statusCode).json(response);
};

export const sendCreatedResponse = (
  res,
  message = "Resource created successfully",
  data = null
) => {
  // Log resource creation
  logger.info(
    {
      type: "resource_created",
      message,
      resourceId: data?._id || data?.id,
      method: res.req?.method,
      url: res.req?.originalUrl,
    },
    `🆕 Created: ${message}`
  );

  return sendSuccessResponse(res, StatusCodes.CREATED, message, data);
};

export const sendErrorResponse = (
  res,
  statusCode = 500,
  message = "Error occurred",
  error = null
) => {
  const response = {
    success: false,
    message,
  };

  if (error) {
    if (statusCode >= 500) {
      // Log server errors (5xx)
      logger.error(
        {
          type: "server_error",
          statusCode,
          message,
          error: error.message || error,
          stack: error.stack,
          method: res.req?.method,
          url: res.req?.originalUrl,
          ip: res.req?.ip,
          userAgent: res.req?.get?.("User-Agent"),
        },
        `💥 Server Error: ${message}`
      );

      console.error(`${message}:`, error);
      response.error = error.message;
    } else {
      // Log client errors (4xx)
      logger.warn(
        {
          type: "client_error",
          statusCode,
          message,
          errorDetails: error.errors || error.message || error,
          method: res.req?.method,
          url: res.req?.originalUrl,
          ip: res.req?.ip,
        },
        `⚠️ Client Error: ${message}`
      );

      response.errorDetails = error.errors || error.message;
    }
  } else {
    // Log errors without error object
    if (statusCode >= 500) {
      logger.error(
        {
          type: "server_error",
          statusCode,
          message,
          method: res.req?.method,
          url: res.req?.originalUrl,
        },
        `💥 Server Error: ${message}`
      );
    } else {
      logger.warn(
        {
          type: "client_error",
          statusCode,
          message,
          method: res.req?.method,
          url: res.req?.originalUrl,
        },
        `⚠️ Client Error: ${message}`
      );
    }
  }

  return res.status(statusCode).json(response);
};

export const sendNotFoundResponse = (res, message = "Resource not found") => {
  // Log 404 specifically
  logger.warn(
    {
      type: "not_found",
      statusCode: 404,
      message,
      method: res.req?.method,
      url: res.req?.originalUrl,
      ip: res.req?.ip,
    },
    `🔍 Not Found: ${message}`
  );

  return sendErrorResponse(res, StatusCodes.NOT_FOUND, message);
};

export const sendValidationErrorResponse = (
  res,
  errors,
  message = "Validation failed"
) => {
  logger.warn(
    {
      type: "validation_error",
      statusCode: 400,
      message,
      validationErrors: errors,
      method: res.req?.method,
      url: res.req?.originalUrl,
      ip: res.req?.ip,
    },
    `📝 Validation Error: ${message}`
  );

  return sendErrorResponse(res, StatusCodes.BAD_REQUEST, message, { errors });
};

export const sendUnauthorizedResponse = (
  res,
  message = "Unauthorized access"
) => {
  logger.warn(
    {
      type: "unauthorized",
      statusCode: 401,
      message,
      method: res.req?.method,
      url: res.req?.originalUrl,
      ip: res.req?.ip,
      userAgent: res.req?.get?.("User-Agent"),
    },
    `🔒 Unauthorized: ${message}`
  );

  return sendErrorResponse(res, StatusCodes.UNAUTHORIZED, message);
};

export const sendForbiddenResponse = (res, message = "Access forbidden") => {
  logger.warn(
    {
      type: "forbidden",
      statusCode: 403,
      message,
      method: res.req?.method,
      url: res.req?.originalUrl,
      ip: res.req?.ip,
      userId: res.req?.user?._id,
    },
    `🚫 Forbidden: ${message}`
  );

  return sendErrorResponse(res, StatusCodes.FORBIDDEN, message);
};
