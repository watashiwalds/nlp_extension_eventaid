# Vietnamese TASK/NON_TASK API

API sử dụng PhoBERT để phát hiện câu giao việc (TASK) trong đoạn văn tiếng Việt.

## 1. Cấu trúc thư mục cần có

```text
handover_api_code/
├── app.py
├── requirements.txt
├── README_API.md
├── postman_collection.json
└── models/
    └── phobert_task_classifier_final/
        ├── config.json
        ├── model.safetensors
        ├── vocab.txt
        ├── bpe.codes
        ├── tokenizer_config.json
        ├── added_tokens.json
        └── training_args.bin
