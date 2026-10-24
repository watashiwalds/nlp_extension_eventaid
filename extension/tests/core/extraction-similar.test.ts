import { describe, expect, it } from 'vitest';
import { makeEvent } from '../../src/core/events';
import {
  duplicateSuggestionKey,
  suggestDuplicates,
} from '../../src/core/extraction/similar';
import type { Event } from '../../src/shared/contracts';

const NOW = new Date(2026, 9, 22, 8, 0, 0);

function event(patch: {
  title: string;
  startValue?: string | null;
  startDate?: string | null;
  quote?: string;
  summary?: string[];
  profiles?: string[];
  status?: Event['status'];
}): Event {
  const created = makeEvent(
    {
      title: patch.title,
      label: 'công_vụ',
      startValue: patch.startValue === undefined ? '2026-11-02T09:00' : patch.startValue,
      startDate: patch.startDate ?? null,
      endValue: null,
      durationMinutesInput: null,
      summary: patch.summary ?? [],
      relatedProfiles: patch.profiles ?? [],
      sources: patch.quote
        ? [{ documentId: 'doc-1', kind: 'web_page', title: 'Nguồn', quote: patch.quote }]
        : [],
    },
    NOW,
  );
  return patch.status ? { ...created, status: patch.status } : created;
}

describe('gợi ý gần trùng', () => {
  it('cùng ngày + tiêu đề gần giống → gợi ý cả hai chiều', () => {
    const a = event({ title: 'Họp nhóm đồ án' });
    const b = event({ title: 'Họp nhóm đồ án tuần này', startValue: '2026-11-02T15:00' });

    const result = suggestDuplicates([a, b]);
    expect(result.get(a.id)?.[0]?.event.id).toBe(b.id);
    expect(result.get(b.id)?.[0]?.event.id).toBe(a.id);
    expect(result.get(a.id)?.[0]?.reasons).toContain('cung_ngay');
    expect(result.get(a.id)?.[0]?.reasons).toContain('tieu_de_gan_giong');
  });

  it('lệch hơn 1 ngày thì không gợi ý dù tiêu đề trùng', () => {
    const a = event({ title: 'Họp nhóm đồ án' });
    const b = event({ title: 'Họp nhóm đồ án', startValue: '2026-11-05T09:00' });
    expect(suggestDuplicates([a, b]).size).toBe(0);
  });

  it('paraphrase tiêu đề nhưng cùng ngày + cùng đoạn trích → gợi ý', () => {
    const quote = 'Nhóm đồ án họp trao đổi tiến độ lúc 9 giờ tại phòng B1-201.';
    const a = event({ title: 'Họp nhóm đồ án', quote });
    const b = event({ title: 'Trao đổi tiến độ đồ án', quote, startValue: '2026-11-02T14:00' });

    const reasons = suggestDuplicates([a, b]).get(a.id)?.[0]?.reasons ?? [];
    expect(reasons).toContain('cung_ngay');
    expect(reasons).toContain('noi_dung_tuong_tu');
  });

  it('thiếu ngày cả hai và chỉ trùng tiêu đề → chưa đủ 2 tín hiệu', () => {
    const a = event({ title: 'Họp nhóm đồ án', startValue: null });
    const b = event({ title: 'Họp nhóm đồ án', startValue: null });
    expect(suggestDuplicates([a, b]).size).toBe(0);
  });

  it('cùng hồ sơ + tiêu đề gần giống là tín hiệu phụ hợp lệ', () => {
    const a = event({ title: 'Họp nhóm đồ án', startValue: null, profiles: ['p1'] });
    const b = event({ title: 'Họp nhóm đồ án', startValue: null, profiles: ['p1'] });
    const reasons = suggestDuplicates([a, b]).get(a.id)?.[0]?.reasons ?? [];
    expect(reasons).toContain('cung_ho_so');
  });

  it('bỏ qua sự kiện đã huỷ và không sửa dữ liệu gốc', () => {
    const a = event({ title: 'Họp nhóm đồ án' });
    const cancelled = event({ title: 'Họp nhóm đồ án', status: 'huy' });
    const snapshot = JSON.stringify([a, cancelled]);

    const result = suggestDuplicates([a, cancelled]);
    expect(result.size).toBe(0);
    expect(JSON.stringify([a, cancelled])).toBe(snapshot);
  });

  it('khoá “Giữ cả hai” ổn định theo thứ tự id', () => {
    expect(duplicateSuggestionKey('b', 'a')).toBe('a|b');
  });
});
