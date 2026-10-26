import { EXTRACTION_RESPONSE_SCHEMA } from '../../core/extraction/schema';
import { InferenceError } from '../../core/ports/inference';
import type {
  InferenceHealth,
  InferenceProvider,
  InferenceRequest,
  InferenceResult,
} from '../../core/ports/inference';
import {
  authHeaders,
  fetchWithTimeout,
  firstChatModelId,
  httpErrorReason,
  normalizeModelId,
  retryAfterMs,
  shortBody,
  trimEndpoint,
} from './http';
import type { ModelsBody } from './http';

/**
 * Endpoint ngoài theo giao thức OpenAI-compatible (Gemini, Groq, máy trạm qua
 * Cloudflared…). Khác provider local ở chỗ: không có `/health`, không gửi
 * `chat_template_kwargs`, và lỗi HTTP được map sang thông điệp tiếng Việt.
 */

export const REMOTE_HEALTH_TIMEOUT_MS = 10_000;
const RETRY_DELAY_MS = 800;

export interface OpenAiCompatibleOptions {
  endpoint: string;
  /** Rỗng = đọc model đầu tiên từ `/models` hoặc để máy chủ tự chọn. */
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
}

interface ChatCompletionBody {
  model?: unknown;
  choices?: Array<{
    finish_reason?: unknown;
    message?: { content?: unknown };
  }>;
  /** Gemini native dùng camelCase; một số proxy đổi sang snake_case. */
  promptFeedback?: { blockReason?: unknown };
  prompt_feedback?: { block_reason?: unknown };
}

function blockReasonError(reason: unknown): string | null {
  if (typeof reason !== 'string' || !reason.trim()) return null;
  const normalized = reason.trim().toUpperCase();
  if (
    normalized === 'SAFETY' ||
    normalized === 'BLOCKLIST' ||
    normalized === 'PROHIBITED_CONTENT' ||
    normalized === 'SPII'
  ) {
    return 'Model từ chối nội dung do bộ lọc an toàn của nhà cung cấp.';
  }
  if (normalized === 'RECITATION') {
    return 'Model từ chối nội dung vì lý do trích dẫn/bản quyền của nhà cung cấp.';
  }
  return `Nhà cung cấp chặn nội dung trước khi model trả lời (${reason}).`;
}

function finishReasonError(reason: unknown): string {
  const normalized = typeof reason === 'string' ? reason.trim().toUpperCase() : '';
  if (normalized === 'LENGTH' || normalized === 'MAX_TOKENS') {
    return 'Model dùng hết token trước khi trả JSON. Hãy tăng “Token tối đa” hoặc giảm “Ký tự mỗi đoạn”.';
  }
  if (
    normalized === 'CONTENT_FILTER' ||
    normalized === 'SAFETY' ||
    normalized === 'BLOCKLIST' ||
    normalized === 'PROHIBITED_CONTENT' ||
    normalized === 'SPII'
  ) {
    return 'Model từ chối nội dung do bộ lọc an toàn của nhà cung cấp.';
  }
  if (normalized === 'RECITATION') {
    return 'Model từ chối nội dung vì lý do trích dẫn/bản quyền của nhà cung cấp.';
  }
  if (normalized === 'LANGUAGE') {
    return 'Model không hỗ trợ ngôn ngữ của nội dung này.';
  }
  return 'Endpoint trả về nội dung rỗng hoặc sai cấu trúc.';
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAiCompatibleProvider implements InferenceProvider {
  readonly id = 'openai-compatible' as const;

  private readonly endpoint: string;
  private readonly apiKey: string;
  private readonly timeoutMs: number;
  private model: string;

  constructor(options: OpenAiCompatibleOptions) {
    this.endpoint = trimEndpoint(options.endpoint);
    if (!this.endpoint) throw new Error('Chưa nhập địa chỉ endpoint.');
    this.model = normalizeModelId(options.model ?? '');
    this.apiKey = options.apiKey ?? '';
    this.timeoutMs = options.timeoutMs ?? 120_000;
  }

  async health(): Promise<InferenceHealth> {
    try {
      const response = await this.request(
        `${this.endpoint}/models`,
        { method: 'GET' },
        REMOTE_HEALTH_TIMEOUT_MS,
      );
      if (!response.ok) {
        return { ok: false, reason: httpErrorReason(response.status, response.headers) };
      }

      const data = (await response.json().catch(() => null)) as ModelsBody | null;
      // Model người dùng nhập luôn thắng danh sách `/models`: Gemini trả ID có
      // tiền tố `models/` (không dùng được ở `/chat/completions`) và có thể xếp
      // model embedding trước model chat. Chỉ tự dò khi ô model để trống.
      const detected = this.model ? null : firstChatModelId(data);
      if (detected) this.model = detected;
      return this.model ? { ok: true, model: this.model } : { ok: true };
    } catch (error) {
      return { ok: false, reason: messageOf(error) };
    }
  }

  async run(request: InferenceRequest): Promise<InferenceResult> {
    const started = Date.now();
    let response = await this.postCompletion(request);

    // 429/5xx: thử lại đúng một lần, chờ theo Retry-After nhưng tối đa 2 giây.
    // 400/422 (schema) không retry để tránh vòng lặp vô hạn.
    if (response.status === 429 || response.status >= 500) {
      await sleep(retryAfterMs(response.headers) ?? RETRY_DELAY_MS);
      response = await this.postCompletion(request);
    }

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      // 404 thường do sai tên model; giữ phần thân (đã che key) để người dùng
      // thấy chính xác model nào bị từ chối thay vì chỉ một thông điệp chung.
      const detail =
        response.status === 400 || response.status === 404 || response.status === 422
          ? shortBody(body, this.apiKey)
          : '';
      throw new InferenceError(
        'http',
        `${httpErrorReason(response.status, response.headers)}${detail ? ` (${detail})` : ''}`,
        response.status,
      );
    }

    const data = (await response.json().catch(() => null)) as ChatCompletionBody | null;
    const choice = data?.choices?.[0];
    const raw = choice?.message?.content;
    if (typeof raw !== 'string' || !raw.trim()) {
      const blocked = blockReasonError(
        data?.promptFeedback?.blockReason ?? data?.prompt_feedback?.block_reason,
      );
      throw new InferenceError(
        'invalid-response',
        blocked ?? finishReasonError(choice?.finish_reason),
      );
    }

    return {
      raw,
      latencyMs: Date.now() - started,
      model: typeof data?.model === 'string' && data.model ? data.model : this.model || 'openai-compatible',
    };
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
      response_format: {
        type: 'json_schema',
        json_schema: { name: 'extraction', strict: true, schema: EXTRACTION_RESPONSE_SCHEMA },
      },
    };
    if (this.model) body.model = this.model;

    return this.request(
      `${this.endpoint}/chat/completions`,
      { method: 'POST', body: JSON.stringify(body) },
      this.timeoutMs,
      request.signal,
    );
  }

  private request(
    url: string,
    init: { method: string; body?: string },
    timeoutMs: number,
    outerSignal?: AbortSignal,
  ): Promise<Response> {
    return fetchWithTimeout(
      url,
      { ...init, headers: authHeaders(this.apiKey) },
      timeoutMs,
      outerSignal,
      `Không kết nối được endpoint ${this.endpoint}. Hãy kiểm tra URL, mạng và quyền host.`,
    );
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : 'Không kết nối được endpoint.';
}
