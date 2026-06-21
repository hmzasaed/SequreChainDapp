import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, EVIDENCE_TYPES, STATUS_CONFIG } from '../utils/theme';
import { generateEvidencePDF } from '../utils/pdfGenerator';

function InfoRow({ icon, label, value, mono, copyable, unlimited }) {
  const handleCopy = () => Alert.alert('Copied', value);
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={14} color={COLORS.textMuted} style={{ width: 18 }} />
      <Text style={styles.infoLabel}>{label}</Text>
      <Text
        style={[styles.infoValue, mono && styles.monoText]}
        numberOfLines={unlimited ? 0 : (mono ? 1 : 3)}
        onPress={copyable ? handleCopy : undefined}
      >
        {value || '—'}
      </Text>
      {copyable && (
        <TouchableOpacity onPress={handleCopy} style={{ marginLeft: 4 }}>
          <Ionicons name="copy-outline" size={14} color={COLORS.textMuted} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function AmendmentItem({ item }) {
  return (
    <View style={styles.amendmentItem}>
      <View style={styles.amendmentDot} />
      <View style={styles.amendmentContent}>
        <Text style={styles.amendmentId}>{item.amendment_id || item.id || 'AMEND'}</Text>
        <Text style={styles.amendmentNote}>{item.note}</Text>
        <Text style={styles.amendmentMeta}>
          {(item.added_by || item.addedBy || 'anonymous').slice(0, 10)}... · {new Date(item.created_at).toLocaleString()}
        </Text>
      </View>
    </View>
  );
}

function AuditItem({ item }) {
  const colors = { UPLOAD: COLORS.primaryBlue, VIEW: COLORS.success, AMEND: COLORS.warning, CONFIRM: '#8B5CF6' };
  return (
    <View style={styles.auditItem}>
      <View style={[styles.auditDot, { backgroundColor: colors[item.action] || COLORS.textMuted }]} />
      <View style={styles.auditContent}>
        <View style={styles.auditTopRow}>
          <Text style={[styles.auditAction, { color: colors[item.action] || COLORS.textMuted }]}>{item.action}</Text>
          <Text style={styles.auditTime}>{new Date(item.created_at).toLocaleTimeString()}</Text>
        </View>
        <Text style={styles.auditBy}>{item.performed_by || item.added_by || item.actor || 'anonymous'}</Text>
        <Text style={styles.auditDate}>{new Date(item.created_at).toLocaleDateString()}</Text>
      </View>
    </View>
  );
}

export default function EvidenceDetailScreen({ route, navigation }) {
  const { evidenceId } = route.params || {};
  const { API_URL, walletAddress, showToast } = useApp();
  const [detail, setDetail] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [fetchStatus, setFetchStatus] = useState(null);
  const [fetchBody, setFetchBody] = useState(null);
  const [loading, setLoading] = useState(true);
  const [amendNote, setAmendNote] = useState('');
  const [submittingAmend, setSubmittingAmend] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  useEffect(() => { loadDetail(); }, [evidenceId]);

  const loadDetail = async () => {
    try {
      setLoading(true);
      console.log('[EvidenceDetail] loading evidenceId=', evidenceId);
      if (!evidenceId) {
        console.warn('[EvidenceDetail] no evidenceId provided in route.params');
        setLoading(false);
        return;
      }
      const headers = walletAddress ? { 'x-wallet-address': walletAddress } : {};
      const res = await fetch(`${API_URL}/evidence/${evidenceId}`, { headers });
      let data;
      try { data = await res.json(); } catch (e) { data = null; }
      console.log('[EvidenceDetail] fetch status', res.status, 'body', data);
      setFetchStatus(res.status);
      setFetchBody(data);
      if (res.ok && data && data.success) {
        const normalized = {
          ...data.data,
          auditLogs: Array.isArray(data.data.auditLogs) ? data.data.auditLogs : Array.isArray(data.data.audit_logs) ? data.data.audit_logs : [],
          amendments: Array.isArray(data.data.amendments) ? data.data.amendments : [],
        };
        setDetail(normalized);
        setAuditLogs(normalized.auditLogs);
        console.log('[EvidenceDetail] auditLogs count', normalized.auditLogs.length, normalized.auditLogs);
      } else {
        console.warn('[EvidenceDetail] evidence fetch failed', data && data.error ? data.error : '(no body)');
        showToast('Evidence not found or backend error', 'error');
      }
    } catch (err) {
      console.error('[EvidenceDetail] loadDetail error', err);
      showToast('Failed to load evidence', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddAmendment = async () => {
    if (!amendNote.trim()) return showToast('Note is required', 'error');
    setSubmittingAmend(true);
    try {
      const res = await fetch(`${API_URL}/evidence/${evidenceId}/amendment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note: amendNote, addedBy: walletAddress || 'anonymous' })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Amendment added successfully', 'success');
        setAmendNote('');
        loadDetail();
      } else {
        console.warn('[EvidenceDetail] add amendment failed', data.error);
        showToast(data.error || 'Failed to add amendment', 'error');
      }
    } catch (err) {
      console.error('[EvidenceDetail] add amendment error', err);
      showToast('Failed to add amendment', 'error');
    } finally {
      setSubmittingAmend(false);
    }
  };

  const openIPFS = () => {
    if (detail?.cid) {
      Linking.openURL(`https://gateway.pinata.cloud/ipfs/${detail.cid}`);
    }
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const result = await generateEvidencePDF(detail);
      if (result.success) {
        if (result.fileName) showToast(`PDF report generated: ${result.fileName}`, 'success');
        if (result.uri) {
          try { await Linking.openURL(result.uri); showToast('PDF opened', 'success'); } catch (e) { showToast(`PDF saved: ${result.uri}`, 'success'); }
        }
      } else {
        showToast(`Failed to generate PDF: ${result.error}`, 'error');
      }
    } catch (err) {
      showToast('Error generating PDF', 'error');
    } finally {
      setGeneratingPDF(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingRoot}>
        <ActivityIndicator color={COLORS.primaryBlue} size="large" />
        <Text style={styles.loadingText}>Loading evidence...</Text>
      </View>
    );
  }

  if (!detail) {
    return (
      <View style={styles.loadingRoot}>
        <Ionicons name="alert-circle" size={48} color={COLORS.error} />
        <Text style={styles.loadingText}>Evidence not found</Text>
        {fetchStatus != null && (
          <View style={{ marginTop: 12, padding: 12, backgroundColor: '#fff5f5', borderRadius: 8 }}>
            <Text style={{ ...TYPOGRAPHY.smallBold, color: COLORS.error, marginBottom: 6 }}>Debug</Text>
            <Text style={{ ...TYPOGRAPHY.small, color: COLORS.textMuted }}>HTTP status: {String(fetchStatus)}</Text>
            <Text style={{ ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 6 }}>{JSON.stringify(fetchBody)}</Text>
          </View>
        )}
      </View>
    );
  }

  const typeInfo = EVIDENCE_TYPES.find(t => t.value === detail.evidence_type) || EVIDENCE_TYPES[2];
  const statusCfg = STATUS_CONFIG[detail.status] || STATUS_CONFIG.pending;
  const tabs = ['info', 'amendments', 'history'];


  let rendered;
  try {
    rendered = (
      <View style={styles.root}>
        <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          {/* Header - large banner with animated accents */}
          <LinearGradient colors={['#0A1628', '#0F2A50', '#1A56DB']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.detailHeader}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerBack}>
              <Ionicons name="chevron-back" size={22} color={COLORS.white} />
            </TouchableOpacity>

            <View style={styles.headerMain}>
              <View style={[styles.detailTypeIcon, { backgroundColor: typeInfo.color + '30' }] }>
                <Ionicons name={typeInfo.icon} size={30} color={COLORS.white} />
              </View>

              <View style={styles.headerTextWrap}>
                <Text style={styles.detailTitle} numberOfLines={1}>{detail.evidence_id}</Text>
                <View style={[styles.detailStatus, { backgroundColor: statusCfg.bg, marginTop:6 }]}>
                  <Ionicons name={statusCfg.icon} size={12} color={statusCfg.color} />
                  <Text style={[styles.detailStatusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
                </View>
              </View>
            </View>

            {/* animated accent circles */}
            <View style={[styles.accentCircle, styles.accent1]} />
            <View style={[styles.accentCircle, styles.accent2]} />
          </LinearGradient>

        {/* Tabs */}
        <View style={styles.tabs}>
          {tabs.map(tab => (
            <TouchableOpacity
              key={tab} style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab === 'info' ? 'Details' : tab === 'amendments' ? `Amendments (${detail.amendments?.length || 0})` : 'History'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

          {activeTab === 'info' && (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Evidence Information</Text>
                <InfoRow icon="id-card" label="Evidence ID" value={detail.evidence_id} mono copyable />
                <InfoRow icon="document-text" label="Description" value={detail.description} unlimited />
                <InfoRow icon="layers" label="Type" value={detail.evidence_type} />
                <InfoRow icon="location" label="Location" value={detail.location} />
                <InfoRow icon="time" label="Uploaded" value={new Date(detail.created_at).toLocaleString()} />
                <InfoRow icon="wallet" label="Uploaded By" value={detail.uploaded_by} mono />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Blockchain Record</Text>
                <InfoRow icon="cube" label="Tx Hash" value={detail.tx_hash || 'Pending'} mono copyable />
                <InfoRow icon="analytics" label="Block" value={detail.block_number?.toString() || 'Pending'} />
                <InfoRow icon="shield-checkmark" label="File Hash" value={detail.file_hash} mono copyable />
                <InfoRow icon="globe" label="CID" value={detail.cid} mono copyable />
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Chain of Custody (recent)</Text>
                {auditLogs.length === 0 ? (
                  <View>
                    <Text style={styles.emptyText}>No activity logs yet.</Text>
                    <Text style={[styles.emptyText, { marginTop: 6, color: COLORS.textSecondary }]}>Activity logs appear after upload, view, amendment, or confirmation actions.</Text>
                  </View>
                ) : (
                  auditLogs.slice(0, 3).map((log, i) => (
                    <AuditItem key={i} item={log} />
                  ))
                )}
                <TouchableOpacity style={styles.historyLink} onPress={() => setActiveTab('history')}>
                  <Text style={styles.historyLinkText}>View full Chain of Custody ›</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>File Information</Text>
                <InfoRow icon="document" label="File Name" value={detail.file_name} />
                <InfoRow icon="resize" label="File Size" value={detail.file_size ? `${(detail.file_size / 1024).toFixed(1)} KB` : '—'} />
                <InfoRow icon="code" label="MIME Type" value={detail.mime_type} />
              </View>

              <TouchableOpacity style={styles.ipfsBtn} onPress={openIPFS}>
                <Ionicons name="globe" size={18} color={COLORS.white} />
                <Text style={styles.ipfsBtnText}>View File on IPFS</Text>
                <Ionicons name="open-outline" size={14} color={COLORS.white} />
              </TouchableOpacity>

              <TouchableOpacity style={[styles.pdfBtn, generatingPDF && { opacity: 0.6 }]} onPress={handleGeneratePDF} disabled={generatingPDF}>
                {generatingPDF ? (
                  <ActivityIndicator color={COLORS.white} size="small" />
                ) : (
                  <>
                    <Ionicons name="document" size={18} color={COLORS.white} />
                    <Text style={styles.pdfBtnText}>Generate PDF Report</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}

          {activeTab === 'amendments' && (
            <>
              <View style={styles.section}>
                <View style={{flexDirection:'row',justifyContent:'space-between',alignItems:'center',marginBottom:SPACING.sm}}>
                  <Text style={styles.sectionTitle}>Add Amendment</Text>
                  <TouchableOpacity onPress={() => setActiveTab('amendments')}>
                    <Text style={{fontSize:12,color:'#1A56DB',fontWeight:'600'}}>View amendments ›</Text>
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={[styles.amendInput, { height: 90 }]}
                  value={amendNote}
                  onChangeText={setAmendNote}
                  placeholder="Enter amendment note or additional findings..."
                  placeholderTextColor={COLORS.textMuted}
                  multiline textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[styles.amendBtn, submittingAmend && { opacity: 0.6 }]}
                  onPress={handleAddAmendment}
                  disabled={submittingAmend}
                >
                  {submittingAmend ? (
                    <ActivityIndicator color={COLORS.white} size="small" />
                  ) : (
                    <Ionicons name="add-circle" size={18} color={COLORS.white} />
                  )}
                  <Text style={styles.amendBtnText}>Submit Amendment</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Amendment History</Text>
                {detail.amendments?.length === 0 ? (
                  <Text style={styles.emptyText}>No amendments yet</Text>
                ) : (
                  detail.amendments?.map((a, i) => <AmendmentItem key={i} item={a} />)
                )}
              </View>
            </>
          )}

          {activeTab === 'history' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Chain of Custody</Text>
              {auditLogs.length === 0 ? (
                <View>
                  <Text style={styles.emptyText}>No activity logs yet.</Text>
                  <Text style={[styles.emptyText, { marginTop: 6, color: COLORS.textSecondary }]}>Refresh the page after viewing or amending evidence to see new log entries.</Text>
                </View>
              ) : (
                auditLogs.map((log, i) => <AuditItem key={i} item={log} />)
              )}
            </View>
          )}
        </ScrollView>
      </View>
    );
  } catch (e) {
    console.error('[EvidenceDetailScreen] render error', e);
    rendered = (
      <View style={styles.loadingRoot}>
        <Text style={[styles.loadingText, { color: COLORS.error }]}>UI render error: {String(e.message || e)}</Text>
      </View>
    );
  }

  return rendered;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  loadingRoot: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 16, backgroundColor: COLORS.offWhite },
  loadingText: { ...TYPOGRAPHY.body, color: COLORS.textMuted },

  detailHeader: { paddingTop: 36, paddingBottom: SPACING.lg + 8, paddingHorizontal: SPACING.md, position: 'relative', overflow: 'hidden' },
  headerBack: { position: 'absolute', left: SPACING.md, top: 12, zIndex: 20, backgroundColor:'rgba(255,255,255,0.06)', padding:8, borderRadius:10 },
  headerMain: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingLeft: 56 },
  headerTextWrap: { flex: 1, paddingRight: SPACING.md },
  detailTypeIcon: {
    width: 68, height: 68, borderRadius: 16, justifyContent: 'center', alignItems: 'center',
    marginBottom: 4, marginLeft: 8, shadowColor: COLORS.primaryBlue, shadowOpacity: 0.18, shadowRadius: 20, shadowOffset: { width:0, height:8 }
  },
  detailTitle: { ...TYPOGRAPHY.h2, color: COLORS.white, fontFamily: 'monospace' },
  detailStatus: {
    flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: RADIUS.full,
  },
  detailStatusText: { ...TYPOGRAPHY.smallBold },

  tabs: { flexDirection: 'row', backgroundColor: COLORS.white, borderBottomWidth: 1, borderBottomColor: COLORS.borderGray, marginTop: 6 },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: { borderBottomColor: COLORS.primaryBlue },
  tabText: { ...TYPOGRAPHY.small, color: COLORS.textMuted, fontWeight: '600' },
  tabTextActive: { color: COLORS.primaryBlue },

  scroll: { flex: 1 },
  content: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 60 },

  section: {
    backgroundColor: COLORS.white, borderRadius: RADIUS.lg,
    padding: SPACING.md, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.borderGray,
  },
  sectionTitle: { ...TYPOGRAPHY.h4, color: COLORS.textPrimary, marginBottom: SPACING.sm },

  infoRow: {
    flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 8, gap: 6,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderGray,
  },
  infoLabel: { ...TYPOGRAPHY.smallBold, color: COLORS.textMuted, width: 80 },
  infoValue: { ...TYPOGRAPHY.body, color: COLORS.textPrimary, flex: 1 },
  monoText: { fontFamily: 'monospace', fontSize: 11 },

  ipfsBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primaryBlue, borderRadius: RADIUS.md, paddingVertical: 12,
  },
  ipfsBtnText: { ...TYPOGRAPHY.bodyMed, color: COLORS.white, fontWeight: '700' },

  pdfBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primaryBlue, borderRadius: RADIUS.md, paddingVertical: 12, marginTop: SPACING.sm,
  },
  pdfBtnText: { ...TYPOGRAPHY.bodyMed, color: COLORS.white, fontWeight: '700' },

  amendInput: {
    borderWidth: 1, borderColor: COLORS.borderGray, borderRadius: RADIUS.md,
    padding: SPACING.sm, ...TYPOGRAPHY.body, color: COLORS.textPrimary,
    backgroundColor: COLORS.offWhite, marginBottom: SPACING.sm,
  },
  amendBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: COLORS.primaryBlue, borderRadius: RADIUS.md, paddingVertical: 10,
  },
  amendBtnText: { ...TYPOGRAPHY.bodyMed, color: COLORS.white, fontWeight: '700' },

  amendmentItem: { flexDirection: 'row', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.borderGray },
  amendmentDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: COLORS.warning, marginTop: 4 },
  amendmentContent: { flex: 1 },
  amendmentId: { ...TYPOGRAPHY.smallBold, color: COLORS.textMuted, fontFamily: 'monospace', marginBottom: 2 },
  amendmentNote: { ...TYPOGRAPHY.body, color: COLORS.textPrimary },
  amendmentMeta: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginTop: 3 },

  auditItem: { flexDirection: 'row', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: COLORS.borderGray },
  auditDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
  auditContent: { flex: 1 },
  auditTopRow: { flexDirection: 'row', justifyContent: 'space-between' },
  auditAction: { ...TYPOGRAPHY.smallBold, fontWeight: '700' },
  auditTime: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  auditBy: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, fontFamily: 'monospace' },
  auditDate: { ...TYPOGRAPHY.small, color: COLORS.textMuted },

  emptyText: { ...TYPOGRAPHY.body, color: COLORS.textMuted, textAlign: 'center', paddingVertical: SPACING.lg },
  historyLink: { marginTop: SPACING.sm, alignItems: 'flex-end' },
  historyLinkText: { fontSize: 12, color: COLORS.primaryBlue, fontWeight: '700' },
  accentCircle: { position: 'absolute', borderRadius: 100, opacity: 0.08 },
  accent1: { width: 220, height: 220, right: -60, top: -40, backgroundColor: '#00D9FF' },
  accent2: { width: 140, height: 140, left: -40, bottom: -30, backgroundColor: '#0080FF' },
});
