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
      const pagesPerCategory = 3; // Crawl 3 trang mỗi category

      // Crawl từng chuyên mục
      for (const category of this.categories) {
        console.log(`\nCrawling category: ${category.name}`);
        
        // Crawl nhiều trang của category này
        for (let page = 1; page <= pagesPerCategory; page++) {
          console.log(`  - Crawling page ${page}/${pagesPerCategory}`);
          
          // Xây dựng URL cho trang hiện tại
          // Trang 1: https://vnexpress.net/the-gioi
          // Trang 2: https://vnexpress.net/the-gioi-p2
          // Trang 3: https://vnexpress.net/the-gioi-p3
          const pageUrl = page === 1 ? category.url : `${category.url}-p${page}`;
          
          const articles = await this.crawlCategory({ 
            url: pageUrl, 
            name: category.name 
          });
          
          allArticles = [...allArticles, ...articles];
          
          // Đợi 2 giây giữa các request để tránh bị block
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Đợi 3 giây giữa các category
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
      
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive'
        }
      });
      const $ = cheerio.load(response.data);
      const articles = [];

      // Lấy các bài viết từ trang chuyên mục
      // Thử nhiều selector để tìm đủ bài
      const selectors = [
        '.item-news', // Lấy tất cả item-news (bao gồm cả item-news-common)
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
        
        // Bỏ qua các phần tử quảng cáo và video
        if ($element.find('[type="VideoStream"]').length > 0) {
          return;
        }

        // Lấy tiêu đề và link - thử nhiều selectors
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
        
        // Xử lý thumbnail
        let thumbnail = null;
        const thumbSelectors = ['.thumb-art img', 'img.thumb', 'img', '.image img'];
        for (const thumbSel of thumbSelectors) {
          const $thumb = $element.find(thumbSel).first();
          if ($thumb.length > 0) {
            thumbnail = $thumb.attr('data-src') || $thumb.attr('src') || $thumb.attr('src-set');
            if (thumbnail) break;
          }
        }

        // Lấy description
        let description = '';
        const descSelectors = ['.description a', '.description', '.summary', 'p'];
        for (const descSel of descSelectors) {
          const desc = $element.find(descSel).first();
          if (desc.length > 0) {
            description = desc.text().trim();
            if (description) break;
          }
        }

        // Xử lý URL của thumbnail
        if (thumbnail) {
          if (thumbnail.startsWith('//')) {
            thumbnail = 'https:' + thumbnail;
          } else if (!thumbnail.startsWith('http')) {
            thumbnail = 'https://vnexpress.net' + thumbnail;
          }
          // Xử lý srcset nếu có
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
              console.log(`    ✓ Saved: ${article.title.substring(0, 50)}...`);
            }
          } else {
            console.log(`    ⊘ Already exists: ${article.title.substring(0, 50)}...`);
          }
          // Đợi 300ms giữa các request
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
      const response = await axios.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
          'Connection': 'keep-alive'
        }
      });
      const $ = cheerio.load(response.data);
      
      let content = '';
      
      // Lấy description từ cả hai nguồn có thể
      const description = $('.description, .article-description, .content-detail .description').first().html();
      if (description) {
        content += '<div class="article-description lead">' + description + '</div>';
      }

      // Lấy nội dung chính
      $('.fck_detail, .article-content, .content-detail').first().each((i, element) => {
        const $element = $(element);
        
        // Xử lý ảnh trong nội dung
        $element.find('img').each((_, img) => {
          const $img = $(img);
          let imgSrc = $img.attr('data-src') || $img.attr('src') || $img.attr('data-original');
          
          if (imgSrc) {
            if (imgSrc.startsWith('//')) {
              imgSrc = 'https:' + imgSrc;
            } else if (!imgSrc.startsWith('http')) {
              imgSrc = 'https://vnexpress.net' + imgSrc;
            }
            // Xử lý srcset nếu có
            if (imgSrc.includes(' ')) {
              imgSrc = imgSrc.split(' ')[0];
            }
            
            // Sử dụng URL gốc, frontend sẽ xử lý proxy qua helper
            $img.attr('src', imgSrc);
            $img.removeAttr('data-src');
            $img.removeAttr('data-original');
            $img.removeAttr('class');
            $img.attr('class', 'img-fluid');
            $img.attr('loading', 'lazy');
          }
        });

        // Xử lý figure và figcaption
        $element.find('figure').each((_, figure) => {
          const $figure = $(figure);
          $figure.addClass('figure');
          const caption = $figure.find('figcaption, .image_caption');
          if (caption.length) {
            caption.addClass('figure-caption text-center fst-italic');
          }
        });

        // Loại bỏ các phần tử không cần thiết
        $element.find('video, iframe, .box_embed_video, [type="VideoStream"]').remove();
        
        // Xử lý các link trong bài viết
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
      console.error('Error crawling article content:', error);
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