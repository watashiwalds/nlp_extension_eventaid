#!/usr/bin/env python3
"""Dựng báo cáo .docx theo layout chuẩn của skill viet-bao-cao.

Lệnh:
    python bao_cao.py init  [--dir bao-cao]   # tạo khung nội dung + dựng docx rỗng
    python bao_cao.py build [--dir bao-cao]   # dựng lại docx từ các file đã chốt
    python bao_cao.py check [--dir bao-cao] [--strict]

Nguyên tắc: docx luôn được SINH LẠI từ các file markdown đã chốt trong
<dir>/noi-dung/. Không sửa tay docx — sửa markdown rồi build lại.
"""

from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

try:
    from docx import Document
    from docx.enum.style import WD_STYLE_TYPE
    from docx.enum.table import WD_TABLE_ALIGNMENT
    from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK
    from docx.oxml import OxmlElement
    from docx.oxml.ns import qn
    from docx.shared import Cm, Pt, RGBColor
except ImportError:  # pragma: no cover
    sys.exit(
        "Thiếu python-docx. Tạo venv rồi cài:\n"
        "  python3 -m venv .opencode/skills/viet-bao-cao/.venv\n"
        "  .opencode/skills/viet-bao-cao/.venv/bin/pip install python-docx\n"
        "Sau đó chạy lại bằng .opencode/skills/viet-bao-cao/.venv/bin/python"
    )

FONT = "Times New Roman"
MONO = "Consolas"
BODY_PT = 13
LINE_SPACING = 1.3
MARGINS_CM = {"top": 2.5, "bottom": 2.5, "left": 3.0, "right": 2.0}

PARTS = [
    ("01-gioi-thieu.md", "Phần 1. Giới thiệu bài toán"),
    ("02-tong-quan.md", "Phần 2. Tổng quan nghiên cứu"),
    ("03-kien-thuc-nen-tang.md", "Phần 3. Các kiến thức nền tảng"),
    ("04-de-xuat-giai-phap.md", "Phần 4. Đề xuất giải pháp"),
    ("05-thuc-nghiem.md", "Phần 5. Thực nghiệm và kết quả"),
    ("06-ket-luan.md", "Phần 6. Kết luận"),
    ("07-trich-dan.md", "Phần 7. Trích dẫn"),
]

DEFAULT_COVER = """\
truong: TRƯỜNG ĐẠI HỌC ...
khoa: KHOA ...
loai: BÁO CÁO ...
tieu-de: Tên đề tài báo cáo
chuyen-nganh: ...
giang-vien: ...
sinh-vien: ...
mssv: ...
lop: ...
dia-diem: Hà Nội
nam: 2026
"""

PLACEHOLDER = "(Phần này chưa được chốt — nội dung sẽ được cập nhật sau khi bạn duyệt.)"

TEMPLATES = {
    "01-gioi-thieu.md": """# Phần 1. Giới thiệu bài toán

<!--
Viết tại đây sau khi người dùng chốt. Bắt buộc có:
1. Bối cảnh và vấn đề (nêu số liệu/khó khăn cụ thể, không chung chung).
2. Phát biểu bài toán + phạm vi.
3. Cách tiếp cận/giải pháp đề xuất ở mức tổng quan (1 đoạn + 3-5 gạch đầu dòng).
4. Đóng góp chính và cấu trúc báo cáo.
-->
""",
    "02-tong-quan.md": """# Phần 2. Tổng quan nghiên cứu

<!--
Bắt buộc có:
1. Các nhóm giải pháp trước đây (bảng so sánh: phương pháp, ưu điểm, hạn chế).
2. Họ đã làm được gì (dẫn chứng có trích dẫn).
3. Khoảng trống nghiên cứu — mỗi khoảng trống phải nối được tới một điểm của codebase.
4. Kết luận: vì sao hướng của báo cáo là hợp lý.
-->
""",
    "03-kien-thuc-nen-tang.md": """# Phần 3. Các kiến thức nền tảng

<!--
QUY TẮC CỨNG: chỉ lý thuyết, KHÔNG nhắc tên codebase, không tên biến/hàm/file,
không số liệu đo của codebase. Được phép nêu nền tảng công nghệ (Manifest V3,
PhoBERT, llama.cpp, Readability...) như khái niệm học thuật.
Mỗi mục phải có keyword chuyên ngành (in đậm lần xuất hiện đầu) + trích dẫn.
-->
""",
    "04-de-xuat-giai-phap.md": """# Phần 4. Đề xuất giải pháp

<!--
Bắt buộc có:
1. Giới thiệu codebase (mục tiêu, phạm vi, kiến trúc tổng thể + sơ đồ).
2. Kiến trúc thành phần và luồng dữ liệu (bảng thành phần → trách nhiệm).
3. Các phương pháp/quyết định kỹ thuật chính và lý do chọn.
4. Hợp đồng dữ liệu, bảo mật, giới hạn.
-->
""",
    "05-thuc-nghiem.md": """# Phần 5. Thực nghiệm và kết quả

<!--
Bắt buộc có, theo đúng thứ tự:
5.1. Pipeline xử lý của codebase (sơ đồ + mô tả từng bước).
5.2. Mô hình PhoBERT: kiến trúc, bài toán phân loại, fine-tuning
     (dataset: nguồn, quy mô, nhãn, chia tập; tham số: epochs, LR, batch, max_length,
     optimizer, phần cứng) — số liệu PHẢI do người dùng cung cấp.
5.3. Kịch bản thử nghiệm PhoBERT trong pipeline (bộ mẫu, chế độ, thước đo).
5.4. So sánh có/không dùng PhoBERT (bảng: số lần gọi LLM, thời gian, sự kiện,
     bỏ sót, dương tính giả).
5.5. Kết luận vai trò và ảnh hưởng của PhoBERT.
-->
""",
    "06-ket-luan.md": """# Phần 6. Kết luận

<!--
Bắt buộc có: mục tiêu đã đạt (đối chiếu Phần 1), hạn chế tồn tại (trung thực,
có số liệu), định hướng phát triển (ngắn hạn/dài hạn, có thứ tự ưu tiên).
-->
""",
    "07-trich-dan.md": """# Phần 7. Trích dẫn

<!--
Danh mục tham khảo theo IEEE, đánh số [1]..[N] trùng với trích dẫn trong thân bài.
Mỗi dòng một tài liệu, bắt đầu bằng "N. ". Không đưa tài liệu không được trích.
-->
""",
}


# --------------------------------------------------------------------------
# Cấu hình style
# --------------------------------------------------------------------------


def _set_fonts(rpr, name: str) -> None:
    rfonts = rpr.find(qn("w:rFonts"))
    if rfonts is None:
        rfonts = OxmlElement("w:rFonts")
        rpr.insert(0, rfonts)
    for attr in ("w:ascii", "w:hAnsi", "w:eastAsia", "w:cs"):
        rfonts.set(qn(attr), name)
    for attr in ("w:asciiTheme", "w:hAnsiTheme", "w:eastAsiaTheme", "w:cstheme"):
        key = qn(attr)
        if rfonts.get(key) is not None:
            del rfonts.attrib[key]


def _black(rpr) -> None:
    color = rpr.find(qn("w:color"))
    if color is None:
        color = OxmlElement("w:color")
        rpr.append(color)
    color.set(qn("w:val"), "000000")
    for attr in ("w:themeColor", "w:themeShade", "w:themeTint"):
        key = qn(attr)
        if color.get(key) is not None:
            del color.attrib[key]


def _style_font(style, size=None, bold=None, italic=None, name=FONT) -> None:
    style.font.name = name  # python-docx chèn rFonts đúng thứ tự schema
    rpr = style.element.get_or_add_rPr()
    _set_fonts(rpr, name)
    style.font.color.rgb = RGBColor(0, 0, 0)
    _black(rpr)
    if size is not None:
        style.font.size = Pt(size)
        for tag in ("w:sz", "w:szCs"):
            el = rpr.find(qn(tag))
            if el is None:
                el = OxmlElement(tag)
                rpr.append(el)
            el.set(qn("w:val"), str(int(size * 2)))
    if bold is not None:
        style.font.bold = bold
    if italic is not None:
        style.font.italic = italic


def _paragraph_format(style, *, align=None, before=0.0, after=6.0, line=LINE_SPACING):
    pf = style.paragraph_format
    if align is not None:
        pf.alignment = align
    pf.space_before = Pt(before)
    pf.space_after = Pt(after)
    pf.line_spacing = line


def configure_document(doc) -> None:
    styles_el = doc.styles.element
    rpr_default = (
        styles_el.find(qn("w:docDefaults")).find(qn("w:rPrDefault")).find(qn("w:rPr"))
    )
    _set_fonts(rpr_default, FONT)
    for tag in ("w:sz", "w:szCs"):
        el = rpr_default.find(qn(tag))
        if el is None:
            el = OxmlElement(tag)
            rpr_default.append(el)
        el.set(qn("w:val"), str(BODY_PT * 2))
    lang = rpr_default.find(qn("w:lang"))
    if lang is None:
        lang = OxmlElement("w:lang")
        rpr_default.append(lang)
    lang.set(qn("w:val"), "vi-VN")
    lang.set(qn("w:eastAsia"), "vi-VN")

    normal = doc.styles["Normal"]
    _style_font(normal, BODY_PT)
    _paragraph_format(normal, align=WD_ALIGN_PARAGRAPH.JUSTIFY, after=6.0)

    headings = {
        "Heading 1": dict(size=16, bold=True, italic=False, before=0.0, after=12.0),
        "Heading 2": dict(size=14, bold=True, italic=True, before=12.0, after=6.0),
        "Heading 3": dict(size=13, bold=True, italic=False, before=8.0, after=4.0),
    }
    for name, spec in headings.items():
        style = doc.styles[name]
        _style_font(style, spec["size"], spec["bold"], spec["italic"])
        _paragraph_format(
            style,
            align=WD_ALIGN_PARAGRAPH.LEFT,
            before=spec["before"],
            after=spec["after"],
        )
        style.paragraph_format.keep_with_next = True

    # Mục lục: đẹp như H1 nhưng KHÔNG phải Heading 1 để không tự lặp trong mục lục.
    toc_title = doc.styles.add_style("TieuDeMucLuc", WD_STYLE_TYPE.PARAGRAPH)
    toc_title.base_style = normal
    _style_font(toc_title, 16, bold=True, italic=False)
    _paragraph_format(toc_title, align=WD_ALIGN_PARAGRAPH.CENTER, before=0.0, after=12.0)

    caption = doc.styles.add_style("ChuThich", WD_STYLE_TYPE.PARAGRAPH)
    caption.base_style = normal
    _style_font(caption, 12, bold=False, italic=True)
    _paragraph_format(caption, align=WD_ALIGN_PARAGRAPH.CENTER, before=3.0, after=6.0)

    code = doc.styles.add_style("MaNguon", WD_STYLE_TYPE.PARAGRAPH)
    code.base_style = normal
    _style_font(code, 11, bold=False, italic=False, name=MONO)
    _paragraph_format(code, align=WD_ALIGN_PARAGRAPH.LEFT, before=3.0, after=6.0, line=1.0)
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:fill"), "F2F2F2")
    code.element.get_or_add_pPr().append(shd)


def configure_page(doc) -> None:
    for section in doc.sections:
        section.page_width = Cm(21)
        section.page_height = Cm(29.7)
        section.top_margin = Cm(MARGINS_CM["top"])
        section.bottom_margin = Cm(MARGINS_CM["bottom"])
        section.left_margin = Cm(MARGINS_CM["left"])
        section.right_margin = Cm(MARGINS_CM["right"])
        _footer_page_number(section)


def _field(paragraph, instruction: str, placeholder: str = "") -> None:
    run = paragraph.add_run()
    begin = OxmlElement("w:fldChar")
    begin.set(qn("w:fldCharType"), "begin")
    instr = OxmlElement("w:instrText")
    instr.set(qn("xml:space"), "preserve")
    instr.text = instruction
    separate = OxmlElement("w:fldChar")
    separate.set(qn("w:fldCharType"), "separate")
    text = OxmlElement("w:t")
    text.text = placeholder
    end = OxmlElement("w:fldChar")
    end.set(qn("w:fldCharType"), "end")
    for el in (begin, instr, separate, text, end):
        run._r.append(el)


def _footer_page_number(section) -> None:
    paragraph = section.footer.paragraphs[0]
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(0)
    paragraph.paragraph_format.space_after = Pt(0)
    paragraph.paragraph_format.line_spacing = 1.0
    _field(paragraph, "PAGE", "1")


def _enable_update_fields(doc) -> None:
    settings = doc.settings.element
    if settings.find(qn("w:updateFields")) is None:
        el = OxmlElement("w:updateFields")
        el.set(qn("w:val"), "true")
        settings.append(el)


# --------------------------------------------------------------------------
# Markdown -> docx
# --------------------------------------------------------------------------

INLINE_RE = re.compile(r"(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`)")
HEADING_RE = re.compile(r"^(#{1,3})\s+(.*)$")
BULLET_RE = re.compile(r"^[-*]\s+(.*)$")
NUMBER_RE = re.compile(r"^(\d+)[.)]\s+(.*)$")
IMAGE_RE = re.compile(r"^!\[(.*?)\]\((.+?)\)\s*$")
TABLE_SEP_RE = re.compile(r"^\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?$")


def add_inline(paragraph, text: str) -> None:
    for token in INLINE_RE.split(text):
        if not token:
            continue
        if token.startswith("**") and token.endswith("**") and len(token) > 4:
            run = paragraph.add_run(token[2:-2])
            run.bold = True
        elif token.startswith("*") and token.endswith("*") and len(token) > 2:
            run = paragraph.add_run(token[1:-1])
            run.italic = True
        elif token.startswith("`") and token.endswith("`") and len(token) > 2:
            run = paragraph.add_run(token[1:-1])
            run.font.name = MONO
            _set_fonts(run._r.get_or_add_rPr(), MONO)
            run.font.size = Pt(11)
        else:
            paragraph.add_run(token)


def _hanging(paragraph, indent_cm: float = 0.75) -> None:
    pf = paragraph.paragraph_format
    pf.left_indent = Cm(indent_cm)
    pf.first_line_indent = Cm(-indent_cm)
    pf.tab_stops.add_tab_stop(Cm(indent_cm))


def render_table(doc, rows: list[list[str]]) -> None:
    cols = max(len(row) for row in rows)
    table = doc.add_table(rows=len(rows), cols=cols)
    table.style = "Table Grid"
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = True
    for r_index, row in enumerate(rows):
        for c_index in range(cols):
            cell = table.cell(r_index, c_index)
            paragraph = cell.paragraphs[0]
            paragraph.alignment = WD_ALIGN_PARAGRAPH.LEFT
            paragraph.paragraph_format.space_before = Pt(2)
            paragraph.paragraph_format.space_after = Pt(2)
            paragraph.paragraph_format.line_spacing = LINE_SPACING
            text = row[c_index] if c_index < len(row) else ""
            add_inline(paragraph, text)
            if r_index == 0:
                for run in paragraph.runs:
                    run.bold = True
        if r_index == 0:
            tr_pr = table.rows[0]._tr.get_or_add_trPr()
            header = OxmlElement("w:tblHeader")
            tr_pr.append(header)
    doc.add_paragraph().paragraph_format.space_after = Pt(0)


def resolve_asset(base_dir: Path, raw: str) -> Path | None:
    """Tìm ảnh: ưu tiên cạnh file markdown, rồi tới gốc thư mục báo cáo."""
    raw_path = Path(raw)
    if raw_path.is_absolute():
        return raw_path if raw_path.exists() else None
    for candidate in (base_dir / raw_path, base_dir.parent / raw_path):
        if candidate.exists():
            return candidate
    return None


def render_image(doc, caption: str, path: Path | None, raw: str) -> None:
    if path is None:
        paragraph = doc.add_paragraph()
        paragraph.add_run(f"[Thiếu ảnh: {raw}]").italic = True
        return
    from docx.image.image import Image as DocxImage

    image = DocxImage.from_file(str(path))
    ratio = image.height / image.width
    width_cm = 14.0
    height_cm = width_cm * ratio
    max_height = 18.0
    if height_cm > max_height:
        height_cm = max_height
        width_cm = height_cm / ratio
    paragraph = doc.add_paragraph()
    paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
    paragraph.paragraph_format.space_before = Pt(6)
    paragraph.paragraph_format.space_after = Pt(3)
    paragraph.paragraph_format.keep_with_next = bool(caption)
    paragraph.add_run().add_picture(str(path), width=Cm(width_cm), height=Cm(height_cm))
    if caption:
        cap = doc.add_paragraph(style="ChuThich")
        add_inline(cap, caption)


def render_markdown(doc, text: str, base_dir: Path) -> None:
    lines = text.splitlines()
    buffer: list[str] = []
    index = 0

    def flush() -> None:
        if not buffer:
            return
        paragraph = doc.add_paragraph()
        add_inline(paragraph, " ".join(buffer))
        buffer.clear()

    while index < len(lines):
        raw = lines[index]
        line = raw.rstrip()
        stripped = line.strip()

        if stripped.startswith("<!--"):
            while index < len(lines) and "-->" not in lines[index]:
                index += 1
            index += 1
            continue

        if stripped.startswith("```"):
            flush()
            index += 1
            block: list[str] = []
            while index < len(lines) and not lines[index].strip().startswith("```"):
                block.append(lines[index])
                index += 1
            index += 1
            for code_line in block:
                paragraph = doc.add_paragraph(style="MaNguon")
                paragraph.add_run(code_line if code_line.strip() else " ")
            continue

        if not stripped:
            flush()
            index += 1
            continue

        heading = HEADING_RE.match(stripped)
        if heading:
            flush()
            level = len(heading.group(1))
            doc.add_heading(heading.group(2).strip(), level=level)
            index += 1
            continue

        image = IMAGE_RE.match(stripped)
        if image:
            flush()
            raw_path = image.group(2)
            render_image(doc, image.group(1), resolve_asset(base_dir, raw_path), raw_path)
            index += 1
            continue

        if stripped.startswith("|") and index + 1 < len(lines) and TABLE_SEP_RE.match(
            lines[index + 1].strip()
        ):
            flush()
            rows: list[list[str]] = []
            header = [cell.strip() for cell in stripped.strip("|").split("|")]
            rows.append(header)
            index += 2
            while index < len(lines) and lines[index].strip().startswith("|"):
                row_text = lines[index].strip()
                rows.append([cell.strip() for cell in row_text.strip("|").split("|")])
                index += 1
            render_table(doc, rows)
            continue

        bullet = BULLET_RE.match(stripped)
        if bullet:
            flush()
            paragraph = doc.add_paragraph()
            _hanging(paragraph)
            paragraph.paragraph_format.space_after = Pt(3)
            add_inline(paragraph, "•\t" + bullet.group(1).strip())
            index += 1
            continue

        numbered = NUMBER_RE.match(stripped)
        if numbered:
            flush()
            paragraph = doc.add_paragraph()
            _hanging(paragraph)
            paragraph.paragraph_format.space_after = Pt(3)
            add_inline(paragraph, f"{numbered.group(1)}.\t{numbered.group(2).strip()}")
            index += 1
            continue

        if stripped.startswith(">"):
            flush()
            paragraph = doc.add_paragraph(style="ChuThich")
            add_inline(paragraph, stripped.lstrip("> ").strip())
            index += 1
            continue

        buffer.append(stripped)
        index += 1

    flush()


# --------------------------------------------------------------------------
# Bìa, mục lục, ghép phần
# --------------------------------------------------------------------------


def parse_cover(text: str) -> dict[str, str]:
    data: dict[str, str] = {}
    for line in text.splitlines():
        if ":" in line:
            key, value = line.split(":", 1)
            data[key.strip().lower()] = value.strip()
    return data


def render_cover(doc, data: dict[str, str], base_dir: Path) -> None:
    def centered(text: str, size: float, bold: bool = False, after: float = 6.0, caps=False):
        paragraph = doc.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.paragraph_format.space_before = Pt(0)
        paragraph.paragraph_format.space_after = Pt(after)
        run = paragraph.add_run(text.upper() if caps else text)
        run.bold = bold
        run.font.size = Pt(size)
        return paragraph

    logo = data.get("logo")
    if logo and (base_dir / logo).exists():
        paragraph = doc.add_paragraph()
        paragraph.alignment = WD_ALIGN_PARAGRAPH.CENTER
        paragraph.add_run().add_picture(str(base_dir / logo), height=Cm(3.2))
        paragraph.paragraph_format.space_after = Pt(12)

    centered(data.get("truong", ""), 14, bold=True, after=4)
    centered(data.get("khoa", ""), 13, bold=True, after=24)
    centered(data.get("loai", "BÁO CÁO"), 13, bold=True, after=18)
    centered(data.get("tieu-de", ""), 18, bold=True, after=18)
    if data.get("chuyen-nganh"):
        centered(f"Chuyên ngành: {data['chuyen-nganh']}", 13, after=30)

    for key, label in (
        ("giang-vien", "Giảng viên hướng dẫn"),
        ("sinh-vien", "Sinh viên thực hiện"),
        ("mssv", "Mã số sinh viên"),
        ("lop", "Lớp"),
    ):
        if data.get(key):
            centered(f"{label}: {data[key]}", 13, after=6)

    for _ in range(2):
        doc.add_paragraph()
    centered(data.get("dia-diem", ""), 13, bold=True, after=2)
    centered(data.get("nam", ""), 13, bold=True, after=0)


def render_toc(doc) -> None:
    doc.add_paragraph("MỤC LỤC", style="TieuDeMucLuc")
    paragraph = doc.add_paragraph()
    paragraph.paragraph_format.line_spacing = 1.3
    _field(paragraph, 'TOC \\o "1-3" \\h \\z \\u', "Mục lục sẽ hiện sau khi cập nhật trường (Ctrl+A, F9).")
    doc.add_paragraph()


def part_body(text: str) -> str:
    """Bỏ dòng tiêu đề H1 đầu tiên (đã dùng làm tiêu đề phần)."""
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if line.strip().startswith("# "):
            return "\n".join(lines[index + 1 :])
    return text


def part_title(text: str, default: str) -> str:
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("# "):
            return stripped[2:].strip()
    return default


def build(root: Path, with_toc: bool = True) -> Path:
    content_dir = root / "noi-dung"
    if not content_dir.is_dir():
        sys.exit(f"Không thấy {content_dir}. Chạy 'init' trước.")
    doc = Document()
    configure_document(doc)
    configure_page(doc)
    doc.core_properties.title = "Báo cáo"

    cover_file = content_dir / "00-bia.md"
    cover_text = cover_file.read_text(encoding="utf-8") if cover_file.exists() else DEFAULT_COVER
    render_cover(doc, parse_cover(cover_text), content_dir)
    doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    if with_toc:
        render_toc(doc)
        doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    for filename, default_title in PARTS:
        path = content_dir / filename
        text = path.read_text(encoding="utf-8") if path.exists() else ""
        body = part_body(text)
        doc.add_heading(part_title(text, default_title), level=1)
        visible = re.sub(r"<!--.*?-->", "", body, flags=re.S).strip()
        if visible:
            render_markdown(doc, body, content_dir)
        else:
            paragraph = doc.add_paragraph()
            run = paragraph.add_run(PLACEHOLDER)
            run.italic = True
        if filename != PARTS[-1][0]:
            doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    _enable_update_fields(doc)
    output = root / "bao-cao.docx"
    doc.save(output)
    return output


def init(root: Path) -> None:
    content_dir = root / "noi-dung"
    content_dir.mkdir(parents=True, exist_ok=True)
    cover = content_dir / "00-bia.md"
    if not cover.exists():
        cover.write_text(DEFAULT_COVER, encoding="utf-8")
    for filename, title in PARTS:
        path = content_dir / filename
        if path.exists():
            continue
        template = TEMPLATES.get(filename, f"# {title}\n")
        path.write_text(template, encoding="utf-8")


# --------------------------------------------------------------------------
# Kiểm tra
# --------------------------------------------------------------------------


def _cm(value) -> float:
    return round(value.cm, 2) if value is not None else -1.0


def _style_report(doc) -> list[tuple[str, bool, str]]:
    checks: list[tuple[str, bool, str]] = []

    def rfonts(style):
        rpr = style.element.find(qn("w:rPr"))
        if rpr is None:
            return {}
        node = rpr.find(qn("w:rFonts"))
        if node is None:
            return {}
        return {key.split("}")[1]: val for key, val in node.attrib.items()}

    normal = doc.styles["Normal"]
    fonts = rfonts(normal)
    ok = all(fonts.get(k) == FONT for k in ("ascii", "hAnsi", "eastAsia", "cs"))
    checks.append(("Normal: Times New Roman (4 slot)", ok, str(fonts)))
    checks.append(("Normal: 13pt", normal.font.size == Pt(13), str(normal.font.size)))
    checks.append(
        (
            "Normal: căn đều 2 bên",
            normal.paragraph_format.alignment == WD_ALIGN_PARAGRAPH.JUSTIFY,
            str(normal.paragraph_format.alignment),
        )
    )
    checks.append(
        (
            "Normal: giãn dòng 1.3",
            abs(float(normal.paragraph_format.line_spacing or 0) - LINE_SPACING) < 0.01,
            str(normal.paragraph_format.line_spacing),
        )
    )

    for name, size, bold, italic in (
        ("Heading 1", 16, True, False),
        ("Heading 2", 14, True, True),
        ("Heading 3", 13, True, False),
    ):
        style = doc.styles[name]
        fonts = rfonts(style)
        checks.append(
            (
                f"{name}: Times New Roman",
                all(fonts.get(k) == FONT for k in ("ascii", "hAnsi", "eastAsia", "cs")),
                str(fonts),
            )
        )
        checks.append((f"{name}: {size}pt", style.font.size == Pt(size), str(style.font.size)))
        checks.append((f"{name}: bold", bool(style.font.bold) == bold, str(style.font.bold)))
        checks.append((f"{name}: italic", bool(style.font.italic) == italic, str(style.font.italic)))
        checks.append(
            (
                f"{name}: căn trái",
                style.paragraph_format.alignment == WD_ALIGN_PARAGRAPH.LEFT,
                str(style.paragraph_format.alignment),
            )
        )

    for section in doc.sections:
        checks.append(("Lề trên 2.5cm", abs(_cm(section.top_margin) - 2.5) < 0.02, f"{_cm(section.top_margin)}cm"))
        checks.append(("Lề dưới 2.5cm", abs(_cm(section.bottom_margin) - 2.5) < 0.02, f"{_cm(section.bottom_margin)}cm"))
        checks.append(("Lề trái 3cm", abs(_cm(section.left_margin) - 3.0) < 0.02, f"{_cm(section.left_margin)}cm"))
        checks.append(("Lề phải 2cm", abs(_cm(section.right_margin) - 2.0) < 0.02, f"{_cm(section.right_margin)}cm"))
        checks.append(("Khổ A4 (21 x 29.7)", abs(_cm(section.page_width) - 21) < 0.05 and abs(_cm(section.page_height) - 29.7) < 0.05, f"{_cm(section.page_width)}x{_cm(section.page_height)}cm"))
    return checks


CITE_RE = re.compile(r"\[(\d+(?:\s*[,–-]\s*\d+)*)\]")
REF_RE = re.compile(r"^(\d+)\.\s+\S")


def expand_cite(marker: str) -> list[int]:
    numbers: list[int] = []
    for part in marker.split(","):
        part = part.strip()
        if re.match(r"^\d+\s*[–-]\s*\d+$", part):
            start, end = re.split(r"\s*[–-]\s*", part)
            numbers.extend(range(int(start), int(end) + 1))
        elif part.isdigit():
            numbers.append(int(part))
    return numbers


def _strip_code(text: str) -> str:
    return re.sub(r"```.*?```", "", text, flags=re.S)


def citation_report(root: Path) -> tuple[list[str], list[str]]:
    content_dir = root / "noi-dung"
    errors: list[str] = []
    warnings: list[str] = []
    used: dict[int, str] = {}
    for filename, _ in PARTS[:-1]:
        path = content_dir / filename
        if not path.exists():
            continue
        text = _strip_code(path.read_text(encoding="utf-8"))
        for marker in CITE_RE.findall(text):
            for number in expand_cite(marker):
                used.setdefault(number, filename)

    ref_path = content_dir / "07-trich-dan.md"
    refs: dict[int, str] = {}
    if ref_path.exists():
        for line in ref_path.read_text(encoding="utf-8").splitlines():
            match = REF_RE.match(line.strip())
            if match:
                refs[int(match.group(1))] = line.strip()

    if not refs:
        warnings.append("Phần 7 chưa có mục tham khảo nào (dòng dạng '1. Tác giả...').")
    for number in sorted(used):
        if number not in refs:
            errors.append(f"Trích dẫn [{number}] (trong {used[number]}) không có trong Phần 7.")
    for number in sorted(refs):
        if number not in used:
            warnings.append(f"Tài liệu [{number}] có trong Phần 7 nhưng không được trích trong thân bài.")
    expected = list(range(1, len(refs) + 1))
    if sorted(refs) != expected:
        errors.append(f"Đánh số tham khảo không liên tục: có {sorted(refs)}.")
    return errors, warnings


def check(root: Path, strict: bool) -> int:
    docx_path = root / "bao-cao.docx"
    if not docx_path.exists():
        print(f"✗ Không thấy {docx_path}. Chạy 'build' trước.")
        return 2
    doc = Document(str(docx_path))
    failures = 0
    print("== Layout ==")
    for label, ok, detail in _style_report(doc):
        print(f"{'✓' if ok else '✗'} {label}  ({detail})")
        failures += 0 if ok else 1

    print("\n== Trích dẫn ==")
    errors, warnings = citation_report(root)
    for message in errors:
        print(f"✗ {message}")
    for message in warnings:
        print(f"! {message}")
    if not errors and not warnings:
        print("✓ Trích dẫn khớp danh mục.")

    print("\n== Nội dung ==")
    content_dir = root / "noi-dung"
    placeholders = 0
    for filename, _ in PARTS:
        path = content_dir / filename
        if not path.exists():
            print(f"✗ Thiếu file {filename}")
            failures += 1
            continue
        body = part_body(path.read_text(encoding="utf-8"))
        body = re.sub(r"<!--.*?-->", "", body, flags=re.S).strip()
        words = len(re.findall(r"\S+", body))
        status = "chưa chốt" if not body else f"{words} từ"
        if not body:
            placeholders += 1
        flags = [token for token in ("TODO", "[CẦN-NGUỒN]", "[CẦN-BỔ-SUNG]") if token in body]
        if flags:
            print(f"! {filename}: còn {', '.join(flags)}")
        print(f"- {filename}: {status}")

    if strict:
        if placeholders:
            print(f"✗ Còn {placeholders} phần chưa có nội dung.")
            failures += 1
        if errors:
            failures += 1
        if "[CẦN-NGUỒN]" in "".join(
            p.read_text(encoding="utf-8") for p in content_dir.glob("*.md")
        ):
            print("✗ Còn placeholder [CẦN-NGUỒN] — phải bổ sung nguồn thật.")
            failures += 1

    print(f"\nKết quả: {'ĐẠT' if failures == 0 else f'{failures} lỗi'}")
    return 0 if failures == 0 else 1


# --------------------------------------------------------------------------


def main() -> int:
    parser = argparse.ArgumentParser(description="Dựng báo cáo .docx chuẩn layout")
    parser.add_argument("command", choices=["init", "build", "check"])
    parser.add_argument("--dir", default="bao-cao", help="thư mục làm việc (mặc định: bao-cao)")
    parser.add_argument("--no-toc", action="store_true", help="không chèn mục lục")
    parser.add_argument("--strict", action="store_true", help="check: coi cảnh báo là lỗi")
    args = parser.parse_args()

    root = Path(args.dir).resolve()
    if args.command == "init":
        init(root)
        output = build(root, with_toc=not args.no_toc)
        print(f"✓ Đã tạo khung: {root / 'noi-dung'}")
        print(f"✓ Đã dựng: {output}")
        return 0
    if args.command == "build":
        output = build(root, with_toc=not args.no_toc)
        print(f"✓ Đã dựng: {output}")
        return 0
    return check(root, args.strict)


if __name__ == "__main__":
    raise SystemExit(main())
