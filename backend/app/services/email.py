import os
import logging
import aiosmtplib
from email.message import EmailMessage
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "akshatgupta1452@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")

async def send_support_email(to_email: str, subject: str, reply_text: str):
    """
    Sends an email to the user regarding their support ticket.
    """
    msg = EmailMessage()
    msg["From"] = f"BugTracker Support <{SMTP_EMAIL}>"
    msg["To"] = to_email
    msg["Subject"] = f"Re: {subject} (BugTracker Support)"
    
    email_body = f"""Hello,

Thank you for reaching out to BugTracker Support.

Regarding your ticket "{subject}":
{reply_text}

Best regards,
The BugTracker Team
"""
    msg.set_content(email_body)

    if not SMTP_PASSWORD:
        logger.warning("SMTP_PASSWORD is not set. Email will not be sent.")
        return False

    try:
        await aiosmtplib.send(
            msg,
            hostname="smtp.gmail.com",
            port=587,
            start_tls=True,
            username=SMTP_EMAIL,
            password=SMTP_PASSWORD
        )
        logger.info(f"Reply email sent successfully to {to_email}")
        return True
    except Exception as e:
        logger.error(f"Failed to send email to {to_email}: {e}")
        return False
