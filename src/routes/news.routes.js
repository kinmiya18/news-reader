const express = require('express');
const router = express.Router();
const newsController = require('../controllers/news.controller');

// Trang chủ
router.get('/', newsController.getHomePage);

// Trang category
router.get('/category/:category', newsController.getNewsByCategory);

// Chi tiết bài viết
router.get('/detail/:id', newsController.getNewsDetail);

// Tìm kiếm
router.get('/search', newsController.searchNews);

// API để trigger crawl tin tức
router.post('/crawl', newsController.crawlNews);
router.get('/crawl', newsController.crawlNews); // Thêm route GET để dễ test

// Proxy để lấy ảnh từ VnExpress với header đúng
router.get('/image-proxy', newsController.imageProxy);

module.exports = router;