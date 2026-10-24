import type { Event, LlmSettings, NormalizedDocument, Profile } from '../../shared/contracts';
import { eventDedupInput } from '../../core/extraction/dedup';
import { candidateToEvent } from '../../core/extraction/normalize';
import { extractEvents } from '../../core/extraction/pipeline';
import type { ExtractionProgress } from '../../core/extraction/pipeline';
import type { InferenceProvider } from '../../core/ports/inference';

export interface ExtractionJobDeps {
  getDocument(documentId: string): Promise<NormalizedDocument | null>;
  listProfiles(): Promise<Profile[]>;
  listEvents(): Promise<Event[]>;
  loadLlmSettings(): Promise<LlmSettings>;
  saveEvent(event: Event): Promise<void>;
  createProvider(settings: LlmSettings): InferenceProvider;
  now(): Date;
}

export interface ExtractionJobResult {
  candidateCount: number;
  savedCount: number;
  duplicateCount: number;
  chunkCount: number;
  truncated: boolean;
}

/**
 * Chạy một job trích xuất trong offscreen document. Không phụ thuộc trực tiếp
 * `chrome.*` để test được bằng DB/provider giả.
 */
export async function runExtractionJob(
  documentId: string,
  deps: ExtractionJobDeps,
  onProgress: (progress: ExtractionProgress) => void,
  signal?: AbortSignal,
): Promise<ExtractionJobResult> {
  const document = await deps.getDocument(documentId);
  if (!document) {
    throw new Error('Không tìm thấy nội dung đã đọc. Hãy quét lại trang rồi thử lại.');
  }

  const [profiles, existingEvents, settings] = await Promise.all([
    deps.listProfiles(),
    deps.listEvents(),
    deps.loadLlmSettings(),
  ]);
  if (signal?.aborted) throw new Error('Đã huỷ trích xuất.');
  const provider = deps.createProvider(settings);
  const health = await provider.health();
  if (!health.ok) throw new Error(health.reason);
  if (signal?.aborted) throw new Error('Đã huỷ trích xuất.');

  const now = deps.now();
  const outcome = await extractEvents({
    document,
    profiles,
    settings: {
      chunkChars: settings.chunkChars,
      maxChunks: settings.maxChunks,
      maxTokens: settings.maxTokens,
      temperature: settings.temperature,
    },
    provider,
    now,
    signal,
    existing: existingEvents.map(eventDedupInput),
    onProgress,
  });

  const candidateCount = outcome.items.length + outcome.duplicates.length;
  if (outcome.items.length > 0) {
    onProgress({
      stage: `Đang lưu ${outcome.items.length} sự kiện nháp…`,
      chunkIndex: outcome.chunkCount,
      chunkCount: outcome.chunkCount,
      phase: 'persisting',
    });
  }

  for (const { candidate, run } of outcome.items) {
    if (signal?.aborted) throw new Error('Đã huỷ trích xuất.');
    await deps.saveEvent(candidateToEvent(candidate, { document, run }, now));
  }
  if (signal?.aborted) throw new Error('Đã huỷ trích xuất.');

  return {
    candidateCount,
    savedCount: outcome.items.length,
    duplicateCount: outcome.duplicates.length,
    chunkCount: outcome.chunkCount,
    truncated: outcome.truncated,
  };
}
