import { FILTER_MODES } from '../../shared/contracts';
import type { FilterMode, FilterSettings } from '../../shared/contracts';
import { FILTER_MODE_TEXT } from '../../shared/constants';
import {
  badge,
  escapeHtml,
  field,
  icon,
  secondaryButton,
  sectionHeader,
  textInput,
} from '../components';

const MODE_HINT: Record<FilterMode, string> = {
  off: 'Không gọi bước sàng lọc.',
  report: 'Luôn gửi toàn văn cho LLM, chỉ ghi nhận kết luận.',
  screen: 'Bỏ qua lần gọi LLM khi chắc chắn không có nội dung công việc.',
};

function modeOption(mode: FilterMode, current: FilterMode): string {
  return `<label class="provider-option">
    <input class="provider-option__input" type="radio" name="filterMode" value="${mode}" ${
      mode === current ? 'checked' : ''
    }>
    <span class="provider-option__body">
      <span class="provider-option__title">${escapeHtml(FILTER_MODE_TEXT[mode])}${
        mode === 'screen' ? badge('Mặc định', 'success') : ''
      }</span>
      <span class="muted small">${escapeHtml(MODE_HINT[mode])}</span>
    </span>
  </label>`;
}

/**
 * Card cài đặt bước sàng lọc (kế hoạch §9.1). Chỉ đọc/ghi cấu hình;
 * việc nối vào job trích xuất thuộc P5.
 */
export function filterSettingsCard(settings: FilterSettings): string {
  return `<section class="card">
    ${sectionHeader('Sàng lọc nội dung (PhoBERT)')}
    <p class="muted small">Máy chủ Python phân loại từng câu thành “câu giao việc”, chạy trên chính máy bạn. Nội dung chỉ được gửi tới dịch vụ cục bộ.</p>
    <p class="muted small">Khi tài liệu có nội dung công việc, LLM vẫn nhận toàn văn; bước này chỉ quyết định có gọi LLM hay không.</p>

    <form id="filter-settings-form" class="form" novalidate>
      <fieldset class="provider-choices">
        <legend class="provider-choices__legend">Chế độ</legend>
        ${FILTER_MODES.map((mode) => modeOption(mode, settings.mode)).join('')}
      </fieldset>

      ${field({
        id: 'filter-endpoint',
        label: 'Địa chỉ máy chủ',
        control: textInput('filter-endpoint', 'filterEndpoint', settings.endpoint, {
          placeholder: 'http://127.0.0.1:8081',
        }),
        hint: 'Chỉ hỗ trợ 127.0.0.1 hoặc localhost ở cổng 8000/8081 (đã khai báo quyền trong manifest).',
      })}

      <div class="grid-2">
        ${field({
          id: 'filter-timeout',
          label: 'Timeout (ms)',
          control: textInput('filter-timeout', 'filterTimeout', String(settings.timeoutMs), {
            type: 'number',
            min: '1000',
          }),
        })}
        ${field({
          id: 'filter-skip-confidence',
          label: 'Ngưỡng bỏ qua (0–1)',
          control: textInput(
            'filter-skip-confidence',
            'filterSkipConfidence',
            String(settings.skipConfidence),
            { type: 'number', min: '0.5' },
          ),
        })}
        ${field({
          id: 'filter-min-sentences',
          label: 'Số câu tối thiểu',
          control: textInput(
            'filter-min-sentences',
            'filterMinSentences',
            String(settings.minSentencesToSkip),
            { type: 'number', min: '1' },
          ),
        })}
      </div>

      <div class="form__actions">
        <button type="submit" class="btn btn--primary">${icon('check')}<span>Lưu cài đặt</span></button>
        ${secondaryButton('check-filter', 'Kiểm tra kết nối', 'link')}
      </div>
      <div id="filter-health" class="llm-health" role="status" aria-live="polite"></div>
    </form>
  </section>`;
}
