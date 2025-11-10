const axios = require('axios');
const cheerio = require('cheerio');
const News = require('../models/news.model');

class NewsService {
  constructor() {
    this.categories = [
      { url: 'https://vnexpress.net/thoi-su', name: 'Thời sự', pattern: '/thoi-su/' },
      { url: 'https://vnexpress.net/the-gioi', name: 'Thế giới', pattern: '/the-gioi/' },
      { url: 'https://vnexpress.net/kinh-doanh', name: 'Kinh doanh', pattern: '/kinh-doanh/' },
      { url: 'https://vnexpress.net/giai-tri', name: 'Giải trí', pattern: '/giai-tri/' },
      { url: 'https://vnexpress.net/the-thao', name: 'Thể thao', pattern: '/the-thao/' }
    ];
  }

  detectCategory(url) {
    for (const cat of this.categories) {
      if (url.includes(cat.pattern)) {
        return cat.name;
      }
    }
    return 'Khác';
  }

  async crawlVnExpress() {
    try {
      let allArticles = [];

      // Crawl từng chuyên mục
      for (const category of this.categories) {
        console.log(`Crawling category: ${category.name}`);
        const articles = await this.crawlCategory(category);
        allArticles = [...allArticles, ...articles];
        // Đợi 1 giây giữa các request để tránh bị block
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      return allArticles;
    } catch (error) {
      console.error('Error crawling VnExpress:', error);
      return [];
    }
  }

  async crawlCategory({ url, name }) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $ = cheerio.load(response.data);
      const articles = [];

      // Lấy các bài viết từ trang chuyên mục
      $('.item-news').each((i, element) => {
        const $element = $(element);
        const title = $element.find('.title-news a').text().trim();
        const link = $element.find('.title-news a').attr('href');
        
        // Xử lý thumbnail
        let thumbnail = null;
        const $thumb = $element.find('.thumb-art img');
        if ($thumb.length > 0) {
          thumbnail = $thumb.attr('data-src') || $thumb.attr('src');
        }

        const description = $element.find('.description a').text().trim();

        // Xử lý URL của thumbnail
        if (thumbnail) {
          if (thumbnail.startsWith('//')) {
            thumbnail = 'https:' + thumbnail;
          } else if (!thumbnail.startsWith('http')) {
            thumbnail = 'https://vnexpress.net' + thumbnail;
          }
        }

        if (title && link && !link.includes('video') && !link.includes('infographic')) {
          articles.push({
            title,
            sourceUrl: link,
            thumbnail,
            summary: description,
            source: 'VnExpress',
            category: name
          });
        }
      });

      // Lưu vào database
      for (const article of articles) {
        try {
          // Kiểm tra xem bài viết đã tồn tại chưa
          const exists = await News.findOne({ sourceUrl: article.sourceUrl });
          if (!exists) {
            // Crawl nội dung chi tiết
            const content = await this.crawlArticleContent(article.sourceUrl);
            if (content) {
              article.content = content;
              await News.create(article);
              console.log(`Saved article: ${article.title}`);
            }
          }
          // Đợi 500ms giữa các request
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (err) {
          console.error(`Error processing article ${article.sourceUrl}:`, err);
        }
      }

      return articles;
    } catch (error) {
      console.error(`Error crawling category ${name}:`, error);
      return [];
    }
  }

  async crawlArticleContent(url) {
    try {
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });
      const $ = cheerio.load(response.data);
      
      let content = '';
      
      // Lấy description
      const description = $('.description').html();
      if (description) {
        content += '<div class="article-description">' + description + '</div>';
      }

      // Lấy nội dung chính
      $('.fck_detail').each((i, element) => {
        const $element = $(element);
        
        // Xử lý ảnh trong nội dung
        $element.find('img').each((_, img) => {
          const $img = $(img);
          let imgSrc = $img.attr('data-src') || $img.attr('src');
          
          if (imgSrc) {
            if (imgSrc.startsWith('//')) {
              imgSrc = 'https:' + imgSrc;
            } else if (!imgSrc.startsWith('http')) {
              imgSrc = 'https://vnexpress.net' + imgSrc;
            }
            
            $img.attr('src', imgSrc);
            $img.removeAttr('data-src');
            $img.removeAttr('class');
            $img.attr('class', 'img-fluid');
          }
        });

        // Xử lý figure và figcaption
        $element.find('figure').each((_, figure) => {
          const $figure = $(figure);
          $figure.addClass('figure');
          $figure.find('figcaption').addClass('figure-caption text-center');
        });

        // Loại bỏ các phần tử không cần thiết
        $element.find('video, iframe').remove();
        
        content += $element.html();
      });

      return content;
    } catch (error) {
      console.error('Error crawling article content:', error);
      return null;
    }
  }

  async getLatestNews(page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const news = await News.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await News.countDocuments();
      
      return {
        news,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      };
    } catch (error) {
      console.error('Error getting latest news:', error);
      throw error;
    }
  }

  async getNewsByCategory(category, page = 1, limit = 10) {
    try {
      const skip = (page - 1) * limit;
      const query = { category: new RegExp(category, 'i') };
      
      const news = await News.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
      
      const total = await News.countDocuments(query);
      
      return {
        news,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total
      };
    } catch (error) {
      console.error('Error getting news by category:', error);
      throw error;
    }
  }
}

module.exports = new NewsService();