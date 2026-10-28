import React, { useState } from 'react';
import {
  Users,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Mail,
  User,
  Crown,
  X,
  ShieldCheck,
} from 'lucide-react';
import { Member, TeamInvitation } from '../types';
import { formatNameFromEmail } from '../utils/user';

interface JoinByGmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJoin: (email: string, name?: string) => Promise<void> | void;
  projectName: string;
  projectCategory?: string;
  pendingInvitations?: TeamInvitation[];
}

export const JoinByGmailModal: React.FC<JoinByGmailModalProps> = ({
  isOpen,
  onClose,
  onJoin,
  projectName,
  projectCategory,
  pendingInvitations = [],
}) => {
  const [emailInput, setEmailInput] = useState('');
  const [nameInput, setNameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanEmail = emailInput.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail của bạn');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Địa chỉ email không đúng định dạng (ví dụ: yourname@gmail.com)');
      return;
    }

    try {
      setIsSubmitting(true);
      await onJoin(cleanEmail, nameInput.trim() || undefined);
    } catch (err: any) {
      console.error('Error joining project with Gmail:', err);
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi tham gia dự án, vui lòng thử lại.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter pending invitations to show quick suggestions
  const quickSuggestions = pendingInvitations
    .filter((inv) => inv.email && inv.status !== 'joined')
    .slice(0, 3);

  return (
    <div className="fixed inset-0 z-70 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200">
        {/* Header Banner */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white text-center overflow-hidden">
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase mb-2.5 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Không Gian Làm Việc Nhóm</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            Nhập Gmail của bạn để tham gia dự án
          </h2>

          <div className="mt-2.5 inline-flex items-center gap-2 bg-white/15 px-3.5 py-1 rounded-xl text-xs font-semibold max-w-full">
            <Users className="w-3.5 h-3.5 text-white/90 shrink-0" />
            <span className="truncate">{projectName}</span>
            {projectCategory && (
              <span className="text-[10px] text-white/80 shrink-0">({projectCategory})</span>
            )}
          </div>
        </div>

        {/* Modal Form Content */}
        <div className="p-6 space-y-4">
          <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed text-center">
            Chào mừng bạn đến với dự án! Nhập địa chỉ Gmail để tự động xác thực danh tính, cập nhật trạng thái trong nhóm và bắt đầu làm việc.
          </p>

          {/* Quick email suggestion chip if available */}
          {quickSuggestions.length > 0 && (
            <div className="p-3 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 space-y-1.5">
              <span className="text-[11px] font-bold text-indigo-800 dark:text-indigo-300 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                <span>Gợi ý nhanh từ lời mời của nhóm:</span>
              </span>
              <div className="flex flex-wrap gap-1.5">
                {quickSuggestions.map((inv) => (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => {
                      setEmailInput(inv.email);
                      if (inv.recipientName) setNameInput(inv.recipientName);
                      else setNameInput(formatNameFromEmail(inv.email));
                    }}
                    className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-800 border border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 text-indigo-700 dark:text-indigo-300 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                  >
                    <Mail className="w-3 h-3 text-indigo-500" />
                    <span>{inv.email}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Địa chỉ Gmail của bạn <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  autoFocus
                  placeholder="Nhập địa chỉ Gmail của bạn..."
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Họ và tên của bạn (Tùy chọn)
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder={
                    emailInput.trim()
                      ? formatNameFromEmail(emailInput.trim())
                      : 'Nhập họ và tên...'
                  }
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Nếu để trống, hệ thống sẽ tự động lấy tên đẹp từ Gmail của bạn.
              </span>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isSubmitting || !emailInput.trim()}
                className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Đang kết nối vào nhóm...</span>
                ) : (
                  <>
                    <span>Tham gia</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
