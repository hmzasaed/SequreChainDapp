/**
 * SeQureChain — Hover utility
 * Provides cross-platform hover state for web (onMouseEnter/Leave)
 * On mobile these are no-ops so it's safe to use everywhere
 */
import { useState } from 'react';
import { Platform } from 'react-native';

export const IS_WEB = Platform.OS === 'web';

/**
 * Returns hover state + event handlers to spread onto a View or TouchableOpacity
 * Usage:
 *   const { hovered, hoverProps } = useHover();
 *   <View {...hoverProps} style={[styles.card, hovered && styles.cardHovered]}>
 */
export function useHover() {
  const [hovered, setHovered] = useState(false);
  const hoverProps = IS_WEB
    ? { onMouseEnter: () => setHovered(true), onMouseLeave: () => setHovered(false) }
    : {};
  return { hovered, hoverProps };
}

/**
 * Web-only cursor style
 * Usage: style={[styles.btn, cursor('pointer')]}
 */
export const cursor = (type='pointer') =>
  IS_WEB ? { cursor: type } : {};

/**
 * Hover overlay color helper
 * Returns a semi-transparent overlay when hovered
 */
export const hoverBg = (color='rgba(26,86,219,0.05)') =>
  (hovered) => hovered ? { backgroundColor: color } : {};
