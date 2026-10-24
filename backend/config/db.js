const mongoose = require('mongoose');

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/homeease';

  try {
    const conn = await mongoose.connect(uri);
    console.log(`[Database] MongoDB connected successfully: ${conn.connection.host}/${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Could not connect to MongoDB at ${uri}: ${error.message}`);
    console.error(`[Tip] Make sure your local MongoDB service is running, or set MONGODB_URI in backend/.env to a valid connection string.`);
    // In production or when DB is mandatory, we throw or exit. We keep process alive or allow caller to decide.
    throw error;
  }
};

module.exports = connectDB;
