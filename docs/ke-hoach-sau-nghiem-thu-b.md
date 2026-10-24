# Kế hoạch sau nghiệm thu Phiên B

> **Mốc:** 2026-10-23 · Phiên B đã được nghiệm thu.
> **Nguồn:** [`kiem-tra-slice-b.md`](./kiem-tra-slice-b.md) — bảng §4 và mục “Vấn đề”.
> **Phạm vi:** chỉ xử lý các vấn đề **không thuộc** Slice C/D/E. Việc đã có phiên riêng
> hoặc có thể giải quyết ở phiên sau được ghi nhận rồi **bỏ qua** theo yêu cầu.
> **Đã thực hiện:** SB-01 và SB-03 xong; quality gate **159 test / 19 file** xanh.
> Chưa chạy lại model thật trong phiên này (xem §3.8).

---

## 1. Chốt nghiệm thu

- Các mục kiểm tra UI/provider trong §4 (trừ API key) đều được xác nhận **Đúng**.
- API key (KT-B-04/28) **chưa kiểm tra**; sẽ làm khi có nhu cầu kết nối API trực tuyến.
- Bốn quyết định hành vi đều chọn **A**:
  - giữ cổng `8080`, không mở `9931`;
  - sự kiện đã huỷ vẫn được coi là đã tồn tại khi dedup;
  - huỷ trong lúc lưu DB thì tiếp tục lưu các bản đã có;
  - lỗi DB giữa chừng chấp nhận nháp một phần và báo rõ.
- Hai vấn đề mới cần xử lý:
  1. **Hồ sơ tạo sau không được khớp** khi có từ 2 hồ sơ trở lên.
  2. **Chưa có giao diện duyệt** các sự kiện nháp sau khi trích.
- Một gợi ý UX: khi tài liệu bị cắt, nên hướng người dùng tăng giới hạn trong Cài đặt.

---

## 2. Phân loại phạm vi

| ID | Vấn đề | Nguồn | Quyết định | Lý do |
|---|---|---|---|---|
| SB-01 | Hồ sơ tạo sau không được khớp | Mục “Vấn đề” | **Đã xong — P0** | Prompt v3 + matcher tất định sau normalize |
| SB-02 | Chưa có UI duyệt sự kiện nháp | Mục “Vấn đề” | **Bỏ qua** | Thuộc Slice D; sẽ chốt phạm vi khi làm D |
| SB-03 | Gợi ý khi tài liệu bị cắt | KT-B-16 | **Đã xong — P2** | Toast có gợi ý tăng giới hạn trong Cài đặt |
| SB-04 | Dedup khi LLM diễn đạt khác | KT-B-17 | **Bỏ qua** | Thuộc Slice D — duyệt & chống trùng |
| SB-05 | API key chưa kiểm tra | KT-B-04/28 | **Bỏ qua** | Chưa dùng API trực tuyến |
| SB-06 | Huỷ trong lúc lưu DB | KT-B-23 | **Giữ A** | Hành vi đã chốt, không đổi code |
| SB-07 | Lỗi DB để lại nháp một phần | KT-B-25 | **Giữ A** | Hành vi đã chốt, không đổi code |
| SB-08 | Dedup sự kiện đã huỷ | KT-B-18 | **Giữ A** | Hành vi đã chốt, không đổi code |
| SB-09 | Mở thêm cổng 9931 | KT-B-30 | **Giữ A** | Chỉ dùng `127.0.0.1:8080` |
| SB-10 | Nợ kỹ thuật §5.2 | §5.2 | **Bỏ qua** | Không chặn nghiệm thu; xử lý sau |
| SB-11 | Offscreen, notification, đo chất lượng | §5.3 | **Bỏ qua** | Đã có Slice C/D/E |

> Tài liệu này **thay thế §6 “Thứ tự làm tiếp”** của `kiem-tra-slice-b.md`.
> Các mục SB-02/04/05/10/11 không có task chi tiết ở đây.

---

## 3. SB-01 — Khớp hồ sơ sau khi trích (P0 — đã xong)

### 3.1. Hiện trạng

- `ui/actions/extract.ts` truyền **toàn bộ** `state.profiles` vào pipeline, nên lỗi
  không phải do thiếu dữ liệu hồ sơ trong store/DB.
- `core/extraction/prompt.ts` đưa cả danh sách hồ sơ vào system prompt và yêu cầu model
  vừa trích sự kiện vừa trả `profileIds`.
- `core/extraction/normalize.ts` chỉ lọc các id model đã trả; không có bước khớp độc lập.
- Với từ 2 hồ sơ, model bỏ sót hồ sơ không nằm ở đầu danh sách. Chưa có test tái hiện
  bằng 2 hồ sơ; đây là lỗi chất lượng, không phải lỗi lưu trữ.

### 3.2. Hướng giải quyết

Đổi thứ tự nhiệm vụ:

```text
Trước:  hồ sơ + văn bản → model vừa trích sự kiện vừa chọn hồ sơ
Sau:    văn bản → model trích sự kiện (không biết hồ sơ)
                    → normalize
                    → khớp sự kiện với toàn bộ hồ sơ (deterministic, core/)
                    → dedup → lưu nháp
```

Nguyên tắc:

1. **Không đưa hồ sơ vào prompt trích.** Model chỉ làm một việc: tìm sự kiện.
2. **Khớp sau khi đã có sự kiện.** Dùng toàn bộ hồ sơ, không phụ thuộc thứ tự tạo.
3. **Khớp trên bằng chứng của sự kiện**: `quote` trước, sau đó `title`, `summary`,
   tiêu đề tài liệu. Không quét toàn văn để tránh gán mọi hồ sơ trong một thông báo nhóm.
4. **Không đoán.** Không tìm thấy hồ sơ → `relatedProfiles: []`; `makeEvent` đã thêm
   `chua_ro_ho_so` để UI nhắc người duyệt.
5. **Không thêm LLM call, không thêm quyền, không gọi mạng.**

### 3.3. Prompt v3 và schema

Trong `core/extraction/prompt.ts`:

- Bỏ khối “Hồ sơ hợp lệ…” và `JSON.stringify(profiles)`.
- Bỏ quy tắc “Chỉ chọn profileIds…”.
- Bỏ `profileIds` khỏi few-shot.
- Thêm vào quy tắc `quote`: “nếu văn bản có tên người liên quan, chọn đoạn chứa cả
  thời điểm, tên sự kiện và tên người đó”.
- Đổi `PROMPT_VERSION` thành `'v3'`.

Trong `core/extraction/schema.ts`:

- Bỏ `profileIds` khỏi `RawEventSchema`.
- Bỏ `profileIds` khỏi `required` và `properties` của `EXTRACTION_RESPONSE_SCHEMA`.
- Giữ `additionalProperties: false`; model không được tự sinh trường lạ.

Trong `core/extraction/types.ts`:

- Bỏ `profiles` khỏi `PromptContext`.
- Bỏ `profileIds` khỏi `NormalizeContext`.
- Giữ `Profile[]` trong `ExtractRequest` vì pipeline vẫn cần để khớp.

`MockProvider` và fixture test bỏ `profileIds`; không đổi `EventCandidate`/`Event`/DB.

### 3.4. Module khớp hồ sơ

Tạo `core/extraction/profile-match.ts` — hàm thuần, không phụ thuộc Chrome:

```ts
export interface ProfileMatchInput {
  title: string;
  summary: string[];
  quote?: string;
  documentTitle?: string;
}

export function matchProfileIds(input: ProfileMatchInput, profiles: Profile[]): string[];
export function attachProfiles(
  candidate: EventCandidate,
  profiles: Profile[],
  documentTitle?: string,
): EventCandidate;
```

Cách khớp:

1. **Chuẩn hoá văn bản**: NFD, bỏ dấu, `đ → d`, lowercase, gom khoảng trắng;
   giữ `@` và `.` cho email.
2. **Tạo terms cho từng hồ sơ**:
   - tên đầy đủ — điểm cao;
   - biệt danh — điểm cao;
   - email — điểm cao;
   - từ khoá — điểm thấp, chỉ dùng khi không có tín hiệu mạnh.
   - Không dùng `role`/`org` một mình để tránh gán cả lớp cho một hồ sơ.
3. **Khớp theo ranh giới từ**, không khớp chuỗi con:
   - `An` không khớp trong `Anh`;
   - term một từ phải dài tối thiểu 2 ký tự; từ khoá tối thiểu 3 ký tự.
4. **Nguồn bằng chứng**:
   - `quote` hệ số cao nhất;
   - `title` và `summary` hệ số trung bình;
   - tiêu đề tài liệu chỉ dùng cho tên đầy đủ/biệt danh, không dùng cho từ khoá.
5. **Chọn kết quả**:
   - nếu có ít nhất một tín hiệu mạnh (tên/biệt danh/email), chỉ trả các hồ sơ mạnh;
   - nếu không có tín hiệu mạnh, mới xét từ khoá duy nhất (không dùng từ khoá trùng
     giữa nhiều hồ sơ) và chỉ khi từ khoá xuất hiện trong `quote`;
   - sắp theo điểm rồi tên, khử trùng, tối đa 10 id.
6. **Thứ tự hồ sơ không ảnh hưởng kết quả**.

Nếu sau này đo thấy cách khớp tất định bỏ sót quan hệ ngữ nghĩa (ví dụ “bố”, “ông
ngoại”), mở task riêng cho một lượt LLM chỉ để khớp; **không gộp vào SB-01**.

### 3.5. Nối vào pipeline

Trong `core/extraction/pipeline.ts`:

1. Bỏ `const profileIds = request.profiles.map(...)`.
2. `buildPrompt` chỉ nhận `document`, `now`, `timezone`.
3. `normalizeEvents` trả candidate với `relatedProfiles: []`.
4. Với từng candidate, gọi `attachProfiles(candidate, request.profiles, document.title)`.
5. Đưa candidate đã khớp vào bước dedup như cũ.

Không đổi `ExtractionOutcome`, `ExtractionMeta`, `CandidateRunMeta`; `promptVersion`
trong meta sẽ tự thành `v3`.

### 3.6. Test

Thêm `tests/core/extraction-profile-match.test.ts`, tối thiểu:

- [ ] Khớp tên đầy đủ có dấu/không dấu, hoa/thường.
- [ ] Khớp biệt danh và email.
- [ ] Khớp từ khoá duy nhất khi không có tên.
- [ ] Không khớp `An` trong `Anh`; không khớp từ khoá chung của 2 hồ sơ.
- [ ] Trả nhiều hồ sơ khi sự kiện nhắc nhiều người.
- [ ] Không có tên → `[]`.
- [ ] Đảo thứ tự mảng hồ sơ → cùng kết quả.
- [ ] Hồ sơ có `createdAt` muộn vẫn được khớp (đúng lỗi nghiệm thu).

Cập nhật test hiện có:

- `tests/core/extraction-pipeline.test.ts`: dùng 2 hồ sơ; sự kiện nhắc hồ sơ thứ hai;
  thêm trường hợp đảo thứ tự; `run.promptVersion === 'v3'`.
- `tests/core/extraction-schema.test.ts`: schema không còn `profileIds`.
- Thêm test prompt: system prompt không chứa tên/id hồ sơ, không còn `profileIds`.
- `tests/core/extraction-normalize.test.ts`: bỏ `profileIds` khỏi context; candidate
  trước khớp có `relatedProfiles: []`.
- `tests/core/extraction-dedup.test.ts`: fixture không còn `profileIds`.
- `tests/ui/smoke.test.ts`: chỉ sửa nếu fixture thay đổi.

### 3.7. File dự kiến

- `extension/src/core/extraction/profile-match.ts` (mới)
- `extension/src/core/extraction/prompt.ts`
- `extension/src/core/extraction/schema.ts`
- `extension/src/core/extraction/types.ts`
- `extension/src/core/extraction/normalize.ts`
- `extension/src/core/extraction/pipeline.ts`
- `extension/src/core/extraction/mock-provider.ts`
- `extension/tests/core/extraction-profile-match.test.ts` (mới)
- các test extraction hiện có

Không cần sửa `shared/contracts.ts`, `platform/storage/db.ts`, manifest hay UI.

### 3.8. Nghiệm thu SB-01

- [x] Với 2 hồ sơ, sự kiện nhắc hồ sơ tạo sau được gắn đúng id.
- [x] Đảo thứ tự hồ sơ trong mảng cho cùng kết quả.
- [x] Sự kiện không nhắc ai → `relatedProfiles: []` và có `chua_ro_ho_so`.
- [x] Không khớp chuỗi con, không gán theo từ khoá chung.
- [x] Prompt/schema không còn `profileIds`; `PROMPT_VERSION = 'v3'`.
- [x] Không thêm request LLM, quyền hay host permission.
- [x] `npm run typecheck`, `npm run lint`, `npm test`, `npm run build` xanh.
- [x] Chạy lại bộ 6 tài liệu mẫu hồi quy: không tăng ngày bịa; case 2 hồ sơ khớp đúng.
- [x] Cập nhật `kiem-tra-slice-b.md` và `ke-hoach-llm-trich-xuat.md` sau khi xong.

> **Kết quả chạy lại 2026-10-23** (Qwen3.5-4B Q5_K_S, 8k context, prompt v3):
> 2 hồ sơ khớp đúng `prf_binh` ở cả hai thứ tự; bộ 6 tài liệu mẫu cho 9 sự kiện,
> 0 trùng, 0 lỗi schema, 0 ngày bịa; latency 0,26–8,4 s/tài liệu; tài liệu dài 2 đoạn.
> Lần chạy này phát hiện model tự điền năm cho nguồn `8:00 ngày 15/11`; `normalizeDateTime`
> đã được siết để bỏ `value` khi chuỗi gốc thiếu năm/giờ và thêm test hồi quy.

### 3.9. Rủi ro và cách giảm

| Rủi ro | Mức | Giảm thiểu |
|---|---|---|
| Tên chỉ nằm ngoài `quote` | Trung bình | Dùng thêm title/summary/tiêu đề tài liệu; không quét toàn văn |
| Biệt danh trùng hoặc quá ngắn | Trung bình | Ranh giới từ, độ dài tối thiểu, trả nhiều hồ sơ để người dùng sửa |
| Từ khoá chung gây gán nhầm | Trung bình | Chỉ dùng khi không có tín hiệu mạnh, từ khoá phải duy nhất |
| Model trả quote không có tên | Trung bình | Prompt v3 yêu cầu thêm tên; nếu vẫn thiếu thì để `[]`, không đoán |
| Đổi schema output làm hỏng provider | Thấp | `PROMPT_VERSION` v3, test schema, chạy thật một lần trước khi chốt |
| Khớp tất định bỏ sót quan hệ ngữ nghĩa | Trung bình | Chấp nhận trong SB-01; đo ở Slice E rồi cân nhắc LLM match riêng |

---

## 4. SB-03 — Gợi ý khi tài liệu bị cắt (P2 — đã xong)

Hiện toast chỉ báo “Chỉ xử lý khoảng … ký tự đầu tiên”. Bổ sung câu:

> “Tăng ‘Số đoạn tối đa’ hoặc ‘Ký tự mỗi đoạn’ trong Cài đặt nếu cần.”

Cách làm:

1. Tách `truncationText(processedChars)` trong `ui/format.ts` để test được.
2. Test nội dung gợi ý; `ui/actions/extract.ts` chỉ nối câu này khi `outcome.truncated`.
3. Không thêm nút/link trong toast; giữ UI đơn giản.

Nghiệm thu: khi trích tài liệu dài, toast có thêm gợi ý; tài liệu ngắn không đổi.

---

## 4b. SB-12 — Ngày chỉ có ngày và đối chiếu raw (P0 — đã xong)

**Lỗi:** nguồn chỉ có ngày (ví dụ `25/10/2026`, `29/10/2026`) nhưng model trả
`2026-10-25T00:00` và hoán đổi `startRaw`/`endRaw`. `normalizeDateTime` cũ bỏ toàn bộ
`value` vì thiếu giờ, nên sự kiện nháp mất cả ngày lẫn đầu mối.

**Cách sửa:**

1. `DateTimeRefSchema` thêm `date: YYYY-MM-DD | null` (mặc định `null` cho bản ghi cũ).
2. Thiếu giờ nhưng biết ngày → `value = null`, `date = ngày`. `raw` giữ nguyên nếu khớp;
   nếu raw bị hoán đổi/lệch thì lấy đoạn nguồn ngắn quanh đúng ngày.
3. Ngày ISO được đối chiếu với ngày tuyệt đối trong `raw` và đoạn nguồn; lệch →
   bỏ `value`/`date`, thêm `ngay_khong_khop`.
4. Giữ `end` khi có `date` dù `start.value` là `null`; thời lượng chỉ tính khi cả hai
   `value` đều có.
5. Form sự kiện cho phép chỉ nhập ngày; `eventTiming`, `sortEvents`, `upcomingEvents`
   và dedup dùng `date` khi `value` trống.
6. Prompt v4: nhấn mạnh không thêm `00:00`, không hoán đổi raw, chỉ gộp khoảng khi
   văn bản nói rõ.

**Nghiệm thu:** test hồi quy cho đúng payload `25/10/2026` + `29/10/2026`, raw bị hoán
đổi, ngày lệch nguồn, raw rỗng, form chỉ có ngày, thời gian/sắp xếp và dedup theo ngày.
Quality gate xanh; không thêm quyền, không đổi DB, không gọi mạng ngoài llama.cpp.

---

## 5. Thứ tự thực hiện

| Bước | Việc | Kết quả |
|---|---|---|
| 1 | Viết test tái hiện lỗi 2 hồ sơ | Test đỏ, xác nhận đúng lỗi |
| 2 | Tạo `profile-match.ts` + test đơn vị | Matcher chạy độc lập |
| 3 | Bỏ hồ sơ khỏi prompt/schema, bump v3 | Model chỉ trích sự kiện |
| 4 | Nối matcher vào pipeline, sửa fixture | Pipeline xanh |
| 5 | Chạy quality gate | 4 lệnh xanh |
| 6 | Chạy lại 6 tài liệu thật + case 2 hồ sơ | Xác nhận chất lượng |
| 7 | SB-03 nếu còn thời gian | Toast có gợi ý |
| 8 | Cập nhật tài liệu | Trạng thái khớp thực tế |

**Điều kiện dừng:** nếu bước 6 phát hiện matcher bỏ sót nhiều hồ sơ, không mở rộng
sang LLM match ngay; ghi số đo, chốt có làm task riêng hay không.

---

## 6. Không làm trong kế hoạch này

- **SB-02 — UI duyệt sự kiện nháp:** thuộc Slice D. Khi làm D sẽ chốt giữa màn hình
  riêng và tận dụng tab Sự kiện hiện có.
- **SB-04 — dedup theo cách diễn đạt:** Slice D; cần ngữ nghĩa/embedding hoặc LLM,
  không giải quyết bằng chuẩn hoá tiêu đề.
- **SB-05 — API key:** chỉ có nghĩa khi có API trực tuyến; hiện ưu tiên llama.cpp local.
- **SB-06/07/08/09:** giữ hành vi A đã chốt; không đổi code.
- **SB-10 — nợ kỹ thuật §5.2:** hộp hướng dẫn, clipboard, usage, log response_format,
  API key thô, giới hạn loopback, health abort, lỗi theo trường… để sau.
- **SB-11 — Slice C/D/E:** offscreen, notification, duyệt hàng loạt, bộ đo 12–15 tài liệu.

---

## 7. Định nghĩa “xong đợt này”

- [ ] SB-01 đạt toàn bộ mục 3.8.
- [ ] Không có thay đổi nào ngoài phạm vi prompt/schema/matcher/pipeline/test.
- [ ] Không thêm quyền, không thêm request mạng, không đổi DB.
- [ ] Tài liệu trạng thái được cập nhật; các mục bỏ qua vẫn nằm trong backlog có chủ đích.
