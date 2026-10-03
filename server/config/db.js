import mongoose from 'mongoose';
import dns from 'dns';

function configureOptionalDnsOverride() {
  const configured = String(process.env.DNS_SERVERS || '').trim();

  if (!configured) {
    return;
  }

  const servers = configured
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (servers.length > 0) {
    dns.setServers(servers);
  }
}

configureOptionalDnsOverride();

export async function connectDB(uri) {
  if (!uri) {
    throw new Error('MONGO_URI is not set. Configure it in server/.env before starting the API.');
  }

  mongoose.set('strictQuery', true);

  const conn = await mongoose.connect(uri);

  console.log(
    `MongoDB connected: ${conn.connection.host}/${conn.connection.name}`
  );

  return conn;
}

export default connectDB;
