/**
 * SeQureChain v9 — AppContext
 *
 * Complete signing flow:
 *
 *   User clicks Submit
 *     │
 *     ▼
 *   File → Pinata IPFS (backend, no signing needed)
 *     │  returns CID + SHA-256
 *     ▼
 *   Metadata → Firebase (backend)
 *     │  returns evidence_id
 *     ▼
 *   window.ethereum.request('eth_sendTransaction')
 *     │  ← MetaMask popup opens (wallet signs, NOT our backend)
 *     │  ← User clicks Confirm
 *     │  ← MetaMask signs with user's private key (ECDSA secp256k1)
 *     │  ← Signed TX broadcast to Sepolia mempool
 *     │  returns txHash immediately (TX is in mempool, not yet mined)
 *     ▼
 *   Poll eth_getTransactionReceipt(txHash)
 *     │  ← Validator picks TX from mempool
 *     │  ← Executes submitEvidence() — msg.sender = user's wallet
 *     │  ← Block mined → receipt returned
 *     │  receipt.status === '0x1' = success
 *     ▼
 *   Save txHash + blockNumber → Firebase (confirmed)
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { Platform } from 'react-native';

const AppContext = createContext(null);

// ─────────────────────────────────────────────────────────────────────────────
// ABI ENCODER
// keccak256("submitEvidence(string,string,string,string,string,string)") = 0xd7816903
// ─────────────────────────────────────────────────────────────────────────────
function encodeSubmitEvidence(evidenceId, cid, fileHash, description, location, evidenceType) {
  const SELECTOR = 'd7816903';
  const args = [
    String(evidenceId   || ''),
    String(cid          || ''),
    String(fileHash     || ''),
    String(description  || ''),
    String(location     || ''),
    String(evidenceType || 'document'),
  ];

  // ABI encode: 6 x 32-byte offsets (head) + length-prefixed padded strings (tail)
  const headSize = args.length * 32;
  const offsets  = [];
  const tails    = [];
  let   tailPos  = headSize;

  for (const str of args) {
    offsets.push(tailPos.toString(16).padStart(64, '0'));
    const bytes  = new TextEncoder().encode(str);
    const words  = Math.ceil(bytes.length / 32) || 0;
    const padded = new Uint8Array(words * 32);
    padded.set(bytes);
    tails.push(
      bytes.length.toString(16).padStart(64, '0') +
      Array.from(padded).map(b => b.toString(16).padStart(2, '0')).join('')
    );
    tailPos += 32 + words * 32;
  }

  return '0x' + SELECTOR + offsets.join('') + tails.join('');
}

// ─────────────────────────────────────────────────────────────────────────────
// WAIT FOR RECEIPT
// Polls eth_getTransactionReceipt until TX is mined (included in a block).
// Returns receipt with blockNumber, status, gasUsed.
// Timeout after ~5 minutes (60 attempts × 5 seconds).
// ─────────────────────────────────────────────────────────────────────────────
async function waitForReceipt(txHash, onStatus, maxAttempts = 60) {
  onStatus?.(`TX in mempool — waiting for block confirmation...`);
  console.log('[Receipt] Polling for receipt:', txHash);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    await new Promise(r => setTimeout(r, 5000)); // wait 5 seconds between polls

    try {
      const receipt = await window.ethereum.request({
        method: 'eth_getTransactionReceipt',
        params: [txHash],
      });

      if (receipt !== null) {
        const success = receipt.status === '0x1';
        const blockNum = parseInt(receipt.blockNumber, 16);
        console.log(`[Receipt] Mined in block ${blockNum} — status: ${success ? 'SUCCESS' : 'FAILED'}`);

        if (!success) {
          throw new Error(`Transaction failed on-chain (block ${blockNum}). The contract reverted — possible duplicate evidence ID.`);
        }

        onStatus?.(`Confirmed in block ${blockNum} ✓`);
        return {
          blockNumber: blockNum,
          gasUsed:     parseInt(receipt.gasUsed, 16),
          status:      'confirmed',
        };
      }

      onStatus?.(`Waiting for miner... (${attempt}/${maxAttempts})`);
    } catch (e) {
      if (e.message.includes('Transaction failed')) throw e;
      // Network hiccup — keep polling
    }
  }

  // Timeout — TX is still valid but we stop waiting
  console.warn('[Receipt] Timeout — TX may still be mined. Hash:', txHash);
  return { blockNumber: null, gasUsed: null, status: 'pending' };
}

// ─────────────────────────────────────────────────────────────────────────────
export function AppProvider({ children }) {
  const [walletAddress, setWalletAddress] = useState(null);
  const [isConnected,   setIsConnected]   = useState(false);
  const [currentUser,   setCurrentUser]   = useState(null);
  const [evidenceList,  setEvidenceList]  = useState([]);
  const [stats, setStats] = useState({ total:0, confirmed:0, pending:0, byType:[], recent14:[] });
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);

  // ── Change to your PC IP for mobile device testing ──────────────────────
  const API_URL = 'http://localhost:3001/api';
  //192.168.100.18
  // Use your machine's local network IP here instead of localhost when testing on a phone
  const showToast = useCallback((msg, type = 'info') => {
    setToast({ message: msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Restore wallet from localStorage on app load ──────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('sequrechain_session');
        if (saved) {
          const { address, user } = JSON.parse(saved);
          if (address && user) {
            setWalletAddress(address);
            setIsConnected(true);
            setCurrentUser(user);
          }
        }
      } catch (e) {
        console.error('Failed to restore session:', e);
      }
    }
  }, []);

  // ── AUTH ───────────────────────────────────────────────────────────────────
  const loginWithWallet = useCallback(async (address) => {
    try {
      const res  = await fetch(`${API_URL}/users/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: address }),
      });
      const data = await res.json();
      if (data.success) {
        setWalletAddress(address); setIsConnected(true); setCurrentUser(data.data);
        // Save to localStorage
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          localStorage.setItem('sequrechain_session', JSON.stringify({ address, user: data.data }));
        }
        showToast(`Welcome back, ${data.data.full_name}!`, 'success');
        return { success: true, user: data.data };
      }
      return { success: false, error: data.error };
    } catch { return { success: false, error: 'Cannot reach backend on port 3001.' }; }
  }, [API_URL, showToast]);

  const registerUser = useCallback(async (userData) => {
    try {
      const res  = await fetch(`${API_URL}/users/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });
      const data = await res.json();
      if (data.success) {
        setWalletAddress(userData.walletAddress); setIsConnected(true); setCurrentUser(data.data);
        // Save to localStorage
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
          localStorage.setItem('sequrechain_session', JSON.stringify({ address: userData.walletAddress, user: data.data }));
        }
        showToast(`Welcome, ${data.data.full_name}!`, 'success');
        return { success: true, user: data.data };
      }
      return { success: false, error: data.error };
    } catch { return { success: false, error: 'Cannot reach backend.' }; }
  }, [API_URL, showToast]);

  const disconnectWallet = useCallback(async () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      try {
        if (window.ethereum) {
          await window.ethereum.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }],
          });
        }
        // Clear from localStorage
        localStorage.removeItem('sequrechain_session');
      } catch {}
    }
    setWalletAddress(null); setIsConnected(false); setCurrentUser(null);
    setEvidenceList([]); setStats({ total:0, confirmed:0, pending:0, byType:[], recent14:[] });
    showToast('Signed out', 'info');
  }, [showToast]);

  // ── DATA ────────────────────────────────────────────────────────────────────
  const fetchEvidence = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      const p = new URLSearchParams(Object.fromEntries(Object.entries(filters).filter(([,v])=>v!=null&&v!==''))).toString();
      const res  = await fetch(`${API_URL}/evidence${p ? '?'+p : ''}`);
      const data = await res.json();
      if (data.success) setEvidenceList(data.data);
      return data.data || [];
    } catch (err) {
      console.error('[AppContext] fetchEvidence error', err);
      try { showToast('Failed to fetch evidence from backend', 'error'); } catch (_) {}
      return [];
    }
    finally { setLoading(false); }
  }, [API_URL]);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/evidence/stats`);
      const d   = await res.json();
      if (d.success) setStats(d.data);
    } catch {}
  }, [API_URL]);

  const browseEvidence = useCallback(async (params = {}) => {
    try {
      setLoading(true);
      const q = new URLSearchParams(Object.fromEntries(Object.entries(params).filter(([,v])=>v!=null&&v!==''))).toString();
      const res = await fetch(`${API_URL}/evidence/browse${q ? '?'+q : ''}`);
      return await res.json();
    } catch { return { success: false, error: 'Failed' }; }
    finally { setLoading(false); }
  }, [API_URL]);

  // ─────────────────────────────────────────────────────────────────────────────
  // UPLOAD AND CONFIRM
  //
  // Complete flow in one function:
  //   1. File → Pinata IPFS (via backend) → CID + SHA-256
  //   2. Metadata → Firebase (via backend) → evidence_id
  //   3. eth_sendTransaction → MetaMask popup → user signs → txHash (mempool)
  //   4. eth_getTransactionReceipt polling → block mined → receipt
  //   5. txHash + blockNumber → Firebase (confirmed)
  //
  // onStatus(msg) called with progress updates → shown in the Submit button
  // ─────────────────────────────────────────────────────────────────────────────
  const uploadAndConfirm = useCallback(async (formData, onStatus) => {
    const log = (msg) => {
      console.log('[SeQureChain]', msg);
      onStatus?.(msg);
    };

    try {
      // ── 1. Upload file to Pinata IPFS ──────────────────────────────────────
      log('Uploading file to IPFS...');

      const ipfsRes = await fetch(`${API_URL}/ipfs/upload`, {
        method:  'POST',
        body:    formData,
        headers: { 'x-wallet-address': walletAddress || '' },
        // Content-Type NOT set — browser sets correct multipart/form-data boundary
      });

      let ipfsData;
      try   { ipfsData = await ipfsRes.json(); }
      catch { throw new Error(`IPFS server error (HTTP ${ipfsRes.status}) — check backend terminal`); }

      if (!ipfsData.success) throw new Error(ipfsData.error || 'IPFS upload failed');

      const { cid, fileHash, fileName, fileSize, mimeType, gatewayUrl, publicUrl } = ipfsData.data;
      log(`IPFS ✓  CID: ${cid.slice(0, 24)}...`);

      // ── 2. Save metadata to Firebase ──────────────────────────────────────
      log('Saving to Firebase...');

      const evRes = await fetch(`${API_URL}/evidence`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'x-wallet-address': walletAddress || '' },
        body: JSON.stringify({
          cid, fileHash, fileName, fileSize, mimeType, gatewayUrl, publicUrl,
          description:  formData.get?.('description')  || '',
          location:     formData.get?.('location')      || '',
          evidenceType: formData.get?.('evidenceType')  || 'document',
          caseNumber:   formData.get?.('caseNumber')    || '',
          uploadedBy:   walletAddress  || 'anonymous',
          uploaderName: currentUser?.full_name || '',
          uploaderRole: currentUser?.role      || '',
        }),
      });

      const evData = await evRes.json();
      if (!evData.success) throw new Error(evData.error || 'Firebase save failed');
      const evidenceId = evData.data.evidence_id;
      log(`Firebase ✓  ID: ${evidenceId}`);

      // ── 3. Sign & submit TX via MetaMask ──────────────────────────────────
      // On mobile: cannot open MetaMask popup, mark pending
      if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.ethereum) {
        log('Mobile: saved to IPFS + Firebase. Open on web to record on blockchain.');
        return { success: true, data: { ...evData.data, cid, fileHash, txHash: null } };
      }

      const contractAddress = process.env.EXPO_PUBLIC_CONTRACT_ADDRESS;
      if (!contractAddress || contractAddress.includes('YOUR_') || contractAddress === 'undefined') {
        throw new Error(
          'Missing contract address.\n' +
          'Create frontend/.env:\n' +
          'EXPO_PUBLIC_CONTRACT_ADDRESS=0xYourAddress\n' +
          'Then restart: npm run web'
        );
      }

      // Switch MetaMask to Sepolia if needed
      try {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        if (chainId !== '0xaa36a7') {
          log('Switching MetaMask to Sepolia...');
          await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: '0xaa36a7' }],
          }).catch(async (e) => {
            if (e.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: '0xaa36a7', chainName: 'Sepolia',
                  nativeCurrency: { name:'ETH', symbol:'ETH', decimals:18 },
                  rpcUrls: ['https://rpc.sepolia.org'],
                  blockExplorerUrls: ['https://sepolia.etherscan.io'],
                }],
              });
            }
          });
        }
      } catch {}

      // Build ABI-encoded call data
      const callData = encodeSubmitEvidence(
        evidenceId, cid, fileHash,
        formData.get?.('description')  || '',
        formData.get?.('location')     || '',
        formData.get?.('evidenceType') || 'document'
      );

      // ── MetaMask popup opens here ──────────────────────────────────────────
      // window.ethereum.request blocks until user clicks Confirm or Reject.
      // MetaMask shows: To (contract), Network (Sepolia), estimated gas.
      // User signs with their private key inside MetaMask (we never see the key).
      // Returns txHash once TX is broadcast to the Sepolia mempool.
      log('MetaMask popup opening — please approve the transaction...');

      let txHash;
      try {
        txHash = await window.ethereum.request({
          method: 'eth_sendTransaction',
          params: [{
            from: walletAddress,     // user's wallet — msg.sender on-chain
            to:   contractAddress,   // EvidenceManager.sol deployed on Sepolia
            data: callData,          // ABI-encoded submitEvidence(...)
            // gas: MetaMask estimates automatically
          }],
        });
      } catch (e) {
        if (e.code === 4001) throw new Error('Transaction cancelled — you rejected it in MetaMask');
        if (e.code === -32603) throw new Error('MetaMask internal error — make sure you have Sepolia ETH for gas');
        throw new Error(`MetaMask error (${e.code}): ${e.message}`);
      }

      // TX is now in the mempool — txHash is available but not yet mined
      log(`Signed ✓  TX: ${txHash.slice(0, 20)}...`);
      console.log('[SeQureChain] TX hash:', txHash);
      console.log('[SeQureChain] Etherscan: https://sepolia.etherscan.io/tx/' + txHash);

      // Save txHash immediately (status = pending) so user can see it
      try {
        await fetch(`${API_URL}/evidence/${evidenceId}/confirm`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ txHash, status: 'pending' }),
        });
      } catch {}

      // ── 4. Wait for block confirmation (receipt) ───────────────────────────
      // Polls eth_getTransactionReceipt every 5 seconds.
      // Returns once validator mines the TX into a block.
      // This proves:
      //   - The signed TX was accepted by the network
      //   - submitEvidence() executed successfully (receipt.status = 0x1)
      //   - msg.sender (user wallet) is permanently recorded on-chain
      let blockNumber = null;
      try {
        const receipt = await waitForReceipt(txHash, log);
        blockNumber = receipt.blockNumber;

        if (blockNumber) {
          log(`Mined in block ${blockNumber} ✓  Evidence is on Ethereum Sepolia`);
        }

        // Update Firebase with confirmed status + block number
        await fetch(`${API_URL}/evidence/${evidenceId}/confirm`, {
          method:  'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({
            txHash,
            blockNumber,
            status: receipt.status,
          }),
        });

      } catch (receiptErr) {
        // TX was submitted but receipt check failed — still show success
        console.warn('[SeQureChain] Receipt error:', receiptErr.message);
      }

      await fetchEvidence();
      await fetchStats();

      return {
        success: true,
        data: {
          ...evData.data,
          cid,
          fileHash,
          txHash,
          blockNumber,
        },
      };

    } catch (e) {
      console.error('[SeQureChain] Error:', e.message);
      return { success: false, error: e.message };
    }
  }, [API_URL, walletAddress, currentUser, fetchEvidence, fetchStats]);

  const CAN_UPLOAD = ['Police Investigator','Forensic Investigator','Evidence Officer','System Admin'];
  const CAN_VIEW   = ['Court Official','Lawyer','Judge','System Admin'];
  const isUploader = currentUser && CAN_UPLOAD.includes(currentUser.role);
  const isViewer   = currentUser && CAN_VIEW.includes(currentUser.role);

  return (
    <AppContext.Provider value={{
      walletAddress, isConnected, currentUser, evidenceList, stats, loading, toast,
      loginWithWallet, registerUser, disconnectWallet,
      fetchEvidence, fetchStats, browseEvidence,
      uploadAndConfirm,
      showToast, isUploader, isViewer, API_URL,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be within AppProvider');
  return ctx;
};
