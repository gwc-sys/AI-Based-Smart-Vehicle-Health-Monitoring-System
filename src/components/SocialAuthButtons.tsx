import React from 'react';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ProviderName = 'google' | 'apple';

type SocialAuthButtonsProps = {
  onPress: (provider: ProviderName) => Promise<void> | void;
  loading?: boolean;
  mode: 'login' | 'register';
};

const PROVIDERS: Array<{ key: ProviderName; label: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string }> = [
  { key: 'google', label: 'Google', icon: 'logo-google', iconColor: '#4285F4' },
  { key: 'apple', label: 'Apple', icon: 'logo-apple', iconColor: '#111827' },
];

export default function SocialAuthButtons({ onPress, loading = false, mode }: SocialAuthButtonsProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.sectionLabel}>{mode === 'login' ? 'Continue with' : 'Sign up with'}</Text>

      <View style={styles.buttons}>
        {PROVIDERS.map((provider) => (
          <TouchableOpacity
            key={provider.key}
            style={[styles.button, loading && styles.disabledButton]}
            onPress={() => onPress(provider.key)}
            disabled={loading}
            activeOpacity={0.85}
            accessibilityLabel={`${provider.label} sign-in`}
            accessibilityHint={`Continue using ${provider.label}`}
          >
            <Ionicons name={provider.icon} size={22} color={provider.iconColor} style={styles.icon} />
            <Text style={styles.buttonText}>{`Continue with ${provider.label}`}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#007AFF" />
          <Text style={styles.loadingText}>Opening provider sign-in...</Text>
        </View>
      )}

      {Platform.OS !== 'web' && (
        <Text style={styles.noteText}>
          Social sign-in is currently configured for web popup flow in this app.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginTop: 24,
  },
  sectionLabel: {
    marginBottom: 14,
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '600',
    textAlign: 'center',
  },
  buttons: {
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d7dce3',
    borderRadius: 10,
    backgroundColor: '#ffffff',
    paddingVertical: 13,
    paddingHorizontal: 18,
    justifyContent: 'center',
    ...(Platform.OS === 'web'
      ? {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
        }
      : {}),
  },
  disabledButton: {
    opacity: 0.65,
  },
  icon: {
    marginRight: 12,
  },
  buttonText: {
    fontSize: 15,
    color: '#111827',
    fontWeight: '600',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 13,
    color: '#6b7280',
  },
  noteText: {
    marginTop: 12,
    fontSize: 12,
    color: '#8a6d3b',
    textAlign: 'center',
    lineHeight: 18,
  },
});
