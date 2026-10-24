import { secondaryButton } from '../components';

/**
 * Thanh duyệt nháp + hướng dẫn. Không giữ state riêng;
 * checkbox tổng được đồng bộ `indeterminate` sau render bởi `syncReviewSelectionUi()`.
 */
export function reviewBar(visibleCount: number, selectedVisible: number): string {
  const allSelected = visibleCount > 0 && selectedVisible === visibleCount;
  const none = selectedVisible === 0;

  return `<section class="review-bar" aria-label="Duyệt sự kiện nháp">
    <div class="review-bar__head">
      <label class="review-select-all">
        <input type="checkbox" class="checkbox" id="select-all-drafts" data-action="select-all-drafts" ${
          allSelected ? 'checked' : ''
        }>
        <span>Chọn tất cả đang hiển thị</span>
      </label>
      <span class="muted small">${selectedVisible}/${visibleCount} đã chọn</span>
    </div>
    <div class="review-bar__actions">
      <button type="button" class="btn btn--primary" data-action="approve-selected-drafts" ${
        none ? 'disabled' : ''
      }>Duyệt đã chọn (${selectedVisible})</button>
      <button type="button" class="btn btn--danger-ghost" data-action="delete-selected-drafts" ${
        none ? 'disabled' : ''
      }>Xoá nháp đã chọn</button>
      ${secondaryButton('exit-review', 'Quay lại danh sách', 'chevron')}
    </div>
    <p class="muted small">Bỏ chọn không xoá sự kiện. Duyệt nháp chỉ chuyển trạng thái sang “Đang theo dõi”;
      nhắc việc sẽ được thêm ở bước sau.</p>
    <p class="muted small">Bạn có thể đổi từ khoá/nhãn ở trên; mọi thay đổi trạng thái đều do bạn xác nhận.
      Muốn ẩn tạm thời thay vì xoá, dùng nút <strong>Huỷ</strong> trong chi tiết để chuyển sang “Đã huỷ”.</p>
  </section>`;
}
