
import os
import re
from pathlib import Path

import torch
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from pyvi import ViTokenizer
from transformers import AutoModelForSequenceClassification, AutoTokenizer


# ============================================================
# 1. CẤU HÌNH
# ============================================================
BASE_DIR = Path(__file__).resolve().parent

MODEL_DIR = Path(
    os.getenv(
        "MODEL_DIR",
        str(BASE_DIR / "models" / "phobert_task_classifier_final")
    )
)

MAX_LENGTH = 128
TASK_THRESHOLD = 0.50
REVIEW_THRESHOLD = 0.65

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")


# ============================================================
# 2. NẠP MODEL
# ============================================================
if not MODEL_DIR.exists():
    raise FileNotFoundError(
        f"Không tìm thấy model tại: {MODEL_DIR}\n"
        "Hãy copy folder phobert_task_classifier_final vào "
        "handover_api_code/models/ hoặc thiết lập biến môi trường MODEL_DIR."
    )

tokenizer = AutoTokenizer.from_pretrained(MODEL_DIR, use_fast=False)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_DIR)

model.to(DEVICE)
model.eval()


# ============================================================
# 3. KHỞI TẠO API + CORS
# ============================================================
app = FastAPI(
    title="Vietnamese TASK/NON_TASK API",
    version="1.1.0",
    description="Phát hiện các câu giao việc trong đoạn văn tiếng Việt."
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 4. SCHEMA INPUT
# ============================================================
class AnalyzeRequest(BaseModel):
    text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Đoạn văn tiếng Việt cần phân tích."
    )


# ============================================================
# 5. HÀM XỬ LÝ VĂN BẢN
# ============================================================
def lam_sach_van_ban(text: str) -> str:
    text = str(text).strip()
    text = re.sub(r"\s+", " ", text)
    text = re.sub(r"\s+([,.!?;:])", r"\1", text)
    return text


def tach_cau_tieng_viet(text: str) -> list[str]:
    # Tách trước khi làm sạch để vẫn nhận biết được ký tự xuống dòng.
    cac_cau = re.split(r"(?<=[.!?])\s+|\n+", str(text).strip())

    return [
        lam_sach_van_ban(cau)
        for cau in cac_cau
        if len(lam_sach_van_ban(cau)) >= 2
    ]


def la_cau_xa_giao(cau: str) -> bool:
    cau_chuan = re.sub(r"[^\w\s]", "", str(cau).lower()).strip()

    cau_ngan_xa_giao = {
        "mãi iu", "mai iu", "haha", "hihi", "hehe",
        "ok", "oke", "okey", "ok nha",
        "cảm ơn", "thanks"
    }

    bat_dau_xa_giao = (
        "cảm ơn",
        "xin cảm ơn",
        "thanks",
        "thank you",
        "chúc mọi người",
    )

    return (
        cau_chuan in cau_ngan_xa_giao
        or cau_chuan.startswith(bat_dau_xa_giao)
    )


# ============================================================
# 6. DỰ ĐOÁN MỘT CÂU
# ============================================================
def du_doan_xac_suat_task(cau: str) -> float:
    cau_sach = lam_sach_van_ban(cau)
    cau_da_tach_tu = ViTokenizer.tokenize(cau_sach)

    dau_vao = tokenizer(
        cau_da_tach_tu,
        return_tensors="pt",
        truncation=True,
        max_length=MAX_LENGTH,
        padding=True
    )

    dau_vao = {
        key: value.to(DEVICE)
        for key, value in dau_vao.items()
    }

    with torch.no_grad():
        logits = model(**dau_vao).logits
        xac_suat = torch.softmax(logits, dim=1)[0]

    # label 0 = NON_TASK, label 1 = TASK
    return float(xac_suat[1].detach().cpu().item())


# ============================================================
# 7. ENDPOINT
# ============================================================
@app.get("/health")
def health_check():
    return {
        "status": "ok",
        "model": "PhoBERT TASK/NON_TASK",
        "device": str(DEVICE)
    }


@app.post("/analyze")
def analyze(request: AnalyzeRequest):
    cac_cau = tach_cau_tieng_viet(request.text)

    if not cac_cau:
        return {
            "has_task": False,
            "confidence": 1.0,
            "needs_review": False,
            "evidence": [],
            "total_sentences": 0
        }

    bang_chung = []
    xac_suat_non_task = []

    for chi_so, cau in enumerate(cac_cau, start=1):
        # Câu xã giao vẫn tính vào total_sentences,
        # nhưng luôn được xem là NON_TASK.
        if la_cau_xa_giao(cau):
            xac_suat_non_task.append(1.0)
            continue

        prob_task = du_doan_xac_suat_task(cau)
        prob_non_task = 1.0 - prob_task
        xac_suat_non_task.append(prob_non_task)

        if prob_task >= TASK_THRESHOLD:
            bang_chung.append({
                "sentence_index": chi_so,
                "sentence": cau,
                "task_confidence": round(prob_task, 4)
            })

    has_task = len(bang_chung) > 0

    # Nếu có TASK: confidence = xác suất TASK cao nhất.
    # Nếu không có TASK: confidence = xác suất NON_TASK cao nhất.
    if has_task:
        confidence = max(
            item["task_confidence"]
            for item in bang_chung
        )
    else:
        confidence = max(xac_suat_non_task, default=1.0)

    return {
        "has_task": has_task,
        "confidence": round(confidence, 4),
        "needs_review": bool(
            has_task and confidence < REVIEW_THRESHOLD
        ),
        "evidence": bang_chung,
        "total_sentences": len(cac_cau)
    }
