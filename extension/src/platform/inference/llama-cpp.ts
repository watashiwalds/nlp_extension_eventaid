import { EXTRACTION_RESPONSE_SCHEMA } from '../../core/extraction/schema';
import { InferenceError } from '../../core/ports/inference';
import type {
  InferenceHealth,
  InferenceProvider,
  InferenceRequest,
  InferenceResult,
} from '../../core/ports/inference';

/**
 * Cổng gọi `llama-server` chạy trên chính máy người dùng.
 * Chỉ một địa chỉ được cấp quyền trong manifest: `http://127.0.0.1:8080/*`.
 */

export const DEFAULT_LLAMA_ENDPOINT = 'http://127.0.0.1:8080';
export const HEALTH_TIMEOUT_MS = 2_000;

/**
 * llama.cpp đã đổi hình dạng `response_format` qua vài bản:
 * - `openai`: `{ type: 'json_schema', json_schema: { name, schema } }` — build mới
 *   (đã kiểm tra với b10101) thực sự ép schema, kể cả enum.
 * - `schema`: `{ type: 'json_schema', schema }` — build cũ; có bản nhận 200 nhưng
 *   **bỏ qua** schema, nên chỉ dùng làm phương án lùi.
 * - `object`: chỉ ép JSON, không ép schema (phương án lùi cuối).
 */
export type ResponseFormatMode = 'openai' | 'schema' | 'object';

/** Thứ tự thử: OpenAI (ép schema) → schema trần (build cũ) → chỉ ép JSON. */
const RESPONSE_FORMAT_FALLBACKS: ResponseFormatMode[] = ['openai', 'schema', 'object'];

export interface LlamaCppOptions {
  endpoint: string;
  /** Bỏ trống để dùng đúng model máy chủ đang nạp (không khoá cứng một tên). */
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
}

/** Tên ngắn để hiển thị, vì llama-server thường trả đường dẫn tuyệt đối của file GGUF. */
export function displayModelName(id: string): string {
  const parts = id.split(/[\\/]/);
  return parts[parts.length - 1] || id;
}

/** Dựng `response_format` ở một dạng cụ thể — tách riêng để test và chốt sau khi có model. */
export function buildResponseFormat(mode: ResponseFormatMode = 'openai'): Record<string, unknown> {
  if (mode === 'object') return { type: 'json_object' };
  if (mode === 'openai') {
    return {
      type: 'json_schema',
      json_schema: { name: 'extraction', strict: true, schema: EXTRACTION_RESPONSE_SCHEMA },
    };
  }
  return { type: 'json_schema', schema: EXTRACTION_RESPONSE_SCHEMA };
}

function trimEndpoint(endpoint: string): string {
  return endpoint.trim().replace(/\/+$/, '');
}

function authHeaders(apiKey: string | undefined): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (apiKey?.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`;
  return headers;
}

function shortBody(body: string): string {
  const compact = body.replace(/\s+/g, ' ').trim();
  return compact.length > 160 ? `${compact.slice(0, 160)}…` : compact;
}

interface ChatCompletionBody {
  model?: unknown;
  choices?: Array<{ message?: { content?: unknown; reasoning_content?: unknown } }>;
}

interface ModelsBody {
  data?: Array<{ id?: unknown }>;
  models?: Array<{ name?: unknown; model?: unknown }>;
}

function firstModelId(data: ModelsBody | null): string | null {
  const fromData = data?.data?.[0]?.id;
  if (typeof fromData === 'string' && fromData.trim()) return fromData.trim();
  const first = data?.models?.[0];
  for (const value of [first?.model, first?.name]) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

export class LlamaCppProvider implements InferenceProvider {
  readonly id = 'llama.cpp' as const;

  private readonly endpoint: string;
  private readonly model: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;

  /** Tự hạ cấp khi build hiện tại từ chối dạng `response_format` đang dùng. */
  private responseFormatMode: ResponseFormatMode = 'openai';

  constructor(options: LlamaCppOptions) {
    this.endpoint = trimEndpoint(options.endpoint) || DEFAULT_LLAMA_ENDPOINT;
    this.model = options.model?.trim() ?? '';
    this.apiKey = options.apiKey ?? '';
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  async health(): Promise<InferenceHealth> {
    try {
      const response = await this.request(`${this.endpoint}/health`, { method: 'GET' }, HEALTH_TIMEOUT_MS);
      if (response.status === 200) {
        // Đọc tên model thật để UI không phải giả định một model cố định.
        const model = await this.detectModel();
        return model ? { ok: true, model } : { ok: true };
      }
      if (response.status === 503) return { ok: false, reason: 'Máy chủ đang tải model, hãy thử lại sau ít phút.' };
      if (response.status === 401 || response.status === 403) {
        return { ok: false, reason: 'API key không đúng hoặc còn thiếu.' };
      }
      return { ok: false, reason: `Máy chủ mô hình trả mã ${response.status}.` };
    } catch (error) {
      return { ok: false, reason: messageOf(error) };
    }
  }

  async run(request: InferenceRequest): Promise<InferenceResult> {
    const started = Date.now();
    let response = await this.postCompletion(request);

    // Build cũ/mới có thể từ chối dạng OpenAI. Hạ cấp dần OpenAI → schema trần →
    // json_object, rồi giữ dạng cuối cho các đoạn sau. Lỗi mạng/timeout không đi qua nhánh này.
    while ((response.status === 400 || response.status === 422) && this.responseFormatMode !== 'object') {
      const index = RESPONSE_FORMAT_FALLBACKS.indexOf(this.responseFormatMode);
      const next = RESPONSE_FORMAT_FALLBACKS[Math.min(index + 1, RESPONSE_FORMAT_FALLBACKS.length - 1)];
      this.responseFormatMode = next ?? 'object';
      response = await this.postCompletion(request);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new InferenceError(
        'http',
        `Máy chủ mô hình trả lỗi ${response.status}${body ? `: ${shortBody(body)}` : ''}`,
        response.status,
      );
    }

    const data = (await response.json().catch(() => null)) as ChatCompletionBody | null;
    const raw = data?.choices?.[0]?.message?.content;
    if (typeof raw !== 'string' || !raw.trim()) {
      throw new InferenceError('invalid-response', 'Máy chủ trả về nội dung rỗng hoặc sai cấu trúc.');
    }

    return {
      raw,
      latencyMs: Date.now() - started,
      // llama-server thường trả đường dẫn tuyệt đối của file GGUF; chỉ lưu tên file
      // để không lộ đường dẫn người dùng khi xuất dữ liệu.
      model: displayModelName(
        typeof data?.model === 'string' && data.model ? data.model : this.model || 'llama.cpp',
      ),
    };
  }

  /** `/v1/models` là tuỳ chọn; lỗi ở đây không được làm hỏng kết quả health. */
  private async detectModel(): Promise<string | null> {
    try {
      const response = await this.request(`${this.endpoint}/v1/models`, { method: 'GET' }, HEALTH_TIMEOUT_MS);
      if (!response.ok) return null;
      return firstModelId((await response.json().catch(() => null)) as ModelsBody | null);
    } catch {
      return null;
    }
  }

  private postCompletion(request: InferenceRequest): Promise<Response> {
    const body: Record<string, unknown> = {
      messages: [
        { role: 'system', content: request.system },
        { role: 'user', content: request.user },
      ],
      max_tokens: request.maxTokens,
      temperature: request.temperature,
      stream: false,
      response_format: buildResponseFormat(this.responseFormatMode),
      // Qwen3/3.5 và một số model khác mặc định "suy luận" rất dài, có thể ăn hết
      // max_tokens trước khi trả JSON. Template không dùng khoá này sẽ bỏ qua.
      chat_template_kwargs: { enable_thinking: false },
    };
    if (this.model) body.model = this.model;

    return this.request(
      `${this.endpoint}/v1/chat/completions`,
      {
        method: 'POST',
        body: JSON.stringify(body),
      },
      this.timeoutMs,
      request.signal,
    );
  }

  /** `fetch` có timeout và tôn trọng `AbortSignal` của người dùng. */
  private async request(
    url: string,
    init: { method: string; body?: string },
    timeoutMs: number,
    outerSignal?: AbortSignal,
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
        headers: authHeaders(this.apiKey),
        ...(init.body ? { body: init.body } : {}),
        signal: controller.signal,
      });
    } catch {
      if (outerSignal?.aborted) {
        throw new InferenceError('aborted', 'Đã huỷ trích xuất.');
      }
      if (timedOut) {
        throw new InferenceError(
          'timeout',
          `Máy chủ mô hình không phản hồi sau ${Math.round(timeoutMs / 1_000)} giây.`,
        );
      }
      throw new InferenceError(
        'network',
        `Không kết nối được máy chủ mô hình tại ${this.endpoint}. Hãy kiểm tra llama-server đã chạy chưa.`,
      );
    } finally {
      clearTimeout(timer);
      outerSignal?.removeEventListener('abort', onAbort);
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Không kết nối được máy chủ mô hình.';
}
