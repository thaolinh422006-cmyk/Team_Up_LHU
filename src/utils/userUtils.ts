import { Member } from '../types';

// Map of common Vietnamese syllables for name extraction from email
const VIETNAMESE_SYLLABLES: Record<string, string> = {
  // Surnames
  luong: 'Lương',
  nguyen: 'Nguyễn',
  tran: 'Trần',
  le: 'Lê',
  pham: 'Phạm',
  hoang: 'Hoàng',
  huynh: 'Huỳnh',
  phan: 'Phan',
  vu: 'Vũ',
  vo: 'Võ',
  dang: 'Đặng',
  bui: 'Bùi',
  do: 'Đỗ',
  ho: 'Hồ',
  ngo: 'Ngô',
  duong: 'Dương',
  ly: 'Lý',
  dao: 'Đào',
  dinh: 'Đinh',
  mai: 'Mai',
  truong: 'Trương',
  dinhthi: 'Đinh Thị',
  ha: 'Hà',
  trinh: 'Trịnh',
  doan: 'Đoàn',

  // Middle & given names
  thi: 'Thị',
  van: 'Văn',
  thanh: 'Thanh',
  nhan: 'Nhàn',
  anh: 'Anh',
  minh: 'Minh',
  duc: 'Đức',
  quoc: 'Quốc',
  bao: 'Bảo',
  long: 'Long',
  phuong: 'Phương',
  thao: 'Thảo',
  linh: 'Linh',
  vy: 'Vy',
  trang: 'Trang',
  huong: 'Hương',
  hang: 'Hằng',
  tuan: 'Tuấn',
  kiet: 'Kiệt',
  nam: 'Nam',
  hung: 'Hùng',
  dung: 'Dũng',
  son: 'Sơn',
  nga: 'Nga',
  oanh: 'Oanh',
  nhung: 'Nhung',
  huyen: 'Huyền',
  khoa: 'Khoa',
  lan: 'Lan',
  yen: 'Yến',
  ngoc: 'Ngọc',
  kim: 'Kim',
  hai: 'Hải',
  hieu: 'Hiếu',
  thang: 'Thắng',
  tien: 'Tiến',
  phuc: 'Phúc',
  loc: 'Lộc',
  tai: 'Tài',
  an: 'An',
  binh: 'Bình',
  tam: 'Tâm',
  nhu: 'Như',
  quynh: 'Quỳnh',
  khanh: 'Khánh',
  mai_anh: 'Mai Anh',
  thu: 'Thu',
  thuy: 'Thùy',
  quang: 'Quang',
  huy: 'Huy',
  viet: 'Việt',
};

// Known full combinations for high precision
const KNOWN_COMBINATIONS: Record<string, string> = {
  luongthithanhnhan: 'Lương Thị Thanh Nhàn',
  nguyenthuha: 'Nguyễn Thu Hà',
  phamquocbao: 'Phạm Quốc Bảo',
  domaianh: 'Đỗ Mai Anh',
  letuankiet: 'Lê Tuấn Kiệt',
  thaolinh: 'Thảo Linh',
  minhhoang: 'Minh Hoàng',
  khanhvy: 'Khánh Vy',
  baolong: 'Bảo Long',
};

/**
 * Intelligently extract and format a human-readable name from an email address
 * e.g., "luongthithanhnhan280883@gmail.com" -> "Lương Thị Thanh Nhàn"
 */
export function formatMemberName(email: string, storedName?: string): string {
  if (storedName && storedName.trim().length > 0) {
    return storedName.trim();
  }

  if (!email || typeof email !== 'string') return 'Thành viên mới';

  // Get username part before @
  const username = email.split('@')[0].toLowerCase().trim();

  // Strip trailing numbers (birth years, random ids like 280883, 123, 2006)
  const cleanUsername = username.replace(/\d+$/, '').replace(/[._-]+$/, '');

  // Check direct known combination match
  if (KNOWN_COMBINATIONS[cleanUsername]) {
    return KNOWN_COMBINATIONS[cleanUsername];
  }

  // Check with numbers stripped
  const noNum = username.replace(/\d+/g, '');
  if (KNOWN_COMBINATIONS[noNum]) {
    return KNOWN_COMBINATIONS[noNum];
  }

  // Handle dot, hyphen, or underscore separated names (e.g., "luong.thi.thanh.nhan" or "nguyen_van_a")
  if (cleanUsername.includes('.') || cleanUsername.includes('_') || cleanUsername.includes('-')) {
    const parts = cleanUsername.split(/[._-]+/).filter(Boolean);
    const formatted = parts.map((part) => {
      const lower = part.toLowerCase();
      if (VIETNAMESE_SYLLABLES[lower]) {
        return VIETNAMESE_SYLLABLES[lower];
      }
      return part.charAt(0).toUpperCase() + part.slice(1);
    });
    return formatted.join(' ');
  }

  // Try greedily matching Vietnamese syllables
  let remaining = cleanUsername;
  const matchedWords: string[] = [];

  // Syllables sorted by length descending
  const sortedSyllables = Object.keys(VIETNAMESE_SYLLABLES).sort((a, b) => b.length - a.length);

  while (remaining.length > 0) {
    let found = false;
    for (const syl of sortedSyllables) {
      if (remaining.startsWith(syl)) {
        matchedWords.push(VIETNAMESE_SYLLABLES[syl]);
        remaining = remaining.slice(syl.length);
        found = true;
        break;
      }
    }
    if (!found) {
      // If no syllable matches, take the first 3 or remaining chars
      if (matchedWords.length > 0 && remaining.length <= 4) {
        matchedWords.push(remaining.charAt(0).toUpperCase() + remaining.slice(1));
      } else {
        matchedWords.push(remaining.charAt(0).toUpperCase() + remaining.slice(1));
      }
      break;
    }
  }

  if (matchedWords.length >= 2) {
    return matchedWords.join(' ');
  }

  // Fallback: Title case of the clean username
  return cleanUsername.charAt(0).toUpperCase() + cleanUsername.slice(1);
}

// Preset avatars for invited members
const AVATAR_LIST = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
];

/**
 * Deterministically pick an avatar based on email string
 */
export function getAvatarForEmail(email: string): string {
  if (!email) return AVATAR_LIST[0];
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = (hash << 5) - hash + email.charCodeAt(i);
    hash |= 0;
  }
  const index = Math.abs(hash) % AVATAR_LIST.length;
  return AVATAR_LIST[index];
}
