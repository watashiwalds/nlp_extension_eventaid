import { InferenceError } from '../../core/ports/inference';

/** Tiện ích HTTP dùng chung cho provider local và endpoint OpenAI-compatible. */

export function trimEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '');
}

export function authHeaders(apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
  return headers;
}

/** Không đưa key vào thông báo lỗi, kể cả khi máy chủ echo lại header. */
export function redactSecret(text: string, secret: string | undefined): string {
  const value = secret?.trim();
  return value ? text.split(value).join('***') : text;
}

export function shortBody(body: string, secret?: string): string {
  const compact = redactSecret(body, secret).replace(/\s+/g, ' ').trim();
  return compact.length > 160 ? `${compact.slice(0, 160)}…` : compact;
}

/** Tên ngắn để hiển thị với llama-server (thường trả đường dẫn tuyệt đối của file GGUF). */
export function displayModelName(id: string): string {
  const parts = id.split(/[\\/]/);
  return parts[parts.length - 1] || id;
}

export interface ModelsBody {
  data?: Array<{ id?: unknown }>;
  models?: Array<{ name?: unknown; model?: unknown }>;
}

/** Chấp nhận cả `{data:[{id}]}` (OpenAI) và `{models:[{name|model}]}` (một số server). */
export function firstModelId(data: ModelsBody | null): string | null {
  const fromData = data?.data?.[0]?.id;
  if (typeof fromData === 'string' && fromData.trim()) return fromData.trim();
  const first = data?.models?.[0];
  for (const value of [first?.model, first?.name]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export function retryAfterMs(headers: Headers): number | null {
  const raw = headers.get('Retry-After')?.trim();
  if (!raw) return null;
  const seconds = Number(raw);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1_000, 2_000);
  const date = Date.parse(raw);
  if (Number.isNaN(date)) return null;
  return Math.max(0, Math.min(date - Date.now(), 2_000));
}

/** Thông điệp tiếng Việt theo bảng lỗi của kế hoạch đa provider (§2.6). */
export function httpErrorReason(status: number, headers?: Headers): string {
  if (status === 401 || status === 403) return 'API key không đúng hoặc chưa được cấp quyền.';
  if (status === 404) return 'Không thấy model/endpoint. Hãy kiểm tra base URL và tên model.';
  if (status === 429) {
    const wait = headers ? retryAfterMs(headers) : null;
    const suffix = wait && wait > 0 ? ` Thử lại sau khoảng ${Math.max(1, Math.round(wait / 1_000))} giây.` : '';
    return `Đã chạm giới hạn tần suất/quota.${suffix}`;
  }
  if (status >= 500) return 'Dịch vụ đang lỗi; hãy thử lại sau.';
  return `Dịch vụ trả mã ${status}.`;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Không kết nối được máy chủ mô hình.';
}

/**
 * `fetch` có timeout và tôn trọng `AbortSignal` của người dùng.
 * Không tự retry ở đây — provider quyết định chính sách retry.
 */
export async function fetchWithTimeout(
  url: string,
  init: { method: string; body?: string; headers?: Record<string, string> },
  timeoutMs: number,
  outerSignal: AbortSignal | undefined,
  networkMessage: string,
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onAbort = (): void => controller.abort();
  outerSignal?.addEventListener('abort', onAbort, { once: true });

  try {
    return await fetch(url, {
      method: init.method,
      headers: init.headers ?? {},
      ...(init.body ? { body: init.body } : {}),
      signal: controller.signal,
    });
  } catch (error) {
    if (outerSignal?.aborted) {
      throw new InferenceError('aborted', 'Đã huỷ trích xuất.');
    }
    if (timedOut) {
      throw new InferenceError(
        'timeout',
        `Máy chủ mô hình không phản hồi sau ${Math.round(timeoutMs / 1_000)} giây.`,
      );
    }
    throw new InferenceError('network', networkMessage || messageOf(error));
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener('abort', onAbort);
  }
}
