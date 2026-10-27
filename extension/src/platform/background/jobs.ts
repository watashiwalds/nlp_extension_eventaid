import { ExtractionJobSchema } from '../../shared/contracts';
import type { ExtractionJob, ExtractionJobStatus } from '../../shared/contracts';
import type { RuntimeMessage } from '../../shared/messages';
import { EXTRACTION_JOB_KEY, FILTER_SKIPPED_STAGE } from '../../shared/constants';

/** Job còn sống; cấm tạo job mới khi đang ở một trong các trạng thái này. */
export const ACTIVE_JOB_STATUSES: ExtractionJobStatus[] = ['queued', 'running', 'persisting'];

export type JobPatch = Partial<
  Omit<ExtractionJob, 'jobId' | 'documentId' | 'startedAt' | 'updatedAt'>
>;

export function isActiveJob(job: ExtractionJob | null): boolean {
  return job !== null && ACTIVE_JOB_STATUSES.includes(job.status);
}

export function makeJob(documentId: string, now: Date = new Date()): ExtractionJob {
  const at = now.toISOString();
  return ExtractionJobSchema.parse({
    jobId: `job_${crypto.randomUUID()}`,
    documentId,
    status: 'queued',
    stage: 'Đang chuẩn bị trích xuất…',
    chunkIndex: 0,
    chunkCount: 0,
    candidateCount: 0,
    savedCount: 0,
    duplicateCount: 0,
    truncated: false,
    error: null,
    startedAt: at,
    updatedAt: at,
  });
}

/** Cập nhật một phần job; giữ nguyên id/tài liệu/mốc bắt đầu. */
export function patchJob(
  job: ExtractionJob,
  patch: JobPatch,
  now: Date = new Date(),
): ExtractionJob {
  return ExtractionJobSchema.parse({
    ...job,
    ...patch,
    jobId: job.jobId,
    documentId: job.documentId,
    startedAt: job.startedAt,
    updatedAt: now.toISOString(),
  });
}

/** Dữ liệu đọc từ storage là untrusted — sai schema thì coi như không có job. */
export function parseStoredJob(raw: unknown): ExtractionJob | null {
  const parsed = ExtractionJobSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * Map `JOB_DONE` → phần cập nhật cuối của job, gồm cả kết luận bước sàng lọc (P5).
 * Tách khỏi service worker để `background/index.ts` không vượt `max-lines`.
 */
export function donePatch(message: Extract<RuntimeMessage, { type: 'JOB_DONE' }>): JobPatch {
  const skipped =
    message.filterDecision === 'no_event' &&
    message.savedCount === 0 &&
    message.filterNote === null;
  const stage =
    message.savedCount > 0
      ? `Đã lưu ${message.savedCount} sự kiện nháp.`
      : 'Không có sự kiện mới để lưu.';

  return {
    status: 'done',
    stage: skipped ? FILTER_SKIPPED_STAGE : stage,
    chunkIndex: message.chunkCount,
    chunkCount: message.chunkCount,
    candidateCount: message.candidateCount,
    savedCount: message.savedCount,
    duplicateCount: message.duplicateCount,
    truncated: message.truncated,
    filterApplied: message.filterApplied,
    filterDecision: message.filterDecision,
    filterEvidenceCount: message.filterEvidenceCount,
    filterTotalSentences: message.filterTotalSentences,
    filterConfidence: message.filterConfidence,
    filterLatencyMs: message.filterLatencyMs,
    filterNote: message.filterNote,
    error: null,
  };
}

export async function readJob(): Promise<ExtractionJob | null> {
  const bag = await chrome.storage.session.get(EXTRACTION_JOB_KEY);
  return parseStoredJob(bag[EXTRACTION_JOB_KEY]);
}

export async function writeJob(job: ExtractionJob): Promise<ExtractionJob> {
  const valid = ExtractionJobSchema.parse(job);
  await chrome.storage.session.set({ [EXTRACTION_JOB_KEY]: valid });
  return valid;
}

export async function clearJob(): Promise<void> {
  await chrome.storage.session.remove(EXTRACTION_JOB_KEY);
}
