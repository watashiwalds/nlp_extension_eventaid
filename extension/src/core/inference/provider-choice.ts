import type { LlmSettings } from '../../shared/contracts';

/**
 * Quy tắc thuần cho việc chọn nơi chạy suy luận (KS-14):
 * chuẩn hoá endpoint, phân biệt local/remote, xin consent theo origin.
 * Không đụng `chrome.*` để UI và offscreen dùng chung.
 */

export const DEFAULT_LOCAL_ENDPOINT = 'http://127.0.0.1:8080';

/** `URL.hostname` trả IPv6 kèm ngoặc vuông ở trình duyệt/Node. */
const LOCAL_HOSTS = new Set(['127.0.0.1', '::1', '[::1]', 'localhost']);

export function isLocalHost(hostname: string): boolean {
  return LOCAL_HOSTS.has(hostname.trim().toLowerCase());
}

/** Bỏ `/` cuối và phần đuôi API nếu người dùng dán cả URL hoàn chỉnh. */
export function normalizeEndpoint(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return '';
  try {
    const url = new URL(trimmed);
    let path = url.pathname.replace(/\/+$/, '');
    for (const suffix of ['/chat/completions', '/models', '/health']) {
      if (path.endsWith(suffix)) path = path.slice(0, -suffix.length).replace(/\/+$/, '');
    }
    url.pathname = path || '/';
    return url.toString().replace(/\/+$/, '');
  } catch {
    return trimmed.replace(/\/+$/, '');
  }
}

export interface EndpointOk {
  ok: true;
  endpoint: string;
  origin: string;
  local: boolean;
}

export interface EndpointError {
  ok: false;
  reason: string;
}

export type EndpointCheck = EndpointOk | EndpointError;

/** Chỉ localhost được HTTP; mọi host khác bắt buộc HTTPS. */
export function validateEndpoint(raw: string): EndpointCheck {
  const endpoint = normalizeEndpoint(raw);
  if (!endpoint) return { ok: false, reason: 'Chưa nhập địa chỉ endpoint.' };

  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return { ok: false, reason: 'Địa chỉ endpoint không hợp lệ. Ví dụ: https://example.com/v1' };
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return { ok: false, reason: 'Endpoint chỉ hỗ trợ giao thức http hoặc https.' };
  }
  if (url.username || url.password) {
    return { ok: false, reason: 'Không nhập tài khoản/mật khẩu trong URL; hãy dùng ô API key.' };
  }
  if (url.search || url.hash) {
    return { ok: false, reason: 'Endpoint không được chứa query string hoặc dấu #.' };
  }

  const local = isLocalHost(url.hostname);
  if (!local && url.protocol !== 'https:') {
    return { ok: false, reason: 'Endpoint ngoài máy phải dùng HTTPS. Chỉ localhost được dùng HTTP.' };
  }

  return { ok: true, endpoint, origin: url.origin, local };
}

export function endpointOrigin(raw: string): string | null {
  const checked = validateEndpoint(raw);
  return checked.ok ? checked.origin : null;
}

export function isLocalEndpoint(raw: string): boolean {
  const checked = validateEndpoint(raw);
  return checked.ok && checked.local;
}

/** Mẫu quyền host cho đúng origin người dùng nhập. */
export function originPattern(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/*`;
}

/** Consent chỉ cần khi thật sự gửi nội dung tới host không phải localhost. */
export function requiresConsent(settings: Pick<LlmSettings, 'provider' | 'endpoint'>): boolean {
  return settings.provider === 'openai-compatible' && !isLocalEndpoint(settings.endpoint);
}

export function hasConsent(
  settings: Pick<LlmSettings, 'provider' | 'endpoint' | 'consentByOrigin'>,
): boolean {
  if (!requiresConsent(settings)) return true;
  const origin = endpointOrigin(settings.endpoint);
  return origin ? Boolean(settings.consentByOrigin[origin]) : false;
}

/** Lý do chặn chạy remote, hoặc null nếu được phép. */
export function providerAccessProblem(
  settings: Pick<LlmSettings, 'provider' | 'endpoint' | 'consentByOrigin'>,
): string | null {
  if (!requiresConsent(settings)) return null;
  const origin = endpointOrigin(settings.endpoint);
  if (!origin) return 'Địa chỉ endpoint không hợp lệ. Hãy kiểm tra lại trong Cài đặt.';
  if (settings.consentByOrigin[origin]) return null;
  return `Chưa đồng ý gửi nội dung tới ${origin}. Mở Cài đặt để đồng ý hoặc chọn “Máy này”.`;
}

/**
 * Khi người dùng quay về “Máy này”, endpoint/key/model remote vẫn được giữ
 * trong `LlmSettings`. Local chỉ dùng các giá trị đó nếu endpoint đang là local;
 * nếu không, dùng đúng địa chỉ mặc định để không gửi nhầm ra ngoài.
 */
export function effectiveLocalEndpoint(settings: Pick<LlmSettings, 'endpoint'>): string {
  return isLocalEndpoint(settings.endpoint)
    ? normalizeEndpoint(settings.endpoint)
    : DEFAULT_LOCAL_ENDPOINT;
}

export function effectiveLocalValue(settings: Pick<LlmSettings, 'endpoint' | 'model'>): string {
  return isLocalEndpoint(settings.endpoint) ? settings.model : '';
}

export function effectiveLocalApiKey(settings: Pick<LlmSettings, 'endpoint' | 'apiKey'>): string {
  return isLocalEndpoint(settings.endpoint) ? settings.apiKey : '';
}

export function providerLabel(settings: Pick<LlmSettings, 'provider'>): string {
  return settings.provider === 'openai-compatible' ? 'endpoint ngoài' : 'Máy này';
}
