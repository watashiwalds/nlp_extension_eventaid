import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  ensureHostPermission,
  needsHostPermission,
  removeHostPermission,
} from '../../src/platform/permissions';

function stubPermissions(overrides: Record<string, unknown> = {}): {
  request: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
  contains: ReturnType<typeof vi.fn>;
} {
  const permissions = {
    request: vi.fn().mockResolvedValue(true),
    remove: vi.fn().mockResolvedValue(true),
    contains: vi.fn().mockResolvedValue(false),
    ...overrides,
  };
  vi.stubGlobal('chrome', { permissions });
  return permissions as unknown as {
    request: ReturnType<typeof vi.fn>;
    remove: ReturnType<typeof vi.fn>;
    contains: ReturnType<typeof vi.fn>;
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('quyền host theo endpoint', () => {
  it('127.0.0.1:8080 đã có quyền tĩnh, không gọi chrome.permissions.request', async () => {
    const api = stubPermissions();
    expect(needsHostPermission('http://127.0.0.1:8080')).toBe(false);

    const result = await ensureHostPermission('http://127.0.0.1:8080');
    expect(result).toEqual({ granted: true, reason: null });
    expect(api.request).not.toHaveBeenCalled();
  });

  it('endpoint HTTPS xin đúng mẫu origin khi người dùng bấm', async () => {
    const api = stubPermissions();
    expect(needsHostPermission('https://api.example.com/v1')).toBe(true);

    const result = await ensureHostPermission('https://api.example.com/v1');
    expect(result).toEqual({ granted: true, reason: null });
    expect(api.request).toHaveBeenCalledWith({
      origins: ['https://api.example.com/*'],
    });
  });

  it('local alias localhost/[::1] cũng phải xin quyền nhưng dùng HTTP', async () => {
    const api = stubPermissions();

    await ensureHostPermission('http://localhost:8080/v1');
    await ensureHostPermission('http://[::1]:8080');

    expect(api.request).toHaveBeenNthCalledWith(1, {
      origins: ['http://localhost:8080/*'],
    });
    expect(api.request).toHaveBeenNthCalledWith(2, {
      origins: ['http://[::1]:8080/*'],
    });
  });

  it('người dùng từ chối quyền thì trả lý do, không ném lỗi', async () => {
    stubPermissions({ request: vi.fn().mockResolvedValue(false) });
    const result = await ensureHostPermission('https://api.example.com/v1');
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('Bạn chưa cấp quyền');
  });

  it('request ném lỗi (mất user gesture hoặc cổng không được khai báo) được map thành lý do', async () => {
    stubPermissions({ request: vi.fn().mockRejectedValue(new Error('user gesture')) });
    const result = await ensureHostPermission('http://127.0.0.1:9000');
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('cổng 8080');
  });

  it('endpoint sai không xin quyền', async () => {
    const api = stubPermissions();
    const result = await ensureHostPermission('http://example.com/v1');
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('HTTPS');
    expect(api.request).not.toHaveBeenCalled();
  });

  it('thiếu chrome.permissions thì báo không hỗ trợ', async () => {
    vi.stubGlobal('chrome', undefined);
    const result = await ensureHostPermission('https://api.example.com/v1');
    expect(result.granted).toBe(false);
    expect(result.reason).toContain('không hỗ trợ');
  });

  it('thu hồi quyền dùng đúng origin', async () => {
    const api = stubPermissions();
    expect(await removeHostPermission('https://api.example.com')).toBe(true);
    expect(api.remove).toHaveBeenCalledWith({
      origins: ['https://api.example.com/*'],
    });
  });
});
