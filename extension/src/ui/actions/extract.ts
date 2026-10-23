import type { Event } from '../../shared/contracts';
import { candidateToEvent } from '../../core/extraction/normalize';
import { extractEvents } from '../../core/extraction/pipeline';
import { eventDedupInput } from '../../core/extraction/dedup';
import { isAbortedError } from '../../core/ports/inference';
import { LlamaCppProvider } from '../../platform/inference/llama-cpp';
import { saveEvent } from '../../platform/storage/db';
import { truncationText } from '../format';
import { activeDocument, showToast, store } from '../store';
import { messageOf } from './shared';

/**
 * Slice B: side panel gọi provider TRỰC TIẾP (chưa có offscreen).
 * Pipeline vẫn nằm trong `core/` nên Slice C chỉ đổi "ai gọi", không đổi logic.
 */

let controller: AbortController | null = null;

export function cancelExtractionAction(): void {
  controller?.abort();
}

export async function extractEventsAction(): Promise<void> {
  if (controller) return;

  const state = store.get();
  const document = activeDocument(state);
  if (!document) {
    showToast('error', 'Chưa có nội dung để trích xuất. Hãy quét trang hoặc dán văn bản trước.');
    return;
  }

  const current = controller = new AbortController();
  const provider = new LlamaCppProvider({
    endpoint: state.llm.endpoint,
    apiKey: state.llm.apiKey,
    model: state.llm.model,
    timeoutMs: state.llm.timeoutMs,
  });

  store.set({ extraction: { stage: 'Đang kiểm tra máy chủ mô hình…', chunkIndex: 0, chunkCount: 0 } });

  try {
    const health = await provider.health();
    if (!health.ok) {
      showToast('error', health.reason);
      return;
    }

    const now = new Date();
    const outcome = await extractEvents({
      document,
      profiles: state.profiles,
      settings: {
        chunkChars: state.llm.chunkChars,
        maxChunks: state.llm.maxChunks,
        maxTokens: state.llm.maxTokens,
        temperature: state.llm.temperature,
      },
      provider,
      now,
      signal: current.signal,
      existing: state.events.map(eventDedupInput),
      onProgress: (progress) => store.set({ extraction: progress }),
    });

    const processedChars = state.llm.chunkChars * outcome.chunkCount;
    const truncationNote = outcome.truncated ? ` ${truncationText(processedChars)}` : '';

    if (outcome.items.length === 0) {
      showToast(
        'info',
        (outcome.duplicates.length > 0
          ? 'Tất cả sự kiện tìm thấy đã có trong danh sách.'
          : 'Không tìm thấy sự kiện lịch trình nào trong nội dung này.') + truncationNote,
      );
      return;
    }

    store.set({
      extraction: {
        stage: `Đang lưu ${outcome.items.length} sự kiện…`,
        chunkIndex: outcome.chunkCount,
        chunkCount: outcome.chunkCount,
      },
    });

    const events: Event[] = outcome.items.map(({ candidate, run }) =>
      candidateToEvent(candidate, { document, run }, now),
    );
    for (const event of events) await saveEvent(event);

    store.set((latest) => ({
      ...latest,
      tab: 'events',
      events: [...events, ...latest.events],
    }));

    const duplicateNote =
      outcome.duplicates.length > 0 ? ` Bỏ qua ${outcome.duplicates.length} sự kiện trùng.` : '';
    showToast('success', `Đã lưu ${events.length} sự kiện nháp từ máy.${duplicateNote}${truncationNote}`);
  } catch (error) {
    if (isAbortedError(error)) {
      showToast('info', 'Đã huỷ trích xuất. Không lưu sự kiện nào.');
    } else {
      showToast('error', messageOf(error));
    }
  } finally {
    if (controller === current) controller = null;
    store.set({ extraction: null });
  }
}
