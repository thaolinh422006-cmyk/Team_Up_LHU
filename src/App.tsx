import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { VoiceRoomBar } from './components/VoiceRoomBar';
import { DashboardView } from './components/DashboardView';
import { TaskBoardView } from './components/TaskBoardView';
import { PresentationEditor } from './components/PresentationEditor';
import { ChatView } from './components/ChatView';
import { DocumentsView } from './components/DocumentsView';
import { AiAssistantModal } from './components/AiAssistantModal';
import { UpAiView } from './components/UpAiView';
import { AddMemberModal } from './components/AddMemberModal';
import { JoinTeamModal } from './components/JoinTeamModal';
import { JoinByGmailModal } from './components/JoinByGmailModal';
import { AuthModal } from './components/AuthModal';
import { EditProfileModal } from './components/EditProfileModal';
import { DeviceToast } from './components/DeviceToast';
import {
  INITIAL_PROJECTS,
  CURRENT_USER,
  THU_HUYEN,
  INITIAL_TASKS,
  INITIAL_MESSAGES,
  INITIAL_DOCUMENTS,
  INITIAL_SLIDES,
  INITIAL_NOTIFICATIONS,
} from './data/mockData';
import { THEMES, createPastelTheme, applyThemeCssVariables } from './utils/theme';
import { createMemberFromEmail, formatNameFromEmail, isProjectCreator, getProjectRoleForUser } from './utils/user';
import { createDirectChatId, createChannelChatId } from './services/chatService';
import {
  ActiveTab,
  ThemeColor,
  Project,
  Member,
  Task,
  TaskStatus,
  ChatMessage,
  DocumentResource,
  Slide,
  SlideDeck,
  AppNotification,
  TeamInvitation,
} from './types';
import { sendDeviceNotification, requestDeviceNotificationPermission } from './utils/notificationService';
import { X, Check, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function App() {
  // Theme & Dark mode: support 5 classic colors, 12 pastel presets, and custom pastel hex
  const [themeColor, setThemeColor] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('teamup_theme');
      if (savedTheme) return savedTheme;
      const saved = localStorage.getItem('teamup_theme_color');
      if (saved) return saved;
    }
    return 'pastel-mint';
  });

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_dark_mode');
      if (saved !== null) return saved === 'true';
    }
    // Default to clean Light Mode
    return false;
  });

  // App navigation & state
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [directChatRecipientId, setDirectChatRecipientId] = useState<string | null>(null);

  const handleOpenDirectChat = (memberId: string) => {
    setDirectChatRecipientId(memberId);
    setActiveTab('chat');
  };

  // Purge mock data constants
  const MOCK_PROJECT_NAMES = [
    'Ý Tưởng Khởi Nghiệp: Nông Nghiệp Xanh 4.0',
    'Chiến Dịch Truyền Thông CLB Tình Nguyện',
  ];
  const MOCK_PROJECT_IDS = ['proj_2', 'proj_3'];
  const MOCK_TASK_IDS = ['tsk_1', 'tsk_2', 'tsk_3', 'tsk_4', 'tsk_5', 'tsk_6'];
  const MOCK_DOC_IDS = ['doc_1', 'doc_2', 'doc_3', 'doc_4'];
  const MOCK_MEMBER_EMAILS = [
    'hoang.minh@edu.vn',
    'vy.khanh@edu.vn',
    'long.bao@edu.vn',
    'hung.nguyen@edu.vn',
    'an.nguyen@teamup.vn',
    'binh.tran@teamup.vn',
    'chi.le@teamup.vn',
  ];
  const MOCK_MEMBER_IDS = ['usr_1', 'usr_2', 'usr_3', 'usr_4', 'usr_an', 'usr_binh', 'usr_chi'];
  const MOCK_MEMBER_NAMES = ['Minh Hoàng', 'Khánh Vy', 'Bảo Long', 'TS. Nguyễn Văn Hùng', 'An', 'Bình', 'Chi'];

  // Current authenticated user (with localStorage persistence)
  const [currentUser, setCurrentUser] = useState<Member | null>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved =
          localStorage.getItem('teamup_authenticated_user') ||
          localStorage.getItem('teamup_current_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          const cleanEmail = (parsed.email || '').trim().toLowerCase();
          let cleanName = (parsed.name || '').replace(/\s*\(Bạn\)/gi, '').trim();
          if (!cleanName) cleanName = formatNameFromEmail(cleanEmail);

          const isThuHuyen = cleanEmail === 'hthuhuyen9107@gmail.com' || parsed.id === 'usr_huyen';

          return {
            ...parsed,
            id: parsed.id || (isThuHuyen ? 'usr_huyen' : `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`),
            name: cleanName,
            email: cleanEmail,
            isAdmin: isThuHuyen,
            role: isThuHuyen ? 'Trưởng nhóm / Quản trị viên' : (parsed.role || 'Thành viên nhóm'),
          };
        }
      } catch (e) {
        console.error('Error parsing saved currentUser', e);
      }
    }
    // When entering the app, user must register or login
    return null;
  });

  const [projects, setProjects] = useState<Project[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_projects');
      if (saved) {
        try {
          const parsed: Project[] = JSON.parse(saved);
          const cleaned = parsed
            .filter(
              (p) =>
                !MOCK_PROJECT_IDS.includes(p.id) &&
                !MOCK_PROJECT_NAMES.some((name) => p.name.includes(name))
            )
            .map((p) => {
              const isBaoCao =
                p.id === 'proj_1' ||
                p.name.includes('Báo Cáo Dự Án') ||
                p.name.includes('Ứng Dụng AI');

              const pOwnerId = isBaoCao ? 'usr_huyen' : (p.ownerId || p.creatorId || p.adminId);
              const pCreatorEmail = isBaoCao ? 'hthuhuyen9107@gmail.com' : p.creatorEmail;

              let members: Member[] = (p.members || [])
                .filter(
                  (m) =>
                    !MOCK_MEMBER_IDS.includes(m.id) &&
                    !MOCK_MEMBER_EMAILS.includes((m.email || '').toLowerCase()) &&
                    !MOCK_MEMBER_NAMES.includes(m.name)
                )
                .map((m) => {
                  const isMAdmin = isBaoCao
                    ? (m.id === 'usr_huyen' || m.email?.toLowerCase() === 'hthuhuyen9107@gmail.com')
                    : (m.id === pOwnerId);
                  return {
                    ...m,
                    name: m.name.replace(/\s*\(Bạn\)/gi, '').trim(),
                    isAdmin: isMAdmin,
                    role: isMAdmin ? 'Trưởng nhóm / Quản trị viên' : 'Thành viên nhóm',
                  };
                });

              if (isBaoCao && !members.some((m) => m.id === 'usr_huyen' || m.email?.toLowerCase() === 'hthuhuyen9107@gmail.com')) {
                members.unshift({ ...THU_HUYEN, isAdmin: true, role: 'Trưởng nhóm / Quản trị viên' });
              }

              const pSlides =
                p.slides && Array.isArray(p.slides) && p.slides.length > 0
                  ? p.slides
                  : isBaoCao
                  ? INITIAL_SLIDES.slides
                  : [
                      {
                        id: `slide_${p.id}_1`,
                        title: 'Slide 1 (Trang Trắng)',
                        subtitle: '',
                        bullets: [],
                        notes: '',
                        layout: 'blank' as const,
                        backgroundColor: '#ffffff',
                        canvasElements: [],
                      },
                    ];

              return {
                ...p,
                createdAt: p.createdAt || '26/10/2026',
                slides: pSlides,
                ownerId: pOwnerId,
                adminId: pOwnerId,
                creatorId: pOwnerId,
                creatorEmail: pCreatorEmail,
                members,
              };
            });

          if (cleaned.length > 0) {
            localStorage.setItem('teamup_projects', JSON.stringify(cleaned));
            return cleaned;
          }
        } catch (e) {
          console.error('Failed to parse saved projects', e);
        }
      }
    }
    return INITIAL_PROJECTS;
  });

  const [activeProjectId, setActiveProjectId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_active_project_id');
      if (saved && !MOCK_PROJECT_IDS.includes(saved)) {
        return saved;
      }
    }
    return INITIAL_PROJECTS[0].id;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('teamup_active_project_id', activeProjectId);
    }
  }, [activeProjectId]);

  // Sync activeProjectId if current active project doesn't exist
  useEffect(() => {
    if (projects.length > 0 && !projects.some((p) => p.id === activeProjectId)) {
      setActiveProjectId(projects[0].id);
    }
  }, [projects, activeProjectId]);

  // Persist tasks in localStorage so assigned members and status are never lost
  const [tasks, setTasks] = useState<Task[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_tasks');
      if (saved) {
        try {
          const parsed: Task[] = JSON.parse(saved);
          const cleaned = parsed.filter(
            (t) =>
              !MOCK_TASK_IDS.includes(t.id) &&
              !MOCK_PROJECT_IDS.includes(t.projectId) &&
              !MOCK_MEMBER_IDS.includes(t.assigneeId || '')
          );
          localStorage.setItem('teamup_tasks', JSON.stringify(cleaned));
          return cleaned;
        } catch (e) {
          console.error('Failed to parse saved tasks', e);
        }
      }
    }
    return INITIAL_TASKS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teamup_tasks', JSON.stringify(tasks));
      } catch (e) {
        console.error('Failed to save tasks to localStorage', e);
      }
    }
  }, [tasks]);

  // Helper to strictly deduplicate chat messages by unique ID and sort chronologically
  const dedupeAndSortMessages = (list: ChatMessage[]): ChatMessage[] => {
    const map = new Map<string, ChatMessage>();
    for (const m of list) {
      if (m && m.id) {
        map.set(m.id, m);
      }
    }
    return Array.from(map.values()).sort((a, b) => {
      const tA = new Date(a.createdAt || a.timestamp).getTime() || 0;
      const tB = new Date(b.createdAt || b.timestamp).getTime() || 0;
      return tA - tB;
    });
  };

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_messages');
      if (saved) {
        try {
          const parsed: ChatMessage[] = JSON.parse(saved);
          const seen = new Set<string>();
          const cleaned = parsed.filter(
            (m) => {
              if (!m || !m.id) return false;
              if (seen.has(m.id)) return false;
              seen.add(m.id);
              return (
                !['msg_1', 'msg_2', 'msg_3', 'msg_4', 'msg_5', 'msg_an_dm_1', 'msg_group_1'].includes(m.id) &&
                !MOCK_PROJECT_IDS.includes(m.projectId) &&
                !MOCK_MEMBER_IDS.includes(m.senderId) &&
                !MOCK_MEMBER_IDS.includes(m.recipientId || '') &&
                !m.text?.toLowerCase().includes('oke mai họp nhé')
              );
            }
          );
          localStorage.setItem('teamup_messages', JSON.stringify(cleaned));
          return cleaned;
        } catch (e) {
          console.error('Failed to parse saved messages', e);
        }
      }
    }
    return INITIAL_MESSAGES;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const deduped = dedupeAndSortMessages(messages);
        localStorage.setItem('teamup_messages', JSON.stringify(deduped));
      } catch (e) {
        console.error('Failed to save messages to localStorage', e);
      }
    }
  }, [messages]);

  // Real-time synchronization of chat messages via Server-Sent Events (SSE) & live API
  useEffect(() => {
    if (!activeProjectId) return;

    const userParam = currentUser?.id ? `&userId=${encodeURIComponent(currentUser.id)}` : '';
    const emailParam = currentUser?.email ? `&email=${encodeURIComponent(currentUser.email)}` : '';

    // 1. Initial fetch from server
    fetch(`/api/messages?projectId=${encodeURIComponent(activeProjectId)}${userParam}${emailParam}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.messages)) {
          console.log('[CHAT DEBUG] 3. onSnapshot nhận dữ liệu ban đầu từ server:', data.messages.length, 'tin nhắn');
          setMessages((prev) => dedupeAndSortMessages([...prev, ...data.messages]));
        }
      })
      .catch((err) => console.warn('[CHAT DEBUG] Lỗi fetch messages ban đầu:', err));

    // 2. Connect live Server-Sent Events (SSE)
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(
        `/api/messages/stream?projectId=${encodeURIComponent(activeProjectId)}${userParam}${emailParam}`
      );
      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'new_message' && payload.message) {
            const incoming: ChatMessage = payload.message;
            console.log('[CHAT DEBUG] 3. onSnapshot nhận dữ liệu real-time (SSE incoming):', incoming);
            setMessages((prev) => dedupeAndSortMessages([...prev, incoming]));
          }
        } catch (e) {
          console.warn('[CHAT DEBUG] Lỗi parse SSE data:', e);
        }
      };
    } catch (e) {
      console.warn('[CHAT DEBUG] Không thể kết nối SSE stream, chuyển sang polling:', e);
    }

    // 3. Polling dự phòng mỗi 3s
    const pollInterval = setInterval(() => {
      fetch(`/api/messages?projectId=${encodeURIComponent(activeProjectId)}${userParam}${emailParam}`)
        .then((res) => res.json())
        .then((data) => {
          if (data.success && Array.isArray(data.messages)) {
            setMessages((prev) => dedupeAndSortMessages([...prev, ...data.messages]));
          }
        })
        .catch(() => {});
    }, 3000);

    return () => {
      clearInterval(pollInterval);
      if (eventSource) {
        eventSource.close();
      }
    };
  }, [activeProjectId, currentUser?.id, currentUser?.email]);

  // Persist documents in localStorage so uploaded files are stored and displayed across sessions
  const [documents, setDocuments] = useState<DocumentResource[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_documents');
      if (saved) {
        try {
          const parsed: DocumentResource[] = JSON.parse(saved);
          const cleaned = parsed.filter(
            (d) => !MOCK_DOC_IDS.includes(d.id) && !MOCK_PROJECT_IDS.includes(d.projectId)
          );
          localStorage.setItem('teamup_documents', JSON.stringify(cleaned));
          return cleaned;
        } catch (e) {
          console.error('Failed to parse saved documents', e);
        }
      }
    }
    return INITIAL_DOCUMENTS;
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('teamup_documents', JSON.stringify(documents));
      } catch (e) {
        console.error('Failed to save documents to localStorage', e);
      }
    }
  }, [documents]);

  // Active slide deck derived from activeProject - each project has its own slides
  const currentDeck: SlideDeck = useMemo(() => {
    const targetProject = projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECTS[0];
    const slides =
      targetProject.slides && Array.isArray(targetProject.slides) && targetProject.slides.length > 0
        ? targetProject.slides
        : [
            {
              id: `slide_${targetProject.id}_1`,
              title: 'Slide 1 (Trang Trắng)',
              subtitle: '',
              bullets: [],
              notes: '',
              layout: 'blank',
              backgroundColor: '#ffffff',
              canvasElements: [],
            },
          ];

    return {
      id: `deck_${targetProject.id}`,
      projectId: targetProject.id,
      title: targetProject.name,
      author: targetProject.members?.[0]?.name || currentUser?.name || 'Thành viên',
      themeStyle: (targetProject.themeStyle as any) || 'modern',
      lastModified: 'Vừa xong',
      aspectRatio: targetProject.aspectRatio || '16:9',
      slides,
    };
  }, [projects, activeProjectId, currentUser?.name]);

  const handleUpdateDeck = (updated: SlideDeck | ((prev: SlideDeck) => SlideDeck)) => {
    setProjects((prevProjects) => {
      let updatedProjectToSync: Project | null = null;
      const nextProjects = prevProjects.map((p) => {
        if (p.id === activeProjectId) {
          const currentSlides =
            p.slides && p.slides.length > 0
              ? p.slides
              : [
                  {
                    id: `slide_${p.id}_1`,
                    title: 'Slide 1 (Trang Trắng)',
                    subtitle: '',
                    bullets: [],
                    notes: '',
                    layout: 'blank' as const,
                    backgroundColor: '#ffffff',
                    canvasElements: [],
                  },
                ];

          const existingDeck: SlideDeck = {
            id: `deck_${p.id}`,
            projectId: p.id,
            title: p.name,
            author: p.members?.[0]?.name || currentUser?.name || 'Thành viên',
            themeStyle: (p.themeStyle as any) || 'modern',
            lastModified: 'Vừa xong',
            aspectRatio: p.aspectRatio || '16:9',
            slides: currentSlides,
          };

          const nextDeck = typeof updated === 'function' ? updated(existingDeck) : updated;

          const updatedProj: Project = {
            ...p,
            slides: nextDeck.slides,
            aspectRatio: nextDeck.aspectRatio || p.aspectRatio || '16:9',
          };
          updatedProjectToSync = updatedProj;
          return updatedProj;
        }
        return p;
      });

      try {
        localStorage.setItem('teamup_projects', JSON.stringify(nextProjects));
      } catch (e) {
        console.error('Failed to save teamup_projects to localStorage', e);
      }

      // Sync slides to server so all members & join link users see them immediately
      if (updatedProjectToSync) {
        fetch(`/api/projects/${encodeURIComponent((updatedProjectToSync as Project).id)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedProjectToSync),
        }).catch(() => {});
      }

      return nextProjects;
    });
  };

  const handleCreateNewPresentation = (title: string) => {
    const trimmed = title.trim();
    if (!trimmed) return;

    const newId = `proj_${Date.now()}`;
    const initialSlide: Slide = {
      id: `slide_${newId}_1`,
      title: 'Slide 1 (Trang Trắng)',
      subtitle: '',
      bullets: [],
      notes: '',
      layout: 'blank',
      backgroundColor: '#ffffff',
      canvasElements: [],
    };

    const newProj: Project = {
      id: newId,
      name: trimmed,
      category: 'Báo cáo môn học',
      description: 'Bài thuyết trình mới tạo.',
      ownerId: currentUser ? currentUser.id : 'usr_admin',
      adminId: currentUser ? currentUser.id : 'usr_admin',
      creatorEmail: currentUser ? currentUser.email.toLowerCase() : undefined,
      creatorId: currentUser ? currentUser.id : undefined,
      members: currentUser
        ? [{ ...currentUser, isAdmin: true, role: 'Trưởng nhóm / Quản trị viên' }]
        : [THU_HUYEN],
      status: 'active',
      progress: 0,
      avatarColor: 'from-indigo-600 to-purple-600',
      deadline: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      createdAt: new Date().toLocaleDateString('vi-VN'),
      slides: [initialSlide],
      aspectRatio: '16:9',
    };

    const nextProjects = [newProj, ...projects];
    setProjects(nextProjects);
    setActiveProjectId(newId);
    setActiveTab('slides');

    try {
      localStorage.setItem('teamup_projects', JSON.stringify(nextProjects));
      localStorage.setItem('teamup_active_project_id', newId);
    } catch (e) {
      console.error('Failed to save teamup_projects to localStorage', e);
    }

    // Save project to server database
    fetch('/api/projects/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project: newProj }),
    }).catch(() => {});

    sendDeviceNotification({
      title: `🎉 Đã tạo bài thuyết trình mới`,
      body: `"${trimmed}" đã sẵn sàng với 1 slide trắng riêng biệt!`,
      type: 'urgent',
    });
  };

  // Auth Modal gatekeeper: opens automatically on app launch if user has not logged in
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(() => !Boolean(currentUser));

  // Legacy Join by Gmail modal (kept closed by default, AuthModal takes precedence)
  const [isJoinByGmailModalOpen, setIsJoinByGmailModalOpen] = useState<boolean>(false);

  // Invitations cache in App for suggestions and status updates
  const [allInvitations, setAllInvitations] = useState<TeamInvitation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('teamup_invitations');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) return parsed;
        }
      } catch {}
    }
    return [];
  });

  // Fetch invitations from backend to keep state synced
  useEffect(() => {
    fetch('/api/invitations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.invitations)) {
          setAllInvitations(data.invitations);
          try {
            localStorage.setItem('teamup_invitations', JSON.stringify(data.invitations));
          } catch {}
        }
      })
      .catch(() => {});
  }, []);

  // Lọc các lời mời đang chờ phản hồi dành riêng cho người dùng đang đăng nhập
  const pendingInvitationsForCurrentUser = useMemo(() => {
    if (!currentUser || !currentUser.email) return [];
    const cleanEmail = currentUser.email.trim().toLowerCase();
    return allInvitations.filter(
      (inv) =>
        inv.email.trim().toLowerCase() === cleanEmail &&
        inv.status === 'pending'
    );
  }, [allInvitations, currentUser]);

  const [dismissedInviteIds, setDismissedInviteIds] = useState<Set<string>>(new Set());

  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);

  // Canva Style Email Invitation State
  const [invitationToJoin, setInvitationToJoin] = useState<TeamInvitation | null>(null);
  const [isJoinTeamModalOpen, setIsJoinTeamModalOpen] = useState(false);

  // Tự động kiểm tra và mở modal tham gia nhóm khi thành viên đăng nhập và có lời mời
  useEffect(() => {
    if (!currentUser || pendingInvitationsForCurrentUser.length === 0) return;
    const firstPending = pendingInvitationsForCurrentUser.find(
      (inv) => !dismissedInviteIds.has(inv.id)
    );
    if (firstPending && !isJoinTeamModalOpen) {
      setInvitationToJoin(firstPending);
      setIsJoinTeamModalOpen(true);
    }
  }, [currentUser, pendingInvitationsForCurrentUser, dismissedInviteIds, isJoinTeamModalOpen]);

  // Đồng bộ toàn bộ danh sách dự án và slides từ server
  useEffect(() => {
    fetch('/api/projects')
      .then((res) => res.json())
      .then((data) => {
        if (data?.success && Array.isArray(data.projects) && data.projects.length > 0) {
          setProjects((prevProjects) => {
            const map = new Map<string, Project>();
            // Server projects as source of truth for slides
            data.projects.forEach((sp: Project) => {
              map.set(sp.id, sp);
            });
            // Merge with local projects
            prevProjects.forEach((lp: Project) => {
              if (map.has(lp.id)) {
                const sp = map.get(lp.id)!;
                const hasLocalSlides = Array.isArray(lp.slides) && lp.slides.length > 0;
                const hasServerSlides = Array.isArray(sp.slides) && sp.slides.length > 0;
                map.set(lp.id, {
                  ...sp,
                  ...lp,
                  slides: (hasServerSlides && sp.slides.length >= (lp.slides?.length || 0))
                    ? sp.slides
                    : (hasLocalSlides ? lp.slides : sp.slides),
                });
              } else {
                map.set(lp.id, lp);
              }
            });
            const merged = Array.from(map.values());
            try {
              localStorage.setItem('teamup_projects', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      })
      .catch(() => {});
  }, []);

  // Save currentUser whenever it changes and sync into projects
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      try {
        localStorage.setItem('teamup_current_user', JSON.stringify(currentUser));
        localStorage.setItem('teamup_authenticated_user', JSON.stringify(currentUser));
      } catch (e) {
        console.error('Failed to save currentUser to localStorage', e);
      }

      setProjects((prevProjects) => {
        const cleanEmail = currentUser.email.toLowerCase();
        const cleanName = currentUser.name.replace(/\s*\(Bạn\)/gi, '').trim();

        const updated = prevProjects.map((proj) => {
          // If project was the initial template (proj_1 or Báo Cáo Dự Án)
          const isInitialProject =
            proj.id === 'proj_1' ||
            (Boolean(proj.name) && (proj.name.includes('Báo Cáo Dự Án') || proj.name.includes('Ứng Dụng AI')));

          let effectiveProj = { ...proj };
          if (isInitialProject) {
            effectiveProj = {
              ...proj,
              ownerId: 'usr_huyen',
              adminId: 'usr_huyen',
              creatorId: 'usr_huyen',
              creatorEmail: 'hthuhuyen9107@gmail.com',
            };
            if (!effectiveProj.members.some((m) => m.id === 'usr_huyen' || m.email?.toLowerCase() === 'hthuhuyen9107@gmail.com')) {
              effectiveProj.members = [THU_HUYEN, ...effectiveProj.members];
            }
          }

          const isCreator = isProjectCreator(effectiveProj, currentUser);
          const projectRole = isCreator ? 'Trưởng nhóm / Quản trị viên' : 'Thành viên nhóm';

          const existingMemberIndex = effectiveProj.members.findIndex(
            (m) =>
              m.id === currentUser.id ||
              (m.email && m.email.toLowerCase() === cleanEmail)
          );

          let newMembers: Member[];
          if (existingMemberIndex >= 0) {
            newMembers = effectiveProj.members.map((m, idx) => {
              if (idx === existingMemberIndex) {
                return {
                  ...m,
                  ...currentUser,
                  name: cleanName,
                  isOnline: true,
                  isAdmin: isCreator,
                  role: projectRole,
                };
              }
              const isOtherCreator = isProjectCreator(effectiveProj, m);
              return {
                ...m,
                name: m.name.replace(/\s*\(Bạn\)/gi, '').trim(),
                isAdmin: isOtherCreator,
                role: isOtherCreator ? 'Trưởng nhóm / Quản trị viên' : (m.role === 'Trưởng nhóm / Quản trị viên' ? 'Thành viên nhóm' : (m.role || 'Thành viên nhóm')),
              };
            });
          } else {
            const currentInProj: Member = {
              ...currentUser,
              name: cleanName,
              isOnline: true,
              isAdmin: isCreator,
              role: projectRole,
            };
            newMembers = [
              currentInProj,
              ...effectiveProj.members
                .filter((m) => m.id !== currentUser.id && m.email?.toLowerCase() !== cleanEmail)
                .map((m) => {
                  const isOtherCreator = isProjectCreator(effectiveProj, m);
                  return {
                    ...m,
                    name: m.name.replace(/\s*\(Bạn\)/gi, '').trim(),
                    isAdmin: isOtherCreator,
                    role: isOtherCreator ? 'Trưởng nhóm / Quản trị viên' : (m.role === 'Trưởng nhóm / Quản trị viên' ? 'Thành viên nhóm' : (m.role || 'Thành viên nhóm')),
                  };
                }),
            ];
          }

          return {
            ...effectiveProj,
            members: newMembers,
          };
        });

        try {
          localStorage.setItem('teamup_projects', JSON.stringify(updated));
        } catch {}
        return updated;
      });
    }
  }, [currentUser]);

  // Requirement 1 & 2: Nhập Gmail để tham gia dự án (Chỉ thêm thành viên, không ghi đè hồ sơ đang chọn)
  const handleJoinByGmail = async (inputEmail: string, inputName?: string) => {
    const cleanEmail = inputEmail.trim().toLowerCase();
    const displayName = inputName?.trim() || formatNameFromEmail(cleanEmail);
    const memberObj: Member = {
      id: `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      name: displayName,
      email: cleanEmail,
      role: 'Thành viên nhóm',
      isAdmin: false,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      isOnline: true,
    };

    // 1. Call backend API to change invitation status to "joined" in database
    try {
      const res = await fetch('/api/invitations/join-by-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          name: memberObj.name,
          userId: memberObj.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.invitation) {
        if (data.invitation.role) {
          memberObj.role = data.invitation.role;
        }
        if (data.invitation.recipientName && !inputName?.trim()) {
          memberObj.name = data.invitation.recipientName;
        }
        if (data.invitation.projectId) {
          setActiveProjectId(data.invitation.projectId);
        }
      }
    } catch (err) {
      console.error('Error joining via email API:', err);
    }

    // 2. Update localStorage invitations to mark status as "joined" immediately
    try {
      const savedInvites = localStorage.getItem('teamup_invitations');
      const existing: TeamInvitation[] = savedInvites ? JSON.parse(savedInvites) : allInvitations;
      let found = false;
      const updatedInvites = existing.map((i) => {
        if (i.email && i.email.toLowerCase() === cleanEmail) {
          found = true;
          return {
            ...i,
            status: 'joined' as const,
            acceptedAt: new Date().toISOString(),
            recipientName: memberObj.name,
          };
        }
        return i;
      });

      if (!found) {
        updatedInvites.unshift({
          id: `inv_${Date.now()}_auto`,
          email: cleanEmail,
          recipientName: memberObj.name,
          projectId: activeProjectId || 'proj_1',
          projectName: 'Báo Cáo Dự Án: Ứng Dụng AI Trong Giáo Dục',
          inviterName: 'Trưởng nhóm',
          role: memberObj.role || 'Thành viên',
          status: 'joined',
          createdAt: new Date().toISOString(),
          acceptedAt: new Date().toISOString(),
          inviteUrl: window.location.origin,
        });
      }
      setAllInvitations(updatedInvites);
      localStorage.setItem('teamup_invitations', JSON.stringify(updatedInvites));
    } catch (e) {
      console.error('Failed to update localStorage invitations on join', e);
    }

    // 3. Chỉ lưu currentUser nếu hiện tại CHƯA có người dùng đăng nhập!
    // Tuyệt đối không thay thế tài khoản người đang đăng nhập!
    if (!currentUser) {
      try {
        localStorage.setItem('teamup_authenticated_user', JSON.stringify(memberObj));
        localStorage.setItem('teamup_current_user', JSON.stringify(memberObj));
      } catch {}
      setCurrentUser(memberObj);
    }

    // 4. Add or update member in projects
    setProjects((prev) =>
      prev.map((p) => {
        const alreadyExists = p.members.some(
          (m) => m.email?.toLowerCase() === cleanEmail || m.id === memberObj.id
        );
        if (alreadyExists) {
          return {
            ...p,
            members: p.members.map((m) =>
              m.email?.toLowerCase() === cleanEmail || m.id === memberObj.id
                ? { ...m, name: memberObj.name, isOnline: true }
                : m
            ),
          };
        }
        return {
          ...p,
          members: [...p.members, memberObj],
        };
      })
    );

    // 5. Celebration & toast notification
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {}

    const joinTitle = '🎉 Thành viên mới tham gia nhóm!';
    const joinBody = `Thành viên "${memberObj.name}" (${cleanEmail}) đã gia nhập danh sách nhóm thành công.`;
    setActiveToast({
      id: `toast_join_${Date.now()}`,
      title: joinTitle,
      body: joinBody,
      type: 'member_add',
    });
    sendDeviceNotification({
      title: joinTitle,
      body: joinBody,
      type: 'member_add',
    });

    setIsJoinByGmailModalOpen(false);
  };

  // Xử lý tham số liên kết mời: ?project=... và ?invite=...
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const searchParams = new URLSearchParams(window.location.search);
      const joinParam = searchParams.get('join');
      const inviteToken = searchParams.get('invite');
      const projectParam = searchParams.get('project');

      // Nếu truy cập qua link dự án: tự động chọn dự án và chuyển sang tab Tạo Slide
      if (projectParam && projectParam.trim()) {
        const cleanProjId = projectParam.trim();
        setActiveProjectId(cleanProjId);
        setActiveTab('slides');

        // Tải ngay slides và nội dung từ server để không bị slide trống
        fetch(`/api/projects/${encodeURIComponent(cleanProjId)}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.success && data?.project) {
              setProjects((prev) => {
                const exists = prev.some((p) => p.id === cleanProjId);
                if (exists) {
                  return prev.map((p) => (p.id === cleanProjId ? { ...p, slides: data.project.slides || p.slides } : p));
                } else {
                  return [data.project, ...prev];
                }
              });
            }
          })
          .catch(() => {});
      }

      // If user opened with an old ?join= link, auto-fill it or join immediately
      if (joinParam && joinParam.trim()) {
        const cleanEmail = joinParam.trim().toLowerCase();
        handleJoinByGmail(cleanEmail);
      } else if (inviteToken && inviteToken.trim()) {
        fetch(`/api/invitations/${encodeURIComponent(inviteToken.trim())}`)
          .then((res) => res.json())
          .then((data) => {
            if (data?.success && data?.invitation) {
              setInvitationToJoin(data.invitation);
              setIsJoinTeamModalOpen(true);
              if (data.invitation.projectId) {
                setActiveProjectId(data.invitation.projectId);
                setActiveTab('slides');
              }
            }
          })
          .catch((err) => console.error('Error fetching invite:', err));
      }

      // Giữ URL sạch sẽ sau khi đã nạp tham số
      if (window.location.search) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch {}
  }, []);

  // New project form state
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectCategory, setNewProjectCategory] = useState<Project['category']>('Báo cáo môn học');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [newProjectDeadline, setNewProjectDeadline] = useState('');

  const activeTheme = useMemo(() => {
    if (THEMES[themeColor]) return THEMES[themeColor];
    if (themeColor.startsWith('#')) {
      return createPastelTheme(themeColor, 'Pastel Tùy Chọn');
    }
    return THEMES['pastel-mint'] || THEMES.indigo;
  }, [themeColor]);
  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0] || INITIAL_PROJECTS[0];

  // Sync dark class on document element & persist
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('teamup_dark_mode', 'true');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('teamup_dark_mode', 'false');
    }
  }, [isDark]);

  useEffect(() => {
    try {
      localStorage.setItem('teamup_theme', themeColor);
      localStorage.setItem('teamup_theme_color', themeColor);
      applyThemeCssVariables(activeTheme);
    } catch (e) {
      console.error('Failed to save theme to localStorage', e);
    }
  }, [themeColor, activeTheme]);

  // Save projects to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('teamup_projects', JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }
  }, [projects]);

  // Notifications state
  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('teamup_notifications');
      if (saved) {
        try {
          const parsed: AppNotification[] = JSON.parse(saved);
          const cleaned = parsed.filter(
            (n) =>
              !['notif_1', 'notif_2', 'notif_3'].includes(n.id) &&
              !MOCK_PROJECT_IDS.includes(n.projectId || '')
          );
          localStorage.setItem('teamup_notifications', JSON.stringify(cleaned));
          return cleaned;
        } catch (e) {
          console.error('Failed to parse notifications', e);
        }
      }
    }
    return INITIAL_NOTIFICATIONS;
  });

  const [activeToast, setActiveToast] = useState<{
    id: string;
    title: string;
    body: string;
    type?: 'urgent' | 'member_add' | 'member_remove' | 'deadline' | 'info';
  } | null>(null);

  useEffect(() => {
    try {
      localStorage.setItem('teamup_notifications', JSON.stringify(notifications));
    } catch (e) {
      console.error('Failed to save notifications', e);
    }
  }, [notifications]);

  // Member operations
  const handleAddMember = (projectId: string, newMember: Member) => {
    const targetProj = projects.find((p) => p.id === projectId);
    const projName = targetProj ? targetProj.name : 'nhóm';

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          if (p.members.some((m) => m.id === newMember.id || (newMember.email && m.email && m.email === newMember.email))) {
            return p;
          }
          return {
            ...p,
            members: [...p.members, newMember],
          };
        }
        return p;
      })
    );

    // Gửi thông báo quan trọng trực tiếp về máy cho các thành viên
    const notifTitle = '👥 Thành viên mới gia nhập nhóm';
    const notifBody = `"${newMember.name}" (${newMember.role}) vừa tham gia nhóm "${projName}".`;
    sendDeviceNotification({
      title: notifTitle,
      body: notifBody,
      type: 'member_add',
    });

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: notifTitle,
      body: notifBody,
      timestamp: 'Vừa xong',
      read: false,
      type: 'member_add',
      projectId,
      projectName: projName,
      sentToDevice: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({
      id: newNotif.id,
      title: notifTitle,
      body: notifBody,
      type: 'member_add',
    });
  };

  const handleRemoveMember = (projectId: string, memberId: string) => {
    const targetProj = projects.find((p) => p.id === projectId);
    if (!targetProj) return;

    // Enforce RBAC: Chỉ Quản trị viên (người tạo ra dự án) mới có quyền xóa thành viên!
    const isUserAdmin = Boolean(
      currentUser && isProjectCreator(targetProj, currentUser)
    );

    if (!isUserAdmin) {
      const blockedTitle = '⛔ Không thể thực hiện';
      const blockedBody = 'Chỉ Quản trị viên nhóm mới có quyền xóa thành viên khỏi nhóm.';
      setActiveToast({
        id: `toast_err_${Date.now()}`,
        title: blockedTitle,
        body: blockedBody,
        type: 'urgent',
      });
      return;
    }

    const removedMember = targetProj.members.find((m) => m.id === memberId);
    const removedName = removedMember ? removedMember.name : 'thành viên';

    setProjects((prev) =>
      prev.map((p) => {
        if (p.id === projectId) {
          return {
            ...p,
            members: p.members.filter((m) => m.id !== memberId),
          };
        }
        return p;
      })
    );

    // Call server to permanently remove member from data/projects.json
    fetch(`/api/projects/${encodeURIComponent(projectId)}/members/${encodeURIComponent(memberId)}`, {
      method: 'DELETE',
    }).catch((err) => console.warn('Lỗi đồng bộ xóa thành viên lên server:', err));

    // Broadcast announcement in group chat
    const now = new Date();
    const systemKickMsg: ChatMessage = {
      id: `msg_sys_${Date.now()}`,
      projectId,
      channelId: `ch_${projectId}`,
      chatId: `grp_${projectId}_ch_${projectId}`,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderEmail: currentUser.email,
      participants: [currentUser.id],
      text: `Quản trị viên đã kick thành viên "${removedName}" khỏi nhóm.`,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
      type: 'system',
    };
    setMessages((prev) => dedupeAndSortMessages([...prev, systemKickMsg]));
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(systemKickMsg),
    }).catch(() => {});

    // Gửi thông báo quan trọng trực tiếp về máy cho các thành viên
    const notifTitle = '⚠️ Thành viên bị xóa khỏi nhóm';
    const notifBody = `Quản trị viên đã loại "${removedName}" khỏi nhóm "${targetProj.name}".`;
    sendDeviceNotification({
      title: notifTitle,
      body: notifBody,
      type: 'member_remove',
    });

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: notifTitle,
      body: notifBody,
      timestamp: 'Vừa xong',
      read: false,
      type: 'member_remove',
      projectId,
      projectName: targetProj.name,
      sentToDevice: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({
      id: newNotif.id,
      title: notifTitle,
      body: notifBody,
      type: 'member_remove',
    });
  };

  // Canva Style Email Invitation Accept Handler
  const handleAcceptInvitation = async (
    invitation: TeamInvitation,
    userInfo: { name: string; email: string; avatar: string; role: string }
  ) => {
    try {
      // 1. Call server to update database record to 'accepted'
      const res = await fetch(`/api/invitations/${encodeURIComponent(invitation.id)}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id || `user_${Date.now()}`,
          name: userInfo.name,
          email: userInfo.email,
          avatar: userInfo.avatar,
          role: userInfo.role,
        }),
      });
      const data = await res.json();
      console.log('Accepted invitation response:', data);

      const newMember: Member = {
        id: `mem_${Date.now()}`,
        name: userInfo.name,
        email: userInfo.email,
        avatar: userInfo.avatar,
        role: 'Thành viên nhóm',
        isAdmin: false,
        isOnline: true,
        statusText: 'Đã tham gia nhóm qua email mời',
      };

      // 2. Chỉ cập nhật currentUser nếu người đang đăng nhập chính là người nhận lời mời
      // Tuyệt đối không thay thế tài khoản người dùng hiện tại
      if (currentUser && currentUser.email && currentUser.email.toLowerCase() === userInfo.email.toLowerCase()) {
        setCurrentUser((prev) =>
          prev
            ? {
                ...prev,
                name: userInfo.name,
                avatar: userInfo.avatar,
                role: userInfo.role,
              }
            : prev
        );
      } else if (!currentUser) {
        setCurrentUser(newMember);
        try {
          localStorage.setItem('teamup_authenticated_user', JSON.stringify(newMember));
          localStorage.setItem('teamup_current_user', JSON.stringify(newMember));
        } catch {}
      }

      // 3. Lấy thông tin dự án và toàn bộ slide hiện có từ máy chủ
      let projectFromServer: Project | null = null;
      try {
        const projRes = await fetch(`/api/projects/${encodeURIComponent(invitation.projectId)}`);
        const projData = await projRes.json();
        if (projData?.success && projData?.project) {
          projectFromServer = projData.project;
        }
      } catch {}

      // 4. Cập nhật danh sách dự án kèm slides đầy đủ (không để slide trống)
      setProjects((prev) => {
        const existingIdx = prev.findIndex((p) => p.id === invitation.projectId);
        if (existingIdx >= 0) {
          return prev.map((p, idx) => {
            if (idx === existingIdx) {
              const alreadyMember = p.members.some(
                (m) =>
                  m.email.toLowerCase() === userInfo.email.toLowerCase() ||
                  m.name === userInfo.name
              );
              const members = alreadyMember ? p.members : [...p.members, newMember];
              return {
                ...p,
                slides: (projectFromServer?.slides && projectFromServer.slides.length > 0)
                  ? projectFromServer.slides
                  : p.slides,
                members,
              };
            }
            return p;
          });
        } else {
          const newProject: Project = projectFromServer || {
            id: invitation.projectId,
            name: invitation.projectName,
            description: `Không gian làm việc nhóm ${invitation.projectName}`,
            category: (invitation.projectCategory as any) || 'Báo cáo môn học',
            members: [
              {
                id: 'mem_inviter',
                name: invitation.inviterName,
                email: invitation.inviterEmail || 'truongnhom@teamup.workspace',
                role: 'Trưởng nhóm / Quản trị viên',
                avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
                isOnline: true,
                isAdmin: true,
              },
              newMember,
            ],
            status: 'active',
            progress: 20,
            avatarColor: 'from-indigo-500 to-purple-600',
            deadline: '2026-10-30',
            slides: [
              {
                id: `slide_${invitation.projectId}_1`,
                title: invitation.projectName,
                subtitle: 'Bài thuyết trình nhóm',
                bullets: ['Nội dung báo cáo nhóm', 'Kế hoạch triển khai'],
                notes: '',
                layout: 'title',
                backgroundColor: '#ffffff',
                canvasElements: [],
              },
            ],
          };
          return [newProject, ...prev];
        }
      });

      // 5. Chuyển ngay đến dự án và tab Slide để xem và tiếp tục chỉnh sửa
      setActiveProjectId(invitation.projectId);
      setActiveTab('slides');

      // 6. Native OS & In-App Notification
      const toastTitle = '🎉 Tham gia nhóm thành công!';
      const toastBody = `Chào mừng bạn đã gia nhập nhóm "${invitation.projectName}". Đã tải toàn bộ các slide của dự án để bạn cùng chỉnh sửa.`;
      sendDeviceNotification({
        title: toastTitle,
        body: toastBody,
        type: 'member_add',
      });
      setActiveToast({
        id: `toast_joined_${Date.now()}`,
        title: toastTitle,
        body: toastBody,
        type: 'member_add',
      });

      // 7. Cập nhật danh sách allInvitations và đóng modal
      setAllInvitations((prev) => {
        const updated = prev.map((i) =>
          i.id === invitation.id ||
          (i.projectId === invitation.projectId && i.email.toLowerCase() === userInfo.email.toLowerCase())
            ? { ...i, status: 'joined' as const, acceptedAt: new Date().toISOString() }
            : i
        );
        try {
          localStorage.setItem('teamup_invitations', JSON.stringify(updated));
        } catch {}
        return updated;
      });
      setIsJoinTeamModalOpen(false);
      setInvitationToJoin(null);

      // 8. Clean up URL ?invite=... parameter without page reload
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (e) {
        console.warn('Could not replace URL state', e);
      }
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    }
  };

  // Xử lý Từ chối lời mời tham gia nhóm
  const handleDeclineInvitation = async (invitation: TeamInvitation) => {
    try {
      await fetch(`/api/invitations/${encodeURIComponent(invitation.id)}/decline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: currentUser?.email || invitation.email }),
      });

      setAllInvitations((prev) => {
        const updated = prev.map((i) =>
          i.id === invitation.id
            ? { ...i, status: 'declined' as const, declinedAt: new Date().toISOString() }
            : i
        );
        try {
          localStorage.setItem('teamup_invitations', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      setDismissedInviteIds((prev) => new Set([...prev, invitation.id]));
      setIsJoinTeamModalOpen(false);
      setInvitationToJoin(null);

      const declineTitle = 'Đã từ chối lời mời';
      const declineBody = `Bạn đã từ chối tham gia nhóm "${invitation.projectName}".`;
      setActiveToast({
        id: `toast_decline_${Date.now()}`,
        title: declineTitle,
        body: declineBody,
        type: 'info',
      });
      sendDeviceNotification({
        title: declineTitle,
        body: declineBody,
        type: 'info',
      });
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    }
  };

  const handleSendBroadcastNotification = (title: string, body: string) => {
    sendDeviceNotification({
      title,
      body,
      type: 'urgent',
    });

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title,
      body,
      timestamp: 'Vừa xong',
      read: false,
      type: 'urgent',
      projectId: activeProject.id,
      projectName: activeProject.name,
      sentToDevice: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({
      id: newNotif.id,
      title,
      body,
      type: 'urgent',
    });
  };

  // Task operations
  const handleAddTask = (newTask: Omit<Task, 'id'>) => {
    const task: Task = {
      ...newTask,
      id: `task_${Date.now()}`,
    };
    setTasks((prev) => [task, ...prev]);
  };

  const handleUpdateTaskStatus = (taskId: string, newStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatus } : t))
    );
  };

  const handleDeleteTask = (taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  // Chat message operations
  const handleSendMessage = async (newMsg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const targetReceiverId = newMsg.receiverId || newMsg.recipientId;

    const targetMember = activeProject.members.find(
      (m) => m.id === targetReceiverId || m.email?.toLowerCase() === String(targetReceiverId).toLowerCase()
    );
    const recipientEmail =
      newMsg.recipientEmail ||
      targetMember?.email ||
      (targetReceiverId && String(targetReceiverId).includes('@') ? String(targetReceiverId) : undefined);
    const senderEmail = newMsg.senderEmail || currentUser?.email;

    // Yêu cầu 2: Đảm bảo Chat ID được tạo nhất quán cho 2 người: [uid1, uid2].sort().join('_')
    let chatId: string;
    let participants: string[];

    if (targetReceiverId) {
      chatId = createDirectChatId(newMsg.senderId, targetReceiverId);
      const pSet = new Set<string>([String(newMsg.senderId), String(targetReceiverId)]);
      if (senderEmail) pSet.add(senderEmail.toLowerCase());
      if (recipientEmail) pSet.add(recipientEmail.toLowerCase());
      participants = Array.from(pSet);
    } else {
      chatId = createChannelChatId(newMsg.projectId, newMsg.channelId || 'ch_main');
      participants = [String(newMsg.senderId)];
    }

    // DEBUG 1: Khi bấm nút Gửi
    console.log('[CHAT DEBUG] 1. Bấm nút gửi tin nhắn (App handler):', {
      senderId: newMsg.senderId,
      senderName: newMsg.senderName,
      senderEmail,
      receiverId: targetReceiverId,
      recipientEmail,
      chatId,
      participants,
      text: newMsg.text,
    });

    const now = new Date();
    const msg: ChatMessage = {
      ...newMsg,
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      chatId,
      receiverId: targetReceiverId,
      recipientId: targetReceiverId,
      senderEmail,
      recipientEmail,
      participants,
      timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      createdAt: now.toISOString(),
    };

    // Optimistically update local messages
    setMessages((prev) => dedupeAndSortMessages([...prev, msg]));

    // Send to backend so User B receives it in real time
    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(msg),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.message) {
          const serverMsg: ChatMessage = data.message;
          setMessages((prev) => {
            const updated = prev.map((m) => (m.id === msg.id ? serverMsg : m));
            return dedupeAndSortMessages(updated);
          });
        }
      }
    } catch (err) {
      console.error('[CHAT DEBUG] Lỗi gửi tin nhắn lên server:', err);
    }
  };

  // Document operations
  const handleAddDocument = (newDoc: DocumentResource | Omit<DocumentResource, 'id'>) => {
    const doc: DocumentResource = 'id' in newDoc && newDoc.id ? (newDoc as DocumentResource) : {
      ...newDoc,
      id: `doc_${Date.now()}`,
    };
    setDocuments((prev) => [doc, ...prev]);
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const handleSaveSlideToDocuments = (slideDoc: DocumentResource) => {
    // 1. Tự động thêm file .ppt vào danh sách tài liệu ở Kho Lưu Trữ ngay lập tức
    setDocuments((prev) => [slideDoc, ...prev]);

    // 2. Thông báo đã lưu vào Kho Lưu Trữ
    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      projectId: activeProject.id,
      projectName: activeProject.name,
      title: 'Đã lưu vào Kho Lưu Trữ',
      body: `Bản trình chiếu "${slideDoc.name}" (${slideDoc.size}) đã được lưu tự động vào Kho Lưu Trữ tài liệu nhóm.`,
      timestamp: 'Vừa xong',
      type: 'system',
      read: false,
    };
    setNotifications((prev) => [notif, ...prev]);
  };

  // Create Project
  const handleCreateProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    const deadlineVal =
      newProjectDeadline.trim() ||
      new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const newProjId = `proj_${Date.now()}`;
    const initialSlide: Slide = {
      id: `slide_${newProjId}_1`,
      title: 'Slide 1 (Trang Trắng)',
      subtitle: '',
      bullets: [],
      notes: '',
      layout: 'blank',
      backgroundColor: '#ffffff',
      canvasElements: [],
    };

    const newProj: Project = {
      id: newProjId,
      name: newProjectName.trim(),
      category: newProjectCategory,
      description: newProjectDesc.trim() || 'Không gian làm việc nhóm thật.',
      ownerId: currentUser ? currentUser.id : 'usr_admin',
      adminId: currentUser ? currentUser.id : 'usr_admin',
      creatorEmail: currentUser ? currentUser.email.toLowerCase() : undefined,
      creatorId: currentUser ? currentUser.id : undefined,
      members: currentUser
        ? [{ ...currentUser, isAdmin: true, role: 'Trưởng nhóm / Quản trị viên' }]
        : [THU_HUYEN],
      status: 'active',
      progress: 0,
      avatarColor: 'from-purple-600 to-indigo-600',
      deadline: deadlineVal,
      createdAt: new Date().toLocaleDateString('vi-VN'),
      slides: [initialSlide],
      aspectRatio: '16:9',
    };

    const updatedProjects = [newProj, ...projects];
    setProjects(updatedProjects);
    setActiveProjectId(newProj.id);
    setActiveTab('slides');
    setNewProjectName('');
    setNewProjectDesc('');
    setNewProjectDeadline('');
    setIsNewProjectModalOpen(false);

    try {
      localStorage.setItem('teamup_projects', JSON.stringify(updatedProjects));
      localStorage.setItem('teamup_active_project_id', newProj.id);
    } catch (e) {
      console.error('Failed to save projects to localStorage', e);
    }

    // Gửi thông báo trực tiếp về máy
    const notifTitle = `🎉 Đã tạo nhóm "${newProj.name}"`;
    const notifBody = `Không gian làm việc thật đã sẵn sàng. Bạn có toàn quyền quản lý và phân công nhiệm vụ.`;
    sendDeviceNotification({
      title: notifTitle,
      body: notifBody,
      type: 'urgent',
    });

    const newNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      title: notifTitle,
      body: notifBody,
      timestamp: 'Vừa xong',
      read: false,
      type: 'urgent',
      projectId: newProj.id,
      projectName: newProj.name,
      sentToDevice: true,
    };
    setNotifications((prev) => [newNotif, ...prev]);
    setActiveToast({
      id: newNotif.id,
      title: notifTitle,
      body: notifBody,
      type: 'urgent',
    });
  };

  const handleDeleteProject = (projectId: string) => {
    if (projects.length <= 1) {
      alert('Không thể xóa dự án duy nhất còn lại.');
      return;
    }
    const target = projects.find((p) => p.id === projectId);
    if (!target) return;
    if (window.confirm(`Bạn có chắc chắn muốn xóa nhóm/dự án "${target.name}" không?`)) {
      const remaining = projects.filter((p) => p.id !== projectId);
      setProjects(remaining);
      if (activeProjectId === projectId) {
        setActiveProjectId(remaining[0].id);
      }
      setTasks((prev) => prev.filter((t) => t.projectId !== projectId));
      setDocuments((prev) => prev.filter((d) => d.projectId !== projectId));
      setMessages((prev) => prev.filter((m) => m.projectId !== projectId));
      setActiveToast({
        id: `toast_del_${Date.now()}`,
        title: 'Đã xóa dự án',
        body: `Đã xóa thành công dự án "${target.name}".`,
        type: 'info',
      });
    }
  };

  // Authentication handlers (Register & Login)
  const handleAuthSuccess = (user: Member) => {
    const cleanEmail = (user.email || '').trim().toLowerCase();
    let cleanName = (user.name || '').replace(/\s*\(Bạn\)/gi, '').trim();
    if (!cleanName) cleanName = formatNameFromEmail(cleanEmail);

    const isThuHuyen = cleanEmail === 'hthuhuyen9107@gmail.com' || user.id === 'usr_huyen';

    const normalizedUser: Member = {
      ...user,
      id: user.id || (isThuHuyen ? 'usr_huyen' : `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`),
      name: cleanName,
      email: cleanEmail,
      isAdmin: isThuHuyen,
      role: isThuHuyen ? 'Trưởng nhóm / Quản trị viên' : (user.role || 'Thành viên nhóm'),
    };

    setCurrentUser(normalizedUser);
    setIsAuthModalOpen(false);

    try {
      localStorage.setItem('teamup_authenticated_user', JSON.stringify(normalizedUser));
      localStorage.setItem('teamup_current_user', JSON.stringify(normalizedUser));
    } catch {}

    const welcomeTitle = `👋 Xin chào, ${normalizedUser.name}!`;
    const welcomeBody = `Bạn đã đăng nhập thành công với Gmail: ${normalizedUser.email}.`;
    setActiveToast({
      id: `toast_auth_${Date.now()}`,
      title: welcomeTitle,
      body: welcomeBody,
      type: 'member_add',
    });
    sendDeviceNotification({
      title: welcomeTitle,
      body: welcomeBody,
      type: 'member_add',
    });

    // Tự động kiểm tra lời mời tham gia nhóm cho tài khoản vừa đăng nhập
    fetch('/api/invitations')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.invitations)) {
          setAllInvitations(data.invitations);
          try {
            localStorage.setItem('teamup_invitations', JSON.stringify(data.invitations));
          } catch {}
          const match = data.invitations.find(
            (inv: TeamInvitation) =>
              inv.email.trim().toLowerCase() === cleanEmail && inv.status === 'pending'
          );
          if (match) {
            setInvitationToJoin(match);
            setIsJoinTeamModalOpen(true);
          }
        }
      })
      .catch(() => {});
  };

  const handleLogout = () => {
    try {
      localStorage.removeItem('teamup_authenticated_user');
      localStorage.removeItem('teamup_current_user');
    } catch {}
    setCurrentUser(null);
    setIsAuthModalOpen(true);
    setActiveToast({
      id: `toast_logout_${Date.now()}`,
      title: 'Đã đăng xuất tài khoản hoàn toàn',
      body: 'Bạn đã đăng xuất hoàn toàn khỏi ứng dụng. Vui lòng đăng nhập lại để tiếp tục.',
      type: 'info',
    });
  };

  const handleUpdateProfile = (updatedUser: Member) => {
    setCurrentUser(updatedUser);
    try {
      localStorage.setItem('teamup_authenticated_user', JSON.stringify(updatedUser));
      localStorage.setItem('teamup_current_user', JSON.stringify(updatedUser));
    } catch {}

    setProjects((prev) =>
      prev.map((p) => ({
        ...p,
        members: p.members.map((m) =>
          m.id === updatedUser.id || (m.email && updatedUser.email && m.email.toLowerCase() === updatedUser.email.toLowerCase())
            ? { ...m, name: updatedUser.name, avatar: updatedUser.avatar, statusText: updatedUser.statusText, role: updatedUser.role }
            : m
        ),
      }))
    );

    setActiveToast({
      id: `toast_profile_${Date.now()}`,
      title: 'Đã cập nhật hồ sơ cá nhân',
      body: `Hồ sơ của bạn đã được cập nhật thành công.`,
      type: 'info',
    });
  };

  // Nếu chưa đăng nhập hoặc vừa đăng xuất: hiển thị màn hình chào đón và cổng đăng nhập/đăng ký
  // Tuyệt đối không chuyển người dùng về tài khoản quản trị viên hay tài khoản app khác
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <AuthModal
          isOpen={true}
          onAuthSuccess={handleAuthSuccess}
          projectName={activeProject?.name || 'TEAM UP Workspace'}
        />

        <DeviceToast
          notification={activeToast}
          onClose={() => setActiveToast(null)}
        />
      </div>
    );
  }

  return (
    <div
      className="min-h-screen dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans transition-colors duration-200"
      style={{
        backgroundColor: isDark ? undefined : 'color-mix(in srgb, var(--bg-color) 18%, #f8fafc)',
      }}
    >
      {/* Top Main Navigation Header */}
      <Header
        projects={projects}
        activeProject={activeProject}
        onSelectProject={(p) => {
          setActiveProjectId(p.id);
          setActiveTab('slides');
        }}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        theme={activeTheme}
        onThemeColorChange={setThemeColor}
        isDarkMode={isDark}
        onToggleDarkMode={() => setIsDark(!isDark)}
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
        onCreateNewPresentation={handleCreateNewPresentation}
        onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
        currentUser={currentUser}
        notifications={notifications}
        onMarkAllNotificationsAsRead={() =>
          setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        }
        onClearNotifications={() => setNotifications([])}
        onSendBroadcastNotification={handleSendBroadcastNotification}
        onOpenEditProfile={() => setIsEditProfileModalOpen(true)}
        onLogout={handleLogout}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        allMembers={activeProject.members}
        pendingInvitations={pendingInvitationsForCurrentUser}
        onAcceptInvitation={(inv) =>
          handleAcceptInvitation(inv, {
            name: currentUser.name,
            email: currentUser.email,
            avatar: currentUser.avatar,
            role: inv.role,
          })
        }
        onDeclineInvitation={handleDeclineInvitation}
      />

      {/* Voice Room Control Bar (Microphone & Live Audio Room) */}
      <VoiceRoomBar
        members={activeProject.members}
        theme={activeTheme}
        projectName={activeProject.name}
        onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
      />

      {/* PENDING INVITATIONS BANNER (Hiển thị trực tiếp cho thành viên khi có lời mời vào dự án) */}
      {pendingInvitationsForCurrentUser.length > 0 && (
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-3 pb-1">
          <div className="rounded-2xl bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-950 text-white p-4 sm:p-5 shadow-xl border border-indigo-500/40 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3">
            <div className="flex items-start gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center shrink-0 text-amber-300 shadow-inner mt-0.5 border border-white/20">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-amber-400 text-slate-950 tracking-wider shadow-xs">
                    Lời Mời Tham Gia Dự Án
                  </span>
                  <span className="text-xs text-indigo-200">
                    Người mời: <strong className="text-white">{pendingInvitationsForCurrentUser[0].inviterName}</strong>
                  </span>
                  {pendingInvitationsForCurrentUser[0].projectCategory && (
                    <span className="text-[10px] text-indigo-300 bg-white/10 px-2 py-0.5 rounded-md">
                      {pendingInvitationsForCurrentUser[0].projectCategory}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black truncate text-white tracking-tight">
                  {pendingInvitationsForCurrentUser[0].projectName}
                </h3>
                <p className="text-xs text-indigo-200 mt-0.5 line-clamp-1">
                  Vai trò được phân công: <span className="font-bold text-white bg-indigo-500/40 px-2 py-0.5 rounded-md text-[11px] border border-indigo-400/30">{pendingInvitationsForCurrentUser[0].role}</span>
                  {pendingInvitationsForCurrentUser[0].message && (
                    <span className="italic ml-2 opacity-90">"{pendingInvitationsForCurrentUser[0].message}"</span>
                  )}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0 justify-end pt-2 md:pt-0 border-t md:border-t-0 border-white/10">
              <button
                id="btn-banner-decline-invitation"
                type="button"
                onClick={() => handleDeclineInvitation(pendingInvitationsForCurrentUser[0])}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-rose-300 hover:text-white hover:bg-rose-600/30 border border-rose-400/40 transition-all cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <X className="w-4 h-4" />
                <span>Từ chối</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setInvitationToJoin(pendingInvitationsForCurrentUser[0]);
                  setIsJoinTeamModalOpen(true);
                }}
                className="px-3.5 py-2.5 rounded-xl text-xs font-bold text-indigo-200 hover:text-white bg-white/10 hover:bg-white/20 transition-all cursor-pointer hidden sm:inline-flex"
              >
                Chi tiết
              </button>

              <button
                id="btn-banner-accept-invitation"
                type="button"
                onClick={() =>
                  handleAcceptInvitation(pendingInvitationsForCurrentUser[0], {
                    name: currentUser.name,
                    email: currentUser.email,
                    avatar: currentUser.avatar,
                    role: pendingInvitationsForCurrentUser[0].role,
                  })
                }
                className="flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-extrabold text-slate-950 bg-gradient-to-r from-amber-300 via-amber-400 to-yellow-400 hover:from-amber-200 hover:to-amber-300 shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer active:scale-95"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Chấp Nhận Tham Gia</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area (with bottom padding on mobile for sticky bottom nav) */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-8">
        {activeTab === 'overview' && (
          <DashboardView
            project={activeProject}
            allProjects={projects}
            onSelectProject={(p) => {
              setActiveProjectId(p.id);
              setActiveTab('slides');
            }}
            onDeleteProject={handleDeleteProject}
            tasks={tasks}
            slideDeck={currentDeck}
            documents={documents}
            onNavigateTab={setActiveTab}
            onOpenDirectChat={handleOpenDirectChat}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onOpenNewProjectModal={() => setIsNewProjectModalOpen(true)}
            onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
            theme={activeTheme}
          />
        )}

        {activeTab === 'tasks' && (
          <TaskBoardView
            project={activeProject}
            tasks={tasks}
            onAddTask={handleAddTask}
            onUpdateTaskStatus={handleUpdateTaskStatus}
            onDeleteTask={handleDeleteTask}
            theme={activeTheme}
            onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
          />
        )}

        {activeTab === 'slides' && (
          <PresentationEditor
            key={activeProjectId}
            deck={currentDeck}
            onUpdateDeck={handleUpdateDeck}
            theme={activeTheme}
            projectName={activeProject.name}
            onSaveToDocuments={handleSaveSlideToDocuments}
          />
        )}

        {activeTab === 'chat' && (
          <ChatView
            project={activeProject}
            currentUser={currentUser}
            messages={messages}
            onSendMessage={handleSendMessage}
            theme={activeTheme}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onOpenAddMemberModal={() => setIsAddMemberModalOpen(true)}
            onRemoveMember={(memberId) => handleRemoveMember(activeProject.id, memberId)}
            onAddMemberByGmail={async (email: string) => {
              try {
                const res = await fetch(`/api/projects/${encodeURIComponent(activeProject.id)}/members`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email }),
                });
                const data = await res.json();
                if (data?.success && data?.member) {
                  handleAddMember(activeProject.id, data.member);
                }
              } catch (err) {
                console.error('Failed to add member by Gmail:', err);
              }
            }}
            initialRecipientId={directChatRecipientId}
          />
        )}

        {activeTab === 'documents' && (
          <DocumentsView
            project={activeProject}
            documents={documents}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
            theme={activeTheme}
          />
        )}

        {activeTab === 'up_ai' && (
          <UpAiView
            project={activeProject}
            documents={documents}
            theme={activeTheme}
            onNavigateTab={setActiveTab}
            onOpenAiModal={() => setIsAiModalOpen(true)}
            onApplyAiSlides={(newSlides) => {
              handleUpdateDeck((prev) => ({
                ...prev,
                slides: [...prev.slides, ...newSlides],
                lastModified: 'Vừa xong',
              }));
              setActiveTab('slides');
            }}
            onApplyAiTasks={(newTasks) => {
              setTasks((prev) => [...newTasks, ...prev]);
              setActiveTab('tasks');
            }}
          />
        )}
      </main>

      {/* Global AI Assistant Modal */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        project={activeProject}
        theme={activeTheme}
      />

      {/* Add / Manage Project Members Modal */}
      <AddMemberModal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        project={activeProject}
        onAddMember={(newMember) => handleAddMember(activeProject.id, newMember)}
        onRemoveMember={(memberId) => handleRemoveMember(activeProject.id, memberId)}
        theme={activeTheme}
        currentUser={currentUser}
      />

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Tạo Nhóm / Dự Án Mới
              </h3>
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProject} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên nhóm hoặc tên đề tài <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Báo Cáo Thực Tập Tốt Nghiệp 2026"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Lĩnh vực / Học phần
                </label>
                <select
                  value={newProjectCategory}
                  onChange={(e) => setNewProjectCategory(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                >
                  <option value="Báo cáo môn học">Báo cáo môn học & Thuyết trình</option>
                  <option value="Dự án nghiên cứu">Dự án nghiên cứu khoa học sinh viên</option>
                  <option value="Khởi nghiệp">Khởi nghiệp & Kinh doanh</option>
                  <option value="Hoạt động CLB">Hoạt động ngoại khóa & CLB</option>
                  <option value="Học tập">Học tập & Ôn thi nhóm</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả mục tiêu của nhóm <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Mục tiêu bài báo cáo, phân công các phần và mốc thời gian bàn giao..."
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hạn chót hoàn thành (Tùy chọn)
                </label>
                <input
                  type="date"
                  value={newProjectDeadline}
                  onChange={(e) => setNewProjectDeadline(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewProjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Hủy bỏ
                </button>
                <button
                  id="btn-confirm-create-project"
                  type="submit"
                  className={`px-4 py-2 text-xs font-bold rounded-xl ${activeTheme.primary} shadow-sm cursor-pointer`}
                >
                  Tạo Không Gian Nhóm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Popup nhập Gmail tham gia dự án (Chỉ thêm thành viên) */}
      <JoinByGmailModal
        isOpen={isJoinByGmailModalOpen}
        onClose={() => setIsJoinByGmailModalOpen(false)}
        onJoin={handleJoinByGmail}
        projectName={activeProject?.name || 'Báo Cáo Dự Án: Ứng Dụng AI Trong Giáo Dục'}
        projectCategory={activeProject?.category}
        pendingInvitations={allInvitations}
      />

      {/* Canva Style Join Team Modal for Email Invitees */}
      <JoinTeamModal
        isOpen={isJoinTeamModalOpen}
        onClose={() => {
          if (invitationToJoin) {
            setDismissedInviteIds((prev) => new Set([...prev, invitationToJoin.id]));
          }
          setIsJoinTeamModalOpen(false);
        }}
        invitation={invitationToJoin}
        onAccept={handleAcceptInvitation}
        onDecline={handleDeclineInvitation}
        theme={activeTheme}
        currentUser={currentUser}
      />

      {/* Modal chỉnh sửa hồ sơ của chính mình */}
      <EditProfileModal
        isOpen={isEditProfileModalOpen}
        onClose={() => setIsEditProfileModalOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateProfile}
        theme={activeTheme}
        isAdmin={Boolean(currentUser && isProjectCreator(activeProject, currentUser))}
      />

      {/* Floating Device Toast for native in-app & OS notification feedback */}
      <DeviceToast
        notification={activeToast}
        onClose={() => setActiveToast(null)}
      />

      {/* Required Account Registration & Login Modal Gatekeeper */}
      <AuthModal
        isOpen={!currentUser || isAuthModalOpen}
        onAuthSuccess={handleAuthSuccess}
        projectName={activeProject?.name}
      />
    </div>
  );
}
