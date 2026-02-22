# WellHomeKitchen - Backend (BE)

Backend API cho dự án WellHomeKitchen, xây dựng bằng **Node.js** + **Express.js**, database **MongoDB**, chạy bằng **Docker**.

---

## Công nghệ sử dụng

- Node.js 18
- Express.js
- MongoDB (local, chạy bằng Docker)
- Mongoose
- Docker & Docker Compose

---

## Cấu trúc thư mục

```
WellHomeKitchen_BE/
├── controllers/        # Xử lý logic cho từng route
├── middlewares/        # Middleware (auth, error handling,...)
├── models/             # Mongoose schema/model
├── routes/             # Định nghĩa các API route
├── utils/              # Hàm tiện ích dùng chung
├── public/             # Static files (ảnh upload,...)
├── logs/               # Log file
├── app.js              # Khởi tạo Express app
├── server.js           # Entry point, khởi động server
├── seed.js             # Seed dữ liệu mẫu
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## Biến môi trường

Tạo file `.env` ở thư mục gốc với nội dung sau:

```dotenv
MONGODB_URI=mongodb://admin:StrongPass2024@mongodb:27017/kitchen-care-pro?authSource=admin
PORT=4000
NODE_ENV=production
ACCESS_TOKEN_SECRET=your_access_token_secret
ACCESS_TOKEN_LIFE=60m
REFRESH_TOKEN_SECRET=your_refresh_token_secret
REFRESH_TOKEN_LIFE=7d
GOOGLE_RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
```

---

## Chạy dự án bằng Docker

### Khởi động lần đầu

```bash
cd WellHomeKitchen_BE
docker compose up -d
```

Lệnh này sẽ khởi động 2 container:
- `wellhomekitchen-mongodb` — MongoDB local chạy ở port 27017
- `wellhomekitchen-be` — API server chạy ở port 4000

### Dừng

```bash
docker compose down
```

### Xem log

```bash
docker logs wellhomekitchen-be --tail=50
```

### Rebuild lại image (khi có thay đổi code)

```bash
docker compose down
docker compose up -d --build
```

---

## Database

### Backup dữ liệu

```bash
docker exec wellhomekitchen-mongodb mongodump \
  --uri="mongodb://admin:StrongPass2024@localhost:27017/?authSource=admin" \
  --out="/backup"
```

Dữ liệu được lưu vào thư mục `/home/Bep_An_Phu/mongodb_backups/` trên VPS.

### Restore dữ liệu

```bash
docker exec wellhomekitchen-mongodb mongorestore \
  --uri="mongodb://admin:StrongPass2024@localhost:27017/?authSource=admin" \
  /backup
```

### Kiểm tra collections trong database

```bash
docker exec -it wellhomekitchen-mongodb mongosh \
  --username admin \
  --password StrongPass2024 \
  --authenticationDatabase admin \
  --eval "use('kitchen-care-pro'); db.getCollectionNames()"
```

---

## API

- Base URL production: `https://bepanphu.vn/api`
- Server chạy nội bộ tại: `http://127.0.0.1:4000`
- Nginx proxy các request `/api/*` vào port 4000

---

## Triển khai (Deploy)

Server đang chạy trên VPS với **aaPanel** + **Nginx** + **Docker**.

Sau khi chỉnh sửa code, để deploy lại:

```bash
cd /home/Bep_An_Phu/WellHomeKitchen_BE
git pull
docker compose down
docker compose up -d --build
```