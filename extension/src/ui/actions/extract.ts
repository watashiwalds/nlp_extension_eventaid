import type { ExtractionJob } from '../../shared/contracts';
import type { RuntimeResponse } from '../../shared/messages';
import {
  activeEndpoint,
  providerAccessProblem,
} from '../../core/inference/provider-choice';
import { readJob } from '../../platform/background/jobs';
import { ensureHostPermission, needsHostPermission } from '../../platform/permissions';
import { activeDocument, loadAll, showToast, store } from '../store';
import { messageOf } from './shared';

/**
 * Slice C: side panel chỉ gửi yêu cầu; job chạy trong offscreen document.
 * Side panel có thể đóng/mở lại mà không làm mất tiến trình.
 */

let sending = false;
let handledJobId: string | null = null;

const ACTIVE_STATUSES: ExtractionJob['status'][] = ['queued', 'running', 'persisting'];

function activeJob(job: ExtractionJob | null): boolean {
  return job !== null && ACTIVE_STATUSES.includes(job.status);
}

function doneMessage(job: ExtractionJob): string {
  const parts =
    job.savedCount > 0
      ? [`Đã lưu ${job.savedCount} sự kiện nháp từ máy.`]
      : ['Không có sự kiện mới để lưu.'];
  if (job.duplicateCount > 0) parts.push(`Bỏ qua ${job.duplicateCount} sự kiện trùng.`);
  if (job.truncated) parts.push('Tài liệu dài nên chỉ xử lý phần đầu.');
  return parts.join(' ');
}

/** Áp trạng thái job vào store; chỉ báo toast khi job kết thúc trong lúc panel mở. */
export function applyJob(job: ExtractionJob, notify = true): void {
  if (activeJob(job)) {
    store.set({
      extraction: {
        jobId: job.jobId,
        stage: job.stage,
        chunkIndex: job.chunkIndex,
        chunkCount: job.chunkCount,
      },
    });
    return;
  }

  store.set({ extraction: null });
  if (handledJobId === job.jobId) return;
  handledJobId = job.jobId;

  if (!notify) return;
  if (job.status === 'done') {
    showToast(job.savedCount > 0 ? 'success' : 'info', doneMessage(job));
    void loadAll().then(() =>
      store.set((state) => ({
        ...state,
        tab: 'events',
        eventFilter: { ...state.eventFilter, status: 'nhap' },
        // Kết quả trích xuất là nháp: mở thẳng chế độ duyệt để người dùng chọn và duyệt.
        reviewMode: true,
        reviewReturnStatus: 'all',
        selectedDraftIds: [],
      })),
    );
  } else if (job.status === 'failed') {
    showToast('error', job.error ?? 'Trích xuất thất bại.');
    void loadAll();
  } else if (job.status === 'cancelled') {
    showToast('info', 'Đã huỷ trích xuất. Sự kiện đã lưu trước đó vẫn còn trong Nháp.');
    void loadAll();
  }
}

/** Đọc job từ session khi mở side panel; không báo lại toast của job cũ. */
export async function syncExtractionJob(): Promise<void> {
  try {
    const job = await readJob();
    if (job) applyJob(job, false);
    else store.set({ extraction: null });
  } catch (error) {
    console.warn('[extract] Không đọc được job trích xuất', error);
  }
}

export async function extractEventsAction(): Promise<void> {
  if (sending || store.get().extraction) return;

  const document = activeDocument(store.get());
  if (!document) {
    showToast('error', 'Chưa có nội dung để trích xuất. Hãy quét trang hoặc dán văn bản trước.');
    return;
  }

  sending = true;
  try {
    // Chặn trước khi mở job: chưa đồng ý origin remote thì không gửi nội dung.
    const llm = store.get().llm;
    const problem = providerAccessProblem(llm);
    if (problem) {
      showToast('error', problem);
      store.set({ tab: 'settings' });
      return;
    }

    // Quyền host có thể bị thu hồi trong Chrome; xin lại ngay trong cú click này.
    const endpoint = activeEndpoint(llm);
    if (needsHostPermission(endpoint)) {
      const permission = await ensureHostPermission(endpoint);
      if (!permission.granted) {
        showToast('error', permission.reason ?? 'Chưa được cấp quyền truy cập endpoint.');
        store.set({ tab: 'settings' });
        return;
      }
    }

    store.set({
      extraction: {
        jobId: 'pending',
        stage: 'Đang chuẩn bị trích xuất…',
        chunkIndex: 0,
        chunkCount: 0,
      },
    });

    const response = (await chrome.runtime.sendMessage({
      to: 'background',
      type: 'RUN_EXTRACTION',
      documentId: document.documentId,
    })) as RuntimeResponse | undefined;

    if (!response?.ok) {
      await syncExtractionJob();
      showToast('error', response?.error ?? 'Không bắt đầu được lần trích xuất.');
    }
  } catch (error) {
    await syncExtractionJob();
    showToast('error', messageOf(error));
  } finally {
    sending = false;
  }
}

export async function cancelExtractionAction(): Promise<void> {
  const jobId = store.get().extraction?.jobId;
  if (!jobId || jobId === 'pending') return;

  try {
    const response = (await chrome.runtime.sendMessage({
      to: 'background',
      type: 'CANCEL_EXTRACTION',
      jobId,
    })) as RuntimeResponse | undefined;
    if (response && !response.ok) showToast('error', response.error);
  } catch (error) {
    showToast('error', messageOf(error));
  }
}
