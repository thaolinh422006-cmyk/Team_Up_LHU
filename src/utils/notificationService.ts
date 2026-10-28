// Browser Desktop / Device Notification Service
import { playNotificationSound, NotificationSoundType } from './sound';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported';

export function getDeviceNotificationPermission(): NotificationPermissionStatus {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return Notification.permission as NotificationPermissionStatus;
}

export async function requestDeviceNotificationPermission(): Promise<NotificationPermissionStatus> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    let perm: NotificationPermission = Notification.permission;
    if (perm !== 'granted') {
      try {
        const req = Notification.requestPermission();
        if (req && typeof req.then === 'function') {
          perm = await req;
        } else {
          perm = await new Promise((resolve) => {
            try {
              Notification.requestPermission(resolve);
            } catch {
              resolve(Notification.permission);
            }
          });
        }
      } catch (innerErr) {
        console.warn('requestPermission call warning:', innerErr);
        perm = await new Promise((resolve) => {
          try {
            Notification.requestPermission(resolve);
          } catch {
            resolve(Notification.permission);
          }
        });
      }
    }

    const currentStatus = (Notification.permission || perm) as NotificationPermissionStatus;
    if (currentStatus === 'granted') {
      // Send a test confirmation notification to verify device receipt
      sendDeviceNotification({
        title: '🔔 TEAM UP: Đã kích hoạt thông báo!',
        body: 'Thông báo quan trọng từ nhóm sẽ được gửi trực tiếp về máy tính và điện thoại của bạn.',
        type: 'success',
      });
    }
    return currentStatus;
  } catch (err) {
    console.error('Lỗi khi xin quyền thông báo thiết bị:', err);
    return (Notification.permission as NotificationPermissionStatus) || 'denied';
  }
}

export interface DeviceNotificationOptions {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  type?: NotificationSoundType;
}

/**
 * Sends a native notification directly to the user's operating system (Windows, macOS, Android, Linux)
 * and plays a distinct audio chime.
 */
export function sendDeviceNotification(options: DeviceNotificationOptions): boolean {
  const { title, body, icon, tag, type = 'normal' } = options;

  // Always play notification sound for important alerts
  playNotificationSound(type);

  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }

  if (Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: icon || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=128&auto=format&fit=crop&q=80',
        badge: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=96&auto=format&fit=crop&q=80',
        tag: tag || `teamup_alert_${Date.now()}`,
        requireInteraction: type === 'urgent',
        silent: false,
      });

      // Auto close after 7s unless urgent
      if (type !== 'urgent') {
        setTimeout(() => {
          try {
            notif.close();
          } catch {}
        }, 7000);
      }

      notif.onclick = () => {
        window.focus();
        try {
          notif.close();
        } catch {}
      };

      return true;
    } catch (e) {
      console.warn('Could not trigger native Notification constructor:', e);
      return false;
    }
  }

  return false;
}
