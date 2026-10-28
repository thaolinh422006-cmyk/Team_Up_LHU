import React, { useState } from 'react';
import {
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Calendar,
  Sparkles,
  Filter,
  User,
  MoreVertical,
  Trash2,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Task, TaskStatus, TaskPriority, Member, Project } from '../types';
import { ThemeConfig } from '../utils/theme';

interface TaskBoardViewProps {
  project: Project;
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id'>) => void;
  onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  theme: ThemeConfig;
}

export const TaskBoardView: React.FC<TaskBoardViewProps> = ({
  project,
  tasks,
  onAddTask,
  onUpdateTaskStatus,
  onDeleteTask,
  theme,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneeId, setAssigneeId] = useState(project.members[0]?.id || '');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<TaskPriority>('medium');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [isAiBreakingDown, setIsAiBreakingDown] = useState(false);
  const [mobileColumnFilter, setMobileColumnFilter] = useState<'all' | 'todo' | 'in_progress' | 'completed'>('all');

  // Filter tasks for this project
  const projectTasks = tasks.filter((t) => t.projectId === project.id);
  const filteredTasks = projectTasks.filter((t) =>
    filterAssignee === 'all' ? true : t.assigneeId === filterAssignee
  );

  const todoTasks = filteredTasks.filter((t) => t.status === 'todo');
  const inProgressTasks = filteredTasks.filter((t) => t.status === 'in_progress');
  const completedTasks = filteredTasks.filter((t) => t.status === 'completed');

  const progressPercent =
    projectTasks.length === 0
      ? 0
      : Math.round(
          (projectTasks.filter((t) => t.status === 'completed').length /
            projectTasks.length) *
            100
        );

  const handleStatusChangeWithConfetti = (taskId: string, newStatus: TaskStatus) => {
    onUpdateTaskStatus(taskId, newStatus);
    if (newStatus === 'completed') {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 },
        });
      } catch {
        // Confetti optional
      }
    }
  };

  // Use real project members for task assignment
  const availableMembers = React.useMemo(() => {
    return project.members && project.members.length > 0 ? project.members : [];
  }, [project.members]);

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const assignedMember = availableMembers.find((m) => m.id === assigneeId) || availableMembers[0];

    onAddTask({
      projectId: project.id,
      title: title.trim(),
      description: description.trim(),
      assigneeId: assignedMember.id,
      assigneeName: assignedMember.name,
      assigneeAvatar: assignedMember.avatar,
      dueDate: dueDate || new Date(Date.now() + 3 * 86400000).toISOString().split('T')[0],
      status: 'todo',
      priority,
      tags: ['Nhiệm vụ mới'],
    });

    setTitle('');
    setDescription('');
    setShowAddModal(false);
  };

  // AI Task Breakdown Helper
  const handleAiTaskBreakdown = async () => {
    setIsAiBreakingDown(true);
    try {
      const res = await fetch('/api/ai/task-breakdown', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectTitle: project.name,
          projectGoal: project.description,
          members: project.members.map((m) => ({ name: m.name })),
        }),
      });

      if (res.ok) {
        const cType = res.headers.get('content-type') || '';
        if (cType.includes('application/json')) {
          const data = await res.json().catch(() => null);
          if (data?.tasks && data.tasks.length > 0) {
            data.tasks.forEach((t: any, idx: number) => {
              const assignedMember =
                project.members[idx % project.members.length] || project.members[0];

              const due = new Date(Date.now() + (t.estimatedDays || idx + 2) * 86400000)
                .toISOString()
                .split('T')[0];

              onAddTask({
                projectId: project.id,
                title: t.title,
                description: t.description,
                assigneeId: assignedMember.id,
                assigneeName: assignedMember.name,
                assigneeAvatar: assignedMember.avatar,
                dueDate: due,
                status: idx === 0 ? 'in_progress' : 'todo',
                priority: (t.priority as any) || 'medium',
                tags: ['AI Gợi ý'],
              });
            });

            try {
              confetti({
                particleCount: 70,
                spread: 70,
                origin: { y: 0.6 },
              });
            } catch {}
          }
        }
      }
    } catch (err) {
      console.error('Failed to breakdown tasks:', err);
    } finally {
      setIsAiBreakingDown(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Progress Bar & Controls */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                Bảng Phân Công & Theo Dõi Tiến Độ
              </h2>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold">
                {projectTasks.length} nhiệm vụ
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Kéo chuyển trạng thái hoặc bấm trực tiếp để cập nhật tiến trình làm bài tập nhóm
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* AI Task Generator */}
            <button
              id="btn-ai-task-breakdown"
              type="button"
              onClick={handleAiTaskBreakdown}
              disabled={isAiBreakingDown}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 transition-all shadow-xs"
            >
              <Sparkles className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span>{isAiBreakingDown ? 'AI Đang Phân Tích...' : 'AI Phân Công Tự Động'}</span>
            </button>

            {/* Add Task Button */}
            <button
              id="btn-open-add-task-modal"
              type="button"
              onClick={() => setShowAddModal(true)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold ${theme.primary} shadow-sm transition-all`}
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Nhiệm Vụ Mới</span>
            </button>
          </div>
        </div>

        {/* Progress bar visual */}
        <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-500" />
              Tiến Độ Dự Án: {completedTasks.length} / {projectTasks.length} việc hoàn thành
            </span>
            <span className={theme.textLight}>{progressPercent}%</span>
          </div>
          <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
            <div
              className={`h-full bg-linear-to-r ${theme.gradient} transition-all duration-500`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Filter row & Mobile Column Segmented Control */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs pt-1">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-500">Lọc theo thành viên:</span>
            <select
              value={filterAssignee}
              onChange={(e) => setFilterAssignee(e.target.value)}
              className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-700 dark:text-slate-300 focus:outline-hidden"
            >
              <option value="all">Tất cả thành viên</option>
              {project.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Mobile column tabs (Smartphones only) */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl md:hidden overflow-x-auto">
            <button
              type="button"
              onClick={() => setMobileColumnFilter('all')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center whitespace-nowrap ${
                mobileColumnFilter === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Tất cả ({filteredTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileColumnFilter('todo')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center whitespace-nowrap ${
                mobileColumnFilter === 'todo'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Chờ làm ({todoTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileColumnFilter('in_progress')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center whitespace-nowrap ${
                mobileColumnFilter === 'in_progress'
                  ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Đang làm ({inProgressTasks.length})
            </button>
            <button
              type="button"
              onClick={() => setMobileColumnFilter('completed')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all text-center whitespace-nowrap ${
                mobileColumnFilter === 'completed'
                  ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-200 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-400'
              }`}
            >
              Xong ({completedTasks.length})
            </button>
          </div>
        </div>
      </div>

      {/* 3 Column Kanban Board (Responsive with Mobile Column Toggle) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
        {/* Column 1: Chưa bắt đầu (To Do) */}
        <div className={`bg-slate-50/70 dark:bg-slate-900/60 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 flex-col min-h-[380px] sm:min-h-[450px] ${
          mobileColumnFilter === 'all' || mobileColumnFilter === 'todo' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-400" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Chưa Bắt Đầu
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
              {todoTasks.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {todoTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdateStatus={handleStatusChangeWithConfetti}
                onDelete={onDeleteTask}
                theme={theme}
              />
            ))}
            {todoTasks.length === 0 && (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                Không có việc tồn đọng
              </div>
            )}
          </div>
        </div>

        {/* Column 2: Đang thực hiện (In Progress) */}
        <div className={`bg-amber-50/30 dark:bg-slate-900/60 rounded-2xl p-4 border border-amber-200/60 dark:border-slate-800 flex-col min-h-[380px] sm:min-h-[450px] ${
          mobileColumnFilter === 'all' || mobileColumnFilter === 'in_progress' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-amber-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                Đang Thực Hiện
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400">
              {inProgressTasks.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {inProgressTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdateStatus={handleStatusChangeWithConfetti}
                onDelete={onDeleteTask}
                theme={theme}
              />
            ))}
            {inProgressTasks.length === 0 && (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-amber-200/60 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                Chưa có việc nào đang chạy
              </div>
            )}
          </div>
        </div>

        {/* Column 3: Đã hoàn thành (Done) */}
        <div className={`bg-emerald-50/30 dark:bg-slate-900/60 rounded-2xl p-4 border border-emerald-200/60 dark:border-slate-800 flex-col min-h-[380px] sm:min-h-[450px] ${
          mobileColumnFilter === 'all' || mobileColumnFilter === 'completed' ? 'flex' : 'hidden md:flex'
        }`}>
          <div className="flex items-center justify-between mb-3 pb-2 border-b border-emerald-200 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500" />
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                Đã Hoàn Thành
              </h3>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400">
              {completedTasks.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto pr-1">
            {completedTasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onUpdateStatus={handleStatusChangeWithConfetti}
                onDelete={onDeleteTask}
                theme={theme}
              />
            ))}
            {completedTasks.length === 0 && (
              <div className="h-32 flex items-center justify-center border-2 border-dashed border-emerald-200/60 dark:border-slate-800 rounded-xl text-xs text-slate-400">
                Chưa có nhiệm vụ hoàn tất
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 max-w-md w-full rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Giao Nhiệm Vụ Mới Cho Nhóm
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Tên công việc / Đầu mục
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thiết kế slide bài học chương 3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Mô tả chi tiết & yêu cầu
                </label>
                <textarea
                  rows={2}
                  placeholder="Ghi chú cụ thể các mục tiêu cần đạt được..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Chỉ định người thực hiện <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={assigneeId}
                    onChange={(e) => setAssigneeId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    {availableMembers.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                    Mức độ ưu tiên
                  </label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  >
                    <option value="low">Thấp</option>
                    <option value="medium">Trung bình</option>
                    <option value="high">Khẩn cấp / Cao</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Hạn chót hoàn thành (Deadline)
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className={`px-4 py-2 text-xs font-bold rounded-xl ${theme.primary} shadow-sm`}
                >
                  Tạo Nhiệm Vụ
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

interface TaskCardProps {
  task: Task;
  onUpdateStatus: (taskId: string, newStatus: TaskStatus) => void;
  onDelete: (taskId: string) => void;
  theme: ThemeConfig;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onUpdateStatus, onDelete, theme }) => {
  const isDone = task.status === 'completed';
  const isInProg = task.status === 'in_progress';

  return (
    <div className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all space-y-2.5 group">
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
            task.priority === 'high'
              ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
              : task.priority === 'medium'
              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600'
          }`}
        >
          {task.priority === 'high' ? 'Khẩn cấp' : task.priority === 'medium' ? 'Bình thường' : 'Thấp'}
        </span>

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          className="text-slate-400 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
          title="Xóa nhiệm vụ"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div>
        <h4 className={`text-xs sm:text-sm font-bold text-slate-900 dark:text-white leading-snug ${isDone ? 'line-through text-slate-400' : ''}`}>
          {task.title}
        </h4>
        {task.description && (
          <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-1">
            {task.description}
          </p>
        )}
      </div>

      {/* Assignee & Due date */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
        <div className="flex items-center gap-1.5 min-w-0" title={`Phụ trách: ${task.assigneeName}`}>
          <img
            src={task.assigneeAvatar}
            alt={task.assigneeName}
            className="w-5 h-5 rounded-full object-cover"
            referrerPolicy="no-referrer"
          />
          <span className="text-slate-700 dark:text-slate-300 font-medium truncate max-w-[90px]">
            {task.assigneeName.split(' ')[0]}
          </span>
        </div>

        <span className="flex items-center gap-1 text-slate-400 text-[10px]">
          <Clock className="w-3 h-3" />
          {task.dueDate}
        </span>
      </div>

      {/* Quick Move Action buttons */}
      <div className="grid grid-cols-3 gap-1 pt-1">
        <button
          type="button"
          onClick={() => onUpdateStatus(task.id, 'todo')}
          className={`py-1.5 min-h-[32px] rounded-lg text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center ${
            task.status === 'todo'
              ? 'bg-slate-200 dark:bg-slate-800 font-bold text-slate-900 dark:text-white'
              : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          Chờ làm
        </button>
        <button
          type="button"
          onClick={() => onUpdateStatus(task.id, 'in_progress')}
          className={`py-1.5 min-h-[32px] rounded-lg text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center ${
            isInProg
              ? 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 font-bold'
              : 'text-slate-400 hover:bg-amber-50 dark:hover:bg-slate-800'
          }`}
        >
          Đang làm
        </button>
        <button
          type="button"
          onClick={() => onUpdateStatus(task.id, 'completed')}
          className={`py-1.5 min-h-[32px] rounded-lg text-[10px] sm:text-[11px] font-semibold transition-colors cursor-pointer flex items-center justify-center ${
            isDone
              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 font-bold'
              : 'text-slate-400 hover:bg-emerald-50 dark:hover:bg-slate-800'
          }`}
        >
          Xong ✓
        </button>
      </div>
    </div>
  );
};
