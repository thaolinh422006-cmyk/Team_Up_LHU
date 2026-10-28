import { Project, Member, Task, SlideDeck, DocumentResource, ChatMessage, AppNotification } from '../types';

export const THU_HUYEN: Member = {
  id: 'usr_huyen',
  name: 'Thu Huyền',
  avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  role: 'Trưởng nhóm / Quản trị viên',
  email: 'hthuhuyen9107@gmail.com',
  isOnline: true,
  isSpeaking: false,
  micMuted: true,
  statusText: 'Chủ sở hữu & Trưởng nhóm dự án',
  lastActive: 'Đang hoạt động',
  isAdmin: true,
};

export const LINH: Member = {
  id: 'usr_1793157460681_447f6',
  name: 'Linh',
  avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  role: 'Thành viên nhóm',
  email: 'thaolinh422006@gmail.com',
  isOnline: true,
  isSpeaking: false,
  micMuted: true,
  statusText: 'Đang hoạt động',
  lastActive: 'Đang hoạt động',
  isAdmin: false,
};

export const CURRENT_USER: Member = THU_HUYEN;

// Real members in system
export const INITIAL_MEMBERS: Member[] = [
  THU_HUYEN,
  LINH,
];

// Clean single initial slide for the presentation editor
export const INITIAL_SLIDES: SlideDeck = {
  id: 'deck_1',
  projectId: 'proj_1',
  title: 'Báo Cáo Dự Án: Ứng Dụng AI Trong Giáo Dục',
  author: 'Thu Huyền',
  themeStyle: 'modern',
  lastModified: 'Vừa xong',
  aspectRatio: '16:9',
  slides: [
    {
      id: 'slide_1',
      title: 'Slide 1 (Trang Trắng)',
      subtitle: '',
      bullets: [],
      notes: '',
      layout: 'blank',
      backgroundColor: '#ffffff',
      canvasElements: [],
    },
  ],
};

// Real project with real members
export const INITIAL_PROJECTS: Project[] = [
  {
    id: 'proj_1',
    name: 'Báo Cáo Dự Án: Ứng Dụng AI Trong Giáo Dục',
    description: 'Nghiên cứu mô hình lớp học số và trợ lý ảo hỗ trợ học tập cá nhân hóa cho học sinh THPT và sinh viên đại học.',
    category: 'Báo cáo môn học',
    members: [THU_HUYEN, LINH],
    status: 'active',
    progress: 0,
    avatarColor: 'from-blue-600 to-indigo-600',
    deadline: '2026-10-30',
    createdAt: '26/10/2026',
    slides: INITIAL_SLIDES.slides,
    ownerId: 'usr_huyen',
    adminId: 'usr_huyen',
    creatorId: 'usr_huyen',
    creatorEmail: 'hthuhuyen9107@gmail.com',
  },
];

// Reset mock tasks to empty array
export const INITIAL_TASKS: Task[] = [];

// Reset mock notifications to empty array
export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

// Reset mock documents to empty array
export const INITIAL_DOCUMENTS: DocumentResource[] = [];

// Reset mock chat messages
export const INITIAL_MESSAGES: ChatMessage[] = [];
