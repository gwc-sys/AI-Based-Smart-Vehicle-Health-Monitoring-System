# Integration Code Examples

This document provides exact code snippets for integrating the emergency alert system into your existing screens.

## Integration #1: App.tsx

Add background services initialization to your main App component.

### Before (Current)
```typescript
export default function App() {
  // Existing code...
  
  return <NavigationContainer>{/* ... */}</NavigationContainer>;
}
```

### After (With Emergency Services)
```typescript
import { initializeBackgroundNotificationHandler, registerEmergencyBackgroundTask } from '@/services/backgroundNotificationService';

export default function App() {
  useEffect(() => {
    // Initialize background notification handler for emergencies
    const subscriptions = initializeBackgroundNotificationHandler();

    // Register periodic background task for monitoring
    registerEmergencyBackgroundTask();

    // Cleanup on unmount
    return () => {
      subscriptions.received.remove();
      subscriptions.response.remove();
    };
  }, []);

  // Existing code...
  
  return <NavigationContainer>{/* ... */}</NavigationContainer>;
}
```

---

## Integration #2: AlertsScreen.tsx

Add global emergency alert panel and guardian loading.

### Step 1: Add Imports
```typescript
import GlobalEmergencyAlertPanel from '@/components/GlobalEmergencyAlertPanel';
import { EmergencyContact, getEmergencyContacts } from '@/services/emergencyConfigService';
```

### Step 2: Add State
```typescript
export default function AlertsScreen() {
  const [alerts, setAlerts] = useState<VehicleRealtimeAlert[]>([]);
  const [guardians, setGuardians] = useState<EmergencyContact[]>([]);
  const [showGlobalAlert, setShowGlobalAlert] = useState(false);
  const [selectedSosAlert, setSelectedSosAlert] = useState<VehicleRealtimeAlert | null>(null);
  
  // ... existing state
}
```

### Step 3: Load Guardians on Mount
```typescript
export default function AlertsScreen() {
  // ... state declarations

  const { user } = useAuth();

  // Load emergency contacts on component mount
  useEffect(() => {
    const loadGuardians = async () => {
      if (!user?.uid) return;
      try {
        const contacts = await getEmergencyContacts(user.uid);
        setGuardians(contacts || []);
      } catch (error) {
        console.error('Error loading guardians:', error);
      }
    };

    loadGuardians();
  }, [user?.uid]);

  // ... existing useEffects
}
```

### Step 4: Detect SOS and Show Global Alert
```typescript
  // Add this useEffect to detect SOS alerts
  useEffect(() => {
    // When an SOS alert is detected/selected
    if (selectedSosAlert && selectedSosAlert.type === 'SOS_EMERGENCY') {
      setShowGlobalAlert(true);
    }
  }, [selectedSosAlert]);
```

### Step 5: Add Global Alert Panel to JSX
```typescript
  return (
    <View style={styles.container}>
      {/* Existing alert list or card */}
      <ScrollView>
        {alerts.map((alert) => (
          <TouchableOpacity
            key={alert.id}
            onPress={() => setSelectedSosAlert(alert)}
          >
            {/* Your existing alert card component */}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* ADD THIS: Global Emergency Alert Panel */}
      <GlobalEmergencyAlertPanel
        visible={showGlobalAlert}
        alert={selectedSosAlert}
        guardians={guardians}
        onOutreachComplete={(result) => {
          console.log('Emergency outreach complete:', result);
          // You can add analytics or other actions here
        }}
        onClose={() => {
          setShowGlobalAlert(false);
          setSelectedSosAlert(null);
        }}
      />
    </View>
  );
```

---

## Integration #3: SosAlertModal.tsx (Optional Enhancement)

If you want to add an "Alert All Guardians" button to the existing SOS modal:

### Add Button to Emergency Action Plan Section
```typescript
// In the actionGrid section, add this new action card:

<TouchableOpacity
  style={styles.primaryActionCard}
  onPress={() => {
    // Open WhatsApp to each guardian
    familyContacts.forEach((contact) => {
      if (contact.whatsapp?.trim()) {
        openUrl(buildWhatsAppLink(contact.whatsapp, emergencyMessage));
      }
    });
  }}
>
  <Text style={styles.primaryActionTitle}>Alert All Guardians</Text>
  <Text style={styles.primaryActionText}>
    Send emergency message to {familyContacts.length} guardians
  </Text>
</TouchableOpacity>
```

Or use the automated service:

```typescript
import { useEmergencyGuardianOutreach } from '@/hooks/useEmergencyGuardianOutreach';

export default function SosAlertModal({ /* props */ }) {
  const { sendAlertsToAllGuardians, status, result } = useEmergencyGuardianOutreach();
  const { user } = useAuth();

  // Add button to send alerts
  <TouchableOpacity
    style={[styles.primaryActionCard]}
    disabled={status === 'sending'}
    onPress={async () => {
      if (user?.uid) {
        await sendAlertsToAllGuardians(alert, user.uid);
      }
    }}
  >
    <Text style={styles.primaryActionTitle}>
      {status === 'sending' ? 'Alerting Guardians...' : 'Alert All Guardians'}
    </Text>
    <Text style={styles.primaryActionText}>
      {result ? `Sent to ${result.total} guardians` : 'Automatic WhatsApp & SMS'}
    </Text>
  </TouchableOpacity>
}
```

---

## Integration #4: Emergency Settings Screen Enhancement

Add a "Test Emergency Alert" button to your Settings/Emergency tab:

```typescript
import { sendEmergencyAlertsToAllGuardians } from '@/services/emergencyOutreachService';
import { VehicleRealtimeAlert } from '@/services/vehicleRealtimeService';

export default function EmergencySettingsScreen() {
  const [guardians, setGuardians] = useState<EmergencyContact[]>([]);
  const { user } = useAuth();

  // Load guardians
  useEffect(() => {
    const loadGuardians = async () => {
      if (user?.uid) {
        const contacts = await getEmergencyContacts(user.uid);
        setGuardians(contacts || []);
      }
    };
    loadGuardians();
  }, [user?.uid]);

  // Test alert function
  const testEmergencyAlert = async () => {
    if (guardians.length === 0) {
      Alert.alert('No Contacts', 'Please add emergency contacts first');
      return;
    }

    // Create a test SOS alert object
    const testAlert: VehicleRealtimeAlert = {
      id: 'test-alert-' + Date.now(),
      device_id: 'TEST_DEVICE',
      device_name: 'Test Vehicle',
      type: 'SOS_EMERGENCY',
      message: 'TEST: Emergency alert system test',
      priority: 'critical',
      timestamp: Date.now(),
      gps_lat: 0,
      gps_lon: 0,
      hospital_name: 'Nearest Hospital',
      heart_rate_bpm: 85,
      spo2: 95,
    };

    Alert.alert(
      'Test Emergency Alert',
      `This will send test WhatsApp and SMS to ${guardians.length} contacts.\n\nContinue?`,
      [
        {
          text: 'Cancel',
          onPress: () => {},
          style: 'cancel',
        },
        {
          text: 'Send Test Alert',
          onPress: async () => {
            try {
              const result = await sendEmergencyAlertsToAllGuardians(guardians, testAlert);
              Alert.alert(
                'Success',
                `Test alert sent!\n\nWhatsApp: ${result.whatsapp}\nSMS: ${result.sms}\nTotal: ${result.total}`
              );
            } catch (error) {
              Alert.alert('Error', `Failed to send test alert: ${error}`);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Existing emergency settings... */}

      {/* Add Test Button */}
      <TouchableOpacity
        style={styles.testButton}
        onPress={testEmergencyAlert}
      >
        <Text style={styles.testButtonText}>Test Emergency Alert</Text>
      </TouchableOpacity>

      <Text style={styles.testButtonHint}>
        This sends a test message to all configured guardians. Verify contacts receive the message before relying on the system.
      </Text>
    </ScrollView>
  );
}
```

---

## Integration #5: Vehicle Real-Time Service Hook

If you want to automatically detect SOS and trigger alerts:

```typescript
// In a custom hook or useVehicleData.tsx

import { VehicleRealtimeAlert } from '@/services/vehicleRealtimeService';
import { useEmergencyGuardianOutreach } from '@/hooks/useEmergencyGuardianOutreach';

export function useAutoEmergencyAlert() {
  const { sendAlertsToAllGuardians, status } = useEmergencyGuardianOutreach();
  const { user } = useAuth();
  const prevAlertRef = useRef<string>();

  const handleNewSosAlert = useCallback(async (alert: VehicleRealtimeAlert) => {
    // Prevent duplicate alerts within 5 minutes
    const now = Date.now();
    const fiveMinutesAgo = now - 5 * 60 * 1000;

    if (
      alert.type === 'SOS_EMERGENCY' &&
      alert.id !== prevAlertRef.current &&
      (alert.timestamp ?? 0) > fiveMinutesAgo
    ) {
      prevAlertRef.current = alert.id;

      if (user?.uid) {
        // Auto-send to guardians without user interaction
        await sendAlertsToAllGuardians(alert, user.uid);
      }
    }
  }, [user?.uid, sendAlertsToAllGuardians]);

  return {
    handleNewSosAlert,
    outreachStatus: status,
  };
}

// Usage in VehicleDetailScreen or similar:
export function VehicleDetailScreen() {
  const { handleNewSosAlert } = useAutoEmergencyAlert();
  
  // When you receive a new real-time update
  useEffect(() => {
    if (latestAlert?.type === 'SOS_EMERGENCY') {
      handleNewSosAlert(latestAlert);
    }
  }, [latestAlert, handleNewSosAlert]);

  // ... rest of component
}
```

---

## Integration #6: Complete AlertsScreen Example

Full example of AlertsScreen with emergency integration:

```typescript
import React, { useEffect, useState } from 'react';
import { View, ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '@/context/ThemeContext';
import GlobalEmergencyAlertPanel from '@/components/GlobalEmergencyAlertPanel';
import SosAlertModal from '@/components/SosAlertModal';
import {
  EmergencyContact,
  getEmergencyContacts,
} from '@/services/emergencyConfigService';
import { 
  VehicleRealtimeAlert,
  subscribeToLatestSosAlert,
} from '@/services/vehicleRealtimeService';

export default function AlertsScreen() {
  const { user } = useAuth();
  const { colors } = useAppTheme();
  
  // Alert state
  const [alerts, setAlerts] = useState<VehicleRealtimeAlert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<VehicleRealtimeAlert | null>(null);
  const [showSosModal, setShowSosModal] = useState(false);
  
  // Emergency state
  const [guardians, setGuardians] = useState<EmergencyContact[]>([]);
  const [showGlobalAlert, setShowGlobalAlert] = useState(false);

  // Load guardians on mount
  useEffect(() => {
    const loadGuardians = async () => {
      if (!user?.uid) return;
      try {
        const contacts = await getEmergencyContacts(user.uid);
        setGuardians(contacts || []);
      } catch (error) {
        console.error('Error loading guardians:', error);
      }
    };
    
    loadGuardians();
  }, [user?.uid]);

  // Subscribe to SOS alerts
  useEffect(() => {
    if (!user?.uid) return;
    
    const unsubscribe = subscribeToLatestSosAlert(user.uid, (alert) => {
      if (alert) {
        setAlerts((prev) => [alert, ...prev.filter((a) => a.id !== alert.id)]);
        setSelectedAlert(alert);
      }
    });

    return unsubscribe;
  }, [user?.uid]);

  // Show global emergency alert when SOS is selected
  useEffect(() => {
    if (selectedAlert?.type === 'SOS_EMERGENCY') {
      setShowGlobalAlert(true);
      setShowSosModal(false); // Close old modal if open
    }
  }, [selectedAlert]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Alerts</Text>

      <ScrollView style={styles.alertList}>
        {alerts.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>No alerts yet</Text>
          </View>
        ) : (
          alerts.map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
              onPress={() => {
                setSelectedAlert(alert);
                if (alert.type === 'SOS_EMERGENCY') {
                  setShowGlobalAlert(true);
                } else {
                  setShowSosModal(true);
                }
              }}
            >
              <View style={styles.alertHeader}>
                <Text style={styles.alertTitle}>{alert.type}</Text>
                <Text style={[
                  styles.alertPriority,
                  alert.priority === 'critical' && styles.priorityCritical
                ]}>
                  {alert.priority?.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.alertMessage}>{alert.message}</Text>
              <Text style={styles.alertTime}>
                {new Date(alert.timestamp || 0).toLocaleString()}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Global Emergency Alert Panel */}
      <GlobalEmergencyAlertPanel
        visible={showGlobalAlert}
        alert={selectedAlert}
        guardians={guardians}
        onOutreachComplete={(result) => {
          console.log('Guardians alerted:', result);
        }}
        onClose={() => {
          setShowGlobalAlert(false);
          setSelectedAlert(null);
        }}
      />

      {/* Legacy SOS Modal (non-emergency alerts) */}
      <SosAlertModal
        visible={showSosModal && selectedAlert?.type !== 'SOS_EMERGENCY'}
        alert={selectedAlert}
        reading={null}
        onClose={() => {
          setShowSosModal(false);
          setSelectedAlert(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 16,
  },
  alertList: {
    flex: 1,
  },
  emptyState: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#999',
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  alertPriority: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: '#f0f0f0',
    color: '#666',
  },
  priorityCritical: {
    backgroundColor: '#FF5756',
    color: '#fff',
  },
  alertMessage: {
    fontSize: 12,
    color: '#333',
    marginBottom: 4,
  },
  alertTime: {
    fontSize: 11,
    color: '#999',
  },
});
```

---

## Step-by-Step Integration Checklist

- [ ] Create 4 new files in services, hooks, and components (see file structure)
- [ ] Import background services in App.tsx
- [ ] Initialize background handlers in useEffect
- [ ] Add imports to AlertsScreen.tsx
- [ ] Add guardians state and useEffect to load them
- [ ] Add GlobalEmergencyAlertPanel to your JSX
- [ ] Test with a real SOS alert
- [ ] Verify WhatsApp/SMS messages are received
- [ ] Test background notification handling
- [ ] Add test button to Emergency Settings (optional)
- [ ] Deploy to production

---

## Troubleshooting Integration

### Issue: GlobalEmergencyAlertPanel not showing
**Solution**: 
- Verify `showGlobalAlert` state is being set to true
- Check alert.type === 'SOS_EMERGENCY'
- Ensure `<GlobalEmergencyAlertPanel />` is in JSX

### Issue: Guardians not loading
**Solution**:
- Check user.uid is available
- Verify Firestore emergency contacts exist
- Check console for getEmergencyContacts errors

### Issue: Messages not sending
**Solution**:
- Verify WhatsApp is installed on test device
- Check phone numbers have + and country code
- Test with manual URL: `https://wa.me/1234567890`

### Issue: Background alerts not working
**Solution**:
- Call `initializeBackgroundNotificationHandler()` in App.tsx
- Call `registerEmergencyBackgroundTask()`
- Check notification permissions
- Verify Firebase is sending notifications
