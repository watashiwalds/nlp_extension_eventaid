import type { RawEvent, RawExtraction } from '../../../src/core/extraction/schema';
import type { Label, Profile, SourceKind } from '../../../src/shared/contracts';
import type { ExpectedEvent, ExpectedMetrics } from '../../eval/metrics';

/**
 * Kiểu dữ liệu và helper dùng chung cho bộ mẫu Slice E.
 *
 * `mockOutput` tách khỏi `expected` để test được cả trường hợp model giả trả
 * thiếu/thừa/sai. E13 cố ý trả thêm sự kiện injection để chứng minh công cụ đo
 * phát hiện được sự kiện thừa và ngày bịa; các mẫu còn lại trả đúng đáp án.
 */

/** Mốc "hôm nay" cố định cho test tất định: thứ Năm, 22/10/2026, 08:00 +07. */
export const EVAL_NOW = '2026-10-22T08:00:00+07:00';
export const NOW_ISO = new Date(EVAL_NOW).toISOString();

export type EvalCategory =
  | 'class'
  | 'meeting'
  | 'seminar'
  | 'recruitment'
  | 'event'
  | 'negative'
  | 'edge';

export interface EvalParaphrase {
  text: string;
  mockOutput: RawExtraction;
  /** Tiêu đề paraphrase phải có ít nhất một gợi ý trùng. */
  suggestedTitles: string[];
}

export interface EvalCase {
  id: string;
  category: EvalCategory;
  title: string;
  source: SourceKind;
  sourceUrl?: string;
  text: string;
  now: string;
  expected: ExpectedEvent[];
  /** Ngày được phép xuất hiện: ngày kỳ vọng + ngày tuyệt đối có trong nguồn. */
  allowedDates: string[];
  mockOutput: RawExtraction;
  metrics: ExpectedMetrics;
  profiles?: Profile[];
  /** Khoá `uncertain` bắt buộc trên sự kiện có tiêu đề tương ứng. */
  requiredUncertain?: Array<{ title: string; keys: string[] }>;
  /** Hồ sơ bắt buộc gắn trên sự kiện có tiêu đề tương ứng (theo tên). */
  requiredProfiles?: Array<{ title: string; profileNames: string[] }>;
  /** E12: chạy lại cùng nội dung với các bản ghi của lần đầu. */
  rescan?: boolean;
  paraphrase?: EvalParaphrase;
}

export function rawEvent(input: {
  title: string;
  label?: Label;
  start: string | null;
  end?: string | null;
  startRaw?: string;
  endRaw?: string;
  summary?: string[];
  confidence?: number;
  uncertain?: string[];
  quote?: string;
}): RawEvent {
  return {
    title: input.title,
    label: input.label ?? 'công_vụ',
    start: input.start,
    end: input.end ?? null,
    startRaw: input.startRaw ?? '',
    endRaw: input.endRaw ?? '',
    summary: input.summary ?? [],
    confidence: input.confidence ?? 0.85,
    uncertain: input.uncertain ?? [],
    quote: input.quote ?? '',
  };
}

export function expected(
  title: string,
  startValue: string | null,
  startDate: string | null,
  extra: Partial<ExpectedEvent> = {},
): ExpectedEvent {
  return { title, startValue, startDate, ...extra };
}

export function metrics(
  input: Omit<ExpectedMetrics, 'recall' | 'precision'>,
): ExpectedMetrics {
  const totalExpected = input.matched + input.missed;
  return {
    ...input,
    recall:
      totalExpected === 0 ? (input.totalActual === 0 ? 1 : 0) : input.matched / totalExpected,
    precision: input.totalActual === 0 ? 1 : input.matched / input.totalActual,
  };
}
