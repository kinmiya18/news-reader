require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const expressLayouts = require('express-ejs-layouts');

const app = express();

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, '../public')));

// View engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);
app.set('layout', 'layout');

// Global variables middleware
app.use((req, res, next) => {
  res.locals.category = null; // Default category
  res.locals.moment = require('moment');
  res.locals.getImageProxyUrl = require('./utils/helpers').getImageProxyUrl;
  next();
});

// Database connection
const connectDB = require('./config/db');
connectDB();

// Routes
const newsRoutes = require('./routes/news.routes');
app.use('/news', newsRoutes);

// Home route - redirect to news controller
app.get('/', (req, res) => {
  res.redirect('/news/');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});