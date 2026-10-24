import { EventCandidateSchema, LabelSchema } from '../../shared/contracts';
import type {
  DateTimeRef,
  Event,
  EventCandidate,
  NormalizedDocument,
  SourceRef,
} from '../../shared/contracts';
import { UNCERTAIN_TEXT } from '../../shared/constants';
import { durationMinutes, normalizeIsoLocal, parseDateOnly } from '../dates';
import { makeEvent } from '../events';
import type { EventInput } from '../events';
import { dedupe } from '../text';
import type { RawEvent } from './schema';
import type { CandidateRunMeta, NormalizeContext } from './types';
import { LOW_CONFIDENCE } from './confidence';

export { LOW_CONFIDENCE };

const KNOWN_UNCERTAIN = new Set(Object.keys(UNCERTAIN_TEXT));

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

function dateKey(year: number, month: number, day: number): string {
  const key = `${year.toString().padStart(4, '0')}-${month
    .toString()
    .padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  return parseDateOnly(key) ? key : '';
}

/** Các ngày tuyệt đối có trong văn bản, dạng `YYYY-MM-DD`. */
function explicitDates(text: string): string[] {
  const found = new Set<string>();
  const add = (year: number, month: number, day: number): void => {
    const key = dateKey(year, month, day);
    if (key) found.add(key);
  };

  for (const match of text.matchAll(/\b((?:19|20)\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/g)) {
    add(Number(match[1]), Number(match[2]), Number(match[3]));
  }
  for (const match of text.matchAll(/\b(\d{1,2})[-/](\d{1,2})[-/]((?:19|20)\d{2})\b/g)) {
    add(Number(match[3]), Number(match[2]), Number(match[1]));
  }
  for (const match of text.matchAll(/\bngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+((?:19|20)\d{2})\b/gi)) {
    add(Number(match[3]), Number(match[2]), Number(match[1]));
  }
  return [...found];
}

/** Đoạn nguồn ngắn quanh đúng ngày, dùng khi raw của model bị hoán đổi. */
function dateSnippet(text: string, isoDate: string, radius = 30): string {
  if (!text) return '';
  const [year = '', month = '', day = ''] = isoDate.split('-');
  const dayNum = String(Number(day));
  const monthNum = String(Number(month));
  const needles = [
    `${day}/${month}/${year}`,
    `${dayNum}/${monthNum}/${year}`,
    `${day}-${month}-${year}`,
    `${dayNum}-${monthNum}-${year}`,
    `${year}-${month}-${day}`,
    `${year}/${month}/${day}`,
    `ngày ${dayNum} tháng ${monthNum} năm ${year}`,
  ];
  const needle = needles.find((item) => text.includes(item));
  if (!needle) return '';
  const index = text.indexOf(needle);
  const start = Math.max(0, index - radius);
  const end = Math.min(text.length, index + needle.length + radius);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function rawForDate(rawText: string, source: string, isoDate: string): string {
  if (rawText && explicitDates(rawText).includes(isoDate)) return rawText;
  return dateSnippet(source, isoDate) || isoDate;
}

/**
 * Chuẩn hoá một mốc thời gian theo bảng §5.2: chỉ điền `value` khi có đủ ngày VÀ giờ.
 * Thiếu một trong hai thì giữ `raw` và ghi khoá `uncertain` tương ứng.
 */
export function normalizeDateTime(
  value: string | null,
  raw: string,
  timezone = 'Asia/Ho_Chi_Minh',
  sourceText = '',
): DateNormalization {
  const rawText = (raw ?? '').trim();
  const trimmed = (value ?? '').trim();
  const source = sourceText.trim();
  const rawDates = explicitDates(rawText);
  const sourceDates = source ? explicitDates(source) : [];
  const evidenceDates = new Set([...rawDates, ...sourceDates]);
  const uncertain: string[] = [];

  // Chỉ đọc tín hiệu ngày/giờ từ chuỗi gốc. Nếu model bỏ raw, không tin giờ ISO.
  const hasYear = Boolean(rawText) && HAS_YEAR.test(rawText);
  const hasTime = Boolean(rawText) && HAS_TIME.test(rawText);
  const isRelative = Boolean(rawText) && RELATIVE_DATE.test(rawText) && !hasYear;
  if (isRelative) uncertain.push('ngay_tuong_doi');

  // Chấp nhận ISO có giây/múi giờ mà model hay trả; quy về giờ địa phương.
  const normalized = normalizeIsoLocal(trimmed, timezone);
  if (normalized) {
    const isoDate = normalized.slice(0, 10);

    if (!rawText && !source) {
      uncertain.push('do_tin_cay_thap');
      return { ref: { value: null, date: null, raw: null }, uncertain };
    }

    if (!rawText) {
      // Model bỏ raw: chỉ giữ ngày nếu nguồn thật sự có ngày đó; giờ vẫn chưa rõ.
      if (!evidenceDates.has(isoDate)) {
        uncertain.push('ngay_khong_khop');
        return { ref: { value: null, date: null, raw: trimmed }, uncertain };
      }
      uncertain.push('gio_chua_ro');
      return { ref: { value: null, date: isoDate, raw: rawForDate('', source, isoDate) }, uncertain };
    }

    if (isRelative) {
      if (!hasTime) {
        uncertain.push('gio_chua_ro');
        return { ref: { value: null, date: isoDate, raw: clip(rawText, 200) }, uncertain };
      }
      return { ref: { value: normalized, date: null, raw: rawText }, uncertain };
    }

    if (!hasYear) {
      uncertain.push('nam_chua_ro');
      if (!hasTime) uncertain.push('gio_chua_ro');
      return { ref: { value: null, date: null, raw: clip(rawText, 200) }, uncertain };
    }

    const dateTrusted = evidenceDates.has(isoDate);
    if (!dateTrusted && evidenceDates.size > 0) {
      uncertain.push('ngay_khong_khop');
      if (!hasTime) uncertain.push('gio_chua_ro');
      return { ref: { value: null, date: null, raw: clip(rawText, 200) }, uncertain };
    }

    if (!hasTime) {
      // Biết ngày, chưa biết giờ: giữ ngày thay vì bịa 00:00.
      if (!dateTrusted) {
        // Nguồn dùng định dạng ngày chưa nhận diện được: không tự đoán ngày.
        uncertain.push('do_tin_cay_thap');
        return { ref: { value: null, date: null, raw: clip(rawText, 200) }, uncertain };
      }
      uncertain.push('gio_chua_ro');
      return { ref: { value: null, date: isoDate, raw: clip(rawForDate(rawText, source, isoDate), 200) }, uncertain };
    }

    if (!dateTrusted) uncertain.push('do_tin_cay_thap');
    return {
      ref: { value: normalized, date: null, raw: dateTrusted ? rawForDate(rawText, source, isoDate) : rawText },
      uncertain,
    };
  }

  // Không có mốc nào trong nguồn → để trống, `deriveUncertain` của buildEvent lo phần còn lại.
  if (!rawText && !trimmed) {
    return { ref: { value: null, date: null, raw: null }, uncertain };
  }

  if (!hasYear) uncertain.push('nam_chua_ro');
  if (!hasTime) uncertain.push('gio_chua_ro');
  if (hasYear && hasTime && !uncertain.includes('ngay_tuong_doi')) {
    // Nguồn đủ ngày giờ nhưng model trả chuỗi không dùng được: không đoán, chỉ hạ độ tin cậy.
    uncertain.push('do_tin_cay_thap');
  }

  let date: string | null = null;
  if (hasYear && !hasTime && !isRelative) {
    const candidate = rawDates[0] ?? null;
    date = candidate && (sourceDates.length === 0 || sourceDates.includes(candidate)) ? candidate : null;
  }

  return { ref: { value: null, date, raw: clip(rawText || trimmed, 200) }, uncertain };
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
  const start = normalizeDateTime(raw.start, raw.startRaw, context.timezone, context.sourceText);
  const end = normalizeDateTime(raw.end, raw.endRaw, context.timezone, context.sourceText);
  const startValue = start.ref.value;
  const endValue = end.ref.value;
  const endRef = endValue || end.ref.date ? end.ref : null;
  const duration = startValue && endValue ? durationMinutes(startValue, endValue) : null;

  const confidence = Math.min(1, Math.max(0, Number.isFinite(raw.confidence) ? raw.confidence : 0));
  const modelUncertain = raw.uncertain.map((key) => key.trim()).filter((key) => KNOWN_UNCERTAIN.has(key));
  const uncertain = dedupe([
    ...modelUncertain,
    ...start.uncertain,
    ...(endRef ? end.uncertain : []),
    ...(confidence < LOW_CONFIDENCE ? ['do_tin_cay_thap'] : []),
  ]).slice(0, 10);

  const quote = raw.quote.trim();

  return EventCandidateSchema.parse({
    title: clip(raw.title.replace(/\s+/g, ' ').trim(), 120),
    label: normalizeLabel(raw.label),
    start: start.ref,
    end: endRef,
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
    startDate: candidate.start.date,
    startRaw: candidate.start.raw,
    endValue: candidate.end?.value ?? null,
    endDate: candidate.end?.date ?? null,
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
