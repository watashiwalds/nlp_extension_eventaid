import { LABEL_TEXT } from '../../shared/constants';
import { countByStatus, eventsForProfile, upcomingEvents } from '../../core/events';
import { relativeLabel } from '../../core/dates';
import { profileInitials, sortProfiles } from '../../core/profiles';
import type { AppState } from '../store';
import {
  emptyState,
  escapeAttr,
  escapeHtml,
  icon,
  primaryButton,
  sectionHeader,
} from '../components';
import { dayOfMonth, monthShort } from '../format';

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

function captureCta(): string {
  return `<section class="card">
    ${emptyState({
      iconName: 'scan',
      title: 'Chưa có nội dung nào',
      description: 'Mở một trang web rồi quét để lưu nội dung, hoặc dán văn bản từ email/tài liệu.',
      actions: primaryButton('goto-capture', 'Quét nội dung', 'scan'),
    })}
  </section>`;
}

function profileTabs(state: AppState): string {
  if (state.profiles.length === 0) return '';
  const profiles = sortProfiles(state.profiles);
  const current = state.overviewProfileId;
  const tab = (id: string, label: string) =>
    `<button type="button" class="profile-tab ${current === (id || null) ? 'profile-tab--active' : ''}" data-action="select-overview-profile" data-profile-id="${escapeAttr(id)}" aria-pressed="${current === (id || null)}">${escapeHtml(label)}</button>`;
  return `<div class="profile-tabs" role="group" aria-label="Kế hoạch theo hồ sơ">
    ${tab('', 'Tất cả')}
    ${profiles.map((profile) => tab(profile.id, profile.name)).join('')}
  </div>`;
}

function upcoming(state: AppState): string {
  const now = new Date();
  const profile = state.overviewProfileId
    ? state.profiles.find((item) => item.id === state.overviewProfileId) ?? null
    : null;
  const scoped = eventsForProfile(state.events, profile?.id ?? null);
  const events = upcomingEvents(scoped, now, 5);
  const title = profile ? `Kế hoạch của ${profile.name}` : 'Sắp diễn ra';
  const body =
    events.length === 0
      ? emptyState({
          iconName: 'calendar',
          title: profile ? `Chưa có kế hoạch cho ${profile.name}` : 'Chưa có sự kiện sắp diễn ra',
          description: profile
            ? 'Tạo sự kiện và gắn hồ sơ này để kế hoạch xuất hiện ở đây.'
            : 'Tạo sự kiện thủ công để bắt đầu theo dõi lịch trình.',
          actions: primaryButton('new-event', 'Tạo sự kiện', 'plus'),
        })
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
    ${sectionHeader(title, `<button type="button" class="link-btn" data-action="goto-events">Xem tất cả</button>`)}
    ${profile ? `<p class="muted small">Chỉ hiện sự kiện có gắn hồ sơ này. Số liệu phía trên vẫn tính toàn bộ.</p>` : ''}
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
        ? `<p class="muted small">Hồ sơ giúp gắn sự kiện với đúng người (bạn, gia đình, đồng nghiệp).</p>`
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
    ${state.documents.length === 0 ? captureCta() : ''}
    ${statsRow(state)}
    ${profileTabs(state)}
    ${upcoming(state)}
    ${profilesStrip(state)}
  </div>`;
}
