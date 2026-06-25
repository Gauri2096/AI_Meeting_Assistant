import smtplib

from email.message import EmailMessage
from pathlib import Path

from app.core.config import get_settings
settings=get_settings()


def send_meeting_report_email(
    recipients: list[str],
    pdf_path: str,
    meeting_title: str,
    organizer: str,
):
    print(f"[EMAIL SERVICE] Preparing meeting report email for '{meeting_title}'...")
    print(f"[EMAIL SERVICE] Recipients: {recipients}")
    print(f"[EMAIL SERVICE] Attachment path: {pdf_path}")

    msg = EmailMessage()

    msg["Subject"] = (
        f"Meeting Report - {meeting_title}"
    )

    msg["From"] = settings.SMTP_USERNAME

    msg["To"] = ", ".join(recipients)

    msg.set_content(
        f"""
Dear Sir/Ma'am,

Please find attached the meeting report for:

{meeting_title}
Organizer : {organizer}
This report was generated automatically by MeetIntel.

Regards,
MeetIntel
"""
    )

    pdf_file = Path(pdf_path)
    print(f"[EMAIL SERVICE] Reading PDF file for attachment: '{pdf_file.name}'...")
    with open(pdf_file, "rb") as f:
        pdf_data = f.read()

    msg.add_attachment(
        pdf_data,
        maintype="application",
        subtype="pdf",
        filename=pdf_file.name,
    )
    print(f"[EMAIL SERVICE] Attachment successfully loaded ({len(pdf_data)} bytes).")

    host = settings.SMTP_HOST
    port = settings.SMTP_PORT
    username = settings.SMTP_USERNAME
    sender = settings.SMTP_USERNAME
    print(f"[EMAIL SERVICE] SMTP Configuration - Host: '{host}', Port: {port}, Sender: '{sender}', Username: '{username}'")

    print(f"[EMAIL SERVICE] Connecting to SMTP host '{host}' on port {port}...")
    try:
        with smtplib.SMTP(
            host,
            port,
        ) as server:
            print("[EMAIL SERVICE] SMTP Connection established. Executing starttls() handshake...")
            server.starttls()
            print("[EMAIL SERVICE] TLS handshake complete. Authenticating/logging in SMTP user...")
            server.login(
                username,
                settings.SMTP_PASSWORD,
            )
            print("[EMAIL SERVICE] SMTP authentication successful. Dispatching email...")
            server.send_message(msg)
            print("[EMAIL SERVICE] Email message successfully sent.")
    except Exception as e:
        print(f"[EMAIL SERVICE] ERROR: Failed to send meeting report email: {str(e)}")
        raise e