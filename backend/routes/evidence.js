/**
 * SeQureChain v9 — Evidence Routes (Firebase async)
 */
const express = require('express');
const router  = express.Router();
const { EvidenceDB } = require('../db/database');
const { v4: uuidv4 } = require('uuid');

function genId() {
  return `SQC-${Date.now()}-${uuidv4().slice(0,8).toUpperCase()}`;
}

// GET /api/evidence
router.get('/', async (req, res) => {
  try {
    const { type, status, search, limit, uploaded_by } = req.query;
    const data = await EvidenceDB.findAll({ evidence_type:type, status, search, limit, uploaded_by });
    res.json({ success:true, data, count:data.length });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// GET /api/evidence/stats
router.get('/stats', async (req, res) => {
  try {
    res.json({ success:true, data: await EvidenceDB.getStats() });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// GET /api/evidence/browse
router.get('/browse', async (req, res) => {
  try {
    const { cid, case_number, search, type, status } = req.query;
    if (cid) {
      const ev = await EvidenceDB.findByCid(cid.trim());
      if (!ev) return res.status(404).json({ success:false, error:`No evidence found with CID: ${cid}` });
      return res.json({ success:true, data:[ev], count:1 });
    }
    if (case_number) {
      const evs = await EvidenceDB.findByCaseNumber(case_number.trim());
      return res.json({ success:true, data:evs, count:evs.length });
    }
    const data = await EvidenceDB.findAll({ search, evidence_type:type, status, limit:100 });
    res.json({ success:true, data, count:data.length });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// GET /api/evidence/search/cid/:cid
router.get('/search/cid/:cid', async (req, res) => {
  try {
    const ev = await EvidenceDB.findByCid(req.params.cid);
    if (!ev) return res.status(404).json({ success:false, error:'No evidence found with this CID' });
    res.json({ success:true, data:ev });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// GET /api/evidence/:id
router.get('/:id', async (req, res) => {
  try {
    const ev = await EvidenceDB.findById(req.params.id);
    if (!ev) return res.status(404).json({ success:false, error:'Evidence not found' });
    // include amendments and audit logs for client convenience
    try {
      // lazy require to avoid circular issues
      const { AmendmentsDB, AuditDB } = require('../db/database');
      const amends = await AmendmentsDB.findByEvidenceId(req.params.id).catch(() => []);
      const audits  = await AuditDB.findByEvidenceId(req.params.id).catch(() => []);
      ev.amendments = amends || [];
      ev.auditLogs  = audits || [];
      ev.audit_logs = ev.auditLogs;
      // log a VIEW action for Chain of Custody (performed_by from header if available)
      try {
        const actor = req.headers['x-wallet-address'] || 'anonymous';
        const viewLog = await AuditDB.log({ evidence_id: req.params.id, action: 'VIEW', performed_by: actor });
        // refresh audits list to include the VIEW we just logged
        const refreshed = await AuditDB.findByEvidenceId(req.params.id).catch(() => ev.auditLogs || []);
        ev.auditLogs = [viewLog, ...refreshed.filter((log) => log.id !== viewLog.id)];
        ev.audit_logs = ev.auditLogs;
      } catch (e) {
        // ignore logging errors
      }
    } catch (e) {
      ev.amendments = ev.amendments || [];
      ev.auditLogs = ev.auditLogs || [];
    }
    res.json({ success:true, data:ev });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// POST /api/evidence/:id/amendment
router.post('/:id/amendment', async (req, res) => {
  try {
    const ev = await EvidenceDB.findById(req.params.id);
    if (!ev) return res.status(404).json({ success:false, error:'Evidence not found' });
    const { note, addedBy } = req.body;
    if (!note) return res.status(400).json({ success:false, error:'note is required' });

    const { AmendmentsDB, AuditDB } = require('../db/database');
    const created = await AmendmentsDB.create({ evidence_id: req.params.id, note, added_by: addedBy || req.headers['x-wallet-address'] || 'anonymous' });
    // log audit
    await AuditDB.log({ evidence_id: req.params.id, action: 'AMEND', performed_by: addedBy || req.headers['x-wallet-address'] || 'anonymous', note });
    res.status(201).json({ success:true, data:created });
  } catch (e) { console.error('POST /evidence/:id/amendment', e.message); res.status(500).json({ success:false, error:e.message }); }
});

// POST /api/evidence
router.post('/', async (req, res) => {
  try {
    const {
      cid, fileHash, fileName, fileSize, mimeType,
      description, location, evidenceType, uploadedBy,
      uploaderName, uploaderRole, caseNumber,
      txHash, gatewayUrl, publicUrl,
    } = req.body;

    if (!cid)      return res.status(400).json({ success:false, error:'cid is required' });
    if (!fileHash) return res.status(400).json({ success:false, error:'fileHash is required' });

    const evidenceId = genId();
    await EvidenceDB.create({
      evidence_id:   evidenceId,
      cid,
      file_hash:     fileHash,
      file_name:     fileName      || 'unknown',
      file_size:     fileSize      || 0,
      mime_type:     mimeType      || 'application/octet-stream',
      description:   description   || '',
      location:      location      || '',
      evidence_type: evidenceType  || 'document',
      uploaded_by:   uploadedBy    || req.headers['x-wallet-address'] || 'anonymous',
      uploader_name: uploaderName  || '',
      uploader_role: uploaderRole  || '',
      case_number:   caseNumber    || '',
      tx_hash:       txHash        || null,
      status:        txHash ? 'confirmed' : 'pending',
      gateway_url:   gatewayUrl    || `https://gateway.pinata.cloud/ipfs/${cid}`,
      public_url:    publicUrl     || `https://ipfs.io/ipfs/${cid}`,
    });

    const created = await EvidenceDB.findById(evidenceId);
    console.log(`✅ Evidence saved to Firebase: ${evidenceId} | CID: ${cid}`);
    // log upload in audit
    try {
      const { AuditDB } = require('../db/database');
      const actor = req.headers['x-wallet-address'] || created.uploaded_by || 'anonymous';
      await AuditDB.log({ evidence_id: evidenceId, action: 'UPLOAD', performed_by: actor, note: `Created with CID ${cid}` });
      // attach latest audit logs to created object
      created.auditLogs = await AuditDB.findByEvidenceId(evidenceId).catch(() => []);
    } catch (e) {
      // ignore
    }
    res.status(201).json({ success:true, data:created });
  } catch (e) {
    console.error('POST /evidence:', e.message);
    res.status(500).json({ success:false, error:e.message });
  }
});

// PATCH /api/evidence/:id/confirm
router.patch('/:id/confirm', async (req, res) => {
  try {
    const { txHash, blockNumber, status } = req.body;
    const finalStatus = status || (txHash ? 'confirmed' : 'pending');
    await EvidenceDB.updateStatus(req.params.id, finalStatus, txHash, blockNumber);
    console.log(`✅ TX update: ${req.params.id} | status: ${finalStatus} | block: ${blockNumber || 'pending'}`);
    // log confirmation event
    try {
      const { AuditDB } = require('../db/database');
      const actor = req.headers['x-wallet-address'] || 'system';
      await AuditDB.log({ evidence_id: req.params.id, action: 'CONFIRM', performed_by: actor, note: `TX ${txHash || 'N/A'} block ${blockNumber || 'N/A'}` });
    } catch (e) { /* ignore */ }
    res.json({ success:true, message:`Evidence ${finalStatus}`, txHash, blockNumber });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});

// DELETE /api/evidence/:id
router.delete('/:id', async (req, res) => {
  try {
    await EvidenceDB.delete(req.params.id);
    res.json({ success:true, message:'Evidence deleted from Firebase (blockchain record remains)' });
  } catch (e) { res.status(500).json({ success:false, error:e.message }); }
});


module.exports = router;
