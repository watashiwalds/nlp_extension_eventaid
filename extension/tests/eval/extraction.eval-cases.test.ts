/**
 * Test từng "bẫy" của bộ mẫu đánh giá (tách khỏi `extraction.eval.test.ts`
 * để dưới ngưỡng `max-lines`). Tất cả chạy bằng `MockProvider` — chỉ chứng minh
 * pipeline + công cụ đo xử lý đúng các tình huống, không đo chất lượng model.
 */
import { describe, expect, it } from 'vitest';
import { candidateDedupInput } from '../../src/core/extraction/dedup';
import { candidateToEvent } from '../../src/core/extraction/normalize';
import { suggestDuplicates } from '../../src/core/extraction/similar';
import { EVAL_CASES, EVAL_NOW, evalCase } from '../fixtures/eval/cases';
import { computeMetrics } from './metrics';
import {
  SETTINGS,
  documentFor,
  findCandidate,
  promptFor,
  runCase,
} from './case-harness';

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

  it('E08 — thiếu năm có ngữ cảnh: suy năm 2026 kèm cờ nam_suy_doan', async () => {
    const { outcome } = await runCase(evalCase('E08'));
    const candidate = outcome.items[0]?.candidate;

    expect(candidate?.start.value).toBe('2026-11-15T08:00');
    expect(candidate?.start.raw).toBe('8h ngày 15/11');
    expect(candidate?.uncertain).toContain('nam_suy_doan');
    expect(candidate?.uncertain).not.toContain('nam_chua_ro');
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

  it('E16 — hai mốc thiếu năm đều suy được năm 2026 từ ngữ cảnh', async () => {
    const { outcome } = await runCase(evalCase('E16'));

    expect(outcome.items).toHaveLength(2);
    const [ho, han] = outcome.items.map((item) => item?.candidate);
    expect(ho?.start.value).toBe('2026-11-12T09:00');
    expect(ho?.start.raw).toBe('9:00 ngày 12/11');
    expect(ho?.uncertain).toContain('nam_suy_doan');
    // Sự kiện chỉ có ngày: giữ dạng YYYY-MM-DD, không tự thêm giờ.
    expect(han?.start.value).toBeNull();
    expect(han?.start.date).toBe('2026-11-15');
    expect(han?.uncertain).toContain('nam_suy_doan');
    expect(han?.uncertain).toContain('gio_chua_ro');
  });

  it('E17 — "buổi tối" quy về 19:00 và thiếu năm suy từ ngữ cảnh', async () => {
    const { outcome } = await runCase(evalCase('E17'));
    const candidate = outcome.items[0]?.candidate;

    expect(outcome.items).toHaveLength(1);
    expect(candidate?.start.value).toBe('2026-12-03T09:00');
    expect(candidate?.end?.value).toBe('2026-12-07T19:00');
    expect(candidate?.end?.raw).toBe('đến buổi tối ngày 7/12');
    expect(candidate?.uncertain).toContain('nam_suy_doan');
    expect(candidate?.uncertain).toContain('gio_suy_doan');
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

  it('mọi mẫu đều có mặt trong EVAL_CASES (không sót bẫy)', () => {
    expect(EVAL_CASES.length).toBeGreaterThanOrEqual(17);
  });
});
