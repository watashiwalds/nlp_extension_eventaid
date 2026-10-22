import { DOCUMENT_PREVIEW_CHARS, METHOD_TEXT, SOURCE_TEXT } from '../../shared/constants';
import { relativeLabel } from '../../core/dates';
import { unlinkedDocuments } from '../../core/documents';
import type { AppState } from '../store';
import { activeDocument } from '../store';
import {
  badge,
  emptyState,
  escapeAttr,
  escapeHtml,
  icon,
  primaryButton,
  secondaryButton,
  sectionHeader,
} from '../components';
import { formatCharCount, hostnameOf, paragraphs, shorten } from '../format';

function captureMeta(state: AppState): string {
  const doc = activeDocument(state);
  if (!doc) return '';
  const methodTone = doc.extractionMethod === 'raw_dom' ? 'warning' : 'info';
  const host = hostnameOf(doc.sourceUrl);
  return `<div class="doc-meta">
    ${badge(METHOD_TEXT[doc.extractionMethod], methodTone)}
    ${badge(SOURCE_TEXT[doc.source], 'muted')}
    <span title="Số ký tự">${escapeHtml(formatCharCount(doc.charCount))}</span>
    ${host ? `<span class="doc-meta__host">${icon('link')}${escapeHtml(host)}</span>` : ''}
  </div>`;
}

function documentCard(state: AppState): string {
  const doc = activeDocument(state);
  const actions = doc
    ? `${primaryButton('new-event', 'Tạo sự kiện', 'plus')}
       ${secondaryButton('capture-page', 'Quét lại', 'scan')}
       ${secondaryButton('capture-raw', 'Dùng nội dung thô', 'layers')}
       ${secondaryButton('open-paste', 'Dán văn bản', 'copy')}
       <button type="button" class="icon-btn icon-btn--danger" data-action="delete-document" title="Xoá nội dung" aria-label="Xoá nội dung">${icon('trash')}</button>`
    : '';

  if (!doc) {
    return `<section class="card">
      ${sectionHeader('Nội dung đã đọc')}
      ${emptyState({
        iconName: 'document',
        title: 'Chưa đọc trang nào',
        description:
          'Mở một trang web (lịch, thông báo, email) rồi bấm “Quét trang đang mở”. Nội dung chỉ được đọc trên thiết bị này.',
        actions: `${primaryButton('capture-page', 'Quét trang đang mở', 'scan')}
          ${secondaryButton('open-paste', 'Dán văn bản', 'copy')}`,
      })}
    </section>`;
  }

  const preview =
    state.expandedDocument || doc.text.length <= DOCUMENT_PREVIEW_CHARS
      ? doc.text
      : doc.text.slice(0, DOCUMENT_PREVIEW_CHARS);
  const hidden = doc.text.length - preview.length;

  const selector =
    state.documents.length > 1
      ? `<select class="select select--compact" data-action="select-document" aria-label="Chọn nguồn gần đây">
          ${state.documents
            .map(
              (item) =>
                `<option value="${escapeAttr(item.documentId)}" ${
                  item.documentId === doc.documentId ? 'selected' : ''
                }>${escapeHtml(shorten(item.title, 42))}</option>`,
            )
            .join('')}
        </select>`
      : '';

  return `<section class="card">
    ${sectionHeader('Nội dung đã đọc', selector)}
    ${captureMeta(state)}
    ${
      doc.truncated
        ? `<p class="alert alert--warning">${icon('alert')} Nội dung dài hơn 200.000 ký tự và đã bị cắt bớt.</p>`
        : ''
    }
    ${
      doc.extractionMethod === 'raw_dom'
        ? `<p class="alert alert--warning">${icon('alert')} Nội dung đang lấy toàn bộ phần chữ trên trang (tự động dự phòng hoặc do bạn chọn), nên có thể kèm menu và quảng cáo. Nếu bị nhiễu, hãy bôi đen phần cần lấy rồi quét lại; nếu phần nội dung chính bị bỏ sót, dùng nút “Dùng nội dung thô”.</p>`
        : ''
    }
    <h3 class="doc-title">${escapeHtml(doc.title)}</h3>
    <p class="doc-time">Đọc lúc ${escapeHtml(relativeLabel(doc.capturedAt))}</p>
    <div class="doc-text ${state.expandedDocument ? 'doc-text--expanded' : ''}">${paragraphs(preview)}</div>
    <button type="button" class="link-btn" data-action="toggle-document">${
      state.expandedDocument
        ? 'Thu gọn'
        : hidden > 0
          ? `Xem toàn bộ (+${new Intl.NumberFormat('vi-VN').format(hidden)} ký tự)`
          : 'Xem toàn bộ'
    }</button>
    <div class="card__actions">${actions}</div>
  </section>`;
}

function pasteForm(): string {
  return `<section class="card">
    ${sectionHeader('Dán văn bản')}
    <form id="paste-form" class="form" novalidate>
      <div class="field">
        <label class="field__label" for="paste-title">Tiêu đề</label>
        <input class="input" id="paste-title" name="title" placeholder="Ví dụ: Thông báo lịch bảo vệ đồ án" maxlength="120">
      </div>
      <div class="field">
        <label class="field__label" for="paste-text">Nội dung <span class="required">*</span></label>
        <textarea class="input input--textarea" id="paste-text" name="text" rows="7" placeholder="Dán nội dung email, PDF hoặc đoạn văn bản cần lưu…" required></textarea>
        <p class="field__hint">Dùng khi trang chặn quyền đọc hoặc nội dung nằm trong email/PDF.</p>
      </div>
      <div class="form__actions">
        <button type="submit" class="btn btn--primary">${icon('check')}<span>Lưu nội dung</span></button>
        <button type="button" class="btn btn--ghost" data-action="close-paste">Huỷ</button>
      </div>
    </form>
  </section>`;
}

function cleanupRow(state: AppState): string {
  const unlinked = unlinkedDocuments(state.documents, state.events);
  if (unlinked.length === 0) return '';
  return `<div class="cleanup">
    <div>
      <strong>Nội dung không liên kết</strong>
      <p class="muted small">${unlinked.length} nội dung đã quét chưa được sự kiện nào dùng làm nguồn trích.</p>
    </div>
    <button type="button" class="btn btn--danger-ghost" data-action="delete-unlinked-documents">
      ${icon('trash')}<span>Xoá ${unlinked.length} nội dung</span>
    </button>
  </div>`;
}

export function captureView(state: AppState): string {
  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>Quét nội dung</h2>
        <p class="muted small">Đọc trang đang mở hoặc dán văn bản, rồi tạo sự kiện từ nội dung đó.</p>
      </div>
      ${primaryButton('capture-page', 'Quét trang đang mở', 'scan')}
    </div>
    ${documentCard(state)}
    ${cleanupRow(state)}
    ${state.pasteOpen ? pasteForm() : ''}
  </div>`;
}
