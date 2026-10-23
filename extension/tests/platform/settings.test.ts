import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll, setSetting } from '../../src/platform/storage/db';
import {
  DEFAULT_LLM_SETTINGS,
  LLM_SETTINGS_KEY,
  loadLlmSettings,
  saveLlmSettings,
} from '../../src/platform/storage/settings';

beforeEach(async () => {
  await clearAll();
});

describe('cài đặt máy chủ mô hình', () => {
  it('trả mặc định khi chưa có bản ghi', async () => {
    expect(await loadLlmSettings()).toEqual(DEFAULT_LLM_SETTINGS);
    expect(DEFAULT_LLM_SETTINGS.endpoint).toBe('http://127.0.0.1:8080');
  });

  it('lưu rồi đọc lại đúng giá trị', async () => {
    const saved = await saveLlmSettings({
      endpoint: 'http://127.0.0.1:8080',
      apiKey: 'secret',
      model: 'qwen-test',
      temperature: 0.2,
      maxTokens: 900,
      timeoutMs: 60_000,
      chunkChars: 4_000,
      maxChunks: 3,
    });

    expect(saved.model).toBe('qwen-test');
    expect(await loadLlmSettings()).toEqual(saved);
  });

  it('bản ghi hỏng bị thay bằng mặc định thay vì làm sập UI', async () => {
    await setSetting(LLM_SETTINGS_KEY, { endpoint: 'không-phải-url', maxTokens: -1 });
    expect(await loadLlmSettings()).toEqual(DEFAULT_LLM_SETTINGS);
  });

  it('bỏ tên model mặc định cũ để dùng model đang nạp', async () => {
    await setSetting(LLM_SETTINGS_KEY, {
      ...DEFAULT_LLM_SETTINGS,
      model: 'qwen2.5-3b-instruct',
    });
    expect((await loadLlmSettings()).model).toBe('');
  });

  it('từ chối giá trị sai khi lưu', async () => {
    await expect(saveLlmSettings({ endpoint: 'sai', maxChunks: 0 })).rejects.toThrow();
  });
});
