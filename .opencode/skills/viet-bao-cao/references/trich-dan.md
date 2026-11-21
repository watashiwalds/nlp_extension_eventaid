# Chuẩn trích dẫn

Mặc định: **IEEE** (số trong ngoặc vuông). Nếu trường bắt buộc APA 7 hoặc Harvard, đổi toàn bộ
**một lần** và ghi rõ trong lần báo cáo tiến độ — không trộn hai kiểu.

## 1. Trích trong thân bài

| Tình huống | Cách viết |
|---|---|
| Một nguồn | `... theo nghiên cứu của Nguyễn và cộng sự [1].` |
| Nhiều nguồn rời | `... đã được chứng minh [1], [3], [5].` |
| Dải liên tiếp | `... trong các công trình [2]–[4].` |
| Trích nguyên văn ngắn | `... "nguyên văn" [2, tr. 45].` |
| Nêu tên tác giả | `Vaswani và cộng sự [7] đề xuất ...` |

Quy tắc:

- Đặt trước dấu chấm, phẩy của câu: `... (Hình 2) [4].` **không** viết `... [4].` sau dấu chấm.
- Đánh số theo **lần xuất hiện đầu tiên**, không theo bảng chữ cái.
- Mỗi số chỉ ứng với một tài liệu; không gộp hai tài liệu vào một số.
- Không dùng `[?]`, `[x]`, `[N]`, hay "nguồn: internet".
- Hạn chế trích dẫn thứ cấp; nếu buộc phải trích, ghi "dẫn theo [n]".
- Không trích Wikipedia, blog cá nhân, diễn đàn. Ngoại lệ: tài liệu chính thức của nhà phát triển
  (Chrome for Developers, Hugging Face model card, repo chính thức).

## 2. Danh mục tham khảo (Phần 7)

Mỗi tài liệu **một dòng**, bắt đầu bằng số và dấu chấm, không xuống dòng trong cùng một mục:

```text
1. Tác giả. (Năm). Tiêu đề. Nguồn, tập(số), trang. DOI/URL
```

Script `check` nhận diện mục tham khảo bằng regex `^\d+\.\s`. Dòng nào không khớp sẽ bị bỏ qua.

### 2.1. Bài báo tạp chí

```text
1. D. Q. Nguyen and A. T. Nguyen, "PhoBERT: Pre-trained language models for Vietnamese,"
   Findings of the Association for Computational Linguistics: EMNLP 2020, pp. 1037–1042, 2020,
   doi: 10.18653/v1/2020.findings-emnlp.92.
```

### 2.2. Bài hội nghị

```text
2. A. Vaswani et al., "Attention is all you need," in Proc. Advances in Neural Information
   Processing Systems (NeurIPS), Long Beach, CA, USA, 2017, pp. 5998–6008.
```

### 2.3. Sách / giáo trình

```text
3. C. D. Manning and H. Schütze, Foundations of Statistical Natural Language Processing.
   Cambridge, MA, USA: MIT Press, 1999.
```

### 2.4. Luận văn, đồ án

```text
4. N. V. A., "Tên đề tài," Đồ án tốt nghiệp, Khoa Công nghệ Thông tin, Trường Đại học X,
   Hà Nội, Việt Nam, 2025.
```

### 2.5. Tài liệu kỹ thuật trực tuyến (bắt buộc có ngày truy cập)

```text
5. Google, "Manifest V3," Chrome for Developers. [Online].
   Available: https://developer.chrome.com/docs/extensions/develop/migrate
   [Accessed: Nov. 21, 2026].
```

### 2.6. Phần mềm / mã nguồn

```text
6. G. Gerganov et al., "llama.cpp: LLM inference in C/C++," version b10827, 2026. [Online].
   Available: https://github.com/ggml-org/llama.cpp
```

### 2.7. Mô hình / bộ dữ liệu

```text
7. Dat Quoc Nguyen, "vinai/phobert-base-v2," Hugging Face, 2020. [Online].
   Available: https://huggingface.co/vinai/phobert-base-v2
```

### 2.8. Bản in trước (preprint)

```text
8. Y. Liu et al., "RoBERTa: A robustly optimized BERT pretraining approach," arXiv:1907.11692,
   2019.
```

## 3. Quy ước riêng cho báo cáo này

- Tên tác giả Việt Nam: giữ dấu, viết `Nguyễn Văn A.` (không viết `N. V. A.`) để nhất quán với
  văn bản tiếng Việt; tác giả nước ngoài giữ kiểu IEEE `A. B. Author`.
- Tên tài liệu tiếng Anh: giữ nguyên, đặt trong ngoặc kép; tên tạp chí/hội nghị in nghiêng.
- DOI ưu tiên hơn URL; nếu có DOI thì không cần ngày truy cập.
- Nhiều tác giả: IEEE cho phép `et al.` từ tác giả thứ 7; dưới 6 tác giả liệt kê đủ.
- Trang: dùng gạch ngang en dash `–` (U+2013), không dùng `-`.

## 4. Quy trình kiểm chứng nguồn (bắt buộc)

1. Mở DOI (`https://doi.org/...`) hoặc URL bằng công cụ đọc web.
2. Đối chiếu **tiêu đề, tác giả, năm, nơi công bố** với những gì sẽ ghi.
3. Kiểm tra tài liệu có thật sự nói điều mình quy kết (đọc phần liên quan, không chỉ abstract).
4. Ưu tiên: bài bình duyệt → tài liệu chính thức của nhà phát triển → preprint → bài blog kỹ thuật.
5. Nếu không mở được hoặc không chắc: để `[CẦN-NGUỒN]` và báo người dùng, **không** đoán metadata.

## 5. Nguồn nên có cho báo cáo này

Kiểm chứng lại metadata trước khi dùng; danh sách này chỉ là gợi ý chủ đề.

| Chủ đề | Nguồn gợi ý |
|---|---|
| Transformer, self-attention | Vaswani et al., NeurIPS 2017 |
| RoBERTa | Liu et al., arXiv:1907.11692, 2019 |
| PhoBERT, tách từ tiếng Việt | Nguyen & Nguyen, Findings of EMNLP 2020 |
| Readability, trích nội dung trang | Repo `mozilla/readability`, bài về boilerplate removal |
| Manifest V3, offscreen, service worker | Chrome for Developers |
| llama.cpp, GGUF, lượng tử hoá | Repo `ggml-org/llama.cpp`, tài liệu GGUF |
| JSON Schema, sinh có ràng buộc | json-schema.org, bài về constrained decoding |
| Đánh giá phân loại | sách/giáo trình về precision–recall–F1 |

## 6. Nếu chuyển sang APA 7

- Trong bài: `(Nguyen & Nguyen, 2020)` hoặc `Nguyen và Nguyen (2020)`.
- Danh mục xếp theo bảng chữ cái, không đánh số, thụt lề treo 1.27cm:
  `Nguyen, D. Q., & Nguyen, A. T. (2020). PhoBERT: Pre-trained language models for Vietnamese.
  In Findings of EMNLP 2020 (pp. 1037–1042). https://doi.org/10.18653/v1/2020.findings-emnlp.92`
- Khi đổi kiểu, phải sửa **toàn bộ** trích dẫn trong 6 phần đầu và viết lại Phần 7.
