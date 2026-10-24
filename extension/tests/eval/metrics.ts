import { parseDateOnly } from '../../src/core/dates';
import { normalizeTitleKey } from '../../src/core/extraction/dedup';
import type { EventCandidate, Label } from '../../src/shared/contracts';

/**
 * Công cụ đo chất lượng trích xuất cho Slice E.
 *
 * Module thuần, chỉ dùng trong test: ghép sự kiện thật với đáp án, tính
 * recall/precision và phát hiện ngày không có căn cứ trong nguồn. Không thay
 * thế lần đo `llama-server` thật — MockProvider chỉ chứng minh công cụ đo chạy đúng.
 */

const DAY_MS = 86_400_000;

export interface ExpectedEvent {
  title: string;
  /** `YYYY-MM-DDTHH:mm`; null khi chỉ biết ngày hoặc chưa xác định. */
  startValue: string | null;
  /** `YYYY-MM-DD`; null khi không có ngày riêng. */
  startDate: string | null;
  endValue?: string | null;
  endDate?: string | null;
  label?: Label;
  uncertain?: string[];
  /** Tên hồ sơ kỳ vọng (không phải id) để fixture dễ đọc. */
  profileNames?: string[];
}

export interface MatchPair {
  actualIndex: number;
  expectedIndex: number;
}

export interface MatchOutcome {
  pairs: MatchPair[];
  /** Chỉ số đáp án không ghép được. */
  missed: number[];
  /** Chỉ số sự kiện thật không ghép được. */
  extra: number[];
}

export interface EvalMetrics {
  recall: number;
  precision: number;
  matched: number;
  missed: number;
  extra: number;
  /** Số sự kiện có ít nhất một ngày start/end nằm ngoài `allowedDates`. */
  inventedDates: number;
  totalActual: number;
}

/** Số đo kỳ vọng ghi trong fixture; cùng hình dạng với kết quả `computeMetrics`. */
export type ExpectedMetrics = EvalMetrics;

function titleTokens(title: string): Set<string> {
  return new Set(normalizeTitleKey(title).split(' ').filter(Boolean));
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared += 1;
  return shared / (a.size + b.size - shared);
}

/**
 * Tiêu đề khớp khi chuẩn hoá trùng khít, hoặc Jaccard token ≥ 0.5.
 * Dùng cùng `normalizeTitleKey()` với dedup để không tạo hai chuẩn khác nhau.
 */
export function titlesMatch(actualTitle: string, expectedTitle: string): boolean {
  const actualKey = normalizeTitleKey(actualTitle);
  const expectedKey = normalizeTitleKey(expectedTitle);
  if (!actualKey || !expectedKey) return false;
  if (actualKey === expectedKey) return true;
  return jaccard(titleTokens(actualTitle), titleTokens(expectedTitle)) >= 0.5;
}

function dateKey(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = value.trim().slice(0, 10);
  return parseDateOnly(date) ? date : null;
}

function actualStartDate(event: EventCandidate): string | null {
  return dateKey(event.start.value) ?? dateKey(event.start.date);
}

function expectedStartDate(event: ExpectedEvent): string | null {
  return dateKey(event.startValue) ?? dateKey(event.startDate);
}

function withinOneDay(a: string, b: string): boolean {
  const dateA = parseDateOnly(a);
  const dateB = parseDateOnly(b);
  if (!dateA || !dateB) return false;
  return Math.abs(dateA.getTime() - dateB.getTime()) <= DAY_MS;
}

/**
 * Cổng ngày: expected không có ngày thì bỏ qua; expected có ngày mà actual
 * không có thì không ghép; cả hai có ngày thì được lệch tối đa 1 ngày.
 */
export function passesDateGate(actual: EventCandidate, expected: ExpectedEvent): boolean {
  const expectedDate = expectedStartDate(expected);
  if (!expectedDate) return true;
  const actualDate = actualStartDate(actual);
  if (!actualDate) return false;
  return withinOneDay(actualDate, expectedDate);
}

/**
 * Ghép 1-1 tham lam theo thứ tự đáp án: mỗi đáp án lấy sự kiện thật đầu tiên
 * còn trống khớp tiêu đề và cổng ngày. Không ghép lại một sự kiện hai lần.
 */
export function matchExpected(
  actual: readonly EventCandidate[],
  expected: readonly ExpectedEvent[],
): MatchOutcome {
  const usedActual = new Set<number>();
  const pairs: MatchPair[] = [];

  for (let expectedIndex = 0; expectedIndex < expected.length; expectedIndex += 1) {
    const target = expected[expectedIndex];
    if (!target) continue;

    for (let actualIndex = 0; actualIndex < actual.length; actualIndex += 1) {
      if (usedActual.has(actualIndex)) continue;
      const candidate = actual[actualIndex];
      if (!candidate) continue;
      if (!titlesMatch(candidate.title, target.title)) continue;
      if (!passesDateGate(candidate, target)) continue;

      usedActual.add(actualIndex);
      pairs.push({ actualIndex, expectedIndex });
      break;
    }
  }

  const matchedExpected = new Set(pairs.map((pair) => pair.expectedIndex));
  return {
    pairs,
    missed: expected.map((_, index) => index).filter((index) => !matchedExpected.has(index)),
    extra: actual.map((_, index) => index).filter((index) => !usedActual.has(index)),
  };
}

function datesOf(event: EventCandidate): string[] {
  const dates: string[] = [];
  const startValue = dateKey(event.start.value);
  if (startValue) dates.push(startValue);
  const startDate = dateKey(event.start.date);
  if (startDate) dates.push(startDate);

  if (event.end) {
    const endValue = dateKey(event.end.value);
    if (endValue) dates.push(endValue);
    const endDate = dateKey(event.end.date);
    if (endDate) dates.push(endDate);
  }
  return dates;
}

/**
 * Ngày bịa = có ngày start/end không nằm trong `allowedDates`.
 * Không dùng `raw` làm bằng chứng thay cho ngày: raw chỉ là chuỗi model trích,
 * không chứng minh ngày đó có trong nguồn.
 */
export function isInventedDate(event: EventCandidate, allowedDates: readonly string[]): boolean {
  const allowed = new Set(allowedDates);
  return datesOf(event).some((date) => !allowed.has(date));
}

export function computeMetrics(
  actual: readonly EventCandidate[],
  expected: readonly ExpectedEvent[],
  allowedDates: readonly string[],
): EvalMetrics {
  const match = matchExpected(actual, expected);
  const matched = match.pairs.length;
  const totalActual = actual.length;
  const totalExpected = expected.length;

  return {
    // Mẫu âm: chỉ đạt recall khi không trả về sự kiện nào.
    recall: totalExpected === 0 ? (totalActual === 0 ? 1 : 0) : matched / totalExpected,
    precision: totalActual === 0 ? 1 : matched / totalActual,
    matched,
    missed: match.missed.length,
    extra: match.extra.length,
    inventedDates: actual.filter((event) => isInventedDate(event, allowedDates)).length,
    totalActual,
  };
}

/**
 * Percentile theo nearest-rank: sắp xếp tăng dần, index `ceil(ratio * n) - 1`.
 * Trả null cho mảng rỗng để nơi gọi không phải bịa số 0.
 */
export function percentile(values: readonly number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const clamped = Math.min(1, Math.max(0, ratio));
  const index = Math.max(0, Math.ceil(clamped * sorted.length) - 1);
  return sorted[index] ?? null;
}
