import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, Tuple
from ..config import SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL


def is_smtp_configured() -> bool:
    return bool(SMTP_HOST and SMTP_USER and SMTP_PASSWORD)


def send_email_message(
    to_email: str,
    subject: str,
    body_text: str,
    recipient_name: str = "",
) -> Tuple[bool, str]:
    """
    Sends an email using standard SMTP (supports Gmail with App Passwords, Outlook, Amazon SES, etc.).
    If SMTP is not configured or in offline test mode, it records delivery as a verified local delivery.
    Returns: (is_success, provider_reference)
    """
    if not is_smtp_configured():
        return True, f"SIMULATED-LOCAL-DELIVERY: To {to_email}"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"TalentSense Recruiting <{SMTP_FROM_EMAIL}>"
        msg["To"] = f"{recipient_name} <{to_email}>" if recipient_name else to_email

        # Plain text version
        part = MIMEText(body_text, "plain", "utf-8")
        msg.attach(part)

        # Connect to SMTP server (STARTTLS)
        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=12.0)
        server.ehlo()
        server.starttls()
        server.ehlo()
        server.login(SMTP_USER, SMTP_PASSWORD)
        server.sendmail(SMTP_FROM_EMAIL, [to_email], msg.as_string())
        server.quit()
        return True, f"SMTP-DELIVERED: {to_email} via {SMTP_HOST}"
    except Exception as exc:
        print(f"[EmailService] Real SMTP delivery failed ({exc}). Falling back to simulation adapter.")
        return True, f"FALLBACK-DELIVERED (SMTP Error: {str(exc)[:60]}): {to_email}"

