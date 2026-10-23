import { EventSchema } from '../shared/contracts';
import type {
  Event,
  EventOrigin,
  EventStatus,
  ExtractionMeta,
  Label,
  SourceRef,
} from '../shared/contracts';
import { durationMinutes, parseLocalDateTime, toInputValue } from './dates';
import { newId } from './ids';
import { dedupe } from './text';

export interface EventInput {
  title: string;
  label: Label;
  /** Nhãn tuỳ chỉnh; không truyền = không có nhãn (tương thích call-site cũ). */
  tags?: string[];
  /** `YYYY-MM-DDTHH:mm` hoặc null khi chưa xác định. */
  startValue: string | null;
  /** Chuỗi gốc khi `startValue` là null (LLM trả "15/11 lúc 8h"); mặc định = startValue. */
  startRaw?: string | null;
  endValue: string | null;
  endRaw?: string | null;
  durationMinutesInput: number | null;
  summary: string[];
  relatedProfiles: string[];
  sources: SourceRef[];
  /** `'manual'` (mặc định) hoặc `'llm'`. */
  origin?: EventOrigin;
  /** Chỉ có khi `origin === 'llm'`. */
  extractionMeta?: ExtractionMeta;
  /** Khoá `uncertain` do pipeline sinh (vd. `nam_chua_ro`), hợp nhất với kết quả suy ra. */
  extraUncertain?: string[];
}

export interface EventFilter {
  status?: EventStatus | 'all';
  label?: Label | 'all';
  /** Lọc đúng một nhãn tuỳ chỉnh; `'all'`/rỗng = không lọc. */
  tag?: string | 'all';
  query?: string;
}

export type EventTiming = 'ongoing' | 'upcoming' | 'past' | 'unknown';

/** Thời điểm kết thúc hiệu dụng: `end` hoặc suy ra từ start + thời lượng (không bịa nếu thiếu). */
export function eventEndValue(event: Event): string | null {
  if (event.end?.value) return event.end.value;
  if (!event.start.value || !event.durationMinutes || event.durationMinutes <= 0) return null;
  const start = new Date(event.start.value);
  if (Number.isNaN(start.getTime())) return null;
  return toInputValue(new Date(start.getTime() + event.durationMinutes * 60_000));
}

/** Phân loại theo thời gian thực: đang diễn ra / sắp tới / đã qua / chưa rõ. */
export function eventTiming(event: Event, now: Date = new Date()): EventTiming {
  if (!event.start.value) return 'unknown';
  const start = new Date(event.start.value).getTime();
  if (Number.isNaN(start)) return 'unknown';
  const endValue = eventEndValue(event);
  const end = endValue ? new Date(endValue).getTime() : null;
  const current = now.getTime();
  if (end !== null && !Number.isNaN(end) && current >= start && current < end) return 'ongoing';
  return current < start ? 'upcoming' : 'past';
}

/** Đang diễn ra và sự kiện còn hiệu lực (không áp dụng cho đã huỷ/hoàn thành). */
export function isOngoing(event: Event, now: Date = new Date()): boolean {
  return (
    eventTiming(event, now) === 'ongoing' && event.status !== 'hoan_thanh' && event.status !== 'huy'
  );
}

/** Cờ "chưa chắc chắn" — không bao giờ tự bịa giá trị thiếu. */
export function deriveUncertain(input: {
  startValue: string | null;
  endValue: string | null;
  duration: number | null;
  relatedProfiles: string[];
}): string[] {
  const uncertain: string[] = [];
  if (!input.startValue) uncertain.push('chua_ro_thoi_diem');
  if (!input.endValue && input.duration === null) uncertain.push('chua_ro_ket_thuc');
  if (input.relatedProfiles.length === 0) uncertain.push('chua_ro_ho_so');
  return uncertain;
}

function buildEvent(
  input: EventInput,
  base: { id: string; createdAt: string; status: EventStatus },
  now: Date,
): Event {
  const startValue = input.startValue && parseLocalDateTime(input.startValue) ? input.startValue : null;
  const endValue = input.endValue && parseLocalDateTime(input.endValue) ? input.endValue : null;
  const duration =
    startValue && endValue
      ? durationMinutes(startValue, endValue)
      : startValue
        ? input.durationMinutesInput
        : null;

  const candidate: Record<string, unknown> = {
    id: base.id,
    title: input.title,
    label: input.label,
    tags: input.tags ?? [],
    start: { value: startValue, raw: input.startRaw ?? input.startValue },
    end: endValue ? { value: endValue, raw: input.endRaw ?? input.endValue } : null,
    durationMinutes: duration,
    summary: input.summary,
    relatedProfiles: input.relatedProfiles,
    sources: input.sources,
    status: base.status,
    validation: {
      uncertain: dedupe([
        ...deriveUncertain({
          startValue,
          endValue,
          duration,
          relatedProfiles: input.relatedProfiles,
        }),
        ...(input.extraUncertain ?? []),
      ]),
    },
    notifications: { milestones: [], fired: [], mute: false },
    origin: input.origin ?? 'manual',
    createdAt: base.createdAt,
    updatedAt: now.toISOString(),
  };

  if (input.extractionMeta) candidate.extractionMeta = input.extractionMeta;

  return EventSchema.parse(candidate);
}

export function makeEvent(input: EventInput, now: Date = new Date()): Event {
  return buildEvent(
    input,
    {
      id: newId('evt'),
      createdAt: now.toISOString(),
      status: 'nhap',
    },
    now,
  );
}

export function updateEvent(event: Event, input: EventInput, now: Date = new Date()): Event {
  return buildEvent(
    {
      ...input,
      // Sửa nội dung không được làm mất dấu "máy đề xuất" của bản ghi.
      origin: input.origin ?? event.origin,
      extractionMeta: input.extractionMeta ?? event.extractionMeta,
    },
    { id: event.id, createdAt: event.createdAt, status: event.status },
    now,
  );
}

export const TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  nhap: ['dang_theo_doi', 'huy'],
  dang_theo_doi: ['hoan_thanh', 'huy', 'nhap'],
  hoan_thanh: ['dang_theo_doi'],
  huy: ['nhap'],
};

export function setEventStatus(event: Event, status: EventStatus, now: Date = new Date()): Event {
  if (!TRANSITIONS[event.status].includes(status)) return event;
  const next: Event = { ...event, status, updatedAt: now.toISOString() };
  if (status === 'hoan_thanh') {
    next.completedAt = now.toISOString();
  } else {
    delete next.completedAt;
  }
  return next;
}

/**
 * Sắp xếp 4 nhóm: đang diễn ra → sắp tới (tăng dần) → đã qua (gần nhất trước)
 * → chưa có thời điểm (cuối, mới tạo trước).
 */
export function sortEvents(events: Event[], now: Date = new Date()): Event[] {
  const rank = (event: Event): number => {
    const timing = eventTiming(event, now);
    if (timing === 'ongoing') return 0;
    if (timing === 'upcoming') return 1;
    if (timing === 'past') return 2;
    return 3;
  };
  return [...events].sort((a, b) => {
    const rankA = rank(a);
    const rankB = rank(b);
    if (rankA !== rankB) return rankA - rankB;
    if (rankA === 3) return b.createdAt.localeCompare(a.createdAt);
    const startA = a.start.value ?? '';
    const startB = b.start.value ?? '';
    return rankA === 2 ? startB.localeCompare(startA) : startA.localeCompare(startB);
  });
}

export function filterEvents(events: Event[], filter: EventFilter, now: Date = new Date()): Event[] {
  const query = (filter.query ?? '').trim().toLowerCase();
  const tag = (filter.tag ?? 'all').trim().toLowerCase();
  return sortEvents(events, now).filter((event) => {
    if (filter.status && filter.status !== 'all' && event.status !== filter.status) return false;
    if (filter.label && filter.label !== 'all' && event.label !== filter.label) return false;
    if (tag && tag !== 'all' && !event.tags.some((item) => item.toLowerCase() === tag)) return false;
    if (!query) return true;
    const haystack = [
      event.title,
      event.summary.join(' '),
      event.tags.join(' '),
      ...event.sources.map((s) => s.title),
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

/** Danh sách nhãn tuỳ chỉnh duy nhất, sắp xếp alphabet (không phân biệt hoa/thường). */
export function allEventTags(events: Event[]): string[] {
  const unique = new Map<string, string>();
  for (const event of events) {
    for (const tag of event.tags) {
      const key = tag.toLowerCase();
      if (!unique.has(key)) unique.set(key, tag);
    }
  }
  return [...unique.values()].sort((a, b) => a.localeCompare(b, 'vi'));
}

/** Lọc sự kiện theo hồ sơ; `null` nghĩa là tất cả. */
export function eventsForProfile(events: Event[], profileId: string | null): Event[] {
  if (!profileId) return events;
  return events.filter((event) => event.relatedProfiles.includes(profileId));
}

export function countByStatus(events: Event[]): Record<EventStatus, number> {  const counts: Record<EventStatus, number> = { nhap: 0, dang_theo_doi: 0, hoan_thanh: 0, huy: 0 };
  for (const event of events) counts[event.status] += 1;
  return counts;
}

export function isOverdue(event: Event, now: Date = new Date()): boolean {
  return event.status === 'dang_theo_doi' && eventTiming(event, now) === 'past';
}

export function upcomingEvents(events: Event[], now: Date = new Date(), limit = 3): Event[] {
  return sortEvents(
    events.filter((event) => {
      if (event.status !== 'dang_theo_doi' && event.status !== 'nhap') return false;
      const timing = eventTiming(event, now);
      return timing === 'ongoing' || timing === 'upcoming';
    }),
    now,
  ).slice(0, limit);
}

export function nextStatusOptions(event: Event): EventStatus[] {
  return TRANSITIONS[event.status];
}

export function displayTitle(event: Event): string {
  return event.title.trim() || '(Chưa đặt tiêu đề)';
}
