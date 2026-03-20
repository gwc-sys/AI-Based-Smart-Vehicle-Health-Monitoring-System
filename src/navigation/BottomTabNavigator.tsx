import AlertsScreen from '@/screens/AlertsScreen';
import DashboardScreen from '@/screens/DashboardScreen';
import PredictionScreen from '@/screens/PredictionScreen';
import ProfileScreen from '@/screens/ProfileScreen';
import SettingsScreen from '@/screens/SettingsScreen';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { Colors } from '../../constants/theme';

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
  const strokeWidth = 1.8;
  const iconSize = Math.max(size, 20);

  switch (routeName) {
    case 'Dashboard':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <Rect x="3.5" y="3.5" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
          <Rect x="13.5" y="3.5" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
          <Rect x="3.5" y="13.5" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
          <Rect x="13.5" y="13.5" width="7" height="7" rx="1.5" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    case 'Alerts':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 4.5a4.5 4.5 0 0 0-4.5 4.5v2.2c0 .7-.24 1.38-.67 1.93L5.8 14.36a1 1 0 0 0 .78 1.64h10.84a1 1 0 0 0 .78-1.64l-1.03-1.26a3.1 3.1 0 0 1-.67-1.93V9A4.5 4.5 0 0 0 12 4.5Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Path
            d="M10 18a2.3 2.3 0 0 0 4 0"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'Prediction':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <Path
            d="M4 18.5h16"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <Rect x="5" y="11" width="3" height="6" rx="1" fill={color} />
          <Rect x="10.5" y="8" width="3" height="9" rx="1" fill={color} />
          <Rect x="16" y="5" width="3" height="12" rx="1" fill={color} />
        </Svg>
      );
    case 'Settings':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <Path
            d="M12 8.8A3.2 3.2 0 1 0 12 15.2A3.2 3.2 0 1 0 12 8.8Z"
            stroke={color}
            strokeWidth={strokeWidth}
          />
          <Path
            d="M19.4 13.1v-2.2l-1.86-.45a5.94 5.94 0 0 0-.5-1.2l1-1.62-1.56-1.56-1.62 1a5.94 5.94 0 0 0-1.2-.5L13.1 4.6h-2.2l-.45 1.86a5.94 5.94 0 0 0-1.2.5l-1.62-1-1.56 1.56 1 1.62a5.94 5.94 0 0 0-.5 1.2L4.6 10.9v2.2l1.86.45c.1.42.27.82.5 1.2l-1 1.62 1.56 1.56 1.62-1c.38.23.78.4 1.2.5l.45 1.86h2.2l.45-1.86c.42-.1.82-.27 1.2-.5l1.62 1 1.56-1.56-1-1.62c.23-.38.4-.78.5-1.2l1.86-.45Z"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Svg>
      );
    case 'Profile':
      return (
        <Svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth={strokeWidth} />
          <Path
            d="M5.5 18.2c1.36-2.56 3.65-3.84 6.5-3.84s5.14 1.28 6.5 3.84"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
        </Svg>
      );
    default:
      return null;
  }
}

export default function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Dashboard"
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: Colors.light.tint,
        tabBarInactiveTintColor: Colors.light.icon,
        tabBarStyle: {
          height: 64,
          paddingTop: 6,
          paddingBottom: 8,
          borderTopColor: Colors.light.border,
          backgroundColor: '#fff',
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
