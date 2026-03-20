import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

type AppIconProps = {
  name: string;
  size?: number;
  color?: string;
};

export default function AppIcon({ name, size = 24, color = '#000' }: AppIconProps) {
  const strokeWidth = Math.max(1.5, size / 14);

  switch (name) {
    case 'checkmark-done-outline':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="m4.5 12.5 3.2 3.2 4.3-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="m10.2 14.7 2.1 2.1 7.2-9.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'trash':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M4.5 7.5h15" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M9 4.5h6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M7.5 7.5 8.4 18a2 2 0 0 0 2 1.8h3.2a2 2 0 0 0 2-1.8l.9-10.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M10 10.5v5.5M14 10.5v5.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case 'camera':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="7" width="16" height="11" rx="2" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M9 7 10.5 5.5h3L15 7" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="12.5" r="3" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    case 'cloud-offline':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M7.5 17.5h8a3.5 3.5 0 0 0 .7-6.93A5 5 0 0 0 7 9.5a3.5 3.5 0 0 0 .5 8Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M5 5 19 19" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case 'pencil':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="m5 16.8-.5 3.7 3.7-.5L18.5 9.7a1.8 1.8 0 0 0 0-2.5l-1.7-1.7a1.8 1.8 0 0 0-2.5 0L5 16.8Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Path d="m13.5 6.5 4 4" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case 'share-social':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="18" cy="5.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx="6" cy="12" r="2.5" stroke={color} strokeWidth={strokeWidth} />
          <Circle cx="18" cy="18.5" r="2.5" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M8.3 11 15.7 6.5M8.3 13 15.7 17.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case 'settings':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="3.2" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M19.4 13.1v-2.2l-1.86-.45a5.94 5.94 0 0 0-.5-1.2l1-1.62-1.56-1.56-1.62 1a5.94 5.94 0 0 0-1.2-.5L13.1 4.6h-2.2l-.45 1.86a5.94 5.94 0 0 0-1.2.5l-1.62-1-1.56 1.56 1 1.62a5.94 5.94 0 0 0-.5 1.2L4.6 10.9v2.2l1.86.45c.1.42.27.82.5 1.2l-1 1.62 1.56 1.56 1.62-1c.38.23.78.4 1.2.5l.45 1.86h2.2l.45-1.86c.42-.1.82-.27 1.2-.5l1.62 1 1.56-1.56-1-1.62c.23-.38.4-.78.5-1.2l1.86-.45Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'car':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6.5 15.5h11l-1-4.2a2 2 0 0 0-2-1.5H9.5a2 2 0 0 0-2 1.5l-1 4.2Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M5.5 15.5h13a1.5 1.5 0 0 1 1.5 1.5V18a1 1 0 0 1-1 1h-1.5v-1.5h-11V19H5a1 1 0 0 1-1-1v-1a1.5 1.5 0 0 1 1.5-1.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Circle cx="7.5" cy="15.5" r="1" fill={color} />
          <Circle cx="16.5" cy="15.5" r="1" fill={color} />
        </Svg>
      );
    case 'chevron-forward':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="m9 6 6 6-6 6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'mail':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="6" width="16" height="12" rx="2" stroke={color} strokeWidth={strokeWidth} />
          <Path d="m5.5 8 6.5 5 6.5-5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'help-circle':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="12" r="8" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M9.7 9.4a2.5 2.5 0 1 1 4.25 1.8c-.7.7-1.45 1.16-1.45 2.3" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="12" cy="16.7" r="1" fill={color} />
        </Svg>
      );
    case 'document-text':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M8 4.5h6l4 4V18a1.5 1.5 0 0 1-1.5 1.5h-8A1.5 1.5 0 0 1 7 18V6A1.5 1.5 0 0 1 8.5 4.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M14 4.8V9h4.2M9.5 12h5M9.5 15h5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'log-out':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M10 5.5H7.5A1.5 1.5 0 0 0 6 7v10a1.5 1.5 0 0 0 1.5 1.5H10" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="M13 8.5 17 12l-4 3.5M17 12H9" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'close':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M6 6 18 18M18 6 6 18" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case 'chevron-down':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="m6 9 6 6 6-6" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'person':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="3.2" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M5.5 18.2c1.36-2.56 3.65-3.84 6.5-3.84s5.14 1.28 6.5 3.84" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case 'call':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M7.8 5.5h2l1.1 3.1-1.4 1.1a13.2 13.2 0 0 0 4.8 4.8l1.1-1.4 3.1 1.1v2a1.5 1.5 0 0 1-1.7 1.5A14.8 14.8 0 0 1 6.3 7.2 1.5 1.5 0 0 1 7.8 5.5Z" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      );
    case 'calendar':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="6" width="16" height="14" rx="2" stroke={color} strokeWidth={strokeWidth} />
          <Path d="M8 4.5V8M16 4.5V8M4 10h16" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
        </Svg>
      );
    case 'map':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="m4.5 7 5-2 5 2 5-2v12l-5 2-5-2-5 2V7Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M9.5 5v12M14.5 7v12" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
    case 'speedometer':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M5.5 16a6.5 6.5 0 1 1 13 0" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Path d="m12 12 4-2" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="12" cy="12" r="1.2" fill={color} />
        </Svg>
      );
    case 'warning':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M12 5 4.8 18a1 1 0 0 0 .88 1.5h12.64A1 1 0 0 0 19.2 18L12 5Z" stroke={color} strokeWidth={strokeWidth} strokeLinejoin="round" />
          <Path d="M12 9.5v4.5" stroke={color} strokeWidth={strokeWidth} strokeLinecap="round" />
          <Circle cx="12" cy="16.7" r="1" fill={color} />
        </Svg>
      );
    case 'logo-google':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M20 12.2c0-.6-.06-1.05-.18-1.55H12v3.03h4.5c-.09.75-.57 1.88-1.64 2.64l-.02.1 2.54 1.97.18.02c1.65-1.52 2.6-3.76 2.6-6.21Z" fill="#4285F4" />
          <Path d="M12 20.3c2.25 0 4.14-.74 5.52-2.01l-2.7-2.09c-.72.5-1.68.85-2.82.85-2.2 0-4.07-1.45-4.74-3.46l-.1.01-2.64 2.05-.03.1A8.34 8.34 0 0 0 12 20.3Z" fill="#34A853" />
          <Path d="M7.26 13.6A5.01 5.01 0 0 1 7 12c0-.56.1-1.1.25-1.6l-.01-.11-2.67-2.08-.09.04A8.3 8.3 0 0 0 3.7 12c0 1.34.32 2.6.88 3.75l2.68-2.15Z" fill="#FBBC05" />
          <Path d="M12 6.95c1.44 0 2.42.62 2.98 1.14l2.17-2.11C16.13 5.04 14.25 4.3 12 4.3a8.34 8.34 0 0 0-7.51 4.7l2.77 2.15c.68-2.01 2.55-3.46 4.74-3.46Z" fill="#EA4335" />
        </Svg>
      );
    case 'logo-apple':
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Path d="M15.2 7.2c.72-.87 1.2-2.08 1.07-3.3-1.04.08-2.28.7-3 1.56-.66.77-1.24 2-1.08 3.16 1.16.09 2.35-.59 3.01-1.42Z" fill={color} />
          <Path d="M18.3 12.8c.03-2.17 1.77-3.2 1.85-3.25-1.01-1.47-2.59-1.67-3.14-1.69-1.34-.14-2.61.78-3.29.78-.68 0-1.73-.76-2.84-.74-1.46.02-2.81.85-3.56 2.16-1.52 2.64-.39 6.54 1.09 8.67.72 1.04 1.58 2.2 2.72 2.16 1.09-.04 1.5-.7 2.82-.7 1.32 0 1.69.7 2.84.68 1.18-.02 1.92-1.06 2.64-2.1.82-1.2 1.16-2.36 1.18-2.42-.03-.01-2.27-.87-2.31-3.55Z" fill={color} />
        </Svg>
      );
    default:
      return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <Rect x="4" y="4" width="16" height="16" rx="2" stroke={color} strokeWidth={strokeWidth} />
        </Svg>
      );
  }
}
