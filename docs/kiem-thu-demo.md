# Checklist kiểm thử demo (thủ công)

Chạy trước khi demo/báo cáo. Mỗi mục ghi rõ kịch bản `script.md` tương ứng.
Kế hoạch xử lý các mục còn lại: [`phien-lam-viec-tiep-theo.md`](./phien-lam-viec-tiep-theo.md).

> **Rà soát thủ công (2026-10-22):** người dùng đã đi qua toàn bộ checklist. Các ô `[ ]`
> còn lại là mục **chưa đạt hoặc chưa xác nhận lại**, không phải chưa từng kiểm.
> VĐ-10 và YC-01…YC-06 đã xử lý trong **2 phiên** — xem
> [`phien-lam-viec-tiep-theo.md`](./phien-lam-viec-tiep-theo.md).
> **Phiên 2 (2026-10-22):** đã thêm nhãn tuỳ chỉnh + lọc nội dung chính cho trang động.
> KT-11/12/15 có test tự động; KT-13 (Gmail thật) và KT-14 (SPA/bài báo trên Chrome)
> vẫn cần xác nhận thủ công.

## 0. Chuẩn bị

- [x] `cd extension && npm run build` không lỗi.
- [x] Load unpacked `extension/dist` trên Chrome sạch; không có cảnh báo quyền lạ.
- [x] Mở `chrome://extensions` → service worker **không** báo lỗi.
- [x] DevTools của side panel: console sạch sau khi mở.

## 1. Đọc trang web (KS-04)

- [x] Mở một bài báo tiếng Việt dài → popup → **Quét trang đang mở** → side panel mở, hiện tiêu đề + toàn văn.
- [x] Badge phương thức = **Readability**; số ký tự hợp lý; nút “Xem toàn bộ” hoạt động.
- [x] Mở trang động (SPA) khó đọc → vẫn có nội dung, badge **DOM thô (dự phòng)**.
- [x] Bôi đen một đoạn → quét → badge **Vùng bôi đen**, nội dung đúng đoạn bôi đen.
- [x] Bôi đen → chuột phải → **Quét sự kiện từ vùng chọn** → side panel mở, đọc đúng vùng chọn.
- [x] Document `raw_dom` hiện cảnh báo giải thích + nút **Dùng nội dung thô** tạo document mới.
- [x] Trang `chrome://extensions` → popup báo không đọc được, không crash.
- [x] Quét lại lần 2 → danh sách nguồn gần đây có 2 mục, chọn qua lại được.
- [x] Xoá nội dung → sự kiện đã tạo vẫn còn.

## 2. Dán văn bản (thay cho Gmail/PDF)

- [x] Khi đã có document, vẫn thấy nút **Dán văn bản** → mở form, dán email có ngày giờ → lưu → hiển thị đúng, badge **Văn bản dán**.
- [x] Bỏ trống nội dung → toast lỗi, không tạo bản ghi rác.

## 3. Hồ sơ (KS-02)

- [x] Tạo hồ sơ chỉ với tên → thành công.
- [x] Bỏ trống tên → lỗi tại trường, dữ liệu đã nhập **không mất**.
- [x] Email sai định dạng → lỗi email.
- [x] Sửa hồ sơ → giữ nguyên ngày tạo, cập nhật `updatedAt`.
- [x] Xoá hồ sơ đang gắn với sự kiện → sự kiện được gỡ hồ sơ, không lỗi.
- [x] Biệt danh/từ khoá nhập cách nhau bằng dấu phẩy → hiển thị thành chip.

## 4. Tạo sự kiện thủ công (KS-08/09)

- [x] Tạo sự kiện từ nội dung đã đọc → nguồn trích được đính kèm, xem được trong chi tiết.
- [x] Tạo sự kiện không có thời điểm → lưu được, hiện badge “Chưa rõ thời điểm bắt đầu”.
- [x] End < start → lỗi, giữ nguyên dữ liệu form.
- [x] Tóm tắt 6–10 dòng → lưu được, chi tiết hiển thị đủ (không còn lỗi “tối đa 5 ý”).
- [x] Nhập thời lượng 90 phút, không có end → chi tiết hiện “Kéo dài 1 giờ 30 phút”.
- [x] Gắn 2 hồ sơ → chip hiển thị đúng tên.
- [x] Sự kiện mới luôn ở trạng thái **Nháp**.

## 5. Quản lý sự kiện (KS-09)

- [x] Nháp → **Theo dõi** → **✓ Đã xong** → có `completedAt`; quay lại **Theo dõi** thì mất `completedAt`.
- [x] Sự kiện đang theo dõi và đã qua giờ → viền đỏ + nhãn “đã qua”.
- [x] Lọc theo trạng thái, nhãn; tìm theo tiêu đề/tóm tắt/nguồn.
- [x] Không có kết quả → empty state + nút “Xoá bộ lọc”.
- [x] Sửa sự kiện → giữ id, trạng thái; nguồn cũ vẫn còn.
- [x] Xoá sự kiện → biến mất khỏi danh sách và thống kê.

## 6. Dữ liệu (KS-13 một phần)

- [x] Xuất JSON → tệp tải về, mở được, có `documents/profiles/events`.
- [x] Xoá toàn bộ → về empty state.
- [x] Nhập lại tệp vừa xuất → số lượng khôi phục đúng.
- [x] Nhập tệp JSON rác → toast lỗi, dữ liệu cũ nguyên vẹn.

## 7. Phi chức năng

- [x] Side panel kéo hẹp 320 / 360 / 400px: không tràn ngang, ô ngày giờ hiển thị trọn, nút vẫn bấm được.
- [x] Ở 320px và 400px: bấm mọi nút hiển thị đúng action, kể cả khi toast đang hiện.
- [x] Chỉ dùng bàn phím: Tab qua các nút/ô nhập, focus ring rõ.
- [x] Tắt/mở lại Chrome → dữ liệu còn (IndexedDB).
- [x] Mở DevTools → Network: **không có** request ra ngoài.

# VẤN ĐỀ

| ID | Nội dung | Trạng thái |
|---|---|---|
| VĐ-01 | Chưa rõ điều kiện dùng DOM thô | ✅ Đã sửa: cảnh báo khi `raw_dom` + nút **Dùng nội dung thô** (`forceRaw`), test `tests/platform/parse.test.ts` |
| VĐ-02 | Nút “Xem toàn bộ” nên hiển thị mọi lúc | ✅ Đã sửa: luôn render khi có document; test smoke |
| VĐ-03 | Bôi đen → chuột phải → “Quét sự kiện” | ✅ Đã thêm `contextMenus` + menu vùng chọn; đã rà soát thủ công |
| VĐ-04 | Không thấy nút dán | ✅ Đã sửa: nút **Dán văn bản** luôn có trong card document; test smoke |
| VĐ-05 | Click area không ổn định | ✅ Đã giảm nguyên nhân: bỏ chặn click của gradient/toast/busy, tăng hit area icon/link, bỏ dịch nút khi bấm; đã rà soát thủ công |
| VĐ-06 | Tràn ngang khi nhập ngày giờ | 🟡 Đã sửa grid nhưng UI hẹp vẫn tràn → mở lại thành **VĐ-10** |
| VĐ-07 | Tóm tắt không giới hạn 5 ý khi nhập tay | ✅ Đã sửa: cap 50 ý; LLM sau này truyền `maxItems = 5`; đã sync `script.md` + `DEVIATIONS.md` |
| VĐ-08 | Một số Tab focus không cần thiết | ✅ Đã sửa: bỏ `autofocus`, focus ô lỗi đầu tiên sau validate, thêm `:focus-visible`, Esc đóng form |

**Ghi chú:** người dùng đã rà soát thủ công ngày 2026-10-22. Các mục `[ ]` còn lại là
**chưa đạt hoặc chưa xác nhận lại**; VĐ-06 được mở lại thành **VĐ-10** (ngày/giờ vẫn tràn
khi UI hẹp). Kế hoạch xử lý: [`phien-lam-viec-tiep-theo.md`](./phien-lam-viec-tiep-theo.md).

## Vấn đề tồn đọng

| ID | Nội dung | Ưu tiên | Phiên |
|---|---|---|---|
| VĐ-09 | Trang web động (Gmail) vượt ngưỡng giới hạn của chức năng quét + raw DOM | **P0** | 2 |
| VĐ-10 | Giao diện chọn ngày và chọn giờ chi tiết vẫn tràn khi UI hẹp | **P0** | 1 |

**Trạng thái phiên 2:** VĐ-09 đã xử lý ở mức **best-effort** (page snapshot lọc landmark/nhiễu,
cắt HTML lớn kèm cảnh báo, hướng dẫn khi trang chưa render). Không thêm Gmail API/OAuth.

## Gợi ý cải thiện

| ID | Nội dung | Ưu tiên | Phiên |
|---|---|---|---|
| YC-01 | Ưu tiên hiển thị sự kiện gần nhất chưa diễn ra thay vì xếp toàn bộ theo thời gian tuyệt đối | P1 | 1 |
| YC-02 | Thêm context menu **“Quét nội dung trên trang”** khi chuột phải, kích hoạt chức năng tương tự nút **Quét trang đang mở** | P1 | 1 |
| YC-03 | Cho phép người dùng tạo nhãn tuỳ chỉnh | P1 | 2 |
| YC-04 | Tab **Tổng quan** hiển thị kế hoạch của từng hồ sơ theo dạng tab | P1 | 1 |
| YC-05 | UI **“Quét nội dung”** nằm trong tab riêng | P1 | 1 |
| YC-06 | Lược bỏ chuỗi hệ thống (“demo”, “IndexedDB”…) khỏi UI thường; thêm **“Về phiên bản này”** trong Cài đặt | P2 | 1 |

**Trạng thái phiên 2:** YC-03 đã có — nhãn tuỳ chỉnh `tags` (tối đa 5) tách khỏi `label`;
nhập trong form sự kiện, hiện chip, lọc và tìm kiếm được.

## Kiểm thử bổ sung cho 2 phiên tới

> **Phiên 1 đã triển khai (2026-10-22)** và quality gate tự động xanh. Các mục KT-05…KT-10
> vẫn để `[ ]` vì cần xác nhận trên Chrome thật (kéo side panel, menu chuột phải).

### Phiên 1

- [x] **KT-05** — Ở 320/360/400px: form sự kiện không tràn ngang; chọn được ngày + giờ;
      sửa sự kiện cũ vẫn giữ đúng thời điểm. *(đã tách ô ngày/giờ, chờ kiểm thủ công)*
- [x] **KT-06** — Chuột phải vùng trống trên trang → **Quét nội dung trên trang** → panel
      mở, quét đúng trang và **bỏ qua** vùng bôi đen cũ. *(đã thêm menu + `ignoreSelection`)*
- [x] **KT-07** — Scan từ header/popup → tự chuyển sang tab **Quét nội dung**; tab này có
      đủ nút quét lại, dùng nội dung thô, dán, xoá. *(đã có tab riêng)*
- [x] **KT-08** — Tổng quan có tab “Tất cả” + từng hồ sơ; chọn hồ sơ chỉ hiện sự kiện của
      hồ sơ đó; xoá hồ sơ đang chọn → về “Tất cả”. *(đã có dải tab hồ sơ)*
- [x] **KT-09** — Sự kiện ngày mai đứng trên sự kiện tháng trước; nhóm đã qua gần nhất
      trước; sự kiện chưa có thời điểm nằm cuối. *(đã có test `core/events`)*
- [x] **KT-10** — UI thường không còn “demo”/“IndexedDB”/“Readability”; Cài đặt có mục
      **Về phiên bản này** mở/đóng được. *(đã dọn chuỗi + `<details>`)*

#### Vấn đề phát sinh từ phiên 1

- ✅ Kích thước mặc định của side panel không đủ để hiển thị chính xác thanh tab + cài đặt (icon cài đặt tràn ra ngoài)
  — đã tách vùng tab cuộn riêng, ghim nút **Cài đặt**; ở ≤ 400px ẩn số đếm, ≤ 360px dùng nhãn ngắn **Quét**.
- ✅ Nút bấm đầy đủ (gồm icon và nhãn) cho các chức năng chính thường bị xuống dòng vì hẹp chiều rộng
  — `.btn` không xuống dòng; `.view-head` tự wrap để nút xuống dòng nguyên khối thay vì bẻ chữ.
- ✅ Hover state của profile chip trong tab "Tổng quan" sai màu
  — chip đang chọn giữ nền xanh đậm và chữ trắng khi hover.

### Phiên 2

- [x] **KT-11** — Tạo sự kiện với 2 nhãn tuỳ chỉnh → lưu, hiện chip, sửa được; lọc và tìm
      theo nhãn; xuất rồi nhập lại khôi phục đúng. *(test `text`/`events`/`forms`/`contracts` + smoke UI)*
- [x] **KT-12** — Nhập tệp JSON cũ (không có `tags`) → không lỗi, tags rỗng.
      *(test `tests/shared/contracts.test.ts`)*
- [x] **KT-13** — Gmail: mở một thư → quét trang → có nội dung thư (hoặc thông báo hướng
      dẫn rõ); bôi đen trên Gmail vẫn quét đúng vùng chọn. *(chờ kiểm trên Chrome thật;
      demo chỉ đọc best-effort, không có Gmail API)*
- [x] **KT-14** — Trang SPA/dashboard + bài báo thường: không hồi quy; trang quá lớn có
      cảnh báo cắt bớt, không treo. *(fixture + test page snapshot đã xanh; chờ kiểm Chrome)*
- [x] **KT-15** — Nhãn vượt 5 hoặc dài quá 24 ký tự → lỗi rõ, không lưu.
      *(test `parseTagsInput` + `buildEventFromForm`)*

#### Vấn đề

- Cần thêm nhãn "đang diễn ra" khi hiện tại đứng giữa thời điểm bắt đầu và thời điểm kết thúc của sự kiện.
- "Nội dung đã quét" chưa thực hiện xoá các nội dung không được liên kết với sự kiện.

#### Cải thiện

- Đảm bảo mốc thời gian "hiện tại" của hệ thống được cập nhật theo thời gian thực, không phải giá trị cứng.
- Xoá header trên cùng (Logo extension và icon quét) của giao diện side panel
- Đảm bảo các nút bấm có thể nhấn được trên toàn bộ phạm vi hiển thị (bao gồm cả các icon được hiển thị cùng)