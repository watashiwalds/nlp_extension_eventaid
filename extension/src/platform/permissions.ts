import {
  originPattern,
  validateEndpoint,
} from '../core/inference/provider-choice';

/**
 * Quyền host động cho endpoint người dùng nhập (KS-14).
 *
 * `chrome.permissions.request` PHẢI được gọi ngay trong thao tác người dùng
 * (click Lưu/Kiểm tra kết nối), trước mọi `await`, nếu không Chrome sẽ từ chối.
 * Vì vậy hàm xin quyền gọi `request` đồng bộ rồi mới trả Promise.
 */

/** Origin đã có trong `host_permissions` tĩnh của manifest. */
const STATIC_ORIGIN = 'http://127.0.0.1:8080';

export interface HostPermissionResult {
  granted: boolean;
  /** Lý do khi không xin được quyền; `null` khi đã có quyền. */
  reason: string | null;
}

function permissionsApi(): typeof chrome.permissions | null {
  if (typeof chrome === 'undefined' || !chrome.permissions) return null;
  return chrome.permissions;
}

/** Endpoint có cần xin quyền host lúc chạy hay không. */
export function needsHostPermission(endpoint: string): boolean {
  const checked = validateEndpoint(endpoint);
  if (!checked.ok) return true;
  return checked.origin !== STATIC_ORIGIN;
}

function deniedReason(origin: string): string {
  return `Không xin được quyền truy cập ${origin}. Hãy bấm lại nút trong Cài đặt; localhost chỉ hỗ trợ cổng 8080.`;
}

/**
 * Xin quyền host cho đúng origin của endpoint. Gọi hàm này trực tiếp trong
 * handler click (không bọc sau `await` khác) để giữ user gesture.
 */
export function ensureHostPermission(endpoint: string): Promise<HostPermissionResult> {
  const checked = validateEndpoint(endpoint);
  if (!checked.ok) return Promise.resolve({ granted: false, reason: checked.reason });
  if (!needsHostPermission(checked.endpoint)) {
    return Promise.resolve({ granted: true, reason: null });
  }

  const api = permissionsApi();
  if (!api || typeof api.request !== 'function') {
    return Promise.resolve({
      granted: false,
      reason: 'Trình duyệt không hỗ trợ cấp quyền theo origin.',
    });
  }

  let request: Promise<boolean>;
  try {
    request = api.request({ origins: [originPattern(checked.origin)] });
  } catch {
    return Promise.resolve({ granted: false, reason: deniedReason(checked.origin) });
  }

  return request.then(
    (granted) =>
      granted
        ? { granted: true, reason: null }
        : {
            granted: false,
            reason: `Bạn chưa cấp quyền truy cập ${checked.origin}. Endpoint chưa được lưu.`,
          },
    () => ({ granted: false, reason: deniedReason(checked.origin) }),
  );
}

/** Thu hồi quyền host của đúng origin; trả về `false` nếu trình duyệt không cho phép. */
export async function removeHostPermission(origin: string): Promise<boolean> {
  const api = permissionsApi();
  if (!api || typeof api.remove !== 'function') return false;
  try {
    return await api.remove({ origins: [originPattern(origin)] });
  } catch {
    return false;
  }
}
