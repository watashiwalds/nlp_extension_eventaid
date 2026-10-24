import type { Event } from '../../shared/contracts';
import { parseEventDate, toDateOnly } from '../dates';
import { normalizeTitleKey } from './dedup';

/**
 * Gợi ý sự kiện gần trùng (paraphrase) — CHỈ để hiển thị, không ghi DB, không tự gộp.
 * Dedup chắc chắn vẫn nằm ở `dedup.ts`; module này chỉ giảm rủi ro bỏ sót bản trùng mờ.
 */

const DAY_MS = 86_400_000;
const MAX_EVENTS = 300;
const MAX_SUGGESTIONS = 3;
const TITLE_THRESHOLD = 0.5;
const TEXT_THRESHOLD = 0.6;

const STOPWORDS = new Set([
  'va', 'cua', 'tai', 'vao', 'luc', 'ngay', 'tu', 'den', 'voi', 'cho', 'mot', 'cac', 'nhung',
  'la', 'co', 'buoi', 'se', 'duoc', 'trong', 'ngoai', 'tren', 'duoi', 've', 'thi', 'nay', 'do',
]);

export type DuplicateReason =
  | 'cung_ngay'
  | 'lech_mot_ngay'
  | 'tieu_de_gan_giong'
  | 'noi_dung_tuong_tu'
  | 'cung_ho_so';

export interface DuplicateSuggestion {
  event: Event;
  reasons: DuplicateReason[];
  /** Số tín hiệu khớp — dùng để sắp xếp và hiển thị mức gần. */
  score: number;
}

export const DUPLICATE_REASON_TEXT: Record<DuplicateReason, string> = {
  cung_ngay: 'cùng ngày',
  lech_mot_ngay: 'lệch 1 ngày',
  tieu_de_gan_giong: 'tiêu đề gần giống',
  noi_dung_tuong_tu: 'nội dung tương tự',
  cung_ho_so: 'cùng hồ sơ',
};

function tokens(text: string): Set<string> {
  return new Set(
    normalizeTitleKey(text)
      .split(' ')
      .filter((token) => token.length > 1 && !STOPWORDS.has(token)),
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

function startDate(event: Event): Date | null {
  const key = event.start.value ?? event.start.date;
  return key ? parseEventDate(key) : null;
}

function dayKey(event: Event): string | null {
  const date = startDate(event);
  return date ? toDateOnly(date) : null;
}

function dayDiff(a: Event, b: Event): number | null {
  const dateA = startDate(a);
  const dateB = startDate(b);
  if (!dateA || !dateB) return null;
  return Math.round(Math.abs(dateA.getTime() - dateB.getTime()) / DAY_MS);
}

function textOf(event: Event): string {
  const quote = event.sources.map((source) => source.quote ?? '').join(' ').trim();
  return quote || event.summary.join(' ');
}

export function duplicateSuggestionKey(a: string, b: string): string {
  return [a, b].sort().join('|');
}

interface PairSignals {
  reasons: DuplicateReason[];
  hasTitleOrText: boolean;
}

function pairSignals(a: Event, b: Event): PairSignals | null {
  const diff = dayDiff(a, b);
  // Cổng thời gian bắt buộc: biết ngày cả hai mà lệch > 1 ngày thì không gợi ý.
  if (diff !== null && diff > 1) return null;

  const reasons: DuplicateReason[] = [];
  const sameDay = dayKey(a) !== null && dayKey(a) === dayKey(b);
  if (sameDay) reasons.push('cung_ngay');
  else if (diff === 1) reasons.push('lech_mot_ngay');

  const titleScore = jaccard(tokens(a.title), tokens(b.title));
  const titleMatch = titleScore >= TITLE_THRESHOLD;
  if (titleMatch) reasons.push('tieu_de_gan_giong');

  const textMatch = jaccard(tokens(textOf(a)), tokens(textOf(b))) >= TEXT_THRESHOLD;
  if (textMatch) reasons.push('noi_dung_tuong_tu');

  const sharesProfile = a.relatedProfiles.some((id) => b.relatedProfiles.includes(id));
  if (sharesProfile) reasons.push('cung_ho_so');

  // Cần ít nhất 2 tín hiệu, trong đó bắt buộc có tiêu đề hoặc văn bản.
  // Thời gian/hồ sơ chỉ là tín hiệu phụ (không tự đủ để gợi ý).
  const hasTitleOrText = titleMatch || textMatch;
  if (!hasTitleOrText) return null;
  if (reasons.length < 2) return null;

  return { reasons, hasTitleOrText };
}

/**
 * Trả về tối đa 3 gợi ý cho mỗi sự kiện. Bỏ qua chính nó và sự kiện `huy`;
 * giới hạn 300 sự kiện để tránh O(n²) mất kiểm soát.
 */
export function suggestDuplicates(events: Event[]): Map<string, DuplicateSuggestion[]> {
  const pool = events.filter((event) => event.status !== 'huy').slice(0, MAX_EVENTS);
  const result = new Map<string, DuplicateSuggestion[]>();

  for (let i = 0; i < pool.length; i += 1) {
    for (let j = i + 1; j < pool.length; j += 1) {
      const a = pool[i];
      const b = pool[j];
      if (!a || !b) continue;
      const signals = pairSignals(a, b);
      if (!signals) continue;
      const score = signals.reasons.length;
      push(result, a.id, { event: b, reasons: signals.reasons, score });
      push(result, b.id, { event: a, reasons: signals.reasons, score });
    }
  }

  for (const [id, list] of result) {
    result.set(
      id,
      [...list]
        .sort((x, y) => y.score - x.score || x.event.title.localeCompare(y.event.title, 'vi'))
        .slice(0, MAX_SUGGESTIONS),
    );
  }
  return result;
}

function push(
  map: Map<string, DuplicateSuggestion[]>,
  id: string,
  suggestion: DuplicateSuggestion,
): void {
  const list = map.get(id);
  if (list) list.push(suggestion);
  else map.set(id, [suggestion]);
}
