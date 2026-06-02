require('dotenv').config();
const mongoose = require('mongoose');

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI;
  const localUri = 'mongodb://localhost:27017/saas-platform';

  try {
    // If process.env.MONGO_URI is set, try to connect to it first
    const uriToConnect = primaryUri || localUri;
    const conn = await mongoose.connect(uriToConnect);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    if (primaryUri) {
      console.warn(`[Database] Primary MongoDB connection failed (${error.message}). Retrying fallback to local database...`);
      try {
        const conn = await mongoose.connect(localUri);
        console.log(`MongoDB Connected (Local Fallback): ${conn.connection.host}`);
      } catch (fallbackError) {
        console.error(`[Database] Error connecting to local fallback MongoDB: ${fallbackError.message}`);
        process.exit(1);
      }
    } else {
      console.error(`[Database] Error connecting to MongoDB: ${error.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
