"""
Email Service — Automated Transactional & Receipt Email Delivery for Hisob ERP.
Uses standard Python smtplib with WebHostMost cPanel SMTP or external provider.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.application import MIMEApplication
from typing import Optional, Dict, Any, List, Tuple
from uuid import UUID
from sqlalchemy.orm import Session
from app.core.config import settings

logger = logging.getLogger("hisob.email")


def _record_email_log(
    db: Optional[Session],
    tenant_id: Optional[UUID],
    recipient: str,
    subject: str,
    email_type: str,
    status: str,
    error_message: Optional[str] = None,
    metadata_json: Optional[dict] = None,
):
    """Helper to persist email dispatch status in database email_logs table."""
    try:
        from app.models.email_log import EmailLog
        from datetime import datetime, timezone
        from app.core.database import SessionLocal

        close_session = False
        if db is None:
            db = SessionLocal()
            close_session = True

        log_entry = EmailLog(
            tenant_id=tenant_id,
            recipient=recipient,
            subject=subject,
            email_type=email_type,
            status=status,
            error_message=error_message,
            metadata_json=metadata_json,
            sent_at=datetime.now(timezone.utc),
        )
        db.add(log_entry)
        db.commit()
        if close_session:
            db.close()
    except Exception as ex:
        logger.error("Failed to record EmailLog in DB: %s", str(ex))


def send_raw_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
    attachments: Optional[List[Tuple[str, bytes, str]]] = None,  # (filename, bytes, mime_type)
    db: Optional[Session] = None,
    tenant_id: Optional[UUID] = None,
    email_type: str = "TRANSACTIONAL",
    metadata_json: Optional[dict] = None,
) -> bool:
    """
    Sends an HTML email via SMTP using server configuration.
    Supports file attachments (MIMEApplication) and optional DB email log tracking.
    Fails safely without raising exceptions to keep background jobs running smooth.
    """
    if not settings.EMAIL_ENABLED:
        logger.info("Email delivery is disabled in settings. Skipping email to %s", to_email)
        _record_email_log(
            db=db,
            tenant_id=tenant_id,
            recipient=to_email,
            subject=subject,
            email_type=email_type,
            status="FAILED",
            error_message="Email delivery is disabled in settings (EMAIL_ENABLED=False).",
            metadata_json=metadata_json,
        )
        return False

    if not to_email or "@" not in to_email:
        logger.warning("Invalid recipient email address: %s", to_email)
        _record_email_log(
            db=db,
            tenant_id=tenant_id,
            recipient=to_email or "invalid",
            subject=subject,
            email_type=email_type,
            status="FAILED",
            error_message=f"Invalid recipient email address: {to_email}",
            metadata_json=metadata_json,
        )
        return False

    if not settings.SMTP_PASSWORD:
        logger.warning(
            "SMTP_PASSWORD is not set in .env. Skipping automated email to %s. Add SMTP_PASSWORD to enable email delivery.",
            to_email,
        )
        _record_email_log(
            db=db,
            tenant_id=tenant_id,
            recipient=to_email,
            subject=subject,
            email_type=email_type,
            status="FAILED",
            error_message="SMTP_PASSWORD is not set in backend configuration.",
            metadata_json=metadata_json,
        )
        return False

    try:
        if attachments:
            msg = MIMEMultipart("mixed")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email

            body_part = MIMEMultipart("alternative")
            if text_content:
                body_part.attach(MIMEText(text_content, "plain", "utf-8"))
            body_part.attach(MIMEText(html_content, "html", "utf-8"))
            msg.attach(body_part)

            for filename, file_bytes, _m_type in attachments:
                att_part = MIMEApplication(file_bytes)
                att_part.add_header("Content-Disposition", "attachment", filename=filename)
                msg.attach(att_part)
        else:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain", "utf-8"))
            msg.attach(MIMEText(html_content, "html", "utf-8"))

        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=12)
            if settings.SMTP_USE_TLS:
                server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logger.info("Successfully sent email '%s' to %s", subject, to_email)
        _record_email_log(
            db=db,
            tenant_id=tenant_id,
            recipient=to_email,
            subject=subject,
            email_type=email_type,
            status="SENT",
            metadata_json=metadata_json,
        )
        return True

    except Exception as e:
        err_str = str(e)
        logger.error("Failed to send email to %s: %s", to_email, err_str)
        _record_email_log(
            db=db,
            tenant_id=tenant_id,
            recipient=to_email,
            subject=subject,
            email_type=email_type,
            status="FAILED",
            error_message=err_str,
            metadata_json=metadata_json,
        )
        return False


def number_to_words_indian(number: float) -> str:
    """Converts a numeric amount to Indian currency words."""
    try:
        num = int(round(number))
        if num == 0:
            return "Rupees Zero Only"
        units = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
                 "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]
        tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
        def _convert_below_thousand(n):
            if n < 20:
                return units[n]
            elif n < 100:
                return tens[n // 10] + (" " + units[n % 10] if n % 10 != 0 else "")
            else:
                return units[n // 100] + " Hundred" + (" " + _convert_below_thousand(n % 100) if n % 100 != 0 else "")
        crore = num // 10000000
        num %= 10000000
        lakh = num // 100000
        num %= 100000
        thousand = num // 1000
        num %= 1000
        parts = []
        if crore > 0:
            parts.append(_convert_below_thousand(crore) + " Crore")
        if lakh > 0:
            parts.append(_convert_below_thousand(lakh) + " Lakh")
        if thousand > 0:
            parts.append(_convert_below_thousand(thousand) + " Thousand")
        if num > 0:
            parts.append(_convert_below_thousand(num))
        return "Rupees " + " ".join(parts) + " Only"
    except Exception:
        return f"Rupees {number:,.2f}"


def build_receipt_html(
    receipt_number: str,
    receipt_date: str,
    donor_name: str,
    amount: float,
    purpose: str,
    payment_mode: str,
    org_name: str,
    org_city: Optional[str] = None,
    org_logo_url: Optional[str] = None,
    org_pan: Optional[str] = None,
    pan_number: Optional[str] = None,
    receipt_id: Optional[str] = None,
    transaction_ref: Optional[str] = None,
) -> str:
    """Generates an executive, luxury responsive HTML Receipt Card for Email Delivery."""
    amount_formatted = f"₹ {amount:,.2f}"
    amount_in_words = number_to_words_indian(amount)
    verify_link = f"https://hisob.in/verify/{receipt_id}" if receipt_id else "https://hisob.in"
    qr_img_url = f"https://api.qrserver.com/v1/create-qr-code/?size=120x120&data={verify_link}"

    logo_img_tag = ""
    if org_logo_url:
        full_logo_url = org_logo_url if org_logo_url.startswith("http") else f"https://api.hisob.in{org_logo_url}"
        logo_img_tag = f"""
        <img src="{full_logo_url}" alt="Logo" style="height: 64px; max-width: 140px; object-fit: contain; background: #FFFFFF; padding: 6px 12px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
        """

    city_state = org_city or "Kolhapur, Maharashtra"

    legal_rows = []
    if org_pan and org_pan.strip() and "1234A" not in org_pan:
        legal_rows.append(f'<div>PAN: <strong style="color: #FFFFFF;">{org_pan.strip()}</strong></div>')
    if pan_number and pan_number.strip():
        legal_rows.append('<div>80G Reg: <strong style="color: #4ADE80;">Eligible</strong></div>')

    legal_credentials_html = f"""
    <div style="font-size: 11px; color: #CBD5E1; line-height: 1.6; text-align: right; margin-top: 4px;">
        {''.join(legal_rows)}
    </div>
    """ if legal_rows else ""

    pm_upper = payment_mode.upper()
    pm_badge_color = "#2563EB" if pm_upper in ["UPI", "ONLINE", "DIGITAL"] else "#D97706"

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Donation Receipt {receipt_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F1F5F9; padding: 36px 12px;">
        <tr>
            <td align="center">
                <!-- Main Container Card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08); border: 1px solid #E2E8F0;">
                    
                    <!-- Top Brand Gradient Accent Stripe -->
                    <tr>
                        <td style="height: 5px; background: linear-gradient(90deg, #F59E0B 0%, #2563EB 50%, #10B981 100%);"></td>
                    </tr>

                    <!-- ── 1. Top Luxury Brand Header (Navy #0F172A) ── -->
                    <tr>
                        <td style="background-color: #0F172A; padding: 28px 24px; color: #FFFFFF; border-bottom: 3px solid #F59E0B;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <!-- Left: Logo & Org Details -->
                                    <td valign="top" style="padding-right: 12px;">
                                        {logo_img_tag}
                                        <h1 style="margin: 8px 0 2px 0; font-size: 22px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.3px;">{org_name}</h1>
                                        <p style="margin: 0 0 4px 0; font-size: 12px; color: #F59E0B; font-weight: 600;">{city_state}, India</p>
                                        <p style="margin: 0; font-size: 11px; color: #94A3B8;">Registered Public Trust</p>
                                    </td>
                                    
                                    <!-- Right: Verified Badge & Legal Credentials -->
                                    <td valign="top" align="right" style="width: 200px;">
                                        <div style="background-color: rgba(34, 197, 94, 0.15); border: 1px solid #22C55E; color: #4ADE80; font-size: 10px; font-weight: 800; padding: 4px 12px; border-radius: 16px; text-transform: uppercase; display: inline-block; margin-bottom: 6px;">
                                            ✔ VERIFIED E-RECEIPT
                                        </div>
                                        {legal_credentials_html}
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- ── 2. Gold Luxury Amount Box ── -->
                    <tr>
                        <td style="padding: 24px; background: linear-gradient(180deg, #FFFBEB 0%, #FEF3C7 100%); border-bottom: 1px solid #FDE68A; text-align: center;">
                            <div style="font-size: 11px; color: #B45309; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px;">
                                📿 DONATION RECEIVED 📿
                            </div>
                            <h2 style="margin: 4px 0; font-size: 38px; font-weight: 900; color: #B45309; letter-spacing: -1px;">
                                {amount_formatted}
                            </h2>
                            <p style="margin: 4px 0 10px 0; font-size: 13px; font-weight: 700; color: #78350F;">
                                {amount_in_words}
                            </p>
                            <div>
                                <span style="background-color: #F59E0B; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 5px 16px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    PURPOSE: {purpose}
                                </span>
                            </div>
                        </td>
                    </tr>

                    <!-- ── 3. Structured 2-Column Receipt Specifications ── -->
                    <tr>
                        <td style="padding: 24px;">
                            <div style="background-color: #0F172A; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 10px 16px; border-radius: 10px 10px 0 0; text-transform: uppercase; letter-spacing: 0.5px;">
                                📋 RECEIPT SPECIFICATIONS & AUDIT DETAILS
                            </div>
                            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: separate; border-spacing: 0; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 10px 10px; overflow: hidden;">
                                <tr style="background-color: #F8FAFC;">
                                    <td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600; width: 35%; border-bottom: 1px solid #E2E8F0;">Receipt Number:</td>
                                    <td style="padding: 12px 16px; color: #0F172A; font-weight: 800; font-size: 14px; text-align: right; border-bottom: 1px solid #E2E8F0; font-family: monospace;">{receipt_number}</td>
                                </tr>
                                <tr style="background-color: #FFFFFF;">
                                    <td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Receipt Date:</td>
                                    <td style="padding: 12px 16px; color: #0F172A; font-weight: 700; font-size: 13px; text-align: right; border-bottom: 1px solid #E2E8F0;">{receipt_date}</td>
                                </tr>
                                <tr style="background-color: #F8FAFC;">
                                    <td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Donor Full Name:</td>
                                    <td style="padding: 12px 16px; color: #0F172A; font-weight: 800; font-size: 15px; text-align: right; border-bottom: 1px solid #E2E8F0;">{donor_name}</td>
                                </tr>
                                <tr style="background-color: #FFFFFF;">
                                    <td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Payment Mode:</td>
                                    <td style="padding: 12px 16px; text-align: right; border-bottom: 1px solid #E2E8F0;">
                                        <span style="background-color: {pm_badge_color}; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 3px 12px; border-radius: 6px; text-transform: uppercase;">{pm_upper}</span>
                                    </td>
                                </tr>
                                {f'<tr style="background-color: #F8FAFC;"><td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600; border-bottom: 1px solid #E2E8F0;">Ref / UTR No:</td><td style="padding: 12px 16px; color: #0F172A; font-weight: 800; font-size: 13px; text-align: right; border-bottom: 1px solid #E2E8F0; font-family: monospace;">{transaction_ref}</td></tr>' if transaction_ref else ''}
                                {f'<tr style="background-color: #FFFFFF;"><td style="padding: 12px 16px; color: #64748B; font-size: 12px; font-weight: 600;">Donor PAN (80G Tax Exemption):</td><td style="padding: 12px 16px; color: #16A34A; font-weight: 800; font-size: 13px; text-align: right;">{pan_number} (Eligible)</td></tr>' if pan_number else ''}
                            </table>

                            <!-- Amount in Words Card -->
                            <div style="margin-top: 16px; background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 10px; padding: 12px 16px;">
                                <div style="font-size: 10px; color: #1D4ED8; font-weight: 700; text-transform: uppercase; margin-bottom: 2px;">Amount in Words:</div>
                                <div style="font-size: 13px; color: #1E40AF; font-weight: 800;">{amount_in_words}</div>
                            </div>

                            <!-- ── 4. Verification QR & Digital Signature Footer ── -->
                            <div style="margin-top: 20px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px;">
                                <table width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <!-- Left: QR Code -->
                                        <td style="width: 120px; text-align: center;" valign="middle">
                                            <img src="{qr_img_url}" alt="Verification QR" style="width: 105px; height: 105px; border-radius: 10px; border: 3px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
                                            <div style="font-size: 9px; color: #64748B; font-weight: 700; margin-top: 4px;">SCAN TO VERIFY</div>
                                        </td>

                                        <!-- Right: Digital Signature & Verification Action -->
                                        <td valign="middle" style="padding-left: 16px;">
                                            <div style="font-size: 12px; font-weight: 800; color: #1E3A8A; margin-bottom: 4px;">For {org_name}</div>
                                            <div style="font-size: 11px; color: #16A34A; font-weight: 700; margin-bottom: 8px;">Digitally Signed ✔</div>
                                            <div style="border-bottom: 1px solid #CBD5E1; width: 140px; margin-bottom: 4px;"></div>
                                            <div style="font-size: 10px; color: #64748B; font-style: italic;">Authorized Trustee / Treasurer</div>
                                            
                                            <div style="margin-top: 14px;">
                                                <a href="{verify_link}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 10px 20px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(37, 99, 235, 0.3); text-transform: uppercase;">
                                                    📄 View & Download PDF Receipt
                                                </a>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </div>
                        </td>
                    </tr>

                    <!-- ── 5. Bottom Security Footer Bar ── -->
                    <tr>
                        <td style="background-color: #0F172A; padding: 18px 24px; text-align: center; border-top: 2px solid #F59E0B; color: #94A3B8;">
                            <p style="margin: 0 0 6px 0; font-size: 12px; color: #FFFFFF; font-weight: 600;">
                                🙏 Thank you for your generous contribution and blessings!
                            </p>
                            <p style="margin: 0 0 8px 0; font-size: 10px; color: #CBD5E1;">
                                This is an official computer-generated electronic receipt issued through <strong>Hisob ERP Platform</strong>.
                            </p>
                            <div style="font-size: 10px; color: #F59E0B; font-weight: 700; letter-spacing: 0.5px; margin-bottom: 8px;">
                                🔒 SECURE &nbsp;|&nbsp; ✔ VERIFIED &nbsp;|&nbsp; 🔲 QR VERIFIED &nbsp;|&nbsp; 🏆 HISOB DIGITAL RECEIPT
                            </div>
                            <p style="margin: 6px 0 0 0; font-size: 10px; color: #94A3B8; border-top: 1px solid #1E293B; padding-top: 8px;">
                                Designed &amp; Developed by <a href="https://www.mayurpatil.in" target="_blank" style="color: #F59E0B; text-decoration: none; font-weight: 700;">www.mayurpatil.in</a>
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def send_receipt_email_notification(
    to_email: str,
    donor_name: str,
    receipt_number: str,
    receipt_date: str,
    amount: float,
    purpose: str,
    payment_mode: str,
    org_name: str,
    org_city: Optional[str] = None,
    org_logo_url: Optional[str] = None,
    org_pan: Optional[str] = None,
    pan_number: Optional[str] = None,
    receipt_id: Optional[str] = None,
    transaction_ref: Optional[str] = None,
    db: Optional[Session] = None,
    tenant_id: Optional[UUID] = None,
    attach_pdf: bool = True,
) -> bool:
    """Wrapper function to build HTML and send automated receipt email with PDF/HTML attachment."""
    # Format receipt date as DD-MM-YYYY (e.g. 29-07-2026)
    formatted_date = str(receipt_date)
    try:
        from datetime import date, datetime
        if isinstance(receipt_date, (date, datetime)):
            formatted_date = receipt_date.strftime("%d-%m-%Y")
        elif isinstance(receipt_date, str) and "-" in receipt_date:
            parts = receipt_date.split("T")[0].split("-")
            if len(parts) == 3 and len(parts[0]) == 4:  # YYYY-MM-DD -> DD-MM-YYYY
                formatted_date = f"{parts[2]}-{parts[1]}-{parts[0]}"
    except Exception:
        pass

    subject = f"Official Donation Receipt #{receipt_number} — {org_name}"
    html_content = build_receipt_html(
        receipt_number=receipt_number,
        receipt_date=formatted_date,
        donor_name=donor_name,
        amount=amount,
        purpose=purpose,
        payment_mode=payment_mode,
        org_name=org_name,
        org_city=org_city,
        org_logo_url=org_logo_url,
        org_pan=org_pan,
        pan_number=pan_number,
        receipt_id=receipt_id,
        transaction_ref=transaction_ref,
    )
    text_content = f"Thank you for your donation of ₹{amount:,.2f} to {org_name}. Your Receipt Number is {receipt_number}."

    attachments = None
    if attach_pdf:
        try:
            from app.services.pdf_service import generate_receipt_pdf_bytes
            pdf_bytes = generate_receipt_pdf_bytes(
                receipt_number=receipt_number,
                receipt_date=formatted_date,
                donor_name=donor_name,
                amount=amount,
                purpose=purpose,
                payment_mode=payment_mode,
                org_name=org_name,
                org_city=org_city,
                org_pan=org_pan,
                org_logo_url=org_logo_url,
                pan_number=pan_number,
                transaction_ref=transaction_ref,
                receipt_id=receipt_id,
            )
            att_name = f"Receipt_#{receipt_number}.pdf"
            attachments = [(att_name, pdf_bytes, "application/pdf")]
        except Exception as pdf_ex:
            logger.error("Failed to generate PDF receipt attachment: %s", str(pdf_ex))

    return send_raw_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        attachments=attachments,
        db=db,
        tenant_id=tenant_id,
        email_type="RECEIPT",
        metadata_json={"receipt_number": receipt_number, "amount": amount, "donor_name": donor_name},
    )


def build_daily_digest_html(
    org_name: str,
    digest_date: str,
    total_collected: float,
    receipts_count: int,
    cash_collected: float,
    digital_collected: float,
    unsettled_cash_amount: float,
    unsettled_cash_count: int,
    total_expenses_today: float,
    pending_expenses_count: int,
    org_logo_url: Optional[str] = None,
) -> str:
    """Builds a responsive HTML Daily Financial Digest Email."""
    logo_img_tag = ""
    if org_logo_url:
        full_logo_url = org_logo_url if org_logo_url.startswith("http") else f"https://api.hisob.in{org_logo_url}"
        logo_img_tag = f'<img src="{full_logo_url}" alt="Logo" style="height: 50px; max-width: 140px; object-fit: contain; background: #FFFFFF; padding: 4px 10px; border-radius: 8px; margin-bottom: 8px;" />'

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Financial Digest — {org_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0F172A; padding: 32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid #1E293B;">
                    
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; border-bottom: 4px solid #3B82F6;">
                            {logo_img_tag}
                            <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 900; color: #FFFFFF;">{org_name}</h1>
                            <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8;">Daily Financial & Collection Summary — <strong>{digest_date}</strong></p>
                            <span style="background-color: rgba(59, 130, 246, 0.2); border: 1px solid #3B82F6; color: #60A5FA; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px; text-transform: uppercase;">
                                📊 Automated Daily Executive Briefing
                            </span>
                        </td>
                    </tr>

                    <!-- Key Stats Grid -->
                    <tr>
                        <td style="padding: 24px 20px 12px 20px; background-color: #F8FAFC;">
                            <table width="100%" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td width="50%" style="padding: 6px;">
                                        <div style="background-color: #EFF6FF; border: 1px solid #BFDBFE; border-radius: 12px; padding: 16px; text-align: center;">
                                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #1D4ED8; font-weight: 700; text-transform: uppercase;">Total Collections</p>
                                            <h2 style="margin: 0; font-size: 26px; font-weight: 900; color: #1E40AF;">₹{total_collected:,.2f}</h2>
                                            <p style="margin: 4px 0 0 0; font-size: 11px; color: #3B82F6;">{receipts_count} Receipts Issued</p>
                                        </div>
                                    </td>
                                    <td width="50%" style="padding: 6px;">
                                        <div style="background-color: #FEF2F2; border: 1px solid #FECACA; border-radius: 12px; padding: 16px; text-align: center;">
                                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #B91C1C; font-weight: 700; text-transform: uppercase;">Total Expenses</p>
                                            <h2 style="margin: 0; font-size: 26px; font-weight: 900; color: #991B1B;">₹{total_expenses_today:,.2f}</h2>
                                            <p style="margin: 4px 0 0 0; font-size: 11px; color: #EF4444;">{pending_expenses_count} Pending Approval</p>
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Detailed Breakdown -->
                    <tr>
                        <td style="padding: 12px 24px 24px 24px;">
                            <h3 style="margin: 12px 0 12px 0; font-size: 14px; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.5px;">Collection Breakdown</h3>
                            
                            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: separate; border-spacing: 0; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
                                <tr style="background-color: #F8FAFC;">
                                    <td style="padding: 10px 14px; color: #64748B; font-size: 13px; border-bottom: 1px solid #E2E8F0;">Cash Collected:</td>
                                    <td style="padding: 10px 14px; color: #0F172A; font-weight: 700; font-size: 13px; text-align: right; border-bottom: 1px solid #E2E8F0;">₹{cash_collected:,.2f}</td>
                                </tr>
                                <tr style="background-color: #FFFFFF;">
                                    <td style="padding: 10px 14px; color: #64748B; font-size: 13px; border-bottom: 1px solid #E2E8F0;">Digital / UPI / Cheque:</td>
                                    <td style="padding: 10px 14px; color: #2563EB; font-weight: 700; font-size: 13px; text-align: right; border-bottom: 1px solid #E2E8F0;">₹{digital_collected:,.2f}</td>
                                </tr>
                                <tr style="background-color: #FFF7ED;">
                                    <td style="padding: 10px 14px; color: #9A3412; font-size: 13px; font-weight: 600;">Unsettled Cash Handover:</td>
                                    <td style="padding: 10px 14px; color: #EA580C; font-weight: 800; font-size: 13px; text-align: right;">₹{unsettled_cash_amount:,.2f} ({unsettled_cash_count} receipts)</td>
                                </tr>
                            </table>

                            <!-- CTA Button -->
                            <div style="margin-top: 24px; text-align: center;">
                                <a href="https://hisob.in/dashboard" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); color: #FFFFFF; font-size: 13px; font-weight: 800; padding: 12px 28px; border-radius: 10px; text-decoration: none; box-shadow: 0 4px 14px rgba(15,23,42,0.25); text-transform: uppercase;">
                                    📈 Open Hisob ERP Dashboard
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F1F5F9; padding: 16px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748B;">
                                Automated Daily Financial Digest delivered by <strong>Hisob ERP</strong>.
                            </p>
                            <p style="margin: 0 0 4px 0; font-size: 10px; color: #94A3B8;">
                                Secured & Verified by <a href="https://hisob.in" style="color: #2563EB; text-decoration: none; font-weight: 700;">Hisob ERP Platform</a>
                            </p>
                            <p style="margin: 0; font-size: 10px; color: #64748B;">
                                Developed by <a href="https://www.mayurpatil.in" target="_blank" style="color: #EA580C; text-decoration: none; font-weight: 700;">www.mayurpatil.in</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def send_tenant_daily_digest(db, tenant_id) -> Dict[str, Any]:
    """
    Computes today's financial metrics for a tenant and dispatches daily digest email
    to all active Organization Admins and Committee members.
    """
    from datetime import date as dt_date
    from app.models.tenant import Tenant
    from app.models.receipt import Receipt, ReceiptStatus, PaymentMode
    from app.models.expense import Expense, ExpenseStatus
    from app.models.user import User

    tenant = db.get(Tenant, tenant_id)
    if not tenant or not tenant.is_active:
        return {"status": "skipped", "reason": "Tenant not found or inactive"}

    if hasattr(tenant, "enable_daily_digest") and not tenant.enable_daily_digest:
        return {"status": "skipped", "reason": "Daily digest is disabled in Organization Settings"}

    today = dt_date.today()
    today_str = today.strftime("%d-%m-%Y")

    # Fetch today's receipts
    today_receipts = db.query(Receipt).filter(
        Receipt.tenant_id == tenant.id,
        Receipt.receipt_date == today,
        Receipt.status != ReceiptStatus.CANCELLED,
    ).all()

    total_collected = sum(float(r.amount) for r in today_receipts)
    receipts_count = len(today_receipts)
    cash_collected = sum(float(r.amount) for r in today_receipts if r.payment_mode == PaymentMode.CASH)
    digital_collected = total_collected - cash_collected

    # Fetch unsettled cash receipts across all time for this tenant
    unsettled_receipts = db.query(Receipt).filter(
        Receipt.tenant_id == tenant.id,
        Receipt.payment_mode == PaymentMode.CASH,
        Receipt.status.in_([ReceiptStatus.ISSUED, ReceiptStatus.PENDING_SETTLEMENT]),
    ).all()
    unsettled_cash_amount = sum(float(r.amount) for r in unsettled_receipts)
    unsettled_cash_count = len(unsettled_receipts)

    # Fetch today's expenses
    today_expenses = db.query(Expense).filter(
        Expense.tenant_id == tenant.id,
        Expense.expense_date == today,
    ).all()
    total_expenses_today = sum(float(e.amount) for e in today_expenses)

    pending_expenses = db.query(Expense).filter(
        Expense.tenant_id == tenant.id,
        Expense.status == ExpenseStatus.PENDING_APPROVAL,
    ).count()

    # Collect recipient emails: check custom digest_recipients setting first
    target_emails = set()
    if getattr(tenant, "digest_recipients", None):
        custom_list = [e.strip() for e in tenant.digest_recipients.replace(";", ",").split(",") if e.strip()]
        for c_email in custom_list:
            if "@" in c_email:
                target_emails.add(c_email)

    # If no custom list set, fall back to main org email + active tenant users
    if not target_emails:
        if tenant.email and "@" in tenant.email:
            target_emails.add(tenant.email.strip())

        users = db.query(User).filter(
            User.tenant_id == tenant.id,
            User.is_active == True,
            User.email.isnot(None),
        ).all()

        for u in users:
            if u.email and "@" in u.email:
                target_emails.add(u.email.strip())

    if not target_emails:
        return {"status": "skipped", "reason": "No active recipients with email found"}

    html_content = build_daily_digest_html(
        org_name=tenant.name,
        digest_date=today_str,
        total_collected=total_collected,
        receipts_count=receipts_count,
        cash_collected=cash_collected,
        digital_collected=digital_collected,
        unsettled_cash_amount=unsettled_cash_amount,
        unsettled_cash_count=unsettled_cash_count,
        total_expenses_today=total_expenses_today,
        pending_expenses_count=pending_expenses,
        org_logo_url=tenant.logo_url,
    )

    subject = f"📊 Daily Financial Digest ({today_str}) — {tenant.name}"
    sent_count = 0

    for email_addr in target_emails:
        success = send_raw_email(
            to_email=email_addr,
            subject=subject,
            html_content=html_content,
            text_content=f"Daily Financial Digest for {tenant.name} on {today_str}. Total Collected: ₹{total_collected:,.2f}.",
        )
        if success:
            sent_count += 1

    return {
        "status": "success",
        "tenant_name": tenant.name,
        "date": today_str,
        "recipients_sent": sent_count,
        "total_collected": total_collected,
    }


def build_donor_welcome_html(
    donor_name: str,
    donor_number: str,
    org_name: str,
    org_city: Optional[str] = None,
    org_logo_url: Optional[str] = None,
) -> str:
    """
    Renders a premium HTML email card welcoming a new donor.
    Uses 100% table-based layout for maximum email client compatibility.
    """
    logo_html = ""
    if org_logo_url:
        full_logo_url = org_logo_url if org_logo_url.startswith("http") else f"https://api.hisob.in{org_logo_url}"
        logo_html = f'''<tr><td align="center" style="padding-bottom: 16px;">
            <img src="{full_logo_url}" alt="{org_name}" style="max-height: 64px; border-radius: 12px; background: #FFFFFF; padding: 6px;" />
        </td></tr>'''

    location_row = ""
    if org_city:
        location_row = f'<tr><td style="color: #92400E; font-weight: 600; padding: 6px 0;">Location</td><td style="color: #1E293B; font-weight: 700; padding: 6px 0;">{org_city}</td></tr>'

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {org_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: 'Segoe UI', Roboto, -apple-system, Arial, sans-serif; -webkit-font-smoothing: antialiased;">

    <!-- Outer wrapper -->
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9;">
        <tr>
            <td align="center" style="padding: 28px 14px;">

                <!-- Main Card -->
                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 560px; background-color: #FFFFFF; border-radius: 16px; overflow: hidden; border: 1px solid #E2E8F0;">

                    <!-- Accent Bar -->
                    <tr><td style="height: 4px; background: linear-gradient(90deg, #F97316, #EA580C, #DC2626);"></td></tr>

                    <!-- Header -->
                    <tr>
                        <td style="background-color: #0F172A; padding: 28px 24px 24px; text-align: center;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                {logo_html}
                                <tr><td align="center" style="padding-bottom: 12px;">
                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                        <tr><td style="background-color: #1E293B; border: 1px solid #334155; border-radius: 20px; padding: 5px 16px;">
                                            <span style="color: #FB923C; font-size: 11px; font-weight: 800; letter-spacing: 1px; text-transform: uppercase;">OFFICIAL DONOR WELCOME</span>
                                        </td></tr>
                                    </table>
                                </td></tr>
                                <tr><td align="center">
                                    <h1 style="margin: 0; font-size: 22px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.3px;">Welcome to {org_name}!</h1>
                                </td></tr>
                                <tr><td align="center" style="padding-top: 6px;">
                                    <p style="margin: 0; font-size: 12px; color: #94A3B8; font-weight: 500;">Registration Confirmed Successfully</p>
                                </td></tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Greeting -->
                    <tr>
                        <td style="padding: 28px 28px 0;">
                            <p style="margin: 0 0 10px; font-size: 16px; font-weight: 800; color: #0F172A;">Namaste, {donor_name}!</p>
                            <p style="margin: 0; font-size: 13px; line-height: 1.65; color: #475569;">
                                On behalf of <strong style="color: #0F172A;">{org_name}</strong>, we extend our heartfelt gratitude for becoming an official registered donor. Your support fuels our festivals, community programs, and charitable work.
                            </p>
                        </td>
                    </tr>

                    <!-- Donor ID Card -->
                    <tr>
                        <td style="padding: 24px 28px;">
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #FFF7ED; border: 1px solid #FED7AA; border-radius: 12px;">
                                <!-- Card Header -->
                                <tr>
                                    <td style="padding: 18px 18px 0;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                            <tr>
                                                <td>
                                                    <p style="margin: 0 0 2px; font-size: 9px; font-weight: 800; color: #C2410C; text-transform: uppercase; letter-spacing: 1.2px;">DONOR ID</p>
                                                    <p style="margin: 0; font-size: 22px; font-weight: 900; color: #EA580C; letter-spacing: 0.5px;">{donor_number}</p>
                                                </td>
                                                <td align="right" valign="top">
                                                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                                        <tr><td style="background-color: #16A34A; border-radius: 6px; padding: 4px 10px;">
                                                            <span style="color: #FFFFFF; font-size: 9px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">VERIFIED</span>
                                                        </td></tr>
                                                    </table>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                </tr>
                                <!-- Divider -->
                                <tr><td style="padding: 12px 18px 0;"><hr style="border: none; border-top: 1px dashed #FDBA74; margin: 0;" /></td></tr>
                                <!-- Card Details -->
                                <tr>
                                    <td style="padding: 12px 18px 18px;">
                                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="font-size: 13px;">
                                            <tr>
                                                <td style="color: #92400E; font-weight: 600; padding: 6px 0; width: 110px;">Name</td>
                                                <td style="color: #1E293B; font-weight: 800; padding: 6px 0;">{donor_name}</td>
                                            </tr>
                                            <tr>
                                                <td style="color: #92400E; font-weight: 600; padding: 6px 0;">Organization</td>
                                                <td style="color: #1E293B; font-weight: 700; padding: 6px 0;">{org_name}</td>
                                            </tr>
                                            {location_row}
                                        </table>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Benefits Section -->
                    <tr>
                        <td style="padding: 0 28px 8px;">
                            <p style="margin: 0 0 14px; font-size: 11px; font-weight: 800; color: #64748B; text-transform: uppercase; letter-spacing: 0.8px;">What You Can Expect</p>

                            <!-- Benefit 1 -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px;">
                                <tr>
                                    <td width="40" valign="top">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr><td style="background-color: #EFF6FF; border-radius: 8px; width: 36px; height: 36px; text-align: center; line-height: 36px; font-size: 16px; color: #2563EB; font-weight: 900;">&#9993;</td></tr>
                                        </table>
                                    </td>
                                    <td style="padding-left: 12px;" valign="top">
                                        <p style="margin: 0 0 2px; font-size: 13px; font-weight: 700; color: #0F172A;">Instant Digital Receipts</p>
                                        <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.4;">Verified e-receipts with QR code verification delivered to your email for every contribution.</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Benefit 2 -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 12px;">
                                <tr>
                                    <td width="40" valign="top">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr><td style="background-color: #F0FDF4; border-radius: 8px; width: 36px; height: 36px; text-align: center; line-height: 36px; font-size: 16px; color: #16A34A; font-weight: 900;">&#10003;</td></tr>
                                        </table>
                                    </td>
                                    <td style="padding-left: 12px;" valign="top">
                                        <p style="margin: 0 0 2px; font-size: 13px; font-weight: 700; color: #0F172A;">100% Transparency</p>
                                        <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.4;">Your contributions are securely audited and accounted for with full financial trail.</p>
                                    </td>
                                </tr>
                            </table>

                            <!-- Benefit 3 -->
                            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td width="40" valign="top">
                                        <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                            <tr><td style="background-color: #FFF7ED; border-radius: 8px; width: 36px; height: 36px; text-align: center; line-height: 36px; font-size: 16px; color: #EA580C; font-weight: 900;">&#9733;</td></tr>
                                        </table>
                                    </td>
                                    <td style="padding-left: 12px;" valign="top">
                                        <p style="margin: 0 0 2px; font-size: 13px; font-weight: 700; color: #0F172A;">Festival Updates</p>
                                        <p style="margin: 0; font-size: 12px; color: #64748B; line-height: 1.4;">Stay connected with festival schedules, community events, and special announcements.</p>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- CTA Button -->
                    <tr>
                        <td align="center" style="padding: 20px 28px 28px;">
                            <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                                <tr>
                                    <td style="background-color: #EA580C; border-radius: 10px;">
                                        <a href="https://hisob.in" target="_blank" style="display: inline-block; color: #FFFFFF; font-size: 13px; font-weight: 800; padding: 12px 32px; text-decoration: none; letter-spacing: 0.3px;">
                                            Visit Hisob ERP Platform &rarr;
                                        </a>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F8FAFC; padding: 18px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
                            <p style="margin: 0 0 4px; font-size: 11px; color: #64748B;">
                                Sent with gratitude by <strong>{org_name}</strong> via Hisob ERP.
                            </p>
                            <p style="margin: 0; font-size: 10px; color: #94A3B8;">
                                Developed by <a href="https://www.mayurpatil.in" target="_blank" style="color: #EA580C; text-decoration: none; font-weight: 700;">www.mayurpatil.in</a>
                            </p>
                        </td>
                    </tr>

                </table>

            </td>
        </tr>
    </table>

</body>
</html>
"""


def send_donor_welcome_email(
    to_email: str,
    donor_name: str,
    donor_number: str,
    org_name: str,
    org_city: Optional[str] = None,
    org_logo_url: Optional[str] = None,
    db: Optional[Session] = None,
    tenant_id: Optional[UUID] = None,
) -> bool:
    """
    Sends the welcome email notification to a newly registered donor.
    """
    if not to_email or "@" not in to_email:
        return False

    html = build_donor_welcome_html(
        donor_name=donor_name,
        donor_number=donor_number,
        org_name=org_name,
        org_city=org_city,
        org_logo_url=org_logo_url,
    )

    subject = f"🎉 Welcome to {org_name}! Official Donor Registration"
    text = f"Namaste {donor_name}, welcome to {org_name}. Your Official Donor ID is {donor_number}."

    return send_raw_email(
        to_email=to_email,
        subject=subject,
        html_content=html,
        text_content=text,
        db=db,
        tenant_id=tenant_id,
        email_type="WELCOME",
        metadata_json={"donor_number": donor_number, "donor_name": donor_name},
    )


def build_report_email_html(
    report_title: str,
    org_name: str,
    custom_message: Optional[str] = None,
    org_logo_url: Optional[str] = None,
) -> str:
    """Renders a responsive HTML card for financial report email distribution."""
    logo_tag = ""
    if org_logo_url:
        full_logo = org_logo_url if org_logo_url.startswith("http") else f"https://api.hisob.in{org_logo_url}"
        logo_tag = f'<img src="{full_logo}" alt="Logo" style="height: 50px; max-width: 140px; object-fit: contain; background: #FFFFFF; padding: 4px 10px; border-radius: 8px; margin-bottom: 8px;" />'

    msg_section = ""
    if custom_message:
        msg_section = f"""
        <div style="background-color: #FFF7ED; border-left: 4px solid #EA580C; padding: 14px 16px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 0 0 4px 0; font-size: 11px; font-weight: 800; color: #C2410C; text-transform: uppercase;">Note from Sender:</p>
            <p style="margin: 0; font-size: 13px; color: #431407; line-height: 1.5;">{custom_message}</p>
        </div>
        """

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{report_title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0F172A; padding: 32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid #1E293B;">
                    <tr>
                        <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 32px 24px; text-align: center; color: #FFFFFF; border-bottom: 4px solid #2563EB;">
                            {logo_tag}
                            <h1 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 900; color: #FFFFFF;">{org_name}</h1>
                            <p style="margin: 0 0 12px 0; font-size: 13px; color: #94A3B8;">Official Executive Financial Statement</p>
                            <span style="background-color: rgba(37, 99, 235, 0.2); border: 1px solid #2563EB; color: #60A5FA; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px; text-transform: uppercase;">
                                📊 {report_title}
                            </span>
                        </td>
                    </tr>
                    <tr>
                        <td style="padding: 28px 24px;">
                            {msg_section}
                            <p style="margin: 0 0 12px 0; font-size: 14px; color: #334155; line-height: 1.6;">
                                Please find attached the official <strong>{report_title}</strong> issued by <strong>{org_name}</strong> via Hisob ERP.
                            </p>
                            <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; text-align: center; margin-top: 16px;">
                                <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748B; font-weight: 600;">📎 Attached File Document</p>
                                <p style="margin: 0; font-size: 13px; color: #0F172A; font-weight: 800;">Open your email attachments to view or download the statement.</p>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <td style="background-color: #F1F5F9; padding: 16px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748B;">Delivered via <strong>Hisob ERP Platform</strong></p>
                            <p style="margin: 0; font-size: 10px; color: #94A3B8;">Developed by <a href="https://www.mayurpatil.in" target="_blank" style="color: #EA580C; text-decoration: none; font-weight: 700;">www.mayurpatil.in</a></p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
"""


def send_report_email(
    to_emails: List[str],
    report_title: str,
    report_type: str,
    file_bytes: bytes,
    file_name: str,
    mime_type: str = "text/csv",
    org_name: str = "Hisob ERP",
    custom_message: Optional[str] = None,
    org_logo_url: Optional[str] = None,
    db: Optional[Session] = None,
    tenant_id: Optional[UUID] = None,
) -> Dict[str, Any]:
    """Sends financial report with attached document to a list of recipient emails."""
    html_content = build_report_email_html(
        report_title=report_title,
        org_name=org_name,
        custom_message=custom_message,
        org_logo_url=org_logo_url,
    )
    subject = f"📊 Financial Statement: {report_title} — {org_name}"
    text_content = f"Attached is {report_title} for {org_name}."

    attachments = [(file_name, file_bytes, mime_type)]
    sent_count = 0
    failed_count = 0

    for email_addr in to_emails:
        addr = email_addr.strip()
        if not addr or "@" not in addr:
            failed_count += 1
            continue

        success = send_raw_email(
            to_email=addr,
            subject=subject,
            html_content=html_content,
            text_content=text_content,
            attachments=attachments,
            db=db,
            tenant_id=tenant_id,
            email_type="REPORT",
            metadata_json={"report_type": report_type, "report_title": report_title, "filename": file_name},
        )
        if success:
            sent_count += 1
        else:
            failed_count += 1

    return {
        "status": "completed",
        "total_recipients": len(to_emails),
        "sent_count": sent_count,
        "failed_count": failed_count,
    }


def send_test_smtp_email(
    to_email: str,
    db: Optional[Session] = None,
    tenant_id: Optional[UUID] = None,
) -> Dict[str, Any]:
    """Tests SMTP server connection and dispatches a diagnostic test email with Tenant Branding & Logo."""
    if not settings.EMAIL_ENABLED:
        return {
            "success": False,
            "message": "Email delivery is disabled in settings (EMAIL_ENABLED=False).",
            "smtp_host": settings.SMTP_HOST,
            "smtp_port": settings.SMTP_PORT,
            "error": "EMAIL_ENABLED is set to False in backend configuration.",
        }

    if not settings.SMTP_PASSWORD:
        return {
            "success": False,
            "message": "SMTP_PASSWORD is missing in backend configuration.",
            "smtp_host": settings.SMTP_HOST,
            "smtp_port": settings.SMTP_PORT,
            "error": "SMTP_PASSWORD is empty in .env settings.",
        }

    org_name = "Hisob ERP"
    logo_tag = ""

    if db and tenant_id:
        from app.models.tenant import Tenant
        tenant = db.get(Tenant, tenant_id)
        if tenant:
            org_name = tenant.name
            if tenant.logo_url:
                full_logo_url = tenant.logo_url if tenant.logo_url.startswith("http") else f"https://api.hisob.in{tenant.logo_url}"
                logo_tag = f'<img src="{full_logo_url}" alt="Logo" style="height: 55px; max-width: 160px; object-fit: contain; background: #FFFFFF; padding: 4px 10px; border-radius: 10px; margin-bottom: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" /><br/>'

    subject = f"🔌 SMTP Diagnostic Test — {org_name}"
    html_content = f"""<!DOCTYPE html>
<html>
<body style="background-color: #0F172A; padding: 28px 12px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
    <div style="max-width: 540px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid #1E293B;">
        <div style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 28px 24px; text-align: center; color: #FFFFFF; border-bottom: 4px solid #16A34A;">
            {logo_tag}
            <h2 style="margin: 0 0 4px 0; font-size: 22px; font-weight: 900; color: #FFFFFF;">{org_name}</h2>
            <span style="background-color: rgba(22, 163, 74, 0.2); border: 1px solid #16A34A; color: #4ADE80; font-size: 11px; font-weight: 700; padding: 4px 14px; border-radius: 20px; text-transform: uppercase;">
                ✓ SMTP Connection Test Successful
            </span>
        </div>
        <div style="padding: 24px; text-align: center;">
            <p style="color: #334155; font-size: 14px; line-height: 1.6; margin-top: 0;">
                This diagnostic test email confirms that your organization's SMTP server connection is active and fully configured to dispatch e-receipts and financial reports.
            </p>
            <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 12px; padding: 16px; text-align: left; font-family: monospace; font-size: 12px; margin-top: 16px;">
                <div style="margin-bottom: 6px; color: #475569;">SMTP Host: <strong style="color: #0F172A;">{settings.SMTP_HOST}</strong></div>
                <div style="margin-bottom: 6px; color: #475569;">SMTP Port: <strong style="color: #0F172A;">{settings.SMTP_PORT}</strong></div>
                <div style="margin-bottom: 6px; color: #475569;">Sender User: <strong style="color: #0F172A;">{settings.SMTP_USER}</strong></div>
                <div style="color: #475569;">TLS Encryption: <strong style="color: #0F172A;">{settings.SMTP_USE_TLS}</strong></div>
            </div>
        </div>
        <div style="background-color: #F1F5F9; padding: 14px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
            <p style="margin: 0; font-size: 10px; color: #64748B;">Powered by <a href="https://hisob.in" style="color: #2563EB; text-decoration: none; font-weight: 700;">Hisob ERP Platform</a></p>
        </div>
    </div>
</body>
</html>
"""
    success = send_raw_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=f"SMTP Connection Test Successful for {org_name}!",
        db=db,
        tenant_id=tenant_id,
        email_type="TEST",
        metadata_json={"test": True, "smtp_host": settings.SMTP_HOST, "smtp_port": settings.SMTP_PORT},
    )

    if success:
        return {
            "success": True,
            "message": f"Successfully connected to SMTP server and delivered test email to {to_email}!",
            "smtp_host": settings.SMTP_HOST,
            "smtp_port": settings.SMTP_PORT,
            "error": None,
        }
    else:
        return {
            "success": False,
            "message": f"Failed to deliver test email to {to_email}. Check SMTP password, host, or server port configuration.",
            "smtp_host": settings.SMTP_HOST,
            "smtp_port": settings.SMTP_PORT,
            "error": "SMTP socket/authentication error. Check backend server logs for full trace details.",
        }


def send_user_invitation_email(
    to_email: str,
    org_name: str,
    role_name: str,
    invite_url: str,
    expires_at_str: str,
    custom_note: Optional[str] = None,
    inviter_name: Optional[str] = None,
    logo_url: Optional[str] = None,
    db: Optional[Session] = None,
    tenant_id: Optional[UUID] = None,
) -> bool:
    """Delivers executive team invitation email with join token link."""
    subject = f"✉️ Invitation to join {org_name} on Hisob ERP"

    logo_html = ""
    if logo_url:
        full_logo = logo_url if logo_url.startswith("http") else f"https://api.hisob.in{logo_url}"
        logo_html = f'<img src="{full_logo}" alt="Logo" style="height: 52px; max-width: 170px; object-fit: contain; margin-bottom: 14px;" /><br/>'

    note_html = ""
    if custom_note:
        note_html = f"""
        <div style="background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%); border-left: 4px solid #2563EB; border-radius: 12px; padding: 16px 20px; margin: 22px 0;">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748B; font-weight: 800; letter-spacing: 0.8px; margin-bottom: 6px;">Personal Note from {inviter_name or 'Admin'}:</div>
            <p style="margin: 0; color: #1E293B; font-style: italic; font-size: 14px; line-height: 1.5;">"{custom_note}"</p>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invitation to join {org_name}</title>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #0B0F17; font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
        <tr>
            <td align="center">
                <div style="background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1); border: 1px solid #1E293B;">
                    
                    <!-- Top Accent Glow Banner -->
                    <div style="height: 5px; background: linear-gradient(90deg, #6366F1 0%, #3B82F6 50%, #10B981 100%);"></div>

                    <!-- Executive Header -->
                    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%); padding: 40px 32px 36px 32px; text-align: center; color: #FFFFFF;">
                        {logo_html}
                        <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                            {org_name}
                        </h1>
                        <div style="display: inline-block; background: rgba(59, 130, 246, 0.18); border: 1px solid rgba(96, 165, 250, 0.4); color: #93C5FD; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 6px 18px; border-radius: 50px; text-transform: uppercase;">
                            👥 TEAM ONBOARDING INVITATION
                        </div>
                    </div>

                    <!-- Main Body Content -->
                    <div style="padding: 36px 32px; background-color: #FFFFFF;">
                        <p style="margin: 0 0 16px 0; color: #0F172A; font-size: 17px; font-weight: 600;">
                            Hello,
                        </p>
                        
                        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.65;">
                            <strong>{inviter_name or 'An Administrator'}</strong> has invited you to join <strong>{org_name}</strong> as a <span style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 6px; display: inline-block;">{role_name.title()}</span> on Hisob ERP.
                        </p>

                        {note_html}

                        <!-- Action CTA Button -->
                        <div style="text-align: center; margin: 32px 0 28px 0;">
                            <a href="{invite_url}" style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 42px; border-radius: 14px; display: inline-block; box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 4px 6px -2px rgba(37, 99, 235, 0.2); letter-spacing: 0.2px;">
                                Accept Invitation & Complete Profile &rarr;
                            </a>
                        </div>

                        <div style="background-color: #F8FAFC; border-radius: 14px; padding: 16px 20px; border: 1px solid #F1F5F9; text-align: center; font-size: 13px; color: #64748B;">
                            ⏳ <strong>Invitation Expiration:</strong> This secure invitation link expires on <strong>{expires_at_str}</strong>.
                        </div>
                    </div>

                    <!-- Executive Footer -->
                    <div style="background-color: #F8FAFC; padding: 24px 32px; text-align: center; border-top: 1px solid #E2E8F0;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; font-weight: 600;">
                            Organized by <strong>{org_name}</strong> via Hisob ERP.
                        </p>
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: #94A3B8;">
                            Protected by Hisob ERP Enterprise Multi-Tenant Security &bull; <a href="https://hisob.in" style="color: #64748B; text-decoration: underline;">hisob.in</a>
                        </p>
                        <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748B; font-weight: 600;">
                            Designed & Developed by <a href="https://www.mayurpatil.in" target="_blank" style="color: #2563EB; text-decoration: none; font-weight: 700;">www.mayurpatil.in</a>
                        </p>
                    </div>

                </div>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return send_raw_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=f"You have been invited to join {org_name} as {role_name}. Accept here: {invite_url}",
        db=db,
        tenant_id=tenant_id,
        email_type="USER_INVITATION",
        metadata_json={"role_name": role_name, "expires_at": expires_at_str},
    )



def send_digital_patrika_email(
    to_email: str,
    guest_name: str,
    event_title: str,
    org_name: str,
    rsvp_url: str,
    vip_tier: str = "General Patron",
    qr_code_url: Optional[str] = None,
    db: Optional[Session] = None,
    tenant_id: Optional[UUID] = None,
) -> bool:
    """Delivers digital event patrika card invitation email with RSVP link."""
    subject = f"🌺 Cordial Invitation: {event_title} — {org_name}"

    qr_html = ""
    if qr_code_url:
        full_qr = qr_code_url if qr_code_url.startswith("http") else f"https://api.hisob.in{qr_code_url}"
        qr_html = f"""
        <div style="text-align: center; margin: 20px 0; padding: 16px; background: #F8FAFC; border-radius: 12px; border: 1px dashed #CBD5E1;">
            <img src="{full_qr}" alt="Entry QR Pass" style="width: 140px; height: 140px; border-radius: 8px; border: 1px solid #E2E8F0;" /><br/>
            <span style="font-size: 11px; color: #64748B; font-weight: 600; margin-top: 6px; display: block;">Your VIP Entrance QR Pass</span>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html>
<body style="background-color: #0F172A; padding: 28px 12px; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
    <div style="max-width: 580px; margin: 0 auto; background: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3);">
        <div style="background: linear-gradient(135deg, #7C3AED 0%, #4C1D95 100%); padding: 36px 24px; text-align: center; color: #FFFFFF;">
            <span style="background-color: rgba(255, 255, 255, 0.2); border: 1px solid rgba(255,255,255,0.4); color: #F3E8FF; font-size: 11px; font-weight: 700; padding: 4px 16px; border-radius: 20px; text-transform: uppercase;">
                ✨ {vip_tier} Invitation
            </span>
            <h1 style="margin: 14px 0 6px 0; font-size: 26px; font-weight: 900; color: #FFFFFF;">{event_title}</h1>
            <p style="margin: 0; font-size: 15px; color: #DDD6FE; font-weight: 600;">{org_name}</p>
        </div>
        <div style="padding: 28px 24px;">
            <p style="color: #334155; font-size: 16px; line-height: 1.6; margin-top: 0;">
                Respected <strong>{guest_name}</strong>,
            </p>
            <p style="color: #334155; font-size: 15px; line-height: 1.6;">
                We cordially invite you and your family to grace the auspicious celebration of <strong>{event_title}</strong> organized by <strong>{org_name}</strong>.
            </p>
            {qr_html}
            <div style="text-align: center; margin: 28px 0;">
                <a href="{rsvp_url}" style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); color: #FFFFFF; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 12px; display: inline-block; box-shadow: 0 8px 20px rgba(124,58,237,0.35);">
                    View Digital Patrika & Confirm RSVP
                </a>
            </div>
        </div>
        <div style="background-color: #F8FAFC; padding: 20px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
            <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B;">
                With Warm Regards — <strong>{org_name} Committee</strong>
            </p>
            <p style="margin: 4px 0 0 0; font-size: 11px; color: #64748B; font-weight: 600;">
                Designed & Developed by <a href="https://www.mayurpatil.in" target="_blank" style="color: #7C3AED; text-decoration: none; font-weight: 700;">www.mayurpatil.in</a>
            </p>
        </div>
    </div>
</body>
</html>
"""
    return send_raw_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=f"Invitation to {event_title} for {guest_name}. Confirm RSVP: {rsvp_url}",
        db=db,
        tenant_id=tenant_id,
        email_type="EVENT_PATRIKA",
        metadata_json={"event_title": event_title, "guest_name": guest_name, "vip_tier": vip_tier},
    )


def send_user_welcome_email(
    to_email: str,
    user_name: str,
    org_name: str,
    role_name: str,
    initial_password: Optional[str] = None,
    login_url: str = "https://hisob.in/login",
    db: Optional[Session] = None,
    tenant_id: Optional[UUID] = None,
) -> bool:
    """Delivers executive account welcome and login credentials email to a newly created user."""
    subject = f"🎉 Welcome to {org_name} — Your Account Credentials"

    password_html = ""
    if initial_password:
        password_html = f"""
        <div style="background: linear-gradient(180deg, #F8FAFC 0%, #F1F5F9 100%); border: 1px solid #CBD5E1; border-radius: 16px; padding: 22px 24px; margin: 24px 0; box-shadow: inset 0 1px 0 rgba(255,255,255,0.8);">
            <div style="font-size: 11px; text-transform: uppercase; color: #475569; font-weight: 800; letter-spacing: 1px; margin-bottom: 14px;">
                🔑 OFFICIAL ACCOUNT CREDENTIALS
            </div>
            
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #475569; width: 140px; font-weight: 600;">Email Address:</td>
                    <td style="padding: 6px 0; font-size: 14px; color: #0F172A; font-weight: 700; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;">{to_email}</td>
                </tr>
                <tr>
                    <td style="padding: 6px 0; font-size: 14px; color: #475569; font-weight: 600;">Temporary Password:</td>
                    <td style="padding: 6px 0;">
                        <span style="background: #FFFFFF; border: 1px solid #CBD5E1; color: #0F172A; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 15px; font-weight: 800; padding: 6px 14px; border-radius: 8px; display: inline-block; letter-spacing: 1px; box-shadow: 0 1px 3px rgba(0,0,0,0.06);">
                            {initial_password}
                        </span>
                    </td>
                </tr>
            </table>
            
            <div style="margin-top: 14px; padding-top: 12px; border-top: 1px dashed #CBD5E1; font-size: 12px; color: #64748B; line-height: 1.4;">
                🔒 <strong>Security Notice:</strong> Please change your temporary password immediately after logging in.
            </div>
        </div>
        """

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {org_name}</title>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #0B0F17; font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
        <tr>
            <td align="center">
                <div style="background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1); border: 1px solid #1E293B;">
                    
                    <!-- Top Accent Glow Banner -->
                    <div style="height: 5px; background: linear-gradient(90deg, #6366F1 0%, #3B82F6 50%, #10B981 100%);"></div>

                    <!-- Executive Header -->
                    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%); padding: 40px 32px 36px 32px; text-align: center; color: #FFFFFF;">
                        <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF; text-shadow: 0 2px 8px rgba(0,0,0,0.3);">
                            {org_name}
                        </h1>
                        <div style="display: inline-block; background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(52, 211, 153, 0.4); color: #34D399; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 6px 18px; border-radius: 50px; text-transform: uppercase;">
                            ✨ ACCOUNT ACTIVE & READY
                        </div>
                    </div>

                    <!-- Main Body Content -->
                    <div style="padding: 36px 32px; background-color: #FFFFFF;">
                        <p style="margin: 0 0 16px 0; color: #0F172A; font-size: 17px; font-weight: 600; line-height: 1.5;">
                            Hello <span style="color: #2563EB;">{user_name}</span>,
                        </p>
                        
                        <p style="margin: 0 0 20px 0; color: #475569; font-size: 15px; line-height: 1.65;">
                            Welcome to <strong>{org_name}</strong>! Your official account has been created on Hisob ERP with access as <span style="background: #EFF6FF; color: #1D4ED8; border: 1px solid #BFDBFE; font-size: 13px; font-weight: 700; padding: 3px 10px; border-radius: 6px; display: inline-block;">{role_name.title()}</span>.
                        </p>

                        {password_html}

                        <!-- Action CTA Button -->
                        <div style="text-align: center; margin: 32px 0 28px 0;">
                            <a href="{login_url}" style="background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 42px; border-radius: 14px; display: inline-block; box-shadow: 0 10px 25px -5px rgba(37, 99, 235, 0.4), 0 4px 6px -2px rgba(37, 99, 235, 0.2); letter-spacing: 0.2px;">
                                Log In to Hisob ERP &rarr;
                            </a>
                        </div>

                        <!-- 3-Step Quick Start Guide -->
                        <div style="background-color: #F8FAFC; border-radius: 14px; padding: 20px 24px; border: 1px solid #F1F5F9; margin-top: 28px;">
                            <div style="font-size: 12px; font-weight: 700; color: #64748B; text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 10px;">⚡ Quick Onboarding Steps:</div>
                            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0">
                                <tr>
                                    <td style="padding: 5px 0; font-size: 13px; color: #334155;">
                                        <strong style="color: #2563EB;">1.</strong> Click the button above to launch the login portal.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0; font-size: 13px; color: #334155;">
                                        <strong style="color: #2563EB;">2.</strong> Enter your email address & temporary password.
                                    </td>
                                </tr>
                                <tr>
                                    <td style="padding: 5px 0; font-size: 13px; color: #334155;">
                                        <strong style="color: #2563EB;">3.</strong> Update your password under <em>Settings &rarr; Security</em>.
                                    </td>
                                </tr>
                            </table>
                        </div>
                    </div>

                    <!-- Executive Footer -->
                    <div style="background-color: #F8FAFC; padding: 24px 32px; text-align: center; border-top: 1px solid #E2E8F0;">
                        <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748B; font-weight: 600;">
                            Welcome to <strong>{org_name}</strong> on Hisob ERP.
                        </p>
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: #94A3B8;">
                            Protected by Hisob ERP Enterprise Multi-Tenant Security &bull; <a href="https://hisob.in" style="color: #64748B; text-decoration: underline;">hisob.in</a>
                        </p>
                        <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748B; font-weight: 600;">
                            Designed & Developed by <a href="https://www.mayurpatil.in" target="_blank" style="color: #2563EB; text-decoration: none; font-weight: 700;">www.mayurpatil.in</a>
                        </p>
                    </div>

                </div>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return send_raw_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=f"Welcome {user_name} to {org_name}! Log in at: {login_url}",
        db=db,
        tenant_id=tenant_id,
        email_type="USER_WELCOME",
        metadata_json={"role_name": role_name},
    )


def send_password_reset_email(
    to_email: str,
    reset_url: str,
    db: Optional[Session] = None,
    tenant_id: Optional[UUID] = None,
) -> bool:
    """Delivers executive password reset link to user."""
    subject = "🔑 Password Reset Request — Hisob ERP"
    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Password Reset</title>
</head>
<body style="margin: 0; padding: 40px 16px; background-color: #0B0F17; font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; -webkit-font-smoothing: antialiased;">
    <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 600px; margin: 0 auto;">
        <tr>
            <td align="center">
                <div style="background-color: #FFFFFF; border-radius: 24px; overflow: hidden; box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.4), 0 0 1px rgba(255, 255, 255, 0.1); border: 1px solid #1E293B;">
                    
                    <!-- Top Danger Glow Banner -->
                    <div style="height: 5px; background: linear-gradient(90deg, #EF4444 0%, #F59E0B 100%);"></div>

                    <!-- Executive Header -->
                    <div style="background: linear-gradient(135deg, #0F172A 0%, #1E1B4B 50%, #0F172A 100%); padding: 40px 32px 36px 32px; text-align: center; color: #FFFFFF;">
                        <h1 style="margin: 0 0 12px 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; color: #FFFFFF;">
                            Hisob ERP
                        </h1>
                        <div style="display: inline-block; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(248, 113, 113, 0.4); color: #F87171; font-size: 11px; font-weight: 700; letter-spacing: 1px; padding: 6px 18px; border-radius: 50px; text-transform: uppercase;">
                            🔑 PASSWORD RESET VERIFICATION
                        </div>
                    </div>

                    <!-- Main Body Content -->
                    <div style="padding: 36px 32px; background-color: #FFFFFF;">
                        <p style="margin: 0 0 16px 0; color: #0F172A; font-size: 17px; font-weight: 600;">
                            Hello,
                        </p>
                        
                        <p style="margin: 0 0 24px 0; color: #475569; font-size: 15px; line-height: 1.65;">
                            We received a security request to reset the password for your Hisob ERP account. Click the button below to choose a new password:
                        </p>

                        <!-- Action CTA Button -->
                        <div style="text-align: center; margin: 32px 0;">
                            <a href="{reset_url}" style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); color: #FFFFFF; text-decoration: none; font-size: 16px; font-weight: 700; padding: 16px 42px; border-radius: 14px; display: inline-block; box-shadow: 0 10px 25px -5px rgba(220, 38, 38, 0.4); letter-spacing: 0.2px;">
                                Reset My Password &rarr;
                            </a>
                        </div>

                        <div style="background-color: #FEF2F2; border-radius: 14px; padding: 16px 20px; border: 1px solid #FEE2E2; margin-top: 24px; font-size: 13px; color: #991B1B; line-height: 1.5;">
                            ⏳ <strong>Link Expiration:</strong> This reset link will expire in 24 hours. If you did not request a password reset, you can safely ignore this email; your password will remain unchanged.
                        </div>
                    </div>

                    <!-- Executive Footer -->
                    <div style="background-color: #F8FAFC; padding: 24px 32px; text-align: center; border-top: 1px solid #E2E8F0;">
                        <p style="margin: 0 0 4px 0; font-size: 11px; color: #94A3B8;">
                            Hisob ERP Security Notification &bull; <a href="https://hisob.in" style="color: #64748B; text-decoration: underline;">hisob.in</a>
                        </p>
                        <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748B; font-weight: 600;">
                            Designed & Developed by <a href="https://www.mayurpatil.in" target="_blank" style="color: #2563EB; text-decoration: none; font-weight: 700;">www.mayurpatil.in</a>
                        </p>
                    </div>

                </div>
            </td>
        </tr>
    </table>
</body>
</html>
"""
    return send_raw_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=f"Reset your Hisob password here: {reset_url}",
        db=db,
        tenant_id=tenant_id,
        email_type="PASSWORD_RESET",
    )




