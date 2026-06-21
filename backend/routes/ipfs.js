/**
 * SeQureChain v8 — IPFS Routes via Pinata
 * Fixes: multer compat, clear error messages, proper file cleanup
 */
const express   = require('express');
const axios     = require('axios');
const FormData  = require('form-data');
const fs        = require('fs');
const crypto    = require('crypto');

module.exports = function (upload) {
  const router = express.Router();

  function getJwt() {
    const jwt = process.env.PINATA_JWT;
    if (!jwt || jwt.includes('YOUR_') || jwt.length < 20) {
      throw new Error('PINATA_JWT not set in backend/.env — get it from pinata.cloud → API Keys');
    }
    return jwt;
  }

  function pinataHeaders() {
    return { Authorization: `Bearer ${getJwt()}` };
  }

  // ── POST /api/ipfs/upload ─────────────────────────────────────────────────
  router.post('/upload', (req, res) => {
    upload.single('file')(req, res, async (multerErr) => {
      if (multerErr) {
        console.error('Multer error:', multerErr.message);
        return res.status(400).json({ success: false, error: `File error: ${multerErr.message}` });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No file received. Send as multipart/form-data with field name "file".',
        });
      }

      const tmpPath = req.file.path;

      try {
        // Validate JWT first before doing any work
        getJwt();

        // Compute SHA-256
        const buf      = fs.readFileSync(tmpPath);
        const fileHash = crypto.createHash('sha256').update(buf).digest('hex');

        // Build multipart form for Pinata
        const fd = new FormData();
        fd.append('file', fs.createReadStream(tmpPath), {
          filename:    req.file.originalname || 'evidence-file',
          contentType: req.file.mimetype || 'application/octet-stream',
        });
        fd.append('pinataMetadata', JSON.stringify({
          name: req.file.originalname || 'evidence-file',
          keyvalues: {
            app:        'SeQureChain',
            sha256:     fileHash,
            uploadedAt: new Date().toISOString(),
            uploader:   req.headers['x-wallet-address'] || 'anonymous',
          },
        }));
        fd.append('pinataOptions', JSON.stringify({ cidVersion: 1 }));

        console.log(`📎 Pinning: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);

        const response = await axios.post(
          'https://api.pinata.cloud/pinning/pinFileToIPFS',
          fd,
          {
            headers: { ...fd.getHeaders(), ...pinataHeaders() },
            maxContentLength: Infinity,
            maxBodyLength:    Infinity,
            timeout:          120_000,
          }
        );

        if (fs.existsSync(tmpPath)) fs.unlinkSync(tmpPath);

        const cid = response.data.IpfsHash;
        console.log(`✅ Pinned CID: ${cid}`);

        res.json({
          success: true,
          data: {
            cid,
            fileHash,
            fileName:   req.file.originalname,
            fileSize:   req.file.size,
            mimeType:   req.file.mimetype,
            gatewayUrl: `https://gateway.pinata.cloud/ipfs/${cid}`,
            publicUrl:  `https://ipfs.io/ipfs/${cid}`,
          },
        });

      } catch (err) {
        if (fs.existsSync(tmpPath)) try { fs.unlinkSync(tmpPath); } catch {}

        let userMsg = err.message;
        const status = err.response?.status || 500;
        const detail = err.response?.data?.error?.details || err.response?.data?.error;

        if (userMsg.includes('PINATA_JWT not set')) {
          userMsg = userMsg; // keep clear message
        } else if (status === 401) {
          userMsg = 'Pinata authentication failed — your PINATA_JWT in backend/.env is wrong or expired';
        } else if (status === 403) {
          userMsg = 'Pinata plan limit exceeded — delete old pins or upgrade plan at pinata.cloud';
        } else if (detail) {
          userMsg = `Pinata error: ${detail}`;
        }

        console.error(`❌ IPFS upload failed [${status}]:`, userMsg);
        res.status(status > 0 ? status : 500).json({ success: false, error: userMsg });
      }
    });
  });

  // ── GET /api/ipfs/test ────────────────────────────────────────────────────
  router.get('/test', async (req, res) => {
    try {
      const r = await axios.get('https://api.pinata.cloud/data/testAuthentication', {
        headers: pinataHeaders(), timeout: 10_000,
      });
      res.json({ success: true, message: r.data.message, authenticated: true });
    } catch (err) {
      const msg = err.message.includes('PINATA_JWT not set')
        ? err.message
        : `Pinata auth failed: ${err.response?.data?.error || err.message}`;
      res.status(500).json({ success: false, error: msg, authenticated: false });
    }
  });

  // ── GET /api/ipfs/retrieve/:cid ───────────────────────────────────────────
  router.get('/retrieve/:cid', async (req, res) => {
    try {
      const r = await axios.get(
        `https://api.pinata.cloud/data/pinList?hashContains=${req.params.cid}`,
        { headers: pinataHeaders(), timeout: 15_000 }
      );
      res.json({
        success: true,
        data: {
          cid:        req.params.cid,
          gatewayUrl: `https://gateway.pinata.cloud/ipfs/${req.params.cid}`,
          publicUrl:  `https://ipfs.io/ipfs/${req.params.cid}`,
          pinned:     r.data.count > 0,
          pinInfo:    r.data.rows?.[0] || null,
        },
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // ── GET /api/ipfs/pins ────────────────────────────────────────────────────
  router.get('/pins', async (req, res) => {
    try {
      const { page = 1, limit = 20 } = req.query;
      const r = await axios.get(
        `https://api.pinata.cloud/data/pinList?status=pinned&pageLimit=${limit}&pageOffset=${(page - 1) * limit}`,
        { headers: pinataHeaders(), timeout: 15_000 }
      );
      res.json({ success: true, data: { pins: r.data.rows, total: r.data.count } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
};
