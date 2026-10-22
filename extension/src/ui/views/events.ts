import { LABEL_TEXT, STATUS_TEXT, STATUS_TONE, UNCERTAIN_TEXT } from '../../shared/constants';
import { LABELS } from '../../shared/contracts';
import type { Event } from '../../shared/contracts';
import {
  allEventTags,
  eventTiming,
  filterEvents,
  isOngoing,
  isOverdue,
  nextStatusOptions,
} from '../../core/events';
import { formatDateTimeLong, formatDuration, relativeLabel } from '../../core/dates';
import type { AppState } from '../store';
import {
  badge,
  chip,
  emptyState,
  escapeAttr,
  escapeHtml,
  icon,
  primaryButton,
  secondaryButton,
} from '../components';
import { dayOfMonth, hostnameOf, monthShort, shorten } from '../format';
import { eventFormView } from './event-form';

const STATUS_ACTION_LABEL: Record<string, string> = {
  dang_theo_doi: 'Theo dõi',
  hoan_thanh: '✓ Đã xong',
  huy: 'Huỷ',
  nhap: 'Về nháp',
};

function profileNames(event: Event, state: AppState): string[] {
  return event.relatedProfiles
    .map((id) => state.profiles.find((profile) => profile.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

const TIMING_TEXT: Record<string, string> = {
  ongoing: 'Đang diễn ra',
  upcoming: 'Sắp diễn ra',
  past: 'Đã qua',
  unknown: 'Chưa xác định',
};

function timingText(event: Event): string {
  return TIMING_TEXT[eventTiming(event)] ?? 'Chưa xác định';
}

function eventDetail(event: Event, state: AppState): string {
  const names = profileNames(event, state);
  const ongoing = isOngoing(event);
  const endText = event.end?.value
    ? formatDateTimeLong(event.end.value)
    : event.durationMinutes
      ? `Kéo dài ${formatDuration(event.durationMinutes)}`
      : 'Chưa xác định';
  const uncertain = event.validation.uncertain;

  return `<div class="event-detail">
    <dl class="detail-grid">
      <div><dt>Bắt đầu</dt><dd>${event.start.value ? escapeHtml(formatDateTimeLong(event.start.value)) : '<span class="warn-text">Chưa xác định</span>'}</dd></div>
      <div><dt>Kết thúc</dt><dd>${escapeHtml(endText)}</dd></div>
      <div><dt>Diễn biến</dt><dd class="${ongoing ? 'ongoing-text' : ''}">${escapeHtml(timingText(event))}</dd></div>
      <div><dt>Nhãn</dt><dd>${escapeHtml(LABEL_TEXT[event.label])}</dd></div>
      <div><dt>Cập nhật</dt><dd>${escapeHtml(formatDateTimeLong(event.updatedAt))}</dd></div>
    </dl>

    <div class="detail-block">
      <h4>Tóm tắt</h4>
      ${
        event.summary.length > 0
          ? `<ul class="bullets">${event.summary.map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ul>`
          : `<p class="muted small">Chưa có tóm tắt.</p>`
      }
    </div>

    <div class="detail-block">
      <h4>Nhãn tuỳ chỉnh</h4>
      ${
        event.tags.length > 0
          ? `<div class="chips">${event.tags.map((tag) => chip(tag, 'label')).join('')}</div>`
          : `<p class="muted small">Chưa có nhãn tuỳ chỉnh.</p>`
      }
    </div>

    <div class="detail-block">
      <h4>Hồ sơ liên quan</h4>
      ${
        names.length > 0
          ? `<div class="chips">${names.map((name) => chip(name, 'label')).join('')}</div>`
          : `<p class="muted small">Chưa gắn hồ sơ.</p>`
      }
    </div>

    <div class="detail-block">
      <h4>Nguồn trích</h4>
      ${
        event.sources.length > 0
          ? event.sources
              .map(
                (source) => `<div class="source-ref">
                  <div class="source-ref__head">${icon('link')}
                    ${
                      source.url
                        ? `<a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(shorten(source.title, 60))}</a>`
                        : `<span>${escapeHtml(shorten(source.title, 60))}</span>`
                    }
                    ${source.url ? `<span class="muted small">${escapeHtml(hostnameOf(source.url))}</span>` : ''}
                  </div>
                  ${source.quote ? `<blockquote>${escapeHtml(shorten(source.quote, 220))}</blockquote>` : ''}
                </div>`,
              )
              .join('')
          : `<p class="muted small">Sự kiện tạo thủ công, không có nguồn trích.</p>`
      }
    </div>

    ${
      uncertain.length > 0
        ? `<div class="detail-block">
            <h4>Cần kiểm tra</h4>
            <div class="chips">${uncertain
              .map((code) => badge(UNCERTAIN_TEXT[code] ?? code, 'warning'))
              .join('')}</div>
          </div>`
        : ''
    }

    <div class="event-detail__actions">
      ${nextStatusOptions(event)
        .map(
          (status) =>
            `<button type="button" class="btn btn--small btn--${
              status === 'huy' ? 'danger-ghost' : 'secondary'
            }" data-action="set-status" data-status="${status}" data-id="${escapeAttr(event.id)}">${escapeHtml(
              STATUS_ACTION_LABEL[status] ?? STATUS_TEXT[status],
            )}</button>`,
        )
        .join('')}
      <span class="spacer"></span>
      <button type="button" class="icon-btn" data-action="edit-event" data-id="${escapeAttr(event.id)}" title="Sửa sự kiện" aria-label="Sửa sự kiện">${icon('edit')}</button>
      <button type="button" class="icon-btn icon-btn--danger" data-action="delete-event" data-id="${escapeAttr(event.id)}" title="Xoá sự kiện" aria-label="Xoá sự kiện">${icon('trash')}</button>
    </div>
  </div>`;
}

function eventCard(event: Event, state: AppState): string {
  const expanded = state.expandedEventId === event.id;
  const ongoing = isOngoing(event);
  const overdue = isOverdue(event);
  const names = profileNames(event, state);
  const start = event.start.value;
  const firstSummary = event.summary[0];
  const missingTime = !start;
  const hasChips = event.tags.length > 0 || names.length > 0 || missingTime;

  return `<article class="event-card ${expanded ? 'event-card--expanded' : ''} ${overdue ? 'event-card--overdue' : ''} ${ongoing ? 'event-card--ongoing' : ''}">
    <button type="button" class="event-card__main" data-action="toggle-event" data-id="${escapeAttr(event.id)}" aria-expanded="${expanded}">
      <span class="date-block">
        <span class="date-block__day">${start ? dayOfMonth(start) : '—'}</span>
        <span class="date-block__month">${start ? monthShort(start) : 'CHƯA RÕ'}</span>
      </span>
      <span class="event-card__body">
        <span class="event-card__title-row">
          <span class="event-card__title">${escapeHtml(event.title)}</span>
          ${badge(STATUS_TEXT[event.status], STATUS_TONE[event.status])}
        </span>
        <span class="event-card__meta">
          ${
            ongoing
              ? '<span class="ongoing-text">Đang diễn ra</span>'
              : start
                ? escapeHtml(relativeLabel(start))
                : '<span class="warn-text">Chưa có thời điểm</span>'
          }
          · ${escapeHtml(LABEL_TEXT[event.label])}
          ${overdue ? ' · <span class="danger-text">đã qua</span>' : ''}
        </span>
        ${firstSummary ? `<span class="event-card__summary">${escapeHtml(shorten(firstSummary, 96))}</span>` : ''}
        ${
          hasChips
            ? `<span class="chips">${event.tags.map((tag) => chip(tag, 'label')).join('')}${names
                .map((name) => chip(name))
                .join('')}${missingTime ? chip('thiếu thời điểm') : ''}</span>`
            : ''
        }
      </span>
      <span class="chevron ${expanded ? 'chevron--open' : ''}">${icon('chevron')}</span>
    </button>
    ${expanded ? eventDetail(event, state) : ''}
  </article>`;
}

function filterBar(state: AppState): string {
  const filter = state.eventFilter;
  const tags = allEventTags(state.events);
  return `<form id="filter-form" class="filters">
    <div class="search">
      ${icon('search')}
      <input class="input input--search" type="search" name="query" value="${escapeAttr(filter.query)}" placeholder="Tìm theo tiêu đề, tóm tắt, nguồn…">
    </div>
    <div class="filters__row">
      <select class="select" name="status" aria-label="Lọc theo trạng thái">
        <option value="all" ${filter.status === 'all' ? 'selected' : ''}>Mọi trạng thái</option>
        ${(['nhap', 'dang_theo_doi', 'hoan_thanh', 'huy'] as const)
          .map(
            (status) =>
              `<option value="${status}" ${filter.status === status ? 'selected' : ''}>${STATUS_TEXT[status]}</option>`,
          )
          .join('')}
      </select>
      <select class="select" name="label" aria-label="Lọc theo nhãn">
        <option value="all" ${filter.label === 'all' ? 'selected' : ''}>Mọi nhãn</option>
        ${LABELS.map(
          (label) => `<option value="${label}" ${filter.label === label ? 'selected' : ''}>${LABEL_TEXT[label]}</option>`,
        ).join('')}
      </select>
      <select class="select" name="tag" aria-label="Lọc theo nhãn tuỳ chỉnh">
        <option value="all" ${filter.tag === 'all' ? 'selected' : ''}>Mọi nhãn tuỳ chỉnh</option>
        ${tags
          .map(
            (tag) =>
              `<option value="${escapeAttr(tag)}" ${filter.tag === tag ? 'selected' : ''}>${escapeHtml(tag)}</option>`,
          )
          .join('')}
      </select>
    </div>
  </form>`;
}

export function eventsView(state: AppState): string {
  if (state.eventForm.open) return eventFormView(state);

  const visible = filterEvents(state.events, state.eventFilter);
  const filtering =
    state.eventFilter.status !== 'all' ||
    state.eventFilter.label !== 'all' ||
    state.eventFilter.tag !== 'all' ||
    state.eventFilter.query.trim() !== '';

  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>Sự kiện</h2>
        <p class="muted small">${state.events.length} sự kiện · lưu trên thiết bị này</p>
      </div>
      ${primaryButton('new-event', 'Tạo sự kiện', 'plus')}
    </div>
    ${state.events.length > 0 ? filterBar(state) : ''}
    ${
      visible.length === 0
        ? emptyState({
            iconName: 'calendar',
            title: filtering ? 'Không có sự kiện phù hợp' : 'Chưa có sự kiện',
            description: filtering
              ? 'Thử bỏ bộ lọc hoặc đổi từ khoá tìm kiếm.'
              : 'Tạo sự kiện thủ công từ nội dung đã đọc, hoặc nhập tay hoàn toàn.',
            actions: filtering
              ? secondaryButton('clear-filter', 'Xoá bộ lọc')
              : primaryButton('new-event', 'Tạo sự kiện đầu tiên', 'plus'),
          })
        : `<div class="event-list">${visible.map((event) => eventCard(event, state)).join('')}</div>`
    }
  </div>`;
}
