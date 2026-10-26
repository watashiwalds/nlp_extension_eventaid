# Checklist kiểm thử demo (thủ công)

Chạy trước khi demo/báo cáo. Mỗi mục ghi rõ kịch bản `script.md` tương ứng.
Các mục KT-13/KT-14 còn lại cần kiểm trên Chrome thật; ghi chú nằm trong tệp này.
Lịch sử hai phiên trước: [`docs/archive/phien-lam-viec-tiep-theo.md`](./archive/phien-lam-viec-tiep-theo.md).

> **Rà soát thủ công (2026-10-22):** người dùng đã đi qua toàn bộ checklist. Các ô `[ ]`
> còn lại là mục **chưa đạt hoặc chưa xác nhận lại**, không phải chưa từng kiểm.
> VĐ-10 và YC-01…YC-06 đã xử lý trong **2 phiên** — xem
> [`phien-lam-viec-tiep-theo.md`](./archive/phien-lam-viec-tiep-theo.md).
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
- [x] Badge phương thức = **Nội dung chính**; số ký tự hợp lý; nút “Xem toàn bộ” hoạt động.
- [x] Mở trang động (SPA) khó đọc → vẫn có nội dung, badge **Toàn trang (dự phòng)**.
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

### 4.1. Duyệt nháp và chống trùng (Slice D)

> Đã chạy và được người dùng xác nhận ngày **2026-10-24** (bản ghi:
> [`kiem-tra-slice-d.md`](./kiem-tra-slice-d.md)).

- [x] Nút **Duyệt nháp (N)** chỉ hiện khi N > 0; bấm vào thấy nháp `llm` xếp trước, nhập tay sau.
- [x] **5 nháp được duyệt trong ≤ 30 giây** bằng chọn + **Duyệt đã chọn**, không mở từng form.
- [x] Badge **Máy đề xuất** + mức tin cậy (Thấp/Vừa/Cao) hiện ở thẻ và chi tiết; **không** hiện phần trăm.
- [x] Sự kiện nhập tay không hiện badge/độ tin cậy; chi tiết có dòng **Nguồn tạo**.
- [x] Chip **thiếu thời điểm**, **chưa gắn hồ sơ**, **Có thể trùng** hiện đúng; `do_tin_cay_thap` vẫn nằm trong **Cần kiểm tra**.
- [x] Quote dài hiện **Xem trích dẫn đầy đủ**; nút **Mở nguồn** mở đúng URL; nguồn không URL không tạo link giả.
- [x] Chọn một phần → checkbox tổng `indeterminate`; **Chọn tất cả** chỉ chọn mục đang hiển thị.
- [x] Duyệt nháp chỉ có ngày / không có ngày → hộp thoại cảnh báo “chưa xếp được nhắc việc”; huỷ thì không lưu.
- [x] Chỉ mục được chọn chuyển `dang_theo_doi`; mục khác giữ `nhap`; `origin`/`sources`/`extractionMeta` được giữ.
- [x] Bỏ chọn không xoá; **Xoá nháp đã chọn** có xác nhận, chỉ xoá `nhap`, không xoá sự kiện đang theo dõi.
- [x] Quét lại cùng trang hai lần (cùng output) → lần hai **0 bản ghi mới**.
- [x] Paraphrase → có gợi ý **Có thể trùng**; **Giữ cả hai** ẩn gợi ý trong phiên; **Mở bản kia** cuộn tới đúng thẻ.
- [x] `Escape` thoát chế độ duyệt khi không có form; **Quay lại danh sách** luôn có, kể cả khi đã duyệt hết.
- [x] Side panel 320/360/400 px không tràn ở thanh duyệt/checkbox; chỉ dùng bàn phím vẫn thao tác được.

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
- [x] Mở DevTools → Network: **không có** request ra ngoài; chỉ có request tới `127.0.0.1:8080` khi bấm **Trích sự kiện** *(lần chạy trước khi có KS-14; khi đó demo local-only)*.
- [ ] **KS-14 (đã có code):** mọi request remote chỉ xuất hiện **sau** khi người dùng chọn endpoint và đồng ý; không có request nền.
- [ ] Sau khi làm Slice F: chỉ có thêm request tới `127.0.0.1:8000`/`localhost:8000` khi bấm **Trích sự kiện**; không có request nền.

## 8. Chọn nơi chạy suy luận (KS-14) — đã có code, chờ chạy Chrome

> **Trạng thái (2026-10-26):** code + unit test đã xong. Checklist dưới đây **chưa chạy đủ** vì môi
> trường phát triển không có Chrome, API key hay `llama-server`; **để trống cho tới khi chạy thật**.
> Không đánh dấu `[x]` chỉ vì đã có code. Kế hoạch và ghi chú triển khai:
> [`ke-hoach-da-provider.md`](./ke-hoach-da-provider.md) §8.
>
> **2026-10-26 — sau báo lỗi Gemini:** health `/models` từng ghi đè model đã nhập bằng ID dạng
> `models/…`, khiến trích xuất trả 404 dù **Kiểm tra kết nối** báo OK. Đã sửa (giữ model đã nhập,
> chuẩn hoá tiền tố, chỉ tự dò khi ô model trống — xem kế hoạch §8.3); cần chạy lại mục 8.2.
>
> **Cùng ngày — lỗi 400 khi trích bằng Gemini:** endpoint remote nay nhận **schema rút gọn**
> (bỏ `maxItems`/`minimum`/`maxLength`…) và tự hạ **một lần** sang `json_object` nếu vẫn 400/422
> (kế hoạch §8.5). Đây là giả thuyết chưa xác nhận trên endpoint thật; khi chạy 8.2, nếu vẫn lỗi
> thì **chép nguyên văn phần body lỗi** (đã che key) để chẩn đoán trước khi mở F6.

### 8.1. Localhost (mặc định)

- [x] Cài đặt → **Nơi chạy suy luận** hiện **Máy này** đang chọn, endpoint `http://127.0.0.1:8080`.
- [x] **Kiểm tra kết nối** báo OK + tên model đang nạp; không hỏi consent.
- [x] Trích 1 trang mẫu → kết quả không đổi schema, vẫn lưu `nhap`.

### 8.2. Dịch vụ ngoài (Gemini hoặc OpenAI-compatible)

- [x] Chọn **Endpoint khác**, nhập base URL HTTPS + API key + model → **Kiểm tra kết nối**.
- [x] Lần đầu: modal consent hiện đúng origin; **Huỷ** → không lưu, không gửi request, giữ provider cũ.
- [ ] **Đồng ý** → lưu, health OK, trích 1 trang mẫu; JSON hợp lệ, không bịa ngày.
- [ ] Trích bằng model Gemini đang dùng (đã thử `gemini-3.5-flash-lite`) → không còn 400
      `Request contains an invalid argument.`; nếu còn, chép nguyên văn body lỗi (đã che key).
- [ ] Nhập model Gemini (`gemini-…`, thử cả `models/gemini-…`) hoặc để trống → **Kiểm tra kết nối**
      **và** trích 1 trang đều dùng đúng model chat, không trả 404 *(đã sửa lỗi health ghi đè model
      ngày 2026-10-26; cần xác nhận lại trên Chrome)*.
- [ ] Health lỗi → **không lưu** endpoint/key mới; consent vừa đồng ý vẫn được giữ để thử lại.
- [ ] Sai key → 401/403 rõ ràng; sai model/URL → 404; quota → 429; dịch vụ lỗi → 5xx.
- [ ] **Thu hồi đồng ý** → lần chạy sau bị chặn tới khi đồng ý lại.
- [ ] Đổi sang origin khác → bắt buộc đồng ý lại, không tự dùng consent cũ.

### 8.3. Máy trạm qua Cloudflared

- [ ] `llama-server` ở nhà + `cloudflared tunnel` → nhập URL `https://…trycloudflare.com`.
- [ ] Consent + quyền host cấp lúc chạy cho đúng origin; health OK.
- [ ] Trích 1 trang ngắn thành công; trang dài cho thấy giới hạn timeout (~100s proxy) với thông báo rõ.

### 8.4. Key và dữ liệu

- [ ] Xuất JSON → **không** có `apiKey`/`consentByOrigin` trong tệp.
- [ ] Console/log/toast không chứa key; thông báo lỗi chỉ nêu host/status.
- [ ] **Xoá key** → health remote báo thiếu key; **Xoá toàn bộ dữ liệu** xoá cả settings + consent.
- [ ] Quay về **Máy này** → trích lại bình thường, không cần nhập lại key.

## 9. Sàng lọc nội dung (PhoBERT) — chờ triển khai Slice F

> **Chưa chạy được:** checklist dùng khi Slice F xong. Hiện job gọi LLM trực tiếp, không có bước
> sàng lọc. Kế hoạch: [`ke-hoach-bo-loc-noi-dung.md`](./ke-hoach-bo-loc-noi-dung.md).

Chuẩn bị: chạy dịch vụ PhoBERT cục bộ (xem `extension/README.md`), mở Cài đặt → **Sàng lọc nội dung**.

### 9.1. Chế độ `off`

- [ ] Chọn `off` → trích một trang như trước; không có request tới cổng 8000; kết quả giống baseline.

### 9.2. Chế độ `report`

- [ ] Chọn `report` → trích tài liệu âm (menu/quảng cáo) → vẫn gọi LLM, số sự kiện không đổi; có dòng kết luận sàng lọc + độ chắc chắn.

### 9.3. Chế độ `screen`

- [ ] Tài liệu dương (thông báo họp có ngày giờ) → sự kiện y hệt baseline; LLM nhận toàn văn.
- [ ] Tài liệu âm rõ ràng → **0 sự kiện**, job xong với lý do; có nút **Trích xuất toàn bộ**.
- [ ] Bấm **Trích xuất toàn bộ** → chạy LLM trên toàn văn, lưu nháp như bình thường.
- [ ] Tài liệu ngắn < 3 câu hoặc confidence < 0.85 → **không** tự bỏ qua (fail-open).

### 9.4. Vùng chọn / dán tay

- [ ] Bôi đen hoặc dán văn bản → **không** gọi dịch vụ sàng lọc; đi thẳng vào LLM.

### 9.5. Lỗi và huỷ

- [ ] Tắt dịch vụ Python giữa chừng → job vẫn xong với toàn văn + cảnh báo rõ; không mất kết quả.
- [ ] Huỷ job trong bước sàng lọc → trạng thái `Đã huỷ`, không lưu nháp.
- [ ] Đổi endpoint sai/không tồn tại → **Kiểm tra kết nối** báo lỗi, panel không crash.

### 9.6. Quyền và dữ liệu

- [ ] DevTools → Network: chỉ thấy request tới loopback `8000` khi chạy sàng lọc; không có host remote.
- [ ] Tắt dịch vụ → không có request nền lặp lại.

---

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
khi UI hẹp). Bối cảnh lịch sử: [`phien-lam-viec-tiep-theo.md`](./archive/phien-lam-viec-tiep-theo.md).

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

- ✅ Cần thêm nhãn "đang diễn ra" khi hiện tại đứng giữa thời điểm bắt đầu và thời điểm kết thúc của sự kiện.
  — `core/events.ts` thêm `eventTiming`/`isOngoing` (dùng `end`, hoặc suy ra từ `start + durationMinutes`);
  card và chi tiết hiển thị **Đang diễn ra**, viền xanh, sự kiện đang diễn ra được ưu tiên lên đầu;
  sự kiện đang diễn ra **không** còn bị coi là quá hạn.
- ✅ "Nội dung đã quét" chưa thực hiện xoá các nội dung không được liên kết với sự kiện.
  — `core/documents.ts` thêm `unlinkedDocuments`; tab **Quét nội dung** hiện khối **Nội dung không liên kết**
  với nút **Xoá N nội dung** (có xác nhận, chỉ xoá nội dung, giữ nguyên sự kiện).

#### Cải thiện

- ✅ Đảm bảo mốc thời gian "hiện tại" của hệ thống được cập nhật theo thời gian thực, không phải giá trị cứng.
  — side panel render lại mỗi 30 giây và khi tab được hiện lại; bỏ qua khi đang mở form
  hoặc đang gõ trong ô nhập để không mất dữ liệu.
- ✅ Xoá header trên cùng (Logo extension và icon quét) của giao diện side panel.
  — đã bỏ `.topbar`; thao tác quét vẫn nằm ở tab **Quét nội dung**.
- ✅ Đảm bảo các nút bấm có thể nhấn được trên toàn bộ phạm vi hiển thị (bao gồm cả các icon được hiển thị cùng).
  — sửa `handleClick` dùng `Element` thay vì `HTMLElement` (icon SVG không còn chặn cú nhấp);
  thêm `.icon { pointer-events: none; }` để cú nhấp luôn tới phần tử mang `data-action`.

> Quality gate sau sửa: `typecheck`, `lint`, `test` (72 test), `build` đều xanh.