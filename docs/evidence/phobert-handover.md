# Nguồn số liệu PhoBERT trong báo cáo (TASK 06)

> **Nguyên tắc:** không tự điền số, không suy diễn. Mỗi số ở báo cáo §5.2/§5.5
> phải có nguồn và trạng thái: **xác minh được** (đọc từ file trong repo) hoặc
> **chỉ bàn giao** (nhóm huấn luyện cung cấp, chưa có log/test predictions để
> kiểm chứng lại).

## 1. Số xác minh được từ file trong repo

| Số / thông tin | Nguồn | Trạng thái |
|---|---|---|
| Model nền: `vinai/phobert-base-v2` | `ml_hasevent_filter/handover_api_code/model_config.json` (`model_name`) | Xác minh được |
| `max_length = 128` | `model_config.json` (`max_length`) **và** `app.py` (`MAX_LENGTH = 128`) — hai nguồn khớp nhau | Xác minh được |
| Ngưỡng TASK `0.50`, ngưỡng duyệt `0.65` | `model_config.json` (`task_threshold`, `review_threshold`) **và** `app.py` (`TASK_THRESHOLD`, `REVIEW_THRESHOLD`) — khớp nhau | Xác minh được |
| Nhãn `0 = NON_TASK`, `1 = TASK` | `model_config.json` (`labels`) | Xác minh được |
| Tham số huấn luyện: scheduler `linear`, optimizer `adamw_torch_fused`, cờ `fp16`/`bf16` có mặt trong đối tượng | `models/phobert_task_classifier_final/training_args.bin` (đọc chuỗi pickle) | Xác minh được (tên tham số) |
| Giá trị số của batch/epochs/lr | `training_args.bin` — pickle của `TrainingArguments` **không giải được** (cần `transformers`); chỉ đọc được tên khoá | **Chưa xác minh** |
| `output_dir` huấn luyện = `/content/drive/MyDrive/NLP_TASK_NON_TASK/models/phobert_final_runs` | `training_args.bin` (chuỗi pickle) | Xác minh được — **đường dẫn cá nhân Colab, KHÔNG đưa vào báo cáo; file cần sanitize/xoá trước khi chia sẻ (TASK 08)** |
| Mặc định thư mục model: `handover_api_code/models/phobert_task_classifier_final` (env `MODEL_DIR` ghi đè) | `app.py` dòng 17–23 | Xác minh được |

## 2. Số chỉ có trong bàn giao (chưa xác minh độc lập)

Bộ số ở báo cáo §5.2 (tập dữ liệu và kết quả huấn luyện) **không tồn tại trong
repo** dưới dạng log hay file predictions — chỉ có trong lời bàn giao của nhóm
huấn luyện. Kiểm tra nhất quán số học nội bộ:

| Khẳng định | Kiểm tra | Kết quả |
|---|---|---|
| 200 mẫu = 114 + 44 + 42 | 114 + 44 + 42 = 200 | Nhất quán |
| Train 114 = 58 + 56 | 58 + 56 = 114 | Nhất quán |
| Dev 44 = 22 + 22 | Nhất quán | Nhất quán |
| Test 42 = 20 + 22 | Nhất quán | Nhất quán |
| Accuracy test = 92,86% | 39/42 = 92,857…% | Nhất quán |
| Precision TASK = 86,96% | 20/(20+3) = 20/23 = 86,956…% | Nhất quán |
| F1 TASK = 93,02% | recall 22/22 = 100%, precision 86,96% → 2·P·R/(P+R) = 93,02% | Nhất quán (với giả định recall 100%) |
| Validation 97,73% / 97,78% | Không có nguồn trong repo | **Chỉ bàn giao** |

Trạng thái cuối: **chỉ bàn giao, nhất quán số học nội bộ, chưa xác minh độc lập**
(không có log huấn luyện hay file predictions trong bàn giao).

## 3. Cách ghi trong báo cáo

- Các câu đã đúng ở §5.5/§6.2 về giới hạn giữ nguyên; thêm footnote một dòng:
  > *Số liệu huấn luyện PhoBERT do nhóm huấn luyện cung cấp; nhóm báo cáo chỉ
  > kiểm tra nhất quán số học và cấu hình suy luận (`model_config.json`,
  > `app.py`), không có log huấn luyện để kiểm chứng lại.*
- Không thêm bất kỳ số mới nào vào §5.2/§5.5.
- Không đưa `output_dir` (`/content/drive/...`) hay đường dẫn cá nhân nào vào báo cáo.
