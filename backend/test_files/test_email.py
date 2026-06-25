import smtplib

from email.message import EmailMessage

import os
from dotenv import load_dotenv
load_dotenv()
SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = os.getenv("SMTP_PORT")

SENDER_EMAIL = os.getenv("SMTP_USERNAME")
APP_PASSWORD = os.getenv("SMTP_PASSWORD")

RECIPIENT_EMAIL = "gaurika2096@gmail.com"


def send_test_email():
    msg = EmailMessage()

    msg["Subject"] = "Meeting Assistant Email Test"
    msg["From"] = SENDER_EMAIL
    msg["To"] = RECIPIENT_EMAIL

    msg.set_content(
        """
Hello,

This is a test email from the Meeting Assistant application.

If you received this email, SMTP is configured correctly.

Regards,
Meeting Assistant
        """
    )

    with smtplib.SMTP(
        SMTP_HOST,
        SMTP_PORT,
    ) as server:

        server.starttls()

        server.login(
            SENDER_EMAIL,
            APP_PASSWORD,
        )

        server.send_message(msg)

    print("Email sent successfully")


if __name__ == "__main__":
    send_test_email()