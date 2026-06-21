import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, TYPOGRAPHY } from '../utils/theme';

export default function Header({ title, navigation, showBack, onBack }) {
  const insets   = useSafeAreaInsets();
  const canGoBack = showBack || navigation?.canGoBack?.();

  const handleLeft = () => {
    if (onBack) { onBack(); return; }
    if (canGoBack) { navigation.goBack(); return; }
    navigation?.openDrawer?.();
  };

  return (
    <View style={[styles.wrap, { paddingTop: insets.top + 4 }]}>
      <TouchableOpacity style={styles.btn} onPress={handleLeft}>
        <Ionicons
          name={canGoBack ? 'arrow-back' : 'menu'}
          size={22}
          color={COLORS.textPrimary}
        />
      </TouchableOpacity>

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      <View style={styles.btn} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderGray,
    paddingBottom: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    width: 36, height: 36, borderRadius: 9,
    justifyContent: 'center', alignItems: 'center',
  },
  title: {
    flex: 1, textAlign: 'center',
    ...TYPOGRAPHY.h4, color: COLORS.textPrimary,
  },
});
