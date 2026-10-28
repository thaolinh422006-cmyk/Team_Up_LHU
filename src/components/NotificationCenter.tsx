import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  Check,
  Send,
  Smartphone,
  ShieldAlert,
  UserMinus,
  UserPlus,
  Clock,
  Sparkles,
  CheckCheck,
  AlertCircle,
  X,
  Lock,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { AppNotification, Member, Project, TeamInvitation } from '../types';
import { ThemeConfig } from '../utils/theme';
import {
  getDeviceNotificationPermission,
  requestDeviceNotificationPermission,
  sendDeviceNotification,
  NotificationPermissionStatus,
} from '../utils/notificationService';

interface NotificationCenterProps {
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onClearNotifications: () => void;
  onSendBroadcastNotification: (title: string, body: string) => void;
  theme: ThemeConfig;
  currentUser: Member;
  activeProject: Project;
  isAdmin: boolean;
  pendingInvitations?: TeamInvitation[];
  onAcceptInvitation?: (invitation: TeamInvitation) => void;
  onDeclineInvitation?: (invitation: TeamInvitation) => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onMarkAllAsRead,
  onClearNotifications,
  onSendBroadcastNotification,
  theme,
  currentUser,
  activeProject,
  isAdmin,
  pendingInvitations = [],
  onAcceptInvitation,
  onDeclineInvitation,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [permission, setPermission] = useState<NotificationPermissionStatus>('default');
  const [isBroadcastModalOpen, setIsBroadcastModalOpen] = useState(false);
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastBody, setBroadcastBody] = useState('');
  const [justTested, setJustTested] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updatePerm = () => {
      setPermission(getDeviceNotificationPermission());
    };
    updatePerm();
    window.addEventListener('focus', updatePerm);
    document.addEventListener('visibilitychange', updatePerm);
    return () => {
      window.removeEventListener('focus', updatePerm);
      document.removeEventListener('visibilitychange', updatePerm);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length + pendingInvitations.length;

  // Gọi trực tiếp Notification.requestPermission() của trình duyệt để xin quyền thật
  const handleRequestPermission = async () => {
    if (typeof window === 'undefined') return;

    if (!('Notification' in window)) {
      setPermission('unsupported');
      return;
    }

    try {
      let res: NotificationPermission = Notification.permission;
      if (res !== 'denied') {
        try {
          const req = Notification.requestPermission();
          if (req && typeof req.then === 'function') {
            res = await req;
          } else {
            res = await new Promise((resolve) => {
              try {
                Notification.requestPermission(resolve);
              } catch {
                resolve(Notification.permission);
              }
            });
          }
        } catch (pErr) {
          console.warn('requestPermission call warning:', pErr);
          res = await new Promise((resolve) => {
            try {
              Notification.requestPermission(resolve);
            } catch {
              resolve(Notification.permission);
            }
          });
        }
      }

      const currentStatus = (Notification.permission || res) as NotificationPermissionStatus;
      setPermission(currentStatus);

      if (currentStatus === 'granted') {
        sendDeviceNotification({
          title: '🔔 TEAM UP: Đã kích hoạt thông báo!',
          body: 'Thông báo quan trọng từ nhóm sẽ được gửi trực tiếp về máy tính và điện thoại của bạn.',
          type: 'success',
        });
        try {
          confetti({ particleCount: 60, spread: 60, origin: { y: 0.6 } });
        } catch {}
      }
    } catch (err) {
      console.error('Lỗi khi xin quyền thông báo:', err);
      setPermission((Notification.permission as NotificationPermissionStatus) || 'denied');
    }
  };

  // Kiểm tra ngay quyền thông báo sau khi người dùng mở khóa ở icon ổ khóa
  const checkPermissionNow = () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      const current = Notification.permission as NotificationPermissionStatus;
      setPermission(current);
      if (current === 'granted') {
        sendDeviceNotification({
          title: '🔔 TEAM UP: Đã kích hoạt thông báo!',
          body: 'Quyền thông báo máy tính đã được mở khóa thành công.',
          type: 'success',
        });
        try {
          confetti({ particleCount: 50, spread: 60, origin: { y: 0.6 } });
        } catch {}
      } else {
        handleRequestPermission();
      }
    }
  };

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleTestNotification = () => {
    setJustTested(true);
    sendDeviceNotification({
      title: '⚡ Thử nghiệm gửi thông báo về máy',
      body: `Hệ thống thông báo tức thời của nhóm "${activeProject.name}" đang hoạt động ổn định trên máy bạn!`,
      type: 'urgent',
    });
    setTimeout(() => setJustTested(false), 3000);
  };

  const handleBroadcastSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle.trim() || !broadcastBody.trim()) return;

    onSendBroadcastNotification(broadcastTitle.trim(), broadcastBody.trim());
    setBroadcastTitle('');
    setBroadcastBody('');
    setIsBroadcastModalOpen(false);
  };

  const getNotificationIcon = (type: AppNotification['type']) => {
    switch (type) {
      case 'urgent':
        return <ShieldAlert className="w-4 h-4 text-red-500 shrink-0" />;
      case 'member_remove':
        return <UserMinus className="w-4 h-4 text-amber-500 shrink-0" />;
      case 'member_add':
        return <UserPlus className="w-4 h-4 text-indigo-500 shrink-0" />;
      case 'deadline':
        return <Clock className="w-4 h-4 text-amber-500 shrink-0" />;
      default:
        return <Bell className="w-4 h-4 text-indigo-500 shrink-0" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Trigger Button */}
      <button
        id="btn-notification-bell"
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        title="Thông báo quan trọng gửi về máy các thành viên"
        className="relative p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-50 animate-in fade-in zoom-in-95">
          {/* Header */}
          <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Bell className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  Thông Báo Trực Tiếp
                  {unreadCount > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400">
                      {unreadCount} mới
                    </span>
                  )}
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Tự động gửi về máy các thành viên
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={onMarkAllAsRead}
                  title="Đánh dấu tất cả đã đọc"
                  className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-[10px] flex items-center gap-0.5"
                >
                  <CheckCheck className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Device Push Status Banner */}
          <div className="px-3.5 py-2.5 bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/40 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Smartphone
                className={`w-4 h-4 shrink-0 ${
                  permission === 'granted'
                    ? 'text-emerald-600 dark:text-emerald-400'
                    : permission === 'denied'
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-indigo-600 dark:text-indigo-400'
                }`}
              />
              <div className="text-[11px] min-w-0">
                <span
                  className={`font-bold block truncate ${
                    permission === 'granted'
                      ? 'text-emerald-950 dark:text-emerald-200'
                      : permission === 'denied'
                      ? 'text-amber-950 dark:text-amber-200'
                      : 'text-indigo-950 dark:text-indigo-200'
                  }`}
                >
                  {permission === 'granted'
                    ? 'Đã bật thông báo về máy 📲'
                    : permission === 'denied'
                    ? 'Thông báo máy tính bị chặn'
                    : 'Nhận thông báo quan trọng về máy'}
                </span>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 block truncate">
                  {permission === 'granted'
                    ? 'Mỗi khi có việc gấp hoặc tin nhắn'
                    : permission === 'denied'
                    ? 'Mở khóa ổ khóa 🔒 trên thanh URL để bật'
                    : 'Cần cấp quyền trình duyệt'}
                </span>
              </div>
            </div>

            {permission === 'granted' ? (
              <button
                id="btn-notifications-enabled"
                type="button"
                onClick={handleTestNotification}
                title="Nhấp để kiểm tra thử thông báo trên máy tính"
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1 shrink-0 shadow-xs cursor-pointer transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{justTested ? 'Đã thử!' : 'Đã bật'}</span>
              </button>
            ) : (
              <button
                id="btn-enable-device-notifications"
                type="button"
                onClick={handleRequestPermission}
                title="Nhấp để yêu cầu trình duyệt cấp quyền thông báo"
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shrink-0 shadow-xs flex items-center gap-1 transition-all cursor-pointer ${
                  permission === 'denied'
                    ? 'bg-amber-600 hover:bg-amber-700'
                    : 'bg-indigo-600 hover:bg-indigo-700'
                }`}
              >
                {permission === 'denied' ? (
                  <>
                    <Lock className="w-3 h-3" />
                    <span>Bật Thông Báo</span>
                  </>
                ) : (
                  <>
                    <Bell className="w-3 h-3" />
                    <span>Bật Thông Báo</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Hướng dẫn mở khóa icon ổ khóa trên thanh địa chỉ khi quyền bị chặn */}
          {permission === 'denied' && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 text-xs animate-in fade-in">
              <div className="flex items-start gap-2">
                <div className="w-6 h-6 rounded-md bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                  <Lock className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-amber-900 dark:text-amber-200 text-[11px] flex items-center gap-1">
                    <span>Hướng dẫn mở khóa icon ổ khóa 🔒:</span>
                  </div>
                  <ol className="mt-1 space-y-1 text-[11px] text-amber-900 dark:text-amber-300 list-decimal list-inside leading-snug">
                    <li>
                      Bấm vào biểu tượng <strong>ổ khóa 🔒</strong> (hoặc Cài đặt trang) ở bên trái thanh địa chỉ URL.
                    </li>
                    <li>
                      Tìm mục <strong>Thông báo (Notifications)</strong> và chuyển từ <strong>Chặn</strong> sang <strong>Cho phép (Allow)</strong>.
                    </li>
                    <li>
                      Nhấn nút <strong>Kiểm tra lại quyền</strong> bên dưới hoặc tải lại trang (F5).
                    </li>
                  </ol>

                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={checkPermissionNow}
                      className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-xs cursor-pointer transition-all"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Kiểm tra lại quyền
                    </button>
                    {typeof window !== 'undefined' && window.self !== window.top && (
                      <button
                        type="button"
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="px-2 py-1 rounded-md text-[10px] font-bold bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 hover:bg-amber-100/50 flex items-center gap-1 cursor-pointer transition-all"
                        title="Mở ứng dụng trên tab riêng để hiển thị hộp thoại cấp quyền trình duyệt"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Mở tab mới
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Admin Urgent Broadcast Action (Quản trị viên phát thông báo khẩn về máy) */}
          {isAdmin && (
            <div className="p-2.5 bg-amber-50/60 dark:bg-amber-950/20 border-b border-amber-200/50 dark:border-amber-800/40 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs text-amber-800 dark:text-amber-200">
                <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
                <span className="font-bold text-[11px]">Quyền Quản Trị Viên:</span>
              </div>
              <button
                id="btn-admin-broadcast-urgent"
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setIsBroadcastModalOpen(true);
                }}
                className="px-2.5 py-1 rounded-lg text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-1 shadow-xs"
              >
                <Send className="w-3 h-3" />
                Phát Thông Báo Khẩn
              </button>
            </div>
          )}

          {/* Pending Invitations list for current user */}
          {pendingInvitations && pendingInvitations.length > 0 && (
            <div className="p-3 bg-amber-50/90 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-900/60 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-extrabold uppercase text-amber-800 dark:text-amber-300 flex items-center gap-1.5 tracking-wide">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Lời Mời Tham Gia Nhóm ({pendingInvitations.length})
                </span>
                <span className="text-[10px] text-amber-700 dark:text-amber-300 font-bold px-1.5 py-0.2 rounded-full bg-amber-200/60 dark:bg-amber-900/60">
                  Chờ bạn duyệt
                </span>
              </div>

              {pendingInvitations.map((inv) => (
                <div
                  key={inv.id}
                  className="p-3 rounded-xl bg-white dark:bg-slate-800 border border-amber-200/80 dark:border-amber-800/60 shadow-xs space-y-2"
                >
                  <div>
                    <h4 className="text-xs font-black text-slate-900 dark:text-white truncate">
                      👥 {inv.projectName}
                    </h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                      Từ: <strong className="text-slate-700 dark:text-slate-200">{inv.inviterName}</strong> • Vai trò: <span className="font-bold text-indigo-600 dark:text-indigo-400">{inv.role}</span>
                    </p>
                    {inv.message && (
                      <p className="text-[11px] italic text-slate-600 dark:text-slate-300 mt-1 bg-slate-50 dark:bg-slate-700/50 p-1.5 rounded-lg border border-slate-100 dark:border-slate-700/60">
                        "{inv.message}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 justify-end pt-1.5 border-t border-slate-100 dark:border-slate-700/50">
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        if (onDeclineInvitation) onDeclineInvitation(inv);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-colors cursor-pointer"
                    >
                      Từ chối
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsOpen(false);
                        if (onAcceptInvitation) onAcceptInvitation(inv);
                      }}
                      className="px-3 py-1 text-[11px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-3 h-3" />
                      <span>Chấp nhận & Vào nhóm</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Notification List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-slate-400 text-xs">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Chưa có thông báo nào
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`p-3 transition-colors flex items-start gap-2.5 ${
                    notif.read
                      ? 'hover:bg-slate-50 dark:hover:bg-slate-800/40 bg-white dark:bg-slate-900'
                      : 'bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/50'
                  }`}
                >
                  <div className="mt-0.5">{getNotificationIcon(notif.type)}</div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                        {notif.title}
                      </h4>
                      <span className="text-[10px] text-slate-400 shrink-0">
                        {notif.timestamp}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-2 leading-relaxed">
                      {notif.body}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-400">
                      {notif.projectName && (
                        <span className="truncate">Nhóm: {notif.projectName}</span>
                      )}
                      {notif.sentToDevice && (
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-0.5">
                          📲 Đã gửi về máy
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between text-[11px]">
              <span className="text-slate-400 text-[10px]">
                {notifications.length} thông báo trong lịch sử
              </span>
              <button
                type="button"
                onClick={onClearNotifications}
                className="text-slate-500 hover:text-red-500 font-medium"
              >
                Xóa tất cả
              </button>
            </div>
          )}
        </div>
      )}

      {/* Broadcast Urgent Modal (Admin Only) */}
      {isBroadcastModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Phát Thông Báo Khẩn Cấp Về Máy
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Gửi trực tiếp đến màn hình máy tính & điện thoại tất cả thành viên
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBroadcastModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBroadcastSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tiêu đề thông báo khẩn <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: 🚨 Họp gấp 15 phút dợt lại slide thuyết trình"
                  value={broadcastTitle}
                  onChange={(e) => setBroadcastTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Nội dung chi tiết thông báo gửi về máy <span className="text-red-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Ví dụ: Các bạn vào ngay phòng Voice Room của nhóm để chốt kịch bản nói và kiểm tra bài trước giờ nộp nhé!"
                  value={broadcastBody}
                  onChange={(e) => setBroadcastBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500/50"
                />
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/40 text-[11px] text-amber-800 dark:text-amber-300 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  Thông báo này sẽ kèm chuông báo động và hiển thị dưới dạng thông báo đẩy Desktop/Mobile đến tất cả máy của các thành viên trong nhóm.
                </span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsBroadcastModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Đóng
                </button>
                <button
                  id="btn-confirm-send-broadcast"
                  type="submit"
                  className="px-4 py-2 text-xs font-bold rounded-xl bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" />
                  Gửi Thông Báo Ngay
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
