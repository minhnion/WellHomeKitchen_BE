import pino from "pino";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logsDir = path.join(__dirname, "../logs");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
  // Thay console.log bằng pino temp (sẽ dùng logger sau khi init)
  console.log("Created logs directory:", logsDir);  // Giữ tạm, hoặc xóa nếu không cần
}

const isDev = process.env.NODE_ENV === "development";

const transports = [
  // File output cho tất cả logs
  {
    target: "pino/file",
    level: "info",
    options: {
      destination: path.join(logsDir, "app.log"),
      mkdir: true,
    },
  },
  // Error logs riêng
  {
    target: "pino/file",
    level: "error",
    options: {
      destination: path.join(logsDir, "error.log"),
      mkdir: true,
    },
  },
];

// Chỉ thêm pino-pretty ở dev
if (isDev) {
  transports.push({
    target: "pino-pretty",
    level: "debug",
    options: {
      colorize: true,
      translateTime: "SYS:standard",
      ignore: "pid,hostname",
      levelFirst: true,
      messageFormat: "{levelLabel} {msg}",
      customLevels: "trace:10,debug:20,info:30,warn:40,error:50,fatal:60",
    },
  });
}

const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    targets: transports,
  },
});

export default logger;