import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  Mail,
  Shield,
  Crown,
  Lock,
  Camera,
  Check,
  Save,
  Sparkles,
  Info,
} from 'lucide-react';
import { Member } from '../types';
import { ThemeConfig } from '../utils/theme';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: Member;
  onUpdateProfile: (updated: Member) => void;
  theme: ThemeConfig;
  isAdmin?: boolean;
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

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  theme,
  isAdmin = false,
}) => {
  const [name, setName] = useState(currentUser.name || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || PRESET_AVATARS[0]);
  const [statusText, setStatusText] = useState(currentUser.statusText || '');
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentUser) {
      setName(currentUser.name || '');
      setAvatar(currentUser.avatar || PRESET_AVATARS[0]);
      setStatusText(currentUser.statusText || '');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen, currentUser]);

  if (!isOpen || !currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const cleanName = name.trim();
    if (!cleanName || cleanName.length < 2) {
      setErrorMessage('Họ và tên phải có ít nhất 2 ký tự.');
      return;
    }

    const finalAvatar = customAvatarUrl.trim() || avatar;

    try {
      setIsSaving(true);

      // Call backend API to update in database
      const res = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterId: currentUser.id,
          targetUserId: currentUser.id,
          name: cleanName,
          avatar: finalAvatar,
          statusText: statusText.trim(),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.success) {
        throw new Error(data?.error || 'Không thể lưu thông tin hồ sơ.');
      }

      const updatedUser: Member = {
        ...currentUser,
        name: cleanName,
        avatar: finalAvatar,
        statusText: statusText.trim(),
      };

      onUpdateProfile(updatedUser);
      setSuccessMessage('Đã cập nhật hồ sơ cá nhân thành công!');

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      setErrorMessage(err?.message || 'Có lỗi xảy ra khi cập nhật hồ sơ.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-70 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-extrabold tracking-tight">Hồ Sơ Của Tôi</h3>
              <p className="text-[11px] text-white/80">
                Chỉnh sửa thông tin tài khoản cá nhân của bạn
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-1.5">
              <Check className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Account Identity Card (Fixed & Guaranteed) */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                <span>Tài khoản Gmail đăng nhập</span>
              </div>
              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                <Lock className="w-2.5 h-2.5" />
                Cố định
              </span>
            </div>
            <div className="font-mono text-xs font-semibold text-slate-900 dark:text-white px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 truncate select-all">
              {currentUser.email}
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
              <span className="flex items-center gap-1">
                <Info className="w-3 h-3 text-indigo-500" />
                Mã tài khoản ID:
              </span>
              <span className="font-mono text-[10px] text-slate-600 dark:text-slate-300">{currentUser.id}</span>
            </div>
          </div>

          {/* Role badge */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
              {isAdmin ? (
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              ) : (
                <Shield className="w-3.5 h-3.5 text-indigo-500" />
              )}
              Vai trò trong nhóm:
            </span>
            <span
              className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                isAdmin
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                  : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {isAdmin ? 'Trưởng nhóm / Quản trị viên' : 'Thành viên nhóm'}
            </span>
          </div>

          {/* Name Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Họ và tên hiển thị <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nhập họ và tên của bạn..."
                className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Avatar Selector */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center justify-between">
              <span>Ảnh đại diện Avatar</span>
              <span className="text-[10px] text-slate-400 font-normal">Chọn ảnh bạn thích</span>
            </label>
            <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-none">
              {PRESET_AVATARS.map((av, idx) => {
                const isSelected = (avatar === av && !customAvatarUrl.trim());
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setAvatar(av);
                      setCustomAvatarUrl('');
                    }}
                    className={`relative rounded-full p-0.5 transition-all shrink-0 cursor-pointer ${
                      isSelected
                        ? 'ring-3 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105'
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
                      <span className="absolute -top-1 -right-1 bg-indigo-600 text-white rounded-full p-0.5 shadow-xs">
                        <Check className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="mt-2">
              <input
                type="url"
                placeholder="Hoặc dán URL ảnh đại diện tùy chọn (https://...)"
                value={customAvatarUrl}
                onChange={(e) => setCustomAvatarUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              />
            </div>
          </div>

          {/* Status / Bio note */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Ghi chú trạng thái / Kỹ năng chuyên môn
            </label>
            <input
              type="text"
              value={statusText}
              onChange={(e) => setStatusText(e.target.value)}
              placeholder="Ví dụ: Phụ trách slide thuyết trình, tổng hợp tài liệu..."
              className="w-full px-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving || !name.trim()}
              className={`px-5 py-2 text-xs font-bold rounded-xl text-white flex items-center gap-1.5 shadow-sm transition-all cursor-pointer ${theme.primary} disabled:opacity-50`}
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Đang lưu...' : 'Lưu Hồ Sơ'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
