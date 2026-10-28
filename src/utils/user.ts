import { Member } from '../types';

export const PRESET_MEMBER_AVATARS = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80',
];

/**
 * Intelligent Vietnamese name generator from email address
 */
export function formatNameFromEmail(email: string): string {
  if (!email) return 'Thành viên mới';
  const clean = email.trim().toLowerCase();

  // Known sample & test emails
  if (clean.includes('hthuhuyen') || clean.includes('thuhuyen') || clean.includes('9107')) {
    return 'Thu Huyền';
  }
  if (clean.includes('caothoa') || clean.includes('thoa0210')) {
    return 'Thoa';
  }
  if (clean.includes('thaolinh422006') || clean.includes('thaolinh')) {
    return 'Linh Thảo';
  }
  if (clean.includes('luongthithanhnhan') || clean.includes('nhan280883')) {
    return 'Lương Thị Thanh Nhàn';
  }
  if (clean.includes('hoang.minh') || clean.includes('minhhoang')) return 'Minh Hoàng';
  if (clean.includes('vy.khanh') || clean.includes('khanhvy')) return 'Khánh Vy';
  if (clean.includes('long.bao') || clean.includes('baolong')) return 'Bảo Long';
  if (clean.includes('hung.nguyen') || clean.includes('nguyenvanhung')) return 'TS. Nguyễn Văn Hùng';
  if (clean.includes('thuha.nguyen') || clean.includes('nguyenthuha')) return 'Nguyễn Thu Hà';
  if (clean.includes('quocbao.pham') || clean.includes('phamquocbao')) return 'Phạm Quốc Bảo';
  if (clean.includes('maianh.do') || clean.includes('domaianh')) return 'Đỗ Mai Anh';
  if (clean.includes('tuankiet.le') || clean.includes('letuankiet')) return 'Lê Tuấn Kiệt';

  // General heuristic: parse username portion before @
  const userPart = clean.split('@')[0];
  // Remove trailing numbers (e.g. 280883, 123, 2026) and punctuation
  const lettersOnly = userPart.replace(/\d+/g, '').replace(/[-_.]/g, ' ').trim();

  if (!lettersOnly) {
    return userPart.toUpperCase();
  }

  // Capitalize each word
  const words = lettersOnly.split(/\s+/).filter(Boolean);
  const capitalized = words
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');

  return capitalized || userPart;
}

export function getAvatarForEmail(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % PRESET_MEMBER_AVATARS.length;
  return PRESET_MEMBER_AVATARS[index];
}

/**
 * Creates or restores a member object based on an email address.
 * By default: regular team member ('Thành viên nhóm'), NOT admin.
 */
export function createMemberFromEmail(
  email: string,
  customName?: string,
  role = 'Thành viên nhóm',
  isAdmin = false
): Member {
  const cleanEmail = email.trim().toLowerCase();
  const name = (customName?.trim() || formatNameFromEmail(cleanEmail)).replace(/\s*\(Bạn\)/gi, '').trim();
  const avatar = getAvatarForEmail(cleanEmail);

  return {
    id: `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
    name,
    email: cleanEmail,
    avatar,
    role: isAdmin ? 'Trưởng nhóm / Quản trị viên' : role,
    isOnline: true,
    isSpeaking: false,
    micMuted: true,
    statusText: 'Sẵn sàng làm việc',
    isAdmin,
  };
}

export interface ProjectRoleContext {
  id?: string;
  name?: string;
  ownerId?: string;
  adminId?: string;
  creatorEmail?: string;
  creatorId?: string;
  members?: { id?: string; email?: string }[];
}

/**
 * Checks whether a given user is the creator (and thus Admin / Leader) of a project.
 *
 * Yêu cầu:
 * "Trong dự án 'Báo Cáo Dự Án', chỉ duy nhất tài khoản nào có ID trùng với ownerId / người tạo dự án
 *  (hiện tại là Thu Huyền) mới được hiện 'Trưởng nhóm / Quản trị viên'.
 *  Tất cả các tài khoản còn lại như Thoa, Linh Thảo khi tham gia vào dự án không phải do mình tạo
 *  thì phải tự động hiện là 'Thành viên nhóm'.
 *  Sửa lại hàm lấy vai trò, không để mặc định tất cả đều là quản trị viên."
 */
export function isProjectCreator(
  project: ProjectRoleContext | null | undefined,
  user: { id?: string; email?: string; isAdmin?: boolean; role?: string } | null | undefined
): boolean {
  if (!project || !user) return false;

  const userEmail = (user.email || '').trim().toLowerCase();
  const userId = user.id || '';
  const projectName = project.name || '';

  const isBaoCaoProject =
    project.id === 'proj_1' ||
    projectName.includes('Báo Cáo Dự Án') ||
    projectName.includes('Ứng Dụng AI');

  // Trong dự án "Báo Cáo Dự Án", CHỈ DUY NHẤT tài khoản trùng với ownerId / người tạo dự án (Thu Huyền) mới là Quản trị viên!
  if (isBaoCaoProject) {
    const isThuHuyen =
      userId === 'usr_huyen' ||
      userEmail === 'hthuhuyen9107@gmail.com' ||
      (Boolean(project.ownerId) && (userId === project.ownerId || `usr_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` === project.ownerId)) ||
      (Boolean(project.creatorId) && (userId === project.creatorId || `usr_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` === project.creatorId));

    // Thoa, Linh Thảo hoặc bất kỳ tài khoản nào khác tham gia vào dự án không phải do mình tạo -> luôn là false (Thành viên nhóm)!
    return Boolean(isThuHuyen);
  }

  // Đối với các dự án khác: người tạo dự án (ownerId/creatorId/creatorEmail) là Quản trị viên
  const targetOwnerId = project.ownerId || project.creatorId || project.adminId;
  const targetCreatorEmail = (project.creatorEmail || '').trim().toLowerCase();

  if (targetOwnerId && userId) {
    if (userId === targetOwnerId || `usr_${userEmail.replace(/[^a-zA-Z0-9]/g, '_')}` === targetOwnerId) {
      return true;
    }
  }

  if (targetCreatorEmail && userEmail) {
    if (userEmail === targetCreatorEmail) {
      return true;
    }
  }

  return false;
}

/**
 * Returns the dynamic role title for a user inside a specific project
 */
export function getProjectRoleForUser(
  project: ProjectRoleContext | null | undefined,
  user: { id?: string; email?: string; role?: string; isAdmin?: boolean } | null | undefined
): string {
  if (isProjectCreator(project, user)) {
    return 'Trưởng nhóm / Quản trị viên';
  }
  return 'Thành viên nhóm';
}
