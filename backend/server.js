/**
 * SeQureChain v9 Backend — Firebase + Pinata IPFS + Alchemy Ethereum
 */
require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── CORS — allow all localhost + local network IPs ────────────────────────────
app.use(cors({
  origin: (origin, cb) => cb(null, true), // allow all origins for development
  credentials: true,
  methods: ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','x-wallet-address'],
}));
app.options('*', cors());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ── FILE UPLOAD ───────────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const upload = multer({
  dest: uploadsDir,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB
});

// ── ROUTES ────────────────────────────────────────────────────────────────────
const evidenceRoutes   = require('./routes/evidence');
const ipfsRoutes       = require('./routes/ipfs');
const blockchainRoutes = require('./routes/blockchain');
const usersRoutes      = require('./routes/users');

app.use('/api/evidence',   evidenceRoutes);
app.use('/api/ipfs',       ipfsRoutes(upload));
app.use('/api/blockchain', blockchainRoutes);
app.use('/api/users',      usersRoutes);

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'SeQureChain backend is running.',
    api: '/api',
    health: '/api/health',
  });
});

// ── HEALTH CHECK ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  const pinata   = !!(process.env.PINATA_JWT && !process.env.PINATA_JWT.includes('YOUR_'));
  const alchemy  = !!(  (process.env.SEPOLIA_RPC_URL && !process.env.SEPOLIA_RPC_URL.includes('YOUR_'))
                     || (process.env.ALCHEMY_RPC_URL && !process.env.ALCHEMY_RPC_URL.includes('YOUR_'))
                   );
  const contract = !!(process.env.CONTRACT_ADDRESS && !process.env.CONTRACT_ADDRESS.includes('YOUR_'));
  const firebase = !!(process.env.FIREBASE_SERVICE_ACCOUNT && !process.env.FIREBASE_SERVICE_ACCOUNT.includes('YOUR_'));

  res.json({
    status:    'ok',
    service:   'SeQureChain API v9.0',
    timestamp: new Date().toISOString(),
    env: { pinata, alchemy, contract, firebase },
  });
});

// ── 404 ───────────────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.path}` });
});

// ── GLOBAL ERROR HANDLER ──────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err.message);
  res.status(500).json({ success: false, error: err.message });
});

app.listen(PORT, () => {
  console.log(`\n🔗 SeQureChain v9.0 running → http://localhost:${PORT}`);
  console.log(`📡 API:      http://localhost:${PORT}/api`);
  console.log(`🌐 Health:   http://localhost:${PORT}/api/health`);
  console.log(`🔥 Database: Firebase Firestore`);
  console.log(`📌 IPFS:     Pinata Cloud\n`);
});

module.exports = app;
