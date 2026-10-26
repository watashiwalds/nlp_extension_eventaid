import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it } from 'vitest';
import { clearAll, exportAll, setSetting } from '../../src/platform/storage/db';
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
    expect(DEFAULT_LLM_SETTINGS.provider).toBe('local');
    expect(DEFAULT_LLM_SETTINGS.endpoint).toBe('http://127.0.0.1:8080');
    expect(DEFAULT_LLM_SETTINGS.consentByOrigin).toEqual({});
  });

  it('bản ghi cũ thiếu provider/consentByOrigin được đọc với mặc định local', async () => {
    await setSetting(LLM_SETTINGS_KEY, {
      endpoint: 'http://127.0.0.1:8080',
      apiKey: '',
      model: '',
      temperature: 0.1,
      maxTokens: 1200,
      timeoutMs: 120_000,
      chunkChars: 5000,
      maxChunks: 4,
    });

    const loaded = await loadLlmSettings();
    expect(loaded.provider).toBe('local');
    expect(loaded.consentByOrigin).toEqual({});
  });

  it('lưu endpoint ngoài + mốc đồng ý theo origin', async () => {
    const saved = await saveLlmSettings({
      provider: 'openai-compatible',
      endpoint: 'https://example.test/v1',
      apiKey: 'secret',
      model: 'gemini-test',
      consentByOrigin: { 'https://example.test': '2026-10-26T00:00:00.000Z' },
      temperature: 0.1,
      maxTokens: 1200,
      timeoutMs: 120_000,
      chunkChars: 5000,
      maxChunks: 4,
    });

    expect(saved.provider).toBe('openai-compatible');
    expect((await loadLlmSettings()).consentByOrigin['https://example.test']).toBe(
      '2026-10-26T00:00:00.000Z',
    );
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

  it('bản xuất dữ liệu không chứa API key hay consent', async () => {
    await saveLlmSettings({
      provider: 'openai-compatible',
      endpoint: 'https://example.test/v1',
      apiKey: 'super-secret-key',
      consentByOrigin: { 'https://example.test': '2026-10-26T00:00:00.000Z' },
    });

    const exported = JSON.stringify(await exportAll());
    expect(exported).not.toContain('super-secret-key');
    expect(exported).not.toContain('consentByOrigin');
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
