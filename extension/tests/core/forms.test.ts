import { describe, expect, it } from 'vitest';
import { buildEventFromForm, saveProfileInput, validateProfileInput } from '../../src/core/forms';
import type { EventFormValues } from '../../src/core/forms';

const NOW = new Date(2026, 9, 21, 8, 0, 0);

function values(patch: Partial<EventFormValues> = {}): EventFormValues {
  return {
    title: 'Bảo vệ đồ án',
    label: 'công_vụ',
    start: '2026-11-20T08:00',
    end: '2026-11-20T10:00',
    duration: '',
    summary: 'Hội đồng: 3 giảng viên\nĐịa điểm: phòng B1-201',
    profileIds: [],
    sources: [],
    ...patch,
  };
}

describe('form sự kiện', () => {
  it('tạo được sự kiện hợp lệ', () => {
    const result = buildEventFromForm(values(), null, NOW);
    expect(result.errors).toEqual({});
    expect(result.event?.title).toBe('Bảo vệ đồ án');
    expect(result.event?.summary).toEqual(['Hội đồng: 3 giảng viên', 'Địa điểm: phòng B1-201']);
    expect(result.event?.durationMinutes).toBe(120);
  });

  it('báo lỗi khi thiếu tiêu đề', () => {
    const result = buildEventFromForm(values({ title: '   ' }), null, NOW);
    expect(result.event).toBeUndefined();
    expect(result.errors.title).toBeTruthy();
  });

  it('báo lỗi khi kết thúc trước bắt đầu', () => {
    const result = buildEventFromForm(values({ end: '2026-11-20T07:00' }), null, NOW);
    expect(result.errors.end).toMatch(/sau/);
  });

  it('báo lỗi khi có kết thúc mà thiếu bắt đầu', () => {
    const result = buildEventFromForm(values({ start: '', end: '2026-11-20T09:00' }), null, NOW);
    expect(result.errors.end).toBeTruthy();
  });

  it('cho phép tóm tắt 6–10 ý khi nhập tay', () => {
    const result = buildEventFromForm(
      values({ summary: 'Ý 1\nÝ 2\nÝ 3\nÝ 4\nÝ 5\nÝ 6\nÝ 7\nÝ 8\nÝ 9\nÝ 10' }),
      null,
      NOW,
    );
    expect(result.errors.summary).toBeUndefined();
    expect(result.event?.summary).toHaveLength(10);
  });

  it('chặn tóm tắt quá 50 ý', () => {
    const summary = Array.from({ length: 51 }, (_, index) => `Ý ${index + 1}`).join('\n');
    const result = buildEventFromForm(values({ summary }), null, NOW);
    expect(result.errors.summary).toBeTruthy();
    expect(result.event).toBeUndefined();
  });

  it('cho phép lưu khi chưa có thời điểm và gắn cờ cần kiểm tra', () => {
    const result = buildEventFromForm(values({ start: '', end: '', duration: '' }), null, NOW);
    expect(result.event).toBeDefined();
    expect(result.event?.start.value).toBeNull();
    expect(result.event?.validation.uncertain).toContain('chua_ro_thoi_diem');
  });

  it('cập nhật giữ nguyên id và trạng thái', () => {
    const created = buildEventFromForm(values(), null, NOW).event;
    expect(created).toBeDefined();
    const updated = buildEventFromForm(values({ title: 'Bảo vệ đồ án (đổi giờ)' }), created ?? null, NOW);
    expect(updated.event?.id).toBe(created?.id);
    expect(updated.event?.status).toBe('nhap');
  });
});

describe('form hồ sơ', () => {
  const base = {
    name: 'Nguyễn Minh An',
    role: 'Sinh viên',
    org: 'ĐH Bách khoa',
    email: '',
    nicknames: ['An'],
    keywords: ['đồ án'],
    notes: '',
  };

  it('chấp nhận hồ sơ hợp lệ', () => {
    expect(validateProfileInput(base).errors).toEqual({});
  });

  it('báo lỗi email sai và tên trống', () => {
    const result = validateProfileInput({ ...base, email: 'sai-email', name: '' });
    expect(result.errors.email).toBeTruthy();
    expect(result.errors.name).toBeTruthy();
  });

  it('tạo và cập nhật hồ sơ', () => {
    const created = saveProfileInput(base, null, NOW);
    expect(created.data?.name).toBe(base.name);
    expect(created.data?.createdAt).toBe(NOW.toISOString());

    const updated = saveProfileInput({ ...base, role: 'Thạc sĩ' }, created.data ?? null, NOW);
    expect(updated.data?.id).toBe(created.data?.id);
    expect(updated.data?.role).toBe('Thạc sĩ');
    expect(updated.data?.createdAt).toBe(created.data?.createdAt);
  });
});
