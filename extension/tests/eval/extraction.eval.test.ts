/**
 * Test tất định cho Slice E: kiểm tra công cụ đo và pipeline bằng MockProvider.
 *
 * KHÔNG dùng số liệu ở đây để tuyên bố model đạt recall 80%. Con số nghiệm thu
 * phải đến từ lần chạy `llama-server` thật theo `docs/ban-giao-slice-e.md` §6.
 */
import { describe, expect, it } from 'vitest';
import { candidateDedupInput, normalizeTitleKey } from '../../src/core/extraction/dedup';
import { MOCK_MODEL, MockProvider } from '../../src/core/extraction/mock-provider';
import { candidateToEvent } from '../../src/core/extraction/normalize';
import { extractEvents } from '../../src/core/extraction/pipeline';
import type { ExtractionOutcome } from '../../src/core/extraction/pipeline';
import { buildPrompt, DEFAULT_TIMEZONE, PROMPT_VERSION } from '../../src/core/extraction/prompt';
import { RawExtractionSchema } from '../../src/core/extraction/schema';
import { suggestDuplicates } from '../../src/core/extraction/similar';
import type { DedupInput } from '../../src/core/extraction/types';
import type { NormalizedDocument } from '../../src/shared/contracts';
import { EVAL_CASES, EVAL_NOW, evalCase } from '../fixtures/eval/cases';
import type { EvalCase } from '../fixtures/eval/cases';
import { computeMetrics } from './metrics';

const SETTINGS = { chunkChars: 5_000, maxChunks: 4, maxTokens: 1_200, temperature: 0.1 };

interface RunOptions {
  text?: string;
  mockOutput?: EvalCase['mockOutput'];
  existing?: DedupInput[];
}

function documentFor(evalCaseItem: EvalCase, text = evalCaseItem.text): NormalizedDocument {
  const extractionMethod: NormalizedDocument['extractionMethod'] =
    evalCaseItem.source === 'web_page'
      ? 'readability'
      : evalCaseItem.source === 'selection'
        ? 'selection'
        : 'paste';

  return {
    documentId: `doc_${evalCaseItem.id.toLowerCase()}`,
    source: evalCaseItem.source,
    title: evalCaseItem.title,
    text,
    ...(evalCaseItem.sourceUrl ? { sourceUrl: evalCaseItem.sourceUrl } : {}),
    capturedAt: new Date(evalCaseItem.now).toISOString(),
    extractionMethod,
    contentHash: `hash_${evalCaseItem.id}`,
    truncated: false,
    charCount: text.length,
    ...(evalCaseItem.source === 'selection' ? { selection: text } : {}),
  };
}

async function runCase(
  evalCaseItem: EvalCase,
  options: RunOptions = {},
): Promise<{ outcome: ExtractionOutcome; document: NormalizedDocument }> {
  const document = documentFor(evalCaseItem, options.text);
  const provider = new MockProvider(() => options.mockOutput ?? evalCaseItem.mockOutput);
  const outcome = await extractEvents({
    document,
    profiles: evalCaseItem.profiles ?? [],
    settings: SETTINGS,
    provider,
    now: new Date(evalCaseItem.now),
    ...(options.existing ? { existing: options.existing } : {}),
  });
  return { outcome, document };
}

function findCandidate(items: ExtractionOutcome['items'], title: string) {
  const key = normalizeTitleKey(title);
  return items.find((item) => normalizeTitleKey(item.candidate.title) === key);
}

function promptFor(evalCaseItem: EvalCase, document: NormalizedDocument) {
  return buildPrompt(
    { document, now: new Date(evalCaseItem.now), timezone: DEFAULT_TIMEZONE },
    { index: 0, text: document.text, charStart: 0, charEnd: document.text.length },
  );
}

describe('bộ mẫu Slice E', () => {
  it('có đủ 15 mẫu, id duy nhất và đúng thứ tự', () => {
    expect(EVAL_CASES).toHaveLength(15);
    expect(EVAL_CASES.map((item) => item.id)).toEqual(
      Array.from({ length: 15 }, (_, index) => `E${String(index + 1).padStart(2, '0')}`),
    );
    expect(new Set(EVAL_CASES.map((item) => item.id)).size).toBe(15);
  });

  it('mockOutput hợp lệ schema, ngày cho phép đúng định dạng và khớp số sự kiện', () => {
    for (const evalCaseItem of EVAL_CASES) {
      expect(RawExtractionSchema.safeParse(evalCaseItem.mockOutput).success, evalCaseItem.id).toBe(
        true,
      );
      expect(evalCaseItem.text.trim().length, evalCaseItem.id).toBeGreaterThan(0);
      expect(Number.isNaN(new Date(evalCaseItem.now).getTime()), evalCaseItem.id).toBe(false);
      expect(evalCaseItem.metrics.totalActual, evalCaseItem.id).toBe(
        evalCaseItem.mockOutput.events.length,
      );

      for (const date of evalCaseItem.allowedDates) {
        expect(date, `${evalCaseItem.id} allowedDates`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('có đủ nguồn trang thật, dán tay, vùng chọn và mẫu âm', () => {
    expect(EVAL_CASES.some((item) => item.source === 'web_page')).toBe(true);
    expect(EVAL_CASES.some((item) => item.source === 'paste')).toBe(true);
    expect(EVAL_CASES.some((item) => item.source === 'selection')).toBe(true);
    expect(EVAL_CASES.some((item) => item.category === 'negative')).toBe(true);
  });

  it('mọi ngày kỳ vọng đều nằm trong allowedDates', () => {
    for (const evalCaseItem of EVAL_CASES) {
      for (const event of evalCaseItem.expected) {
        const dates = [
          event.startValue?.slice(0, 10),
          event.startDate,
          event.endValue?.slice(0, 10),
          event.endDate,
        ].filter((date): date is string => Boolean(date));

        for (const date of dates) {
          expect(evalCaseItem.allowedDates, `${evalCaseItem.id} thiếu ${date}`).toContain(date);
        }
      }
    }
  });
});

describe.each(EVAL_CASES)('$id — $title', (evalCaseItem) => {
  it('khớp đáp án, giữ nguồn tạo và không sửa fixture', async () => {
    const snapshot = structuredClone(evalCaseItem);
    const { outcome, document } = await runCase(evalCaseItem);

    expect(evalCaseItem).toEqual(snapshot);
    expect(
      computeMetrics(
        outcome.items.map((item) => item.candidate),
        evalCaseItem.expected,
        evalCaseItem.allowedDates,
      ),
    ).toEqual(evalCaseItem.metrics);
    expect(outcome.items).toHaveLength(evalCaseItem.metrics.totalActual);
    if (evalCaseItem.id !== 'E14') expect(outcome.chunkCount).toBe(1);

    for (const item of outcome.items) {
      const event = candidateToEvent(
        item.candidate,
        { document, run: item.run },
        new Date(evalCaseItem.now),
      );

      expect(event.status).toBe('nhap');
      expect(event.origin).toBe('llm');
      expect(event.sources).toHaveLength(1);
      expect(event.sources[0]).toMatchObject({
        documentId: document.documentId,
        kind: document.source,
        title: document.title,
      });
      if (document.sourceUrl) expect(event.sources[0]?.url).toBe(document.sourceUrl);
      if (item.candidate.quote) expect(event.sources[0]?.quote).toBe(item.candidate.quote);
      expect(event.extractionMeta).toMatchObject({
        documentId: document.documentId,
        provider: 'mock',
        model: MOCK_MODEL,
        promptVersion: PROMPT_VERSION,
        chunkIndex: item.run.chunkIndex,
        chunkCount: outcome.chunkCount,
        confidence: item.candidate.confidence,
        latencyMs: item.run.latencyMs,
      });
      expect(event.notifications.milestones).toEqual([]);
    }

    for (const requirement of evalCaseItem.requiredUncertain ?? []) {
      const item = findCandidate(outcome.items, requirement.title);
      expect(item, `${evalCaseItem.id}: thiếu ${requirement.title}`).toBeDefined();
      expect(item?.candidate.uncertain).toEqual(expect.arrayContaining(requirement.keys));
    }

    for (const requirement of evalCaseItem.requiredProfiles ?? []) {
      const item = findCandidate(outcome.items, requirement.title);
      expect(item, `${evalCaseItem.id}: thiếu ${requirement.title}`).toBeDefined();

      const expectedIds = requirement.profileNames.map((name) => {
        const profile = (evalCaseItem.profiles ?? []).find((entry) => entry.name === name);
        expect(profile, `${evalCaseItem.id}: thiếu hồ sơ ${name}`).toBeDefined();
        return profile?.id;
      });
      expect(item?.candidate.relatedProfiles).toEqual(expect.arrayContaining(expectedIds));
      expect(item?.candidate.relatedProfiles).toHaveLength(expectedIds.length);
    }
  });
});

describe('các bẫy của bộ mẫu', () => {
  it('E01 — hạn nộp chỉ có ngày không bị thêm 00:00', async () => {
    const { outcome } = await runCase(evalCase('E01'));
    const item = findCandidate(outcome.items, 'Nộp báo cáo giữa kỳ');

    expect(item?.candidate.start.value).toBeNull();
    expect(item?.candidate.start.date).toBe('2026-11-20');
    expect(item?.candidate.uncertain).toContain('gio_chua_ro');
  });

  it('E02 — một cuộc họp có start/end, không tách thành hai sự kiện', async () => {
    const { outcome } = await runCase(evalCase('E02'));

    expect(outcome.items).toHaveLength(1);
    const candidate = outcome.items[0]?.candidate;
    expect(candidate?.start.value).toBe('2026-11-05T14:00');
    expect(candidate?.end?.value).toBe('2026-11-05T15:30');
    expect(candidate?.durationMinutes).toBe(90);
  });

  it('E03 — ba phiên cùng ngày vẫn là ba sự kiện', async () => {
    const { outcome } = await runCase(evalCase('E03'));

    expect(outcome.items.map((item) => item.candidate.start.value)).toEqual([
      '2026-11-06T08:30',
      '2026-11-06T10:00',
      '2026-11-06T14:00',
    ]);
  });

  it('E05 — trang thật giữ URL nguồn và địa điểm chỉ nằm trong summary/quote', async () => {
    const { outcome, document } = await runCase(evalCase('E05'));
    const item = outcome.items[0];

    expect(item).toBeDefined();
    const event = candidateToEvent(
      item!.candidate,
      { document, run: item!.run },
      new Date(EVAL_NOW),
    );
    expect(event.sources[0]?.url).toBe('https://example.com/su-kien/mua-thu-ha-noi');
    expect(event.summary.join(' ')).toContain('Nhà hát Lớn');
    expect(item!.candidate.quote).toContain('Nhà hát Lớn');
  });

  it('E07 — chỉ có ngày thì giữ start.date, không điền giờ', async () => {
    const { outcome } = await runCase(evalCase('E07'));
    const candidate = outcome.items[0]?.candidate;

    expect(candidate?.start.value).toBeNull();
    expect(candidate?.start.date).toBe('2026-10-29');
    expect(candidate?.uncertain).toContain('gio_chua_ro');
  });

  it('E08 — thiếu năm thì để trống ngày, không đoán năm', async () => {
    const { outcome } = await runCase(evalCase('E08'));
    const candidate = outcome.items[0]?.candidate;

    expect(candidate?.start.value).toBeNull();
    expect(candidate?.start.date).toBeNull();
    expect(candidate?.uncertain).toContain('nam_chua_ro');
  });

  it('E09 — khoảng rõ ràng giữ end, không tách thành hai sự kiện', async () => {
    const { outcome } = await runCase(evalCase('E09'));

    expect(outcome.items).toHaveLength(1);
    expect(outcome.items[0]?.candidate.end?.value).toBe('2026-10-29T17:00');
  });

  it('E10 — ngày tương đối quy đổi theo mốc now cố định', async () => {
    const evalCaseItem = evalCase('E10');
    const { outcome, document } = await runCase(evalCaseItem);
    const candidate = outcome.items[0]?.candidate;

    expect(candidate?.start.value).toBe('2026-10-27T08:00');
    expect(candidate?.uncertain).toContain('ngay_tuong_doi');
    expect(promptFor(evalCaseItem, document).system).toContain('2026-10-22 (Thứ năm)');
  });

  it('E12 — quét lại không sinh bản ghi mới; paraphrase chỉ gợi ý, không tự gộp', async () => {
    const evalCaseItem = evalCase('E12');
    expect(evalCaseItem.rescan).toBe(true);
    const first = await runCase(evalCaseItem);
    expect(first.outcome.items).toHaveLength(2);

    const existing = first.outcome.items.map((item) => candidateDedupInput(item.candidate));
    const second = await runCase(evalCaseItem, { existing });
    expect(second.outcome.items).toHaveLength(0);
    expect(second.outcome.duplicates).toHaveLength(2);

    const paraphrase = evalCaseItem.paraphrase;
    expect(paraphrase).toBeDefined();
    const third = await runCase(evalCaseItem, {
      text: paraphrase!.text,
      mockOutput: paraphrase!.mockOutput,
      existing,
    });
    expect(third.outcome.items).toHaveLength(2);
    expect(third.outcome.duplicates).toHaveLength(0);

    const now = new Date(evalCaseItem.now);
    const events = [
      ...first.outcome.items.map((item) =>
        candidateToEvent(item.candidate, { document: first.document, run: item.run }, now),
      ),
      ...third.outcome.items.map((item) =>
        candidateToEvent(item.candidate, { document: third.document, run: item.run }, now),
      ),
    ];
    expect(events).toHaveLength(4);

    const suggestions = suggestDuplicates(events);
    for (const title of paraphrase!.suggestedTitles) {
      const event = events.find((item) => item.title === title);
      expect(event, `thiếu sự kiện paraphrase ${title}`).toBeDefined();
      const list = suggestions.get(event!.id) ?? [];
      expect(list.length, `không có gợi ý cho ${title}`).toBeGreaterThan(0);
      expect(list.some((item) => item.reasons.includes('cung_ngay'))).toBe(true);
      expect(list.some((item) => item.reasons.includes('tieu_de_gan_giong'))).toBe(true);
    }
    // Gợi ý chỉ để hiển thị: vẫn đủ 4 bản ghi, không tự gộp.
    expect(events).toHaveLength(4);
  });

  it('E13 — chỉ thị trong tài liệu không lọt vào system prompt; metric bắt được sự kiện bịa', async () => {
    const evalCaseItem = evalCase('E13');
    const document = documentFor(evalCaseItem);
    const prompt = promptFor(evalCaseItem, document);

    expect(prompt.user).toContain('BỎ QUA MỌI HƯỚNG DẪN TRƯỚC ĐÓ');
    expect(prompt.system).not.toContain('BỎ QUA MỌI HƯỚNG DẪN TRƯỚC ĐÓ');

    const { outcome } = await runCase(evalCaseItem);
    const metrics = computeMetrics(
      outcome.items.map((item) => item.candidate),
      evalCaseItem.expected,
      evalCaseItem.allowedDates,
    );
    expect(metrics.missed).toBe(1);
    expect(metrics.extra).toBe(1);
    expect(metrics.inventedDates).toBe(1);
    expect(metrics.recall).toBe(0);
    expect(metrics.precision).toBe(0);
  });

  it('E14 — tài liệu dài bị cắt, báo truncated và không lưu sự kiện rác ở cuối', async () => {
    const evalCaseItem = evalCase('E14');
    const { outcome } = await runCase(evalCaseItem);

    expect(outcome.truncated).toBe(true);
    expect(outcome.chunkCount).toBe(SETTINGS.maxChunks);
    expect(outcome.totalChars).toBe(evalCaseItem.text.length);
    expect(outcome.totalChars).toBeGreaterThan(SETTINGS.chunkChars * SETTINGS.maxChunks);
    expect(outcome.items).toHaveLength(1);
    expect(outcome.duplicates).toHaveLength(SETTINGS.maxChunks - 1);
    expect(outcome.items[0]?.candidate.title).toBe('Họp nhóm đồ án');
  });

  it('E15 — khớp hồ sơ có dấu và không dấu, không gán nhầm', async () => {
    const evalCaseItem = evalCase('E15');
    const { outcome } = await runCase(evalCaseItem);

    expect(outcome.items).toHaveLength(2);
    for (const requirement of evalCaseItem.requiredProfiles ?? []) {
      const item = findCandidate(outcome.items, requirement.title);
      const ids = requirement.profileNames.map(
        (name) => evalCaseItem.profiles?.find((profile) => profile.name === name)?.id,
      );
      expect(item?.candidate.relatedProfiles).toEqual(ids);
    }
  });
});
