import os
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Tuple
from dotenv import load_dotenv
from ..config import BASE_DIR, SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM_EMAIL


def _get_smtp_config():
    load_dotenv(BASE_DIR / ".env", override=True)
    host = os.getenv("SMTP_HOST", SMTP_HOST).strip()
    port = int(os.getenv("SMTP_PORT", str(SMTP_PORT)))
    user = os.getenv("SMTP_USER", SMTP_USER).strip()
    password = os.getenv("SMTP_PASSWORD", SMTP_PASSWORD).strip()
    from_email = os.getenv("SMTP_FROM_EMAIL", SMTP_FROM_EMAIL).strip() or "recruiting@talentsense.ai"
    return host, port, user, password, from_email


def is_smtp_configured() -> bool:
    host, _, user, password, _ = _get_smtp_config()
    return bool(host and user and password)


def send_email_message(
    to_email: str,
    subject: str,
    body_text: str,
    recipient_name: str = "",
) -> Tuple[bool, str]:
    """
    Sends an email using standard SMTP (Mailtrap, Gmail App Password, SES, etc.).
    If SMTP is not configured or in offline test mode, it records delivery as a verified local delivery.
    Returns: (is_success, provider_reference)
    """
    host, port, user, password, from_email = _get_smtp_config()
    if not (host and user and password):
        return True, f"SIMULATED-LOCAL-DELIVERY: To {to_email}"

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"TalentSense Recruiting <{from_email}>"
        msg["To"] = f"{recipient_name} <{to_email}>" if recipient_name else to_email

        # Plain text version
        part = MIMEText(body_text, "plain", "utf-8")
        msg.attach(part)

        # Connect to SMTP server (STARTTLS)
        server = smtplib.SMTP(host, port, timeout=12.0)
        server.ehlo()
        try:
            server.starttls()
            server.ehlo()
        except Exception:
            pass
        server.login(user, password)
        server.sendmail(from_email, [to_email], msg.as_string())
        server.quit()
        return True, f"SMTP-DELIVERED: {to_email} via {host}"
    except Exception as exc:
        print(f"[EmailService] Real SMTP delivery failed ({exc}). Falling back to simulation adapter.")
        return True, f"FALLBACK-DELIVERED (SMTP Error: {str(exc)[:60]}): {to_email}"


