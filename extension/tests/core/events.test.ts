import { describe, expect, it } from 'vitest';
import {
  allEventTags,
  countByStatus,
  eventEndValue,
  eventTiming,
  eventsForProfile,
  filterEvents,
  isOngoing,
  isOverdue,
  makeEvent,
  nextStatusOptions,
  setEventStatus,
  sortEvents,
  upcomingEvents,
} from '../../src/core/events';
import type { EventInput } from '../../src/core/events';

const NOW = new Date(2026, 9, 21, 8, 0, 0);

function input(patch: Partial<EventInput> = {}): EventInput {
  return {
    title: 'Họp nhóm đồ án',
    label: 'công_vụ',
    startValue: '2026-11-02T09:00',
    endValue: '2026-11-02T10:30',
    durationMinutesInput: null,
    summary: ['Chủ đề: chốt đề cương'],
    relatedProfiles: [],
    sources: [],
    ...patch,
  };
}

describe('events', () => {
  it('tạo sự kiện nháp, tính thời lượng từ start/end', () => {
    const event = makeEvent(input(), NOW);
    expect(event.status).toBe('nhap');
    expect(event.durationMinutes).toBe(90);
    expect(event.start.value).toBe('2026-11-02T09:00');
    expect(event.end?.value).toBe('2026-11-02T10:30');
  });

  it('đánh dấu chưa rõ thời điểm thay vì bịa', () => {
    const event = makeEvent(input({ startValue: null, endValue: null }), NOW);
    expect(event.start.value).toBeNull();
    expect(event.validation.uncertain).toContain('chua_ro_thoi_diem');
    expect(event.durationMinutes).toBeNull();
  });

  it('lấy thời lượng nhập tay khi không có end', () => {
    const event = makeEvent(
      input({ endValue: null, durationMinutesInput: 45 }),
      NOW,
    );
    expect(event.durationMinutes).toBe(45);
    expect(event.validation.uncertain).not.toContain('chua_ro_ket_thuc');
  });

  it('biết ngày nhưng chưa biết giờ vẫn xếp lịch, chỉ thiếu cờ giờ', () => {
    const event = makeEvent(
      input({ startValue: null, startDate: '2026-10-25', endValue: null, endDate: '2026-10-29' }),
      NOW,
    );
    expect(event.start.value).toBeNull();
    expect(event.start.date).toBe('2026-10-25');
    expect(event.end?.date).toBe('2026-10-29');
    expect(event.validation.uncertain).toContain('gio_chua_ro');
    expect(event.validation.uncertain).not.toContain('chua_ro_thoi_diem');
    expect(event.validation.uncertain).not.toContain('chua_ro_ket_thuc');
    expect(eventTiming(event, NOW)).toBe('upcoming');
    expect(upcomingEvents([event], NOW).map((item) => item.id)).toEqual([event.id]);
  });

  it('chỉ cho phép chuyển trạng thái hợp lệ', () => {
    const draft = makeEvent(input(), NOW);
    const tracked = setEventStatus(draft, 'dang_theo_doi', NOW);
    expect(tracked.status).toBe('dang_theo_doi');

    const done = setEventStatus(tracked, 'hoan_thanh', NOW);
    expect(done.status).toBe('hoan_thanh');
    expect(done.completedAt).toBe(NOW.toISOString());

    const back = setEventStatus(done, 'dang_theo_doi', NOW);
    expect(back.completedAt).toBeUndefined();

    const cancelled = setEventStatus(draft, 'huy', NOW);
    expect(cancelled.status).toBe('huy');
    expect(nextStatusOptions(cancelled)).toContain('nhap');
  });

  it('không đổi trạng thái nếu chuyển không hợp lệ', () => {
    const draft = makeEvent(input(), NOW);
    const result = setEventStatus(draft, 'hoan_thanh', NOW);
    expect(result).toBe(draft);
  });

  it('sắp xếp sự kiện chưa có thời điểm xuống cuối', () => {
    const later = makeEvent(input({ startValue: '2026-12-01T09:00' }), NOW);
    const sooner = makeEvent(input({ title: 'Sự kiện sớm', startValue: '2026-10-25T09:00' }), NOW);
    const unknown = makeEvent(input({ title: 'Chưa rõ', startValue: null, endValue: null }), NOW);
    const sorted = sortEvents([unknown, later, sooner], NOW);
    expect(sorted.map((event) => event.title)).toEqual(['Sự kiện sớm', 'Họp nhóm đồ án', 'Chưa rõ']);
  });

  it('ưu tiên sắp diễn ra, nhóm đã qua gần nhất trước', () => {
    const tomorrow = makeEvent(input({ title: 'Ngày mai', startValue: '2026-10-22T09:00' }), NOW);
    const nextMonth = makeEvent(input({ title: 'Tháng sau', startValue: '2026-11-20T09:00' }), NOW);
    const lastMonth = makeEvent(
      input({ title: 'Tháng trước', startValue: '2026-09-15T09:00', endValue: null }),
      NOW,
    );
    const yesterday = makeEvent(
      input({ title: 'Hôm qua', startValue: '2026-10-20T09:00', endValue: null }),
      NOW,
    );
    const unknown = makeEvent(input({ title: 'Chưa rõ', startValue: null, endValue: null }), NOW);

    const sorted = sortEvents([unknown, lastMonth, nextMonth, yesterday, tomorrow], NOW);
    expect(sorted.map((event) => event.title)).toEqual([
      'Ngày mai',
      'Tháng sau',
      'Hôm qua',
      'Tháng trước',
      'Chưa rõ',
    ]);
  });

  it('lọc sự kiện theo hồ sơ', () => {
    const withProfile = makeEvent(input({ relatedProfiles: ['prf_1'] }), NOW);
    const withoutProfile = makeEvent(input({ title: 'Không gắn hồ sơ' }), NOW);
    expect(eventsForProfile([withProfile, withoutProfile], 'prf_1').map((event) => event.id)).toEqual([
      withProfile.id,
    ]);
    expect(eventsForProfile([withProfile, withoutProfile], null)).toHaveLength(2);
  });

  it('lọc theo trạng thái, nhãn và từ khoá', () => {
    const work = makeEvent(input(), NOW);
    const fun = makeEvent(input({ title: 'Đi xem phim', label: 'giải_trí' }), NOW);
    const events = [work, fun];

    expect(filterEvents(events, { status: 'nhap' })).toHaveLength(2);
    expect(filterEvents(events, { label: 'giải_trí' })).toHaveLength(1);
    expect(filterEvents(events, { query: 'đồ án' })[0]?.id).toBe(work.id);
    expect(countByStatus(events).nhap).toBe(2);
  });

  it('lưu, lọc và tìm kiếm theo nhãn tuỳ chỉnh', () => {
    const tagged = makeEvent(input({ tags: ['đồ án', 'họp nhóm'] }), NOW);
    const other = makeEvent(input({ title: 'Đi xem phim', tags: ['giải trí'] }), NOW);
    const events = [tagged, other];

    expect(tagged.tags).toEqual(['đồ án', 'họp nhóm']);
    expect(filterEvents(events, { tag: 'Đồ án' }).map((event) => event.id)).toEqual([tagged.id]);
    expect(filterEvents(events, { tag: 'all' })).toHaveLength(2);
    expect(filterEvents(events, { query: 'họp nhóm' })[0]?.id).toBe(tagged.id);
    expect(allEventTags(events)).toEqual(['đồ án', 'giải trí', 'họp nhóm']);
  });

  it('nhận biết quá hạn và lọc sự kiện sắp tới', () => {
    const past = setEventStatus(
      makeEvent(input({ startValue: '2026-10-20T09:00', endValue: '2026-10-20T10:00' }), NOW),
      'dang_theo_doi',
      NOW,
    );
    const future = setEventStatus(
      makeEvent(input({ startValue: '2026-10-25T09:00', endValue: '2026-10-25T10:00' }), NOW),
      'dang_theo_doi',
      NOW,
    );
    expect(isOverdue(past, NOW)).toBe(true);
    expect(isOverdue(future, NOW)).toBe(false);
    expect(upcomingEvents([past, future], NOW, 3).map((event) => event.id)).toEqual([future.id]);
  });

  it('nhận diện sự kiện đang diễn ra và không coi là quá hạn', () => {
    const ongoing = setEventStatus(
      makeEvent(
        input({ title: 'Đang diễn ra', startValue: '2026-10-21T07:00', endValue: '2026-10-21T09:00' }),
        NOW,
      ),
      'dang_theo_doi',
      NOW,
    );
    expect(eventTiming(ongoing, NOW)).toBe('ongoing');
    expect(isOngoing(ongoing, NOW)).toBe(true);
    expect(isOverdue(ongoing, NOW)).toBe(false);
    expect(upcomingEvents([ongoing], NOW, 3).map((event) => event.id)).toEqual([ongoing.id]);
  });

  it('suy ra thời điểm kết thúc từ thời lượng để phát hiện đang diễn ra', () => {
    const ongoing = makeEvent(
      input({ startValue: '2026-10-21T07:30', endValue: null, durationMinutesInput: 60 }),
      NOW,
    );
    expect(eventEndValue(ongoing)).toBe('2026-10-21T08:30');
    expect(eventTiming(ongoing, NOW)).toBe('ongoing');
  });

  it('không coi sự kiện đã huỷ là đang diễn ra', () => {
    const event = makeEvent(
      input({ startValue: '2026-10-21T07:00', endValue: '2026-10-21T09:00' }),
      NOW,
    );
    const cancelled = setEventStatus(event, 'huy', NOW);
    expect(eventTiming(cancelled, NOW)).toBe('ongoing');
    expect(isOngoing(cancelled, NOW)).toBe(false);
  });

  it('xếp sự kiện đang diễn ra lên trước sắp tới và đã qua', () => {
    const upcoming = makeEvent(
      input({ title: 'Sắp tới', startValue: '2026-10-25T09:00', endValue: '2026-10-25T10:00' }),
      NOW,
    );
    const ongoing = makeEvent(
      input({ title: 'Đang diễn ra', startValue: '2026-10-21T07:00', endValue: '2026-10-21T09:00' }),
      NOW,
    );
    const past = makeEvent(
      input({ title: 'Đã qua', startValue: '2026-10-19T07:00', endValue: '2026-10-19T08:00' }),
      NOW,
    );
    const sorted = sortEvents([past, upcoming, ongoing], NOW);
    expect(sorted.map((event) => event.title)).toEqual(['Đang diễn ra', 'Sắp tới', 'Đã qua']);
  });
});
