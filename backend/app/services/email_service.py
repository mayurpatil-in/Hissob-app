"""
Email Service — Automated Transactional & Receipt Email Delivery for Hisob ERP.
Uses standard Python smtplib with WebHostMost cPanel SMTP or external provider.
"""
import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any
from app.core.config import settings

logger = logging.getLogger("hisob.email")


def send_raw_email(
    to_email: str,
    subject: str,
    html_content: str,
    text_content: Optional[str] = None,
) -> bool:
    """
    Sends an HTML email via SMTP using server configuration.
    Fails safely without raising exceptions to keep background jobs running smooth.
    """
    if not settings.EMAIL_ENABLED:
        logger.info("Email delivery is disabled in settings. Skipping email to %s", to_email)
        return False

    if not to_email or "@" not in to_email:
        logger.warning("Invalid recipient email address: %s", to_email)
        return False

    if not settings.SMTP_PASSWORD:
        logger.warning(
            "SMTP_PASSWORD is not set in .env. Skipping automated email to %s. Add SMTP_PASSWORD to enable email delivery.",
            to_email,
        )
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
        msg["To"] = to_email

        # Attach text fallback if available
        if text_content:
            msg.attach(MIMEText(text_content, "plain", "utf-8"))

        # Attach HTML body
        msg.attach(MIMEText(html_content, "html", "utf-8"))

        # Connect via SSL or TLS based on port
        if settings.SMTP_PORT == 465:
            server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
        else:
            server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10)
            if settings.SMTP_USE_TLS:
                server.starttls()

        if settings.SMTP_USER and settings.SMTP_PASSWORD:
            server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)

        server.sendmail(settings.SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        logger.info("Successfully sent email '%s' to %s", subject, to_email)
        return True

    except Exception as e:
        logger.error("Failed to send email to %s: %s", to_email, str(e))
        return False


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
    """Generates a premium, responsive HTML Receipt Card for Email Delivery."""
    amount_formatted = f"₹{amount:,.2f}"
    verify_link = f"https://hisob.in/verify/{receipt_id}" if receipt_id else "https://hisob.in"
    qr_img_url = f"https://api.qrserver.com/v1/create-qr-code/?size=110x110&data={verify_link}"

    logo_img_tag = ""
    if org_logo_url:
        full_logo_url = org_logo_url if org_logo_url.startswith("http") else f"https://api.hisob.in{org_logo_url}"
        logo_img_tag = f"""
        <div style="margin-bottom: 12px;">
            <img src="{full_logo_url}" alt="Logo" style="height: 60px; max-width: 160px; object-fit: contain; background: #FFFFFF; padding: 6px 12px; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15);" />
        </div>
        """

    city_state = org_city or "Kolhapur, Maharashtra"
    pan_tag = f" | PAN: <strong>{org_pan}</strong>" if org_pan else ""
    
    ref_row = f"""
    <tr style="background-color: #F8FAFC;">
        <td style="padding: 10px 16px; color: #64748B; font-size: 13px; font-weight: 500;">Ref / UTR No:</td>
        <td style="padding: 10px 16px; color: #0F172A; font-weight: 700; font-size: 13px; text-align: right; font-family: monospace;">{transaction_ref}</td>
    </tr>
    """ if transaction_ref else ""

    donor_pan_row = f"""
    <tr style="background-color: #FFFFFF;">
        <td style="padding: 10px 16px; color: #64748B; font-size: 13px; font-weight: 500;">Donor PAN (80G Tax Exemption):</td>
        <td style="padding: 10px 16px; color: #16A34A; font-weight: 800; font-size: 13px; text-align: right;">{pan_number} (Eligible)</td>
    </tr>
    """ if pan_number else ""

    pm_upper = payment_mode.upper()
    pm_badge_color = "#2563EB" if pm_upper in ["UPI", "ONLINE", "DIGITAL"] else "#D97706"

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Donation Receipt {receipt_number}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0F172A; font-family: 'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0F172A; padding: 32px 12px;">
        <tr>
            <td align="center">
                <!-- Main Container Card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 50px rgba(0,0,0,0.3); border: 1px solid #1E293B;">
                    
                    <!-- Top Brand Header Banner -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%); padding: 36px 24px 28px 24px; text-align: center; color: #FFFFFF; border-bottom: 4px solid #F97316;">
                            {logo_img_tag}
                            <h1 style="margin: 0 0 6px 0; font-size: 24px; font-weight: 900; color: #FFFFFF; letter-spacing: -0.5px;">{org_name}</h1>
                            <p style="margin: 0 0 14px 0; font-size: 13px; color: #94A3B8;">{city_state}{pan_tag}</p>
                            
                            <!-- Badges -->
                            <div style="display: inline-block;">
                                <span style="background-color: rgba(34, 197, 94, 0.15); border: 1px solid #22C55E; color: #4ADE80; font-size: 11px; font-weight: 700; padding: 5px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px;">
                                    ✓ Official Verified e-Receipt
                                </span>
                            </div>
                        </td>
                    </tr>

                    <!-- Highlighted Amount Hero Box -->
                    <tr>
                        <td style="padding: 28px 24px; text-align: center; background: linear-gradient(180deg, #FFF7ED 0%, #FFFFFF 100%); border-bottom: 1px solid #FED7AA;">
                            <p style="margin: 0 0 6px 0; font-size: 12px; color: #C2410C; font-weight: 800; text-transform: uppercase; letter-spacing: 1px;">Total Amount Donated</p>
                            <h2 style="margin: 0; font-size: 42px; font-weight: 900; color: #EA580C; letter-spacing: -1px;">{amount_formatted}</h2>
                            <div style="margin-top: 10px;">
                                <span style="background-color: #FFEDD5; color: #9A3412; font-size: 13px; font-weight: 700; padding: 6px 16px; border-radius: 8px;">
                                    Seva / Purpose: {purpose}
                                </span>
                            </div>
                        </td>
                    </tr>

                    <!-- Receipt Detail Table -->
                    <tr>
                        <td style="padding: 24px;">
                            <table width="100%" cellspacing="0" cellpadding="0" style="border-collapse: separate; border-spacing: 0; border: 1px solid #E2E8F0; border-radius: 12px; overflow: hidden;">
                                <tr style="background-color: #F8FAFC;">
                                    <td style="padding: 12px 16px; color: #64748B; font-size: 13px; font-weight: 500; border-bottom: 1px solid #E2E8F0;">Receipt Number:</td>
                                    <td style="padding: 12px 16px; color: #0F172A; font-weight: 800; font-size: 14px; text-align: right; border-bottom: 1px solid #E2E8F0; font-family: monospace;">{receipt_number}</td>
                                </tr>
                                <tr style="background-color: #FFFFFF;">
                                    <td style="padding: 12px 16px; color: #64748B; font-size: 13px; font-weight: 500; border-bottom: 1px solid #E2E8F0;">Receipt Date:</td>
                                    <td style="padding: 12px 16px; color: #0F172A; font-weight: 700; font-size: 13px; text-align: right; border-bottom: 1px solid #E2E8F0;">{receipt_date}</td>
                                </tr>
                                <tr style="background-color: #F8FAFC;">
                                    <td style="padding: 12px 16px; color: #64748B; font-size: 13px; font-weight: 500; border-bottom: 1px solid #E2E8F0;">Donor Name:</td>
                                    <td style="padding: 12px 16px; color: #0F172A; font-weight: 800; font-size: 15px; text-align: right; border-bottom: 1px solid #E2E8F0;">{donor_name}</td>
                                </tr>
                                {donor_pan_row}
                                <tr style="background-color: #FFFFFF;">
                                    <td style="padding: 12px 16px; color: #64748B; font-size: 13px; font-weight: 500; border-bottom: 1px solid #E2E8F0;">Payment Mode:</td>
                                    <td style="padding: 12px 16px; text-align: right; border-bottom: 1px solid #E2E8F0;">
                                        <span style="background-color: {pm_badge_color}; color: #FFFFFF; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 6px; text-transform: uppercase;">{pm_upper}</span>
                                    </td>
                                </tr>
                                {ref_row}
                            </table>

                            <!-- Verification QR Code & CTA Box -->
                            <div style="margin-top: 24px; background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 14px; padding: 20px; text-align: center;">
                                <table width="100%" cellspacing="0" cellpadding="0">
                                    <tr>
                                        <td align="center" style="padding-bottom: 12px;">
                                            <img src="{qr_img_url}" alt="Verification QR" style="width: 110px; height: 110px; border-radius: 10px; border: 4px solid #FFFFFF; box-shadow: 0 4px 12px rgba(0,0,0,0.08);" />
                                            <p style="margin: 6px 0 0 0; font-size: 11px; color: #64748B; font-weight: 600;">Scan QR with Mobile Camera to Verify Authenticity</p>
                                        </td>
                                    </tr>
                                </table>
                                
                                <div style="margin-top: 8px;">
                                    <a href="{verify_link}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%); color: #FFFFFF; font-size: 14px; font-weight: 800; padding: 14px 32px; border-radius: 12px; text-decoration: none; box-shadow: 0 6px 20px rgba(37, 99, 235, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
                                        📄 View & Download PDF Receipt
                                    </a>
                                </div>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer Section -->
                    <tr>
                        <td style="background-color: #F1F5F9; padding: 20px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
                            <p style="margin: 0 0 6px 0; font-size: 12px; color: #475569; font-weight: 600;">
                                🙏 Thank you for your valuable contribution and blessings!
                            </p>
                            <p style="margin: 0 0 4px 0; font-size: 11px; color: #64748B;">
                                This is an official computer-generated electronic receipt issued via <strong>Hisob ERP</strong>.
                            </p>
                            <p style="margin: 0 0 6px 0; font-size: 10px; color: #94A3B8;">
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
) -> bool:
    """Wrapper function to build HTML and send automated receipt email."""
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

    return send_raw_email(
        to_email=to_email,
        subject=subject,
        html_content=html_content,
        text_content=text_content,
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
    Renders an HTML email card welcoming a new donor to the organization.
    """
    logo_html = ""
    if org_logo_url:
        full_logo_url = org_logo_url if org_logo_url.startswith("http") else f"https://api.hisob.in{org_logo_url}"
        logo_html = f'<img src="{full_logo_url}" alt="{org_name} Logo" style="max-height: 60px; margin-bottom: 12px; border-radius: 10px; background: #FFFFFF; padding: 4px;" />'

    location_str = f" • {org_city}" if org_city else ""

    return f"""<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to {org_name}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F1F5F9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #F1F5F9; padding: 32px 12px;">
        <tr>
            <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 580px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 20px 40px rgba(15,23,42,0.08); border: 1px solid #E2E8F0;">
                    
                    <!-- Top Accent Line -->
                    <tr>
                        <td style="height: 5px; background: linear-gradient(90deg, #F97316 0%, #EA580C 50%, #2563EB 100%);"></td>
                    </tr>

                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, #0F172A 0%, #1E293B 100%); padding: 36px 28px; text-align: center; color: #FFFFFF;">
                            {logo_html}
                            <div style="display: inline-block; background: rgba(249,115,22,0.15); color: #FB923C; font-size: 11px; font-weight: 800; padding: 4px 14px; border-radius: 20px; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; border: 1px solid rgba(249,115,22,0.3);">
                                ✓ OFFICIAL DONOR WELCOME
                            </div>
                            <h1 style="margin: 0; font-size: 24px; font-weight: 900; letter-spacing: -0.5px; color: #FFFFFF;">Welcome to {org_name}!</h1>
                            <p style="margin: 8px 0 0 0; font-size: 13px; color: #94A3B8; font-weight: 500;">
                                Official Registration Confirmation{location_str}
                            </p>
                        </td>
                    </tr>

                    <!-- Body Content -->
                    <tr>
                        <td style="padding: 36px 32px;">
                            <p style="margin: 0 0 16px 0; font-size: 17px; font-weight: 800; color: #0F172A;">
                                Namaste & Warm Greetings, {donor_name}! 🙏
                            </p>
                            <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 1.6; color: #334155;">
                                On behalf of <strong>{org_name}</strong>, we extend our heartfelt appreciation for registering as an official donor. Your generosity fuels our festivals, cultural initiatives, and community service projects.
                            </p>

                            <!-- Official Membership ID Card -->
                            <div style="background: linear-gradient(135deg, #FFF7ED 0%, #FFEDD5 100%); border: 1px solid #FED7AA; border-radius: 16px; padding: 22px; margin-bottom: 28px; box-shadow: 0 4px 14px rgba(249,115,22,0.06);">
                                <table width="100%" cellspacing="0" cellpadding="0" border="0">
                                    <tr>
                                        <td>
                                            <div style="font-size: 10px; font-weight: 800; color: #C2410C; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 6px;">
                                                OFFICIAL DONOR IDENTIFICATION
                                            </div>
                                            <div style="font-size: 20px; font-weight: 900; color: #EA580C; letter-spacing: 0.5px;">
                                                {donor_number}
                                            </div>
                                        </td>
                                        <td align="right" valign="top">
                                            <span style="display: inline-block; background: #EA580C; color: #FFFFFF; font-size: 10px; font-weight: 800; padding: 4px 10px; border-radius: 8px; text-transform: uppercase;">
                                                REGISTERED
                                            </span>
                                        </td>
                                    </tr>
                                </table>

                                <hr style="border: none; border-top: 1px dashed #FDBA74; margin: 16px 0;" />

                                <table width="100%" cellspacing="0" cellpadding="4" border="0" style="font-size: 13px;">
                                    <tr>
                                        <td style="color: #7C2D12; width: 35%; font-weight: 600;">Donor Name:</td>
                                        <td style="color: #0F172A; font-weight: 800;">{donor_name}</td>
                                    </tr>
                                    <tr>
                                        <td style="color: #7C2D12; font-weight: 600;">Organization:</td>
                                        <td style="color: #0F172A; font-weight: 700;">{org_name}</td>
                                    </tr>
                                    {f'<tr><td style="color: #7C2D12; font-weight: 600;">Location:</td><td style="color: #0F172A; font-weight: 700;">{org_city}</td></tr>' if org_city else ''}
                                </table>
                            </div>

                            <!-- Benefits Highlights -->
                            <div style="margin-bottom: 28px;">
                                <div style="font-size: 12px; font-weight: 800; color: #475569; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px;">
                                    WHAT YOU CAN EXPECT:
                                </div>
                                <div style="margin-bottom: 12px; display: flex; align-items: flex-start;">
                                    <div style="background: #EFF6FF; border-radius: 8px; padding: 6px 10px; font-size: 14px; margin-right: 12px;">📧</div>
                                    <div>
                                        <div style="font-size: 13px; font-weight: 700; color: #0F172A;">Instant Electronic Receipts</div>
                                        <div style="font-size: 12px; color: #64748B;">Receive verified e-receipts with QR code verification instantly in your email for every contribution.</div>
                                    </div>
                                </div>
                                <div style="display: flex; align-items: flex-start;">
                                    <div style="background: #F0FDF4; border-radius: 8px; padding: 6px 10px; font-size: 14px; margin-right: 12px;">🔒</div>
                                    <div>
                                        <div style="font-size: 13px; font-weight: 700; color: #0F172A;">100% Transparency & Audit Record</div>
                                        <div style="font-size: 12px; color: #64748B;">Your contributions are securely audited and accounted for on the Hisob ERP platform.</div>
                                    </div>
                                </div>
                            </div>

                            <!-- CTA Button -->
                            <div style="text-align: center; margin-top: 28px;">
                                <a href="https://hisob.in" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #F97316 0%, #EA580C 100%); color: #FFFFFF; font-size: 14px; font-weight: 800; padding: 14px 36px; border-radius: 12px; text-decoration: none; box-shadow: 0 6px 20px rgba(249, 115, 22, 0.35); text-transform: uppercase; letter-spacing: 0.5px;">
                                    ✨ Visit Hisob ERP Platform
                                </a>
                            </div>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #F8FAFC; padding: 20px 24px; text-align: center; border-top: 1px solid #E2E8F0;">
                            <p style="margin: 0 0 6px 0; font-size: 11px; color: #64748B;">
                                Delivered with honor by <strong>{org_name}</strong> via Hisob ERP Platform.
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
    )

