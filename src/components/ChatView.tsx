import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Smile,
  Users,
  Sparkles,
  FileText,
  Search,
  Bot,
  Mic,
  MicOff,
  Plus,
  X,
  AtSign,
  Check,
  Radio,
  Volume2,
  ChevronLeft,
  Trash2,
  Phone,
  Video,
  Info,
  MessageCircle,
  UserMinus,
  UserPlus,
  Crown,
  Mail,
  UserCheck,
} from 'lucide-react';
import { ChatMessage, Member, Project, ChatGroupChannel } from '../types';
import { ThemeConfig } from '../utils/theme';
import { isProjectCreator, formatNameFromEmail } from '../utils/user';
import { createDirectChatId, createChannelChatId } from '../services/chatService';

// Tự động tạo kênh nhóm chat riêng cho từng dự án mà không cần người dùng tạo thủ công
const buildProjectDefaultChannels = (project: Project): ChatGroupChannel[] => [
  {
    id: `ch_${project.id}`,
    name: `Nhóm: ${project.name}`,
    description: `Kênh thảo luận riêng của dự án (${project.members?.length || 1} thành viên)`,
    isDefault: true,
  },
  {
    id: `ch_slide_${project.id}`,
    name: 'Nhóm Soạn Slide',
    description: 'Trao đổi ý tưởng, bố cục và thiết kế bài thuyết trình',
  },
  {
    id: `ch_report_${project.id}`,
    name: 'Nhóm Báo Cáo & Số Liệu',
    description: 'Tổng hợp tài liệu, dẫn chứng và số liệu khảo sát',
  },
];

interface ChatViewProps {
  project: Project;
  currentUser: Member;
  messages: ChatMessage[];
  onSendMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  theme: ThemeConfig;
  onOpenAiModal?: () => void;
  onOpenAddMemberModal?: () => void;
  onRemoveMember?: (memberId: string) => void;
  onAddMemberByGmail?: (email: string, name?: string) => Promise<void>;
  initialRecipientId?: string | null;
}

export const ChatView: React.FC<ChatViewProps> = ({
  project,
  currentUser,
  messages,
  onSendMessage,
  theme,
  onOpenAiModal,
  onOpenAddMemberModal,
  onRemoveMember,
  onAddMemberByGmail,
  initialRecipientId,
}) => {
  // Navigation: null = Group chat, string = 1-1 direct message with member id
  const [selectedRecipientId, setSelectedRecipientId] = useState<string | null>(() => initialRecipientId || null);
  // Mobile screen toggle: false = show channel list, true = show active chat
  const [mobileShowChat, setMobileShowChat] = useState<boolean>(() => Boolean(initialRecipientId));

  useEffect(() => {
    if (initialRecipientId) {
      setSelectedRecipientId(initialRecipientId);
      setMobileShowChat(true);
    }
  }, [initialRecipientId]);

  // Group channels list - load from localStorage per project or fallback to project-specific channels
  const [channels, setChannels] = useState<ChatGroupChannel[]>(() => {
    const defaultChannels = buildProjectDefaultChannels(project);
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(`teamup_channels_${project.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mainId = `ch_${project.id}`;
            const existingMain = parsed.find((c: ChatGroupChannel) => c.id === mainId || c.isDefault);
            if (existingMain) {
              existingMain.id = mainId;
              existingMain.name = `Nhóm: ${project.name}`;
              existingMain.description = `Kênh thảo luận riêng của dự án (${project.members?.length || 1} thành viên)`;
            } else {
              parsed.unshift(defaultChannels[0]);
            }
            return parsed;
          }
        }
      } catch (e) {
        console.error('Failed to load channels from localStorage', e);
      }
    }
    return defaultChannels;
  });

  const [selectedChannelId, setSelectedChannelId] = useState<string>(() => `ch_${project.id}`);

  // Reload channels when project changes
  useEffect(() => {
    const defaultChannels = buildProjectDefaultChannels(project);
    if (typeof window !== 'undefined' && project?.id) {
      try {
        const saved = localStorage.getItem(`teamup_channels_${project.id}`);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const mainId = `ch_${project.id}`;
            const existingMain = parsed.find((c: ChatGroupChannel) => c.id === mainId || c.isDefault);
            if (existingMain) {
              existingMain.id = mainId;
              existingMain.name = `Nhóm: ${project.name}`;
              existingMain.description = `Kênh thảo luận riêng của dự án (${project.members?.length || 1} thành viên)`;
            } else {
              parsed.unshift(defaultChannels[0]);
            }
            setChannels(parsed);
            if (!parsed.some((c: ChatGroupChannel) => c.id === selectedChannelId)) {
              setSelectedChannelId(mainId);
            }
            return;
          }
        }
      } catch (e) {}
      setChannels(defaultChannels);
      setSelectedChannelId(`ch_${project.id}`);
    }
  }, [project?.id, project?.name]);

  // Persist channels whenever channels state changes
  useEffect(() => {
    if (typeof window !== 'undefined' && project?.id && channels.length > 0) {
      try {
        localStorage.setItem(`teamup_channels_${project.id}`, JSON.stringify(channels));
      } catch (e) {
        console.error('Failed to save channels to localStorage', e);
      }
    }
  }, [channels, project?.id]);

  // Modal tạo nhóm mới
  const [showCreateGroupModal, setShowCreateGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [selectedGroupMemberIds, setSelectedGroupMemberIds] = useState<string[]>([]);

  // Input & mentions
  const [inputText, setInputText] = useState('');
  const [searchFilter, setSearchFilter] = useState('');
  const [isAiTyping, setIsAiTyping] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [cursorPosition, setCursorPosition] = useState<number>(0);

  // Direct Microphone voice bubble state
  const [isDirectMicOn, setIsDirectMicOn] = useState(false);
  const [micVolume, setMicVolume] = useState<number>(1);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const activeChannel =
    channels.find((c) => c.id === selectedChannelId) || channels[0] || buildProjectDefaultChannels(project)[0];

  // Toggle Live Direct Microphone
  const toggleDirectMic = async () => {
    if (isDirectMicOn) {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
        mediaStreamRef.current = null;
      }
      setIsDirectMicOn(false);
    } else {
      try {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          mediaStreamRef.current = stream;
        }
      } catch (err) {
        console.warn('Microphone permission not granted or device not present; using active voice mode:', err);
      }
      setIsDirectMicOn(true);
    }
  };

  // Sound wave animation effect when mic is on
  useEffect(() => {
    if (!isDirectMicOn) return;
    const interval = setInterval(() => {
      setMicVolume(0.4 + Math.random() * 0.6);
    }, 180);
    return () => clearInterval(interval);
  }, [isDirectMicOn]);

  // Clean up mic on unmount
  useEffect(() => {
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Yêu cầu 5: Kiểm tra Auth - Đảm bảo người dùng đã đăng nhập thành công trước khi vào màn hình chat
  useEffect(() => {
    console.log('[CHAT DEBUG] 5. Kiểm tra Auth (auth.currentUser):', currentUser);
    if (!currentUser || !currentUser.id) {
      console.warn('[CHAT DEBUG] CẢNH BÁO: Người dùng chưa đăng nhập hoặc currentUser bị undefined!');
    }
  }, [currentUser]);

  const isCurrentUserAdmin = Boolean(currentUser && isProjectCreator(project, currentUser));

  // Yêu cầu 2: Tạo Chat ID nhất quán cho 2 người [uid1, uid2].sort().join('_')
  const activeChatId = React.useMemo(() => {
    if (!currentUser?.id) return '';
    if (selectedRecipientId) {
      return createDirectChatId(currentUser.id, selectedRecipientId);
    }
    return createChannelChatId(project.id, selectedChannelId);
  }, [currentUser?.id, selectedRecipientId, project.id, selectedChannelId]);

  // Quản lý thành viên trò chuyện cá nhân (1-1):
  // Yêu cầu 4: Chỉ hiển thị những thành viên CÓ TRONG NHÓM DỰ ÁN NÀY (project.members)
  // Loại trừ currentUser khỏi danh sách chat để không tự nhắn cho chính mình
  const cleanCurrentEmail = (currentUser?.email || '').trim().toLowerCase();

  const directMessageMembers = React.useMemo(() => {
    const list = (project.members || [])
      .filter((m) => {
        const mEmail = (m.email || '').trim().toLowerCase();
        // Không hiển thị chính bản thân người dùng trong danh sách chat riêng
        if (m.id === currentUser?.id || (cleanCurrentEmail && mEmail === cleanCurrentEmail)) {
          return false;
        }
        return true;
      })
      .map((m) => {
        const isAdmin = isProjectCreator(project, m);
        return {
          ...m,
          name: m.name.replace(/\s*\(Bạn\)/gi, '').trim(),
          isAdmin,
          role: isAdmin ? 'Trưởng nhóm / Quản trị viên' : (m.role || 'Thành viên nhóm'),
          isOnline: m.isOnline !== undefined ? m.isOnline : true,
        };
      });

    // Sắp xếp: Admin trước, sau đó thành viên đang online, rồi theo bảng chữ cái
    list.sort((a, b) => {
      if (a.isAdmin && !b.isAdmin) return -1;
      if (!a.isAdmin && b.isAdmin) return 1;
      if (a.isOnline && !b.isOnline) return -1;
      if (!a.isOnline && b.isOnline) return 1;
      return a.name.localeCompare(b.name, 'vi');
    });

    return list.filter(
      (m) =>
        m.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        (m.email && m.email.toLowerCase().includes(searchFilter.toLowerCase()))
    );
  }, [project.members, project, currentUser?.id, cleanCurrentEmail, searchFilter]);

  const selectedMember = selectedRecipientId
    ? (project.members || []).find(
        (m) => m.id === selectedRecipientId || (m.email && m.email.toLowerCase() === selectedRecipientId.toLowerCase())
      ) || {
        id: selectedRecipientId,
        name: formatNameFromEmail(selectedRecipientId) || 'Thành viên',
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        role: 'Thành viên nhóm',
        email: selectedRecipientId.includes('@') ? selectedRecipientId : '',
        isOnline: true,
      }
    : null;

  // Lọc tin nhắn hiển thị:
  // - Nếu là kênh nhóm: lọc theo kênh và projectId
  // - Nếu là chat 1-1: đối chiếu 2 chiều (sender & receiver) theo CẢ User ID VÀ Email để đảm bảo cả 2 người cùng đọc được tin nhắn
  const currentChatMessages = React.useMemo(() => {
    const userA_Id = (currentUser?.id || '').toLowerCase();
    const userA_Email = (currentUser?.email || '').trim().toLowerCase();
    const userB_Id = (selectedMember?.id || selectedRecipientId || '').toLowerCase();
    const userB_Email = (selectedMember?.email || (selectedRecipientId?.includes('@') ? selectedRecipientId : '')).trim().toLowerCase();

    const list = messages.filter((m) => {
      if (!selectedRecipientId) {
        // Chế độ nhóm thảo luận
        if (m.projectId && m.projectId !== project.id) return false;
        if (m.chatId && m.chatId === activeChatId) return true;
        const msgChannel = m.channelId || `ch_${project.id}`;
        const isMainChannelSelected = selectedChannelId === `ch_${project.id}` || selectedChannelId === 'ch_main';
        const isMsgInMain = msgChannel === `ch_${project.id}` || msgChannel === 'ch_main';
        return !m.recipientId && !m.receiverId && (isMainChannelSelected ? isMsgInMain : msgChannel === selectedChannelId);
      } else {
        // Chế độ chat riêng 1-1 giữa currentUser và selectedMember
        if (m.chatId && m.chatId === activeChatId) return true;

        const mSenderId = (m.senderId || '').toLowerCase();
        const mSenderEmail = (m.senderEmail || '').toLowerCase();
        const mRecipientId = (m.recipientId || m.receiverId || '').toLowerCase();
        const mRecipientEmail = (m.recipientEmail || '').toLowerCase();

        // Chiều 1: currentUser gửi cho đối phương
        const senderIsA = (userA_Id && mSenderId === userA_Id) || (userA_Email && mSenderEmail === userA_Email);
        const receiverIsB =
          (userB_Id && (mRecipientId === userB_Id || mRecipientId === userB_Email)) ||
          (userB_Email && (mRecipientEmail === userB_Email || mRecipientId === userB_Email));

        // Chiều 2: Đối phương gửi cho currentUser (phản hồi)
        const senderIsB = (userB_Id && mSenderId === userB_Id) || (userB_Email && mSenderEmail === userB_Email);
        const receiverIsA =
          (userA_Id && (mRecipientId === userA_Id || mRecipientId === userA_Email)) ||
          (userA_Email && (mRecipientEmail === userA_Email || mRecipientId === userA_Email));

        if ((senderIsA && receiverIsB) || (senderIsB && receiverIsA)) {
          return true;
        }

        // Kiểm tra qua mảng participants
        if (m.participants && Array.isArray(m.participants) && m.participants.length >= 2) {
          const hasA =
            (userA_Id && m.participants.some((p) => p.toLowerCase() === userA_Id)) ||
            (userA_Email && m.participants.some((p) => p.toLowerCase() === userA_Email));
          const hasB =
            (userB_Id && m.participants.some((p) => p.toLowerCase() === userB_Id)) ||
            (userB_Email && m.participants.some((p) => p.toLowerCase() === userB_Email));
          if (hasA && hasB) return true;
        }

        return false;
      }
    });

    // Deduplicate by message ID strictly
    const seenIds = new Set<string>();
    const uniqueList: ChatMessage[] = [];
    for (const m of list) {
      if (m && m.id) {
        if (!seenIds.has(m.id)) {
          seenIds.add(m.id);
          uniqueList.push(m);
        }
      } else if (m) {
        uniqueList.push(m);
      }
    }

    // Sắp xếp strictly theo thời gian tăng dần
    return uniqueList.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp).getTime() || 0;
      const timeB = new Date(b.createdAt || b.timestamp).getTime() || 0;
      return timeA - timeB;
    });
  }, [messages, project.id, selectedRecipientId, selectedMember, activeChatId, selectedChannelId, currentUser?.id, currentUser?.email]);

  // Quản trị viên đá thành viên ra khỏi nhóm
  const handleKickMember = (targetMember: Member) => {
    if (!isCurrentUserAdmin) {
      alert('Chỉ Quản trị viên nhóm mới có quyền xóa hoặc đá thành viên khỏi nhóm.');
      return;
    }
    const memberName = targetMember.name.replace(/\s*\(Bạn\)/gi, '').trim();
    if (window.confirm(`Bạn có chắc chắn muốn đá thành viên "${memberName}" (${targetMember.email || 'không có email'}) ra khỏi nhóm không?`)) {
      if (onRemoveMember) {
        onRemoveMember(targetMember.id);
      }
      if (selectedRecipientId === targetMember.id) {
        setSelectedRecipientId(null);
      }
    }
  };

  // State cho việc bổ sung thành viên bằng Gmail khi tạo nhóm trò chuyện
  const [newGroupGmails, setNewGroupGmails] = useState<string[]>([]);
  const [gmailInput, setGmailInput] = useState('');

  // State cho việc thêm nhanh thành viên bằng Gmail trực tiếp trong màn hình chat
  const [showAddGmailModal, setShowAddGmailModal] = useState(false);
  const [quickGmailInput, setQuickGmailInput] = useState('');
  const [quickNameInput, setQuickNameInput] = useState('');
  const [isAddingGmail, setIsAddingGmail] = useState(false);
  const [addGmailError, setAddGmailError] = useState<string | null>(null);

  const handleQuickAddMemberByGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddGmailError(null);
    const cleanEmail = quickGmailInput.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      setAddGmailError('Vui lòng nhập địa chỉ Gmail hợp lệ (ví dụ: thanhvien@gmail.com).');
      return;
    }

    const alreadyInProject = (project.members || []).some(
      (m) => m.email?.toLowerCase() === cleanEmail
    );
    if (alreadyInProject) {
      setAddGmailError(`Thành viên có Gmail "${cleanEmail}" đã có trong nhóm rồi.`);
      return;
    }

    setIsAddingGmail(true);
    try {
      if (onAddMemberByGmail) {
        await onAddMemberByGmail(cleanEmail, quickNameInput.trim() || undefined);
      } else {
        const res = await fetch(`/api/projects/${encodeURIComponent(project.id)}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, name: quickNameInput.trim() || undefined }),
        });
        const data = await res.json();
        if (!data.success) {
          throw new Error(data.error || 'Không thể thêm thành viên');
        }
      }

      // Gửi tin nhắn thông báo vào kênh nhóm
      onSendMessage({
        projectId: project.id,
        channelId: selectedChannelId || `ch_${project.id}`,
        chatId: createChannelChatId(project.id, selectedChannelId || `ch_${project.id}`),
        senderId: currentUser.id,
        senderName: currentUser.name,
        senderAvatar: currentUser.avatar,
        senderEmail: currentUser.email,
        text: `👥 Quản trị viên đã thêm thành viên mới "${quickNameInput.trim() || formatNameFromEmail(cleanEmail)}" (${cleanEmail}) vào nhóm bằng Gmail.`,
        type: 'system',
        createdAt: new Date().toISOString(),
      });

      setShowAddGmailModal(false);
      setQuickGmailInput('');
      setQuickNameInput('');
    } catch (err: any) {
      setAddGmailError(err?.message || 'Có lỗi xảy ra khi thêm thành viên bằng Gmail.');
    } finally {
      setIsAddingGmail(false);
    }
  };

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentChatMessages, isAiTyping]);

  // Handle @ Mention search detection
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setInputText(val);
    setCursorPosition(pos);

    // Look for '@' before cursor
    const textBeforeCursor = val.slice(0, pos);
    const match = textBeforeCursor.match(/@([a-zA-Z0-9À-ỹ_ ]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentionMenu(true);
    } else {
      setShowMentionMenu(false);
      setMentionQuery('');
    }
  };

  // Mention suggestions list
  const mentionItems = [
    {
      id: 'all',
      name: 'Mọi người',
      subtitle: 'Tag toàn bộ thành viên trong nhóm',
      isAll: true,
      avatar: '',
    },
    {
      id: 'ai',
      name: 'UP AI',
      subtitle: 'Hỏi đáp trực tiếp trợ lý UP AI (tìm kiếm ngầm từ Google)',
      isAi: true,
      avatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    },
    ...project.members.map((m) => ({
      id: m.id,
      name: m.name,
      subtitle: m.role,
      avatar: m.avatar,
      isOnline: m.isOnline,
    })),
  ];

  const filteredMentions = mentionItems.filter((item) =>
    item.name.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  const handleSelectMention = (name: string) => {
    const textBeforeCursor = inputText.slice(0, cursorPosition);
    const textAfterCursor = inputText.slice(cursorPosition);
    const atIndex = textBeforeCursor.lastIndexOf('@');
    if (atIndex !== -1) {
      const updated = textBeforeCursor.slice(0, atIndex) + `@${name} ` + textAfterCursor;
      setInputText(updated);
    } else {
      setInputText((prev) => prev + `@${name} `);
    }
    setShowMentionMenu(false);
    setMentionQuery('');
    inputRef.current?.focus();
  };

  // Send message
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    if (!currentUser || !currentUser.id) {
      console.error('[CHAT DEBUG] Không thể gửi tin nhắn: currentUser bị undefined');
      return;
    }

    const messageText = inputText.trim();

    // Yêu cầu 2: Tạo Chat ID nhất quán cho 2 người [uid1, uid2].sort().join('_')
    let chatId: string;
    let participants: string[];

    if (selectedRecipientId) {
      chatId = createDirectChatId(currentUser.id, selectedRecipientId);
      participants = [currentUser.id, selectedRecipientId].sort();
    } else {
      chatId = createChannelChatId(project.id, selectedChannelId);
      participants = [currentUser.id];
    }

    // DEBUG 1: Khi bấm nút Gửi
    console.log('[CHAT DEBUG] 1. Bấm nút gửi tin nhắn:', {
      senderId: currentUser.id,
      senderName: currentUser.name,
      receiverId: selectedRecipientId || undefined,
      chatId,
      participants,
      text: messageText,
      timestamp: new Date().toISOString(),
    });

    const now = new Date();
    const newMsg: Omit<ChatMessage, 'id' | 'timestamp'> = {
      projectId: project.id,
      chatId,
      channelId: selectedRecipientId ? undefined : selectedChannelId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      recipientId: selectedRecipientId || undefined,
      receiverId: selectedRecipientId || undefined,
      participants,
      text: messageText,
      type: 'text',
      createdAt: now.toISOString(),
    };

    onSendMessage(newMsg);
    setInputText('');
    setShowMentionMenu(false);

    // Trigger UP AI if @ai or @up ai is mentioned
    const lower = messageText.toLowerCase();
    if (lower.includes('@ai') || lower.includes('@up ai') || lower.includes('@troly')) {
      handleAiChatResponse(messageText);
    }
  };

  // UP AI response: concise, grounds on Google/web in background, strips * and #
  const handleAiChatResponse = async (question: string) => {
    setIsAiTyping(true);
    try {
      const promptQuery = question.replace(/@up ai|@ai|@troly/gi, '').trim();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptQuery || 'Tôi có thể hỗ trợ gì cho bạn hoặc nhóm hôm nay?',
        }),
      });

      if (res.ok) {
        const cType = res.headers.get('content-type') || '';
        if (cType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (data?.reply) {
            // Strip markdown symbols * and # as requested
            const cleanReply = data.reply.replace(/[*#]/g, '').trim();

            onSendMessage({
              projectId: project.id,
              chatId: selectedRecipientId
                ? createDirectChatId(currentUser.id, selectedRecipientId)
                : createChannelChatId(project.id, selectedChannelId),
              channelId: selectedRecipientId ? undefined : selectedChannelId,
              senderId: 'ai_bot',
              senderName: 'UP AI',
              senderAvatar:
                'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
              recipientId: selectedRecipientId || undefined,
              receiverId: selectedRecipientId || undefined,
              participants: selectedRecipientId ? [currentUser.id, selectedRecipientId].sort() : [currentUser.id],
              text: cleanReply,
              type: 'text',
              isAi: true,
              createdAt: new Date().toISOString(),
            });
          }
        }
      }
    } catch (err) {
      console.warn('Failed to get UP AI response:', err);
    } finally {
      setIsAiTyping(false);
    }
  };

  // Create new group handler - creates a completely new, blank channel with a unique ID and supports adding Gmails
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newGroupName.trim();
    if (!cleanName) return;

    // Bổ sung thành viên bằng Gmail trực tiếp vào nhóm
    const finalMemberIds = [...selectedGroupMemberIds];
    const addedMemberNames: string[] = [];

    for (const email of newGroupGmails) {
      try {
        if (onAddMemberByGmail) {
          await onAddMemberByGmail(email);
        } else {
          await fetch(`/api/projects/${encodeURIComponent(project.id)}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
          });
        }
        const generatedId = `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
        if (!finalMemberIds.includes(generatedId)) {
          finalMemberIds.push(generatedId);
        }
        addedMemberNames.push(formatNameFromEmail(email));
      } catch (err) {
        console.warn('Lỗi bổ sung thành viên bằng Gmail khi tạo nhóm:', err);
      }
    }

    const newChannelId = `ch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const newChannel: ChatGroupChannel = {
      id: newChannelId,
      name: cleanName,
      description: newGroupDesc.trim() || `Nhóm thảo luận • ${finalMemberIds.length} thành viên`,
      memberIds:
        finalMemberIds.length > 0
          ? finalMemberIds
          : project.members.map((m) => m.id),
      isDefault: false,
      creatorId: currentUser.id,
      creatorEmail: currentUser.email,
    };

    const updatedChannels = [...channels, newChannel];
    setChannels(updatedChannels);
    try {
      localStorage.setItem(`teamup_channels_${project.id}`, JSON.stringify(updatedChannels));
    } catch {}

    // Switch view to this new group channel immediately
    setSelectedRecipientId(null);
    setSelectedChannelId(newChannel.id);
    setMobileShowChat(true);

    setShowCreateGroupModal(false);
    setNewGroupName('');
    setNewGroupDesc('');
    setNewGroupGmails([]);
    setGmailInput('');
    setSelectedGroupMemberIds([]);

    // Gửi tin nhắn chào mừng hệ thống
    const welcomeText = addedMemberNames.length > 0
      ? `🎉 Đã tạo nhóm thảo luận "${cleanName}" và bổ sung thành viên qua Gmail: ${addedMemberNames.join(', ')}.`
      : `🎉 Đã tạo nhóm thảo luận "${cleanName}". Chúc các bạn thảo luận hiệu quả!`;

    onSendMessage({
      projectId: project.id,
      channelId: newChannel.id,
      chatId: createChannelChatId(project.id, newChannel.id),
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      senderEmail: currentUser.email,
      participants: [currentUser.id, ...finalMemberIds],
      text: welcomeText,
      type: 'system',
      createdAt: new Date().toISOString(),
    });
  };

  // Delete custom channel
  const handleDeleteChannel = (channelId: string) => {
    const target = channels.find((c) => c.id === channelId);
    if (!target || target.isDefault) return;
    if (window.confirm(`Bạn có chắc muốn xóa nhóm thảo luận "${target.name}" không?`)) {
      const remaining = channels.filter((c) => c.id !== channelId);
      setChannels(remaining);
      if (selectedChannelId === channelId) {
        setSelectedChannelId('ch_main');
      }
      try {
        localStorage.setItem(`teamup_channels_${project.id}`, JSON.stringify(remaining));
      } catch {}
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith('image/');
    onSendMessage({
      projectId: project.id,
      chatId: selectedRecipientId
        ? createDirectChatId(currentUser.id, selectedRecipientId)
        : createChannelChatId(project.id, selectedChannelId),
      channelId: selectedRecipientId ? undefined : selectedChannelId,
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderAvatar: currentUser.avatar,
      recipientId: selectedRecipientId || undefined,
      receiverId: selectedRecipientId || undefined,
      participants: selectedRecipientId ? [currentUser.id, selectedRecipientId].sort() : [currentUser.id],
      text: isImage ? `Đã gửi một hình ảnh: ${file.name}` : `Đã gửi tài liệu đính kèm: ${file.name}`,
      type: isImage ? 'image' : 'file',
      fileName: file.name,
      fileSize: `${(file.size / 1024).toFixed(1)} KB`,
      fileUrl: URL.createObjectURL(file),
      createdAt: new Date().toISOString(),
    });
  };

  // Parse text and format @tags
  const renderMessageContent = (text: string) => {
    // Split text by tags while keeping them
    const tokens = text.split(/(@[a-zA-Z0-9À-ỹ_ ]+?)(?=[.,!?\s]|$)/g);
    return tokens.map((token, idx) => {
      if (token.startsWith('@')) {
        const tag = token.slice(1).trim();
        const isAll = /^(mọi người|all)$/i.test(tag);
        const isAi = /^(up ai|ai|trợ lý|troly)$/i.test(tag);

        return (
          <span
            key={idx}
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.2 mx-0.5 rounded font-bold text-[11px] align-baseline transition-colors ${
              isAll
                ? 'bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 ring-1 ring-blue-300 dark:ring-blue-700'
                : isAi
                ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 ring-1 ring-indigo-300 dark:ring-indigo-700'
                : 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-300 dark:ring-emerald-700'
            }`}
          >
            {token}
          </span>
        );
      }
      return token;
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden flex h-[calc(100vh-210px)] min-h-[580px] relative">
      {/* Left Sidebar: Channel & DM list (Full width on mobile when viewing list) */}
      <aside
        aria-label="Danh sách tin nhắn"
        className={`w-full md:w-72 border-r border-slate-200 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 shrink-0 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        <div className="p-3 border-b border-slate-200 dark:border-slate-800 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm cuộc trò chuyện..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Group Channels Section */}
          <div>
            <div className="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Kênh thảo luận nhóm</span>
              <span className="text-[10px] font-medium text-slate-400">
                {channels.length} nhóm
              </span>
            </div>

            {/* List of Channels starting with Thảo Luận Chung */}
            <div className="space-y-1">
              {channels.map((chan) => {
                const isSelected = selectedRecipientId === null && selectedChannelId === chan.id;
                return (
                  <div
                    key={chan.id}
                    className={`group w-full flex items-center justify-between p-2 rounded-xl transition-colors min-h-[44px] ${
                      isSelected
                        ? `${theme.bgLight} ${theme.textLight} font-bold shadow-2xs`
                        : 'hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <button
                      id={`btn-channel-${chan.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedRecipientId(null);
                        setSelectedChannelId(chan.id);
                        setMobileShowChat(true);
                      }}
                      className="flex-1 flex items-center gap-2.5 min-w-0 text-left cursor-pointer"
                    >
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold truncate">{chan.name}</p>
                        <p className="text-[11px] text-slate-400 truncate">
                          {chan.description || `${project.members.length} thành viên`}
                        </p>
                      </div>
                    </button>

                    <div className="flex items-center gap-1 shrink-0 ml-1">
                      {!chan.isDefault && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteChannel(chan.id);
                          }}
                          title={`Xóa nhóm "${chan.name}"`}
                          className="p-1 rounded-md text-slate-400 hover:text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/60 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                    </div>
                  </div>
                );
              })}

              {/* Nút "Tạo nhóm" ở ngay dưới "Thảo Luận Chung" */}
              <button
                id="btn-chat-create-group"
                type="button"
                onClick={() => {
                  setNewGroupName('');
                  setNewGroupDesc('');
                  setSelectedGroupMemberIds(project.members.map((m) => m.id));
                  setShowCreateGroupModal(true);
                }}
                className="w-full mt-1.5 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl border border-dashed border-indigo-300 dark:border-indigo-700/80 hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 text-xs font-bold transition-all shadow-2xs cursor-pointer min-h-[44px] group"
              >
                <Plus className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                <span>Tạo nhóm</span>
              </button>
            </div>
          </div>

          {/* 1-on-1 Direct Messages (Messenger Style) */}
          <div>
            <div className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-indigo-500" />
                Thành viên trong nhóm ({directMessageMembers.length})
              </span>
              <button
                type="button"
                onClick={() => setShowAddGmailModal(true)}
                className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 px-2 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors cursor-pointer border border-indigo-200/50 dark:border-indigo-800/50"
                title="Thêm thành viên vào nhóm bằng địa chỉ Gmail"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Thêm Gmail</span>
              </button>
            </div>

            {directMessageMembers.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl my-1">
                <p>Chưa có thành viên nào khác trong nhóm.</p>
                <button
                  type="button"
                  onClick={() => setShowAddGmailModal(true)}
                  className="mt-2 text-indigo-600 dark:text-indigo-400 font-bold hover:underline inline-flex items-center gap-1 text-[11px]"
                >
                  <Mail className="w-3 h-3" />
                  + Thêm thành viên bằng Gmail
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {directMessageMembers.map((member) => {
                  const isSelected = selectedRecipientId === member.id;
                  const displayName = member.name.replace(/\s*\(Bạn\)/gi, '').trim();

                  return (
                    <div
                      key={member.id}
                      className={`group w-full flex items-center justify-between p-2 rounded-xl text-left transition-all min-h-[48px] cursor-pointer border ${
                        isSelected
                          ? 'bg-indigo-50/80 dark:bg-indigo-950/60 border-indigo-400/80 dark:border-indigo-600 font-bold shadow-2xs'
                          : 'border-transparent hover:bg-slate-100 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedRecipientId(member.id);
                          setMobileShowChat(true);
                        }}
                        className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer"
                        title={`Nhắn tin riêng với ${displayName} (Messenger)`}
                      >
                        <div className="relative shrink-0">
                          <img
                            src={member.avatar}
                            alt={displayName}
                            className="w-8 h-8 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800 group-hover:ring-indigo-400 transition-all"
                            referrerPolicy="no-referrer"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              member.isOnline !== false ? 'bg-emerald-500 ring-1 ring-emerald-300' : 'bg-slate-400'
                            }`}
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1">
                            <p className="text-xs font-bold truncate text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                              {displayName}
                            </p>
                            {member.isAdmin && (
                              <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300/40 shrink-0">
                                Admin
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate mt-0.5">
                            <span className={member.isOnline !== false ? "text-emerald-600 dark:text-emerald-400 font-semibold shrink-0" : "text-slate-400 font-medium"}>
                              {member.isOnline !== false ? 'đang hoạt động' : (member.lastActive || 'vừa truy cập')}
                            </span>
                            {member.email && (
                              <>
                                <span>•</span>
                                <span className="truncate text-slate-400">{member.email}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Action buttons: Kick from group (admin only) & Open chat */}
                      <div className="shrink-0 ml-1.5 flex items-center gap-1">
                        {isCurrentUserAdmin && !member.isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleKickMember(member);
                            }}
                            title={`Đá "${displayName}" ra khỏi nhóm`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-rose-600 transition-colors opacity-70 group-hover:opacity-100 cursor-pointer"
                          >
                            <UserMinus className="w-3.5 h-3.5 text-rose-500 hover:text-white" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedRecipientId(member.id);
                            setMobileShowChat(true);
                          }}
                          className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center text-[10px] opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Nhắn tin riêng"
                        >
                          <MessageCircle className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* AI Helper Banner */}
        {onOpenAiModal && (
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-linear-to-r from-indigo-50/50 to-violet-50/50 dark:from-indigo-950/20 dark:to-violet-950/20">
            <button
              type="button"
              onClick={onOpenAiModal}
              className="w-full py-2.5 px-3 rounded-xl text-xs font-semibold bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5 shadow-2xs hover:bg-indigo-50 min-h-[44px]"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Hỏi UP AI
            </button>
          </div>
        )}
      </aside>

      {/* Main Chat Area (Full width on mobile when viewing chat) */}
      <section
        aria-label="Khu vực trò chuyện"
        className={`flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 relative ${
          mobileShowChat ? 'flex' : 'hidden md:flex'
        }`}
      >
        {/* Chat Header */}
        <div className="px-3 sm:px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {/* Back button on mobile */}
            <button
              type="button"
              onClick={() => setMobileShowChat(false)}
              className="md:hidden p-1.5 -ml-1 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 shrink-0 min-w-[36px] min-h-[36px] flex items-center justify-center cursor-pointer"
              title="Quay lại danh sách kênh"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            {selectedMember ? (
              <>
                <div className="relative shrink-0">
                  <img
                    src={selectedMember.avatar}
                    alt={selectedMember.name}
                    className="w-9 h-9 rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <span
                    className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                      selectedMember.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                    }`}
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate flex items-center gap-1.5">
                    <span>
                      {selectedMember.name.replace(/\s*\(Bạn\)/gi, '').trim()}
                    </span>
                    <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hidden sm:inline">
                      Chat riêng (Messenger)
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate flex items-center gap-1.5">
                    <span className={selectedMember.isOnline !== false ? 'text-emerald-500 font-bold' : 'text-slate-400'}>
                      ● {selectedMember.isOnline !== false ? 'Đang hoạt động' : (selectedMember.lastActive || 'Vừa truy cập')}
                    </span>
                    <span>•</span>
                    <span className="truncate">{selectedMember.role || 'Thành viên nhóm'}</span>
                    {selectedMember.email && (
                      <>
                        <span className="hidden sm:inline">•</span>
                        <span className="hidden sm:inline text-slate-400 truncate">{selectedMember.email}</span>
                      </>
                    )}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shrink-0">
                  #
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                    {activeChannel.name}
                  </h3>
                  <p className="text-[11px] text-slate-500 truncate">
                    {activeChannel.description || 'Kênh trao đổi nhóm • Gõ @ để tag tên thành viên hoặc hỏi UP AI'}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Quick Controls: Add Gmail / Kick member & Call / Voice */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Nút thêm thành viên bằng Gmail trong kênh nhóm */}
            {!selectedMember && (
              <button
                type="button"
                onClick={() => setShowAddGmailModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 transition-colors cursor-pointer border border-indigo-200/50 dark:border-indigo-800/50"
                title="Bổ sung thành viên mới vào nhóm bằng địa chỉ Gmail"
              >
                <Mail className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">+ Thêm Gmail</span>
              </button>
            )}

            {/* Quản trị viên đá thành viên khỏi nhóm trực tiếp từ thanh tiêu đề chat 1-1 */}
            {selectedMember && isCurrentUserAdmin && selectedMember.id !== currentUser.id && (
              <button
                type="button"
                onClick={() => handleKickMember(selectedMember)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors cursor-pointer border border-rose-200/50 dark:border-rose-800/50"
                title={`Đá "${selectedMember.name}" khỏi nhóm`}
              >
                <UserMinus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đá khỏi nhóm</span>
              </button>
            )}

            {selectedMember && (
              <>
                <button
                  type="button"
                  onClick={toggleDirectMic}
                  title="Gọi thoại trực tiếp qua mic"
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <Phone className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => alert(`Đang kết nối cuộc gọi video nhóm với ${selectedMember.name}...`)}
                  title="Gọi video"
                  className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600 transition-colors cursor-pointer"
                >
                  <Video className="w-4 h-4" />
                </button>
              </>
            )}
            {isDirectMicOn ? (
              <div
                id="voice-bubble-active"
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500 text-white shadow-md shadow-emerald-500/25 transition-all"
              >
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-100"></span>
                </span>

                {/* Animated equalizer bars */}
                <div className="flex items-center gap-0.5 h-3.5 px-0.5">
                  <span
                    className="w-1 bg-white rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(4, 10 * micVolume)}px` }}
                  />
                  <span
                    className="w-1 bg-white rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(6, 14 * micVolume)}px` }}
                  />
                  <span
                    className="w-1 bg-white rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(4, 9 * micVolume)}px` }}
                  />
                  <span
                    className="w-1 bg-white rounded-full transition-all duration-150"
                    style={{ height: `${Math.max(5, 12 * micVolume)}px` }}
                  />
                </div>

                <span className="text-xs font-extrabold tracking-tight hidden sm:inline">
                  Đang Nói Trực Tiếp
                </span>

                <button
                  id="btn-voice-bubble-stop"
                  type="button"
                  onClick={toggleDirectMic}
                  title="Tắt micro nói trực tiếp"
                  className="ml-1 p-1 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors cursor-pointer"
                >
                  <MicOff className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                id="btn-voice-bubble-start"
                type="button"
                onClick={toggleDirectMic}
                title="Bật mic nói trực tiếp với các thành viên trong nhóm này"
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700/80 text-emerald-700 dark:text-emerald-300 text-xs font-bold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all shadow-xs group cursor-pointer"
              >
                <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-2xs group-hover:scale-105 transition-transform">
                  <Mic className="w-3 h-3" />
                </div>
                <span className="hidden sm:inline">Bật Mic Nói Trực Tiếp</span>
                <span className="sm:hidden">Bật Mic</span>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              </button>
            )}
          </div>
        </div>

        {/* Live Audio Banner when Direct Mic is Active */}
        {isDirectMicOn && (
          <div className="bg-emerald-50 dark:bg-emerald-950/40 border-b border-emerald-200 dark:border-emerald-800/80 px-4 py-2 flex items-center justify-between text-xs text-emerald-800 dark:text-emerald-200 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center gap-2.5">
              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center animate-pulse">
                <Radio className="w-3.5 h-3.5" />
              </div>
              <div>
                <p className="font-bold">
                  Bạn đang bật micro nói trực tiếp trong {selectedRecipientId ? selectedMember?.name : activeChannel.name}
                </p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
                  Thành viên nghe được âm thanh trực tiếp mà không cần bấm gọi video hay soạn tin nhắn.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={toggleDirectMic}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shrink-0 shadow-xs cursor-pointer"
            >
              Tắt Mic
            </button>
          </div>
        )}

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {currentChatMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-3 shadow-2xs">
                <Users className="w-7 h-7" />
              </div>
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                {selectedRecipientId
                  ? `Bắt đầu cuộc trò chuyện với ${selectedMember?.name}`
                  : `Nhóm ${activeChannel.name} hoàn toàn mới`}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mt-1">
                {selectedRecipientId
                  ? 'Chưa có tin nhắn nào giữa hai bạn. Hãy gửi tin nhắn đầu tiên!'
                  : 'Kênh nhóm này vừa được tạo mới trắng, chưa có tin nhắn cũ. Bạn có thể bắt đầu nhắn tin, gõ @ để tag tên thành viên hoặc bật mic nói trực tiếp!'}
              </p>
            </div>
          ) : (
            currentChatMessages.map((msg, idx) => {
              const isMe = msg.senderId === currentUser.id;
              const isAi = msg.isAi || msg.senderId === 'ai_bot';
              const isSystem = msg.type === 'system';
              const itemKey = msg.id ? `${msg.id}_${idx}` : `msg_item_${idx}`;

              if (isSystem) {
                return (
                  <div key={itemKey} className="flex justify-center my-2">
                    <span className="text-[11px] px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200/60 dark:border-slate-700/60 font-medium">
                      📢 {msg.text}
                    </span>
                  </div>
                );
              }

              return (
                <div
                  key={itemKey}
                  className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
                >
                  <img
                    src={msg.senderAvatar}
                    alt={msg.senderName}
                    className="w-8 h-8 rounded-full object-cover shrink-0 mt-0.5"
                    referrerPolicy="no-referrer"
                  />

                  <div className={`max-w-md sm:max-w-lg space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className={`flex items-center gap-2 text-[11px] ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <span className="font-bold text-slate-700 dark:text-slate-300">
                        {msg.senderName}
                      </span>
                      {isAi && (
                        <span className="px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-[10px] font-bold flex items-center gap-0.5">
                          <Bot className="w-3 h-3" />
                          UP AI
                        </span>
                      )}
                      <span className="text-slate-400">{msg.timestamp}</span>
                    </div>

                    <div
                      className={`p-3 rounded-2xl text-xs leading-relaxed ${
                        isMe
                          ? `${theme.primary} rounded-tr-xs shadow-xs`
                          : isAi
                          ? 'bg-indigo-50 dark:bg-indigo-950/40 text-slate-900 dark:text-slate-100 border border-indigo-200 dark:border-indigo-900/50 rounded-tl-xs'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-tl-xs'
                      }`}
                    >
                      {msg.type === 'image' && msg.fileUrl && (
                        <div className="mb-2 rounded-lg overflow-hidden max-w-xs">
                          <img src={msg.fileUrl} alt="Attached" className="w-full object-cover" />
                        </div>
                      )}

                      {msg.type === 'file' && (
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-white/20 dark:bg-black/20 mb-1">
                          <FileText className="w-4 h-4" />
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold truncate">{msg.fileName}</p>
                            <p className="text-[10px] opacity-80">{msg.fileSize}</p>
                          </div>
                        </div>
                      )}

                      <p className="whitespace-pre-wrap">{renderMessageContent(msg.text)}</p>
                    </div>
                  </div>
                </div>
              );
            })
          )}

          {isAiTyping && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-indigo-50 dark:bg-indigo-950/40 px-3 py-2 rounded-2xl text-xs text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-bounce" />
                <span>UP AI đang tìm hiểu ngầm thông tin và tổng hợp câu trả lời...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar with @ Mention Popup */}
        <div className="p-3 sm:p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 relative">
          {/* Autocomplete Popup when user types @ */}
          {showMentionMenu && filteredMentions.length > 0 && (
            <div className="absolute bottom-full left-4 right-4 sm:left-14 sm:max-w-md mb-2 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden z-30 animate-in fade-in slide-in-from-bottom-2">
              <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                <AtSign className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tag thành viên hoặc mọi người trong nhóm:</span>
              </div>
              <div className="max-h-52 overflow-y-auto p-1.5 space-y-1">
                {filteredMentions.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectMention(item.name)}
                    className="w-full flex items-center gap-2.5 p-2 rounded-lg text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer group"
                  >
                    {item.isAll ? (
                      <div className="w-7 h-7 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Users className="w-3.5 h-3.5" />
                      </div>
                    ) : item.isAi ? (
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                    ) : (
                      <div className="relative shrink-0">
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="w-7 h-7 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        <span
                          className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white dark:border-slate-900 ${
                            item.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                          @{item.name}
                        </span>
                        {item.isAll && (
                          <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                            Tất cả
                          </span>
                        )}
                        {item.isAi && (
                          <span className="text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.2 rounded">
                            UP AI
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">{item.subtitle}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSend} className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Upload file button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Đính kèm tài liệu"
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <Paperclip className="w-4 h-4" />
              </button>

              {/* Upload image button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Gửi hình ảnh"
                className="p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <ImageIcon className="w-4 h-4" />
              </button>

              {/* Quick Tag @ button */}
              <button
                type="button"
                onClick={() => {
                  setInputText((prev) => prev + '@');
                  setShowMentionMenu(true);
                  inputRef.current?.focus();
                }}
                title="Tag thành viên (@)"
                className="p-2 text-slate-500 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                <AtSign className="w-4 h-4" />
              </button>

              {/* Input text field */}
              <input
                id="input-chat-message"
                ref={inputRef}
                type="text"
                placeholder={
                  selectedRecipientId
                    ? `Nhắn tin cho ${selectedMember?.name}...`
                    : `Nhắn vào #${activeChannel.name} (gõ @ để tag tên thành viên hoặc hỏi UP AI)...`
                }
                value={inputText}
                onChange={handleInputChange}
                className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />

              {/* Send button */}
              <button
                id="btn-send-message"
                type="submit"
                disabled={!inputText.trim()}
                className={`p-2 rounded-xl transition-all cursor-pointer ${
                  inputText.trim()
                    ? `${theme.primary} shadow-sm`
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>

            {/* Quick suggested chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 text-[11px] text-slate-500 scrollbar-none">
              <span className="font-semibold shrink-0">Gợi ý nhanh:</span>
              <button
                type="button"
                onClick={() => setInputText('@Mọi người ')}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
              >
                👥 @Mọi người
              </button>
              <button
                type="button"
                onClick={() => setInputText('@UP AI Gợi ý cho nhóm 3 cách trình bày slide thuyết trình ấn tượng')}
                className="px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 shrink-0 cursor-pointer"
              >
                ✨ @UP AI Ý tưởng slide
              </button>
              <button
                type="button"
                onClick={toggleDirectMic}
                className="px-2.5 py-0.5 rounded-full bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 shrink-0 cursor-pointer"
              >
                🎙️ Bật mic nói ngay
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Modal Tạo Nhóm Mới (khi bấm vào nút Tạo nhóm ở dưới Thảo Luận Chung) */}
      {showCreateGroupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Tạo Nhóm Thảo Luận Mới
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Tạo nhóm mới trắng (ID mới, không tin nhắn cũ) vào KÊNH THẢO LUẬN NHÓM
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCreateGroupModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên nhóm mới *
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="Ví dụ: Nhóm Thuyết Trình, Nhóm Nghiên Cứu..."
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả mục tiêu nhóm (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Luyện nói 10 phút, chuẩn bị slide, tổng hợp tài liệu..."
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* Bổ sung thành viên bằng Gmail (thay vì chỉ chọn những thành viên có sẵn) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Bổ sung thành viên bằng Gmail (thay vì chỉ chọn từ danh sách)
                </label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      placeholder="Nhập Gmail thành viên (ví dụ: linh@gmail.com)..."
                      value={gmailInput}
                      onChange={(e) => setGmailInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const val = gmailInput.trim().toLowerCase();
                          if (val && val.includes('@') && !newGroupGmails.includes(val)) {
                            setNewGroupGmails((prev) => [...prev, val]);
                            setGmailInput('');
                          }
                        }
                      }}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const val = gmailInput.trim().toLowerCase();
                      if (val && val.includes('@') && !newGroupGmails.includes(val)) {
                        setNewGroupGmails((prev) => [...prev, val]);
                        setGmailInput('');
                      }
                    }}
                    className="px-3 py-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 text-xs font-bold border border-indigo-200/60 dark:border-indigo-800 transition-colors cursor-pointer shrink-0"
                  >
                    + Thêm
                  </button>
                </div>

                {newGroupGmails.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {newGroupGmails.map((email) => (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 text-[11px] font-medium border border-indigo-200 dark:border-indigo-800"
                      >
                        <Mail className="w-3 h-3 text-indigo-500" />
                        <span>{email}</span>
                        <button
                          type="button"
                          onClick={() => setNewGroupGmails((prev) => prev.filter((e) => e !== email))}
                          className="hover:text-red-500 ml-0.5 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Hoặc chọn từ thành viên hiện có ({project.members.length})
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedGroupMemberIds.length === project.members.length) {
                        setSelectedGroupMemberIds([]);
                      } else {
                        setSelectedGroupMemberIds(project.members.map((m) => m.id));
                      }
                    }}
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                  >
                    {selectedGroupMemberIds.length === project.members.length
                      ? 'Bỏ chọn tất cả'
                      : 'Chọn tất cả'}
                  </button>
                </div>

                <div className="max-h-36 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700">
                  {project.members.map((mem) => {
                    const isChecked = selectedGroupMemberIds.includes(mem.id);
                    return (
                      <label
                        key={mem.id}
                        className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <img
                            src={mem.avatar}
                            alt={mem.name}
                            className="w-6 h-6 rounded-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <span className="text-xs font-medium text-slate-800 dark:text-slate-200 truncate block">
                              {mem.name}
                            </span>
                            {mem.email && (
                              <span className="text-[10px] text-slate-400 truncate block">
                                {mem.email}
                              </span>
                            )}
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedGroupMemberIds((prev) => [...prev, mem.id]);
                            } else {
                              setSelectedGroupMemberIds((prev) =>
                                prev.filter((id) => id !== mem.id)
                              );
                            }
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowCreateGroupModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!newGroupName.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    newGroupName.trim()
                      ? `${theme.primary} shadow-sm`
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  Tạo Nhóm Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Thêm Thành Viên bằng Gmail trực tiếp trong màn hình chat */}
      {showAddGmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Thêm thành viên bằng Gmail
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Bổ sung thành viên vào nhóm và bắt đầu trò chuyện ngay
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddGmailModal(false);
                  setAddGmailError(null);
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickAddMemberByGmail} className="space-y-3.5">
              {addGmailError && (
                <div className="p-2.5 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900/50 text-xs text-red-600 dark:text-red-400">
                  {addGmailError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Địa chỉ Gmail của thành viên *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="ví dụ: linh@gmail.com hoặc huong@gmail.com"
                    value={quickGmailInput}
                    onChange={(e) => setQuickGmailInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên hiển thị (tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Để trống sẽ tự động lấy từ Gmail"
                  value={quickNameInput}
                  onChange={(e) => setQuickNameInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
                Thành viên được thêm sẽ xuất hiện ngay trong danh sách thành viên nhóm, có thể nhận tin nhắn và lưu lịch sử trò chuyện.
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddGmailModal(false);
                    setAddGmailError(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={isAddingGmail || !quickGmailInput.trim()}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer ${
                    quickGmailInput.trim() && !isAddingGmail
                      ? `${theme.primary} shadow-sm`
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  {isAddingGmail ? 'Đang thêm...' : 'Thêm Thành Viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
