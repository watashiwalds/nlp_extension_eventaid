/**
 * Cổng sàng lọc nội dung — điểm duy nhất `core/` được phép hỏi "tài liệu này có
 * nội dung công việc không?".
 *
 * Hiện thực thật nằm ở `platform/inference/phobert-filter.ts` (HTTP tới dịch vụ
 * PhoBERT cục bộ); hiện thực cho test/UI là `core/extraction/mock-filter.ts`.
 * Port này chỉ quyết định CẤP TÀI LIỆU, không cắt câu gửi cho LLM.
 */

/** Một câu đã được model chấm là "câu giao việc" (TASK). */
export interface FilterSentenceAnalysis {
  sentence: string;
  taskConfidence: number;
}

/** Kết quả phân tích một cửa sổ văn bản do dịch vụ trả về. */
export interface FilterAnalysis {
  hasTask: boolean;
  /** Xác suất TASK cao nhất nếu `hasTask`; ngược lại là xác suất NON_TASK cao nhất. */
  confidence: number;
  /** Model tự báo cần xem lại — chỉ để hiển thị, không đổi quyết định. */
  needsReview: boolean;
  evidence: FilterSentenceAnalysis[];
  totalSentences: number;
  latencyMs: number;
}

export type ContentFilterHealth =
  | { ok: true; /** Thiết bị server báo (`cpu`/`cuda`), nếu đọc được. */ device?: string }
  | { ok: false; reason: string };

export type FilterErrorKind = 'network' | 'timeout' | 'aborted' | 'http' | 'invalid-response';

/**
 * Lỗi có phân loại để UI hiển thị đúng thông điệp và để job biết lần chạy có bị
 * người dùng huỷ hay không. Không phụ thuộc DOM/Chrome.
 */
export class FilterError extends Error {
  constructor(
    readonly kind: FilterErrorKind,
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = 'FilterError';
  }
}

export function isFilterAborted(error: unknown): boolean {
  return error instanceof FilterError && error.kind === 'aborted';
}

export interface ContentFilter {
  readonly id: 'phobert-task';
  health(): Promise<ContentFilterHealth>;
  analyze(text: string, options?: { signal?: AbortSignal }): Promise<FilterAnalysis>;
}
