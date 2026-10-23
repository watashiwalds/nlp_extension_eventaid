import type { Event, EventCandidate } from '../../shared/contracts';
import type { DedupInput, DedupResult } from './types';

const DAY_MS = 86_400_000;

/**
 * Khoá so trùng tiêu đề: bỏ dấu tiếng Việt, lowercase, bỏ ký tự trang trí.
 * "Họp nhóm đồ án" và "hop nhom do an!" cho cùng một khoá.
 */
export function normalizeTitleKey(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * Chỉ coi là trùng khi CHẮC CHẮN:
 * - tiêu đề trùng khít sau khi chuẩn hoá, VÀ
 * - cả hai cùng thiếu thời điểm, hoặc cả hai có thời điểm lệch ≤ 1 ngày.
 * Một bên có ngày, bên kia không → giữ cả hai (recall > precision).
 */
export function isLikelyDuplicate(a: DedupInput, b: DedupInput): boolean {
  const titleA = normalizeTitleKey(a.title);
  const titleB = normalizeTitleKey(b.title);
  if (!titleA || titleA !== titleB) return false;

  if (!a.startValue && !b.startValue) return true;
  if (!a.startValue || !b.startValue) return false;

  const timeA = Date.parse(a.startValue);
  const timeB = Date.parse(b.startValue);
  if (Number.isNaN(timeA) || Number.isNaN(timeB)) return false;
  return Math.abs(timeA - timeB) <= DAY_MS;
}

export function candidateDedupInput(candidate: EventCandidate): DedupInput {
  return { title: candidate.title, startValue: candidate.start.value };
}

export function eventDedupInput(event: Event): DedupInput {
  return { title: event.title, startValue: event.start.value };
}

/**
 * Khử trùng trong cùng lần chạy và với sự kiện đã có trong DB.
 * Giữ bản xuất hiện trước; bản bị bỏ được trả riêng để UI/log không mất dấu.
 */
export function dedupeCandidates(
  candidates: EventCandidate[],
  existing: DedupInput[] = [],
): DedupResult {
  const kept: EventCandidate[] = [];
  const duplicates: EventCandidate[] = [];
  const known = [...existing];

  for (const candidate of candidates) {
    const input = candidateDedupInput(candidate);
    if (known.some((item) => isLikelyDuplicate(input, item))) {
      duplicates.push(candidate);
      continue;
    }
    kept.push(candidate);
    known.push(input);
  }

  return { kept, duplicates };
}
