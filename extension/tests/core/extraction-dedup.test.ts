import { describe, expect, it } from 'vitest';
import {
  dedupeCandidates,
  eventDedupInput,
  isLikelyDuplicate,
  normalizeTitleKey,
} from '../../src/core/extraction/dedup';
import { candidateToEvent, normalizeEvents } from '../../src/core/extraction/normalize';
import { attachProfiles } from '../../src/core/extraction/profile-match';
import { chunkText } from '../../src/core/extraction/chunk';
import { buildPrompt } from '../../src/core/extraction/prompt';
import { parseRawExtraction } from '../../src/core/extraction/schema';
import { createMockProvider, MockProvider } from '../../src/core/extraction/mock-provider';
import { makeEvent } from '../../src/core/events';
import type { EventCandidate, NormalizedDocument, Profile } from '../../src/shared/contracts';

const NOW = new Date(2026, 9, 22, 8, 0, 0);

function candidate(patch: Partial<EventCandidate> = {}): EventCandidate {
  return {
    title: 'Họp nhóm đồ án',
    label: 'công_vụ',
    start: { value: '2026-11-02T09:00', raw: '9:00 ngày 2/11/2026' },
    end: null,
    durationMinutes: null,
    summary: [],
    relatedProfiles: [],
    confidence: 0.8,
    uncertain: [],
    ...patch,
  };
}

describe('dedup', () => {
  it('chuẩn hoá tiêu đề bỏ dấu và ký tự trang trí', () => {
    expect(normalizeTitleKey('  Họp NHÓM đồ án! ')).toBe('hop nhom do an');
  });

  it('trùng trong cùng lần chạy bị loại, giữ bản đầu', () => {
    const result = dedupeCandidates([candidate(), candidate({ confidence: 0.5 })]);
    expect(result.kept).toHaveLength(1);
    expect(result.kept[0]?.confidence).toBe(0.8);
    expect(result.duplicates).toHaveLength(1);
  });

  it('trùng với sự kiện đã có trong DB', () => {
    const existing = makeEvent(
      {
        title: 'hop nhom do an',
        label: 'công_vụ',
        startValue: '2026-11-03T09:00',
        endValue: null,
        durationMinutesInput: null,
        summary: [],
        relatedProfiles: [],
        sources: [],
      },
      NOW,
    );
    const result = dedupeCandidates([candidate()], [eventDedupInput(existing)]);
    expect(result.kept).toHaveLength(0);
    expect(result.duplicates).toHaveLength(1);
  });

  it('lệch hơn 1 ngày thì giữ lại', () => {
    expect(
      isLikelyDuplicate(
        { title: 'Họp nhóm đồ án', startValue: '2026-11-02T09:00' },
        { title: 'Họp nhóm đồ án', startValue: '2026-11-05T09:00' },
      ),
    ).toBe(false);
  });

  it('một bên thiếu thời điểm thì giữ lại (recall > precision)', () => {
    expect(
      isLikelyDuplicate(
        { title: 'Họp nhóm đồ án', startValue: null },
        { title: 'Họp nhóm đồ án', startValue: '2026-11-02T09:00' },
      ),
    ).toBe(false);
  });

  it('cả hai cùng thiếu thời điểm và trùng tiêu đề → trùng', () => {
    expect(
      isLikelyDuplicate({ title: 'Nộp báo cáo', startValue: null }, { title: 'nộp báo cáo', startValue: null }),
    ).toBe(true);
  });

  it('tiêu đề khác thì không trùng dù cùng giờ', () => {
    expect(
      isLikelyDuplicate(
        { title: 'Họp nhóm đồ án', startValue: '2026-11-02T09:00' },
        { title: 'Họp lớp', startValue: '2026-11-02T09:00' },
      ),
    ).toBe(false);
  });
});

describe('pipeline Slice A qua MockProvider', () => {
  const document: NormalizedDocument = {
    documentId: 'doc_mock',
    source: 'web_page',
    title: 'Thông báo lớp XLNNTN',
    text: [
      'Thông báo lớp học phần XLNNTN.',
      '',
      'Lớp họp nhóm đồ án lúc 9:00 ngày 2/11/2026 tại phòng B203. Sinh viên chuẩn bị đề cương.',
      '',
      'Hạn nộp báo cáo giữa kỳ là 20/11. Báo cáo dài tối đa 15 trang.',
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

  it('chunk → prompt → provider → parse → normalize → dedup ra ≥ 2 candidate', async () => {
    const provider = createMockProvider(15);
    const { chunks } = chunkText(document.text, { chunkChars: 500, maxChunks: 4 });
    const seen: EventCandidate[] = [];

    for (const chunk of chunks) {
      const prompt = buildPrompt({ document, now: NOW, timezone: 'Asia/Ho_Chi_Minh' }, chunk);
      expect(prompt.system).not.toContain('prf_an');
      expect(prompt.system).not.toContain('profileIds');
      expect(prompt.user).toContain('<document');

      const result = await provider.run({
        system: prompt.system,
        user: prompt.user,
        maxTokens: 1200,
        temperature: 0.1,
      });
      const parsed = parseRawExtraction(result.raw);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) return;

      const candidates = normalizeEvents(parsed.value.events, {
        now: NOW,
        timezone: 'Asia/Ho_Chi_Minh',
      }).map((candidate) => attachProfiles(candidate, profiles, document.title));
      const deduped = dedupeCandidates(candidates, []);
      seen.push(...deduped.kept);
    }

    expect(seen.length).toBeGreaterThanOrEqual(2);
    expect(seen[0]?.relatedProfiles).toEqual(['prf_an']);
    expect(seen[1]?.start.value).toBeNull();
    expect(seen[1]?.uncertain).toContain('nam_chua_ro');
  });

  it('output sai schema bị từ chối, không sinh sự kiện rác', async () => {
    const provider = new MockProvider(() => '{"events":[{"title":""}]}');
    const result = await provider.run({ system: 's', user: 'u', maxTokens: 10, temperature: 0 });
    const parsed = parseRawExtraction(result.raw);
    expect(parsed.ok).toBe(false);
    expect(parsed.ok ? [] : parsed.error).toContain('schema');
  });

  it('lưu được candidate thành Event nháp có nguồn trích', () => {
    const event = candidateToEvent(
      candidate(),
      {
        document,
        run: {
          runId: 'run_demo',
          provider: 'mock',
          model: 'mock-v1',
          promptVersion: 'v1',
          chunkIndex: 0,
          chunkCount: 1,
          latencyMs: 15,
        },
      },
      NOW,
    );
    expect(event.sources[0]?.documentId).toBe('doc_mock');
    expect(event.origin).toBe('llm');
  });
});
