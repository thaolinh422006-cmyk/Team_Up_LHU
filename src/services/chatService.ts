import { ChatMessage, Member } from '../types';

/**
 * ChatService: Dịch vụ tin nhắn Real-time chuẩn hoá cho TEAM UP Workspace
 * - Tạo Chat ID nhất quán cho 2 người: [uid1, uid2].sort().join('_')
 * - Gửi tin nhắn đầy đủ: senderId, receiverId, participants, text, timestamp, createdAt
 * - Lắng nghe thời gian thực onSnapshot qua SSE & live fetch
 * - Chế độ DEBUG console.log tại 3 điểm quan trọng
 */

// 1. Tạo Chat ID nhất quán cho cuộc trò chuyện 1-1
export function createDirectChatId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) {
    console.warn('[CHAT DEBUG] createDirectChatId: thiếu UID:', { uid1, uid2 });
    return `dm_unknown_${Date.now()}`;
  }
  // Sắp xếp UID theo bảng chữ cái để cả Người A và Người B luôn có chung một Chat ID duy nhất
  const sorted = [String(uid1).trim(), String(uid2).trim()].sort();
  const chatId = `dm_${sorted[0]}_${sorted[1]}`;

  // DEBUG 2: Khi tạo chatId
  console.log('[CHAT DEBUG] 2. Tạo chatId nhất quán:', chatId, 'Participants:', sorted);

  return chatId;
}

// 2. Tạo Chat ID cho kênh nhóm thảo luận (Group channel)
export function createChannelChatId(projectId: string, channelId = 'ch_main'): string {
  const chatId = `grp_${projectId}_${channelId}`;
  console.log('[CHAT DEBUG] 2. Tạo channel chatId:', chatId, 'Channel:', channelId);
  return chatId;
}

export interface SendMessagePayload {
  projectId: string;
  sender: Member;
  text: string;
  receiverId?: string;
  channelId?: string;
  type?: 'text' | 'file' | 'image' | 'system';
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  isAi?: boolean;
}

// 3. Hàm gửi tin nhắn với đầy đủ trường dữ liệu & kiểm tra Auth
export async function sendChatMessage(payload: SendMessagePayload): Promise<ChatMessage> {
  const { projectId, sender, text, receiverId, channelId, type = 'text', fileUrl, fileName, fileSize, isAi } = payload;

  // Kiểm tra Auth: Đảm bảo người dùng hợp lệ
  if (!sender || !sender.id) {
    console.error('[CHAT DEBUG] Lỗi gửi tin: currentUser không tồn tại hoặc chưa đăng nhập', sender);
    throw new Error('Bạn cần đăng nhập để gửi tin nhắn');
  }

  const senderId = sender.id;
  const receiver = receiverId ? String(receiverId).trim() : undefined;

  // Tính toán Chat ID và danh sách người tham gia
  let chatId: string;
  let participants: string[];

  if (receiver) {
    chatId = createDirectChatId(senderId, receiver);
    participants = [senderId, receiver].sort();
  } else {
    chatId = createChannelChatId(projectId, channelId || 'ch_main');
    participants = [senderId];
  }

  // DEBUG 1: Khi bấm nút Gửi
  console.log('[CHAT DEBUG] 1. Bấm nút gửi tin nhắn:', {
    senderId,
    senderName: sender.name,
    receiverId: receiver,
    chatId,
    participants,
    text: text ? (text.length > 30 ? text.slice(0, 30) + '...' : text) : '[Tệp tin]',
    timestamp: new Date().toISOString(),
  });

  const now = new Date();
  const body = {
    projectId,
    chatId,
    channelId: receiver ? undefined : (channelId || 'ch_main'),
    senderId,
    senderName: sender.name,
    senderAvatar: sender.avatar,
    receiverId: receiver,
    recipientId: receiver,
    participants,
    text: text.trim(),
    timestamp: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    createdAt: now.toISOString(),
    type,
    fileUrl,
    fileName,
    fileSize,
    isAi,
  };

  try {
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP error ${res.status}`);
    }

    const data = await res.json();
    return data.message;
  } catch (err: any) {
    console.error('[CHAT DEBUG] Gửi tin nhắn thất bại:', err);
    throw err;
  }
}

// 4. Lấy lịch sử tin nhắn từ máy chủ theo chatId hoặc channel
export async function fetchChatMessages(params: {
  projectId: string;
  chatId?: string;
  channelId?: string;
  userId?: string;
  recipientId?: string;
}): Promise<ChatMessage[]> {
  try {
    const url = new URL('/api/messages', window.location.origin);
    if (params.projectId) url.searchParams.set('projectId', params.projectId);
    if (params.chatId) url.searchParams.set('chatId', params.chatId);
    if (params.channelId) url.searchParams.set('channelId', params.channelId);
    if (params.userId) url.searchParams.set('userId', params.userId);
    if (params.recipientId) url.searchParams.set('recipientId', params.recipientId);

    const res = await fetch(url.toString());
    if (!res.ok) return [];

    const data = await res.json();
    const list: ChatMessage[] = Array.isArray(data.messages) ? data.messages : [];

    // Sắp xếp strictly theo thời gian tăng dần: orderBy('timestamp', 'asc')
    list.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp).getTime() || 0;
      const timeB = new Date(b.createdAt || b.timestamp).getTime() || 0;
      return timeA - timeB;
    });

    return list;
  } catch (e) {
    console.error('[CHAT DEBUG] Lỗi fetchChatMessages:', e);
    return [];
  }
}

/**
 * 5. onSnapshot Real-time Listener:
 * Sử dụng Server-Sent Events (SSE) kết hợp polling dự phòng để người A và người B
 * nhận tin nhắn tức thì theo thời gian thực (real-time).
 */
export function subscribeToChatMessages(
  chatId: string,
  projectId: string,
  onSnapshotCallback: (messages: ChatMessage[]) => void,
  onError?: (err: any) => void
): () => void {
  let isUnmounted = false;
  let currentMessages: ChatMessage[] = [];

  // Initial fetch
  fetchChatMessages({ projectId, chatId })
    .then((initialList) => {
      if (isUnmounted) return;
      currentMessages = initialList;

      // DEBUG 3: Khi onSnapshot nhận dữ liệu ban đầu
      console.log(
        '[CHAT DEBUG] 3. onSnapshot nhận dữ liệu real-time ban đầu:',
        initialList.length,
        'tin nhắn cho chatId:',
        chatId
      );
      onSnapshotCallback(initialList);
    })
    .catch((err) => {
      if (onError && !isUnmounted) onError(err);
    });

  // Setup Server-Sent Events (SSE) listener
  let eventSource: EventSource | null = null;
  const connectSSE = () => {
    try {
      const streamUrl = `/api/messages/stream?chatId=${encodeURIComponent(chatId)}&projectId=${encodeURIComponent(projectId)}`;
      eventSource = new EventSource(streamUrl);

      eventSource.onopen = () => {
        // SSE connection opened
      };

      eventSource.onmessage = (event) => {
        if (isUnmounted) return;
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'new_message' && payload.message) {
            const incoming: ChatMessage = payload.message;

            // Kiểm tra xem tin nhắn có đúng chatId không
            if (incoming.chatId === chatId) {
              // Tránh trùng lặp id
              if (!currentMessages.some((m) => m.id === incoming.id)) {
                currentMessages = [...currentMessages, incoming].sort((a, b) => {
                  const tA = new Date(a.createdAt || a.timestamp).getTime() || 0;
                  const tB = new Date(b.createdAt || b.timestamp).getTime() || 0;
                  return tA - tB;
                });

                // DEBUG 3: Khi onSnapshot nhận dữ liệu real-time
                console.log(
                  '[CHAT DEBUG] 3. onSnapshot nhận dữ liệu real-time (SSE):',
                  currentMessages.length,
                  'tin nhắn',
                  { incoming }
                );

                onSnapshotCallback(currentMessages);
              }
            }
          }
        } catch (e) {
          console.warn('[CHAT DEBUG] Lỗi parse SSE message:', e);
        }
      };

      eventSource.onerror = (e) => {
        // Fallback gracefully on SSE error, reconnection is automatic
        if (onError && !isUnmounted) onError(e);
      };
    } catch (e) {
      console.warn('[CHAT DEBUG] SSE không khả dụng, sử dụng polling dự phòng:', e);
    }
  };

  connectSSE();

  // Heartbeat polling dự phòng mỗi 2.5s để đảm bảo không bị sót tin nhắn khi chuyển mạng
  const pollingInterval = setInterval(() => {
    if (isUnmounted) return;
    fetchChatMessages({ projectId, chatId }).then((latestList) => {
      if (isUnmounted) return;
      if (latestList.length !== currentMessages.length || (latestList.length > 0 && latestList[latestList.length - 1].id !== currentMessages[currentMessages.length - 1]?.id)) {
        currentMessages = latestList;
        // DEBUG 3: Khi onSnapshot nhận dữ liệu real-time qua polling
        console.log(
          '[CHAT DEBUG] 3. onSnapshot nhận dữ liệu real-time (sync):',
          latestList.length,
          'tin nhắn'
        );
        onSnapshotCallback(latestList);
      }
    });
  }, 2500);

  // Return unsubscribe cleanup function
  return () => {
    isUnmounted = true;
    clearInterval(pollingInterval);
    if (eventSource) {
      eventSource.close();
      eventSource = null;
    }
  };
}
