import 'dotenv/config';
import documentRoutes from "./routes/documentRoutes.js";
import express from 'express';
import cors from 'cors';
import contactRoutes from './routes/contactRoutes.js';
import connectDB from './config/db.js';
import authRoutes from './routes/authRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import legacyClaimRoutes from './routes/legacyClaimRoutes.js';
import profileRoutes from './routes/profileRoutes.js';
import legacyAllocationRoutes from './routes/legacyAllocationRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import legalRequestRoutes from './routes/legalRequestRoutes.js';

const app = express();

const frontendOrigin =
  process.env.FRONTEND_URL ||
  process.env.APP_BASE_URL ||
  'http://localhost:5173';

app.disable('x-powered-by');

app.use(
  cors({
    origin: frontendOrigin,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  next();
});

app.use(express.json({ limit: '1mb' }));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use("/api/documents", documentRoutes);
app.use('/api/legacy-claims', legacyClaimRoutes);
app.use('/api/profile', profileRoutes);
app.use('/api/legacy-allocations', legacyAllocationRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin/audit-logs', auditRoutes);
app.use('/api/legal-requests', legalRequestRoutes);
app.use('/api/contact', contactRoutes);
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found.' });
});

app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      message: 'Uploaded file exceeds the 10 MB size limit.',
    });
  }

  if (
    err.name === 'MulterError' ||
    /Only PDF, JPG, JPEG and PNG files are allowed/i.test(err.message || '')
  ) {
    return res.status(400).json({
      message: err.message || 'Invalid file upload.',
    });
  }
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
