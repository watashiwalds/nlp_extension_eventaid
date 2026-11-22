import type { EventCandidate, Profile } from '../../src/shared/contracts';
import { matchExpected } from './metrics';
import type { ExpectedEvent } from './metrics';

/**
 * Số đo mức trường (field-level) bổ sung cho `computeMetrics`.
 *
 * `computeMetrics` chấm mức sự kiện (tiêu đề + cổng ngày ±1) và chỉ phát hiện
 * ngày ngoài `allowedDates`. Các hàm ở đây chấm từng trường trên **các cặp đã
 * ghép**: ngày/giờ chính xác, nhãn, cờ uncertain và hiện diện tóm tắt.
 * Không đổi `EvalMetrics` để không phá 17 fixture và live harness.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MIDNIGHT = '00:00';

export interface FieldMetrics {
  /** Số cặp ghép được (mỗi cặp là một phép so sánh trường). */
  pairs: number;
  dateExact: number;
  dateComparable: number;
  startTimeExact: number;
  startTimeComparable: number;
  /** Ngày end khớp tuyệt đối (không tính dung sai ±1 như cổng ghép). */
  endExact: number;
  endComparable: number;
  endTimeExact: number;
  endTimeComparable: number;
  labelExact: number;
  labelComparable: number;
  /**
   * Số cặp mà actual chứa **ít nhất** mọi cờ uncertain kỳ vọng (model được
   * gắn thêm cờ, không được thiếu cờ).
   */
  uncertainMatch: number;
  uncertainComparable: number;
  /**
   * Proxy hiện diện tóm tắt trên cặp ghép — gold không có đáp án summary để
   * chấm nội dung, nên đây chỉ đếm candidate có ít nhất một ý tóm tắt.
   */
  summaryPresent: number;
}

function datePartOfRef(ref: { value: string | null; date: string | null }): string | null {
  if (ref.value) {
    const date = ref.value.slice(0, 10);
    if (DATE_RE.test(date)) return date;
  }
  return ref.date && DATE_RE.test(ref.date) ? ref.date : null;
}

function timePartOf(value: string | null | undefined): string | null {
  if (!value) return null;
  const time = value.slice(11, 16);
  return /^\d{2}:\d{2}$/.test(time) ? time : null;
}

function expectedStartDate(event: ExpectedEvent): string | null {
  if (event.startValue) {
    const date = event.startValue.slice(0, 10);
    if (DATE_RE.test(date)) return date;
  }
  return event.startDate && DATE_RE.test(event.startDate) ? event.startDate : null;
}

function expectedEndDate(event: ExpectedEvent): string | null {
  if (event.endValue) {
    const date = event.endValue.slice(0, 10);
    if (DATE_RE.test(date)) return date;
  }
  return event.endDate && DATE_RE.test(event.endDate) ? event.endDate : null;
}

/**
 * Chấm từng trường trên các cặp ghép bởi `matchExpected` (cùng quy tắc tiêu đề
 * + cổng ngày với `computeMetrics`). Sự kiện bị ghép lệch ≤ 1 ngày vẫn vào
 * `pairs` nhưng `dateExact` = false — đây chính là điểm đo chính xác ngày.
 */
export function computeFieldMetrics(
  actual: readonly EventCandidate[],
  expected: readonly ExpectedEvent[],
): FieldMetrics {
  const { pairs } = matchExpected(actual, expected);
  const result: FieldMetrics = {
    pairs: pairs.length,
    dateExact: 0,
    dateComparable: 0,
    startTimeExact: 0,
    startTimeComparable: 0,
    endExact: 0,
    endComparable: 0,
    endTimeExact: 0,
    endTimeComparable: 0,
    labelExact: 0,
    labelComparable: 0,
    uncertainMatch: 0,
    uncertainComparable: 0,
    summaryPresent: 0,
  };

  for (const pair of pairs) {
    const candidate = actual[pair.actualIndex];
    const target = expected[pair.expectedIndex];
    if (!candidate || !target) continue;

    if (expectedStartDate(target)) {
      result.dateComparable += 1;
      if (datePartOfRef(candidate.start) === expectedStartDate(target)) result.dateExact += 1;
    }
    if (timePartOf(target.startValue)) {
      result.startTimeComparable += 1;
      if (timePartOf(candidate.start.value) === timePartOf(target.startValue)) {
        result.startTimeExact += 1;
      }
    }

    if (expectedEndDate(target)) {
      result.endComparable += 1;
      if (candidate.end && datePartOfRef(candidate.end) === expectedEndDate(target)) {
        result.endExact += 1;
      }
    }
    if (timePartOf(target.endValue)) {
      result.endTimeComparable += 1;
      if (candidate.end && timePartOf(candidate.end.value) === timePartOf(target.endValue)) {
        result.endTimeExact += 1;
      }
    }

    if (target.label !== undefined) {
      result.labelComparable += 1;
      if (candidate.label === target.label) result.labelExact += 1;
    }

    if (target.uncertain && target.uncertain.length > 0) {
      result.uncertainComparable += 1;
      const missing = target.uncertain.some((key) => !candidate.uncertain.includes(key));
      if (!missing) result.uncertainMatch += 1;
    }

    if (candidate.summary.length > 0) result.summaryPresent += 1;
  }

  return result;
}

export interface ProfileMetrics {
  /** Tổng tên hồ sơ kỳ vọng trên các cặp ghép. */
  expectedProfiles: number;
  /** Tên hồ sơ xuất hiện ở cả hai phía của cặp. */
  matchedProfiles: number;
  /** Tên hồ sơ gắn trên actual nhưng không kỳ vọng. */
  extraProfiles: number;
  recall: number;
  precision: number;
}

/**
 * Precision/recall hồ sơ theo **tên** trên các cặp ghép: `relatedProfiles` của
 * candidate là id, đổi về tên qua danh sách `profiles` của mẫu. Bổ sung cho
 * assert `requiredProfiles` (chỉ kiểm tra "có đủ", không đo thừa/thiếu).
 */
export function computeProfileMetrics(
  actual: readonly EventCandidate[],
  expected: readonly ExpectedEvent[],
  profiles: readonly Profile[],
): ProfileMetrics {
  const nameById = new Map(profiles.map((profile) => [profile.id, profile.name]));
  let expectedProfiles = 0;
  let matchedProfiles = 0;
  let extraProfiles = 0;

  const { pairs } = matchExpected(actual, expected);
  for (const pair of pairs) {
    const candidate = actual[pair.actualIndex];
    const target = expected[pair.expectedIndex];
    if (!candidate || !target) continue;

    const expectedNames = new Set(target.profileNames ?? []);
    const actualNames = new Set(
      candidate.relatedProfiles.map((id) => nameById.get(id) ?? id),
    );

    expectedProfiles += expectedNames.size;
    for (const name of expectedNames) {
      if (actualNames.has(name)) matchedProfiles += 1;
    }
    for (const name of actualNames) {
      if (!expectedNames.has(name)) extraProfiles += 1;
    }
  }

  return {
    expectedProfiles,
    matchedProfiles,
    extraProfiles,
    recall: expectedProfiles === 0 ? 1 : matchedProfiles / expectedProfiles,
    precision: matchedProfiles + extraProfiles === 0 ? 1 : matchedProfiles / (matchedProfiles + extraProfiles),
  };
}

/**
 * Đếm cặp ghép mà gold **chỉ có ngày** (không có giờ) nhưng actual điền
 * `T00:00`. Đây là lỗi "điền giờ cho mốc chỉ có ngày" — kể cả khi 00:00 hợp
 * lệ về mặt văn bản, gold date-only nghĩa là nguồn không nêu giờ.
 */
export function countInventedMidnight(
  actual: readonly EventCandidate[],
  expected: readonly ExpectedEvent[],
): number {
  const { pairs } = matchExpected(actual, expected);
  let count = 0;

  for (const pair of pairs) {
    const candidate = actual[pair.actualIndex];
    const target = expected[pair.expectedIndex];
    if (!candidate || !target) continue;

    const expectedDateOnly = !target.startValue && Boolean(expectedStartDate(target));
    if (expectedDateOnly && timePartOf(candidate.start.value) === MIDNIGHT) count += 1;
  }

  return count;
}
