import { describe, expect, it } from 'vitest';
import { attachProfiles, matchProfileIds } from '../../src/core/extraction/profile-match';
import type { EventCandidate, Profile } from '../../src/shared/contracts';

const NOW = new Date(2026, 9, 22, 8, 0, 0);

function profile(id: string, name: string, patch: Partial<Profile> = {}): Profile {
  return {
    id,
    name,
    role: '',
    org: '',
    email: '',
    nicknames: [],
    keywords: [],
    notes: '',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...patch,
  };
}

function candidate(patch: Partial<EventCandidate> = {}): EventCandidate {
  return {
    title: 'Họp nhóm đồ án',
    label: 'công_vụ',
    start: { value: '2026-11-02T09:00', date: null, raw: '9:00 ngày 2/11/2026' },
    end: null,
    durationMinutes: null,
    summary: [],
    relatedProfiles: [],
    confidence: 0.8,
    uncertain: [],
    ...patch,
  };
}

describe('khớp hồ sơ sau khi trích', () => {
  it('khớp tên đầy đủ có dấu/không dấu, hoa/thường', () => {
    const an = profile('prf_an', 'Nguyễn Văn An');
    expect(
      matchProfileIds(
        {
          title: 'Họp nhóm',
          summary: [],
          quote: 'NGUYEN VAN AN sẽ họp nhóm lúc 9:00 ngày 2/11/2026.',
        },
        [an],
      ),
    ).toEqual(['prf_an']);
  });

  it('khớp biệt danh và email', () => {
    const an = profile('prf_an', 'Nguyễn Văn An', {
      nicknames: ['An'],
      email: 'an.nguyen@example.com',
    });
    expect(
      matchProfileIds({ title: 'An báo cáo', summary: [], quote: 'An báo cáo lúc 9:00.' }, [an]),
    ).toEqual(['prf_an']);
    expect(
      matchProfileIds(
        { title: 'Báo cáo', summary: [], quote: 'Gửi về an.nguyen@example.com trước 20/11.' },
        [an],
      ),
    ).toEqual(['prf_an']);
  });

  it('khớp từ khoá duy nhất khi không có tên', () => {
    const an = profile('prf_an', 'Nguyễn Văn An', { keywords: ['đồ án'] });
    expect(
      matchProfileIds(
        { title: 'Họp nhóm', summary: [], quote: 'Lớp họp nhóm đồ án lúc 9:00.' },
        [an],
      ),
    ).toEqual(['prf_an']);
  });

  it('không khớp chuỗi con và không dùng từ khoá chung', () => {
    const an = profile('prf_an', 'An');
    const binh = profile('prf_binh', 'Bình', { keywords: ['đồ án'] });
    const chi = profile('prf_chi', 'Chi', { keywords: ['đồ án'] });

    expect(
      matchProfileIds({ title: 'Anh trai', summary: [], quote: 'Anh trai đến chơi.' }, [an]),
    ).toEqual([]);
    expect(
      matchProfileIds(
        { title: 'Họp nhóm', summary: [], quote: 'Lớp họp nhóm đồ án lúc 9:00.' },
        [binh, chi],
      ),
    ).toEqual([]);
  });

  it('trả nhiều hồ sơ khi sự kiện nhắc nhiều người', () => {
    const an = profile('prf_an', 'Nguyễn Văn An');
    const binh = profile('prf_binh', 'Trần Thị Bình');
    expect(
      matchProfileIds(
        {
          title: 'Họp nhóm',
          summary: [],
          quote: 'Nguyễn Văn An và Trần Thị Bình họp nhóm lúc 9:00 ngày 2/11/2026.',
        },
        [an, binh],
      ),
    ).toEqual(['prf_an', 'prf_binh']);
  });

  it('không có bằng chứng thì trả rỗng, không đoán', () => {
    const an = profile('prf_an', 'Nguyễn Văn An');
    expect(
      matchProfileIds({ title: 'Họp nhóm', summary: [], quote: 'Lớp họp lúc 9:00.' }, [an]),
    ).toEqual([]);
  });

  it('hồ sơ tạo sau vẫn khớp và kết quả không phụ thuộc thứ tự', () => {
    const an = profile('prf_an', 'Nguyễn Văn An', { createdAt: NOW.toISOString() });
    const binh = profile('prf_binh', 'Nguyễn Văn Bình', {
      createdAt: new Date(NOW.getTime() + 60_000).toISOString(),
      updatedAt: new Date(NOW.getTime() + 60_000).toISOString(),
    });
    const input = {
      title: 'Báo cáo đồ án',
      summary: ['Bình trình bày tiến độ'],
      quote: 'Nguyễn Văn Bình báo cáo tiến độ lúc 9:00 ngày 2/11/2026.',
    };

    expect(matchProfileIds(input, [an, binh])).toEqual(['prf_binh']);
    expect(matchProfileIds(input, [binh, an])).toEqual(['prf_binh']);
  });

  it('dùng tiêu đề tài liệu cho tên đầy đủ nhưng không cho từ khoá', () => {
    const an = profile('prf_an', 'Nguyễn Văn An', { keywords: ['đồ án'] });
    expect(
      matchProfileIds(
        {
          title: 'Họp nhóm',
          summary: [],
          quote: 'Lớp họp lúc 9:00.',
          documentTitle: 'Lịch công tác của Nguyễn Văn An',
        },
        [an],
      ),
    ).toEqual(['prf_an']);

    const chi = profile('prf_chi', 'Chi', { keywords: ['đồ án'] });
    expect(
      matchProfileIds(
        {
          title: 'Họp nhóm',
          summary: [],
          quote: 'Lớp họp lúc 9:00.',
          documentTitle: 'Kế hoạch đồ án',
        },
        [chi],
      ),
    ).toEqual([]);
  });

  it('attachProfiles giữ candidate hợp lệ', () => {
    const an = profile('prf_an', 'Nguyễn Văn An');
    const matched = attachProfiles(
      candidate({ quote: 'Nguyễn Văn An họp nhóm lúc 9:00.' }),
      [an],
      'Lịch công tác',
    );
    expect(matched.relatedProfiles).toEqual(['prf_an']);
    expect(matched.title).toBe('Họp nhóm đồ án');
  });
});
