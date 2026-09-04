import 'dotenv/config';
import documentRoutes from "./routes/documentRoutes.js";
import express from 'express';
import cors from 'cors';

import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import beneficiaryRoutes from './routes/beneficiaryRoutes.js';
import legacyClaimRoutes from './routes/legacyClaimRoutes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/beneficiaries', beneficiaryRoutes);
app.use("/api/documents", documentRoutes);
app.use('/api/legacy-claims', legacyClaimRoutes);

app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  if (err.name === 'ValidationError' || err.name === 'CastError') {
    return res.status(400).json({ message: 'Invalid request data.' });
  }
  if (err.code === 11000) {
    return res.status(409).json({ message: 'A record with that value already exists.' });
  }
  return res.status(500).json({ message: 'Server error.' });
});

const PORT = process.env.PORT || 5000;

connectDB(process.env.MONGO_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Digital Legacy API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exit(1);
  });
