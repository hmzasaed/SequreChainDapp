/**
 * SeQureChain  — Firebase Firestore Database Layer

 */
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore, FieldValue, Timestamp } = require('firebase-admin/firestore');

let db = null;

function getDb() {
  if (!db) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccount || serviceAccount.includes('YOUR_')) {
      throw new Error(
        'FIREBASE_SERVICE_ACCOUNT not set in backend/.env\n' +
        'Get it from: Firebase Console → Project Settings → Service Accounts → Generate New Private Key\n' +
        'Paste the entire JSON as one line into FIREBASE_SERVICE_ACCOUNT in .env'
      );
    }

    let parsed;
    try {
      parsed = JSON.parse(serviceAccount);
    } catch {
      throw new Error('FIREBASE_SERVICE_ACCOUNT is not valid JSON — paste the entire service account JSON on one line');
    }

    initializeApp({ credential: cert(parsed) });
    db = getFirestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firebase Firestore connected');
  }
  return db;
}

// ── EVIDENCE ──────────────────────────────────────────────────────────────────
const EvidenceDB = {
  async create(data) {
    const db = getDb();
    const ref = db.collection('evidence').doc(data.evidence_id);
    const doc = {
      ...data,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    await ref.set(doc);
    return { changes: 1 };
  },

  async findAll(filters = {}) {
    const db = getDb();
    let query = db.collection('evidence').orderBy('created_at', 'desc');

    if (filters.evidence_type) query = query.where('evidence_type', '==', filters.evidence_type);
    if (filters.status)        query = query.where('status', '==', filters.status);
    if (filters.uploaded_by)   query = query.where('uploaded_by', '==', filters.uploaded_by);

    if (filters.limit) query = query.limit(Math.min(parseInt(filters.limit) || 50, 500));

    const snap = await query.get();
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Client-side search filter (Firestore doesn't support full-text)
    if (filters.search) {
      const s = filters.search.toLowerCase();
      docs = docs.filter(d =>
        (d.description  || '').toLowerCase().includes(s) ||
        (d.evidence_id  || '').toLowerCase().includes(s) ||
        (d.cid          || '').toLowerCase().includes(s) ||
        (d.case_number  || '').toLowerCase().includes(s) ||
        (d.file_name    || '').toLowerCase().includes(s) ||
        (d.uploader_name|| '').toLowerCase().includes(s)
      );
    }

    return docs.map(toPlain);
  },

  async findById(id) {
    const snap = await getDb().collection('evidence').doc(id).get();
    return snap.exists ? toPlain({ id: snap.id, ...snap.data() }) : null;
  },

  async findByCid(cid) {
    const snap = await getDb().collection('evidence').where('cid', '==', cid).limit(1).get();
    if (snap.empty) return null;
    const d = snap.docs[0];
    return toPlain({ id: d.id, ...d.data() });
  },

  async findByCaseNumber(caseNo) {
    const snap = await getDb().collection('evidence')
      .where('case_number', '==', caseNo)
      .orderBy('created_at', 'desc')
      .get();
    return snap.docs.map(d => toPlain({ id: d.id, ...d.data() }));
  },

  async updateStatus(id, status, txHash, blockNumber) {
    await getDb().collection('evidence').doc(id).update({
      status,
      tx_hash:      txHash     || null,
      block_number: blockNumber || null,
      updated_at:   FieldValue.serverTimestamp(),
    });
    return { changes: 1 };
  },

  async getStats() {
    const db = getDb();
    const snap = await db.collection('evidence').get();
    const docs = snap.docs.map(d => d.data());

    const total     = docs.length;
    const confirmed = docs.filter(d => d.status === 'confirmed').length;
    const pending   = docs.filter(d => d.status === 'pending').length;

    // Build recent14 — count per day for last 14 days
    const now   = new Date();
    const recent14 = [];
    for (let i = 13; i >= 0; i--) {
      const day = new Date(now);
      day.setDate(day.getDate() - i);
      const key = day.toISOString().slice(0, 10);
      const count = docs.filter(d => {
        const ts = d.created_at?.toDate?.() || new Date(d.created_at || 0);
        return ts.toISOString().slice(0, 10) === key;
      }).length;
      recent14.push({ day: key, count });
    }

    // byType
    const typeMap = {};
    docs.forEach(d => { typeMap[d.evidence_type] = (typeMap[d.evidence_type] || 0) + 1; });
    const byType = Object.entries(typeMap).map(([evidence_type, count]) => ({ evidence_type, count }));

    return { total, confirmed, pending, failed: 0, byType, recent14 };
  },


  async delete(id) {
    await getDb().collection('evidence').doc(id).delete();
    return { changes: 1 };
  },
};

// ── USERS ─────────────────────────────────────────────────────────────────────
const UsersDB = {
  async create(data) {
    const db = getDb();
    const wallet = data.wallet_address.toLowerCase();
    await db.collection('users').doc(wallet).set({
      ...data,
      wallet_address: wallet,
      created_at: FieldValue.serverTimestamp(),
    });
    return { changes: 1 };
  },

  async findByWallet(wallet) {
    const snap = await getDb().collection('users').doc(wallet.toLowerCase()).get();
    return snap.exists ? toPlain({ id: snap.id, ...snap.data() }) : null;
  },

  async findAll() {
    const snap = await getDb().collection('users').orderBy('created_at', 'desc').get();
    return snap.docs.map(d => toPlain({ id: d.id, ...d.data() }));
  },

  async updateLastLogin(wallet) {
    await getDb().collection('users').doc(wallet.toLowerCase()).update({
      last_login: FieldValue.serverTimestamp(),
    });
    return { changes: 1 };
  },
};

// Convert Firestore Timestamps to ISO strings for JSON serialization
function toPlain(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v.toDate === 'function') {
      out[k] = v.toDate().toISOString();
    } else {
      out[k] = v;
    }
  }
  return out;
}

// Amendments and Audit DB implementations
const AmendmentsDB = {
  async create(data) {
    const db = getDb();
    const ref = await db.collection('amendments').add({
      ...data,
      created_at: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    return toPlain({ id: ref.id, amendment_id: ref.id, ...snap.data() });
  },

  async findByEvidenceId(evidenceId) {
    const snap = await getDb().collection('amendments')
      .where('evidence_id', '==', evidenceId)
      .orderBy('created_at', 'desc')
      .get();
    return snap.docs.map(d => toPlain({ id: d.id, amendment_id: d.id, ...d.data() }));
  },

  async findAll() {
    const snap = await getDb().collection('amendments').orderBy('created_at', 'desc').get();
    return snap.docs.map(d => toPlain({ id: d.id, ...d.data() }));
  }
};

const AuditDB = {
  async log(entry) {
    const db = getDb();
    const ref = await db.collection('audit_logs').add({
      ...entry,
      created_at: FieldValue.serverTimestamp(),
    });
    const snap = await ref.get();
    return toPlain({ id: ref.id, ...snap.data() });
  },

  async findByEvidenceId(evidenceId) {
    const snap = await getDb().collection('audit_logs')
      .where('evidence_id', '==', evidenceId)
      .orderBy('created_at', 'desc')
      .get();
    return snap.docs.map(d => toPlain({ id: d.id, ...d.data() }));
  },

  async findAll() {
    const snap = await getDb().collection('audit_logs').orderBy('created_at', 'desc').get();
    return snap.docs.map(d => toPlain({ id: d.id, ...d.data() }));
  }
};

module.exports = { getDb, EvidenceDB, AmendmentsDB, AuditDB, UsersDB };
