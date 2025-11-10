const categoryMap = {
    'thoi-su': 'Thời sự',
    'the-gioi': 'Thế giới',
    'kinh-doanh': 'Kinh doanh',
    'giai-tri': 'Giải trí',
    'the-thao': 'Thể thao'
};

const slugMap = {
    'Thời sự': 'thoi-su',
    'Thế giới': 'the-gioi',
    'Kinh doanh': 'kinh-doanh',
    'Giải trí': 'giai-tri',
    'Thể thao': 'the-thao'
};

function getCategoryName(slug) {
    return categoryMap[slug] || slug;
}

function getSlug(categoryName) {
    return slugMap[categoryName] || categoryName.toLowerCase().replace(/ /g, '-');
}

module.exports = {
    getCategoryName,
    getSlug,
    categoryMap,
    slugMap
};