import type { EventStatus, ExtractionMethod, Label, SourceKind } from './contracts';

export const APP_NAME = 'Lịch trình cá nhân';

export const LABEL_TEXT: Record<Label, string> = {
  công_vụ: 'Công vụ',
  giải_trí: 'Giải trí',
  cá_nhân: 'Cá nhân',
  kỷ_niệm: 'Kỷ niệm',
  khác: 'Khác',
};

export const STATUS_TEXT: Record<EventStatus, string> = {
  nhap: 'Nháp',
  dang_theo_doi: 'Đang theo dõi',
  hoan_thanh: 'Hoàn thành',
  huy: 'Đã huỷ',
};

export const STATUS_TONE: Record<EventStatus, 'muted' | 'primary' | 'success' | 'danger'> = {
  nhap: 'muted',
  dang_theo_doi: 'primary',
  hoan_thanh: 'success',
  huy: 'danger',
};

export const METHOD_TEXT: Record<ExtractionMethod, string> = {
  readability: 'Readability',
  raw_dom: 'DOM thô (dự phòng)',
  selection: 'Vùng bôi đen',
  paste: 'Dán tay',
};

export const SOURCE_TEXT: Record<SourceKind, string> = {
  web_page: 'Trang web',
  selection: 'Vùng chọn',
  paste: 'Văn bản dán',
};

export const UNCERTAIN_TEXT: Record<string, string> = {
  chua_ro_thoi_diem: 'Chưa rõ thời điểm bắt đầu',
  chua_ro_ket_thuc: 'Chưa rõ thời điểm kết thúc',
  chua_ro_dia_diem: 'Chưa rõ địa điểm',
  chua_ro_ho_so: 'Chưa gắn hồ sơ liên quan',
};

export const MILESTONE_TEXT = {
  '1_tuan_truoc': 'Trước 1 tuần',
  '1_ngay_truoc': 'Trước 1 ngày',
  'ngay_dien_ra': 'Ngày diễn ra',
} as const;

/** Giới hạn cứng khi đọc trang (theo kế hoạch §8.2). */
export const MAX_DOCUMENT_CHARS = 200_000;
export const DOCUMENT_PREVIEW_CHARS = 6_000;

export const PENDING_CAPTURE_KEY = 'pending_capture';

/** ID menu chuột phải cho vùng bôi đen (VĐ-03). */
export const SELECTION_MENU_ID = 'scan-selection';
export const ACTION_TITLE = 'Lịch trình cá nhân';
