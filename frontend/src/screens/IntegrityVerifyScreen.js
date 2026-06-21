import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import Header from '../components/Header';
import Toast from '../components/Toast';
import { useHover, IS_WEB, cursor } from '../utils/hover';

// ─── SHA-256 via Web Crypto (works on Expo web) ────────────────────────────
async function sha256FromUri(uri) {
  try {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const response = await fetch(uri);
      const buf      = await response.arrayBuffer();
      const hash     = await window.crypto.subtle.digest('SHA-256', buf);
      return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
    }
    // Native fallback
    const b64  = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
    const raw  = atob(b64);
    const buf  = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i);
    const hash = await window.crypto.subtle.digest('SHA-256', buf.buffer);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2,'0')).join('');
  } catch (e) {
    throw new Error('Could not compute hash: ' + e.message);
  }
}

function ResultCard({ result }) {
  if (!result) return null;
  const ok = result.isValid;
  const color = ok ? COLORS.success : COLORS.error;
  const bg    = ok ? COLORS.successBg : COLORS.errorBg;

  return (
    <View style={[styles.resultCard, { borderColor: color }]}>
      <View style={[styles.resultHeader, { backgroundColor: bg }]}>
        <Ionicons name={ok ? 'checkmark-circle' : 'close-circle'} size={28} color={color} />
        <View style={{ flex:1 }}>
          <Text style={[styles.resultTitle, { color }]}>
            {ok ? 'INTEGRITY VERIFIED' : 'TAMPER DETECTED'}
          </Text>
          <Text style={[styles.resultSub, { color }]}>
            {ok ? 'File is authentic and unmodified.' : 'Hash does not match blockchain record.'}
          </Text>
        </View>
      </View>
      <View style={styles.resultBody}>
        {result.evidenceId  && <Row label="Evidence ID" value={result.evidenceId} mono />}
        {result.cid         && <Row label="CID"         value={result.cid} mono />}
        {result.testedHash  && <Row label="Tested hash" value={result.testedHash.slice(0,32)+'...'} mono />}
        <Row label="Network"     value="Ethereum Sepolia" />
        <Row label="Verified at" value={new Date().toLocaleString()} />
      </View>
    </View>
  );
}

function Row({ label, value, mono }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, mono && { fontFamily:'monospace', fontSize:9 }]} numberOfLines={2}>{value}</Text>
    </View>
  );
}

export default function IntegrityVerifyScreen({ navigation }) {
  const { API_URL, toast } = useApp();

  // Mode A — verify by evidence ID + hash
  const [evidenceId,  setEvidenceId]  = useState('');
  const [fileHash,    setFileHash]    = useState('');
  const [verifying,   setVerifying]   = useState(false);
  const [resultA,     setResultA]     = useState(null);

  // Mode B — verify by CID lookup
  const [cidInput,    setCidInput]    = useState('');
  const [verifyingB,  setVerifyingB]  = useState(false);
  const [resultB,     setResultB]     = useState(null);

  // Mode C — re-upload & hash file
  const [pickedFile,  setPickedFile]  = useState(null);
  const [computedHash,setComputedHash]= useState('');
  const [hashLoading, setHashLoading] = useState(false);
  const [resultC,     setResultC]     = useState(null);

  const [activeTab, setActiveTab] = useState('A');

  // ── Mode A ────────────────────────────────────────────────────────────────
  const verifyByHash = async () => {
    if (!evidenceId.trim() || !fileHash.trim()) return;
    setVerifying(true); setResultA(null);
    try {
      const res  = await fetch(`${API_URL}/blockchain/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId: evidenceId.trim(), fileHash: fileHash.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setResultA({ isValid: data.data.isValid, evidenceId: evidenceId.trim(), testedHash: fileHash.trim() });
      } else {
        setResultA({ isValid: false, evidenceId: evidenceId.trim(), testedHash: fileHash.trim(), error: data.error });
      }
    } catch (e) {
      setResultA({ isValid: false, error: e.message });
    } finally { setVerifying(false); }
  };

  // ── Mode B — verify by CID ────────────────────────────────────────────────
  const verifyByCid = async () => {
    if (!cidInput.trim()) return;
    setVerifyingB(true); setResultB(null);
    try {
      const res  = await fetch(`${API_URL}/evidence/browse?cid=${encodeURIComponent(cidInput.trim())}`);
      const data = await res.json();
      if (data.success && data.data.length > 0) {
        const ev = data.data[0];
        // CID found in DB = it's an authentic record
        setResultB({ isValid: true, evidenceId: ev.evidence_id, cid: cidInput.trim(), testedHash: ev.file_hash, uploader: ev.uploader_name || ev.uploaded_by, caseNumber: ev.case_number });
      } else {
        setResultB({ isValid: false, cid: cidInput.trim(), error: 'CID not found in database — this file may have been tampered with or was never uploaded through SeQureChain' });
      }
    } catch (e) {
      setResultB({ isValid: false, error: e.message });
    } finally { setVerifyingB(false); }
  };

  // ── Mode C — pick file, compute hash, compare ─────────────────────────────
  const pickAndHash = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
      if (result.canceled) return;
      const file = result.assets?.[0] || result;
      setPickedFile(file);
      setComputedHash('');
      setResultC(null);
      setHashLoading(true);
      const hash = await sha256FromUri(file.uri);
      setComputedHash(hash);
      setHashLoading(false);
    } catch (e) {
      setHashLoading(false);
      alert('Error computing hash: ' + e.message);
    }
  };

  const verifyByFile = async () => {
    if (!computedHash || !evidenceId.trim()) return;
    setVerifying(true); setResultC(null);
    try {
      const res  = await fetch(`${API_URL}/blockchain/verify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evidenceId: evidenceId.trim(), fileHash: computedHash }),
      });
      const data = await res.json();
      setResultC({ isValid: data.data?.isValid ?? false, evidenceId: evidenceId.trim(), testedHash: computedHash });
    } catch (e) {
      setResultC({ isValid: false, error: e.message });
    } finally { setVerifying(false); }
  };

  return (
    <View style={styles.root}>
      <Header title="Integrity Verify" navigation={navigation} />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

        <View style={styles.infoBox}>
          <Ionicons name="shield-checkmark" size={16} color={COLORS.primaryBlue} />
          <Text style={styles.infoText}>Three ways to verify file integrity against the Ethereum blockchain record.</Text>
        </View>

        {/* Tab bar */}
        <View style={styles.tabs}>
          {[
            { id:'A', label:'Hash Verify'  },
            { id:'B', label:'By CID'       },
            { id:'C', label:'Re-upload'    },
          ].map(t => (
            <TouchableOpacity
              key={t.id}
              style={[styles.tab, activeTab === t.id && styles.tabOn]}
              onPress={() => setActiveTab(t.id)}
            >
              <Text style={[styles.tabText, activeTab === t.id && styles.tabTextOn]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── TAB A ──────────────────────────────────────────────────────── */}
        {activeTab === 'A' && (
          <View style={styles.tabPanel}>
            <Text style={styles.panelTitle}>Verify by Evidence ID + SHA-256 Hash</Text>
            <Text style={styles.panelSub}>Enter the SQC evidence ID and the SHA-256 hash of the original file. The hash is checked against the on-chain record.</Text>

            <Text style={styles.fieldLabel}>EVIDENCE ID</Text>
            <TextInput style={styles.input} value={evidenceId} onChangeText={setEvidenceId}
              placeholder="SQC-1735900800-A3F9B2C1" placeholderTextColor={COLORS.textMuted}
              autoCapitalize="characters" autoCorrect={false} />

            <Text style={styles.fieldLabel}>SHA-256 FILE HASH</Text>
            <TextInput style={[styles.input, styles.hashInput]} value={fileHash} onChangeText={setFileHash}
              placeholder="e3b0c44298fc1c149afbf4c8996fb924..." placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none" autoCorrect={false} multiline />

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setEvidenceId(''); setFileHash(''); setResultA(null); }}>
                <Text style={styles.clearBtnText}>↺ Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.verifyBtn, verifying && styles.verifyBtnDisabled]} onPress={verifyByHash} disabled={verifying}>
                {verifying ? <ActivityIndicator color={COLORS.white} size="small" /> : <><Ionicons name="shield-checkmark" size={15} color={COLORS.white} /><Text style={styles.verifyBtnText}>Verify on Blockchain</Text></>}
              </TouchableOpacity>
            </View>

            <ResultCard result={resultA} />
          </View>
        )}

        {/* ── TAB B ──────────────────────────────────────────────────────── */}
        {activeTab === 'B' && (
          <View style={styles.tabPanel}>
            <Text style={styles.panelTitle}>Verify by IPFS CID</Text>
            <Text style={styles.panelSub}>Enter an IPFS Content Identifier. The system looks it up in the database to confirm it was legitimately recorded through SeQureChain.</Text>

            <Text style={styles.fieldLabel}>IPFS CID</Text>
            <TextInput style={styles.input} value={cidInput} onChangeText={setCidInput}
              placeholder="bafybeigdyrzt5sfp7kdmsgkozumnlg..." placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none" autoCorrect={false} />

            <View style={styles.btnRow}>
              <TouchableOpacity style={styles.clearBtn} onPress={() => { setCidInput(''); setResultB(null); }}>
                <Text style={styles.clearBtnText}>↺ Clear</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.verifyBtn, verifyingB && styles.verifyBtnDisabled]} onPress={verifyByCid} disabled={verifyingB}>
                {verifyingB ? <ActivityIndicator color={COLORS.white} size="small" /> : <><Ionicons name="link" size={15} color={COLORS.white} /><Text style={styles.verifyBtnText}>Lookup CID</Text></>}
              </TouchableOpacity>
            </View>

            {resultB && (
              <View style={[styles.resultCard, { borderColor: resultB.isValid ? COLORS.success : COLORS.error }]}>
                <View style={[styles.resultHeader, { backgroundColor: resultB.isValid ? COLORS.successBg : COLORS.errorBg }]}>
                  <Ionicons name={resultB.isValid ? 'checkmark-circle' : 'close-circle'} size={28} color={resultB.isValid ? COLORS.success : COLORS.error} />
                  <View style={{ flex:1 }}>
                    <Text style={[styles.resultTitle, { color: resultB.isValid ? COLORS.success : COLORS.error }]}>
                      {resultB.isValid ? 'CID VERIFIED' : 'CID NOT FOUND'}
                    </Text>
                    <Text style={[styles.resultSub, { color: resultB.isValid ? COLORS.success : COLORS.error }]}>
                      {resultB.isValid ? 'This file was legitimately uploaded through SeQureChain.' : (resultB.error || 'CID not found in database.')}
                    </Text>
                  </View>
                </View>
                {resultB.isValid && (
                  <View style={styles.resultBody}>
                    <Row label="Evidence ID"  value={resultB.evidenceId} mono />
                    <Row label="Uploader"     value={resultB.uploader || '—'} />
                    <Row label="Case No."     value={resultB.caseNumber || '—'} />
                    <Row label="File hash"    value={(resultB.testedHash || '').slice(0,32)+'...'} mono />
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* ── TAB C ──────────────────────────────────────────────────────── */}
        {activeTab === 'C' && (
          <View style={styles.tabPanel}>
            <Text style={styles.panelTitle}>Verify by Re-uploading File</Text>
            <Text style={styles.panelSub}>Select the original file from your device. The app computes its SHA-256 hash locally (no upload needed) and compares it against the blockchain record.</Text>

            <TouchableOpacity style={styles.pickBtn} onPress={pickAndHash}>
              <Ionicons name="document-attach" size={20} color={COLORS.primaryBlue} />
              <Text style={styles.pickBtnText}>{pickedFile ? 'Change File' : 'Select File to Hash'}</Text>
            </TouchableOpacity>

            {hashLoading && (
              <View style={styles.hashingBox}>
                <ActivityIndicator color={COLORS.primaryBlue} size="small" />
                <Text style={styles.hashingText}>Computing SHA-256 hash...</Text>
              </View>
            )}

            {pickedFile && computedHash !== '' && (
              <View style={styles.fileBox}>
                <Text style={styles.fileBoxName} numberOfLines={1}>{pickedFile.name}</Text>
                <View style={styles.hashResult}>
                  <Text style={styles.hashResultLabel}>Computed SHA-256:</Text>
                  <Text style={styles.hashResultValue}>{computedHash}</Text>
                </View>
              </View>
            )}

            {computedHash !== '' && (
              <>
                <Text style={styles.fieldLabel}>EVIDENCE ID TO COMPARE AGAINST</Text>
                <TextInput style={styles.input} value={evidenceId} onChangeText={setEvidenceId}
                  placeholder="SQC-1735900800-A3F9B2C1" placeholderTextColor={COLORS.textMuted}
                  autoCapitalize="characters" autoCorrect={false} />

                <TouchableOpacity
                  style={[styles.verifyBtn, (verifying || !evidenceId.trim()) && styles.verifyBtnDisabled]}
                  onPress={verifyByFile}
                  disabled={verifying || !evidenceId.trim()}
                >
                  {verifying ? <ActivityIndicator color={COLORS.white} size="small" /> : <><Ionicons name="shield-checkmark" size={15} color={COLORS.white} /><Text style={styles.verifyBtnText}>Compare with Blockchain Record</Text></>}
                </TouchableOpacity>
              </>
            )}

            <ResultCard result={resultC} />
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
  infoBox: { flexDirection:'row', alignItems:'flex-start', gap:8, backgroundColor:'#eff6ff', borderRadius:RADIUS.md, padding:SPACING.sm, borderWidth:1, borderColor:'#bfdbfe' },
  infoText:{ flex:1, fontSize:11, color:'#1d4ed8', lineHeight:17 },
  tabs:    { flexDirection:'row', backgroundColor:COLORS.white, borderRadius:RADIUS.md, borderWidth:1, borderColor:COLORS.borderGray, overflow:'hidden' },
  tab:     { flex:1, paddingVertical:10, alignItems:'center' },
  tabOn:   { backgroundColor:COLORS.primaryBlue },
  tabText: { fontSize:12, fontWeight:'600', color:COLORS.textSecondary },
  tabTextOn:{ color:COLORS.white },
  tabPanel: { backgroundColor:COLORS.white, borderRadius:RADIUS.lg, borderWidth:1, borderColor:COLORS.borderGray, padding:SPACING.md, gap: SPACING.xs, ...SHADOWS.card },
  panelTitle:{ fontSize:13, fontWeight:'600', color:COLORS.textPrimary },
  panelSub:  { fontSize:11, color:COLORS.textMuted, lineHeight:17, marginBottom:4 },
  fieldLabel:{ fontSize:10, color:COLORS.textSecondary, letterSpacing:0.5, fontWeight:'600', marginTop:4 },
  input:     { borderWidth:1, borderColor:COLORS.borderGray, borderRadius:RADIUS.md, padding:SPACING.sm, fontSize:12, color:COLORS.textPrimary, backgroundColor:COLORS.offWhite, fontFamily:'monospace' },
  hashInput: { minHeight:60, textAlignVertical:'top' },
  btnRow:    { flexDirection:'row', gap:8, marginTop:4 },
  clearBtn:  { padding:SPACING.sm, borderRadius:RADIUS.md, borderWidth:1, borderColor:COLORS.borderGray, backgroundColor:COLORS.white, justifyContent:'center' },
  clearBtnText:{ fontSize:12, color:COLORS.textSecondary },
  verifyBtn: { flex:1, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:6, backgroundColor:COLORS.primaryBlue, borderRadius:RADIUS.md, padding:SPACING.sm, ...SHADOWS.card },
  verifyBtnDisabled:{ opacity:0.6 },
  verifyBtnText:{ fontSize:12, fontWeight:'600', color:COLORS.white },
  pickBtn:   { flexDirection:'row', alignItems:'center', justifyContent:'center', gap:8, borderWidth:2, borderStyle:'dashed', borderColor:COLORS.primaryBlue, borderRadius:RADIUS.lg, padding:SPACING.md, backgroundColor:'rgba(219,234,254,.15)' },
  pickBtnText:{ fontSize:13, fontWeight:'600', color:COLORS.primaryBlue },
  hashingBox:{ flexDirection:'row', alignItems:'center', gap:8, padding:SPACING.sm },
  hashingText:{ fontSize:12, color:COLORS.textSecondary },
  fileBox:   { backgroundColor:COLORS.offWhite, borderRadius:RADIUS.md, padding:SPACING.sm, borderWidth:1, borderColor:COLORS.borderGray, gap:6 },
  fileBoxName:{ fontSize:12, fontWeight:'600', color:COLORS.textPrimary },
  hashResult:{ gap:3 },
  hashResultLabel:{ fontSize:9, color:COLORS.textMuted, letterSpacing:0.5 },
  hashResultValue:{ fontSize:9, fontFamily:'monospace', color:COLORS.textSecondary, lineHeight:14 },
  resultCard:{ borderWidth:2, borderRadius:RADIUS.lg, overflow:'hidden', marginTop:8 },
  resultHeader:{ flexDirection:'row', alignItems:'flex-start', gap:10, padding:SPACING.sm+2 },
  resultTitle: { fontSize:13, fontWeight:'700' },
  resultSub:   { fontSize:10, marginTop:2, lineHeight:16 },
  resultBody:  { padding:SPACING.sm+2, backgroundColor:COLORS.white, gap:0 },
  row:         { flexDirection:'row', gap:8, paddingVertical:4, borderBottomWidth:1, borderBottomColor:COLORS.borderGray },
  rowLabel:    { width:80, fontSize:10, color:COLORS.textMuted, flexShrink:0 },
  rowValue:    { flex:1, fontSize:10, color:COLORS.textPrimary },
});
