import { EventCandidateSchema, LabelSchema } from '../../shared/contracts';
import type {
  DateTimeRef,
  Event,
  EventCandidate,
  NormalizedDocument,
  SourceRef,
} from '../../shared/contracts';
import { UNCERTAIN_TEXT } from '../../shared/constants';
import { durationMinutes, normalizeIsoLocal } from '../dates';
import { makeEvent } from '../events';
import type { EventInput } from '../events';
import { dedupe } from '../text';
import type { RawEvent } from './schema';
import type { CandidateRunMeta, NormalizeContext } from './types';

const KNOWN_UNCERTAIN = new Set(Object.keys(UNCERTAIN_TEXT));

/** Ngưỡng dưới đó candidate bị gắn cờ "độ tin cậy thấp". */
export const LOW_CONFIDENCE = 0.5;

const HAS_YEAR = /\b(?:19|20)\d{2}\b/;
const HAS_TIME = /\b\d{1,2}\s*(?::\s*\d{2}|h\s*\d{0,2}|giờ)/i;
const RELATIVE_DATE =
  /\b(?:hôm nay|hôm qua|ngày mai|ngày kia|tuần sau|tuần này|tuần trước|tháng sau|tháng này|tháng trước|năm sau|thứ\s*[2-7]|chủ nhật|đầu tháng|cuối tháng)\b/i;

interface DateNormalization {
  ref: DateTimeRef;
  uncertain: string[];
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : text.slice(0, max);
}

/**
 * Chuẩn hoá một mốc thời gian theo bảng §5.2: chỉ điền `value` khi có đủ ngày VÀ giờ.
 * Thiếu một trong hai thì giữ `raw` và ghi khoá `uncertain` tương ứng.
 */
export function normalizeDateTime(
  value: string | null,
  raw: string,
  timezone = 'Asia/Ho_Chi_Minh',
): DateNormalization {
  const rawText = (raw ?? '').trim();
  const hint = rawText || (value ?? '').trim();
  const trimmed = (value ?? '').trim();
  const uncertain: string[] = [];

  const hasYear = HAS_YEAR.test(hint);
  const hasTime = HAS_TIME.test(hint);
  const isRelative = Boolean(hint) && RELATIVE_DATE.test(hint) && !hasYear;
  if (isRelative) uncertain.push('ngay_tuong_doi');

  // Chấp nhận ISO có giây/múi giờ mà model hay trả; quy về giờ địa phương.
  const normalized = normalizeIsoLocal(trimmed, timezone);
  if (normalized) {
    // Nguồn thiếu năm/giờ thì không tin giá trị model tự điền. Ngày tương đối
    // vẫn được quy đổi khi có giờ, vì đã gắn cờ `ngay_tuong_doi`.
    if (!rawText || (hasYear && hasTime) || (isRelative && hasTime)) {
      return { ref: { value: normalized, raw: rawText || trimmed }, uncertain };
    }
    if (!hasYear) uncertain.push('nam_chua_ro');
    if (!hasTime) uncertain.push('gio_chua_ro');
    return { ref: { value: null, raw: clip(rawText, 200) }, uncertain };
  }

  // Không có mốc nào trong nguồn → để trống, `deriveUncertain` của buildEvent lo phần còn lại.
  if (!hint) return { ref: { value: null, raw: null }, uncertain };

  if (!hasYear) uncertain.push('nam_chua_ro');
  if (!hasTime) uncertain.push('gio_chua_ro');
  if (hasYear && hasTime && !uncertain.includes('ngay_tuong_doi')) {
    // Nguồn đủ ngày giờ nhưng model trả chuỗi không dùng được: không đoán, chỉ hạ độ tin cậy.
    uncertain.push('do_tin_cay_thap');
  }

  return { ref: { value: null, raw: clip(rawText || trimmed, 200) }, uncertain };
}

function normalizeLabel(label: string): EventCandidate['label'] {
  const parsed = LabelSchema.safeParse(label);
  return parsed.success ? parsed.data : 'khác';
}

function normalizeSummary(items: string[]): string[] {
  return items
    .map((item) => item.replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((item) => clip(item, 300))
    .slice(0, 5);
}

/**
 * Biến một sự kiện thô của model thành `EventCandidate` đã kiểm tra:
 * ngày giờ không bịa, uncertain được hợp nhất. Hồ sơ được khớp ở bước sau.
 */
export function normalizeEvent(raw: RawEvent, context: NormalizeContext): EventCandidate {
  const start = normalizeDateTime(raw.start, raw.startRaw, context.timezone);
  const end = normalizeDateTime(raw.end, raw.endRaw, context.timezone);
  const startValue = start.ref.value;
  const endValue = startValue ? end.ref.value : null;
  const duration = startValue && endValue ? durationMinutes(startValue, endValue) : null;

  const confidence = Math.min(1, Math.max(0, Number.isFinite(raw.confidence) ? raw.confidence : 0));
  const modelUncertain = raw.uncertain.map((key) => key.trim()).filter((key) => KNOWN_UNCERTAIN.has(key));
  const uncertain = dedupe([
    ...modelUncertain,
    ...start.uncertain,
    ...(endValue ? end.uncertain : []),
    ...(confidence < LOW_CONFIDENCE ? ['do_tin_cay_thap'] : []),
  ]).slice(0, 10);

  const quote = raw.quote.trim();

  return EventCandidateSchema.parse({
    title: clip(raw.title.replace(/\s+/g, ' ').trim(), 120),
    label: normalizeLabel(raw.label),
    start: start.ref,
    end: endValue ? end.ref : null,
    durationMinutes: duration && duration > 0 ? duration : null,
    summary: normalizeSummary(raw.summary),
    relatedProfiles: [],
    confidence: Math.round(confidence * 1000) / 1000,
    uncertain,
    ...(quote ? { quote: clip(quote, 500) } : {}),
  });
}

export function normalizeEvents(raws: RawEvent[], context: NormalizeContext): EventCandidate[] {
  return raws.map((raw) => normalizeEvent(raw, context));
}

export interface CandidateEventOptions {
  document: Pick<NormalizedDocument, 'documentId' | 'source' | 'title' | 'sourceUrl'>;
  run: CandidateRunMeta;
  /** Mặc định `'llm'`; cho phép ép `'manual'` khi người dùng tự tạo từ candidate. */
  origin?: 'manual' | 'llm';
}

/** Candidate → `EventInput` để `makeEvent` sinh id, validation và nguồn trích. */
export function candidateToEventInput(
  candidate: EventCandidate,
  options: CandidateEventOptions,
): EventInput {
  const source: SourceRef = {
    documentId: options.document.documentId,
    kind: options.document.source,
    title: options.document.title,
    ...(options.document.sourceUrl ? { url: options.document.sourceUrl } : {}),
    ...(candidate.quote ? { quote: candidate.quote } : {}),
  };

  return {
    title: candidate.title,
    label: candidate.label,
    startValue: candidate.start.value,
    startRaw: candidate.start.raw,
    endValue: candidate.end?.value ?? null,
    endRaw: candidate.end?.raw ?? null,
    durationMinutesInput: candidate.durationMinutes,
    summary: candidate.summary,
    relatedProfiles: candidate.relatedProfiles,
    sources: [source],
    origin: options.origin ?? 'llm',
    extraUncertain: candidate.uncertain,
    extractionMeta: {
      ...options.run,
      documentId: options.document.documentId,
      confidence: candidate.confidence,
    },
  };
}

/** Candidate → `Event` nháp (`status: 'nhap'`), chưa ghi DB. */
export function candidateToEvent(
  candidate: EventCandidate,
  options: CandidateEventOptions,
  now: Date = new Date(),
): Event {
  return makeEvent(candidateToEventInput(candidate, options), now);
}
