/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#16213E',
    background: '#FFF8F0',
    backgroundElement: '#FFFFFF',
    backgroundSelected: '#FFE7D4',
    textSecondary: '#6B7280',
    primary: '#2563EB',
    border: '#F3D7C8',
    shadowColor: '#F97316',
    success: '#16A34A',
    error: '#EF4444',
  },
  dark: {
    text: '#FFF8F0',
    background: '#111827',
    backgroundElement: '#1F2937',
    backgroundSelected: '#374151',
    textSecondary: '#D1D5DB',
    primary: '#38BDF8',
    border: '#374151',
    shadowColor: '#000000',
    success: '#22C55E',
    error: '#F87171',
  },
} as const;

export const Gradients = {
  light: {
    primary: ['#2563EB', '#F97316'] as [string, string],
    sunrise: ['#FFF7ED', '#DBEAFE'] as [string, string],
    campus: ['#2563EB', '#06B6D4', '#F97316'] as [string, string, string],
  },
  dark: {
    primary: ['#38BDF8', '#F97316'] as [string, string],
    sunrise: ['#111827', '#1E3A8A'] as [string, string],
    campus: ['#38BDF8', '#22C55E', '#F97316'] as [string, string, string],
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
