import { useAppTheme } from '@/context/ThemeContext';
import useAuth from '@/hooks/useAuth';
import { useEmergencyGuardianOutreach } from '@/hooks/useEmergencyGuardianOutreach';
import { EmergencyContact } from '@/services/emergencyConfigService';
import { VehicleRealtimeAlert } from '@/services/vehicleRealtimeService';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

export interface GlobalEmergencyAlertProps {
  visible: boolean;
  alert: VehicleRealtimeAlert | null;
  guardians: EmergencyContact[];
  onOutreachComplete?: (result: any) => void;
  onClose?: () => void;
}

export default function GlobalEmergencyAlertPanel({
  visible,
  alert,
  guardians,
  onOutreachComplete,
  onClose,
}: GlobalEmergencyAlertProps) {
  const { colors } = useAppTheme();
  const { user } = useAuth();
  const styles = useMemo(() => createStyles(colors), [colors]);
  
  const {
    sendAlertsToAllGuardians,
    status,
    result,
    error,
    reset,
  } = useEmergencyGuardianOutreach();

  const [autoSent, setAutoSent] = useState(false);

  useEffect(() => {
    if (!visible || !alert || autoSent) {
      return;
    }

    // Auto-send alerts to all guardians when SOS is triggered
    const sendAlerts = async () => {
      if (user?.id) {
        setAutoSent(true);
        await sendAlertsToAllGuardians(alert, user.id);
      }
    };

    sendAlerts();
  }, [visible, alert, autoSent, user?.id, sendAlertsToAllGuardians]);

  useEffect(() => {
    if (status === 'completed' && result && onOutreachComplete) {
      onOutreachComplete(result);
    }
  }, [status, result, onOutreachComplete]);

  if (!visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.panel}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>🚨 Emergency Response</Text>
            <Text style={styles.subtitle}>Alerting guardians and emergency services</Text>
          </View>
          {onClose && (
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.closeButton}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Status Section */}
          <View style={styles.statusCard}>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Overall Status</Text>
              <View style={[styles.statusBadge, getStatusBadgeStyle(status, colors)]}>
                <Text style={styles.statusBadgeText}>{formatStatus(status)}</Text>
              </View>
            </View>

            {status === 'sending' && (
              <View style={styles.loadingRow}>
                <ActivityIndicator color={colors.tint} />
                <Text style={styles.loadingText}>Sending alerts to guardians...</Text>
              </View>
            )}

            {status === 'completed' && result && (
              <View style={styles.resultCard}>
                <Text style={styles.resultTitle}>✓ Alerts Sent Successfully</Text>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>WhatsApp Messages:</Text>
                  <Text style={styles.resultValue}>{result.whatsapp}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>SMS Messages:</Text>
                  <Text style={styles.resultValue}>{result.sms}</Text>
                </View>
                <View style={styles.resultRow}>
                  <Text style={styles.resultLabel}>Total Guardians:</Text>
                  <Text style={styles.resultValue}>{result.total}</Text>
                </View>
              </View>
            )}

            {status === 'error' && error && (
              <View style={styles.errorCard}>
                <Text style={styles.errorTitle}>⚠ Error Sending Alerts</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}
          </View>

          {/* Guardians List */}
          <View style={styles.guardiansSection}>
            <Text style={styles.sectionTitle}>Guardians Being Alerted ({guardians.length})</Text>

            {guardians.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateText}>No emergency contacts configured</Text>
              </View>
            ) : (
              guardians.map((guardian, index) => (
                <View key={guardian.id || index} style={styles.guardianCard}>
                  <View style={styles.guardianHeader}>
                    <View style={styles.guardianInfo}>
                      <Text style={styles.guardianName}>{guardian.name}</Text>
                      <Text style={styles.guardianRelationship}>
                        {guardian.relationship || 'Emergency Contact'}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.guardianActions}>
                    {guardian.whatsapp?.trim() && (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>📱 WhatsApp</Text>
                      </View>
                    )}
                    {guardian.phone?.trim() && (
                      <View style={styles.actionBadge}>
                        <Text style={styles.actionBadgeText}>📞 SMS</Text>
                      </View>
                    )}
                  </View>

                  <Text style={styles.guardianPhone}>
                    {guardian.phone && `Phone: ${guardian.phone}`}
                    {guardian.whatsapp && guardian.phone && ' | '}
                    {guardian.whatsapp && `WhatsApp: ${guardian.whatsapp}`}
                  </Text>
                </View>
              ))
            )}
          </View>

          {/* Alert Details */}
          {alert && (
            <View style={styles.alertDetailsSection}>
              <Text style={styles.sectionTitle}>Alert Details</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Message:</Text>
                <Text style={styles.detailValue}>{alert.message || alert.type}</Text>
              </View>

              {alert.hospital_name && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Nearest Hospital:</Text>
                  <Text style={styles.detailValue}>{alert.hospital_name}</Text>
                </View>
              )}

              {typeof alert.heart_rate_bpm === 'number' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Heart Rate:</Text>
                  <Text style={styles.detailValue}>{alert.heart_rate_bpm.toFixed(0)} bpm</Text>
                </View>
              )}

              {typeof alert.spo2 === 'number' && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>SpO₂ Level:</Text>
                  <Text style={styles.detailValue}>{alert.spo2.toFixed(1)}%</Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* Footer Actions */}
        {status === 'completed' && (
          <View style={styles.footer}>
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={onClose}
            >
              <Text style={styles.confirmButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

function formatStatus(status: string): string {
  switch (status) {
    case 'idle':
      return 'Idle';
    case 'sending':
      return 'Sending...';
    case 'completed':
      return 'Completed';
    case 'error':
      return 'Error';
    default:
      return 'Unknown';
  }
}

function getStatusBadgeStyle(status: string, colors: any) {
  switch (status) {
    case 'sending':
      return { backgroundColor: colors.warning, borderColor: colors.warningBorder };
    case 'completed':
      return { backgroundColor: colors.success, borderColor: colors.successBorder };
    case 'error':
      return { backgroundColor: colors.error, borderColor: colors.errorBorder };
    default:
      return { backgroundColor: colors.mutedSurface, borderColor: colors.border };
  }
}

const createStyles = (colors: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 16,
    },
    panel: {
      backgroundColor: colors.card,
      borderRadius: 20,
      width: '100%',
      maxWidth: 500,
      maxHeight: '85%',
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 12,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: '#FF5756',
      marginBottom: 4,
    },
    subtitle: {
      fontSize: 12,
      color: colors.icon,
    },
    closeButton: {
      fontSize: 24,
      color: colors.icon,
      padding: 8,
    },
    content: {
      padding: 16,
      maxHeight: '70%',
    },
    statusCard: {
      backgroundColor: colors.mutedSurface,
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    statusRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    statusLabel: {
      fontSize: 12,
      fontWeight: '600',
      color: colors.icon,
    },
    statusBadge: {
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 20,
      borderWidth: 1,
    },
    statusBadgeText: {
      fontSize: 12,
      fontWeight: '600',
      color: '#fff',
    },
    loadingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 10,
      gap: 10,
    },
    loadingText: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '500',
    },
    resultCard: {
      marginTop: 12,
      backgroundColor: 'rgba(76, 175, 80, 0.1)',
      borderLeftWidth: 3,
      borderLeftColor: '#4CAF50',
      padding: 12,
      borderRadius: 8,
    },
    resultTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#4CAF50',
      marginBottom: 8,
    },
    resultRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 4,
    },
    resultLabel: {
      fontSize: 12,
      color: colors.text,
      fontWeight: '500',
    },
    resultValue: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
    },
    errorCard: {
      marginTop: 12,
      backgroundColor: 'rgba(244, 67, 54, 0.1)',
      borderLeftWidth: 3,
      borderLeftColor: '#F44336',
      padding: 12,
      borderRadius: 8,
    },
    errorTitle: {
      fontSize: 13,
      fontWeight: '700',
      color: '#F44336',
      marginBottom: 4,
    },
    errorText: {
      fontSize: 12,
      color: colors.text,
      lineHeight: 16,
    },
    guardiansSection: {
      marginBottom: 16,
    },
    sectionTitle: {
      fontSize: 14,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 10,
    },
    emptyState: {
      backgroundColor: colors.mutedSurface,
      borderRadius: 10,
      padding: 16,
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: 12,
      color: colors.icon,
    },
    guardianCard: {
      backgroundColor: colors.mutedSurface,
      borderRadius: 10,
      padding: 12,
      marginBottom: 10,
    },
    guardianHeader: {
      marginBottom: 8,
    },
    guardianInfo: {
      flex: 1,
    },
    guardianName: {
      fontSize: 13,
      fontWeight: '700',
      color: colors.text,
    },
    guardianRelationship: {
      fontSize: 11,
      color: colors.icon,
      marginTop: 2,
    },
    guardianActions: {
      flexDirection: 'row',
      gap: 6,
      marginVertical: 8,
    },
    actionBadge: {
      backgroundColor: 'rgba(33, 150, 243, 0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 12,
    },
    actionBadgeText: {
      fontSize: 11,
      fontWeight: '600',
      color: '#2196F3',
    },
    guardianPhone: {
      fontSize: 11,
      color: colors.icon,
      fontWeight: '500',
    },
    alertDetailsSection: {
      marginBottom: 16,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginVertical: 6,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    detailLabel: {
      fontSize: 12,
      color: colors.icon,
      fontWeight: '500',
    },
    detailValue: {
      fontSize: 12,
      fontWeight: '700',
      color: colors.text,
      flex: 1,
      textAlign: 'right',
    },
    footer: {
      borderTopWidth: 1,
      borderTopColor: colors.border,
      padding: 16,
    },
    confirmButton: {
      backgroundColor: colors.tint,
      borderRadius: 10,
      paddingVertical: 12,
      alignItems: 'center',
    },
    confirmButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '700',
    },
  });
