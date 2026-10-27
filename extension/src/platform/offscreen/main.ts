import { RuntimeMessageSchema } from '../../shared/messages';
import type { RuntimeMessage } from '../../shared/messages';
import type { FilterRunMode, FilterSettings } from '../../shared/contracts';
import { isAbortedError } from '../../core/ports/inference';
import { isFilterAborted } from '../../core/ports/content-filter';
import { createInferenceProvider } from '../inference/factory';
import { PhobertTaskFilter } from '../inference/phobert-filter';
import { getDocument, listEvents, listProfiles, saveEvent } from '../storage/db';
import { loadFilterSettings } from '../storage/filter-settings';
import { loadLlmSettings } from '../storage/settings';
import { runExtractionJob } from './run-job';

/** Cầu nối Chrome duy nhất của offscreen; logic chạy job nằm ở `run-job.ts`. */

let active: { jobId: string; controller: AbortController } | null = null;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

async function post(message: RuntimeMessage): Promise<void> {
  try {
    await chrome.runtime.sendMessage(message);
  } catch (error) {
    console.warn('[offscreen] Không gửi được cập nhật job', error);
  }
}

async function start(jobId: string, documentId: string, filterRunMode?: FilterRunMode): Promise<void> {
  const controller = new AbortController();
  active = { jobId, controller };

  await post({
    to: 'background',
    type: 'JOB_PROGRESS',
    jobId,
    status: 'running',
    stage: 'Đang kiểm tra nơi chạy suy luận…',
    chunkIndex: 0,
    chunkCount: 0,
  });

  try {
    const result = await runExtractionJob(
      documentId,
      {
        getDocument,
        listProfiles,
        listEvents,
        loadLlmSettings,
        loadFilterSettings,
        saveEvent,
        now: () => new Date(),
        createProvider: createInferenceProvider,
        createFilter: (settings: FilterSettings) =>
          new PhobertTaskFilter({ endpoint: settings.endpoint, timeoutMs: settings.timeoutMs }),
      },
      (progress) => {
        void post({
          to: 'background',
          type: 'JOB_PROGRESS',
          jobId,
          status: progress.phase ?? 'running',
          stage: progress.stage,
          chunkIndex: progress.chunkIndex,
          chunkCount: progress.chunkCount,
        });
      },
      controller.signal,
      filterRunMode,
    );

    await post({ to: 'background', type: 'JOB_DONE', jobId, ...result });
  } catch (error) {
    if (controller.signal.aborted || isAbortedError(error) || isFilterAborted(error)) {
      await post({ to: 'background', type: 'JOB_CANCELLED', jobId });
    } else {
      await post({ to: 'background', type: 'JOB_FAILED', jobId, error: errorMessage(error) });
    }
  } finally {
    if (active?.jobId === jobId) active = null;
  }
}

chrome.runtime.onMessage.addListener((raw: unknown) => {
  const parsed = RuntimeMessageSchema.safeParse(raw);
  if (!parsed.success) return false;
  const message = parsed.data;
  if (message.to !== 'offscreen') return false;

  if (message.type === 'RUN_EXTRACTION') {
    if (active) {
      // Cùng jobId = message bị gửi lặp (retry); bỏ qua, không phá job đang chạy.
      if (active.jobId !== message.jobId) {
        void post({
          to: 'background',
          type: 'JOB_FAILED',
          jobId: message.jobId,
          error: 'Đang có một lần trích xuất khác chạy.',
        });
      }
      return false;
    }
    void start(message.jobId, message.documentId, message.filterRunMode);
    return false;
  }

  if (message.type === 'CANCEL_EXTRACTION') {
    if (active?.jobId === message.jobId) active.controller.abort();
    return false;
  }

  return false;
});
