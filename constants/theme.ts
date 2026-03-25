/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#0a7ea4';
const tintColorDark = '#60A5FA';

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    card: '#FFFFFF',
    elevated: '#FFFFFF',
    mutedSurface: '#F4F7FA',
    inputBackground: '#F8FBFD',
    tint: tintColorLight,
    icon: '#687076',
    mutedText: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
    border: '#E0E0E0',
    shadow: '#000000',
    overlay: 'rgba(15, 23, 42, 0.45)',
    secondaryButtonBackground: '#E9F6FA',
    secondaryButtonText: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    card: '#1D2125',
    elevated: '#242A30',
    mutedSurface: '#20262C',
    inputBackground: '#20262C',
    tint: tintColorDark,
    icon: '#9BA1A6',
    mutedText: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
    border: '#3A3A3A',
    shadow: '#000000',
    overlay: 'rgba(0, 0, 0, 0.7)',
    secondaryButtonBackground: '#203447',
    secondaryButtonText: '#9ED0FF',
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
