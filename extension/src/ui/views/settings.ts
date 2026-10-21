import { METHOD_TEXT, SOURCE_TEXT } from '../../shared/constants';
import type { AppState } from '../store';
import { activeDocument } from '../store';
import { badge, escapeHtml, icon, secondaryButton, sectionHeader } from '../components';
import { formatCharCount } from '../format';

export function settingsView(state: AppState): string {
  const doc = activeDocument(state);
  return `<div class="stack">
    <div class="view-head">
      <div>
        <h2>Cài đặt & dữ liệu</h2>
        <p class="muted small">Bản demo lưu mọi thứ trong trình duyệt của bạn.</p>
      </div>
    </div>

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
          <p class="muted small">Xoá nội dung đã đọc, hồ sơ và sự kiện khỏi IndexedDB. Không thể hoàn tác.</p>
        </div>
        <button type="button" class="btn btn--danger" data-action="clear-all">${icon('trash')}<span>Xoá</span></button>
      </div>
    </section>

    <section class="card">
      ${sectionHeader('Giới hạn của bản demo')}
      <ul class="bullets">
        <li><strong>Không dùng mô hình học máy.</strong> Sự kiện do bạn nhập tay; nội dung trang chỉ được đọc và hiển thị.</li>
        <li><strong>Không có nhắc việc.</strong> Trường nhắc việc tồn tại trong dữ liệu nhưng chưa có <code>alarms</code>/<code>notifications</code>.</li>
        <li><strong>Không có Gmail/PDF.</strong> Dùng nút “Dán văn bản” cho email hoặc tài liệu.</li>
        <li><strong>Chỉ đọc khi bạn bấm.</strong> Quyền <code>activeTab</code> chỉ cấp cho tab đang mở, không đọc nền.</li>
        <li><strong>Không gửi dữ liệu đi đâu.</strong> Không có host permission, không gọi mạng.</li>
      </ul>
    </section>

    <section class="card card--muted">
      ${sectionHeader('Về ứng dụng')}
      <p class="small">Chrome Extension Manifest V3 · TypeScript + Vite · Readability + Zod · IndexedDB.</p>
      <p class="small muted">Phiên bản 0.1.0 — demo cho kế hoạch phát triển 7 sprint. Khi bổ sung mô hình, dữ liệu này sẽ đi qua
      classifier và LLM cục bộ (llama.cpp) trước khi thành sự kiện nháp.</p>
    </section>
  </div>`;
}
