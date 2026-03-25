import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
  const styles = createStyles(colors);

  return (
    <TouchableOpacity
      style={[styles.card, active && styles.cardActive]}
      onPress={onPress}
      activeOpacity={0.85}
      disabled={!onPress}
    >
      <View style={[styles.accentBar, { backgroundColor: accentColor }]} />
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[status] }]}>
        <Text style={styles.statusText}>{STATUS_LABELS[status]}</Text>
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
}) =>
  StyleSheet.create({
    card: {
      flexBasis: '48%',
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 14,
      marginBottom: 12,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 3,
    },
    cardActive: {
      borderWidth: 2,
      borderColor: colors.tint,
    },
    accentBar: {
      width: 42,
      height: 5,
      borderRadius: 999,
      marginBottom: 12,
    },
    title: {
      fontSize: 13,
      fontWeight: '600',
      color: colors.text,
      minHeight: 36,
    },
    value: {
      fontSize: 22,
      fontWeight: '800',
      color: colors.text,
      marginTop: 10,
    },
    subtitle: {
      fontSize: 12,
      color: colors.icon,
      marginTop: 6,
      minHeight: 32,
    },
    statusBadge: {
      alignSelf: 'flex-start',
      borderRadius: 999,
      paddingHorizontal: 10,
      paddingVertical: 5,
      marginTop: 10,
    },
    statusText: {
      color: '#fff',
      fontSize: 11,
      fontWeight: '700',
    },
  });
