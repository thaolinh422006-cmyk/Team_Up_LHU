import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Send,
  Lightbulb,
  FileText,
  Palette,
  Users,
  Copy,
  Check,
  Bot,
  RefreshCw,
} from 'lucide-react';
import { Project } from '../types';
import { ThemeConfig } from '../utils/theme';

interface AiAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project;
  theme: ThemeConfig;
}

interface AiMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export const AiAssistantModal: React.FC<AiAssistantModalProps> = ({
  isOpen,
  onClose,
  project,
  theme,
}) => {
  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'ai_init',
      sender: 'ai',
      text: `Tôi sẵn sàng hỗ trợ nhóm cho dự án ${project.name}. Bạn có thể đặt câu hỏi về ý tưởng, nội dung báo cáo, cấu trúc slide hoặc phân chia công việc.`,
      timestamp: 'Vừa xong',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSend = async (customPrompt?: string) => {
    const promptToSend = customPrompt || input.trim();
    if (!promptToSend || isLoading) return;

    const userMsg: AiMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptToSend,
          projectContext: {
            name: project.name,
            category: project.category,
            description: project.description,
            members: project.members.map((m) => m.name),
          },
          history: messages.map((m) => ({ sender: m.sender, text: m.text })),
        }),
      });

      let rawReply = '';
      if (res.ok) {
        const cType = res.headers.get('content-type') || '';
        if (cType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          rawReply = data?.reply || '';
        }
      }

      if (!rawReply) {
        rawReply = 'UP AI đã ghi nhận ý kiến của bạn. Bạn có thể nêu rõ hơn nội dung cần giải đáp để nhận phản hồi tốt nhất.';
      }

      const aiReply = rawReply.replace(/[*#]/g, '').trim();

      const aiMsg: AiMessage = {
        id: `ai_${Date.now()}`,
        sender: 'ai',
        text: aiReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.warn('AI Notice:', err);
      const errMsg: AiMessage = {
        id: `ai_err_${Date.now()}`,
        sender: 'ai',
        text: 'Có lỗi kết nối tạm thời với máy chủ AI. Bạn hãy thử lại sau giây lát nhé!',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const quickPrompts = [
    {
      icon: <Lightbulb className="w-3.5 h-3.5 text-amber-500" />,
      label: 'Ý tưởng sáng tạo đề tài',
      prompt: `Gợi ý cho nhóm 3 ý tưởng độc đáo, thiết thực để mở rộng đề tài "${project.name}" nhằm đạt điểm cao.`,
    },
    {
      icon: <FileText className="w-3.5 h-3.5 text-indigo-500" />,
      label: 'Dàn ý slide 5 phần chuẩn',
      prompt: `Xây dựng dàn bài chi tiết 5 phần cho bài thuyết trình môn ${project.category} với các luận điểm thuyết phục.`,
    },
    {
      icon: <Palette className="w-3.5 h-3.5 text-rose-500" />,
      label: 'Cách mở đầu ấn tượng',
      prompt: `Viết đoạn mở đầu bài thuyết trình (Hook) trong vòng 60 giây đầu tiên để thu hút toàn bộ hội trường.`,
    },
    {
      icon: <Users className="w-3.5 h-3.5 text-emerald-500" />,
      label: 'Gợi ý phân công nhóm',
      prompt: `Nhóm có ${project.members.length} thành viên gồm các bạn: ${project.members.map((m) => m.name).join(', ')}. Hãy gợi ý cách phân chia vai trò và công việc hợp lý nhất.`,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 max-w-2xl w-full h-[620px] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/60 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-linear-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                  Trợ Lý AI Team Up
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                  Gemini Flash
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Đồng hành cùng nhóm: {project.name}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Suggestions Chips */}
        <div className="px-6 py-2.5 border-b border-slate-100 dark:border-slate-800/60 bg-slate-50/30 dark:bg-slate-900/30 flex items-center gap-2 overflow-x-auto scrollbar-none">
          {quickPrompts.map((q, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => handleSend(q.prompt)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-slate-700 dark:text-slate-300 whitespace-nowrap shadow-2xs transition-colors shrink-0"
            >
              {q.icon}
              <span>{q.label}</span>
            </button>
          ))}
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((m) => {
            const isMe = m.sender === 'user';
            return (
              <div
                key={m.id}
                className={`flex items-start gap-3 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isMe
                      ? 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200'
                      : 'bg-indigo-100 dark:bg-indigo-950 text-indigo-600'
                  }`}
                >
                  {isMe ? <Users className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                <div className={`max-w-lg space-y-1 ${isMe ? 'items-end' : 'items-start'}`}>
                  <div
                    className={`p-4 rounded-2xl text-xs leading-relaxed ${
                      isMe
                        ? `${theme.primary} rounded-tr-xs shadow-xs`
                        : 'bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-700/60 rounded-tl-xs shadow-2xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{m.text}</div>
                  </div>

                  <div className={`flex items-center gap-2 text-[10px] text-slate-400 ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <span>{m.timestamp}</span>
                    {!isMe && (
                      <button
                        type="button"
                        onClick={() => handleCopy(m.id, m.text)}
                        className="hover:text-indigo-600 flex items-center gap-1"
                        title="Sao chép nội dung"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-500" />
                            <span>Đã chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Sao chép</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 flex items-center justify-center">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-500 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
                <span>Trợ lý AI đang soạn câu trả lời chi tiết cho bạn...</span>
              </div>
            </div>
          )}
        </div>

        {/* Input Footer */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              placeholder="Đặt câu hỏi, yêu cầu gợi ý dàn ý, phân công hoặc nội dung slide..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 px-4 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <button
              id="btn-submit-ai-prompt"
              type="submit"
              disabled={isLoading || !input.trim()}
              className={`p-2.5 rounded-xl transition-all ${
                input.trim() && !isLoading
                  ? `${theme.primary} shadow-sm`
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
