import { activeTabId, captureTab } from '../../platform/capture/tab';
import { parseCapture, parsePastedText } from '../../platform/capture/parse';
import { deleteDocument } from '../../platform/storage/db';
import { activeDocument, showToast, store } from '../store';
import { formatCharCount } from '../format';
import { documentSummary, messageOf, persistDocument, valueOf } from './shared';

let capturing = false;

export async function captureCurrentPage(): Promise<void> {
  if (capturing) return;
  capturing = true;
  store.set({ busy: 'Đang đọc trang…' });
  const started = performance.now();
  try {
    const tabId = await activeTabId();
    if (tabId === null) throw new Error('Không tìm thấy tab đang hoạt động.');
    const payload = await captureTab(tabId);
    const { document, usedFallback } = parseCapture(payload);
    if (!document.text.trim()) {
      throw new Error(
        'Trang không có nội dung chữ để đọc. Hãy bôi đen phần cần lấy hoặc dùng “Dán văn bản”.',
      );
    }
    const elapsed = Math.round(performance.now() - started);
    await persistDocument(
      document,
      `Đã đọc ${formatCharCount(document.charCount)} trong ${elapsed} ms${
        usedFallback ? ' (DOM thô dự phòng)' : ''
      }.`,
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
