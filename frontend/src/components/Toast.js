import React, { useEffect, useRef } from 'react';
import { Animated, Text, StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING, RADIUS } from '../utils/theme';

const TOAST_CONFIG = {
  success: { bg: '#ECFDF5', border: COLORS.success, icon: 'checkmark-circle', color: COLORS.success },
  error: { bg: '#FEF2F2', border: COLORS.error, icon: 'close-circle', color: COLORS.error },
  info: { bg: '#EFF6FF', border: COLORS.primaryBlue, icon: 'information-circle', color: COLORS.primaryBlue },
  warning: { bg: '#FFFBEB', border: COLORS.warning, icon: 'warning', color: COLORS.warning },
};

export default function Toast({ message, type = 'info' }) {
  const slideAnim = useRef(new Animated.Value(-80)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const cfg = TOAST_CONFIG[type] || TOAST_CONFIG.info;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(slideAnim, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  }, [message]);

  return (
    <Animated.View style={[styles.toast, {
      backgroundColor: cfg.bg,
      borderLeftColor: cfg.border,
      transform: [{ translateY: slideAnim }],
      opacity: opacityAnim,
    }]}>
      <Ionicons name={cfg.icon} size={18} color={cfg.color} />
      <Text style={[styles.toastText, { color: cfg.color }]}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute', bottom: 32, left: SPACING.md, right: SPACING.md,
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: SPACING.md, borderRadius: RADIUS.lg,
    borderLeftWidth: 3,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12, shadowRadius: 12, elevation: 8,
  },
  toastText: { ...TYPOGRAPHY.bodyMed, flex: 1, fontWeight: '600' },
});
