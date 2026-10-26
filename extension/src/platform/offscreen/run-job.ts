import type { Event, FilterDecision, LlmSettings, NormalizedDocument, Profile } from '../../shared/contracts';
import { providerAccessProblem, providerLabel } from '../../core/inference/provider-choice';
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
  /** Kết quả bước sàng lọc; F0 để trung tính, P5 điền giá trị thật. */
  filterApplied: boolean;
  filterDecision: FilterDecision | null;
  filterEvidenceCount: number;
  filterTotalSentences: number;
  filterConfidence: number | null;
  filterLatencyMs: number;
  filterNote: string | null;
}

/** Giá trị trung tính khi chưa chạy (hoặc không chạy) bước sàng lọc. */
const EMPTY_FILTER_RESULT = {
  filterApplied: false,
  filterDecision: null,
  filterEvidenceCount: 0,
  filterTotalSentences: 0,
  filterConfidence: null,
  filterLatencyMs: 0,
  filterNote: null,
} as const;

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

  // Defense in depth: UI đã hỏi consent trước khi gửi job, nhưng settings có thể
  // bị sửa/thu hồi trong lúc job chờ. Không gửi nội dung tới origin chưa đồng ý.
  const accessProblem = providerAccessProblem(settings);
  if (accessProblem) throw new Error(accessProblem);

  const provider = deps.createProvider(settings);
  const health = await provider.health();
  if (!health.ok) throw new Error(health.reason);
  if (signal?.aborted) throw new Error('Đã huỷ trích xuất.');

  const label = providerLabel(settings);
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
    onProgress: (progress) => onProgress({ ...progress, stage: `${progress.stage} · ${label}` }),
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
    ...EMPTY_FILTER_RESULT,
  };
}
