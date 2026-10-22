import { activeTabId, captureTab } from '../../platform/capture/tab';
import { parseCapture, parsePastedText } from '../../platform/capture/parse';
import { deleteDocument } from '../../platform/storage/db';
import { unlinkedDocuments } from '../../core/documents';
import { activeDocument, showToast, store } from '../store';
import { formatCharCount } from '../format';
import { documentSummary, messageOf, persistDocument, valueOf } from './shared';

let capturing = false;

export interface CaptureOptions {
  /** Bỏ qua Readability, lấy toàn bộ DOM theo yêu cầu người dùng. */
  forceRaw?: boolean;
  /** Vùng chọn do context menu lưu lại, dùng khi selection trên trang đã mất. */
  selectionFallback?: string;
  /** Menu cấp trang: bỏ qua vùng bôi đen còn sót trên trang. */
  ignoreSelection?: boolean;
}

export async function captureCurrentPage(options: CaptureOptions = {}): Promise<void> {
  if (capturing) return;
  capturing = true;
  store.set({ busy: 'Đang đọc trang…' });
  const started = performance.now();
  try {
    const tabId = await activeTabId();
    if (tabId === null) throw new Error('Không tìm thấy tab đang hoạt động.');
    const captured = await captureTab(tabId);
    const fallbackSelection = options.ignoreSelection
      ? ''
      : options.selectionFallback?.trim() ?? '';
    const payload = options.ignoreSelection
      ? { ...captured, selection: '' }
      : fallbackSelection && !captured.selection.trim()
        ? { ...captured, selection: fallbackSelection }
        : captured;
    const { document, usedFallback } = parseCapture(payload, { forceRaw: options.forceRaw });
    if (!document.text.trim()) {
      throw new Error(
        'Trang không có nội dung chữ để đọc. Hãy bôi đen phần cần lấy hoặc dùng “Dán văn bản”.',
      );
    }
    const elapsed = Math.round(performance.now() - started);
    const methodNote = options.forceRaw
      ? ' (toàn trang theo yêu cầu)'
      : usedFallback
        ? ' (toàn trang dự phòng)'
        : '';
    const sizeNote = captured.htmlTruncated
      ? ' Trang quá lớn nên chỉ lấy phần nội dung chính.'
      : '';
    const dynamicNote =
      captured.likelyDynamic || document.text.length < 200
        ? ' Nếu thiếu nội dung, hãy cuộn đến phần cần đọc, chờ trang tải xong rồi quét lại — hoặc bôi đen/dán phần đó.'
        : '';
    await persistDocument(
      document,
      `Đã đọc ${formatCharCount(document.charCount)} trong ${elapsed} ms${methodNote}.${sizeNote}${dynamicNote}`,
    );
  } catch (error) {
    showToast('error', messageOf(error));
  } finally {
    capturing = false;
    store.set({ busy: null });
  }
}

export async function savePastedText(form: HTMLFormElement): Promise<void> {
  const text = valueOf(form, 'text');
  if (!text.trim()) {
    showToast('error', 'Nội dung dán vào đang trống.');
    return;
  }
  store.set({ busy: 'Đang lưu nội dung…' });
  try {
    const document = parsePastedText(valueOf(form, 'title'), text);
    await persistDocument(document, `Đã lưu ${documentSummary(document)} từ văn bản dán.`);
  } catch (error) {
    showToast('error', messageOf(error));
  } finally {
    store.set({ busy: null });
  }
}

export function deleteActiveDocumentAction(): void {
  const doc = activeDocument(store.get());
  if (!doc) return;
  if (!window.confirm(`Xoá nội dung “${doc.title}”? Các sự kiện đã tạo vẫn được giữ.`)) return;
  void (async () => {
    try {
      await deleteDocument(doc.documentId);
      const documents = store.get().documents.filter((item) => item.documentId !== doc.documentId);
      store.set({ documents, activeDocumentId: documents[0]?.documentId ?? null });
      showToast('success', 'Đã xoá nội dung đã đọc.');
    } catch (error) {
      showToast('error', messageOf(error));
    }
  })();
}

export function selectDocument(documentId: string): void {
  if (!store.get().documents.some((doc) => doc.documentId === documentId)) return;
  store.set({ activeDocumentId: documentId, expandedDocument: false });
}

/** Xoá các nội dung không còn được sự kiện nào tham chiếu; giữ nguyên sự kiện. */
export function deleteUnlinkedDocumentsAction(): void {
  const state = store.get();
  const targets = unlinkedDocuments(state.documents, state.events);
  if (targets.length === 0) return;
  if (
    !window.confirm(
      `Xoá ${targets.length} nội dung đã quét không liên kết với sự kiện nào? Các sự kiện vẫn được giữ.`,
    )
  ) {
    return;
  }
  void (async () => {
    store.set({ busy: 'Đang xoá nội dung không liên kết…' });
    try {
      const ids = new Set(targets.map((doc) => doc.documentId));
      for (const id of ids) await deleteDocument(id);
      const documents = store.get().documents.filter((doc) => !ids.has(doc.documentId));
      const activeId =
        store.get().activeDocumentId && documents.some((doc) => doc.documentId === store.get().activeDocumentId)
          ? store.get().activeDocumentId
          : documents[0]?.documentId ?? null;
      store.set({ documents, activeDocumentId: activeId, expandedDocument: false });
      showToast('success', `Đã xoá ${targets.length} nội dung không liên kết.`);
    } catch (error) {
      showToast('error', messageOf(error));
    } finally {
      store.set({ busy: null });
    }
  })();
}
