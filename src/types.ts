export type ThemeColor =
  | 'pastel-mint'
  | 'pastel-lavender'
  | 'pastel-peach'
  | 'pastel-sakura'
  | 'pastel-sky'
  | 'pastel-butter'
  | 'pastel-sage'
  | 'pastel-lilac'
  | 'indigo'
  | 'emerald'
  | 'violet'
  | 'sky'
  | 'rose'
  | 'amber'
  | string;

export interface Member {
  id: string;
  name: string;
  avatar: string;
  role: string;
  email: string;
  isOnline: boolean;
  isSpeaking?: boolean;
  micMuted?: boolean;
  statusText?: string;
  lastActive?: string;
  isAdmin?: boolean;
}

export interface ChatGroupChannel {
  id: string;
  name: string;
  description?: string;
  memberIds?: string[];
  isDefault?: boolean;
  creatorId?: string;
  creatorEmail?: string;
}

export interface ChatMessage {
  id: string;
  projectId: string;
  chatId?: string; // Deterministic Chat ID, e.g. [uid1, uid2].sort().join('_') for 1-1, or grp_${projectId}_${channelId}
  channelId?: string; // ID của kênh nhóm thảo luận (e.g. ch_main, ch_...)
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderEmail?: string;
  recipientId?: string; // If undefined => Group chat; if defined => Direct Message
  receiverId?: string; // Alias for recipientId
  recipientEmail?: string;
  participants?: string[]; // Sorted user IDs participating in this chat: [uid1, uid2].sort()
  text: string;
  timestamp: string;
  createdAt?: string; // ISO 8601 string for strict orderBy('createdAt', 'asc')
  type: 'text' | 'file' | 'image' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  isAi?: boolean;
}

export type TaskStatus = 'todo' | 'in_progress' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assigneeId: string;
  assigneeName: string;
  assigneeAvatar: string;
  dueDate: string;
  status: TaskStatus;
  priority: TaskPriority;
  tags: string[];
}

export interface SlideElement {
  id: string;
  type: 'text' | 'badge' | 'quote' | 'stat';
  content: string;
  detail?: string;
}

export type CanvasElementType = 'text' | 'image' | 'shape' | 'icon' | 'table' | 'chart' | 'sticker';

export interface CanvasElement {
  id: string;
  type: CanvasElementType;
  x: number; // coordinate on standard 960x540 canvas
  y: number;
  width: number;
  height: number;
  rotation?: number; // 0-360 degrees
  zIndex?: number;
  opacity?: number; // 0 to 1

  // Text properties
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  fontWeight?: 'normal' | 'bold' | '600' | '800';
  fontStyle?: 'normal' | 'italic';
  textDecoration?: 'none' | 'underline' | 'line-through';
  textAlign?: 'left' | 'center' | 'right' | 'justify';
  color?: string;
  backgroundColor?: string;
  lineHeight?: number;
  letterSpacing?: number;
  highlightColor?: string;
  listType?: 'none' | 'disc' | 'dash' | 'arrow' | 'decimal';

  // Image properties
  src?: string;
  alt?: string;
  objectFit?: 'cover' | 'contain' | 'fill';

  // Shape properties
  shapeType?:
    | 'rectangle'
    | 'square'
    | 'rounded-rect'
    | 'circle'
    | 'oval'
    | 'triangle'
    | 'right-triangle'
    | 'star'
    | 'heart'
    | 'diamond'
    | 'pentagon'
    | 'hexagon'
    | 'arrow'
    | 'arrow-left'
    | 'arrow-up'
    | 'arrow-down'
    | 'arrow-double'
    | 'arrow-curved'
    | 'arrow-chevron'
    | 'line'
    | 'speech-bubble'
    | 'thought-bubble'
    | 'callout-box'
    | 'banner';
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  shadow?: boolean;
  shapeText?: string;
  shapeTextColor?: string;
  shapeFontSize?: number;

  // Icon & Sticker properties
  iconName?: string;
  stickerId?: string;
  stickerLabel?: string;
  isAnimated?: boolean;
  animationEffect?: 'pulse' | 'bounce' | 'spin' | 'float' | 'wiggle' | 'heartbeat' | 'flash' | 'tada';

  // Table properties
  tableRows?: number;
  tableCols?: number;
  tableData?: string[][];
  tableCellStyles?: Record<string, { bold?: boolean; italic?: boolean; color?: string; bg?: string; align?: 'left' | 'center' | 'right' }>;
  tableHeaderBg?: string;
  tableFontSize?: number;
  tableBorderColor?: string;

  // Chart properties
  chartType?: 'bar' | 'pie' | 'line';
  chartLabels?: string[];
  chartValues?: number[];
  chartColors?: string[];
  chartTitle?: string;
}

export interface Slide {
  id: string;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  notes?: string;
  layout?: 'title' | 'split' | 'cards' | 'timeline' | 'conclusion' | 'blank';
  elements?: SlideElement[];
  canvasElements?: CanvasElement[];
  backgroundColor?: string;
  backgroundGradient?: string;
  backgroundImage?: string;
  accentColor?: string;
}

export type SlideThemeStyle =
  | 'pastel-mint'
  | 'pastel-lavender'
  | 'pastel-peach'
  | 'pastel-sky'
  | 'pastel-sakura'
  | 'modern'
  | 'academic'
  | 'creative'
  | 'minimal';

export type CanvasAspectRatio = '16:9' | '4:3' | '1:1' | '9:16';

export interface SlideDeck {
  id: string;
  projectId: string;
  title: string;
  author: string;
  themeStyle: SlideThemeStyle;
  slides: Slide[];
  lastModified: string;
  aspectRatio?: CanvasAspectRatio;
}

export interface DocumentResource {
  id: string;
  projectId: string;
  name: string;
  type: 'pdf' | 'ppt' | 'doc' | 'sheet' | 'link' | 'image';
  size: string;
  uploaderName: string;
  uploaderAvatar: string;
  uploadedAt: string;
  url?: string;
  fileUrl?: string;
  description: string;
  tags: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  category: 'Học tập' | 'Báo cáo môn học' | 'Dự án nghiên cứu' | 'Khởi nghiệp' | 'Hoạt động CLB';
  members: Member[];
  status: 'active' | 'in_review' | 'completed';
  progress: number;
  avatarColor: string;
  deadline: string;
  slides?: Slide[]; // Các trang slide thuộc bài thuyết trình / project này
  createdAt?: string; // Ngày tạo bài thuyết trình
  ownerId?: string; // ID của chủ sở hữu / người tạo dự án (chỉ duy nhất ID này mới là Quản trị viên)
  adminId?: string; // ID của Quản trị viên nhóm (người có quyền xóa thành viên)
  creatorEmail?: string; // Email của người tạo dự án
  creatorId?: string; // ID của người tạo dự án
  aspectRatio?: CanvasAspectRatio;
  themeStyle?: SlideThemeStyle;
}

export interface AppNotification {
  id: string;
  projectId?: string;
  projectName?: string;
  title: string;
  body: string;
  timestamp: string;
  type: 'urgent' | 'member_remove' | 'member_add' | 'task' | 'deadline' | 'system';
  read: boolean;
  sentToDevice?: boolean;
}

export type InvitationStatus = 'pending' | 'accepted' | 'joined' | 'declined' | 'revoked';

export interface TeamInvitation {
  id: string;
  email: string;
  recipientName?: string;
  projectId: string;
  projectName: string;
  projectCategory?: string;
  inviterName: string;
  inviterEmail?: string;
  role: string;
  message?: string;
  status: InvitationStatus;
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  acceptedBy?: {
    id: string;
    name: string;
    email: string;
  };
  inviteUrl: string;
  emailDeliveryStatus?: 'sent' | 'pending' | 'failed' | 'fallback_mailto';
  emailDeliveryMessage?: string;
  emailProvider?: 'resend' | 'gmail_smtp' | 'custom_smtp' | 'none';
  previewUrl?: string;
  gmailWebComposeUrl?: string;
  mailtoUrl?: string;
}

export type ActiveTab = 'overview' | 'tasks' | 'slides' | 'chat' | 'documents' | 'up_ai';
