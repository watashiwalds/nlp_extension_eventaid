import { z } from 'zod';
import { FilterError } from '../../core/ports/content-filter';
import type {
  ContentFilter,
  ContentFilterHealth,
  FilterAnalysis,
} from '../../core/ports/content-filter';
import { DEFAULT_FILTER_ENDPOINT } from '../../shared/contracts';
import { shortBody, trimEndpoint } from './http';

/**
 * Cổng gọi dịch vụ PhoBERT TASK/NON_TASK chạy trên chính máy người dùng.
 * Chỉ quyết định cấp tài liệu; không cắt câu gửi cho LLM.
 *
 * Endpoint mặc định dùng cổng 8081 (môi trường phát triển hiện tại); manifest
 * cũng khai báo cổng 8000 làm alias.
 */

export const FILTER_HEALTH_TIMEOUT_MS = 2_000;
export const FILTER_MAX_TEXT_CHARS = 5_000;

const EvidenceSchema = z.object({
  sentence: z.string(),
  task_confidence: z.number().min(0).max(1),
});

const AnalyzeResponseSchema = z.object({
  has_task: z.boolean(),
  confidence: z.number().min(0).max(1),
  needs_review: z.boolean(),
  evidence: z.array(EvidenceSchema),
  total_sentences: z.number().int().nonnegative(),
});

const HealthResponseSchema = z.object({
  status: z.string().optional(),
  device: z.string().optional(),
});

export interface PhobertFilterOptions {
  endpoint?: string;
  /** Timeout cho `/analyze`; `/health` luôn dùng 2 giây. */
  timeoutMs?: number;
}

export class PhobertTaskFilter implements ContentFilter {
  readonly id = 'phobert-task' as const;

  private readonly endpoint: string;
  private readonly timeoutMs: number;

  constructor(options: PhobertFilterOptions = {}) {
    this.endpoint =
      trimEndpoint(options.endpoint ?? DEFAULT_FILTER_ENDPOINT) || DEFAULT_FILTER_ENDPOINT;
    this.timeoutMs = options.timeoutMs ?? 15_000;
  }

  async health(): Promise<ContentFilterHealth> {
    try {
      const response = await this.request('/health', { method: 'GET' }, FILTER_HEALTH_TIMEOUT_MS);
      if (response.ok) {
        const parsed = HealthResponseSchema.safeParse(await response.json().catch(() => null));
        const device = parsed.success ? parsed.data.device?.trim() : undefined;
        return device ? { ok: true, device } : { ok: true };
      }
      if (response.status === 503) {
        return { ok: false, reason: 'Dịch vụ sàng lọc đang tải model, hãy thử lại sau ít phút.' };
      }
      return { ok: false, reason: `Dịch vụ sàng lọc trả mã ${response.status}.` };
    } catch (error) {
      return { ok: false, reason: messageOf(error) };
    }
  }

  async analyze(text: string, options?: { signal?: AbortSignal }): Promise<FilterAnalysis> {
    const started = Date.now();
    const response = await this.request(
      '/analyze',
      { method: 'POST', body: JSON.stringify({ text }) },
      this.timeoutMs,
      options?.signal,
    );

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      const hint =
        response.status === 422
          ? ` Đoạn văn có thể quá dài (tối đa ${FILTER_MAX_TEXT_CHARS} ký tự) hoặc sai định dạng.`
          : '';
      throw new FilterError(
        'http',
        `Dịch vụ sàng lọc trả lỗi ${response.status}.${hint}${body ? ` ${shortBody(body)}` : ''}`,
        response.status,
      );
    }

    const parsed = AnalyzeResponseSchema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      throw new FilterError(
        'invalid-response',
        'Dịch vụ sàng lọc trả về nội dung rỗng hoặc sai cấu trúc.',
      );
    }

    const data = parsed.data;
    return {
      hasTask: data.has_task,
      confidence: data.confidence,
      needsReview: data.needs_review,
      evidence: data.evidence.map((item) => ({
        sentence: item.sentence,
        taskConfidence: item.task_confidence,
      })),
      totalSentences: data.total_sentences,
      latencyMs: Date.now() - started,
    };
  }

  /** `fetch` có timeout và tôn trọng `AbortSignal` của người dùng. */
  private async request(
    path: string,
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
      return await fetch(`${this.endpoint}${path}`, {
        method: init.method,
        headers: { 'Content-Type': 'application/json' },
        ...(init.body ? { body: init.body } : {}),
        signal: controller.signal,
      });
    } catch {
      if (outerSignal?.aborted) {
        throw new FilterError('aborted', 'Đã huỷ bước sàng lọc.');
      }
      if (timedOut) {
        throw new FilterError(
          'timeout',
          `Dịch vụ sàng lọc không phản hồi sau ${Math.round(timeoutMs / 1_000)} giây.`,
        );
      }
      throw new FilterError(
        'network',
        `Không kết nối được dịch vụ sàng lọc tại ${this.endpoint}. Hãy kiểm tra dịch vụ Python đã chạy chưa.`,
      );
    } finally {
      clearTimeout(timer);
      outerSignal?.removeEventListener('abort', onAbort);
    }
  }
}

function messageOf(error: unknown): string {
  if (error instanceof FilterError) return error.message;
  return error instanceof Error ? error.message : 'Không kết nối được dịch vụ sàng lọc.';
}
