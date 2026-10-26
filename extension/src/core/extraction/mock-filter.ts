import { FilterError } from '../ports/content-filter';
import type { ContentFilter, ContentFilterHealth, FilterAnalysis } from '../ports/content-filter';

/**
 * Bộ lọc giả — không bao giờ gọi mạng, dùng cho test và cho UI khi chưa bật
 * dịch vụ PhoBERT. Phản hồi theo kịch bản để test được cả lỗi và huỷ.
 */

export type MockFilterResponse = FilterAnalysis | Error;

/** Kết quả "không có việc" mặc định: 10 câu, chắc chắn 95%. */
export function mockAnalysis(overrides: Partial<FilterAnalysis> = {}): FilterAnalysis {
  return {
    hasTask: false,
    confidence: 0.95,
    needsReview: false,
    evidence: [],
    totalSentences: 10,
    latencyMs: 0,
    ...overrides,
  };
}

/** Kết quả "có việc" với một câu TASK mẫu. */
export function mockTaskAnalysis(overrides: Partial<FilterAnalysis> = {}): FilterAnalysis {
  return mockAnalysis({
    hasTask: true,
    confidence: 0.92,
    evidence: [{ sentence: 'Hải gửi báo cáo tiến độ trước 17 giờ hôm nay.', taskConfidence: 0.92 }],
    ...overrides,
  });
}

/**
 * Trả lần lượt từng phản hồi trong `responses`; hết danh sách thì lặp lại phản hồi
 * cuối. Phần tử là `Error` thì `analyze` ném đúng lỗi đó (kể cả `FilterError`).
 */
export class MockContentFilter implements ContentFilter {
  readonly id = 'phobert-task' as const;
  /** Văn bản đã nhận, theo thứ tự — để test khẳng định "không lọc vùng chọn". */
  readonly analyzed: string[] = [];

  private cursor = 0;

  constructor(
    private readonly responses: readonly MockFilterResponse[] = [mockAnalysis()],
    private readonly healthState: ContentFilterHealth = { ok: true, device: 'cpu' },
    private readonly latencyMs = 0,
  ) {}

  async health(): Promise<ContentFilterHealth> {
    return this.healthState;
  }

  async analyze(text: string, options?: { signal?: AbortSignal }): Promise<FilterAnalysis> {
    this.analyzed.push(text);
    if (options?.signal?.aborted) throw new FilterError('aborted', 'Đã huỷ bước sàng lọc');

    const response =
      this.responses.length === 0 ? undefined : this.responses[Math.min(this.cursor, this.responses.length - 1)];
    this.cursor += 1;

    if (!response) throw new FilterError('invalid-response', 'MockContentFilter chưa có phản hồi');
    if (response instanceof Error) throw response;
    return { ...response, latencyMs: response.latencyMs || this.latencyMs };
  }
}
