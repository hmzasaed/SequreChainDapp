import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../utils/theme';

const NAV_ITEMS = [
  { name: 'Dashboard',       icon: 'grid',             label: 'Dashboard' },
  { name: 'UploadEvidence',  icon: 'cloud-upload',     label: 'Upload Evidence' },
  { name: 'EvidenceHistory', icon: 'time',             label: 'Evidence History' },
  { name: 'BrowseEvidence',      icon: 'create',           label: 'BrowseEvidence' },
  { name: 'Search',          icon: 'search',           label: 'Search by CID' },
  { name: 'IntegrityVerify', icon: 'shield-checkmark', label: 'Integrity Verify' },
  { name: 'Settings',        icon: 'settings',         label: 'Settings' },
];

export default function CustomDrawer(props) {
  const { walletAddress, disconnectWallet, currentUser, isUploader } = useApp();
  const { state, navigation } = props;
  const activeRouteName = state.routes[state.index]?.name;
  
  // Filter nav items — hide UploadEvidence for view-only roles
  const filteredNavItems = NAV_ITEMS.filter(item => {
    if (item.name === 'UploadEvidence' && !isUploader) return false;
    return true;
  });

  const shortAddr = walletAddress
    ? `${walletAddress.slice(0, 8)}...${walletAddress.slice(-6)}`
    : 'Not connected';

  return (
    <View style={styles.root}>
      <LinearGradient colors={['#030D1A', '#0A1E3A']} style={styles.drawerHeader}>
        <SafeAreaView edges={['top']}>
          <View style={styles.logoRow}>
            <LinearGradient colors={['#2563EB', '#1A56DB']} style={styles.logoBox}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.white} />
            </LinearGradient>
            <View>
              <Text style={styles.logoTitle}>SeQureChain</Text>
              <Text style={styles.logoSub}>Blockchain Evidence</Text>
            </View>
          </View>
          <View style={styles.walletCard}>
            <View style={styles.walletAvatar}>
              <Ionicons name="wallet" size={14} color={COLORS.accentBlue} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.walletLabel}>MetaMask Connected</Text>
              <Text style={styles.walletAddr}>{shortAddr}</Text>
            </View>
            <View style={styles.activeIndicator} />
          </View>
        </SafeAreaView>
      </LinearGradient>

      <ScrollView style={styles.navScroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.navSection}>NAVIGATION</Text>
        {filteredNavItems.map((item) => {
          const isActive = activeRouteName === item.name;
          return (
            <TouchableOpacity
              key={item.name}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => navigation.navigate(item.name)}
              activeOpacity={0.75}
            >
              <View style={[styles.navIcon, isActive && styles.navIconActive]}>
                <Ionicons
                  name={isActive ? item.icon : item.icon + '-outline'}
                  size={16}
                  color={isActive ? COLORS.white : COLORS.textMuted}
                />
              </View>
              <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
                {item.label}
              </Text>
              {isActive && <View style={styles.activeDot} />}
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      <View style={styles.drawerFooter}>
        <TouchableOpacity
          style={styles.disconnectItem}
          onPress={() => { disconnectWallet(); navigation.navigate('Landing'); }}
        >
          <Ionicons name="log-out-outline" size={16} color={COLORS.error} />
          <Text style={styles.disconnectLabel}>Disconnect</Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>v4.0 · LGU</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.drawerBg },
  drawerHeader: { paddingHorizontal: SPACING.md, paddingBottom: SPACING.md },
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm, marginBottom: SPACING.md, marginTop: 8 },
  logoBox: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  logoTitle: { fontSize: 16, fontWeight: '800', color: COLORS.white, letterSpacing: 1 },
  logoSub: { ...TYPOGRAPHY.small, color: COLORS.textMuted, letterSpacing: 0.5, marginTop: 1 },
  walletCard: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: 'rgba(59,130,246,0.08)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.2)', borderRadius: RADIUS.md, padding: SPACING.sm + 1 },
  walletAvatar: { width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(59,130,246,0.15)', justifyContent: 'center', alignItems: 'center' },
  walletLabel: { fontSize: 9, color: 'rgba(148,163,184,0.7)' },
  walletAddr: { fontSize: 10, color: COLORS.white, fontFamily: 'monospace', marginTop: 1 },
  activeIndicator: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#10B981' },
  navScroll: { flex: 1, paddingTop: 10 },
  navSection: { ...TYPOGRAPHY.label, color: 'rgba(148,163,184,0.35)', paddingHorizontal: SPACING.md, marginBottom: 5, fontSize: 9 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: SPACING.md, paddingVertical: 10, marginHorizontal: 7, borderRadius: RADIUS.md, marginBottom: 1 },
  navItemActive: { backgroundColor: COLORS.primaryBlue },
  navIcon: { width: 30, height: 30, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.05)', justifyContent: 'center', alignItems: 'center' },
  navIconActive: { backgroundColor: 'rgba(255,255,255,0.15)' },
  navLabel: { ...TYPOGRAPHY.bodyMed, color: COLORS.textMuted, flex: 1 },
  navLabelActive: { color: COLORS.white, fontWeight: '700' },
  activeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.5)' },
  drawerFooter: { borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.06)', padding: SPACING.md, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  disconnectItem: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  disconnectLabel: { ...TYPOGRAPHY.bodyMed, color: COLORS.error },
  versionText: { ...TYPOGRAPHY.small, color: 'rgba(148,163,184,0.25)' },
});
