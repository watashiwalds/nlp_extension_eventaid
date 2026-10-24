import { describe, expect, it } from 'vitest';
import {
  candidateToEvent,
  candidateToEventInput,
  normalizeDateTime,
  normalizeEvent,
} from '../../src/core/extraction/normalize';
import { RawEventSchema } from '../../src/core/extraction/schema';
import { MOCK_EXTRACTION } from '../../src/core/extraction/mock-provider';
import { makeEvent, updateEvent } from '../../src/core/events';
import type { EventInput } from '../../src/core/events';

const NOW = new Date(2026, 9, 22, 8, 0, 0);

function raw(patch: Record<string, unknown> = {}) {
  return RawEventSchema.parse({
    title: 'Họp nhóm đồ án',
    label: 'công_vụ',
    start: '2026-11-02T09:00',
    end: null,
    startRaw: '9:00 ngày 2/11/2026',
    endRaw: '',
    summary: ['Chốt đề cương'],
    confidence: 0.8,
    uncertain: [],
    quote: 'Họp nhóm lúc 9:00 ngày 2/11/2026.',
    ...patch,
  });
}

function context() {
  return { now: NOW, timezone: 'Asia/Ho_Chi_Minh' };
}

describe('normalizeDateTime', () => {
  it('đủ ngày + giờ → điền value', () => {
    const result = normalizeDateTime('2026-11-02T09:00', '9:00 ngày 2/11/2026');
    expect(result.ref.value).toBe('2026-11-02T09:00');
    expect(result.uncertain).toEqual([]);
  });

  it('nhận ISO có giây và offset, quy về giờ địa phương', () => {
    const withOffset = normalizeDateTime('2026-11-02T09:00:00+07:00', '9:00 ngày 2/11/2026');
    expect(withOffset.ref.value).toBe('2026-11-02T09:00');
    expect(withOffset.uncertain).toEqual([]);

    const utc = normalizeDateTime('2026-11-02T02:00:00Z', '9:00 ngày 2/11/2026');
    expect(utc.ref.value).toBe('2026-11-02T09:00');
  });

  it('vẫn từ chối ngày không có thật dù có offset', () => {
    const result = normalizeDateTime('2026-02-31T09:00:00+07:00', '31/2/2026 lúc 9h');
    expect(result.ref.value).toBeNull();
    expect(result.uncertain).toContain('do_tin_cay_thap');
  });

  it('thiếu năm → value null, giữ raw, gắn nam_chua_ro', () => {
    const result = normalizeDateTime(null, '15/11 lúc 8h');
    expect(result.ref.value).toBeNull();
    expect(result.ref.raw).toBe('15/11 lúc 8h');
    expect(result.uncertain).toContain('nam_chua_ro');
    expect(result.uncertain).not.toContain('gio_chua_ro');
  });

  it('chỉ có ngày → value null, giữ date, gắn gio_chua_ro', () => {
    const result = normalizeDateTime(null, 'hạn nộp 20/11/2026');
    expect(result.ref.value).toBeNull();
    expect(result.ref.date).toBe('2026-11-20');
    expect(result.uncertain).toContain('gio_chua_ro');
    expect(result.uncertain).not.toContain('nam_chua_ro');
  });

  it('model tự điền ISO khi nguồn thiếu năm → value null, gắn nam_chua_ro', () => {
    const result = normalizeDateTime('2026-11-15T08:00', '8:00 ngày 15/11');
    expect(result.ref.value).toBeNull();
    expect(result.ref.date).toBeNull();
    expect(result.ref.raw).toBe('8:00 ngày 15/11');
    expect(result.uncertain).toContain('nam_chua_ro');
    expect(result.uncertain).not.toContain('gio_chua_ro');
  });

  it('model tự điền ISO khi nguồn thiếu giờ → value null, giữ date, gắn gio_chua_ro', () => {
    const result = normalizeDateTime('2026-11-20T09:00', 'hạn nộp 20/11/2026');
    expect(result.ref.value).toBeNull();
    expect(result.ref.date).toBe('2026-11-20');
    expect(result.ref.raw).toBe('hạn nộp 20/11/2026');
    expect(result.uncertain).toContain('gio_chua_ro');
    expect(result.uncertain).not.toContain('nam_chua_ro');
  });

  it('ngày ISO lệch raw/nguồn → không nhận value', () => {
    const result = normalizeDateTime(
      '2026-11-03T09:00',
      '9:00 ngày 2/11/2026',
      'Asia/Ho_Chi_Minh',
      '9:00 ngày 2/11/2026',
    );
    expect(result.ref.value).toBeNull();
    expect(result.ref.date).toBeNull();
    expect(result.uncertain).toContain('ngay_khong_khop');
  });

  it('model bỏ raw → chỉ giữ ngày nếu nguồn có, không tin giờ ISO', () => {
    const result = normalizeDateTime(
      '2026-11-02T09:00',
      '',
      'Asia/Ho_Chi_Minh',
      '9:00 ngày 2/11/2026',
    );
    expect(result.ref.value).toBeNull();
    expect(result.ref.date).toBe('2026-11-02');
    expect(result.uncertain).toContain('gio_chua_ro');
  });

  it('không có raw lẫn nguồn → không tin ISO model tự sinh', () => {
    const result = normalizeDateTime('2026-11-02T09:00', '');
    expect(result.ref.value).toBeNull();
    expect(result.ref.date).toBeNull();
    expect(result.uncertain).toContain('do_tin_cay_thap');
  });

  it('cách nói tương đối → giữ giá trị model quy đổi và gắn ngay_tuong_doi', () => {
    const result = normalizeDateTime('2026-10-27T14:00', 'thứ 3 tuần sau lúc 14:00');
    expect(result.ref.value).toBe('2026-10-27T14:00');
    expect(result.uncertain).toContain('ngay_tuong_doi');
  });

  it('ngày không có thật không được điền bừa', () => {
    const result = normalizeDateTime('2026-02-31T09:00', '31/2/2026 lúc 9h');
    expect(result.ref.value).toBeNull();
    expect(result.uncertain).toContain('do_tin_cay_thap');
  });

  it('không có mốc nào → value và raw đều null', () => {
    expect(normalizeDateTime(null, '')).toEqual({
      ref: { value: null, date: null, raw: null },
      uncertain: [],
    });
  });
});

describe('normalizeEvent', () => {
  it('chuẩn hoá sự kiện đủ ngày giờ', () => {
    const candidate = normalizeEvent(
      raw({ end: '2026-11-02T10:30', endRaw: '10:30 ngày 2/11/2026', summary: [' Chốt   đề cương '] }),
      context(),
    );
    expect(candidate.start.value).toBe('2026-11-02T09:00');
    expect(candidate.end?.value).toBe('2026-11-02T10:30');
    expect(candidate.durationMinutes).toBe(90);
    expect(candidate.summary).toEqual(['Chốt đề cương']);
    expect(candidate.quote).toContain('9:00');
  });

  it('không tự gán hồ sơ; việc khớp diễn ra ở bước sau', () => {
    const candidate = normalizeEvent(raw(), context());
    expect(candidate.relatedProfiles).toEqual([]);
  });

  it('hợp nhất uncertain của model và uncertain suy ra', () => {
    const candidate = normalizeEvent(
      raw({ start: null, startRaw: '20/11', uncertain: ['gio_chua_ro', 'khoa_la'] }),
      context(),
    );
    expect(candidate.start.value).toBeNull();
    expect(candidate.uncertain).toContain('gio_chua_ro');
    expect(candidate.uncertain).toContain('nam_chua_ro');
    expect(candidate.uncertain).not.toContain('khoa_la');
  });

  it('gắn do_tin_cay_thap khi confidence thấp và cắt tóm tắt còn 5 ý', () => {
    const candidate = normalizeEvent(
      { ...raw({ confidence: 0.2 }), summary: ['a', 'b', 'c', 'd', 'e', 'f'] },
      context(),
    );
    expect(candidate.uncertain).toContain('do_tin_cay_thap');
    expect(candidate.summary).toHaveLength(5);
  });

  it('end bị bỏ khi không có start (không suy diễn)', () => {
    const candidate = normalizeEvent(
      raw({ start: null, startRaw: '20/11', end: '2026-11-20T11:00', endRaw: '11:00' }),
      context(),
    );
    expect(candidate.end).toBeNull();
    expect(candidate.durationMinutes).toBeNull();
  });

  it('nguồn chỉ có ngày + raw bị hoán đổi → giữ ngày theo nguồn, không bịa giờ', () => {
    const sourceText = [
      'Nhân dân có thể nhận vé vào cổng miễn phí cho sự kiện Sao Concert trước ngày 29/10/2026.',
      'Ngày mở đơn đăng ký vào lúc 25/10/2026.',
      'Lưu ý.',
    ].join(' ');
    const candidate = normalizeEvent(
      raw({
        title: 'Đăng ký nhận vé Sao Concert',
        start: '2026-10-25T00:00',
        startRaw: 'trước ngày 29/10/2026',
        end: '2026-10-29T00:00',
        endRaw: 'Ngày mở đơn đăng ký vào lúc 25/10/2026',
      }),
      { ...context(), sourceText },
    );

    expect(candidate.start.value).toBeNull();
    expect(candidate.start.date).toBe('2026-10-25');
    expect(candidate.start.raw).toContain('25/10/2026');
    expect(candidate.start.raw).not.toContain('29/10/2026');
    expect(candidate.end?.value).toBeNull();
    expect(candidate.end?.date).toBe('2026-10-29');
    expect(candidate.end?.raw).toContain('29/10/2026');
    expect(candidate.end?.raw).not.toContain('25/10/2026');
    expect(candidate.uncertain).toContain('gio_chua_ro');
    expect(candidate.uncertain).not.toContain('ngay_khong_khop');
    expect(candidate.uncertain).not.toContain('nam_chua_ro');
  });
});

describe('candidateToEvent', () => {
  const document = {
    documentId: 'doc_1',
    source: 'web_page' as const,
    title: 'Thông báo lớp',
    sourceUrl: 'https://example.com/thong-bao',
  };
  const run = {
    runId: 'run_1',
    provider: 'mock' as const,
    model: 'mock-v1',
    promptVersion: 'v1',
    chunkIndex: 0,
    chunkCount: 1,
    latencyMs: 120,
  };

  it('sinh Event nháp có origin llm, nguồn trích và extractionMeta', () => {
    const candidate = normalizeEvent(
      raw({ end: '2026-11-02T10:30', endRaw: '10:30 ngày 2/11/2026' }),
      context(),
    );
    const event = candidateToEvent(candidate, { document, run }, NOW);
    expect(event.status).toBe('nhap');
    expect(event.origin).toBe('llm');
    expect(event.extractionMeta?.runId).toBe('run_1');
    expect(event.extractionMeta?.documentId).toBe('doc_1');
    expect(event.sources[0]?.documentId).toBe('doc_1');
    expect(event.sources[0]?.quote).toContain('9:00');
    expect(event.durationMinutes).toBe(90);
  });

  it('giữ nguyên chuỗi gốc và uncertain của model khi thiếu năm', () => {
    const candidate = normalizeEvent(raw({ start: null, startRaw: '15/11 lúc 8h' }), context());
    const event = candidateToEvent(candidate, { document, run }, NOW);
    expect(event.start.value).toBeNull();
    expect(event.start.raw).toBe('15/11 lúc 8h');
    expect(event.validation.uncertain).toContain('nam_chua_ro');
    expect(event.validation.uncertain).toContain('chua_ro_thoi_diem');
    expect(event.validation.uncertain).toContain('chua_ro_ho_so');
  });

  it('giữ ngày khi chỉ biết ngày, không biến thành giờ 00:00', () => {
    const candidate = normalizeEvent(
      raw({
        start: '2026-11-20T00:00',
        startRaw: 'hạn nộp 20/11/2026',
        end: null,
        endRaw: '',
      }),
      context(),
    );
    const event = candidateToEvent(candidate, { document, run }, NOW);
    expect(event.start.value).toBeNull();
    expect(event.start.date).toBe('2026-11-20');
    expect(event.start.raw).toBe('hạn nộp 20/11/2026');
    expect(event.validation.uncertain).toContain('gio_chua_ro');
  });

  it('candidateToEventInput không tự sinh id hay status', () => {
    const input = candidateToEventInput(normalizeEvent(raw(), context()), { document, run });
    expect(input).not.toHaveProperty('id');
    expect(input).not.toHaveProperty('status');
    expect(input.origin).toBe('llm');
  });
});

describe('events với origin', () => {
  function input(patch: Partial<EventInput> = {}): EventInput {
    return {
      title: 'Họp nhóm',
      label: 'công_vụ',
      startValue: '2026-11-02T09:00',
      endValue: null,
      durationMinutesInput: 60,
      summary: [],
      relatedProfiles: [],
      sources: [],
      ...patch,
    };
  }

  it('mặc định là manual và giữ tương thích EventInput cũ', () => {
    expect(makeEvent(input(), NOW).origin).toBe('manual');
  });

  it('sửa sự kiện LLM không làm mất origin và extractionMeta', () => {
    const candidate = normalizeEvent(MOCK_EXTRACTION.events[0]!, context());
    const llmEvent = candidateToEvent(
      candidate,
      {
        document: { documentId: 'doc_1', source: 'web_page', title: 'T', sourceUrl: undefined },
        run: {
          runId: 'run_1',
          provider: 'mock',
          model: 'mock-v1',
          promptVersion: 'v1',
          chunkIndex: 0,
          chunkCount: 1,
          latencyMs: 10,
        },
      },
      NOW,
    );
    const edited = updateEvent(llmEvent, input({ title: 'Họp nhóm (sửa)' }), NOW);
    expect(edited.origin).toBe('llm');
    expect(edited.extractionMeta?.runId).toBe('run_1');
  });
});
