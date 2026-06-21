import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Dimensions, RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, STATUS_CONFIG } from '../utils/theme';
import Header from '../components/Header';
import Toast from '../components/Toast';
import { useHover, IS_WEB, cursor } from '../utils/hover';

const { width } = Dimensions.get('window');

// ── Welcome text with glow animation ──────────────────────────────────────────
function GlowingText({ text, style }) {
  const glowAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glowAnim, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start();
  }, []);

  const shadowOpacity = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.8] });
  const shadowRadius = glowAnim.interpolate({ inputRange: [0, 1], outputRange: [8, 24] });

  return (
    <Animated.Text
      style={[
        style,
        {
          textShadowColor: 'rgba(26, 86, 219, 0.6)',
          textShadowOffset: { width: 0, height: 0 },
          textShadowRadius: shadowRadius,
        }
      ]}
    >
      {text}
    </Animated.Text>
  );
}

// ── Welcome greeting with fade-in animation ────────────────────────────────────
function WelcomeGreeting({ userName }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 1200, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.Text style={[styles.bannerGreet, { opacity: fadeAnim }]}>
      Welcome back, {userName || 'Officer'}
    </Animated.Text>
  );
}

// ── Pulsing SeQureChain Logo ───────────────────────────────────────────────────
function SeQureChainLogo({ size = 60 }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1,    duration: 1800, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  
  return (
    <Animated.View style={{ transform: [{ scale: pulse }] }}>
      <LinearGradient
        colors={['#2563EB', '#1A56DB', '#0F3460']}
        start={{ x:0, y:0 }} end={{ x:1, y:1 }}
        style={{ width:size, height:size, borderRadius:size*0.22, justifyContent:'center', alignItems:'center' }}
      >
        <Ionicons name="shield-checkmark" size={size*0.52} color="rgba(255,255,255,0.95)" />
      </LinearGradient>
    </Animated.View>
  );
}


// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color, bg, delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.spring(anim, { toValue:1, tension:70, friction:8, delay, useNativeDriver:true }).start();
  }, []);
  return (
    <Animated.View style={[styles.statCard, { opacity:anim, transform:[{ scale:anim }] }]}>
      <View style={[styles.statIcon, { backgroundColor: bg }]}>
        <Ionicons name={icon} size={20} color={color} />
      </View>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </Animated.View>
  );
}

// ── Live Bar Chart (reads from API stats.recent7) ────────────────────────────
function LiveBarChart({ data }) {
  const animVals = useRef(data.map(() => new Animated.Value(0))).current;
  const [selectedBar, setSelectedBar] = useState(data.length - 1); // default: today

  useEffect(() => {
    const max = Math.max(...data.map(d => d.count), 1);
    data.forEach((d, i) => {
      Animated.timing(animVals[i], {
        toValue: d.count / max,
        duration: 400,
        delay: i * 40,
        useNativeDriver: false,
      }).start();
    });
  }, [data]);

  const BAR_MAX_H = 56;
  const selectedDay = data[selectedBar];

  return (
    <View>
      {/* Selected day info */}
      <View style={styles.barInfoRow}>
        <Text style={styles.barInfoDate}>{selectedDay?.day || '—'}</Text>
        <Text style={styles.barInfoCount}>
          <Text style={styles.barInfoNum}>{selectedDay?.count ?? 0}</Text>
          {' uploads'}
        </Text>
      </View>

      <View style={styles.barsRow}>
        {data.map((d, i) => {
          const isToday    = i === data.length - 1;
          const isSelected = i === selectedBar;
          const barH = animVals[i].interpolate({ inputRange:[0,1], outputRange:[2, BAR_MAX_H] });
          return (
            <TouchableOpacity
              key={i}
              style={styles.barWrap}
              onPress={() => setSelectedBar(i)}
              activeOpacity={0.7}
            >
              {isSelected && d.count > 0 && (
                <Text style={[styles.todayCount, { color: isToday ? COLORS.primaryBlue : COLORS.success }]}>
                  {d.count}
                </Text>
              )}
              <Animated.View style={[
                styles.bar,
                isToday    && styles.barToday,
                isSelected && !isToday && styles.barSelected,
                { height: barH }
              ]} />
            </TouchableOpacity>
          );
        })}
      </View>
      <View style={styles.barLabels}>
        {data.map((d, i) => (
          <Text key={i} style={[styles.barLabel, i === selectedBar && styles.barLabelSelected]}>
            {d.day ? d.day.slice(-2) : ''}
          </Text>
        ))}
      </View>
    </View>
  );
}

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function DashboardScreen({ navigation }) {
  const { walletAddress, currentUser, stats, evidenceList, fetchEvidence, fetchStats, loading, toast, API_URL, isUploader } = useApp();
  const [refreshing, setRefreshing] = useState(false);
  const [chartData, setChartData] = useState([]);

  // Build 14-day chart data from API
  const buildChartData = useCallback(async () => {
    try {
      const res  = await fetch(`${API_URL}/evidence/stats`);
      const data = await res.json();
      if (!data.success) return;

      // Build last 14 days array
      const days = [];
      const today = new Date();
      for (let i = 13; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        const label = d.toLocaleDateString('en', { month:'short', day:'numeric' });
        const found = (data.data.recent14 || data.data.recent7 || []).find(r => r.day === key);
        days.push({ day: label, count: found ? found.count : 0 });
      }
      setChartData(days);
    } catch {
      // fallback to zeros
      const days = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        days.push({ day: d.toLocaleDateString('en',{month:'short',day:'numeric'}), count: 0 });
      }
      setChartData(days);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchEvidence({ limit: 5 });
    fetchStats();
    buildChartData();
  }, []);

  // Refresh chart whenever screen comes into focus (e.g. after upload)
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      fetchEvidence({ limit: 5 });
      fetchStats();
      buildChartData();
    });
    return unsubscribe;
  }, [navigation]);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([fetchEvidence({ limit:5 }), fetchStats(), buildChartData()]);
    setRefreshing(false);
  };

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0,6)}...${walletAddress.slice(-4)}`
    : '—';

  const todayCount = chartData.length > 0 ? chartData[chartData.length - 1].count : 0;

  return (
    <View style={styles.root}>
      <Header title="Dashboard" navigation={navigation} />

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primaryBlue} />}
      >
        {/* Welcome Banner */}
        <LinearGradient colors={['#0A1628','#0F2A50','#1A56DB']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.banner}>
          <View style={styles.bannerRing1} />
          <View style={styles.bannerRing2} />
          <SeQureChainLogo size={64} />
          <View style={styles.bannerText}>
            <WelcomeGreeting userName={currentUser?.full_name || currentUser?.name || 'Officer'} />
            <GlowingText text="SeQureChain" style={styles.bannerTitle} />
            <Text style={styles.bannerSub}>
              {currentUser?.role || 'Officer'} · {currentUser?.department || 'LGU'}
            </Text>
            <View style={styles.addrPill}>
              <View style={styles.addrDot} />
              <Text style={styles.addrTxt}>{shortAddr}</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Stats */}
        <View style={styles.statsRow}>
          <StatCard label="Total"     value={stats.total}     icon="folder"           color={COLORS.primaryBlue} bg="rgba(26,86,219,0.1)" delay={0}   />
          <StatCard label="Confirmed" value={stats.confirmed} icon="checkmark-circle" color={COLORS.success}     bg={COLORS.successBg}    delay={80}  />
          <StatCard label="Pending"   value={stats.pending}   icon="time"             color={COLORS.pending}     bg={COLORS.pendingBg}    delay={160} />
        </View>

        {/* Charts row */}
        <View style={styles.chartsRow}>
          {/* Live bar chart */}
          <View style={[styles.chartCard, { flex: 1.5 }]}>
            <Text style={styles.chartTitle}>Uploads per day</Text>
            <Text style={styles.chartSub}>
              Last 14 days · today: <Text style={{ color: COLORS.primaryBlue, fontWeight:'700' }}>{todayCount}</Text>
            </Text>
            {chartData.length > 0
              ? <LiveBarChart data={chartData} />
              : <View style={styles.chartEmpty}><Text style={styles.chartEmptyTxt}>Loading...</Text></View>
            }
          </View>

          {/* Integrity donut */}
          <View style={[styles.chartCard, { flex: 1 }]}>
            <Text style={styles.chartTitle}>Integrity</Text>
            <View style={styles.donut}>
              <View style={[styles.donutRing, {
                borderColor: COLORS.success,
                // Dynamic border: full ring when all confirmed
                borderTopColor: stats.total > 0 && stats.confirmed < stats.total
                  ? COLORS.borderGray : COLORS.success,
              }]}>
                <Text style={styles.donutPct}>
                  {stats.total > 0 ? Math.round(stats.confirmed / stats.total * 100) : 0}%
                </Text>
                <Text style={styles.donutSub}>verified</Text>
              </View>
            </View>
            <View style={styles.intRows}>
              <View style={styles.intRow}>
                <Text style={styles.intLabel}>Verified</Text>
                <Text style={[styles.intVal,{color:COLORS.success}]}>{stats.confirmed}/{stats.total}</Text>
              </View>
              <View style={styles.intRow}>
                <Text style={styles.intLabel}>Today</Text>
                <Text style={[styles.intVal,{color:COLORS.primaryBlue}]}>{todayCount}</Text>
              </View>
              <View style={styles.intRow}>
                <Text style={styles.intLabel}>Alerts</Text>
                <Text style={[styles.intVal,{color:COLORS.error}]}>0</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Quick Actions */}
        <Text style={styles.sectionLabel}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {[
            ...(isUploader ? [{ label:'Upload Evidence', icon:'cloud-upload',      screen:'UploadEvidence',  color:'#1A56DB', bg:'rgba(26,86,219,.08)'  }] : []),
            { label:'Evidence History', icon:'time',             screen:'EvidenceHistory', color:'#8B5CF6', bg:'rgba(139,92,246,.08)' },
            { label:'Browse Evidence',  icon:'search',           screen:'BrowseEvidence',  color:'#10B981', bg:'rgba(16,185,129,.08)'  },
            { label:'BrowseEvidence',       icon:'create',           screen:'BrowseEvidence',      color:'#F59E0B', bg:'rgba(245,158,11,.08)' },
            { label:'Integrity Verify', icon:'shield-checkmark', screen:'IntegrityVerify', color:'#06B6D4', bg:'rgba(6,182,212,.08)'  },
            { label:'Search by CID',    icon:'search',           screen:'Search',          color:'#10B981', bg:'rgba(16,185,129,.08)' },
            { label:'Settings',         icon:'settings',         screen:'Settings',        color:'#64748B', bg:'rgba(100,116,139,.08)'},
          ].map(a => (
            <TouchableOpacity key={a.label} style={styles.actionCard}
              onPress={() => navigation.navigate(a.screen)} activeOpacity={0.8}>
              <View style={[styles.actionIcon, { backgroundColor: a.bg }]}>
                <Ionicons name={a.icon} size={20} color={a.color} />
              </View>
              <Text style={styles.actionLabel}>{a.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Recent Evidence */}
        <View style={styles.recentHeader}>
          <Text style={styles.sectionLabel}>Recent Evidence</Text>
          <TouchableOpacity onPress={() => navigation.navigate('EvidenceHistory')}>
            <Text style={styles.viewAll}>View all →</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.recentCard}>
          {evidenceList.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="folder-open-outline" size={36} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No evidence uploaded yet</Text>
              {isUploader && (
                <TouchableOpacity style={styles.emptyBtn} onPress={() => navigation.navigate('UploadEvidence')}>
                  <Text style={styles.emptyBtnTxt}>Upload First Evidence</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            evidenceList.slice(0, 5).map((ev, i) => {
              const sc = STATUS_CONFIG[ev.status] || STATUS_CONFIG.pending;
              return (
                <TouchableOpacity
                  key={ev.evidence_id || i}
                  style={[styles.recentRow, i === Math.min(evidenceList.length,5)-1 && { borderBottomWidth:0 }]}
                  onPress={() => navigation.navigate('EvidenceDetail', { evidenceId: ev.evidence_id })}
                  activeOpacity={0.75}
                >
                  <View style={[styles.statusDot, { backgroundColor: sc.color }]} />
                  <View style={styles.recentInfo}>
                    <Text style={styles.recentId} numberOfLines={1}>{ev.evidence_id}</Text>
                    <Text style={styles.recentDesc} numberOfLines={1}>{ev.description || ev.file_name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: sc.bg }]}>
                    <Text style={[styles.statusBadgeTxt, { color: sc.color }]}>{sc.label}</Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </View>
      </ScrollView>

      {toast && <Toast message={toast.message} type={toast.type} />}
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex:1, backgroundColor: COLORS.offWhite },
  content: { padding: SPACING.md, paddingBottom: 60, gap: SPACING.sm },

  // Banner
  banner:     { borderRadius: RADIUS.xl, padding: SPACING.lg, flexDirection:'row', alignItems:'center', gap: SPACING.lg, overflow:'hidden', position:'relative', marginBottom: 4, minHeight: 140 },
  bannerRing1:{ position:'absolute', right:-18, top:-18, width:80, height:80, borderRadius:40, borderWidth:1, borderColor:'rgba(255,255,255,.05)' },
  bannerRing2:{ position:'absolute', right:16, bottom:-28, width:60, height:60, borderRadius:30, borderWidth:1, borderColor:'rgba(255,255,255,.04)' },
  bannerText: { flex:1 },
  bannerGreet:{ fontSize:14, color:'rgba(255,255,255,.6)', marginBottom:2, fontWeight:'500' },
  bannerTitle:{ fontSize:32, fontWeight:'800', color:'#fff', letterSpacing:0.5, fontFamily:'Space Mono' },
  bannerSub:  { fontSize:12, color:'rgba(255,255,255,.4)', marginTop:3, marginBottom:8 },
  addrPill:   { flexDirection:'row', alignItems:'center', gap:5, backgroundColor:'rgba(255,255,255,.1)', paddingHorizontal:10, paddingVertical:4, borderRadius:20, alignSelf:'flex-start' },
  addrDot:    { width:5, height:5, borderRadius:3, backgroundColor:'#10B981' },
  addrTxt:    { fontSize:11, color:'#fff', fontFamily:'monospace', fontWeight:'500' },

  // Stats
  statsRow: { flexDirection:'row', gap:8, marginBottom:4 },
  statCard: { flex:1, backgroundColor:COLORS.white, borderRadius:RADIUS.lg, padding:SPACING.sm+2, alignItems:'center', borderWidth:1, borderColor:COLORS.borderGray, ...SHADOWS.card },
  statIcon: { width:34, height:34, borderRadius:9, justifyContent:'center', alignItems:'center', marginBottom:6 },
  statValue:{ fontSize:20, fontWeight:'600', color:COLORS.textPrimary },
  statLabel:{ fontSize:10, color:COLORS.textMuted, marginTop:1 },

  // Charts
  chartsRow:  { flexDirection:'row', gap:8, marginBottom:4 },
  chartCard:  { backgroundColor:COLORS.white, borderRadius:RADIUS.lg, padding:SPACING.sm+2, borderWidth:1, borderColor:COLORS.borderGray, ...SHADOWS.card },
  chartTitle: { fontSize:12, fontWeight:'600', color:COLORS.textPrimary, marginBottom:1 },
  chartSub:   { fontSize:9, color:COLORS.textMuted, marginBottom:7 },
  chartEmpty: { height:60, justifyContent:'center', alignItems:'center' },
  chartEmptyTxt:{ fontSize:11, color:COLORS.textMuted },

  // Bar chart
  barsRow:    { flexDirection:'row', alignItems:'flex-end', height:60, gap:3, marginBottom:3 },
  barWrap:    { flex:1, alignItems:'center', justifyContent:'flex-end' },
  bar:        { width:'100%', borderRadius:3, backgroundColor: COLORS.skyBlue },
  barToday:    { backgroundColor: COLORS.primaryBlue },
  barSelected: { backgroundColor: COLORS.success },
  barInfoRow:  { flexDirection:'row', justifyContent:'space-between', alignItems:'baseline', marginBottom:6 },
  barInfoDate: { fontSize:10, color:COLORS.textMuted },
  barInfoCount:{ fontSize:10, color:COLORS.textMuted },
  barInfoNum:  { fontSize:14, fontWeight:'700', color:COLORS.primaryBlue },
  barLabelSelected: { color:COLORS.primaryBlue, fontWeight:'700' },
  todayCount: { fontSize:8, fontWeight:'700', color:COLORS.primaryBlue, marginBottom:1 },
  barLabels:  { flexDirection:'row', gap:3 },
  barLabel:   { flex:1, textAlign:'center', fontSize:7, color:COLORS.textMuted },
  tooltip:    { position:'absolute', top:-24, backgroundColor:'#1e293b', paddingHorizontal:6, paddingVertical:3, borderRadius:5, zIndex:10 },
  tooltipTxt: { fontSize:9, color:'#fff', fontFamily:'monospace' },

  // Integrity
  donut:      { alignItems:'center', marginVertical:6 },
  donutRing:  { width:72, height:72, borderRadius:36, borderWidth:8, justifyContent:'center', alignItems:'center' },
  donutPct:   { fontSize:14, fontWeight:'700', color:COLORS.textPrimary },
  donutSub:   { fontSize:8, color:COLORS.textMuted },
  intRows:    { gap:4 },
  intRow:     { flexDirection:'row', justifyContent:'space-between' },
  intLabel:   { fontSize:10, color:COLORS.textSecondary },
  intVal:     { fontSize:10, fontWeight:'600', color:COLORS.textPrimary },

  // Actions
  sectionLabel: { fontSize:13, fontWeight:'600', color:COLORS.textPrimary, marginTop:4 },
  actionsGrid:  { flexDirection:'row', flexWrap:'wrap', gap:8, marginBottom:4 },
  actionCard:   { width: (width - SPACING.md*2 - 8) / 2 - 1, backgroundColor:COLORS.white, borderRadius:RADIUS.lg, padding:SPACING.sm+2, flexDirection:'row', alignItems:'center', gap:10, borderWidth:1, borderColor:COLORS.borderGray, ...SHADOWS.card },
  actionIcon:   { width:36, height:36, borderRadius:9, justifyContent:'center', alignItems:'center', flexShrink:0 },
  actionLabel:  { fontSize:11, fontWeight:'500', color:COLORS.textPrimary, flex:1 },

  // Recent
  recentHeader: { flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  viewAll:      { fontSize:11, color:COLORS.primaryBlue, fontWeight:'600' },
  recentCard:   { backgroundColor:COLORS.white, borderRadius:RADIUS.lg, borderWidth:1, borderColor:COLORS.borderGray, overflow:'hidden', ...SHADOWS.card },
  recentRow:    { flexDirection:'row', alignItems:'center', gap:10, padding:SPACING.sm+2, borderBottomWidth:1, borderBottomColor:COLORS.borderGray },
  statusDot:    { width:7, height:7, borderRadius:4, flexShrink:0 },
  recentInfo:   { flex:1 },
  recentId:     { fontSize:10, fontFamily:'monospace', fontWeight:'600', color:COLORS.textPrimary },
  recentDesc:   { fontSize:10, color:COLORS.textMuted, marginTop:1 },
  statusBadge:  { paddingHorizontal:8, paddingVertical:2, borderRadius:20 },
  statusBadgeTxt:{ fontSize:9, fontWeight:'700' },

  // Empty
  emptyState: { padding: SPACING.xl, alignItems:'center', gap:SPACING.sm },
  emptyText:  { fontSize:13, color:COLORS.textMuted },
  emptyBtn:   { backgroundColor:COLORS.primaryBlue, paddingHorizontal:20, paddingVertical:9, borderRadius:RADIUS.md },
  emptyBtnTxt:{ fontSize:12, fontWeight:'600', color:COLORS.white },
});
