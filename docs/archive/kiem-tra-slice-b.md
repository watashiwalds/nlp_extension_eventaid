# Kiểm tra Slice B — Provider llama.cpp & trích xuất từ side panel

> **ĐÃ LƯU TRỮ (2026-10-24).** Đây là biên bản nghiệm thu lịch sử của Slice B; không dùng
> làm nguồn hiện hành. Trạng thái hiện tại nằm ở
> [`ke-hoach-llm-trich-xuat.md`](../ke-hoach-llm-trich-xuat.md) §9–§11 và
> [`ban-giao-slice-d.md`](../ban-giao-slice-d.md). Giữ lại để tra cứu số đo, lỗi
> `response_format` và quyết định thời điểm đó.

> **Mốc:** 2026-10-22 · quality gate xanh với **146 test / 17 file**.
> **Đã nghiệm thu:** 2026-10-23. Kế hoạch xử lý các vấn đề còn lại:
> [`ke-hoach-sau-nghiem-thu-b.md`](./ke-hoach-sau-nghiem-thu-b.md).
> **Sau nghiệm thu (2026-10-23):** SB-01 (khớp hồ sơ) và SB-03 (gợi ý khi cắt) đã xong;
> quality gate hiện tại **159 test / 19 file**, prompt **v3**.
>
> **Kết luận ngắn:** code Slice B đã xong; provider + pipeline đã chạy thật với
> `llama-server` và model Qwen3.5-4B Q5_K_S. Phần kiểm tra UI trong Chrome
> (quét trang thật → nháp trong DB) đã được xác nhận.
>
> Liên quan: [`ke-hoach-llm-trich-xuat.md`](../ke-hoach-llm-trich-xuat.md) §9–§11,
> [`kiem-thu-demo.md`](../kiem-thu-demo.md), [`DEVIATIONS.md`](../DEVIATIONS.md).

---

## 1. Tóm tắt trạng thái

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Hợp đồng dữ liệu (`LlmSettings`, `origin`, `extractionMeta`) | ✅ | Slice A, có test |
| Lõi pipeline (chunk → prompt → parse → normalize → dedup) | ✅ | `core/extraction/pipeline.ts` |
| Provider `LlamaCppProvider` | ✅ chạy thật | Health, `/v1/models`, JSON schema, timeout |
| Chạy trích từ side panel | ✅ | Đã kiểm tra trong Chrome ngày 2026-10-23 |
| Form cài đặt + kiểm tra kết nối | ✅ | Đã kiểm tra trong Chrome ngày 2026-10-23 |
| `host_permissions` + CSP `connect-src` | ✅ | Chỉ `127.0.0.1:8080` |
| Câu chữ quyền riêng tư | ✅ | Đã bỏ “ứng dụng không gọi mạng” |
| Đo `latencyMs`, token, model thật | ✅ | Qwen3.5-4B; đo v2, đã chạy lại v3 ngày 2026-10-23, xem §2.2b |
| Xác nhận dạng `response_format` | ✅ | Chỉ dạng OpenAI thực sự ép schema |
| E2E provider/pipeline với văn bản thật | ✅ | 6 tài liệu mẫu, 0 ngày bịa (đã chạy lại prompt v3) |
| E2E UI: trang thật → nháp trong DB | ✅ | Đã xác nhận trong Chrome ngày 2026-10-23 |
| Offscreen / notification / job bền | — ngoài phạm vi | Thuộc Slice C |

**Điều kiện nghiệm thu Slice B:** “E2E 1 trang; lỗi server hiện thông báo rõ”.
**Đã đạt và được nghiệm thu ngày 2026-10-23.** Lỗi khớp hồ sơ khi có từ 2 hồ sơ đã được
sửa (SB-01); xem [`ke-hoach-sau-nghiem-thu-b.md`](./ke-hoach-sau-nghiem-thu-b.md).

---

## 2. Đã kiểm tra

### 2.1. Tự động

Chạy trong `extension/`:

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Kết quả lần cuối: cả bốn lệnh đều xanh; **161 test / 19 file**; `dist/` build thành công.

| File test | Nội dung đã phủ |
|---|---|
| `tests/platform/llama-cpp.test.ts` | `buildResponseFormat` 3 dạng; health 200/503/401/lỗi mạng; đọc `/v1/models`; body request; Authorization; `enable_thinking:false`; bỏ `model` khi để trống; hạ cấp `OpenAI → schema → json_object`; lỗi HTTP; phản hồi rỗng; huỷ; timeout |
| `tests/core/extraction-pipeline.test.ts` | pipeline đầy đủ với `MockProvider`; dedup; retry đúng 1 lần; thất bại sau retry không trả candidate; tiến trình; huỷ; `truncated` khi vượt `maxChunks` |
| `tests/core/extraction-schema.test.ts` | JSON hợp lệ; bỏ markdown; bỏ khối `<think>`; từ chối thiếu trường/label lạ/quá 20 sự kiện |
| `tests/core/extraction-normalize.test.ts` | ngày đủ/thiếu năm/thiếu giờ/tương đối; ISO có giây và offset; ngày không có thật |
| `tests/platform/settings.test.ts` | mặc định; lưu/đọc; bản ghi hỏng rơi về mặc định; từ chối giá trị sai |
| `tests/ui/smoke.test.ts` | nút “Trích sự kiện”; form cài đặt + nút kiểm tra kết nối; câu chữ quyền riêng tư |

**Chưa có test tự động cho:** action `extractEventsAction` ghi DB thật, trạng thái
`llmHealth` sau khi bấm kiểm tra, và thông báo UI khi tài liệu bị cắt.

### 2.2. Chạy thật với `llama-server`

Môi trường đo:

- `GET /health` → `200 {"status":"ok"}`.
- Model: `Qwen_Qwen3.5-4B-Q5_K_S.gguf` (4,33B tham số, file ~3,2 GB).
- Build: `b10101-4310aa4f8`; `n_ctx = 8192`; một slot.
- Prompt `v2`; `temperature 0.1`; `maxTokens 1200`; `chunkChars 5000`; `maxChunks 4`.

| Tài liệu | Ký tự | Đoạn | Sự kiện | Trùng | Lỗi | Latency |
|---|---:|---:|---:|---:|---|---:|
| Thông báo lớp (3 sự kiện) | 226 | 1 | 3 | 0 | 0 | 8,6 s |
| Bản tin không có sự kiện | 129 | 1 | 0 | 0 | 0 | 0,3 s |
| “Thứ Ba tuần sau” + “30/10” | 90 | 1 | 1 | 0 | 0 | 2,3 s |
| Có hồ sơ “Nguyễn Văn An” | 114 | 1 | 1 | 0 | 0 | 3,7 s |
| Tài liệu dài 2 đoạn | 8.282 | 2 | 2 | 0 | 0 | 7,4 s |

- Prompt ngắn: **739 token vào / 130 token ra**, 3,1 s.
- Hồ sơ closed set: gắn đúng `prf_an`; không sinh id lạ.
- Ngày thiếu năm/giờ: `start.value = null`, giữ `startRaw`, gắn `nam_chua_ro` / `gio_chua_ro`.
- Ngày tương đối: prompt v2 để `start = null` + `ngay_tuong_doi` thay vì đoán lệch ngày.
- Tài liệu dài: chunk 2 đoạn, tìm đủ sự kiện đầu và cuối; không lỗi schema.
- Trong 6 tài liệu mẫu: **0 ngày bịa** hoàn toàn; các ngày thiếu dữ kiện đều bị hạ xuống `null`.

> Đây là đo qua provider + pipeline trong Node, **chưa phải** bấm trên side panel với
> trang web thật. Chưa đo VRAM/tokens/s của phần cứng.

### 2.2b. Chạy lại prompt v3 + khớp hồ sơ (2026-10-23)

Cùng model `Qwen_Qwen3.5-4B-Q5_K_S.gguf`, `n_ctx = 8192`, prompt v3, `temperature 0.1`,
`maxTokens 1200`, `chunkChars 5000`, `maxChunks 4`.

| Phép thử | Kết quả | Latency |
|---|---|---:|
| 2 hồ sơ, sự kiện nhắc hồ sơ tạo sau | `relatedProfiles: ["prf_binh"]` | 2,9 s |
| Đảo thứ tự 2 hồ sơ | vẫn `["prf_binh"]` | 2,7 s |
| 6 tài liệu mẫu hồi quy | 9 sự kiện, 0 trùng, 0 lỗi schema, 0 ngày bịa | 0,26–8,4 s |
| Tài liệu dài | 2 đoạn, tìm đủ sự kiện đầu + cuối | 8,4 s |

- Nguồn thiếu năm (`8:00 ngày 15/11`): model vẫn trả ISO `2026-11-15T08:00`, nhưng
  `normalizeDateTime` đã bỏ `value`, giữ `raw`, gắn `nam_chua_ro`.
- Nguồn thiếu giờ (`20/11/2026`): tương tự, `value = null` + `gio_chua_ro`.
- Ngày tương đối: model để `start = null` + `ngay_tuong_doi` (không đoán lệch ngày).

> Đã thêm test hồi quy cho trường hợp model tự điền năm/giờ khi chuỗi gốc thiếu dữ kiện.

---

## 3. Phát hiện quan trọng khi chạy thật

1. **`response_format` dạng `schema` trần bị bỏ qua.** Server trả HTTP 200 nhưng model
   có thể trả `{"event_label":"Học tập"}` hoặc label ngoài enum. Chỉ dạng OpenAI
   (`json_schema.json_schema.schema`) mới thực sự ép schema. Provider đã đổi thứ tự
   thành **OpenAI → schema → json_object**.
2. **Qwen3.5 mặc định suy luận rất dài.** Không tắt thinking: 26–27 s/đoạn và
   `content` rỗng vì chạm `max_tokens`. Gửi `chat_template_kwargs.enable_thinking=false`:
   0,3–8,6 s/đoạn, JSON hợp lệ. Template không dùng khoá này sẽ bỏ qua.
3. **Không khoá cứng tên model.** `model` mặc định là chuỗi rỗng; provider không gửi
   trường `model` và dùng đúng model đang nạp. `/v1/models` được đọc để hiện tên thật.
4. **Model hay trả ISO có giây/múi giờ** (`2026-11-02T09:00:00+07:00`). Normalize đã
   nhận và quy về `2026-11-02T09:00` theo `Asia/Ho_Chi_Minh`. Khi chuỗi gốc thiếu năm
   hoặc giờ, normalize **không tin** giá trị ISO model tự điền: bỏ `value` và gắn
   `nam_chua_ro` / `gio_chua_ro`.
5. **“Thứ Ba tuần sau” từng bị quy đổi lệch một ngày.** Prompt v2 chọn giải pháp an toàn:
   `start = null` + `ngay_tuong_doi`, người dùng tự điền.

---

## 4. Bảng cần bạn kiểm tra & cho ý kiến

> Chỉ gồm các mục **còn cần bạn làm hoặc chốt**. Các mục đã ✅ ở §2 không lặp lại.
> Mục “Vấn đề còn lại” (§5) tạm giữ nguyên, không đưa vào bảng này.
>
> Cách ghi vào cột cuối: `OK`, `Lỗi: …`, hoặc `A` / `B` với các mục cần chọn.
> Ưu tiên: **P0** = chặn nghiệm thu · **P1** = nên làm · **P2** = làm sau.

| ID | Nhóm | Điểm cần kiểm tra / chốt | Cách làm & kỳ vọng | Ưu tiên | Ý kiến của bạn |
|---|---|---|---|---|---|
| KT-B-03 | UI | Health khi server sẵn sàng | Mở Cài đặt → “Kiểm tra kết nối”; thấy báo kết nối + tên model thật | P0 | Đúng |
| KT-B-01 | UI | Health khi server tắt | Tắt server, bấm kiểm tra; báo lỗi rõ trong ≤ 2 s, UI không treo | P1 | Đúng |
| KT-B-10 | UI | Trang thật → sự kiện nháp | Quét một thông báo lớp, bấm “Trích sự kiện”; có tiến trình, tab Sự kiện có bản `Nháp` | P0 | Đúng |
| KT-B-11 | UI | Thông tin gắn vào sự kiện | Mở sự kiện vừa tạo; đủ 7 trường, `origin:'llm'`, `extractionMeta` có `runId`/`model`/`promptVersion`/`latencyMs`, có `quote` | P0 | Đúng |
| KT-B-13 | UI | Bản tin không có sự kiện | Trích một trang không có lịch; báo “Không tìm thấy sự kiện…”, không tạo bản ghi | P1 | Đúng |
| KT-B-16 | UI | Tài liệu dài bị cắt | Trích trang > 20.000 ký tự; có thông báo “Chỉ xử lý khoảng … ký tự đầu tiên” | P1 | Đúng, có thể gợi ý người dùng thay đổi giới hạn trong cài đặt khi gặp ngưỡng. |
| KT-B-17 | UI | Quét lại cùng trang | Trích cùng nội dung 2 lần; lần 2 không tăng số sự kiện, báo số sự kiện trùng | P1 | Đúng một phần, vẫn có tỉ lệ trích được sự kiện với cách diễn đạt khác từ LLM. |
| KT-B-19 | UI | Server tắt khi bấm trích | Tắt server rồi bấm trích; toast lỗi rõ, không treo, không ghi DB | P0 | Đúng |
| KT-B-22 | UI | Huỷ giữa chừng | Bấm “Huỷ” khi đang chạy đoạn 1/3; dừng request, báo “Đã huỷ”, không lưu | P1 | Đúng |
| KT-B-24 | UI | Đóng side panel khi đang trích | Đóng panel giữa lúc chạy; lần trích dừng — đúng phạm vi B, Slice C sẽ xử lý | P2 | Đúng |
| KT-B-26 | UI | Lưu cài đặt | Đổi model/temperature/chunk, lưu, mở lại panel/reload; giá trị còn nguyên | P1 | Đúng |
| KT-B-27 | UI | Giá trị cài đặt sai | Nhập endpoint sai, `maxChunks = 0`, temperature > 1; báo lỗi, không ghi đè cài đặt cũ | P2 | Đúng |
| KT-B-29 | UI | Quyền host và CSP | DevTools → Network khi gọi 8080; không lỗi CSP/permission, chỉ request tới `127.0.0.1:8080` | P1 | Đúng |
| KT-B-31 | UI | Side panel hẹp | Thử 320 / 360 / 400 px; thẻ tiến trình, form, nút Huỷ không tràn | P1 | Đúng |
| KT-B-34 | UI | Xuất/nhập JSON | Xuất rồi nhập lại; giữ `origin`/`extractionMeta`, không lỗi schema | P2 | Đúng |
| KT-B-08 | UI | Timeout | Đặt timeout rất thấp trong “Nâng cao”; báo timeout, không lưu sự kiện | P2 | Đúng |
| KT-B-09 | UI | Endpoint sai | Đổi endpoint sang cổng không được cấp quyền; báo lỗi rõ, không treo | P2 | Đúng |
| KT-B-04/28 | UI | API key (nếu bật `--api-key`) | Thử key rỗng/sai/đúng; 401 báo sai key, đúng thì kết nối được; kiểm tra header `Authorization` | P2 | Không kiểm tra, có thể thực hiện kiểm tra khi có chức năng kết nối tới các cổng API trực tuyến. |
| KT-B-30 | Chốt | Có mở thêm cổng 9931 không? | **A:** giữ chỉ 8080 (hiện tại) · **B:** thêm 9931 vào `host_permissions` + CSP | P2 | A |
| KT-B-18 | Chốt | Quét lại sự kiện đã huỷ | **A:** coi là trùng, không tạo lại (hiện tại) · **B:** cho phép tạo lại bản mới | P1 | A |
| KT-B-23 | Chốt | Huỷ đúng lúc đang lưu DB | **A:** lưu tiếp các bản đã có (hiện tại) · **B:** dừng và không lưu bản nào | P2 | A |
| KT-B-25 | Chốt | Lỗi DB giữa chừng | **A:** chấp nhận nháp một phần + báo rõ · **B:** rollback toàn bộ lần lưu | P2 | A |

---

## 5. Vấn đề còn lại

### 5.1. Đã sửa trong lần chạy thật

1. `response_format` mặc định đổi sang dạng OpenAI; `schema` trần chỉ còn là fallback.
2. Gửi `enable_thinking:false` để Qwen3/3.5 không ăn hết token vào suy luận.
3. Bỏ tên model mặc định; đọc `/v1/models` để hiện model thật.
4. Nhận ISO có giây/múi giờ trong normalize.
5. Prompt v2: ngày tương đối không chắc thì để `null`, không đoán.
6. Hiện thông báo khi tài liệu bị cắt vì `maxChunks`.
7. Chỉ lưu tên file model trong `extractionMeta`, không lưu đường dẫn đầy đủ.

### 5.2. Còn mở

8. **Chưa có hộp hướng dẫn khi server chưa kết nối.** Hiện chỉ báo toast sau khi bấm.
9. **Chưa có “Lấy từ clipboard”.** Cần chốt làm trong B hay dời sang C/D.
10. **Chưa đọc `usage` của llama.cpp** vào `InferenceResult`; số token hiện đo bằng probe riêng.
11. **Không log dạng `response_format` đã dùng.** Muốn điều tra fallback phải xem code/probe.
12. **API key lưu dạng thô trong IndexedDB.**
13. **Endpoint không bị giới hạn ở loopback.** Schema nhận URL bất kỳ; quyền host chỉ cho 8080.
14. **Huỷ không chặn giai đoạn lưu DB.** `AbortSignal` chỉ tác động lên `fetch`.
15. **Lỗi DB giữa chừng có thể để lại một phần nháp.** Chưa có rollback.
16. **Dedup coi cả sự kiện `huy`/`hoan_thanh` là đã tồn tại.**
17. **`health()` không nhận `AbortSignal` và luôn timeout 2 s.**
18. **Form cài đặt chỉ báo lỗi bằng toast**, không đánh dấu trường sai.
19. **Giả định `enable_thinking` được template bỏ qua nếu không hỗ trợ.** Chưa thử với model khác.
20. **Chưa kiểm tra UI Chrome**: trang thật, DB, huỷ, đóng panel, bề rộng 320/360/400 px.
21. **Bộ mẫu chất lượng còn nhỏ** (6 tài liệu); chưa đủ để chốt recall/precision.

### 5.3. Việc thuộc Slice C–E

22. Đóng side panel là mất lần chạy; chưa có offscreen/job/notification.
23. Chưa có badge “Máy đề xuất”, nhóm nháp từ máy, duyệt hàng loạt (Slice D).
24. Chưa đo trên bộ 12–15 tài liệu (Slice E).
25. `EXTRACTION_JOB_KEY` và `ExtractionJobSchema` đã có nhưng chưa dùng.

---

## 6. Thứ tự làm tiếp

> **Đã được thay thế** ngày 2026-10-23 bởi
> [`ke-hoach-sau-nghiem-thu-b.md`](./ke-hoach-sau-nghiem-thu-b.md). Phần dưới giữ làm
> lịch sử nghiệm thu.

1. Load `dist/` unpacked; mở tab Cài đặt → “Kiểm tra kết nối” (KT-B-01…04).
2. Quét một trang thật → “Trích sự kiện” → kiểm tra nháp trong DB và `extractionMeta`
   (KT-B-10…15).
3. Thử server tắt, huỷ giữa chừng, đóng panel, side panel 320/360/400 px (KT-B-19…31).
4. Xuất/nhập JSON để chắc `origin`/`extractionMeta` không mất (KT-B-34).
5. Chốt hành vi dedup với sự kiện đã huỷ và huỷ trong lúc lưu (KT-B-18/23).
6. Thêm hộp hướng dẫn khi server chưa kết nối; quyết định clipboard.
7. Đo thêm 12–15 tài liệu rồi mới chuyển sang Slice C nếu muốn giữ đúng thứ tự.

---

## 7. Định nghĩa “Slice B xong”

- [x] `/health` 200 và provider đọc được model thật.
- [x] Văn bản thật → candidate đủ `origin` + `extractionMeta` + nguồn trích (pipeline).
- [x] Trang thật trong Chrome → bấm trích → có ≥ 1 sự kiện nháp trong DB.
- [x] Server tắt → UI báo rõ, không treo, không ghi DB.
- [x] JSON sai sau retry → không có sự kiện rác.
- [x] Huỷ giữa chừng → không ghi sự kiện (unit test).
- [x] Quét lại cùng trang → không tăng số sự kiện (unit test).
- [x] `typecheck`, `lint`, `test`, `build` xanh.
- [x] Đã ghi dạng `response_format`, latency và model thực tế vào tài liệu kế hoạch.

---

# Vấn đề

- Khi có từ 2 hồ sơ trở lên, hồ sơ tạo sau không được đưa vào quá trình trích sự kiện, khiến sự kiện liên quan đến hồ sơ đó không được trích.
  - Đề xuất giải pháp: Thay đổi mô hình từ "biết hồ sơ, xác định sự kiện" thành "biết sự kiện, khớp với hồ sơ"
- Sau khi hoàn thành trích sự kiện, không có giao diện duyệt để người dùng soát qua các sự kiện nháp.
  - Đề xuất giải pháp: Tạo một giao diện mới "Duyệt sự kiện đã trích", xuất hiện sau khi hệ thống thực hiện trích sự kiện và có kết quả cần duyệt.