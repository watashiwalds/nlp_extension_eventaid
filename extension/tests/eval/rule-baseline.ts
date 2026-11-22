import { parseDateOnly } from '../../src/core/dates';
import { vagueTimeFromRaw } from '../../src/core/extraction/vague-time';
import type { EventCandidate } from '../../src/shared/contracts';

/**
 * Baseline rule-based cho trích xuất thời gian (TASK 05).
 *
 * Mục đích: mốc so sánh "luật tất định" với LLM + hậu kiểm trên CÙNG công cụ
 * đo. Đây KHÔNG phải temporal parser đầy đủ — giới hạn có chủ đích, ghi rõ
 * trong README của baseline:
 * - Không xử lý đại từ hồi chỉ ("buổi đó", "hôm đó"), không tách câu phức tạp.
 * - Mỗi câu tối đa 2 sự kiện (mỗi biểu thức ngày một sự kiện).
 * - Nhãn luôn `công_vụ`, confidence cố định 0.5; tóm tắt = cả câu.
 * - "tuần sau" = +7 ngày cùng thứ; "tháng sau" = cùng ngày tháng kế tiếp;
 *   "thứ n/chủ nhật" = lần xuất hiện kế tiếp SAU `now` (quy ước của baseline).
 */

const MAX_EVENTS_PER_SENTENCE = 2;

interface DateHit {
  /** `YYYY-MM-DD`; null khi không suy ra được ngày. */
  date: string | null;
  raw: string;
  index: number;
  flags: string[];
  hasExplicitYear: boolean;
}

interface TimeHit {
  time: string;
  raw: string;
  index: number;
  /** Kết thúc một khoảng "A đến B": chỉ dùng cho hit thứ hai của cặp. */
  rangeEnd: boolean;
  flags: string[];
}

function pad(value: number, size = 2): string {
  return String(value).padStart(size, '0');
}

function dateKeyOf(year: number, month: number, day: number): string | null {
  const key = `${pad(year, 4)}-${pad(month)}-${pad(day)}`;
  return parseDateOnly(key) ? key : null;
}

function addDays(base: Date, days: number): string {
  const next = new Date(base.getTime());
  next.setDate(next.getDate() + days);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

function nextWeekday(base: Date, targetDay: number): string {
  const next = new Date(base.getTime());
  do {
    next.setDate(next.getDate() + 1);
  } while (next.getDay() !== targetDay);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

function addMonths(base: Date): string {
  const next = new Date(base.getTime());
  next.setMonth(next.getMonth() + 1);
  return `${next.getFullYear()}-${pad(next.getMonth() + 1)}-${pad(next.getDate())}`;
}

const WEEKDAY_WORDS: ReadonlyArray<readonly [RegExp, number]> = [
  [/chủ nhật|chủ nhật\b/i, 0],
  [/thứ\s*2/i, 1],
  [/thứ\s*3/i, 2],
  [/thứ\s*4/i, 3],
  [/thứ\s*5/i, 4],
  [/thứ\s*6/i, 5],
  [/thứ\s*7/i, 6],
];

function findDateHits(sentence: string, now: Date): DateHit[] {
  const hits: DateHit[] = [];
  const push = (hit: DateHit): void => {
    if (hit.date || hit.flags.length > 0) hits.push(hit);
  };

  // 1) ISO `YYYY-MM-DD`
  for (const m of sentence.matchAll(/((?:19|20)\d{2})-(\d{1,2})-(\d{1,2})/g)) {
    push({
      date: dateKeyOf(Number(m[1]), Number(m[2]), Number(m[3])),
      raw: m[0],
      index: m.index ?? 0,
      flags: [],
      hasExplicitYear: true,
    });
  }

  // 2) `dd/mm/yyyy`, `dd-mm-yyyy`
  for (const m of sentence.matchAll(/(\d{1,2})[/.-](\d{1,2})[/.-]((?:19|20)\d{2})\b/g)) {
    push({
      date: dateKeyOf(Number(m[3]), Number(m[2]), Number(m[1])),
      raw: m[0],
      index: m.index ?? 0,
      flags: [],
      hasExplicitYear: true,
    });
  }

  // 3) `ngày dd tháng mm [năm yyyy]`
  for (const m of sentence.matchAll(
    /ngày\s+(\d{1,2})\s+tháng\s+(\d{1,2})(?:\s+năm\s+((?:19|20)\d{2}))?/gi,
  )) {
    const year = m[3] ? Number(m[3]) : now.getFullYear();
    push({
      date: dateKeyOf(year, Number(m[2]), Number(m[1])),
      raw: m[0],
      index: m.index ?? 0,
      flags: m[3] ? [] : ['nam_suy_doan'],
      hasExplicitYear: Boolean(m[3]),
    });
  }

  // 4) `dd/mm` không năm → năm ngữ cảnh, gắn cờ suy đoán (đồng bộ v5).
  for (const m of sentence.matchAll(/(\d{1,2})\/(\d{1,2})\b/g)) {
    if (hits.some((hit) => hit.raw.includes(m[0]))) continue;
    push({
      date: dateKeyOf(now.getFullYear(), Number(m[2]), Number(m[1])),
      raw: m[0],
      index: m.index ?? 0,
      flags: ['nam_suy_doan'],
      hasExplicitYear: false,
    });
  }

  // 5) Ngày tương đối — quy ước ghi trong header; gắn cờ `ngay_tuong_doi`.
  const relative: ReadonlyArray<readonly [RegExp, string]> = [
    [/\bhôm nay\b/i, addDays(now, 0)],
    [/\bngày mai\b|\bmai\b/i, addDays(now, 1)],
    [/\bngày kia\b/i, addDays(now, 2)],
    [/\btuần sau\b/i, addDays(now, 7)],
    [/\btuần trước\b/i, addDays(now, -7)],
    [/\btháng sau\b/i, addMonths(now)],
  ];
  for (const [pattern, date] of relative) {
    const m = pattern.exec(sentence);
    if (m) push({ date, raw: m[0], index: m.index, flags: ['ngay_tuong_doi'], hasExplicitYear: false });
  }
  for (const [pattern, day] of WEEKDAY_WORDS) {
    const m = pattern.exec(sentence);
    if (m) {
      push({
        date: nextWeekday(now, day),
        raw: m[0],
        index: m.index,
        flags: ['ngay_tuong_doi'],
        hasExplicitYear: false,
      });
    }
  }

  return hits.sort((a, b) => a.index - b.index);
}

function findTimeHits(sentence: string): TimeHit[] {
  const hits: TimeHit[] = [];

  // Giờ rõ: `HH:mm`, `Hhmm`, `Hh` (không phút), `H giờ [mm|rưỡi]`.
  for (const m of sentence.matchAll(
    /(\d{1,2})\s*[:h]\s*(\d{2})\b|(\d{1,2})h(?!\d)|(\d{1,2})\s+giờ(?:\s+(rưỡi)|\s+(\d{1,2}))?/gi,
  )) {
    const hour = Number(m[1] ?? m[3] ?? m[4]);
    const minute = m[2] ? Number(m[2]) : m[5] ? 30 : m[6] ? Number(m[6]) : 0;
    if (hour > 23 || minute > 59) continue;
    hits.push({
      time: `${pad(hour)}:${pad(minute)}`,
      raw: m[0],
      index: m.index ?? 0,
      rangeEnd: false,
      flags: [],
    });
  }

  // Cặp `từ A đến B` / `A–B`: hit sau của cặp là giờ kết thúc.
  for (let i = 1; i < hits.length; i += 1) {
    const prev = hits[i - 1];
    const current = hits[i];
    if (!prev || !current) continue;
    const between = sentence.slice(prev.index + prev.raw.length, current.index);
    if (/^\s*(đến|tới|–|-|—)\s*$/.test(between) && between.length <= 12) {
      current.rangeEnd = true;
    }
  }

  // Giờ mơ hồ: chỉ khi câu KHÔNG có giờ rõ nào (cùng nguyên tắc với v5).
  if (hits.length === 0) {
    const vague = vagueTimeFromRaw(sentence);
    if (vague) {
      hits.push({ time: vague, raw: vague, index: 0, rangeEnd: false, flags: ['gio_suy_doan'] });
    }
  }

  return hits;
}

function extractTitle(sentence: string, cutIndex: number): string {
  const before = sentence
    .slice(0, cutIndex)
    .replace(/[\s,;:]+(?:lúc|vào|từ|ngày|đến|tới|và|thì|sẽ|được|rằng|khi|sau khi|trước khi)\s*$/gi, '')
    .replace(/[\s,;:–-]+$/g, '')
    .trim();
  if (before.length >= 4) return before.slice(0, 120);

  const fallback = sentence
    .replace(/[.!?]+$/g, '')
    .trim()
    .split(/\s+/)
    .slice(0, 8)
    .join(' ');
  return fallback.slice(0, 120);
}

function ref(start: { date: string | null; time: string | null; raw: string }): EventCandidate['start'] {
  // Hợp đồng DateTimeRef: đủ ngày + giờ → `value`; chỉ có ngày → `date`.
  if (start.date && start.time) {
    return { value: `${start.date}T${start.time}`, date: null, raw: start.raw || null };
  }
  return { value: null, date: start.date, raw: start.raw || null };
}

/** Baseline tất định: mỗi biểu thức ngày trong câu là một sự kiện (tối đa 2/câu). */
export function extractWithRules(text: string, now: Date): EventCandidate[] {
  const candidates: EventCandidate[] = [];
  const sentences = text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);

  for (const sentence of sentences) {
    const dateHits = findDateHits(sentence, now);
    if (dateHits.length === 0) continue;

    const timeHits = findTimeHits(sentence);
    const rangeEnd = timeHits.find((hit) => hit.rangeEnd) ?? null;

    for (const dateHit of dateHits.slice(0, MAX_EVENTS_PER_SENTENCE)) {
      const explicit =
        timeHits.find((hit) => !hit.rangeEnd && hit.index > dateHit.index) ??
        timeHits.find((hit) => !hit.rangeEnd) ??
        null;

      const title = extractTitle(
        sentence,
        Math.min(dateHit.index, explicit?.index ?? dateHit.index),
      );
      if (!title) continue;

      candidates.push({
        title,
        label: 'công_vụ',
        start: ref({
          date: dateHit.date,
          time: explicit?.time ?? null,
          raw: `${dateHit.raw}${explicit ? ` ${explicit.raw}` : ''}`,
        }),
        ...(rangeEnd && dateHit.date
          ? { end: { value: `${dateHit.date}T${rangeEnd.time}`, date: null, raw: rangeEnd.raw } }
          : { end: null }),
        durationMinutes: null,
        summary: [sentence.slice(0, 300)],
        relatedProfiles: [],
        confidence: 0.5,
        uncertain: [...dateHit.flags, ...(explicit?.flags ?? [])],
        quote: sentence.slice(0, 500),
      });
    }
  }

  return candidates;
}
