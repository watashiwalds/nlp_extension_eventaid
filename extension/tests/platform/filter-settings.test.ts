import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll, getSetting, setSetting } from '../../src/platform/storage/db';
import {
  DEFAULT_FILTER_SETTINGS,
  loadFilterSettings,
  saveFilterSettings,
} from '../../src/platform/storage/filter-settings';
import { FILTER_SETTINGS_KEY } from '../../src/shared/constants';

beforeEach(async () => {
  await clearAll();
});

describe('cài đặt sàng lọc nội dung', () => {
  it('trả mặc định khi chưa có bản ghi', async () => {
    expect(await loadFilterSettings()).toEqual(DEFAULT_FILTER_SETTINGS);
    expect(DEFAULT_FILTER_SETTINGS).toMatchObject({
      mode: 'report',
      endpoint: 'http://127.0.0.1:8081',
      timeoutMs: 15_000,
      windowChars: 4_000,
      skipConfidence: 0.85,
      minSentencesToSkip: 3,
    });
  });

  it('lưu rồi đọc lại đúng giá trị dưới khoá contentFilter', async () => {
    const saved = await saveFilterSettings({
      mode: 'screen',
      endpoint: 'http://127.0.0.1:8081',
      timeoutMs: 9_000,
      windowChars: 3_000,
      skipConfidence: 0.9,
      minSentencesToSkip: 4,
    });

    expect(saved.mode).toBe('screen');
    expect(await loadFilterSettings()).toEqual(saved);
    expect(await getSetting(FILTER_SETTINGS_KEY)).toEqual(saved);
  });

  it('bản ghi hỏng bị thay bằng mặc định thay vì làm sập UI', async () => {
    await setSetting(FILTER_SETTINGS_KEY, { mode: 'luon_luon', skipConfidence: 2 });
    expect(await loadFilterSettings()).toEqual(DEFAULT_FILTER_SETTINGS);
  });

  it('bản ghi cũ thiếu trường được điền mặc định', async () => {
    await setSetting(FILTER_SETTINGS_KEY, { mode: 'off' });
    const loaded = await loadFilterSettings();
    expect(loaded.mode).toBe('off');
    expect(loaded.endpoint).toBe('http://127.0.0.1:8081');
    expect(loaded.skipConfidence).toBe(0.85);
  });

  it('từ chối giá trị sai khi lưu', async () => {
    await expect(saveFilterSettings({ endpoint: 'sai', timeoutMs: 0 })).rejects.toThrow();
    await expect(saveFilterSettings({ skipConfidence: 1.2 })).rejects.toThrow();
    await expect(saveFilterSettings({ minSentencesToSkip: 0 })).rejects.toThrow();
  });
});
