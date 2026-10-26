import type {
  EventOrigin,
  EventStatus,
  ExtractionMethod,
  FilterDecision,
  FilterMode,
  Label,
  SourceKind,
} from './contracts';

export const APP_NAME = 'Lịch trình cá nhân';

/** Nguồn tạo sự kiện — chỉ nói ai tạo, không nói đã kiểm chứng. */
export const ORIGIN_TEXT: Record<EventOrigin, string> = {
  llm: 'Máy đề xuất',
  manual: 'Nhập tay',
};

/** Ba mức độ tin cậy do model tự báo (không hiển thị phần trăm). */
export const CONFIDENCE_TEXT: Record<'thap' | 'vua' | 'cao', string> = {
  thap: 'Thấp',
  vua: 'Vừa',
  cao: 'Cao',
};

export const CONFIDENCE_HINT = 'Model tự báo, không phải xác suất đã hiệu chuẩn.';

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
  readability: 'Nội dung chính',
  raw_dom: 'Toàn trang (dự phòng)',
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
  /** Bổ sung cho lớp trích xuất LLM (kế hoạch §5.2). */
  nam_chua_ro: 'Chưa rõ năm',
  gio_chua_ro: 'Chưa rõ giờ',
  ngay_tuong_doi: 'Ngày suy ra từ cách nói tương đối',
  do_tin_cay_thap: 'Độ tin cậy thấp',
  ngay_khong_khop: 'Ngày không khớp với nguồn',
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

/** Khoá job trích xuất trong `chrome.storage.session` (tự xoá khi đóng trình duyệt). */
export const EXTRACTION_JOB_KEY = 'extraction_job';

/** Cờ mở side panel đúng tab sau khi bấm notification. */
export const PENDING_OPEN_KEY = 'pending_open';

/** ID notification kết quả trích xuất. */
export const EXTRACTION_NOTIFICATION_ID = 'extraction_done';

/** Trang offscreen dùng cho tác vụ LLM dài; tạo theo nhu cầu. */
export const OFFSCREEN_DOCUMENT_PATH = 'src/platform/offscreen/index.html';

/** ID menu chuột phải cho vùng bôi đen (VĐ-03). */
export const SELECTION_MENU_ID = 'scan-selection';
/** ID menu chuột phải cấp trang (YC-02). */
export const PAGE_MENU_ID = 'scan-page';
export const ACTION_TITLE = 'Lịch trình cá nhân';

/* ----------------------- bước sàng lọc nội dung (Slice F) ----------------- */

/** Khoá cài đặt sàng lọc trong object store `settings`. */
export const FILTER_SETTINGS_KEY = 'contentFilter';

export const FILTER_MODE_TEXT: Record<FilterMode, string> = {
  off: 'Tắt',
  report: 'Chỉ báo cáo',
  screen: 'Sàng lọc trước khi trích xuất',
};

export const FILTER_DECISION_TEXT: Record<FilterDecision, string> = {
  has_event: 'Có nội dung đáng trích',
  no_event: 'Không thấy nội dung công việc',
  uncertain: 'Chưa đủ chắc để bỏ qua',
};

/** Ghi chú fail-open: dịch vụ lọc lỗi/timeout nhưng job vẫn chạy tiếp với toàn văn. */
export const FILTER_FAIL_OPEN_NOTE = 'Sàng lọc không phản hồi — đã trích xuất toàn bộ';

/** Kết luận khi tài liệu rỗng hoặc quá ngắn để kết luận. */
export const FILTER_EMPTY_NOTE = 'Sàng lọc không thấy nội dung công việc nào. Bạn có thể trích xuất toàn bộ.';
