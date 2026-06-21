import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, ActivityIndicator, Animated,
} from 'react-native';
import { Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, EVIDENCE_TYPES, STATUS_CONFIG } from '../utils/theme';
import Header from '../components/Header';
import Toast from '../components/Toast';
import { useHover, IS_WEB, cursor } from '../utils/hover';
import { generateEvidencePDF } from '../utils/pdfGenerator';

const ACTION_COLORS = {
  UPLOAD: COLORS.primaryBlue,
  CONFIRM: '#8B5CF6',
  VIEW: COLORS.success,
  AMEND: COLORS.warning,
};

// ── Animated History Header ────────────────────────────────────────────────────
function HistoryHeader({ navigation }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.08, duration: 2000, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <LinearGradient
      colors={['#0A1628', '#0F2A50', '#1A56DB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="chevron-back" size={24} color={COLORS.white} />
      </TouchableOpacity>

      <View style={styles.headerContent}>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <View style={styles.iconBox}>
            <Ionicons name="time" size={32} color={COLORS.white} />
          </View>
        </Animated.View>

        <View style={styles.headerTitle}>
          <Text style={styles.headerTitleText}>Evidence History</Text>
          <Text style={styles.headerSubText}>Complete chain-of-custody records</Text>
        </View>
      </View>

      {/* Decorative corner accents */}
      <View style={styles.accentCorner1} />
      <View style={styles.accentCorner2} />
    </LinearGradient>
  );
}

function TimelineItem({ action, by, time, isLast }) {
  const color = ACTION_COLORS[action] || COLORS.textMuted;
  return (
    <View style={styles.tlItem}>
      <View style={styles.tlDotCol}>
        <View style={[styles.tlDot, { backgroundColor: color }]} />
        {!isLast && <View style={styles.tlLine} />}
      </View>
      <View style={styles.tlContent}>
        <Text style={[styles.tlAction, { color }]}>{action}</Text>
        <Text style={styles.tlBy} numberOfLines={1}>{by}</Text>
      </View>
      <Text style={styles.tlTime}>{time}</Text>
    </View>
  );
}

function HistoryCard({ item, onPress, onDownloadPDF }) {
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const typeInfo = EVIDENCE_TYPES.find(t => t.value === item.evidence_type) || EVIDENCE_TYPES[2];
  const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
  const mockEvents = [
    { action: 'UPLOAD', by: item.uploaded_by || 'anonymous', time: new Date(item.created_at).toLocaleDateString() },
    ...(item.status === 'confirmed' ? [{ action: 'CONFIRM', by: 'blockchain', time: new Date(item.updated_at || item.created_at).toLocaleDateString() }] : []),
  ];

  const handleGeneratePDF = async () => {
    setGeneratingPDF(true);
    await onDownloadPDF(item);
    setGeneratingPDF(false);
  };

  return (
    <TouchableOpacity style={styles.histCard} onPress={onPress} activeOpacity={0.8}>
      <View style={styles.histHeader}>
        <View style={[styles.histIcon, { backgroundColor: typeInfo.color + '15' }]}>
          <Ionicons name={typeInfo.icon} size={20} color={typeInfo.color} />
        </View>
        <View style={styles.histInfo}>
          <View style={styles.histTopRow}>
            <Text style={styles.histId} numberOfLines={1}>{item.evidence_id}</Text>
            <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
              <Text style={[styles.statusText, { color: statusCfg.color }]}>{statusCfg.label}</Text>
            </View>
          </View>
          <Text style={styles.histDesc} numberOfLines={1}>{item.description || 'No description'}</Text>
        </View>
      </View>

      <View style={styles.histMeta}>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Type</Text>
          <Text style={styles.metaValue}>{item.evidence_type}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>Collected by</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {item.uploaded_by ? `${item.uploaded_by.slice(0, 10)}...` : 'anonymous'}
          </Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaLabel}>CID</Text>
          <Text style={styles.metaValue} numberOfLines={1}>
            {item.cid ? item.cid.slice(0, 14) + '...' : '—'}
          </Text>
        </View>
      </View>

      <View style={styles.timeline}>
        {mockEvents.map((ev, i) => (
          <TimelineItem
            key={i}
            action={ev.action}
            by={ev.by}
            time={ev.time}
            isLast={i === mockEvents.length - 1}
          />
        ))}
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
    </TouchableOpacity>
  );
}

export default function EvidenceHistoryScreen({ navigation }) {
  const { fetchEvidence, loading, toast, isUploader, showToast } = useApp();
  const [evidence, setEvidence] = useState([]);

  useEffect(() => { load(); }, []);

  const load = async () => {
    const data = await fetchEvidence({});
    setEvidence(data);
  };

  const handleDownloadPDF = async (item) => {
    try {
      const result = await generateEvidencePDF(item);
      if (result.success) {
        if (result.fileName) showToast(`PDF report generated: ${result.fileName}`, 'success');
        if (result.uri) {
          // try to open the generated file (native)
          try { await Linking.openURL(result.uri); showToast('PDF opened', 'success'); } catch (e) { showToast(`PDF saved: ${result.uri}`, 'success'); }
        }
      } else {
        showToast(`Failed to generate PDF: ${result.error}`, 'error');
      }
    } catch (err) {
      showToast('Error generating PDF', 'error');
    }
  };

  return (
    <View style={styles.root}>
      <HistoryHeader navigation={navigation} />
      <FlatList
        data={evidence}
        keyExtractor={item => item.evidence_id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={load} tintColor={COLORS.primaryBlue} />
        }
        ListHeaderComponent={() => (
          <Text style={styles.subheading}>Full chain-of-custody timeline for all evidence</Text>
        )}
        ListEmptyComponent={
          !loading && (
            <View style={styles.empty}>
              <Ionicons name="time-outline" size={48} color={COLORS.borderGray} />
              <Text style={styles.emptyTitle}>No evidence yet</Text>
              {isUploader && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('UploadEvidence')}>
                  <Text style={styles.emptyBtnText}>Upload Evidence</Text>
                </TouchableOpacity>
              )}
            </View>
          )
        }
        renderItem={({ item }) => (
          <HistoryCard
            item={item}
            onPress={() => navigation.navigate('EvidenceDetail', { evidenceId: item.evidence_id })}
            onDownloadPDF={handleDownloadPDF}
          />
        )}
      />
      {toast && <Toast message={toast.message} type={toast.type} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  
  // Header styles
  headerGradient: { 
    paddingTop: 16, 
    paddingBottom: 20, 
    paddingHorizontal: SPACING.lg, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.md,
    position: 'relative',
    overflow: 'hidden',
  },
  backBtn: { 
    width: 40, 
    height: 40, 
    borderRadius: 10, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    justifyContent: 'center', 
    alignItems: 'center',
    flexShrink: 0,
  },
  headerContent: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: SPACING.md 
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  headerTitle: { flex: 1 },
  headerTitleText: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 2,
  },
  headerSubText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '500',
  },
  accentCorner1: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,217,255,0.1)',
  },
  accentCorner2: {
    position: 'absolute',
    bottom: -20,
    left: -20,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(0,217,255,0.05)',
  },

  list: { padding: SPACING.md, gap: 10, paddingBottom: 60 },
  subheading: { ...TYPOGRAPHY.small, color: COLORS.textMuted, marginBottom: 4 },

  histCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, borderWidth: 1, borderColor: COLORS.borderGray, overflow: 'hidden', ...SHADOWS.card },
  histHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, padding: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderGray },
  histIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  histInfo: { flex: 1, minWidth: 0 },
  histTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, marginBottom: 2 },
  histId: { fontSize: 10, fontFamily: 'monospace', color: COLORS.textPrimary, fontWeight: '600', flex: 1 },
  histDesc: { fontSize: 10, color: COLORS.textMuted },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: RADIUS.full, flexShrink: 0 },
  statusText: { fontSize: 9, fontWeight: '700' },

  histMeta: { flexDirection: 'row', gap: 12, padding: SPACING.sm + 2, borderBottomWidth: 1, borderBottomColor: COLORS.borderGray, backgroundColor: COLORS.offWhite },
  metaItem: {},
  metaLabel: { fontSize: 9, color: COLORS.textMuted, marginBottom: 1 },
  metaValue: { fontSize: 9, color: COLORS.textPrimary, fontFamily: 'monospace', fontWeight: '500' },

  timeline: { padding: SPACING.sm + 2, gap: 0 },
  tlItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 4 },
  tlDotCol: { alignItems: 'center', width: 12, paddingTop: 2 },
  tlDot: { width: 8, height: 8, borderRadius: 4 },
  tlLine: { width: 1, flex: 1, backgroundColor: COLORS.borderGray, marginTop: 3, minHeight: 12 },
  tlContent: { flex: 1 },
  tlAction: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  tlBy: { fontSize: 9, color: COLORS.textMuted, fontFamily: 'monospace' },
  tlTime: { fontSize: 9, color: COLORS.textMuted },

  pdfButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: COLORS.primaryBlue, marginHorizontal: SPACING.sm + 2, marginBottom: SPACING.sm + 2, marginTop: SPACING.sm, paddingVertical: 10, borderRadius: RADIUS.md },
  pdfButtonText: { fontSize: 12, fontWeight: '600', color: COLORS.white },

  empty: { paddingTop: 60, alignItems: 'center', gap: 12 },
  emptyTitle: { ...TYPOGRAPHY.h3, color: COLORS.textSecondary },
  emptyBtn: { backgroundColor: COLORS.primaryBlue, paddingHorizontal: SPACING.lg, paddingVertical: 10, borderRadius: RADIUS.md },
  emptyBtnText: { ...TYPOGRAPHY.bodyMed, color: COLORS.white, fontWeight: '600' },
});
