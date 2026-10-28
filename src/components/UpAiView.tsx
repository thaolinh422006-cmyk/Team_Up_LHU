import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Send,
  Presentation,
  CheckSquare,
  Copy,
  Check,
  Bot,
  Loader2,
  Wand2,
  RefreshCw,
  Search,
  Globe,
  Compass,
  Code,
  BookOpen,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { Project, Slide, Task } from '../types';
import { ThemeConfig } from '../utils/theme';

interface UpAiViewProps {
  project: Project;
  theme: ThemeConfig;
  onNavigateTab: (tab: any) => void;
  onOpenAiModal?: () => void;
  onApplyAiSlides: (slides: Slide[]) => void;
  onApplyAiTasks: (tasks: Task[]) => void;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  sources?: Array<{ title?: string; uri?: string }>;
  searchQueries?: string[];
  provider?: string;
}

export const UpAiView: React.FC<UpAiViewProps> = ({
  project,
  theme,
  onNavigateTab,
  onApplyAiSlides,
  onApplyAiTasks,
}) => {
  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'init_msg',
      sender: 'ai',
      text: `Xin chào! Tôi là UP AI, trợ lý trí tuệ nhân tạo làm việc nhóm được kết nối trực tiếp với Google Search và nền tảng Google Gemini.
Tôi liên tục cập nhật và đối chiếu thông tin thời gian thực từ Google để mang lại cho bạn câu trả lời chuẩn xác, tin cậy về mọi chủ đề: kiến thức đời sống, khoa học, tin tức mới, lập trình, giải bài tập hay hỗ trợ công việc và học tập nhóm.
Bạn muốn tra cứu hoặc tìm hiểu thông tin gì từ Google hôm nay?`,
      timestamp: 'Vừa xong',
    },
  ]);
  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Toggle for extra tools (Slide creator & task breakdown)
  const [showToolsDrawer, setShowToolsDrawer] = useState(false);

  // Quick Action: AI Slide Generator
  const [slideTopic, setSlideTopic] = useState(project.name);
  const [slideCount, setSlideCount] = useState(5);
  const [isGeneratingSlides, setIsGeneratingSlides] = useState(false);
  const [slideSuccessMsg, setSlideSuccessMsg] = useState('');

  // Quick Action: AI Task Breakdown
  const [taskGoal, setTaskGoal] = useState(
    `Kế hoạch triển khai dự án ${project.name}`
  );
  const [isGeneratingTasks, setIsGeneratingTasks] = useState(false);
  const [taskSuccessMsg, setTaskSuccessMsg] = useState('');

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoadingChat]);

  // Handle Send Chat
  const handleSendChat = async (customPrompt?: string) => {
    const textToSend = customPrompt || inputPrompt.trim();
    if (!textToSend || isLoadingChat) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputPrompt('');
    setIsLoadingChat(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: textToSend,
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
      let extractedSources: Array<{ title?: string; uri?: string }> = [];
      let extractedQueries: string[] = [];

      if (res.ok) {
        const cType = res.headers.get('content-type') || '';
        if (cType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          rawReply = data?.reply || '';
          if (Array.isArray(data?.sources)) {
            extractedSources = data.sources;
          }
          if (Array.isArray(data?.searchQueries)) {
            extractedQueries = data.searchQueries;
          }
        }
      }

      if (!rawReply) {
        rawReply = 'UP AI đã ghi nhận câu hỏi của bạn. Hệ thống đang sẵn sàng tra cứu thông tin từ Google, bạn hãy gửi lại hoặc trao đổi thêm nhé!';
      }

      // Clean * and # markdown symbols as requested
      const aiReply = rawReply.replace(/[*#]/g, '').trim();

      setMessages((prev) => [
        ...prev,
        {
          id: `ai_${Date.now()}`,
          sender: 'ai',
          text: aiReply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sources: extractedSources,
          searchQueries: extractedQueries,
          provider: 'google_search',
        },
      ]);
    } catch (err) {
      console.warn('UP AI Notice:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'ai',
          text: 'UP AI đã ghi nhận yêu cầu của bạn. Đang đồng bộ kết nối dữ liệu Google Search, vui lòng thử lại sau giây lát nếu cần hỗ trợ thêm!',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoadingChat(false);
    }
  };

  // Handle Generate Slides via AI
  const handleGenerateSlides = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slideTopic.trim() || isGeneratingSlides) return;

    setIsGeneratingSlides(true);
    setSlideSuccessMsg('');

    try {
      const res = await fetch('/api/ai/generate-slides', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: slideTopic,
          slideCount,
        }),
      });

      if (res.ok) {
        const cType = res.headers.get('content-type') || '';
        if (cType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (data && Array.isArray(data.slides) && data.slides.length > 0) {
            onApplyAiSlides(data.slides);
            setSlideSuccessMsg(`Đã tạo thành công ${data.slides.length} slide mới! Bạn có thể chuyển sang tab Tạo Slide.`);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to generate slides:', err);
    } finally {
      setIsGeneratingSlides(false);
    }
  };

  // Handle Generate Tasks Breakdown
  const handleGenerateTasks = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskGoal.trim() || isGeneratingTasks) return;

    setIsGeneratingTasks(true);
    setTaskSuccessMsg('');

    try {
      const res = await fetch('/api/ai/task-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: taskGoal,
          memberCount: project.members.length,
        }),
      });

      if (res.ok) {
        const cType = res.headers.get('content-type') || '';
        if (cType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (data && Array.isArray(data.tasks) && data.tasks.length > 0) {
            const formattedTasks: Task[] = data.tasks.map((t: any, idx: number) => {
              const assignedMember = project.members[idx % project.members.length];
              return {
                id: `task_${Date.now()}_${idx}`,
                projectId: project.id,
                title: t.title || 'Nhiệm vụ mới',
                description: t.description || '',
                assigneeId: assignedMember.id,
                assigneeName: assignedMember.name,
                assigneeAvatar: assignedMember.avatar,
                dueDate: new Date(Date.now() + (idx + 2) * 86400000).toISOString().split('T')[0],
                status: 'todo',
                priority: (t.priority as any) || 'medium',
                tags: [project.category],
              };
            });

            onApplyAiTasks(formattedTasks);
            setTaskSuccessMsg(`Đã chia nhỏ thành ${formattedTasks.length} nhiệm vụ và thêm vào tab Nhiệm vụ & Tiến độ!`);
          }
        }
      }
    } catch (err) {
      console.warn('Failed to generate tasks:', err);
    } finally {
      setIsGeneratingTasks(false);
    }
  };

  const copyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Diverse topics powered by Google Search & Google Gemini
  const quickQuestions = [
    {
      icon: <Globe className="w-3.5 h-3.5 text-blue-500" />,
      label: 'Tra cứu Google: Xu hướng công nghệ & AI',
      prompt: 'Tra cứu thông tin từ Google về những xu hướng công nghệ trí tuệ nhân tạo nổi bật nhất hiện nay.',
    },
    {
      icon: <BookOpen className="w-3.5 h-3.5 text-emerald-500" />,
      label: 'Tìm kiếm Google: Lịch sử & Địa danh',
      prompt: 'Thủ đô của nước Pháp là gì và có những điểm tham quan lịch sử nào nổi tiếng nhất theo dữ liệu Google?',
    },
    {
      icon: <Compass className="w-3.5 h-3.5 text-amber-500" />,
      label: 'Khoa học Google: Nhật thực & Nguyệt thực',
      prompt: 'Giải thích hiện tượng nhật thực và nguyệt thực khác nhau như thế nào một cách khoa học, chuẩn xác?',
    },
    {
      icon: <Code className="w-3.5 h-3.5 text-purple-500" />,
      label: 'Lập trình Google: Lọc số chẵn Python',
      prompt: 'Viết đoạn mã Python ngắn gọn để lọc các số chẵn trong danh sách và tính tổng.',
    },
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner: Google Search & Gemini Intelligence */}
      <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-slate-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 shadow-xl border border-indigo-800/40">
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-500/25 text-blue-200 border border-blue-400/30">
                <Sparkles className="w-3.5 h-3.5 text-blue-300 animate-pulse" />
                UP AI • Google Search & AI
              </span>
              <span className="text-[11px] text-emerald-300 bg-emerald-950/70 border border-emerald-500/30 px-2.5 py-0.5 rounded-full flex items-center gap-1.5">
                <span className="inline-flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                </span>
                <Search className="w-3 h-3 text-emerald-300" />
                Tra cứu thông tin trực tiếp từ Google
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight flex items-center gap-2">
              UP AI - Trợ Lý Thông Tin Google
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 leading-relaxed">
              Trợ lý trí tuệ nhân tạo lấy và đối chiếu dữ liệu thời gian thực trực tiếp từ Google Search và nền tảng Google Gemini. Giải đáp khoa học, kiến thức đời sống, lập trình, viết tài liệu và hỗ trợ công việc nhóm với nguồn tin cậy.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setShowToolsDrawer(!showToolsDrawer)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition-all cursor-pointer min-h-[44px]"
            >
              <Wand2 className="w-3.5 h-3.5 text-indigo-300" />
              <span>{showToolsDrawer ? 'Đóng công cụ phụ' : 'Mở công cụ slide & việc'}</span>
              {showToolsDrawer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Ambient background glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      </div>

      {/* Optional Collapsible Tools Drawer (Slide Generator & Task Breakdown) */}
      {showToolsDrawer && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
          {/* Card 1: Slide Creator */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                <Presentation className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Tạo Bộ Slide Nhanh
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Tự động chuyển slide vào tab <strong>Tạo Slide</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateSlides} className="space-y-2.5">
              <input
                type="text"
                value={slideTopic}
                onChange={(e) => setSlideTopic(e.target.value)}
                placeholder="Chủ đề slide..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-slate-500">{slideCount} trang slide</span>
                <button
                  type="submit"
                  disabled={isGeneratingSlides || !slideTopic.trim()}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                    isGeneratingSlides ? 'bg-indigo-400' : 'bg-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {isGeneratingSlides ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  <span>Tạo Slide</span>
                </button>
              </div>
              {slideSuccessMsg && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{slideSuccessMsg}</p>
              )}
            </form>
          </div>

          {/* Card 2: Task Breakdown */}
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  Phân Rã Nhiệm Vụ
                </h3>
                <p className="text-[10px] text-slate-500 dark:text-slate-400">
                  Thêm đầu việc vào tab <strong>Nhiệm vụ & Tiến độ</strong>
                </p>
              </div>
            </div>

            <form onSubmit={handleGenerateTasks} className="space-y-2.5">
              <input
                type="text"
                value={taskGoal}
                onChange={(e) => setTaskGoal(e.target.value)}
                placeholder="Mục tiêu lớn cần chia nhỏ..."
                className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
              />
              <div className="flex items-center justify-end">
                <button
                  type="submit"
                  disabled={isGeneratingTasks || !taskGoal.trim()}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 cursor-pointer min-h-[36px] ${
                    isGeneratingTasks ? 'bg-emerald-400' : 'bg-emerald-600 hover:bg-emerald-700'
                  }`}
                >
                  {isGeneratingTasks ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
                  <span>Chia Việc</span>
                </button>
              </div>
              {taskSuccessMsg && (
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400">{taskSuccessMsg}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Main Conversation Stream */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col h-[calc(100vh-290px)] min-h-[520px] max-h-[780px] overflow-hidden">
        {/* Chat Stream Header */}
        <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-br from-blue-600 via-indigo-600 to-emerald-600 text-white flex items-center justify-center shadow-xs">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                Hội Thoại UP AI (Google Search Grounding)
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Tra cứu dữ liệu Google thời gian thực • Trả lời tự nhiên không dùng ký hiệu * #
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMessages([messages[0]])}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer min-h-[36px]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
        </div>

        {/* Messages Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.map((m) => {
            const isAi = m.sender === 'ai';
            return (
              <div
                key={m.id}
                className={`flex gap-3 ${isAi ? 'justify-start' : 'justify-end'}`}
              >
                {isAi && (
                  <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[92%] sm:max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed space-y-2.5 ${
                    isAi
                      ? 'bg-slate-50 dark:bg-slate-800/90 text-slate-900 dark:text-slate-100 border border-slate-100 dark:border-slate-800 rounded-tl-xs shadow-2xs'
                      : `${theme.primary} rounded-tr-xs shadow-xs`
                  }`}
                >
                  {/* Search query tag if present */}
                  {isAi && m.searchQueries && m.searchQueries.length > 0 && (
                    <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium bg-blue-100/70 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200/50 dark:border-blue-800/50">
                      <Search className="w-2.5 h-2.5 text-blue-500" />
                      <span>Google Search: "{m.searchQueries[0]}"</span>
                    </div>
                  )}

                  <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>

                  {/* Google Search Sources Card */}
                  {isAi && m.sources && m.sources.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/70 dark:border-slate-700/70 space-y-1.5">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        <Search className="w-3 h-3 text-blue-500" />
                        <span>Nguồn thông tin từ Google Search:</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {m.sources.map((src, idx) => {
                          let domain = '';
                          try {
                            domain = src.uri ? new URL(src.uri).hostname.replace(/^www\./, '') : '';
                          } catch {
                            domain = 'google.com';
                          }
                          return (
                            <a
                              key={idx}
                              href={src.uri}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200/70 dark:border-blue-800/70 transition-all shadow-2xs max-w-full"
                              title={src.title || src.uri}
                            >
                              <Globe className="w-3 h-3 shrink-0 text-blue-500" />
                              <span className="truncate max-w-[200px]">{src.title || domain}</span>
                              <ExternalLink className="w-2.5 h-2.5 shrink-0 opacity-60" />
                            </a>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1.5 border-t border-black/5 dark:border-white/5 text-[10px] opacity-70">
                    <span className="flex items-center gap-1">
                      {isAi && (
                        <span className="inline-flex gap-0.5 mr-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-yellow-400"></span>
                          <span className="w-1.5 h-1.5 rounded-full bg-green-400"></span>
                        </span>
                      )}
                      {m.timestamp}
                    </span>
                    {isAi && (
                      <button
                        type="button"
                        onClick={() => copyText(m.id, m.text)}
                        className="flex items-center gap-1 hover:opacity-100 transition-opacity cursor-pointer p-1"
                        title="Sao chép nội dung"
                      >
                        {copiedId === m.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Đã sao chép</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
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

          {isLoadingChat && (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center">
                <Loader2 className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-blue-50 dark:bg-blue-950/40 px-3.5 py-2 rounded-2xl text-xs text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900 flex items-center gap-2">
                <span className="inline-flex gap-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-bounce [animation-delay:0.15s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-bounce [animation-delay:0.3s]"></span>
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-bounce [animation-delay:0.45s]"></span>
                </span>
                <span>UP AI đang tra cứu và đối chiếu thông tin từ Google...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar & Suggestion Chips */}
        <div className="p-3 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 space-y-2.5">
          {/* Quick Questions Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
            <span className="font-semibold text-slate-400 shrink-0 hidden sm:inline">Gợi ý Google:</span>
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendChat(q.prompt)}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors shrink-0 shadow-2xs cursor-pointer min-h-[32px]"
              >
                {q.icon}
                <span className="whitespace-nowrap">{q.label}</span>
              </button>
            ))}
          </div>

          {/* Form Input */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendChat();
            }}
            className="flex items-center gap-2"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              placeholder="Tra cứu bất kỳ thông tin gì qua Google (khoa học, đời sống, lập trình, công việc...)..."
              disabled={isLoadingChat}
              className="flex-1 px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs sm:text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500 shadow-2xs min-h-[44px]"
            />
            <button
              type="submit"
              disabled={isLoadingChat || !inputPrompt.trim()}
              className={`p-2.5 rounded-xl text-white transition-all cursor-pointer min-w-[44px] min-h-[44px] flex items-center justify-center ${
                inputPrompt.trim() && !isLoadingChat
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
