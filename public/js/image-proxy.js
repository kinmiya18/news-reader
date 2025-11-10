/**
 * Image Proxy Handler
 * Replaces all image URLs from VnExpress with proxy URLs
 */

document.addEventListener('DOMContentLoaded', function() {
  // Tìm tất cả img tags
  const images = document.querySelectorAll('img');
  
  images.forEach(img => {
    const src = img.getAttribute('src');
    
    // Nếu là URL từ VnExpress, thay bằng proxy
    if (src && (src.includes('vnexpress.net') || src.includes('vne.co'))) {
      const proxyUrl = `/news/image-proxy?url=${encodeURIComponent(src)}`;
      img.setAttribute('src', proxyUrl);
      
      // Thêm error handler nếu proxy fail
      img.addEventListener('error', function() {
        console.error('Failed to load image via proxy:', src);
        // Có thể thay bằng placeholder nếu cần
        this.style.display = 'none';
      });
    }
  });
});
