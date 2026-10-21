import { LABEL_TEXT } from '../../shared/constants';
import { LABELS } from '../../shared/contracts';
import { editingEvent } from '../store';
import type { AppState } from '../store';
import { escapeAttr, escapeHtml, icon, secondaryButton } from '../components';
import { formatCharCount, shorten } from '../format';

function errorSummary(errors: Record<string, string>): string {
  const messages = [...new Set(Object.values(errors))];
  if (messages.length === 0) return '';
  return `<div class="alert alert--danger" role="alert">
    ${icon('alert')}
    <div><strong>Chưa lưu được sự kiện.</strong><ul>${messages
      .map((message) => `<li>${escapeHtml(message)}</li>`)
      .join('')}</ul></div>
  </div>`;
}

export function eventFormView(state: AppState): string {
  const form = state.eventForm;
  const values = form.values;
  const errors = form.errors;
  const editing = editingEvent(state);
  const source = form.sourceDocumentId
    ? state.documents.find((doc) => doc.documentId === form.sourceDocumentId) ?? null
    : null;

  const profileOptions =
    state.profiles.length === 0
      ? `<p class="muted small">Chưa có hồ sơ. <button type="button" class="link-btn" data-action="goto-profiles">Tạo hồ sơ</button> để gắn vào sự kiện.</p>`
      : `<div class="check-list">
          ${state.profiles
            .map(
              (profile) => `<label class="check">
                <input type="checkbox" name="profileIds" value="${escapeAttr(profile.id)}" ${
                  values.profileIds.includes(profile.id) ? 'checked' : ''
                }>
                <span><strong>${escapeHtml(profile.name)}</strong>${
                  profile.role || profile.org
                    ? `<span class="muted"> · ${escapeHtml([profile.role, profile.org].filter(Boolean).join(' · '))}</span>`
                    : ''
                }</span>
              </label>`,
            )
            .join('')}
        </div>`;

  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>${editing ? 'Sửa sự kiện' : 'Sự kiện mới'}</h2>
        <p class="muted small">Sự kiện được lưu ở trạng thái Nháp để bạn kiểm tra lại.</p>
      </div>
      ${secondaryButton('cancel-event-form', 'Quay lại')}
    </div>
    ${errorSummary(errors)}
    <form id="event-form" class="card form" novalidate>
      <div class="field ${errors.title ? 'field--error' : ''}">
        <label class="field__label" for="event-title">Tiêu đề <span class="required">*</span></label>
        <input class="input" id="event-title" name="title" value="${escapeAttr(values.title)}" maxlength="120" placeholder="Ví dụ: Họp nhóm đồ án tại thư viện" autofocus>
        ${errors.title ? `<p class="field__error">${escapeHtml(errors.title)}</p>` : ''}
      </div>

      <div class="field">
        <label class="field__label" for="event-label">Nhãn</label>
        <select class="select" id="event-label" name="label">
          ${LABELS.map(
            (label) =>
              `<option value="${label}" ${values.label === label ? 'selected' : ''}>${LABEL_TEXT[label]}</option>`,
          ).join('')}
        </select>
        ${errors.label ? `<p class="field__error">${escapeHtml(errors.label)}</p>` : ''}
      </div>

      <div class="grid-2">
        <div class="field ${errors.start ? 'field--error' : ''}">
          <label class="field__label" for="event-start">Bắt đầu</label>
          <input class="input" id="event-start" name="start" type="datetime-local" value="${escapeAttr(values.start)}">
          ${errors.start ? `<p class="field__error">${escapeHtml(errors.start)}</p>` : ''}
        </div>
        <div class="field ${errors.end ? 'field--error' : ''}">
          <label class="field__label" for="event-end">Kết thúc</label>
          <input class="input" id="event-end" name="end" type="datetime-local" value="${escapeAttr(values.end)}">
          ${errors.end ? `<p class="field__error">${escapeHtml(errors.end)}</p>` : ''}
        </div>
      </div>
      <p class="field__hint">Bỏ trống nếu chưa rõ — ứng dụng sẽ ghi “chưa xác định”, không tự suy đoán.</p>

      <div class="field ${errors.duration ? 'field--error' : ''}">
        <label class="field__label" for="event-duration">Thời lượng (phút)</label>
        <input class="input" id="event-duration" name="duration" type="number" min="1" step="5" value="${escapeAttr(values.duration)}" placeholder="Ví dụ: 90">
        ${errors.duration ? `<p class="field__error">${escapeHtml(errors.duration)}</p>` : ''}
      </div>

      <div class="field ${errors.summary ? 'field--error' : ''}">
        <label class="field__label" for="event-summary">Tóm tắt</label>
        <textarea class="input input--textarea" id="event-summary" name="summary" rows="4" placeholder="Mỗi dòng một ý: chủ đề, yêu cầu, địa điểm, kết quả sau sự kiện…">${escapeHtml(values.summary)}</textarea>
        <p class="field__hint">Tối đa 5 ý, mỗi dòng một ý.</p>
        ${errors.summary ? `<p class="field__error">${escapeHtml(errors.summary)}</p>` : ''}
      </div>

      <div class="field">
        <span class="field__label">Hồ sơ liên quan</span>
        ${profileOptions}
      </div>

      ${
        source
          ? `<div class="field">
              <span class="field__label">Nguồn trích</span>
              <label class="check check--source">
                <input type="checkbox" name="attachSource" ${values.attachSource ? 'checked' : ''}>
                <span>
                  <strong>${escapeHtml(shorten(source.title, 70))}</strong>
                  <span class="muted"> · ${escapeHtml(formatCharCount(source.charCount))}</span>
                </span>
              </label>
            </div>`
          : ''
      }

      ${
        editing && editing.sources.length > 0
          ? `<p class="muted small">${icon('link')} Sự kiện này đang giữ ${editing.sources.length} nguồn trích đã lưu.</p>`
          : ''
      }

      <div class="form__actions">
        <button type="submit" class="btn btn--primary">${icon('check')}<span>${editing ? 'Lưu thay đổi' : 'Tạo sự kiện'}</span></button>
        <button type="button" class="btn btn--ghost" data-action="cancel-event-form">Huỷ</button>
      </div>
    </form>
  </div>`;
}
