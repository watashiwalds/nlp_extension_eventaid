import type { Event } from '../../shared/contracts';

/**
 * Độ tin cậy model tự báo (0–1), KHÔNG phải xác suất đã hiệu chuẩn.
 * Ngưỡng dùng chung cho normalize (cờ `do_tin_cay_thap`) và UI duyệt nháp.
 */
export const LOW_CONFIDENCE = 0.5;
export const HIGH_CONFIDENCE = 0.8;

export type ConfidenceLevel = 'thap' | 'vua' | 'cao';

/** Ba mức hiển thị: Thấp (<0.5), Vừa (0.5–<0.8), Cao (≥0.8). */
export function confidenceLevel(confidence: number): ConfidenceLevel {
  if (!Number.isFinite(confidence) || confidence < LOW_CONFIDENCE) return 'thap';
  if (confidence < HIGH_CONFIDENCE) return 'vua';
  return 'cao';
}

/** Mức tin cậy của sự kiện; `null` khi bản ghi không do máy đề xuất. */
export function eventConfidenceLevel(event: Event): ConfidenceLevel | null {
  const confidence = event.extractionMeta?.confidence;
  return typeof confidence === 'number' ? confidenceLevel(confidence) : null;
}
