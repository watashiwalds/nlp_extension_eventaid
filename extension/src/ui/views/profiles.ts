import type { AppState } from '../store';
import { editingProfile } from '../store';
import { profileInitials, profileSubtitle, sortProfiles } from '../../core/profiles';
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

function profileFormView(state: AppState): string {
  const form = state.profileForm;
  const values = form.values;
  const errors = form.errors;
  const editing = editingProfile(state);
  const errorList = [...new Set(Object.values(errors))];

  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>${editing ? 'Sửa hồ sơ' : 'Hồ sơ mới'}</h2>
        <p class="muted small">Hồ sơ mô tả một người để gắn vào sự kiện.</p>
      </div>
      ${secondaryButton('cancel-profile-form', 'Quay lại')}
    </div>
    ${
      errorList.length > 0
        ? `<div class="alert alert--danger" role="alert">${icon('alert')}<div><strong>Chưa lưu được hồ sơ.</strong><ul>${errorList
            .map((message) => `<li>${escapeHtml(message)}</li>`)
            .join('')}</ul></div></div>`
        : ''
    }
    <form id="profile-form" class="card form" novalidate>
      <div class="field ${errors.name ? 'field--error' : ''}">
        <label class="field__label" for="profile-name">Tên <span class="required">*</span></label>
        <input class="input" id="profile-name" name="name" value="${escapeAttr(values.name)}" maxlength="80" placeholder="Ví dụ: Nguyễn Minh An" autofocus>
        ${errors.name ? `<p class="field__error">${escapeHtml(errors.name)}</p>` : ''}
      </div>
      <div class="grid-2">
        <div class="field ${errors.role ? 'field--error' : ''}">
          <label class="field__label" for="profile-role">Chức vị</label>
          <input class="input" id="profile-role" name="role" value="${escapeAttr(values.role)}" maxlength="80" placeholder="Sinh viên">
          ${errors.role ? `<p class="field__error">${escapeHtml(errors.role)}</p>` : ''}
        </div>
        <div class="field ${errors.org ? 'field--error' : ''}">
          <label class="field__label" for="profile-org">Đơn vị</label>
          <input class="input" id="profile-org" name="org" value="${escapeAttr(values.org)}" maxlength="120" placeholder="Trường / công ty">
          ${errors.org ? `<p class="field__error">${escapeHtml(errors.org)}</p>` : ''}
        </div>
      </div>
      <div class="field ${errors.email ? 'field--error' : ''}">
        <label class="field__label" for="profile-email">Email</label>
        <input class="input" id="profile-email" name="email" type="email" value="${escapeAttr(values.email)}" placeholder="ban@example.com">
        ${errors.email ? `<p class="field__error">${escapeHtml(errors.email)}</p>` : ''}
      </div>
      <div class="field ${errors.nicknames ? 'field--error' : ''}">
        <label class="field__label" for="profile-nicknames">Biệt danh</label>
        <input class="input" id="profile-nicknames" name="nicknames" value="${escapeAttr(values.nicknames)}" placeholder="Cách nhau bằng dấu phẩy">
        <p class="field__hint">Dùng để nhận ra hồ sơ khi tên xuất hiện khác đi trong văn bản.</p>
        ${errors.nicknames ? `<p class="field__error">${escapeHtml(errors.nicknames)}</p>` : ''}
      </div>
      <div class="field ${errors.keywords ? 'field--error' : ''}">
        <label class="field__label" for="profile-keywords">Từ khoá</label>
        <input class="input" id="profile-keywords" name="keywords" value="${escapeAttr(values.keywords)}" placeholder="đồ án, lớp CNTT, câu lạc bộ…">
        ${errors.keywords ? `<p class="field__error">${escapeHtml(errors.keywords)}</p>` : ''}
      </div>
      <div class="field ${errors.notes ? 'field--error' : ''}">
        <label class="field__label" for="profile-notes">Ghi chú</label>
        <textarea class="input input--textarea" id="profile-notes" name="notes" rows="3" maxlength="500">${escapeHtml(values.notes)}</textarea>
        ${errors.notes ? `<p class="field__error">${escapeHtml(errors.notes)}</p>` : ''}
      </div>
      <div class="form__actions">
        <button type="submit" class="btn btn--primary">${icon('check')}<span>${editing ? 'Lưu thay đổi' : 'Tạo hồ sơ'}</span></button>
        <button type="button" class="btn btn--ghost" data-action="cancel-profile-form">Huỷ</button>
      </div>
    </form>
  </div>`;
}

function profileCard(profile: AppState['profiles'][number], state: AppState): string {
  const eventCount = state.events.filter((event) => event.relatedProfiles.includes(profile.id)).length;
  return `<article class="profile-card">
    <span class="avatar">${escapeHtml(profileInitials(profile.name))}</span>
    <div class="profile-card__body">
      <div class="profile-card__head">
        <h3>${escapeHtml(profile.name)}</h3>
        ${badge(`${eventCount} sự kiện`, eventCount > 0 ? 'primary' : 'muted')}
      </div>
      ${profileSubtitle(profile) ? `<p class="muted small">${escapeHtml(profileSubtitle(profile))}</p>` : ''}
      ${profile.email ? `<p class="muted small">${escapeHtml(profile.email)}</p>` : ''}
      ${
        profile.nicknames.length + profile.keywords.length > 0
          ? `<div class="chips">${[...profile.nicknames, ...profile.keywords]
              .map((item) => `<span class="chip">${escapeHtml(item)}</span>`)
              .join('')}</div>`
          : ''
      }
      ${profile.notes ? `<p class="profile-card__notes">${escapeHtml(profile.notes)}</p>` : ''}
    </div>
    <div class="profile-card__actions">
      <button type="button" class="icon-btn" data-action="edit-profile" data-id="${escapeAttr(profile.id)}" title="Sửa hồ sơ" aria-label="Sửa hồ sơ">${icon('edit')}</button>
      <button type="button" class="icon-btn icon-btn--danger" data-action="delete-profile" data-id="${escapeAttr(profile.id)}" title="Xoá hồ sơ" aria-label="Xoá hồ sơ">${icon('trash')}</button>
    </div>
  </article>`;
}

export function profilesView(state: AppState): string {
  if (state.profileForm.open) return profileFormView(state);

  const profiles = sortProfiles(state.profiles);
  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>Hồ sơ</h2>
        <p class="muted small">${profiles.length} hồ sơ · dùng để gắn sự kiện với người liên quan</p>
      </div>
      ${primaryButton('new-profile', 'Tạo hồ sơ', 'plus')}
    </div>
    ${
      profiles.length === 0
        ? emptyState({
            iconName: 'user',
            title: 'Chưa có hồ sơ',
            description:
              'Tạo hồ sơ cho bản thân (và người thân, đồng nghiệp) để mỗi sự kiện biết liên quan đến ai.',
            actions: primaryButton('new-profile', 'Tạo hồ sơ đầu tiên', 'plus'),
          })
        : `<div class="profile-list">${profiles.map((profile) => profileCard(profile, state)).join('')}</div>`
    }
    <section class="card card--muted">
      ${sectionHeader('Vì sao cần hồ sơ?')}
      <p class="small muted">Khi có mô hình trích xuất, hồ sơ là danh sách đóng để đối chiếu tên, biệt danh và từ khoá —
      tránh gắn sự kiện cho người không liên quan. Bản demo chỉ lưu và hiển thị, chưa tự so khớp.</p>
    </section>
  </div>`;
}
