import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView,
  Image, Alert, Platform, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, SPACING, RADIUS } from '../utils/theme';

const IS_WEB = Platform.OS === 'web';

const ROLES = [
  'Police Investigator','Forensic Investigator','Evidence Officer',
  'Court Official','Lawyer','Judge','System Admin',
];

// ── Real MetaMask connection (triggers the actual MetaMask popup) ──────────
async function connectMetaMask() {
  if (IS_WEB) {
    if (typeof window === 'undefined' || !window.ethereum) {
      throw new Error('MetaMask not installed. Please install the MetaMask browser extension from metamask.io');
    }
    // This triggers the REAL MetaMask popup window
    const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
    if (!accounts || accounts.length === 0) throw new Error('No accounts returned from MetaMask');
    return accounts[0];
  }
  // Mobile — return null, user will paste address manually
  return null;
}

export default function LandingScreen({ navigation }) {
  const { loginWithWallet, registerUser } = useApp();
  const [tab,          setTab]          = useState('login');
  const [loading,      setLoading]      = useState(false);
  const [statusMsg,    setStatusMsg]    = useState('');
  const [statusType,   setStatusType]   = useState('info');
  const [manualWallet, setManualWallet] = useState('');

  // Register fields
  const [fullName,     setFullName]     = useState('');
  const [badgeId,      setBadgeId]      = useState('');
  const [role,         setRole]         = useState('');
  const [department,   setDepartment]   = useState('');
  const [showRoles,    setShowRoles]    = useState(false);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const showStatus = (msg, type='info') => {
    setStatusMsg(msg);
    setStatusType(type);
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue:0, duration:100, useNativeDriver:true }),
      Animated.timing(fadeAnim, { toValue:1, duration:200, useNativeDriver:true }),
    ]).start();
  };

  // ── LOGIN ──────────────────────────────────────────────────────────────────
  const handleLogin = async () => {
    setLoading(true);
    showStatus('Opening MetaMask...', 'info');
    try {
      let address;
      if (!IS_WEB && manualWallet.trim()) {
        // Mobile: use manually pasted address
        address = manualWallet.trim();
        if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
          showStatus('Invalid wallet address — must start with 0x and be 42 characters', 'err');
          setLoading(false); return;
        }
      } else {
        // Web: trigger real MetaMask popup
        address = await connectMetaMask();
        if (!address) {
          showStatus('Please paste your wallet address below (mobile)', 'info');
          setLoading(false); return;
        }
      }
      showStatus('Checking account...', 'info');
      const result = await loginWithWallet(address);
      if (result.success) {
        navigation.replace('Main');
      } else {
        showStatus(result.error || 'Wallet not registered. Please register first.', 'err');
      }
    } catch (e) {
      const msg = e.code === 4001
        ? 'MetaMask connection rejected — please approve the connection request'
        : e.message;
      showStatus(msg, 'err');
    } finally { setLoading(false); }
  };

  // ── REGISTER ───────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    if (!fullName.trim()) { showStatus('Full name is required', 'err'); return; }
    if (!role)            { showStatus('Please select your role', 'err'); return; }

    setLoading(true);
    showStatus('Opening MetaMask...', 'info');
    try {
      let address;
      if (!IS_WEB && manualWallet.trim()) {
        address = manualWallet.trim();
        if (!/^0x[a-fA-F0-9]{40}$/i.test(address)) {
          showStatus('Invalid wallet address', 'err');
          setLoading(false); return;
        }
      } else {
        address = await connectMetaMask();
        if (!address) {
          showStatus('Please paste your wallet address below (mobile)', 'info');
          setLoading(false); return;
        }
      }
      showStatus('Saving registration...', 'info');
      const result = await registerUser({
        walletAddress: address,
        fullName: fullName.trim(),
        badgeId:  badgeId.trim() || '',
        role,
        department: department.trim() || '',
      });
      if (result.success) {
        navigation.replace('Main');
      } else {
        showStatus(result.error || 'Registration failed. Please try again.', 'err');
      }
    } catch (e) {
      const msg = e.code === 4001
        ? 'MetaMask connection rejected — please approve'
        : e.message;
      showStatus(msg, 'err');
    } finally { setLoading(false); }
  };

  const switchTab = (t) => {
    setTab(t);
    setStatusMsg('');
    setShowRoles(false);
  };

  const statusColor = statusType === 'ok'
    ? COLORS.success
    : statusType === 'err' ? COLORS.error : COLORS.primaryBlue;
  const statusBg = statusType === 'ok'
    ? 'rgba(16,185,129,.1)'
    : statusType === 'err' ? 'rgba(239,68,68,.1)' : 'rgba(59,130,246,.1)';

  return (
    <View style={s.root}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Logo */}
        <View style={s.logoBox}>
          <Ionicons name="shield-checkmark" size={40} color="#fff" />
        </View>
        <Text style={s.title}>SeQureChain</Text>
        <Text style={s.sub}>Blockchain Evidence Management</Text>
        <Text style={s.tagline}>Secure · Immutable · Decentralized</Text>

        {/* Tabs */}
        <View style={s.tabs}>
          {['login','register'].map(t => (
            <TouchableOpacity key={t} style={[s.tab, tab===t && s.tabOn]} onPress={()=>switchTab(t)}>
              <Text style={[s.tabTxt, tab===t && s.tabTxtOn]}>
                {t === 'login' ? 'Login' : 'Register'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Status message */}
        {statusMsg !== '' && (
          <Animated.View style={[s.statusBox, { opacity:fadeAnim, backgroundColor:statusBg, borderColor:statusColor }]}>
            <View style={[s.statusDot, { backgroundColor:statusColor }]} />
            <Text style={[s.statusTxt, { color:statusColor }]}>{statusMsg}</Text>
          </Animated.View>
        )}

        {/* ── LOGIN ───────────────────────────────────────────────────────── */}
        {tab === 'login' && (
          <View style={s.form}>
            <Text style={s.formHint}>
              {IS_WEB
                ? 'Click the button below to connect your wallet.'
                : 'Open MetaMask app, copy your wallet address, paste it below, then tap connect.'}
            </Text>

            {!IS_WEB && (
              <>
                <Text style={s.fieldLabel}>WALLET ADDRESS</Text>
                <TextInput
                  style={s.walletInput}
                  value={manualWallet}
                  onChangeText={setManualWallet}
                  placeholder="Paste your 0x... address from MetaMask"
                  placeholderTextColor="#475569"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </>
            )}

            <TouchableOpacity
              style={[s.mmBtn, loading && s.mmBtnDisabled]}
              onPress={handleLogin}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.mmTxt}>Connecting...</Text>
                </>
              ) : (
                <>
                  <Text style={s.mmTxt}>
                    {IS_WEB ? 'Connect MetaMask to Login' : 'Login with MetaMask'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={s.switchTxt}>
              No account?{' '}
              <Text style={s.switchLink} onPress={()=>switchTab('register')}>Register here</Text>
            </Text>
          </View>
        )}

        {/* ── REGISTER ────────────────────────────────────────────────────── */}
        {tab === 'register' && (
          <View style={s.form}>
            <Text style={s.fieldLabel}>FULL NAME <Text style={{color:COLORS.error}}>*</Text></Text>
            <TextInput style={s.input} value={fullName} onChangeText={setFullName}
              placeholder="e.g. Inspector Ahmad Raza Khan"
              placeholderTextColor="#475569" autoCapitalize="words" />

            <Text style={s.fieldLabel}>BADGE / ID NUMBER</Text>
            <TextInput style={s.input} value={badgeId} onChangeText={setBadgeId}
              placeholder="e.g. PSP-2024-0441"
              placeholderTextColor="#475569" autoCapitalize="characters" />

            <Text style={s.fieldLabel}>ROLE <Text style={{color:COLORS.error}}>*</Text></Text>
            <TouchableOpacity style={s.selectBox} onPress={()=>setShowRoles(!showRoles)}>
              <Text style={[s.selectTxt, !role && {color:'#475569'}]}>
                {role || '— Select your role —'}
              </Text>
              <Ionicons name={showRoles ? 'chevron-up' : 'chevron-down'} size={16} color="#64748b" />
            </TouchableOpacity>
            {showRoles && (
              <View style={s.dropdown}>
                {ROLES.map(r => (
                  <TouchableOpacity key={r} style={[s.dropItem, role===r && s.dropItemOn]}
                    onPress={()=>{setRole(r); setShowRoles(false);}}>
                    <Text style={[s.dropItemTxt, role===r && s.dropItemTxtOn]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.fieldLabel}>DEPARTMENT</Text>
            <TextInput style={s.input} value={department} onChangeText={setDepartment}
              placeholder="e.g. Lahore Police, Forensic Lab"
              placeholderTextColor="#475569" />

            {!IS_WEB && (
              <>
                <Text style={s.fieldLabel}>WALLET ADDRESS (from MetaMask app)</Text>
                <TextInput style={s.walletInput} value={manualWallet}
                  onChangeText={setManualWallet}
                  placeholder="Paste your 0x... address"
                  placeholderTextColor="#475569"
                  autoCapitalize="none" autoCorrect={false} />
              </>
            )}

            <TouchableOpacity
              style={[s.mmBtn, loading && s.mmBtnDisabled]}
              onPress={handleRegister}
              disabled={loading}
              activeOpacity={0.85}
            >
              {loading ? (
                <>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={s.mmTxt}>Registering...</Text>
                </>
              ) : (
                <>
                  <Text style={s.mmTxt}>Connect MetaMask &amp; Register</Text>
                </>
              )}
            </TouchableOpacity>

            <Text style={s.formHint}>
              Your wallet address will be saved as your permanent login identity.
            </Text>

            <Text style={s.switchTxt}>
              Have an account?{' '}
              <Text style={s.switchLink} onPress={()=>switchTab('login')}>Login here</Text>
            </Text>
          </View>
        )}

        
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex:1, backgroundColor:'#0f172a' },
  scroll: { alignItems:'center', paddingHorizontal:28, paddingBottom:80, paddingTop:60 },
  logoBox:{ width:90, height:90, borderRadius:22, backgroundColor:'#1A56DB', justifyContent:'center', alignItems:'center', marginBottom:18, shadowColor:'#1A56DB', shadowOpacity:.5, shadowRadius:20, shadowOffset:{width:0,height:8} },
  title:  { fontSize:30, fontWeight:'800', color:'#fff', letterSpacing:2, marginBottom:5, fontFamily:'Space Mono' },
  sub:    { fontSize:12, color:'#64748b', textAlign:'center', marginBottom:3 },
  tagline:{ fontSize:10, color:'#334155', letterSpacing:.5, marginBottom:28 },
  tabs:   { flexDirection:'row', backgroundColor:'rgba(255,255,255,.06)', borderRadius:9, padding:3, width:'100%', maxWidth:340, marginBottom:14 },
  tab:    { flex:1, paddingVertical:9, alignItems:'center', borderRadius:7 },
  tabOn:  { backgroundColor:'#1A56DB' },
  tabTxt: { fontSize:13, fontWeight:'600', color:'#64748b' },
  tabTxtOn:{ color:'#fff' },
  statusBox:{ flexDirection:'row', alignItems:'center', gap:8, borderWidth:1, borderRadius:8, paddingHorizontal:12, paddingVertical:8, marginBottom:10, width:'100%', maxWidth:340 },
  statusDot:{ width:6, height:6, borderRadius:3 },
  statusTxt:{ fontSize:11, flex:1, lineHeight:16 },
  form:   { width:'100%', maxWidth:340 },
  formHint:{ fontSize:11, color:'#475569', textAlign:'center', marginBottom:12, lineHeight:17 },
  fieldLabel:{ fontSize:9, color:'#64748b', letterSpacing:.7, fontWeight:'600', marginBottom:4, marginTop:10 },
  input:  { backgroundColor:'#1e293b', borderWidth:1, borderColor:'#334155', borderRadius:8, padding:10, color:'#fff', fontSize:12, marginBottom:4 },
  walletInput:{ backgroundColor:'#1e293b', borderWidth:1, borderColor:'#334155', borderRadius:8, padding:10, color:'#fff', fontSize:11, fontFamily:'monospace', marginBottom:8 },
  selectBox:{ backgroundColor:'#1e293b', borderWidth:1, borderColor:'#334155', borderRadius:8, padding:10, flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:4 },
  selectTxt:{ fontSize:12, color:'#fff' },
  dropdown:{ backgroundColor:'#1e293b', borderWidth:1, borderColor:'#334155', borderRadius:8, marginBottom:8, overflow:'hidden' },
  dropItem:{ paddingVertical:10, paddingHorizontal:12, borderBottomWidth:1, borderBottomColor:'#334155' },
  dropItemOn:{ backgroundColor:'#1A56DB' },
  dropItemTxt:{ fontSize:12, color:'#94a3b8' },
  dropItemTxtOn:{ color:'#fff', fontWeight:'600' },
  mmBtn:  { width:'100%', backgroundColor:'#f6851b', borderRadius:11, paddingVertical:13, flexDirection:'row', alignItems:'center', justifyContent:'center', gap:10, marginTop:12, marginBottom:10, shadowColor:'#f6851b', shadowOpacity:.35, shadowRadius:12, shadowOffset:{width:0,height:4} },
  mmBtnDisabled:{ opacity:.7 },
  mmFox:  { fontSize:22 },
  mmTxt:  { fontSize:14, fontWeight:'700', color:'#fff' },
  switchTxt:{ fontSize:11, color:'#475569', textAlign:'center', marginTop:4 },
  switchLink:{ color:'#3B82F6' },
  footer: { fontSize:9, color:'#334155', textAlign:'center', marginTop:24, lineHeight:16 },
});
