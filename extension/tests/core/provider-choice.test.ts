import { describe, expect, it } from 'vitest';
import { LlmSettingsSchema } from '../../src/shared/contracts';
import {
  DEFAULT_LOCAL_ENDPOINT,
  activeEndpoint,
  effectiveLocalApiKey,
  effectiveLocalEndpoint,
  effectiveLocalValue,
  hasConsent,
  isLocalEndpoint,
  normalizeEndpoint,
  originPattern,
  providerAccessProblem,
  requiresConsent,
  validateEndpoint,
} from '../../src/core/inference/provider-choice';

function settings(overrides: Record<string, unknown> = {}) {
  return LlmSettingsSchema.parse(overrides);
}

describe('chuẩn hoá endpoint', () => {
  it('bỏ / cuối và phần đuôi API nếu người dùng dán URL hoàn chỉnh', () => {
    expect(normalizeEndpoint(' https://example.test/v1/ ')).toBe('https://example.test/v1');
    expect(normalizeEndpoint('https://example.test/v1/chat/completions')).toBe('https://example.test/v1');
    expect(normalizeEndpoint('http://127.0.0.1:8080/models/')).toBe('http://127.0.0.1:8080');
    expect(normalizeEndpoint('http://127.0.0.1:8080/')).toBe('http://127.0.0.1:8080');
  });

  it('remote phải HTTPS; localhost được HTTP', () => {
    expect(validateEndpoint('http://example.test/v1')).toMatchObject({ ok: false });
    expect(validateEndpoint('https://example.test/v1')).toMatchObject({
      ok: true,
      local: false,
      origin: 'https://example.test',
    });
    expect(validateEndpoint('http://127.0.0.1:8080')).toMatchObject({ ok: true, local: true });
    expect(validateEndpoint('http://localhost:8080')).toMatchObject({ ok: true, local: true });
    expect(validateEndpoint('http://[::1]:8080')).toMatchObject({ ok: true, local: true });
  });

  it('từ chối URL có tài khoản/mật khẩu, query hoặc giao thức lạ', () => {
    expect(validateEndpoint('https://user:pass@example.test/v1').ok).toBe(false);
    expect(validateEndpoint('https://example.test/v1?key=abc').ok).toBe(false);
    expect(validateEndpoint('ftp://example.test/v1').ok).toBe(false);
    expect(validateEndpoint('không-phải-url').ok).toBe(false);
    expect(validateEndpoint('   ').ok).toBe(false);
  });

  it('mẫu quyền host dùng đúng origin', () => {
    expect(originPattern('https://example.test')).toBe('https://example.test/*');
    expect(originPattern('http://localhost:8080/')).toBe('http://localhost:8080/*');
  });
});

describe('consent theo origin', () => {
  it('chỉ hỏi consent khi gửi tới host không phải localhost', () => {
    expect(requiresConsent(settings({ provider: 'local', endpoint: DEFAULT_LOCAL_ENDPOINT }))).toBe(false);
    expect(
      requiresConsent(settings({ provider: 'openai-compatible', endpoint: 'http://127.0.0.1:8080' })),
    ).toBe(false);
    expect(
      requiresConsent(settings({ provider: 'openai-compatible', endpoint: 'https://example.test/v1' })),
    ).toBe(true);
  });

  it('đồng ý origin cũ không dùng cho origin mới', () => {
    const old = settings({
      provider: 'openai-compatible',
      endpoint: 'https://old.example.test/v1',
      consentByOrigin: { 'https://old.example.test': '2026-10-26T00:00:00.000Z' },
    });
    expect(hasConsent(old)).toBe(true);

    const moved = settings({ ...old, endpoint: 'https://new.example.test/v1' });
    expect(hasConsent(moved)).toBe(false);
    expect(providerAccessProblem(moved)).toContain('https://new.example.test');
  });

  it('local không bao giờ bị chặn bởi consent', () => {
    const local = settings({ provider: 'local', endpoint: DEFAULT_LOCAL_ENDPOINT });
    expect(hasConsent(local)).toBe(true);
    expect(providerAccessProblem(local)).toBeNull();
  });

  it('endpoint local dùng giao thức OpenAI-compatible cũng không cần consent', () => {
    const local = settings({ provider: 'openai-compatible', endpoint: 'http://localhost:8080/v1' });
    expect(hasConsent(local)).toBe(true);
    expect(providerAccessProblem(local)).toBeNull();
  });
});

describe('quay về Máy này giữ cấu hình remote', () => {
  it('endpoint/model/key remote còn trong settings nhưng local không dùng', () => {
    const retained = settings({
      provider: 'local',
      endpoint: 'https://example.test/v1',
      apiKey: 'remote-key',
      model: 'gemini-test',
    });

    expect(isLocalEndpoint(retained.endpoint)).toBe(false);
    expect(effectiveLocalEndpoint(retained)).toBe(DEFAULT_LOCAL_ENDPOINT);
    expect(effectiveLocalValue(retained)).toBe('');
    expect(effectiveLocalApiKey(retained)).toBe('');
  });

  it('local alias đang lưu vẫn được dùng', () => {
    const alias = settings({ provider: 'local', endpoint: 'http://localhost:8080' });
    expect(effectiveLocalEndpoint(alias)).toBe('http://localhost:8080');
  });

  it('activeEndpoint: local bỏ endpoint remote, remote giữ đúng endpoint đã nhập', () => {
    const retained = settings({
      provider: 'local',
      endpoint: 'https://example.test/v1',
    });
    expect(activeEndpoint(retained)).toBe(DEFAULT_LOCAL_ENDPOINT);

    const remote = settings({
      provider: 'openai-compatible',
      endpoint: 'https://example.test/v1/',
    });
    expect(activeEndpoint(remote)).toBe('https://example.test/v1');
  });
});
