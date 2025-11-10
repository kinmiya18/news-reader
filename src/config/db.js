const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/news_reader');
        console.log(`MongoDB Connected: ${conn.connection.host}`);
        
        // Debug: Log khi kết nối thành công
        const collections = await mongoose.connection.db.listCollections().toArray();
        console.log('Available collections:', collections.map(c => c.name));
        
        // Kiểm tra collection news
        const newsCount = await mongoose.connection.db.collection('news').countDocuments();
        console.log('Total news in database:', newsCount);
        
    } catch (error) {
        console.error('Error connecting to MongoDB:', error);
        process.exit(1);
    }
};

module.exports = connectDB;