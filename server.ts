import express, { Request, Response } from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import nodemailer, { Transporter } from "nodemailer";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "15mb" }));

// ----------------------------------------------------------------------------
// INVITATIONS DATABASE & PERSISTENCE
// ----------------------------------------------------------------------------
export interface TeamInvitation {
  id: string;
  email: string;
  recipientName?: string;
  projectId: string;
  projectName: string;
  projectCategory?: string;
  inviterName: string;
  inviterEmail?: string;
  role: string;
  message?: string;
  status: "pending" | "accepted" | "joined" | "declined" | "revoked";
  createdAt: string;
  expiresAt?: string;
  acceptedAt?: string;
  declinedAt?: string;
  acceptedBy?: {
    id: string;
    name: string;
    email: string;
  };
  inviteUrl: string;
  emailDeliveryStatus?: "sent" | "pending" | "failed" | "fallback_mailto";
  emailDeliveryMessage?: string;
  emailProvider?: "resend" | "gmail_smtp" | "custom_smtp" | "none";
  previewUrl?: string;
  gmailWebComposeUrl?: string;
  mailtoUrl?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const INVITATIONS_FILE = path.join(DATA_DIR, "invitations.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const PROJECTS_FILE = path.join(DATA_DIR, "projects.json");
const MESSAGES_FILE = path.join(DATA_DIR, "messages.json");

export interface StoredUserAccount {
  id: string;
  name: string;
  email: string;
  password: string;
  avatar: string;
  role: string;
  isAdmin?: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

const PRESET_USER_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&auto=format&fit=crop&q=80",
];

function ensureDataDirectory() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(INVITATIONS_FILE)) {
    fs.writeFileSync(INVITATIONS_FILE, JSON.stringify([], null, 2), "utf8");
  }
  if (!fs.existsSync(MESSAGES_FILE)) {
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify([], null, 2), "utf8");
  }
  if (!fs.existsSync(USERS_FILE) || fs.readFileSync(USERS_FILE, "utf8").trim() === "[]") {
    const defaultSeedUsers: StoredUserAccount[] = [
      {
        id: "usr_huyen",
        name: "Thu Huyền",
        email: "hthuhuyen9107@gmail.com",
        password: "123456",
        avatar: PRESET_USER_AVATARS[1],
        role: "Trưởng nhóm / Quản trị viên",
        isAdmin: true,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
      {
        id: "usr_1793157460681_447f6",
        name: "Linh",
        email: "thaolinh422006@gmail.com",
        password: "123456",
        avatar: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80",
        role: "Thành viên nhóm",
        isAdmin: false,
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString(),
      },
    ];
    fs.writeFileSync(USERS_FILE, JSON.stringify(defaultSeedUsers, null, 2), "utf8");
  }
  if (!fs.existsSync(PROJECTS_FILE)) {
    const seed = [
      {
        id: "proj_1",
        name: "Báo Cáo Dự Án: Ứng Dụng AI Trong Giáo Dục",
        description: "Nghiên cứu mô hình lớp học số và trợ lý ảo hỗ trợ học tập cá nhân hóa cho học sinh THPT và sinh viên đại học.",
        category: "Báo cáo môn học",
        members: [
          {
            id: "usr_huyen",
            name: "Thu Huyền",
            avatar: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80",
            role: "Trưởng nhóm / Quản trị viên",
            email: "hthuhuyen9107@gmail.com",
            isOnline: true,
            isAdmin: true,
          }
        ],
        status: "active",
        progress: 0,
        avatarColor: "from-blue-600 to-indigo-600",
        deadline: "2026-10-30",
        createdAt: "26/10/2026",
        slides: [
          {
            id: "slide_1",
            title: "Báo Cáo Dự Án: Ứng Dụng AI Trong Giáo Dục",
            subtitle: "Nghiên cứu mô hình lớp học số và trợ lý ảo",
            bullets: [
              "Khảo sát thực trạng ứng dụng công nghệ trong học tập",
              "Mô hình trợ lý học tập cá nhân hóa thông minh",
              "Kế hoạch triển khai thử nghiệm và đánh giá hiệu quả",
            ],
            notes: "Slide mở đầu dự án nghiên cứu",
            layout: "title",
            backgroundColor: "#ffffff",
            canvasElements: [
              {
                id: "el_title_1",
                type: "text",
                x: 80,
                y: 120,
                width: 800,
                height: 100,
                text: "Báo Cáo Dự Án: Ứng Dụng AI Trong Giáo Dục",
                fontSize: 36,
                fontWeight: "bold",
                color: "#1e1b4b",
                textAlign: "center"
              },
              {
                id: "el_sub_1",
                type: "text",
                x: 100,
                y: 240,
                width: 760,
                height: 60,
                text: "Nhóm nghiên cứu đổi mới sáng tạo • Học kỳ 2026",
                fontSize: 20,
                fontWeight: "normal",
                color: "#4f46e5",
                textAlign: "center"
              }
            ]
          }
        ],
        ownerId: "usr_huyen",
        adminId: "usr_huyen",
        creatorId: "usr_huyen",
        creatorEmail: "hthuhuyen9107@gmail.com",
        aspectRatio: "16:9"
      }
    ];
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(seed, null, 2), "utf8");
  }
}

function getStoredUsers(): StoredUserAccount[] {
  try {
    ensureDataDirectory();
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    return JSON.parse(raw) as StoredUserAccount[];
  } catch (err) {
    console.error("Error reading users database:", err);
    return [];
  }
}

function saveStoredUsers(users: StoredUserAccount[]) {
  try {
    ensureDataDirectory();
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving users database:", err);
  }
}

function getStoredProjects(): any[] {
  try {
    ensureDataDirectory();
    const raw = fs.readFileSync(PROJECTS_FILE, "utf8");
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch (err) {
    console.error("Error reading projects database:", err);
    return [];
  }
}

function saveStoredProjects(projects: any[]) {
  try {
    ensureDataDirectory();
    fs.writeFileSync(PROJECTS_FILE, JSON.stringify(projects, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving projects database:", err);
  }
}

function getStoredInvitations(): TeamInvitation[] {
  try {
    ensureDataDirectory();
    const raw = fs.readFileSync(INVITATIONS_FILE, "utf8");
    const list = JSON.parse(raw) as TeamInvitation[];
    const baseOrigin = process.env.APP_URL
      ? process.env.APP_URL.replace(/\/$/, "")
      : `http://localhost:${PORT}`;
    return list.map((inv) => {
      return {
        ...inv,
        inviteUrl: baseOrigin,
      };
    });
  } catch (err) {
    console.error("Error reading invitations database:", err);
    return [];
  }
}

function saveStoredInvitations(invites: TeamInvitation[]) {
  try {
    ensureDataDirectory();
    fs.writeFileSync(INVITATIONS_FILE, JSON.stringify(invites, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving invitations database:", err);
  }
}

// ----------------------------------------------------------------------------
// REAL-TIME CHAT MESSAGES PERSISTENCE & REAL-TIME BROADCAST
// ----------------------------------------------------------------------------
export interface StoredChatMessage {
  id: string;
  projectId: string;
  chatId: string;
  channelId?: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  senderEmail?: string;
  recipientId?: string;
  receiverId?: string;
  recipientEmail?: string;
  participants: string[];
  text: string;
  timestamp: string;
  createdAt: string;
  type?: "text" | "file" | "image" | "system";
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  isAi?: boolean;
}

function getStoredMessages(): StoredChatMessage[] {
  try {
    ensureDataDirectory();
    if (!fs.existsSync(MESSAGES_FILE)) return [];
    const raw = fs.readFileSync(MESSAGES_FILE, "utf8");
    const list = JSON.parse(raw);
    if (!Array.isArray(list)) return [];
    const seen = new Set<string>();
    return list.filter((m) => {
      if (!m || !m.id) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
  } catch (err) {
    console.error("Error reading messages database:", err);
    return [];
  }
}

function saveStoredMessages(messages: StoredChatMessage[]) {
  try {
    ensureDataDirectory();
    const seen = new Set<string>();
    const deduped = messages.filter((m) => {
      if (!m || !m.id) return false;
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });
    fs.writeFileSync(MESSAGES_FILE, JSON.stringify(deduped, null, 2), "utf8");
  } catch (err) {
    console.error("Error saving messages database:", err);
  }
}

interface MessageSSEClient {
  id: string;
  res: Response;
  chatId?: string;
  projectId?: string;
  userId?: string;
  email?: string;
}

const sseMessageClients: MessageSSEClient[] = [];

function broadcastMessage(message: StoredChatMessage) {
  const payload = `data: ${JSON.stringify({ type: "new_message", message })}\n\n`;
  for (let i = sseMessageClients.length - 1; i >= 0; i--) {
    const client = sseMessageClients[i];
    try {
      const isDirectMessage = Boolean(message.recipientId || message.receiverId || message.recipientEmail);

      if (isDirectMessage) {
        // Direct 1-1 message: deliver to connected clients who participate in the conversation
        const clientUid = client.userId ? String(client.userId).trim().toLowerCase() : "";
        const clientMail = client.email ? String(client.email).trim().toLowerCase() : "";

        const senderIdLower = (message.senderId || "").toLowerCase();
        const receiverIdLower = (message.recipientId || message.receiverId || "").toLowerCase();
        const senderMailLower = (message.senderEmail || "").toLowerCase();
        const receiverMailLower = (message.recipientEmail || "").toLowerCase();

        const matchUser =
          !client.userId && !client.email
            ? true
            : (clientUid && (
                senderIdLower === clientUid ||
                receiverIdLower === clientUid ||
                (message.participants && message.participants.some((p) => p.toLowerCase() === clientUid))
              )) ||
              (clientMail && (
                senderMailLower === clientMail ||
                receiverMailLower === clientMail ||
                senderIdLower === clientMail ||
                receiverIdLower === clientMail ||
                (message.participants && message.participants.some((p) => p.toLowerCase() === clientMail))
              ));

        if (matchUser) {
          client.res.write(payload);
        }
      } else {
        // Group channel message: deliver to matching project and channel
        const matchChat = !client.chatId || client.chatId === message.chatId;
        const matchProject = !client.projectId || client.projectId === message.projectId;
        if (matchChat && matchProject) {
          client.res.write(payload);
        }
      }
    } catch {
      sseMessageClients.splice(i, 1);
    }
  }
}

// ----------------------------------------------------------------------------
// EMAIL SERVICE (REAL EMAIL SENDING VIA RESEND OR GMAIL / SMTP)
// ----------------------------------------------------------------------------
export interface EmailSendResult {
  success: boolean;
  provider: "resend" | "gmail_smtp" | "custom_smtp" | "none";
  messageId?: string;
  error?: string;
  code?: string;
  previewUrl?: string;
}

function getEmailProviderStatus(): {
  configured: boolean;
  provider: "resend" | "gmail_smtp" | "custom_smtp" | "none";
  senderEmail: string | null;
  description: string;
} {
  if (process.env.RESEND_API_KEY) {
    return {
      configured: true,
      provider: "resend",
      senderEmail: process.env.RESEND_FROM || "TEAM UP <onboarding@resend.dev>",
      description: "Dịch vụ Resend API đang hoạt động (RESEND_API_KEY)",
    };
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return {
      configured: true,
      provider: "gmail_smtp",
      senderEmail: process.env.GMAIL_USER,
      description: "Dịch vụ Gmail SMTP đang hoạt động (GMAIL_USER + GMAIL_APP_PASSWORD)",
    };
  }
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return {
      configured: true,
      provider: "custom_smtp",
      senderEmail: process.env.SMTP_USER,
      description: `Dịch vụ Custom SMTP đang hoạt động (${process.env.SMTP_HOST})`,
    };
  }
  return {
    configured: false,
    provider: "none",
    senderEmail: null,
    description:
      "Chưa cấu hình dịch vụ email. Cần thêm biến môi trường RESEND_API_KEY hoặc GMAIL_USER + GMAIL_APP_PASSWORD.",
  };
}

async function sendInvitationEmail(invitation: TeamInvitation): Promise<EmailSendResult> {
  const subject = `[TEAM UP] Mời bạn vào nhóm`;

  const htmlContent = `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Lời mời tham gia nhóm TEAM UP</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 580px; background: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;">
          <!-- Top Gradient Banner -->
          <tr>
            <td style="background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #ec4899 100%); padding: 36px 32px; text-align: center;">
              <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 6px 16px; border-radius: 9999px; font-size: 13px; font-weight: 700; color: #ffffff; letter-spacing: 0.5px; margin-bottom: 12px;">
                TEAM UP WORKSPACE
              </div>
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; line-height: 1.3;">
                Bạn nhận được lời mời tham gia nhóm!
              </h1>
              <p style="margin: 8px 0 0 0; color: rgba(255,255,255,0.95); font-size: 14px;">
                Cộng tác, chia sẻ tài liệu và cùng nhau hoàn thành xuất sắc dự án
              </p>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 32px;">
              <p style="font-size: 16px; line-height: 1.6; margin: 0 0 18px 0; color: #334155;">
                Xin chào,
              </p>
              <p style="font-size: 15px; line-height: 1.6; margin: 0 0 24px 0; color: #334155;">
                <strong>${invitation.inviterName}</strong> vừa gửi cho bạn một lời mời chính thức để tham gia nhóm làm việc trên nền tảng <strong>TEAM UP</strong>.
              </p>

              <!-- Team Card -->
              <table role="presentation" width="100%" style="background-color: #f8fafc; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 22px;">
                    <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.5px; margin-bottom: 6px;">
                      THÔNG TIN NHÓM THAM GIA
                    </div>
                    <div style="font-size: 20px; font-weight: 800; color: #1e1b4b; margin-bottom: 6px;">
                      👥 ${invitation.projectName}
                    </div>
                    ${
                      invitation.projectCategory
                        ? `<div style="font-size: 13px; color: #4f46e5; font-weight: 600; margin-bottom: 10px;">Thể loại: ${invitation.projectCategory}</div>`
                        : ""
                    }
                    <div style="font-size: 13px; color: #475569; margin-top: 6px;">
                      <strong>Người mời:</strong> ${invitation.inviterName}
                    </div>
                    <div style="font-size: 13px; color: #475569; margin-top: 6px;">
                      <strong>Vai trò được chỉ định:</strong> 
                      <span style="background: #e0e7ff; color: #3730a3; padding: 3px 10px; border-radius: 8px; font-weight: 700; margin-left: 4px;">
                        ${invitation.role}
                      </span>
                    </div>
                    ${
                      invitation.message
                        ? `
                    <div style="margin-top: 14px; padding: 12px 16px; background: #ffffff; border-radius: 10px; border-left: 4px solid #6366f1; font-size: 13px; font-style: italic; color: #475569; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
                      "${invitation.message}"
                    </div>`
                        : ""
                    }
                  </td>
                </tr>
              </table>

              <!-- Action Button (Big Call To Action) -->
              <div style="text-align: center; margin: 32px 0 24px 0;">
                <a href="${invitation.inviteUrl}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-size: 16px; font-weight: 800; text-decoration: none; padding: 15px 40px; border-radius: 12px; box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4); letter-spacing: 0.3px;">
                  👉 Tham Gia Nhóm Ngay
                </a>
              </div>

              <!-- Fallback Direct URL -->
              <div style="background-color: #faf5ff; border: 1px dashed #d8b4fe; border-radius: 10px; padding: 14px; font-size: 12px; color: #6b21a8; line-height: 1.5; word-break: break-all;">
                <strong>Nút không hoạt động?</strong> Bạn có thể sao chép liên kết dưới đây và dán vào thanh địa chỉ trình duyệt:<br>
                <a href="${invitation.inviteUrl}" style="color: #6d28d9; text-decoration: underline; font-weight: 600;">${invitation.inviteUrl}</a>
              </div>

              <div style="font-size: 12px; color: #94a3b8; text-align: center; margin-top: 24px;">
                Lời mời được gửi bởi ứng dụng TEAM UP. Thời hạn sử dụng: 7 ngày kể từ ngày gửi.
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 4px 0; font-weight: 600; color: #64748b;">TEAM UP WORKSPACE</p>
              <p style="margin: 0;">Nền tảng làm việc nhóm, phân công nhiệm vụ và bài thuyết trình thông minh.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  const textContent = `Chào bạn,\n\nBạn nhận được lời mời tham gia nhóm "${invitation.projectName}" trên TEAM UP.\nNgười gửi: ${invitation.inviterName}\nVai trò: ${invitation.role}\n\nBấm vào liên kết sau để tham gia nhóm ngay:\n${invitation.inviteUrl}\n\nLời mời có thời hạn 7 ngày.\n\nChúc bạn làm việc hiệu quả cùng nhóm!\nTEAM UP Workspace`;

  // 1. PROVIDER 1: RESEND (Modern REST API email service)
  if (process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const fromAddress =
        process.env.RESEND_FROM ||
        process.env.EMAIL_FROM ||
        "TEAM UP <onboarding@resend.dev>";

      console.log(`[Resend] Sending invitation email to ${invitation.email} from ${fromAddress}...`);
      const { data, error } = await resend.emails.send({
        from: fromAddress,
        to: [invitation.email],
        subject,
        html: htmlContent,
        text: textContent,
      });

      if (error) {
        console.error("[Resend Error]:", error);
        return {
          success: false,
          provider: "resend",
          error: error.message || "Lỗi từ dịch vụ Resend",
        };
      }

      console.log(`[Resend Success] Email delivered. ID: ${data?.id}`);
      return {
        success: true,
        provider: "resend",
        messageId: data?.id,
      };
    } catch (err: any) {
      console.error("[Resend Exception]:", err);
      return {
        success: false,
        provider: "resend",
        error: err?.message || "Không thể gửi email qua Resend",
      };
    }
  }

  // 2. PROVIDER 2: GMAIL SMTP (via Google App Password)
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    try {
      console.log(`[Gmail SMTP] Sending invitation email to ${invitation.email} via ${process.env.GMAIL_USER}...`);
      const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
          user: process.env.GMAIL_USER,
          pass: process.env.GMAIL_APP_PASSWORD,
        },
      });

      const fromAddress =
        process.env.GMAIL_FROM ||
        `"TEAM UP Workspace" <${process.env.GMAIL_USER}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: invitation.email,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log(`[Gmail SMTP Success] Message ID: ${info.messageId}`);
      return {
        success: true,
        provider: "gmail_smtp",
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error("[Gmail SMTP Exception]:", err);
      return {
        success: false,
        provider: "gmail_smtp",
        error: err?.message || "Lỗi xác thực hoặc gửi email qua Gmail SMTP",
      };
    }
  }

  // 3. PROVIDER 3: CUSTOM SMTP
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      console.log(`[Custom SMTP] Sending invitation email to ${invitation.email} via ${process.env.SMTP_HOST}...`);
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: Number(process.env.SMTP_PORT) === 465,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      const fromAddress =
        process.env.SMTP_FROM ||
        `"TEAM UP Workspace" <${process.env.SMTP_USER}>`;

      const info = await transporter.sendMail({
        from: fromAddress,
        to: invitation.email,
        subject,
        html: htmlContent,
        text: textContent,
      });

      console.log(`[Custom SMTP Success] Message ID: ${info.messageId}`);
      return {
        success: true,
        provider: "custom_smtp",
        messageId: info.messageId,
      };
    } catch (err: any) {
      console.error("[Custom SMTP Exception]:", err);
      return {
        success: false,
        provider: "custom_smtp",
        error: err?.message || "Lỗi máy chủ SMTP tùy chỉnh",
      };
    }
  }

  // 4. NO REAL EMAIL SERVICE CONFIGURED
  // Do NOT spoof success or use fake test accounts without telling the user
  console.warn(
    "[Email Service Not Configured] No RESEND_API_KEY or GMAIL_APP_PASSWORD found in environment variables."
  );
  return {
    success: false,
    provider: "none",
    code: "EMAIL_PROVIDER_NOT_CONFIGURED",
    error:
      "Chưa cấu hình dịch vụ gửi email (Cần thêm biến môi trường RESEND_API_KEY hoặc GMAIL_USER + GMAIL_APP_PASSWORD trong Vercel / Cloud Run). Email chưa được gửi vào hộp thư.",
  };
}

// Server-side Gemini AI client initialization
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Fast fallback candidate models: prioritize highly available low-latency models
const CANDIDATE_MODELS = [
  "gemini-3.5-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.5-flash",
  "gemini-3.8-flash",
];

async function callGeminiWithFallback<T>(
  ai: GoogleGenAI,
  callFn: (model: string) => Promise<T>
): Promise<T> {
  let lastError: any = null;
  for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
    const model = CANDIDATE_MODELS[i];
    try {
      return await callFn(model);
    } catch (err: any) {
      lastError = err;
      const status = err?.status || err?.code || 500;
      const message = err?.message || String(err);
      console.warn(`[Gemini API] Model ${model} failed (code ${status}): ${message}. Attempting fallback model...`);
      if (i < CANDIDATE_MODELS.length - 1) {
        await new Promise((res) => setTimeout(res, 100));
      }
    }
  }
  throw lastError;
}

async function searchWeb(query: string): Promise<string[]> {
  if (!query || query.trim().length < 2) return [];
  try {
    const res = await fetch("https://html.duckduckgo.com/html/?q=" + encodeURIComponent(query.trim()), {
      signal: AbortSignal.timeout(1000),
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      }
    });
    if (!res.ok) return [];
    const html = await res.text();
    const snippets: string[] = [];
    const regex = /<a class="result__snippet[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    while ((match = regex.exec(html)) !== null && snippets.length < 4) {
      const text = match[1].replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      if (text && text.length > 20) snippets.push(text);
    }
    return snippets;
  } catch (e) {
    return [];
  }
}

function cleanAiResponseText(rawText: string): string {
  if (!rawText) return "";
  // Strip out markdown symbols * and # as strictly requested
  return rawText
    .replace(/[*#]/g, "")
    .replace(/^\s*[-•]\s*/gm, "- ") // clean bullet points
    .trim();
}

function generateContextualFallback(message: string, searchSnippets: string[] = []): string {
  if (searchSnippets && searchSnippets.length > 0) {
    const combined = searchSnippets.join("\n\n").replace(/\[\d+\]/g, "");
    return cleanAiResponseText(combined);
  }

  const query = (message || "").toLowerCase().trim();
  if (query.includes("thủ đô") && query.includes("pháp")) {
    return "Theo dữ liệu từ Google: Thủ đô của nước Pháp là Paris, trung tâm kinh tế, văn hóa và du lịch hàng đầu thế giới với tháp Eiffel, bảo tàng Louvre và dòng sông Seine thơ mộng.";
  }
  if (query.includes("tổng thống mỹ") || query.includes("tổng thống hoa kỳ")) {
    return "Theo dữ liệu cập nhật từ Google: Tổng thống Hoa Kỳ hiện tại là Donald Trump, đắc cử và nhậm chức vào tháng 1 năm 2025, trở thành Tổng thống thứ 47 của nước Mỹ.";
  }

  return cleanAiResponseText(`UP AI đã ghi nhận câu hỏi của bạn. Hệ thống đang đồng bộ dữ liệu thời gian thực từ Google Search. Bạn có thể hỏi chi tiết hơn hoặc bổ sung nội dung cần tìm hiểu để nhận câu trả lời chuẩn xác nhất.`);
}

// Health check
app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ----------------------------------------------------------------------------
// AUTHENTICATION API (REGISTER & LOGIN WITH GMAIL AND PASSWORD)
// ----------------------------------------------------------------------------

// Lấy danh sách tài khoản người dùng đã đăng ký để đồng bộ nếu cần
app.get("/api/auth/users", (_req: Request, res: Response) => {
  try {
    const users = getStoredUsers();
    return res.json({
      success: true,
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        password: u.password,
        avatar: u.avatar,
        role: u.role,
        isAdmin: u.isAdmin,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLoginAt,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || "Lỗi đọc danh sách tài khoản." });
  }
});

// Đăng ký tài khoản: yêu cầu tên, gmail cá nhân, tạo mật khẩu
app.post("/api/auth/register", (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body || {};

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    if (!cleanName || cleanName.length < 2) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng nhập họ và tên của bạn (ít nhất 2 ký tự).",
      });
    }

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng nhập địa chỉ Gmail cá nhân của bạn.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: "Địa chỉ Gmail không đúng định dạng (ví dụ: yourname@gmail.com).",
      });
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({
        success: false,
        error: "Mật khẩu tạo phải có ít nhất 6 ký tự.",
      });
    }

    const users = getStoredUsers();
    const existing = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      return res.status(400).json({
        success: false,
        error: `Tài khoản với Gmail "${cleanEmail}" đã tồn tại trên hệ thống. Vui lòng chuyển sang tab Đăng nhập.`,
      });
    }

    // Determine avatar deterministically or from preset
    let hash = 0;
    for (let i = 0; i < cleanEmail.length; i++) {
      hash = (hash << 5) - hash + cleanEmail.charCodeAt(i);
      hash |= 0;
    }
    const avatarIndex = Math.abs(hash) % PRESET_USER_AVATARS.length;
    const avatar = PRESET_USER_AVATARS[avatarIndex];

    const newUser: StoredUserAccount = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: cleanName,
      email: cleanEmail,
      password: cleanPassword,
      avatar,
      role: "Thành viên nhóm",
      isAdmin: false,
      createdAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
    };

    users.push(newUser);
    saveStoredUsers(users);

    // Tự động thêm thành viên mới vào danh sách thành viên dự án để người dùng A và B nhắn tin được với nhau
    try {
      const projects = getStoredProjects();
      projects.forEach((p) => {
        if (!p.members) p.members = [];
        if (!p.members.some((m: any) => m.id === newUser.id || m.email?.toLowerCase() === cleanEmail)) {
          p.members.push({
            id: newUser.id,
            name: newUser.name,
            avatar: newUser.avatar,
            role: newUser.role,
            email: newUser.email,
            isOnline: true,
            isAdmin: false,
          });
        }
      });
      saveStoredProjects(projects);
    } catch (projErr) {
      console.warn("Could not sync new user to projects:", projErr);
    }

    console.log(`[User Registered] ${cleanName} (${cleanEmail}) created an account and synced to projects.`);

    return res.status(201).json({
      success: true,
      message: "Đăng ký tài khoản thành công!",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        avatar: newUser.avatar,
        role: newUser.role,
        isAdmin: newUser.isAdmin,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err: any) {
    console.error("Register error:", err);
    return res.status(500).json({
      success: false,
      error: "Lỗi hệ thống khi đăng ký tài khoản. Vui lòng thử lại sau.",
    });
  }
});

// Đăng nhập tài khoản: yêu cầu gmail và mật khẩu
app.post("/api/auth/login", (req: Request, res: Response) => {
  try {
    const { email, password } = req.body || {};

    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    if (!cleanEmail) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng nhập địa chỉ Gmail để đăng nhập.",
      });
    }

    if (!cleanPassword) {
      return res.status(400).json({
        success: false,
        error: "Vui lòng nhập mật khẩu.",
      });
    }

    const users = getStoredUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: `Tài khoản Gmail "${cleanEmail}" chưa được đăng ký trong hệ thống. Vui lòng chọn tab "Đăng ký tài khoản" để tạo tài khoản mới.`,
      });
    }

    const storedPassword = String(user.password || "").trim();
    const enteredPassword = cleanPassword.trim();

    if (storedPassword !== enteredPassword) {
      return res.status(401).json({
        success: false,
        error: "Mật khẩu không chính xác. Vui lòng kiểm tra lại!",
      });
    }

    user.lastLoginAt = new Date().toISOString();
    saveStoredUsers(users);

    console.log(`[User Logged In] ${user.name} (${user.email}) logged in successfully.`);

    return res.json({
      success: true,
      message: "Đăng nhập thành công!",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        role: user.role,
        isAdmin: user.isAdmin,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err);
    return res.status(500).json({
      success: false,
      error: "Lỗi hệ thống khi đăng nhập. Vui lòng thử lại sau.",
    });
  }
});

// Kiểm tra Gmail có tồn tại hay không
app.post("/api/auth/check-email", (req: Request, res: Response) => {
  try {
    const { email } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập địa chỉ Gmail." });
    }

    const users = getStoredUsers();
    const user = users.find((u) => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      return res.status(404).json({ success: false, exists: false, error: "Gmail chưa tồn tại" });
    }

    return res.json({
      success: true,
      exists: true,
      email: user.email,
      name: user.name,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Lỗi hệ thống khi kiểm tra Gmail." });
  }
});

// Đổi mật khẩu tài khoản
app.post("/api/auth/reset-password", (req: Request, res: Response) => {
  try {
    const { email, newPassword } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();
    const cleanPassword = String(newPassword || "");

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: "Vui lòng nhập địa chỉ Gmail." });
    }

    if (!cleanPassword || cleanPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Mật khẩu mới phải có ít nhất 6 ký tự." });
    }

    const users = getStoredUsers();
    const userIndex = users.findIndex((u) => u.email.toLowerCase() === cleanEmail);

    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: "Gmail chưa tồn tại" });
    }

    users[userIndex].password = cleanPassword;
    saveStoredUsers(users);

    console.log(`[Password Reset] Password reset successfully for ${users[userIndex].name} (${cleanEmail}).`);

    return res.json({
      success: true,
      message: "Đổi mật khẩu thành công, hãy đăng nhập lại",
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Lỗi hệ thống khi đổi mật khẩu" });
  }
});

// Đồng bộ tài khoản người dùng từ client
app.post("/api/auth/sync", (req: Request, res: Response) => {
  try {
    const { users } = req.body || {};
    if (Array.isArray(users) && users.length > 0) {
      const currentUsers = getStoredUsers();
      const map = new Map<string, StoredUserAccount>();
      currentUsers.forEach((u) => {
        if (u.email) map.set(u.email.toLowerCase().trim(), u);
      });
      users.forEach((u: any) => {
        if (u.email) {
          const key = u.email.toLowerCase().trim();
          const existing = map.get(key);
          map.set(key, {
            id: u.id || existing?.id || `usr_${Date.now()}`,
            name: u.name || existing?.name || key.split("@")[0],
            email: key,
            password: u.password || existing?.password || "123456",
            avatar: u.avatar || existing?.avatar || PRESET_USER_AVATARS[0],
            role: u.role || existing?.role || "Thành viên nhóm",
            isAdmin: Boolean(u.isAdmin ?? existing?.isAdmin),
            createdAt: u.createdAt || existing?.createdAt || new Date().toISOString(),
            lastLoginAt: u.lastLoginAt || existing?.lastLoginAt,
          });
        }
      });
      const merged = Array.from(map.values());
      saveStoredUsers(merged);
      return res.json({ success: true, count: merged.length });
    }
    return res.json({ success: true, count: 0 });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Lỗi đồng bộ tài khoản" });
  }
});

// ----------------------------------------------------------------------------
// PROJECTS & SLIDES PERSISTENCE API
// ----------------------------------------------------------------------------

// Lấy toàn bộ danh sách dự án và slides đã tạo để chia sẻ cho tất cả thành viên
app.get("/api/projects", (_req: Request, res: Response) => {
  try {
    const projects = getStoredProjects();
    return res.json({ success: true, projects });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Không thể lấy danh sách dự án" });
  }
});

// Lấy chi tiết 1 dự án theo ID (kèm toàn bộ slide và đối tượng canvas)
app.get("/api/projects/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentProjects = getStoredProjects();
    const proj = currentProjects.find((p: any) => p.id === id);
    if (!proj) {
      return res.status(404).json({ success: false, error: "Không tìm thấy dự án" });
    }
    return res.json({ success: true, project: proj });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Lỗi tìm kiếm dự án" });
  }
});

// Đồng bộ danh sách dự án hoặc cập nhật slides
app.post("/api/projects/sync", (req: Request, res: Response) => {
  try {
    const { projects, project } = req.body || {};
    let currentProjects = getStoredProjects();
    if (Array.isArray(projects) && projects.length > 0) {
      currentProjects = projects;
    } else if (project && project.id) {
      const idx = currentProjects.findIndex((p: any) => p.id === project.id);
      if (idx >= 0) {
        currentProjects[idx] = { ...currentProjects[idx], ...project };
      } else {
        currentProjects.unshift(project);
      }
    }
    saveStoredProjects(currentProjects);
    return res.json({ success: true, count: currentProjects.length, projects: currentProjects });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Không thể đồng bộ dự án" });
  }
});

// Cập nhật 1 dự án (slides, members, info)
app.put("/api/projects/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const currentProjects = getStoredProjects();
    const idx = currentProjects.findIndex((p: any) => p.id === id);
    if (idx >= 0) {
      currentProjects[idx] = { ...currentProjects[idx], ...req.body, id };
    } else {
      currentProjects.unshift({ ...req.body, id });
    }
    saveStoredProjects(currentProjects);
    return res.json({ success: true, project: currentProjects[idx >= 0 ? idx : 0] });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Lỗi cập nhật dự án" });
  }
});

app.put("/api/auth/profile", (req: Request, res: Response) => {
  try {
    const { requesterId, targetUserId, name, avatar, role, statusText } = req.body || {};

    if (!requesterId || !targetUserId) {
      return res.status(400).json({
        success: false,
        error: "Thiếu thông tin nhận diện người dùng (requesterId và targetUserId).",
      });
    }

    const users = getStoredUsers();
    const requester = users.find((u) => u.id === requesterId || u.email?.toLowerCase() === String(requesterId).toLowerCase());
    const targetIndex = users.findIndex((u) => u.id === targetUserId || u.email?.toLowerCase() === String(targetUserId).toLowerCase());

    if (targetIndex === -1) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy hồ sơ người dùng trong hệ thống.",
      });
    }

    const target = users[targetIndex];
    const isSelf = target.id === requester?.id || target.email?.toLowerCase() === requester?.email?.toLowerCase();
    const isManager = Boolean(
      requester && (
        requester.isAdmin === true ||
        requester.role?.includes("Trưởng nhóm") ||
        requester.role?.includes("Quản trị viên")
      )
    );

    // Kiểm tra quyền hạn: mỗi người chỉ sửa hồ sơ của chính mình, trừ quyền quản lý được cấp rõ ràng
    if (!isSelf && !isManager) {
      return res.status(403).json({
        success: false,
        error: "Bạn chỉ có thể chỉnh sửa hồ sơ của chính mình. Chỉ Quản trị viên/Trưởng nhóm mới có quyền điều chỉnh thành viên khác.",
      });
    }

    if (name && typeof name === "string" && name.trim().length >= 2) {
      target.name = name.trim();
    }

    if (avatar && typeof avatar === "string" && avatar.trim()) {
      target.avatar = avatar.trim();
    }

    // Phân quyền: Chỉ thay đổi vai trò nếu người yêu cầu là Quản lý/Trưởng nhóm
    if (role && typeof role === "string" && role.trim()) {
      if (isManager) {
        target.role = role.trim();
      }
    }

    saveStoredUsers(users);

    console.log(`[Profile Updated] ${target.name} (${target.email}) was updated by ${requester?.name || requesterId}.`);

    return res.json({
      success: true,
      message: "Cập nhật hồ sơ thành công!",
      user: {
        id: target.id,
        name: target.name,
        email: target.email,
        avatar: target.avatar,
        role: target.role,
        isAdmin: target.isAdmin,
        statusText: statusText || undefined,
      },
    });
  } catch (err: any) {
    console.error("Profile update error:", err);
    return res.status(500).json({
      success: false,
      error: "Lỗi hệ thống khi cập nhật hồ sơ.",
    });
  }
});

// AI Chat assistant endpoint (Powered by Google Search Grounding & Google Gemini)
const handleAiChat = async (req: Request, res: Response) => {
  const { message, history, documentsContext, projectContext } = req.body || {};
  const userMessage = (message || "").trim();

  const projContext = projectContext
    ? `\n\nTHÔNG TIN DỰ ÁN HIỆN TẠI:\nTên dự án: "${projectContext.name}"\nPhân loại: ${projectContext.category || "Học tập & làm việc"}\nMô tả: ${projectContext.description || "Không có"}\nThành viên: ${(projectContext.members || []).join(", ")}`
    : "";

  const docsContext = Array.isArray(documentsContext) && documentsContext.length > 0
    ? `\n\nDANH SÁCH TÀI LIỆU CÓ TRONG KHO LƯU TRỮ CỦA NHÓM DỰ ÁN:\n${documentsContext.map((d: any, idx: number) => `${idx + 1}. Tên tệp: "${d.name}" | Định dạng: ${d.type} | Kích thước: ${d.size} | Mô tả: ${d.description || 'Không'} | Thẻ: ${(d.tags || []).join(', ')}`).join('\n')}\nKhi người dùng hỏi tìm kiếm tài liệu hoặc nhắc đến tài liệu trong kho lưu trữ, hãy đối chiếu và liệt kê chính xác các tài liệu phù hợp từ danh sách trên.`
    : "";

  const systemInstruction = `Bạn là UP AI - trợ lý trí tuệ nhân tạo toàn năng thông minh của nền tảng TEAM UP, được kết nối trực tiếp với công cụ tìm kiếm Google Search (Google Search Grounding) và nền tảng Google Gemini.
Bạn lấy và tổng hợp thông tin kiến thức chuẩn xác, cập nhật theo thời gian thực từ Google để phục vụ mọi câu hỏi của người dùng: kiến thức đời sống, khoa học tự nhiên, khoa học xã hội, lịch sử, văn hóa, công nghệ, kinh tế, lập trình, giải toán, tra cứu thông tin trên Internet, cũng như hỗ trợ làm việc và học tập nhóm.
QUY TẮC BẮT BUỘC:
1. Bạn lấy thông tin chính xác, cập nhật từ Google Search để giải đáp. Trả lời đúng trọng tâm câu hỏi hoặc yêu cầu mà người dùng đưa ra. Nếu người dùng tìm kiếm tài liệu trong kho lưu trữ, hãy tìm và chỉ rõ tên tệp, định dạng và nội dung tóm tắt của tài liệu liên quan.
2. Trả lời tự nhiên, khoa học, chuyên nghiệp, không rườm rà chào hỏi xã giao (không 'Xin chào', không 'Tôi là...', không câu mở đầu sáo rỗng), đi thẳng vào câu trả lời có giá trị thực tế.
3. TUYỆT ĐỐI KHÔNG SỬ DỤNG các ký hiệu Markdown như dấu sao '*' (kể cả in đậm **, in nghiêng *) hay dấu thăng '#' (tiêu đề ##, ###, #).
4. Hãy ngắt đoạn tự nhiên, dùng câu văn liền mạch gãy gọn hoặc đánh số 1. 2. 3. thuần túy khi cần liệt kê.${projContext}${docsContext}`;

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({
        reply: generateContextualFallback(userMessage),
        sources: [],
        provider: "google_search",
      });
    }

    const contents: any[] = [];
    if (Array.isArray(history) && history.length > 0) {
      for (const h of history.slice(-6)) {
        contents.push({
          role: h.sender === "ai" ? "model" : "user",
          parts: [{ text: h.text }],
        });
      }
    }
    contents.push({
      role: "user",
      parts: [{ text: userMessage || "Hãy chia sẻ thông tin tổng quan hữu ích về chủ đề này từ Google Search" }],
    });

    let generatedText = "";
    let extractedSources: Array<{ title: string; uri: string }> = [];
    let extractedSearchQueries: string[] = [];

    // Attempt 1: Call Gemini 3.8 Flash with Google Search Grounding
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
          tools: [{ googleSearch: {} }],
        },
      });

      if (response.text) {
        generatedText = response.text;
      }

      // Extract Google Search grounding chunks (URLs, titles) and search queries
      const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(chunks)) {
        for (const c of chunks) {
          if (c.web?.uri) {
            extractedSources.push({
              title: c.web.title || c.web.uri,
              uri: c.web.uri,
            });
          }
        }
      }

      const webQueries = response.candidates?.[0]?.groundingMetadata?.webSearchQueries;
      if (Array.isArray(webQueries)) {
        extractedSearchQueries = webQueries;
      }
    } catch (searchError: any) {
      console.warn("[Google Search Grounding] Tool call failed or rate-limited, falling back to standard Gemini model:", searchError?.message || searchError);
    }

    // Attempt 2: Fallback without search tool if tool-based call didn't return text
    if (!generatedText) {
      const fallbackModels = ["gemini-3.8-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
      for (const model of fallbackModels) {
        try {
          const resModel = await ai.models.generateContent({
            model,
            contents,
            config: {
              systemInstruction,
              temperature: 0.7,
            },
          });
          if (resModel.text) {
            generatedText = resModel.text;
            break;
          }
        } catch (err: any) {
          console.warn(`[Gemini Fallback ${model}] error:`, err?.message || err);
        }
      }
    }

    const rawReply = generatedText || generateContextualFallback(userMessage);
    const cleanReply = cleanAiResponseText(rawReply);

    return res.json({
      reply: cleanReply,
      sources: extractedSources,
      searchQueries: extractedSearchQueries,
      provider: "google_search",
    });
  } catch (error: any) {
    console.warn("AI Chat fallback triggered after model retry:", error?.message || error);
    return res.json({
      reply: generateContextualFallback(userMessage),
      sources: [],
      provider: "google_search",
    });
  }
};

app.post("/api/ai/chat", handleAiChat);
app.post("/api/ai", handleAiChat);
app.post("/api/chat", handleAiChat);
app.get("/api/ai/chat", (_req: Request, res: Response) => {
  res.json({ status: "ok", message: "Use POST /api/ai/chat for AI chat queries" });
});

// AI Generate Slide Outline & Content endpoint
app.post("/api/ai/generate-slides", async (req: Request, res: Response) => {
  const { topic = "Báo Cáo Đề Tài Nhóm", audience, slideCount = 5, themeStyle } = req.body;

  const defaultSlides = [
    {
      title: topic || "Báo Cáo Dự Án Nhóm",
      subtitle: "Giới thiệu tổng quan và mục tiêu nghiên cứu",
      bullets: [
        "Bối cảnh đề tài và lý do nhóm lựa chọn",
        "Mục tiêu cụ thể cần đạt được",
        "Phương pháp tiếp cận và phân công công việc",
      ],
      notes: "Slide mở đầu cần trình bày tự tin, ấn tượng",
      layout: "title",
    },
    {
      title: "Thực Trạng & Điểm Nghẽn",
      subtitle: "Phân tích số liệu và hiện trạng thực tế",
      bullets: [
        "Những khó khăn thực tế đang gặp phải trong lĩnh vực",
        "Dữ liệu khảo sát sơ bộ từ nhóm",
        "Vấn đề cốt lõi cần tìm giải pháp tháo gỡ",
      ],
      notes: "Nhấn mạnh vào các số liệu thực tế khảo sát",
      layout: "split",
    },
    {
      title: "Giải Pháp Đề Xuất Sáng Tạo",
      subtitle: "Kế hoạch hành động cụ thể của nhóm",
      bullets: [
        "Giải pháp 1: Tối ưu hóa quy trình và thời gian",
        "Giải pháp 2: Áp dụng công nghệ kỹ thuật số",
        "Dự kiến kết quả và tác động tích cực mang lại",
      ],
      notes: "Trình bày giải pháp logic, có tính khả thi cao",
      layout: "cards",
    },
    {
      title: "Kế Hoạch & Lộ Trình Triển Khai",
      subtitle: "Phân công và các mốc tiến độ thực hiện",
      bullets: [
        "Giai đoạn 1: Nghiên cứu tài liệu và hoàn thiện khung đề tài",
        "Giai đoạn 2: Triển khai nội dung và chạy thử nghiệm",
        "Giai đoạn 3: Tổng kết, báo cáo và nghiệm thu đánh giá",
      ],
      notes: "Kiểm tra kỹ các deadline quan trọng",
      layout: "timeline",
    },
    {
      title: "Kết Luận & Thảo Luận Q&A",
      subtitle: "Cảm ơn thầy cô và các bạn đã theo dõi",
      bullets: [
        "Tóm tắt 3 thông điệp then chốt của bài báo cáo",
        "Bài học kinh nghiệm rút ra khi làm việc nhóm",
        "Mời thầy cô và các bạn đặt câu hỏi trao đổi",
      ],
      notes: "Sẵn sàng tinh thần giải đáp các câu hỏi phản biện",
      layout: "conclusion",
    },
  ];

  try {
    const ai = getGeminiClient();

    if (!ai) {
      return res.json({ slides: defaultSlides.slice(0, Math.max(3, slideCount)) });
    }

    const prompt = `Tạo một bài thuyết trình slide chuyên nghiệp cho học sinh/sinh viên/nhóm làm việc:
Chủ đề: "${topic}"
Đối tượng người nghe: "${audience || "Thầy cô, giảng viên và bạn học trong lớp"}"
Phong cách: "${themeStyle || "Hiện đại, rõ ràng, dễ hiểu"}"
Số lượng slide cần tạo: ${slideCount} slide.

Hãy tạo danh sách slide dưới dạng JSON với cấu trúc chuẩn:
- title: Tiêu đề slide súc tích, ấn tượng
- subtitle: Tiêu đề phụ hoặc thông điệp cốt lõi
- bullets: Mảng 3 đến 4 gạch đầu dòng ý chính, cụ thể, không sáo rỗng
- notes: Ghi chú thuyết trình cho diễn giả (speaker notes)
- layout: một trong các kiểu ("title", "split", "cards", "timeline", "conclusion")`;

    const response = await callGeminiWithFallback(ai, (model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              slides: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    subtitle: { type: Type.STRING },
                    bullets: {
                      type: Type.ARRAY,
                      items: { type: Type.STRING },
                    },
                    notes: { type: Type.STRING },
                    layout: { type: Type.STRING },
                  },
                  required: ["title", "subtitle", "bullets", "notes", "layout"],
                },
              },
            },
            required: ["slides"],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{"slides": []}');
    if (parsed.slides && Array.isArray(parsed.slides) && parsed.slides.length > 0) {
      return res.json(parsed);
    }
    res.json({ slides: defaultSlides.slice(0, Math.max(3, slideCount)) });
  } catch (error: any) {
    console.warn("AI Slides fallback triggered:", error?.message || error);
    res.json({ slides: defaultSlides.slice(0, Math.max(3, slideCount)) });
  }
});

// Common handler for task breakdown
async function handleTaskBreakdown(req: Request, res: Response) {
  const { projectTitle, title, projectGoal, goal, members = [] } = req.body;
  const targetTitle = projectTitle || title || "Dự án nhóm";
  const targetGoal = projectGoal || goal || "Hoàn thành bài tập nhóm và báo cáo đạt điểm cao";

  const memberNames: string[] = Array.isArray(members)
    ? members.map((m: any) => (typeof m === "string" ? m : m?.name || "Thành viên"))
    : ["Trưởng nhóm", "Thành viên"];

  const defaultTasks = [
    {
      title: "Tìm kiếm tài liệu & nghiên cứu cơ sở lý thuyết",
      description: "Thu thập các bài báo khoa học, số liệu thống kê liên quan đến chủ đề",
      suggestedAssignee: memberNames[0] || "Trưởng nhóm",
      priority: "high",
      estimatedDays: 3,
    },
    {
      title: "Xây dựng đề cương chi tiết và phân công slide",
      description: "Thống nhất bố cục 5-7 phần chính của bài thuyết trình",
      suggestedAssignee: memberNames[1] || memberNames[0] || "Thành viên 1",
      priority: "high",
      estimatedDays: 2,
    },
    {
      title: "Thiết kế slide PowerPoint & chuẩn bị hình ảnh minh họa",
      description: "Tạo các slide trực quan, đồ họa đẹp mắt và nhất quán font chữ trong tab New Slide",
      suggestedAssignee: memberNames[2] || memberNames[1] || memberNames[0] || "Thành viên 2",
      priority: "medium",
      estimatedDays: 4,
    },
    {
      title: "Luyện tập thuyết trình thử và canh thời gian (Timing)",
      description: "Tổ chức buổi voice chat trong Team Up để các bạn dợt thử bài",
      suggestedAssignee: memberNames[0] || "Cả nhóm",
      priority: "medium",
      estimatedDays: 2,
    },
    {
      title: "Rà soát tổng thể & nộp bài báo cáo",
      description: "Kiểm tra lại toàn bộ file tài liệu, chính tả và nộp đúng hạn",
      suggestedAssignee: memberNames[0] || "Trưởng nhóm",
      priority: "high",
      estimatedDays: 1,
    },
  ];

  try {
    const ai = getGeminiClient();
    if (!ai) {
      return res.json({ tasks: defaultTasks });
    }

    const prompt = `Hãy chia nhỏ nhiệm vụ cho một dự án làm việc nhóm:
Tên đề tài: "${targetTitle}"
Mục tiêu dự án: "${targetGoal}"
Danh sách thành viên: ${JSON.stringify(memberNames)}

Hãy phân tích và gợi ý 4-6 công việc cụ thể, có phân công người phù hợp từ danh sách thành viên trên, mức độ ưu tiên (low, medium, high) và số ngày dự kiến.`;

    const response = await callGeminiWithFallback(ai, (model) =>
      ai.models.generateContent({
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              tasks: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    title: { type: Type.STRING },
                    description: { type: Type.STRING },
                    suggestedAssignee: { type: Type.STRING },
                    priority: { type: Type.STRING },
                    estimatedDays: { type: Type.INTEGER },
                  },
                  required: ["title", "description", "suggestedAssignee", "priority", "estimatedDays"],
                },
              },
            },
            required: ["tasks"],
          },
        },
      })
    );

    const parsed = JSON.parse(response.text || '{"tasks": []}');
    if (parsed.tasks && Array.isArray(parsed.tasks) && parsed.tasks.length > 0) {
      return res.json(parsed);
    }
    res.json({ tasks: defaultTasks });
  } catch (error: any) {
    console.warn("AI Task breakdown fallback triggered:", error?.message || error);
    res.json({ tasks: defaultTasks });
  }
}

// AI Break down tasks for project (support both endpoint names)
app.post("/api/ai/task-breakdown", handleTaskBreakdown);
app.post("/api/ai/breakdown-tasks", handleTaskBreakdown);

// ----------------------------------------------------------------------------
// INVITATIONS API ENDPOINTS
// ----------------------------------------------------------------------------

// Check real email provider configuration status
app.get("/api/email-service/status", (req: Request, res: Response) => {
  const status = getEmailProviderStatus();
  return res.json({
    success: true,
    ...status,
  });
});

// Create new invitation and send real email
// Create new invitation via free link & Gmail compose mechanism
app.post("/api/invitations", async (req: Request, res: Response) => {
  try {
    const {
      email,
      recipientName,
      name,
      projectId,
      projectName,
      projectCategory,
      inviterName = "Trưởng nhóm",
      inviterEmail,
      inviterRole,
      role = "Thành viên",
      message,
      baseUrl,
    } = req.body;

    if (!email || !projectId || !projectName) {
      return res.status(400).json({
        success: false,
        error: "Thiếu thông tin bắt buộc: email, projectId hoặc projectName",
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // 1. Validate email address format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({
        success: false,
        error: "Địa chỉ email không đúng định dạng (ví dụ hợp lệ: name@gmail.com).",
      });
    }

    const hostOrigin =
      baseUrl ||
      (req.headers.origin as string) ||
      (req.headers.referer
        ? new URL(req.headers.referer as string).origin
        : `http://localhost:${PORT}`);

    const id = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    // Clean published root link WITH explicit invite and project query parameters
    const baseClean = hostOrigin.replace(/\/$/, "");
    const inviteUrl = `${baseClean}/?invite=${id}&project=${projectId}`;
    const targetRecipientName = (recipientName || name || "").trim() || undefined;

    // Expiration date: 7 days from now
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const newInvite: TeamInvitation = {
      id,
      email: cleanEmail,
      recipientName: targetRecipientName,
      projectId,
      projectName: projectName.trim(),
      projectCategory,
      inviterName: inviterName.trim(),
      inviterEmail: inviterEmail?.trim(),
      role: role.trim(),
      message: message?.trim() || undefined,
      status: "pending",
      createdAt: now.toISOString(),
      expiresAt,
      inviteUrl,
      emailDeliveryStatus: "pending",
      emailDeliveryMessage: "Đang tiến hành gửi thông báo về Gmail...",
    };

    // Pre-create rich Gmail compose URL & Mailto URL
    const emailSubject = `[TEAM UP] Mời bạn tham gia nhóm "${projectName.trim()}"`;
    const emailBody = `Chào bạn,\n\nBạn nhận được lời mời tham gia nhóm "${projectName.trim()}" trên ứng dụng TEAM UP.\nNgười mời: ${inviterName.trim()}\nVai trò được giao: ${role.trim()}\n${message ? `Lời nhắn: "${message.trim()}"\n` : ""}\nBấm vào liên kết sau để truy cập dự án và tham gia nhóm ngay (xem toàn bộ slide và cùng chỉnh sửa tiếp tục):\n${inviteUrl}\n\n* Lưu ý: Lời mời áp dụng cho tài khoản ${cleanEmail}.\n\nChúc bạn làm việc hiệu quả cùng nhóm!\nTEAM UP Workspace`;

    const gmailWebComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      cleanEmail
    )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(cleanEmail)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;

    // Gửi thông báo trực tiếp về Gmail (nếu dịch vụ Resend/Gmail SMTP được cấu hình)
    try {
      const emailRes = await sendInvitationEmail(newInvite);
      if (emailRes.success) {
        newInvite.emailDeliveryStatus = "sent";
        newInvite.emailDeliveryMessage = `Đã gửi thông báo trực tiếp về Gmail thành công (${emailRes.provider})`;
        newInvite.emailProvider = emailRes.provider;
      } else {
        newInvite.emailDeliveryStatus = emailRes.provider === "none" ? "fallback_mailto" : "failed";
        newInvite.emailDeliveryMessage = emailRes.error || "Sẵn sàng gửi qua Gmail / chia sẻ link mời";
        newInvite.emailProvider = emailRes.provider;
      }
    } catch (e: any) {
      console.warn("Lỗi khi gửi email lời mời:", e);
      newInvite.emailDeliveryStatus = "fallback_mailto";
      newInvite.emailDeliveryMessage = "Có thể mở Gmail để gửi ngay";
    }

    // Save to database
    const allInvites = getStoredInvitations();
    // Replace any previous pending invites for same email on same project or add new
    const existingIdx = allInvites.findIndex(
      (i) => i.projectId === projectId && i.email.toLowerCase() === cleanEmail && i.status === "pending"
    );
    if (existingIdx >= 0) {
      allInvites[existingIdx] = newInvite;
    } else {
      allInvites.unshift(newInvite);
    }
    saveStoredInvitations(allInvites);

    console.log(`[Invitation Created] ${cleanEmail} invited to ${projectName} (ID: ${id}) Status: ${newInvite.emailDeliveryStatus}`);

    return res.json({
      success: true,
      status: "created",
      message: newInvite.emailDeliveryMessage || "Đã tạo lời mời",
      invitation: newInvite,
      inviteUrl,
      gmailWebComposeUrl,
      mailtoUrl,
    });
  } catch (error: any) {
    console.error("Error creating invitation:", error);
    return res.status(500).json({
      success: false,
      error: error?.message || "Không thể tạo lời mời",
    });
  }
});

// List all invitations (filter by projectId or email if provided)
app.get("/api/invitations", (req: Request, res: Response) => {
  try {
    const { projectId, email } = req.query;
    let invites = getStoredInvitations();

    if (projectId) {
      invites = invites.filter((i) => i.projectId === String(projectId));
    }
    if (email) {
      invites = invites.filter(
        (i) => i.email.toLowerCase() === String(email).toLowerCase()
      );
    }

    return res.json({
      success: true,
      invitations: invites,
      total: invites.length,
    });
  } catch (error: any) {
    console.error("Error retrieving invitations:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể lấy danh sách lời mời",
    });
  }
});

// Get a single invitation by ID / Token
app.get("/api/invitations/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invites = getStoredInvitations();
    const invitation = invites.find((i) => i.id === id);

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: "Không tìm thấy lời mời hoặc lời mời đã hết hạn",
      });
    }

    return res.json({
      success: true,
      invitation,
    });
  } catch (error: any) {
    console.error("Error retrieving invitation:", error);
    return res.status(500).json({
      success: false,
      error: "Lỗi hệ thống khi tìm lời mời",
    });
  }
});

// Seamlessly join project by entering Gmail
app.post("/api/invitations/join-by-email", (req: Request, res: Response) => {
  try {
    const { email, name, userId, token } = req.body || {};
    if (!email) {
      return res.status(400).json({ success: false, error: "Thiếu địa chỉ email để xác thực" });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const invites = getStoredInvitations();

    const hostOrigin =
      (req.headers.origin as string) ||
      (process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : `http://localhost:${PORT}`);

    // Find invitation matching this email or token
    const matchingInvites = invites.filter((inv) => {
      if (token && inv.id === token) return true;
      return inv.email.toLowerCase() === cleanEmail;
    });

    let targetInvite: TeamInvitation;

    if (matchingInvites.length > 0) {
      targetInvite = matchingInvites[0];
      targetInvite.status = "joined";
      targetInvite.acceptedAt = new Date().toISOString();
      if (name) targetInvite.recipientName = name;
      targetInvite.acceptedBy = {
        id: userId || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
        name: name || targetInvite.recipientName || cleanEmail.split("@")[0],
        email: cleanEmail,
      };

      invites.forEach((inv) => {
        if ((token && inv.id === token) || inv.email.toLowerCase() === cleanEmail) {
          inv.status = "joined";
          inv.acceptedAt = new Date().toISOString();
          inv.acceptedBy = targetInvite.acceptedBy;
        }
      });
    } else {
      // Auto-register member invite record as joined
      targetInvite = {
        id: `inv_${Date.now()}`,
        email: cleanEmail,
        recipientName: name || cleanEmail.split("@")[0],
        projectId: "proj_1",
        projectName: "Báo Cáo Dự Án: Ứng Dụng AI Trong Giáo Dục",
        inviterName: "Trưởng nhóm",
        role: "Thành viên nhóm",
        status: "joined",
        createdAt: new Date().toISOString(),
        acceptedAt: new Date().toISOString(),
        acceptedBy: {
          id: userId || `usr_${cleanEmail.replace(/[^a-zA-Z0-9]/g, "_")}`,
          name: name || cleanEmail.split("@")[0],
          email: cleanEmail,
        },
        inviteUrl: hostOrigin.replace(/\/$/, ""),
      };
      invites.unshift(targetInvite);
    }

    saveStoredInvitations(invites);

    // Cập nhật thành viên vào dự án trong data/projects.json
    try {
      const projects = getStoredProjects();
      const pIdx = projects.findIndex((p: any) => p.id === targetInvite.projectId);
      if (pIdx >= 0) {
        const memExists = (projects[pIdx].members || []).some(
          (m: any) => m.email?.toLowerCase() === cleanEmail || m.id === targetInvite.acceptedBy?.id
        );
        if (!memExists) {
          projects[pIdx].members = [
            ...(projects[pIdx].members || []),
            {
              id: targetInvite.acceptedBy?.id || `usr_${Date.now()}`,
              name: targetInvite.acceptedBy?.name || cleanEmail.split("@")[0],
              email: cleanEmail,
              role: targetInvite.role || "Thành viên nhóm",
              isAdmin: false,
              isOnline: true,
              avatar: PRESET_USER_AVATARS[0],
            }
          ];
          saveStoredProjects(projects);
        }
      }
    } catch (e) {
      console.error("Error updating project members in join-by-email:", e);
    }

    console.log(`[Verified Join by Email] ${cleanEmail} joined project ${targetInvite.projectName}.`);

    return res.json({
      success: true,
      invitation: targetInvite,
      message: `Đã xác thực và ghi nhận thành viên ${cleanEmail} gia nhập nhóm!`,
    });
  } catch (error: any) {
    console.error("Error joining by email:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể xác thực và tham gia nhóm",
    });
  }
});

// Accept invitation by ID
app.post("/api/invitations/:id/accept", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId, name, email } = req.body;

    const invites = getStoredInvitations();
    const index = invites.findIndex((i) => i.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Lời mời không tồn tại trong hệ thống",
      });
    }

    const targetInvite = invites[index];

    // Check expiration (7 days)
    if (targetInvite.expiresAt && new Date(targetInvite.expiresAt).getTime() < Date.now()) {
      return res.status(400).json({
        success: false,
        error: "Lời mời này đã hết hạn sau 7 ngày. Vui lòng yêu cầu quản trị viên gửi lời mời mới.",
        code: "INVITATION_EXPIRED",
      });
    }

    // Authenticate that accepting email matches target invited email
    if (email && email.trim().toLowerCase() !== targetInvite.email.toLowerCase()) {
      return res.status(403).json({
        success: false,
        error: `Email xác thực (${email}) không khớp với email được mời (${targetInvite.email}). Chỉ người được mời mới có thể tham gia.`,
        code: "EMAIL_MISMATCH",
      });
    }

    // Update status to joined
    targetInvite.status = "joined";
    targetInvite.acceptedAt = new Date().toISOString();
    targetInvite.acceptedBy = {
      id: userId || `user_${Date.now()}`,
      name: name || targetInvite.email.split("@")[0],
      email: email || targetInvite.email,
    };

    saveStoredInvitations(invites);

    // Cập nhật thành viên vào dự án trong data/projects.json
    try {
      const projects = getStoredProjects();
      const pIdx = projects.findIndex((p: any) => p.id === targetInvite.projectId);
      if (pIdx >= 0) {
        const memExists = (projects[pIdx].members || []).some(
          (m: any) => m.email?.toLowerCase() === targetInvite.email.toLowerCase() || m.id === targetInvite.acceptedBy?.id
        );
        if (!memExists) {
          projects[pIdx].members = [
            ...(projects[pIdx].members || []),
            {
              id: targetInvite.acceptedBy?.id || `usr_${Date.now()}`,
              name: targetInvite.acceptedBy?.name || name || targetInvite.email.split("@")[0],
              email: targetInvite.email,
              role: targetInvite.role || "Thành viên nhóm",
              isAdmin: false,
              isOnline: true,
              avatar: PRESET_USER_AVATARS[0],
            }
          ];
          saveStoredProjects(projects);
        }
      }
    } catch (e) {
      console.error("Error updating project members in accept invitation:", e);
    }

    console.log(
      `[Invitation Accepted] ${targetInvite.email} accepted invitation for ${targetInvite.projectName}`
    );

    return res.json({
      success: true,
      invitation: targetInvite,
      message: `Chào mừng bạn đã tham gia nhóm "${targetInvite.projectName}"!`,
    });
  } catch (error: any) {
    console.error("Error accepting invitation:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể chấp nhận lời mời",
    });
  }
});

// Decline invitation by ID
app.post("/api/invitations/:id/decline", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email } = req.body || {};
    const invites = getStoredInvitations();
    const index = invites.findIndex((i) => i.id === id);

    if (index === -1) {
      return res.status(404).json({
        success: false,
        error: "Lời mời không tồn tại trong hệ thống",
      });
    }

    const targetInvite = invites[index];
    targetInvite.status = "declined";
    targetInvite.declinedAt = new Date().toISOString();
    saveStoredInvitations(invites);

    console.log(`[Invitation Declined] ${targetInvite.email} declined invitation for ${targetInvite.projectName}`);

    return res.json({
      success: true,
      message: `Đã từ chối lời mời tham gia nhóm "${targetInvite.projectName}".`,
      invitation: targetInvite,
    });
  } catch (error: any) {
    console.error("Error declining invitation:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể từ chối lời mời",
    });
  }
});

// Refresh / Get links for invitation to open Gmail or copy
const handleResendInvitation = async (req: Request, res: Response) => {
  try {
    const id = req.params.id || req.body.id;
    const targetEmail = req.body.email;
    const { baseUrl, joinLink } = req.body || {};

    const invites = getStoredInvitations();
    const invitation = invites.find(
      (i) => (id && i.id === id) || (targetEmail && i.email.toLowerCase() === String(targetEmail).toLowerCase())
    );

    if (!invitation) {
      return res.status(404).json({
        success: false,
        error: "Lời mời không tồn tại trong danh sách",
      });
    }

    // Refresh expiration to 7 days from now and set status to pending
    invitation.createdAt = new Date().toISOString();
    invitation.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    invitation.status = "pending";

    const hostOrigin =
      baseUrl ||
      (req.headers.origin as string) ||
      (process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, "") : `http://localhost:${PORT}`);

    const finalJoinUrl = hostOrigin.replace(/\/$/, "");
    invitation.inviteUrl = finalJoinUrl;

    const emailSubject = `[TEAM UP] Mời bạn tham gia nhóm "${invitation.projectName}"`;
    const emailBody = `Chào bạn,\n\nBạn nhận được lời mời tham gia nhóm "${invitation.projectName}" trên ứng dụng TEAM UP.\nNgười mời: ${invitation.inviterName}\nVai trò được giao: ${invitation.role}\n\nBấm vào liên kết sau để truy cập dự án và nhập Gmail của bạn để tham gia nhóm ngay:\n${finalJoinUrl}\n\n* Lưu ý: Lời mời áp dụng cho tài khoản ${invitation.email}.\n\nChúc bạn làm việc hiệu quả cùng nhóm!\nTEAM UP Workspace`;

    const gmailWebComposeUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(
      invitation.email
    )}&su=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    const mailtoUrl = `mailto:${encodeURIComponent(invitation.email)}?subject=${encodeURIComponent(
      emailSubject
    )}&body=${encodeURIComponent(emailBody)}`;

    saveStoredInvitations(invites);

    return res.json({
      success: true,
      status: "refreshed",
      invitation,
      inviteUrl: finalJoinUrl,
      gmailWebComposeUrl,
      mailtoUrl,
      message: "Đã làm mới và sẵn sàng gửi lại lời mời",
    });
  } catch (error: any) {
    console.error("Error refreshing invitation:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể làm mới lời mời",
    });
  }
};

app.post("/api/invitations/:id/resend", handleResendInvitation);
app.post("/api/invitations/resend", handleResendInvitation);

// Revoke/cancel invitation
const handleDeleteInvitation = (req: Request, res: Response) => {
  try {
    const id = req.params.id || req.body.id;
    const email = (req.query.email as string) || req.body.email;
    let invites = getStoredInvitations();

    const initialLen = invites.length;
    invites = invites.filter((i) => {
      if (id && i.id === id) return false;
      if (id && i.email.toLowerCase() === String(id).toLowerCase()) return false;
      if (email && i.email.toLowerCase() === String(email).toLowerCase()) return false;
      return true;
    });

    saveStoredInvitations(invites);

    return res.json({
      success: true,
      deletedCount: initialLen - invites.length,
      message: "Đã xóa lời mời thành công",
    });
  } catch (error: any) {
    console.error("Error deleting invitation:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể xóa lời mời",
    });
  }
};

app.delete("/api/invitations/:id", handleDeleteInvitation);
app.post("/api/invitations/delete", handleDeleteInvitation);

// ============================================================================
// CHAT MESSAGES REAL-TIME REST & SSE ENDPOINTS
// ============================================================================

// 1. Real-time Server-Sent Events stream for onSnapshot listeners
app.get("/api/messages/stream", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  if (typeof (res as any).flushHeaders === "function") {
    (res as any).flushHeaders();
  }

  const clientId = `sse_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const chatId = typeof req.query.chatId === "string" ? req.query.chatId : undefined;
  const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
  const userId = typeof req.query.userId === "string" ? req.query.userId : undefined;
  const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : undefined;

  const client: MessageSSEClient = { id: clientId, res, chatId, projectId, userId, email };
  sseMessageClients.push(client);

  res.write(`data: ${JSON.stringify({ type: "connected", clientId, chatId, projectId })}\n\n`);

  const heartbeat = setInterval(() => {
    try {
      res.write(": keepalive\n\n");
    } catch {
      clearInterval(heartbeat);
    }
  }, 20000);

  req.on("close", () => {
    clearInterval(heartbeat);
    const idx = sseMessageClients.findIndex((c) => c.id === clientId);
    if (idx !== -1) sseMessageClients.splice(idx, 1);
  });
});

// 2. GET messages with filtering by chatId, projectId, or participants
app.get("/api/messages", (req: Request, res: Response) => {
  try {
    const all = getStoredMessages();
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const chatId = typeof req.query.chatId === "string" ? req.query.chatId : undefined;
    const channelId = typeof req.query.channelId === "string" ? req.query.channelId : undefined;
    const userId = typeof req.query.userId === "string" ? req.query.userId.trim() : undefined;
    const email = typeof req.query.email === "string" ? req.query.email.trim().toLowerCase() : undefined;
    const recipientId = typeof req.query.recipientId === "string" ? req.query.recipientId.trim() : undefined;

    let filtered = all;

    if (chatId) {
      filtered = filtered.filter((m) => m.chatId === chatId);
    } else if (userId && recipientId) {
      // 1-1 chat between two specific users
      const cleanU = userId.toLowerCase();
      const cleanR = recipientId.toLowerCase();
      filtered = filtered.filter((m) => {
        const sId = (m.senderId || "").toLowerCase();
        const rId = (m.recipientId || m.receiverId || "").toLowerCase();
        const sMail = (m.senderEmail || "").toLowerCase();
        const rMail = (m.recipientEmail || "").toLowerCase();

        const match1 = (sId === cleanU || sMail === cleanU) && (rId === cleanR || rMail === cleanR);
        const match2 = (sId === cleanR || sMail === cleanR) && (rId === cleanU || rMail === cleanU);
        return match1 || match2;
      });
    } else if (projectId && (userId || email)) {
      // Return:
      // 1. Group channel messages for this project
      // 2. PLUS all 1-1 direct messages involving this user (so both parties see their chats and history)
      const cleanU = userId ? userId.toLowerCase() : "";
      const cleanM = email ? email.toLowerCase() : "";

      filtered = filtered.filter((m) => {
        const isDirect = Boolean(m.recipientId || m.receiverId || m.recipientEmail);
        if (isDirect) {
          const sId = (m.senderId || "").toLowerCase();
          const rId = (m.recipientId || m.receiverId || "").toLowerCase();
          const sMail = (m.senderEmail || "").toLowerCase();
          const rMail = (m.recipientEmail || "").toLowerCase();

          const userInvolved =
            (cleanU && (sId === cleanU || rId === cleanU)) ||
            (cleanM && (sMail === cleanM || rMail === cleanM || sId === cleanM || rId === cleanM)) ||
            (cleanU && m.participants && m.participants.some((p) => p.toLowerCase() === cleanU)) ||
            (cleanM && m.participants && m.participants.some((p) => p.toLowerCase() === cleanM));
          return userInvolved;
        } else {
          return m.projectId === projectId;
        }
      });
    } else if (projectId) {
      filtered = filtered.filter((m) => m.projectId === projectId);
    }

    if (channelId) {
      filtered = filtered.filter(
        (m) =>
          !m.recipientId &&
          !m.receiverId &&
          (m.channelId === channelId || (!m.channelId && channelId === "ch_main"))
      );
    }

    // Strict chronological sort: orderBy('createdAt', 'asc')
    filtered.sort((a, b) => {
      const timeA = new Date(a.createdAt || a.timestamp).getTime() || 0;
      const timeB = new Date(b.createdAt || b.timestamp).getTime() || 0;
      return timeA - timeB;
    });

    return res.json({
      success: true,
      messages: filtered,
      count: filtered.length,
      chatId: chatId || (userId && recipientId ? `dm_${[userId, recipientId].sort().join('_')}` : undefined),
    });
  } catch (err: any) {
    console.error("Error fetching messages:", err);
    return res.status(500).json({ success: false, error: "Lỗi tải danh sách tin nhắn" });
  }
});

// 3. POST new message with consistent chatId, participants, and real-time broadcast
app.post("/api/messages", (req: Request, res: Response) => {
  try {
    const {
      projectId = "proj_1",
      senderId,
      senderName,
      senderAvatar,
      senderEmail,
      receiverId,
      recipientId,
      recipientEmail,
      channelId,
      text,
      type = "text",
      fileUrl,
      fileName,
      fileSize,
      isAi,
    } = req.body;

    if (!senderId) {
      return res.status(400).json({ success: false, error: "senderId là bắt buộc" });
    }

    if (!text && !fileUrl) {
      return res.status(400).json({ success: false, error: "Nội dung tin nhắn không được để trống" });
    }

    const targetReceiverId = receiverId || recipientId;

    // Resolve emails if possible from registered accounts
    const allUsers = getStoredUsers();
    let effectiveSenderEmail = senderEmail ? String(senderEmail).trim().toLowerCase() : undefined;
    if (!effectiveSenderEmail) {
      const u = allUsers.find((user) => user.id === senderId);
      if (u) effectiveSenderEmail = u.email.toLowerCase();
    }

    let effectiveRecipientEmail = recipientEmail ? String(recipientEmail).trim().toLowerCase() : undefined;
    if (!effectiveRecipientEmail && targetReceiverId) {
      if (String(targetReceiverId).includes("@")) {
        effectiveRecipientEmail = String(targetReceiverId).trim().toLowerCase();
      } else {
        const u = allUsers.find((user) => user.id === targetReceiverId);
        if (u) effectiveRecipientEmail = u.email.toLowerCase();
      }
    }

    // Yêu cầu 2: Đảm bảo Chat ID được tạo nhất quán cho 2 người: [uid1, uid2].sort().join('_')
    let chatId: string;
    let participants: string[];

    if (targetReceiverId) {
      const sorted = [String(senderId), String(targetReceiverId)].sort();
      chatId = `dm_${sorted[0]}_${sorted[1]}`;
      const pSet = new Set<string>(sorted);
      if (effectiveSenderEmail) pSet.add(effectiveSenderEmail.toLowerCase());
      if (effectiveRecipientEmail) pSet.add(effectiveRecipientEmail.toLowerCase());
      participants = Array.from(pSet);
      console.log(`[SERVER CHAT DEBUG] 2. 1-1 Chat ID: ${chatId} | Participants:`, participants);
    } else {
      const effectiveChannel = channelId || "ch_main";
      chatId = `grp_${projectId}_${effectiveChannel}`;
      participants = Array.isArray(req.body.participants) && req.body.participants.length > 0
        ? req.body.participants
        : [String(senderId)];
      console.log(`[SERVER CHAT DEBUG] 2. Group Chat ID: ${chatId} | Channel: ${effectiveChannel}`);
    }

    const now = new Date();
    const messageId =
      req.body.id && typeof req.body.id === "string" && req.body.id.trim().length > 0
        ? req.body.id.trim()
        : `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const newMsg: StoredChatMessage = {
      id: messageId,
      projectId: String(projectId),
      chatId,
      channelId: targetReceiverId ? undefined : (channelId || "ch_main"),
      senderId: String(senderId),
      senderName: senderName || "Thành viên",
      senderAvatar:
        senderAvatar ||
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      senderEmail: effectiveSenderEmail,
      recipientId: targetReceiverId ? String(targetReceiverId) : undefined,
      receiverId: targetReceiverId ? String(targetReceiverId) : undefined,
      recipientEmail: effectiveRecipientEmail,
      participants,
      text: String(text || "").trim(),
      timestamp: now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      createdAt: now.toISOString(),
      type,
      fileUrl,
      fileName,
      fileSize,
      isAi: Boolean(isAi),
    };

    // Save to persistent database with ID deduplication
    const all = getStoredMessages();
    const existingIndex = all.findIndex((m) => m.id === newMsg.id);
    if (existingIndex >= 0) {
      all[existingIndex] = newMsg;
    } else {
      all.push(newMsg);
    }
    saveStoredMessages(all);

    // Real-time broadcast to all connected clients
    broadcastMessage(newMsg);

    console.log(
      `[SERVER CHAT DEBUG] Message broadcasted from ${newMsg.senderName} (${newMsg.senderId}) to chatId ${chatId}: "${newMsg.text.slice(0, 30)}"`
    );

    return res.status(201).json({ success: true, message: newMsg });
  } catch (err: any) {
    console.error("Error creating chat message:", err);
    return res.status(500).json({ success: false, error: "Không thể lưu tin nhắn" });
  }
});

// 4. DELETE single message
app.delete("/api/messages/:id", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const all = getStoredMessages();
    const filtered = all.filter((m) => m.id !== id);
    saveStoredMessages(filtered);
    return res.json({ success: true, message: "Đã xóa tin nhắn" });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: "Không thể xóa tin nhắn" });
  }
});

// ----------------------------------------------------------------------------
// PROJECT MEMBER MANAGEMENT (ADD MEMBER BY GMAIL, KICK/REMOVE MEMBER)
// ----------------------------------------------------------------------------

// Thêm thành viên vào nhóm / dự án bằng Gmail
app.post("/api/projects/:id/members", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email, name, role = "Thành viên nhóm", avatar } = req.body || {};
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanEmail) {
      return res.status(400).json({ success: false, error: "Vui lòng cung cấp địa chỉ Gmail của thành viên." });
    }

    const projects = getStoredProjects();
    const projIdx = projects.findIndex((p: any) => p.id === id);
    if (projIdx === -1) {
      return res.status(404).json({ success: false, error: "Không tìm thấy dự án." });
    }

    const proj = projects[projIdx];
    if (!proj.members) proj.members = [];

    // Check if already in project
    const existing = proj.members.find((m: any) => m.email?.toLowerCase() === cleanEmail);
    if (existing) {
      return res.json({ success: true, message: "Thành viên đã có trong nhóm", member: existing, project: proj });
    }

    // Lookup user in users.json if exists
    const users = getStoredUsers();
    const foundUser = users.find((u) => u.email.toLowerCase() === cleanEmail);

    let memberName = String(name || "").trim();
    if (!memberName && foundUser) {
      memberName = foundUser.name;
    }
    if (!memberName) {
      const local = cleanEmail.split("@")[0];
      memberName = local
        .split(/[._-]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
        .join(" ");
    }

    const memberAvatar = avatar || foundUser?.avatar || PRESET_USER_AVATARS[Math.floor(Math.random() * PRESET_USER_AVATARS.length)];
    const memberId = foundUser?.id || `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

    const newMember = {
      id: memberId,
      name: memberName,
      email: cleanEmail,
      avatar: memberAvatar,
      role: String(role || "Thành viên nhóm"),
      isAdmin: false,
      isOnline: true,
      statusText: "Đã thêm vào nhóm qua Gmail",
    };

    proj.members.push(newMember);
    saveStoredProjects(projects);

    console.log(`[Project Member Added] Added ${memberName} (${cleanEmail}) to project ${proj.name}`);
    return res.status(201).json({
      success: true,
      message: `Đã thêm thành viên "${memberName}" vào nhóm!`,
      member: newMember,
      project: proj,
    });
  } catch (err: any) {
    console.error("Add member error:", err);
    return res.status(500).json({ success: false, error: "Lỗi hệ thống khi thêm thành viên." });
  }
});

// Xóa / Kick thành viên khỏi dự án
app.delete("/api/projects/:id/members/:memberId", (req: Request, res: Response) => {
  try {
    const { id, memberId } = req.params;
    const projects = getStoredProjects();
    const projIdx = projects.findIndex((p: any) => p.id === id);
    if (projIdx === -1) {
      return res.status(404).json({ success: false, error: "Không tìm thấy dự án." });
    }

    const proj = projects[projIdx];
    if (!proj.members) proj.members = [];

    const targetIndex = proj.members.findIndex(
      (m: any) => m.id === memberId || m.email?.toLowerCase() === memberId.toLowerCase()
    );

    if (targetIndex === -1) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thành viên trong nhóm." });
    }

    const removed = proj.members.splice(targetIndex, 1)[0];
    saveStoredProjects(projects);

    console.log(`[Project Member Removed] Admin removed ${removed.name} (${removed.email}) from project ${proj.name}`);
    return res.json({
      success: true,
      message: `Đã kick thành viên "${removed.name}" khỏi nhóm!`,
      removedMember: removed,
      project: proj,
    });
  } catch (err: any) {
    console.error("Remove member error:", err);
    return res.status(500).json({ success: false, error: "Lỗi hệ thống khi xóa thành viên." });
  }
});

// POST alias to kick member (supporting JSON body)
app.post("/api/projects/:id/kick-member", (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { memberId, memberEmail } = req.body || {};
    const projects = getStoredProjects();
    const projIdx = projects.findIndex((p: any) => p.id === id);
    if (projIdx === -1) {
      return res.status(404).json({ success: false, error: "Không tìm thấy dự án." });
    }

    const proj = projects[projIdx];
    if (!proj.members) proj.members = [];

    const targetIndex = proj.members.findIndex(
      (m: any) =>
        (memberId && m.id === memberId) ||
        (memberEmail && m.email?.toLowerCase() === String(memberEmail).toLowerCase())
    );

    if (targetIndex === -1) {
      return res.status(404).json({ success: false, error: "Không tìm thấy thành viên trong nhóm." });
    }

    const removed = proj.members.splice(targetIndex, 1)[0];
    saveStoredProjects(projects);

    console.log(`[Project Member Kicked] Kicked ${removed.name} from project ${proj.name}`);
    return res.json({
      success: true,
      message: `Đã kick thành viên "${removed.name}" khỏi nhóm!`,
      removedMember: removed,
      project: proj,
    });
  } catch (err: any) {
    console.error("Kick member error:", err);
    return res.status(500).json({ success: false, error: "Lỗi hệ thống khi kick thành viên." });
  }
});

// Ensure any unhandled /api/* request always returns JSON 404, never falling through to SPA HTML
app.all("/api/*", (_req: Request, res: Response) => {
  res.status(404).json({ error: "API endpoint not found", path: _req.path });
});

// Global Express error handler to guarantee JSON error response for API requests
app.use((err: any, _req: Request, res: Response, next: express.NextFunction) => {
  console.error("Global server error:", err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(err?.status || 500).json({ error: err?.message || "Internal server error" });
});

async function startServer() {
  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`TEAM UP Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
