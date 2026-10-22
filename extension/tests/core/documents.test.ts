import { describe, expect, it } from 'vitest';
import { unlinkedDocuments } from '../../src/core/documents';
import { makeEvent } from '../../src/core/events';
import { parsePastedText } from '../../src/platform/capture/parse';

const NOW = new Date(2026, 9, 21, 8, 0, 0);

describe('unlinkedDocuments', () => {
  it('trả về mọi nội dung khi chưa có sự kiện nào', () => {
    const a = parsePastedText('A', 'Nội dung A');
    const b = parsePastedText('B', 'Nội dung B');
    expect(unlinkedDocuments([a, b], []).map((doc) => doc.documentId)).toEqual([
      a.documentId,
      b.documentId,
    ]);
  });

  it('bỏ qua nội dung đang được một sự kiện dùng làm nguồn trích', () => {
    const used = parsePastedText('Đã dùng', 'Nội dung đã gắn sự kiện');
    const orphan = parsePastedText('Chưa dùng', 'Nội dung chưa gắn sự kiện');
    const event = makeEvent(
      {
        title: 'Họp lớp',
        label: 'cá_nhân',
        startValue: '2026-11-02T09:00',
        endValue: null,
        durationMinutesInput: 60,
        summary: [],
        relatedProfiles: [],
        sources: [{ documentId: used.documentId, kind: 'paste', title: used.title }],
      },
      NOW,
    );

    expect(unlinkedDocuments([used, orphan], [event]).map((doc) => doc.documentId)).toEqual([
      orphan.documentId,
    ]);
  });
});
