"""Check configured SMTP; send a harmless test only with an explicit recipient."""

import argparse
from email.message import EmailMessage
import os

from backend.email_service import smtp_connection


def main() -> None:
    parser = argparse.ArgumentParser(description="Check SMTP without printing credentials")
    parser.add_argument("--to", help="Send a test email to this recipient (otherwise no email is sent)")
    args = parser.parse_args()
    sender = os.getenv("SMTP_FROM", "").strip()
    if not sender:
        parser.exit(1, "SMTP_FROM is not configured\n")
    try:
        with smtp_connection() as smtp:
            if args.to:
                message = EmailMessage()
                message["From"] = sender
                message["To"] = args.to
                message["Subject"] = "МосПолиФизикс: проверка отправки почты"
                message.set_content("Это тестовое письмо для проверки почты МосПолиФизикс. Оно не содержит кода или ссылки восстановления.")
                refused = smtp.send_message(message)
                if refused:
                    parser.exit(1, "SMTP server refused the recipient\n")
    except Exception as error:
        # Provider errors can contain addresses or credentials; show only type.
        parser.exit(1, f"SMTP check failed ({type(error).__name__})\n")
    print("SMTP connection and authentication succeeded")
    if args.to:
        print("SMTP server accepted the test message; check the inbox and spam folder")


if __name__ == "__main__":
    main()
