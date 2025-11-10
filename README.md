# News Reader - Vietnamese News Aggregator

Ứng dụng tập hợp tin tức từ VnExpress với khả năng tìm kiếm, phân loại và lấy tin tức tự động.

## Tính Năng

- 📰 Lấy tin tức từ 10 chuyên mục của VnExpress
- 🔍 Tìm kiếm tin tức theo từ khóa
- 📁 Phân loại tin tức theo chuyên mục
- 🖼️ Proxy ảnh từ VnExpress (giải quyết lỗi 401 Authorization)
- 💾 Lưu trữ tin tức trong MongoDB
- 🎨 Giao diện web đẹp với Bootstrap 5
- 🐳 Docker & Docker Compose support

## Yêu Cầu

- Docker & Docker Compose (cho deployment)
- Node.js 18+ (cho development)
- MongoDB (nếu chạy locally)

## Cài Đặt Nhanh (Docker Compose)

### 1. Clone Repository
```bash
git clone <repository-url>
cd gk
```

### 2. Tạo file .env
```bash
cp .env.example .env
```

### 3. Chạy với Docker Compose
```bash
docker-compose up --build
```

Ứng dụng sẽ chạy tại `http://localhost:3000`

### 4. Lấy tin tức
Truy cập `http://localhost:3000/news/crawl` để bắt đầu lấy tin tức

## Cài Đặt Development

### 1. Cài Đặt Dependencies
```bash
npm install
```

### 2. Cấu Hình MongoDB
```bash
# Đảm bảo MongoDB đang chạy
# Hoặc sử dụng Docker
docker run -d -p 27017:27017 --name mongodb mongo:7.0-alpine
```

### 3. Tạo file .env
```bash
cp .env.example .env
# Sửa MONGODB_URI nếu cần: mongodb://localhost:27017/news_reader
```

### 4. Chạy Development Server
```bash
npm run dev
```

Server sẽ chạy tại `http://localhost:3000` và tự động reload khi có thay đổi

## Docker Commands

### Build Image
```bash
docker build -t news-reader:latest .
```

### Chạy Container Riêng Lẻ
```bash
# Cần MongoDB đang chạy
docker run -p 3000:3000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/news_reader \
  news-reader:latest
```

### Docker Compose Commands
```bash
# Start services
docker-compose up

# Start in background
docker-compose up -d

# View logs
docker-compose logs -f news-app

# Stop services
docker-compose down

# Remove volumes (xóa database)
docker-compose down -v

# Rebuild image
docker-compose up --build
```

## Cấu Trúc Dự Án

```
gk/
├── src/
│   ├── app.js                 # Main application
│   ├── config/
│   │   └── db.js             # Database connection
│   ├── controllers/
│   │   └── news.controller.js # Route handlers
│   ├── models/
│   │   └── news.model.js      # MongoDB schema
│   ├── routes/
│   │   └── news.routes.js     # API routes
│   ├── services/
│   │   └── news.service.js    # Business logic & crawling
│   ├── utils/
│   │   └── helpers.js         # Helper functions
│   └── views/                 # EJS templates
├── public/
│   ├── css/
│   ├── js/
│   │   └── image-proxy.js     # Client-side image proxy
│   └── images/
├── Dockerfile                 # Docker configuration
├── docker-compose.yml         # Docker Compose setup
├── .dockerignore              # Files to exclude from Docker image
├── .env.example               # Environment variables template
├── package.json               # Dependencies
└── README.md                  # This file
```

## API Endpoints

| Method | Endpoint | Mô Tả |
|--------|----------|-------|
| GET | `/` | Trang chủ |
| GET | `/news/` | Tin tức mới nhất |
| GET | `/news/category/:category` | Tin tức theo chuyên mục |
| GET | `/news/detail/:id` | Chi tiết bài viết |
| GET | `/news/search?q=keyword` | Tìm kiếm tin tức |
| GET | `/news/crawl` | Lấy tin tức từ VnExpress |
| GET | `/news/image-proxy?url=...` | Proxy ảnh từ VnExpress |

## Chuyên Mục

Ứng dụng hỗ trợ lấy tin từ các chuyên mục sau:

- Thời sự
- Thế giới
- Kinh doanh
- Giải trí
- Thể thao
- Khoa học
- Sức khỏe
- Pháp luật
- Du lịch
- Ô tô - Xe máy

## Troubleshooting

### Lỗi: "MongoDB connection refused"
- Đảm bảo MongoDB đang chạy
- Kiểm tra `MONGODB_URI` trong `.env`
- Với Docker Compose: `docker-compose ps`

### Lỗi: "Port 3000 already in use"
```bash
# Đổi PORT trong .env hoặc docker-compose.yml
# Hoặc dừng process chiếm port
lsof -i :3000
kill -9 <PID>
```

### Ảnh không hiển thị (401 Authorization)
- Ứng dụng sử dụng proxy endpoint để lấy ảnh từ VnExpress
- Proxy tự động được xử lý qua `/news/image-proxy`
- Kiểm tra console browser để xem error

### Crawl quá chậm
- Bình thường mất 5-10 phút cho ~90 bài viết
- Có delay giữa requests để tránh block: 300ms/article, 2s/page, 3s/category
- Có thể chạy lại để update tin tức

## Tối Ưu Hóa

### Production Build
```bash
# Build multi-stage image cho kích thước nhỏ hơn
docker build -t news-reader:prod .
```

### Scaling
```bash
# Chạy nhiều instances với nginx load balancer
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up
```

## Environment Variables

| Variable | Default | Mô Tả |
|----------|---------|-------|
| `NODE_ENV` | `production` | Environment mode |
| `PORT` | `3000` | Server port |
| `MONGODB_URI` | Required | MongoDB connection string |
| `LOG_LEVEL` | `info` | Logging level |

## Performance

- **Image Proxy**: Cached 7 ngày
- **Crawl Delay**: 300ms/article, 2s/page, 3s/category
- **Database**: Indexed on `sourceUrl` và `createdAt`

## Liên Lạc & Hỗ Trợ

Nếu gặp vấn đề, vui lòng tạo issue trên GitHub hoặc liên hệ.

## License

MIT License - xem file LICENSE để chi tiết
