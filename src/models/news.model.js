const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  summary: {
    type: String
  },
  thumbnail: {
    type: String
  },
  category: {
    type: String,
    required: true,
    index: true
  },
  source: {
    type: String,
    required: true
  },
  sourceUrl: {
    type: String,
    required: true,
    unique: true
  },
  publishedAt: {
    type: Date,
    default: Date.now
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Tạo text index cho tìm kiếm thông minh
newsSchema.index({ 
  title: 'text', 
  content: 'text', 
  summary: 'text',
  category: 'text'
}, {
  weights: {
    title: 10,      // Ưu tiên title cao nhất
    summary: 5,     // Summary ưu tiên thứ 2
    category: 3,    // Category ưu tiên thứ 3
    content: 1      // Content ưu tiên thấp nhất
  },
  default_language: 'english',
  language_override: 'vi'
});

module.exports = mongoose.model('News', newsSchema);