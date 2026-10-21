import { EventSchema } from '../shared/contracts';
import type { Event, EventStatus, Label, SourceRef } from '../shared/contracts';
import { durationMinutes, isPast, parseLocalDateTime } from './dates';
import { newId } from './ids';

export interface EventInput {
  title: string;
  label: Label;
  /** `YYYY-MM-DDTHH:mm` hoặc null khi chưa xác định. */
  startValue: string | null;
  endValue: string | null;
  durationMinutesInput: number | null;
  summary: string[];
  relatedProfiles: string[];
  sources: SourceRef[];
}

export interface EventFilter {
  status?: EventStatus | 'all';
  label?: Label | 'all';
  query?: string;
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

  const candidate = {
    id: base.id,
    title: input.title,
    label: input.label,
    start: { value: startValue, raw: input.startValue },
    end: endValue ? { value: endValue, raw: input.endValue } : null,
    durationMinutes: duration,
    summary: input.summary,
    relatedProfiles: input.relatedProfiles,
    sources: input.sources,
    status: base.status,
    validation: {
      uncertain: deriveUncertain({
        startValue,
        endValue,
        duration,
        relatedProfiles: input.relatedProfiles,
      }),
    },
    notifications: { milestones: [], fired: [], mute: false },
    origin: 'manual' as const,
    createdAt: base.createdAt,
    updatedAt: now.toISOString(),
  };

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
  return buildEvent(input, { id: event.id, createdAt: event.createdAt, status: event.status }, now);
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

/** Sắp xếp: sự kiện có thời điểm lên trước, gần hiện tại nhất trước; chưa có thời điểm xếp cuối. */
export function sortEvents(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const aStart = a.start.value;
    const bStart = b.start.value;
    if (aStart && bStart) return aStart.localeCompare(bStart);
    if (aStart) return -1;
    if (bStart) return 1;
    return b.createdAt.localeCompare(a.createdAt);
  });
}

export function filterEvents(events: Event[], filter: EventFilter): Event[] {
  const query = (filter.query ?? '').trim().toLowerCase();
  return sortEvents(events).filter((event) => {
    if (filter.status && filter.status !== 'all' && event.status !== filter.status) return false;
    if (filter.label && filter.label !== 'all' && event.label !== filter.label) return false;
    if (!query) return true;
    const haystack = [event.title, event.summary.join(' '), ...event.sources.map((s) => s.title)]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function countByStatus(events: Event[]): Record<EventStatus, number> {
  const counts: Record<EventStatus, number> = { nhap: 0, dang_theo_doi: 0, hoan_thanh: 0, huy: 0 };
  for (const event of events) counts[event.status] += 1;
  return counts;
}

export function isOverdue(event: Event, now: Date = new Date()): boolean {
  return (
    event.status === 'dang_theo_doi' &&
    event.start.value !== null &&
    isPast(event.start.value, now)
  );
}

export function upcomingEvents(events: Event[], now: Date = new Date(), limit = 3): Event[] {
  return sortEvents(
    events.filter(
      (event) =>
        (event.status === 'dang_theo_doi' || event.status === 'nhap') &&
        event.start.value !== null &&
        !isPast(event.start.value, now),
    ),
  ).slice(0, limit);
}

export function nextStatusOptions(event: Event): EventStatus[] {
  return TRANSITIONS[event.status];
}

export function displayTitle(event: Event): string {
  return event.title.trim() || '(Chưa đặt tiêu đề)';
}
