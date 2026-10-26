# Kế hoạch thiết kế Frontend (Penpot) — Trích xuất & quản lý lịch trình cá nhân

> Danh sách thiết kế tối thiểu cho frontend của Chrome Extension (Manifest V3), rút ra từ `script.md`.
> **Công cụ:** Penpot.
>
> **Phạm vi đã chốt:**
> - Chỉ **P0 (Giai đoạn 1–2)**.
> - **Chỉ light mode** trước (giữ token dạng ngữ nghĩa để thêm dark sau).
> - **Notification: 2 nút + bấm thân mở side panel** (thay cho 3 nút trong kịch bản, do giới hạn Chrome Notification API).
>
> **Bổ sung 2026-10-26 (P1, chưa triển khai):** board **B26–B28** cho **KS-14 — Chọn nơi chạy
> suy luận**. Đây là thiết kế đi kèm kế hoạch `docs/ke-hoach-da-provider.md`; demo hiện tại
> **chưa có** màn hình này và vẫn chỉ chạy localhost.

---

## 0. Yếu tố kỹ thuật Penpot cần lưu ý

| Hạng mục | Đề xuất | Lý do (gắn với script) |
|---|---|---|
| Tổ chức | 1 Project / 1 File / nhiều **Page** | Mỗi nhóm KS một page → dễ đóng băng phạm vi từng giai đoạn |
| Library | Publish page `00 Tokens` + `01 Components` thành **Shared Library** | KS-08 (duyệt) và KS-09 (quản lý) dùng chung EventCard/Badge |
| Board side panel | **Full UI = rộng 400px**, cao theo nội dung; thêm board kiểm tra **320px** | Chrome Side Panel người dùng kéo rộng được; tối thiểu ~240px, phổ biến 320–400px |
| Board Small UI | **360 × 240** | Pop-out/popup tiến trình, tự đóng (KS-04/05/07) |
| Board notification | **380 × 150** (mock/spec) | Chrome Notification do OS render, không phải UI của extension |
| Naming board | `KS-08 · Review – list (checked)` | Truy vết ngược về kịch bản, phục vụ báo cáo tiến độ |
| Naming component | `Button/Primary`; nhóm bằng `/` + **Variants** (`state`, `size`, `tone`) | Penpot gom nhóm theo `/`; variant phủ nhiều trạng thái KS-11 |
| Layout | **Flex layout** cho list/card; **constraints** cho sticky | Danh sách sự kiện dài vô định, chiều cao side panel động |
| Font | Chốt 1 font Google (Inter) ngay ở Tokens | Đổi font sau sẽ vỡ toàn bộ component |

> ⚠️ Mọi màn hình Full UI đều là **cột dọc hẹp ~400px**, KHÔNG thiết kế dạng desktop full-width.

---

## 1. Cấu trúc Penpot (1 File, 8 page)

| Page | Nội dung |
|---|---|
| `00 Tokens` | Color / Typography / Spacing / Radius / Elevation (light) |
| `01 Components` | Thư viện component — **publish thành Shared Library** |
| `02 Onboarding & Profile` | KS-01, KS-02 |
| `03 Scanning` | KS-04 (web), KS-05 (Gmail), KS-06 (attachment) |
| `04 Review` | KS-08 |
| `05 Events` | KS-09 |
| `06 Notify & Settings` | KS-10 + Cài đặt + **Nơi chạy suy luận (KS-14, P1)** |
| `09 Spec sheets` | OAuth, context menu, notification OS (mock + annotation) |

---

## 2. Design Tokens (light only)

| Nhóm | Giá trị tối thiểu |
|---|---|
| Color (semantic) | `bg`, `surface`, `border`, `text`, `text-muted`, `primary`, `success`, `warning`, `danger` |
| Typography | Inter — H1 / H2 / body / caption (12–20px) + weight |
| Spacing | Thang 4pt: 4 / 8 / 12 / 16 / 24 |
| Radius | 6 / 8 / 12 |
| Elevation | 3 mức shadow (card / popover / modal) |
| Icon set | Upload SVG (Material/Feather) làm asset dùng chung |

*Ghi chú: giữ token theo ngữ nghĩa để sau này chỉ cần thêm nhánh dark, không phải vẽ lại board.*

---

## 3. Component library — P0 (20 component) + P1 cho KS-14 (4)

Mỗi dòng là **1 Penpot component + variants**.

| # | Component (variants) | Dùng ở (KS) |
|---|---|---|
| 1 | `Button` — tone=primary/secondary/ghost/danger; state=default/hover/active/disabled | Toàn bộ |
| 2 | `IconButton` | Header, toolbar |
| 3 | `TextField` — state=default/focus/error | KS-02, 08, 09 |
| 4 | `Textarea` | KS-02, 08, 09 |
| 5 | `Select` | KS-05, 08, 09 |
| 6 | `Checkbox` | KS-08 |
| 7 | `Switch` | KS-01, 10 |
| 8 | `Chip` — nhãn: công vụ / giải trí / cá nhân / kỷ niệm | KS-08, 09 |
| 9 | `Badge` — Liên quan đến tôi / chưa xác định / trễ / raw_fallback | KS-08, 09, 10, 11 |
| 10 | `EventCard` — state=compact/expanded/selected/flagged | KS-08, 09 |
| 11 | `EventRow` (list item) | KS-09 |
| 12 | `SourceRef` — title + link + quote | KS-08, 09 |
| 13 | `ProgressBar` | KS-04, 05 |
| 14 | `Stepper` — state=pending/active/done/error (6 bước pipeline) | KS-04, 05 |
| 15 | `Tabs` | Shell |
| 16 | `FilterBar` — nhãn / khoảng thời gian / trạng thái | KS-09 |
| 17 | `EmptyState` | KS-04, 05, 08 |
| 18 | `Modal` — kind=confirm/edit | KS-09 |
| 19 | `Toast/Banner` — tone=info/success/warning/error | KS-11 |
| 20 | `NotificationMock` — 2 nút + vùng thân bấm được | KS-10 (spec) |

**P1 — bổ sung cho KS-14 (vẽ cùng library, chỉ khi làm S7):**

| # | Component (variants) | Dùng ở (KS) |
|---|---|---|
| 21 | `RadioCard` — state=selected/default/disabled | KS-14 (chọn **Máy này** / **Endpoint khác**) |
| 22 | `SecretField` — state=hidden/revealed/error; có nút **Xoá key** | KS-14 |
| 23 | `ConsentDialog` — kind=first-use/revoke; nút **Đồng ý** / **Huỷ** | KS-14 |
| 24 | `StatusPill` — tone=ok/warning/error; nhãn model/endpoint | KS-14, KS-11 |

---

## 4. Boards — P0 (17 board) + P1 cho KS-14 (3)

### 4.1. Shell & khởi tạo

| # | Board | Size | Nội dung | KS |
|---|---|---|---|---|
| B1 | Side panel — Shell + Tabs | 400 × cao | 3 tab: Tổng quan / Sự kiện / Cài đặt | KS-01 |
| B2 | Welcome / onboarding 3 bước | 400 | (1) hồ sơ → (2) quét trang → (3) liên kết Gmail | KS-01 |
| B3 | Dashboard — trạng thái đầu | 400 | **Liên kết Gmail** chưa bấm; "Quét trang đang mở" đã mở khoá | KS-01, 03 |

### 4.2. Hồ sơ (KS-02)

| # | Board | Size | Nội dung |
|---|---|---|---|
| B4 | Hồ sơ — form (rỗng) | 400 | tên, chức vị, công ty/đơn vị, danh hiệu, email, nickname, từ khoá bổ sung |
| B5 | Hồ sơ — form (lỗi validate) | 400 | trường bắt buộc + thông báo lỗi |

### 4.3. Thu thập (KS-04/05/06)

| # | Board | Size | Nội dung |
|---|---|---|---|
| B6 | Small UI — tiến trình quét | 360 × 240 | thu thập → **lọc nhiễu** → phân tích → trích xuất |
| B7 | Dashboard — card tiến trình pipeline | 400 | 6 bước: **sàng lọc** (PhoBERT cục bộ — Slice F, chưa triển khai) → trích xuất → chuẩn hoá → kiểm định → khử trùng lặp → so khớp hồ sơ |
| B8 | Cấu hình quét Gmail | 400 | khoảng thời gian, nhãn, từ khoá, nút Bắt đầu / Dừng |

### 4.4. Duyệt (KS-08)

| # | Board | Size | Nội dung |
|---|---|---|---|
| B9 | Review — danh sách + chọn | 400 | card 7 trường, checkbox, nút Xác nhận |
| B10 | Review — chi tiết + trích dẫn | 400 | 7 trường + đoạn văn bản gốc (mở lại nguồn) + làm nổi chỗ cần kiểm tra |
| B11 | Review — xác nhận thành công | 400 | "Đã lưu N sự kiện" |
| B12 | Trạng thái rỗng | 400 | "không tìm thấy sự kiện" + gợi ý (dùng chung KS-11) |

### 4.5. Quản lý (KS-09)

| # | Board | Size | Nội dung |
|---|---|---|---|
| B13 | Sự kiện — danh sách + lọc | 400 | lọc nhãn / thời gian / trạng thái; badge "Liên quan đến tôi" |
| B14 | Sự kiện — chi tiết | 400 | 7 trường + nguồn trích + **lịch sử thông báo** |
| B15 | Sự kiện — sửa & modal xoá | 400 | form sửa; dialog xác nhận xoá; nút "✓ Đã xong" |

### 4.6. Thông báo & Cài đặt (KS-10/01)

| # | Board | Size | Nội dung |
|---|---|---|---|
| B16 | Cài đặt | 400 | mốc **1 tuần / 1 ngày / ngày diễn ra**; bật/tắt Small UI |
| B17 | Notification mock (spec) | 380 × 150 | **2 nút** (Đã xem · Không nhắc lại) + **thân thông báo bấm mở side panel** (thay nút "Huỷ sự kiện" thứ 3) |

### 4.7. Chọn nơi chạy suy luận — KS-14 (P1, chưa triển khai)

> Vẽ khi làm **S7**. Mặc định vẫn là **Máy này**; không có board nào được phép ngụ ý remote là
> lựa chọn sẵn. Toàn bộ nằm trong tab **Cài đặt**, cùng cột 400px.

| # | Board | Size | Nội dung | KS |
|---|---|---|---|---|
| B26 | Cài đặt — Nơi chạy suy luận (mặc định) | 400 | `RadioCard` **Máy này** đang chọn (`127.0.0.1:8080`, model đang nạp); `RadioCard` **Endpoint khác** chưa chọn; nút **Kiểm tra kết nối** | KS-14 |
| B27 | Endpoint khác — form + kiểm tra | 400 | base URL, API key (`SecretField`), model (để trống = tự dò); `StatusPill` cho health; lỗi 401/403/404/429/5xx; nút **Lưu**, **Xoá key** | KS-14, KS-11 |
| B28 | Consent dialog + trạng thái đã đồng ý | 400 | Modal một lần: origin nhận nội dung, dữ liệu rời trình duyệt, key lưu cục bộ; **Đồng ý/Huỷ**; trạng thái sau đó có **Thu hồi đồng ý**; cảnh báo đổi origin phải đồng ý lại | KS-14 |

---

## 5. Luồng Prototype (6 flow P0 + 1 flow P1)

| Flow | Chuỗi board |
|---|---|
| Onboarding | Onboarding → Hồ sơ → Dashboard |
| Quét web | Dashboard → Small UI (overlay) → Pipeline card → Review |
| Duyệt & lưu | Review list → Detail → Sửa nhanh → Xác nhận |
| CRUD | Sự kiện list → Detail → Sửa → Modal xoá |
| Thông báo | Notification mock → 2 nhánh (Đã xem / Không nhắc lại) |
| Điều hướng | Dashboard → tab Sự kiện |
| **Chọn nơi chạy suy luận (P1)** | Cài đặt → B26 → B27 → B28 (consent) → quay lại **Máy này** |

> Penpot làm được: overlay (Small UI, modal, toast). Không mô phỏng được: đếm ngược tự đóng, animation tiến trình → biểu diễn bằng nhiều board trạng thái thay vì 1 board động.

---

## 6. Spec sheets (không vẽ được trong Penpot)

- Màn hình **OAuth consent** — do Google render (KS-03).
- **Context menu chuột phải** — do trình duyệt render (KS-07).
- Thanh **side panel / toolbar** của Chrome — không phải UI của extension.
- **Hành vi nền** — service worker tự chuyển "Hoàn thành", bù thông báo trễ (annotation/comment).
- **Quyết định notification 2 nút** — nút "Huỷ sự kiện" chuyển vào side panel khi bấm thân thông báo.

---

## 7. Ma trận phủ KS → thiết kế

| KS | Board liên quan |
|---|---|
| KS-01 | B1, B2, B3, B16 |
| KS-02 | B4, B5 |
| KS-03 | B3 (trạng thái nút liên kết/huỷ liên kết) + spec OAuth |
| KS-04 | B6, B7, B12 |
| KS-05 | B6, B7, B8 |
| KS-06 | *(backlog P1)* |
| KS-07 | B6 *(backlog P1)* |
| KS-08 | B9, B10, B11, B12 |
| KS-09 | B13, B14, B15 |
| KS-10 | B16, B17 |
| KS-11 | B12 + component Toast/Banner/Badge |
| KS-12 | *(backlog P1)* |
| KS-13 | *(backlog P4)* |
| KS-14 | B26, B27, B28 *(P1 — chưa triển khai)* |

---

## 8. Backlog (tái dùng library, không cần component mới)

| # | Board | Ưu tiên | KS |
|---|---|---|---|
| B18 | Hồ sơ — danh sách bối cảnh + chọn active | P1 | KS-02 |
| B19 | Dashboard — danh sách attachment + tệp lỗi | P1 | KS-06 |
| B20 | Review — kết quả trích từ bôi đen (URL + nguyên văn) | P1 | KS-07 |
| B21 | Sự kiện — mục "Cần bổ sung thời gian" | P1 | KS-09, 10 |
| B22 | Dashboard — card cảnh báo nguồn đổi lịch | P1 | KS-12 |
| B23 | So sánh cũ ↔ mới + 3 lựa chọn (Cập nhật / Giữ nguyên / Tạo riêng) | P1 | KS-12 |
| B24 | Sự kiện — badge "Trùng lịch" | P4 | KS-13 |
| B25 | Hộp thoại Xuất ICS | P4 | KS-13 |

---

## 9. Thứ tự thực hiện

1. `00 Tokens` (light) → publish.
2. `01 Components` P0 (dựng trên token).
3. B1–B3 shell + onboarding.
4. B4–B15 — vòng lặp chính Giai đoạn 1: quét web → duyệt → sự kiện.
5. B6–B8 (Giai đoạn 2: Gmail) + B16–B17.
6. Nối prototype → rà soát liền mạch.
7. Mở rộng P1/P4 từ backlog (chỉ dùng lại library).
8. **(S7)** B26–B28 + flow **Chọn nơi chạy suy luận**; kiểm tra lại ở 320/360/400px.

---

## 10. Hệ quả của các quyết định đã chốt

- **Notification 2 nút:** hành động "Huỷ sự kiện" (nút thứ 3 trong KS-10) chuyển vào side panel khi bấm thân thông báo → thể hiện rõ ở B17 + spec sheet. Cần kiểm chứng lại giới hạn nút của Chrome Notification API trước khi chốt.
- **Light-only:** token giữ dạng ngữ nghĩa để nhánh dark chỉ tốn 1 lần chỉnh, không phải vẽ lại board.
- **Phạm vi P0:** ~17 board + 20 component + 1 token set + 6 flow. Toàn bộ P1/P4 chỉ mở rộng trên library đã có.
- **Provider choice (KS-14, P1):** thêm 3 board + 4 component, không đổi token hay shell. Nguyên tắc thiết kế: **Máy này** luôn là mặc định và đứng trước; remote chỉ mở form sau khi người dùng chọn; consent là modal chặn, không phải toast; API key không bao giờ hiện đầy đủ trong ảnh chụp màn hình demo. Xem `docs/ke-hoach-da-provider.md`.

---

*Tài liệu này rút ra từ `script.md` (14 kịch bản KS-01…KS-14), chốt danh sách thiết kế tối thiểu P0 cho frontend trên Penpot; B26–B28 là phần P1 cho KS-14, chưa triển khai.*
