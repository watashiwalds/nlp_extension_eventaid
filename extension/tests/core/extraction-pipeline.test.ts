import { describe, expect, it } from 'vitest';
import { extractEvents } from '../../src/core/extraction/pipeline';
import { MOCK_EXTRACTION, MockProvider } from '../../src/core/extraction/mock-provider';
import { RETRY_SUFFIX } from '../../src/core/extraction/prompt';
import { eventDedupInput } from '../../src/core/extraction/dedup';
import { InferenceError } from '../../src/core/ports/inference';
import { makeEvent } from '../../src/core/events';
import type { ExtractionProgress } from '../../src/core/extraction/pipeline';
import type { NormalizedDocument, Profile } from '../../src/shared/contracts';

const NOW = new Date(2026, 9, 22, 8, 0, 0);

const document: NormalizedDocument = {
  documentId: 'doc_pipeline',
  source: 'web_page',
  title: 'Thông báo lớp XLNNTN',
  text: [
    'Thông báo lớp học phần XLNNTN.',
    '',
    'Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại phòng B203. Sinh viên chuẩn bị đề cương.',
    '',
    'Hạn nộp báo cáo giữa kỳ là 20/11. Báo cáo dài tối đa 15 trang.',
    '',
    'Buổi seminar tuần sau sẽ thông báo sau.',
  ].join('\n'),
  sourceUrl: 'https://example.com/thong-bao',
  capturedAt: NOW.toISOString(),
  extractionMethod: 'readability',
  contentHash: 'abc',
  truncated: false,
  charCount: 0,
};

const profiles: Profile[] = [
  {
    id: 'prf_an',
    name: 'Nguyễn Văn An',
    role: 'Sinh viên',
    org: 'Khoa CNTT',
    email: '',
    nicknames: ['An'],
    keywords: ['đồ án'],
    notes: '',
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
  },
];

const binh: Profile = {
  id: 'prf_binh',
  name: 'Nguyễn Văn Bình',
  role: 'Sinh viên',
  org: 'Khoa CNTT',
  email: '',
  nicknames: [],
  keywords: [],
  notes: '',
  createdAt: new Date(NOW.getTime() + 60_000).toISOString(),
  updatedAt: new Date(NOW.getTime() + 60_000).toISOString(),
};

const settings = { chunkChars: 5_000, maxChunks: 4, maxTokens: 1_200, temperature: 0.1 };

describe('pipeline trích xuất', () => {
  it('chạy trọn MockProvider → candidate có nguồn chạy và hồ sơ hợp lệ', async () => {
    const outcome = await extractEvents({
      document,
      profiles,
      settings,
      provider: new MockProvider(() => MOCK_EXTRACTION, 12),
      now: NOW,
    });

    expect(outcome.items).toHaveLength(2);
    expect(outcome.chunkCount).toBe(1);
    expect(outcome.duplicates).toHaveLength(0);
    expect(outcome.latencyMs).toBe(12);

    const [first, second] = outcome.items;
    expect(first?.candidate.relatedProfiles).toEqual(['prf_an']);
    expect(first?.run).toMatchObject({
      runId: outcome.runId,
      provider: 'mock',
      model: 'mock-v1',
      promptVersion: 'v5',
      chunkIndex: 0,
      chunkCount: 1,
    });
    expect(second?.candidate.start.value).toBeNull();
    expect(second?.candidate.uncertain).toContain('nam_chua_ro');
  });

  it('khớp hồ sơ tạo sau và không phụ thuộc thứ tự mảng hồ sơ', async () => {
    const event = {
      ...MOCK_EXTRACTION.events[0]!,
      title: 'Báo cáo tiến độ đồ án',
      summary: ['Bình trình bày tiến độ'],
      quote: 'Nguyễn Văn Bình báo cáo tiến độ lúc 9:00 ngày 2/11/2026.',
    };
    const provider = () => new MockProvider(() => ({ events: [event] }));

    const first = await extractEvents({
      document,
      profiles: [profiles[0]!, binh],
      settings,
      provider: provider(),
      now: NOW,
    });
    const reversed = await extractEvents({
      document,
      profiles: [binh, profiles[0]!],
      settings,
      provider: provider(),
      now: NOW,
    });

    expect(first.items[0]?.candidate.relatedProfiles).toEqual(['prf_binh']);
    expect(reversed.items[0]?.candidate.relatedProfiles).toEqual(['prf_binh']);
  });

  it('bỏ qua sự kiện đã có trong DB', async () => {
    const existing = makeEvent(
      {
        title: 'Họp nhóm đồ án',
        label: 'công_vụ',
        startValue: '2026-11-02T09:00',
        endValue: null,
        durationMinutesInput: null,
        summary: [],
        relatedProfiles: [],
        sources: [],
      },
      NOW,
    );

    const outcome = await extractEvents({
      document,
      profiles,
      settings,
      provider: new MockProvider(() => MOCK_EXTRACTION),
      now: NOW,
      existing: [eventDedupInput(existing)],
    });

    expect(outcome.items).toHaveLength(1);
    expect(outcome.items[0]?.candidate.title).toBe('Nộp báo cáo giữa kỳ');
    expect(outcome.duplicates).toHaveLength(1);
  });

  it('JSON sai schema được retry đúng một lần kèm nhắc', async () => {
    const seen: string[] = [];
    const provider = new MockProvider((request) => {
      seen.push(request.user);
      return seen.length === 1 ? 'không phải json' : MOCK_EXTRACTION;
    });

    const outcome = await extractEvents({ document, profiles, settings, provider, now: NOW });

    expect(seen).toHaveLength(2);
    expect(seen[1]).toContain(RETRY_SUFFIX);
    expect(outcome.items).toHaveLength(2);
  });

  it('vẫn sai sau retry thì ném lỗi, không trả sự kiện rác', async () => {
    let calls = 0;
    const provider = new MockProvider(() => {
      calls += 1;
      return '{"events":[{"title":""}]}';
    });

    await expect(extractEvents({ document, profiles, settings, provider, now: NOW })).rejects.toThrow(
      /Không lưu sự kiện nào/,
    );
    expect(calls).toBe(2);
  });

  it('báo truncated khi tài liệu vượt maxChunks × chunkChars', async () => {
    const longDocument: NormalizedDocument = {
      ...document,
      text: Array.from(
        { length: 10 },
        (_, index) => `Sự kiện ${index + 1} lúc 9:00 ngày 2/11/2026 tại phòng B203.`,
      ).join('\n\n'),
    };

    const outcome = await extractEvents({
      document: longDocument,
      profiles,
      settings: { ...settings, chunkChars: 80, maxChunks: 2 },
      provider: new MockProvider(() => MOCK_EXTRACTION),
      now: NOW,
    });

    expect(outcome.chunkCount).toBe(2);
    expect(outcome.truncated).toBe(true);
  });

  it('báo tiến trình theo từng đoạn và khử trùng giữa các đoạn', async () => {
    const progress: ExtractionProgress[] = [];
    const repeatedDocument: NormalizedDocument = {
      ...document,
      text: Array.from(
        { length: 6 },
        () => 'Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026. Hạn nộp báo cáo giữa kỳ là 20/11.',
      ).join('\n\n'),
    };
    const outcome = await extractEvents({
      document: repeatedDocument,
      profiles,
      settings: { ...settings, chunkChars: 200 },
      provider: new MockProvider(() => MOCK_EXTRACTION),
      now: NOW,
      onProgress: (item) => progress.push(item),
    });

    expect(outcome.chunkCount).toBeGreaterThan(1);
    expect(progress).toHaveLength(outcome.chunkCount);
    expect(progress[0]?.chunkIndex).toBe(1);
    expect(outcome.items).toHaveLength(2);
  });

  it('signal đã huỷ thì dừng trước khi gọi provider', async () => {
    const controller = new AbortController();
    controller.abort();
    let calls = 0;

    await expect(
      extractEvents({
        document,
        profiles,
        settings,
        provider: new MockProvider(() => {
          calls += 1;
          return MOCK_EXTRACTION;
        }),
        now: NOW,
        signal: controller.signal,
      }),
    ).rejects.toMatchObject({ kind: 'aborted' });
    expect(calls).toBe(0);
  });

  it('lỗi mạng từ provider được giữ nguyên loại lỗi', async () => {
    const provider = new MockProvider(() => MOCK_EXTRACTION);
    provider.run = async () => {
      throw new InferenceError('network', 'Không kết nối được máy chủ mô hình.');
    };

    await expect(extractEvents({ document, profiles, settings, provider, now: NOW })).rejects.toMatchObject({
      kind: 'network',
    });
  });
});
