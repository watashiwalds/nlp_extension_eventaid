/**
 * Dùng chung cho các test bộ mẫu đánh giá: dựng `NormalizedDocument`, chạy
 * pipeline với `MockProvider` và tìm candidate theo tiêu đề.
 * Tách riêng để mỗi file test dưới ngưỡng `max-lines`.
 */
import { normalizeTitleKey } from '../../src/core/extraction/dedup';
import { MockProvider } from '../../src/core/extraction/mock-provider';
import { extractEvents } from '../../src/core/extraction/pipeline';
import type { ExtractionOutcome } from '../../src/core/extraction/pipeline';
import { buildPrompt, DEFAULT_TIMEZONE } from '../../src/core/extraction/prompt';
import type { DedupInput } from '../../src/core/extraction/types';
import type { NormalizedDocument } from '../../src/shared/contracts';
import type { EvalCase } from '../fixtures/eval/cases';

export const SETTINGS = { chunkChars: 5_000, maxChunks: 4, maxTokens: 1_200, temperature: 0.1 };

export interface RunOptions {
  text?: string;
  mockOutput?: EvalCase['mockOutput'];
  existing?: DedupInput[];
}

export function documentFor(evalCaseItem: EvalCase, text = evalCaseItem.text): NormalizedDocument {
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

export async function runCase(
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

export function findCandidate(items: ExtractionOutcome['items'], title: string) {
  const key = normalizeTitleKey(title);
  return items.find((item) => normalizeTitleKey(item.candidate.title) === key);
}

export function promptFor(evalCaseItem: EvalCase, document: NormalizedDocument) {
  return buildPrompt(
    { document, now: new Date(evalCaseItem.now), timezone: DEFAULT_TIMEZONE },
    { index: 0, text: document.text, charStart: 0, charEnd: document.text.length },
  );
}
