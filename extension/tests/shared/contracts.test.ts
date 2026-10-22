import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { EventSchema, MAX_EVENT_TAGS } from '../../src/shared/contracts';
import { makeEvent } from '../../src/core/events';
import { clearAll, exportAll, importAll, listEvents } from '../../src/platform/storage/db';

const NOW = new Date(2026, 9, 21, 8, 0, 0);

function legacyEvent(): Record<string, unknown> {
  const event = makeEvent(
    {
      title: 'Sự kiện cũ',
      label: 'công_vụ',
      tags: ['đồ án'],
      startValue: '2026-11-02T09:00',
      endValue: null,
      durationMinutesInput: 60,
      summary: [],
      relatedProfiles: [],
      sources: [],
    },
    NOW,
  );
  const raw = JSON.parse(JSON.stringify(event)) as Record<string, unknown>;
  delete raw.tags;
  return raw;
}

beforeEach(async () => {
  await clearAll();
});

describe('hợp đồng sự kiện với tags', () => {
  it('bản ghi cũ thiếu tags được đọc với mảng rỗng', () => {
    const parsed = EventSchema.parse(legacyEvent());
    expect(parsed.tags).toEqual([]);
  });

  it('chặn quá 5 nhãn hoặc nhãn quá dài', () => {
    const base = EventSchema.parse(legacyEvent());
    expect(() =>
      EventSchema.parse({ ...base, tags: Array.from({ length: MAX_EVENT_TAGS + 1 }, (_, i) => `tag ${i}`) }),
    ).toThrow();
    expect(() => EventSchema.parse({ ...base, tags: ['x'.repeat(25)] })).toThrow();
  });

  it('nhập JSON cũ không có tags không lỗi, xuất–nhập lại khôi phục tags', async () => {
    const summary = await importAll({
      app: 'lich-trinh-ca-nhan-demo',
      version: 1,
      exportedAt: NOW.toISOString(),
      documents: [],
      profiles: [],
      events: [legacyEvent()],
    });
    expect(summary).toEqual({ documents: 0, profiles: 0, events: 1, skipped: 0 });
    expect((await listEvents())[0]?.tags).toEqual([]);

    const tagged = makeEvent(
      {
        title: 'Sự kiện mới',
        label: 'cá_nhân',
        tags: ['đồ án', 'thư viện'],
        startValue: '2026-11-03T09:00',
        endValue: null,
        durationMinutesInput: null,
        summary: [],
        relatedProfiles: [],
        sources: [],
      },
      NOW,
    );
    await importAll({
      app: 'lich-trinh-ca-nhan-demo',
      version: 1,
      exportedAt: NOW.toISOString(),
      documents: [],
      profiles: [],
      events: [tagged],
    });

    const exported = await exportAll();
    const roundTrip = await importAll(exported);
    expect(roundTrip.skipped).toBe(0);
    const restored = (await listEvents()).find((event) => event.id === tagged.id);
    expect(restored?.tags).toEqual(['đồ án', 'thư viện']);
  });
});
