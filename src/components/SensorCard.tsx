import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useAppTheme } from '@/context/ThemeContext';

type SensorStatus = 'normal' | 'warning' | 'critical' | 'inactive';

type SensorCardProps = {
  title: string;
  value: string;
  subtitle: string;
  status: SensorStatus;
  accentColor: string;
  onPress?: () => void;
  active?: boolean;
};

const STATUS_LABELS: Record<SensorStatus, string> = {
  normal: 'Normal',
  warning: 'Warning',
  critical: 'Critical',
  inactive: 'Inactive',
};

const STATUS_COLORS: Record<SensorStatus, string> = {
  normal: '#1E9E64',
  warning: '#F2A516',
  critical: '#D84C4C',
  inactive: '#7A869A',
};

function hexToRgba(hex: string, opacity: number) {
  const normalized = hex.replace('#', '');
  const safeHex =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  const bigint = parseInt(safeHex, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

function formatSensorTitle(title: string) {
  return title
    .split('_')
    .filter(Boolean)
    .map((part) => {
      if (part.toLowerCase() === 'spo2') {
        return 'SpO2';
      }

      if (part.toLowerCase() === 'bpm') {
        return 'BPM';
      }

      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

export default function SensorCard({
  title,
  value,
  subtitle,
  status,
  accentColor,
  onPress,
  active = false,
}: SensorCardProps) {
  const { colors } = useAppTheme();
  const { width } = useWindowDimensions();
  const styles = createStyles(colors, width);
  const formattedTitle = formatSensorTitle(title);
  const statusColor = STATUS_COLORS[status];

  return (
    <TouchableOpacity
      style={[styles.card, active && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <View style={[styles.glowOrb, { backgroundColor: hexToRgba(accentColor, 0.12) }]} />
      <View style={[styles.sideRail, { backgroundColor: accentColor }]} />

      <View style={styles.topRow}>
        <View style={styles.titleWrap}>
          <Text style={styles.kicker}>Live Sensor</Text>
          <Text style={styles.title} numberOfLines={2}>
            {formattedTitle}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: hexToRgba(statusColor, 0.14),
              borderColor: hexToRgba(statusColor, 0.3),
            },
          ]}
        >
          <Text style={styles.statusText}>{STATUS_LABELS[status]}</Text>
        </View>
      </View>

      <Text style={styles.value} numberOfLines={1}>
        {value}
      </Text>

      <Text style={styles.subtitle} numberOfLines={2}>
        {subtitle}
      </Text>

      <View style={styles.footerRow}>
        <Text style={styles.footerLabel}>{active ? 'Focused' : 'Details'}</Text>
        <Text style={styles.footerText}>{active ? 'Currently selected' : 'Tap to inspect history'}</Text>
      </View>
    </TouchableOpacity>
  );
}

const createStyles = (colors: {
  card: string;
  tint: string;
  text: string;
  icon: string;
  shadow: string;
  border?: string;
  mutedSurface?: string;
}, width: number) =>
  StyleSheet.create({
    card: {
      flexBasis: '48%',
      backgroundColor: colors.card,
      borderRadius: 24,
      padding: 18,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: activeBorder(colors),
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.14,
      shadowRadius: 18,
      elevation: 3,
      minHeight: width >= 1280 ? 178 : 168,
      position: 'relative',
      overflow: 'hidden',
    },
    cardActive: {
      borderColor: colors.tint,
      shadowOpacity: 0.22,
      shadowRadius: 22,
      elevation: 5,
    },
    glowOrb: {
      position: 'absolute',
      width: 160,
      height: 160,
      borderRadius: 999,
      top: -72,
      right: -52,
    },
    sideRail: {
      position: 'absolute',
      left: 0,
      top: 18,
      bottom: 18,
      width: 4,
      borderTopRightRadius: 999,
      borderBottomRightRadius: 999,
    },
    topRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
    },
    titleWrap: {
      flex: 1,
      gap: 6,
    },
    kicker: {
      fontSize: 10,
      fontWeight: '700',
      letterSpacing: 1,
      textTransform: 'uppercase',
      color: colors.icon,
    },
    title: {
      fontSize: 15,
      fontWeight: '700',
      color: colors.text,
      lineHeight: 22,
    },
    value: {
      fontSize: width >= 1280 ? 34 : 30,
      fontWeight: '900',
      color: colors.text,
      marginTop: 20,
      letterSpacing: -1,
    },
    subtitle: {
      fontSize: 12,
      color: colors.icon,
      marginTop: 10,
      lineHeight: 19,
      maxWidth: '92%',
    },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderWidth: 1,
    },
    statusText: {
      color: colors.text,
      fontSize: 11,
      fontWeight: '700',
    },
    footerRow: {
      marginTop: 'auto',
      paddingTop: 16,
    },
    footerLabel: {
      fontSize: 10,
      fontWeight: '700',
      textTransform: 'uppercase',
      letterSpacing: 1,
      color: colors.icon,
    },
    footerText: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.text,
      marginTop: 4,
    },
  });

function activeBorder(colors: { border?: string; mutedSurface?: string }) {
  return colors.border ?? colors.mutedSurface ?? 'rgba(255,255,255,0.08)';
}
