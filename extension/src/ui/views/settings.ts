import { METHOD_TEXT, SOURCE_TEXT } from '../../shared/constants';
import type { AppState } from '../store';
import { activeDocument } from '../store';
import {
  badge,
  escapeHtml,
  field,
  icon,
  secondaryButton,
  sectionHeader,
  textInput,
} from '../components';
import { formatCharCount } from '../format';

function llmServerCard(state: AppState): string {
  const llm = state.llm;
  const health = state.llmHealth;
  const healthBox = health
    ? `<p class="alert ${health.status === 'ok' ? 'alert--success' : health.status === 'error' ? 'alert--danger' : ''}">
        ${health.status === 'checking' ? '<span class="spinner"></span>' : icon(health.status === 'ok' ? 'check' : 'alert')}
        <span>${escapeHtml(health.message)}</span>
      </p>`
    : '';

  return `<section class="card">
    ${sectionHeader('Máy chủ mô hình')}
    <p class="muted small">Trích sự kiện bằng mô hình chạy trên chính máy bạn. Bản này chỉ cấp quyền tới <code>http://127.0.0.1:8080</code>.</p>
    <form id="llm-settings-form" class="form" novalidate>
      ${field({
        id: 'llm-endpoint',
        label: 'Địa chỉ máy chủ',
        control: textInput('llm-endpoint', 'endpoint', llm.endpoint, {
          placeholder: 'http://127.0.0.1:8080',
        }),
        hint: 'Địa chỉ của llama-server. Đổi cổng khác sẽ cần cập nhật quyền của tiện ích.',
      })}
      ${field({
        id: 'llm-model',
        label: 'Tên model (không bắt buộc)',
        control: textInput('llm-model', 'model', llm.model, { placeholder: 'Để trống = model đang nạp' }),
        hint: 'Để trống để dùng đúng model llama-server đang nạp; chỉ nhập khi muốn ghi đè nhãn gửi kèm.',
      })}
      ${field({
        id: 'llm-api-key',
        label: 'API key',
        control: textInput('llm-api-key', 'apiKey', llm.apiKey, {
          type: 'password',
          placeholder: 'Để trống nếu máy chủ không đặt khoá',
        }),
        hint: 'Chỉ lưu trên máy này và gửi trong header Authorization.',
      })}
      <details class="about">
        <summary>Nâng cao</summary>
        <div class="grid-2">
          ${field({
            id: 'llm-temperature',
            label: 'Temperature',
            control: textInput('llm-temperature', 'temperature', String(llm.temperature), {
              type: 'number',
            }),
          })}
          ${field({
            id: 'llm-max-tokens',
            label: 'Token tối đa',
            control: textInput('llm-max-tokens', 'maxTokens', String(llm.maxTokens), {
              type: 'number',
            }),
          })}
          ${field({
            id: 'llm-timeout',
            label: 'Timeout (ms)',
            control: textInput('llm-timeout', 'timeoutMs', String(llm.timeoutMs), {
              type: 'number',
            }),
          })}
          ${field({
            id: 'llm-chunk-chars',
            label: 'Ký tự mỗi đoạn',
            control: textInput('llm-chunk-chars', 'chunkChars', String(llm.chunkChars), {
              type: 'number',
            }),
          })}
          ${field({
            id: 'llm-max-chunks',
            label: 'Số đoạn tối đa',
            control: textInput('llm-max-chunks', 'maxChunks', String(llm.maxChunks), {
              type: 'number',
            }),
          })}
        </div>
      </details>
      <div class="form__actions">
        <button type="submit" class="btn btn--primary">${icon('check')}<span>Lưu cài đặt</span></button>
        ${secondaryButton('check-llm', 'Kiểm tra kết nối', 'link')}
      </div>
      ${healthBox}
    </form>
  </section>`;
}

export function settingsView(state: AppState): string {
  const doc = activeDocument(state);
  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>Cài đặt & dữ liệu</h2>
        <p class="muted small">Dữ liệu được lưu trên thiết bị này.</p>
      </div>
    </div>

    ${llmServerCard(state)}

    <section class="card">
      ${sectionHeader('Dữ liệu cục bộ')}
      <dl class="detail-grid">
        <div><dt>Nội dung đã đọc</dt><dd>${state.documents.length}</dd></div>
        <div><dt>Hồ sơ</dt><dd>${state.profiles.length}</dd></div>
        <div><dt>Sự kiện</dt><dd>${state.events.length}</dd></div>
      </dl>
      ${
        doc
          ? `<p class="muted small">Lần đọc gần nhất: ${escapeHtml(doc.title)} · ${escapeHtml(
              formatCharCount(doc.charCount),
            )} · ${badge(METHOD_TEXT[doc.extractionMethod], 'info')} ${badge(SOURCE_TEXT[doc.source], 'muted')}</p>`
          : ''
      }
      <div class="card__actions">
        ${secondaryButton('export-data', 'Xuất JSON', 'download')}
        ${secondaryButton('import-data', 'Nhập JSON', 'upload')}
        <input type="file" id="import-file" accept="application/json,.json" hidden>
      </div>
      <div class="danger-zone">
        <div>
          <strong>Xoá toàn bộ dữ liệu</strong>
          <p class="muted small">Xoá nội dung đã đọc, hồ sơ và sự kiện khỏi trình duyệt. Không thể hoàn tác.</p>
        </div>
        <button type="button" class="btn btn--danger" data-action="clear-all">${icon('trash')}<span>Xoá</span></button>
      </div>
    </section>

    <section class="card">
      ${sectionHeader('Quyền riêng tư')}
      <ul class="bullets">
        <li><strong>Chỉ đọc khi bạn bấm.</strong> Trang chỉ được đọc khi bạn chủ động quét hoặc chọn menu chuột phải; không đọc nền.</li>
        <li><strong>Chỉ gửi tới máy của bạn.</strong> Nội dung chỉ được gửi tới máy chủ mô hình chạy trên chính máy bạn (<code>127.0.0.1</code>); không có máy chủ từ xa.</li>
      </ul>
    </section>

    <section class="card card--muted">
      ${sectionHeader('Về phiên bản này')}
      <details class="about">
        <summary>Thông tin phiên bản và giới hạn hiện tại</summary>
        <dl class="detail-grid about__grid">
          <div><dt>Phiên bản</dt><dd>0.1.0</dd></div>
          <div><dt>Nền tảng</dt><dd>Tiện ích Chrome (Manifest V3)</dd></div>
          <div><dt>Nơi lưu dữ liệu</dt><dd>Bộ nhớ cục bộ của trình duyệt trên máy này</dd></div>
        </dl>
        <p class="small"><strong>Giới hạn hiện tại</strong></p>
        <ul class="bullets small">
          <li>Sự kiện do máy đề xuất vẫn ở trạng thái Nháp cho tới khi bạn duyệt.</li>
          <li>Chưa có nhắc việc theo mốc thời gian.</li>
          <li>Chưa đọc trực tiếp Gmail hay tệp PDF/DOCX — hãy dùng “Dán văn bản”.</li>
        </ul>
        <p class="small muted">Mọi suy luận chạy trên máy này; nội dung không được gửi ra ngoài.</p>
      </details>
    </section>
  </div>`;
}
