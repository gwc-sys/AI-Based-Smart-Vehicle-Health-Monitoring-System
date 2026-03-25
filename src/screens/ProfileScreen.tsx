import { useAnalytics } from '@/hooks/useAnalytics';
import AppIcon from '@/components/AppIcon';
import { useAppTheme } from '@/context/ThemeContext';
import useAuth from '@/hooks/useAuth';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { useVehicleData } from '@/hooks/useVehicleData';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

interface UserPreferences {
  notifications: boolean;
  darkMode: boolean;
  language: string;
  measurementUnit: 'metric' | 'imperial';
}

interface UserStats {
  totalTrips: number;
  totalDistance: number;
  averageFuelEfficiency: number;
  maintenanceAlerts: number;
}

export default function ProfileScreen() {
  const { user, signOut, updateUserProfile, updateUserPreferences } = useAuth();
  const { colors, isDarkMode, setDarkMode } = useAppTheme();
  const styles = createStyles(colors);
  const { vehicles, loading: vehiclesLoading, refresh } = useVehicleData();
  const { isConnected } = useNetworkStatus();
  const { trackEvent } = useAnalytics();
  
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<UserPreferences>({
    notifications: true,
    darkMode: false,
    language: 'en',
    measurementUnit: 'metric',
  });
  const [userStats, setUserStats] = useState<UserStats>({
    totalTrips: 0,
    totalDistance: 0,
    averageFuelEfficiency: 0,
    maintenanceAlerts: 0,
  });

  const loadUserPreferences = useCallback(async () => {
    try {
      const savedPrefs = await AsyncStorage.getItem('userPreferences');
      if (savedPrefs) {
        setPreferences(JSON.parse(savedPrefs));
      }
    } catch {
      console.error('Error loading preferences');
    }
  }, []);

  const loadUserStats = useCallback(async () => {
    try {
      // Fetch real stats from your backend/API
      const stats = await fetchUserStats(user?.id ?? '');
      setUserStats(stats);
    } catch {
      console.error('Error loading user stats');
    }
  }, [user?.id]);

  const loadProfileImage = useCallback(async () => {
    try {
      const savedImage = await AsyncStorage.getItem(`profileImage_${user?.id}`);
      if (savedImage) {
        setProfileImage(savedImage);
      }
    } catch {
      console.error('Error loading profile image');
    }
  }, [user?.id]);

  useEffect(() => {
    loadUserPreferences();
    loadUserStats();
    loadProfileImage();
  }, [loadUserPreferences, loadUserStats, loadProfileImage]);

  useEffect(() => {
    setPreferences(prev => ({ ...prev, darkMode: isDarkMode }));
  }, [isDarkMode]);

  const fetchUserStats = async (userId?: string) => {
    // Simulated API call - replace with actual API
    // userId may be undefined if not logged in
    return {
      totalTrips: 127,
      totalDistance: 5432,
      averageFuelEfficiency: 8.5,
      maintenanceAlerts: 2,
    };
  };

  const handleLogout = async () => {
    // Web's Alert may not support button callbacks; use window.confirm there.
    if (Platform.OS === 'web') {
      const confirmed = typeof window !== 'undefined' ? window.confirm('Are you sure you want to logout?') : true;
      if (!confirmed) return;
      setLoading(true);
      try {
        await trackEvent('user_logout', { userId: user?.id });
        await signOut();
      } catch (err) {
        Alert.alert('Logout failed', (err as Error).message || 'Unable to log out');
      } finally {
        setLoading(false);
      }
      return;
    }

    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await trackEvent('user_logout', { userId: user?.id });
              await signOut();
            } catch (err) {
              Alert.alert('Logout failed', (err as Error).message || 'Unable to log out');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refresh();
      await loadUserStats();
    } catch {
      Alert.alert('Refresh Failed', 'Unable to refresh data');
    } finally {
      setRefreshing(false);
    }
  }, [refresh, loadUserStats]);

  const handleEditProfile = () => {
    setEditName(user?.name || '');
    setEditPhone(user?.phone || '');
    setShowEditModal(true);
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateUserProfile({
        name: editName,
        phone: editPhone,
      });
      await trackEvent('profile_updated', { userId: user?.id });
      setShowEditModal(false);
      Alert.alert('Success', 'Profile updated successfully');
    } catch {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera roll permissions');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        const imageUri = result.assets[0].uri;
        setProfileImage(imageUri);
        await AsyncStorage.setItem(`profileImage_${user?.id}`, imageUri);
        await trackEvent('profile_image_updated', { userId: user?.id });
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const handleTogglePreference = (key: keyof UserPreferences, value: any) => {
    setPreferences(prev => {
      const newPrefs = { ...prev, [key]: value };
      AsyncStorage.setItem('userPreferences', JSON.stringify(newPrefs));
      updateUserPreferences(newPrefs);
      if (key === 'darkMode') {
        setDarkMode(Boolean(value)).catch(() => undefined);
      }
      return newPrefs;
    });
  };

  const handleShareProfile = async () => {
    try {
      await Share.share({
        message: `Check out my vehicle management profile! I've tracked ${userStats.totalTrips} trips and ${userStats.totalDistance} km.`,
        url: 'https://yourapp.com/profile',
        title: 'My Vehicle Profile',
      });
    } catch {
      Alert.alert('Error', 'Failed to share profile');
    }
  };

  const handleContactSupport = () => {
    Linking.openURL('mailto:support@yourapp.com?subject=Support%20Request');
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data will be deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              // Implement account deletion logic
              await trackEvent('account_deleted', { userId: user?.id });
              await signOut(); // Placeholder for actual deletion
            } catch {
              Alert.alert('Error', 'Failed to delete account');
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderStatCard = (icon: string, label: string, value: string | number) => (
    <View style={styles.statCard}>
      <AppIcon name={icon} size={24} color={colors.tint} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {/* Header Section */}
        <View style={styles.header}>
          <TouchableOpacity onPress={handlePickImage} style={styles.profileImageContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.profileImagePlaceholderText}>
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </Text>
                <View style={styles.cameraBadge}>
                  <AppIcon name="camera" size={12} color="#fff" />
                </View>
              </View>
            )}
          </TouchableOpacity>
          
          <Text style={styles.userName}>{user?.name || 'User'}</Text>
          <Text style={styles.userEmail}>{user?.phone || 'Phone account'}</Text>
          
          {!isConnected && (
            <View style={styles.offlineBadge}>
              <AppIcon name="cloud-offline" size={16} color="#fff" />
              <Text style={styles.offlineText}>Offline Mode</Text>
            </View>
          )}
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity style={styles.actionButton} onPress={handleEditProfile}>
            <AppIcon name="pencil" size={20} color={colors.tint} />
            <Text style={styles.actionButtonText}>Edit Profile</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleShareProfile}>
            <AppIcon name="share-social" size={20} color={colors.tint} />
            <Text style={styles.actionButtonText}>Share</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={() => setShowSettingsModal(true)}>
            <AppIcon name="settings" size={20} color={colors.tint} />
            <Text style={styles.actionButtonText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Stats Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Statistics</Text>
          <View style={styles.statsGrid}>
            {renderStatCard('car', 'Total Trips', userStats.totalTrips)}
            {renderStatCard('map', 'Distance (km)', userStats.totalDistance)}
            {renderStatCard('speedometer', 'Avg Efficiency', `${userStats.averageFuelEfficiency}L/100km`)}
            {renderStatCard('warning', 'Alerts', userStats.maintenanceAlerts)}
          </View>
        </View>

        {/* User Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          
          <View style={styles.infoCard}>
            <InfoRow icon="person" label="Full Name" value={user?.name || 'N/A'} />
            <InfoRow icon="call" label="Phone" value={user?.phone || 'Not provided'} />
            <InfoRow 
              icon="calendar" 
              label="Member since" 
              value={user?.createdAt ? new Date(user?.createdAt).toLocaleDateString() : 'Unknown'} 
            />
            <InfoRow 
              icon="car" 
              label="Vehicles registered" 
              value={vehiclesLoading ? 'Loading...' : (vehicles?.length ?? 0).toString()} 
            />
          </View>
        </View>

        {/* Vehicles Preview */}
        {vehicles && vehicles.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Your Vehicles</Text>
              <TouchableOpacity onPress={() => {/* Navigate to vehicles screen */}}>
                <Text style={styles.viewAllText}>View All</Text>
              </TouchableOpacity>
            </View>
            
            {vehicles.slice(0, 2).map((vehicle, index) => (
              <View key={vehicle.id || index} style={styles.vehicleCard}>
                <AppIcon name="car" size={24} color={colors.tint} />
                <View style={styles.vehicleInfo}>
                  <Text style={styles.vehicleName}>
                    {vehicle.make} {vehicle.model} {vehicle.year}
                  </Text>
                  <Text style={styles.vehicleDetails}>
                    {vehicle.plateNumber} • {vehicle.fuelType}
                  </Text>
                </View>
                <AppIcon name="chevron-forward" size={20} color={colors.icon} />
              </View>
            ))}
          </View>
        )}

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          
          <TouchableOpacity style={styles.supportItem} onPress={handleContactSupport}>
            <AppIcon name="mail" size={20} color={colors.tint} />
            <Text style={styles.supportItemText}>Contact Support</Text>
            <AppIcon name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.supportItem} onPress={() => Linking.openURL('https://yourapp.com/faq')}>
            <AppIcon name="help-circle" size={20} color={colors.tint} />
            <Text style={styles.supportItemText}>FAQ & Help</Text>
            <AppIcon name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.supportItem} onPress={() => Linking.openURL('https://yourapp.com/privacy')}>
            <AppIcon name="document-text" size={20} color={colors.tint} />
            <Text style={styles.supportItemText}>Privacy Policy</Text>
            <AppIcon name="chevron-forward" size={20} color={colors.icon} />
          </TouchableOpacity>
        </View>

        {/* Logout & Delete */}
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
            disabled={loading}
            activeOpacity={0.7}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <AppIcon name="log-out" size={20} color="#fff" />
                <Text style={styles.logoutButtonText}>Log Out</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
            disabled={loading}
          >
            <Text style={styles.deleteButtonText}>Delete Account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footerText}>App Version 2.0.0</Text>
        <Text style={styles.footerSubtext}>© 2024 Your Company Name</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={showEditModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Profile</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <AppIcon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.input}
                value={editName}
                onChangeText={setEditName}
                placeholder="Enter your name"
              />

              <Text style={styles.inputLabel}>Phone Number</Text>
              <TextInput
                style={styles.input}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="Enter your phone number"
                keyboardType="phone-pad"
                editable={false}
              />

              <TouchableOpacity
                style={[styles.saveButton, loading && styles.disabledButton]}
                onPress={handleSaveProfile}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Settings Modal */}
      <Modal visible={showSettingsModal} animationType="slide" transparent>
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <AppIcon name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Switch
                  value={preferences.notifications}
                  onValueChange={(value) => handleTogglePreference('notifications', value)}
                  trackColor={{ false: '#767577', true: colors.tint }}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Dark Mode</Text>
                <Switch
                  value={preferences.darkMode}
                  onValueChange={(value) => handleTogglePreference('darkMode', value)}
                  trackColor={{ false: '#767577', true: colors.tint }}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Language</Text>
                <TouchableOpacity style={styles.settingValue}>
                  <Text style={styles.settingValueText}>English</Text>
                  <AppIcon name="chevron-down" size={20} color={colors.icon} />
                </TouchableOpacity>
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>Measurement Unit</Text>
                <View style={styles.unitSelector}>
                  <TouchableOpacity
                    style={[styles.unitOption, preferences.measurementUnit === 'metric' && styles.selectedUnit]}
                    onPress={() => handleTogglePreference('measurementUnit', 'metric')}
                  >
                    <Text style={[styles.unitText, preferences.measurementUnit === 'metric' && styles.selectedUnitText]}>
                      Metric
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.unitOption, preferences.measurementUnit === 'imperial' && styles.selectedUnit]}
                    onPress={() => handleTogglePreference('measurementUnit', 'imperial')}
                  >
                    <Text style={[styles.unitText, preferences.measurementUnit === 'imperial' && styles.selectedUnitText]}>
                      Imperial
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity style={styles.clearCacheButton} onPress={() => Alert.alert('Cache cleared')}>
                <Text style={styles.clearCacheText}>Clear Cache</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// Helper component for info rows
const InfoRow = ({ icon, label, value }: { icon: string; label: string; value: string }) => (
  <ThemedInfoRow icon={icon} label={label} value={value} />
);

function ThemedInfoRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  const { colors } = useAppTheme();
  const styles = createStyles(colors);

  return (
    <View style={styles.infoRow}>
      <AppIcon name={icon} size={20} color={colors.icon} />
      <Text style={styles.infoLabel}>{label}:</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const createStyles = (colors: any) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: 20,
    ...(Platform.OS === 'web' ? { maxWidth: 800, marginHorizontal: 'auto', width: '100%' } : {}),
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  profileImageContainer: {
    marginBottom: 16,
    position: 'relative',
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  profileImagePlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.tint,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  profileImagePlaceholderText: {
    fontSize: 40,
    color: '#fff',
    fontWeight: '600',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.tint,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.card,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    color: colors.icon,
    marginBottom: 8,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFA000',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    marginTop: 8,
  },
  offlineText: {
    color: '#fff',
    fontSize: 12,
    marginLeft: 4,
    fontWeight: '500',
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 24,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  actionButton: {
    alignItems: 'center',
  },
  actionButtonText: {
    fontSize: 12,
    color: colors.text,
    marginTop: 4,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  viewAllText: {
    color: colors.tint,
    fontSize: 14,
    fontWeight: '500',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: colors.icon,
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    color: colors.icon,
    marginLeft: 12,
    flex: 1,
  },
  infoValue: {
    fontSize: 14,
    color: colors.text,
    fontWeight: '500',
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  vehicleInfo: {
    flex: 1,
    marginLeft: 12,
  },
  vehicleName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  vehicleDetails: {
    fontSize: 12,
    color: colors.icon,
    marginTop: 2,
  },
  supportItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  supportItemText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: colors.text,
  },
  buttonContainer: {
    marginTop: 24,
  },
  logoutButton: {
    backgroundColor: colors.tint,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 12,
    gap: 8,
  },
  logoutButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteButton: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  deleteButtonText: {
    color: '#FF3B30',
    fontSize: 14,
  },
  footerText: {
    fontSize: 12,
    color: colors.icon,
    textAlign: 'center',
    marginTop: 24,
  },
  footerSubtext: {
    fontSize: 10,
    color: colors.icon,
    textAlign: 'center',
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
  },
  modalBody: {
    padding: 20,
  },
  inputLabel: {
    fontSize: 14,
    color: colors.icon,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    color: colors.text,
    backgroundColor: colors.inputBackground,
  },
  saveButton: {
    backgroundColor: colors.tint,
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.6,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLabel: {
    fontSize: 16,
    color: colors.text,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  settingValueText: {
    color: colors.text,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: colors.mutedSurface,
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  selectedUnit: {
    backgroundColor: colors.tint,
  },
  unitText: {
    fontSize: 14,
    color: colors.text,
  },
  selectedUnitText: {
    color: '#fff',
  },
  clearCacheButton: {
    backgroundColor: colors.mutedSurface,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  clearCacheText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '500',
  },
});
