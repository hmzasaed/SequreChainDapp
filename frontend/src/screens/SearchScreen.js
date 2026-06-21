// SearchScreen.js
import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../context/AppContext';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS, SHADOWS, EVIDENCE_TYPES, STATUS_CONFIG } from '../utils/theme';
import Header from '../components/Header';
import { useHover, IS_WEB, cursor } from '../utils/hover';

export default function SearchScreen({ navigation }) {
  const { API_URL, showToast } = useApp();
  const [query, setQuery] = useState('');
  const [mode, setMode] = useState('cid'); // 'cid' | 'keyword'
  const [result, setResult] = useState(null);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return showToast('Enter a search query', 'error');
    setLoading(true);
    setSearched(true);
    setResult(null);
    setResults([]);
    try {
      if (mode === 'cid') {
        const res = await fetch(`${API_URL}/evidence/search/cid/${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) setResult(data.data);
        else showToast('No evidence found with this CID', 'error');
      } else {
        const res = await fetch(`${API_URL}/evidence?search=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        if (data.success) setResults(data.data);
      }
    } catch { showToast('Search failed', 'error'); }
    finally { setLoading(false); }
  };

  const typeInfo = (type) => EVIDENCE_TYPES.find(t => t.value === type) || EVIDENCE_TYPES[2];

  return (
    <View style={s.root}>
      <Header title="Search Evidence" navigation={navigation} />
      <ScrollView contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
        {/* Mode toggle */}
        <View style={s.modeRow}>
          {[['cid', 'search', 'Search by CID'], ['keyword', 'text', 'Search by Keyword']].map(([val, icon, label]) => (
            <TouchableOpacity key={val} style={[s.modeBtn, mode === val && s.modeBtnActive]} onPress={() => { setMode(val); setResult(null); setResults([]); setSearched(false); }}>
              <Ionicons name={icon} size={14} color={mode === val ? COLORS.white : COLORS.textSecondary} />
              <Text style={[s.modeBtnText, mode === val && s.modeBtnTextActive]}>{label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Input */}
        <View style={s.searchBox}>
          <TextInput
            style={s.input}
            value={query}
            onChangeText={setQuery}
            placeholder={mode === 'cid' ? 'Enter IPFS CID (e.g. bafybeig...)' : 'Enter description, case ID...'}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="none" autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={handleSearch}
          />
          <TouchableOpacity style={s.searchBtn} onPress={handleSearch} disabled={loading}>
            {loading ? <ActivityIndicator color={COLORS.white} size="small" /> : <Ionicons name="search" size={20} color={COLORS.white} />}
          </TouchableOpacity>
        </View>

        <Text style={s.hint}>
          {mode === 'cid' ? 'Paste the IPFS Content Identifier to locate exact evidence' : 'Search across descriptions, evidence IDs, and types'}
        </Text>

        {/* Results */}
        {!searched && (
          <View style={s.placeholder}>
            <Ionicons name="search-circle-outline" size={64} color={COLORS.borderGray} />
            <Text style={s.placeholderText}>Enter a search query above</Text>
          </View>
        )}

        {searched && !loading && !result && results.length === 0 && (
          <View style={s.placeholder}>
            <Ionicons name="alert-circle-outline" size={48} color={COLORS.textMuted} />
            <Text style={s.placeholderText}>No evidence found</Text>
          </View>
        )}

        {result && (
          <TouchableOpacity style={s.resultCard} onPress={() => navigation.navigate('EvidenceDetail', { evidenceId: result.evidence_id })}>
            <View style={s.resultHeader}>
              <View style={[s.typeIcon, { backgroundColor: typeInfo(result.evidence_type).color + '15' }]}>
                <Ionicons name={typeInfo(result.evidence_type).icon} size={22} color={typeInfo(result.evidence_type).color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.resultId}>{result.evidence_id}</Text>
                <Text style={s.resultDesc} numberOfLines={2}>{result.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={COLORS.textMuted} />
            </View>
            <View style={s.cidBox}><Text style={s.cidText} numberOfLines={1}>CID: {result.cid}</Text></View>
          </TouchableOpacity>
        )}

        {results.map(item => (
          <TouchableOpacity key={item.evidence_id} style={s.resultCard} onPress={() => navigation.navigate('EvidenceDetail', { evidenceId: item.evidence_id })}>
            <View style={s.resultHeader}>
              <View style={[s.typeIcon, { backgroundColor: typeInfo(item.evidence_type).color + '15' }]}>
                <Ionicons name={typeInfo(item.evidence_type).icon} size={20} color={typeInfo(item.evidence_type).color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.resultId}>{item.evidence_id}</Text>
                <Text style={s.resultDesc} numberOfLines={1}>{item.description}</Text>
              </View>
              <View style={[s.statusBadge, { backgroundColor: STATUS_CONFIG[item.status]?.bg }]}>
                <Text style={[s.statusText, { color: STATUS_CONFIG[item.status]?.color }]}>{STATUS_CONFIG[item.status]?.label}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.offWhite },
  content: { padding: SPACING.md, gap: SPACING.sm, paddingBottom: 60 },
  modeRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  modeBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: RADIUS.md, backgroundColor: COLORS.white, borderWidth: 1, borderColor: COLORS.borderGray },
  modeBtnActive: { backgroundColor: COLORS.primaryBlue, borderColor: COLORS.primaryBlue },
  modeBtnText: { ...TYPOGRAPHY.small, color: COLORS.textSecondary, fontWeight: '600' },
  modeBtnTextActive: { color: COLORS.white },
  searchBox: { flexDirection: 'row', gap: 8 },
  input: { flex: 1, borderWidth: 1, borderColor: COLORS.borderGray, borderRadius: RADIUS.md, padding: SPACING.sm + 2, ...TYPOGRAPHY.body, color: COLORS.textPrimary, backgroundColor: COLORS.white, fontFamily: 'monospace' },
  searchBtn: { width: 46, height: 46, backgroundColor: COLORS.primaryBlue, borderRadius: RADIUS.md, justifyContent: 'center', alignItems: 'center' },
  hint: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  placeholder: { paddingTop: 60, alignItems: 'center', gap: SPACING.sm },
  placeholderText: { ...TYPOGRAPHY.body, color: COLORS.textMuted },
  resultCard: { backgroundColor: COLORS.white, borderRadius: RADIUS.lg, padding: SPACING.md, ...SHADOWS.card, borderWidth: 1, borderColor: COLORS.borderGray, gap: 8 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: SPACING.sm },
  typeIcon: { width: 44, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  resultId: { ...TYPOGRAPHY.smallBold, color: COLORS.textPrimary, fontFamily: 'monospace' },
  resultDesc: { ...TYPOGRAPHY.small, color: COLORS.textMuted },
  cidBox: { backgroundColor: COLORS.offWhite, borderRadius: RADIUS.sm, padding: 6 },
  cidText: { ...TYPOGRAPHY.mono, color: COLORS.textSecondary, fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: RADIUS.full },
  statusText: { fontSize: 10, fontWeight: '700' },
});
