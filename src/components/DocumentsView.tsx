import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Presentation,
  Image as ImageIcon,
  Download,
  Search,
  Tag,
  Trash2,
  Upload,
  X,
  Eye,
  AlertCircle,
  FileQuestion,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { DocumentResource, Project } from '../types';
import { ThemeConfig } from '../utils/theme';

interface DocumentsViewProps {
  project: Project;
  documents: DocumentResource[];
  onAddDocument: (doc: DocumentResource | Omit<DocumentResource, 'id'>) => void;
  onDeleteDocument: (docId: string) => void;
  theme: ThemeConfig;
}

export const DocumentsView: React.FC<DocumentsViewProps> = ({
  project,
  documents,
  onAddDocument,
  onDeleteDocument,
  theme,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [previewDoc, setPreviewDoc] = useState<DocumentResource | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Close modal when pressing Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setPreviewDoc(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Local state taiLieuList to guarantee instant reactive update when saving
  const [taiLieuList, setTaiLieuList] = useState<DocumentResource[]>(() => {
    return documents.filter((d) => !d.projectId || d.projectId === project.id);
  });

  // Keep taiLieuList synchronized with documents prop
  useEffect(() => {
    setTaiLieuList(documents.filter((d) => !d.projectId || d.projectId === project.id));
  }, [documents, project.id]);

  // Helper to ensure PDF, PPT, and image always have a working preview URL for iframe/img
  const getFilePreviewUrl = (doc: DocumentResource): string => {
    if (doc.fileUrl) return doc.fileUrl;
    if (doc.url) return doc.url;

    if (doc.type === 'pdf') {
      try {
        const pdf = new jsPDF();
        pdf.setFillColor(248, 250, 252);
        pdf.rect(0, 0, 210, 297, 'F');
        pdf.setFontSize(20);
        pdf.setTextColor(225, 29, 72);
        pdf.text('TEAM UP - HO SO TAI LIEU NHOM', 15, 22);
        pdf.setFontSize(13);
        pdf.setTextColor(15, 23, 42);
        pdf.text(`Ten tai lieu: ${doc.name}`, 15, 34);
        pdf.setFontSize(10);
        pdf.setTextColor(100, 116, 139);
        pdf.text(`Nguoi dang: ${doc.uploaderName} | Dung luong: ${doc.size} | Ngay: ${doc.uploadedAt}`, 15, 42);
        pdf.setDrawColor(226, 232, 240);
        pdf.line(15, 46, 195, 46);
        pdf.setFontSize(11);
        pdf.setTextColor(30, 41, 59);
        pdf.text('TOM TAT NOI DUNG & DE CUONG DU AN:', 15, 56);
        const desc = pdf.splitTextToSize(doc.description || 'De cuong nghien cuu AI trong giao duc 2026.', 175);
        pdf.setFontSize(10);
        pdf.setTextColor(71, 85, 105);
        pdf.text(desc, 15, 65);
        pdf.setFontSize(10);
        pdf.setTextColor(30, 41, 59);
        pdf.text('MUC LUC DE CUONG:', 15, 85);
        pdf.setTextColor(71, 85, 105);
        pdf.text('1. Tong quan ve tinh hinh nghien cuu & boi canh thuc tien', 20, 93);
        pdf.text('2. Muc tieu tong quat va cac muc tieu cu the cua de tai', 20, 101);
        pdf.text('3. Phuong phap thu thap du lieu & mau khao sat sinh vien', 20, 109);
        pdf.text('4. Tien do trien khai, phan cong nhiem vu cac thanh vien', 20, 117);
        pdf.text('5. San pham du kien va bao cao ket qua nghiem thu', 20, 125);
        const blob = pdf.output('blob');
        return URL.createObjectURL(blob);
      } catch (err) {
        console.error('Failed to generate PDF preview', err);
      }
    }

    if (doc.type === 'ppt') {
      const pptHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${doc.name}</title>
<style>
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: white; margin: 0; padding: 24px; text-align: center; }
.slide { background: #ffffff; color: #0f172a; max-width: 820px; margin: 20px auto; padding: 40px; border-radius: 20px; box-shadow: 0 12px 30px rgba(0,0,0,0.5); text-align: left; border: 1px solid #e2e8f0; }
.badge { background: #fef3c7; color: #b45309; padding: 4px 10px; border-radius: 6px; font-weight: bold; font-size: 11px; display: inline-block; margin-bottom: 12px; }
h1 { margin: 0 0 10px 0; font-size: 26px; color: #0f172a; }
p { color: #475569; font-size: 14px; line-height: 1.6; }
</style></head><body>
<div style="margin-bottom: 20px;">
  <h2 style="color: #f59e0b; margin: 0;">Xem trước Bài Thuyết Trình (.ppt)</h2>
  <p style="color: #94a3b8; font-size: 13px;">${doc.name} • ${doc.uploaderName}</p>
</div>
<div class="slide">
  <div class="badge">Trang 1 / 3 • Slide Tiêu Đề</div>
  <h1>${doc.name.replace('.ppt', '')}</h1>
  <p>${doc.description}</p>
</div>
<div class="slide">
  <div class="badge">Trang 2 / 3 • Nội Dung Chính</div>
  <h1>Nội Dung Nghiên Cứu & Trình Bày Nhóm</h1>
  <p>• Phân tích khảo sát sinh viên và thực trạng ứng dụng công nghệ</p>
  <p>• Đề xuất giải pháp và mô hình làm việc nhóm tối ưu qua TEAM UP</p>
</div>
</body></html>`;
      const blob = new Blob([pptHtml], { type: 'text/html' });
      return URL.createObjectURL(blob);
    }

    if (doc.type === 'image') {
      return 'https://images.unsplash.com/photo-1557804506-669a67965ba0?w=1200';
    }

    return '';
  };

  const filteredDocs = taiLieuList.filter((d) => {
    const matchesSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = selectedType === 'all' || d.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getDocIcon = (t: DocumentResource['type'], className = 'w-5 h-5') => {
    switch (t) {
      case 'pdf':
        return <FileText className={`${className} text-rose-500`} />;
      case 'ppt':
        return <Presentation className={`${className} text-amber-500`} />;
      case 'sheet':
        return <FileSpreadsheet className={`${className} text-emerald-500`} />;
      case 'image':
        return <ImageIcon className={`${className} text-sky-500`} />;
      case 'doc':
      default:
        return <FileText className={`${className} text-indigo-500`} />;
    }
  };

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newDocs: DocumentResource[] = [];

    for (let i = 0; i < files.length; i++) {
      const file: File = files[i];
      const ext = file.name.split('.').pop()?.toLowerCase() || '';
      let docType: DocumentResource['type'] = 'pdf';
      let defaultTag = 'Tài liệu';

      if (['ppt', 'pptx'].includes(ext)) {
        docType = 'ppt';
        defaultTag = 'Slide PPT';
      } else if (['xls', 'xlsx', 'csv'].includes(ext)) {
        docType = 'sheet';
        defaultTag = 'Bảng tính Excel';
      } else if (['doc', 'docx', 'txt'].includes(ext)) {
        docType = 'doc';
        defaultTag = 'Văn bản Word';
      } else if (['png', 'jpg', 'jpeg', 'gif', 'webp'].includes(ext)) {
        docType = 'image';
        defaultTag = 'Hình ảnh';
      } else if (ext === 'pdf') {
        docType = 'pdf';
        defaultTag = 'Báo cáo PDF';
      }

      const sizeInMB = (file.size / (1024 * 1024)).toFixed(1);
      const sizeFormatted =
        file.size >= 1024 * 1024
          ? `${sizeInMB} MB`
          : `${Math.max(1, Math.round(file.size / 1024))} KB`;

      // 1. Lưu file bằng URL.createObjectURL từ ổ đĩa local
      const objectUrl = URL.createObjectURL(file);

      const docItem: DocumentResource = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        projectId: project.id,
        name: file.name,
        type: docType,
        size: sizeFormatted,
        uploaderName: 'Linh Thảo (Bạn)',
        uploaderAvatar:
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
        uploadedAt: 'Hôm nay',
        url: objectUrl,
        fileUrl: objectUrl,
        description: `Tệp tải lên từ ổ đĩa máy tính: ${file.name} (${sizeFormatted})`,
        tags: [defaultTag, 'Ổ đĩa'],
      };

      newDocs.push(docItem);
      onAddDocument(docItem);
    }

    // 2. Hiển thị file mới thêm vào danh sách ngay lập tức
    setTaiLieuList((prev) => [...newDocs, ...prev]);

    // Reset input value to allow selecting same file again if desired
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDelete = (docId: string) => {
    setTaiLieuList((prev) => prev.filter((d) => d.id !== docId));
    onDeleteDocument(docId);
    if (previewDoc?.id === docId) {
      setPreviewDoc(null);
    }
  };

  const handleDownload = (doc: DocumentResource) => {
    if (doc.url && doc.url.startsWith('blob:')) {
      const link = document.createElement('a');
      link.href = doc.url;
      link.download = doc.name;
      link.click();
    } else {
      const mime =
        doc.type === 'ppt'
          ? 'application/vnd.ms-powerpoint'
          : doc.type === 'sheet'
          ? 'application/vnd.ms-excel'
          : doc.type === 'doc'
          ? 'application/msword'
          : 'application/pdf';
      const blob = new Blob(
        [
          `Tài liệu: ${doc.name}\nLoại tệp: ${doc.type}\nDung lượng: ${doc.size}\nNgười tải lên: ${doc.uploaderName}\nMô tả tóm tắt: ${doc.description}\n`,
        ],
        { type: `${mime};charset=utf-8` }
      );
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = doc.name.includes('.') ? doc.name : `${doc.name}.${doc.type}`;
      link.click();
      URL.revokeObjectURL(blobUrl);
    }
  };

  return (
    <div className="space-y-6">
      {/* Hidden File Picker from local disk */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.pptx,.ppt,.xlsx,.xls,.docx,.doc,.png,.jpg,.jpeg,.gif,.webp"
        onChange={handleFilesSelected}
        className="hidden"
      />

      {/* Header Bar */}
      <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">
            Kho Lưu Trữ & Chia Sẻ Tài Liệu Nhóm
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Tập trung tất cả giáo trình, đề cương, dữ liệu khảo sát và tệp đính kèm ở một nơi thống nhất (Bấm vào tệp để xem trước)
          </p>
        </div>

        {/* Nút duy nhất: + Tải File Từ Ổ Đĩa */}
        <button
          id="btn-upload-document"
          type="button"
          onClick={() => fileInputRef.current?.click()}
          style={{ backgroundColor: 'var(--primary-color)' }}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white shadow-sm hover:opacity-90 transition-all cursor-pointer shrink-0"
        >
          <Upload className="w-4 h-4" />
          <span>+ Tải File Từ Ổ Đĩa</span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative max-w-md w-full">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm kiếm tài liệu, thẻ tag, tên tệp..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { id: 'all', label: 'Tất cả' },
            { id: 'pdf', label: 'Báo cáo PDF' },
            { id: 'ppt', label: 'Slide PPT' },
            { id: 'sheet', label: 'Số liệu Sheet' },
            { id: 'doc', label: 'Văn bản Word' },
            { id: 'image', label: 'Hình ảnh' },
          ].map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedType(cat.id)}
              className={`px-3 py-1.5 rounded-lg font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                selectedType === cat.id
                  ? `${theme.bgLight} ${theme.textLight} font-bold shadow-2xs`
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredDocs.map((doc) => (
          <div
            key={doc.id}
            id={`doc-card-${doc.id}`}
            role="button"
            tabIndex={0}
            onClick={() => setPreviewDoc(doc)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setPreviewDoc(doc);
              }
            }}
            title="Bấm vào để xem trước tài liệu"
            className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xs hover:shadow-md hover:border-indigo-400 dark:hover:border-indigo-600 transition-all flex flex-col justify-between space-y-3 group cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
          >
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div
                  onClick={() => setPreviewDoc(doc)}
                  className="p-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform"
                >
                  {getDocIcon(doc.type)}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500">
                    {doc.type}
                  </span>
                  <span className="hidden group-hover:inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 animate-in fade-in">
                    <Eye className="w-3 h-3" /> Xem trước
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(doc.id);
                    }}
                    className="text-slate-400 hover:text-red-500 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1 min-w-[32px] min-h-[32px] flex items-center justify-center cursor-pointer"
                    title="Xóa tệp"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <h4
                onClick={() => setPreviewDoc(doc)}
                className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1 mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors"
              >
                {doc.name}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                {doc.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mt-2.5">
                {doc.tags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 flex items-center gap-1"
                  >
                    <Tag className="w-2.5 h-2.5" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Footer with uploader & real download button */}
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 min-w-0">
                <img
                  src={doc.uploaderAvatar}
                  alt={doc.uploaderName}
                  className="w-5 h-5 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="text-slate-500 truncate max-w-[100px]">
                  {doc.uploaderName.split(' ')[0]}
                </span>
                <span className="text-slate-400">• {doc.size}</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Real Download Button from Local URL */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDownload(doc);
                  }}
                  style={{ color: 'var(--primary-color)' }}
                  className="font-bold hover:underline flex items-center gap-1 p-1 min-h-[32px] cursor-pointer"
                  title="Tải tệp này về máy"
                >
                  Tải về <Download className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredDocs.length === 0 && (
        <div className="text-center py-12 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-400">
          <Upload className="w-10 h-10 mx-auto mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Chưa có tài liệu nào trong danh mục này
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Bấm nút <strong>"+ Tải File Từ Ổ Đĩa"</strong> ở trên để chọn tài liệu từ máy tính của bạn.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* PREVIEW MODAL (MODAL XEM TRƯỚC TÀI LIỆU)                                   */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div
          id="doc-preview-backdrop"
          onClick={() => setPreviewDoc(null)}
          className="fixed inset-0 z-[100] bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95"
          >
            {/* Modal Header */}
            <div className="p-4 sm:px-6 sm:py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3 bg-slate-50/70 dark:bg-slate-800/50">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-2xs shrink-0">
                  {getDocIcon(previewDoc.type, 'w-5 h-5')}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                    {previewDoc.name}
                  </h3>
                  <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                    <span className="uppercase font-bold text-[10px] px-1.5 py-0.2 rounded bg-slate-200/80 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                      {previewDoc.type}
                    </span>
                    <span>• {previewDoc.size}</span>
                    <span>• Đăng bởi {previewDoc.uploaderName}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(previewDoc)}
                  style={{ backgroundColor: 'var(--primary-color)' }}
                  className="px-3.5 py-2 text-xs font-bold text-white rounded-xl shadow-xs hover:opacity-90 flex items-center gap-1.5 cursor-pointer transition-all"
                  title="Tải tệp về máy"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tải về</span>
                </button>

                <button
                  type="button"
                  onClick={() => setPreviewDoc(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Đóng (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body: Conditional Preview based on file type */}
            <div className="flex-1 overflow-auto bg-slate-100/60 dark:bg-slate-950/60 p-4 sm:p-6 flex items-center justify-center min-h-[350px]">
              {/* 1. PDF PREVIEW (bằng iframe với fileUrl đã tạo từ ổ đĩa) */}
              {previewDoc.type === 'pdf' && (
                <div className="w-full h-full min-h-[520px] flex flex-col items-center">
                  <iframe
                    src={getFilePreviewUrl(previewDoc)}
                    title={previewDoc.name}
                    className="w-full h-[68vh] border-0 rounded-2xl bg-white shadow-md"
                  />
                </div>
              )}

              {/* 2. PPT PREVIEW (bằng iframe với fileUrl đã tạo từ ổ đĩa) */}
              {previewDoc.type === 'ppt' && (
                <div className="w-full h-full min-h-[500px] flex flex-col items-center justify-center">
                  <iframe
                    src={getFilePreviewUrl(previewDoc)}
                    title={previewDoc.name}
                    className="w-full h-[68vh] border-0 rounded-2xl bg-white shadow-md"
                  />
                </div>
              )}

              {/* 3. IMAGE PREVIEW (bằng img với fileUrl đã tạo từ ổ đĩa) */}
              {previewDoc.type === 'image' && (
                <div className="w-full h-full min-h-[400px] flex items-center justify-center">
                  <img
                    src={getFilePreviewUrl(previewDoc)}
                    alt={previewDoc.name}
                    className="max-w-full max-h-[68vh] object-contain rounded-2xl shadow-xl border border-slate-200/50 dark:border-slate-800"
                  />
                </div>
              )}

              {/* 4. DOC & SHEET (REQUIREMENT: Nếu là DOC, SHEET thì hiện thông báo "Không xem trước được, bấm Tải về để xem" và có nút Tải về) */}
              {(previewDoc.type === 'doc' || previewDoc.type === 'sheet') && (
                <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 shadow-xl text-center space-y-4">
                  <div className="w-20 h-20 rounded-3xl bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/80 flex items-center justify-center mx-auto text-amber-500 shadow-inner">
                    {previewDoc.type === 'sheet' ? (
                      <FileSpreadsheet className="w-10 h-10 text-emerald-500" />
                    ) : (
                      <FileText className="w-10 h-10 text-indigo-500" />
                    )}
                  </div>

                  <div>
                    <h4 className="text-base font-extrabold text-slate-900 dark:text-white">
                      {previewDoc.name}
                    </h4>
                    <p className="text-sm text-amber-600 dark:text-amber-400 font-bold mt-2 flex items-center justify-center gap-1.5">
                      <AlertCircle className="w-4 h-4" />
                      <span>Không xem trước được, bấm Tải về để xem</span>
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                      Định dạng {previewDoc.type === 'sheet' ? 'Bảng tính Excel (.xlsx/.sheet)' : 'Văn bản Word (.docx/.doc)'} cần được mở bằng ứng dụng trên máy tính của bạn.
                    </p>
                  </div>

                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() => handleDownload(previewDoc)}
                      style={{ backgroundColor: 'var(--primary-color)' }}
                      className="px-6 py-3 rounded-2xl text-xs font-extrabold text-white shadow-lg hover:opacity-90 flex items-center gap-2 mx-auto cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4" />
                      <span>Tải về</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3 sm:px-6 sm:py-3 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between text-xs text-slate-500">
              <span className="truncate">
                {previewDoc.description}
              </span>
              <button
                type="button"
                onClick={() => setPreviewDoc(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
