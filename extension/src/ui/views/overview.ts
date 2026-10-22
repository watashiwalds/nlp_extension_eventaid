import { DOCUMENT_PREVIEW_CHARS, LABEL_TEXT, METHOD_TEXT, SOURCE_TEXT } from '../../shared/constants';
import { countByStatus, upcomingEvents } from '../../core/events';
import { relativeLabel } from '../../core/dates';
import { profileInitials } from '../../core/profiles';
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
import { dayOfMonth, formatCharCount, hostnameOf, monthShort, paragraphs, shorten } from '../format';

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
          'Mở một trang web (lịch, thông báo, email) rồi bấm “Quét trang đang mở”. Nội dung được đọc bằng Readability, hoàn toàn cục bộ.',
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
        ? `<p class="alert alert--warning">${icon('alert')} Nội dung đang dùng toàn bộ DOM thay vì Readability (tự động dự phòng hoặc do bạn chọn), nên có thể kèm menu/quảng cáo. Nếu bị nhiễu, hãy bôi đen phần cần lấy rồi quét lại; nếu Readability bỏ sót nội dung, dùng nút “Dùng nội dung thô”.</p>`
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

function statsRow(state: AppState): string {
  const counts = countByStatus(state.events);
  const items = [
    { status: 'nhap', label: 'Nháp', value: counts.nhap, tone: 'muted' },
    { status: 'dang_theo_doi', label: 'Đang theo dõi', value: counts.dang_theo_doi, tone: 'primary' },
    { status: 'hoan_thanh', label: 'Hoàn thành', value: counts.hoan_thanh, tone: 'success' },
  ] as const;
  return `<div class="stats">
    ${items
      .map(
        (item) => `<button type="button" class="stat stat--${item.tone}" data-action="goto-events" data-status="${item.status}">
          <span class="stat__value">${item.value}</span>
          <span class="stat__label">${escapeHtml(item.label)}</span>
        </button>`,
      )
      .join('')}
  </div>`;
}

function upcoming(state: AppState): string {
  const now = new Date();
  const events = upcomingEvents(state.events, now, 3);
  const body =
    events.length === 0
      ? `<p class="muted small">Chưa có sự kiện nào sắp diễn ra. Tạo sự kiện thủ công để bắt đầu.</p>`
      : `<ul class="mini-list">
          ${events
            .map(
              (event) => `<li>
                <button type="button" class="mini-event" data-action="goto-events" data-event-id="${escapeAttr(event.id)}">
                  <span class="date-block date-block--sm">
                    <span class="date-block__day">${dayOfMonth(event.start.value ?? '')}</span>
                    <span class="date-block__month">${event.start.value ? monthShort(event.start.value) : '—'}</span>
                  </span>
                  <span class="mini-event__body">
                    <span class="mini-event__title">${escapeHtml(event.title)}</span>
                    <span class="mini-event__meta">${escapeHtml(
                      event.start.value ? relativeLabel(event.start.value, now) : 'Chưa có thời điểm',
                    )} · ${escapeHtml(LABEL_TEXT[event.label])}</span>
                  </span>
                  ${icon('chevron')}
                </button>
              </li>`,
            )
            .join('')}
        </ul>`;
  return `<section class="card">
    ${sectionHeader('Sắp diễn ra', `<button type="button" class="link-btn" data-action="goto-events">Xem tất cả</button>`)}
    ${body}
  </section>`;
}

function profilesStrip(state: AppState): string {
  const profiles = state.profiles;
  return `<section class="card">
    ${sectionHeader(
      'Hồ sơ của bạn',
      `<button type="button" class="link-btn" data-action="goto-profiles">${profiles.length ? 'Quản lý' : 'Tạo hồ sơ'}</button>`,
    )}
    ${
      profiles.length === 0
        ? `<p class="muted small">Hồ sơ giúp gắn sự kiện với đúng người (bạn, gia đình, đồng nghiệp). Demo chưa tự động so khớp.</p>`
        : `<div class="profile-strip">
            ${profiles
              .slice(0, 5)
              .map(
                (profile) => `<span class="avatar avatar--sm" title="${escapeAttr(profile.name)}">${escapeHtml(
                  profileInitials(profile.name),
                )}</span>`,
              )
              .join('')}
            <span class="muted small">${profiles.length} hồ sơ</span>
          </div>`
    }
  </section>`;
}

export function overviewView(state: AppState): string {
  return `<div class="stack">
    ${documentCard(state)}
    ${state.pasteOpen ? pasteForm() : ''}
    ${statsRow(state)}
    ${upcoming(state)}
    ${profilesStrip(state)}
  </div>`;
}
