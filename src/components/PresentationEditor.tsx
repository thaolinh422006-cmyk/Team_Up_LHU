import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Layout,
  Plus,
  Trash2,
  Copy,
  Play,
  Download,
  X,
  Type,
  Image as ImageIcon,
  Shapes,
  Smile,
  Table as TableIcon,
  BarChart2,
  PieChart,
  TrendingUp,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Upload,
  RotateCw,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Palette,
  Save,
  Square,
  Circle as CircleIcon,
  Triangle as TriangleIcon,
  Star as StarIcon,
  Heart as HeartIcon,
  ArrowRight,
  ArrowLeft,
  ArrowUp,
  ArrowDown,
  Minus,
  Sparkles,
  HelpCircle,
  BookOpen,
  GraduationCap,
  Award,
  Trophy,
  Target,
  Flag,
  Flame,
  Zap,
  Bookmark,
  ThumbsUp,
  CheckCircle2,
  MessageSquare,
  Send,
  Share2,
  Users,
  Laptop,
  Smartphone,
  Wifi,
  Globe,
  Cloud,
  Cpu,
  Code,
  Database,
  Calendar,
  Clock,
  Briefcase,
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Grid,
  Pencil,
  FileText,
  Compass,
  Check,
  Maximize2,
  MessageCircle,
  GripVertical,
  Printer,
  Loader2,
  List,
  ListOrdered,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { SlideDeck, Slide, CanvasElement, CanvasAspectRatio, DocumentResource } from '../types';
import { ThemeConfig } from '../utils/theme';

export interface AspectRatioOption {
  id: CanvasAspectRatio;
  label: string;
  shortLabel: string;
  width: number;
  height: number;
  aspectRatioCss: string;
  description: string;
}

export const CANVAS_ASPECT_RATIOS: Record<CanvasAspectRatio, AspectRatioOption> = {
  '16:9': {
    id: '16:9',
    label: '16:9 (Mặc định)',
    shortLabel: '16:9',
    width: 960,
    height: 540,
    aspectRatioCss: '16 / 9',
    description: 'Ngang chuẩn màn hình (960×540px)',
  },
  '4:3': {
    id: '4:3',
    label: '4:3',
    shortLabel: '4:3',
    width: 800,
    height: 600,
    aspectRatioCss: '4 / 3',
    description: 'Máy chiếu cổ điển (800×600px)',
  },
  '1:1': {
    id: '1:1',
    label: '1:1 (Vuông)',
    shortLabel: '1:1 (Vuông)',
    width: 600,
    height: 600,
    aspectRatioCss: '1 / 1',
    description: 'Hình vuông Poster / MXH (600×600px)',
  },
  '9:16': {
    id: '9:16',
    label: '9:16 (Dọc)',
    shortLabel: '9:16 (Dọc)',
    width: 540,
    height: 960,
    aspectRatioCss: '9 / 16',
    description: 'Khổ dọc điện thoại / Story (540×960px)',
  },
};

export const ASPECT_RATIO_OPTIONS: AspectRatioOption[] = [
  CANVAS_ASPECT_RATIOS['16:9'],
  CANVAS_ASPECT_RATIOS['4:3'],
  CANVAS_ASPECT_RATIOS['1:1'],
  CANVAS_ASPECT_RATIOS['9:16'],
];

// Fallback Canvas Dimensions
const DEFAULT_CANVAS_WIDTH = 960;
const DEFAULT_CANVAS_HEIGHT = 540;

interface PresentationEditorProps {
  deck: SlideDeck;
  onUpdateDeck: (updated: SlideDeck) => void;
  theme: ThemeConfig;
  projectName: string;
  onSaveToDocuments?: (newDoc: DocumentResource) => void;
  onBackToDashboard?: () => void;
}

// Preset Fonts (All with great Vietnamese typography support)
const FONT_OPTIONS = [
  { label: 'Inter (Hiện đại)', value: 'Inter, sans-serif' },
  { label: 'Roboto (Chuẩn mực)', value: 'Roboto, sans-serif' },
  { label: 'Montserrat (Đậm nét)', value: 'Montserrat, sans-serif' },
  { label: 'Playfair Display (Sang trọng)', value: 'Playfair Display, serif' },
  { label: 'Oswald (Mạnh mẽ)', value: 'Oswald, sans-serif' },
  { label: 'Dancing Script (Viết tay)', value: 'Dancing Script, cursive' },
  { label: 'Merriweather (Học thuật)', value: 'Merriweather, serif' },
  { label: 'Be Vietnam Pro (Việt hóa)', value: 'Be Vietnam Pro, sans-serif' },
  { label: 'Courier New (Code/Kỹ thuật)', value: 'Courier New, monospace' },
  { label: 'Pacifico (Nghệ thuật)', value: 'Pacifico, cursive' },
  { label: 'Nunito (Thân thiện)', value: 'Nunito, sans-serif' },
];

// Quick font sizes for 1-click selection
const QUICK_FONT_SIZES = [14, 16, 18, 20, 24, 28, 32, 40, 48, 60, 72];

// Curated Color Palettes (includes user-requested #12290F dark forest green)
const COLOR_PALETTE = [
  '#12290F',
  '#000000',
  '#1e293b',
  '#475569',
  '#94a3b8',
  '#ffffff',
  '#ef4444',
  '#f97316',
  '#f59e0b',
  '#10b981',
  '#06b6d4',
  '#3b82f6',
  '#6366f1',
  '#8b5cf6',
  '#d946ef',
  '#ec4899',
];

// Color conversion utilities for live 2D picker & rainbow hue slider
function hexToHsv(hex: string): { h: number; s: number; v: number } {
  let cleaned = (hex || '#000000').replace('#', '').trim();
  if (cleaned.length === 3) {
    cleaned = cleaned.split('').map((c) => c + c).join('');
  }
  if (cleaned.length !== 6) {
    return { h: 113, s: 63, v: 16 };
  }
  const r = parseInt(cleaned.substring(0, 2), 16) / 255;
  const g = parseInt(cleaned.substring(2, 4), 16) / 255;
  const b = parseInt(cleaned.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }

  const s = max === 0 ? 0 : Math.round((delta / max) * 100);
  const v = Math.round(max * 100);

  return { h, s, v };
}

function hsvToHex(h: number, s: number, v: number): string {
  const sNorm = Math.max(0, Math.min(100, s)) / 100;
  const vNorm = Math.max(0, Math.min(100, v)) / 100;

  const c = vNorm * sNorm;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = vNorm - c;

  let rPrime = 0;
  let gPrime = 0;
  let bPrime = 0;

  if (h >= 0 && h < 60) {
    rPrime = c; gPrime = x; bPrime = 0;
  } else if (h >= 60 && h < 120) {
    rPrime = x; gPrime = c; bPrime = 0;
  } else if (h >= 120 && h < 180) {
    rPrime = 0; gPrime = c; bPrime = x;
  } else if (h >= 180 && h < 240) {
    rPrime = 0; gPrime = x; bPrime = c;
  } else if (h >= 240 && h < 300) {
    rPrime = x; gPrime = 0; bPrime = c;
  } else {
    rPrime = c; gPrime = 0; bPrime = x;
  }

  const r = Math.round((rPrime + m) * 255);
  const g = Math.round((gPrime + m) * 255);
  const b = Math.round((bPrime + m) * 255);

  const toHex = (n: number) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0').toUpperCase();
  return `#${toHex(r)}$${toHex(g)}${toHex(b)}`;
}

// Curated Background Colors & Gradients
const BACKGROUND_PRESETS = [
  { label: 'Trắng tinh', value: '#ffffff' },
  { label: 'Xám sáng', value: '#f8fafc' },
  { label: 'Kem nhã', value: '#fefce8' },
  { label: 'Hồng pastel', value: '#fff1f2' },
  { label: 'Tím pastel', value: '#faf5ff' },
  { label: 'Xanh pastel', value: '#eff6ff' },
  { label: 'Xanh ngọc', value: '#f0fdf4' },
  { label: 'Đen sang trọng', value: '#0f172a' },
  { label: 'Xám than', value: '#18181b' },
  { label: 'Gradient Tím Indigo', value: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)' },
  { label: 'Gradient Hoàng hôn', value: 'linear-gradient(135deg, #f97316 0%, #ec4899 100%)' },
  { label: 'Gradient Đại dương', value: 'linear-gradient(135deg, #0284c7 0%, #0d9488 100%)' },
];

// Curated Stock Photos (Unsplash)
const STOCK_PHOTOS = [
  {
    name: 'Công nghệ & AI',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Học tập & Nhóm',
    url: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Không gian sáng tạo',
    url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Tối giản & Trừu tượng',
    url: 'https://images.unsplash.com/photo-1579783900882-c0d3dad7b119?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Biểu đồ tăng trưởng',
    url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=800&auto=format&fit=crop&q=80',
  },
  {
    name: 'Thuyết trình bài giảng',
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&auto=format&fit=crop&q=80',
  },
];

// Animated Stickers Catalog
const ANIMATED_STICKERS = [
  {
    id: 'anim_rocket',
    emoji: '🚀',
    label: 'Cất Cánh',
    effect: 'float' as const,
    bg: 'from-blue-500 to-indigo-600',
    desc: 'Tên lửa bay lơ lửng bứt phá',
  },
  {
    id: 'anim_star',
    emoji: '⭐',
    label: 'Tỏa Sáng',
    effect: 'pulse' as const,
    bg: 'from-amber-400 to-yellow-500',
    desc: 'Ngôi sao nhấp nháy phát sáng',
  },
  {
    id: 'anim_fire',
    emoji: '🔥',
    label: 'Nhiệt Huyết',
    effect: 'pulse' as const,
    bg: 'from-orange-500 to-red-600',
    desc: 'Ngọn lửa bập bùng nhiệt huyết',
  },
  {
    id: 'anim_heart',
    emoji: '💖',
    label: 'Yêu Thích',
    effect: 'heartbeat' as const,
    bg: 'from-rose-500 to-pink-600',
    desc: 'Trái tim đập rộn ràng',
  },
  {
    id: 'anim_thumb',
    emoji: '👍',
    label: 'Tuyệt Vời',
    effect: 'bounce' as const,
    bg: 'from-emerald-500 to-teal-600',
    desc: 'Nút Like nhún nhảy',
  },
  {
    id: 'anim_party',
    emoji: '🎉',
    label: 'Ăn Mừng',
    effect: 'wiggle' as const,
    bg: 'from-purple-500 to-fuchsia-600',
    desc: 'Pháo hoa lắc lư ăn mừng',
  },
  {
    id: 'anim_bulb',
    emoji: '💡',
    label: 'Ý Tưởng Vàng',
    effect: 'pulse' as const,
    bg: 'from-yellow-400 to-amber-500',
    desc: 'Bóng đèn phát minh lóe sáng',
  },
  {
    id: 'anim_trophy',
    emoji: '🏆',
    label: 'Vô Địch',
    effect: 'bounce' as const,
    bg: 'from-amber-500 to-yellow-600',
    desc: 'Cúp vàng nhảy múa vinh quang',
  },
  {
    id: 'anim_target',
    emoji: '🎯',
    label: 'Mục Tiêu',
    effect: 'heartbeat' as const,
    bg: 'from-red-500 to-rose-600',
    desc: 'Hồng tâm nhịp đập chính xác',
  },
  {
    id: 'anim_clock',
    emoji: '⏰',
    label: 'Đúng Giờ',
    effect: 'wiggle' as const,
    bg: 'from-sky-500 to-blue-600',
    desc: 'Đồng hồ rung lắc',
  },
  {
    id: 'anim_galaxy',
    emoji: '💫',
    label: 'Xoay Vòng',
    effect: 'spin' as const,
    bg: 'from-indigo-500 to-purple-600',
    desc: 'Vòng xoay thiên hà',
  },
  {
    id: 'anim_gem',
    emoji: '💎',
    label: 'Kim Cương',
    effect: 'pulse' as const,
    bg: 'from-cyan-400 to-blue-500',
    desc: 'Kim cương sáng lấp lánh',
  },
];

// Static Stickers Catalog
const STATIC_STICKERS = [
  { id: 'stk_top1', emoji: '🥇', label: 'Top 1', color: '#f59e0b' },
  { id: 'stk_100', emoji: '💯', label: '100 Điểm', color: '#ef4444' },
  { id: 'stk_check', emoji: '✅', label: 'Đã Duyệt', color: '#10b981' },
  { id: 'stk_pin', emoji: '📌', label: 'Lưu Ý Quan Trọng', color: '#ec4899' },
  { id: 'stk_grad', emoji: '🎓', label: 'Học Tập', color: '#3b82f6' },
  { id: 'stk_coffee', emoji: '☕', label: 'Giải Lao', color: '#8b5cf6' },
  { id: 'stk_gift', emoji: '🎁', label: 'Quà Tặng', color: '#f43f5e' },
  { id: 'stk_star5', emoji: '⭐⭐⭐⭐⭐', label: 'Đánh Giá 5 Sao', color: '#eab308' },
  { id: 'stk_thanks', emoji: '🙏', label: 'Cảm Ơn Bạn', color: '#6366f1' },
  { id: 'stk_team', emoji: '🤝', label: 'Đồng Lòng', color: '#14b8a6' },
  { id: 'stk_growth', emoji: '📈', label: 'Tăng Trưởng', color: '#10b981' },
  { id: 'stk_shield', emoji: '🛡️', label: 'Bảo Mật', color: '#0ea5e9' },
];

// Icons Catalog (Categorized)
const ICON_CATEGORIES = [
  {
    name: 'Thuyết Trình & Đánh Giá',
    icons: [
      { name: 'star', label: 'Ngôi sao', icon: StarIcon },
      { name: 'award', label: 'Huy chương', icon: Award },
      { name: 'trophy', label: 'Cúp vàng', icon: Trophy },
      { name: 'target', label: 'Mục tiêu', icon: Target },
      { name: 'sparkles', label: 'Lấp lánh', icon: Sparkles },
      { name: 'flame', label: 'Ngọn lửa', icon: Flame },
      { name: 'zap', label: 'Tia chớp', icon: Zap },
      { name: 'thumbs-up', label: 'Thích', icon: ThumbsUp },
      { name: 'check-circle', label: 'Hoàn thành', icon: CheckCircle2 },
      { name: 'bookmark', label: 'Đánh dấu', icon: Bookmark },
      { name: 'flag', label: 'Cột mốc', icon: Flag },
    ],
  },
  {
    name: 'Học Tập & Tri Thức',
    icons: [
      { name: 'book-open', label: 'Sách mở', icon: BookOpen },
      { name: 'graduation-cap', label: 'Mũ tốt nghiệp', icon: GraduationCap },
      { name: 'lightbulb', label: 'Bóng đèn', icon: Sparkles },
      { name: 'pencil', label: 'Bút viết', icon: Pencil },
      { name: 'file-text', label: 'Tài liệu', icon: FileText },
      { name: 'compass', label: 'La bàn', icon: Compass },
      { name: 'help-circle', label: 'Hỏi đáp', icon: HelpCircle },
    ],
  },
  {
    name: 'Công Nghệ & Kỹ Thuật',
    icons: [
      { name: 'laptop', label: 'Laptop', icon: Laptop },
      { name: 'smartphone', label: 'Điện thoại', icon: Smartphone },
      { name: 'globe', label: 'Toàn cầu', icon: Globe },
      { name: 'cloud', label: 'Đám mây', icon: Cloud },
      { name: 'cpu', label: 'Vi xử lý', icon: Cpu },
      { name: 'code', label: 'Mã nguồn', icon: Code },
      { name: 'database', label: 'Cơ sở dữ liệu', icon: Database },
      { name: 'wifi', label: 'Kết nối mạng', icon: Wifi },
    ],
  },
  {
    name: 'Nhóm & Giao Tiếp',
    icons: [
      { name: 'users', label: 'Thành viên', icon: Users },
      { name: 'message-square', label: 'Tin nhắn', icon: MessageSquare },
      { name: 'send', label: 'Gửi đi', icon: Send },
      { name: 'share', label: 'Chia sẻ', icon: Share2 },
      { name: 'calendar', label: 'Lịch trình', icon: Calendar },
      { name: 'clock', label: 'Thời gian', icon: Clock },
      { name: 'briefcase', label: 'Công việc', icon: Briefcase },
      { name: 'heart', label: 'Trái tim', icon: HeartIcon },
    ],
  },
];

// Helper to ensure slide has canvas elements array
const getSlideCanvasElements = (slide: Slide): CanvasElement[] => {
  if (slide.canvasElements && Array.isArray(slide.canvasElements)) {
    return slide.canvasElements;
  }
  const elements: CanvasElement[] = [];
  if (slide.title) {
    elements.push({
      id: `el_title_${slide.id}`,
      type: 'text',
      x: 80,
      y: 80,
      width: 800,
      height: 70,
      text: slide.title,
      fontSize: 36,
      fontWeight: 'bold',
      fontFamily: 'Inter, sans-serif',
      color: '#0f172a',
      textAlign: 'left',
      zIndex: 1,
    });
  }
  if (slide.subtitle) {
    elements.push({
      id: `el_sub_${slide.id}`,
      type: 'text',
      x: 80,
      y: 160,
      width: 800,
      height: 40,
      text: slide.subtitle,
      fontSize: 20,
      fontWeight: 'normal',
      fontFamily: 'Inter, sans-serif',
      color: '#64748b',
      textAlign: 'left',
      zIndex: 2,
    });
  }
  if (slide.bullets && slide.bullets.length > 0) {
    slide.bullets.forEach((bullet, idx) => {
      elements.push({
        id: `el_bullet_${slide.id}_${idx}`,
        type: 'text',
        x: 80,
        y: 220 + idx * 55,
        width: 800,
        height: 45,
        text: `• ${bullet}`,
        fontSize: 16,
        fontWeight: 'normal',
        fontFamily: 'Inter, sans-serif',
        color: '#334155',
        textAlign: 'left',
        zIndex: 3 + idx,
      });
    });
  }
  return elements;
};

const escapeHtml = (str: string) => {
  return (str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

interface ListCanvasTextElementProps {
  element: CanvasElement;
  isSelected: boolean;
  isMiniature?: boolean;
  onUpdateText: (id: string, text: string) => void;
  onSelect: () => void;
  onBlur?: () => void;
}

const ListCanvasTextElement: React.FC<ListCanvasTextElementProps> = ({
  element,
  isSelected,
  isMiniature = false,
  onUpdateText,
  onSelect,
  onBlur,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isFocusedRef = useRef(false);

  // Sync DOM with element.text and element.listType when not actively focused
  useEffect(() => {
    if (isFocusedRef.current) return;
    if (!containerRef.current) return;

    const listType = element.listType || 'none';
    const rawText = element.text || '';
    const rawLines = rawText.split('\n');
    const lines = rawLines.length > 0 && (rawLines.length > 1 || rawLines[0].length > 0) ? rawLines : [''];

    let html = '';
    if (listType === 'decimal') {
      html = `<ol class="teamup-list-decimal" style="list-style-type: decimal; padding-left: 1.5rem; margin: 0; width: 100%;">${lines
        .map((l) => `<li style="margin-bottom: 2px;">${escapeHtml(l) || '<br>'}</li>`)
        .join('')}</ol>`;
    } else {
      const cls =
        listType === 'disc'
          ? 'teamup-list-disc'
          : listType === 'dash'
          ? 'teamup-list-dash'
          : 'teamup-list-arrow';
      const styleType = listType === 'disc' ? 'disc' : listType === 'dash' ? "'- '" : "'→ '";
      html = `<ul class="${cls}" style="list-style-type: ${styleType}; padding-left: 1.5rem; margin: 0; width: 100%;">${lines
        .map((l) => `<li style="margin-bottom: 2px;">${escapeHtml(l) || '<br>'}</li>`)
        .join('')}</ul>`;
    }

    containerRef.current.innerHTML = html;
  }, [element.text, element.listType]);

  const handleExtractText = () => {
    if (!containerRef.current) return;
    const lis = containerRef.current.querySelectorAll<HTMLLIElement>('li');
    let text = '';
    if (lis.length > 0) {
      text = Array.from(lis)
        .map((li) => ((li as HTMLElement).innerText || '').replace(/\r?\n$/, ''))
        .join('\n');
    } else {
      text = (containerRef.current.innerText || '').replace(/\r?\n$/, '');
    }
    onUpdateText(element.id, text);
  };

  return (
    <div
      ref={containerRef}
      contentEditable={!isMiniature}
      suppressContentEditableWarning
      onFocus={() => {
        isFocusedRef.current = true;
        onSelect();
      }}
      onBlur={() => {
        isFocusedRef.current = false;
        handleExtractText();
        if (onBlur) onBlur();
      }}
      onInput={handleExtractText}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      style={{
        width: '100%',
        height: '100%',
        fontFamily: element.fontFamily || 'Inter, sans-serif',
        fontSize: `${element.fontSize || 20}px`,
        fontWeight: element.fontWeight || 'normal',
        fontStyle: element.fontStyle || 'normal',
        textDecoration: element.textDecoration || 'none',
        color: element.color || '#000000',
        backgroundColor: element.backgroundColor || 'transparent',
        textAlign: element.textAlign || 'left',
        lineHeight: element.lineHeight || 1.3,
        letterSpacing: `${element.letterSpacing || 0}px`,
        outline: 'none',
        padding: '6px',
        margin: 0,
        boxSizing: 'border-box',
        overflow: 'hidden',
        cursor: 'text',
      }}
    />
  );
};

export const PresentationEditor: React.FC<PresentationEditorProps> = ({
  deck,
  onUpdateDeck,
  theme,
  projectName,
  onSaveToDocuments,
  onBackToDashboard,
}) => {
  const [activeSlideIndex, setActiveSlideIndex] = useState<number>(0);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);

  // Active cell in table if editing table
  const [selectedTableCell, setSelectedTableCell] = useState<{ row: number; col: number } | null>(null);

  // Zoom level for canvas (1 = 100%, 0.75, 1.25, etc.)
  const [zoomLevel, setZoomLevel] = useState<number>(1);

  // Fullscreen Presentation state
  const [isPresenting, setIsPresenting] = useState<boolean>(false);
  const [presentingSlideIndex, setPresentingSlideIndex] = useState<number>(0);

  // Modals & Popovers
  const [showTextMenu, setShowTextMenu] = useState<boolean>(false);
  const [showImageMenu, setShowImageMenu] = useState<boolean>(false);
  const [showShapeMenu, setShowShapeMenu] = useState<boolean>(false);
  const [shapeMenuTab, setShapeMenuTab] = useState<'basic' | 'arrows' | 'callouts'>('basic');
  const [showIconStickerMenu, setShowIconStickerMenu] = useState<boolean>(false);
  const [iconStickerTab, setIconStickerTab] = useState<'animated' | 'stickers' | 'icons'>('animated');
  const [showTableModal, setShowTableModal] = useState<boolean>(false);
  const [tableInitRows, setTableInitRows] = useState<number>(3);
  const [tableInitCols, setTableInitCols] = useState<number>(3);
  const [showBgMenu, setShowBgMenu] = useState<boolean>(false);
  const [showSaveToast, setShowSaveToast] = useState<boolean>(false);
  const [openListMenuId, setOpenListMenuId] = useState<string | null>(null);

  // Dedicated Color Picker Modal State (Requirement 1, 2, 3, 4)
  const [isColorPickerOpen, setIsColorPickerOpen] = useState<boolean>(false);
  const [colorPickerTargetId, setColorPickerTargetId] = useState<string | null>(null);
  const [pickerCurrentColor, setPickerCurrentColor] = useState<string>('#12290F');
  const [pickerOriginalColor, setPickerOriginalColor] = useState<string>('#12290F');
  const [pickerHsv, setPickerHsv] = useState<{ h: number; s: number; v: number }>({ h: 113, s: 63, v: 16 });
  const [pickerHexInput, setPickerHexInput] = useState<string>('#12290F');

  // Canvas Aspect Ratio (16:9, 4:3, 1:1, 9:16)
  const [aspectRatio, setAspectRatio] = useState<CanvasAspectRatio>(() => {
    if (deck.aspectRatio && ['16:9', '4:3', '1:1', '9:16'].includes(deck.aspectRatio)) {
      return deck.aspectRatio;
    }
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_canvas_aspect_ratio');
      if (saved && ['16:9', '4:3', '1:1', '9:16'].includes(saved)) {
        return saved as CanvasAspectRatio;
      }
    }
    return '16:9';
  });

  const currentConfig = CANVAS_ASPECT_RATIOS[aspectRatio] || CANVAS_ASPECT_RATIOS['16:9'];
  const canvasWidth = currentConfig.width;
  const canvasHeight = currentConfig.height;

  // Dropdown & Export Modal states
  const [showAspectRatioMenu, setShowAspectRatioMenu] = useState<boolean>(false);
  const aspectRatioMenuRef = useRef<HTMLDivElement | null>(null);
  const [showExportModal, setShowExportModal] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Sync aspectRatio when deck.aspectRatio updates
  useEffect(() => {
    if (deck.aspectRatio && deck.aspectRatio !== aspectRatio && ['16:9', '4:3', '1:1', '9:16'].includes(deck.aspectRatio)) {
      setAspectRatio(deck.aspectRatio);
    }
  }, [deck.aspectRatio, aspectRatio]);

  // Close Aspect Ratio menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        aspectRatioMenuRef.current &&
        !aspectRatioMenuRef.current.contains(e.target as Node)
      ) {
        setShowAspectRatioMenu(false);
      }
    };
    if (showAspectRatioMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showAspectRatioMenu]);

  const handleSelectAspectRatio = (newRatio: CanvasAspectRatio) => {
    setAspectRatio(newRatio);
    setShowAspectRatioMenu(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teamup_canvas_aspect_ratio', newRatio);
      } catch (e) {
        console.error('Failed to save aspect ratio to localStorage', e);
      }
    }
    onUpdateDeck({
      ...deck,
      aspectRatio: newRatio,
    });
  };

  // Dynamic Canvas Scale based on actual DOM width vs canvasWidth
  const [canvasScale, setCanvasScale] = useState<number>(1);

  // Dragging & Resizing Canvas State
  const canvasRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateScale = () => {
      if (canvasRef.current) {
        const clientW = canvasRef.current.clientWidth;
        if (clientW > 0) {
          setCanvasScale(clientW / canvasWidth);
        }
      }
    };

    updateScale();
    const t = setTimeout(updateScale, 50);
    window.addEventListener('resize', updateScale);

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined' && canvasRef.current) {
      resizeObserver = new ResizeObserver(updateScale);
      resizeObserver.observe(canvasRef.current);
    }

    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updateScale);
      resizeObserver?.disconnect();
    };
  }, [aspectRatio, zoomLevel, canvasWidth]);

  // Fullscreen presentation container scale
  const presentContainerRef = useRef<HTMLDivElement | null>(null);
  const [presentScale, setPresentScale] = useState<number>(1);

  useEffect(() => {
    if (!isPresenting) return;
    const updatePresentScale = () => {
      if (presentContainerRef.current) {
        const w = presentContainerRef.current.clientWidth;
        if (w > 0) {
          setPresentScale(w / canvasWidth);
        }
      }
    };
    updatePresentScale();
    const t = setTimeout(updatePresentScale, 60);
    window.addEventListener('resize', updatePresentScale);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', updatePresentScale);
    };
  }, [isPresenting, canvasWidth, aspectRatio]);

  // Toolbar Row 2 Collapsed state (stored in localStorage)
  const [isInsertBarCollapsed, setIsInsertBarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved =
        localStorage.getItem('teamup_insert_toolbar_collapsed') ??
        localStorage.getItem('teamup_insert_bar_collapsed');
      return saved === 'true';
    }
    return false;
  });

  const handleToggleInsertBar = () => {
    setIsInsertBarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('teamup_insert_toolbar_collapsed', String(next));
          localStorage.setItem('teamup_insert_bar_collapsed', String(next));
        } catch (e) {
          console.error('Failed to save insert bar collapsed state', e);
        }
      }
      return next;
    });
  };

  // Chart & Icon Dropdown Menu refs
  const [showChartMenu, setShowChartMenu] = useState<boolean>(false);
  const chartMenuRef = useRef<HTMLDivElement | null>(null);
  const iconMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (chartMenuRef.current && !chartMenuRef.current.contains(e.target as Node)) {
        setShowChartMenu(false);
      }
      if (iconMenuRef.current && !iconMenuRef.current.contains(e.target as Node)) {
        setShowIconStickerMenu(false);
      }
    };
    if (showChartMenu || showIconStickerMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showChartMenu, showIconStickerMenu]);

  // Focus & Scroll to Right Sidebar Inspector Panel
  const focusChartInspector = useCallback(() => {
    const panel = document.getElementById('slide-inspector-panel');
    if (panel) {
      panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      panel.classList.add('ring-2', 'ring-orange-500');
      setTimeout(() => {
        panel.classList.remove('ring-2', 'ring-orange-500');
      }, 1500);
    }
  }, []);

  // Insert Chart with Specific Type (Cột, Tròn, Đường)
  const handleAddChartWithType = (type: 'bar' | 'pie' | 'line') => {
    const id = `chart_${Date.now()}`;
    const defaultLabels =
      type === 'pie'
        ? ['Nhóm A', 'Nhóm B', 'Nhóm C', 'Nhóm D']
        : ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'];
    const defaultValues =
      type === 'pie'
        ? [35, 25, 20, 20]
        : [45, 70, 85, 95];
    const defaultColors =
      type === 'bar'
        ? ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b']
        : ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b'];
    const defaultTitle =
      type === 'pie'
        ? 'Cơ cấu phân bổ dự án'
        : type === 'line'
        ? 'Biểu đồ xu hướng phát triển'
        : 'Biểu đồ tiến độ thực tế';

    const newElement: CanvasElement = {
      id,
      type: 'chart',
      chartType: type,
      chartTitle: defaultTitle,
      chartLabels: defaultLabels,
      chartValues: defaultValues,
      chartColors: defaultColors,
      color: '#4f46e5',
      x: Math.round((canvasWidth - 520) / 2),
      y: Math.round((canvasHeight - 320) / 2),
      width: 520,
      height: 320,
      zIndex: canvasElements.length + 1,
    };
    updateCurrentSlideElements([...canvasElements, newElement]);
    setSelectedElementId(id);
    setShowChartMenu(false);
    setTimeout(() => {
      focusChartInspector();
    }, 100);
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const replaceImgInputRef = useRef<HTMLInputElement | null>(null);
  const bgImgInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRefs = useRef<{ [key: string]: HTMLTextAreaElement | null }>({});

  const [interactionState, setInteractionState] = useState<{
    mode: 'none' | 'move' | 'resize' | 'rotate';
    handle?: string;
    startX: number;
    startY: number;
    elementStart: { x: number; y: number; width: number; height: number; rotation: number };
  }>({
    mode: 'none',
    startX: 0,
    startY: 0,
    elementStart: { x: 0, y: 0, width: 0, height: 0, rotation: 0 },
  });

  // Undo / Redo history
  const [history, setHistory] = useState<SlideDeck[]>([deck]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Active slide
  const currentSlide: Slide = deck.slides[activeSlideIndex] || deck.slides[0] || {
    id: 'slide_default',
    title: 'Slide 1',
    layout: 'blank',
    backgroundColor: '#ffffff',
    canvasElements: [],
  };

  const canvasElements = getSlideCanvasElements(currentSlide);
  const selectedElement = canvasElements.find((el) => el.id === selectedElementId) || null;

  // Push new state to undo/redo history
  const pushHistory = useCallback(
    (newDeck: SlideDeck) => {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newDeck);
      if (newHistory.length > 30) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      onUpdateDeck(newDeck);
    },
    [history, historyIndex, onUpdateDeck]
  );

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prev = history[historyIndex - 1];
      setHistoryIndex(historyIndex - 1);
      onUpdateDeck(prev);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const next = history[historyIndex + 1];
      setHistoryIndex(historyIndex + 1);
      onUpdateDeck(next);
    }
  };

  // Update current slide elements
  const updateCurrentSlideElements = (newElements: CanvasElement[]) => {
    const newSlides = [...deck.slides];
    newSlides[activeSlideIndex] = {
      ...currentSlide,
      canvasElements: newElements,
    };
    const updatedDeck: SlideDeck = {
      ...deck,
      slides: newSlides,
      lastModified: 'Vừa xong',
    };
    pushHistory(updatedDeck);
  };

  // Update a property of current slide (e.g. background)
  const updateCurrentSlideProperty = (field: keyof Slide, value: any) => {
    const newSlides = [...deck.slides];
    newSlides[activeSlideIndex] = {
      ...currentSlide,
      [field]: value,
    };
    const updatedDeck: SlideDeck = {
      ...deck,
      slides: newSlides,
      lastModified: 'Vừa xong',
    };
    pushHistory(updatedDeck);
  };

  // Update properties of the selected element
  const updateSelectedElement = (updates: Partial<CanvasElement>) => {
    if (!selectedElementId) return;
    const newElements = canvasElements.map((el) =>
      el.id === selectedElementId ? { ...el, ...updates } : el
    );
    updateCurrentSlideElements(newElements);
  };

  // Add 1 New Blank Slide (Default 16:9, Pure White)
  const handleAddBlankSlide = () => {
    const newSlide: Slide = {
      id: `slide_${Date.now()}`,
      title: `Slide ${deck.slides.length + 1}`,
      layout: 'blank',
      backgroundColor: '#ffffff',
      canvasElements: [],
      notes: '',
    };
    const newSlides = [...deck.slides, newSlide];
    const updatedDeck: SlideDeck = {
      ...deck,
      slides: newSlides,
      lastModified: 'Vừa xong',
    };
    pushHistory(updatedDeck);
    setActiveSlideIndex(newSlides.length - 1);
    setSelectedElementId(null);
  };

  // Duplicate slide
  const handleDuplicateSlide = (index: number) => {
    const target = deck.slides[index];
    const duplicatedElements = getSlideCanvasElements(target).map((el) => ({
      ...el,
      id: `el_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    }));

    const duplicated: Slide = {
      ...target,
      id: `slide_${Date.now()}`,
      title: `${target.title || 'Slide'} (Bản sao)`,
      canvasElements: duplicatedElements,
    };
    const newSlides = [...deck.slides];
    newSlides.splice(index + 1, 0, duplicated);
    const updatedDeck: SlideDeck = {
      ...deck,
      slides: newSlides,
      lastModified: 'Vừa xong',
    };
    pushHistory(updatedDeck);
    setActiveSlideIndex(index + 1);
  };

  // Delete slide
  const handleDeleteSlide = (index: number) => {
    if (deck.slides.length <= 1) {
      const resetSlide: Slide = {
        id: `slide_${Date.now()}`,
        title: 'Slide 1',
        layout: 'blank',
        backgroundColor: '#ffffff',
        canvasElements: [],
        notes: '',
      };
      const updatedDeck = { ...deck, slides: [resetSlide], lastModified: 'Vừa xong' };
      pushHistory(updatedDeck);
      setSelectedElementId(null);
      return;
    }
    const newSlides = deck.slides.filter((_, i) => i !== index);
    const updatedDeck: SlideDeck = {
      ...deck,
      slides: newSlides,
      lastModified: 'Vừa xong',
    };
    pushHistory(updatedDeck);
    setActiveSlideIndex(Math.max(0, index - 1));
    setSelectedElementId(null);
  };

  // Move slide up / down
  const handleMoveSlide = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= deck.slides.length) return;
    const newSlides = [...deck.slides];
    const temp = newSlides[index];
    newSlides[index] = newSlides[targetIdx];
    newSlides[targetIdx] = temp;
    const updatedDeck: SlideDeck = {
      ...deck,
      slides: newSlides,
      lastModified: 'Vừa xong',
    };
    pushHistory(updatedDeck);
    setActiveSlideIndex(targetIdx);
  };

  // =========================================================================
  // 1. TEXT HANDLERS (Direct Center Add, Auto-Focus, Real Input/Textarea, Vietnamese IME)
  // =========================================================================
  const focusTextElement = (id: string, selectAll = true) => {
    setSelectedElementId(id);
    setEditingTextId(id);
    setTimeout(() => {
      const inputEl = textInputRefs.current[id];
      if (inputEl) {
        inputEl.focus();
        if (selectAll) {
          inputEl.select();
        }
      }
    }, 60);
  };

  // Requirement 1: Click "T Text" button adds a new text box at center of slide & auto-focuses immediately
  const handleAddTextCenter = () => {
    const id = `text_${Date.now()}`;
    const width = Math.min(500, canvasWidth - 40);
    const height = 80;
    const x = Math.round((canvasWidth - width) / 2);
    const y = Math.round((canvasHeight - height) / 2);

    const newElement: CanvasElement = {
      id,
      type: 'text',
      x,
      y,
      width,
      height,
      rotation: 0,
      text: '', // Chuỗi rỗng hoàn toàn, không tự điền chữ mẫu
      fontFamily: 'Inter, sans-serif',
      fontSize: 24,
      fontWeight: 'normal',
      fontStyle: 'normal',
      textDecoration: 'none',
      color: '#0f172a',
      textAlign: 'center',
      lineHeight: 1.3,
      letterSpacing: 0,
      opacity: 1,
      listType: 'none', // Mặc định là văn bản thường, KHÔNG có bất kỳ ký hiệu đầu dòng nào, KHÔNG tự động thành 1. 2. 3.
      zIndex: canvasElements.length + 1,
    };

    updateCurrentSlideElements([...canvasElements, newElement]);
    focusTextElement(id, false);
    setShowTextMenu(false);
  };

  const handleAddText = (presetType: 'title' | 'heading' | 'body' | 'bullet' | 'quote' = 'heading') => {
    const id = `text_${Date.now()}`;
    const text = ''; // Chuỗi rỗng hoàn toàn cho tất cả loại textbox
    let fontSize = 24;
    let fontWeight: CanvasElement['fontWeight'] = 'normal';
    let fontStyle: CanvasElement['fontStyle'] = 'normal';
    let textAlign: CanvasElement['textAlign'] = 'left';
    let listType: CanvasElement['listType'] = presetType === 'bullet' ? 'disc' : 'none';
    let width = Math.min(500, canvasWidth - 40);
    let height = 60;
    let y = Math.round((canvasHeight - 60) / 2);

    if (presetType === 'title') {
      fontSize = 44;
      fontWeight = 'bold';
      textAlign = 'center';
      width = Math.min(700, canvasWidth - 40);
      height = 90;
      y = Math.round(canvasHeight * 0.2);
    } else if (presetType === 'heading') {
      fontSize = 32;
      fontWeight = 'bold';
      width = Math.min(600, canvasWidth - 40);
      height = 70;
      y = Math.round(canvasHeight * 0.25);
    } else if (presetType === 'body') {
      fontSize = 18;
      fontWeight = 'normal';
      width = Math.min(550, canvasWidth - 40);
      height = 80;
      y = Math.round(canvasHeight * 0.35);
    } else if (presetType === 'bullet') {
      fontSize = 18;
      fontWeight = 'normal';
      width = Math.min(550, canvasWidth - 40);
      height = 110;
      y = Math.round(canvasHeight * 0.35);
    } else if (presetType === 'quote') {
      fontSize = 22;
      fontWeight = '600';
      fontStyle = 'italic';
      textAlign = 'center';
      width = Math.min(650, canvasWidth - 40);
      height = 90;
      y = Math.round(canvasHeight * 0.3);
    }

    const x = Math.round((canvasWidth - width) / 2);

    const newElement: CanvasElement = {
      id,
      type: 'text',
      x,
      y,
      width,
      height,
      rotation: 0,
      text, // Chuỗi rỗng "" hoàn toàn
      fontFamily: 'Inter, sans-serif',
      fontSize,
      fontWeight,
      fontStyle,
      textDecoration: 'none',
      color: '#0f172a',
      textAlign,
      lineHeight: 1.3,
      letterSpacing: 0,
      opacity: 1,
      listType,
      zIndex: canvasElements.length + 1,
    };

    updateCurrentSlideElements([...canvasElements, newElement]);
    focusTextElement(id, false);
    setShowTextMenu(false);
  };

  // Live text update during typing with Vietnamese IME (Telex/VNI) support
  const updateElementText = (id: string, newText: string) => {
    const newElements = canvasElements.map((el) =>
      el.id === id ? { ...el, text: newText } : el
    );
    const newSlides = [...deck.slides];
    newSlides[activeSlideIndex] = {
      ...currentSlide,
      canvasElements: newElements,
    };
    const updatedDeck: SlideDeck = {
      ...deck,
      slides: newSlides,
      lastModified: 'Vừa xong',
    };
    onUpdateDeck(updatedDeck);
  };

  const handleTextBlur = () => {
    // Record snapshot into undo history when user finishes typing / blurs
    pushHistory(deck);
  };

  // Change font size with step button
  const handleStepFontSize = (delta: number) => {
    if (!selectedElement || selectedElement.type !== 'text') return;
    const currentSize = selectedElement.fontSize || 20;
    const newSize = Math.max(8, Math.min(140, currentSize + delta));
    updateSelectedElement({ fontSize: newSize });
  };

  // =========================================================================
  // COLOR PICKER ACTIONS (Live preview, Rainbow slider, 2D circle drag, Apply)
  // =========================================================================
  const openColorPicker = (element: CanvasElement) => {
    const col = element.color || '#12290F';
    setColorPickerTargetId(element.id);
    setPickerCurrentColor(col);
    setPickerOriginalColor(col);
    setPickerHexInput(col);
    setPickerHsv(hexToHsv(col));
    setIsColorPickerOpen(true);
  };

  // Requirement 1: Live update text color on slide immediately while dragging
  const updateElementColorLive = (elementId: string | null, newColor: string) => {
    if (!elementId) return;
    const newElements = canvasElements.map((el) =>
      el.id === elementId ? { ...el, color: newColor } : el
    );
    const newSlides = [...deck.slides];
    newSlides[activeSlideIndex] = {
      ...currentSlide,
      canvasElements: newElements,
    };
    const updatedDeck: SlideDeck = {
      ...deck,
      slides: newSlides,
      lastModified: 'Vừa xong',
    };
    onUpdateDeck(updatedDeck);
  };

  // Requirement 4: "Áp dụng" button confirms and saves color permanently
  const handleApplyColor = () => {
    if (colorPickerTargetId) {
      const newElements = canvasElements.map((el) =>
        el.id === colorPickerTargetId ? { ...el, color: pickerCurrentColor } : el
      );
      updateCurrentSlideElements(newElements);
    }
    setIsColorPickerOpen(false);
  };

  // Cancel & revert to original color
  const handleCancelColor = () => {
    if (colorPickerTargetId && pickerOriginalColor) {
      updateElementColorLive(colorPickerTargetId, pickerOriginalColor);
    }
    setIsColorPickerOpen(false);
  };

  // Pointer handler for 2D Saturation & Value box (Kéo chấm tròn)
  const handleSatValPointer = (e: React.PointerEvent<HTMLDivElement> | React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const s = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
    const v = Math.max(0, Math.min(100, Math.round((1 - (e.clientY - rect.top) / rect.height) * 100)));

    const nextHsv = { ...pickerHsv, s, v };
    setPickerHsv(nextHsv);
    const newHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
    setPickerCurrentColor(newHex);
    setPickerHexInput(newHex);
    updateElementColorLive(colorPickerTargetId, newHex);
  };

  // =========================================================================
  // 2. IMAGE HANDLERS
  // =========================================================================
  const handleAddImage = (imageUrl: string) => {
    const id = `img_${Date.now()}`;
    const newElement: CanvasElement = {
      id,
      type: 'image',
      src: imageUrl,
      alt: 'Slide Image',
      x: 230,
      y: 95,
      width: 500,
      height: 350,
      rotation: 0,
      objectFit: 'cover',
      borderRadius: 12,
      borderWidth: 0,
      borderColor: '#e2e8f0',
      shadow: true,
      opacity: 1,
      zIndex: canvasElements.length + 1,
    };
    updateCurrentSlideElements([...canvasElements, newElement]);
    setSelectedElementId(id);
    setShowImageMenu(false);
  };

  // Handle local file upload (mobile photo library / camera / PC file system)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        handleAddImage(result);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle replace selected image
  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElementId) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        updateSelectedElement({ src: result });
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  // Handle setting image as slide background
  const handleUploadBgImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        updateCurrentSlideProperty('backgroundColor', `url("${result}") center/cover no-repeat`);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
    setShowBgMenu(false);
  };

  // Drag & drop image directly onto canvas
  const handleCanvasDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const result = event.target?.result as string;
          if (result) {
            handleAddImage(result);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // Clipboard Paste Support (Ctrl+V with image)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                handleAddImage(event.target.result as string);
              }
            };
            reader.readAsDataURL(blob);
            break;
          }
        }
      }
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [canvasElements, currentSlide]);

  // =========================================================================
  // 3. SHAPES, ARROWS & CALLOUTS HANDLERS
  // =========================================================================
  const handleAddShape = (shapeType: CanvasElement['shapeType']) => {
    const id = `shape_${Date.now()}`;
    let width = 240;
    let height = 180;
    let fillColor = '#6366f1';
    let borderColor = '#4f46e5';
    let borderWidth = 0;
    let borderRadius = 0;
    let shapeText = '';

    // Adjust shape-specific dimensions and colors
    if (shapeType === 'square') {
      width = 200;
      height = 200;
    } else if (shapeType === 'rectangle') {
      width = 300;
      height = 180;
    } else if (shapeType === 'rounded-rect') {
      width = 300;
      height = 180;
      borderRadius = 20;
    } else if (shapeType === 'circle') {
      width = 200;
      height = 200;
    } else if (shapeType === 'oval') {
      width = 280;
      height = 160;
    } else if (shapeType === 'line') {
      width = 300;
      height = 6;
      fillColor = '#4f46e5';
    } else if (shapeType?.startsWith('arrow')) {
      width = shapeType === 'arrow-up' || shapeType === 'arrow-down' ? 100 : 260;
      height = shapeType === 'arrow-up' || shapeType === 'arrow-down' ? 220 : 100;
      fillColor = '#10b981';
      borderColor = '#059669';
    } else if (shapeType === 'speech-bubble' || shapeType === 'thought-bubble' || shapeType === 'callout-box') {
      width = 280;
      height = 160;
      fillColor = '#ffffff';
      borderColor = '#6366f1';
      borderWidth = 3;
      shapeText = 'Nội dung chú thích...';
    } else if (shapeType === 'banner') {
      width = 320;
      height = 90;
      fillColor = '#f59e0b';
      shapeText = 'TIÊU ĐỀ NỔI BẬT';
    }

    const newElement: CanvasElement = {
      id,
      type: 'shape',
      shapeType: shapeType || 'rectangle',
      x: 320,
      y: 180,
      width,
      height,
      rotation: 0,
      fillColor,
      borderColor,
      borderWidth,
      borderRadius,
      shadow: false,
      opacity: 1,
      shapeText,
      shapeTextColor: '#0f172a',
      shapeFontSize: 16,
      zIndex: canvasElements.length + 1,
    };
    updateCurrentSlideElements([...canvasElements, newElement]);
    setSelectedElementId(id);
    setShowShapeMenu(false);
  };

  // Convert selected shape to slide background
  const handleShapeToBackground = () => {
    if (!selectedElement || selectedElement.type !== 'shape') return;
    updateSelectedElement({
      x: 0,
      y: 0,
      width: canvasWidth,
      height: canvasHeight,
      rotation: 0,
      borderRadius: 0,
      zIndex: 0,
    });
  };

  // =========================================================================
  // 4. ICON & STICKER HANDLERS (ANIMATED & STATIC)
  // =========================================================================
  const handleAddIcon = (iconName: string) => {
    const id = `icon_${Date.now()}`;
    const newElement: CanvasElement = {
      id,
      type: 'icon',
      iconName,
      x: 430,
      y: 220,
      width: 100,
      height: 100,
      rotation: 0,
      color: '#4f46e5',
      opacity: 1,
      zIndex: canvasElements.length + 1,
    };
    updateCurrentSlideElements([...canvasElements, newElement]);
    setSelectedElementId(id);
    setShowIconStickerMenu(false);
  };

  const handleAddAnimatedSticker = (sticker: (typeof ANIMATED_STICKERS)[0]) => {
    const id = `anim_stk_${Date.now()}`;
    const newElement: CanvasElement = {
      id,
      type: 'sticker',
      stickerId: sticker.id,
      stickerLabel: sticker.label,
      text: sticker.emoji,
      isAnimated: true,
      animationEffect: sticker.effect,
      x: 410,
      y: 200,
      width: 140,
      height: 140,
      rotation: 0,
      opacity: 1,
      zIndex: canvasElements.length + 1,
    };
    updateCurrentSlideElements([...canvasElements, newElement]);
    setSelectedElementId(id);
    setShowIconStickerMenu(false);
  };

  const handleAddStaticSticker = (sticker: (typeof STATIC_STICKERS)[0]) => {
    const id = `stk_${Date.now()}`;
    const newElement: CanvasElement = {
      id,
      type: 'sticker',
      stickerId: sticker.id,
      stickerLabel: sticker.label,
      text: sticker.emoji,
      isAnimated: false,
      x: 400,
      y: 200,
      width: 160,
      height: 110,
      rotation: 0,
      color: sticker.color,
      opacity: 1,
      zIndex: canvasElements.length + 1,
    };
    updateCurrentSlideElements([...canvasElements, newElement]);
    setSelectedElementId(id);
    setShowIconStickerMenu(false);
  };

  // =========================================================================
  // 5. TABLE HANDLERS (CREATE, EDIT CONTENT, BOLD/ITALIC, ROWS & COLS)
  // =========================================================================
  const handleCreateTable = () => {
    const rows = Math.max(1, Math.min(10, tableInitRows));
    const cols = Math.max(1, Math.min(10, tableInitCols));
    const data: string[][] = [];

    // All cells completely empty as requested
    for (let r = 0; r < rows; r++) {
      const rowArr: string[] = [];
      for (let c = 0; c < cols; c++) {
        rowArr.push('');
      }
      data.push(rowArr);
    }

    const id = `table_${Date.now()}`;
    const tableW = Math.min(canvasWidth - 60, Math.max(260, cols * 140));
    const tableH = Math.max(120, rows * 45);

    const newElement: CanvasElement = {
      id,
      type: 'table',
      x: Math.round((canvasWidth - tableW) / 2),
      y: Math.round((canvasHeight - tableH) / 2),
      width: tableW,
      height: tableH,
      tableRows: rows,
      tableCols: cols,
      tableData: data,
      tableHeaderBg: '#f5f5f5', // Very light gray #F5F5F5
      tableFontSize: 14,
      tableCellStyles: {},
      zIndex: canvasElements.length + 1,
    };

    updateCurrentSlideElements([...canvasElements, newElement]);
    setSelectedElementId(id);
    setSelectedTableCell({ row: 0, col: 0 });
    setShowTableModal(false);

    // Auto-focus first cell immediately
    setTimeout(() => {
      const firstInput = document.getElementById(`table-cell-input-${id}-0-0`);
      if (firstInput) {
        firstInput.focus();
      }
    }, 120);
  };

  // Update cell content in selected table
  const handleUpdateTableCell = (rowIndex: number, colIndex: number, value: string) => {
    if (!selectedElement || selectedElement.type !== 'table' || !selectedElement.tableData) return;
    const newData = selectedElement.tableData.map((row, rIdx) =>
      rIdx === rowIndex
        ? row.map((cell, cIdx) => (cIdx === colIndex ? value : cell))
        : [...row]
    );
    updateSelectedElement({ tableData: newData });
  };

  // Toggle Bold for cell or entire table
  const handleToggleTableCellBold = (row: number, col: number) => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const styles = { ...(selectedElement.tableCellStyles || {}) };
    const cellKey = `${row}-${col}`;
    const currentBold = styles[cellKey]?.bold;
    styles[cellKey] = {
      ...(styles[cellKey] || {}),
      bold: !currentBold,
    };
    updateSelectedElement({ tableCellStyles: styles });
  };

  // Toggle Italic for cell
  const handleToggleTableCellItalic = (row: number, col: number) => {
    if (!selectedElement || selectedElement.type !== 'table') return;
    const styles = { ...(selectedElement.tableCellStyles || {}) };
    const cellKey = `${row}-${col}`;
    const currentItalic = styles[cellKey]?.italic;
    styles[cellKey] = {
      ...(styles[cellKey] || {}),
      italic: !currentItalic,
    };
    updateSelectedElement({ tableCellStyles: styles });
  };

  // Add 1 Row to table (Tất cả ô mới đều rỗng hoàn toàn "")
  const handleAddTableRow = () => {
    if (!selectedElement || selectedElement.type !== 'table' || !selectedElement.tableData) return;
    const cols = selectedElement.tableCols || selectedElement.tableData[0]?.length || 3;
    const newRow: string[] = Array.from({ length: cols }, () => '');
    const newData = [...selectedElement.tableData, newRow];
    updateSelectedElement({
      tableData: newData,
      tableRows: newData.length,
      height: Math.round(selectedElement.height + 40),
    });
  };

  // Delete current selected row or last row
  const handleDeleteTableRow = (targetRowIndex?: number) => {
    if (!selectedElement || selectedElement.type !== 'table' || !selectedElement.tableData) return;
    if (selectedElement.tableData.length <= 1) return; // Keep at least 1 row
    const deleteIdx = targetRowIndex !== undefined ? targetRowIndex : selectedElement.tableData.length - 1;
    const newData = selectedElement.tableData.filter((_, idx) => idx !== deleteIdx);
    updateSelectedElement({
      tableData: newData,
      tableRows: newData.length,
      height: Math.max(80, Math.round(selectedElement.height - 40)),
    });
    setSelectedTableCell((prev) => (prev && prev.row >= newData.length ? { ...prev, row: newData.length - 1 } : prev));
  };

  // Add 1 Column to table (Tất cả ô mới đều rỗng hoàn toàn "")
  const handleAddTableColumn = () => {
    if (!selectedElement || selectedElement.type !== 'table' || !selectedElement.tableData) return;
    const newData = selectedElement.tableData.map((row) => [
      ...row,
      '',
    ]);
    const newCols = newData[0].length;
    updateSelectedElement({
      tableData: newData,
      tableCols: newCols,
      width: Math.min(900, Math.round(selectedElement.width + 120)),
    });
  };

  // Delete current selected col or last col
  const handleDeleteTableColumn = (targetColIndex?: number) => {
    if (!selectedElement || selectedElement.type !== 'table' || !selectedElement.tableData) return;
    if ((selectedElement.tableData[0]?.length || 0) <= 1) return; // Keep at least 1 column
    const deleteIdx = targetColIndex !== undefined ? targetColIndex : selectedElement.tableData[0].length - 1;
    const newData = selectedElement.tableData.map((row) => row.filter((_, idx) => idx !== deleteIdx));
    const newCols = newData[0].length;
    updateSelectedElement({
      tableData: newData,
      tableCols: newCols,
      width: Math.max(120, Math.round(selectedElement.width - 100)),
    });
    setSelectedTableCell((prev) => (prev && prev.col >= newCols ? { ...prev, col: newCols - 1 } : prev));
  };

  // ADD CHART ELEMENT
  const handleAddChart = () => {
    const id = `chart_${Date.now()}`;
    const newElement: CanvasElement = {
      id,
      type: 'chart',
      chartType: 'bar',
      chartTitle: 'Biểu đồ tiến độ thực tế',
      chartLabels: ['Tuần 1', 'Tuần 2', 'Tuần 3', 'Tuần 4'],
      chartValues: [45, 70, 85, 95],
      x: 230,
      y: 120,
      width: 500,
      height: 300,
      zIndex: canvasElements.length + 1,
    };
    updateCurrentSlideElements([...canvasElements, newElement]);
    setSelectedElementId(id);
  };

  // DELETE SELECTED ELEMENT
  const handleDeleteSelected = useCallback(() => {
    if (!selectedElementId) return;
    updateCurrentSlideElements(canvasElements.filter((el) => el.id !== selectedElementId));
    setSelectedElementId(null);
    setSelectedTableCell(null);
  }, [selectedElementId, canvasElements]);

  // DUPLICATE SELECTED ELEMENT
  const handleDuplicateSelected = useCallback(() => {
    if (!selectedElement) return;
    const cloned: CanvasElement = {
      ...selectedElement,
      id: `el_${Date.now()}`,
      x: Math.min(canvasWidth - selectedElement.width, selectedElement.x + 30),
      y: Math.min(canvasHeight - selectedElement.height, selectedElement.y + 30),
      zIndex: canvasElements.length + 1,
    };
    updateCurrentSlideElements([...canvasElements, cloned]);
    setSelectedElementId(cloned.id);
  }, [selectedElement, canvasElements, canvasWidth, canvasHeight]);

  // BRING FORWARD / SEND BACKWARD
  const handleLayerOrder = (direction: 'front' | 'back') => {
    if (!selectedElement) return;
    const newZ =
      direction === 'front'
        ? Math.max(...canvasElements.map((e) => e.zIndex || 1), 1) + 1
        : Math.max(1, Math.min(...canvasElements.map((e) => e.zIndex || 1), 1) - 1);
    updateSelectedElement({ zIndex: newZ });
  };

  // KEYBOARD SHORTCUTS
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        ['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) ||
        (e.target as HTMLElement).isContentEditable
      ) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId) {
          e.preventDefault();
          handleDeleteSelected();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicateSelected();
      } else if (e.key === 'Escape') {
        setSelectedElementId(null);
        setEditingTextId(null);
      } else if (selectedElement && ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        const step = e.shiftKey ? 10 : 2;
        let dx = 0;
        let dy = 0;
        if (e.key === 'ArrowUp') dy = -step;
        if (e.key === 'ArrowDown') dy = step;
        if (e.key === 'ArrowLeft') dx = -step;
        if (e.key === 'ArrowRight') dx = step;
        updateSelectedElement({
          x: Math.round(selectedElement.x + dx),
          y: Math.round(selectedElement.y + dy),
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElementId, selectedElement, handleDeleteSelected, handleDuplicateSelected]);

  // FULLSCREEN PRESENTATION KEYBOARD
  useEffect(() => {
    const handlePresentKeyDown = (e: KeyboardEvent) => {
      if (!isPresenting) return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
        setPresentingSlideIndex((prev) => Math.min(deck.slides.length - 1, prev + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setPresentingSlideIndex((prev) => Math.max(0, prev - 1));
      } else if (e.key === 'Escape') {
        setIsPresenting(false);
      }
    };
    window.addEventListener('keydown', handlePresentKeyDown);
    return () => window.removeEventListener('keydown', handlePresentKeyDown);
  }, [isPresenting, deck.slides.length]);

  // DRAG / RESIZE / ROTATE INTERACTION HANDLERS
  const handleElementMouseDown = (e: React.MouseEvent, element: CanvasElement) => {
    e.stopPropagation();
    setSelectedElementId(element.id);

    setInteractionState({
      mode: 'move',
      startX: e.clientX,
      startY: e.clientY,
      elementStart: {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        rotation: element.rotation || 0,
      },
    });
  };

  const handleResizeMouseDown = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (!selectedElement) return;

    setInteractionState({
      mode: 'resize',
      handle,
      startX: e.clientX,
      startY: e.clientY,
      elementStart: {
        x: selectedElement.x,
        y: selectedElement.y,
        width: selectedElement.width,
        height: selectedElement.height,
        rotation: selectedElement.rotation || 0,
      },
    });
  };

  const handleRotateMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!selectedElement) return;

    setInteractionState({
      mode: 'rotate',
      startX: e.clientX,
      startY: e.clientY,
      elementStart: {
        x: selectedElement.x,
        y: selectedElement.y,
        width: selectedElement.width,
        height: selectedElement.height,
        rotation: selectedElement.rotation || 0,
      },
    });
  };

  // GLOBAL POINTER HANDLERS
  useEffect(() => {
    if (interactionState.mode === 'none') return;

    const handlePointerMove = (clientX: number, clientY: number) => {
      if (!canvasRef.current || !selectedElement) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const scale = rect.width / canvasWidth;
      const dx = (clientX - interactionState.startX) / scale;
      const dy = (clientY - interactionState.startY) / scale;
      const { x, y, width, height } = interactionState.elementStart;

      if (interactionState.mode === 'move') {
        updateSelectedElement({
          x: Math.round(x + dx),
          y: Math.round(y + dy),
        });
      } else if (interactionState.mode === 'resize') {
        const handle = interactionState.handle;
        let newX = x;
        let newY = y;
        let newW = width;
        let newH = height;

        if (handle?.includes('e')) newW = Math.max(20, width + dx);
        if (handle?.includes('s')) newH = Math.max(20, height + dy);
        if (handle?.includes('w')) {
          newW = Math.max(20, width - dx);
          newX = x + (width - newW);
        }
        if (handle?.includes('n')) {
          newH = Math.max(20, height - dy);
          newY = y + (height - newH);
        }

        updateSelectedElement({
          x: Math.round(newX),
          y: Math.round(newY),
          width: Math.round(newW),
          height: Math.round(newH),
        });
      } else if (interactionState.mode === 'rotate') {
        const centerX = rect.left + (x + width / 2) * scale;
        const centerY = rect.top + (y + height / 2) * scale;
        const rad = Math.atan2(clientY - centerY, clientX - centerX);
        let deg = Math.round((rad * 180) / Math.PI) + 90;
        if (deg < 0) deg += 360;
        if (Math.abs(deg - 0) < 5 || Math.abs(deg - 360) < 5) deg = 0;
        if (Math.abs(deg - 90) < 5) deg = 90;
        if (Math.abs(deg - 180) < 5) deg = 180;
        if (Math.abs(deg - 270) < 5) deg = 270;

        updateSelectedElement({ rotation: deg });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      handlePointerMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      setInteractionState({
        mode: 'none',
        startX: 0,
        startY: 0,
        elementStart: { x: 0, y: 0, width: 0, height: 0, rotation: 0 },
      });
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interactionState, selectedElement]);

  // SAVE SLIDE (Requirement 2: Tự động tạo 1 file .ppt mới và thêm vào danh sách tài liệu ở Kho Lưu Trữ)
  const handleSaveDeck = () => {
    const updated: SlideDeck = {
      ...deck,
      lastModified: 'Vừa xong',
    };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teamup_presentation', JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save presentation to localStorage', e);
      }
    }
    onUpdateDeck(updated);

    // REQUIREMENT 2: Tự động tạo 1 file .ppt mới và thêm vào danh sách tài liệu ở Kho Lưu Trữ
    // Tên: tên slide + ".ppt", loại: PPT, người tạo: Linh, dung lượng ước tính
    // Thông báo: "Đã lưu vào Kho Lưu Trữ"
    const slideCount = deck.slides?.length || 1;
    const cleanTitle = (deck.title || 'Bai-Thuyet-Trinh-Nhom').trim();
    const fileName = cleanTitle.toLowerCase().endsWith('.ppt') ? cleanTitle : `${cleanTitle}.ppt`;
    const estimatedSize = `${(slideCount * 1.2 + 0.8).toFixed(1)} MB`;

    // Tạo HTML preview blob trực quan để khi xem trước trong Kho Lưu Trữ, iframe hiển thị slide hoàn hảo
    const slideHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<title>${fileName}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 0; padding: 24px; background: #0f172a; color: #f8fafc; }
  .deck-header { text-align: center; margin-bottom: 24px; }
  .deck-header h2 { margin: 0; font-size: 20px; color: #f59e0b; display: flex; align-items: center; justify-content: center; gap: 8px; }
  .deck-header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
  .slide-box { background: #ffffff; color: #1e293b; border-radius: 20px; padding: 36px; margin: 0 auto 28px; max-width: 840px; box-shadow: 0 12px 30px rgba(0,0,0,0.35); min-height: 420px; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #e2e8f0; }
  .slide-header { border-bottom: 2px solid #f1f5f9; padding-bottom: 16px; margin-bottom: 20px; }
  .slide-tag { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #d97706; background: #fef3c7; padding: 4px 10px; border-radius: 8px; display: inline-block; margin-bottom: 10px; }
  .slide-title { font-size: 28px; font-weight: 800; margin: 0; color: #0f172a; }
  .slide-sub { font-size: 15px; color: #64748b; margin-top: 6px; }
  .slide-content { flex: 1; font-size: 15px; line-height: 1.8; color: #334155; }
  .slide-footer { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #f1f5f9; padding-top: 14px; font-size: 12px; color: #94a3b8; }
</style>
</head>
<body>
<div class="deck-header">
  <h2>📊 Bài Thuyết Trình: ${cleanTitle}</h2>
  <p>Tệp trình chiếu Microsoft PowerPoint (.ppt) • Người tạo: Linh • ${slideCount} trang slide</p>
</div>
${deck.slides.map((s, idx) => `
  <div class="slide-box">
    <div class="slide-header">
      <div class="slide-tag">Trang ${idx + 1} / ${deck.slides.length}</div>
      <h1 class="slide-title">${s.title || `Trang trình chiếu số ${idx + 1}`}</h1>
      ${s.subtitle ? `<div class="slide-sub">${s.subtitle}</div>` : ''}
    </div>
    <div class="slide-content">
      ${s.bullets && s.bullets.length > 0 ? `<ul>${s.bullets.map(b => `<li>${b}</li>`).join('')}</ul>` : `<p>Nội dung trình chiếu trực quan thiết kế bởi TEAM UP Studio.</p>`}
    </div>
    <div class="slide-footer">
      <span>TEAM UP • Kho Lưu Trữ & Chia Sẻ</span>
      <span>Trang ${idx + 1}</span>
    </div>
  </div>
`).join('')}
</body>
</html>`;

    const blob = new Blob([slideHtml], { type: 'text/html' });
    const pptUrl = URL.createObjectURL(blob);

    const pptDoc: DocumentResource = {
      id: `doc_slide_${Date.now()}`,
      projectId: deck.projectId || 'proj_1',
      name: fileName,
      type: 'ppt',
      size: estimatedSize,
      uploaderName: 'Linh',
      uploaderAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      uploadedAt: 'Hôm nay',
      url: pptUrl,
      fileUrl: pptUrl,
      description: `Bản trình chiếu PPT được lưu tự động từ tab Tạo Slide (${slideCount} trang, ${estimatedSize}).`,
      tags: ['Slide PPT', 'Tạo Slide', 'Thuyết trình'],
    };

    if (onSaveToDocuments) {
      onSaveToDocuments(pptDoc);
    } else if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('teamup_documents');
        const list: DocumentResource[] = saved ? JSON.parse(saved) : [];
        localStorage.setItem('teamup_documents', JSON.stringify([pptDoc, ...list]));
      } catch (err) {
        console.error('Failed to sync slide to documents in localStorage', err);
      }
    }

    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  // =========================================================================
  // EXPORT HANDLERS WITH ACTIVE ASPECT RATIO PRESERVATION
  // =========================================================================
  const handleExportSlide = () => {
    setShowExportModal(true);
  };

  const handleBrowserPrint = () => {
    setShowExportModal(false);
    setTimeout(() => {
      window.print();
    }, 150);
  };

  const handleDownloadPng = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background
      ctx.fillStyle = currentSlide.backgroundColor || '#ffffff';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Render elements
      const elements = getSlideCanvasElements(currentSlide);
      elements.forEach((el) => {
        ctx.save();
        ctx.globalAlpha = el.opacity !== undefined ? el.opacity : 1;

        if (el.rotation) {
          ctx.translate(el.x + el.width / 2, el.y + el.height / 2);
          ctx.rotate((el.rotation * Math.PI) / 180);
          ctx.translate(-(el.x + el.width / 2), -(el.y + el.height / 2));
        }

        if (el.type === 'shape') {
          ctx.fillStyle = el.fillColor || '#4f46e5';
          if (el.shapeType === 'circle' || el.shapeType === 'oval') {
            ctx.beginPath();
            ctx.ellipse(el.x + el.width / 2, el.y + el.height / 2, el.width / 2, el.height / 2, 0, 0, 2 * Math.PI);
            ctx.fill();
            if (el.borderWidth && el.borderColor) {
              ctx.strokeStyle = el.borderColor;
              ctx.lineWidth = el.borderWidth;
              ctx.stroke();
            }
          } else {
            ctx.fillRect(el.x, el.y, el.width, el.height);
            if (el.borderWidth && el.borderColor) {
              ctx.strokeStyle = el.borderColor;
              ctx.lineWidth = el.borderWidth;
              ctx.strokeRect(el.x, el.y, el.width, el.height);
            }
          }
          if (el.shapeText) {
            ctx.fillStyle = el.shapeTextColor || '#ffffff';
            ctx.font = `${el.shapeFontSize || 16}px Inter, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(el.shapeText, el.x + el.width / 2, el.y + el.height / 2);
          }
        } else if (el.type === 'text') {
          ctx.fillStyle = el.color || '#000000';
          const weight = el.fontWeight || 'normal';
          const style = el.fontStyle === 'italic' ? 'italic' : 'normal';
          const fontSize = el.fontSize || 18;
          ctx.font = `${style} ${weight} ${fontSize}px ${el.fontFamily || 'Inter, sans-serif'}`;
          ctx.textAlign = (el.textAlign as CanvasTextAlign) || 'left';
          const lines = (el.text || '').split('\n');
          const lineHeight = fontSize * (el.lineHeight || 1.3);
          const textX = el.textAlign === 'center' ? el.x + el.width / 2 : el.textAlign === 'right' ? el.x + el.width : el.x;
          lines.forEach((line, idx) => {
            let displayLine = line;
            if (el.listType === 'disc') displayLine = `•  ${line}`;
            else if (el.listType === 'dash') displayLine = `-  ${line}`;
            else if (el.listType === 'arrow') displayLine = `→  ${line}`;
            else if (el.listType === 'decimal') displayLine = `${idx + 1}.  ${line}`;
            ctx.fillText(displayLine, textX, el.y + fontSize + idx * lineHeight);
          });
        } else if (el.type === 'sticker') {
          ctx.font = '48px sans-serif';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(el.text || '✨', el.x + el.width / 2, el.y + el.height / 2);
        } else if (el.type === 'table' && el.tableData) {
          const rows = el.tableData.length;
          const cols = el.tableData[0]?.length || 1;
          const cellW = el.width / cols;
          const cellH = el.height / rows;
          ctx.strokeStyle = el.tableBorderColor || '#cbd5e1';
          ctx.lineWidth = 1;
          for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
              const cellX = el.x + c * cellW;
              const cellY = el.y + r * cellH;
              if (r === 0) {
                ctx.fillStyle = el.tableHeaderBg || '#f1f5f9';
                ctx.fillRect(cellX, cellY, cellW, cellH);
              }
              ctx.strokeRect(cellX, cellY, cellW, cellH);
              const cellVal = el.tableData[r]?.[c] || '';
              ctx.fillStyle = '#1e293b';
              ctx.font = `${el.tableFontSize || 14}px Inter, sans-serif`;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'middle';
              ctx.fillText(cellVal, cellX + 8, cellY + cellH / 2);
            }
          }
        }
        ctx.restore();
      });

      const safeTitle = (deck.title || 'Slide').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9-]/g, '_');
      const filename = `${safeTitle}_slide_${activeSlideIndex + 1}_${aspectRatio.replace(':', 'x')}.png`;
      const link = document.createElement('a');
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
      setShowExportModal(false);
    } catch (err) {
      console.error('Lỗi khi xuất ảnh PNG:', err);
    }
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      const isLandscape = canvasWidth >= canvasHeight;
      const doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'px',
        format: [canvasWidth, canvasHeight],
        hotfixes: ['px_scaling'],
      });

      for (let i = 0; i < deck.slides.length; i++) {
        if (i > 0) {
          doc.addPage([canvasWidth, canvasHeight], isLandscape ? 'landscape' : 'portrait');
        }
        const slide = deck.slides[i];
        // Background
        doc.setFillColor(slide.backgroundColor || '#ffffff');
        doc.rect(0, 0, canvasWidth, canvasHeight, 'F');

        // Draw elements
        const elements = getSlideCanvasElements(slide);
        for (const el of elements) {
          try {
            if (el.type === 'shape') {
              doc.setFillColor(el.fillColor || '#4f46e5');
              if (el.borderWidth && el.borderColor) {
                doc.setDrawColor(el.borderColor);
                doc.setLineWidth(el.borderWidth);
              }
              if (el.shapeType === 'circle' || el.shapeType === 'oval') {
                const rx = el.width / 2;
                const ry = el.height / 2;
                doc.ellipse(el.x + rx, el.y + ry, rx, ry, el.borderWidth ? 'FD' : 'F');
              } else if (el.shapeType === 'triangle') {
                doc.triangle(
                  el.x + el.width / 2, el.y,
                  el.x, el.y + el.height,
                  el.x + el.width, el.y + el.height,
                  el.borderWidth ? 'FD' : 'F'
                );
              } else {
                doc.roundedRect(el.x, el.y, el.width, el.height, el.borderRadius || 0, el.borderRadius || 0, el.borderWidth ? 'FD' : 'F');
              }
              if (el.shapeText) {
                doc.setTextColor(el.shapeTextColor || '#ffffff');
                doc.setFontSize(el.shapeFontSize || 14);
                doc.text(el.shapeText, el.x + el.width / 2, el.y + el.height / 2, { align: 'center', baseline: 'middle' });
              }
            } else if (el.type === 'text') {
              doc.setTextColor(el.color || '#000000');
              const fontSize = el.fontSize || 16;
              doc.setFontSize(fontSize);
              const textLines = (el.text || '').split('\n');
              const lineHeight = fontSize * (el.lineHeight || 1.3);
              textLines.forEach((line, idx) => {
                let displayLine = line;
                if (el.listType === 'disc') displayLine = `• ${line}`;
                else if (el.listType === 'dash') displayLine = `- ${line}`;
                else if (el.listType === 'arrow') displayLine = `→ ${line}`;
                else if (el.listType === 'decimal') displayLine = `${idx + 1}. ${line}`;
                doc.text(displayLine, el.x, el.y + fontSize + idx * lineHeight);
              });
            } else if (el.type === 'image' && el.src) {
              try {
                doc.addImage(el.src, 'JPEG', el.x, el.y, el.width, el.height);
              } catch {
                // Ignore if CORS/format
              }
            } else if (el.type === 'sticker') {
              doc.setFontSize(36);
              doc.text(el.text || '✨', el.x + el.width / 2, el.y + el.height / 2, { align: 'center', baseline: 'middle' });
            } else if (el.type === 'table' && el.tableData) {
              const rows = el.tableData.length;
              const cols = el.tableData[0]?.length || 1;
              const cellW = el.width / cols;
              const cellH = el.height / rows;
              doc.setDrawColor(el.tableBorderColor || '#cbd5e1');
              doc.setLineWidth(1);
              for (let r = 0; r < rows; r++) {
                for (let c = 0; c < cols; c++) {
                  const cellX = el.x + c * cellW;
                  const cellY = el.y + r * cellH;
                  if (r === 0) {
                    doc.setFillColor(el.tableHeaderBg || '#f1f5f9');
                    doc.rect(cellX, cellY, cellW, cellH, 'FD');
                  } else {
                    doc.rect(cellX, cellY, cellW, cellH, 'S');
                  }
                  const cellVal = el.tableData[r]?.[c] || '';
                  doc.setTextColor('#1e293b');
                  doc.setFontSize(el.tableFontSize || 12);
                  doc.text(cellVal, cellX + 6, cellY + cellH / 2 + 4);
                }
              }
            }
          } catch (elErr) {
            console.warn('PDF element render warning:', elErr);
          }
        }
      }

      const safeTitle = (deck.title || 'Presentation').replace(/[^a-zA-Z0-9_\u00C0-\u024F\u1EA0-\u1EF9-]/g, '_');
      doc.save(`${safeTitle}_${aspectRatio.replace(':', 'x')}.pdf`);
      setShowExportModal(false);
    } catch (err) {
      console.error('Lỗi khi xuất PDF:', err);
      window.print();
    } finally {
      setIsExportingPdf(false);
    }
  };

  // =========================================================================
  // RENDER CANVAS ELEMENT
  // =========================================================================
  const renderElement = (el: CanvasElement, isMiniature = false) => {
    const isSelected = !isMiniature && selectedElementId === el.id;
    const isEditingText = !isMiniature && editingTextId === el.id;

    const containerStyle: React.CSSProperties = {
      position: 'absolute',
      left: `${el.x}px`,
      top: `${el.y}px`,
      width: `${el.width}px`,
      height: `${el.height}px`,
      transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
      zIndex: el.zIndex || 1,
      opacity: el.opacity !== undefined ? el.opacity : 1,
      cursor: isMiniature ? 'default' : 'move',
      userSelect: isEditingText ? 'text' : 'none',
      boxSizing: 'border-box',
    };

    return (
      <div
        key={el.id}
        style={containerStyle}
        onMouseDown={(e) => !isMiniature && handleElementMouseDown(e, el)}
        onClick={(e) => {
          if (!isMiniature) {
            e.stopPropagation();
            setSelectedElementId(el.id);
            if (el.type === 'chart') {
              focusChartInspector();
            }
            if (el.type === 'text') {
              setEditingTextId(el.id);
            }
          }
        }}
        className={`group transition-shadow ${
          isSelected
            ? 'ring-2 ring-indigo-500 ring-offset-1 shadow-md'
            : isMiniature
            ? ''
            : 'hover:ring-1 hover:ring-indigo-300'
        }`}
      >
        {/* 1. TEXT ELEMENT: Real textarea with direct typing, Vietnamese IME, Backspace, Selection, & Floating Mini-Toolbar */}
        {el.type === 'text' && (
          <div className="w-full h-full relative flex flex-col justify-center">
            {/* FLOATING FORMATTING MINI-TOOLBAR (Requirement 3) */}
            {isSelected && !isMiniature && (
              <div
                className={`absolute left-0 flex items-center gap-1 sm:gap-1.5 p-1.5 bg-slate-900/95 text-white backdrop-blur-md rounded-2xl shadow-2xl border border-slate-700/80 z-50 text-xs select-none pointer-events-auto whitespace-nowrap ${
                  el.y < 70 ? 'top-full mt-3' : '-top-14'
                }`}
                onMouseDown={(e) => e.stopPropagation()}
              >
                {/* Drag Handle button */}
                <div
                  className="flex items-center gap-1 px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white rounded-lg cursor-grab active:cursor-grabbing transition-colors"
                  onMouseDown={(e) => handleElementMouseDown(e, el)}
                  title="Giữ và kéo để di chuyển vị trí"
                >
                  <GripVertical className="w-3.5 h-3.5" />
                  <span className="text-[10px] font-bold">Kéo</span>
                </div>

                <div className="h-4 w-px bg-slate-700 mx-0.5" />

                {/* Font Selector */}
                <select
                  value={el.fontFamily || 'Inter, sans-serif'}
                  onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                  className="bg-slate-800 text-white text-[11px] font-medium rounded-lg px-2 py-1 border border-slate-700 focus:outline-hidden cursor-pointer max-w-[120px] truncate"
                  title="Đổi phông chữ"
                >
                  {FONT_OPTIONS.map((f, i) => (
                    <option key={i} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </option>
                  ))}
                </select>

                {/* Font Size decrease / increase */}
                <div className="flex items-center gap-0.5 bg-slate-800 rounded-lg px-1 py-0.5 border border-slate-700">
                  <button
                    type="button"
                    onClick={() => handleStepFontSize(-2)}
                    className="p-1 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white cursor-pointer"
                    title="Giảm cỡ chữ (-2)"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-bold text-[11px] text-white">
                    {el.fontSize || 20}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleStepFontSize(2)}
                    className="p-1 hover:bg-slate-700 rounded-md text-slate-300 hover:text-white cursor-pointer"
                    title="Tăng cỡ chữ (+2)"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="h-4 w-px bg-slate-700 mx-0.5" />

                {/* Bold */}
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedElement({
                      fontWeight: el.fontWeight === 'bold' ? 'normal' : 'bold',
                    })
                  }
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    el.fontWeight === 'bold'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="In đậm (Bold)"
                >
                  <Bold className="w-3.5 h-3.5" />
                </button>

                {/* Italic */}
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedElement({
                      fontStyle: el.fontStyle === 'italic' ? 'normal' : 'italic',
                    })
                  }
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    el.fontStyle === 'italic'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="In nghiêng (Italic)"
                >
                  <Italic className="w-3.5 h-3.5" />
                </button>

                {/* Underline */}
                <button
                  type="button"
                  onClick={() =>
                    updateSelectedElement({
                      textDecoration: el.textDecoration === 'underline' ? 'none' : 'underline',
                    })
                  }
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    el.textDecoration === 'underline'
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Gạch chân (Underline)"
                >
                  <Underline className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-700 mx-0.5" />

                {/* Text Alignment */}
                <button
                  type="button"
                  onClick={() => updateSelectedElement({ textAlign: 'left' })}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    (el.textAlign || 'left') === 'left'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Căn trái"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedElement({ textAlign: 'center' })}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    el.textAlign === 'center'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Căn giữa"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => updateSelectedElement({ textAlign: 'right' })}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    el.textAlign === 'right'
                      ? 'bg-indigo-600 text-white'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  title="Căn phải"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>

                <div className="h-4 w-px bg-slate-700 mx-0.5" />

                {/* NÚT ĐẦU DÒNG VỚI MENU CHỌN 4 KIỂU (YÊU CẦU: KHÔNG MẶC ĐỊNH, CHỦ ĐỘNG CHỌN 4 KIỂU) */}
                <div className="relative">
                  <button
                    id="btn-floating-list-style"
                    type="button"
                    onClick={() => setOpenListMenuId(openListMenuId === el.id ? null : el.id)}
                    className={`flex items-center gap-1 px-2 py-1 rounded-lg transition-colors cursor-pointer ${
                      el.listType && el.listType !== 'none'
                        ? 'bg-indigo-600 text-white font-bold'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    title="Chọn kiểu đầu dòng: Dấu chấm •, Gạch ngang -, Mũi tên →, Số thứ tự 1. 2. 3."
                  >
                    {el.listType === 'decimal' ? (
                      <ListOrdered className="w-3.5 h-3.5" />
                    ) : (
                      <List className="w-3.5 h-3.5" />
                    )}
                    <span className="text-[10px] hidden sm:inline">Đầu dòng</span>
                    <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                  </button>

                  {openListMenuId === el.id && (
                    <div
                      className="absolute left-0 top-full mt-2 w-60 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-2 z-50 text-xs animate-in fade-in"
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1 flex items-center justify-between">
                        <span>Kiểu đầu dòng</span>
                        <span className="text-[9px] text-indigo-400 font-semibold">4 kiểu</span>
                      </div>

                      {/* 0. Văn bản thường (Không có đầu dòng) */}
                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedElement({ listType: 'none' });
                          setOpenListMenuId(null);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          !el.listType || el.listType === 'none'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Type className="w-3.5 h-3.5 text-slate-400" />
                          <span>Văn bản thường</span>
                        </span>
                        {(!el.listType || el.listType === 'none') && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>

                      {/* 1. Dấu chấm tròn • */}
                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedElement({ listType: 'disc' });
                          setOpenListMenuId(null);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          el.listType === 'disc'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-center font-black text-sm text-indigo-400">•</span>
                          <span>Dấu chấm tròn •</span>
                        </span>
                        {el.listType === 'disc' && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>

                      {/* 2. Dấu gạch ngang - */}
                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedElement({ listType: 'dash' });
                          setOpenListMenuId(null);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          el.listType === 'dash'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-center font-black text-sm text-indigo-400">-</span>
                          <span>Dấu gạch ngang -</span>
                        </span>
                        {el.listType === 'dash' && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>

                      {/* 3. Dấu mũi tên → */}
                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedElement({ listType: 'arrow' });
                          setOpenListMenuId(null);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          el.listType === 'arrow'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-center font-black text-sm text-indigo-400">→</span>
                          <span>Dấu mũi tên →</span>
                        </span>
                        {el.listType === 'arrow' && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>

                      {/* 4. Số thứ tự 1. 2. 3. */}
                      <button
                        type="button"
                        onClick={() => {
                          updateSelectedElement({ listType: 'decimal' });
                          setOpenListMenuId(null);
                        }}
                        className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                          el.listType === 'decimal'
                            ? 'bg-indigo-600 text-white font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <span className="w-4 text-center font-mono font-bold text-xs text-indigo-400">1.</span>
                          <span>Số thứ tự 1. 2. 3.</span>
                        </span>
                        {el.listType === 'decimal' && <Check className="w-3.5 h-3.5 shrink-0" />}
                      </button>
                    </div>
                  )}
                </div>

                <div className="h-4 w-px bg-slate-700 mx-0.5" />

                {/* Color Picker Button: opens dedicated modal with rainbow slider, 2D circle drag, #12290F, and Apply button */}
                <button
                  type="button"
                  onClick={() => openColorPicker(el)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 cursor-pointer border border-slate-700 transition-colors"
                  title="Mở bảng chọn màu chữ chuyên nghiệp (thanh cầu vồng, kéo chấm tròn)"
                >
                  <span
                    className="w-3.5 h-3.5 rounded-full border border-white/50 shadow-xs shrink-0"
                    style={{ backgroundColor: el.color || '#12290F' }}
                  />
                  <span className="text-[10px] text-slate-300 font-mono uppercase font-bold">
                    {el.color || '#12290F'}
                  </span>
                </button>

                <div className="h-4 w-px bg-slate-700 mx-0.5" />

                {/* Duplicate & Delete */}
                <button
                  type="button"
                  onClick={handleDuplicateSelected}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer"
                  title="Nhân bản (Ctrl+D)"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/60 rounded-lg cursor-pointer"
                  title="Xóa ô văn bản (Delete)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Top Drag Indicator Pill when Selected */}
            {isSelected && !isMiniature && (
              <div
                className="absolute -top-3.5 left-2 px-2 py-0.5 rounded-md bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-bold flex items-center gap-1 cursor-grab active:cursor-grabbing shadow-sm z-30 select-none transition-colors"
                onMouseDown={(e) => handleElementMouseDown(e, el)}
                title="Giữ và kéo để di chuyển vị trí trên slide"
              >
                <GripVertical className="w-2.5 h-2.5" />
                <span>Kéo di chuyển</span>
              </div>
            )}

            {/* RENDER NỘI DUNG VĂN BẢN TRÊN CANVAS: HỖ TRỢ <ul> <li> HOẶC TEXTAREA THƯỜNG */}
            {el.listType && el.listType !== 'none' ? (
              isMiniature ? (
                el.listType === 'decimal' ? (
                  <ol
                    className="teamup-list-decimal w-full h-full p-1 overflow-hidden"
                    style={{
                      fontFamily: el.fontFamily || 'Inter, sans-serif',
                      fontSize: `${el.fontSize || 20}px`,
                      fontWeight: el.fontWeight || 'normal',
                      fontStyle: el.fontStyle || 'normal',
                      color: el.color || '#000000',
                      textAlign: el.textAlign || 'left',
                      lineHeight: el.lineHeight || 1.3,
                    }}
                  >
                    {(el.text || '').split('\n').map((l, i) => (
                      <li key={i} className="truncate">{l || '\u00A0'}</li>
                    ))}
                  </ol>
                ) : (
                  <ul
                    className={
                      el.listType === 'disc'
                        ? 'teamup-list-disc w-full h-full p-1 overflow-hidden'
                        : el.listType === 'dash'
                        ? 'teamup-list-dash w-full h-full p-1 overflow-hidden'
                        : 'teamup-list-arrow w-full h-full p-1 overflow-hidden'
                    }
                    style={{
                      fontFamily: el.fontFamily || 'Inter, sans-serif',
                      fontSize: `${el.fontSize || 20}px`,
                      fontWeight: el.fontWeight || 'normal',
                      fontStyle: el.fontStyle || 'normal',
                      color: el.color || '#000000',
                      textAlign: el.textAlign || 'left',
                      lineHeight: el.lineHeight || 1.3,
                    }}
                  >
                    {(el.text || '').split('\n').map((l, i) => (
                      <li key={i} className="truncate">{l || '\u00A0'}</li>
                    ))}
                  </ul>
                )
              ) : (
                <ListCanvasTextElement
                  element={el}
                  isSelected={isSelected}
                  onUpdateText={updateElementText}
                  onSelect={() => {
                    setSelectedElementId(el.id);
                    setEditingTextId(el.id);
                  }}
                  onBlur={handleTextBlur}
                />
              )
            ) : isMiniature ? (
              <div
                style={{
                  fontFamily: el.fontFamily || 'Inter, sans-serif',
                  fontSize: `${el.fontSize || 20}px`,
                  fontWeight: el.fontWeight || 'normal',
                  fontStyle: el.fontStyle || 'normal',
                  textDecoration: el.textDecoration || 'none',
                  color: el.color || '#000000',
                  textAlign: el.textAlign || 'left',
                  lineHeight: el.lineHeight || 1.3,
                  whiteSpace: 'pre-wrap',
                }}
                className="w-full h-full p-1 truncate"
              >
                {el.text || ''}
              </div>
            ) : (
              <textarea
                ref={(ref) => {
                  textInputRefs.current[el.id] = ref;
                }}
                value={el.text !== undefined ? el.text : ''}
                placeholder="Nhập nội dung văn bản..."
                className="w-full h-full placeholder:text-slate-400 dark:placeholder:text-slate-500 placeholder:opacity-60 placeholder:font-normal placeholder:not-italic"
                onChange={(e) => updateElementText(el.id, e.target.value)}
                onFocus={() => {
                  setSelectedElementId(el.id);
                  setEditingTextId(el.id);
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedElementId(el.id);
                  setEditingTextId(el.id);
                }}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setSelectedElementId(el.id);
                  setEditingTextId(el.id);
                }}
                onBlur={handleTextBlur}
                spellCheck={false}
                style={{
                  width: '100%',
                  height: '100%',
                  fontFamily: el.fontFamily || 'Inter, sans-serif',
                  fontSize: `${el.fontSize || 20}px`,
                  fontWeight: el.fontWeight || 'normal',
                  fontStyle: el.fontStyle || 'normal',
                  textDecoration: el.textDecoration || 'none',
                  color: el.color || '#000000',
                  backgroundColor: el.backgroundColor || 'transparent',
                  textAlign: el.textAlign || 'left',
                  lineHeight: el.lineHeight || 1.3,
                  letterSpacing: `${el.letterSpacing || 0}px`,
                  resize: 'none',
                  border: 'none',
                  outline: 'none',
                  padding: '6px',
                  margin: 0,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                  cursor: 'text',
                }}
              />
            )}
          </div>
        )}

        {/* 2. IMAGE ELEMENT */}
        {el.type === 'image' && (
          <img
            src={el.src}
            alt={el.alt || 'Slide asset'}
            style={{
              width: '100%',
              height: '100%',
              objectFit: el.objectFit || 'cover',
              borderRadius: `${el.borderRadius || 0}px`,
              border: el.borderWidth ? `${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor || '#cbd5e1'}` : 'none',
              boxShadow: el.shadow ? '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)' : 'none',
            }}
            draggable={false}
          />
        )}

        {/* 3. SHAPE, ARROW & CALLOUT ELEMENT */}
        {el.type === 'shape' && (
          <div className="w-full h-full relative flex items-center justify-center">
            {/* Basic Shapes */}
            {(!el.shapeType || el.shapeType === 'rectangle' || el.shapeType === 'rounded-rect' || el.shapeType === 'square') && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: el.fillColor || '#6366f1',
                  borderRadius: el.shapeType === 'rounded-rect' ? `${el.borderRadius || 20}px` : '0px',
                  border: el.borderWidth ? `${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor || '#4f46e5'}` : 'none',
                  boxShadow: el.shadow ? '0 10px 25px -5px rgba(0,0,0,0.15)' : 'none',
                }}
              />
            )}
            {el.shapeType === 'circle' && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: el.fillColor || '#6366f1',
                  borderRadius: '50%',
                  border: el.borderWidth ? `${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor || '#4f46e5'}` : 'none',
                  boxShadow: el.shadow ? '0 10px 25px -5px rgba(0,0,0,0.15)' : 'none',
                }}
              />
            )}
            {el.shapeType === 'oval' && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: el.fillColor || '#6366f1',
                  borderRadius: '50% / 50%',
                  border: el.borderWidth ? `${el.borderWidth}px ${el.borderStyle || 'solid'} ${el.borderColor || '#4f46e5'}` : 'none',
                  boxShadow: el.shadow ? '0 10px 25px -5px rgba(0,0,0,0.15)' : 'none',
                }}
              />
            )}
            {el.shapeType === 'triangle' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="50,5 95,95 5,95"
                  fill={el.fillColor || '#6366f1'}
                  stroke={el.borderColor || '#4f46e5'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'right-triangle' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="5,5 95,95 5,95"
                  fill={el.fillColor || '#6366f1'}
                  stroke={el.borderColor || '#4f46e5'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'diamond' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="50,5 95,50 50,95 5,50"
                  fill={el.fillColor || '#6366f1'}
                  stroke={el.borderColor || '#4f46e5'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'pentagon' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="50,5 95,38 78,95 22,95 5,38"
                  fill={el.fillColor || '#6366f1'}
                  stroke={el.borderColor || '#4f46e5'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'hexagon' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="50,5 95,25 95,75 50,95 5,75 5,25"
                  fill={el.fillColor || '#6366f1'}
                  stroke={el.borderColor || '#4f46e5'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'star' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="50,5 64,36 98,36 70,57 81,91 50,70 19,91 30,57 2,36 36,36"
                  fill={el.fillColor || '#f59e0b'}
                  stroke={el.borderColor || '#d97706'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'heart' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <path
                  d="M50,85 C50,85 10,55 10,30 C10,15 25,10 35,15 C45,20 50,30 50,30 C50,30 55,20 65,15 C75,10 90,15 90,30 C90,55 50,85 50,85 Z"
                  fill={el.fillColor || '#ec4899'}
                  stroke={el.borderColor || '#db2777'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'line' && (
              <div
                style={{
                  width: '100%',
                  height: `${Math.max(2, el.height)}px`,
                  backgroundColor: el.fillColor || '#4f46e5',
                  borderRadius: '2px',
                }}
              />
            )}

            {/* Arrows */}
            {el.shapeType === 'arrow' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="5,35 60,35 60,15 95,50 60,85 60,65 5,65"
                  fill={el.fillColor || '#10b981'}
                  stroke={el.borderColor || '#059669'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'arrow-left' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="95,35 40,35 40,15 5,50 40,85 40,65 95,65"
                  fill={el.fillColor || '#10b981'}
                  stroke={el.borderColor || '#059669'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'arrow-up' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="35,95 35,40 15,40 50,5 85,40 65,40 65,95"
                  fill={el.fillColor || '#10b981'}
                  stroke={el.borderColor || '#059669'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'arrow-down' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="35,5 35,60 15,60 50,95 85,60 65,60 65,5"
                  fill={el.fillColor || '#10b981'}
                  stroke={el.borderColor || '#059669'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'arrow-double' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="25,20 5,50 25,80 25,60 75,60 75,80 95,50 75,20 75,40 25,40"
                  fill={el.fillColor || '#10b981'}
                  stroke={el.borderColor || '#059669'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'arrow-chevron' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="5,5 75,5 95,50 75,95 5,95 25,50"
                  fill={el.fillColor || '#3b82f6'}
                  stroke={el.borderColor || '#1d4ed8'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}
            {el.shapeType === 'arrow-curved' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <path
                  d="M10,85 C10,35 45,20 70,20 L70,5 L95,30 L70,55 L70,40 C45,40 30,55 30,85 Z"
                  fill={el.fillColor || '#10b981'}
                  stroke={el.borderColor || '#059669'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}

            {/* Callouts */}
            {el.shapeType === 'speech-bubble' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <path
                  d="M10,15 Q10,5 20,5 L80,5 Q90,5 90,15 L90,65 Q90,75 80,75 L35,75 L15,95 L20,75 L10,75 Q10,75 10,65 Z"
                  fill={el.fillColor || '#ffffff'}
                  stroke={el.borderColor || '#6366f1'}
                  strokeWidth={el.borderWidth || 2}
                />
              </svg>
            )}
            {el.shapeType === 'thought-bubble' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <path
                  d="M30,20 Q15,20 15,35 Q10,50 25,60 Q35,75 55,70 Q75,75 85,60 Q95,45 85,30 Q75,15 55,20 Q40,15 30,20 Z"
                  fill={el.fillColor || '#ffffff'}
                  stroke={el.borderColor || '#6366f1'}
                  strokeWidth={el.borderWidth || 2}
                />
                <circle cx="20" cy="80" r="4" fill={el.fillColor || '#ffffff'} stroke={el.borderColor || '#6366f1'} strokeWidth={el.borderWidth || 2} />
                <circle cx="12" cy="90" r="2.5" fill={el.fillColor || '#ffffff'} stroke={el.borderColor || '#6366f1'} strokeWidth={el.borderWidth || 2} />
              </svg>
            )}
            {el.shapeType === 'callout-box' && (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  backgroundColor: el.fillColor || '#ffffff',
                  border: `${el.borderWidth || 2}px solid ${el.borderColor || '#6366f1'}`,
                  borderRadius: '12px',
                  boxShadow: '0 8px 20px -4px rgba(99, 102, 241, 0.2)',
                }}
              />
            )}
            {el.shapeType === 'banner' && (
              <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="none">
                <polygon
                  points="5,20 95,20 85,50 95,80 5,80 15,50"
                  fill={el.fillColor || '#f59e0b'}
                  stroke={el.borderColor || '#d97706'}
                  strokeWidth={el.borderWidth || 0}
                />
              </svg>
            )}

            {/* Optional Shape Text / Callout Text */}
            {el.shapeText !== undefined && (
              <div
                className="absolute inset-0 flex items-center justify-center p-3 text-center pointer-events-none"
                style={{
                  color: el.shapeTextColor || '#0f172a',
                  fontSize: `${el.shapeFontSize || 15}px`,
                  fontWeight: 'bold',
                  wordBreak: 'break-word',
                }}
              >
                {el.shapeText}
              </div>
            )}
          </div>
        )}

        {/* 4. ICON ELEMENT: Exact absolute 100% fit, no transforms/margins, perfectly matches purple selection box */}
        {el.type === 'icon' && (
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: '100%',
              height: '100%',
              margin: 0,
              padding: 0,
              transform: 'none',
              color: el.color || '#4f46e5',
            }}
            className="w-full h-full select-none pointer-events-none"
          >
            {(() => {
              const svgProps = {
                width: '100%',
                height: '100%',
                style: {
                  position: 'absolute' as const,
                  left: 0,
                  top: 0,
                  width: '100%',
                  height: '100%',
                  margin: 0,
                  padding: 0,
                  transform: 'none',
                  display: 'block',
                },
              };

              switch (el.iconName) {
                case 'star':
                  return <StarIcon {...svgProps} className="w-full h-full fill-current block" />;
                case 'heart':
                  return <HeartIcon {...svgProps} className="w-full h-full fill-current block" />;
                case 'sparkles':
                  return <Sparkles {...svgProps} className="w-full h-full block" />;
                case 'award':
                  return <Award {...svgProps} className="w-full h-full block" />;
                case 'trophy':
                  return <Trophy {...svgProps} className="w-full h-full block" />;
                case 'target':
                  return <Target {...svgProps} className="w-full h-full block" />;
                case 'flame':
                  return <Flame {...svgProps} className="w-full h-full block" />;
                case 'zap':
                  return <Zap {...svgProps} className="w-full h-full block" />;
                case 'thumbs-up':
                  return <ThumbsUp {...svgProps} className="w-full h-full block" />;
                case 'check-circle':
                  return <CheckCircle2 {...svgProps} className="w-full h-full block" />;
                case 'book-open':
                  return <BookOpen {...svgProps} className="w-full h-full block" />;
                case 'graduation-cap':
                  return <GraduationCap {...svgProps} className="w-full h-full block" />;
                case 'laptop':
                  return <Laptop {...svgProps} className="w-full h-full block" />;
                case 'smartphone':
                  return <Smartphone {...svgProps} className="w-full h-full block" />;
                case 'users':
                  return <Users {...svgProps} className="w-full h-full block" />;
                case 'message-square':
                  return <MessageSquare {...svgProps} className="w-full h-full block" />;
                case 'calendar':
                  return <Calendar {...svgProps} className="w-full h-full block" />;
                case 'clock':
                  return <Clock {...svgProps} className="w-full h-full block" />;
                case 'briefcase':
                  return <Briefcase {...svgProps} className="w-full h-full block" />;
                case 'smile':
                default:
                  return <Smile {...svgProps} className="w-full h-full block" />;
              }
            })()}
          </div>
        )}

        {/* 4b. STICKER ELEMENT */}
        {el.type === 'sticker' && (
          <div
            className={`w-full h-full flex flex-col items-center justify-center select-none ${
              el.isAnimated ? `anim-sticker-${el.animationEffect || 'pulse'}` : ''
            }`}
          >
            <div className="w-full h-full flex flex-col items-center justify-center p-2 rounded-2xl bg-white/90 dark:bg-slate-800/90 shadow-md border border-slate-200/60 dark:border-slate-700/60">
              <span className="text-4xl sm:text-5xl drop-shadow-sm">{el.text || '⭐'}</span>
              {el.stickerLabel && (
                <span
                  style={{ color: el.color || '#4f46e5' }}
                  className="text-xs font-black uppercase tracking-wider mt-1 text-center truncate max-w-full"
                >
                  {el.stickerLabel}
                </span>
              )}
              {el.isAnimated && (
                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300 mt-0.5">
                  ĐỘNG
                </span>
              )}
            </div>
          </div>
        )}

        {/* 5. TABLE ELEMENT (Completely empty cells, light header #f5f5f5, gray borders, instant autofocus) */}
        {el.type === 'table' && (
          <div className="w-full h-full overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md flex flex-col justify-start">
            <table className="w-full h-full text-slate-800 dark:text-slate-100 border-collapse table-fixed">
              <tbody>
                {el.tableData?.map((row, rIdx) => (
                  <tr
                    key={rIdx}
                    className={
                      rIdx === 0
                        ? 'font-semibold'
                        : rIdx % 2 === 1
                        ? 'bg-slate-50/50 dark:bg-slate-800/40'
                        : 'bg-white dark:bg-slate-900'
                    }
                    style={rIdx === 0 ? { backgroundColor: el.tableHeaderBg || '#f5f5f5' } : undefined}
                  >
                    {row.map((cell, cIdx) => {
                      const cellKey = `${rIdx}-${cIdx}`;
                      const cellStyle = el.tableCellStyles?.[cellKey];
                      const isCellActive =
                        !isMiniature &&
                        selectedTableCell?.row === rIdx &&
                        selectedTableCell?.col === cIdx &&
                        isSelected;

                      return (
                        <td
                          key={cIdx}
                          onClick={(e) => {
                            if (!isMiniature) {
                              e.stopPropagation();
                              setSelectedElementId(el.id);
                              setSelectedTableCell({ row: rIdx, col: cIdx });
                              const inp = document.getElementById(`table-cell-input-${el.id}-${rIdx}-${cIdx}`);
                              if (inp) {
                                inp.focus();
                              }
                            }
                          }}
                          style={{
                            fontSize: `${el.tableFontSize || 14}px`,
                            fontWeight: cellStyle?.bold !== undefined ? (cellStyle.bold ? 'bold' : 'normal') : rIdx === 0 ? '600' : 'normal',
                            fontStyle: cellStyle?.italic ? 'italic' : 'normal',
                            color: cellStyle?.color || '#0f172a',
                            backgroundColor: cellStyle?.bg,
                            textAlign: cellStyle?.align || 'left',
                          }}
                          className={`p-2 border border-slate-300 dark:border-slate-700 transition-colors relative cursor-text ${
                            isCellActive ? 'ring-2 ring-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/60' : ''
                          }`}
                        >
                          {isMiniature ? (
                            <div className="truncate min-h-[16px]">{cell || '\u00A0'}</div>
                          ) : (
                            <input
                              id={`table-cell-input-${el.id}-${rIdx}-${cIdx}`}
                              type="text"
                              value={cell}
                              placeholder=""
                              autoFocus={isCellActive}
                              onPointerDown={(e) => e.stopPropagation()}
                              onMouseDown={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdateTableCell(rIdx, cIdx, e.target.value)}
                              className="w-full h-full min-h-[26px] bg-transparent border-0 outline-none p-0 text-inherit font-inherit cursor-text"
                            />
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* 6. CHART ELEMENT (Bar, Pie, Line with live updates & colors) */}
        {el.type === 'chart' && (() => {
          const chartType = el.chartType || 'bar';
          const labels = el.chartLabels && el.chartLabels.length > 0 ? el.chartLabels : ['Mục 1', 'Mục 2', 'Mục 3'];
          const values = el.chartValues && el.chartValues.length > 0 ? el.chartValues : [40, 70, 85];
          const primaryColor = el.color || '#4f46e5';
          const palette = [
            primaryColor,
            '#06b6d4',
            '#10b981',
            '#f59e0b',
            '#ec4899',
            '#8b5cf6',
            '#3b82f6',
            '#f97316',
          ];

          return (
            <div className="w-full h-full bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-4 flex flex-col justify-between overflow-hidden select-none">
              {/* Chart Title */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs sm:text-sm font-extrabold text-slate-800 dark:text-slate-100 truncate">
                  {el.chartTitle || 'Thống Kê Dữ Liệu'}
                </span>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {chartType === 'pie' ? 'Tròn' : chartType === 'line' ? 'Đường' : 'Cột'}
                  </span>
                  {!isMiniature && (
                    <button
                      id={`btn-edit-chart-${el.id}`}
                      type="button"
                      onPointerDown={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedElementId(el.id);
                        focusChartInspector();
                      }}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                      title="Nhấn để mở ngay bảng chỉnh sửa số liệu và màu sắc ở bên phải"
                    >
                      ✏️ Sửa số liệu bên phải ➔
                    </button>
                  )}
                </div>
              </div>

              {/* Chart Body */}
              <div className="flex-1 w-full pt-3 flex items-center justify-center min-h-0">
                {/* 1. BAR CHART */}
                {chartType === 'bar' && (() => {
                  const maxVal = Math.max(...values, 10);
                  return (
                    <div className="w-full h-full flex flex-col justify-end">
                      {/* Grid background lines */}
                      <div className="flex-1 w-full flex items-end justify-between gap-2 sm:gap-4 relative pt-4 pb-1">
                        <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-20">
                          <div className="border-b border-slate-400 w-full" />
                          <div className="border-b border-slate-400 w-full" />
                          <div className="border-b border-slate-400 w-full" />
                        </div>
                        {values.map((val, idx) => {
                          const heightPct = Math.max(8, Math.min(100, Math.round((val / maxVal) * 100)));
                          const barColor = (el.chartColors && el.chartColors[idx]) || palette[idx % palette.length];
                          return (
                            <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end z-10">
                              <span className="text-[11px] font-mono font-bold text-slate-700 dark:text-slate-300">
                                {val}
                              </span>
                              <div
                                style={{
                                  height: `${heightPct}%`,
                                  backgroundColor: barColor,
                                }}
                                className="w-full max-w-[50px] rounded-t-lg shadow-sm transition-all duration-300 hover:brightness-110"
                              />
                            </div>
                          );
                        })}
                      </div>
                      {/* X-axis labels */}
                      <div className="flex items-center justify-between gap-2 sm:gap-4 pt-1.5 border-t border-slate-200 dark:border-slate-700">
                        {labels.map((lbl, idx) => (
                          <span key={idx} className="flex-1 text-[10px] sm:text-[11px] font-semibold text-slate-500 dark:text-slate-400 truncate text-center">
                            {lbl}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 2. PIE CHART */}
                {chartType === 'pie' && (() => {
                  const total = values.reduce((sum, v) => sum + (v > 0 ? v : 0), 0) || 1;
                  let currentAngle = -90;
                  const slices = values.map((val, idx) => {
                    const validVal = Math.max(0, val);
                    const pct = validVal / total;
                    const angle = pct * 360;
                    const startAngle = currentAngle;
                    const endAngle = currentAngle + angle;
                    currentAngle = endAngle;

                    const r = 75;
                    const cx = 90;
                    const cy = 90;

                    const rad1 = (startAngle * Math.PI) / 180;
                    const rad2 = (endAngle * Math.PI) / 180;
                    const x1 = cx + r * Math.cos(rad1);
                    const y1 = cy + r * Math.sin(rad1);
                    const x2 = cx + r * Math.cos(rad2);
                    const y2 = cy + r * Math.sin(rad2);

                    const largeArc = angle > 180 ? 1 : 0;
                    const pathData =
                      angle >= 359.9
                        ? `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy}`
                        : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

                    return {
                      pathData,
                      color: palette[idx % palette.length],
                      val: validVal,
                      pct: Math.round(pct * 100),
                      label: labels[idx] || `Mục ${idx + 1}`,
                    };
                  });

                  return (
                    <div className="w-full h-full flex items-center justify-between gap-4">
                      {/* SVG Pie Chart with inner cutout */}
                      <div className="relative shrink-0 flex items-center justify-center">
                        <svg viewBox="0 0 180 180" className="w-36 h-36 sm:w-44 sm:h-44">
                          {slices.map((sl, sIdx) => (
                            <path
                              key={sIdx}
                              d={sl.pathData}
                              fill={sl.color}
                              stroke="#ffffff"
                              strokeWidth="1.5"
                              className="transition-all duration-300 hover:opacity-90"
                            />
                          ))}
                          <circle cx="90" cy="90" r="38" className="fill-white dark:fill-slate-900" />
                        </svg>
                      </div>

                      {/* Legend */}
                      <div className="flex-1 max-h-48 overflow-y-auto space-y-1.5 pl-2">
                        {slices.map((sl, sIdx) => (
                          <div key={sIdx} className="flex items-center justify-between text-[11px] gap-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span
                                style={{ backgroundColor: sl.color }}
                                className="w-3 h-3 rounded-full shrink-0"
                              />
                              <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                                {sl.label}
                              </span>
                            </div>
                            <span className="font-mono font-bold text-slate-900 dark:text-white shrink-0">
                              {sl.pct}% ({sl.val})
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* 3. LINE CHART */}
                {chartType === 'line' && (() => {
                  const maxVal = Math.max(...values, 10);
                  const count = values.length;
                  const svgW = 400;
                  const svgH = 160;
                  const padX = 35;
                  const padY = 25;

                  const points = values.map((val, idx) => {
                    const x = padX + (idx / Math.max(1, count - 1)) * (svgW - 2 * padX);
                    const y = svgH - padY - (Math.max(0, val) / maxVal) * (svgH - 2 * padY);
                    return { x, y, val, label: labels[idx] || `Mục ${idx + 1}` };
                  });

                  const pointsStr = points.map((p) => `${p.x},${p.y}`).join(' ');
                  const areaPoints = `${padX},${svgH - padY} ${pointsStr} ${points[points.length - 1]?.x || svgW - padX},${svgH - padY}`;

                  return (
                    <div className="w-full h-full flex flex-col justify-end">
                      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-full overflow-visible">
                        <defs>
                          <linearGradient id={`line-grad-${el.id}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
                            <stop offset="100%" stopColor={primaryColor} stopOpacity="0.02" />
                          </linearGradient>
                        </defs>

                        {/* Horizontal guide lines */}
                        {[0.25, 0.5, 0.75].map((g, gi) => (
                          <line
                            key={gi}
                            x1={padX}
                            y1={padY + g * (svgH - 2 * padY)}
                            x2={svgW - padX}
                            y2={padY + g * (svgH - 2 * padY)}
                            stroke="#cbd5e1"
                            strokeDasharray="4 4"
                            strokeWidth="1"
                            opacity="0.4"
                          />
                        ))}

                        {/* Baseline */}
                        <line
                          x1={padX}
                          y1={svgH - padY}
                          x2={svgW - padX}
                          y2={svgH - padY}
                          stroke="#cbd5e1"
                          strokeWidth="1"
                        />

                        {/* Shaded Area Under Line */}
                        <polygon points={areaPoints} fill={`url(#line-grad-${el.id})`} />

                        {/* The Trend Line */}
                        <polyline
                          points={pointsStr}
                          fill="none"
                          stroke={primaryColor}
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />

                        {/* Data Point Circles and Values */}
                        {points.map((p, pIdx) => (
                          <g key={pIdx}>
                            <circle
                              cx={p.x}
                              cy={p.y}
                              r="5"
                              fill="#ffffff"
                              stroke={primaryColor}
                              strokeWidth="3"
                              className="cursor-pointer hover:r-7 transition-all"
                            />
                            <text
                              x={p.x}
                              y={p.y - 9}
                              textAnchor="middle"
                              className="fill-slate-700 dark:fill-slate-200 text-[11px] font-mono font-bold"
                            >
                              {p.val}
                            </text>
                            <text
                              x={p.x}
                              y={svgH - 6}
                              textAnchor="middle"
                              className="fill-slate-400 text-[10px] font-semibold"
                            >
                              {p.label}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })()}

        {/* 8 RESIZE HANDLES & 1 ROTATION HANDLE WHEN SELECTED */}
        {isSelected && (
          <>
            <div
              className="absolute -top-8 left-1/2 -translate-x-1/2 w-5 h-5 bg-white border-2 border-indigo-600 rounded-full flex items-center justify-center cursor-grab hover:scale-110 shadow-md transition-transform"
              onMouseDown={handleRotateMouseDown}
              title="Kéo để xoay đối tượng"
            >
              <RotateCw className="w-2.5 h-2.5 text-indigo-600" />
            </div>
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-0.5 h-3 bg-indigo-500 pointer-events-none" />

            {/* 4 Corner Handles (Kéo góc để phóng to / thu nhỏ) */}
            <div
              className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 z-40 transition-transform"
              onMouseDown={(e) => handleResizeMouseDown(e, 'nw')}
              title="Kéo góc để phóng to thu nhỏ"
            />
            <div
              className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 z-40 transition-transform"
              onMouseDown={(e) => handleResizeMouseDown(e, 'ne')}
              title="Kéo góc để phóng to thu nhỏ"
            />
            <div
              className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-sm cursor-nesw-resize shadow-md hover:scale-125 z-40 transition-transform"
              onMouseDown={(e) => handleResizeMouseDown(e, 'sw')}
              title="Kéo góc để phóng to thu nhỏ"
            />
            <div
              className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-indigo-600 rounded-sm cursor-nwse-resize shadow-md hover:scale-125 z-40 transition-transform"
              onMouseDown={(e) => handleResizeMouseDown(e, 'se')}
              title="Kéo góc để phóng to thu nhỏ"
            />

            {/* 4 Edge Handles */}
            <div
              className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-ns-resize shadow-xs hover:scale-125 z-40 transition-transform"
              onMouseDown={(e) => handleResizeMouseDown(e, 'n')}
              title="Kéo mép trên"
            />
            <div
              className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-ns-resize shadow-xs hover:scale-125 z-40 transition-transform"
              onMouseDown={(e) => handleResizeMouseDown(e, 's')}
              title="Kéo mép dưới"
            />
            <div
              className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-ew-resize shadow-xs hover:scale-125 z-40 transition-transform"
              onMouseDown={(e) => handleResizeMouseDown(e, 'w')}
              title="Kéo mép trái"
            />
            <div
              className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-3.5 h-3.5 bg-white border-2 border-indigo-600 rounded-sm cursor-ew-resize shadow-xs hover:scale-125 z-40 transition-transform"
              onMouseDown={(e) => handleResizeMouseDown(e, 'e')}
              title="Kéo mép phải"
            />
          </>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Hidden File Inputs: Upload image to canvas, replace image, and set background image */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />
      <input
        ref={replaceImgInputRef}
        type="file"
        accept="image/*"
        onChange={handleReplaceImage}
        className="hidden"
      />
      <input
        ref={bgImgInputRef}
        type="file"
        accept="image/*"
        onChange={handleUploadBgImage}
        className="hidden"
      />

      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR: Presentation title + Insert Text, Image, Shape, Icon, Table */}
      {/* ========================================================================= */}
      {/* ========================================================================= */}
      {/* 1. TOP TOOLBAR: Sticky top, responsive height, flex-wrap multi-row layout */}
      {/* ========================================================================= */}
      <div className="sticky top-16 z-30 min-h-auto lg:min-h-[110px] bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md p-2.5 sm:p-4 flex flex-col justify-between gap-2.5 sm:gap-3 overflow-x-auto overflow-y-visible">
        {/* Row 1: Title & Main Presentation Controls (Lưu, Xuất File, Trình Chiếu) */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-2.5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            {onBackToDashboard && (
              <button
                id="btn-back-to-dashboard"
                type="button"
                onClick={onBackToDashboard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all cursor-pointer shadow-2xs shrink-0 border border-slate-200/80 dark:border-slate-700 hover:border-indigo-400 group"
                title="Quay lại Dashboard để xem danh sách bài thuyết trình và chọn bài khác"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500 group-hover:text-indigo-600 transition-colors" />
                <span>← Về Trang Chủ / Danh sách bài</span>
              </button>
            )}
            <input
              type="text"
              value={deck.title}
              onChange={(e) => onUpdateDeck({ ...deck, title: e.target.value })}
              className="text-sm sm:text-base font-black text-slate-900 dark:text-white bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 px-2.5 py-1.5 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500 max-w-[260px] sm:max-w-md truncate"
              title="Bấm để đổi tên bài thuyết trình"
            />
            {/* Aspect Ratio Selector Dropdown (16:9, 4:3, 1:1, 9:16) */}
            <div className="relative shrink-0" ref={aspectRatioMenuRef}>
              <button
                id="btn-aspect-ratio-dropdown"
                type="button"
                onClick={() => setShowAspectRatioMenu(!showAspectRatioMenu)}
                className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/80 border border-indigo-200 dark:border-indigo-800 shadow-2xs hover:shadow-xs transition-all cursor-pointer group select-none"
                title={`Đổi tỷ lệ Canvas (Hiện tại: ${currentConfig.label})`}
                aria-label="Chọn tỷ lệ khung hình Canvas"
                aria-expanded={showAspectRatioMenu}
              >
                <Layout className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="font-extrabold uppercase tracking-wide">
                  {currentConfig.shortLabel} Canvas
                </span>
                <ChevronDown
                  className={`w-3.5 h-3.5 text-indigo-500 transition-transform duration-200 ${
                    showAspectRatioMenu ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* Dropdown Menu with 4 options */}
              {showAspectRatioMenu && (
                <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                  <div className="px-2.5 py-1.5 mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                    <span>Chọn Tỷ Lệ Khung Hình</span>
                    <span className="text-[10px] lowercase font-mono text-slate-400">canvas ratio</span>
                  </div>
                  <div className="space-y-1">
                    {ASPECT_RATIO_OPTIONS.map((opt) => {
                      const isSelected = opt.id === aspectRatio;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectAspectRatio(opt.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200 dark:border-indigo-800'
                              : 'hover:bg-slate-50 dark:hover:bg-slate-800/80 text-slate-700 dark:text-slate-300 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            {/* Visual miniature ratio frame */}
                            <div
                              className={`border-2 rounded-xs flex items-center justify-center shrink-0 ${
                                isSelected
                                  ? 'border-indigo-600 bg-indigo-100 dark:bg-indigo-900/60'
                                  : 'border-slate-400 dark:border-slate-600 bg-slate-100 dark:bg-slate-800'
                              }`}
                              style={{
                                width: opt.id === '9:16' ? '12px' : opt.id === '1:1' ? '16px' : opt.id === '4:3' ? '18px' : '22px',
                                height: opt.id === '9:16' ? '22px' : opt.id === '1:1' ? '16px' : opt.id === '4:3' ? '14px' : '12px',
                              }}
                            />
                            <div>
                              <div className="font-bold flex items-center gap-1.5">
                                <span>{opt.label}</span>
                              </div>
                              <div className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                                {opt.width} × {opt.height}px
                              </div>
                            </div>
                          </div>

                          {isSelected && (
                            <div className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                              <Check className="w-3 h-3 stroke-[2.5]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  <div className="mt-2 pt-1.5 px-2 text-[10px] text-slate-400 dark:text-slate-500 border-t border-slate-100 dark:border-slate-800 text-center">
                    Tự động lưu & áp dụng cho Trình chiếu & Xuất tệp
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Undo / Redo */}
            <div className="flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
                title="Hoàn tác (Ctrl+Z)"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-700 disabled:opacity-30 cursor-pointer transition-colors"
                title="Làm lại (Ctrl+Y)"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 shrink-0">
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.max(0.5, z - 0.1))}
                className="hover:text-indigo-600 p-0.5 cursor-pointer"
                title="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="w-10 text-center font-mono text-[11px] font-bold">{Math.round(zoomLevel * 100)}%</span>
              <button
                type="button"
                onClick={() => setZoomLevel((z) => Math.min(1.5, z + 0.1))}
                className="hover:text-indigo-600 p-0.5 cursor-pointer"
                title="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setZoomLevel(1)}
                className="text-[10px] text-slate-400 hover:text-indigo-500 font-bold ml-0.5 cursor-pointer"
                title="Vừa màn hình (100%)"
              >
                Fit
              </button>
            </div>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-700 mx-0.5 shrink-0" />

            {/* Nút Lưu (Save) - Hiển thị to, rõ ràng */}
            <button
              id="btn-save-slide"
              type="button"
              onClick={handleSaveDeck}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 border border-emerald-200 dark:border-emerald-800 shadow-xs transition-all cursor-pointer"
              title="Lưu trạng thái bài thuyết trình và đưa vào Kho Lưu Trữ"
            >
              <Save className="w-4 h-4 text-emerald-600" />
              <span>{showSaveToast ? 'Đã lưu vào Kho Lưu Trữ!' : 'Lưu'}</span>
            </button>

            {/* Nút Xuất File (Export / Print) - Không bị ẩn chữ */}
            <button
              type="button"
              onClick={handleExportSlide}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 shadow-xs transition-all cursor-pointer"
              title="Xuất slide thành bản in / file PDF"
            >
              <Download className="w-4 h-4 text-indigo-600" />
              <span>Xuất File</span>
            </button>

            {/* Nút Trình Chiếu (Fullscreen Present) */}
            <button
              id="btn-present-mode"
              type="button"
              onClick={() => {
                setPresentingSlideIndex(activeSlideIndex);
                setIsPresenting(true);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 shadow-md hover:shadow-lg transition-all shrink-0 cursor-pointer`}
              title="Bắt đầu trình chiếu toàn màn hình (F5)"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Trình Chiếu</span>
            </button>
          </div>
        </div>

        {/* Row 2: Insertion Palette with Collapsible Support */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold pt-1">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 transition-all duration-300">
            <button
              type="button"
              onClick={isInsertBarCollapsed ? handleToggleInsertBar : undefined}
              className={`flex items-center gap-1.5 select-none text-left bg-transparent border-0 p-0 ${
                isInsertBarCollapsed ? 'cursor-pointer hover:text-indigo-600 transition-colors py-1' : 'cursor-default'
              }`}
              title={isInsertBarCollapsed ? 'Bấm để mở rộng thanh công cụ CHÈN' : undefined}
            >
              <span className="text-slate-400 dark:text-slate-500 text-xs uppercase font-extrabold tracking-wider mr-0.5 shrink-0">
                Chèn{isInsertBarCollapsed ? ': ...' : ':'}
              </span>
              {isInsertBarCollapsed && (
                <span className="text-[11px] text-indigo-500 font-semibold italic">
                  (Đang thu gọn — bấm để mở rộng)
                </span>
              )}
            </button>

            {!isInsertBarCollapsed && (
              <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 transition-all duration-300">

          {/* 1. TEXT TOOL: Direct Add in Center on click + Presets Dropdown */}
          <div className="relative shrink-0 flex items-center rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 shadow-xs hover:border-indigo-400 transition-all">
            <button
              id="btn-tool-text"
              type="button"
              onClick={handleAddTextCenter}
              className="flex items-center gap-1.5 px-3 py-2 rounded-l-xl hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer font-bold"
              title="Thêm ngay 1 ô văn bản vào giữa slide và gõ chữ tức thì"
            >
              <Type className="w-4 h-4 text-indigo-500" />
              <span>Text</span>
            </button>
            <button
              type="button"
              onClick={() => setShowTextMenu(!showTextMenu)}
              className="px-1.5 py-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-r-xl border-l border-slate-200 dark:border-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer transition-colors"
              title="Chọn mẫu văn bản (Tiêu đề lớn, Tiêu đề mục, Danh sách...)"
            >
              <ChevronDown className="w-3.5 h-3.5" />
            </button>

            {/* Text Presets Dropdown */}
            {showTextMenu && (
              <div className="absolute left-0 top-full mt-2 w-64 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-2.5 z-50 animate-in fade-in space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1 block">
                  Chọn mẫu văn bản:
                </span>
                <button
                  type="button"
                  onClick={() => handleAddText('title')}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex flex-col cursor-pointer"
                >
                  <span className="font-extrabold text-sm text-slate-900 dark:text-white">Tiêu đề chính lớn</span>
                  <span className="text-[10px] text-slate-400">Cỡ 44px, đậm, căn giữa</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddText('heading')}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex flex-col cursor-pointer"
                >
                  <span className="font-bold text-xs text-slate-800 dark:text-slate-200">Tiêu đề mục (Heading)</span>
                  <span className="text-[10px] text-slate-400">Cỡ 32px, đậm nét</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddText('body')}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex flex-col cursor-pointer"
                >
                  <span className="text-xs text-slate-700 dark:text-slate-300">Đoạn văn bản nội dung</span>
                  <span className="text-[10px] text-slate-400">Cỡ 18px, dễ đọc</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddText('bullet')}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex flex-col cursor-pointer"
                >
                  <span className="text-xs text-slate-700 dark:text-slate-300">• Danh sách gạch đầu dòng</span>
                  <span className="text-[10px] text-slate-400">3 gạch đầu dòng rõ ràng</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleAddText('quote')}
                  className="w-full text-left p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors flex flex-col cursor-pointer"
                >
                  <span className="italic text-xs text-indigo-600 dark:text-indigo-400">“Khung trích dẫn nổi bật”</span>
                  <span className="text-[10px] text-slate-400">In nghiêng, phong cách trích dẫn</span>
                </button>
              </div>
            )}
          </div>

          {/* 2. IMAGE TOOL (Desktop & Mobile device access) */}
          <div className="relative shrink-0">
            <button
              id="btn-tool-image"
              type="button"
              onClick={() => setShowImageMenu(!showImageMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs border border-slate-200/80 dark:border-slate-700"
            >
              <ImageIcon className="w-4 h-4 text-emerald-500" />
              <span>Ảnh</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Image Source Dropdown Popover */}
            {showImageMenu && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-3 z-50 animate-in fade-in space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    Tải ảnh từ máy tính / điện thoại
                  </span>
                  <button type="button" onClick={() => setShowImageMenu(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Primary Upload Button */}
                <button
                  type="button"
                  onClick={() => {
                    fileInputRef.current?.click();
                    setShowImageMenu(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Chọn ảnh từ thiết bị của bạn</span>
                </button>

                <div className="p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50 text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
                  <p className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                    <Laptop className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Máy tính: Chọn tệp ảnh PNG, JPG, GIF hoặc kéo thả vào slide.</span>
                  </p>
                  <p className="flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Điện thoại: Chọn từ Thư viện ảnh hoặc Camera chụp trực tiếp.</span>
                  </p>
                  <p className="text-[10px] text-slate-400 italic">
                    💡 Hỗ trợ dán ảnh trực tiếp từ bộ nhớ đệm (Ctrl+V).
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <span className="text-[11px] font-bold text-slate-500 block mb-2">
                    Hoặc chọn từ kho ảnh mẫu chất lượng cao:
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {STOCK_PHOTOS.map((photo, pIdx) => (
                      <div
                        key={pIdx}
                        onClick={() => handleAddImage(photo.url)}
                        className="group relative aspect-video rounded-lg overflow-hidden cursor-pointer border border-slate-200 dark:border-slate-700 hover:ring-2 hover:ring-indigo-500"
                        title={photo.name}
                      >
                        <img src={photo.url} alt={photo.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 3. SHAPES, ARROWS & CALLOUTS TOOL */}
          <div className="relative shrink-0">
            <button
              id="btn-tool-shape"
              type="button"
              onClick={() => setShowShapeMenu(!showShapeMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs border border-slate-200/80 dark:border-slate-700"
            >
              <Shapes className="w-4 h-4 text-amber-500" />
              <span>Hình Dạng</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Shape Menu Dropdown with 3 Tabs: Basic, Arrows, Callouts */}
            {showShapeMenu && (
              <div className="absolute left-0 top-full mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-3 z-50 animate-in fade-in space-y-2.5">
                {/* 3 Tabs */}
                <div className="flex rounded-xl bg-slate-100 dark:bg-slate-700 p-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setShapeMenuTab('basic')}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      shapeMenuTab === 'basic' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Hình cơ bản
                  </button>
                  <button
                    type="button"
                    onClick={() => setShapeMenuTab('arrows')}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      shapeMenuTab === 'arrows' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Mũi tên sơ đồ
                  </button>
                  <button
                    type="button"
                    onClick={() => setShapeMenuTab('callouts')}
                    className={`flex-1 py-1.5 rounded-lg transition-all cursor-pointer ${
                      shapeMenuTab === 'callouts' ? 'bg-white dark:bg-slate-800 text-indigo-600 shadow-xs' : 'text-slate-500'
                    }`}
                  >
                    Callouts chú thích
                  </button>
                </div>

                {/* Tab 1: Basic Shapes */}
                {shapeMenuTab === 'basic' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Hình cơ bản trang trí hoặc làm nền:
                    </span>
                    <div className="grid grid-cols-4 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddShape('rectangle')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Hình chữ nhật"
                      >
                        <Square className="w-5 h-5 fill-current" />
                        <span className="text-[9px]">Chữ nhật</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('rounded-rect')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Chữ nhật bo tròn"
                      >
                        <div className="w-5 h-5 rounded-md border-2 border-current" />
                        <span className="text-[9px]">Bo góc</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('circle')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Hình tròn"
                      >
                        <CircleIcon className="w-5 h-5 fill-current" />
                        <span className="text-[9px]">Hình tròn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('oval')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Hình Oval"
                      >
                        <div className="w-6 h-4 rounded-full border-2 border-current" />
                        <span className="text-[9px]">Elip/Oval</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('triangle')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Hình tam giác đều"
                      >
                        <TriangleIcon className="w-5 h-5 fill-current" />
                        <span className="text-[9px]">Tam giác</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('right-triangle')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Tam giác vuông"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                          <polygon points="3,3 21,21 3,21" />
                        </svg>
                        <span className="text-[9px]">Tam giác vuông</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('diamond')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Hình thoi"
                      >
                        <div className="w-4 h-4 rotate-45 border-2 border-current" />
                        <span className="text-[9px]">Hình thoi</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('star')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Ngôi sao"
                      >
                        <StarIcon className="w-5 h-5 fill-current text-amber-500" />
                        <span className="text-[9px]">Ngôi sao</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('heart')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Trái tim"
                      >
                        <HeartIcon className="w-5 h-5 fill-current text-rose-500" />
                        <span className="text-[9px]">Trái tim</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('pentagon')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Ngũ giác"
                      >
                        <span className="text-xs font-bold">5 Cạnh</span>
                        <span className="text-[9px]">Ngũ giác</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('hexagon')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Lục giác"
                      >
                        <span className="text-xs font-bold">6 Cạnh</span>
                        <span className="text-[9px]">Lục giác</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('line')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Đường kẻ ngang"
                      >
                        <Minus className="w-5 h-5 text-indigo-500" />
                        <span className="text-[9px]">Đường kẻ</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 2: Arrows & Connectors */}
                {shapeMenuTab === 'arrows' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Mũi tên chỉ dẫn, kết nối sơ đồ & quy trình:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddShape('arrow')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Mũi tên sang phải"
                      >
                        <ArrowRight className="w-5 h-5 text-emerald-500" />
                        <span className="text-[9px]">Mũi tên phải</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('arrow-left')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Mũi tên sang trái"
                      >
                        <ArrowLeft className="w-5 h-5 text-emerald-500" />
                        <span className="text-[9px]">Mũi tên trái</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('arrow-double')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Mũi tên 2 đầu"
                      >
                        <div className="flex items-center gap-0.5 text-emerald-500">
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                        <span className="text-[9px]">Hai chiều</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('arrow-up')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Mũi tên lên"
                      >
                        <ArrowUp className="w-5 h-5 text-emerald-500" />
                        <span className="text-[9px]">Mũi tên lên</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('arrow-down')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Mũi tên xuống"
                      >
                        <ArrowDown className="w-5 h-5 text-emerald-500" />
                        <span className="text-[9px]">Mũi tên xuống</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('arrow-chevron')}
                        className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1 cursor-pointer"
                        title="Khối quy trình Chevron"
                      >
                        <div className="px-2 py-0.5 bg-blue-500 text-white rounded-xs text-[10px] font-bold">
                          Step ❯
                        </div>
                        <span className="text-[9px]">Quy trình</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Tab 3: Callouts & Speech Bubbles */}
                {shapeMenuTab === 'callouts' && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Khung chú thích, bong bóng hội thoại:
                    </span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleAddShape('speech-bubble')}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <MessageSquare className="w-6 h-6 text-indigo-500" />
                        <span className="text-[10px] font-bold">Bong bóng lời nói</span>
                        <span className="text-[9px] text-slate-400">Hội thoại, lời dẫn</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('thought-bubble')}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <Cloud className="w-6 h-6 text-purple-500" />
                        <span className="text-[10px] font-bold">Bong bóng suy nghĩ</span>
                        <span className="text-[9px] text-slate-400">Ý tưởng, trăn trở</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('callout-box')}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <Bookmark className="w-6 h-6 text-amber-500" />
                        <span className="text-[10px] font-bold">Khung ghi chú</span>
                        <span className="text-[9px] text-slate-400">Hộp ghi chú nổi bật</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddShape('banner')}
                        className="p-3 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 text-slate-700 dark:text-slate-200 hover:text-indigo-600 flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <Flag className="w-6 h-6 text-rose-500" />
                        <span className="text-[10px] font-bold">Dải ruy băng tiêu đề</span>
                        <span className="text-[9px] text-slate-400">Banner nhấn mạnh</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 4. BIỂU TƯỢNG ICON TOOL (40+ Lucide Icons) */}
          <div className="relative shrink-0" ref={iconMenuRef}>
            <button
              id="btn-tool-icons"
              type="button"
              onClick={() => setShowIconStickerMenu(!showIconStickerMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs border border-slate-200/80 dark:border-slate-700"
              title="Hơn 40+ biểu tượng Lucide đa dạng"
            >
              <Smile className="w-4 h-4 text-sky-500" />
              <span>Biểu tượng Icon</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Direct Icon Picker Popover */}
            {showIconStickerMenu && (
              <div className="absolute left-0 top-full mt-2 w-84 max-w-[92vw] bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-3 z-50 animate-in fade-in space-y-2.5">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <Smile className="w-4 h-4 text-sky-500" />
                    Thư Viện Biểu Tượng Icon
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowIconStickerMenu(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {ICON_CATEGORIES.map((cat, cIdx) => (
                    <div key={cIdx} className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        {cat.name}
                      </span>
                      <div className="grid grid-cols-6 gap-1.5">
                        {cat.icons.map((item, iIdx) => {
                          const IconComp = item.icon;
                          return (
                            <button
                              key={iIdx}
                              type="button"
                              onClick={() => {
                                handleAddIcon(item.name);
                                setShowIconStickerMenu(false);
                              }}
                              className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-700 hover:bg-sky-50 dark:hover:bg-sky-950 text-slate-700 dark:text-slate-300 hover:text-sky-600 flex items-center justify-center transition-colors cursor-pointer"
                              title={item.label}
                            >
                              <IconComp className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* 5. TABLE TOOL (Custom Rows & Cols Modal) */}
          <div className="relative shrink-0">
            <button
              id="btn-tool-table"
              type="button"
              onClick={() => setShowTableModal(!showTableModal)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs border border-slate-200/80 dark:border-slate-700"
              title="Tạo bảng với tùy chọn số dòng và số cột"
            >
              <TableIcon className="w-4 h-4 text-blue-500" />
              <span>Bảng (Table)</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* Table Matrix & Row/Col Picker Popover */}
            {showTableModal && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-3.5 z-50 animate-in fade-in space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <TableIcon className="w-4 h-4 text-blue-500" />
                    Tạo Bảng Mới
                  </span>
                  <button type="button" onClick={() => setShowTableModal(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Quick Row x Col Input */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Số hàng (Rows):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={tableInitRows}
                      onChange={(e) => setTableInitRows(parseInt(e.target.value) || 1)}
                      className="w-full p-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-center"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1">
                      Số cột (Cols):
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={10}
                      value={tableInitCols}
                      onChange={(e) => setTableInitCols(parseInt(e.target.value) || 1)}
                      className="w-full p-2 text-xs font-bold rounded-xl bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-center"
                    />
                  </div>
                </div>

                {/* Quick Presets */}
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Kích thước thường dùng:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { r: 2, c: 2 },
                      { r: 3, c: 3 },
                      { r: 4, c: 3 },
                      { r: 4, c: 4 },
                    ].map((sz, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setTableInitRows(sz.r);
                          setTableInitCols(sz.c);
                        }}
                        className={`p-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                          tableInitRows === sz.r && tableInitCols === sz.c
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-950 text-blue-600'
                            : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        {sz.r}×{sz.c}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Insert Table Button */}
                <button
                  type="button"
                  onClick={handleCreateTable}
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs shadow-md transition-colors cursor-pointer"
                >
                  Tạo Bảng {tableInitRows} Hàng × {tableInitCols} Cột
                </button>
              </div>
            )}
          </div>

          {/* 6. CHART TOOL (Dropdown with 3 types: Cột, Tròn, Đường) */}
          <div className="relative shrink-0" ref={chartMenuRef}>
            <button
              id="btn-tool-chart"
              type="button"
              onClick={() => setShowChartMenu(!showChartMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs border border-slate-200/80 dark:border-slate-700"
              title="Chèn biểu đồ Cột, Tròn hoặc Đường"
            >
              <BarChart2 className="w-4 h-4 text-orange-500" />
              <span>Biểu Đồ</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {/* 3 Types Dropdown Popover */}
            {showChartMenu && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-3 z-50 animate-in fade-in space-y-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-700">
                  <span className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                    <BarChart2 className="w-4 h-4 text-orange-500" />
                    Chọn Loại Biểu Đồ
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowChartMenu(false)}
                    className="text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  <button
                    type="button"
                    onClick={() => handleAddChartWithType('bar')}
                    className="w-full p-2.5 rounded-xl hover:bg-orange-50 dark:hover:bg-orange-950/50 text-left flex items-center gap-3 transition-colors cursor-pointer group border border-transparent hover:border-orange-200 dark:hover:border-orange-900"
                  >
                    <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-900/40 text-orange-600 flex items-center justify-center shrink-0">
                      <BarChart2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-orange-600">
                        1. Biểu đồ Cột (Bar Chart)
                      </div>
                      <div className="text-[10px] text-slate-400">So sánh chỉ số, tiến độ theo mốc thời gian</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddChartWithType('pie')}
                    className="w-full p-2.5 rounded-xl hover:bg-purple-50 dark:hover:bg-purple-950/50 text-left flex items-center gap-3 transition-colors cursor-pointer group border border-transparent hover:border-purple-200 dark:hover:border-purple-900"
                  >
                    <div className="w-9 h-9 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center shrink-0">
                      <PieChart className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-purple-600">
                        2. Biểu đồ Tròn (Pie Chart)
                      </div>
                      <div className="text-[10px] text-slate-400">Tỷ lệ phần trăm, phân bổ ngân sách / nhân sự</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddChartWithType('line')}
                    className="w-full p-2.5 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-left flex items-center gap-3 transition-colors cursor-pointer group border border-transparent hover:border-emerald-200 dark:hover:border-emerald-900"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600">
                        3. Biểu đồ Đường (Line Chart)
                      </div>
                      <div className="text-[10px] text-slate-400">Xu hướng tăng trưởng, biến động chỉ số</div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 7. BACKGROUND TOOL */}
          <div className="relative shrink-0">
            <button
              id="btn-tool-background"
              type="button"
              onClick={() => setShowBgMenu(!showBgMenu)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-indigo-950/60 dark:hover:text-indigo-400 transition-colors text-slate-800 dark:text-slate-200 cursor-pointer shadow-xs border border-slate-200/80 dark:border-slate-700"
            >
              <Palette className="w-4 h-4 text-rose-500" />
              <span>Nền Slide</span>
            </button>

            {/* Background Color Menu */}
            {showBgMenu && (
              <div className="absolute left-0 top-full mt-2 w-72 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-3 z-50 animate-in fade-in space-y-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Màu nền trang slide:
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {BACKGROUND_PRESETS.map((preset, bIdx) => (
                    <button
                      key={bIdx}
                      type="button"
                      onClick={() => {
                        updateCurrentSlideProperty('backgroundColor', preset.value);
                        setShowBgMenu(false);
                      }}
                      style={{ background: preset.value }}
                      className="w-full h-9 rounded-xl border border-slate-300 dark:border-slate-600 hover:scale-105 shadow-xs transition-transform cursor-pointer"
                      title={preset.label}
                    />
                  ))}
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between">
                  <span className="text-xs text-slate-600 dark:text-slate-300">Mã màu riêng:</span>
                  <input
                    type="color"
                    value={currentSlide.backgroundColor?.startsWith('#') ? currentSlide.backgroundColor : '#ffffff'}
                    onChange={(e) => updateCurrentSlideProperty('backgroundColor', e.target.value)}
                    className="w-7 h-7 rounded-lg cursor-pointer border-0"
                  />
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-700">
                  <button
                    type="button"
                    onClick={() => bgImgInputRef.current?.click()}
                    className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải ảnh từ máy làm nền</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>

    {/* Right side: Quick Actions for Selected Element + Collapse / Expand Button */}
    <div className="flex items-center gap-2 ml-auto shrink-0">
      {/* Quick Actions for Selected Element */}
      {selectedElement && (
        <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0">
          <button
            type="button"
            onClick={handleDuplicateSelected}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-indigo-600 cursor-pointer transition-colors"
            title="Nhân bản (Ctrl+D)"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleLayerOrder('front')}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
            title="Đưa lên lớp trên"
          >
            <ChevronUp className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => handleLayerOrder('back')}
            className="p-1.5 rounded-lg hover:bg-white dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 cursor-pointer transition-colors"
            title="Đưa xuống lớp dưới"
          >
            <ChevronDown className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleDeleteSelected}
            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/60 text-red-600 dark:text-red-400 cursor-pointer transition-colors"
            title="Xóa đối tượng (Delete / Backspace)"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Nút Thu gọn / Mở rộng ở góc phải cuối thanh CHÈN (ngay cạnh nút thùng rác) */}
      <button
        id="btn-toggle-insert-bar"
        type="button"
        onClick={handleToggleInsertBar}
        className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1 shadow-xs ${
          isInsertBarCollapsed
            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100'
            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
        }`}
        title="Thu gọn / Mở rộng"
        aria-label="Thu gọn / Mở rộng"
      >
        {isInsertBarCollapsed ? (
          <ChevronDown className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        ) : (
          <ChevronUp className="w-4 h-4 text-slate-500" />
        )}
      </button>
    </div>
  </div>
      </div>

      {/* MOBILE SLIDE FILMSTRIP (Horizontal Scrollable Strip on Mobile Phones) */}
      <div className="lg:hidden bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 p-2.5 shadow-sm space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Slide #{activeSlideIndex + 1}/{deck.slides.length}
            </span>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold px-2 py-0.5 rounded-full">
              {currentConfig.shortLabel}
            </span>
          </div>
          <button
            type="button"
            onClick={handleAddBlankSlide}
            className="flex items-center gap-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs active:scale-95"
            title="Tạo slide mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Slide Mới</span>
          </button>
        </div>

        {/* Horizontal Carousel Thumbnails */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 scrollbar-none scroll-smooth">
          {deck.slides.map((slide, idx) => {
            const isSelected = idx === activeSlideIndex;
            return (
              <button
                key={`mob_thumb_${slide.id}`}
                type="button"
                onClick={() => {
                  setActiveSlideIndex(idx);
                  setSelectedElementId(null);
                  setSelectedTableCell(null);
                }}
                className={`shrink-0 rounded-xl border p-1.5 transition-all text-left flex flex-col items-center gap-1 cursor-pointer min-w-[76px] ${
                  isSelected
                    ? 'border-indigo-600 ring-2 ring-indigo-500/30 bg-indigo-50/50 dark:bg-indigo-950/50 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 opacity-75'
                }`}
              >
                <div
                  style={{
                    background: slide.backgroundColor || '#ffffff',
                    aspectRatio: currentConfig.aspectRatioCss,
                    width: '68px',
                  }}
                  className="rounded-md border border-slate-300 dark:border-slate-700 overflow-hidden relative shadow-2xs flex items-center justify-center pointer-events-none"
                >
                  <span className="text-[10px] font-bold text-slate-400">#{idx + 1}</span>
                </div>
                <span className={`text-[10px] font-bold truncate max-w-[68px] ${isSelected ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : 'text-slate-500'}`}>
                  #{idx + 1} {slide.title || 'Slide'}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 2. MAIN 3-COLUMN WORKSPACE: FILMSTRIP (LEFT) + CANVAS (CENTER) + INSPECTOR */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* LEFT COLUMN: FILMSTRIP THUMBNAILS (3 cols on lg, hidden on phone since mobile carousel handles it) */}
        <div className="hidden lg:flex lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 space-y-3 flex-col max-h-[720px]">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Danh Sách Slide ({deck.slides.length})
            </span>
            <button
              id="btn-add-blank-slide"
              type="button"
              onClick={handleAddBlankSlide}
              className="flex items-center gap-1 text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 px-2 py-1 rounded-lg transition-colors cursor-pointer"
              title="Tạo slide trắng mới"
            >
              <Plus className="w-4 h-4" />
              <span>Slide Mới</span>
            </button>
          </div>

          {/* Thumbnails Scrollable List */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
            {deck.slides.map((slide, idx) => {
              const isSelected = idx === activeSlideIndex;
              const slideElements = getSlideCanvasElements(slide);

              return (
                <div
                  key={slide.id}
                  onClick={() => {
                    setActiveSlideIndex(idx);
                    setSelectedElementId(null);
                    setSelectedTableCell(null);
                  }}
                  className={`cursor-pointer group relative rounded-xl border p-2 transition-all ${
                    isSelected
                      ? 'border-indigo-600 dark:border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20 shadow-sm'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1.5 px-0.5">
                    <span className={isSelected ? 'text-indigo-600 dark:text-indigo-400 font-extrabold' : ''}>
                      #{idx + 1}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400">
                      {slideElements.length} đối tượng
                    </span>
                  </div>

                  {/* Miniature Slide Preview (Adapts to Active Canvas Ratio) */}
                  <div
                    style={{
                      background: slide.backgroundColor || '#ffffff',
                      aspectRatio: currentConfig.aspectRatioCss,
                      maxHeight: aspectRatio === '9:16' ? '190px' : undefined,
                    }}
                    className="relative w-full rounded-lg overflow-hidden border border-slate-200/80 dark:border-slate-700 shadow-2xs pointer-events-none mx-auto flex items-center justify-center"
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: `${canvasWidth}px`,
                        height: `${canvasHeight}px`,
                        transform: `scale(${180 / canvasWidth})`,
                        transformOrigin: 'top left',
                      }}
                    >
                      {slideElements.map((el) => renderElement(el, true))}
                    </div>
                  </div>

                  <p className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mt-1.5 truncate px-0.5">
                    {slide.title || `Slide ${idx + 1}`}
                  </p>

                  {/* Slide Actions */}
                  <div className="absolute right-2 top-2 flex lg:hidden lg:group-hover:flex items-center gap-0.5 bg-white/95 dark:bg-slate-800/95 backdrop-blur-xs rounded-lg p-0.5 shadow-md border border-slate-200 dark:border-slate-700 z-10">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(idx, 'up');
                      }}
                      disabled={idx === 0}
                      title="Di chuyển lên"
                      className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleMoveSlide(idx, 'down');
                      }}
                      disabled={idx === deck.slides.length - 1}
                      title="Di chuyển xuống"
                      className="p-1 text-slate-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDuplicateSlide(idx);
                      }}
                      title="Nhân bản slide"
                      className="p-1 text-slate-400 hover:text-indigo-600 cursor-pointer"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(idx);
                      }}
                      title="Xóa slide"
                      className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={handleAddBlankSlide}
            className="w-full py-2.5 px-3 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-indigo-400 text-xs font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Slide Trắng ({currentConfig.shortLabel})</span>
          </button>
        </div>

        {/* CENTER COLUMN: INTERACTIVE CANVAS (Adapts to Active Aspect Ratio) */}
        <div className="order-1 lg:order-2 lg:col-span-6 space-y-3">
          <div className="bg-slate-100/70 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 p-3 sm:p-5 flex flex-col items-center justify-center min-h-[460px] overflow-hidden">
            {/* The Dynamic Canvas Frame */}
            <div
              style={{
                width: '100%',
                maxWidth: `${canvasWidth * zoomLevel}px`,
                aspectRatio: currentConfig.aspectRatioCss,
              }}
              className="relative rounded-2xl shadow-xl transition-all duration-300"
            >
              {/* Internal Coordinate Canvas */}
              <div
                ref={canvasRef}
                onClick={() => {
                  setSelectedElementId(null);
                  setEditingTextId(null);
                  setSelectedTableCell(null);
                }}
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleCanvasDrop}
                style={{
                  background: currentSlide.backgroundColor || '#ffffff',
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
                className="rounded-2xl border border-slate-200 dark:border-slate-800"
              >
                {/* Scaled Render Layer */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: `${canvasWidth}px`,
                    height: `${canvasHeight}px`,
                    transform: `scale(${canvasScale})`,
                    transformOrigin: 'top left',
                  }}
                >
                  {canvasElements.map((el) => renderElement(el, false))}
                </div>

                {/* Empty Canvas Helpful Guidance */}
                {canvasElements.length === 0 && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none p-6 text-center text-slate-300 dark:text-slate-600">
                    <Layout className="w-12 h-12 mb-2 stroke-1" />
                    <p className="text-sm font-bold">Slide Trắng Tùy Biến ({currentConfig.label})</p>
                    <p className="text-xs max-w-sm mt-1">
                      Dùng các công cụ <strong>Text</strong>, <strong>Ảnh</strong>, <strong>Hình dạng</strong>, <strong>Icon / Sticker</strong> hoặc <strong>Bảng</strong> ở trên để tạo nội dung thuyết trình.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Bottom Status bar */}
            <div className="w-full flex items-center justify-between mt-3 text-[11px] text-slate-400 px-2 font-mono">
              <span>
                Slide {activeSlideIndex + 1} / {deck.slides.length} • {currentConfig.label} ({canvasWidth}×{canvasHeight}px)
              </span>
              <span>
                {selectedElement
                  ? `Đang chọn: ${selectedElement.type.toUpperCase()}${
                      selectedElement.type === 'shape' ? ` (${selectedElement.shapeType})` : ''
                    }`
                  : 'Chưa chọn đối tượng'}
              </span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: PROPERTY INSPECTOR PANEL (3 cols on lg) */}
        <div id="slide-inspector-panel" className="order-3 lg:order-3 lg:col-span-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-4 max-h-[720px] overflow-y-auto">
          {/* ========================================== */}
          {/* 1. TEXT PROPERTIES PANEL                   */}
          {/* ========================================== */}
          {selectedElement && selectedElement.type === 'text' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Thuộc tính Văn Bản
                </span>
                <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950 text-indigo-600 font-bold px-1.5 py-0.5 rounded">
                  TEXT
                </span>
              </div>

              {/* Text Content */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung chữ
                </label>
                <textarea
                  rows={3}
                  value={selectedElement.text || ''}
                  onChange={(e) => updateSelectedElement({ text: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="Nhập nội dung văn bản..."
                />
              </div>

              {/* Font Family */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Phông chữ (Font)
                </label>
                <select
                  value={selectedElement.fontFamily || 'Inter, sans-serif'}
                  onChange={(e) => updateSelectedElement({ fontFamily: e.target.value })}
                  className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white cursor-pointer"
                >
                  {FONT_OPTIONS.map((f, i) => (
                    <option key={i} value={f.value} style={{ fontFamily: f.value }}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Font Size: Number input + Step Buttons (-) and (+) */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Cỡ chữ:</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleStepFontSize(-2)}
                      className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min={8}
                      max={140}
                      value={selectedElement.fontSize || 20}
                      onChange={(e) => updateSelectedElement({ fontSize: parseInt(e.target.value) || 12 })}
                      className="w-12 text-center p-1 rounded-md bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => handleStepFontSize(2)}
                      className="w-6 h-6 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-700 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Quick Font Size Pills */}
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {QUICK_FONT_SIZES.map((sz) => (
                    <button
                      key={sz}
                      type="button"
                      onClick={() => updateSelectedElement({ fontSize: sz })}
                      className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${
                        selectedElement.fontSize === sz
                          ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                          : 'border-slate-200 dark:border-slate-700 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
              </div>

              {/* Bold, Italic, Underline, Strikethrough */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Định dạng chữ
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedElement({
                        fontWeight: selectedElement.fontWeight === 'bold' ? 'normal' : 'bold',
                      })
                    }
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center cursor-pointer ${
                      selectedElement.fontWeight === 'bold'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                    title="In đậm"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedElement({
                        fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic',
                      })
                    }
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center cursor-pointer ${
                      selectedElement.fontStyle === 'italic'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                    title="In nghiêng"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedElement({
                        textDecoration: selectedElement.textDecoration === 'underline' ? 'none' : 'underline',
                      })
                    }
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center cursor-pointer ${
                      selectedElement.textDecoration === 'underline'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                    title="Gạch chân"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateSelectedElement({
                        textDecoration: selectedElement.textDecoration === 'line-through' ? 'none' : 'line-through',
                      })
                    }
                    className={`flex-1 py-1.5 rounded-lg flex items-center justify-center cursor-pointer ${
                      selectedElement.textDecoration === 'line-through'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                    title="Gạch ngang"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Text Alignment */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Căn lề
                </label>
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  {(['left', 'center', 'right', 'justify'] as const).map((align) => (
                    <button
                      key={align}
                      type="button"
                      onClick={() => updateSelectedElement({ textAlign: align })}
                      className={`flex-1 py-1.5 rounded-lg flex items-center justify-center cursor-pointer ${
                        selectedElement.textAlign === align
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                      title={`Căn ${align}`}
                    >
                      {align === 'left' && <AlignLeft className="w-3.5 h-3.5" />}
                      {align === 'center' && <AlignCenter className="w-3.5 h-3.5" />}
                      {align === 'right' && <AlignRight className="w-3.5 h-3.5" />}
                      {align === 'justify' && <AlignJustify className="w-3.5 h-3.5" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Kiểu Đầu Dòng (List Style) - 4 kiểu lựa chọn */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Kiểu đầu dòng
                  </label>
                  <span className="text-[10px] text-slate-400 font-medium">
                    {!selectedElement.listType || selectedElement.listType === 'none'
                      ? 'Thường'
                      : selectedElement.listType === 'disc'
                      ? 'Dấu chấm •'
                      : selectedElement.listType === 'dash'
                      ? 'Gạch ngang -'
                      : selectedElement.listType === 'arrow'
                      ? 'Mũi tên →'
                      : 'Số thứ tự 1.2.3.'}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => updateSelectedElement({ listType: 'none' })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      !selectedElement.listType || selectedElement.listType === 'none'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Văn bản thường không có đầu dòng"
                  >
                    <Type className="w-3.5 h-3.5 mb-0.5" />
                    <span>Thường</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedElement({ listType: 'disc' })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      selectedElement.listType === 'disc'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Dấu chấm tròn •"
                  >
                    <span className="text-sm font-black leading-none mb-0.5">•</span>
                    <span>Chấm •</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedElement({ listType: 'dash' })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      selectedElement.listType === 'dash'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Dấu gạch ngang -"
                  >
                    <span className="text-sm font-black leading-none mb-0.5">-</span>
                    <span>Gạch -</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedElement({ listType: 'arrow' })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      selectedElement.listType === 'arrow'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Dấu mũi tên →"
                  >
                    <span className="text-sm font-black leading-none mb-0.5">→</span>
                    <span>Mũi tên</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => updateSelectedElement({ listType: 'decimal' })}
                    className={`py-1.5 px-1 rounded-lg text-[10px] font-bold flex flex-col items-center justify-center cursor-pointer transition-colors ${
                      selectedElement.listType === 'decimal'
                        ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs font-bold'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                    title="Số thứ tự 1. 2. 3."
                  >
                    <span className="text-xs font-mono font-bold leading-none mb-0.5">1.2.</span>
                    <span>Số 1.2.</span>
                  </button>
                </div>
              </div>

              {/* Text Color */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Màu chữ
                  </label>
                  <button
                    type="button"
                    onClick={() => openColorPicker(selectedElement)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 border border-slate-200 dark:border-slate-700 text-xs font-mono font-bold cursor-pointer transition-colors shadow-2xs"
                    title="Mở bảng chọn màu chữ chuyên nghiệp"
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-slate-400/60 shadow-xs shrink-0"
                      style={{ backgroundColor: selectedElement.color || '#12290F' }}
                    />
                    <span className="text-[11px] text-slate-800 dark:text-slate-200 uppercase">
                      {selectedElement.color || '#12290F'}
                    </span>
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateSelectedElement({ color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-5 h-5 rounded-md border hover:scale-110 transition-transform cursor-pointer ${
                        selectedElement.color === c ? 'ring-2 ring-indigo-500 border-white' : 'border-slate-300 dark:border-slate-600'
                      }`}
                      title={c === '#12290F' ? 'Xanh rêu đậm (#12290F)' : c}
                    />
                  ))}
                  <button
                    type="button"
                    onClick={() => openColorPicker(selectedElement)}
                    className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 border border-indigo-200 dark:border-indigo-800 cursor-pointer transition-colors"
                  >
                    Bảng màu +
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* 2. IMAGE PROPERTIES PANEL                  */}
          {/* ========================================== */}
          {selectedElement && selectedElement.type === 'image' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Thuộc tính Hình Ảnh
                </span>
                <span className="text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-600 font-bold px-1.5 py-0.5 rounded">
                  IMAGE
                </span>
              </div>

              {/* Image Preview & Replace */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ảnh đang chọn
                </label>
                <div className="aspect-video w-full rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 mb-2">
                  <img src={selectedElement.src} alt="" className="w-full h-full object-cover" />
                </div>
                <button
                  type="button"
                  onClick={() => replaceImgInputRef.current?.click()}
                  className="w-full py-2 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Thay thế ảnh từ máy</span>
                </button>
              </div>

              {/* Object Fit */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Kiểu hiển thị (Fit)
                </label>
                <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl text-xs">
                  {(['cover', 'contain', 'fill'] as const).map((fit) => (
                    <button
                      key={fit}
                      type="button"
                      onClick={() => updateSelectedElement({ objectFit: fit })}
                      className={`py-1 rounded-lg font-semibold uppercase text-[10px] cursor-pointer ${
                        selectedElement.objectFit === fit
                          ? 'bg-white dark:bg-slate-700 text-indigo-600 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-slate-400'
                      }`}
                    >
                      {fit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Border Radius */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Bo góc: {selectedElement.borderRadius || 0}px</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={60}
                  value={selectedElement.borderRadius || 0}
                  onChange={(e) => updateSelectedElement({ borderRadius: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Shadow toggle */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Đổ bóng (Shadow)</span>
                <button
                  type="button"
                  onClick={() => updateSelectedElement({ shadow: !selectedElement.shadow })}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors cursor-pointer ${
                    selectedElement.shadow ? 'bg-indigo-600' : 'bg-slate-300 dark:bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-4 h-4 rounded-full bg-white transition-transform ${
                      selectedElement.shadow ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Opacity */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Độ trong suốt: {Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round((selectedElement.opacity ?? 1) * 100)}
                  onChange={(e) => updateSelectedElement({ opacity: parseInt(e.target.value) / 100 })}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* 3. SHAPE & ARROW & CALLOUT PROPERTIES     */}
          {/* ========================================== */}
          {selectedElement && selectedElement.type === 'shape' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Thuộc tính Hình Dạng
                </span>
                <span className="text-[10px] bg-amber-50 dark:bg-amber-950 text-amber-600 font-bold px-1.5 py-0.5 rounded">
                  {selectedElement.shapeType?.toUpperCase()}
                </span>
              </div>

              {/* One-click: Send to Back / Make Background */}
              <button
                type="button"
                onClick={handleShapeToBackground}
                className="w-full py-2 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span>Đặt làm nền toàn slide</span>
              </button>

              {/* Text inside shape / callout */}
              {selectedElement.shapeText !== undefined && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chữ trong Bong bóng / Khung chú thích
                  </label>
                  <input
                    type="text"
                    value={selectedElement.shapeText}
                    onChange={(e) => updateSelectedElement({ shapeText: e.target.value })}
                    className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                    placeholder="Nhập chú thích..."
                  />
                </div>
              )}

              {/* Fill Color */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Màu tô (Fill)
                  </label>
                  <input
                    type="color"
                    value={selectedElement.fillColor || '#6366f1'}
                    onChange={(e) => updateSelectedElement({ fillColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {COLOR_PALETTE.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateSelectedElement({ fillColor: c })}
                      style={{ backgroundColor: c }}
                      className="w-5 h-5 rounded-md border border-slate-300 dark:border-slate-600 hover:scale-110 transition-transform cursor-pointer"
                    />
                  ))}
                </div>
              </div>

              {/* Border Color & Width */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Viền: {selectedElement.borderWidth || 0}px
                  </label>
                  <input
                    type="color"
                    value={selectedElement.borderColor || '#4f46e5'}
                    onChange={(e) => updateSelectedElement({ borderColor: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0"
                  />
                </div>
                <input
                  type="range"
                  min={0}
                  max={20}
                  value={selectedElement.borderWidth || 0}
                  onChange={(e) => updateSelectedElement({ borderWidth: parseInt(e.target.value) })}
                  className="w-full accent-indigo-600"
                />
              </div>

              {/* Opacity */}
              <div>
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  <span>Độ trong suốt: {Math.round((selectedElement.opacity ?? 1) * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={Math.round((selectedElement.opacity ?? 1) * 100)}
                  onChange={(e) => updateSelectedElement({ opacity: parseInt(e.target.value) / 100 })}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* 4. TABLE PROPERTIES PANEL (Full Table Mgt) */}
          {/* ========================================== */}
          {selectedElement && selectedElement.type === 'table' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Chỉnh Sửa Bảng (Table)
                </span>
                <span className="text-[10px] bg-sky-50 dark:bg-sky-950 text-sky-600 font-bold px-1.5 py-0.5 rounded">
                  {selectedElement.tableData?.length || 0}H × {selectedElement.tableData?.[0]?.length || 0}C
                </span>
              </div>

              {/* Table Cell Text Formatting: Bold & Italic */}
              <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 block">
                  Định dạng ô đang chọn ({selectedTableCell ? `Hàng ${selectedTableCell.row + 1}, Cột ${selectedTableCell.col + 1}` : 'Chưa click ô'}):
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={!selectedTableCell}
                    onClick={() => {
                      if (selectedTableCell) {
                        handleToggleTableCellBold(selectedTableCell.row, selectedTableCell.col);
                      }
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                      selectedTableCell && selectedElement.tableCellStyles?.[`${selectedTableCell.row}-${selectedTableCell.col}`]?.bold
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>In đậm</span>
                  </button>
                  <button
                    type="button"
                    disabled={!selectedTableCell}
                    onClick={() => {
                      if (selectedTableCell) {
                        handleToggleTableCellItalic(selectedTableCell.row, selectedTableCell.col);
                      }
                    }}
                    className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 border transition-colors cursor-pointer ${
                      selectedTableCell && selectedElement.tableCellStyles?.[`${selectedTableCell.row}-${selectedTableCell.col}`]?.italic
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-600'
                        : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>In nghiêng</span>
                  </button>
                </div>
              </div>

              {/* Add & Delete Rows */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quản lý Hàng (Rows)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAddTableRow}
                    className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Thêm hàng</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTableRow(selectedTableCell?.row)}
                    disabled={(selectedElement.tableData?.length || 0) <= 1}
                    className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1 transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Xóa hàng</span>
                  </button>
                </div>
              </div>

              {/* Add & Delete Columns */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Quản lý Cột (Columns)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={handleAddTableColumn}
                    className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1 transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Thêm cột</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteTableColumn(selectedTableCell?.col)}
                    disabled={(selectedElement.tableData?.[0]?.length || 0) <= 1}
                    className="py-1.5 px-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-red-50 text-xs font-bold text-red-600 dark:text-red-400 flex items-center justify-center gap-1 transition-colors disabled:opacity-30 cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Xóa cột</span>
                  </button>
                </div>
              </div>

              {/* Table Header Color */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Màu hàng tiêu đề
                  </label>
                  <input
                    type="color"
                    value={selectedElement.tableHeaderBg || '#4f46e5'}
                    onChange={(e) => updateSelectedElement({ tableHeaderBg: e.target.value })}
                    className="w-5 h-5 rounded cursor-pointer border-0"
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {['#4f46e5', '#0f172a', '#059669', '#0284c7', '#d97706', '#dc2626'].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateSelectedElement({ tableHeaderBg: c })}
                      style={{ backgroundColor: c }}
                      className="w-5 h-5 rounded-md border border-slate-300 hover:scale-110 transition-transform cursor-pointer"
                    />
                  ))}
                </div>
              </div>

              {/* Delete Entire Table */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="w-full py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa hoàn toàn bảng này</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* CHART INSPECTOR & DATA TABLE EDITOR (LIVE REAL-TIME UPDATES & COLOR)      */}
          {/* ========================================================================= */}
          {selectedElement && selectedElement.type === 'chart' && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-1.5">
                  <BarChart2 className="w-4 h-4 text-orange-500" />
                  <span className="text-xs font-bold uppercase text-slate-800 dark:text-slate-100 tracking-wider">
                    Chỉnh Sửa Biểu Đồ
                  </span>
                </div>
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300">
                  {selectedElement.chartType === 'pie' ? 'Tròn' : selectedElement.chartType === 'line' ? 'Đường' : 'Cột'}
                </span>
              </div>

              {/* 1. Switch Chart Type */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chuyển đổi loại biểu đồ:
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { type: 'bar' as const, label: 'Cột', icon: BarChart2 },
                    { type: 'pie' as const, label: 'Tròn', icon: PieChart },
                    { type: 'line' as const, label: 'Đường', icon: TrendingUp },
                  ].map((item) => (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => updateSelectedElement({ chartType: item.type })}
                      className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 border transition-all cursor-pointer ${
                        selectedElement.chartType === item.type || (!selectedElement.chartType && item.type === 'bar')
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/60 text-orange-600 shadow-xs'
                          : 'border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <item.icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Chart Title Input */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề biểu đồ:
                </label>
                <input
                  type="text"
                  value={selectedElement.chartTitle || ''}
                  placeholder="Nhập tiêu đề biểu đồ..."
                  onChange={(e) => updateSelectedElement({ chartTitle: e.target.value })}
                  className="w-full p-2 text-xs font-semibold rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white outline-none focus:border-orange-500"
                />
              </div>

              {/* 3. Primary Color Palette & Color Picker */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Màu sắc chủ đạo:
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-400">{selectedElement.color || '#4f46e5'}</span>
                    <input
                      type="color"
                      value={selectedElement.color?.startsWith('#') ? selectedElement.color : '#4f46e5'}
                      onChange={(e) => updateSelectedElement({ color: e.target.value })}
                      className="w-6 h-6 rounded-md cursor-pointer border-0 p-0"
                      title="Chọn mã màu riêng"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {[
                    '#4f46e5',
                    '#2563eb',
                    '#06b6d4',
                    '#059669',
                    '#d97706',
                    '#ea580c',
                    '#e11d48',
                    '#9333ea',
                    '#0f172a',
                    '#14b8a6',
                    '#84cc16',
                    '#f43f5e',
                    '#64748b',
                    '#3b82f6',
                  ].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => updateSelectedElement({ color: c })}
                      style={{ backgroundColor: c }}
                      className={`w-6 h-6 rounded-md transition-transform hover:scale-110 cursor-pointer shadow-xs ${
                        selectedElement.color === c ? 'ring-2 ring-offset-1 ring-orange-500 scale-105' : ''
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* 4. DATA TABLE EDITOR (NHÃN & GIÁ TRỊ) */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Bảng Số Liệu Biểu Đồ:
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {(selectedElement.chartLabels || []).length} mục
                  </span>
                </div>

                <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-xs">
                  {/* Table Header */}
                  <div className="grid grid-cols-12 bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase tracking-wider py-1.5 px-2 border-b border-slate-200 dark:border-slate-700 gap-1 items-center">
                    <div className="col-span-1 text-center">#</div>
                    <div className="col-span-5">Nhãn (Tên cột)</div>
                    <div className="col-span-3 text-center">Giá trị</div>
                    <div className="col-span-2 text-center">Màu cột</div>
                    <div className="col-span-1 text-center">Xóa</div>
                  </div>

                  {/* Rows */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 max-h-60 overflow-y-auto">
                    {(selectedElement.chartLabels || []).map((label, idx) => {
                      const val = (selectedElement.chartValues || [])[idx] ?? 0;
                      const palette = [
                        selectedElement.color || '#4f46e5',
                        '#06b6d4',
                        '#10b981',
                        '#f59e0b',
                        '#ec4899',
                        '#8b5cf6',
                        '#3b82f6',
                        '#f97316',
                      ];
                      const currentColor =
                        (selectedElement.chartColors && selectedElement.chartColors[idx]) ||
                        palette[idx % palette.length];

                      return (
                        <div key={idx} className="grid grid-cols-12 items-center p-1.5 gap-1 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <div className="col-span-1 text-[11px] font-bold text-slate-400 text-center">
                            {idx + 1}
                          </div>
                          {/* 1. Nhãn (Tuần 1, Tuần 2, ...) */}
                          <div className="col-span-5">
                            <input
                              type="text"
                              value={label}
                              placeholder={`Tuần ${idx + 1}`}
                              onChange={(e) => {
                                const newLabels = [...(selectedElement.chartLabels || [])];
                                newLabels[idx] = e.target.value;
                                updateSelectedElement({ chartLabels: newLabels });
                              }}
                              className="w-full text-xs font-medium px-2 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 outline-none"
                            />
                          </div>
                          {/* 2. Giá trị (45, 70, 85, ...) */}
                          <div className="col-span-3">
                            <input
                              type="number"
                              value={val}
                              onChange={(e) => {
                                const newValues = [...(selectedElement.chartValues || [])];
                                newValues[idx] = parseFloat(e.target.value) || 0;
                                updateSelectedElement({ chartValues: newValues });
                              }}
                              className="w-full text-xs font-mono font-bold text-center px-1.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 focus:border-orange-500 focus:bg-white dark:focus:bg-slate-900 outline-none text-orange-600 dark:text-orange-400"
                            />
                          </div>
                          {/* 3. Đổi màu từng cột */}
                          <div className="col-span-2 flex items-center justify-center">
                            <input
                              type="color"
                              value={currentColor}
                              onChange={(e) => {
                                const currentColors = [
                                  ...(selectedElement.chartColors ||
                                    (selectedElement.chartLabels || []).map(
                                      (_, i) => palette[i % palette.length]
                                    )),
                                ];
                                currentColors[idx] = e.target.value;
                                updateSelectedElement({ chartColors: currentColors });
                              }}
                              className="w-6 h-6 rounded-md cursor-pointer border-0 p-0 shadow-xs"
                              title={`Đổi màu cho cột "${label}"`}
                            />
                          </div>
                          {/* 4. Xóa cột */}
                          <div className="col-span-1 flex items-center justify-center">
                            <button
                              type="button"
                              disabled={(selectedElement.chartLabels || []).length <= 1}
                              onClick={() => {
                                const newLabels = [...(selectedElement.chartLabels || [])];
                                const newValues = [...(selectedElement.chartValues || [])];
                                const newColors = [
                                  ...(selectedElement.chartColors ||
                                    (selectedElement.chartLabels || []).map(
                                      (_, i) => palette[i % palette.length]
                                    )),
                                ];
                                newLabels.splice(idx, 1);
                                newValues.splice(idx, 1);
                                if (newColors.length > idx) newColors.splice(idx, 1);
                                updateSelectedElement({
                                  chartLabels: newLabels,
                                  chartValues: newValues,
                                  chartColors: newColors,
                                });
                              }}
                              className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 disabled:opacity-20 cursor-pointer"
                              title="Xóa cột này"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Add New Column Button */}
                <button
                  id="btn-add-chart-column"
                  type="button"
                  onClick={() => {
                    const currentLabels = selectedElement.chartLabels || [];
                    const currentValues = selectedElement.chartValues || [];
                    const palette = [
                      selectedElement.color || '#4f46e5',
                      '#06b6d4',
                      '#10b981',
                      '#f59e0b',
                      '#ec4899',
                      '#8b5cf6',
                      '#3b82f6',
                      '#f97316',
                    ];
                    const currentColors =
                      selectedElement.chartColors ||
                      currentLabels.map((_, i) => palette[i % palette.length]);
                    const count = currentLabels.length + 1;
                    const newLabels = [...currentLabels, `Tuần ${count}`];
                    const newValues = [...currentValues, Math.floor(Math.random() * 40) + 50];
                    const newColors = [...currentColors, palette[(count - 1) % palette.length]];
                    updateSelectedElement({
                      chartLabels: newLabels,
                      chartValues: newValues,
                      chartColors: newColors,
                    });
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-orange-50 dark:bg-orange-950/60 hover:bg-orange-100 dark:hover:bg-orange-900 text-orange-700 dark:text-orange-300 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-orange-200 dark:border-orange-800"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm Cột Mới (Cột #{(selectedElement.chartLabels || []).length + 1})</span>
                </button>
              </div>

              {/* Delete Chart */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={handleDeleteSelected}
                  className="w-full py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa biểu đồ này</span>
                </button>
              </div>
            </div>
          )}

          {/* ========================================== */}
          {/* 5. SLIDE SETTINGS (WHEN NOTHING SELECTED)  */}
          {/* ========================================== */}
          {!selectedElement && (
            <div className="space-y-4 animate-in fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">
                  Cài Đặt Trang Slide #{activeSlideIndex + 1}
                </span>
                <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold px-1.5 py-0.5 rounded">
                  SLIDE
                </span>
              </div>

              {/* Slide Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên / Nhãn slide
                </label>
                <input
                  type="text"
                  value={currentSlide.title || ''}
                  onChange={(e) => updateCurrentSlideProperty('title', e.target.value)}
                  className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="Ví dụ: Giới thiệu dự án..."
                />
              </div>

              {/* Slide Background Color */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Màu nền trang
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {BACKGROUND_PRESETS.slice(0, 8).map((preset, bIdx) => (
                    <button
                      key={bIdx}
                      type="button"
                      onClick={() => updateCurrentSlideProperty('backgroundColor', preset.value)}
                      style={{ background: preset.value }}
                      className="w-full h-8 rounded-lg border border-slate-300 dark:border-slate-600 hover:scale-105 transition-transform cursor-pointer"
                      title={preset.label}
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">Mã màu tùy chỉnh:</span>
                  <input
                    type="color"
                    value={currentSlide.backgroundColor?.startsWith('#') ? currentSlide.backgroundColor : '#ffffff'}
                    onChange={(e) => updateCurrentSlideProperty('backgroundColor', e.target.value)}
                    className="w-6 h-6 rounded cursor-pointer border-0"
                  />
                </div>
              </div>

              {/* Speaker Notes */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Ghi chú thuyết trình (Speaker Notes)
                </label>
                <textarea
                  rows={3}
                  value={currentSlide.notes || ''}
                  onChange={(e) => updateCurrentSlideProperty('notes', e.target.value)}
                  className="w-full p-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  placeholder="Lời dẫn: Chào thầy cô và các bạn, ở slide này nhóm xin phép trình bày về..."
                />
              </div>

              {/* Clear slide elements */}
              <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => updateCurrentSlideElements([])}
                  className="w-full py-2 px-3 rounded-xl border border-red-200 dark:border-red-900/60 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa hết đối tượng trên slide</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 3. FULL PRESENTATION MODE OVERLAY (F5 / Trình Chiếu Toàn Màn Hình)         */}
      {/* ========================================================================= */}
      {isPresenting && (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between p-4 sm:p-8 animate-in fade-in select-none">
          {/* Top Bar */}
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-mono text-slate-300">
                Đang trình chiếu • Dùng phím [← / → / Khoảng trắng] để chuyển slide • [ESC] để thoát
              </span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                {currentConfig.label} ({canvasWidth}×{canvasHeight}px)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsPresenting(false)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
              title="Thoát trình chiếu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Centered Scaled Canvas (Preserves Chosen Aspect Ratio) */}
          <div
            ref={presentContainerRef}
            style={{
              aspectRatio: currentConfig.aspectRatioCss,
              maxWidth:
                aspectRatio === '9:16'
                  ? 'min(460px, 80vw)'
                  : aspectRatio === '1:1'
                  ? 'min(680px, 75vh, 85vw)'
                  : aspectRatio === '4:3'
                  ? 'min(920px, 80vh, 90vw)'
                  : 'min(1152px, 80vh * 1.777, 92vw)',
              maxHeight: '82vh',
              width: '100%',
              position: 'relative',
              overflow: 'hidden',
            }}
            className="mx-auto rounded-3xl overflow-hidden shadow-2xl my-auto relative border border-slate-800"
          >
            <div
              style={{
                background: deck.slides[presentingSlideIndex]?.backgroundColor || '#ffffff',
                width: '100%',
                height: '100%',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: `${canvasWidth}px`,
                  height: `${canvasHeight}px`,
                  transform: `scale(${presentScale})`,
                  transformOrigin: 'top left',
                }}
              >
                {getSlideCanvasElements(deck.slides[presentingSlideIndex] || currentSlide).map((el) =>
                  renderElement(el, true)
                )}
              </div>
            </div>
          </div>

          {/* Bottom Navigator */}
          <div className="flex items-center justify-between max-w-5xl w-full mx-auto pt-2">
            <button
              type="button"
              disabled={presentingSlideIndex === 0}
              onClick={() => setPresentingSlideIndex((p) => Math.max(0, p - 1))}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 disabled:opacity-20 flex items-center gap-2 text-sm font-semibold cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              Slide Trước
            </button>

            <span className="text-sm font-bold font-mono">
              {presentingSlideIndex + 1} / {deck.slides.length}
            </span>

            <button
              type="button"
              disabled={presentingSlideIndex === deck.slides.length - 1}
              onClick={() => setPresentingSlideIndex((p) => Math.min(deck.slides.length - 1, p + 1))}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-20 flex items-center gap-2 text-sm font-semibold cursor-pointer"
            >
              Slide Kế Tiếp
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* COLOR PICKER MODAL (Requirement 1, 2, 3, 4)                               */}
      {/* High z-index (z-[9999]), live preview, rainbow slider, 2D circle drag,   */}
      {/* Hex input supporting #12290F, and "Áp dụng" button                       */}
      {/* ========================================================================= */}
      {isColorPickerOpen && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={handleCancelColor}
        >
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <Palette className="w-5 h-5 text-indigo-600" />
                <h3 className="font-extrabold text-sm text-slate-900 dark:text-white">
                  Bảng Chọn Màu Chữ
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCancelColor}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 1. 2D SATURATION & BRIGHTNESS GRADIENT FIELD (Kéo chấm tròn) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Kéo chấm tròn chọn độ sáng & độ bão hòa:
              </span>
              <div
                className="relative w-full h-44 rounded-2xl cursor-crosshair overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner select-none touch-none"
                style={{
                  backgroundColor: `hsl(${pickerHsv.h}, 100%, 50%)`,
                }}
                onPointerDown={(e) => {
                  e.currentTarget.setPointerCapture(e.pointerId);
                  handleSatValPointer(e);
                }}
                onPointerMove={(e) => {
                  if (e.buttons === 1) {
                    handleSatValPointer(e);
                  }
                }}
                onPointerUp={(e) => {
                  try {
                    e.currentTarget.releasePointerCapture(e.pointerId);
                  } catch (_) {}
                }}
              >
                {/* White to transparent overlay (left to right) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to right, #ffffff, transparent)',
                  }}
                />
                {/* Black to transparent overlay (bottom to top) */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to top, #000000, transparent)',
                  }}
                />

                {/* Draggable Circle Pointer (Chấm tròn kéo) */}
                <div
                  className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg pointer-events-none -translate-x-1/2 -translate-y-1/2 transition-transform duration-75"
                  style={{
                    left: `${pickerHsv.s}%`,
                    top: `${100 - pickerHsv.v}%`,
                    backgroundColor: pickerCurrentColor,
                  }}
                />
              </div>
            </div>

            {/* 2. RAINBOW HUE SLIDER (Thanh cầu vồng) */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Thanh cầu vồng (Dải quang phổ màu sắc):
              </span>
              <div className="relative py-1">
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={pickerHsv.h}
                  onChange={(e) => {
                    const newHue = Number(e.target.value);
                    const nextHsv = { ...pickerHsv, h: newHue };
                    setPickerHsv(nextHsv);
                    const newHex = hsvToHex(nextHsv.h, nextHsv.s, nextHsv.v);
                    setPickerCurrentColor(newHex);
                    setPickerHexInput(newHex);
                    updateElementColorLive(colorPickerTargetId, newHex);
                  }}
                  className="w-full h-4 rounded-full appearance-none cursor-pointer outline-none shadow-inner"
                  style={{
                    background:
                      'linear-gradient(to right, #ff0000 0%, #ffff00 17%, #00ff00 33%, #00ffff 50%, #0000ff 67%, #ff00ff 83%, #ff0000 100%)',
                  }}
                />
              </div>
            </div>

            {/* 3. HEX INPUT & PREVIEW COMPARISON */}
            <div className="grid grid-cols-2 gap-3 items-center pt-1">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Mã màu HEX:
                </label>
                <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <span className="text-slate-400 font-mono text-xs">#</span>
                  <input
                    type="text"
                    value={pickerHexInput.replace('#', '')}
                    onChange={(e) => {
                      const val = `#${e.target.value.replace('#', '').toUpperCase()}`;
                      setPickerHexInput(val);
                      if (/^#[0-9A-F]{6}$/i.test(val)) {
                        setPickerCurrentColor(val);
                        setPickerHsv(hexToHsv(val));
                        updateElementColorLive(colorPickerTargetId, val);
                      }
                    }}
                    placeholder="12290F"
                    maxLength={6}
                    className="w-full bg-transparent text-xs font-mono font-extrabold text-slate-900 dark:text-white uppercase outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Màu trước / Màu mới:
                </label>
                <div className="flex items-center h-9 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-inner">
                  <div
                    className="flex-1 h-full flex items-center justify-center text-[10px] font-bold text-white/80 drop-shadow-xs"
                    style={{ backgroundColor: pickerOriginalColor }}
                    title="Màu ban đầu"
                  >
                    Gốc
                  </div>
                  <div
                    className="flex-1 h-full flex items-center justify-center text-[10px] font-bold text-white drop-shadow-xs"
                    style={{ backgroundColor: pickerCurrentColor }}
                    title="Màu mới chọn"
                  >
                    Mới
                  </div>
                </div>
              </div>
            </div>

            {/* 4. PRESET SWATCHES (bao gồm #12290F) */}
            <div className="space-y-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Màu đề xuất & thường dùng:
              </span>
              <div className="flex flex-wrap gap-2">
                {COLOR_PALETTE.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      setPickerCurrentColor(hex);
                      setPickerHexInput(hex);
                      setPickerHsv(hexToHsv(hex));
                      updateElementColorLive(colorPickerTargetId, hex);
                    }}
                    style={{ backgroundColor: hex }}
                    className={`w-6 h-6 rounded-lg border cursor-pointer hover:scale-115 transition-transform ${
                      pickerCurrentColor.toUpperCase() === hex.toUpperCase()
                        ? 'ring-2 ring-indigo-500 border-white shadow-md'
                        : 'border-slate-300 dark:border-slate-600'
                    }`}
                    title={hex === '#12290F' ? 'Xanh rêu đậm (#12290F)' : hex}
                  />
                ))}
              </div>
            </div>

            {/* 5. MODAL FOOTER WITH "Áp dụng" (Requirement 4) & "Hủy" */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={handleCancelColor}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleApplyColor}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-xs font-extrabold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <Check className="w-4 h-4 stroke-[2.5]" />
                <span>Áp dụng</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EXPORT MODAL: PDF, PNG & BROWSER PRINT (Preserves Active Aspect Ratio)     */}
      {/* ========================================================================= */}
      {showExportModal && (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in"
          onClick={() => setShowExportModal(false)}
        >
          <div
            className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl p-5 sm:p-6 space-y-5 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center border border-indigo-200 dark:border-indigo-800">
                  <Download className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">
                    Xuất Tệp Bài Thuyết Trình
                  </h3>
                  <p className="text-xs text-slate-500 truncate max-w-xs sm:max-w-sm">
                    {deck.title || 'Bài thuyết trình không tiêu đề'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                title="Đóng"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Current Ratio Card */}
            <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/40 rounded-2xl border border-indigo-200 dark:border-indigo-800/60 space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-xs">
                  <Layout className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <span className="text-slate-600 dark:text-slate-400 font-medium">Tỷ lệ khung hình áp dụng:</span>
                  <span className="font-extrabold text-indigo-700 dark:text-indigo-300 bg-white dark:bg-slate-800 px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-indigo-800">
                    {currentConfig.label} ({canvasWidth}×{canvasHeight}px)
                  </span>
                </div>
              </div>

              {/* Quick ratio toggle */}
              <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                <span className="text-[11px] text-slate-500 font-semibold mr-1">Đổi nhanh tỷ lệ:</span>
                {ASPECT_RATIO_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectAspectRatio(opt.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      opt.id === aspectRatio
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {opt.shortLabel}
                  </button>
                ))}
              </div>
            </div>

            {/* Export Actions List */}
            <div className="space-y-2.5">
              {/* Option 1: PDF Export */}
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={isExportingPdf}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 border border-red-200 dark:border-red-800/60 group-hover:scale-105 transition-transform">
                    {isExportingPdf ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <FileText className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Tải Xuất File PDF Toàn Bộ Slide (.pdf)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded">
                        PDF
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      {deck.slides.length} slide • Khổ {canvasWidth}×{canvasHeight}px chuẩn tỷ lệ {currentConfig.shortLabel}
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              </button>

              {/* Option 2: PNG Export */}
              <button
                type="button"
                onClick={handleDownloadPng}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800/60 group-hover:scale-105 transition-transform">
                    <ImageIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>Tải Về Ảnh Slide Hiện Tại (#{activeSlideIndex + 1}) (.png)</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 rounded">
                        PNG
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Độ nét cao {canvasWidth}×{canvasHeight}px • Thích hợp chia sẻ nhanh
                    </div>
                  </div>
                </div>
                <Download className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              </button>

              {/* Option 3: Browser Print */}
              <button
                type="button"
                onClick={handleBrowserPrint}
                className="w-full flex items-center justify-between p-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-indigo-500 hover:bg-indigo-50/40 dark:hover:bg-indigo-950/30 transition-all text-left cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-200 dark:border-indigo-800/60 group-hover:scale-105 transition-transform">
                    <Printer className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-extrabold text-xs sm:text-sm text-slate-900 dark:text-white flex items-center gap-1.5">
                      <span>In / Xuất PDF Bằng Hộp Thoại Trình Duyệt</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.2 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded">
                        Ctrl+P
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Tự động căn lề theo khổ {currentConfig.label} khi in
                    </div>
                  </div>
                </div>
                <Printer className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 shrink-0" />
              </button>
            </div>

            {/* Footer */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowExportModal(false)}
                className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DEDICATED PRINT CONTAINER (Active only during browser printing)             */}
      {/* ========================================================================= */}
      <div className="print-only-deck" style={{ display: 'none' }}>
        {deck.slides.map((slide, sIdx) => {
          const sElements = getSlideCanvasElements(slide);
          return (
            <div key={slide.id || sIdx} className="print-slide-page">
              <div
                style={{
                  width: `${canvasWidth}px`,
                  height: `${canvasHeight}px`,
                  background: slide.backgroundColor || '#ffffff',
                  position: 'relative',
                  overflow: 'hidden',
                  margin: 'auto',
                }}
              >
                {sElements.map((el) => renderElement(el, true))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Toast Notification khi bấm Lưu */}
      {showSaveToast && (
        <div
          id="toast-slide-saved"
          className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 bg-emerald-600 text-white px-5 py-3.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-5"
        >
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Save className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="text-xs font-extrabold">Đã lưu vào Kho Lưu Trữ</div>
            <div className="text-[11px] text-emerald-100 mt-0.5">
              Đã tạo tệp {deck.title || 'Slide'}.ppt và tự động đồng bộ vào Kho Tài Liệu.
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
