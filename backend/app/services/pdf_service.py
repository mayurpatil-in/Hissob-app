"""
PDF Generation Service — Generates Executive Luxury PDF Receipt documents with Devanagari Unicode support.
"""
import logging
import os
import warnings
from pathlib import Path

# Suppress false fpdf2 PyFPDF namespace warnings and fontTools subset verbosity
warnings.filterwarnings("ignore", category=UserWarning, module="fpdf")
warnings.filterwarnings("ignore", message=".*PyFPDF.*")
logging.getLogger("fontTools").setLevel(logging.ERROR)
logging.getLogger("fontTools.subset").setLevel(logging.ERROR)

import contextlib
import locale

import qrcode
from fpdf import FPDF

from app.core.config import settings

with contextlib.suppress(Exception):
    locale.getpreferredencoding = lambda do_setlocale=True: "utf-8"

# Force UTF-8 mode for Windows font decoding
os.environ["PYTHONUTF8"] = "1"

# Patch fontTools NameRecord.toUnicode to safely ignore Windows font table charmap decoding errors
try:
    import fontTools.ttLib.tables._n_a_m_e as _name_table
    _orig_to_unicode = _name_table.NameRecord.toUnicode

    def _safe_to_unicode(self, errors="ignore"):
        try:
            return _orig_to_unicode(self, errors="ignore")
        except Exception:
            try:
                return str(self.string, errors="ignore")
            except Exception:
                return ""

    _name_table.NameRecord.toUnicode = _safe_to_unicode
except Exception:
    pass

logger = logging.getLogger(__name__)


def generate_receipt_pdf_bytes(
    receipt_number: str,
    receipt_date: str,
    donor_name: str,
    amount: float,
    purpose: str,
    payment_mode: str,
    org_name: str,
    org_city: str | None = None,
    org_pan: str | None = None,
    org_logo_url: str | None = None,
    pan_number: str | None = None,
    transaction_ref: str | None = None,
    receipt_id: str | None = None,
) -> bytes:
    """
    Generates an executive, ultra-premium binary PDF Receipt with Devanagari text,
    organization logo, QR verification code, and 80G tax notice.
    """
    pdf = FPDF(orientation="P", unit="mm", format="A4")
    try:
        pdf.set_text_shaping(True)
    except Exception as shape_ex:
        logger.warning("Could not enable HarfBuzz text shaping: %s", str(shape_ex))

    pdf.set_margins(12, 12, 12)
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=12)

    # ── Load Devanagari & Standard Fonts ──
    has_devanagari = False
    base_dir = Path(__file__).parent.parent
    local_font = base_dir / "fonts" / "Mangal.ttf"
    local_bold = base_dir / "fonts" / "MangalBold.ttf"

    dev_font_path = local_font if local_font.exists() else Path(r"C:\Windows\Fonts\mangal.ttf")
    dev_bold_path = local_bold if local_bold.exists() else Path(r"C:\Windows\Fonts\mangalb.ttf")

    if dev_font_path.exists():
        try:
            pdf.add_font("Mangal", "", dev_font_path)
            if dev_bold_path.exists():
                pdf.add_font("Mangal", "B", dev_bold_path)
            else:
                pdf.add_font("Mangal", "B", dev_font_path)
            has_devanagari = True
        except Exception as font_ex:
            logger.warning("Could not load Mangal font: %s", str(font_ex))

    # Helper function to select font based on language & weight
    def use_font(style: str = "", size: int = 10, is_marathi: bool = False):
        if is_marathi and has_devanagari:
            pdf.set_font("Mangal", style, size)
        else:
            pdf.set_font("Helvetica", style, size)

    # Helper to check if string contains Devanagari characters
    def is_devanagari(text: str) -> bool:
        if not text:
            return False
        return any(ord(char) >= 0x0900 and ord(char) <= 0x097F for char in str(text))

    # Safe text helper
    def safe_text(text: str | None) -> str:
        if not text:
            return ""
        s = str(text)
        if not has_devanagari and is_devanagari(s):
            return s.encode('latin-1', 'replace').decode('latin-1')
        return s

    # ── 1. Top Decorative Brand Border ──
    pdf.set_fill_color(15, 23, 42)  # Royal Slate Dark (#0F172A)
    pdf.rect(10, 10, 190, 42, style="F")

    pdf.set_fill_color(245, 158, 11)  # Amber Gold (#F59E0B)
    pdf.rect(10, 52, 190, 3, style="F")

    pdf.set_fill_color(16, 185, 129)  # Emerald (#10B981)
    pdf.rect(10, 55, 190, 1.5, style="F")

    # ── 2. Logo & Header Text ──
    text_start_x = 15

    # Check for local logo image
    logo_file_path = None
    if org_logo_url:
        clean_logo_rel = org_logo_url.replace("/uploads/", "").replace("\\uploads\\", "")
        possible_path = os.path.join(settings.UPLOAD_DIR, clean_logo_rel)
        if os.path.exists(possible_path):
            logo_file_path = possible_path

    if logo_file_path:
        try:
            pdf.image(logo_file_path, x=15, y=14, h=30)
            text_start_x = 55
        except Exception as img_ex:
            logger.warning("Could not render logo image in PDF: %s", str(img_ex))

    # Header Title
    pdf.set_xy(text_start_x, 15)
    pdf.set_text_color(255, 255, 255)

    org_title = safe_text(org_name)
    use_font("B", 16 if len(org_title) < 25 else 13, is_marathi=is_devanagari(org_title))
    pdf.cell(180 - (text_start_x - 15), 7, org_title, align="L" if logo_file_path else "C", ln=True)

    # Org Subtitle / Location & PAN
    city_val = org_city or "Kolhapur, Maharashtra"
    pan_info = f" | PAN: {org_pan.strip()}" if (org_pan and org_pan.strip() and "1234A" not in org_pan) else ""
    sub_text = safe_text(f"{city_val}{pan_info}")

    pdf.set_x(text_start_x)
    pdf.set_text_color(203, 213, 225)
    use_font("", 9, is_marathi=is_devanagari(sub_text))
    pdf.cell(180 - (text_start_x - 15), 5, sub_text, align="L" if logo_file_path else "C", ln=True)

    # Official Badge
    pdf.set_x(text_start_x)
    pdf.set_text_color(52, 211, 153)
    pdf.set_font("Helvetica", "B", 8)
    pdf.cell(180 - (text_start_x - 15), 6, "VERIFIED OFFICIAL E-RECEIPT", align="L" if logo_file_path else "C", ln=True)

    # ── 3. Hero Amount Container ──
    pdf.set_xy(10, 60)
    pdf.set_fill_color(254, 243, 199)  # Golden Tint (#FEF3C7)
    pdf.rect(10, 60, 190, 32, style="F")
    pdf.set_draw_color(252, 211, 77)
    pdf.rect(10, 60, 190, 32, style="D")

    # Hero Label
    pdf.set_xy(15, 63)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(180, 83, 9)
    pdf.cell(180, 4, "TOTAL DONATION AMOUNT RECEIVED", align="C", ln=True)

    # Hero Big Amount
    pdf.set_xy(15, 68)
    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(180, 83, 9)
    pdf.cell(180, 10, f"INR {amount:,.2f}", align="C", ln=True)

    # Seva / Purpose
    pdf.set_xy(15, 80)
    purpose_str = safe_text(f"Seva / Purpose: {purpose}")
    use_font("B", 10, is_marathi=is_devanagari(purpose_str))
    pdf.set_text_color(146, 64, 14)
    pdf.cell(180, 5, purpose_str, align="C", ln=True)

    # ── 4. Structured Receipt Data Table ──
    y_table = 96
    table_height = 80
    pdf.set_fill_color(248, 250, 252)
    pdf.rect(10, y_table, 190, table_height, style="F")
    pdf.set_draw_color(226, 232, 240)
    pdf.rect(10, y_table, 190, table_height, style="D")

    # Table Title Bar
    pdf.set_fill_color(241, 245, 249)
    pdf.rect(10, y_table, 190, 10, style="F")
    pdf.set_xy(15, y_table + 2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(71, 85, 105)
    pdf.cell(180, 6, "DONATION RECEIPT SPECIFICATIONS & AUDIT DETAILS", align="L", ln=True)

    # Data Rows
    rows = [
        ("Receipt Number", str(receipt_number), False),
        ("Receipt Date", str(receipt_date), False),
        ("Donor Full Name", str(donor_name), is_devanagari(donor_name)),
        ("Payment Mode", str(payment_mode).upper(), False),
    ]
    if transaction_ref:
        rows.append(("Transaction / UTR Ref", str(transaction_ref), False))
    if pan_number:
        rows.append(("Donor PAN (80G Tax Exemption)", str(pan_number), False))

    row_y = y_table + 13
    for label, val, is_mar in rows:
        pdf.set_draw_color(241, 245, 249)
        pdf.line(15, row_y + 9, 195, row_y + 9)

        pdf.set_xy(18, row_y)
        pdf.set_font("Helvetica", "", 10)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(65, 8, f"{label}:", ln=False)

        pdf.set_xy(85, row_y)
        clean_val = safe_text(val)
        use_font("B", 11, is_marathi=is_mar)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(110, 8, clean_val, ln=True)

        row_y += 11

    # ── 5. QR Code Verification & Security Footer ──
    y_footer = 182

    verify_url = f"https://hisob.in/verify/{receipt_id}" if receipt_id else "https://hisob.in"
    qr = qrcode.QRCode(version=1, box_size=3, border=1)
    qr.add_data(verify_url)
    qr.make(fit=True)
    qr_img = qr.make_image(fill_color="black", back_color="white")

    import tempfile
    tmp_qr_path = None
    try:
        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp_file:
            qr_img.save(tmp_file.name)
            tmp_qr_path = tmp_file.name
        pdf.image(tmp_qr_path, x=15, y=y_footer, w=25, h=25)
    except Exception as qr_ex:
        logger.warning("Could not render QR code in PDF: %s", str(qr_ex))
    finally:
        if tmp_qr_path and os.path.exists(tmp_qr_path):
            with contextlib.suppress(Exception):
                os.remove(tmp_qr_path)

    pdf.set_xy(44, y_footer + 2)
    pdf.set_font("Helvetica", "B", 9)
    pdf.set_text_color(30, 58, 138)
    pdf.cell(90, 5, "SCAN QR CODE TO VERIFY AUTHENTICITY", ln=True)

    pdf.set_xy(44, y_footer + 7)
    pdf.set_font("Helvetica", "", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.multi_cell(90, 4, "This official e-Receipt is digitally tracked and registered in the Hisob ERP central ledger for compliance.")

    pdf.set_xy(140, y_footer)
    use_font("B", 8, is_marathi=is_devanagari(org_name))
    pdf.set_text_color(71, 85, 105)
    pdf.cell(55, 4, "FOR " + safe_text(org_name)[:24], align="C", ln=True)

    pdf.set_xy(140, y_footer + 16)
    pdf.set_draw_color(148, 163, 184)
    pdf.line(145, y_footer + 16, 190, y_footer + 16)

    pdf.set_xy(140, y_footer + 17)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(100, 116, 139)
    pdf.cell(55, 4, "Authorized Trustee / Treasurer", align="C", ln=True)

    # ── 6. Bottom Page Footer Note ──
    pdf.set_xy(10, 215)
    pdf.set_font("Helvetica", "I", 8)
    pdf.set_text_color(148, 163, 184)
    pdf.cell(190, 4, "Thank you for your valuable contribution and blessings!", align="C", ln=True)
    pdf.cell(190, 4, "Official computer-generated e-Receipt issued via Hisob ERP Platform | Designed & Developed by www.mayurpatil.in", align="C", ln=True)

    out = pdf.output(dest='S') if hasattr(pdf, 'output') else pdf.output()
    if isinstance(out, str):
        return out.encode('latin-1')
    elif isinstance(out, (bytes, bytearray)):
        return bytes(out)
    else:
        return str(out).encode('latin-1')
