import type { Event } from '../shared/contracts';
import { sortEvents } from './events';
import { LOW_CONFIDENCE } from './extraction/confidence';

/** Hàm thuần cho chế độ Duyệt nháp — không đụng tới `sortEvents()` toàn cục. */

/** Nháp `llm` cần người dùng để ý trước: confidence thấp, có cờ uncertain, chưa gắn hồ sơ. */
export function needsReviewAttention(event: Event): boolean {
  if (event.origin !== 'llm') return false;
  const confidence = event.extractionMeta?.confidence;
  if (typeof confidence === 'number' && confidence < LOW_CONFIDENCE) return true;
  if (event.validation.uncertain.length > 0) return true;
  return event.relatedProfiles.length === 0;
}

/** Nhóm hiển thị: 0 = llm cần chú ý, 1 = llm còn lại, 2 = nhập tay. */
export function draftReviewRank(event: Event): number {
  if (event.origin !== 'llm') return 2;
  return needsReviewAttention(event) ? 0 : 1;
}

/**
 * Thứ tự trong chế độ duyệt: nhóm ưu tiên trước, trong nhóm giữ thứ tự thời gian
 * của `sortEvents()` (đang diễn ra → sắp tới → đã qua → chưa có thời điểm).
 */
export function sortDraftsForReview(events: Event[], now: Date = new Date()): Event[] {
  const byTime = sortEvents(events, now);
  // Array.prototype.sort ổn định: chỉ đổi thứ tự giữa các nhóm.
  return [...byTime].sort((a, b) => draftReviewRank(a) - draftReviewRank(b));
}

export interface DraftTimeWarning {
  /** Có ngày nhưng chưa có giờ (`start.value === null`, `start.date` có giá trị). */
  dateOnly: number;
  /** Không có cả ngày lẫn giờ. */
  noTime: number;
  total: number;
}

/** Đếm nháp chưa đủ thời điểm để cảnh báo trước khi duyệt. Không tự điền giờ bịa. */
export function draftTimeWarning(events: Event[]): DraftTimeWarning {
  let dateOnly = 0;
  let noTime = 0;
  for (const event of events) {
    if (event.start.value) continue;
    if (event.start.date) dateOnly += 1;
    else noTime += 1;
  }
  return { dateOnly, noTime, total: dateOnly + noTime };
}

/** Số nháp hiện có (dùng cho nút “Duyệt nháp (N)”). */
export function countDrafts(events: Event[]): number {
  return events.filter((event) => event.status === 'nhap').length;
}

/** Bỏ id không còn là nháp khỏi lựa chọn — tránh giữ id “mồ côi”. */
export function pruneDraftSelectionIds(ids: string[], events: Event[]): string[] {
  const draftIds = new Set(events.filter((event) => event.status === 'nhap').map((event) => event.id));
  const next = ids.filter((id) => draftIds.has(id));
  return next.length === ids.length ? ids : next;
}
