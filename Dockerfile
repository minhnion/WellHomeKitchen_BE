# ===== Base image =====
FROM node:18-alpine

# ===== Set working directory =====
WORKDIR /app

# ===== Copy package files first (for better cache) =====
COPY package.json package-lock.json ./

# ===== Install dependencies (production only) =====
RUN npm ci --omit=dev

# ===== Copy source code =====
COPY . .

# ===== Expose port (match PORT in .env) =====
EXPOSE 4000

# ===== Set environment =====
ENV NODE_ENV=production

# ===== Start server =====
CMD ["node", "server.js"]
