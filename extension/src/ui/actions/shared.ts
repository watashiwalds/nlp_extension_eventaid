import type { NormalizedDocument, SourceRef } from '../../shared/contracts';
import { saveDocument } from '../../platform/storage/db';
import { showToast, store } from '../store';
import { formatCharCount } from '../format';

export function messageOf(error: unknown): string {
  if (!(error instanceof Error)) return 'Đã xảy ra lỗi không xác định.';
  if (/cannot access|missing host permission|chrome:\/\//i.test(error.message)) {
    return 'Không đọc được trang này (trang hệ thống hoặc chưa được cấp quyền). Hãy mở một trang web thường rồi thử lại.';
  }
  return error.message;
}

export function valueOf(form: HTMLFormElement, name: string): string {
  const data = new FormData(form).get(name);
  return typeof data === 'string' ? data : '';
}

/**
 * Form đã render lại sau khi validate lỗi: đưa focus về ô sai đầu tiên.
 * Thay cho `autofocus` (VĐ-08) để không nhảy focus khi mở form.
 */
export function focusFirstError(formId: string): void {
  const field = document.querySelector<HTMLElement>(
    `#${formId} .field--error input, #${formId} .field--error select, #${formId} .field--error textarea`,
  );
  field?.focus();
}

export async function persistDocument(
  document: NormalizedDocument,
  successMessage: string,
): Promise<void> {
  await saveDocument(document);
  store.set({
    documents: [document, ...store.get().documents],
    activeDocumentId: document.documentId,
    tab: 'overview',
    pasteOpen: false,
    expandedDocument: false,
  });
  showToast('success', successMessage);
}

export function documentSummary(document: NormalizedDocument): string {
  return formatCharCount(document.charCount);
}

export function sourceFromDocument(document: NormalizedDocument): SourceRef {
  const quote = document.text.slice(0, 240).trim();
  return {
    documentId: document.documentId,
    kind: document.source,
    title: document.title,
    ...(document.sourceUrl ? { url: document.sourceUrl } : {}),
    ...(quote ? { quote } : {}),
  };
}
