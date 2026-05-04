# SOS Emergency Alert & Guardian Notification System

This document explains the complete integration of automated emergency alerts and guardian notification system for the AI Vehicle Health Monitoring App.

## Overview

The system automatically triggers emergency alerts to all configured guardian contacts via WhatsApp and SMS when an SOS event is detected. The flow includes:

1. **SOS Event Detection** - Alert triggered in vehicle monitoring system
2. **Guardian Alert Generation** - Messages created with location and emergency info
3. **Multi-Channel Delivery** - WhatsApp and SMS to all guardians
4. **Background Monitoring** - Continuous monitoring and re-alerts if needed
5. **Logging** - Complete record of all outreach attempts

## Architecture

### Services

#### 1. `emergencyOutreachService.ts`
Handles sending WhatsApp and SMS alerts using Expo Linking.

**Key Functions:**
- `sendWhatsAppAlert()` - Send WhatsApp to single guardian via wa.me
- `sendSmsAlert()` - Send SMS to single guardian via sms:// URI
- `sendEmergencyAlertsToAllGuardians()` - Batch send to all guardians
- `buildEmergencyAlertMessage()` - Create formatted alert message
- `logEmergencyOutreach()` - Log outreach for record-keeping

**Example Usage:**
```typescript
const guardians = await getEmergencyContacts(userId);
const result = await sendEmergencyAlertsToAllGuardians(
  guardians,
  sosAlert,
  userLocation
);
// result = { whatsapp: 3, sms: 2, total: 5 }
```

#### 2. `backgroundNotificationService.ts`
Manages background notification handling and emergency monitoring.

**Key Functions:**
- `initializeBackgroundNotificationHandler()` - Setup notification listeners
- `handleBackgroundSosEmergency()` - Process emergency in background
- `registerEmergencyBackgroundTask()` - Register background fetch task
- `sendHighPriorityEmergencyNotification()` - Send urgent notifications

**Features:**
- Listens for SOS notifications even when app is closed
- Auto-triggers guardian outreach in background
- Sends high-priority system notifications
- Periodic monitoring of active emergencies (every 15 minutes)

#### 3. `useEmergencyGuardianOutreach.tsx` (Hook)
React hook for managing guardian outreach state and operations.

**State Management:**
- `guardians` - List of emergency contacts
- `status` - Current outreach status (idle, sending, completed, error)
- `result` - Result with counts of WhatsApp and SMS sent
- `error` - Error message if outreach failed

**Example Usage:**
```typescript
const {
  guardians,
  status,
  result,
  error,
  loadGuardians,
  sendAlertsToAllGuardians,
  reset,
} = useEmergencyGuardianOutreach();

// Send alerts
await sendAlertsToAllGuardians(alert, userId);
```

#### 4. `GlobalEmergencyAlertPanel.tsx` (Component)
UI component displaying emergency alert status and guardian list.

**Features:**
- Shows real-time outreach status
- Lists all guardians being alerted
- Displays alert details (heart rate, SpO₂, hospital info)
- Shows number of WhatsApp and SMS messages sent
- Auto-sends alerts when panel appears

## Integration Steps

### Step 1: Initialize Background Services (App.tsx)

```typescript
import { initializeBackgroundNotificationHandler, registerEmergencyBackgroundTask } from '@/services/backgroundNotificationService';

export default function App() {
  useEffect(() => {
    // Initialize background notification handler
    const subscriptions = initializeBackgroundNotificationHandler();
    
    // Register background monitoring task
    registerEmergencyBackgroundTask();

    return () => {
      subscriptions.received.remove();
      subscriptions.response.remove();
    };
  }, []);

  // ... rest of app
}
```

### Step 2: Integrate GlobalEmergencyAlertPanel (AlertsScreen.tsx)

```typescript
import GlobalEmergencyAlertPanel from '@/components/GlobalEmergencyAlertPanel';
import { getEmergencyContacts } from '@/services/emergencyConfigService';

export default function AlertsScreen() {
  const [sosAlert, setSosAlert] = useState<VehicleRealtimeAlert | null>(null);
  const [guardians, setGuardians] = useState<EmergencyContact[]>([]);
  const [showGlobalAlert, setShowGlobalAlert] = useState(false);

  // Load guardians when screen mounts
  useEffect(() => {
    const loadGuardians = async () => {
      const contacts = await getEmergencyContacts(userId);
      setGuardians(contacts || []);
    };
    loadGuardians();
  }, []);

  // Show alert when SOS detected
  useEffect(() => {
    if (sosAlert) {
      setShowGlobalAlert(true);
    }
  }, [sosAlert]);

  return (
    <View>
      {/* Rest of screen */}
      
      <GlobalEmergencyAlertPanel
        visible={showGlobalAlert}
        alert={sosAlert}
        guardians={guardians}
        onOutreachComplete={(result) => {
          console.log('Guardians alerted:', result);
        }}
        onClose={() => setShowGlobalAlert(false)}
      />
    </View>
  );
}
```

### Step 3: Configure Emergency Contacts

Edit the Emergency Configuration in your app's Settings screen to add guardian contacts with:
- Name (required)
- Phone number (for SMS)
- WhatsApp number (for WhatsApp messages)
- Relationship (optional)

## How It Works

### When SOS is Triggered:

1. **App Detects SOS**
   ```
   SOS Alert → Firebase realtime database
   ```

2. **Background Handler Activated**
   ```
   Notification received → handleBackgroundSosEmergency()
   ```

3. **Guardian Alert Sent**
   ```
   Get guardians → Get location → Build message → 
   Send WhatsApp → Send SMS → Log outreach
   ```

4. **Multi-Channel Message**
   ```
   "🚨 EMERGENCY ALERT: [Person Name] needs help!
    Alert: [Alert message]
    📍 Location: [Maps link]
    🏥 Nearest Hospital: [Hospital name]
    Please respond immediately."
   ```

5. **UI Confirmation**
   ```
   GlobalEmergencyAlertPanel shows:
   ✓ Sent to 5 guardians
   ✓ WhatsApp: 3 messages
   ✓ SMS: 2 messages
   ```

### Background Execution:

Even when app is closed or in background:
- Notifications are received by Android/iOS notification service
- `backgroundNotificationService` processes them
- Guardians are alerted via WhatsApp/SMS
- High-priority notification sent to user
- Activity logged for audit trail

## Configuration Requirements

### package.json Dependencies

```json
{
  "expo-linking": "^6.0.0",
  "expo-location": "^17.0.0",
  "expo-notifications": "^0.27.0",
  "expo-background-fetch": "^12.0.0",
  "expo-task-manager": "^11.0.0"
}
```

### Permissions (app.json)

```json
{
  "plugins": [
    [
      "expo-background-fetch",
      {
        "isIosBackgroundModeEnabled": true
      }
    ],
    [
      "expo-task-manager",
      {}
    ]
  ],
  "permissions": [
    "android.permission.ACCESS_FINE_LOCATION",
    "android.permission.ACCESS_COARSE_LOCATION"
  ]
}
```

### Firebase Configuration

Ensure your Firebase console has:
- **Realtime Database** rules allowing SOS alert writes
- **Cloud Functions** trigger for sending high-priority notifications
- **Firestore** indexes for guardian queries (optional)

Example Firestore Guardian Collection Query:
```
/users/{userId}/emergencyContacts/
  - name: "Mom"
  - phone: "+1234567890"
  - whatsapp: "+1234567890"
  - relationship: "Mother"
```

## Testing

### Test Case 1: Single Guardian Alert

```typescript
// Test WhatsApp send
const contact: EmergencyContact = {
  id: "1",
  name: "John",
  phone: "+1234567890",
  whatsapp: "+1234567890",
  relationship: "Brother",
};

const result = await sendWhatsAppAlert(contact, sosAlert, userLocation);
console.log('WhatsApp sent:', result); // true/false
```

### Test Case 2: Batch Guardian Alerts

```typescript
// Test sending to all guardians
const guardians: EmergencyContact[] = [
  { name: "Mom", phone: "+1111111111", whatsapp: "+1111111111" },
  { name: "Dad", phone: "+2222222222" },
  { name: "Sister", whatsapp: "+3333333333" },
];

const result = await sendEmergencyAlertsToAllGuardians(guardians, sosAlert, userLocation);
// Output: { whatsapp: 2, sms: 1, total: 3 }
```

### Test Case 3: Background Handler

```typescript
// Simulate background notification
await handleBackgroundSosEmergency({
  type: 'SOS_EMERGENCY',
  deviceId: 'device-123',
  userId: 'user-456',
});
```

## Troubleshooting

### WhatsApp Not Opening
- Verify WhatsApp is installed: `Linking.canOpenURL('whatsapp://...')`
- Check phone number format (must be valid international format)
- Test with manual URL: `https://wa.me/1234567890`

### SMS Not Sending
- Verify native SMS app is available
- Check SMS permissions on device
- Test with manual URI: `sms:+1234567890?body=...`

### Location Not Available
- Check location permissions
- Ensure GPS is enabled
- Falls back to last known location if GPS fails

### No Notifications in Background
- Check "Do Not Disturb" mode
- Verify notification permissions granted
- Check Firebase notification configuration
- Test with high-priority notification

## Best Practices

1. **Always Get Location** - Provides critical context for first responders
2. **Test Contacts** - Verify all guardian numbers before SOS event
3. **Keep Messages Short** - SMS has character limits
4. **Log All Attempts** - Track success/failure for audit trail
5. **Handle Grace Period** - Prevent duplicate alerts within 5 minutes
6. **Fallback to SMS** - If WhatsApp fails, ensure SMS backup
7. **Respect User Preferences** - Allow disabling specific channels
8. **Monitor Battery** - Background tasks consume power

## Future Enhancements

1. **Email Notifications** - Add email to guardians
2. **Social Media Alerts** - Post to family social circles
3. **Emergency Services API** - Direct integration with 911
4. **Voice Calls** - Automated voice alerts to guardians
5. **Push Notifications** - Mobile app notifications to guardian apps
6. **Analytics Dashboard** - Track response times and outcomes
7. **AI Response Routing** - Smart routing based on availability
8. **Encrypted Messages** - End-to-end encryption for sensitive data

## Support & Debugging

### Enable Debug Logging

```typescript
// In src/services/backgroundNotificationService.ts
const DEBUG = true;

if (DEBUG) {
  console.log('[Emergency Outreach]', { ... });
}
```

### Firebase Logs

Check Firebase Console → Cloud Functions → Logs for:
- Notification delivery failures
- Guardian query errors
- Message sending errors

### Device Logs

Android:
```bash
adb logcat | grep "Emergency"
```

iOS:
```bash
Xcode Console → Filter "Emergency"
```

## Contact & Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Firebase Cloud Functions logs
3. Test with isolated components
4. Check device notification settings
5. Enable verbose logging for debugging
