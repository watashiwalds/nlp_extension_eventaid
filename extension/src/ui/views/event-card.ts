import {
  CONFIDENCE_HINT,
  CONFIDENCE_TEXT,
  LABEL_TEXT,
  ORIGIN_TEXT,
  SOURCE_TEXT,
  STATUS_TEXT,
  STATUS_TONE,
  UNCERTAIN_TEXT,
} from '../../shared/constants';
import type { DateTimeRef, Event } from '../../shared/contracts';
import {
  eventTiming,
  isOngoing,
  isOverdue,
  nextStatusOptions,
} from '../../core/events';
import { formatDate, formatDateTimeLong, formatDuration, relativeLabel } from '../../core/dates';
import { eventConfidenceLevel } from '../../core/extraction/confidence';
import { DUPLICATE_REASON_TEXT } from '../../core/extraction/similar';
import type { DuplicateSuggestion } from '../../core/extraction/similar';
import type { AppState } from '../store';
import {
  badge,
  chip,
  escapeAttr,
  escapeHtml,
  icon,
} from '../components';
import { dayOfMonth, hostnameOf, monthShort, shorten } from '../format';

const STATUS_ACTION_LABEL: Record<string, string> = {
  dang_theo_doi: 'Theo dõi',
  hoan_thanh: '✓ Đã xong',
  huy: 'Huỷ',
  nhap: 'Về nháp',
};

const TIMING_TEXT: Record<string, string> = {
  ongoing: 'Đang diễn ra',
  upcoming: 'Sắp diễn ra',
  past: 'Đã qua',
  unknown: 'Chưa xác định',
};

export interface EventCardOptions {
  /** Chế độ Duyệt nháp: hiện checkbox chọn. */
  selectable: boolean;
  selected: boolean;
  /** Gợi ý gần trùng đã lọc theo “Giữ cả hai”. */
  suggestions: DuplicateSuggestion[];
}

function profileNames(event: Event, state: AppState): string[] {
  return event.relatedProfiles
    .map((id) => state.profiles.find((profile) => profile.id === id)?.name)
    .filter((name): name is string => Boolean(name));
}

function dateRefHtml(ref: DateTimeRef | null, fallback = ''): string {
  if (!ref) return escapeHtml(fallback) || '<span class="warn-text">Chưa xác định</span>';
  if (ref.value) return escapeHtml(formatDateTimeLong(ref.value));
  if (ref.date) {
    const source = ref.raw ? ` <span class="muted small">(nguồn: ${escapeHtml(ref.raw)})</span>` : '';
    return `${escapeHtml(formatDate(ref.date))} <span class="muted small">· chưa rõ giờ</span>${source}`;
  }
  if (ref.raw) {
    return `<span class="warn-text">Chưa xác định</span> <span class="muted small">(nguồn: ${escapeHtml(ref.raw)})</span>`;
  }
  return escapeHtml(fallback) || '<span class="warn-text">Chưa xác định</span>';
}

function confidenceBadge(event: Event): string {
  const level = eventConfidenceLevel(event);
  if (!level) return '';
  return `<span class="badge badge--info" title="${escapeAttr(CONFIDENCE_HINT)}" aria-label="Máy tự báo: ${escapeAttr(
    CONFIDENCE_TEXT[level],
  )}. ${escapeAttr(CONFIDENCE_HINT)}">Máy tự báo: ${escapeHtml(CONFIDENCE_TEXT[level])}</span>`;
}

function suggestionDate(event: Event): string {
  const start = event.start.value ?? event.start.date;
  return start ? formatDate(start) : 'chưa có thời điểm';
}

function duplicateBlock(event: Event, suggestions: DuplicateSuggestion[]): string {
  if (suggestions.length === 0) return '';
  return `<div class="detail-block">
    <h4>Có thể trùng</h4>
    <ul class="suggest-list">
      ${suggestions
        .map(
          (suggestion) => `<li>
            <div class="suggest-list__head">
              <strong>${escapeHtml(suggestion.event.title)}</strong>
              <span class="muted small">${escapeHtml(suggestionDate(suggestion.event))}${
                suggestion.event.sources[0] ? ` · ${escapeHtml(shorten(suggestion.event.sources[0].title, 40))}` : ''
              }</span>
            </div>
            <div class="chips">${suggestion.reasons
              .map((reason) => chip(DUPLICATE_REASON_TEXT[reason]))
              .join('')}</div>
            <div class="suggest-list__actions">
              <button type="button" class="btn btn--small btn--secondary" data-action="open-duplicate" data-id="${escapeAttr(
                suggestion.event.id,
              )}">Mở bản kia</button>
              <button type="button" class="btn btn--small btn--secondary" data-action="keep-both-duplicates" data-id="${escapeAttr(
                event.id,
              )}" data-other-id="${escapeAttr(suggestion.event.id)}">Giữ cả hai</button>
              ${
                event.status === 'nhap'
                  ? `<button type="button" class="btn btn--small btn--danger-ghost" data-action="delete-event" data-id="${escapeAttr(
                      event.id,
                    )}">Xoá bản này</button>`
                  : ''
              }
            </div>
          </li>`,
        )
        .join('')}
    </ul>
  </div>`;
}

function sourceBlock(event: Event): string {
  if (event.sources.length === 0) {
    return '<p class="muted small">Sự kiện tạo thủ công, không có nguồn trích.</p>';
  }
  return event.sources
    .map((source) => {
      const quote = source.quote ?? '';
      const quoteHtml =
        quote.length > 220
          ? `<details class="source-quote">
              <summary>Xem trích dẫn đầy đủ (${quote.length} ký tự)</summary>
              <blockquote>${escapeHtml(quote)}</blockquote>
            </details>`
          : quote
            ? `<blockquote>${escapeHtml(quote)}</blockquote>`
            : '';
      return `<div class="source-ref">
        <div class="source-ref__head">${icon('link')}
          ${
            source.url
              ? `<a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer noopener">${escapeHtml(
                  shorten(source.title, 60),
                )}</a>`
              : `<span>${escapeHtml(shorten(source.title, 60))}</span>`
          }
          ${source.url ? `<span class="muted small">${escapeHtml(hostnameOf(source.url))}</span>` : ''}
        </div>
        ${source.url ? '' : `<p class="muted small">Loại nguồn: ${escapeHtml(SOURCE_TEXT[source.kind])}</p>`}
        ${quoteHtml}
        ${
          source.url
            ? `<a class="btn btn--small btn--secondary source-ref__open" href="${escapeAttr(
                source.url,
              )}" target="_blank" rel="noreferrer noopener">Mở nguồn</a>`
            : ''
        }
      </div>`;
    })
    .join('');
}

function eventDetail(event: Event, state: AppState, suggestions: DuplicateSuggestion[]): string {
  const names = profileNames(event, state);
  const ongoing = isOngoing(event);
  const endText =
    event.end?.value || event.end?.date || event.end?.raw
      ? dateRefHtml(event.end)
      : event.durationMinutes
        ? escapeHtml(`Kéo dài ${formatDuration(event.durationMinutes)}`)
        : '<span class="warn-text">Chưa xác định</span>';
  const uncertain = event.validation.uncertain;

  return `<div class="event-detail">
    <dl class="detail-grid">
      <div><dt>Bắt đầu</dt><dd>${dateRefHtml(event.start)}</dd></div>
      <div><dt>Kết thúc</dt><dd>${endText}</dd></div>
      <div><dt>Diễn biến</dt><dd class="${ongoing ? 'ongoing-text' : ''}">${escapeHtml(
        TIMING_TEXT[eventTiming(event)] ?? 'Chưa xác định',
      )}</dd></div>
      <div><dt>Nhãn</dt><dd>${escapeHtml(LABEL_TEXT[event.label])}</dd></div>
      <div><dt>Nguồn tạo</dt><dd>${escapeHtml(ORIGIN_TEXT[event.origin])}${
        event.origin === 'llm' ? '' : ' <span class="muted small">· bạn tự nhập</span>'
      }</dd></div>
      <div><dt>Độ tin cậy</dt><dd>${
        event.origin === 'llm' ? confidenceBadge(event) : '<span class="muted small">—</span>'
      }</dd></div>
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
      ${sourceBlock(event)}
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

    ${event.status === 'nhap' ? duplicateBlock(event, suggestions) : ''}

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
      <button type="button" class="icon-btn" data-action="edit-event" data-id="${escapeAttr(
        event.id,
      )}" title="Sửa sự kiện" aria-label="Sửa sự kiện">${icon('edit')}</button>
      <button type="button" class="icon-btn icon-btn--danger" data-action="delete-event" data-id="${escapeAttr(
        event.id,
      )}" title="Xoá sự kiện" aria-label="Xoá sự kiện">${icon('trash')}</button>
    </div>
  </div>`;
}

export function eventCard(event: Event, state: AppState, options: EventCardOptions): string {
  const expanded = state.expandedEventId === event.id;
  const ongoing = isOngoing(event);
  const overdue = isOverdue(event);
  const names = profileNames(event, state);
  const start = event.start.value ?? event.start.date;
  const firstSummary = event.summary[0];
  const missingTime = !event.start.value;
  const missingProfile = event.validation.uncertain.includes('chua_ro_ho_so');
  const certaintyChip = confidenceBadge(event);
  const hasDuplicate = options.suggestions.length > 0;
  const hasChips =
    event.tags.length > 0 ||
    names.length > 0 ||
    missingTime ||
    missingProfile ||
    Boolean(certaintyChip) ||
    hasDuplicate;

  return `<article id="event-${escapeAttr(event.id)}" class="event-card ${
    expanded ? 'event-card--expanded' : ''
  } ${overdue ? 'event-card--overdue' : ''} ${ongoing ? 'event-card--ongoing' : ''}">
    <div class="event-card__row">
      ${
        options.selectable
          ? `<label class="draft-check"><input type="checkbox" class="checkbox" data-action="toggle-draft" data-id="${escapeAttr(
              event.id,
            )}" ${options.selected ? 'checked' : ''} aria-label="Chọn nháp ${escapeAttr(
              event.title,
            )}"></label>`
          : ''
      }
      <button type="button" class="event-card__main" data-action="toggle-event" data-id="${escapeAttr(
        event.id,
      )}" aria-expanded="${expanded}">
        <span class="date-block">
          <span class="date-block__day">${start ? dayOfMonth(start) : '—'}</span>
          <span class="date-block__month">${start ? monthShort(start) : 'CHƯA RÕ'}</span>
        </span>
        <span class="event-card__body">
          <span class="event-card__title-row">
            <span class="event-card__title">${escapeHtml(event.title)}</span>
            <span class="event-card__badges">
              ${event.origin === 'llm' ? badge(ORIGIN_TEXT.llm, 'info') : ''}
              ${badge(STATUS_TEXT[event.status], STATUS_TONE[event.status])}
            </span>
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
              ? `<span class="chips">${event.tags
                  .map((tag) => chip(tag, 'label'))
                  .join('')}${names.map((name) => chip(name)).join('')}${
                  missingTime ? chip('thiếu thời điểm') : ''
                }${missingProfile ? chip('chưa gắn hồ sơ') : ''}${
                  hasDuplicate ? '<span class="chip chip--warning">Có thể trùng</span>' : ''
                }${certaintyChip}</span>`
              : ''
          }
        </span>
        <span class="chevron ${expanded ? 'chevron--open' : ''}">${icon('chevron')}</span>
      </button>
    </div>
    ${expanded ? eventDetail(event, state, options.suggestions) : ''}
  </article>`;
}
