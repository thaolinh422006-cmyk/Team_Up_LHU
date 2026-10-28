import React, { useState, useEffect } from 'react';
import {
  X,
  UserPlus,
  Mail,
  Copy,
  Check,
  Sparkles,
  Shield,
  Trash2,
  Share2,
  Users,
  CheckCircle2,
  Lock,
  Crown,
  AlertTriangle,
  Send,
  RefreshCw,
  ExternalLink,
  Clock,
  SendHorizontal,
  MailCheck,
} from 'lucide-react';
import { Member, Project, TeamInvitation } from '../types';
import { ThemeConfig } from '../utils/theme';
import { sendDeviceNotification } from '../utils/notificationService';
import { formatNameFromEmail, createMemberFromEmail, isProjectCreator } from '../utils/user';

interface AddMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  onAddMember: (newMember: Omit<Member, 'id'>) => void;
  onRemoveMember: (memberId: string) => void;
  theme: ThemeConfig;
  currentUser: Member;
}

const PRESET_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

const SUGGESTED_STUDENTS = [
  {
    name: 'Nguyễn Thu Hà',
    email: 'thuha.nguyen@student.edu.vn',
    role: 'Thiết kế đồ họa & Slide',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    statusText: 'Thành thạo Canva, PPT & Figma',
  },
  {
    name: 'Phạm Quốc Bảo',
    email: 'quocbao.pham@student.edu.vn',
    role: 'Thu thập số liệu & Khảo sát',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    statusText: 'Chuyên chạy SPSS và biểu đồ',
  },
  {
    name: 'Đỗ Mai Anh',
    email: 'maianh.do@student.edu.vn',
    role: 'Thuyết trình viên chính',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
    statusText: 'Giọng đọc chuẩn, phản biện tốt',
  },
  {
    name: 'Lê Tuấn Kiệt',
    email: 'tuankiet.le@student.edu.vn',
    role: 'Nghiên cứu tài liệu học thuật',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    statusText: 'Tra cứu Google Scholar & Thư viện',
  },
];

const ROLE_OPTIONS = [
  'Nghiên cứu & Thu thập tài liệu',
  'Thiết kế Slide & Đồ họa',
  'Thuyết trình chính (Speaker)',
  'Soạn thảo nội dung & Báo cáo',
  'Thư ký & Quản lý tiến độ',
  'Phản biện & Kiểm duyệt chất lượng',
  'Giảng viên hướng dẫn / Cố vấn',
  'Thành viên',
];

export const AddMemberModal: React.FC<AddMemberModalProps> = ({
  isOpen,
  onClose,
  project,
  onAddMember,
  onRemoveMember,
  theme,
  currentUser,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'email' | 'manage_invites' | 'form' | 'link' | 'suggestions' | 'current'>(
    'email'
  );
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState(ROLE_OPTIONS[0]);
  const [statusText, setStatusText] = useState('');
  const [selectedAvatar, setSelectedAvatar] = useState(PRESET_AVATARS[0]);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [memberToDelete, setMemberToDelete] = useState<Member | null>(null);

  // Email Invitation States (Canva Style)
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState(ROLE_OPTIONS[0]);
  const [inviteMessage, setInviteMessage] = useState('Chào bạn, cùng tham gia nhóm để làm bài thuyết trình này với mình nhé!');
  const [isSendingInvite, setIsSendingInvite] = useState(false);
  
  // Persist invitations in localStorage for offline & instant responsiveness
  const [invitations, setInvitations] = useState<TeamInvitation[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('teamup_invitations');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error('Failed to parse teamup_invitations from localStorage', e);
      }
    }
    return [];
  });

  // Sync invitations to localStorage whenever they change
  useEffect(() => {
    if (typeof window !== 'undefined' && invitations.length >= 0) {
      try {
        localStorage.setItem('teamup_invitations', JSON.stringify(invitations));
      } catch (e) {
        console.error('Failed to save teamup_invitations', e);
      }
    }
  }, [invitations]);

  const [isLoadingInvitations, setIsLoadingInvitations] = useState(false);
  const [lastInviteResult, setLastInviteResult] = useState<{
    statusLabel: string;
    message: string;
    inviteUrl: string;
    gmailWebComposeUrl?: string;
    mailtoUrl?: string;
    email: string;
    role: string;
  } | null>(null);
  const [copiedInviteId, setCopiedInviteId] = useState<string | null>(null);
  const [customInviteEmailForLink, setCustomInviteEmailForLink] = useState('luongthithanhnhan280883@gmail.com');

  // Helper to get published base URL (without ?join=)
  const getAppBaseUrl = () => {
    if (typeof window === 'undefined') return '';
    const origin = window.location.origin;
    const path = window.location.pathname.replace(/\/$/, '');
    return `${origin}${path}`;
  };

  // Tạo đường dẫn mời đầy đủ mã lời mời và ID dự án để người tham gia truy cập thẳng vào bài thuyết trình
  const getJoinUrlForEmail = (_targetEmail?: string, tokenId?: string) => {
    const base = getAppBaseUrl();
    const token = tokenId || `inv_${Date.now()}`;
    return `${base}/?invite=${encodeURIComponent(token)}&project=${encodeURIComponent(project.id)}`;
  };

  // Helper to create prefilled Gmail compose URL
  const getGmailComposeUrl = (targetEmail: string, joinUrl: string, roleName?: string) => {
    const clean = (targetEmail || '').trim().toLowerCase();
    const cleanLink = joinUrl || getJoinUrlForEmail(clean);
    const emailSubject = `[TEAM UP] Mời bạn tham gia nhóm "${project.name}"`;
    const emailBody = `Chào bạn,\n\nBạn nhận được lời mời tham gia nhóm "${project.name}" trên ứng dụng TEAM UP.\nNgười mời: ${currentUser.name || 'Trưởng nhóm'}\nVai trò được giao: ${roleName || 'Thành viên'}\n\nBấm vào liên kết sau để truy cập dự án và tham gia nhóm ngay (xem toàn bộ slide và cùng chỉnh sửa tiếp tục):\n${cleanLink}\n\n* Lưu ý: Lời mời áp dụng cho tài khoản ${clean}. Bấm vào link để vào nhóm ngay.\n\nChúc bạn làm việc hiệu quả cùng nhóm!\nTEAM UP Workspace`;

    return `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      clean
    )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
  };

  const getMailtoUrl = (targetEmail: string, joinUrl: string, roleName?: string) => {
    const clean = (targetEmail || '').trim().toLowerCase();
    const cleanLink = joinUrl || getJoinUrlForEmail(clean);
    const emailSubject = `[TEAM UP] Mời bạn tham gia nhóm "${project.name}"`;
    const emailBody = `Chào bạn,\n\nBạn nhận được lời mời tham gia nhóm "${project.name}" trên ứng dụng TEAM UP.\nNgười mời: ${currentUser.name || 'Trưởng nhóm'}\nVai trò được giao: ${roleName || 'Thành viên'}\n\nBấm vào liên kết sau để truy cập dự án và tham gia nhóm ngay (xem toàn bộ slide và cùng chỉnh sửa tiếp tục):\n${cleanLink}\n\n* Lưu ý: Lời mời áp dụng cho tài khoản ${clean}. Bấm vào link để vào nhóm ngay.\n\nChúc bạn làm việc hiệu quả cùng nhóm!\nTEAM UP Workspace`;

    return `mailto:${encodeURIComponent(clean)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;
  };

  // Fetch invitations for this project from backend
  const fetchInvitations = async () => {
    try {
      setIsLoadingInvitations(true);
      const res = await fetch(`/api/invitations?projectId=${encodeURIComponent(project.id)}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.invitations)) {
        const baseAppUrl = getAppBaseUrl();
        // Normalize inviteUrl for all invitations to include project and invite token
        const normalized: TeamInvitation[] = data.invitations.map((inv: TeamInvitation) => {
          const cleanEmail = (inv.email || '').trim().toLowerCase();
          const correctUrl = `${baseAppUrl}/?invite=${encodeURIComponent(inv.id)}&project=${encodeURIComponent(inv.projectId || project.id)}`;
          const gmailUrl = getGmailComposeUrl(cleanEmail, correctUrl, inv.role);
          const mailto = getMailtoUrl(cleanEmail, correctUrl, inv.role);
          return {
            ...inv,
            inviteUrl: correctUrl,
            gmailWebComposeUrl: gmailUrl,
            mailtoUrl: mailto,
          };
        });
        setInvitations(normalized);
        try {
          localStorage.setItem('teamup_invitations', JSON.stringify(normalized));
        } catch {}
      }
    } catch (e) {
      console.error('Failed to fetch invitations', e);
    } finally {
      setIsLoadingInvitations(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchInvitations();
    }
  }, [isOpen, project.id]);

  // Requirement 2 & 4: Mời thành viên qua liên kết mời (100% Miễn Phí)
  // Hiển thị đúng trạng thái: “Đã tạo lời mời”
  const handleSendEmailInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    const cleanEmail = inviteEmail.trim().toLowerCase();
    const fallbackJoinUrl = getJoinUrlForEmail(cleanEmail);

    try {
      setIsSendingInvite(true);

      const res = await fetch('/api/invitations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: cleanEmail,
          projectId: project.id,
          projectName: project.name,
          projectCategory: project.category,
          inviterName: currentUser.name || 'Trưởng nhóm',
          inviterEmail: currentUser.email,
          role: inviteRole,
          message: inviteMessage.trim() || undefined,
          baseUrl: getAppBaseUrl(),
        }),
      });

      const data = await res.json();
      const finalInviteUrl = data.inviteUrl || fallbackJoinUrl;
      const gmailUrl = data.gmailWebComposeUrl || getGmailComposeUrl(cleanEmail, finalInviteUrl, inviteRole);
      const mailto = data.mailtoUrl || getMailtoUrl(cleanEmail, finalInviteUrl, inviteRole);

      const newInv: TeamInvitation = data.invitation || {
        id: `inv_${Date.now()}`,
        email: cleanEmail,
        projectId: project.id,
        projectName: project.name,
        inviterName: currentUser.name || 'Trưởng nhóm',
        role: inviteRole,
        message: inviteMessage.trim() || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        inviteUrl: finalInviteUrl,
        gmailWebComposeUrl: gmailUrl,
        mailtoUrl: mailto,
        emailDeliveryStatus: 'pending',
        emailDeliveryMessage: 'Đã tạo lời mời',
      };

      setInvitations((prev) => {
        const filtered = prev.filter((i) => i.email.toLowerCase() !== cleanEmail);
        return [newInv, ...filtered];
      });

      try {
        const saved = localStorage.getItem('teamup_invitations');
        const existing: TeamInvitation[] = saved ? JSON.parse(saved) : [];
        const updated = [newInv, ...existing.filter((i) => i.email.toLowerCase() !== cleanEmail)];
        localStorage.setItem('teamup_invitations', JSON.stringify(updated));
      } catch {}

      // Requirement 4: Hiển thị đúng trạng thái “Đã tạo lời mời”
      setLastInviteResult({
        statusLabel: 'Đã tạo lời mời',
        message: `Đã tạo lời mời cho ${cleanEmail} với vai trò "${inviteRole}". Lời mời có hạn 7 ngày. Hãy mở Gmail soạn thư hoặc sao chép liên kết để gửi ngay!`,
        inviteUrl: finalInviteUrl,
        gmailWebComposeUrl: gmailUrl,
        mailtoUrl: mailto,
        email: cleanEmail,
        role: inviteRole,
      });

      setSuccessNotice('Đã tạo lời mời');
      sendDeviceNotification({
        title: '✉️ Đã tạo lời mời',
        body: `Đã tạo liên kết mời cho ${cleanEmail} vào nhóm ${project.name}`,
        type: 'info',
      });

      setInviteEmail('');
      setInviteMessage('');
      fetchInvitations();
    } catch (err: any) {
      console.error('Error creating invitation:', err);
      // Even if network error occurs, create client-side invite in localStorage
      const finalInviteUrl = fallbackJoinUrl;
      const gmailUrl = getGmailComposeUrl(cleanEmail, finalInviteUrl, inviteRole);
      const mailto = getMailtoUrl(cleanEmail, finalInviteUrl, inviteRole);

      const newInv: TeamInvitation = {
        id: `inv_${Date.now()}`,
        email: cleanEmail,
        projectId: project.id,
        projectName: project.name,
        inviterName: currentUser.name || 'Trưởng nhóm',
        role: inviteRole,
        message: inviteMessage.trim() || undefined,
        status: 'pending',
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        inviteUrl: finalInviteUrl,
        gmailWebComposeUrl: gmailUrl,
        mailtoUrl: mailto,
        emailDeliveryStatus: 'pending',
      };

      setInvitations((prev) => [newInv, ...prev.filter((i) => i.email.toLowerCase() !== cleanEmail)]);

      setLastInviteResult({
        statusLabel: 'Đã tạo lời mời',
        message: `Đã tạo lời mời cho ${cleanEmail} thành công. Hãy mở Gmail hoặc sao chép liên kết gửi cho bạn học!`,
        inviteUrl: finalInviteUrl,
        gmailWebComposeUrl: gmailUrl,
        mailtoUrl: mailto,
        email: cleanEmail,
        role: inviteRole,
      });

      setSuccessNotice('Đã tạo lời mời');
    } finally {
      setIsSendingInvite(false);
    }
  };

  // Requirement 3: Nút “Sao chép link mời” -> Copy link app gốc đã xuất bản (không cần đuôi)
  const handleCopyInviteLink = (url?: string, id?: string) => {
    const targetUrl = getAppBaseUrl();
    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(targetUrl);
        copied = true;
      }
    } catch (err) {}

    if (!copied && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = targetUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        copied = true;
      } catch (err) {}
    }

    if (id) setCopiedInviteId(id);
    const notice = `Đã sao chép link mời: ${targetUrl}`;
    setSuccessNotice(notice);
    setLastInviteResult((prev) => (prev ? { ...prev, statusLabel: 'Đã sao chép liên kết mời' } : null));

    sendDeviceNotification({
      title: '📋 Đã sao chép liên kết mời',
      body: targetUrl,
      type: 'success',
    });

    setTimeout(() => {
      if (id) setCopiedInviteId(null);
      setSuccessNotice(null);
    }, 3000);
  };

  // Requirement 4: Nút “Mở Gmail” -> Mở giao diện Gmail soạn thư
  const handleOpenGmail = (gmailComposeUrl: string, mailtoFallback?: string) => {
    const notice = 'Đã mở Gmail để gửi lời mời';
    setSuccessNotice(notice);
    setLastInviteResult((prev) => (prev ? { ...prev, statusLabel: notice } : null));

    sendDeviceNotification({
      title: '✉️ Đã mở Gmail',
      body: 'Đang mở Gmail với nội dung soạn sẵn để bạn gửi lời mời...',
      type: 'info',
    });

    try {
      const win = window.open(gmailComposeUrl, '_blank');
      if (!win && mailtoFallback) {
        window.location.href = mailtoFallback;
      }
    } catch {
      if (mailtoFallback) window.location.href = mailtoFallback;
    }

    setTimeout(() => setSuccessNotice(null), 4000);
  };

  // Web Share API để chia sẻ liên kết trên thiết bị hỗ trợ
  const handleShareInviteLink = async (
    targetUrl: string,
    targetEmail: string,
    roleName?: string
  ) => {
    const cleanAppUrl = getAppBaseUrl();
    const shareData = {
      title: `[TEAM UP] Mời bạn tham gia nhóm ${project.name}`,
      text: `Chào bạn, ${currentUser.name || 'Trưởng nhóm'} mời bạn tham gia nhóm "${project.name}" (${roleName || 'Thành viên'}).\nBấm vào liên kết sau để truy cập dự án và nhập Gmail để tham gia ngay:\n`,
      url: cleanAppUrl,
    };

    if (
      typeof navigator !== 'undefined' &&
      navigator.share &&
      navigator.canShare &&
      navigator.canShare(shareData)
    ) {
      try {
        await navigator.share(shareData);
        setSuccessNotice('Đã chia sẻ liên kết mời');
        setTimeout(() => setSuccessNotice(null), 3000);
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') return; // User closed dialog
      }
    }

    // Fallback: Copy invite link
    handleCopyInviteLink(cleanAppUrl);
  };

  // Requirement 4: Nút "Gửi lại" - Hoạt động thật: làm mới hạn lời mời trên server và mở Gmail gửi lại
  const handleResendInvite = async (inv: TeamInvitation) => {
    const targetEmail = (inv.email || '').trim().toLowerCase();
    const cleanAppUrl = getAppBaseUrl();

    // 1. Call backend to renew invitation expiration and get fresh URLs
    try {
      const res = await fetch(`/api/invitations/${encodeURIComponent(inv.id)}/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: inv.id, email: targetEmail, baseUrl: cleanAppUrl }),
      });
      const data = await res.json();
      if (data.success && data.invitation) {
        setInvitations((prev) =>
          prev.map((i) => (i.id === inv.id ? { ...i, ...data.invitation } : i))
        );
        try {
          const saved = localStorage.getItem('teamup_invitations');
          if (saved) {
            const parsed: TeamInvitation[] = JSON.parse(saved);
            const updated = parsed.map((i) => (i.id === inv.id ? { ...i, ...data.invitation } : i));
            localStorage.setItem('teamup_invitations', JSON.stringify(updated));
          }
        } catch {}
      }
    } catch (e) {
      console.error('Error refreshing invitation on server:', e);
    }

    // 2. Open Gmail compose with clean link
    const gmailWebComposeUrl =
      inv.gmailWebComposeUrl || getGmailComposeUrl(targetEmail, cleanAppUrl, inv.role);
    const mailtoUrl = inv.mailtoUrl || getMailtoUrl(targetEmail, cleanAppUrl, inv.role);

    handleOpenGmail(gmailWebComposeUrl, mailtoUrl);
    setSuccessNotice(`Đã làm mới và mở Gmail để gửi lại lời mời cho ${targetEmail}`);
    sendDeviceNotification({
      title: '🔄 Đã gửi lại lời mời',
      body: `Đã làm mới và mở Gmail để gửi lời mời đến ${targetEmail}`,
      type: 'info',
    });
  };

  // Requirement 4: Nút "Xóa" - Hoạt động thật: xóa email khỏi danh sách, xóa khỏi localStorage và xóa trên server
  const handleDeleteInvite = async (inv: TeamInvitation) => {
    const targetId = inv.id;
    const targetEmail = (inv.email || '').trim().toLowerCase();

    // 1. Immediately update UI state (instant response)
    setInvitations((prev) =>
      prev.filter((i) => i.id !== targetId && i.email?.trim().toLowerCase() !== targetEmail)
    );

    // 2. Immediately remove from localStorage
    try {
      const saved = localStorage.getItem('teamup_invitations');
      if (saved) {
        const parsed: TeamInvitation[] = JSON.parse(saved);
        const filtered = parsed.filter(
          (i) => i.id !== targetId && i.email?.trim().toLowerCase() !== targetEmail
        );
        localStorage.setItem('teamup_invitations', JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('Failed to update localStorage on delete', e);
    }

    // 3. Delete on backend server
    try {
      await fetch(`/api/invitations/${encodeURIComponent(targetId)}?email=${encodeURIComponent(targetEmail)}`, {
        method: 'DELETE',
      });
      await fetch('/api/invitations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: targetId, email: targetEmail }),
      });
    } catch (e) {
      console.error('Error deleting invitation on server:', e);
    }

    // 4. Show instant notification
    const deleteMsg = `Đã xóa email ${inv.email} khỏi danh sách lời mời`;
    setSuccessNotice(deleteMsg);
    sendDeviceNotification({
      title: '🗑️ Đã xóa lời mời',
      body: deleteMsg,
      type: 'member_remove',
    });
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  // Requirement 3: Nút "Sao chép link mời" -> Copy link app gốc (không cần đuôi)
  const handleCopySingleInviteLink = (_targetEmail: string, id: string) => {
    const cleanAppUrl = getAppBaseUrl();

    let copied = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(cleanAppUrl);
        copied = true;
      }
    } catch (err) {}

    if (!copied && typeof document !== 'undefined') {
      try {
        const textArea = document.createElement('textarea');
        textArea.value = cleanAppUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        copied = true;
      } catch (err) {}
    }

    setCopiedInviteId(id);
    const notice = `Đã sao chép link mời: ${cleanAppUrl}`;
    setSuccessNotice(notice);
    sendDeviceNotification({
      title: '📋 Đã sao chép link mời',
      body: cleanAppUrl,
      type: 'success',
    });
    setTimeout(() => {
      setCopiedInviteId(null);
      setSuccessNotice(null);
    }, 2500);
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const inviteLink = getAppBaseUrl();

  if (!isOpen) return null;

  // Determine if the current user is the Administrator / Leader of this project
  const isCurrentUserAdmin = Boolean(
    currentUser && isProjectCreator(project, currentUser)
  );

  const canDeletePermission = Boolean(
    isCurrentUserAdmin ||
    (typeof window !== 'undefined' &&
      (localStorage.getItem('canDeleteMember') === 'true' ||
       localStorage.getItem('team_can_delete_member') === 'true'))
  );

  const inviteCode = `TU-${project.id.replace('proj_', '').slice(-4).toUpperCase() || '2026'}`;

  const handleCopyLink = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(inviteLink);
      }
    } catch {
      // Fallback
    }
    setCopiedLink(true);
    setSuccessNotice(`Đã sao chép link mời: ${inviteLink}`);
    setTimeout(() => {
      setCopiedLink(false);
      setSuccessNotice(null);
    }, 2500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) return;

    const avatarUrl = customAvatarUrl.trim() || selectedAvatar;

    onAddMember({
      name: fullName.trim(),
      email: email.trim() || `${fullName.toLowerCase().replace(/\s+/g, '')}@student.edu.vn`,
      role,
      avatar: avatarUrl,
      isOnline: true,
      isSpeaking: false,
      micMuted: true,
      statusText: statusText.trim() || 'Vừa tham gia nhóm TEAM UP',
    });

    setSuccessNotice(`Đã thêm thành viên "${fullName.trim()}" vào nhóm thành công!`);
    setTimeout(() => setSuccessNotice(null), 3000);

    // Reset form
    setFullName('');
    setEmail('');
    setStatusText('');
    setCustomAvatarUrl('');
    setActiveSubTab('current');
  };

  const handleAddSuggested = (suggested: typeof SUGGESTED_STUDENTS[0]) => {
    // Check if already in group
    const alreadyExists = project.members.some(
      (m) => m.name.toLowerCase() === suggested.name.toLowerCase()
    );

    if (alreadyExists) {
      alert(`Bạn ${suggested.name} đã có trong nhóm rồi!`);
      return;
    }

    onAddMember({
      name: suggested.name,
      email: suggested.email,
      role: suggested.role,
      avatar: suggested.avatar,
      isOnline: true,
      isSpeaking: false,
      micMuted: true,
      statusText: suggested.statusText,
    });

    setSuccessNotice(`Đã thêm "${suggested.name}" vào nhóm!`);
    setTimeout(() => setSuccessNotice(null), 3000);
    setActiveSubTab('current');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/40">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl ${theme.bgLight} ${theme.textLight} flex items-center justify-center shadow-xs`}
            >
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Thêm Thành Viên Vào Nhóm
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                  {project.members.length} người
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Dự án: <strong className="text-slate-700 dark:text-slate-200">{project.name}</strong>
              </p>
            </div>
          </div>

          <button
            id="btn-close-add-member-modal"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Banner */}
        {successNotice && (
          <div className="bg-emerald-50 dark:bg-emerald-950/60 border-b border-emerald-200 dark:border-emerald-800/60 px-6 py-2.5 flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 animate-in slide-in-from-top-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>{successNotice}</span>
          </div>
        )}

        {/* Permission Status Banner */}
        <div className="px-6 py-2.5 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 text-xs">
          {isCurrentUserAdmin ? (
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300">
                <Shield className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Vai trò của bạn: <strong className="text-indigo-600 dark:text-indigo-400">Quản trị viên nhóm</strong>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bạn có toàn quyền thêm thành viên và xóa thành viên khỏi nhóm.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400">
                <Users className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  Vai trò của bạn: <strong className="text-amber-600 dark:text-amber-400">Thành viên nhóm</strong>
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Bạn có quyền mời/thêm thành viên. Quyền xóa thành viên thuộc về Quản trị viên.
                </p>
              </div>
            </div>
          )}

          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
              isCurrentUserAdmin
                ? 'bg-indigo-100 dark:bg-indigo-900/80 text-indigo-700 dark:text-indigo-300'
                : 'bg-amber-100 dark:bg-amber-900/80 text-amber-700 dark:text-amber-300'
            }`}
          >
            {isCurrentUserAdmin ? 'Admin (Toàn quyền)' : 'Chỉ thêm thành viên'}
          </span>
        </div>

        {/* Sub-Tabs Bar */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-x-auto scrollbar-none">
          <button
            type="button"
            onClick={() => setActiveSubTab('email')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'email'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <Mail className="w-3.5 h-3.5 text-indigo-500" />
            <span>Mời Qua Email</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('manage_invites')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'manage_invites'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <MailCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Quản Lý Lời Mời ({invitations.length})</span>
            {invitations.filter((i) => i.status === 'pending').length > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('link')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'link'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            Link Mời Nhóm
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('form')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'form'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Thêm Nhanh
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('suggestions')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
              activeSubTab === 'suggestions'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            Gợi Ý ({SUGGESTED_STUDENTS.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('current')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 shrink-0 ${
              activeSubTab === 'current'
                ? `border-indigo-600 dark:border-indigo-400 text-indigo-600 dark:text-indigo-400`
                : `border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200`
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Đã Tham Gia ({project.members.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 0: MỜI QUA EMAIL (CANVA STYLE) */}
          {activeSubTab === 'email' && (
            <div className="space-y-5">
              {/* Free Invitation Mechanism Banner (100% Miễn Phí, Không Cần API Key) */}
              <div className="p-4 rounded-2xl border bg-gradient-to-r from-indigo-50/90 via-purple-50/70 to-pink-50/70 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border-indigo-200/80 dark:border-indigo-800/60 transition-all shadow-xs">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Sparkles className="w-5 h-5 text-amber-300" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        Mời Thành Viên Miễn Phí (Không Cần API Key &amp; Không Mất Phí)
                      </h4>
                      <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-emerald-100 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200">
                        100% Miễn phí
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                      Quản trị viên chỉ cần nhập Gmail và chọn vai trò, nhấn <strong>“Mời thành viên”</strong>. Hệ thống sẽ tạo liên kết mời riêng an toàn (hạn 7 ngày). Sau đó bạn có thể bấm <strong>“Mở Gmail”</strong> để gửi thư soạn sẵn, hoặc <strong>“Sao chép liên kết mời”</strong> để gửi qua Zalo / Messenger.
                    </p>
                  </div>
                </div>
              </div>

              {/* Email Invite Form */}
              <form onSubmit={handleSendEmailInvite} className="space-y-3.5 bg-slate-50/70 dark:bg-slate-800/40 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Địa chỉ Gmail của thành viên <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      id="input-canva-invite-email"
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="nhap.email.thanhvien@gmail.com"
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    />
                  </div>

                  {inviteEmail.trim() ? (
                    <div className="mt-2 p-2.5 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-bold text-indigo-700 dark:text-indigo-300 block">
                          Liên kết mời sẽ tạo cho email này:
                        </span>
                        <span className="text-[11px] font-mono text-slate-700 dark:text-slate-300 truncate block">
                          {origin}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          handleCopyInviteLink(origin);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shrink-0 flex items-center gap-1 shadow-2xs cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                        Sao chép link mời
                      </button>
                    </div>
                  ) : (
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-slate-500">
                      <span>Gợi ý test nhanh:</span>
                      <button
                        type="button"
                        onClick={() => setInviteEmail('luongthithanhnhan280883@gmail.com')}
                        className="px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] cursor-pointer"
                      >
                        luongthithanhnhan280883@gmail.com
                      </button>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Chọn vai trò trong nhóm
                    </label>
                    <select
                      id="select-canva-invite-role"
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value)}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    >
                      {ROLE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Người mời (Quản trị viên)
                    </label>
                    <input
                      type="text"
                      readOnly
                      value={currentUser.name}
                      className="w-full px-3 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 select-none cursor-not-allowed"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Lời nhắn kèm theo (tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={inviteMessage}
                    onChange={(e) => setInviteMessage(e.target.value)}
                    placeholder="Ví dụ: Chào bạn, cùng vào làm việc cùng nhóm nhé!"
                    className="w-full px-3 py-2 text-xs rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between gap-3">
                  <span className="text-[11px] text-slate-400">
                    Liên kết mời có thời hạn 7 ngày và xác thực an toàn
                  </span>

                  <button
                    id="btn-send-canva-invite"
                    type="submit"
                    disabled={isSendingInvite || !inviteEmail.trim()}
                    className="px-5 py-2.5 text-xs font-bold rounded-xl text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 shadow-md flex items-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isSendingInvite ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Đang tạo lời mời...</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Mời thành viên</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Last Invite Result Card - Honest Status & Immediate Action Buttons */}
              {lastInviteResult && (
                <div className="p-4 rounded-2xl border text-xs space-y-3 bg-emerald-50/90 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200 animate-in fade-in">
                  <div className="flex items-start gap-2.5 font-bold">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-extrabold text-emerald-800 dark:text-emerald-300">
                          {lastInviteResult.statusLabel}
                        </span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-800 text-emerald-900 dark:text-emerald-100 font-semibold">
                          Hạn 7 ngày
                        </span>
                      </div>
                      <p className="font-normal text-[11px] leading-relaxed opacity-90 text-slate-700 dark:text-slate-300">
                        {lastInviteResult.message}
                      </p>
                    </div>
                  </div>

                  {/* Immediate Action Buttons: Mở Gmail, Sao chép liên kết mời, Chia sẻ */}
                  <div className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                    <span className="font-bold text-slate-700 dark:text-slate-300 block text-[11px]">
                      Chọn cách gửi lời mời cho {lastInviteResult.email}:
                    </span>

                    <div className="flex items-center flex-wrap gap-2">
                      {/* Nút 1: Mở Gmail */}
                      {lastInviteResult.gmailWebComposeUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            handleOpenGmail(
                              lastInviteResult.gmailWebComposeUrl!,
                              lastInviteResult.mailtoUrl
                            )
                          }
                          className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold flex items-center gap-1.5 text-xs shadow-xs cursor-pointer transition-all"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>Mở Gmail</span>
                          <ExternalLink className="w-3 h-3 text-white/80" />
                        </button>
                      )}

                      {/* Nút 2: Sao chép liên kết mời */}
                      <button
                        type="button"
                        onClick={() => handleCopyInviteLink(lastInviteResult.inviteUrl)}
                        className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold flex items-center gap-1.5 text-xs shadow-xs cursor-pointer transition-all"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép liên kết mời</span>
                      </button>

                      {/* Nút 3: Chia sẻ (Web Share API) */}
                      <button
                        type="button"
                        onClick={() =>
                          handleShareInviteLink(
                            lastInviteResult.inviteUrl,
                            lastInviteResult.email,
                            lastInviteResult.role
                          )
                        }
                        className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold flex items-center gap-1.5 text-xs cursor-pointer transition-all border border-slate-200 dark:border-slate-700"
                        title="Chia sẻ qua Zalo, Messenger, WhatsApp..."
                      >
                        <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Chia sẻ qua Zalo / Messenger</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Database Invitations Section (DANH SÁCH LỜI MỜI) */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MailCheck className="w-3.5 h-3.5 text-indigo-500" />
                    <span>DANH SÁCH LỜI MỜI ({invitations.length})</span>
                  </h4>

                  <button
                    type="button"
                    onClick={fetchInvitations}
                    disabled={isLoadingInvitations}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvitations ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {invitations.length === 0 ? (
                  <div className="p-6 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs">
                    Chưa có lời mời nào trong danh sách. Hãy nhập email ở trên để gửi lời mời đầu tiên.
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                    {invitations.map((inv) => {
                      const isCurrentUserAccount =
                        currentUser &&
                        currentUser.email &&
                        inv.email.toLowerCase() === currentUser.email.toLowerCase();
                      const isJoined =
                        inv.status === 'joined' ||
                        inv.status === 'accepted' ||
                        isCurrentUserAccount;
                      const joinLink = getJoinUrlForEmail(inv.email);

                      return (
                        <div
                          key={inv.id}
                          className="p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {inv.email}
                              </span>
                              {inv.recipientName && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  ({inv.recipientName})
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                  isJoined
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {isJoined ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Đã tham gia</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                                    <span>Đã tạo lời mời</span>
                                  </>
                                )}
                              </span>

                              {isCurrentUserAccount && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                                  (Bạn đang dùng)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              <span>Vai trò: <strong className="text-indigo-600 dark:text-indigo-400">{inv.role || 'Thành viên'}</strong></span>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 truncate max-w-xs">
                                {getAppBaseUrl()}
                              </span>
                              <span>•</span>
                              <span>{new Date(inv.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                          </div>

                          {/* Action Buttons: Sao chép link mời, Gửi lại, Chia sẻ, Xóa */}
                          <div className="flex items-center flex-wrap gap-2 shrink-0">
                            {/* Nút 1: Sao chép link mời */}
                            <button
                              type="button"
                              onClick={() => handleCopySingleInviteLink(inv.email, inv.id)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              title="Sao chép link mời (link app gốc, người nhận bấm vào sẽ tự nhập Gmail)"
                            >
                              {copiedInviteId === inv.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">Đã chép link!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Sao chép link mời</span>
                                </>
                              )}
                            </button>

                            {/* Nút 2: Gửi lại */}
                            <button
                              type="button"
                              onClick={() => handleResendInvite(inv)}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border border-indigo-200 dark:border-indigo-800/60"
                              title={`Làm mới và mở Gmail gửi lại lời mời đến ${inv.email}`}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Gửi lại</span>
                            </button>

                            {/* Nút 3: Chia sẻ */}
                            <button
                              type="button"
                              onClick={() => handleShareInviteLink(getAppBaseUrl(), inv.email, inv.role)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border border-slate-200 dark:border-slate-700"
                              title="Chia sẻ link qua Zalo, Messenger..."
                            >
                              <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Chia sẻ</span>
                            </button>

                            {/* Nút 4: Xóa khỏi danh sách */}
                            <button
                              type="button"
                              onClick={() => handleDeleteInvite(inv)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border border-rose-200 dark:border-rose-900/50"
                              title={`Xóa email ${inv.email} khỏi danh sách lời mời`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 0.5: QUẢN LÝ LỜI MỜI (DEDICATED FULL VIEW) */}
          {activeSubTab === 'manage_invites' && (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/30 dark:to-pink-950/20 border border-indigo-100 dark:border-indigo-900/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <MailCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                      Quản Lý Lời Mời Nhóm
                    </h4>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300">
                      Mỗi lời mời có đường link định dạng: <code className="font-mono text-indigo-600 font-bold">[URL]?join=[email]</code>.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('email')}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>+ Gửi Lời Mời Mới</span>
                </button>
              </div>

              {/* Statistics Row */}
              <div className="grid grid-cols-3 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Tổng lời mời</span>
                  <span className="text-lg font-extrabold text-slate-900 dark:text-white">{invitations.length}</span>
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-center">
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider block">Đã tham gia</span>
                  <span className="text-lg font-extrabold text-emerald-700 dark:text-emerald-300">
                    {invitations.filter((i) => i.status === 'joined' || i.status === 'accepted' || (currentUser && currentUser.email && i.email.toLowerCase() === currentUser.email.toLowerCase())).length}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-center">
                  <span className="text-[10px] font-bold text-amber-700 dark:text-amber-300 uppercase tracking-wider block">Đang chờ</span>
                  <span className="text-lg font-extrabold text-amber-700 dark:text-amber-300">
                    {invitations.filter((i) => !(i.status === 'joined' || i.status === 'accepted' || (currentUser && currentUser.email && i.email.toLowerCase() === currentUser.email.toLowerCase()))).length}
                  </span>
                </div>
              </div>

              {/* DANH SÁCH LỜI MỜI Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>DANH SÁCH LỜI MỜI ({invitations.length})</span>
                  </h4>
                  <button
                    type="button"
                    onClick={fetchInvitations}
                    disabled={isLoadingInvitations}
                    className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                    title="Làm mới danh sách"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoadingInvitations ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {invitations.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-400 text-xs space-y-2">
                    <p>Chưa có lời mời nào trong danh sách.</p>
                    <button
                      type="button"
                      onClick={() => setActiveSubTab('email')}
                      className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold text-xs"
                    >
                      Bấm vào đây để gửi lời mời qua email
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs">
                    {invitations.map((inv) => {
                      const isCurrentUserAccount =
                        currentUser &&
                        currentUser.email &&
                        inv.email.toLowerCase() === currentUser.email.toLowerCase();
                      const isJoined =
                        inv.status === 'joined' ||
                        inv.status === 'accepted' ||
                        isCurrentUserAccount;
                      const joinLink = getJoinUrlForEmail(inv.email);

                      return (
                        <div
                          key={inv.id}
                          className="p-3 sm:p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {inv.email}
                              </span>
                              {inv.recipientName && (
                                <span className="text-xs text-slate-500 dark:text-slate-400">
                                  ({inv.recipientName})
                                </span>
                              )}
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1 ${
                                  isJoined
                                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                                }`}
                              >
                                {isJoined ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                                    <span>Đã tham gia</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                    <span>Đang chờ (pending)</span>
                                  </>
                                )}
                              </span>
                              {isCurrentUserAccount && (
                                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                                  (Bạn đang dùng)
                                </span>
                              )}
                            </div>

                            <div className="flex items-center flex-wrap gap-2 text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                              <span>Vai trò: <strong className="text-indigo-600 dark:text-indigo-400">{inv.role || 'Thành viên'}</strong></span>
                              <span>•</span>
                              <span className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400">
                                {getAppBaseUrl()}
                              </span>
                              <span>•</span>
                              <span>{new Date(inv.createdAt).toLocaleString('vi-VN')}</span>
                            </div>
                          </div>

                          {/* Action Buttons: Sao chép link mời, Gửi lại, Chia sẻ, Xóa */}
                          <div className="flex items-center flex-wrap gap-2 shrink-0">
                            {/* Nút 1: Sao chép link mời */}
                            <button
                              type="button"
                              onClick={() => handleCopySingleInviteLink(inv.email, inv.id)}
                              className="px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                              title="Sao chép link mời (link app gốc, người nhận bấm vào sẽ tự nhập Gmail)"
                            >
                              {copiedInviteId === inv.id ? (
                                <>
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                  <span className="text-emerald-600">Đã chép link!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                                  <span>Sao chép link mời</span>
                                </>
                              )}
                            </button>

                            {/* Nút 2: Gửi lại */}
                            <button
                              type="button"
                              onClick={() => handleResendInvite(inv)}
                              className="px-2.5 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-600 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border border-indigo-200 dark:border-indigo-800/60"
                              title={`Làm mới và mở Gmail gửi lại lời mời đến ${inv.email}`}
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Gửi lại</span>
                            </button>

                            {/* Nút 3: Chia sẻ */}
                            <button
                              type="button"
                              onClick={() => handleShareInviteLink(getAppBaseUrl(), inv.email, inv.role)}
                              className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border border-slate-200 dark:border-slate-700"
                              title="Chia sẻ qua Zalo, Messenger..."
                            >
                              <Share2 className="w-3.5 h-3.5 text-indigo-500" />
                              <span>Chia sẻ</span>
                            </button>

                            {/* Nút 4: Xóa khỏi danh sách */}
                            <button
                              type="button"
                              onClick={() => handleDeleteInvite(inv)}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-600 hover:text-white text-rose-600 dark:text-rose-400 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border border-rose-200 dark:border-rose-900/50"
                              title={`Xóa email ${inv.email} khỏi danh sách lời mời`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Xóa</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
          {/* TAB 1: FORM THÊM TRỰC TIẾP */}
          {activeSubTab === 'form' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Họ và tên thành viên <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="input-member-name"
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn An, Trần Thùy Linh..."
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                    <Mail className="w-3 h-3 text-slate-400" />
                    Email / Tài khoản sinh viên
                  </label>
                  <input
                    id="input-member-email"
                    type="email"
                    placeholder="name@student.edu.vn hoặc gmail"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Vai trò / Phụ trách chính
                  </label>
                  <select
                    id="select-member-role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  >
                    {ROLE_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Ghi chú trạng thái / Kỹ năng
                  </label>
                  <input
                    id="input-member-status"
                    type="text"
                    placeholder="Ví dụ: Phụ trách slide 3-6, dợt thuyết trình"
                    value={statusText}
                    onChange={(e) => setStatusText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              {/* Avatar Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Chọn ảnh đại diện Avatar
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
                  {PRESET_AVATARS.map((av, idx) => {
                    const isSelected = selectedAvatar === av && !customAvatarUrl;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedAvatar(av);
                          setCustomAvatarUrl('');
                        }}
                        className={`relative rounded-full p-0.5 transition-transform hover:scale-105 shrink-0 ${
                          isSelected
                            ? 'ring-3 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img
                          src={av}
                          alt="avatar"
                          className="w-10 h-10 rounded-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                        {isSelected && (
                          <span className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Đóng
                </button>
                <button
                  id="btn-submit-add-member"
                  type="submit"
                  className={`px-5 py-2 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-xs ${theme.primary}`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  Xác Nhận Thêm Thành Viên
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LINK MỜI NHÓM */}
          {activeSubTab === 'link' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                  <Share2 className="w-4 h-4 text-indigo-500" />
                  <span>Liên kết mời tham gia dự án (Link chuẩn, không cần đuôi)</span>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Chỉ cần sao chép liên kết ứng dụng bên dưới. Bất kỳ ai mở link sẽ tự động thấy cửa sổ <strong>“Nhập Gmail của bạn để tham gia dự án”</strong> và được thêm vào nhóm ngay sau khi nhập Gmail.
                </p>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={inviteLink}
                    className="flex-1 px-3 py-2 text-xs font-mono rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 select-all"
                  />
                  <button
                    id="btn-copy-invite-link"
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shrink-0 cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : `${theme.primary}`
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Đã sao chép!
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        Sao chép link mời
                      </>
                    )}
                  </button>
                </div>
              </div>

              {invitations.length > 0 && (
                <div className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2 bg-white dark:bg-slate-900">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Danh sách email đã mời:
                  </p>
                  <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                    {invitations.map((inv) => {
                      const isJoined =
                        inv.status === 'joined' ||
                        inv.status === 'accepted' ||
                        (currentUser && currentUser.email && inv.email.toLowerCase() === currentUser.email.toLowerCase());
                      return (
                        <div
                          key={inv.id}
                          className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-xs gap-2"
                        >
                          <div className="min-w-0">
                            <span className="font-mono text-[11px] font-bold block truncate">{inv.email}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1">
                              Trạng thái:
                              <strong className={isJoined ? 'text-emerald-600' : 'text-amber-600'}>
                                {isJoined ? 'Đã tham gia' : 'Đang chờ (pending)'}
                              </strong>
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleCopySingleInviteLink(inv.email, inv.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-2xs"
                            title="Sao chép link mời tham gia"
                          >
                            <Copy className="w-3 h-3" />
                            <span>{copiedInviteId === inv.id ? 'Đã copy' : 'Sao chép link mời'}</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: GỢI Ý BẠN HỌC */}
          {activeSubTab === 'suggestions' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Thêm nhanh các bạn học/cộng tác viên quen thuộc với 1 cú nhấp chuột:
              </p>

              <div className="space-y-2.5">
                {SUGGESTED_STUDENTS.map((sug, idx) => {
                  const isAlreadyMember = project.members.some(
                    (m) => m.name.toLowerCase() === sug.name.toLowerCase()
                  );
                  return (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={sug.avatar}
                          alt={sug.name}
                          className="w-10 h-10 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                            {sug.name}
                          </p>
                          <p className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 truncate">
                            {sug.role}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{sug.statusText}</p>
                        </div>
                      </div>

                      {isAlreadyMember ? (
                        <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 shrink-0 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40">
                          <Check className="w-3.5 h-3.5" />
                          Đã có trong nhóm
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddSuggested(sug)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 shrink-0 ${theme.bgLight} ${theme.textLight} hover:opacity-90 transition-opacity`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          + Thêm ngay
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 4: DANH SÁCH THÀNH VIÊN HIỆN TẠI */}
          {activeSubTab === 'current' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Tổng cộng {project.members.length} thành viên
                </span>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('form')}
                  className={`text-xs font-bold flex items-center gap-1 ${theme.textLight} hover:underline`}
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  + Thêm người mới
                </button>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {project.members.map((member) => {
                  const isMe = member.id === currentUser.id;
                  return (
                    <div
                      key={member.id}
                      className="py-2.5 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          <img
                            src={member.avatar}
                            alt={member.name}
                            className="w-9 h-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800"
                            referrerPolicy="no-referrer"
                          />
                          <span
                            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-slate-900 ${
                              member.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                            }`}
                          />
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                              {member.name}
                            </h4>
                            {isMe && (
                              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                                Bạn
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-indigo-600 dark:text-indigo-400 truncate">
                            {isProjectCreator(project, member) ? 'Trưởng nhóm / Quản trị viên' : 'Thành viên nhóm'}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate">{member.email}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isProjectCreator(project, member) ? (
                          <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-1 rounded-lg flex items-center gap-1">
                            <Crown className="w-3 h-3 text-amber-500" />
                            Quản trị viên
                          </span>
                        ) : canDeletePermission ? (
                          // Người dùng CÓ quyền xóa thành viên
                          <button
                            id={`btn-remove-member-${member.id}`}
                            type="button"
                            title="Xóa thành viên khỏi nhóm"
                            onClick={() => setMemberToDelete(member)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors flex items-center gap-1 text-xs font-semibold cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-500" />
                            <span className="hidden sm:inline text-red-600 dark:text-red-400">Xóa</span>
                          </button>
                        ) : (
                          // Người dùng KHÔNG có quyền xóa thành viên
                          <span
                            title="Chỉ thành viên có quyền mới được xóa thành viên"
                            className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 px-2 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg cursor-not-allowed"
                          >
                            <Lock className="w-3 h-3" />
                            <span>Chỉ Admin được xóa</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal for Admin Member Removal */}
      {memberToDelete && (
        <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 max-w-sm w-full rounded-2xl border border-red-200 dark:border-red-900/60 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Xác Nhận Xóa Thành Viên
                </h4>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Hành động dành riêng cho Quản trị viên
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn xóa thành viên{' '}
              <strong className="text-slate-900 dark:text-white font-bold">
                "{memberToDelete.name}"
              </strong>{' '}
              khỏi nhóm <strong className="text-indigo-600 dark:text-indigo-400">{project.name}</strong>?
            </p>

            <div className="p-2.5 bg-amber-50 dark:bg-amber-950/40 rounded-xl border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span className="text-base">📲</span>
              <span>
                Thông báo quan trọng sẽ được <strong>trực tiếp gửi về máy</strong> của các thành viên trong nhóm.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setMemberToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
              >
                Hủy Bỏ
              </button>
              <button
                id="btn-confirm-delete-member"
                type="button"
                onClick={() => {
                  onRemoveMember(memberToDelete.id);
                  setMemberToDelete(null);
                  setSuccessNotice(`Đã xóa thành viên "${memberToDelete.name}" khỏi nhóm.`);
                  setTimeout(() => setSuccessNotice(null), 3000);
                }}
                className="px-4 py-1.5 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white shadow-sm flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa Khỏi Nhóm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
