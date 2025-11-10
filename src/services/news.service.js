const axios = require('axios');
const cheerio = require('cheerio');
const https = require('https');
const News = require('../models/news.model');

const axiosInstance = axios.create({
  timeout: 15000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate',  // Loại bỏ 'br' để tránh lỗi 406
    'Connection': 'keep-alive',
    'Referer': 'https://vnexpress.net/',
    'DNT': '1',
  },
  httpAgent: new http.Agent({ keepAlive: true, maxSockets: 50 }),
  httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 50 }),
});

// Thêm retry logic cho 4xx, 5xx errors
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config;
    if (!config || !config.retry) {
      config.retry = 0;
    }
    config.retry += 1;

    // Retry tối đa 3 lần với delay tăng dần
    if (config.retry <= 3 && (error.response?.status === 406 || error.response?.status >= 500)) {
      const delay = config.retry * 1000;
      console.log(`  Retrying (${config.retry}/3) after ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return axiosInstance(config);
    }
    return Promise.reject(error);
  }
);
class NewsService {
  constructor() {
    this.categories = [
      { url: 'https://vnexpress.net/thoi-su', name: 'Thời sự', pattern: '/thoi-su/' },
      { url: 'https://vnexpress.net/the-gioi', name: 'Thế giới', pattern: '/the-gioi/' },
      { url: 'https://vnexpress.net/kinh-doanh', name: 'Kinh doanh', pattern: '/kinh-doanh/' },
      { url: 'https://vnexpress.net/giai-tri', name: 'Giải trí', pattern: '/giai-tri/' },
      { url: 'https://vnexpress.net/the-thao', name: 'Thể thao', pattern: '/the-thao/' },
      { url: 'https://vnexpress.net/khoa-hoc', name: 'Khoa học', pattern: '/khoa-hoc/' },
      { url: 'https://vnexpress.net/suc-khoe', name: 'Sức khỏe', pattern: '/suc-khoe/' },
      { url: 'https://vnexpress.net/phap-luat', name: 'Pháp luật', pattern: '/phap-luat/' },
      { url: 'https://vnexpress.net/du-lich', name: 'Du lịch', pattern: '/du-lich/' },
      { url: 'https://vnexpress.net/oto-xe-may', name: 'Ô tô - Xe máy', pattern: '/oto-xe-may/' }
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
      const pagesPerCategory = 3;

      for (const category of this.categories) {
        console.log(`\nCrawling category: ${category.name}`);
        
        for (let page = 1; page <= pagesPerCategory; page++) {
          console.log(`  - Crawling page ${page}/${pagesPerCategory}`);
          const pageUrl = page === 1 ? category.url : `${category.url}-p${page}`;
          
          const articles = await this.crawlCategory({ 
            url: pageUrl, 
            name: category.name 
          });
          
          allArticles = [...allArticles, ...articles];
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        await new Promise(resolve => setTimeout(resolve, 3000));
      }

      console.log(`\nTotal articles crawled: ${allArticles.length}`);
      return allArticles;
    } catch (error) {
      console.error('Error crawling VnExpress:', error);
      return [];
    }
  }

  async crawlCategory({ url, name }) {
    try {
      console.log(`    Fetching: ${url}`);
      
      const response = await axiosInstance.get(url);  // Sử dụng axiosInstance thay vì axios
      const $ = cheerio.load(response.data);
      const articles = [];

      const selectors = [
        '.item-news',
        'article.item-news',
        '.box-news-item',
        'div[class*="item-news"]'
      ];

      let $items = $();
      for (const selector of selectors) {
        $items = $(selector);
        if ($items.length > 0) {
          console.log(`    Using selector: "${selector}" (found ${$items.length} items)`);
          break;
        }
      }

      if ($items.length === 0) {
        console.log(`    Warning: No items found with any selector`);
        return articles;
      }

      $items.each((i, element) => {
        const $element = $(element);
        
        if ($element.find('[type="VideoStream"]').length > 0) {
          return;
        }

        let title = '';
        let link = '';
        
        const titleSelectors = ['.title-news a', 'h3 a', 'h2 a', 'a.title', '.heading a', 'a[title]'];
        for (const titleSel of titleSelectors) {
          const titleElement = $element.find(titleSel).first();
          if (titleElement.length > 0) {
            title = titleElement.text().trim();
            link = titleElement.attr('href');
            if (title && link) break;
          }
        }
        
        let thumbnail = null;
        const thumbSelectors = ['.thumb-art img', 'img.thumb', 'img', '.image img'];
        for (const thumbSel of thumbSelectors) {
          const $thumb = $element.find(thumbSel).first();
          if ($thumb.length > 0) {
            thumbnail = $thumb.attr('data-src') || $thumb.attr('src') || $thumb.attr('src-set');
            if (thumbnail) break;
          }
        }

        let description = '';
        const descSelectors = ['.description a', '.description', '.summary', 'p'];
        for (const descSel of descSelectors) {
          const desc = $element.find(descSel).first();
          if (desc.length > 0) {
            description = desc.text().trim();
            if (description) break;
          }
        }

        if (thumbnail) {
          if (thumbnail.startsWith('//')) {
            thumbnail = 'https:' + thumbnail;
          } else if (!thumbnail.startsWith('http')) {
            thumbnail = 'https://vnexpress.net' + thumbnail;
          }
          if (thumbnail.includes(' ')) {
            thumbnail = thumbnail.split(' ')[0];
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

      console.log(`    Found ${articles.length} articles`);

      for (const article of articles) {
        try {
          const exists = await News.findOne({ sourceUrl: article.sourceUrl });
          if (!exists) {
            const content = await this.crawlArticleContent(article.sourceUrl);
            if (content) {
              article.content = content;
              await News.create(article);
              console.log(`    ✓ Saved: ${article.title.substring(0, 50)}...`);
            }
          } else {
            console.log(`    ⊘ Already exists: ${article.title.substring(0, 50)}...`);
          }
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (err) {
          console.error(`    Error processing article ${article.sourceUrl}:`, err.message);
        }
      }

      return articles;
    } catch (error) {
      console.error(`Error crawling category ${name} at ${url}:`, error.message);
      return [];
    }
  }

  async crawlArticleContent(url) {
    try {
      const response = await axiosInstance.get(url);  // Sử dụng axiosInstance
      const $ = cheerio.load(response.data);
      
      let content = '';
      
      const description = $('.description, .article-description, .content-detail .description').first().html();
      if (description) {
        content += '<div class="article-description lead">' + description + '</div>';
      }

      $('.fck_detail, .article-content, .content-detail').first().each((i, element) => {
        const $element = $(element);
        
        $element.find('img').each((_, img) => {
          const $img = $(img);
          let imgSrc = $img.attr('data-src') || $img.attr('src') || $img.attr('data-original');
          
          if (imgSrc) {
            if (imgSrc.startsWith('//')) {
              imgSrc = 'https:' + imgSrc;
            } else if (!imgSrc.startsWith('http')) {
              imgSrc = 'https://vnexpress.net' + imgSrc;
            }
            if (imgSrc.includes(' ')) {
              imgSrc = imgSrc.split(' ')[0];
            }
            
            $img.attr('src', imgSrc);
            $img.removeAttr('data-src');
            $img.removeAttr('data-original');
            $img.removeAttr('class');
            $img.attr('class', 'img-fluid');
            $img.attr('loading', 'lazy');
          }
        });

        $element.find('figure').each((_, figure) => {
          const $figure = $(figure);
          $figure.addClass('figure');
          const caption = $figure.find('figcaption, .image_caption');
          if (caption.length) {
            caption.addClass('figure-caption text-center fst-italic');
          }
        });

        $element.find('video, iframe, .box_embed_video, [type="VideoStream"]').remove();
        
        $element.find('a').each((_, link) => {
          const $link = $(link);
          let href = $link.attr('href');
          if (href && !href.startsWith('http')) {
            href = 'https://vnexpress.net' + href;
            $link.attr('href', href);
          }
        });
        
        content += $element.html();
      });

      return content;
    } catch (error) {
      console.error('Error crawling article content:', error.message);
      return null;
    }
  }

  async getLatestNews(page = 1, limit = 12) {
    try {
      page = Math.max(1, parseInt(page));
      
      // Lấy toàn bộ tin tức được sắp xếp
      const allNews = await News.find()
        .sort({ createdAt: -1 })
        .lean();
      
      const total = allNews.length;
      const totalPages = Math.ceil(total / limit);

      // Kiểm tra và điều chỉnh page nếu cần
      if (page > totalPages && totalPages > 0) {
        page = totalPages;
      }

      // Tính vị trí bắt đầu và kết thúc
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, total);
      
      // Lấy chính xác các tin cho trang này
      const news = allNews.slice(startIndex, endIndex);

      return {
        news,
        currentPage: page,
        totalPages: totalPages || 1,
        totalItems: total
      };
    } catch (error) {
      console.error('Error getting latest news:', error);
      throw error;
    }
  }


  async getNewsByCategory(category, page = 1, limit = 12) {
    try {
      page = Math.max(1, parseInt(page));
      const query = { category: category }; // Tìm chính xác category name
      
      // Lấy toàn bộ tin tức của category được sắp xếp
      const allNews = await News.find(query)
        .sort({ createdAt: -1 })
        .lean();
      
      const total = allNews.length;
      const totalPages = Math.ceil(total / limit);

      // Kiểm tra và điều chỉnh page nếu cần
      if (page > totalPages && totalPages > 0) {
        page = totalPages;
      }

      // Tính vị trí bắt đầu và kết thúc
      const startIndex = (page - 1) * limit;
      const endIndex = Math.min(startIndex + limit, total);
      
      // Lấy chính xác các tin cho trang này
      const news = allNews.slice(startIndex, endIndex);

      return {
        news,
        currentPage: page,
        totalPages: totalPages || 1,
        totalItems: total
      };
    } catch (error) {
      console.error('Error getting news by category:', error);
      throw error;
    }
  }
}

module.exports = new NewsService();