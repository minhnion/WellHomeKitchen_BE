import logger from "./logger.js";

export default function logError(error, req) {
  const { method, originalUrl } = req || {};
  const errorMessage = error.message || "Unknown error";
  const statusCode = error.statusCode || 500;

  logger.error(
    {
      type: "error_response",
      statusCode,
      message: errorMessage,
      method,
      url: originalUrl,
      stack: error.stack,
    },
    `❌ Error: ${errorMessage}`
  );
}
