import React from 'react';
import {
  Apple,
  Bell,
  CalendarDays,
  Camera,
  Car,
  ChartColumn,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  CircleHelp,
  CloudOff,
  FileText,
  Gauge,
  LayoutGrid,
  LogOut,
  Mail,
  Map,
  Pencil,
  Phone,
  Settings,
  Share2,
  Trash2,
  TriangleAlert,
  User,
  X,
  type LucideIcon,
} from 'lucide-react-native';
import Svg, { Path } from 'react-native-svg';

type AppIconProps = {
  name: string;
  size?: number;
  color?: string;
};

const GoogleIcon = ({ size = 24 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path d="M20 12.2c0-.6-.06-1.05-.18-1.55H12v3.03h4.5c-.09.75-.57 1.88-1.64 2.64l-.02.1 2.54 1.97.18.02c1.65-1.52 2.6-3.76 2.6-6.21Z" fill="#4285F4" />
    <Path d="M12 20.3c2.25 0 4.14-.74 5.52-2.01l-2.7-2.09c-.72.5-1.68.85-2.82.85-2.2 0-4.07-1.45-4.74-3.46l-.1.01-2.64 2.05-.03.1A8.34 8.34 0 0 0 12 20.3Z" fill="#34A853" />
    <Path d="M7.26 13.6A5.01 5.01 0 0 1 7 12c0-.56.1-1.1.25-1.6l-.01-.11-2.67-2.08-.09.04A8.3 8.3 0 0 0 3.7 12c0 1.34.32 2.6.88 3.75l2.68-2.15Z" fill="#FBBC05" />
    <Path d="M12 6.95c1.44 0 2.42.62 2.98 1.14l2.17-2.11C16.13 5.04 14.25 4.3 12 4.3a8.34 8.34 0 0 0-7.51 4.7l2.77 2.15c.68-2.01 2.55-3.46 4.74-3.46Z" fill="#EA4335" />
  </Svg>
);

const ICON_MAP: Record<string, LucideIcon> = {
  'checkmark-done-outline': CheckCheck,
  trash: Trash2,
  camera: Camera,
  'cloud-offline': CloudOff,
  pencil: Pencil,
  'share-social': Share2,
  settings: Settings,
  car: Car,
  'chevron-forward': ChevronRight,
  mail: Mail,
  'help-circle': CircleHelp,
  'document-text': FileText,
  'log-out': LogOut,
  close: X,
  'chevron-down': ChevronDown,
  person: User,
  call: Phone,
  calendar: CalendarDays,
  map: Map,
  speedometer: Gauge,
  warning: TriangleAlert,
  Dashboard: LayoutGrid,
  Alerts: Bell,
  Prediction: ChartColumn,
  Settings: Settings,
  Profile: User,
};

export default function AppIcon({ name, size = 24, color = '#000' }: AppIconProps) {
  if (name === 'logo-google') {
    return <GoogleIcon size={size} />;
  }

  if (name === 'logo-apple') {
    return <Apple size={size} color={color} strokeWidth={1.8} />;
  }

  const IconComponent = ICON_MAP[name];

  if (!IconComponent) {
    return <LayoutGrid size={size} color={color} strokeWidth={1.8} />;
  }

  return <IconComponent size={size} color={color} strokeWidth={1.8} />;
}
