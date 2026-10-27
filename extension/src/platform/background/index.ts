/**
 * Service worker: side panel, menu chuột phải và điều phối job trích xuất.
 * Việc đọc trang vẫn do side panel thực hiện khi người dùng bấm; job LLM
 * chạy trong offscreen để không mất khi side panel đóng hoặc SW bị tạm dừng.
 */
import {
  ACTION_TITLE,
  EXTRACTION_JOB_KEY,
  EXTRACTION_NOTIFICATION_ID,
  PAGE_MENU_ID,
  PENDING_CAPTURE_KEY,
  PENDING_OPEN_KEY,
  SELECTION_MENU_ID,
} from '../../shared/constants';
import type { ExtractionJob, FilterRunMode } from '../../shared/contracts';
import type { PendingCapture, RuntimeMessage, RuntimeResponse } from '../../shared/messages';
import { RuntimeMessageSchema } from '../../shared/messages';
import {
  donePatch,
  isActiveJob,
  makeJob,
  patchJob,
  readJob,
  writeJob,
} from './jobs';
import {
  closeOffscreenDocument,
  ensureOffscreenDocument,
  sendToOffscreen,
} from './offscreen-document';
import {
  registerNotificationHandlers,
  showDoneNotification,
  showFailureNotification,
} from './notifications';

// Phải đăng ký ở top-level để Chrome đánh thức SW khi người dùng bấm notification.
registerNotificationHandlers();

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Đã xảy ra lỗi không xác định.';
}

function registerContextMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: SELECTION_MENU_ID,
      title: 'Quét sự kiện từ vùng chọn',
      contexts: ['selection'],
    });
    chrome.contextMenus.create({
      id: PAGE_MENU_ID,
      title: 'Quét nội dung trên trang',
      contexts: ['page'],
    });
  });
}

/** Không mở được panel từ menu: nhắc bằng badge thay vì phụ thuộc notification. */
function markPendingFallback(): void {
  void chrome.action.setBadgeBackgroundColor({ color: '#b54708' });
  void chrome.action.setBadgeText({ text: '!' });
  void chrome.action.setTitle({ title: 'Mở bảng điều khiển để quét nội dung' });
}

function clearActionHint(): void {
  void chrome.action.setBadgeText({ text: '' });
  void chrome.action.setTitle({ title: ACTION_TITLE });
}

chrome.runtime.onInstalled.addListener(() => {
  void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch((error: unknown) => {
    console.warn('[background] Không đặt được hành vi side panel', error);
  });
  void chrome.storage.session.remove(PENDING_CAPTURE_KEY);
  void chrome.storage.session.remove(PENDING_OPEN_KEY);
  void chrome.storage.session.remove(EXTRACTION_JOB_KEY);
  void chrome.notifications.clear(EXTRACTION_NOTIFICATION_ID).catch(() => undefined);
  void closeOffscreenDocument().catch(() => undefined);
  registerContextMenus();
});

chrome.runtime.onStartup.addListener(() => {
  void chrome.storage.session.remove(PENDING_CAPTURE_KEY);
  registerContextMenus();
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const isSelection = info.menuItemId === SELECTION_MENU_ID;
  const isPage = info.menuItemId === PAGE_MENU_ID;
  if (!isSelection && !isPage) return;
  const tabId = tab?.id;
  if (tabId === undefined) return;

  const pending: PendingCapture = {
    mode: isSelection ? 'selection' : 'page',
    ...(isSelection ? { selectionText: info.selectionText ?? '' } : {}),
    requestedAt: Date.now(),
  };

  // Ghi cờ và gọi open() ngay trong cùng user gesture; không await storage trước open().
  void chrome.storage.session.set({ [PENDING_CAPTURE_KEY]: pending });
  chrome.sidePanel
    .open({ tabId })
    .then(() => {
      clearActionHint();
    })
    .catch((error: unknown) => {
      console.warn('[background] Không mở được side panel từ context menu', error);
      markPendingFallback();
    });
});

let startingJob = false;
/** Chỉ một thao tác kết thúc (done/failed/cancelled/huỷ) được ghi job tại một thời điểm. */
let finishingJob = false;
/** Job đã được yêu cầu huỷ; chặn message hoàn tất đến muộn hồi sinh job. */
const cancelledJobIds = new Set<string>();

function beginFinish(): boolean {
  if (finishingJob) return false;
  finishingJob = true;
  return true;
}

function endFinish(): void {
  finishingJob = false;
}

async function handleRun(message: {
  type: 'RUN_EXTRACTION';
  documentId: string;
  filterRunMode?: FilterRunMode;
}): Promise<RuntimeResponse> {
  if (startingJob) {
    return { ok: false, error: 'Đang bắt đầu một lần trích xuất khác.' };
  }
  startingJob = true;
  try {
    const current = await readJob();
    if (isActiveJob(current)) {
      return { ok: false, error: 'Đang có một lần trích xuất chạy. Hãy chờ hoặc huỷ trước.' };
    }

    cancelledJobIds.clear();
    const job = await writeJob(makeJob(message.documentId));
    void chrome.notifications.clear(EXTRACTION_NOTIFICATION_ID).catch(() => undefined);
    const wasCancelled = async (): Promise<boolean> => {
      if (!cancelledJobIds.has(job.jobId)) return false;
      // Huỷ có thể đến trong lúc đang tạo/gửi job; đóng offscreen để nó không chạy tiếp.
      await closeOffscreenDocument().catch(() => undefined);
      return true;
    };
    try {
      await ensureOffscreenDocument();
      if (await wasCancelled()) return { ok: true, jobId: job.jobId };
      await sendToOffscreen({
        to: 'offscreen',
        type: 'RUN_EXTRACTION',
        jobId: job.jobId,
        documentId: message.documentId,
        ...(message.filterRunMode ? { filterRunMode: message.filterRunMode } : {}),
      });
      if (await wasCancelled()) return { ok: true, jobId: job.jobId };
      return { ok: true, jobId: job.jobId };
    } catch (error) {
      if (await wasCancelled()) return { ok: true, jobId: job.jobId };
      if (!beginFinish()) return { ok: true, jobId: job.jobId };
      let failed: ExtractionJob | null = null;
      try {
        const latest = await readJob();
        if (latest && latest.jobId === job.jobId && isActiveJob(latest)) {
          const next = patchJob(latest, {
            status: 'failed',
            stage: 'Không khởi động được tiến trình nền.',
            error: errorMessage(error),
          });
          await closeOffscreenDocument().catch(() => undefined);
          await writeJob(next);
          failed = next;
        }
      } finally {
        endFinish();
      }
      if (failed) await showFailureNotification(failed);
      return failed
        ? { ok: false, error: failed.error ?? errorMessage(error) }
        : { ok: true, jobId: job.jobId };
    }
  } finally {
    startingJob = false;
  }
}

async function handleCancel(jobId: string): Promise<RuntimeResponse> {
  if (!beginFinish()) return { ok: true };
  try {
    const current = await readJob();
    if (!current || current.jobId !== jobId || !isActiveJob(current)) return { ok: true };

    cancelledJobIds.add(jobId);
    // Gửi tín hiệu huỷ để provider dừng sớm, nhưng vẫn đóng offscreen và ghi trạng thái
    // ngay: nếu offscreen đã chết hoặc bỏ lỡ message, job không bị kẹt `running`.
    await sendToOffscreen({ to: 'offscreen', type: 'CANCEL_EXTRACTION', jobId }).catch(
      (error: unknown) => {
        console.warn('[background] Không gửi được tín hiệu huỷ tới offscreen', error);
      },
    );
    await closeOffscreenDocument().catch(() => undefined);

    // Có thể offscreen/notification khác đã ghi trạng thái cuối trong lúc chờ.
    const latest = await readJob();
    if (!latest || latest.jobId !== jobId || !isActiveJob(latest)) return { ok: true };
    const cancelled = patchJob(latest, {
      status: 'cancelled',
      stage: 'Đã huỷ trích xuất.',
      error: null,
    });
    await writeJob(cancelled);
    return { ok: true };
  } finally {
    endFinish();
  }
}

async function handleProgress(message: Extract<RuntimeMessage, { type: 'JOB_PROGRESS' }>): Promise<void> {
  if (cancelledJobIds.has(message.jobId)) return;
  const current = await readJob();
  if (!current || current.jobId !== message.jobId || !isActiveJob(current)) return;
  await writeJob(
    patchJob(current, {
      status: message.status,
      stage: message.stage,
      chunkIndex: message.chunkIndex,
      chunkCount: message.chunkCount,
      error: null,
    }),
  );
}

async function handleDone(message: Extract<RuntimeMessage, { type: 'JOB_DONE' }>): Promise<void> {
  if (!beginFinish()) return;
  let done: ExtractionJob | null = null;
  try {
    if (cancelledJobIds.has(message.jobId)) return;
    const current = await readJob();
    // Job đã bị huỷ/lỗi trong lúc offscreen chạy xong: không hồi sinh thành `done`.
    if (!current || current.jobId !== message.jobId || !isActiveJob(current)) return;

    // Đóng offscreen trước khi ghi trạng thái cuối để lần chạy mới không gặp tiến trình cũ.
    await closeOffscreenDocument().catch(() => undefined);
    const latest = await readJob();
    if (!latest || latest.jobId !== message.jobId || !isActiveJob(latest)) return;

    const next = patchJob(latest, donePatch(message));
    await writeJob(next);
    done = next;
  } finally {
    endFinish();
  }
  if (done) await showDoneNotification(done);
}

async function handleFailed(message: Extract<RuntimeMessage, { type: 'JOB_FAILED' }>): Promise<void> {
  if (!beginFinish()) return;
  let failed: ExtractionJob | null = null;
  try {
    if (cancelledJobIds.has(message.jobId)) return;
    const current = await readJob();
    if (!current || current.jobId !== message.jobId || !isActiveJob(current)) return;

    await closeOffscreenDocument().catch(() => undefined);
    const latest = await readJob();
    if (!latest || latest.jobId !== message.jobId || !isActiveJob(latest)) return;

    const next = patchJob(latest, {
      status: 'failed',
      stage: 'Trích xuất thất bại.',
      error: message.error,
    });
    await writeJob(next);
    failed = next;
  } finally {
    endFinish();
  }
  if (failed) await showFailureNotification(failed);
}

async function handleCancelled(
  message: Extract<RuntimeMessage, { type: 'JOB_CANCELLED' }>,
): Promise<void> {
  // HandleCancel đã chịu trách nhiệm ghi trạng thái; bỏ qua message đến muộn.
  if (cancelledJobIds.has(message.jobId)) return;
  if (!beginFinish()) return;
  try {
    const current = await readJob();
    if (!current || current.jobId !== message.jobId || !isActiveJob(current)) return;

    await closeOffscreenDocument().catch(() => undefined);
    const latest = await readJob();
    if (!latest || latest.jobId !== message.jobId || !isActiveJob(latest)) return;
    const cancelled = patchJob(latest, {
      status: 'cancelled',
      stage: 'Đã huỷ trích xuất.',
      error: null,
    });
    await writeJob(cancelled);
  } finally {
    endFinish();
  }
}

function respond(promise: Promise<RuntimeResponse>, sendResponse: (response: RuntimeResponse) => void): true {
  promise
    .then(sendResponse)
    .catch((error: unknown) => sendResponse({ ok: false, error: errorMessage(error) }));
  return true;
}

function respondVoid(promise: Promise<void>, sendResponse: (response: RuntimeResponse) => void): true {
  promise
    .then(() => sendResponse({ ok: true }))
    .catch((error: unknown) => sendResponse({ ok: false, error: errorMessage(error) }));
  return true;
}

chrome.runtime.onMessage.addListener((raw: unknown, _sender, sendResponse) => {
  const parsed = RuntimeMessageSchema.safeParse(raw);
  if (!parsed.success) return false;
  const message = parsed.data;
  if (message.to !== 'background') return false;

  switch (message.type) {
    case 'RUN_EXTRACTION':
      return respond(handleRun(message), sendResponse);
    case 'CANCEL_EXTRACTION':
      return respond(handleCancel(message.jobId), sendResponse);
    case 'JOB_PROGRESS':
      return respondVoid(handleProgress(message), sendResponse);
    case 'JOB_DONE':
      return respondVoid(handleDone(message), sendResponse);
    case 'JOB_FAILED':
      return respondVoid(handleFailed(message), sendResponse);
    case 'JOB_CANCELLED':
      return respondVoid(handleCancelled(message), sendResponse);
    default:
      return false;
  }
});
