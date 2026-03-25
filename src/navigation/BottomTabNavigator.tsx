import AlertsScreen from '@/screens/AlertsScreen';
import AppIcon from '@/components/AppIcon';
import DashboardScreen from '@/screens/DashboardScreen';
import PredictionScreen from '@/screens/PredictionScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { useAppTheme } from '@/context/ThemeContext';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';

export type MainTabParamList = {
  Dashboard: undefined;
  Alerts: undefined;
  Prediction: undefined;
  Settings: undefined;
  Profile: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconProps = {
  routeName: keyof MainTabParamList;
  color: string;
  size: number;
};

function TabIcon({ routeName, color, size }: TabIconProps) {
  return <AppIcon name={routeName} size={Math.max(size, 20)} color={color} />;
}

export default function BottomTabNavigator() {
  const { colors } = useAppTheme();

  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.icon,
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopColor: colors.border,
          backgroundColor: colors.card,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        tabBarIcon: ({ color, size }) => (
          <TabIcon routeName={route.name as keyof MainTabParamList} size={size} color={color} />
        ),
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Alerts" component={AlertsScreen} />
      <Tab.Screen name="Prediction" component={PredictionScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}
