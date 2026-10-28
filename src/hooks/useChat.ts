import { useState, useEffect, useCallback, useMemo } from 'react';
import { ChatMessage, Member } from '../types';
import {
  createDirectChatId,
  createChannelChatId,
  sendChatMessage,
  subscribeToChatMessages,
} from '../services/chatService';

interface UseChatOptions {
  projectId: string;
  currentUser: Member | null;
  selectedRecipientId?: string | null;
  selectedChannelId?: string;
  initialMessages?: ChatMessage[];
}

export function useChat({
  projectId,
  currentUser,
  selectedRecipientId,
  selectedChannelId = 'ch_main',
  initialMessages = [],
}: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 1. Tính toán Chat ID nhất quán
  const activeChatId = useMemo(() => {
    if (!currentUser || !currentUser.id) return '';
    if (selectedRecipientId) {
      // 1-1 Direct message: [uid1, uid2].sort().join('_')
      return createDirectChatId(currentUser.id, selectedRecipientId);
    }
    // Group chat: grp_${projectId}_${channelId}
    return createChannelChatId(projectId, selectedChannelId);
  }, [currentUser?.id, selectedRecipientId, projectId, selectedChannelId]);

  // 2. Real-time onSnapshot subscription
  useEffect(() => {
    if (!activeChatId || !projectId) return;

    setError(null);
    const unsubscribe = subscribeToChatMessages(
      activeChatId,
      projectId,
      (updatedList) => {
        setMessages(updatedList);
      },
      (err) => {
        console.warn('[CHAT DEBUG] onSnapshot error:', err);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [activeChatId, projectId]);

  // 3. Hàm sendMessage
  const sendMessage = useCallback(
    async (params: {
      text: string;
      type?: 'text' | 'file' | 'image' | 'system';
      fileUrl?: string;
      fileName?: string;
      fileSize?: string;
      isAi?: boolean;
    }) => {
      if (!currentUser || !currentUser.id) {
        console.error('[CHAT DEBUG] Không thể gửi tin nhắn: currentUser không tồn tại');
        setError('Người dùng chưa đăng nhập');
        return;
      }

      setIsSending(true);
      setError(null);

      try {
        const sentMsg = await sendChatMessage({
          projectId,
          sender: currentUser,
          text: params.text,
          receiverId: selectedRecipientId || undefined,
          channelId: selectedRecipientId ? undefined : selectedChannelId,
          type: params.type || 'text',
          fileUrl: params.fileUrl,
          fileName: params.fileName,
          fileSize: params.fileSize,
          isAi: params.isAi,
        });

        // Cập nhật lạc quan (optimistic) nếu tin nhắn chưa có trong danh sách
        setMessages((prev) => {
          if (prev.some((m) => m.id === sentMsg.id)) return prev;
          return [...prev, sentMsg].sort((a, b) => {
            const tA = new Date(a.createdAt || a.timestamp).getTime() || 0;
            const tB = new Date(b.createdAt || b.timestamp).getTime() || 0;
            return tA - tB;
          });
        });

        return sentMsg;
      } catch (err: any) {
        console.error('[CHAT DEBUG] Lỗi khi gửi tin nhắn:', err);
        setError(err?.message || 'Gửi tin nhắn thất bại');
        throw err;
      } finally {
        setIsSending(false);
      }
    },
    [currentUser, projectId, selectedRecipientId, selectedChannelId]
  );

  return {
    messages,
    setMessages,
    sendMessage,
    activeChatId,
    isSending,
    error,
  };
}
