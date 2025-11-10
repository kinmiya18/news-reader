// Xử lý lazy loading cho ảnh
document.addEventListener('DOMContentLoaded', function() {
    // Chuyển data-src thành src cho các ảnh lazy load
    const lazyImages = document.querySelectorAll('img[data-src]');
    lazyImages.forEach(img => {
        img.src = img.dataset.src;
    });

    // Hiệu ứng hover cho các card tin tức
    const newsCards = document.querySelectorAll('.card');
    newsCards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.transition = 'transform 0.2s ease-in-out';
        });
        
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
        });
    });

    // Hiệu ứng smooth scroll cho các anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
});