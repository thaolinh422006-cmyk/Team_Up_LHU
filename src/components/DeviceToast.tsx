import React, { useEffect, useState } from 'react';
import { Bell, X, ShieldAlert, UserMinus, UserPlus, CheckCircle2, Clock } from 'lucide-react';
import { AppNotification } from '../types';

interface DeviceToastProps {
  notification: AppNotification | null;
  onClose: () => void;
}

export const DeviceToast: React.FC<DeviceToastProps> = ({ notification, onClose }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (notification) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(onClose, 300);
      }, 6000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [notification, onClose]);

  if (!notification || !visible) return null;

  const getIcon = () => {
    switch (notification.type) {
      case 'urgent':
        return <ShieldAlert className="w-5 h-5 text-red-500 animate-bounce" />;
      case 'member_remove':
        return <UserMinus className="w-5 h-5 text-amber-500" />;
      case 'member_add':
        return <UserPlus className="w-5 h-5 text-indigo-500" />;
      case 'deadline':
        return <Clock className="w-5 h-5 text-amber-500" />;
      default:
        return <Bell className="w-5 h-5 text-indigo-500" />;
    }
  };

  return (
    <aside
      aria-label="Thông báo khẩn cấp hệ thống"
      className="fixed bottom-5 right-5 z-50 max-w-sm w-full animate-in slide-in-from-bottom-5 duration-300 pointer-events-auto"
    >
      <div className="bg-slate-900 text-white rounded-2xl p-4 shadow-2xl border border-slate-700/80 backdrop-blur-md flex items-start gap-3 ring-1 ring-white/10">
        <div className="p-2 rounded-xl bg-slate-800/90 shrink-0 border border-slate-700">
          {getIcon()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-0.5">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-indigo-400 flex items-center gap-1">
              <span>📲 ĐÃ GỬI VỀ MÁY THÀNH VIÊN</span>
            </span>
            <span className="text-[10px] text-slate-400">Vừa xong</span>
          </div>
          <h4 className="text-xs font-bold text-slate-100 line-clamp-1">
            {notification.title}
          </h4>
          <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
            {notification.body}
          </p>
          {notification.projectName && (
            <p className="text-[10px] text-slate-400 mt-1.5 font-medium truncate">
              Nhóm: <span className="text-slate-200 font-semibold">{notification.projectName}</span>
            </p>
          )}
        </div>

        <button
          id="btn-close-device-toast"
          type="button"
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 200);
          }}
          className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
