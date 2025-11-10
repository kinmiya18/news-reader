// Helper functions

/**
 * Tạo URL proxy cho ảnh
 * @param {string} imageUrl - URL ảnh gốc
 * @returns {string} URL proxy
 */
function getImageProxyUrl(imageUrl) {
  if (!imageUrl) {
    return '/images/placeholder.jpg';
  }

  // Nếu đã là URL proxy, trả về nguyên
  if (imageUrl.includes('/news/image-proxy')) {
    return imageUrl;
  }

  // Nếu là URL từ VnExpress, tạo proxy
  if (imageUrl.includes('vnexpress.net') || imageUrl.includes('vne.co')) {
    return `/news/image-proxy?url=${encodeURIComponent(imageUrl)}`;
  }

  // Nếu là URL khác, trả về như cũ (có thể sẽ bị CORS)
  return imageUrl;
}

module.exports = {
  getImageProxyUrl
};
