import type { FilterAnalysis } from '../ports/content-filter';
import type { FilterDecision } from '../../shared/contracts';

/**
 * Kiểu dữ liệu thuần của bước sàng lọc cấp tài liệu.
 * Quyết định (`FilterDecision`) và chế độ chạy (`FilterRunMode`) được khai báo
 * một nguồn duy nhất ở `shared/contracts.ts` để message/DB/job dùng chung.
 */
export type { FilterDecision, FilterMode, FilterRunMode } from '../../shared/contracts';

/** Một cửa sổ văn bản gửi cho dịch vụ lọc; offset trỏ về `NormalizedDocument.text`. */
export interface FilterWindow {
  index: number;
  text: string;
  charStart: number;
  charEnd: number;
}

/** Kết quả một cửa sổ: phân tích được, hoặc lỗi (job sẽ fail-open). */
export type WindowAnalysis =
  | { ok: true; window: FilterWindow; analysis: FilterAnalysis }
  | { ok: false; window: FilterWindow; reason: string };

/** Toàn bộ kết quả sàng lọc một tài liệu, đủ để ghi vào job và hiển thị trên UI. */
export interface FilterReport {
  /** `true` chỉ khi mọi cửa sổ phân tích thành công. */
  applied: boolean;
  decision: FilterDecision;
  /** Số câu TASK cộng dồn qua các cửa sổ. */
  evidenceCount: number;
  totalSentences: number;
  /** Xác suất của `decision`; `null` khi không có quyết định dứt khoát. */
  confidence: number | null;
  latencyMs: number;
  windowCount: number;
  /** Ghi chú fail-open; `null` khi sàng lọc chạy bình thường. */
  note: string | null;
}
