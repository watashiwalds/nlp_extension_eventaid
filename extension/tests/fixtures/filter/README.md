# Bộ mẫu đo sàng lọc (TASK 04 / Slice F3)

Bộ 27 tài liệu dùng để đo đầu-cuối ba chế độ sàng lọc `off` / `report` / `screen`
bằng dịch vụ PhoBERT thật ở `127.0.0.1:8081` và llama-server ở `127.0.0.1:8080`.

## Thành phần

| Nhóm | Số mẫu | Id | Nguồn |
|---|---:|---|---|
| Dương (có lịch trình) | 14 | `E01`–`E05`, `E07`–`E15` | **Tái dùng nguyên văn** text + gold + `allowedDates` từ `tests/fixtures/eval/` (bộ F3 đã chốt). E06 là mẫu âm nên không thuộc nhóm này; E16/E17 không thuộc bộ 14. |
| Âm (nhiễu) | 13 | `E06`, `N01`–`N12` | `E06` tái dùng từ bộ E; `N01`–`N12` tự soạn (menu/footer, quảng cáo, bình luận, đăng nhập, email xã giao, bảo trì, FAQ, điều khoản…), mỗi mẫu ≥ 5 câu. |

## Quy ước

- **Ép nguồn `web_page`** kèm `sourceUrl` giả (`https://example.com/eval/<id>`):
  `resolveFilterMode()` trả `off` cho `selection`/`paste` (`prefilter.ts`), giữ
  nguồn gốc thì phép đo sàng lọc vô nghĩa.
- `expectedDecision` là ground truth "bộ lọc hoàn hảo phải kết luận gì"
  (`has_event` cho dương, `no_event` cho âm) — dùng để chấm bỏ sót/bỏ qua đúng,
  không phải cam kết model phải đạt tuyệt đối.
- `now` cố định `EVAL_NOW = 2026-10-22T08:00+07:00` như bộ E.
- Positive không có `mockOutput`: harness đo đầu-cuối chạy provider thật
  (`LlamaCppProvider`), không chạy MockProvider.

## Cam kết freeze

Giống bộ E (`tests/fixtures/eval/README.md`): sau lần đo đầu tiên **không sửa**
`text`/`goldEvents`/`allowedDates`/`expectedDecision` của mẫu đã đo. Nếu buộc
phải sửa (lỗi chính tả, gold sai), phải chạy lại toàn bộ và lưu evidence riêng,
không trộn số cũ/mới.

## Người soạn / rà

- Soạn: `N01`–`N12` tự soạn theo danh mục nhiễu của kế hoạch TASK 04
  (`bao-cao/ke-hoach-cai-thien-bao-cao.md`), ngày 23/11/2026.
- Positive/negative gán theo gold của bộ E (đã freeze trước đó).
- Không dùng dữ liệu cá nhân; mọi tên/địa chỉ đều chung chung.
