import React from 'react';
import { ThemeColor } from '../types';

export interface ThemeConfig {
  id: string;
  name: string;
  group: 'pastel' | 'classic' | 'custom';
  swatchColor: string;
  pastelCanvas: string;
  primary: string;
  primaryHover: string;
  bgLight: string;
  textLight: string;
  borderLight: string;
  gradient: string;
  ring: string;
  accentBg: string;
  bannerBg?: string;
  bannerStyle?: React.CSSProperties;
  buttonStyle?: React.CSSProperties;
  primaryColorHex?: string;
  pastelHex?: string;
}

export interface PastelPreset {
  id: string;
  name: string;
  hex: string;
  textColor?: string;
  primaryHex?: string;
}

// 12 beautiful pastel colors requested by user with exact hex codes
export const PASTEL_12_PRESETS: PastelPreset[] = [
  { id: 'pastel-pink', name: 'Hồng pastel', hex: '#FFD1DC', primaryHex: '#e11d48', textColor: '#be123c' },
  { id: 'pastel-mint', name: 'Xanh mint', hex: '#A8E6CF', primaryHex: '#059669', textColor: '#047857' },
  { id: 'pastel-cream', name: 'Vàng kem', hex: '#FFF2CC', primaryHex: '#d97706', textColor: '#b45309' },
  { id: 'pastel-lavender', name: 'Tím oải hương', hex: '#E1BEE7', primaryHex: '#7c3aed', textColor: '#6d28d9' },
  { id: 'pastel-sky', name: 'Xanh da trời nhạt', hex: '#BBDEFB', primaryHex: '#2563eb', textColor: '#1d4ed8' },
  { id: 'pastel-peach', name: 'Cam đào', hex: '#FFCCBC', primaryHex: '#ea580c', textColor: '#c2410c' },
  { id: 'pastel-avocado', name: 'Xanh bơ', hex: '#DCEDC8', primaryHex: '#65a30d', textColor: '#4d7c0f' },
  { id: 'pastel-beige', name: 'Be', hex: '#F5F5DC', primaryHex: '#ca8a04', textColor: '#a16207' },
  { id: 'pastel-coral', name: 'San hô nhạt', hex: '#FFAB91', primaryHex: '#e11d48', textColor: '#be123c' },
  { id: 'pastel-emerald-soft', name: 'Xanh ngọc', hex: '#B2DFDB', primaryHex: '#0d9488', textColor: '#0f766e' },
  { id: 'pastel-bamboo', name: 'Trúc xanh', hex: '#B2EBF2', primaryHex: '#0284c7', textColor: '#0369a1' },
  { id: 'pastel-rose-quartz', name: 'Hồng thạch anh', hex: '#F8BBD0', primaryHex: '#db2777', textColor: '#be185d' },
];

// Helper to convert hex to darker / readable shade for text and buttons
export function adjustColor(hex: string, percent: number): string {
  const cleanHex = hex.replace('#', '');
  const num = parseInt(cleanHex, 16);
  let r = (num >> 16) + percent;
  let g = ((num >> 8) & 0x00ff) + percent;
  let b = (num & 0x0000ff) + percent;

  r = Math.min(255, Math.max(0, r));
  g = Math.min(255, Math.max(0, g));
  b = Math.min(255, Math.max(0, b));

  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

// Immediately apply CSS variables to document root for seamless real-time styling
export function applyThemeCssVariables(themeConfig: ThemeConfig | null | undefined) {
  if (typeof document === 'undefined' || !themeConfig) return;
  const primary = themeConfig.primaryColorHex || '#059669';
  const bg = themeConfig.pastelHex || '#A8E6CF';
  const primaryHover = adjustColor(primary, -22);

  document.documentElement.style.setProperty('--primary-color', primary);
  document.documentElement.style.setProperty('--bg-color', bg);
  document.documentElement.style.setProperty('--primary-hover', primaryHover);
  document.documentElement.style.setProperty('--bg-pastel-canvas', `${bg}2b`);
  document.documentElement.style.setProperty('--text-primary', primary);
}

// Generate dynamic pastel theme with smooth non-glaring banner and vibrant readable buttons
export function createPastelTheme(hex: string, name = 'Pastel Tùy Chọn'): ThemeConfig {
  const primaryHex = adjustColor(hex, -75); // Darker tone for active buttons
  const textHex = adjustColor(hex, -110); // High contrast text tone

  return {
    id: hex.startsWith('#') ? hex : `pastel-${hex}`,
    name,
    group: 'pastel',
    swatchColor: `bg-[${hex}]`,
    pastelCanvas: 'bg-slate-50/50',
    primary: 'text-white shadow-sm transition-all',
    primaryHover: 'opacity-90',
    bgLight: 'bg-slate-50 dark:bg-slate-800',
    textLight: 'font-semibold',
    borderLight: 'border-slate-200 dark:border-slate-800',
    gradient: 'from-slate-700 to-slate-900',
    ring: 'focus:ring-2',
    accentBg: hex,
    primaryColorHex: primaryHex,
    pastelHex: hex,
    bannerStyle: {
      background: `linear-gradient(135deg, ${hex}55 0%, ${hex}28 50%, rgba(255, 255, 255, 0.98) 100%)`,
      borderColor: `${hex}99`,
    },
    buttonStyle: {
      backgroundColor: primaryHex,
      color: '#ffffff',
    },
  };
}

export const THEMES: Record<string, ThemeConfig> = {
  // 5 Classic Colors (Giữ lại 5 màu cũ: Xanh dương, Xanh ngọc, Tím, Lam, Hồng)
  indigo: {
    id: 'indigo',
    name: 'Xanh Dương (Chàm Trí Thức)',
    group: 'classic',
    swatchColor: 'bg-indigo-600',
    pastelCanvas: 'bg-slate-50/60',
    primary: 'bg-indigo-600 hover:bg-indigo-700 text-white',
    primaryHover: 'hover:bg-indigo-700',
    bgLight: 'bg-indigo-50 dark:bg-indigo-950/40',
    textLight: 'text-indigo-600 dark:text-indigo-400',
    borderLight: 'border-indigo-200 dark:border-indigo-800/60',
    gradient: 'from-indigo-600 to-violet-600',
    ring: 'focus:ring-indigo-500',
    accentBg: 'bg-indigo-600',
    primaryColorHex: '#4f46e5',
    pastelHex: '#e0e7ff',
    bannerStyle: {
      background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.12) 0%, rgba(99, 102, 241, 0.05) 100%)',
      borderColor: 'rgba(79, 70, 229, 0.25)',
    },
  },
  emerald: {
    id: 'emerald',
    name: 'Xanh Ngọc (Ngọc Năng Động)',
    group: 'classic',
    swatchColor: 'bg-emerald-600',
    pastelCanvas: 'bg-slate-50/60',
    primary: 'bg-emerald-600 hover:bg-emerald-700 text-white',
    primaryHover: 'hover:bg-emerald-700',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/40',
    textLight: 'text-emerald-600 dark:text-emerald-400',
    borderLight: 'border-emerald-200 dark:border-emerald-800/60',
    gradient: 'from-emerald-600 to-teal-600',
    ring: 'focus:ring-emerald-500',
    accentBg: 'bg-emerald-600',
    primaryColorHex: '#059669',
    pastelHex: '#d1fae5',
    bannerStyle: {
      background: 'linear-gradient(135deg, rgba(5, 150, 105, 0.12) 0%, rgba(20, 184, 166, 0.05) 100%)',
      borderColor: 'rgba(5, 150, 105, 0.25)',
    },
  },
  violet: {
    id: 'violet',
    name: 'Tím Sáng Tạo',
    group: 'classic',
    swatchColor: 'bg-violet-600',
    pastelCanvas: 'bg-slate-50/60',
    primary: 'bg-violet-600 hover:bg-violet-700 text-white',
    primaryHover: 'hover:bg-violet-700',
    bgLight: 'bg-violet-50 dark:bg-violet-950/40',
    textLight: 'text-violet-600 dark:text-violet-400',
    borderLight: 'border-violet-200 dark:border-violet-800/60',
    gradient: 'from-violet-600 to-fuchsia-600',
    ring: 'focus:ring-violet-500',
    accentBg: 'bg-violet-600',
    primaryColorHex: '#7c3aed',
    pastelHex: '#ede9fe',
    bannerStyle: {
      background: 'linear-gradient(135deg, rgba(124, 58, 237, 0.12) 0%, rgba(192, 38, 211, 0.05) 100%)',
      borderColor: 'rgba(124, 58, 237, 0.25)',
    },
  },
  sky: {
    id: 'sky',
    name: 'Lam Thanh Lịch',
    group: 'classic',
    swatchColor: 'bg-sky-600',
    pastelCanvas: 'bg-slate-50/60',
    primary: 'bg-sky-600 hover:bg-sky-700 text-white',
    primaryHover: 'hover:bg-sky-700',
    bgLight: 'bg-sky-50 dark:bg-sky-950/40',
    textLight: 'text-sky-600 dark:text-sky-400',
    borderLight: 'border-sky-200 dark:border-sky-800/60',
    gradient: 'from-sky-600 to-blue-600',
    ring: 'focus:ring-sky-500',
    accentBg: 'bg-sky-600',
    primaryColorHex: '#0284c7',
    pastelHex: '#e0f2fe',
    bannerStyle: {
      background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.12) 0%, rgba(59, 130, 246, 0.05) 100%)',
      borderColor: 'rgba(2, 132, 199, 0.25)',
    },
  },
  rose: {
    id: 'rose',
    name: 'Hồng Đam Mê',
    group: 'classic',
    swatchColor: 'bg-rose-600',
    pastelCanvas: 'bg-slate-50/60',
    primary: 'bg-rose-600 hover:bg-rose-700 text-white',
    primaryHover: 'hover:bg-rose-700',
    bgLight: 'bg-rose-50 dark:bg-rose-950/40',
    textLight: 'text-rose-600 dark:text-rose-400',
    borderLight: 'border-rose-200 dark:border-rose-800/60',
    gradient: 'from-rose-600 to-pink-600',
    ring: 'focus:ring-rose-500',
    accentBg: 'bg-rose-600',
    primaryColorHex: '#e11d48',
    pastelHex: '#ffe4e6',
    bannerStyle: {
      background: 'linear-gradient(135deg, rgba(225, 29, 72, 0.12) 0%, rgba(244, 63, 94, 0.05) 100%)',
      borderColor: 'rgba(225, 29, 72, 0.25)',
    },
  },
};

// Add 12 Pastel presets into THEMES
PASTEL_12_PRESETS.forEach((p) => {
  THEMES[p.id] = {
    id: p.id,
    name: p.name,
    group: 'pastel',
    swatchColor: `bg-[${p.hex}]`,
    pastelCanvas: 'bg-slate-50/50',
    primary: 'theme-btn-primary text-white shadow-xs transition-all',
    primaryHover: 'opacity-90',
    bgLight: 'bg-slate-50 dark:bg-slate-800',
    textLight: 'font-semibold',
    borderLight: 'border-slate-200 dark:border-slate-800',
    gradient: 'from-slate-700 to-slate-900',
    ring: 'focus:ring-2',
    accentBg: p.hex,
    primaryColorHex: p.primaryHex || '#059669',
    pastelHex: p.hex,
    bannerStyle: {
      background: `linear-gradient(135deg, ${p.hex}60 0%, ${p.hex}25 50%, rgba(255, 255, 255, 0.98) 100%)`,
      borderColor: `${p.hex}aa`,
    },
    buttonStyle: {
      backgroundColor: p.primaryHex || '#059669',
      color: '#ffffff',
    },
  };
});
