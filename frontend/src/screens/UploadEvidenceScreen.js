/**
 * UploadEvidenceScreen v9
 * Flow: Select file → fill details → Submit → IPFS upload → MetaMask popup (real) → TX hash saved
 * No custom TX modal — MetaMask's own popup handles confirmation.
 */
import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, ActivityIndicator, Modal, useWindowDimensions, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import Header from '../components/Header';
import Toast from '../components/Toast';

const EVIDENCE_TYPES = [
  { value:'image',    label:'Image',    icon:'image',         color:'#3B82F6' },
  { value:'video',    label:'Video',    icon:'videocam',      color:'#8B5CF6' },
  { value:'document', label:'Document', icon:'document-text', color:'#10B981' },
  { value:'forensic', label:'Forensic', icon:'flask',         color:'#F59E0B' },
  { value:'audio',    label:'Audio',    icon:'mic',           color:'#EF4444' },
  { value:'gps',      label:'GPS Data', icon:'location',      color:'#06B6D4' },
];

// ── Animated floating icons for drop zone ──────────────────────────────────────
function FloatingIcons() {
  const animVals = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    animVals.forEach((anim, i) => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(anim, { toValue: 1, duration: 2000 + i * 200, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 2000 + i * 200, useNativeDriver: true }),
        ])
      ).start();
    });
  }, []);

  const icons = [
    { icon: 'image', color: '#3B82F6', pos: 'left' },
    { icon: 'document-text', color: '#10B981', pos: 'center' },
    { icon: 'videocam', color: '#8B5CF6', pos: 'right' },
  ];

  return (
    <View style={s.floatingIconsContainer}>
      {icons.map((item, i) => {
        const translateY = animVals[i].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, -12, 0],
        });
        const opacity = animVals[i].interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0.4, 1, 0.4],
        });
        return (
          <Animated.View
            key={i}
            style={[
              s.floatingIcon,
              s[`floatingIcon${item.pos}`],
              { transform: [{ translateY }], opacity }
            ]}
          >
            <View style={[s.floatingIconBg, { backgroundColor: item.color + '20' }]}>
              <Ionicons name={item.icon} size={28} color={item.color} />
            </View>
          </Animated.View>
        );
      })}
    </View>
  );
}

function SuccessModal({ visible, results, onViewHistory, onDashboard }) {
  const { width } = useWindowDimensions();
  return (
    <Modal visible={visible} transparent animationType="slide" statusBarTranslucent>
      <View style={suc.overlay}>
        <View style={[suc.card, { width: Math.min(width - 40, 400) }]}>
          <View style={suc.iconWrap}>
            <Ionicons name="checkmark-circle" size={64} color="#10B981" />
          </View>
          <Text style={suc.title}>Upload Complete!</Text>
          <Text style={suc.sub}>
            {results.length} evidence record{results.length !== 1 ? 's' : ''} uploaded to IPFS and recorded on Ethereum Sepolia.
          </Text>

          {results.map((r, i) => (
            <View key={i} style={suc.row}>
              <View style={suc.badge}><Text style={suc.badgeText}>{i + 1}</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={suc.evId} numberOfLines={1}>{r.evidence_id}</Text>
                <Text style={suc.cid} numberOfLines={1}>CID: {r.cid ? r.cid.slice(0, 28) + '...' : '—'}</Text>
                {r.txHash ? (
                  <>
                    <Text style={suc.tx} numberOfLines={1}>TX: {r.txHash.slice(0, 20)}...</Text>
                    {r.blockNumber ? (
                      <Text style={suc.block}>Block: {r.blockNumber} ✓ Confirmed</Text>
                    ) : (
                      <Text style={suc.txPending}>Submitted — waiting for block...</Text>
                    )}
                  </>
                ) : (
                  <Text style={suc.txPending}>Blockchain: pending</Text>
                )}
              </View>
            </View>
          ))}

          <View style={suc.btns}>
            <TouchableOpacity style={suc.histBtn} onPress={onViewHistory} activeOpacity={0.85}>
              <Ionicons name="time" size={16} color="#fff" />
              <Text style={suc.btnText}>View History</Text>
            </TouchableOpacity>
            <TouchableOpacity style={suc.dashBtn} onPress={onDashboard} activeOpacity={0.85}>
              <Ionicons name="grid" size={16} color="#fff" />
              <Text style={suc.btnText}>Dashboard</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ── File card ─────────────────────────────────────────────────────────────────
function FileCard({ file, index, total, onRemove, onTypeChange, onDescChange }) {
  const [descHeight, setDescHeight] = useState(0);
  return (
    <View style={s.fileCard}>
      <View style={s.fileHead}>
        <View style={s.badge}><Text style={s.badgeText}>{index + 1}/{total}</Text></View>
        <View style={{ flex: 1 }}>
          <Text style={s.fileName} numberOfLines={1}>{file.name}</Text>
          <Text style={s.fileMeta}>{(file.size / 1024).toFixed(1)} KB · {file.mimeType || 'file'}</Text>
        </View>
        <TouchableOpacity style={s.removeBtn} onPress={onRemove}>
          <Ionicons name="close" size={14} color={COLORS.error} />
        </TouchableOpacity>
      </View>

      <View style={s.fileBody}>
        <Text style={s.label}>EVIDENCE TYPE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={s.chips}>
            {EVIDENCE_TYPES.map(t => (
              <TouchableOpacity
                key={t.value}
                style={[s.chip, file.type === t.value && { backgroundColor: t.color, borderColor: t.color }]}
                onPress={() => onTypeChange(t.value)}
                activeOpacity={0.75}
              >
                <Ionicons name={t.icon} size={11} color={file.type === t.value ? '#fff' : t.color} />
                <Text style={[s.chipText, file.type === t.value && { color: '#fff' }]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <Text style={[s.label, { marginTop: 8 }]}>DESCRIPTION *</Text>
        <TextInput
          style={[s.descInput, { height: Math.max(56, descHeight) }]}
          value={file.description}
          onChangeText={onDescChange}
          placeholder="Describe this evidence..."
          placeholderTextColor={COLORS.textMuted}
          multiline
          textAlignVertical="top"
          onContentSizeChange={(e) => setDescHeight(e.nativeEvent.contentSize.height)}
        />
      </View>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function UploadEvidenceScreen({ navigation }) {
  const { walletAddress, currentUser, uploadAndConfirm, showToast, toast } = useApp();
  const { width } = useWindowDimensions();
  const isWide = width >= 768;

  const [files,      setFiles]      = useState([]);
  const [location,   setLocation]   = useState('');
  const [caseNumber, setCaseNumber] = useState('');
  const [gpsLoading, setGpsLoading] = useState(false);

  // Upload state — shown in the submit button
  const [uploading,  setUploading]  = useState(false);
  const [statusLine, setStatusLine] = useState('');

  // Success
  const [showSuccess, setShowSuccess] = useState(false);
  const [results,     setResults]     = useState([]);

  const pickFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: true, copyToCacheDirectory: true });
      if (result.canceled) return;
      const picked = (result.assets || [result]).filter(a => a?.uri);
      setFiles(prev => [...prev, ...picked.map(f => ({
        name:        f.name     || 'unknown',
        size:        f.size     || 0,
        mimeType:    f.mimeType || 'application/octet-stream',
        uri:         f.uri,
        file:        f.file     || null,
        type:        'document',
        description: '',
      }))]);
    } catch { showToast('Could not pick files', 'error'); }
  };

  const getGps = async () => {
    setGpsLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { showToast('Location permission denied', 'error'); return; }
      const loc = await Location.getCurrentPositionAsync({});
      setLocation(`${loc.coords.latitude.toFixed(6)}, ${loc.coords.longitude.toFixed(6)}`);
    } catch { showToast('Could not get location', 'error'); }
    finally { setGpsLoading(false); }
  };

  const updateFile = (i, field, val) =>
    setFiles(prev => prev.map((f, idx) => idx === i ? { ...f, [field]: val } : f));

  const removeFile = (i) => setFiles(prev => prev.filter((_, idx) => idx !== i));

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (files.length === 0) return showToast('Select at least one file', 'error');
    const invalid = files.find(f => !f.description.trim());
    if (invalid) return showToast(`Add a description for: ${invalid.name}`, 'error');

    setUploading(true);
    const allResults = [];

    for (let i = 0; i < files.length; i++) {
      const f = files[i];

      // Build FormData
      const formData = new FormData();
      if (f.file instanceof File || f.file instanceof Blob) {
        formData.append('file', f.file, f.name);
      } else {
        formData.append('file', { uri: f.uri, name: f.name, type: f.mimeType || 'application/octet-stream' });
      }
      formData.append('description',  f.description || '');
      formData.append('evidenceType', f.type        || 'document');
      formData.append('location',     location      || '');
      formData.append('caseNumber',   caseNumber    || '');
      formData.append('uploadedBy',   walletAddress || 'anonymous');
      formData.append('uploaderName', currentUser?.full_name || '');
      formData.append('uploaderRole', currentUser?.role      || '');

      setStatusLine(`(${i + 1}/${files.length}) ${f.name}`);

      // uploadAndConfirm does IPFS → Firebase → MetaMask popup → TX hash
      const result = await uploadAndConfirm(formData, setStatusLine);

      if (result.success) {
        allResults.push(result.data);
      } else {
        showToast(`Failed: ${result.error}`, 'error');
      }
    }

    setUploading(false);
    setStatusLine('');

    if (allResults.length > 0) {
      setResults(allResults);
      setShowSuccess(true);
      setFiles([]);
      setLocation('');
      setCaseNumber('');
    }
  };

  const ini = n => (n || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <View style={s.root}>
      <Header title="Upload Evidence" navigation={navigation} />

      <ScrollView
        contentContainerStyle={[s.content, isWide && s.contentWide]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Drop zone */}
        {files.length === 0 && (
          <TouchableOpacity style={s.drop} onPress={pickFiles} activeOpacity={0.82}>
            <LinearGradient
              colors={['rgba(26, 86, 219, 0.08)', 'rgba(59, 130, 246, 0.05)']}
              style={s.dropGradient}
            >
              <FloatingIcons />
              <Ionicons name="cloud-upload-outline" size={52} color={COLORS.primaryBlue} />
              <Text style={s.dropTitle}>Select Evidence Files</Text>
              <Text style={s.dropSub}>Images · Videos · Documents · Forensic Files</Text>
              <View style={s.dropBtn}>
                <Text style={s.dropBtnText}>Browse Files</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        )}

        {/* File list */}
        {files.length > 0 && (
          <>
            <View style={s.listHeader}>
              <Text style={s.sectionTitle}>{files.length} file{files.length !== 1 ? 's' : ''} selected</Text>
              <TouchableOpacity style={s.addMore} onPress={pickFiles}>
                <Ionicons name="add" size={14} color={COLORS.primaryBlue} />
                <Text style={s.addMoreText}>Add More</Text>
              </TouchableOpacity>
            </View>

            {files.map((f, i) => (
              <FileCard
                key={i} file={f} index={i} total={files.length}
                onRemove={() => removeFile(i)}
                onTypeChange={v => updateFile(i, 'type', v)}
                onDescChange={v => updateFile(i, 'description', v)}
              />
            ))}

            {/* Shared fields */}
            <View style={s.sharedCard}>
              <Text style={s.sectionTitle}>Shared Information</Text>

              <Text style={s.label}>COLLECTION LOCATION</Text>
              <View style={s.locationRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]} value={location} onChangeText={setLocation}
                  placeholder="e.g. Collection location or address" placeholderTextColor={COLORS.textMuted}
                />
                <TouchableOpacity style={s.gpsBtn} onPress={getGps} disabled={gpsLoading}>
                  {gpsLoading
                    ? <ActivityIndicator size="small" color={COLORS.primaryBlue} />
                    : <Ionicons name="location" size={18} color={COLORS.primaryBlue} />
                  }
                </TouchableOpacity>
              </View>

              <Text style={s.label}>CASE NUMBER</Text>
              <TextInput
                style={s.input} value={caseNumber} onChangeText={setCaseNumber}
                placeholder="e.g. CASE-2024-0891" placeholderTextColor={COLORS.textMuted}
                autoCapitalize="characters"
              />

              <Text style={s.label}>UPLOADED BY</Text>
              <View style={s.uploaderCard}>
                <View style={s.uploaderAv}>
                  <Text style={s.uploaderAvText}>{ini(currentUser?.full_name)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.uploaderName}>{currentUser?.full_name || '—'} · {currentUser?.role || '—'}</Text>
                  <Text style={s.uploaderAddr} numberOfLines={1}>{walletAddress || 'Not connected'}</Text>
                </View>
                <View style={s.verified}>
                  <Ionicons name="shield-checkmark" size={11} color={COLORS.success} />
                  <Text style={s.verifiedText}>Verified</Text>
                </View>
              </View>

              {/* Info note removed as requested */}

              {/* Submit button */}
              <TouchableOpacity
                style={[s.submitBtn, uploading && { opacity: 0.75 }]}
                onPress={handleSubmit}
                disabled={uploading}
                activeOpacity={0.86}
              >
                <LinearGradient
                  colors={['#0F3460', '#1A56DB']}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                  style={s.submitInner}
                >
                  {uploading ? (
                    <>
                      <ActivityIndicator color="#fff" size="small" />
                      <Text style={s.submitText} numberOfLines={2}>{statusLine || 'Processing...'}</Text>
                    </>
                  ) : (
                    <>
                      <Text style={s.submitText}>Upload</Text>
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>

      <SuccessModal
        visible={showSuccess}
        results={results}
        onViewHistory={() => { setShowSuccess(false); navigation.navigate('EvidenceHistory'); }}
        onDashboard={() => { setShowSuccess(false); navigation.navigate('Dashboard'); }}
      />

      {toast && <Toast message={toast.message} type={toast.type} />}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.offWhite },
  content: { padding: SPACING.md, paddingBottom: 60, gap: SPACING.sm },
  contentWide: { maxWidth: 800, alignSelf: 'center', width: '100%' },
  drop:    { borderWidth: 2, borderStyle: 'dashed', borderColor: COLORS.primaryBlue, borderRadius: RADIUS.xl, overflow: 'hidden' },
  dropGradient: { alignItems: 'center', justifyContent: 'center', padding: 40, gap: SPACING.sm, position: 'relative' },
  floatingIconsContainer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', paddingHorizontal: 20, zIndex: 0 },
  floatingIcon: { position: 'absolute', zIndex: 1 },
  floatingIconleft: { left: 10, top: 15 },
  floatingIconcenter: { alignSelf: 'center' },
  floatingIconright: { right: 10, top: 15 },
  floatingIconBg: { width: 56, height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  dropTitle: { fontSize: 18, fontWeight: '700', color: COLORS.textPrimary, zIndex: 10 },
  dropSub:   { fontSize: 13, color: COLORS.textMuted, zIndex: 10 },
  dropBtn:   { backgroundColor: COLORS.primaryBlue, paddingHorizontal: 24, paddingVertical: 10, borderRadius: RADIUS.md, marginTop: 4, zIndex: 10 },
  dropBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  addMore: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', paddingHorizontal: 10, paddingVertical: 6, borderRadius: RADIUS.md },
  addMoreText: { fontSize: 12, fontWeight: '600', color: COLORS.primaryBlue },
  fileCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderGray, overflow: 'hidden', ...SHADOWS.card },
  fileHead: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.borderGray, backgroundColor: COLORS.offWhite },
  badge:    { width: 30, height: 30, borderRadius: 15, backgroundColor: COLORS.primaryBlue, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  badgeText:{ fontSize: 9, fontWeight: '700', color: '#fff' },
  fileName: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary },
  fileMeta: { fontSize: 10, color: COLORS.textMuted },
  removeBtn:{ width: 26, height: 26, borderRadius: 13, backgroundColor: 'rgba(239,68,68,0.1)', justifyContent: 'center', alignItems: 'center', marginLeft: 'auto' },
  fileBody: { padding: SPACING.sm },
  label:    { fontSize: 10, color: COLORS.textSecondary, letterSpacing: 0.5, fontWeight: '600', marginBottom: 5 },
  chips:    { flexDirection: 'row', gap: 6 },
  chip:     { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, borderWidth: 1, borderColor: COLORS.borderGray, backgroundColor: COLORS.white },
  chipText: { fontSize: 11, fontWeight: '500', color: COLORS.textSecondary },
  chips:    { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  descInput:{ borderWidth: 1, borderColor: COLORS.borderGray, borderRadius: RADIUS.md, padding: SPACING.sm, fontSize: 12, color: COLORS.textPrimary, backgroundColor: COLORS.offWhite, minHeight: 56, textAlignVertical: 'top' },
  sharedCard:{ backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderGray, padding: SPACING.md, ...SHADOWS.card },
  locationRow:{ flexDirection: 'row', gap: 8, marginBottom: 4 },
  input:    { borderWidth: 1, borderColor: COLORS.borderGray, borderRadius: RADIUS.md, padding: SPACING.sm, fontSize: 13, color: COLORS.textPrimary, backgroundColor: COLORS.offWhite, marginBottom: 4 },
  gpsBtn:   { width: 44, height: 44, borderRadius: RADIUS.md, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  uploaderCard:{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#eff6ff', borderRadius: RADIUS.md, borderWidth: 1, borderColor: '#bfdbfe', padding: SPACING.sm },
  uploaderAv:  { width: 36, height: 36, borderRadius: 18, backgroundColor: COLORS.primaryBlue, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  uploaderAvText:{ fontSize: 13, fontWeight: '700', color: '#fff' },
  uploaderName: { fontSize: 12, fontWeight: '600', color: '#1d4ed8' },
  uploaderAddr: { fontSize: 10, color: '#1e3a8a', fontFamily: 'monospace' },
  verified:    { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: 'rgba(16,185,129,0.1)', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20 },
  verifiedText:{ fontSize: 9, fontWeight: '600', color: COLORS.success },
  infoBox:  { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#bfdbfe', borderRadius: RADIUS.md, padding: SPACING.sm, marginTop: SPACING.sm },
  infoText: { flex: 1, fontSize: 11, color: '#1d4ed8', lineHeight: 17 },
  submitBtn:{ borderRadius: RADIUS.md, overflow: 'hidden', marginTop: SPACING.md },
  submitInner:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15, paddingHorizontal: 20 },
  submitText: { fontSize: 13, fontWeight: '700', color: '#fff', flex: 1, textAlign: 'center' },
});

const suc = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  card:    { backgroundColor: '#fff', borderRadius: 20, padding: 24, gap: 12, elevation: 20, shadowColor: '#000', shadowOpacity: 0.4, shadowRadius: 20, shadowOffset: { width: 0, height: 8 } },
  iconWrap:{ alignItems: 'center' },
  title:   { fontSize: 20, fontWeight: '700', color: '#1e293b', textAlign: 'center' },
  sub:     { fontSize: 13, color: '#64748b', textAlign: 'center', lineHeight: 19 },
  row:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#f8faff', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  badge:   { width: 26, height: 26, borderRadius: 13, backgroundColor: '#1A56DB', justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  badgeText:{ fontSize: 11, fontWeight: '700', color: '#fff' },
  evId:    { fontSize: 11, fontFamily: 'monospace', fontWeight: '600', color: '#1e293b' },
  cid:     { fontSize: 10, color: '#64748b', fontFamily: 'monospace' },
  tx:      { fontSize: 10, color: '#10B981', fontFamily: 'monospace' },
  txPending:{ fontSize: 10, color: '#f59e0b' },
  block:    { fontSize: 10, color: '#10B981', fontWeight:'600' },
  btns:    { flexDirection: 'row', gap: 10 },
  histBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#10B981', padding: 13, borderRadius: 10 },
  dashBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#1A56DB', padding: 13, borderRadius: 10 },
  btnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
});
