import { LABEL_TEXT, STATUS_TEXT } from '../../shared/constants';
import { LABELS } from '../../shared/contracts';
import { allEventTags, filterEvents } from '../../core/events';
import { countDrafts, sortDraftsForReview } from '../../core/event-review';
import { duplicateSuggestionKey, suggestDuplicates } from '../../core/extraction/similar';
import type { DuplicateSuggestion } from '../../core/extraction/similar';
import type { AppState } from '../store';
import {
  emptyState,
  escapeAttr,
  escapeHtml,
  icon,
  primaryButton,
  secondaryButton,
} from '../components';
import { eventCard } from './event-card';
import { reviewBar } from './event-review';
import { eventFormView } from './event-form';

function filterBar(state: AppState): string {
  const filter = state.eventFilter;
  const tags = allEventTags(state.events);
  return `<form id="filter-form" class="filters">
    <div class="search">
      ${icon('search')}
      <input class="input input--search" type="search" name="query" value="${escapeAttr(
        filter.query,
      )}" placeholder="Tìm theo tiêu đề, tóm tắt, nguồn…">
    </div>
    <div class="filters__row">
      <select class="select" name="status" aria-label="Lọc theo trạng thái" ${
        state.reviewMode ? 'disabled' : ''
      }>
        ${
          state.reviewMode
            ? `<option value="nhap" selected>${STATUS_TEXT.nhap}</option>`
            : `<option value="all" ${filter.status === 'all' ? 'selected' : ''}>Mọi trạng thái</option>
        ${(['nhap', 'dang_theo_doi', 'hoan_thanh', 'huy'] as const)
          .map(
            (status) =>
              `<option value="${status}" ${filter.status === status ? 'selected' : ''}>${STATUS_TEXT[status]}</option>`,
          )
          .join('')}`
        }
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

function suggestionsFor(
  eventId: string,
  suggestions: Map<string, DuplicateSuggestion[]>,
  dismissed: string[],
): DuplicateSuggestion[] {
  return (suggestions.get(eventId) ?? []).filter(
    (suggestion) => !dismissed.includes(duplicateSuggestionKey(eventId, suggestion.event.id)),
  );
}

function reviewEmpty(): string {
  return emptyState({
    iconName: 'check',
    title: 'Đã duyệt hết nháp',
    description: 'Không còn sự kiện nháp nào khớp bộ lọc hiện tại. Quay lại danh sách để xem toàn bộ lịch.',
    actions: secondaryButton('exit-review', 'Quay lại danh sách', 'chevron'),
  });
}

export function eventsView(state: AppState): string {
  if (state.eventForm.open) return eventFormView(state);

  const draftCount = countDrafts(state.events);
  const filtered = filterEvents(state.events, state.eventFilter);
  const visible = state.reviewMode ? sortDraftsForReview(filtered) : filtered;
  const suggestions = suggestDuplicates(state.events);
  const selectedVisible = state.reviewMode
    ? visible.filter((event) => state.selectedDraftIds.includes(event.id))
    : [];
  const filtering =
    state.eventFilter.status !== 'all' ||
    state.eventFilter.label !== 'all' ||
    state.eventFilter.tag !== 'all' ||
    state.eventFilter.query.trim() !== '';

  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>${state.reviewMode ? 'Duyệt nháp' : 'Sự kiện'}</h2>
        <p class="muted small">${
          state.reviewMode
            ? `${visible.length} nháp đang hiển thị · ${selectedVisible.length} đã chọn`
            : `${state.events.length} sự kiện · lưu trên thiết bị này`
        }</p>
      </div>
      <div class="view-head__actions">
        ${
          !state.reviewMode && draftCount > 0
            ? secondaryButton('enter-review', `Duyệt nháp (${draftCount})`, 'check')
            : ''
        }
        ${state.reviewMode ? '' : primaryButton('new-event', 'Tạo sự kiện', 'plus')}
      </div>
    </div>
    ${state.events.length > 0 ? filterBar(state) : ''}
    ${
      state.reviewMode
        ? reviewBar(visible.length, selectedVisible.length)
        : ''
    }
    ${
      visible.length === 0
        ? state.reviewMode
          ? reviewEmpty()
          : emptyState({
              iconName: 'calendar',
              title: filtering ? 'Không có sự kiện phù hợp' : 'Chưa có sự kiện',
              description: filtering
                ? 'Thử bỏ bộ lọc hoặc đổi từ khoá tìm kiếm.'
                : 'Tạo sự kiện thủ công từ nội dung đã đọc, hoặc nhập tay hoàn toàn.',
              actions: filtering
                ? secondaryButton('clear-filter', 'Xoá bộ lọc')
                : primaryButton('new-event', 'Tạo sự kiện đầu tiên', 'plus'),
            })
        : `<div class="event-list">${visible
            .map((event) =>
              eventCard(event, state, {
                selectable: state.reviewMode,
                selected: state.selectedDraftIds.includes(event.id),
                suggestions:
                  event.status === 'nhap'
                    ? suggestionsFor(event.id, suggestions, state.dismissedSuggestionKeys)
                    : [],
              }),
            )
            .join('')}</div>`
    }
  </div>`;
}
