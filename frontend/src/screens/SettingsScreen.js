import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Alert, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS } from '../utils/theme';
import Header from '../components/Header';

const IS_WEB = Platform.OS === 'web';

function HoverRow({ icon, label, value, mono, danger, onPress, last }) {
  const [hov, setHov] = useState(false);
  const bg = hov ? (danger ? 'rgba(239,68,68,.07)' : 'rgba(219,234,254,.5)') : 'transparent';
  const webEvt = IS_WEB ? { onMouseEnter:()=>setHov(true), onMouseLeave:()=>setHov(false) } : {};
  const inner = (
    <View style={[styles.row, { backgroundColor: bg }, last && { borderBottomWidth:0 }]} {...webEvt}>
      <View style={[styles.rowIco, danger && { backgroundColor:'rgba(239,68,68,.1)' }]}>
        <Ionicons name={icon} size={15} color={danger ? COLORS.error : COLORS.primaryBlue} />
      </View>
      <Text style={[styles.rowLbl, danger && { color:COLORS.error, fontWeight:'600' }]}>{label}</Text>
      {value ? <Text style={[styles.rowVal, mono && { fontFamily:'monospace', fontSize:11 }]} numberOfLines={1}>{value}</Text> : null}
      {onPress ? <Ionicons name="chevron-forward" size={14} color={danger ? COLORS.error : COLORS.textMuted} /> : null}
    </View>
  );
  if (onPress) return <TouchableOpacity onPress={onPress} activeOpacity={0.75}>{inner}</TouchableOpacity>;
  return inner;
}

export default function SettingsScreen({ navigation }) {
  const { walletAddress, currentUser, disconnectWallet } = useApp();

  const handleSignOut = () => {
    Alert.alert('Sign Out', 'Disconnect your wallet and sign out?', [
      { text:'Cancel', style:'cancel' },
      {
        text:'Sign Out', style:'destructive',
        onPress: async () => {
          // Revoke MetaMask permissions on web
          if (IS_WEB && typeof window !== 'undefined' && window.ethereum) {
            try {
              await window.ethereum.request({
                method: 'wallet_revokePermissions',
                params: [{ eth_accounts:{} }],
              });
            } catch { /* older MetaMask — ignore */ }
          }
          disconnectWallet();
          // Navigate out of Drawer back to Landing
          const parent = navigation.getParent();
          if (parent) {
            parent.reset({ index:0, routes:[{ name:'Landing' }] });
          } else {
            navigation.reset({ index:0, routes:[{ name:'Landing' }] });
          }
        },
      },
    ]);
  };

  const short = a => a ? `${a.slice(0,10)}...${a.slice(-6)}` : 'Not connected';
  const ini   = n => (n||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();

  return (
    <View style={styles.root}>
      <Header title="Settings" navigation={navigation} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>

        {/* Profile */}
        <View style={styles.profileCard}>
          <View style={styles.av}><Text style={styles.avTxt}>{ini(currentUser?.full_name)}</Text></View>
          <View style={{ flex:1 }}>
            <Text style={styles.pName}>{currentUser?.full_name || 'Unknown'}</Text>
            <Text style={styles.pRole}>{currentUser?.role || '—'} · {currentUser?.badge_id || '—'}</Text>
            <Text style={styles.pDept}>{currentUser?.department || '—'}</Text>
            <View style={styles.addrRow}>
              <View style={styles.greenDot}/>
              <Text style={styles.addrTxt} numberOfLines={1}>{short(walletAddress)}</Text>
            </View>
          </View>
        </View>

        {/* Identity */}
        <View style={styles.sec}>
          <Text style={styles.secT}>IDENTITY</Text>
          <HoverRow icon="person-outline"    label="Full Name"   value={currentUser?.full_name  || '—'} />
          <HoverRow icon="card-outline"      label="Badge ID"    value={currentUser?.badge_id   || '—'} />
          <HoverRow icon="briefcase-outline" label="Role"        value={currentUser?.role       || '—'} />
          <HoverRow icon="business-outline"  label="Department"  value={currentUser?.department || '—'} last />
        </View>

        {/* Wallet */}
        <View style={styles.sec}>
          <Text style={styles.secT}>WALLET</Text>
          <HoverRow icon="wallet-outline" label="MetaMask Address" value={walletAddress || 'Not connected'} mono />
          <HoverRow icon="globe-outline"  label="Network"          value="Ethereum Sepolia" />
          <HoverRow icon="pulse-outline"  label="Status"           value={walletAddress ? '🟢 Connected' : '🔴 Disconnected'} last />
        </View>

        {/* System */}
        <View style={styles.sec}>
          <Text style={styles.secT}>SYSTEM</Text>
          <HoverRow icon="flame-outline"         label="Database"       value="Firebase Firestore" />
          <HoverRow icon="cloud-outline"         label="IPFS"           value="Pinata Cloud" />
          <HoverRow icon="analytics-outline"     label="RPC"            value="Alchemy Sepolia" />
          <HoverRow icon="document-text-outline" label="Smart Contract" value="EvidenceManager.sol" />
          <HoverRow icon="school-outline"        label="University"     value="LGU · Dept. of CS" last />
        </View>

        {/* Sign out */}
        <View style={styles.sec}>
          <Text style={styles.secT}>SESSION</Text>
          <HoverRow icon="log-out-outline" label="Sign Out & Disconnect Wallet" danger onPress={handleSignOut} last />
        </View>

        
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:    { flex:1, backgroundColor:COLORS.offWhite },
  content: { padding:SPACING.md, gap:SPACING.sm, paddingBottom:60 },
  profileCard: { backgroundColor:COLORS.primaryBlue, borderRadius:RADIUS.xl, padding:SPACING.md, flexDirection:'row', alignItems:'center', gap:SPACING.md, ...SHADOWS.card },
  av:      { width:56, height:56, borderRadius:28, backgroundColor:'rgba(255,255,255,.2)', justifyContent:'center', alignItems:'center', flexShrink:0 },
  avTxt:   { fontSize:18, fontWeight:'700', color:'#fff' },
  pName:   { fontSize:16, fontWeight:'700', color:'#fff' },
  pRole:   { fontSize:12, color:'rgba(255,255,255,.75)', marginTop:2 },
  pDept:   { fontSize:11, color:'rgba(255,255,255,.5)', marginTop:1 },
  addrRow: { flexDirection:'row', alignItems:'center', gap:5, marginTop:6 },
  greenDot:{ width:6, height:6, borderRadius:3, backgroundColor:'#10B981' },
  addrTxt: { fontSize:11, color:'rgba(255,255,255,.7)', fontFamily:'monospace' },
  sec:     { backgroundColor:COLORS.white, borderRadius:RADIUS.lg, borderWidth:1, borderColor:COLORS.borderGray, overflow:'hidden', ...SHADOWS.card },
  secT:    { fontSize:11, color:COLORS.textMuted, letterSpacing:.8, fontWeight:'600', paddingHorizontal:SPACING.md, paddingTop:10, paddingBottom:6, borderBottomWidth:1, borderBottomColor:COLORS.borderGray },
  row:     { flexDirection:'row', alignItems:'center', gap:10, paddingHorizontal:SPACING.md, paddingVertical:11, borderBottomWidth:1, borderBottomColor:COLORS.borderGray },
  rowIco:  { width:28, height:28, borderRadius:7, backgroundColor:'rgba(219,234,254,.6)', justifyContent:'center', alignItems:'center', flexShrink:0 },
  rowLbl:  { fontSize:13, color:COLORS.textSecondary, flex:1 },
  rowVal:  { fontSize:12, color:COLORS.textPrimary, textAlign:'right', maxWidth:180 },
  footer:  { fontSize:11, color:COLORS.textMuted, textAlign:'center', lineHeight:20, paddingHorizontal:SPACING.lg, marginTop:SPACING.sm },
});
