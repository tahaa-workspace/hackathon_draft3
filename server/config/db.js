import mongoose from 'mongoose';
import dns from "dns";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

export async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGO_URI is not set. Configure it in server/.env before starting the API.');
  }
  mongoose.set('strictQuery', true);
  const conn = await mongoose.connect(uri);
  console.log(`MongoDB connected: ${conn.connection.host}/${conn.connection.name}`);
  return conn;
}

export default connectDB;
