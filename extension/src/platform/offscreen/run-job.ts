import type {
  Event,
  FilterDecision,
  FilterRunMode,
  FilterSettings,
  LlmSettings,
  NormalizedDocument,
  Profile,
} from '../../shared/contracts';
import { FILTER_EMPTY_NOTE, FILTER_REPORT_NOTE, FILTER_SKIPPED_STAGE } from '../../shared/constants';
import { providerAccessProblem, providerLabel } from '../../core/inference/provider-choice';
import { eventDedupInput } from '../../core/extraction/dedup';
import { candidateToEvent } from '../../core/extraction/normalize';
import { extractEvents } from '../../core/extraction/pipeline';
import type { ExtractionProgress } from '../../core/extraction/pipeline';
import {
  buildFilterWindows,
  failOpenNote,
  filterCharBudget,
  resolveFilterMode,
  summarizeFilter,
} from '../../core/extraction/prefilter';
import type { FilterReport, FilterWindow, WindowAnalysis } from '../../core/extraction/filter-types';
import { FilterError, isFilterAborted } from '../../core/ports/content-filter';
import type { ContentFilter } from '../../core/ports/content-filter';
import type { InferenceProvider } from '../../core/ports/inference';

export interface ExtractionJobDeps {
  getDocument(documentId: string): Promise<NormalizedDocument | null>;
  listProfiles(): Promise<Profile[]>;
  listEvents(): Promise<Event[]>;
  loadLlmSettings(): Promise<LlmSettings>;
  loadFilterSettings(): Promise<FilterSettings>;
  saveEvent(event: Event): Promise<void>;
  createProvider(settings: LlmSettings): InferenceProvider;
  createFilter(settings: FilterSettings): ContentFilter;
  now(): Date;
}

export interface ExtractionJobResult {
  candidateCount: number;
  savedCount: number;
  duplicateCount: number;
  chunkCount: number;
  truncated: boolean;
  filterApplied: boolean;
  filterDecision: FilterDecision | null;
  filterEvidenceCount: number;
  filterTotalSentences: number;
  filterConfidence: number | null;
  filterLatencyMs: number;
  filterNote: string | null;
}

/** Giá trị trung tính khi không chạy bước sàng lọc (chế độ `off`, nguồn bôi đen/dán). */
const EMPTY_FILTER_RESULT = {
  filterApplied: false,
  filterDecision: null,
  filterEvidenceCount: 0,
  filterTotalSentences: 0,
  filterConfidence: null,
  filterLatencyMs: 0,
  filterNote: null,
} as const;

function reasonOf(error: unknown): string {
  return error instanceof Error ? error.message : 'lỗi không xác định';
}

/** Bộ trường sàng lọc để ghi vào job; `null` = không chạy. */
function filterFields(
  report: FilterReport | null,
  note: string | null = null,
): Pick<ExtractionJobResult, keyof typeof EMPTY_FILTER_RESULT> {
  if (!report) return { ...EMPTY_FILTER_RESULT };
  return {
    filterApplied: report.applied,
    filterDecision: report.decision,
    filterEvidenceCount: report.evidenceCount,
    filterTotalSentences: report.totalSentences,
    filterConfidence: report.confidence,
    filterLatencyMs: report.latencyMs,
    filterNote: note ?? report.note,
  };
}

function emptyReport(note: string): FilterReport {
  return {
    applied: false,
    decision: 'uncertain',
    evidenceCount: 0,
    totalSentences: 0,
    confidence: null,
    latencyMs: 0,
    windowCount: 0,
    note,
  };
}

interface ScreeningInput {
  document: NormalizedDocument;
  settings: FilterSettings;
  /** Ngân sách ký tự LLM thực sự nhận, để không sàng lọc phần đuôi bị bỏ. */
  budget: { chunkChars: number; maxChunks: number };
  filter: ContentFilter;
  onProgress: (progress: ExtractionProgress) => void;
  signal?: AbortSignal;
}

/**
 * Chạy bước sàng lọc cấp tài liệu (kế hoạch §8 bước 4–6).
 * Lỗi mạng/timeout ⇒ báo cáo fail-open, KHÔNG ném; chỉ ném khi người dùng huỷ.
 */
async function screenDocument(input: ScreeningInput): Promise<FilterReport> {
  const { document, settings, filter, onProgress, signal } = input;
  const windows: FilterWindow[] = buildFilterWindows(document.text, {
    windowChars: settings.windowChars,
    effectiveChars: filterCharBudget(
      document.text.length,
      input.budget.chunkChars,
      input.budget.maxChunks,
    ),
  });
  if (windows.length === 0) return emptyReport(FILTER_EMPTY_NOTE);

  onProgress({
    stage: 'Đang kiểm tra bước sàng lọc…',
    chunkIndex: 0,
    chunkCount: windows.length,
  });
  const health = await filter.health();
  if (!health.ok) return emptyReport(failOpenNote(health.reason));

  const analyses: WindowAnalysis[] = [];
  let note: string | null = null;

  for (const [index, window] of windows.entries()) {
    if (signal?.aborted) throw new FilterError('aborted', 'Đã huỷ bước sàng lọc.');
    onProgress({
      stage: `Đang sàng lọc nội dung ${index + 1}/${windows.length}…`,
      chunkIndex: index,
      chunkCount: windows.length,
    });
    try {
      const analysis = await filter.analyze(window.text, { signal });
      analyses.push({ ok: true, window, analysis });
    } catch (error) {
      if (signal?.aborted || isFilterAborted(error)) {
        throw new FilterError('aborted', 'Đã huỷ bước sàng lọc.');
      }
      // Fail-open: dừng sàng lọc, ghi chú, để LLM nhận toàn văn.
      note = failOpenNote(reasonOf(error));
      break;
    }
  }

  const report = summarizeFilter(windows, analyses, settings);
  return { ...report, applied: note ? false : report.applied, note };
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
  filterRunMode?: FilterRunMode,
): Promise<ExtractionJobResult> {
  const document = await deps.getDocument(documentId);
  if (!document) {
    throw new Error('Không tìm thấy nội dung đã đọc. Hãy quét lại trang rồi thử lại.');
  }

  const [profiles, existingEvents, settings, filterSettings] = await Promise.all([
    deps.listProfiles(),
    deps.listEvents(),
    deps.loadLlmSettings(),
    deps.loadFilterSettings(),
  ]);
  if (signal?.aborted) throw new Error('Đã huỷ trích xuất.');

  // Defense in depth: UI đã hỏi consent trước khi gửi job, nhưng settings có thể
  // bị sửa/thu hồi trong lúc job chờ. Không gửi nội dung tới origin chưa đồng ý.
  const accessProblem = providerAccessProblem(settings);
  if (accessProblem) throw new Error(accessProblem);

  // Bước sàng lọc chạy trước LLM; chỉ định nghĩa lại thứ tự trong `resolveFilterMode`.
  const mode = resolveFilterMode(filterSettings.mode, filterRunMode, document.source);
  const report =
    mode === 'off'
      ? null
      : await screenDocument({
          document,
          settings: filterSettings,
          budget: { chunkChars: settings.chunkChars, maxChunks: settings.maxChunks },
          filter: deps.createFilter(filterSettings),
          onProgress,
          signal,
        });
  if (signal?.aborted) throw new Error('Đã huỷ trích xuất.');

  // `screen` + chắc chắn không có việc ⇒ kết thúc mà không tạo provider/gọi LLM.
  if (mode === 'screen' && report?.decision === 'no_event' && report.applied) {
    onProgress({
      stage: FILTER_SKIPPED_STAGE,
      chunkIndex: 0,
      chunkCount: 0,
    });
    return {
      candidateCount: 0,
      savedCount: 0,
      duplicateCount: 0,
      chunkCount: 0,
      truncated: false,
      ...filterFields(report),
    };
  }

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

  const reportNote =
    mode === 'report' && report?.decision === 'no_event' ? FILTER_REPORT_NOTE : null;

  return {
    candidateCount,
    savedCount: outcome.items.length,
    duplicateCount: outcome.duplicates.length,
    chunkCount: outcome.chunkCount,
    truncated: outcome.truncated,
    ...filterFields(report, reportNote),
  };
}
