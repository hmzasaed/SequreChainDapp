/**
 * SeQureChain v9 — User Routes (Firebase async)
 */
const express = require('express');
const router  = express.Router();
const { UsersDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

const VALID_ROLES = [
  'Police Investigator','Forensic Investigator','Evidence Officer',
  'Court Official','Lawyer','Judge','System Admin',
];

// POST /api/users/register
router.post('/register', async (req, res) => {
  try {
    const { walletAddress, fullName, badgeId, role, department, phone } = req.body;

    if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/i.test(walletAddress))
      return res.status(400).json({ success:false, error:'Valid Ethereum wallet address required' });
    if (!fullName?.trim())
      return res.status(400).json({ success:false, error:'Full name is required' });
    if (!role || !VALID_ROLES.includes(role))
      return res.status(400).json({ success:false, error:`Role must be one of: ${VALID_ROLES.join(', ')}` });

    const existing = await UsersDB.findByWallet(walletAddress);
    if (existing)
      return res.status(409).json({ success:false, error:'This wallet is already registered. Please login instead.' });

    const userId = `USR-${Date.now()}-${uuidv4().slice(0,6).toUpperCase()}`;
    await UsersDB.create({
      user_id:        userId,
      wallet_address: walletAddress.toLowerCase(),
      full_name:      fullName.trim(),
      badge_id:       badgeId    || '',
      role,
      department:     department || '',
      phone:          phone      || '',
    });

    const user = await UsersDB.findByWallet(walletAddress);
    console.log(`✅ Registered: ${fullName} (${role}) — ${walletAddress}`);
    res.status(201).json({ success:true, data: user });
  } catch (e) {
    console.error('register error:', e.message);
    res.status(500).json({ success:false, error: e.message });
  }
});

// POST /api/users/login
router.post('/login', async (req, res) => {
  try {
    const { walletAddress } = req.body;
    if (!walletAddress)
      return res.status(400).json({ success:false, error:'Wallet address is required' });

    const user = await UsersDB.findByWallet(walletAddress);
    if (!user)
      return res.status(404).json({ success:false, error:'Wallet not registered. Please register first.' });

    await UsersDB.updateLastLogin(walletAddress);
    console.log(`🔑 Login: ${user.full_name} (${user.role})`);
    res.json({ success:true, data: user });
  } catch (e) {
    res.status(500).json({ success:false, error: e.message });
  }
});

// GET /api/users/profile/:wallet
router.get('/profile/:wallet', async (req, res) => {
  try {
    const user = await UsersDB.findByWallet(req.params.wallet);
    if (!user) return res.status(404).json({ success:false, error:'User not found' });
    res.json({ success:true, data: user });
  } catch (e) {
    res.status(500).json({ success:false, error: e.message });
  }
});

// GET /api/users
router.get('/', async (req, res) => {
  try {
    res.json({ success:true, data: await UsersDB.findAll() });
  } catch (e) {
    res.status(500).json({ success:false, error: e.message });
  }
});

module.exports = router;
