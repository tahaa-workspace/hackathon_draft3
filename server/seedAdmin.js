import dns from "dns";
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';


dns.setServers([
  "8.8.8.8",
  "1.1.1.1"
]);

async function seedAdmin() {
  const name = process.env.ADMIN_NAME || 'System Administrator';
  const username = process.env.ADMIN_USERNAME || 'admin';
  const email = process.env.ADMIN_EMAIL || 'admin@digitallegacy.local';
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.error('ADMIN_PASSWORD is not set in server/.env. Set it before running the seed script.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('ADMIN_PASSWORD must be at least 8 characters long.');
    process.exit(1);
  }

  await connectDB(process.env.MONGO_URI);

  const existing = await User.findOne({
    $or: [{ username }, { email }, { role: 'ADMIN' }],
  });

  if (existing) {
    console.log(`Admin already exists (username: ${existing.username}). No new admin created.`);
    await mongoose.disconnect();
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await User.create({
    name,
    username,
    email,
    passwordHash,
    role: 'ADMIN',
    status: 'ACTIVE',
    createdBy: null,
    mustChangePassword: false,
  });

  console.log('Admin created:');
  console.log(`  Name:     ${name}`);
  console.log(`  Username: ${username}`);
  console.log(`  Email:    ${email}`);
  console.log('  (Password is not shown. Store it somewhere safe.)');

  await mongoose.disconnect();
}

seedAdmin().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
