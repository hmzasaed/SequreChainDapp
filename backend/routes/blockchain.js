/**
 * SeQureChain v9 — Blockchain Routes (READ-ONLY)
 * All WRITE transactions (submitEvidence) are signed by the USER's MetaMask in the frontend.
 * The backend only does read-only calls (verify, get, status) using a provider (no private key).
 */
const express = require('express');
const router  = express.Router();
const { ethers } = require('ethers');

const CONTRACT_ABI = [
  "function submitEvidence(string,string,string,string,string,string) external",
  "function getEvidenceReadOnly(string) external view returns (string,string,string,string,string,address,uint256)",
  "function verifyIntegrity(string,string) external view returns (bool)",
  "function evidenceExistsCheck(string) external view returns (bool)",
  "function getEvidenceCount() external view returns (uint256)",
  "function getEvidenceIdByIndex(uint256) external view returns (string)",
];

function getProvider() {
  const url = process.env.SEPOLIA_RPC_URL || process.env.ALCHEMY_RPC_URL;
  if (!url || url.includes('YOUR_')) throw new Error('SEPOLIA_RPC_URL not configured in backend/.env');
  return new ethers.JsonRpcProvider(url);
}

function getReadOnlyContract() {
  const address = process.env.CONTRACT_ADDRESS;
  if (!address || address.includes('YOUR_')) throw new Error('CONTRACT_ADDRESS not configured in backend/.env');
  return new ethers.Contract(address, CONTRACT_ABI, getProvider());
}

// GET /api/blockchain/status
router.get('/status', async (req, res) => {
  try {
    const provider    = getProvider();
    const network     = await provider.getNetwork();
    const blockNumber = await provider.getBlockNumber();
    res.json({
      success: true,
      data: {
        network:     network.name,
        chainId:     network.chainId.toString(),
        blockNumber,
        contractAddress: process.env.CONTRACT_ADDRESS || 'Not configured',
        rpcConnected: true,
        signingMode: 'client-side MetaMask (no private key on server)',
      }
    });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// GET /api/blockchain/count
router.get('/count', async (req, res) => {
  try {
    const contract = getReadOnlyContract();
    const count    = await contract.getEvidenceCount();
    res.json({ success:true, data:{ count: count.toString() } });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// GET /api/blockchain/evidence/:id  — read evidence from chain
router.get('/evidence/:id', async (req, res) => {
  try {
    const contract = getReadOnlyContract();
    const exists   = await contract.evidenceExistsCheck(req.params.id);
    if (!exists) return res.status(404).json({ success:false, error:'Evidence not found on blockchain' });
    const result   = await contract.getEvidenceReadOnly(req.params.id);
    res.json({
      success: true,
      data: {
        cid:          result[0],
        fileHash:     result[1],
        description:  result[2],
        location:     result[3],
        evidenceType: result[4],
        uploadedBy:   result[5],
        timestamp:    result[6].toString(),
      }
    });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// POST /api/blockchain/verify  — verify hash against on-chain record
router.post('/verify', async (req, res) => {
  try {
    const { evidenceId, fileHash } = req.body;
    if (!evidenceId || !fileHash) return res.status(400).json({ success:false, error:'evidenceId and fileHash required' });
    const contract = getReadOnlyContract();
    const exists   = await contract.evidenceExistsCheck(evidenceId);
    if (!exists) return res.status(404).json({ success:false, error:'Evidence not found on blockchain' });
    const isValid  = await contract.verifyIntegrity(evidenceId, fileHash);
    res.json({ success:true, data:{ isValid, evidenceId, verifiedAt: new Date().toISOString() } });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// GET /api/blockchain/gas
router.get('/gas', async (req, res) => {
  try {
    const provider  = getProvider();
    const feeData   = await provider.getFeeData();
    const gasPriceGwei = feeData.gasPrice
      ? parseFloat(ethers.formatUnits(feeData.gasPrice, 'gwei')).toFixed(2)
      : 'unknown';
    res.json({ success:true, data:{ gasPriceGwei, network:'sepolia' } });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// GET /api/blockchain/tx/:hash — check transaction status
router.get('/tx/:hash', async (req, res) => {
  try {
    const provider = getProvider();
    const tx       = await provider.getTransaction(req.params.hash);
    const receipt  = await provider.getTransactionReceipt(req.params.hash);
    if (!tx) return res.status(404).json({ success:false, error:'Transaction not found' });
    res.json({
      success: true,
      data: {
        hash:        tx.hash,
        from:        tx.from,
        to:          tx.to,
        blockNumber: receipt?.blockNumber || null,
        status:      receipt ? (receipt.status === 1 ? 'confirmed' : 'failed') : 'pending',
        gasUsed:     receipt?.gasUsed?.toString() || null,
      }
    });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

module.exports = router;
