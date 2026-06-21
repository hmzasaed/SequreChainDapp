import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Linking, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import Header from '../components/Header';
import Toast from '../components/Toast';
import { useHover, IS_WEB, cursor } from '../utils/hover';
import { generateEvidencePDF } from '../utils/pdfGenerator';

const EVIDENCE_ICONS = {
  image: 'image', video: 'videocam', document: 'document-text',
  forensic: 'flask', audio: 'mic', gps: 'location',
};
const EVIDENCE_COLORS = {
  image: '#3B82F6', video: '#8B5CF6', document: '#10B981',
  forensic: '#F59E0B', audio: '#EF4444', gps: '#06B6D4',
};

function getActionColor(action) {
  const colors = { UPLOAD: '#3B82F6', VIEW: '#10B981', AMEND: '#F59E0B', CONFIRM: '#8B5CF6' };
  return colors[action] || '#64748b';
}

function EvidenceCard({ ev, onDownload, apiUrl, onToast }) {
  const [expanded, setExpanded] = useState(false);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const color = EVIDENCE_COLORS[ev.evidence_type] || '#64748b';
  const icon  = EVIDENCE_ICONS[ev.evidence_type]  || 'document';
  const statusColor = ev.status === 'confirmed' ? COLORS.success : COLORS.pending;

  const loadAuditLogs = async () => {
    if (auditLogs.length > 0) return;
    setLoadingAudit(true);
    try {
      const res = await fetch(`${apiUrl}/evidence/${ev.evidence_id}`);
      const data = await res.json();
      if (data.success && data.data?.auditLogs) {
        setAuditLogs(data.data.auditLogs);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoadingAudit(false);
    }
  };

  const handleExpand = async () => {
    if (!expanded) {
      await loadAuditLogs();
    }
    setExpanded(!expanded);
  };

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    try {
      const result = await generateEvidencePDF(ev);
      if (result.success) {
        if (result.fileName) onToast?.(`PDF generated: ${result.fileName}`, 'success');
        if (result.uri) {
          try { await Linking.openURL(result.uri); onToast?.('PDF opened', 'success'); } catch (e) { onToast?.(`PDF saved: ${result.uri}`, 'success'); }
        }
      } else {
        onToast?.(`Failed to generate PDF: ${result.error}`, 'error');
      }
    } catch (err) {
      onToast?.('Error generating PDF', 'error');
    } finally {
      setGeneratingPDF(false);
    }
  };

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.cardHeader} onPress={handleExpand} activeOpacity={0.8}>
        <View style={[styles.typeIcon, { backgroundColor: `${color}18` }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        <View style={styles.cardTitle}>
          <Text style={styles.cardId} numberOfLines={1}>{ev.evidence_id}</Text>
          <Text style={styles.cardName} numberOfLines={1}>{ev.file_name}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: `${statusColor}18` }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{ev.status}</Text>
        </View>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={COLORS.textMuted} />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.cardBody}>
          <Row label="Case No."    value={ev.case_number  || '—'} />
          <Row label="Description" value={ev.description  || '—'} />
          <Row label="Type"        value={ev.evidence_type} />
          <Row label="Location"    value={ev.location     || '—'} />
          <Row label="Uploaded by" value={ev.uploader_name ? `${ev.uploader_name} (${ev.uploader_role})` : ev.uploaded_by} />
          <Row label="File size"   value={ev.file_size ? `${(ev.file_size / 1024).toFixed(1)} KB` : '—'} />
          <Row label="Date"        value={ev.created_at ? new Date(ev.created_at).toLocaleDateString() : '—'} />

          <View style={styles.hashBox}>
            <Text style={styles.hashLabel}>IPFS CID</Text>
            <Text style={styles.hashValue} numberOfLines={2}>{ev.cid}</Text>
          </View>
          <View style={styles.hashBox}>
            <Text style={styles.hashLabel}>SHA-256 Hash</Text>
            <Text style={styles.hashValue} numberOfLines={2}>{ev.file_hash}</Text>
          </View>

          {ev.tx_hash && (
            <View style={styles.blockchainBadge}>
              <Ionicons name="shield-checkmark" size={13} color={COLORS.success} />
              <Text style={styles.txText} numberOfLines={1}>TX: {ev.tx_hash}</Text>
            </View>
          )}

          {/* Chain of Custody */}
          <View style={styles.chainOfCustodySection}>
            <Text style={styles.chainOfCustodyTitle}>Chain of Custody</Text>
            {loadingAudit ? (
              <ActivityIndicator color={COLORS.primaryBlue} size="small" style={{ marginVertical: 8 }} />
            ) : auditLogs.length === 0 ? (
              <Text style={styles.noCustodyText}>No activity logs</Text>
            ) : (
              auditLogs.slice(0, 3).map((log, i) => (
                <View key={i} style={styles.custodyItem}>
                  <View style={[styles.custodyDot, { backgroundColor: getActionColor(log.action) }]} />
                  <View style={styles.custodyContent}>
                    <Text style={styles.custodyAction}>{log.action}</Text>
                    <Text style={styles.custodyBy}>{log.performed_by?.slice(0, 12)}...</Text>
                    <Text style={styles.custodyTime}>{new Date(log.created_at).toLocaleString()}</Text>
                  </View>
                </View>
              ))
            )}
            {auditLogs.length > 3 && (
              <Text style={styles.moreLogsText}>+{auditLogs.length - 3} more entries</Text>
            )}
          </View>

          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#eff6ff' }]}
              onPress={() => Linking.openURL(`https://gateway.pinata.cloud/ipfs/${ev.cid}`).catch(() => Alert.alert('Error', 'Could not open URL'))}
            >
              <Ionicons name="eye" size={14} color={COLORS.primaryBlue} />
              <Text style={[styles.actionBtnText, { color: COLORS.primaryBlue }]}>View on IPFS</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: '#ecfdf5' }]}
              onPress={() => onDownload(ev)}
            >
              <Ionicons name="cloud-download" size={14} color={COLORS.success} />
              <Text style={[styles.actionBtnText, { color: COLORS.success }]}>Download</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[styles.pdfButton, generatingPDF && { opacity: 0.6 }]}
            onPress={handleGeneratePDF}
            disabled={generatingPDF}
          >
            {generatingPDF ? (
              <ActivityIndicator color={COLORS.white} size="small" />
            ) : (
              <Ionicons name="document-outline" size={14} color={COLORS.white} />
            )}
            <Text style={styles.pdfButtonText}>Generate PDF Report</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function BrowseEvidenceScreen({ navigation }) {
  const { browseEvidence, loading, toast, API_URL, showToast } = useApp();

  const [mode,    setMode]    = useState('cid');   // 'cid' | 'case' | 'search'
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState(null);    // null = not searched yet
  const [error,   setError]   = useState('');

  const doSearch = async () => {
    if (!query.trim()) return;
    setError('');
    setResults(null);

    const params = {};
    if (mode === 'cid')    params.cid         = query.trim();
    if (mode === 'case')   params.case_number = query.trim();
    if (mode === 'search') params.search      = query.trim();

    const res = await browseEvidence(params);
    if (res.success) {
      setResults(res.data || []);
    } else {
      setError(res.error || 'No results found');
      setResults([]);
    }
  };

  const handleDownload = (ev) => {
    const url = ev.gateway_url || `https://gateway.pinata.cloud/ipfs/${ev.cid}`;
    Linking.openURL(url).catch(() =>
      Alert.alert('Download', `Open this URL to download:\n\n${url}`)
    );
  };

  const placeholder = {
    cid:    'Enter full IPFS CID (bafybei...)',
    case:   'Enter case number (e.g. CASE-2024-0891)',
    search: 'Search by name, description, uploader...',
  }[mode];

  return (
    <View style={styles.root}>
      <Header title="Browse Evidence" navigation={navigation} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        {/* Mode selector */}
        <View style={styles.modeRow}>
          {[
            { id:'cid',    label:'By CID',        icon:'link' },
            { id:'case',   label:'By Case ID',    icon:'briefcase' },
            { id:'search', label:'Keyword Search', icon:'search' },
          ].map(m => (
            <TouchableOpacity
              key={m.id}
              style={[styles.modeBtn, mode === m.id && styles.modeBtnOn]}
              onPress={() => { setMode(m.id); setQuery(''); setResults(null); setError(''); }}
            >
              <Ionicons name={m.icon} size={13} color={mode === m.id ? COLORS.white : COLORS.textSecondary} />
              <Text style={[styles.modeBtnText, mode === m.id && styles.modeBtnTextOn]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Search input */}
        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder={placeholder}
            placeholderTextColor={COLORS.textMuted}
            onSubmitEditing={doSearch}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          <TouchableOpacity style={styles.searchBtn} onPress={doSearch} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.white} size="small" />
              : <Ionicons name="search" size={18} color={COLORS.white} />
            }
          </TouchableOpacity>
        </View>

        {/* Info box */}
        <View style={styles.infoBox}>
          <Ionicons name="information-circle" size={16} color={COLORS.primaryBlue} />
          <Text style={styles.infoText}>
            {mode === 'cid'
              ? 'Paste the full IPFS Content Identifier to find one exact record.'
              : mode === 'case'
              ? 'Enter a case number (e.g. CASE-2024-0891) to see all evidence for that case.'
              : 'Search across file names, descriptions, case numbers, and uploader names.'}
          </Text>
        </View>

        {/* Error */}
        {error !== '' && (
          <View style={styles.errorBox}>
            <Ionicons name="alert-circle" size={16} color={COLORS.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Results */}
        {results !== null && results.length === 0 && !error && (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={40} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No evidence found</Text>
            <Text style={styles.emptyText}>Try a different search term or mode</Text>
          </View>
        )}

        {results !== null && results.length > 0 && (
          <>
            <Text style={styles.resultCount}>{results.length} record{results.length !== 1 ? 's' : ''} found</Text>
            {results.map(ev => (
              <EvidenceCard key={ev.evidence_id} ev={ev} onDownload={handleDownload} apiUrl={API_URL} onToast={showToast} />
            ))}
          </>
        )}

        {/* Not searched yet */}
        {results === null && !loading && (
          <View style={styles.emptyState}>
            <Ionicons name="folder-open-outline" size={44} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>Enter a search to browse evidence</Text>
            <Text style={styles.emptyText}>Search by CID, case number, or keyword</Text>
          </View>
        )}

      </ScrollView>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex:1, backgroundColor: COLORS.offWhite },
  content: { padding: SPACING.md, paddingBottom: 60, gap: SPACING.sm },

  modeRow: { flexDirection:'row', gap:6 },
  modeBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:4, paddingVertical:8, borderRadius:RADIUS.md, borderWidth:1, borderColor:COLORS.borderGray, backgroundColor:COLORS.white },
  modeBtnOn: { backgroundColor:COLORS.primaryBlue, borderColor:COLORS.primaryBlue },
  modeBtnText:   { fontSize:10, fontWeight:'600', color:COLORS.textSecondary },
  modeBtnTextOn: { color:COLORS.white },

  searchRow:  { flexDirection:'row', gap:8 },
  searchInput:{ flex:1, borderWidth:1, borderColor:COLORS.borderGray, borderRadius:RADIUS.md, paddingHorizontal:SPACING.sm, paddingVertical:SPACING.sm, fontSize:13, color:COLORS.textPrimary, backgroundColor:COLORS.white, fontFamily:'monospace' },
  searchBtn:  { width:46, height:46, borderRadius:RADIUS.md, backgroundColor:COLORS.primaryBlue, justifyContent:'center', alignItems:'center' },

  infoBox:  { flexDirection:'row', alignItems:'flex-start', gap:8, backgroundColor:'#eff6ff', borderRadius:RADIUS.md, padding:SPACING.sm, borderWidth:1, borderColor:'#bfdbfe' },
  infoText: { flex:1, fontSize:11, color:'#1d4ed8', lineHeight:17 },
  errorBox: { flexDirection:'row', alignItems:'center', gap:8, backgroundColor:COLORS.errorBg, borderRadius:RADIUS.md, padding:SPACING.sm, borderWidth:1, borderColor:COLORS.error },
  errorText:{ flex:1, fontSize:11, color:COLORS.error },

  resultCount: { fontSize:12, color:COLORS.textMuted, marginBottom:4 },

  card:       { backgroundColor:COLORS.white, borderRadius:RADIUS.lg, borderWidth:1, borderColor:COLORS.borderGray, overflow:'hidden', ...SHADOWS.card },
  cardHeader: { flexDirection:'row', alignItems:'center', gap:9, padding:SPACING.sm+2 },
  typeIcon:   { width:40, height:40, borderRadius:RADIUS.md, justifyContent:'center', alignItems:'center', flexShrink:0 },
  cardTitle:  { flex:1, minWidth:0 },
  cardId:     { fontSize:10, fontFamily:'monospace', fontWeight:'600', color:COLORS.textPrimary },
  cardName:   { fontSize:10, color:COLORS.textMuted, marginTop:1 },
  statusBadge:{ paddingHorizontal:8, paddingVertical:2, borderRadius:20 },
  statusText: { fontSize:9, fontWeight:'700' },

  cardBody:   { borderTopWidth:1, borderTopColor:COLORS.borderGray, padding:SPACING.sm+2, gap:4 },
  row:        { flexDirection:'row', gap:8, paddingVertical:3, borderBottomWidth:1, borderBottomColor:'#f1f5f9' },
  rowLabel:   { width:80, fontSize:10, color:COLORS.textMuted, flexShrink:0 },
  rowValue:   { flex:1, fontSize:10, color:COLORS.textPrimary },

  hashBox:    { backgroundColor:'#f8faff', borderRadius:RADIUS.sm, padding:8, marginTop:4 },
  hashLabel:  { fontSize:9, color:COLORS.textMuted, letterSpacing:0.5, marginBottom:3 },
  hashValue:  { fontSize:9, fontFamily:'monospace', color:COLORS.textSecondary, lineHeight:14 },

  blockchainBadge: { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:COLORS.successBg, borderRadius:RADIUS.sm, padding:6, marginTop:4 },
  txText:          { flex:1, fontSize:9, fontFamily:'monospace', color:COLORS.success },

  actionRow: { flexDirection:'row', gap:8, marginTop:8 },
  actionBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:5, paddingVertical:9, borderRadius:RADIUS.md },
  actionBtnText: { fontSize:11, fontWeight:'600' },

  pdfButton: { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, backgroundColor:COLORS.primaryBlue, marginTop:8, marginHorizontal:8, paddingVertical:10, borderRadius:RADIUS.md },
  pdfButtonText: { fontSize:11, fontWeight:'600', color:COLORS.white },

  chainOfCustodySection: { backgroundColor:'#f0f9ff', borderRadius:RADIUS.sm, padding:SPACING.sm, marginTop:8, borderLeftWidth:3, borderLeftColor:COLORS.primaryBlue },
  chainOfCustodyTitle: { fontSize:11, fontWeight:'700', color:COLORS.textPrimary, marginBottom:6 },
  custodyItem: { flexDirection:'row', gap:8, paddingVertical:6, borderBottomWidth:1, borderBottomColor:'#e0f2fe' },
  custodyDot: { width:6, height:6, borderRadius:3, marginTop:4, flexShrink:0 },
  custodyContent: { flex:1, minWidth:0 },
  custodyAction: { fontSize:10, fontWeight:'600', color:COLORS.textPrimary },
  custodyBy: { fontSize:9, color:COLORS.textMuted, fontFamily:'monospace', marginTop:1 },
  custodyTime: { fontSize:8, color:COLORS.textMuted, marginTop:2 },
  noCustodyText: { fontSize:10, color:COLORS.textMuted, fontStyle:'italic', paddingVertical:4 },
  moreLogsText: { fontSize:9, color:COLORS.primaryBlue, fontWeight:'600', marginTop:4, textAlign:'center' },

  emptyState: { alignItems:'center', paddingVertical:40, gap:SPACING.sm },
  emptyTitle: { fontSize:14, fontWeight:'600', color:COLORS.textPrimary },
  emptyText:  { fontSize:12, color:COLORS.textMuted, textAlign:'center' },
});
