const newsService = require('../services/news.service');
const News = require('../models/news.model');

class NewsController {
  async getHomePage(req, res) {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = 12;
      
      const result = await newsService.getLatestNews(page, limit);
      
      res.render('home', {
        news: result.news,
        currentPage: result.currentPage,
        totalPages: result.totalPages,
        totalItems: result.totalItems
      });
    } catch (error) {
      console.error('Error in getHomePage:', error);
      res.status(500).render('error', { message: 'Internal server error' });
    }
  }

  async getNewsByCategory(req, res) {
    try {
      const { category } = req.params;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      
      // Map slug category về category name
      const categoryMap = {
        'thoi-su': 'Thời sự',
        'the-gioi': 'Thế giới',
        'kinh-doanh': 'Kinh doanh',
        'giai-tri': 'Giải trí',
        'the-thao': 'Thể thao',
        'khoa-hoc': 'Khoa học',
        'suc-khoe': 'Sức khỏe',
        'phap-luat': 'Pháp luật',
        'du-lich': 'Du lịch',
        'oto-xe-may': 'Ô tô - Xe máy'
      };
      
      const categoryName = categoryMap[category] || category;
      
      const { news, currentPage, totalPages, totalItems } = await newsService.getNewsByCategory(categoryName, page);
      
      res.render('category', {
        category,
        categoryName,
        news,
        currentPage,
        totalPages,
        totalItems
      });
    } catch (error) {
      console.error('Error in getNewsByCategory:', error);
      res.status(500).render('error', { message: 'Internal server error' });
    }
  }

  async getNewsDetail(req, res) {
    try {
      const { id } = req.params;
      const newsItem = await News.findById(id);
      
      if (!newsItem) {
        return res.status(404).render('error', { message: 'News not found' });
      }

      // Tăng số lượt xem
      newsItem.views += 1;
      await newsItem.save();

      res.render('detail', { news: newsItem });
    } catch (error) {
      console.error('Error in getNewsDetail:', error);
      res.status(500).render('error', { message: 'Internal server error' });
    }
  }

  async crawlNews(req, res) {
    try {
      const articles = await newsService.crawlVnExpress();
      res.json({
        success: true,
        message: `Crawled ${articles.length} articles successfully`
      });
    } catch (error) {
      console.error('Error in crawlNews:', error);
      res.status(500).json({
        success: false,
        message: 'Error crawling news'
      });
    }
  }

  async searchNews(req, res) {
    try {
      const { q } = req.query;
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = 12;

      if (!q || q.trim().length === 0) {
        return res.render('search', {
          news: [],
          searchQuery: q,
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          message: 'Vui lòng nhập từ khóa tìm kiếm'
        });
      }

      // Tìm kiếm chỉ trong title
      const allNews = await News.find({
        title: { $regex: q, $options: 'i' }
      })
        .sort({ createdAt: -1 })
        .lean();

      const total = allNews.length;
      const totalPages = Math.ceil(total / limit);

      // Kiểm tra page
      let adjustedPage = page;
      if (page > totalPages && totalPages > 0) {
        adjustedPage = totalPages;
      }

      // Phân trang
      const startIndex = (adjustedPage - 1) * limit;
      const endIndex = Math.min(startIndex + limit, total);
      const news = allNews.slice(startIndex, endIndex);

      res.render('search', {
        news,
        searchQuery: q,
        currentPage: adjustedPage,
        totalPages: totalPages || 1,
        totalItems: total
      });
    } catch (error) {
      console.error('Error in searchNews:', error);
      res.status(500).render('error', { message: 'Lỗi tìm kiếm: ' + error.message });
    }
  }

  async imageProxy(req, res) {
    try {
      const axios = require('axios');
      const { url } = req.query;

      if (!url) {
        return res.status(400).json({ error: 'URL parameter required' });
      }

      // Chỉ cho phép lấy ảnh từ VnExpress
      if (!url.includes('vnexpress.net') && !url.includes('vne.co')) {
        return res.status(403).json({ error: 'Only VnExpress images are allowed' });
      }

      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://vnexpress.net/',
          'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
          'Accept-Language': 'vi-VN,vi;q=0.9'
        },
        responseType: 'arraybuffer',
        timeout: 10000
      });

      // Lấy content type từ response
      const contentType = response.headers['content-type'] || 'image/jpeg';
      
      // Cache ảnh trong 7 ngày
      res.set('Content-Type', contentType);
      res.set('Cache-Control', 'public, max-age=604800');
      res.send(response.data);
    } catch (error) {
      console.error('Error in imageProxy:', error.message);
      res.status(500).json({ error: 'Failed to fetch image' });
    }
  }
}

module.exports = new NewsController();