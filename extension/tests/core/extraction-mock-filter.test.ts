import { describe, expect, it } from 'vitest';
import { FilterError, isFilterAborted } from '../../src/core/ports/content-filter';
import {
  MockContentFilter,
  mockAnalysis,
  mockTaskAnalysis,
} from '../../src/core/extraction/mock-filter';

describe('MockContentFilter', () => {
  it('mặc định trả "không có việc" và ghi lại văn bản đã nhận', async () => {
    const filter = new MockContentFilter();
    const analysis = await filter.analyze('một đoạn văn');
    expect(analysis.hasTask).toBe(false);
    expect(analysis.confidence).toBe(0.95);
    expect(filter.analyzed).toEqual(['một đoạn văn']);
  });

  it('trả lần lượt theo kịch bản rồi lặp lại phản hồi cuối', async () => {
    const filter = new MockContentFilter([mockTaskAnalysis(), mockAnalysis({ confidence: 0.9 })]);
    expect((await filter.analyze('a')).hasTask).toBe(true);
    expect((await filter.analyze('b')).confidence).toBe(0.9);
    expect((await filter.analyze('c')).confidence).toBe(0.9);
    expect(filter.analyzed).toEqual(['a', 'b', 'c']);
  });

  it('ném lại đúng lỗi trong kịch bản', async () => {
    const filter = new MockContentFilter([new FilterError('network', 'mất kết nối')]);
    await expect(filter.analyze('a')).rejects.toBeInstanceOf(FilterError);
    await expect(filter.analyze('a')).rejects.toMatchObject({ kind: 'network' });
  });

  it('tôn trọng signal đã huỷ ⇒ FilterError aborted', async () => {
    const filter = new MockContentFilter();
    const controller = new AbortController();
    controller.abort();
    const error = await filter.analyze('a', { signal: controller.signal }).catch((caught: unknown) => caught);
    expect(isFilterAborted(error)).toBe(true);
  });

  it('kịch bản rỗng ⇒ invalid-response, không treo', async () => {
    const filter = new MockContentFilter([]);
    await expect(filter.analyze('a')).rejects.toMatchObject({ kind: 'invalid-response' });
  });

  it('health trả đúng trạng thái cấu hình', async () => {
    const healthy = new MockContentFilter([], { ok: true, device: 'cuda' });
    expect(await healthy.health()).toEqual({ ok: true, device: 'cuda' });

    const down = new MockContentFilter([], { ok: false, reason: 'không kết nối được' });
    expect(await down.health()).toEqual({ ok: false, reason: 'không kết nối được' });
  });
});
