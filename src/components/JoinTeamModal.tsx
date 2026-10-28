import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Mail,
  User,
  ShieldCheck,
  X,
  Clock,
  ExternalLink,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { TeamInvitation, Member } from '../types';
import { ThemeConfig } from '../utils/theme';
import { playNotificationSound } from '../utils/sound';

interface JoinTeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  invitation: TeamInvitation | null;
  onAccept: (
    invitation: TeamInvitation,
    userInfo: { name: string; email: string; avatar: string; role: string }
  ) => Promise<void> | void;
  onDecline?: (invitation: TeamInvitation) => Promise<void> | void;
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
];

export const JoinTeamModal: React.FC<JoinTeamModalProps> = ({
  isOpen,
  onClose,
  invitation,
  onAccept,
  onDecline,
  theme,
  currentUser,
}) => {
  if (!isOpen || !invitation) return null;

  const isAlreadyAccepted = invitation.status === 'accepted';

  const defaultName =
    currentUser.name ||
    invitation.email.split('@')[0].replace(/[._]/g, ' ') ||
    'Thành viên mới';

  const [userName, setUserName] = useState(defaultName);
  const [userEmail, setUserEmail] = useState(invitation.email || currentUser.email);
  const [selectedAvatar, setSelectedAvatar] = useState(
    currentUser.avatar || PRESET_AVATARS[0]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeclining, setIsDeclining] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const handleDecline = async () => {
    if (!onDecline || !invitation) {
      onClose();
      return;
    }
    try {
      setIsDeclining(true);
      await onDecline(invitation);
      onClose();
    } catch (err) {
      console.error('Failed to decline invitation:', err);
    } finally {
      setIsDeclining(false);
    }
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) return;

    try {
      setIsSubmitting(true);

      // Fire celebratory confetti effect (Canva style)
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
      playNotificationSound('success');

      await onAccept(invitation, {
        name: userName.trim(),
        email: userEmail.trim(),
        avatar: selectedAvatar,
        role: invitation.role,
      });

      setIsDone(true);
      setTimeout(() => {
        setIsDone(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error('Failed to accept invitation:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 bg-black/65 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        {/* Canva Style Top Graphic Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 sm:p-7 text-white text-center overflow-hidden">
          {/* Subtle geometric circles */}
          <div className="absolute -top-10 -right-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase mb-3 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Lời Mời Gia Nhập Nhóm (Canva Style)</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {invitation.inviterName} mời bạn tham gia nhóm
          </h2>

          <div className="mt-2 inline-flex items-center gap-2 bg-white/15 px-3.5 py-1 rounded-xl text-sm font-semibold">
            <Users className="w-4 h-4 text-white/90" />
            <span>{invitation.projectName}</span>
            {invitation.projectCategory && (
              <span className="text-xs text-white/80">({invitation.projectCategory})</span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="p-6 sm:p-7 space-y-5">
          {/* Status Alert if Already Accepted */}
          {isAlreadyAccepted && (
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 flex items-start gap-2.5 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold">Lời mời đã được chấp nhận!</strong>
                <span>
                  Lời mời này đã được chấp nhận vào database lúc{' '}
                  {new Date(invitation.acceptedAt || invitation.createdAt).toLocaleString('vi-VN')}.
                  Bạn có thể vào nhóm ngay bây giờ.
                </span>
              </div>
            </div>
          )}

          {/* Invitation Metadata Card */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/60 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Email nhận thư:
              </span>
              <span className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                <Mail className="w-3.5 h-3.5 text-indigo-500" />
                {invitation.email}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Vai trò được đề xuất:
              </span>
              <span className="font-bold px-2.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                {invitation.role}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-500 dark:text-slate-400 font-medium">
                Trạng thái lời mời:
              </span>
              <span
                className={`font-bold px-2 py-0.5 rounded-md text-[11px] flex items-center gap-1 ${
                  invitation.status === 'accepted'
                    ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300'
                }`}
              >
                <Clock className="w-3 h-3" />
                {invitation.status === 'accepted' ? 'Đã chấp nhận (accepted)' : 'Đang chờ (pending)'}
              </span>
            </div>

            {invitation.message && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60 text-xs italic text-slate-600 dark:text-slate-300">
                "{invitation.message}"
              </div>
            )}
          </div>

          {/* User Sign-In / Join Form */}
          <form onSubmit={handleJoin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên của bạn khi làm việc trong nhóm <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  required
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  placeholder="Nhập tên hiển thị của bạn..."
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Email tài khoản của bạn
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  value={userEmail}
                  onChange={(e) => setUserEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* Choose Avatar */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                Chọn hình đại diện Avatar
              </label>
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                {PRESET_AVATARS.map((av, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setSelectedAvatar(av)}
                    className={`relative rounded-full p-0.5 transition-transform shrink-0 ${
                      selectedAvatar === av
                        ? 'ring-3 ring-indigo-500 ring-offset-2 dark:ring-offset-slate-900 scale-105'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img
                      src={av}
                      alt="avatar"
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Action Buttons: Chấp nhận tham gia & Từ chối */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-2.5">
              <button
                id="btn-decline-join-team"
                type="button"
                onClick={handleDecline}
                disabled={isDeclining || isSubmitting || isDone}
                className="w-full sm:w-auto px-4 py-2.5 text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5 order-2 sm:order-1 disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
                <span>{isDeclining ? 'Đang từ chối...' : 'Từ chối lời mời'}</span>
              </button>

              <div className="flex items-center gap-2 w-full sm:w-auto justify-end order-1 sm:order-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                >
                  Để sau
                </button>

                <button
                  id="btn-confirm-join-team"
                  type="submit"
                  disabled={isSubmitting || isDone || isDeclining}
                  className="flex-1 sm:flex-initial py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isDone ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-white" />
                      <span>Đã gia nhập nhóm thành công!</span>
                    </>
                  ) : isSubmitting ? (
                    <span>Đang kết nối vào dự án...</span>
                  ) : (
                    <>
                      <span>Chấp Nhận Tham Gia Dự Án</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
