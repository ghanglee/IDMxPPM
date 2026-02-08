const mongoose = require('mongoose');
const config = require('./env');

const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 3000;

async function connectDB() {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      await mongoose.connect(config.mongodbUri);
      console.log(`MongoDB connected: ${mongoose.connection.host}`);
      return;
    } catch (error) {
      console.error(`MongoDB connection attempt ${attempt}/${MAX_RETRIES} failed:`, error.message);
      if (attempt === MAX_RETRIES) {
        console.error('Max retries reached. Exiting.');
        process.exit(1);
      }
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
    }
  }
}

mongoose.connection.on('disconnected', () => {
  console.warn('MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB error:', err.message);
});

module.exports = connectDB;
