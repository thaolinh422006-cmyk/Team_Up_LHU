import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  ArrowRight,
  Mail,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  KeyRound,
  LogIn,
  UserPlus,
  AlertCircle,
  Check,
  X,
} from 'lucide-react';
import { Member } from '../types';
import { formatMemberName, getAvatarForEmail } from '../utils/userUtils';
import confetti from 'canvas-confetti';

interface AuthModalProps {
  isOpen: boolean;
  onAuthSuccess: (user: Member) => void;
  projectName?: string;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onAuthSuccess,
  projectName = 'Báo Cáo Dự Án: Ứng Dụng AI Trong Giáo Dục',
}) => {
  // Mode: 'login' | 'register'
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Register form state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Status & loading
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Forgot password popup state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState<'check' | 'new_password'>('check');
  const [newForgotPass, setNewForgotPass] = useState('');
  const [confirmForgotPass, setConfirmForgotPass] = useState('');
  const [showNewForgotPass, setShowNewForgotPass] = useState(false);
  const [isForgotLoading, setIsForgotLoading] = useState(false);
  const [forgotError, setForgotError] = useState<string | null>(null);
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);

  // Tự động kiểm tra và đồng bộ danh sách tài khoản đã đăng ký
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem('teamup_users');
      let currentUsers: any[] = [];
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) currentUsers = parsed;
        } catch {}
      }

      // Khôi phục từ key cũ nếu có
      if (currentUsers.length === 0) {
        const legacyRaw = localStorage.getItem('teamup_registered_users');
        if (legacyRaw) {
          try {
            const legacyUsers = JSON.parse(legacyRaw);
            if (Array.isArray(legacyUsers) && legacyUsers.length > 0) {
              currentUsers = legacyUsers;
              localStorage.setItem('teamup_users', JSON.stringify(currentUsers));
            }
          } catch {}
        }
      }

      // Tải từ backend API /api/auth/users để cập nhật danh sách
      fetch('/api/auth/users')
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && Array.isArray(data.users) && data.users.length > 0) {
            const currentRaw = localStorage.getItem('teamup_users');
            const localList: any[] = currentRaw ? JSON.parse(currentRaw) : [];
            const mergedMap = new Map<string, any>();
            
            // First set server users
            data.users.forEach((u: any) => {
              if (u.email) {
                const key = u.email.toLowerCase().trim();
                const savedPwd = localStorage.getItem(`teamup_pwd_${key}`);
                mergedMap.set(key, { ...u, password: u.password || savedPwd || '' });
              }
            });

            // Merge with local users (preserving passwords)
            localList.forEach((u: any) => {
              if (u.email) {
                const key = u.email.toLowerCase().trim();
                const existing = mergedMap.get(key);
                mergedMap.set(key, {
                  ...existing,
                  ...u,
                  password: u.password || existing?.password || localStorage.getItem(`teamup_pwd_${key}`) || '',
                });
              }
            });

            const merged = Array.from(mergedMap.values());
            localStorage.setItem('teamup_users', JSON.stringify(merged));
          }
        })
        .catch(() => {});
    } catch {}
  }, []);

  if (!isOpen) return null;

  // Xử lý Đăng Nhập: Kiểm tra với server và tài khoản đã lưu, ghi nhận chính xác 100%
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanEmail = loginEmail.trim().toLowerCase();
    const cleanPass = loginPassword.trim();

    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail của bạn.');
      return;
    }
    if (!cleanPass) {
      setErrorMsg('Vui lòng nhập mật khẩu.');
      return;
    }

    try {
      setIsLoading(true);

      let authUser: any = null;
      let isSuccess = false;

      // 1. Xác thực trực tiếp qua Backend API
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
        });
        const data = await res.json().catch(() => null);

        if (res.ok && data?.success && data?.user) {
          authUser = data.user;
          isSuccess = true;
        } else if (res.status === 401) {
          // Kiểm tra xem có phải do mật khẩu mới được reset trên máy này không
          const localPwd = localStorage.getItem(`teamup_pwd_${cleanEmail}`);
          if (localPwd && localPwd.trim() === cleanPass) {
            // Đồng bộ mật khẩu mới lên server
            await fetch('/api/auth/reset-password', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: cleanEmail, newPassword: cleanPass }),
            }).catch(() => {});
            authUser = {
              id: `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
              name: formatMemberName(cleanEmail),
              email: cleanEmail,
              avatar: getAvatarForEmail(cleanEmail),
              role: 'Thành viên nhóm',
              isAdmin: false,
            };
            isSuccess = true;
          } else {
            setErrorMsg('Mật khẩu không chính xác. Vui lòng kiểm tra lại!');
            setIsLoading(false);
            return;
          }
        } else if (res.status === 404) {
          // Tài khoản chưa có trên server, kiểm tra trong localStorage xem đã tạo tài khoản chưa
          let userList: any[] = [];
          try {
            const raw = localStorage.getItem('teamup_users');
            if (raw) userList = JSON.parse(raw);
          } catch {}

          const localMatched = userList.find(
            (u: any) => (u.email || '').trim().toLowerCase() === cleanEmail
          );
          const savedPwd = localStorage.getItem(`teamup_pwd_${cleanEmail}`) || localMatched?.password;

          if (localMatched && (!savedPwd || String(savedPwd).trim() === cleanPass)) {
            // Tự động đồng bộ tài khoản đã đăng ký lên Server
            try {
              const regRes = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  name: localMatched.name || formatMemberName(cleanEmail),
                  email: cleanEmail,
                  password: cleanPass,
                }),
              });
              const regData = await regRes.json();
              authUser = regData.user || {
                id: localMatched.id || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
                name: localMatched.name || formatMemberName(cleanEmail),
                email: cleanEmail,
                avatar: localMatched.avatar || getAvatarForEmail(cleanEmail),
                role: localMatched.role || 'Thành viên nhóm',
                isAdmin: Boolean(localMatched.isAdmin),
              };
              isSuccess = true;
            } catch {
              authUser = localMatched;
              isSuccess = true;
            }
          } else if (localMatched && savedPwd && String(savedPwd).trim() !== cleanPass) {
            setErrorMsg('Mật khẩu không chính xác. Vui lòng kiểm tra lại!');
            setIsLoading(false);
            return;
          } else {
            setErrorMsg(
              `Tài khoản Gmail "${cleanEmail}" chưa được đăng ký trong hệ thống. Vui lòng chọn tab "Đăng ký tài khoản" để tạo tài khoản mới.`
            );
            setIsLoading(false);
            return;
          }
        } else {
          setErrorMsg(data?.error || 'Có lỗi xảy ra khi đăng nhập.');
          setIsLoading(false);
          return;
        }
      } catch (netErr) {
        // Dự phòng khi mất kết nối mạng: kiểm tra dữ liệu tài khoản đã ghi nhận trong localStorage
        let userList: any[] = [];
        try {
          const raw = localStorage.getItem('teamup_users');
          if (raw) userList = JSON.parse(raw);
        } catch {}

        const localMatched = userList.find(
          (u: any) => (u.email || '').trim().toLowerCase() === cleanEmail
        );
        const savedPwd = localStorage.getItem(`teamup_pwd_${cleanEmail}`) || localMatched?.password;

        if (localMatched && (!savedPwd || String(savedPwd).trim() === cleanPass)) {
          authUser = localMatched;
          isSuccess = true;
        } else if (localMatched) {
          setErrorMsg('Mật khẩu không chính xác. Vui lòng kiểm tra lại!');
          setIsLoading(false);
          return;
        } else {
          setErrorMsg(
            `Tài khoản Gmail "${cleanEmail}" chưa được đăng ký trong hệ thống. Vui lòng chọn tab "Đăng ký tài khoản" để tạo tài khoản mới.`
          );
          setIsLoading(false);
          return;
        }
      }

      if (isSuccess && authUser) {
        // Ghi nhận mật khẩu và tài khoản trên ứng dụng
        localStorage.setItem(`teamup_pwd_${cleanEmail}`, cleanPass);

        let userList: any[] = [];
        try {
          const raw = localStorage.getItem('teamup_users');
          if (raw) userList = JSON.parse(raw);
        } catch {}

        const updatedList = userList.filter((u: any) => (u.email || '').trim().toLowerCase() !== cleanEmail);
        const userToSave = {
          ...authUser,
          password: cleanPass,
          lastLoginAt: new Date().toISOString(),
        };
        updatedList.push(userToSave);
        localStorage.setItem('teamup_users', JSON.stringify(updatedList));
        localStorage.setItem('teamup_registered_users', JSON.stringify(updatedList));

        const loggedInMember: Member = {
          id: authUser.id || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: authUser.name || formatMemberName(cleanEmail),
          email: cleanEmail,
          avatar: authUser.avatar || getAvatarForEmail(cleanEmail),
          role: authUser.role || 'Thành viên nhóm',
          isAdmin: Boolean(authUser.isAdmin),
          isOnline: true,
        };

        // Ghi nhớ phiên đăng nhập trên ứng dụng
        localStorage.setItem('teamup_authenticated_user', JSON.stringify(loggedInMember));
        localStorage.setItem('teamup_current_user', JSON.stringify(loggedInMember));

        setSuccessMsg(`Đăng nhập thành công! Chào mừng ${loggedInMember.name} trở lại.`);
        try {
          confetti({ particleCount: 65, spread: 60, origin: { y: 0.6 } });
        } catch {}

        setTimeout(() => {
          onAuthSuccess(loggedInMember);
        }, 300);
      }
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi đăng nhập.');
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Đăng Ký Tài Khoản: Lưu vào cùng key teamup_users
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const cleanName = regName.trim();
    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanPass = regPassword.trim();
    const cleanConfirm = regConfirmPassword.trim();

    if (!cleanName || cleanName.length < 2) {
      setErrorMsg('Vui lòng nhập họ và tên của bạn (ít nhất 2 ký tự).');
      return;
    }

    if (!cleanEmail) {
      setErrorMsg('Vui lòng nhập địa chỉ Gmail cá nhân của bạn.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setErrorMsg('Địa chỉ email không đúng định dạng (ví dụ hợp lệ: name@gmail.com).');
      return;
    }

    if (!cleanPass || cleanPass.length < 6) {
      setErrorMsg('Mật khẩu tạo phải có ít nhất 6 ký tự.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setErrorMsg('Mật khẩu xác nhận không trùng khớp với mật khẩu đã tạo.');
      return;
    }

    try {
      setIsLoading(true);

      // 1. Đọc toàn bộ danh sách tài khoản từ localStorage key "teamup_users"
      let userList: any[] = [];
      try {
        const savedUsersRaw = localStorage.getItem('teamup_users');
        if (savedUsersRaw) {
          userList = JSON.parse(savedUsersRaw);
          if (!Array.isArray(userList)) userList = [];
        }
      } catch {}

      const exists = userList.some(
        (u: any) => (u.email || '').trim().toLowerCase() === cleanEmail
      );

      if (exists) {
        setErrorMsg(`Tài khoản với Gmail "${cleanEmail}" đã tồn tại. Vui lòng chuyển sang tab Đăng nhập.`);
        setIsLoading(false);
        return;
      }

      // 2. Tạo tài khoản người dùng mới và lưu vào cùng key "teamup_users"
      const avatar = getAvatarForEmail(cleanEmail);
      const newAccount = {
        id: `usr_${Date.now()}_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
        name: cleanName,
        email: cleanEmail,
        password: cleanPass, // Lưu mật khẩu trim chính xác 100%
        avatar,
        role: 'Thành viên nhóm',
        isAdmin: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      };

      userList = userList.filter((u: any) => (u.email || '').trim().toLowerCase() !== cleanEmail);
      userList.push(newAccount);

      // Lưu cùng key teamup_users
      localStorage.setItem('teamup_users', JSON.stringify(userList));
      localStorage.setItem('teamup_registered_users', JSON.stringify(userList));
      localStorage.setItem(`teamup_pwd_${cleanEmail}`, cleanPass);

      // 3. Đồng bộ với backend API
      try {
        await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: cleanName,
            email: cleanEmail,
            password: cleanPass,
          }),
        });
      } catch (apiErr) {
        console.warn('Lỗi đồng bộ backend register:', apiErr);
      }

      setSuccessMsg('Đăng ký tài khoản thành công! Đang chuyển vào không gian làm việc...');
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}

      const memberToLogin: Member = {
        id: newAccount.id,
        name: newAccount.name,
        email: newAccount.email,
        avatar: newAccount.avatar,
        role: newAccount.role,
        isAdmin: newAccount.isAdmin,
        isOnline: true,
      };

      setTimeout(() => {
        onAuthSuccess(memberToLogin);
      }, 500);
    } catch (err: any) {
      setErrorMsg(err?.message || 'Có lỗi xảy ra khi đăng ký tài khoản.');
    } finally {
      setIsLoading(false);
    }
  };

  // Kiểm tra Gmail tồn tại trong danh sách tài khoản đã đăng ký (key teamup_users)
  const handleCheckForgotEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    if (!cleanEmail) {
      setForgotError('Vui lòng nhập địa chỉ Gmail.');
      return;
    }

    try {
      setIsForgotLoading(true);
      let exists = false;

      // 1. Kiểm tra trong localStorage key "teamup_users"
      try {
        const savedUsersRaw = localStorage.getItem('teamup_users');
        if (savedUsersRaw) {
          const list = JSON.parse(savedUsersRaw);
          if (Array.isArray(list) && list.some((u: any) => (u.email || '').trim().toLowerCase() === cleanEmail)) {
            exists = true;
          }
        }
      } catch {}

      // Kiểm tra thêm key dự phòng nếu có
      if (!exists) {
        try {
          const legacyRaw = localStorage.getItem('teamup_registered_users');
          if (legacyRaw) {
            const list = JSON.parse(legacyRaw);
            if (Array.isArray(list) && list.some((u: any) => (u.email || '').trim().toLowerCase() === cleanEmail)) {
              exists = true;
            }
          }
        } catch {}
      }

      // 2. Kiểm tra qua backend API
      if (!exists) {
        try {
          const res = await fetch('/api/auth/check-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail }),
          });
          const data = await res.json().catch(() => null);
          if (res.ok && data?.exists) {
            exists = true;
          }
        } catch (netErr) {
          console.warn('Network check error:', netErr);
        }
      }

      if (!exists) {
        setForgotError('Gmail chưa tồn tại');
        return;
      }

      // Gmail tồn tại -> chuyển sang bước 2 để đặt mật khẩu mới
      setForgotStep('new_password');
      setForgotError(null);
    } catch (err: any) {
      setForgotError(err?.message || 'Có lỗi xảy ra khi kiểm tra Gmail.');
    } finally {
      setIsForgotLoading(false);
    }
  };

  // Đổi mật khẩu: Lưu mật khẩu mới vào cùng key teamup_users trong localStorage
  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotError(null);
    setForgotSuccess(null);

    const cleanEmail = forgotEmail.trim().toLowerCase();
    const cleanPass = newForgotPass.trim();
    const cleanConfirm = confirmForgotPass.trim();

    if (!cleanPass || cleanPass.length < 6) {
      setForgotError('Mật khẩu mới phải có ít nhất 6 ký tự.');
      return;
    }

    if (cleanPass !== cleanConfirm) {
      setForgotError('Mật khẩu xác nhận không trùng khớp.');
      return;
    }

    try {
      setIsForgotLoading(true);

      // 1. Lưu mật khẩu mới vào cùng key "teamup_users"
      let userList: any[] = [];
      try {
        const savedUsersRaw = localStorage.getItem('teamup_users');
        if (savedUsersRaw) {
          userList = JSON.parse(savedUsersRaw);
          if (!Array.isArray(userList)) userList = [];
        }
      } catch {}

      if (userList.length === 0) {
        try {
          const legacyRaw = localStorage.getItem('teamup_registered_users');
          if (legacyRaw) {
            const list = JSON.parse(legacyRaw);
            if (Array.isArray(list)) userList = list;
          }
        } catch {}
      }

      const userIdx = userList.findIndex((u: any) => (u.email || '').trim().toLowerCase() === cleanEmail);
      if (userIdx >= 0) {
        userList[userIdx].password = cleanPass;
        userList[userIdx].updatedAt = new Date().toISOString();
      } else {
        userList.push({
          id: `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          name: formatMemberName(cleanEmail),
          email: cleanEmail,
          password: cleanPass,
          avatar: getAvatarForEmail(cleanEmail),
          role: 'Thành viên nhóm',
          isAdmin: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      }

      // Lưu cùng key teamup_users
      localStorage.setItem('teamup_users', JSON.stringify(userList));
      localStorage.setItem('teamup_registered_users', JSON.stringify(userList));
      localStorage.setItem(`teamup_pwd_${cleanEmail}`, cleanPass);

      // 2. Gọi backend API reset-password
      try {
        await fetch('/api/auth/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, newPassword: cleanPass }),
        });
      } catch (apiErr) {
        console.warn('Backend reset password error:', apiErr);
      }

      // 3. Hiển thị thông báo thành công: "Đổi mật khẩu thành công, hãy đăng nhập lại"
      const successText = 'Đổi mật khẩu thành công, hãy đăng nhập lại';
      setForgotSuccess(successText);

      try {
        confetti({ particleCount: 70, spread: 60, origin: { y: 0.6 } });
      } catch {}

      // 4. Quay về tab Đăng Nhập với email đã điền sẵn
      setTimeout(() => {
        setShowForgotModal(false);
        setActiveTab('login');
        setLoginEmail(cleanEmail);
        setLoginPassword('');
        setSuccessMsg(successText);
        setForgotSuccess(null);
        setForgotStep('check');
        setNewForgotPass('');
        setConfirmForgotPass('');
      }, 1200);
    } catch (err: any) {
      setForgotError(err?.message || 'Có lỗi xảy ra khi đổi mật khẩu.');
    } finally {
      setIsForgotLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-80 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
      <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col my-auto relative animate-in zoom-in-95 duration-200">
        {/* Top Gradient Header */}
        <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-6 text-white text-center overflow-hidden">
          <div className="absolute -top-12 -right-12 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-12 -left-12 w-36 h-36 bg-white/10 rounded-full blur-xl pointer-events-none" />

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase mb-2 shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-pulse" />
            <span>TEAM UP WORKSPACE</span>
          </div>

          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight">
            {activeTab === 'login' ? 'Đăng Nhập Tài Khoản' : 'Đăng Ký Tài Khoản Mới'}
          </h2>

          <p className="text-xs text-white/90 mt-1 max-w-xs mx-auto">
            {activeTab === 'login'
              ? 'Nhập Gmail và mật khẩu để truy cập không gian làm việc nhóm'
              : 'Điền tên, Gmail cá nhân và tạo mật khẩu để bắt đầu cộng tác'}
          </p>

          <div className="mt-3 inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-xl text-[11px] font-medium max-w-full">
            <Users className="w-3.5 h-3.5 text-white/90 shrink-0" />
            <span className="truncate">{projectName}</span>
          </div>
        </div>

        {/* Segmented Switcher Tabs */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setActiveTab('login');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng Nhập</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('register');
                setErrorMsg(null);
                setSuccessMsg(null);
              }}
              className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'register'
                  ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng Ký Tài Khoản</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6 pt-4 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-medium animate-in fade-in">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-medium flex items-center gap-1.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* TAB 1: ĐĂNG NHẬP (GMAIL + MẬT KHẨU) */}
          {activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Địa chỉ Gmail <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    autoFocus
                    placeholder="Nhập địa chỉ Gmail của bạn..."
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    Mật khẩu <span className="text-rose-500">*</span>
                  </label>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập mật khẩu của bạn..."
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer text-slate-600 dark:text-slate-300 select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                  />
                  <span>Ghi nhớ đăng nhập</span>
                </label>
                <button
                  id="btn-forgot-password-link"
                  type="button"
                  onClick={() => {
                    setForgotEmail(loginEmail.trim());
                    setForgotStep('check');
                    setForgotError(null);
                    setForgotSuccess(null);
                    setNewForgotPass('');
                    setConfirmForgotPass('');
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:underline cursor-pointer"
                >
                  Quên mật khẩu?
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !loginEmail.trim() || !loginPassword.trim()}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer min-h-[42px]"
                >
                  {isLoading ? (
                    <span>Đang kiểm tra đăng nhập...</span>
                  ) : (
                    <>
                      <span>Đăng nhập vào TEAM UP</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Chưa có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Đăng ký tài khoản mới
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: ĐĂNG KÝ TÀI KHOẢN (TÊN + GMAIL CÁ NHÂN + TẠO MẬT KHẨU) */}
          {activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {/* Mục 1: Tên */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Họ và tên của bạn <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder="Nhập họ và tên của bạn..."
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              {/* Mục 2: Gmail cá nhân */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Gmail cá nhân <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    required
                    placeholder="Nhập địa chỉ Gmail của bạn..."
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              {/* Mục 3: Tạo mật khẩu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Tạo mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="Tối thiểu 6 ký tự..."
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowRegPassword(!showRegPassword)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                  >
                    {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mục 4: Nhập lại mật khẩu */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Xác nhận lại mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    required
                    placeholder="Nhập lại chính xác mật khẩu..."
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    isLoading ||
                    !regName.trim() ||
                    !regEmail.trim() ||
                    !regPassword.trim() ||
                    regPassword.length < 6
                  }
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 shadow-md flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer min-h-[42px]"
                >
                  {isLoading ? (
                    <span>Đang khởi tạo tài khoản...</span>
                  ) : (
                    <>
                      <span>Tạo tài khoản & Vào làm việc</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <span className="text-xs text-slate-500">Đã có tài khoản? </span>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setErrorMsg(null);
                  }}
                  className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  Đăng nhập tại đây
                </button>
              </div>
            </form>
          )}


        </div>
      </div>

      {/* POPUP KHÔI PHỤC MẬT KHẨU */}
      {showForgotModal && (
        <div className="fixed inset-0 z-90 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-200 my-auto">
            {/* Top Gradient Header */}
            <div className="relative bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 p-5 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                  <KeyRound className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold tracking-tight">Quên Mật Khẩu</h3>
                  <p className="text-[11px] text-white/85">
                    Khôi phục mật khẩu tài khoản TEAM UP của bạn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="p-1.5 rounded-full bg-black/20 hover:bg-black/30 text-white/80 hover:text-white transition-colors cursor-pointer"
                title="Đóng bảng khôi phục mật khẩu"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Popup Form Body */}
            <div className="p-6 space-y-4">
              {forgotError && (
                <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span>{forgotError}</span>
                </div>
              )}

              {forgotSuccess && (
                <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>{forgotSuccess}</span>
                </div>
              )}

              {/* BƯỚC 1: NHẬP VÀ KIỂM TRA GMAIL ĐÃ ĐĂNG KÝ */}
              {forgotStep === 'check' && (
                <form onSubmit={handleCheckForgotEmail} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Nhập Gmail đã đăng ký <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type="email"
                        required
                        autoFocus
                        placeholder="Nhập địa chỉ Gmail của bạn..."
                        value={forgotEmail}
                        onChange={(e) => {
                          setForgotEmail(e.target.value);
                          setForgotError(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Hệ thống sẽ kiểm tra xem Gmail có tồn tại trong danh sách tài khoản đã lưu hay không.
                    </p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotLoading || !forgotEmail.trim()}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isForgotLoading ? (
                        <span>Đang kiểm tra Gmail...</span>
                      ) : (
                        <>
                          <span>Kiểm tra Gmail</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              {/* BƯỚC 2: NHẬP MẬT KHẨU MỚI VÀ LƯU VÀO LOCALSTORAGE */}
              {forgotStep === 'new_password' && (
                <form onSubmit={handleResetPasswordSubmit} className="space-y-3.5">
                  <div className="p-2.5 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/80 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 truncate">
                      <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                      <span className="font-semibold text-emerald-800 dark:text-emerald-200 truncate">
                        {forgotEmail} (Đã xác thực tồn tại)
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setForgotStep('check');
                        setForgotError(null);
                        setForgotSuccess(null);
                      }}
                      className="text-[11px] text-indigo-600 dark:text-indigo-400 font-bold hover:underline shrink-0 ml-2"
                    >
                      Đổi Gmail
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showNewForgotPass ? 'text' : 'password'}
                        required
                        autoFocus
                        placeholder="Tối thiểu 6 ký tự..."
                        value={newForgotPass}
                        onChange={(e) => {
                          setNewForgotPass(e.target.value);
                          setForgotError(null);
                        }}
                        className="w-full pl-9 pr-10 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewForgotPass(!showNewForgotPass)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                      >
                        {showNewForgotPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                      Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                      <input
                        type={showNewForgotPass ? 'text' : 'password'}
                        required
                        placeholder="Nhập lại chính xác mật khẩu mới..."
                        value={confirmForgotPass}
                        onChange={(e) => {
                          setConfirmForgotPass(e.target.value);
                          setForgotError(null);
                        }}
                        className="w-full pl-9 pr-3 py-2 text-xs font-medium rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={() => setShowForgotModal(false)}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
                    >
                      Hủy bỏ
                    </button>
                    <button
                      type="submit"
                      disabled={isForgotLoading || !newForgotPass.trim() || newForgotPass.length < 6}
                      className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 hover:opacity-95 shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isForgotLoading ? (
                        <span>Đang lưu mật khẩu...</span>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Lưu mật khẩu mới</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
